// src/core/services/syncService.ts
"use client"

import { hybridActivityService } from './hybridActivityService';
import { activityService } from './activityService';
import { mongoDbService } from './mongoDbService';

export const syncService = {
  // Track sync status
  _syncStatus: {
    lastSyncTime: null as Date | null,
    isSyncing: false,
    error: null as string | null,
    syncResult: {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0
    }
  },

  // Get current sync status
  getSyncStatus() {
    return {
      ...this._syncStatus,
      lastSyncTime: this._syncStatus.lastSyncTime ? new Date(this._syncStatus.lastSyncTime) : null
    };
  },

  // Reset sync statistics
  resetSyncStats() {
    this._syncStatus.syncResult = {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: 0
    };
    this._syncStatus.error = null;
  },

  /**
   * Get status of pending changes waiting to be synced
   */
  getPendingChangesCount(): number {
    // Check if we have any pending creates, updates, or deletes
    let count = 0;
    
    if (localStorage.getItem('pending_create')) {
      try {
        const pendingCreates = JSON.parse(localStorage.getItem('pending_create') || '{}');
        count += Object.keys(pendingCreates).length;
      } catch (e) {}
    }
    
    if (localStorage.getItem('pending_update')) {
      try {
        const pendingUpdates = JSON.parse(localStorage.getItem('pending_update') || '{}');
        count += Object.keys(pendingUpdates).length;
      } catch (e) {}
    }
    
    if (localStorage.getItem('pending_delete')) {
      try {
        const pendingDeletes = JSON.parse(localStorage.getItem('pending_delete') || '[]');
        count += pendingDeletes.length;
      } catch (e) {}
    }
    
    return count;
  },

  /**
   * Synchronize data between local storage and MongoDB
   */
  async syncData(): Promise<any> {
    console.log('Starting data synchronization...');
    
    if (this._syncStatus.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return this._syncStatus;
    }
    
    // Check if online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this._syncStatus.error = 'Cannot sync while offline';
      return this._syncStatus;
    }
    
    this._syncStatus.isSyncing = true;
    this.resetSyncStats();
    
    try {
      // Step 1: Process pending changes first (local → remote)
      const pendingCount = this.getPendingChangesCount();
      
      if (pendingCount > 0) {
        console.log(`Processing ${pendingCount} pending changes...`);
        await hybridActivityService.syncPendingChanges();
      } else {
        console.log('No pending changes to process.');
      }
      
      // Step 2: Only fetch remote data if we've had successful network operations
      // and it's been at least 5 minutes since last sync
      const now = new Date();
      const lastSync = this._syncStatus.lastSyncTime;
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      if (!lastSync || lastSync < fiveMinutesAgo) {
        console.log('Fetching all remote activities...');
        const remoteActivities = await mongoDbService.getActivities();
        
        // Create a map of remote activities by ID
        const remoteActivityMap = new Map(remoteActivities.map(activity => [activity.id, activity]));
        
        // Get all local activities
        const localActivities = activityService.getAll();
        
        // Create a map of local activities by ID
        const localActivityMap = new Map(localActivities.map(activity => [activity.id, activity]));
        
        // Step 3: Update local storage with remote data, but only for activities
        // that have been modified more recently on the server
        for (const remoteActivity of remoteActivities) {
          const localActivity = localActivityMap.get(remoteActivity.id);
          
          if (!localActivity) {
            // Activity exists remotely but not locally - add it
            console.log(`Adding new remote activity to local storage: ${remoteActivity.id}`);
            localActivityMap.set(remoteActivity.id, remoteActivity);
            this._syncStatus.syncResult.created++;
          } else {
            // Activity exists both locally and remotely - check which is newer
            const localUpdatedAt = new Date(localActivity.updatedAt).getTime();
            const remoteUpdatedAt = new Date(remoteActivity.updatedAt).getTime();
            
            if (remoteUpdatedAt > localUpdatedAt) {
              // Remote is newer - update local
              console.log(`Updating local activity with remote data: ${remoteActivity.id}`);
              localActivityMap.set(remoteActivity.id, remoteActivity);
              this._syncStatus.syncResult.updated++;
            }
          }
        }
        
        // Step 4: Check for activities that were deleted remotely
        const deletionQueue = localStorage.getItem('pending_delete') ? 
          JSON.parse(localStorage.getItem('pending_delete')) : [];
        
        for (const localActivity of localActivities) {
          // Skip if it's in the deletion queue (already marked for deletion)
          if (deletionQueue.includes(localActivity.id)) continue;
          
          // If it exists locally but not remotely, it might have been deleted remotely
          if (!remoteActivityMap.has(localActivity.id)) {
            // Skip recently created activities that might not have synced yet
            if ((localActivity as any)._creationAttempted) {
              console.log(`Keeping locally created activity ${localActivity.id} that hasn't synced yet`);
              continue;
            }
            
            console.log(`Activity ${localActivity.id} exists locally but not remotely, marking for deletion`);
            // Remove from local map
            localActivityMap.delete(localActivity.id);
            this._syncStatus.syncResult.deleted++;
          }
        }
        
        // Step 5: Save the final merged activity list to local storage
        activityService.saveAll(Array.from(localActivityMap.values()));
      } else {
        console.log(`Skipping remote data fetch - last sync was less than 5 minutes ago (${lastSync})`);
      }
      
      // Update sync status
      this._syncStatus.lastSyncTime = new Date();
      console.log('Synchronization complete with results:', this._syncStatus.syncResult);
      
      // Trigger event to refresh UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync_completed', { 
          detail: this._syncStatus 
        }));
      }
      
      return this._syncStatus;
    } catch (error) {
      console.error('Error during synchronization:', error);
      this._syncStatus.error = error instanceof Error ? error.message : 'Unknown sync error';
      this._syncStatus.syncResult.errors++;
      
      // Trigger event to notify error
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync_error', { 
          detail: this._syncStatus 
        }));
      }
      
      throw error;
    } finally {
      this._syncStatus.isSyncing = false;
    }
  },
  
  /**
   * Setup automatic background sync
   * This will sync whenever the app comes online
   */
  setupAutoSync(intervalMinutes = 5) {
    if (typeof window === 'undefined') return;
    
    // Sync when coming online
    window.addEventListener('online', () => {
      console.log('Network connection restored, syncing data...');
      this.syncData().catch(err => console.error('Auto-sync error:', err));
    });
    
    // Periodic sync when online
    const intervalId = setInterval(() => {
      if (navigator.onLine && !this._syncStatus.isSyncing) {
        console.log('Running periodic sync...');
        this.syncData().catch(err => console.error('Periodic sync error:', err));
      }
    }, intervalMinutes * 60 * 1000);
    
    // Clear interval on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(intervalId);
    });
    
    // Initial sync if online
    if (navigator.onLine) {
      setTimeout(() => {
        this.syncData().catch(err => console.error('Initial sync error:', err));
      }, 1000); // Small delay to let app initialize
    }
  }
};