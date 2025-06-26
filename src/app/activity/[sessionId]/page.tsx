// src/app/activity/[sessionId]/page.tsx
"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useRealTimeActivity } from '@/core/hooks/useRealTimeActivity';
import ActivityNotFound from '@/components/ActivityNotFound';
import ActivityHeader from '@/components/ActivityHeader';
import EntryForm from '@/components/EntryForm';
import ActivityIntro from '@/components/ActivityIntro';
import AdminControls from '@/components/AdminControls';
import ConnectionStatus from '@/components/ConnectionStatus';
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
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isConnected,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    offline,
  } = useRealTimeActivity(sessionId, user);

  // Set dynamic page title
  useEffect(() => {
    if (activity) {
      const activityTitle = activity.settings?.entryView?.title || activity.settings?.title || 'Activity';
      document.title = `Social_Map.${activityTitle}`;
    }
  }, [activity]);

  const handleSwitchUser = () => {
    setIsSwitchingUser(true);
  };
  
  const handleCancelSwitch = () => {
    setIsSwitchingUser(false);
  };
  
  const handleSwitchUserJoin = (name: string, existingParticipant?: { id: string; name: string }) => {
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
  const handleJoin = (name: string, existingParticipant?: { id: string; name: string }) => {
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
      <ActivityHeader 
        variant="entry"
      />
      <div className="activity-container">
        <div className="activity-header">
          <h1>Social_Map.{activity?.settings?.entryView?.title || activity?.settings?.title || 'Activity'}</h1>
          <p className="activity-description">
            {activity.settings.entryView?.description || 'Join this collaborative activity to contribute.'}
          </p>
          {(activity?.hostName || activity?.settings?.entryView?.hostName) && (
            <p className="designed-by">
              Designed by {activity?.hostName || activity?.settings?.entryView?.hostName}
            </p>
          )}
          
        </div>
        
        {/* Show connection status */}
        <ConnectionStatus />
        
        {!user || isSwitchingUser ? (
          <>
            <EntryForm 
              user={isSwitchingUser ? user : null} 
              participants={participants}
              onJoin={isSwitchingUser ? handleSwitchUserJoin : handleJoin}
              onCancel={isSwitchingUser ? handleCancelSwitch : undefined}
              showCancel={isSwitchingUser}
            />
            {!isSwitchingUser && <ActivityIntro />}
          </>
        ) : activity.status === 'completed' ? (
          <div className="participant-info">
            {/* Hide user participation info when activity is completed */}
          </div>
        ) : (
          <>
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
            {activity.status === 'active' && <ActivityIntro />}
          </>
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
        
        <div className="sit-footer">
          <a href="https://socialinsight.tools" target="_blank" rel="noopener noreferrer">
            <strong>Social Insight Tools</strong>
          </a>
        </div>
      </div>
      
      <style jsx>{`
        .activity-page {
          color: var(--carafe-brown);
        }
        
        .activity-container {
          background-color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(232, 196, 160, 0.3);
          padding: 2rem;
          margin: 1rem auto;
          max-width: 800px;
        }
        
        .activity-header {
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .activity-header h1 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 2rem;
          color: var(--carafe-brown);
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          line-height: 1.2;
        }
        
        @media (max-width: 768px) {
          .activity-header h1 {
            font-size: 1.5rem;
          }
        }
        
        @media (max-width: 480px) {
          .activity-header h1 {
            font-size: 1.25rem;
          }
        }
        
        .activity-description {
          color: var(--warm-earth);
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
        }
        
        .designed-by {
          color: var(--warm-earth);
          font-size: 0.9rem;
          font-style: italic;
          margin-bottom: 1.5rem;
        }
        
        .activity-meta {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .activity-type {
          background-color: rgba(232, 108, 43, 0.1);
          color: var(--rust-button);
          padding: 0.3rem 0.8rem;
          border-radius: 16px;
          font-size: 0.9rem;
          border: 1px solid rgba(232, 108, 43, 0.2);
        }
        
        .activity-status {
          padding: 0.3rem 0.8rem;
          border-radius: 16px;
          font-size: 0.9rem;
        }
        
        .activity-status.active {
          background-color: rgba(245, 183, 0, 0.1);
          color: var(--amber-highlight);
          border: 1px solid rgba(245, 183, 0, 0.2);
        }
        
        .activity-status.completed {
          background-color: var(--light-beige);
          color: var(--warm-earth);
          border: 1px solid var(--dust-beige);
        }
        
        .participant-info {
          margin-top: 2rem;
          text-align: center;
          color: var(--carafe-brown);
        }
        
        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .primary-button {
          background-color: var(--amber-highlight);
          color: var(--carafe-brown);
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .primary-button:hover {
          background-color: #F29900;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .secondary-button {
          background-color: var(--light-beige);
          color: var(--carafe-brown);
          border: 1px solid var(--dust-beige);
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .secondary-button:hover {
          background-color: var(--dust-beige);
          transform: translateY(-1px);
        }
        
        .activity-completed-notice {
          margin-top: 2rem;
          padding: 1.5rem;
          background-color: var(--sand-base);
          border-radius: 8px;
          text-align: center;
          border: 1px solid var(--dust-beige);
        }
        
        .activity-completed-notice h3 {
          margin-top: 0;
          color: var(--warm-earth);
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: var(--warm-earth);
          text-align: center;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(232, 108, 43, 0.2);
          border-radius: 50%;
          border-top-color: var(--rust-button);
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .sit-footer {
          text-align: center;
          margin-top: 2rem;
          padding-top: 1rem;
        }
        
        .sit-footer a {
          color: var(--carafe-brown);
          text-decoration: none;
          font-size: 1.35rem;
        }
        
        .sit-footer a:hover {
          color: var(--rust-button);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}