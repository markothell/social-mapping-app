// src/app/activity/[sessionId]/mapping-results/page.tsx
"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { activityService } from '@/core/services/activityService';
import MappingResultsVisualization from '@/components/MappingResultsVisualization';
import ActivityNotFound from '@/components/ActivityNotFound';
import ConnectionStatus from '@/components/ConnectionStatus';
import GlobalNavigation from '@/components/GlobalNavigation';
import { formatMappingsAsCSV, formatMappingsAsJSON } from '@/utils/mappingDataUtils';

// Helper function for consistent params handling across the app
function useParams<T>(params: T | Promise<T>): T {
  return params instanceof Promise ? use(params) : params;
}

export default function MappingResultsPage({ 
  params 
}: { 
  params: { sessionId: string } | Promise<{ sessionId: string }> 
}) {
  const router = useRouter();
  
  // Properly unwrap params
  const unwrappedParams = useParams(params);
  const sessionId = unwrappedParams.sessionId;
  
  const [activity, setActivity] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: true,
    error: null
  });

  useEffect(() => {
    // Load activity data
    const loadActivity = () => {
      const activityData = activityService.getById(sessionId);
      if (activityData) {
        setActivity(activityData);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    // Load user data from localStorage
    const loadUser = () => {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setIsAdmin(parsedUser.id === 'admin' || localStorage.getItem('isAdmin') === 'true');
          } catch (error) {
            console.error('Error parsing user data:', error);
            router.push(`/activity/${sessionId}`);
          }
        } else {
          // Redirect back to entry if no user
          router.push(`/activity/${sessionId}`);
        }
      }
    };

    loadActivity();
    loadUser();
  }, [sessionId, router]);

  // Handle completion of the activity (admin only)
  const handleCompleteActivity = () => {
    if (!activity || !isAdmin) return;
    
    if (window.confirm('Are you sure you want to mark this activity as completed? This will end the activity for all participants.')) {
      const updatedActivity = activityService.update(activity.id, (currentActivity) => {
        currentActivity.status = 'completed';
        currentActivity.updatedAt = new Date();
        return currentActivity;
      });
      
      if (updatedActivity) {
        router.push('/admin');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading mapping results...</p>
      </div>
    );
  }

  if (!activity) {
    return <ActivityNotFound />;
  }

  const approvedTags = activity.tags.filter((tag: any) => tag.status === 'approved');
  const completedMappings = activity.mappings.filter((mapping: any) => mapping.isComplete);
  const totalParticipants = activity.participants.length;
  
  // Calculate completion percentage
  const completionPercentage = totalParticipants > 0
    ? Math.round((completedMappings.length / totalParticipants) * 100)
    : 0;
    
  // Determine if there's enough data to show visualizations
  const hasEnoughData = completedMappings.length > 0;

  return (
    <div className="mapping-results-page">
      <GlobalNavigation 
        sessionId={sessionId} 
        activityTitle={activity.settings.entryView?.title || 'activity'}
        hostName={activity.hostName}
        activity={activity}
      />
      <div className="results-container">
        <div className="results-header">
          <h1 className="core-question">Results</h1>
          <p className="stage-subtitle">Mapping Results</p>
          
          <div className="completion-status">
            <div className="completion-bar">
              <div 
                className="completion-progress" 
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <p className="completion-info">
              {completedMappings.length} of {totalParticipants} participants completed ({completionPercentage}%)
              {activity.status === 'completed' && (
                <span className="completed-badge">Activity Completed</span>
              )}
            </p>
          </div>
        </div>
        
        {hasEnoughData ? (
          <MappingResultsVisualization
            settings={activity.settings.mapping}
            tags={approvedTags}
            mappings={completedMappings}
            participants={activity.participants}
          />
        ) : (
          <div className="no-data-message">
            <p>Not enough data to display visualization.</p>
            <p>Waiting for participants to complete their mappings.</p>
            {isAdmin && completedMappings.length === 0 && (
              <div className="admin-tip">
                <h3>Admin Tip</h3>
                <p>Participants need to click "Submit My Mappings" in the mapping view for their data to appear here.</p>
                <button 
                  onClick={() => router.push(`/activity/${activity.id}/mapping`)}
                  className="secondary-button"
                >
                  Go to Mapping View
                </button>
              </div>
            )}
          </div>
        )}

        <ConnectionStatus status={connectionStatus} />

        {isAdmin && (
          <div className="admin-controls">
            <h3>Administrator Controls</h3>
            <p>As an administrator, you can manage the activity and view all results.</p>
            
            <div className="admin-actions">
              <button
                onClick={() => router.push(`/activity/${activity.id}/mapping`)}
                className="secondary-button"
              >
                Edit Mappings
              </button>
              <button
                onClick={() => router.push(`/activity/${activity.id}/tags`)}
                className="secondary-button"
              >
                Manage Tags
              </button>
              {activity.status !== 'completed' && (
                <button
                  onClick={handleCompleteActivity}
                  className="danger-button"
                >
                  Complete Activity
                </button>
              )}
            </div>
          </div>
        )}

        <div className="navigation-controls">
          <button
            onClick={() => router.push(`/activity/${activity.id}/mapping`)}
            className="secondary-button"
          >
            Back to Mapping
          </button>
          
          <button
            onClick={() => router.push(`/activity/${activity.id}`)}
            className="secondary-button"
          >
            Back to Activity
          </button>
          
          {isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              className="primary-button"
            >
              Admin Dashboard
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .mapping-results-page {
          color: #202124;
        }
        
        .results-container {
          background-color: white;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 2rem;
          margin-top: -1px;
        }
        
        .results-header {
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .core-question {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 2.2rem;
          color: #202124;
          font-weight: 600;
        }
        
        .stage-subtitle {
          font-size: 1.3rem;
          color: #1a73e8;
          margin-top: 0;
          margin-bottom: 1rem;
          font-weight: 500;
        }
        
        .completion-status {
          margin-bottom: 1.5rem;
        }
        
        .completion-bar {
          height: 8px;
          background-color: #f1f3f4;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        
        .completion-progress {
          height: 100%;
          background-color: #34a853;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        
        .completion-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        
        .completed-badge {
          background-color: #34a853;
          color: white;
          font-size: 0.8rem;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
        }
        
        .no-data-message {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 3rem;
          text-align: center;
          color: #5f6368;
          margin-bottom: 2rem;
        }
        
        .admin-tip {
          background-color: #e8f0fe;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          text-align: left;
        }
        
        .admin-tip h3 {
          margin-top: 0;
          color: #1a73e8;
          font-size: 1.1rem;
        }
        
        .admin-controls {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        
        .admin-controls h3 {
          margin-top: 0;
          font-size: 1.1rem;
          color: #202124;
        }
        
        .admin-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 1rem;
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
        
        .navigation-controls {
          display: flex;
          justify-content: space-between;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #eee;
          gap: 1rem;
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
        
        .primary-button {
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-left: auto;
        }
        
        .primary-button:hover {
          background-color: #1765cc;
        }
        
        .danger-button {
          background-color: #ea4335;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .danger-button:hover {
          background-color: #d93025;
        }
        
        @media (max-width: 768px) {
          .mapping-results-page {
            padding: 1rem;
          }
          
          .results-container {
            padding: 1.5rem;
          }
          
          .navigation-controls {
            flex-wrap: wrap;
          }
          
          .primary-button {
            margin-left: 0;
            width: 100%;
            order: -1;
            margin-bottom: 0.5rem;
          }
          
          .secondary-button {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}