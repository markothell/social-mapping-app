// src/core/services/hybridActivityService.ts
"use client"

import { activityService } from './activityService';
import { mongoDbService } from './mongoDbService';
import { Activity, createDefaultActivity } from '@/models/Activity';
import { getSocketInstance } from './websocketService';

// Centralized pending changes store for offline operations
class PendingChangeStore {
  private create: Map<string, Activity> = new Map();
  private update: Map<string, Activity> = new Map();
  private delete: Set<string> = new Set();
  private isSyncing: boolean = false;

  addCreateChange(activity: Activity) {
    this.create.set(activity.id, activity);
    this.persistChanges();
  }

  addUpdateChange(activity: Activity) {
    this.update.set(activity.id, activity);
    this.persistChanges();
  }

  addDeleteChange(id: string) {
    this.delete.add(id);
    this.persistChanges();
  }

  hasPendingChanges(): boolean {
    return this.create.size > 0 || this.update.size > 0 || this.delete.size > 0;
  }

  getPendingChangeCount(): number {
    return this.create.size + this.update.size + this.delete.size;
  }

  // Load pending changes from localStorage
  loadChanges() {
    if (typeof window === 'undefined') return;

    try {
      const storedCreate = localStorage.getItem('pending_create');
      const storedUpdate = localStorage.getItem('pending_update');
      const storedDelete = localStorage.getItem('pending_delete');

      if (storedCreate) {
        const createEntries = JSON.parse(storedCreate);
        this.create = new Map(Object.entries(createEntries));
      }

      if (storedUpdate) {
        const updateEntries = JSON.parse(storedUpdate);
        this.update = new Map(Object.entries(updateEntries));
      }

      if (storedDelete) {
        const deleteEntries = JSON.parse(storedDelete);
        this.delete = new Set(deleteEntries);
      }
    } catch (error) {
      console.error('Error loading pending changes:', error);
    }
  }

  // Save pending changes to localStorage
  persistChanges() {
    if (typeof window === 'undefined') return;

    try {
      // Convert Map to object for serialization
      const createObj = Object.fromEntries(this.create);
      const updateObj = Object.fromEntries(this.update);
      const deleteArray = Array.from(this.delete);

      localStorage.setItem('pending_create', JSON.stringify(createObj));
      localStorage.setItem('pending_update', JSON.stringify(updateObj));
      localStorage.setItem('pending_delete', JSON.stringify(deleteArray));
    } catch (error) {
      console.error('Error persisting pending changes:', error);
    }
  }

  // Process all pending changes
  async processChanges(): Promise<boolean> {
    if (this.isSyncing || !this.hasPendingChanges()) return true;

    this.isSyncing = true;
    let success = true;

    try {
      // Process creates
      for (const [id, activity] of this.create.entries()) {
        try {
          await mongoDbService.createActivity(activity);
          this.create.delete(id);
        } catch (error) {
          console.error(`Error syncing create for ${id}:`, error);
          success = false;
        }
      }

      // Process updates
      for (const [id, activity] of this.update.entries()) {
        try {
          await mongoDbService.updateActivity(id, activity);
          this.update.delete(id);
        } catch (error) {
          console.error(`Error syncing update for ${id}:`, error);
          success = false;
        }
      }

      // Process deletes
      for (const id of this.delete) {
        try {
          await mongoDbService.deleteActivity(id);
          this.delete.delete(id);
        } catch (error) {
          console.error(`Error syncing delete for ${id}:`, error);
          success = false;
        }
      }

      this.persistChanges();
    } catch (error) {
      console.error('Error processing pending changes:', error);
      success = false;
    } finally {
      this.isSyncing = false;
    }

    return success;
  }
}

// Initialize pending changes store
const pendingChanges = new PendingChangeStore();

// Load pending changes on module initialization
if (typeof window !== 'undefined') {
  pendingChanges.loadChanges();
}

