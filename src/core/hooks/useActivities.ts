// src/core/hooks/useActivities.ts

import { useState, useEffect } from 'react';
import { hybridActivityService } from '../services/hybridActivityService';
import { Activity } from '@/models/Activity';

export function useActivities(filter: 'all' | 'active' | 'completed' = 'all') {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let result: Activity[] = [];
      
      switch (filter) {
        case 'active':
          result = await hybridActivityService.getActive();
          break;
        case 'completed':
          result = await hybridActivityService.getCompleted();
          break;
        default:
          result = await hybridActivityService.getAll();
      }
      
      setActivities(result);
    } catch (err) {
      console.error('Error loading activities:', err);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, ""); // drop trailing /api
    fetch(`${base}/health`)
      .then(res => res.json())
      .then(status => {
        if (!status.apiRoutesLoaded) {
          console.warn("⚠️ API routes are not yet loaded on the backend.");
        }
      });
  }, []);
  
  useEffect(() => {
    loadActivities();
    
    // Listen for activity updates
    const handleActivitiesUpdated = () => {
      console.log('Activities updated event received, refreshing...');
      loadActivities();
    };
    
    // Listen for participant updates
    const handleParticipantsUpdated = () => {
      console.log('Participants updated event received, refreshing activities...');
      loadActivities();
    };
    
    // Listen for tag updates (for notifications)
    const handleTagAdded = () => {
      console.log('Tag added event received, refreshing activities...');
      loadActivities();
    };
    
    const handleTagVoted = () => {
      console.log('Tag voted event received, refreshing activities...');
      loadActivities();
    };
    
    window.addEventListener('activities_updated', handleActivitiesUpdated);
    window.addEventListener('participants_updated', handleParticipantsUpdated);
    window.addEventListener('tag_added', handleTagAdded);
    window.addEventListener('tag_voted', handleTagVoted);
    
    // Set up visibility change listener to refresh when tab becomes visible
    // This helps catch participant updates that might have been missed
    const handleVisibilityChange = () => {
      if (!document.hidden && navigator.onLine) {
        console.log('Tab became visible, refreshing activities...');
        loadActivities();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also set up a shorter interval for more responsive updates
    const refreshInterval = setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        loadActivities();
      }
    }, 10000); // Refresh every 10 seconds when tab is visible
    
    // Cleanup
    return () => {
      window.removeEventListener('activities_updated', handleActivitiesUpdated);
      window.removeEventListener('participants_updated', handleParticipantsUpdated);
      window.removeEventListener('tag_added', handleTagAdded);
      window.removeEventListener('tag_voted', handleTagVoted);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(refreshInterval);
    };
  }, [filter]);
  
  return { activities, loading, error, refresh: loadActivities };
}