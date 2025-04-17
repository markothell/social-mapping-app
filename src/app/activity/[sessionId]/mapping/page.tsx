// src/app/activity/[sessionId]/mapping/page.tsx
"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useRealTimeActivity } from '@/core/hooks/useRealTimeActivity';
import MappingGrid from '@/components/MappingGrid';
import TagSelectionPanel from '@/components/TagSelectionPanel';
import ActivityNotFound from '@/components/ActivityNotFound';
import ConnectionStatus from '@/components/ConnectionStatus';

function useParams<T>(params: T | Promise<T>): T {
  return params instanceof Promise ? use(params) : params;
}

export default function MappingPage({ 
  params 
}: { 
  params: { sessionId: string } | Promise<{ sessionId: string }> 
}) {
  const router = useRouter();
  const unwrappedParams = useParams(params);
  const sessionId = unwrappedParams.sessionId;
  
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [mappedTags, setMappedTags] = useState<string[]>([]);
  const [userMappings, setUserMappings] = useState<any>({});
  
  // Use the real-time activity hook
  const {
    activity,
    loading,
    isConnected,
    connectionError,
    updateMapping,
    changePhase
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
    const newUserMappings = {
      ...userMappings,
      [tagId]: { tagId, x, y, annotation, text: tagText }
    };
    
    setUserMappings(newUserMappings);
    
    if (!mappedTags.includes(tagId)) {
      setMappedTags([...mappedTags, tagId]);
    }
    
    // Clear selected tag
    setSelectedTag(null);
    
    // Update the activity with new position using real-time updates
    const positions = Object.values(newUserMappings);
    updateMapping(positions);
  };
  
  const handleCompleteMappings = () => {
    if (!activity || !user) return;
    
    // Convert mappings to array
    const positions = Object.values(userMappings);
    
    // Mark as complete
    const updatedPositions = positions.map(pos => ({
      ...pos,
      isComplete: true
    }));
    
    // Update with real-time updates
    // Important: Create a properly structured mapping update
    // with the isComplete flag set at the mapping level, not just on positions
    updateMapping(positions, true); // Pass true to mark the entire mapping as complete
    
    // If admin, redirect to results and change phase
    if (isAdmin) {
      changePhase('mapping-results');
      router.push(`/activity/${activity.id}/mapping-results`);
    } else {
      // Show completion message
      alert('Your mappings have been submitted successfully!');
    }
  };
  
  if (loading) {
    return <div className="loading-container">Loading mapping interface...</div>;
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
            selectedTag={selectedTag ? approvedTags.find(t => t.id === selectedTag) : null}
            userMappings={userMappings}
            onPositionTag={handleTagPosition}
          />
        </div>

        <ConnectionStatus 
          status={{ 
            isConnected: isConnected, 
            error: connectionError 
          }} 
        />

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
            disabled={mappedTags.length === 0}
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