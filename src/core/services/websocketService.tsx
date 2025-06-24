// src/core/services/websocketService.tsx
"use client"

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { syncService } from './syncService';
import { hybridActivityService } from './hybridActivityService';
import { activityService } from './activityService';

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
  const maxReconnectAttempts = 12;
  
  // Check if we're offline
  useEffect(() => {
    const handleOffline = () => {
      setOffline(true);
      //setIsConnected(false);
      setError('You are offline. Changes will be saved locally and synced when you reconnect.');
    };
    
    const handleOnline = () => {
      setOffline(false);

      // if the socket never lost its connection, mark us as connected again
      if (socketRef.current?.connected) {
        setIsConnected(true);
      }
      setError(null);               // clear the banner message

      // kick the socket if it *was* down
      socketRef.current?.connect();

      // small delay so the socket handshake finishes
      setTimeout(() => {
        syncService.syncData().catch(console.error);
      }, 1000);
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

  // Add connection state tracking to prevent multiple simultaneous operations
  let isLeavingActivity = false;
  let leaveActivityTimeout: NodeJS.Timeout | null = null;

  // Fixed leaveActivity function with debouncing
  const leaveActivity = useCallback((clearState = true) => {
    if (!currentActivity || !currentUser || isLeavingActivity) {
      return;
    }
    
    isLeavingActivity = true;
    
    // Clear any pending leave operations
    if (leaveActivityTimeout) {
      clearTimeout(leaveActivityTimeout);
    }
    
    // Debounce the leave operation
    leaveActivityTimeout = setTimeout(() => {
      if (socketRef.current && socketRef.current.connected) {
        try {
          socketRef.current.emit('leave_activity', { 
            activityId: currentActivity,
            userId: currentUser.id,
            userName: currentUser.name
          });
        } catch (error) {
          console.error('Error sending leave_activity event:', error);
        }
      }
      
      // Only update state if explicitly requested
      if (clearState) {
        setCurrentActivity(null);
        setCurrentUser(null);
      }
      
      isLeavingActivity = false;
    }, 100); // 100ms debounce
  }, [currentActivity, currentUser]);
  
  // Function to send a message
  const sendMessage = (event: string, data: any) => {
    if (!offline && isConnected && socketRef.current) {
      socketRef.current.emit(event, data);
    } else {
      // Queue message for when we reconnect
      setQueuedMessages(prev => [
        ...prev,
        { event, data }
      ]);
    }
  };
  
  // Initialize WebSocket connection only once
  useEffect(() => {
    // Only create socket if it doesn't exist
    if (!socketRef.current && !globalSocketInstance) {
      const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';
      const socketInstance = io(WEBSOCKET_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 12,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        transports: ['websocket', 'polling']
      });
          
      socketRef.current = socketInstance;
      globalSocketInstance = socketInstance;
      
      // Connection event handlers
      socketInstance.on('connect', () => {
        setIsConnected(true);
        setOffline(false);
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
          queuedMessages.forEach(msg => {
            socketInstance.emit(msg.event, msg.data);
          });
          
          setQueuedMessages([]);
        }
      });

      socketInstance.on('reconnect', () => {
        setOffline(false);
        setError(null);
      });

      // Activity-specific event handlers
      socketInstance.on('activity_updated', async (data) => {
        try {
          // Before fetching, get current tags to check for duplications later
          const currentActivity = await hybridActivityService.getById(data.activityId);
          const currentTagIds = currentActivity?.tags.map(t => t.id) || [];
          
          // Fetch the updated activity
          const updatedActivity = await hybridActivityService.getById(data.activityId);
          if (updatedActivity) {
            // Check for duplicate tags
            const tagIds = updatedActivity.tags.map(t => t.id);
            const uniqueTagIds = [...new Set(tagIds)];
            
            if (tagIds.length !== uniqueTagIds.length) {
              // Fix duplicates by keeping only one copy of each tag
              updatedActivity.tags = updatedActivity.tags.filter((tag, index) => {
                return tagIds.indexOf(tag.id) === index;
              });
              
              // Update the activity with de-duplicated tags
              await hybridActivityService.update(data.activityId, () => updatedActivity);
            }
            
            // Trigger UI update
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
          // Skip fetching from MongoDB - directly add the tag to local state
          const currentActivity = await hybridActivityService.getById(data.activityId);
          if (!currentActivity) {
            return;
          }
          
          // Check if tag already exists locally
          const tagExists = currentActivity.tags.some(t => t.id === data.tag.id);
          
          // Add tag directly to local activity (only if it doesn't exist)
          if (!tagExists) {
            await hybridActivityService.update(data.activityId, (activity) => {
              // Ensure we don't add the tag if it somehow got added
              if (!activity.tags.some(t => t.id === data.tag.id)) {
                activity.tags.push(data.tag);
              }
              return activity;
            });
          }
          
          // Always trigger UI update with custom event for notifications
          window.dispatchEvent(new CustomEvent('tag_added', { 
            detail: { 
              activityId: data.activityId, 
              tagId: data.tag.id,
              creatorId: data.tag.creatorId,
              creatorName: data.tag.creatorName
            } 
          }));
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
            // Start with existing participants to preserve names and other data
            const existingParticipantsMap = new Map();
            current.participants.forEach(p => existingParticipantsMap.set(p.id, p));
            
            // Process incoming participants
            const updatedParticipants = [];
            
            // Process each participant from the server
            data.participants.forEach(newParticipant => {
              const existingParticipant = existingParticipantsMap.get(newParticipant.id);
              
              if (existingParticipant) {
                // Update existing participant with new connection status
                updatedParticipants.push({
                  ...existingParticipant,
                  isConnected: newParticipant.isConnected
                });
              } else if (newParticipant.name) {
                // Add new participant (must have a name)
                updatedParticipants.push(newParticipant);
              }
            });
            
            // For any participants in the activity but not in the server data,
            // assume they're disconnected but keep them in the list
            current.participants.forEach(p => {
              if (!data.participants.some(np => np.id === p.id)) {
                updatedParticipants.push({
                  ...p,
                  isConnected: false
                });
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
          // Only delete from local storage (don't call hybridActivityService.delete to avoid loop)
          activityService.delete(data.activityId);
          
          // Trigger UI update
          window.dispatchEvent(new CustomEvent('activity_deleted', { 
            detail: { activityId: data.activityId } 
          }));
        } catch (error) {
          console.error('Error handling activity_deleted event:', error);
        }
      });
    
      socketInstance.on('connect_error', (err) => {
        setIsConnected(false);
        
        connectionAttempts.current += 1;
        
        if (connectionAttempts.current >= maxReconnectAttempts) {
          setError(`Connection failed after ${maxReconnectAttempts} attempts. Working in offline mode.`);
          setOffline(true);
        } else {
          setError(`Connection error: ${err.message}. Attempt ${connectionAttempts.current} of ${maxReconnectAttempts}.`);
        }
      });
      
      socketInstance.on('disconnect', (reason) => {
        // Check if component is still mounted before updating state
        try {
          setIsConnected(false);
          
          if (reason === 'io server disconnect') {
            setError('Server disconnected the connection');
          } else if (reason === 'transport close' && !navigator.onLine) {
            setError('You are offline. Changes will be saved locally and synced when you reconnect.');
            setOffline(true);
          } else {
            setError('Connection lost. Attempting to reconnect...');
          }
        } catch (error) {
          console.error('Error updating state on disconnect:', error);
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
      // Clean up any pending timeouts
      if (leaveActivityTimeout) {
        clearTimeout(leaveActivityTimeout);
      }
      
      // Only leave if we haven't already started leaving
      /*if (hasJoinedRef.current && !isLeavingActivity) {
        console.log(`Cleanup: Leaving activity ${currentActivity} for user`, currentUser?.id);
        hasJoinedRef.current = false;
        
        try {
          leaveActivity(false);
        } catch (error) {
          console.error('Error during leaveActivity in cleanup:', error);
        }
      }*/

      if (currentActivity && currentUser && !isLeavingActivity) {
        try {
          leaveActivity(false);
        } catch (error) {
          console.error('Error during leaveActivity in cleanup:', error);
        }
      }
      
      // Clean up socket event listeners to prevent memory leaks
      const cleanupSocket = socketRef.current;
      if (cleanupSocket) {
        try {
          cleanupSocket.off('connect');
          cleanupSocket.off('disconnect');
          cleanupSocket.off('connect_error');
        } catch (error) {
          console.error('Error cleaning up socket event listeners:', error);
        }
      }
    };

    const resume = () => {
      if (socketRef.current?.disconnected && navigator.onLine) {
        socketRef.current.connect();
      }
    };
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resume();
    });

    return () => {
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [currentActivity, currentUser, leaveActivity]);
  
  // Add connection health monitoring
  useEffect(() => {
    if (!socketRef.current) return;
    
    const socket = socketRef.current;
    let healthCheckInterval: NodeJS.Timeout;
    
    // Ping server every 30 seconds to maintain connection
    healthCheckInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 30000);
    
    // Handle pong response
    socket.on('pong', () => {
      // Connection is healthy
    });
    
    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
      socket.off('pong');
    };
  }, [socketRef.current]);

  // Function to join an activity
  const joinActivity = (activityId: string, user: any) => {
    if (!user) return;
    
    // Don't rejoin if already in the same activity as the same user
    if (currentActivity === activityId && currentUser?.id === user.id) {
      return;
    }
    
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

// Alias for useSocket
export function useSocket() {
  const { socket } = useWebSocket();
  return socket;
}