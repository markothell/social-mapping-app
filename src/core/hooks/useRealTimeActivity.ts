// src/core/hooks/useRealTimeActivity.ts
"use client"

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from '../services/websocketService';
import { hybridActivityService } from '../services/hybridActivityService';
import { Activity } from '@/models/Activity';

/**
 * Hook for managing an activity with real-time updates
 * This hook centralizes all real-time activity operations and state
 * 
 * @param activityId The ID of the activity to manage
 * @param user The current user object
 * @returns Activity state and operations
 */
export function useRealTimeActivity(activityId: string, user: any) {
  const { 
    isConnected, 
    error: connectionError, 
    offline,
    joinActivity, 
    leaveActivity, 
    sendMessage 
  } = useWebSocket();
  
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Using refs to track state without causing effect re-runs
  const hasJoinedRef = useRef(false);
  const currentActivityRef = useRef<string | null>(null);
  const currentUserRef = useRef<any>(null);
  
  // Update refs when props change
  useEffect(() => {
    currentActivityRef.current = activityId;
    currentUserRef.current = user;
  }, [activityId, user]);
  
  // Load initial activity data
  useEffect(() => {
    if (!activityId) {
      setLoading(false);
      setError('Activity ID is required');
      return;
    }
    
    const loadActivity = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const activityData = await hybridActivityService.getById(activityId);
        
        if (activityData) {
          setActivity(activityData);
          setParticipants(activityData.participants || []);
        } else {
          setError('Activity not found');
        }
      } catch (error) {
        setError('Failed to load activity');
      } finally {
        setLoading(false);
      }
    };
    
    loadActivity();
  }, [activityId]);
  
  // Set up real-time connection and event listeners
  useEffect(() => {
    if (!user || !activityId) return;
    
    // Join the activity when connected (allow re-joining if connection was lost)
    if (isConnected) {
      if (!hasJoinedRef.current) {
        joinActivity(activityId, user);
        hasJoinedRef.current = true;
      } else {
        joinActivity(activityId, user);
      }
    }
    
    // Event listeners for real-time updates
    const handleActivityUpdated = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.activityId === currentActivityRef.current) {
        // Refresh the activity data
        hybridActivityService.getById(currentActivityRef.current).then(activity => {
          if (activity) {
            setActivity(activity);
            setParticipants(activity.participants || []);
          }
        });
      }
    };
    
    const handleParticipantsUpdated = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.activityId === currentActivityRef.current) {
        // Refresh the activity data to get updated participants
        hybridActivityService.getById(currentActivityRef.current).then(activity => {
          if (activity) {
            setParticipants(activity.participants || []);
          }
        });
      }
    };
    
    const handleRefreshParticipants = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.activityId === currentActivityRef.current) {
        hybridActivityService.getById(currentActivityRef.current).then(activity => {
          if (activity) {
            setParticipants(activity.participants || []);
          }
        });
      }
    };
    
    const handleTagAdded = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.activityId === currentActivityRef.current) {
        // Check if we already have this tag before refreshing
        if (activity && activity.tags.some(tag => tag.id === detail.tagId)) {
          return;
        }
        
        // Refresh the activity data
        hybridActivityService.getById(currentActivityRef.current).then(updatedActivity => {
          if (updatedActivity) {
            // Before updating state, check for duplicates
            const uniqueTags = [...new Map(updatedActivity.tags.map(tag => [tag.id, tag])).values()];
            if (uniqueTags.length !== updatedActivity.tags.length) {
              updatedActivity.tags = uniqueTags;
            }
            
            setActivity(updatedActivity);
          }
        });
      }
    };
    
    const handleTagVoted = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.activityId === currentActivityRef.current) {
        // Refresh the activity data to get updated tags
        hybridActivityService.getById(currentActivityRef.current).then(activity => {
          if (activity) {
            setActivity(activity);
          }
        });
      }
    };
    
    const handleTagDeleted = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.activityId === currentActivityRef.current) {
        // Refresh the activity data to get updated tags
        hybridActivityService.getById(currentActivityRef.current).then(activity => {
          if (activity) {
            setActivity(activity);
          }
        });
      }
    };
    
    const handleMappingUpdated = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.activityId === currentActivityRef.current) {
        // Refresh the activity data to get updated mappings
        hybridActivityService.getById(currentActivityRef.current).then(activity => {
          if (activity) {
            setActivity(activity);
          }
        });
      }
    };
    
    const handlePhaseChanged = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.activityId === currentActivityRef.current) {
        // Refresh the activity data to get updated phase
        hybridActivityService.getById(currentActivityRef.current).then(activity => {
          if (activity) {
            setActivity(activity);
          }
        });
      }
    };
    
    // Handle connection status changes
    const handleConnectionChange = () => {
      // Only rejoin if we were previously joined and now connected
      if (hasJoinedRef.current && isConnected && currentUserRef.current && currentActivityRef.current) {
        joinActivity(currentActivityRef.current, currentUserRef.current);
      }
    };
    
    // Add event listeners
    window.addEventListener('activity_updated', handleActivityUpdated as EventListener);
    window.addEventListener('participants_updated', handleParticipantsUpdated as EventListener);
    window.addEventListener('refresh_participants', handleRefreshParticipants as EventListener);
    window.addEventListener('tag_added', handleTagAdded as EventListener);
    window.addEventListener('tag_voted', handleTagVoted as EventListener);
    window.addEventListener('tag_deleted', handleTagDeleted as EventListener);
    window.addEventListener('mapping_updated', handleMappingUpdated as EventListener);
    window.addEventListener('phase_changed', handlePhaseChanged as EventListener);
    
    // Cleanup function
    return () => {
      // Remove event listeners
      window.removeEventListener('activity_updated', handleActivityUpdated as EventListener);
      window.removeEventListener('participants_updated', handleParticipantsUpdated as EventListener);
      window.removeEventListener('refresh_participants', handleRefreshParticipants as EventListener);
      window.removeEventListener('tag_added', handleTagAdded as EventListener);
      window.removeEventListener('tag_voted', handleTagVoted as EventListener);
      window.removeEventListener('tag_deleted', handleTagDeleted as EventListener);
      window.removeEventListener('mapping_updated', handleMappingUpdated as EventListener);
      window.removeEventListener('phase_changed', handlePhaseChanged as EventListener);
      
      // Only leave the activity when the component unmounts or activityId changes
      // Don't leave if we're just navigating within the same activity
      if (hasJoinedRef.current && currentActivityRef.current) {
        // Check if we're changing activities (not just navigating within the same activity)
        const isChangingActivities = activityId !== currentActivityRef.current;
        
        if (isChangingActivities) {
          hasJoinedRef.current = false;
          try {
            leaveActivity(false);
          } catch (error) {
            console.error('Error during leaveActivity in cleanup:', error);
          }
        }
      }
    };
  }, [activityId, user?.id, isConnected]); // Include isConnected so we join when connected
  
  // Handler function for adding a tag
  const addTag = useCallback(async (tag: any) => {
    if (!activity || !user) return null;
    
    try {
      // Generate a unique tag ID with more entropy
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 10);
      const tagWithId = {
        ...tag,
        id: tag.id || `tag_${timestamp}_${random}`
      };
      
      // First update locally/in database
      const updatedActivity = await hybridActivityService.addTag(activityId, tagWithId);
      
      if (updatedActivity) {
        setActivity(updatedActivity);
      }
      
      // Then emit to other clients if online
      if (isConnected && !offline) {
        sendMessage('add_tag', {
          activityId,
          tag: tagWithId
        });
      }
      
      return updatedActivity;
    } catch (error) {
      console.error('Error adding tag:', error);
      return null;
    }
  }, [activity, activityId, isConnected, offline, sendMessage, user]);
    
  // Handler function for voting on a tag
  const voteTag = useCallback(async (tagId: string) => {
    if (!activity || !user) return null;
    
    try {
      // Create vote object
      const vote = {
        userId: user.id,
        userName: user.name,
        timestamp: new Date()
      };
      
      // First update locally/in database
      const updatedActivity = await hybridActivityService.voteTag(
        activityId, 
        tagId, 
        vote
      );
      
      if (updatedActivity) {
        setActivity(updatedActivity);
      }
      
      // Then emit to other clients if online
      if (isConnected && !offline) {
        sendMessage('vote_tag', {
          activityId,
          tagId,
          vote
        });
      }
      
      return updatedActivity;
    } catch (error) {
      console.error('Error voting for tag:', error);
      return null;
    }
  }, [activity, activityId, isConnected, offline, sendMessage, user]);
  
  // Handler function for deleting a tag
  const deleteTag = useCallback(async (tagId: string) => {
    if (!activity) {
      return null;
    }
    
    try {
      // Ensure the tag exists in the activity
      const tagExists = activity.tags.some(tag => tag.id === tagId);
      if (!tagExists) {
        return null;
      }
      
      // First update locally/in database
      const updatedActivity = await hybridActivityService.deleteTag(
        activityId, 
        tagId
      );
      
      if (updatedActivity) {
        // Update local state immediately for responsive UI
        setActivity(updatedActivity);
        
        // Then emit to other clients if online
        if (isConnected && !offline) {
          sendMessage('delete_tag', {
            activityId,
            tagId
          });
        }
        
        return updatedActivity;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }, [activity, activityId, isConnected, offline, sendMessage]);
  
  // Handler function for updating mapping
  const updateMapping = useCallback(async (positions: any[], isComplete: boolean = false) => {
    if (!activity || !user) return null;
    
    try {
      // First update locally/in database
      const updatedActivity = await hybridActivityService.update(activityId, (current) => {
        const userMapping = current.mappings.find(m => m.userId === user.id);
        
        if (userMapping) {
          userMapping.positions = positions;
          // Set isComplete flag based on the parameter
          userMapping.isComplete = isComplete;
        } else {
          current.mappings.push({
            userId: user.id,
            userName: user.name,
            positions,
            isComplete: isComplete // Set initial isComplete value
          });
        }
        
        current.updatedAt = new Date();
        return current;
      });
      
      if (updatedActivity) {
        setActivity(updatedActivity);
      }
      
      // Then emit to other clients if online
      if (isConnected && !offline) {
        sendMessage('update_mapping', {
          activityId,
          userId: user.id,
          positions,
          isComplete // Include isComplete flag in the message
        });
      }
      
      return updatedActivity;
    } catch (error) {
      console.error('Error updating mapping:', error);
      return null;
    }
  }, [activity, activityId, isConnected, offline, sendMessage, user]);
  
  // Handler function for changing activity phase
  const changePhase = useCallback(async (phase: string) => {
    if (!activity) return null;
    
    try {
      // First update locally/in database
      const updatedActivity = await hybridActivityService.changePhase(
        activityId, 
        phase
      );
      
      if (updatedActivity) {
        setActivity(updatedActivity);
      }
      
      // Then emit to other clients if online
      if (isConnected && !offline) {
        sendMessage('change_phase', {
          activityId,
          phase
        });
      }
      
      return updatedActivity;
    } catch (error) {
      console.error('Error changing phase:', error);
      return null;
    }
  }, [activity, activityId, isConnected, offline, sendMessage]);
  
  // Function to manually refresh the activity data
  const refreshActivity = useCallback(async () => {
    try {
      const refreshedActivity = await hybridActivityService.getById(activityId);
      if (refreshedActivity) {
        setActivity(refreshedActivity);
        setParticipants(refreshedActivity.participants || []);
      }
    } catch (error) {
      // Silent error handling
    }
  }, [activityId]);
  
  return {
    activity,
    loading,
    error,
    participants,
    isConnected,
    connectionError,
    offline,
    addTag,
    voteTag,
    deleteTag,
    updateMapping,
    changePhase,
    refreshActivity
  };
}