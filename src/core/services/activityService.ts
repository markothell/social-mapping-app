// src/core/services/activityService.ts
"use client"

import { createFeatureStorage } from '../hooks/useLocalStorageService';
import { Activity, createDefaultActivity } from '@/models/Activity';

// Initialize storage
let activityStorage: any;

// Only access localStorage on the client
if (typeof window !== 'undefined') {
  activityStorage = createFeatureStorage('activities');
}

export const activityService = {
  getAll(): Activity[] {
    if (typeof window === 'undefined') return [];
    
    const activities = activityStorage.get('list', []);
    return activities.map((activity: any) => ({
      ...activity,
      createdAt: new Date(activity.createdAt),
      updatedAt: new Date(activity.updatedAt),
      // Provide defaults for backward compatibility with existing activities
      ownerId: activity.ownerId || 'default-admin',
      ownerName: activity.ownerName || 'Mo',
      permissions: activity.permissions || {
        isPublic: true,
        allowGuestParticipants: true,
        visibility: 'public'
      },
      // Convert string dates in votes to Date objects
      tags: activity.tags?.map((tag: any) => ({
        ...tag,
        votes: tag.votes?.map((vote: any) => ({
          ...vote,
          timestamp: new Date(vote.timestamp)
        })) || [],
        comments: tag.comments?.map((comment: any) => ({
          ...comment,
          timestamp: new Date(comment.timestamp)
        })) || []
      })) || []
    }));
  },
  
  getActive(): Activity[] {
    return this.getAll().filter(activity => activity.status === 'active');
  },
  
  getCompleted(): Activity[] {
    return this.getAll().filter(activity => activity.status === 'completed');
  },
  
  getById(id: string): Activity | null {
    const activities = this.getAll();
    return activities.find(activity => activity.id === id) || null;
  },
  
  create(type: 'mapping' | 'ranking', settings: any): Activity {
    const newActivity = createDefaultActivity(type, settings.entryView?.title || '');
    
    // Extract hostName from settings and set it as a top-level property
    if (settings.entryView?.hostName) {
      newActivity.hostName = settings.entryView.hostName;
    }
    
    // Properly merge settings to preserve user input
    newActivity.settings = {
      ...newActivity.settings,
      entryView: {
        ...newActivity.settings.entryView,
        ...settings.entryView
      },
      tagCreation: {
        ...newActivity.settings.tagCreation,
        ...settings.tagCreation
      },
      ...(type === 'mapping' && settings.mapping && { mapping: settings.mapping }),
      ...(type === 'ranking' && settings.ranking && { ranking: settings.ranking }),
      ...(settings.results && { results: settings.results })
    };
    
    const activities = this.getAll();
    activities.push(newActivity);
    
    this.saveAll(activities);
    return newActivity;
  },
  
  update(id: string, updater: (activity: Activity) => Activity): Activity | null {
    const activities = this.getAll();
    const index = activities.findIndex(activity => activity.id === id);
    
    if (index === -1) return null;
    
    const activity = activities[index];
    const updatedActivity = updater({...activity});
    
    activities[index] = updatedActivity;
    this.saveAll(activities);
    
    return updatedActivity;
  },
  
  delete(id: string): boolean {
    const activities = this.getAll();
    const filteredActivities = activities.filter(activity => activity.id !== id);
    
    if (filteredActivities.length === activities.length) {
      return false;
    }
    
    this.saveAll(filteredActivities);
    
    // Add to deletion queue for sync
    const deletionQueue = localStorage.getItem('deletion_queue') ? 
      JSON.parse(localStorage.getItem('deletion_queue')) : [];
    if (!deletionQueue.includes(id)) {
      deletionQueue.push(id);
      localStorage.setItem('deletion_queue', JSON.stringify(deletionQueue));
    }
    
    return true;
  },
  
  addTag(activityId: string, tag: any): Activity | null {
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
        status: activity.settings?.tagCreation?.enableVoting ? 'pending' : 'approved'
      };
      
      activity.tags.push(newTag);
      activity.updatedAt = new Date();
      return activity;
    });
  },
  
  deleteTag(activityId: string, tagId: string): Activity | null {
    return this.update(activityId, activity => {
      activity.tags = activity.tags.filter(tag => tag.id !== tagId);
      activity.updatedAt = new Date();
      return activity;
    });
  },
  
  voteTag(activityId: string, tagId: string, vote: any): Activity | null {
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
      
      // Update tag status based on current vote count and threshold
      const tagCreationSettings = activity.settings?.tagCreation;
      if (tagCreationSettings?.enableVoting) {
        const thresholdType = tagCreationSettings.thresholdType || 'minimum';
        const minimumVotes = tagCreationSettings.minimumVotes || tagCreationSettings.voteThreshold || 1;
        
        if (thresholdType === 'minimum') {
          if (tag.status === 'pending' && tag.votes.length >= minimumVotes) {
            tag.status = 'approved';
          } else if (tag.status === 'approved' && tag.votes.length < minimumVotes) {
            tag.status = 'pending';
          }
        }
        // Note: topN threshold is handled by hybridActivityService to avoid race conditions
      }
      
      activity.updatedAt = new Date();
      return activity;
    });
  },
  
  changePhase(activityId: string, phase: string): Activity | null {
    return this.update(activityId, activity => {
      activity.phase = phase;
      activity.updatedAt = new Date();
      return activity;
    });
  },
  
  saveAll(activities: Activity[]): void {
    if (typeof window === 'undefined') return;
    
    // Format for serialization
    const serialized = activities.map(activity => ({
      ...activity,
      createdAt: activity.createdAt instanceof Date ? 
        activity.createdAt.toISOString() : activity.createdAt,
      updatedAt: activity.updatedAt instanceof Date ? 
        activity.updatedAt.toISOString() : activity.updatedAt,
      // Convert dates in votes and comments to strings
      tags: activity.tags?.map(tag => ({
        ...tag,
        votes: tag.votes?.map(vote => ({
          ...vote,
          timestamp: vote.timestamp instanceof Date ? 
            vote.timestamp.toISOString() : vote.timestamp
        })),
        comments: tag.comments?.map(comment => ({
          ...comment,
          timestamp: comment.timestamp instanceof Date ? 
            comment.timestamp.toISOString() : comment.timestamp
        }))
      }))
    }));
    
    activityStorage.set('list', serialized);
  }
};