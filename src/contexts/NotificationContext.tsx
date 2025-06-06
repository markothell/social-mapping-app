"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface NotificationState {
  newTagsCount: number;
  approvedTagsChanged: boolean;
  newTagCreators: Set<string>;
}

interface NotificationContextType {
  notifications: NotificationState;
  markNewTagsSeen: () => void;
  markApprovedTagsSeen: () => void;
  incrementNewTags: (creatorId: string) => void;
  setApprovedTagsChanged: () => void;
  getNewTagsCountForUser: (currentUserId: string) => number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationState>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('notifications');
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            newTagsCount: parsed.newTagsCount || 0,
            approvedTagsChanged: parsed.approvedTagsChanged || false,
            newTagCreators: new Set(parsed.newTagCreators || []),
          };
        }
      } catch (error) {
        console.error('Error loading notifications from localStorage:', error);
      }
    }
    return {
      newTagsCount: 0,
      approvedTagsChanged: false,
      newTagCreators: new Set<string>(),
    };
  });

  // Persist notifications to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const toStore = {
          newTagsCount: notifications.newTagsCount,
          approvedTagsChanged: notifications.approvedTagsChanged,
          newTagCreators: Array.from(notifications.newTagCreators),
        };
        localStorage.setItem('notifications', JSON.stringify(toStore));
      } catch (error) {
        console.error('Error saving notifications to localStorage:', error);
      }
    }
  }, [notifications]);

  const markNewTagsSeen = useCallback(() => {
    setNotifications(prev => ({ 
      ...prev, 
      newTagsCount: 0,
      newTagCreators: new Set<string>()
    }));
  }, []);

  const markApprovedTagsSeen = useCallback(() => {
    setNotifications(prev => ({ ...prev, approvedTagsChanged: false }));
  }, []);

  const incrementNewTags = useCallback((creatorId: string) => {
    setNotifications(prev => {
      const newCreators = new Set(prev.newTagCreators);
      newCreators.add(creatorId);
      return { 
        ...prev, 
        newTagsCount: prev.newTagsCount + 1,
        newTagCreators: newCreators
      };
    });
  }, []);

  const setApprovedTagsChanged = useCallback(() => {
    setNotifications(prev => ({ ...prev, approvedTagsChanged: true }));
  }, []);

  const getNewTagsCountForUser = (currentUserId: string) => {
    // Count tags not created by the current user
    const relevantCreators = Array.from(notifications.newTagCreators).filter(
      creatorId => creatorId !== currentUserId
    );
    return relevantCreators.length;
  };

  // Listen for real-time tag events globally
  useEffect(() => {
    const handleTagAdded = (event: CustomEvent) => {
      const detail = event.detail;
      
      // Get current user from localStorage
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          
          // Only increment if the tag was created by someone else
          if (detail.creatorId && detail.creatorId !== user.id) {
            incrementNewTags(detail.creatorId);
          }
        }
      } catch (error) {
        console.error('Error getting user for tag notification:', error);
      }
    };

    const handleTagVoted = (event: CustomEvent) => {
      // Trigger approved tags changed notification since voting might have changed approval status
      setApprovedTagsChanged();
    };

    // Remove any existing listeners first to prevent duplicates
    window.removeEventListener('tag_added', handleTagAdded as EventListener);
    window.removeEventListener('tag_voted', handleTagVoted as EventListener);

    // Listen for custom events
    window.addEventListener('tag_added', handleTagAdded as EventListener);
    window.addEventListener('tag_voted', handleTagVoted as EventListener);

    return () => {
      window.removeEventListener('tag_added', handleTagAdded as EventListener);
      window.removeEventListener('tag_voted', handleTagVoted as EventListener);
    };
  }, [incrementNewTags, setApprovedTagsChanged]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      markNewTagsSeen,
      markApprovedTagsSeen,
      incrementNewTags,
      setApprovedTagsChanged,
      getNewTagsCountForUser,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}