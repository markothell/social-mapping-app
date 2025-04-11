"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { activityService } from '@/core/services/activityService';
import ActivityNotFound from '@/components/ActivityNotFound';
import EntryForm from '@/components/EntryForm';
import AdminControls from '@/components/AdminControls';
import ConnectionStatus from '@/components/ConnectionStatus';

// Helper function for consistent params handling across the app
function useParams<T>(params: T | Promise<T>): T {
  return params instanceof Promise ? use(params) : params;
}

export default function ActivityPage({ params }: { params: { sessionId: string } | Promise<{ sessionId: string }> }) {
  const router = useRouter();
  
  // Properly unwrap params using React.use() for forward compatibility
  const unwrappedParams = useParams(params);
  const sessionId = unwrappedParams.sessionId;
  
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: true,
    error: null
  });

  useEffect(() => {
    // Load activity data
    const loadActivity = () => {
      const activityData = activityService.getById(sessionId);
      setActivity(activityData);
      setLoading(false);
    };

    // Load user data from localStorage
    const loadUser = () => {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAdmin(parsedUser.id === 'admin' || localStorage.getItem('isAdmin') === 'true');
        }
      }
    };

    loadActivity();
    loadUser();
  }, [sessionId]);

  const handleJoinActivity = (userName: string) => {
    if (!activity) return;

    // Create user if not exists
    const userId = user?.id || Math.random().toString(36).substring(2, 9);
    const newUser = { id: userId, name: userName };
    
    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(newUser));
    
    // Add participant to activity
    activityService.update(activity.id, (currentActivity) => {
      const existingParticipantIndex = currentActivity.participants.findIndex(
        (p: any) => p.id === userId
      );
      
      if (existingParticipantIndex !== -1) {
        // Update existing participant
        currentActivity.participants[existingParticipantIndex] = {
          ...currentActivity.participants[existingParticipantIndex],
          name: userName,
          isConnected: true
        };
      } else {
        // Add new participant
        currentActivity.participants.push({
          id: userId,
          name: userName,
          isConnected: true
        });
      }
      
      return currentActivity;
    });

    // Determine next route based on activity phase
    let nextRoute;
    switch (activity.phase) {
      case 'gathering':
      case 'tagging':
        nextRoute = `tags`;
        break;
      case 'mapping':
        nextRoute = `mapping`;
        break;
      case 'mapping-results':
        nextRoute = `mapping-results`;
        break;
      default:
        nextRoute = `tags`;
    }

    // Navigate to next phase
    router.push(`/activity/${activity.id}/${nextRoute}`);
  };

  const handleChangePhase = (phase: string) => {
    if (!activity) return;
    
    activityService.update(activity.id, (currentActivity) => {
      currentActivity.phase = phase;
      currentActivity.updatedAt = new Date();
      return currentActivity;
    });
    
    // Update local state
    setActivity({
      ...activity,
      phase
    });
  };

  if (loading) {
    return <div className="loading-container">Loading activity...</div>;
  }

  if (!activity) {
    return <ActivityNotFound />;
  }

  return (
    <div className="activity-page">
      <div className="activity-container">
        <h1>{activity.settings.entryView?.title || 'Collaborative Activity'}</h1>
        
        <div className="activity-info">
          <p className="activity-type">
            {activity.type === 'mapping' ? 'Social Mapping Activity' : 'Ranking Activity'}
          </p>
          <p className="participant-count">
            {activity.participants.length} participant(s) joined
          </p>
          <p className="phase-info">
            Current phase: {activity.phase}
          </p>
        </div>
        
        {isAdmin ? (
          <AdminControls 
            activity={activity} 
            onChangePhase={handleChangePhase}
          />
        ) : (
          <EntryForm
            user={user}
            onJoin={handleJoinActivity}
          />
        )}
        
        <ConnectionStatus status={connectionStatus} />
      </div>

      <style jsx>{`
        .activity-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .activity-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 2rem;
        }
        
        h1 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 2rem;
          color: #202124;
        }
        
        .activity-info {
          margin-bottom: 2rem;
          padding: 1rem;
          background-color: #f8f9fa;
          border-radius: 6px;
        }
        
        .activity-info p {
          margin: 0.5rem 0;
          color: #5f6368;
        }
        
        .activity-type {
          font-weight: 500;
          color: #1a73e8 !important;
        }
        
        .loading-container {
          text-align: center;
          padding: 3rem;
          color: #5f6368;
        }
      `}</style>
    </div>
  );
}