export const hybridActivityService = {
  // Check if we're online
  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  },

  // Check if we have any pending changes
  hasPendingChanges(): boolean {
    return pendingChanges.hasPendingChanges();
  },

  // Get the count of pending changes
  getPendingChangeCount(): number {
    return pendingChanges.getPendingChangeCount();
  },

  /**
   * Get all activities
   * SOURCE OF TRUTH: MongoDB when online, localStorage when offline
   */
  async getAll(): Promise<Activity[]> {
    if (this.isOnline()) {
      try {
        // Get from MongoDB (source of truth when online)
        const remoteActivities = await mongoDbService.getActivities();
        
        // Update local cache for offline access
        this._updateLocalCache(remoteActivities);
        
        return remoteActivities;
      } catch (error) {
        console.warn('Network error, using cached data:', error);
      }
    }
    
    // Fallback to local storage
    return activityService.getAll();
  },
  
  /**
   * Get active activities
   */
  async getActive(): Promise<Activity[]> {
    const activities = await this.getAll();
    return activities.filter(activity => activity.status === 'active');
  },
  
  /**
   * Get completed activities
   */
  async getCompleted(): Promise<Activity[]> {
    const activities = await this.getAll();
    return activities.filter(activity => activity.status === 'completed');
  },
  
  /**
   * Get a specific activity by ID
   * SOURCE OF TRUTH: MongoDB when online, localStorage when offline
   */
  async getById(id: string): Promise<Activity | null> {
    // First check if it exists locally
    const localActivity = activityService.getById(id);
    
    // If not found locally, we can't get it
    if (!localActivity) {
      return null;
    }
    
    // If this is a newly created activity, skip the MongoDB fetch entirely
    // This is the key change - check the creation markers before trying MongoDB
    if ((localActivity as any)._justCreated || (localActivity as any)._creationAttempted) {
      console.log(`Activity ${id} was just created locally, skipping MongoDB fetch`);
      return localActivity;
    }
    
    // Only try MongoDB if we're online and it's not a newly created activity
    if (this.isOnline()) {
      try {
        // Try to get from MongoDB
        const remoteActivity = await mongoDbService.getActivityById(id);
        
        if (remoteActivity) {
          // Update local cache
          activityService.update(id, () => remoteActivity);
          return remoteActivity;
        }
      } catch (error) {
        console.warn(`Error fetching activity ${id} from MongoDB, using cached data:`, error);
        // Fall through to return local version
      }
    }
    
    // Return the local version if MongoDB fetch failed or we're offline
    return localActivity;
  },
    
  /**
   * Create a new activity
   * WRITE PATTERN: Write to MongoDB, then to localStorage if online
   * If offline, write to localStorage and queue for sync
   */
  async create(type: 'mapping' | 'ranking', settings: any): Promise<Activity> {
    // Create new activity with modern unique ID
    const newActivity = createDefaultActivity(type, settings.entryView?.title || '');
    
    // Deep merge settings with special handling for mapping and ranking
    const mergedSettings = { ...newActivity.settings };
    
    // Merge entryView and tagCreation settings
    if (settings.entryView) {
      mergedSettings.entryView = { ...mergedSettings.entryView, ...settings.entryView };
    }
    
    if (settings.tagCreation) {
      mergedSettings.tagCreation = { ...mergedSettings.tagCreation, ...settings.tagCreation };
    }
    
    // Handle specific activity type settings
    if (type === 'mapping' && settings.mapping) {
      // If this is a mapping activity and mapping settings were provided, use them directly
      mergedSettings.mapping = { ...mergedSettings.mapping, ...settings.mapping };
    } else if (type === 'ranking' && settings.ranking) {
      // If this is a ranking activity and ranking settings were provided, use them directly
      mergedSettings.ranking = { ...mergedSettings.ranking, ...settings.ranking };
    }
    
    // Apply merged settings
    newActivity.settings = mergedSettings;
    
    // Set a flag to indicate this activity was just created
    // This will prevent unnecessary fetch attempts in other methods
    (newActivity as any)._justCreated = true;
    (newActivity as any)._creationAttempted = true;
    
    // First save to local storage to ensure it exists immediately
    const localActivity = activityService.create(type, settings);
    
    // If we're online, also try to create in MongoDB asynchronously
    if (this.isOnline()) {
      // Use a setTimeout to make this non-blocking
      // This ensures the UI can continue without waiting for the network
      setTimeout(async () => {
        try {
          console.log(`Creating new activity ${localActivity.id} in MongoDB directly`);
          
          // Try to create in MongoDB
          const remoteActivity = await mongoDbService.createActivity(localActivity);
          
          if (remoteActivity) {
            // Update local cache with remote version
            const updatedActivity = {...remoteActivity};
            // Clear creation flags since it now exists in MongoDB
            delete (updatedActivity as any)._justCreated;
            delete (updatedActivity as any)._creationAttempted;
            
            activityService.update(remoteActivity.id, () => updatedActivity);
            
            // Broadcast via WebSocket if possible
            const socket = getSocketInstance();
            if (socket) {
              socket.emit('create_activity', {
                activityId: remoteActivity.id
              });
            }
            
            console.log(`Successfully created activity ${localActivity.id} in MongoDB`);
          }
        } catch (error) {
          console.warn('Network error creating activity, will sync later:', error);
          
          // Add to pending changes for later sync
          pendingChanges.addCreateChange(localActivity);
        }
      }, 100); // Small delay to ensure local operations complete first
    } else {
      // Offline - add to pending changes
      pendingChanges.addCreateChange(localActivity);
    }
    
    // Return the local activity immediately without waiting for network
    return localActivity;
  },
  
  /**
   * Update an activity
   * WRITE PATTERN: Write to MongoDB, then to localStorage if online
   * If offline, write to localStorage and queue for sync
   */
  async update(id: string, updater: (activity: Activity) => Activity): Promise<Activity | null> {
    // Get current state of the activity
    const currentActivity = activityService.getById(id); // Use direct local access instead of this.getById
    
    if (!currentActivity) {
      console.warn(`Cannot update activity ${id}: Activity not found locally`);
      return null;
    }
    
    // Apply updates
    const updatedActivity = updater({ ...currentActivity });
    updatedActivity.updatedAt = new Date();
    
    // Check if this is a newly created activity
    const isJustCreated = !!(currentActivity as any)._justCreated;
    const creationAttempted = !!(currentActivity as any)._creationAttempted;
    
    // Preserve creation flags if they exist
    if (isJustCreated) {
      (updatedActivity as any)._justCreated = true;
    }
    if (creationAttempted) {
      (updatedActivity as any)._creationAttempted = true;
    }
    
    // Update locally first to ensure changes are visible immediately
    const locallyUpdatedActivity = activityService.update(id, () => updatedActivity);
    
    // If we're online and this isn't a brand new activity, sync with MongoDB
    if (this.isOnline() && !isJustCreated) {
      try {
        let remoteActivity = null;
        
        // If this activity has had a creation attempt but might not exist in MongoDB yet,
        // try to create it instead of updating
        if (creationAttempted) {
          console.log(`Activity ${id} is newly created, attempting to create in MongoDB`);
          try {
            remoteActivity = await mongoDbService.createActivity(updatedActivity);
            
            // If creation succeeds, remove the creation flags for future updates
            if (remoteActivity) {
              console.log(`Successfully created activity ${id} in MongoDB that was previously only local`);
              const cleanedActivity = { ...remoteActivity };
              delete (cleanedActivity as any)._justCreated;
              delete (cleanedActivity as any)._creationAttempted;
              
              // Update local storage with the clean version
              activityService.update(id, () => cleanedActivity);
              remoteActivity = cleanedActivity;
            }
          } catch (createError) {
            console.warn(`Failed to create activity ${id}, trying update instead:`, createError);
          }
        }
        
        // If creation wasn't attempted or failed, try updating
        if (!remoteActivity) {
          // Try to update in MongoDB directly
          console.log(`Updating activity ${id} in MongoDB directly`);
          remoteActivity = await mongoDbService.updateActivity(id, updatedActivity);
        }
        
        if (remoteActivity) {
          // Update local cache with the clean remote version
          activityService.update(id, () => remoteActivity);
          
          // Broadcast via WebSocket if possible
          const socket = getSocketInstance();
          if (socket) {
            socket.emit('update_activity', {
              activityId: id
            });
          }
          
          return remoteActivity;
        }
      } catch (error) {
        console.warn(`Network error updating activity ${id}, changes saved locally:`, error);
        
        // Add to pending changes
        pendingChanges.addUpdateChange(updatedActivity);
      }
    } else if (this.isOnline() && isJustCreated) {
      // Don't try to update MongoDB yet for just created activities
      // The creation process will handle this asynchronously
      console.log(`Activity ${id} was just created locally, skipping MongoDB update`);
    } else {
      // Offline - add to pending changes
      pendingChanges.addUpdateChange(updatedActivity);
    }
    
    // Return the locally updated activity
    return locallyUpdatedActivity;
  },
    
  /**
   * Delete an activity
   * WRITE PATTERN: Delete from MongoDB, then from localStorage if online
   * If offline, delete from localStorage and queue for sync
   */
  async delete(id: string): Promise<boolean> {
    if (this.isOnline()) {
      try {
        // Try to delete from MongoDB first
        const success = await mongoDbService.deleteActivity(id);
        
        if (success) {
          // Delete from local storage
          activityService.delete(id);
          
          // Broadcast via WebSocket if possible
          const socket = getSocketInstance();
          if (socket) {
            socket.emit('delete_activity', {
              activityId: id
            });
          }
          
          return true;
        }
      } catch (error) {
        console.warn(`Network error deleting activity ${id}, marking for deletion:`, error);
        
        // Add to pending deletes
        pendingChanges.addDeleteChange(id);
      }
    } else {
      // Offline - add to pending deletes
      pendingChanges.addDeleteChange(id);
    }
    
    // Delete locally
    return activityService.delete(id);
  },
  
  /**
   * Mark an activity as completed
   */
  async complete(id: string): Promise<Activity | null> {
    return this.update(id, activity => {
      activity.status = 'completed';
      activity.completedAt = new Date();
      activity.updatedAt = new Date();
      return activity;
    });
  },

  /**
   * Clone an activity (duplicate settings but no user data)
   */
  async clone(id: string): Promise<Activity | null> {
    const originalActivity = await this.getById(id);
    if (!originalActivity) {
      console.warn(`Cannot clone activity ${id}: Activity not found`);
      return null;
    }

    // Extract settings from original activity
    const clonedSettings = {
      entryView: { ...originalActivity.settings.entryView },
      tagCreation: { ...originalActivity.settings.tagCreation },
      mapping: originalActivity.type === 'mapping' ? { ...originalActivity.settings.mapping } : undefined,
      ranking: originalActivity.type === 'ranking' ? { ...originalActivity.settings.ranking } : undefined,
      results: { ...originalActivity.settings.results }
    };

    // Add " (Copy)" to the title
    if (clonedSettings.entryView?.title) {
      clonedSettings.entryView.title += ' (Copy)';
    }

    // Create new activity with cloned settings but no user data
    return this.create(originalActivity.type as 'mapping' | 'ranking', clonedSettings);
  },
  
  /**
   * Add a tag to an activity
   */
  async addTag(activityId: string, tag: any): Promise<Activity | null> {
    console.log(`hybridActivityService: Adding tag ${tag.id} to activity ${activityId}`);
    
    // Get current activity state
    const currentActivity = await this.getById(activityId);
    if (!currentActivity) {
      console.warn(`Cannot add tag to activity ${activityId}: Activity not found locally`);
      return null;
    }
    
    // Check if tag already exists
    if (currentActivity.tags.some(t => t.id === tag.id)) {
      console.warn(`Tag ${tag.id} already exists in activity ${activityId}, skipping addition`);
      return currentActivity; // Return the activity without modification
    }
    
    // Proceed with tag addition
    return this.update(activityId, activity => {
      const newTag = {
        id: tag.id || Math.random().toString(36).substring(2, 9),
        text: tag.text,
        creatorId: tag.creatorId,
        creatorName: tag.creatorName,
        votes: tag.votes || [],
        comments: tag.comments || [],
        commentCount: tag.comments?.length || 0,
        hasNewComments: false,
        status: activity.settings?.tagCreation?.enableVoting && activity.settings?.tagCreation?.thresholdType !== 'off' ? 'pending' : 'approved'
      };
      
      activity.tags.push(newTag);
      activity.updatedAt = new Date();
      return activity;
    });
  },
  
  /**
   * Vote for a tag
   */
  async voteTag(activityId: string, tagId: string, vote: any): Promise<Activity | null> {
    return this.update(activityId, activity => {
      const tag = activity.tags.find(t => t.id === tagId);
      if (!tag) return activity;
      
      // Check if user already voted
      const existingVoteIndex = tag.votes.findIndex(v => v.userId === vote.userId);
      
      if (existingVoteIndex !== -1) {
        // Remove vote
        tag.votes.splice(existingVoteIndex, 1);
      } else {
        // Add vote
        tag.votes.push({
          userId: vote.userId,
          userName: vote.userName,
          timestamp: new Date()
        });
      }
      
      // Update tag status based on new threshold logic
      this.updateTagApprovalStatus(activity);
      
      activity.updatedAt = new Date();
      return activity;
    });
  },
  
  /**
   * Delete a tag
   */
  async deleteTag(activityId: string, tagId: string): Promise<Activity | null> {
    return this.update(activityId, activity => {
      activity.tags = activity.tags.filter(tag => tag.id !== tagId);
      activity.updatedAt = new Date();
      return activity;
    });
  },
  
  /**
   * Change the phase of an activity
   */
  async changePhase(activityId: string, phase: string): Promise<Activity | null> {
    return this.update(activityId, activity => {
      activity.phase = phase;
      activity.updatedAt = new Date();
      return activity;
    });
  },

  /**
   * Update tag approval status based on threshold configuration
   */
  updateTagApprovalStatus(activity: Activity): void {
    const tagCreationSettings = activity.settings?.tagCreation;
    if (!tagCreationSettings?.enableVoting) {
      // If voting is disabled, approve all pending tags
      activity.tags.forEach(tag => {
        if (tag.status === 'pending') {
          tag.status = 'approved';
        }
      });
      return;
    }

    const thresholdType = tagCreationSettings.thresholdType || 'minimum';
    
    if (thresholdType === 'off') {
      // No voting required, approve all tags
      activity.tags.forEach(tag => {
        if (tag.status === 'pending') {
          tag.status = 'approved';
        }
      });
    } else if (thresholdType === 'minimum') {
      // Minimum votes required
      const minimumVotes = tagCreationSettings.minimumVotes || 1;
      activity.tags.forEach(tag => {
        if (tag.status === 'pending' && tag.votes.length >= minimumVotes) {
          tag.status = 'approved';
        } else if (tag.status === 'approved' && tag.votes.length < minimumVotes) {
          tag.status = 'pending';
        }
      });
    } else if (thresholdType === 'topN') {
      // Top N ranked tags (with ties included if they have non-zero votes)
      const topNCount = tagCreationSettings.topNCount || 5;
      
      // Sort tags by vote count (descending), then by creation time for ties
      const sortedTags = [...activity.tags]
        .filter(tag => (tag.status === 'pending' || tag.status === 'approved') && tag.votes.length > 0)
        .sort((a, b) => {
          const votesDiff = b.votes.length - a.votes.length;
          if (votesDiff !== 0) return votesDiff;
          // For ties, prefer older tags (assuming creation order)
          return activity.tags.indexOf(a) - activity.tags.indexOf(b);
        });
      
      // Reset all tags to pending first
      activity.tags.forEach(tag => {
        if (tag.status === 'approved') {
          tag.status = 'pending';
        }
      });
      
      // Determine the minimum vote count for the Nth position
      let minVotesForApproval = 0;
      if (sortedTags.length > 0 && topNCount > 0) {
        const nthIndex = Math.min(topNCount - 1, sortedTags.length - 1);
        minVotesForApproval = sortedTags[nthIndex].votes.length;
      }
      
      // Approve all tags that have at least the minimum votes (including ties)
      sortedTags.forEach(tag => {
        if (tag.votes.length >= minVotesForApproval && tag.votes.length > 0) {
          const tagToApprove = activity.tags.find(t => t.id === tag.id);
          if (tagToApprove) {
            tagToApprove.status = 'approved';
          }
        }
      });
    }
  },

  /**
   * Update activity settings
   */
  async updateSettings(activityId: string, newSettings: any): Promise<boolean> {
    const updatedActivity = await this.update(activityId, activity => {
      // Deep merge the settings to preserve existing nested properties
      activity.settings = {
        ...activity.settings,
        entryView: {
          ...activity.settings.entryView,
          ...newSettings.entryView
        },
        tagCreation: {
          ...activity.settings.tagCreation,
          ...newSettings.tagCreation
        },
        mapping: {
          ...activity.settings.mapping,
          ...newSettings.mapping
        },
        ranking: {
          ...activity.settings.ranking,
          ...newSettings.ranking
        },
        results: {
          ...activity.settings.results,
          ...newSettings.results
        }
      };
      
      // Re-evaluate tag approval status when settings change
      this.updateTagApprovalStatus(activity);
      
      activity.updatedAt = new Date();
      return activity;
    });
    
    return updatedActivity !== null;
  },
  
  /**
   * Synchronize pending changes with the server
   * This method should be called when app goes online
   */
  async syncPendingChanges(): Promise<boolean> {
    if (!this.isOnline()) return false;
    return pendingChanges.processChanges();
  },
  
  /**
   * Update local cache with remote data
   * Private helper method
   */
  _updateLocalCache(remoteActivities: Activity[]): void {
    // Get current local activities
    const localActivities = activityService.getAll();
    const localMap = new Map(localActivities.map(a => [a.id, a]));
    
    // Update or add remote activities
    remoteActivities.forEach(remote => {
      const local = localMap.get(remote.id);
      
      if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        // Remote is newer or doesn't exist locally
        localMap.set(remote.id, remote);
      }
    });
    
    // Save updated activities
    activityService.saveAll(Array.from(localMap.values()));
  }
};