// src/components/OfflineIndicator.tsx
"use client";

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/core/services/websocketService';
import { syncService } from '@/core/services/syncService';
import { hybridActivityService } from '@/core/services/hybridActivityService';

export default function OfflineIndicator() {
  const { isConnected } = useWebSocket();
  const [isOffline, setIsOffline] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Check online status and pending changes
  useEffect(() => {
    const checkStatus = () => {
      const isCurrentlyOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      setIsOffline(isCurrentlyOffline);
      
      // Check if we have pending changes
      const pendingCount = hybridActivityService.getPendingChangeCount();
      setPendingChanges(pendingCount);
      
      // Get last sync time
      const syncStatusInfo = syncService.getSyncStatus();
      setLastSyncTime(syncStatusInfo.lastSyncTime);
    };
    
    // Run immediately and set up periodic check
    checkStatus();
    const intervalId = setInterval(checkStatus, 10000);
    
    // Event listeners for online/offline
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);
    
    // Sync completed event
    const handleSyncCompleted = (event: any) => {
      const detail = event.detail;
      setSyncStatus('success');
      setLastSyncTime(detail.lastSyncTime);
      
      // Show success message with counts
      const { created, updated, deleted } = detail.syncResult;
      const totalChanges = created + updated + deleted;
      
      if (totalChanges > 0) {
        setSyncMessage(`Sync completed: ${totalChanges} activities synchronized (${created} new, ${updated} updated, ${deleted} removed)`);
      } else {
        setSyncMessage('Sync completed. All data is up to date.');
      }
      
      // Check pending changes
      setPendingChanges(hybridActivityService.getPendingChangeCount());
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        if (syncStatus === 'success') {
          setSyncStatus('idle');
        }
      }, 5000);
    };
    
    // Sync error event
    const handleSyncError = (event: any) => {
      setSyncStatus('error');
      setSyncMessage(`Sync error: ${event.detail.error}`);
      
      // Set expanded to show error details
      setIsExpanded(true);
    };
    
    // Listen for sync events
    window.addEventListener('sync_completed', handleSyncCompleted);
    window.addEventListener('sync_error', handleSyncError);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
      window.removeEventListener('sync_completed', handleSyncCompleted);
      window.removeEventListener('sync_error', handleSyncError);
    };
  }, [syncStatus]);
  
  // Handle connection status change
  useEffect(() => {
    if (isConnected && !isOffline && pendingChanges > 0) {
      // We've just reconnected with pending changes - start sync
      setSyncStatus('syncing');
      setSyncMessage(`Synchronizing ${pendingChanges} pending changes...`);
      
      syncService.syncData()
        .then(() => {
          // This will be handled by the event listener
        })
        .catch(error => {
          setSyncStatus('error');
          setSyncMessage(`Error synchronizing: ${error.message}`);
        });
    }
  }, [isConnected, isOffline, pendingChanges]);
  
  // Don't show for normal connected state with no pending changes
  if (!isOffline && syncStatus !== 'syncing' && syncStatus !== 'error' && pendingChanges === 0) {
    return null;
  }
  
  // Format time since last sync
  const formatTimeSince = (date: Date | null) => {
    if (!date) return 'never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    return `${Math.floor(diffSec / 86400)} days ago`;
  };
  
  return (
    <div 
      className={`offline-indicator ${isOffline ? 'offline' : ''} ${syncStatus} ${isExpanded ? 'expanded' : ''} ${pendingChanges > 0 ? 'has-pending' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="indicator-content">
        <div className="status-icon">
          {isOffline && <span className="offline-icon">⚠️</span>}
          {syncStatus === 'syncing' && <span className="syncing-icon">🔄</span>}
          {syncStatus === 'success' && <span className="success-icon">✅</span>}
          {syncStatus === 'error' && <span className="error-icon">❌</span>}
          {!isOffline && syncStatus === 'idle' && pendingChanges > 0 && (
            <span className="pending-icon">📤</span>
          )}
        </div>
        
        <div className="status-message">
          {isOffline && 'You are working offline. Changes will be saved locally.'}
          {!isOffline && syncStatus === 'syncing' && syncMessage}
          {!isOffline && syncStatus === 'success' && syncMessage}
          {!isOffline && syncStatus === 'error' && syncMessage}
          {!isOffline && syncStatus === 'idle' && pendingChanges > 0 && (
            `${pendingChanges} pending changes to sync`
          )}
        </div>
        
        <div className="expand-icon">
          {isExpanded ? '▼' : '▲'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="expanded-content">
          {isOffline && (
            <div>
              <p>While offline:</p>
              <ul>
                <li>Your changes are saved to your device</li>
                <li>Real-time collaboration is paused</li>
                <li>Changes will sync when you reconnect</li>
              </ul>
              <p>Last sync: {formatTimeSince(lastSyncTime)}</p>
            </div>
          )}
          
          {!isOffline && pendingChanges > 0 && syncStatus !== 'syncing' && (
            <div>
              <p>You have {pendingChanges} changes waiting to be synchronized:</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSyncStatus('syncing');
                  setSyncMessage(`Synchronizing ${pendingChanges} pending changes...`);
                  
                  syncService.syncData()
                    .then(() => {
                      // Success will be handled by event listener
                    })
                    .catch(error => {
                      setSyncStatus('error');
                      setSyncMessage(`Error synchronizing: ${error.message}`);
                    });
                }}
                className="sync-button"
              >
                Sync Now
              </button>
            </div>
          )}
          
          {syncStatus === 'error' && (
            <div>
              <p>Synchronization failed. You can:</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSyncStatus('syncing');
                  setSyncMessage('Retrying synchronization...');
                  
                  syncService.syncData()
                    .then(() => {
                      // Success will be handled by event listener
                    })
                    .catch(error => {
                      setSyncStatus('error');
                      setSyncMessage(`Error synchronizing: ${error.message}`);
                    });
                }}
                className="retry-button"
              >
                Retry Synchronization
              </button>
            </div>
          )}
          
          {syncStatus === 'syncing' && (
            <div>
              <p>Synchronizing your data with the server...</p>
              <div className="sync-progress">
                <div className="sync-spinner"></div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .offline-indicator {
          position: fixed;
          bottom: 20px;
          left: 20px;
          padding: 12px 16px;
          border-radius: 8px;
          background-color: white;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          cursor: pointer;
          transition: all 0.3s ease;
          max-width: 300px;
        }
        
        .offline-indicator.offline {
          background-color: #fdeded;
          border-left: 4px solid #ea4335;
        }
        
        .offline-indicator.syncing {
          background-color: #e8f0fe;
          border-left: 4px solid #4285f4;
        }
        
        .offline-indicator.success {
          background-color: #e6f4ea;
          border-left: 4px solid #34a853;
        }
        
        .offline-indicator.error {
          background-color: #fdeded;
          border-left: 4px solid #ea4335;
        }
        
        .offline-indicator.has-pending {
          background-color: #fef7e0;
          border-left: 4px solid #fbbc04;
        }
        
        .offline-indicator.expanded {
          max-width: 350px;
        }
        
        .indicator-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .status-icon {
          font-size: 18px;
        }
        
        .status-message {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
        }
        
        .expand-icon {
          font-size: 12px;
          color: #5f6368;
        }
        
        .expanded-content {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          font-size: 13px;
        }
        
        .expanded-content ul {
          margin: 8px 0;
          padding-left: 24px;
        }
        
        .expanded-content li {
          margin-bottom: 4px;
        }
        
        .sync-button, .retry-button {
          margin-top: 8px;
          background-color: #4285f4;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .sync-button:hover, .retry-button:hover {
          background-color: #3367d6;
        }
        
        .retry-button {
          background-color: #ea4335;
        }
        
        .retry-button:hover {
          background-color: #d93025;
        }
        
        .sync-progress {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .sync-spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(66, 133, 244, 0.2);
          border-top-color: #4285f4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .syncing-icon {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}