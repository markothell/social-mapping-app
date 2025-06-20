// src/core/services/dataService.ts
"use client"

import { mongoDbService } from './mongoDbService';
import { activityService } from './activityService';
import { Activity } from '@/models/Activity';

export const dataService = {
  // Track sync status
  _syncStatus: {
    lastSyncTime: null as Date | null,
    isSyncing: false,
    pendingChanges: [] as { 
      type: 'create' | 'update' | 'delete',
      id?: string,
      data?: any
    }[]
  },
  
  /**
   * Get all activities with MongoDB as source of truth
   */
  async getAll(): Promise<Activity[]> {
    try {
      // Try to get from MongoDB first
      const remoteActivities = await mongoDbService.getActivities();
      
      // Update local cache for offline access
      this._updateLocalCache(remoteActivities);
      
      return remoteActivities;
    } catch (error) {
      console.warn('Network error, using cached data:', error);
      // Fallback to local cache
      return activityService.getAll();
    }
  },
  
  /**
   * Get a specific activity by ID
   */
  async getById(id: string): Promise<Activity | null> {
    // Track pending changes for this activity
    const pendingChange = this._syncStatus.pendingChanges.find(
      change => change.id === id && change.type === 'delete'
    );
    
    // If activity is pending deletion, return null
    if (pendingChange && pendingChange.type === 'delete') {
      return null;
    }
    
    try {
      // Try to get from MongoDB first
      const remoteActivity = await mongoDbService.getActivityById(id);
      
      if (remoteActivity) {
        // Update local cache
        activityService.update(id, () => remoteActivity);
        return this._applyPendingChanges(remoteActivity);
      }
    } catch (error) {
      console.warn(`Network error retrieving activity ${id}, using cached data:`, error);
    }
    
    // Fallback to local cache
    const localActivity = activityService.getById(id);
    
    // If we have a pending update, apply it
    return localActivity ? this._applyPendingChanges(localActivity) : null;
  },
  
  /**
   * Create a new activity
   */
  async create(type: 'mapping' | 'ranking', settings: any): Promise<Activity> {
    // Generate a unique ID
    const uniqueId = crypto.randomUUID().substring(0, 8);
    
    // Create new activity object
    const newActivity = {
      id: uniqueId,
      type,
      settings: {
        ...createDefaultSettingsForType(type),
        ...settings
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      participants: [],
      phase: 'gathering',
      tags: [],
      mappings: [],
      rankings: []
    };
    
    try {
      // Try to create in MongoDB first
      const remoteActivity = await mongoDbService.createActivity(newActivity);
      
      if (remoteActivity) {
        // Update local cache
        activityService.update(remoteActivity.id, () => remoteActivity);
        return remoteActivity;
      }
    } catch (error) {
      console.warn('Network error creating activity, saving locally:', error);
      
      // Add to pending changes
      this._syncStatus.pendingChanges.push({
        type: 'create',
        data: newActivity
      });
      
      // Trigger background sync
      this._scheduleSyncInBackground();
    }
    
    // Save locally
    return activityService.create(type, settings);
  },
  
  /**
   * Update an activity
   */
  async update(id: string, updater: (activity: Activity) => Activity): Promise<Activity | null> {
    // Get current activity data
    const currentActivity = await this.getById(id);
    
    if (!currentActivity) {
      return null;
    }
    
    // Apply updates
    const updatedActivity = updater({ ...currentActivity });
    updatedActivity.updatedAt = new Date();
    
    try {
      // Try to update in MongoDB first
      const remoteActivity = await mongoDbService.updateActivity(id, updatedActivity);
      
      if (remoteActivity) {
        // Update local cache
        activityService.update(id, () => remoteActivity);
        return remoteActivity;
      }
    } catch (error) {
      console.warn(`Network error updating activity ${id}, saving locally:`, error);
      
      // Add to pending changes
      this._syncStatus.pendingChanges.push({
        type: 'update',
        id,
        data: updatedActivity
      });
      
      // Trigger background sync
      this._scheduleSyncInBackground();
    }
    
    // Update locally
    return activityService.update(id, () => updatedActivity);
  },
  
  /**
   * Delete an activity
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Try to delete from MongoDB first
      const success = await mongoDbService.deleteActivity(id);
      
      if (success) {
        // Delete from local cache
        activityService.delete(id);
        return true;
      }
    } catch (error) {
      console.warn(`Network error deleting activity ${id}, marking for deletion:`, error);
      
      // Add to pending changes
      this._syncStatus.pendingChanges.push({
        type: 'delete',
        id
      });
      
      // Trigger background sync
      this._scheduleSyncInBackground();
    }
    
    // Mark as deleted locally
    return activityService.delete(id);
  },
  
  /**
   * Synchronize pending changes with the server
   */
  async syncPendingChanges(): Promise<boolean> {
    if (this._syncStatus.isSyncing || this._syncStatus.pendingChanges.length === 0) {
      return true;
    }
    
    this._syncStatus.isSyncing = true;
    
    try {
      // Process each pending change
      const pendingChanges = [...this._syncStatus.pendingChanges];
      let success = true;
      
      for (const change of pendingChanges) {
        try {
          switch (change.type) {
            case 'create':
              await mongoDbService.createActivity(change.data);
              break;
            case 'update':
              if (change.id && change.data) {
                await mongoDbService.updateActivity(change.id, change.data);
              }
              break;
            case 'delete':
              if (change.id) {
                await mongoDbService.deleteActivity(change.id);
              }
              break;
          }
          
          // Remove from pending changes
          const index = this._syncStatus.pendingChanges.findIndex(
            pc => pc === change
          );
          
          if (index !== -1) {
            this._syncStatus.pendingChanges.splice(index, 1);
          }
        } catch (error) {
          console.error(`Error syncing change:`, change, error);
          success = false;
        }
      }
      
      this._syncStatus.lastSyncTime = new Date();
      this._syncStatus.isSyncing = false;
      
      return success;
    } catch (error) {
      console.error('Error syncing pending changes:', error);
      this._syncStatus.isSyncing = false;
      return false;
    }
  },
  
  // Private helper methods
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
  },
  
  _applyPendingChanges(activity: Activity): Activity {
    // Find pending updates for this activity
    const pendingUpdate = this._syncStatus.pendingChanges.find(
      change => change.id === activity.id && change.type === 'update'
    );
    
    if (pendingUpdate && pendingUpdate.data) {
      return pendingUpdate.data;
    }
    
    return activity;
  },
  
  _scheduleSyncInBackground(): void {
    // Debounce sync to avoid multiple calls
    if (typeof window !== 'undefined') {
      clearTimeout(window.syncTimeoutId);
      window.syncTimeoutId = setTimeout(() => {
        this.syncPendingChanges();
      }, 5000);
    }
  }
};

// Helper function to create default settings
function createDefaultSettingsForType(type: 'mapping' | 'ranking') {
  const commonSettings = {
    entryView: {
      title: '',
      description: ''
    },
    tagCreation: {
      instruction: 'Add tags for the activity',
      enableVoting: true,
      voteThreshold: 2
    }
  };
  
  if (type === 'mapping') {
    return {
      ...commonSettings,
      mapping: {
        xAxisMinLabel: "Don't Know",
        xAxisMaxLabel: 'Know',
        yAxisMinLabel: "Don't Like",
        yAxisMaxLabel: 'Like',
        gridSize: 4,
        enableAnnotations: true,
        maxAnnotationLength: 280
      }
    };
  }
  
  return {
    ...commonSettings,
    ranking: {
      orderType: 'ascending',
      context: 'of importance',
      topRankMeaning: 'most important'
    }
  };
}

// Add type definition for window
declare global {
  interface Window {
    syncTimeoutId: any;
  }
}