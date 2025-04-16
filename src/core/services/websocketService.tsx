// src/core/services/websocketService.tsx
"use client"

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { syncService } from './syncService';
import { hybridActivityService } from './hybridActivityService';

// Context for accessing WebSocket throughout the app
const WebSocketContext = createContext<{
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
  offline: boolean;
  joinActivity: (activityId: string, user: any) => void;
  leaveActivity: () => void;
  sendMessage: (event: string, data: any) => void;
  queuedMessages: any[];
}>({
  socket: null,
  isConnected: false,
  error: null,
  offline: false,
  joinActivity: () => {},
  leaveActivity: () => {},
  sendMessage: () => {},
  queuedMessages: []
});

// Global socket reference to prevent multiple instances
let globalSocketInstance: Socket | null = null;

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  // Use useRef to maintain socket reference across renders
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [queuedMessages, setQueuedMessages] = useState<any[]>([]);
  const connectionAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Check if we're offline
  useEffect(() => {
    const handleOffline = () => {
      setOffline(true);
      setIsConnected(false);
      setError('You are offline. Changes will be saved locally and synced when you reconnect.');
    };
    
    const handleOnline = () => {
      setOffline(false);
      
      // Try to reconnect the socket
      if (socketRef.current) {
        socketRef.current.connect();
      }
      
      // Try to sync data
      setTimeout(() => {
        syncService.syncData().catch(err => {
          console.error('Error syncing after reconnect:', err);
        });
      }, 1000); // Small delay to ensure connection is established
    };
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    // Initial check
    setOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);
  
  // Initialize WebSocket connection only once
  useEffect(() => {
    // Only create socket if it doesn't exist
    if (!socketRef.current && !globalSocketInstance) {
      const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';
      console.log(`Initializing WebSocket connection to ${WEBSOCKET_URL}`);
      
      const socketInstance = io(WEBSOCKET_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 10000,
        transports: ['websocket', 'polling']
      });
          
      socketRef.current = socketInstance;
      globalSocketInstance = socketInstance;
      
      // Connection event handlers
      socketInstance.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        connectionAttempts.current = 0;
        
        // Rejoin activity if there was one
        if (currentActivity && currentUser) {
          socketInstance.emit('join_activity', { 
            activityId: currentActivity,
            userId: currentUser.id,
            userName: currentUser.name
          });
        }
        
        // Send any queued messages
        if (queuedMessages.length > 0) {
          console.log(`Sending ${queuedMessages.length} queued messages`);
          
          queuedMessages.forEach(msg => {
            socketInstance.emit(msg.event, msg.data);
          });
          
          setQueuedMessages([]);
        }
      });

      // Activity-specific event handlers
      socketInstance.on('activity_updated', async (data) => {
        console.log(`Received activity_updated for ${data.activityId}`);
        
        // Fetch the updated activity from MongoDB
        try {
          const activity = await hybridActivityService.getById(data.activityId);
          
          // Refresh UI if needed
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('activity_updated', { 
              detail: { activityId: data.activityId } 
            }));
          }
        } catch (error) {
          console.error(`Error handling activity update for ${data.activityId}:`, error);
        }
      });
      
      socketInstance.on('tag_added', async (data) => {
        try {
          const activity = await hybridActivityService.getById(data.activityId);
          if (!activity) return;
          
          // Only update locally if we don't have this tag already
          if (!activity.tags.some(tag => tag.id === data.tag.id)) {
            await hybridActivityService.addTag(data.activityId, data.tag);
            
            // Trigger UI update
            window.dispatchEvent(new CustomEvent('tag_added', { 
              detail: { activityId: data.activityId, tagId: data.tag.id } 
            }));
          }
        } catch (error) {
          console.error('Error handling tag_added event:', error);
        }
      });
      
      socketInstance.on('tag_voted', async (data) => {
        try {
          const activity = await hybridActivityService.getById(data.activityId);
          if (!activity) return;
          
          await hybridActivityService.voteTag(data.activityId, data.tagId, data.vote);
          
          // Trigger UI update
          window.dispatchEvent(new CustomEvent('tag_voted', { 
            detail: { activityId: data.activityId, tagId: data.tagId } 
          }));
        } catch (error) {
          console.error('Error handling tag_voted event:', error);
        }
      });
      
      socketInstance.on('tag_deleted', async (data) => {
        try {
          const activity = await hybridActivityService.getById(data.activityId);
          if (!activity) return;
          
          await hybridActivityService.deleteTag(data.activityId, data.tagId);
          
          // Trigger UI update
          window.dispatchEvent(new CustomEvent('tag_deleted', { 
            detail: { activityId: data.activityId, tagId: data.tagId } 
          }));
        } catch (error) {
          console.error('Error handling tag_deleted event:', error);
        }
      });
      
      socketInstance.on('mapping_updated', async (data) => {
        try {
          const activity = await hybridActivityService.getById(data.activityId);
          if (!activity) return;
          
          // Update the activity with the new positions
          await hybridActivityService.update(data.activityId, (current) => {
            const userMappingIndex = current.mappings.findIndex(m => m.userId === data.userId);
            
            if (userMappingIndex >= 0) {
              current.mappings[userMappingIndex].positions = data.positions;
            } else {
              const userName = current.participants.find(p => p.id === data.userId)?.name || 'Unknown';
              current.mappings.push({
                userId: data.userId,
                userName,
                positions: data.positions,
                isComplete: false
              });
            }
            
            current.updatedAt = new Date();
            return current;
          });
          
          // Trigger UI update
          window.dispatchEvent(new CustomEvent('mapping_updated', { 
            detail: { activityId: data.activityId, userId: data.userId } 
          }));
        } catch (error) {
          console.error('Error handling mapping_updated event:', error);
        }
      });
      
      socketInstance.on('phase_changed', async (data) => {
        try {
          await hybridActivityService.changePhase(data.activityId, data.phase);
          
          // Trigger UI update
          window.dispatchEvent(new CustomEvent('phase_changed', { 
            detail: { activityId: data.activityId, phase: data.phase } 
          }));
        } catch (error) {
          console.error('Error handling phase_changed event:', error);
        }
      });
      
      socketInstance.on('participants_updated', async (data) => {
        try {
          const activity = await hybridActivityService.getById(data.activityId);
          if (!activity) return;
          
          // Update participants list
          await hybridActivityService.update(data.activityId, (current) => {
            // Merge participants - keep current data but update isConnected status
            const updatedParticipants = [...current.participants];
            
            data.participants.forEach(newParticipant => {
              const index = updatedParticipants.findIndex(p => p.id === newParticipant.id);
              
              if (index >= 0) {
                // Update existing participant
                updatedParticipants[index] = {
                  ...updatedParticipants[index],
                  isConnected: newParticipant.isConnected
                };
              } else if (newParticipant.name) {
                // Add new participant
                updatedParticipants.push(newParticipant);
              }
            });
            
            current.participants = updatedParticipants;
            return current;
          });
          
          // Trigger UI update
          window.dispatchEvent(new CustomEvent('participants_updated', { 
            detail: { activityId: data.activityId } 
          }));
        } catch (error) {
          console.error('Error handling participants_updated event:', error);
        }
      });
      
      socketInstance.on('activity_deleted', async (data) => {
        try {
          // Delete from local storage
          await hybridActivityService.delete(data.activityId);
          
          // Trigger UI update
          window.dispatchEvent(new CustomEvent('activity_deleted', { 
            detail: { activityId: data.activityId } 
          }));
        } catch (error) {
          console.error('Error handling activity_deleted event:', error);
        }
      });
    
      socketInstance.on('connect_error', (err) => {
        console.log('WebSocket connection error:', err.message);
        setIsConnected(false);
        
        connectionAttempts.current += 1;
        
        if (connectionAttempts.current >= maxReconnectAttempts) {
          console.log('Max reconnection attempts reached');
          setError(`Connection failed after ${maxReconnectAttempts} attempts. Working in offline mode.`);
          setOffline(true);
          socketInstance.disconnect();
        } else {
          setError(`Connection error: ${err.message}. Attempt ${connectionAttempts.current} of ${maxReconnectAttempts}.`);
        }
      });
      
      socketInstance.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          setError('Server disconnected the connection');
        } else if (reason === 'transport close' && !navigator.onLine) {
          setError('You are offline. Changes will be saved locally and synced when you reconnect.');
          setOffline(true);
        } else {
          setError('Connection lost. Attempting to reconnect...');
        }
      });
      
      // Only connect if we're online
      if (navigator.onLine) {
        try {
          socketInstance.connect();
        } catch (err) {
          console.error('Error connecting to WebSocket:', err);
          setError('Failed to establish connection. Working in offline mode.');
          setOffline(true);
        }
      } else {
        setError('You are offline. Changes will be saved locally and synced when you reconnect.');
        setOffline(true);
      }
    } else if (globalSocketInstance) {
      // Use the existing global instance
      socketRef.current = globalSocketInstance;
      setIsConnected(globalSocketInstance.connected);
    }
    
    // Cleanup on unmount
    return () => {
      // We don't disconnect here to prevent reconnection loops
      // Only clean up event listeners if needed
    };
  }, [currentActivity, currentUser, queuedMessages]);
  
  // Function to join an activity
  const joinActivity = (activityId: string, user: any) => {
    if (!user) return;
    
    setCurrentActivity(activityId);
    setCurrentUser(user);
    
    if (!offline && isConnected && socketRef.current) {
      socketRef.current.emit('join_activity', { 
        activityId, 
        userId: user.id,
        userName: user.name
      });
    } else {
      // Queue the join message for when we reconnect
      setQueuedMessages(prev => [
        ...prev,
        {
          event: 'join_activity',
          data: { 
            activityId, 
            userId: user.id,
            userName: user.name
          }
        }
      ]);
    }
  };
  
  // Function to leave current activity
  const leaveActivity = useCallback(() => {
    if (!currentActivity || !currentUser) return;
    
    console.log(`Leaving activity ${currentActivity}`);
    
    if (!offline && isConnected && socketRef.current) {
      socketRef.current.emit('leave_activity', { 
        activityId: currentActivity,
        userId: currentUser.id
      });
    }
    
    // Use functional updates to avoid dependency on state variables
    // This prevents infinite re-renders
    setCurrentActivity(prev => {
      // Only set to null if it hasn't already been set to null
      return prev !== null ? null : prev;
    });
  }, [isConnected, offline]); // Remove currentActivity and currentUser from dependencies
    
  // Function to send a message
  const sendMessage = (event: string, data: any) => {
    if (!offline && isConnected && socketRef.current) {
      socketRef.current.emit(event, data);
    } else {
      console.log(`Queueing message for later: ${event}`);
      
      // Queue message for when we reconnect
      setQueuedMessages(prev => [
        ...prev,
        { event, data }
      ]);
    }
  };
  
  return (
    <WebSocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      error,
      offline,
      joinActivity,
      leaveActivity,
      sendMessage,
      queuedMessages
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Function to get the global socket instance
export function getSocketInstance(): Socket | null {
  return globalSocketInstance;
}

// Hook to use the WebSocket service
export function useWebSocket() {
  return useContext(WebSocketContext);
}