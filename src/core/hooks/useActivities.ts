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
    loadActivities();
    
    // Listen for activity updates
    const handleActivitiesUpdated = () => {
      console.log('Activities updated event received, refreshing...');
      loadActivities();
    };
    
    window.addEventListener('activities_updated', handleActivitiesUpdated);
    
    // Cleanup
    return () => {
      window.removeEventListener('activities_updated', handleActivitiesUpdated);
    };
  }, [filter]);
  
  return { activities, loading, error, refresh: loadActivities };
}