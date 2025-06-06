// src/app/activity/[sessionId]/page.tsx
"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useRealTimeActivity } from '@/core/hooks/useRealTimeActivity';
import ActivityNotFound from '@/components/ActivityNotFound';
import EntryForm from '@/components/EntryForm';
import AdminControls from '@/components/AdminControls';
import ConnectionStatus from '@/components/ConnectionStatus';
import ParticipantActivityIndicator from '@/components/ParticipantActivityIndicator';
import { useWebSocket } from '@/core/services/websocketService';

// Helper function for consistent params handling across the app
function useParams<T>(params: T | Promise<T>): T {
  return params instanceof Promise ? use(params) : params;
}

export default function ActivityPage({ 
  params 
}: { 
  params: { sessionId: string } | Promise<{ sessionId: string }>
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);
  
  // Unwrap params correctly
  const unwrappedParams = useParams(params);
  const sessionId = unwrappedParams.sessionId;

  // Direct access to websocket service
  const { sendMessage } = useWebSocket();
  
  // Load user data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAdmin(parsedUser.id === 'admin' || localStorage.getItem('isAdmin') === 'true');
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
  }, []);
  
  // Use our real-time activity hook
  const {
    activity,
    loading,
    error,
    participants,
    isConnected,
    offline,
  } = useRealTimeActivity(sessionId, user);

  const handleSwitchUser = () => {
    setIsSwitchingUser(true);
  };
  
  const handleCancelSwitch = () => {
    setIsSwitchingUser(false);
  };
  
  const handleSwitchUserJoin = (name: string, existingParticipant?: any) => {
    // First leave the current user if exists
    if (user && activity) {
      console.log(`User ${user.name} (${user.id}) is leaving activity ${activity.id}`);
      
      // Store the current user info before clearing it
      const currentUserId = user.id;
      const currentUserName = user.name;
      const activityId = activity.id;
      
      // Manually emit leave activity event
      sendMessage('leave_activity', {
        activityId: activityId,
        userId: currentUserId,
        userName: currentUserName
      });
      
      // Force a refresh of the participants list after a short delay
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refresh_participants', {
          detail: { activityId }
        }));
      }, 500);
    }
    
    // Then join with the new name
    handleJoin(name, existingParticipant);
  };
  
  // Handle joining the activity
  const handleJoin = (name: string, existingParticipant?: any) => {
    if (!activity) return;
    
    let userData;
    
    if (existingParticipant) {
      // Use existing participant data
      userData = {
        id: existingParticipant.id,
        name: existingParticipant.name
      };
      console.log(`Returning participant: ${userData.name} (${userData.id})`);
    } else {
      // Create new user data
      userData = {
        id: `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
        name: name
      };
      console.log(`New participant: ${userData.name} (${userData.id})`);
    }
    
    // Add user to history for future recognition
    const userHistory = localStorage.getItem('userHistory');
    let history = [];
    if (userHistory) {
      try {
        history = JSON.parse(userHistory);
      } catch (error) {
        console.error('Error parsing user history:', error);
        history = [];
      }
    }
    
    // Add current user to history if not already there
    if (!history.some(u => u.id === userData.id)) {
      history.push(userData);
      // Keep only last 10 users to prevent localStorage bloat
      if (history.length > 10) {
        history = history.slice(-10);
      }
      localStorage.setItem('userHistory', JSON.stringify(history));
    }
    
    // Save current user data to localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Set user and reload the page
    setUser(userData);
    
    // Trigger custom event to update user display in layout
    window.dispatchEvent(new CustomEvent('userChanged'));
    
    // Reset switching state
    setIsSwitchingUser(false);
    
    // Navigate to tag creation page by default
    router.push(`/activity/${activity.id}/tags`);
  };
  
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading activity...</p>
      </div>
    );
  }
  
  if (error || !activity) {
    return <ActivityNotFound />;
  }
  
  return (
    <div className="activity-page">
      <div className="activity-container">
        <div className="activity-header">
          <h1>Welcome</h1>
          <p className="activity-description">
            {activity.settings.entryView?.description || 'Join this collaborative activity to contribute.'}
          </p>
          
          <div className="activity-meta">
            <div className="activity-type">
              {activity.type === 'mapping' ? 'Social Mapping Activity' : 'Ranking Activity'}
            </div>
            <div className={`activity-status ${activity.status}`}>
              {activity.status === 'active' ? 'Active' : 'Completed'}
            </div>
          </div>
        </div>
        
        {/* Show connection status */}
        <ConnectionStatus />
        
        {!user || isSwitchingUser ? (
          <EntryForm 
            user={isSwitchingUser ? user : null} 
            participants={participants}
            onJoin={isSwitchingUser ? handleSwitchUserJoin : handleJoin}
            onCancel={isSwitchingUser ? handleCancelSwitch : undefined}
            showCancel={isSwitchingUser}
          />
        ) : activity.status === 'completed' ? (
          <div className="participant-info">
            {/* Hide user participation info when activity is completed */}
          </div>
        ) : (
          <div className="participant-info">
            <p>You are participating as: <strong>{user.name}</strong></p>
            <div className="action-buttons">
              <button
                onClick={() => {
                  // Navigate to appropriate phase
                  if (activity.phase === 'gathering' || activity.phase === 'tagging') {
                    router.push(`/activity/${activity.id}/tags`);
                  } else if (activity.phase === 'mapping') {
                    router.push(`/activity/${activity.id}/mapping`);
                  } else if (activity.phase === 'mapping-results') {
                    router.push(`/activity/${activity.id}/mapping-results`);
                  } else if (activity.phase === 'ranking') {
                    router.push(`/activity/${activity.id}/ranking`);
                  } else if (activity.phase === 'results') {
                    router.push(`/activity/${activity.id}/results`);
                  }
                }}
                className="primary-button"
              >
                Continue to Activity
              </button>
              
              <button
                onClick={handleSwitchUser}
                className="secondary-button"
              >
                Switch User
              </button>
            </div>
          </div>
        )}
        
        {isAdmin && user && (
          <AdminControls 
            activity={activity}
          />
        )}
        
        {activity.status === 'completed' && (
          <div className="activity-completed-notice">
            <h3>This activity has been completed</h3>
            <p>The facilitator has marked this activity as complete. You can still view the results.</p>
            <button
              onClick={() => router.push(`/activity/${activity.id}/mapping-results`)}
              className="primary-button"
            >
              View Results
            </button>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .activity-page {
          color: #202124;
        }
        
        .activity-container {
          background-color: white;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 2rem;
          margin-top: -1px;
        }
        
        .activity-header {
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .activity-header h1 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 2rem;
          color: #202124;
        }
        
        .activity-description {
          color: #5f6368;
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
        }
        
        .activity-meta {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .activity-type {
          background-color: #e8f0fe;
          color: #1a73e8;
          padding: 0.3rem 0.8rem;
          border-radius: 16px;
          font-size: 0.9rem;
        }
        
        .activity-status {
          padding: 0.3rem 0.8rem;
          border-radius: 16px;
          font-size: 0.9rem;
        }
        
        .activity-status.active {
          background-color: #e6f4ea;
          color: #34a853;
        }
        
        .activity-status.completed {
          background-color: #f1f3f4;
          color: #5f6368;
        }
        
        .participant-info {
          margin-top: 2rem;
          text-align: center;
        }
        
        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .primary-button {
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .primary-button:hover {
          background-color: #1765cc;
        }
        
        .secondary-button {
          background-color: #f1f3f4;
          color: #202124;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .secondary-button:hover {
          background-color: #e8eaed;
        }
        
        .activity-completed-notice {
          margin-top: 2rem;
          padding: 1.5rem;
          background-color: #fef7e0;
          border-radius: 8px;
          text-align: center;
        }
        
        .activity-completed-notice h3 {
          margin-top: 0;
          color: #b06000;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: #5f6368;
          text-align: center;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(26, 115, 232, 0.2);
          border-radius: 50%;
          border-top-color: #1a73e8;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}