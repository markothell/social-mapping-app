// src/app/activity/[sessionId]/mapping-results/page.tsx
"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useRealTimeActivity } from '@/core/hooks/useRealTimeActivity';
import MappingResultsVisualization from '@/components/MappingResultsVisualization';
import ActivityNotFound from '@/components/ActivityNotFound';
import ActivityHeader from '@/components/ActivityHeader';
import GlobalNavigation from '@/components/GlobalNavigation';
import ConnectionStatus from '@/components/ConnectionStatus';

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
  
  const [user, setUser] = useState<{ id: string; name?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Use the real-time activity hook
  const {
    activity,
    loading,
    isConnected,
    connectionError
  } = useRealTimeActivity(sessionId, user);

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
          router.push(`/activity/${sessionId}`);
        }
      } else {
        // Redirect back to entry if no user
        router.push(`/activity/${sessionId}`);
      }
    }
  }, [sessionId, router]);

  // Set dynamic page title
  useEffect(() => {
    if (activity) {
      const activityTitle = activity.settings?.entryView?.title || activity.settings?.title || 'Activity';
      document.title = `Social_Map.${activityTitle}`;
    }
  }, [activity]);

  const handleCompleteActivity = () => {
    // TODO: Implement activity completion
    console.log('Complete activity functionality not implemented');
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

  const approvedTags = activity.tags.filter((tag: { status: string }) => tag.status === 'approved');
  const completedMappings = activity.mappings.filter((mapping: { isComplete: boolean }) => mapping.isComplete);
  const totalParticipants = activity.participants.length;
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const completionPercentage = totalParticipants > 0
    ? Math.round((completedMappings.length / totalParticipants) * 100)
    : 0;
    
  // Determine if there's enough data to show visualizations
  const hasEnoughData = completedMappings.length > 0;

  return (
    <div className="mapping-results-page">
      <ActivityHeader 
        activityTitle={activity?.settings?.entryView?.title}
        subtitle="3: Results"
        hostName={activity?.hostName}
      />
      
      <GlobalNavigation 
        sessionId={sessionId} 
        activityTitle={activity?.settings?.entryView?.title}
        hostName={activity?.hostName}
        activity={activity}
        currentUserId={user?.id}
      />
      
      <div className="results-container">
        <div className="results-header">
          <div className="core-question-container">
            <h1 className="core-question">Results</h1>
            {(activity.settings?.results?.instruction || activity.settings?.mapping?.instruction) && (
              <button 
                className="info-toggle"
                onClick={() => setShowInstructions(!showInstructions)}
                aria-label="Toggle instructions"
              >
                ℹ️
              </button>
            )}
          </div>
          
          {/* Hidden instruction bubble - contains all details */}
          {showInstructions && (
            <div className="instruction-details">
              <p className="instruction-text">
                {activity.settings?.results?.instruction || 'Review the collective mapping to understand different perspectives and insights.'}
              </p>
            </div>
          )}
        </div>

        {hasEnoughData ? (
          <MappingResultsVisualization
            settings={activity.settings.mapping}
            tags={approvedTags}
            mappings={completedMappings}
            participants={activity.participants}
            allMappings={activity.mappings}
          />
        ) : (
          <div className="no-data-message">
            <p>Not enough data to display visualization.</p>
            <p>Waiting for participants to complete their mappings.</p>
            {isAdmin && completedMappings.length === 0 && (
              <div className="admin-tip">
                <h3>Admin Tip</h3>
                <p>Participants need to click &quot;Submit My Mappings&quot; in the mapping view for their data to appear here.</p>
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
      </div>

      <ConnectionStatus 
        status={{ 
          isConnected: isConnected, 
          error: connectionError 
        }} 
      />

      <style jsx>{`
        .mapping-results-page {
          color: #202124;
          padding-bottom: 1rem;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        
        .results-container {
          background-color: #FDF6E9;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 1.5rem;
          margin: 0.5rem auto;
          margin-bottom: 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
          max-width: 800px;
          width: 100%;
        }
        
        .results-header {
          margin-bottom: 1.5rem;
          text-align: center;
          flex-shrink: 0;
        }
        
        .core-question-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .core-question {
          margin: 0;
          font-size: 1.8rem;
          color: #202124;
          font-weight: 600;
          line-height: 1.2;
        }

        .info-toggle {
          background: none;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .info-toggle:hover {
          background-color: rgba(0, 0, 0, 0.1);
        }

        .instruction-details {
          background-color: rgba(255, 255, 255, 0.9);
          border: 1px solid #E8C4A0;
          border-radius: 12px;
          padding: 1.25rem;
          margin-top: 1rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          animation: slideDown 0.2s ease-out;
          position: relative;
        }

        .instruction-text {
          margin: 0;
          font-size: 1rem;
          color: #202124;
          line-height: 1.4;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
            padding-bottom: 90px;
          }
          
          .results-container {
            border-radius: 0;
            margin: 0;
            padding: 1rem;
          }
          
          .results-header {
            margin-bottom: 1rem;
          }
          
          .core-question-container {
            gap: 0.5rem;
            margin-bottom: 0.5rem;
          }
          
          .core-question {
            font-size: 1.4rem;
          }
          
          .info-toggle {
            font-size: 0.9rem;
            padding: 0.2rem;
          }
          
        }
        
        /* Very small screens */
        @media (max-width: 480px) {
          .core-question-container {
            gap: 0.4rem;
          }
          
          .core-question {
            font-size: 1.2rem;
          }
          
          .info-toggle {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}