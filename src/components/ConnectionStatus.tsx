// src/components/ConnectionStatus.tsx
"use client";

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/core/services/websocketService';
import { hybridActivityService } from '@/core/services/hybridActivityService';
import { syncService } from '@/core/services/syncService';

export default function ConnectionStatus() {
  const { isConnected, error: connectionError, offline } = useWebSocket();
  const [showDetail, setShowDetail] = useState(false);
  const [lastConnectedTime, setLastConnectedTime] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  
  // Update last connected time when the connection status changes
  useEffect(() => {
    if (isConnected) {
      setLastConnectedTime(new Date());
    }
    
    // Check for pending changes
    const checkPending = () => {
      const count = hybridActivityService.getPendingChangeCount();
      setPendingChanges(count);
    };
    
    checkPending();
    const intervalId = setInterval(checkPending, 5000);
    
    // Event listeners for sync status
    const handleSyncCompleted = (event: CustomEvent) => {
      const detail = event.detail;
      const { created, updated, deleted } = detail.syncResult;
      const totalChanges = created + updated + deleted;
      
      if (totalChanges > 0) {
        setSyncStatus(`Sync completed with ${totalChanges} changes`);
      } else {
        setSyncStatus('All data synchronized');
      }
      
      // Auto-clear after 5 seconds
      setTimeout(() => {
        setSyncStatus(null);
      }, 5000);
      
      // Update pending changes count
      checkPending();
    };
    
    const handleSyncError = (event: CustomEvent) => {
      setSyncStatus(`Sync error: ${event.detail.error}`);
    };
    
    window.addEventListener('sync_completed', handleSyncCompleted as EventListener);
    window.addEventListener('sync_error', handleSyncError as EventListener);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('sync_completed', handleSyncCompleted as EventListener);
      window.removeEventListener('sync_error', handleSyncError as EventListener);
    };
  }, [isConnected]);
  
  // Format last connected time
  const getTimeSinceConnected = () => {
    if (!lastConnectedTime) return 'never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastConnectedTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
    return `${Math.floor(diffSec / 3600)} hours ago`;
  };
  
  // Don't show if connected with no errors or pending changes
  if (isConnected && !connectionError && pendingChanges === 0 && !syncStatus) {
    return null;
  }
  
  return (
    <div 
      className={`connection-status ${isConnected ? 'connected' : 'disconnected'} ${pendingChanges > 0 ? 'has-pending' : ''} ${syncStatus ? 'syncing' : ''}`}
      onClick={() => setShowDetail(!showDetail)}
    >
      <div className="status-indicator">
        <span className="status-dot"></span>
        {offline ? (
          'Working offline. Changes saved locally.'
        ) : !isConnected ? (
          `Disconnected: ${connectionError || 'trying to reconnect...'}`
        ) : syncStatus ? (
          syncStatus
        ) : pendingChanges > 0 ? (
          `${pendingChanges} pending changes to sync`
        ) : (
          'Connected to session'
        )}
      </div>
      
      {showDetail && (
        <div className="status-details">
          <p>Connection Status: {isConnected ? 'Online' : 'Offline'}</p>
          <p>Last Connected: {isConnected ? 'Now' : getTimeSinceConnected()}</p>
          {pendingChanges > 0 && (
            <div className="pending-changes">
              <p>Pending changes: {pendingChanges}</p>
              {isConnected && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    syncService.syncData().catch(err => {
                      console.error('Error syncing data:', err);
                    });
                  }}
                  className="sync-button"
                >
                  Sync Now
                </button>
              )}
            </div>
          )}
          {connectionError && <p>Error: {connectionError}</p>}
          <p className="hint">Your work is saved locally even when offline.</p>
        </div>
      )}
      
      <style jsx>{`
        .connection-status {
          margin-top: 2rem;
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .connection-status:hover {
          opacity: 0.9;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .connection-status.connected {
          background-color: #e6f4ea;
          color: #34a853;
        }
        
        .connection-status.disconnected {
          background-color: #fdeded;
          color: #ea4335;
        }
        
        .connection-status.has-pending {
          background-color: #fef7e0;
          color: #fbbc04;
        }
        
        .connection-status.syncing {
          background-color: #e8f0fe;
          color: #4285f4;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: currentColor;
        }
        
        .status-details {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          font-size: 0.85rem;
        }
        
        .status-details p {
          margin: 0.3rem 0;
        }
        
        .hint {
          font-style: italic;
          opacity: 0.8;
          font-size: 0.8rem;
          margin-top: 0.5rem !important;
        }
        
        .pending-changes {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background-color: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }
        
        .sync-button {
          margin-top: 0.5rem;
          background-color: #4285f4;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.3rem 0.7rem;
          font-size: 0.8rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .sync-button:hover {
          background-color: #3367d6;
        }
      `}</style>
    </div>
  );
}