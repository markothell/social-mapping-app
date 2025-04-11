"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { activityService } from '@/core/services/activityService';
import MappingGrid from '@/components/MappingGrid';
import TagSelectionPanel from '@/components/TagSelectionPanel';
import ActivityNotFound from '@/components/ActivityNotFound';
import ConnectionStatus from '@/components/ConnectionStatus';

// Helper function for handling Promise-like params with Next.js App Router
function useParams<T>(params: T | Promise<T>): T {
  return params instanceof Promise ? use(params) : params;
}

export default function MappingPage({ params }: { params: { sessionId: string } | Promise<{ sessionId: string }> }) {
  const router = useRouter();
  
  // Properly handle potentially Promise-based params from App Router
  const unwrappedParams = useParams(params);
  const sessionId = unwrappedParams.sessionId;
  
  const [activity, setActivity] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [mappedTags, setMappedTags] = useState<string[]>([]);
  const [userMappings, setUserMappings] = useState<any>({});
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: true,
    error: null
  });
  const [isMappingComplete, setIsMappingComplete] = useState(false);

  useEffect(() => {
    // Load activity data
    const loadActivity = () => {
      const activityData = activityService.getById(sessionId);
      if (activityData) {
        setActivity(activityData);
        setLoading(false);
      } else {
        // Handle not found
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
            // Redirect back to entry if user data is invalid
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

  // Load user's existing mappings
  useEffect(() => {
    if (activity && user) {
      // Get approved tags
      const approvedTags = activity.tags.filter((tag: any) => tag.status === 'approved');
      
      const userMapping = activity.mappings.find((m: any) => m.userId === user.id);
      
      if (userMapping) {
        // Create a map of tagId -> position for easier access
        const mappings: any = {};
        const mappedTagIds: string[] = [];
        
        userMapping.positions.forEach((position: any) => {
          // Find the tag text if we have it
          const tagInfo = approvedTags.find(tag => tag.id === position.tagId);
          const tagText = tagInfo?.text || position.text || position.tagId;
          
          // Store the tag text along with the position
          mappings[position.tagId] = {
            ...position,
            text: tagText
          };
          
          mappedTagIds.push(position.tagId);
        });
        
        setUserMappings(mappings);
        setMappedTags(mappedTagIds);
        setIsMappingComplete(userMapping.isComplete || false);
      }
    }
  }, [activity, user]);

  const handleTagSelect = (tagId: string) => {
    setSelectedTag(tagId);
  };

  const handleTagPosition = (tagId: string, x: number, y: number, annotation?: string) => {
    if (!activity || !user) return;
    
    // Find the tag to get its text
    const approvedTags = activity.tags.filter((tag: any) => tag.status === 'approved');
    const tagText = approvedTags.find(tag => tag.id === tagId)?.text || '';
    
    // Update local state
    setUserMappings((prev: any) => ({
      ...prev,
      [tagId]: { tagId, x, y, annotation, text: tagText }
    }));
    
    setMappedTags((prev: string[]) => {
      if (!prev.includes(tagId)) {
        return [...prev, tagId];
      }
      return prev;
    });
    
    // Clear selected tag
    setSelectedTag(null);
    
    // Update activity with new position
    activityService.update(activity.id, (currentActivity) => {
      let userMapping = currentActivity.mappings.find((m: any) => m.userId === user.id);
      
      if (!userMapping) {
        userMapping = {
          userId: user.id,
          userName: user.name,
          positions: [],
          isComplete: false
        };
        
        currentActivity.mappings.push(userMapping);
      }
      
      // Update or add position
      const existingIndex = userMapping.positions.findIndex((p: any) => p.tagId === tagId);
      
      if (existingIndex !== -1) {
        userMapping.positions[existingIndex] = { tagId, x, y, annotation, text: tagText };
      } else {
        userMapping.positions.push({ tagId, x, y, annotation, text: tagText });
      }
      
      currentActivity.updatedAt = new Date();
      return currentActivity;
    });
  };

  const handleCompleteMappings = () => {
    if (!activity || !user) return;
    
    // Update activity marking user's mapping as complete
    const updatedActivity = activityService.update(activity.id, (currentActivity) => {
      const userMapping = currentActivity.mappings.find((m: any) => m.userId === user.id);
      
      if (userMapping) {
        userMapping.isComplete = true;
      }
      
      currentActivity.updatedAt = new Date();
      return currentActivity;
    });
    
    if (updatedActivity) {
      setActivity(updatedActivity);
      setIsMappingComplete(true);
      
      // If admin, redirect to results
      if (isAdmin) {
        router.push(`/activity/${activity.id}/mapping-results`);
      } else {
        // Show completion message
        alert('Your mappings have been submitted successfully!');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading mapping interface...</p>
      </div>
    );
  }

  if (!activity) {
    return <ActivityNotFound />;
  }

  const approvedTags = activity.tags.filter((tag: any) => tag.status === 'approved');
  const mappingSettings = activity.settings.mapping || {
    xAxisLabel: 'Knowledge',
    xAxisLeftLabel: "Don't Know",
    xAxisRightLabel: 'Know',
    yAxisLabel: 'Preference',
    yAxisTopLabel: 'Like',
    yAxisBottomLabel: "Don't Like",
    gridSize: 4,
    enableAnnotations: true,
    maxAnnotationLength: 280
  };

  const completionPercentage = approvedTags.length > 0 
    ? Math.round((mappedTags.length / approvedTags.length) * 100) 
    : 0;

  const currentlySelectedTag = selectedTag 
    ? approvedTags.find(t => t.id === selectedTag) || null 
    : null;

  return (
    <div className="mapping-page">
      <div className="mapping-container">
        <div className="mapping-header">
          <h1>Social Mapping</h1>
          <p className="activity-title">{activity.settings.entryView?.title || 'Collaborative Activity'}</p>
          
          <div className="mapping-instructions">
            <p>
              Position each tag on the grid according to your perspective.
              {mappingSettings.enableAnnotations && ' You can add comments to explain your choices.'}
            </p>
          </div>
          
          <div className="completion-status">
            <div className="completion-bar">
              <div 
                className="completion-progress" 
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <p>{mappedTags.length} of {approvedTags.length} tags mapped ({completionPercentage}%)</p>
            {isMappingComplete && (
              <div className="completion-badge">
                ✓ Mapping completed
              </div>
            )}
          </div>
        </div>
        
        <div className="mapping-workspace">
          <TagSelectionPanel 
            tags={approvedTags}
            mappedTags={mappedTags}
            selectedTag={selectedTag}
            onSelectTag={handleTagSelect}
          />
          
          <MappingGrid 
            settings={mappingSettings}
            selectedTag={currentlySelectedTag}
            userMappings={userMappings}
            onPositionTag={handleTagPosition}
          />
        </div>

        <ConnectionStatus status={connectionStatus} />

        <div className="navigation-controls">
          <button
            onClick={() => router.push(`/activity/${activity.id}/tags`)}
            className="secondary-button"
          >
            Back to Tags
          </button>
          
          <button
            onClick={() => router.push(`/activity/${activity.id}/mapping-results`)}
            className="secondary-button"
          >
            View Results
          </button>
          
          <button
            onClick={handleCompleteMappings}
            className="primary-button"
            disabled={mappedTags.length === 0 || isMappingComplete}
          >
            {isAdmin ? 'Complete and View Results' : 'Submit My Mappings'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .mapping-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .mapping-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 2rem;
        }
        
        .mapping-header {
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .mapping-header h1 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 2rem;
          color: #202124;
        }
        
        .activity-title {
          font-size: 1.2rem;
          color: #1a73e8;
          margin-bottom: 1rem;
          font-weight: 500;
        }
        
        .mapping-instructions {
          margin-bottom: 1.5rem;
          color: #5f6368;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .completion-status {
          margin-bottom: 1.5rem;
          position: relative;
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
        
        .completion-badge {
          position: absolute;
          top: -10px;
          right: 0;
          background-color: #34a853;
          color: white;
          font-size: 0.8rem;
          font-weight: 500;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .mapping-workspace {
          display: flex;
          align-items: flex-start;
          gap: 2rem;
          margin-bottom: 2rem;
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
        
        .primary-button:hover:not(:disabled) {
          background-color: #1765cc;
        }
        
        .primary-button:disabled {
          background-color: #c6d4e8;
          cursor: not-allowed;
        }
        
        @media (max-width: 992px) {
          .mapping-workspace {
            flex-direction: column;
          }
          
          .completion-badge {
            position: static;
            display: inline-block;
            margin-top: 0.5rem;
          }
          
          .mapping-page {
            padding: 1rem;
          }
          
          .mapping-container {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}