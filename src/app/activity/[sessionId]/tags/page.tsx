// src/app/activity/[sessionId]/tags/page.tsx
"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useRealTimeActivity } from '@/core/hooks/useRealTimeActivity';
import { useNotifications } from '@/contexts/NotificationContext';
import TagCreationForm from '@/components/TagCreationForm';
import TagList from '@/components/TagList';
import ActivityNotFound from '@/components/ActivityNotFound';
import ActivityHeader from '@/components/ActivityHeader';
import GlobalNavigation from '@/components/GlobalNavigation';
import ConnectionStatus from '@/components/ConnectionStatus';

function useParams<T>(params: T | Promise<T>): T {
  return params instanceof Promise ? use(params) : params;
}

export default function TagsPage({ 
  params 
}: { 
  params: { sessionId: string } | Promise<{ sessionId: string }> 
}) {
  const router = useRouter();
  const unwrappedParams = useParams(params);
  const sessionId = unwrappedParams.sessionId;
  
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { incrementNewTags, setApprovedTagsChanged } = useNotifications();
  
  // Use the real-time activity hook
  const {
    activity,
    loading,
    isConnected,
    connectionError,
    addTag,
    voteTag,
    deleteTag,
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
  
  // Function to add a new tag with real-time updates
  const handleAddTag = (tagText: string) => {
    if (!activity || !user) return;

    // Generate unique ID with timestamp for tracking
    const tagId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    console.log(`Creating new tag with ID: ${tagId}`);

    const newTag = {
      id: tagId,
      text: tagText,
      creatorId: user.id,
      creatorName: user.name,
      votes: [],
      comments: [],
      commentCount: 0,
      hasNewComments: false,
      status: activity.settings.tagCreation?.enableVoting ? 'pending' : 'approved'
    };

    // Track tag addition
    addTag(newTag);
  };


  // Function to vote for a tag with real-time updates
  const handleVoteTag = (tagId: string) => {
    // Use the real-time voteTag function
    voteTag(tagId);
  };

  // Function to delete a tag with real-time updates
  const handleDeleteTag = (tagId: string) => {
    if (!activity) {
      console.error("Cannot delete tag: activity is null");
      return;
    }
    
    if (!user) {
      console.error("Cannot delete tag: user is not authenticated");
      return;
    }
    
    // Log for debugging
    console.log(`Attempting to delete tag ${tagId} from activity ${activity.id}`);
    
    // Check if user has permission (admin or tag creator)
    const tag = activity.tags.find(t => t.id === tagId);
    if (!tag) {
      console.error(`Tag ${tagId} not found in activity ${activity.id}`);
      return;
    }
    
    const isCreator = tag.creatorId === user.id;
    if (!isAdmin && !isCreator) {
      console.error(`User ${user.id} does not have permission to delete tag ${tagId}`);
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this tag?')) {
      // Use the real-time deleteTag function
      console.log(`Confirmed deletion of tag ${tagId}`);
      deleteTag(tagId);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading tags...</div>;
  }

  if (!activity) {
    return <ActivityNotFound />;
  }

  const tagCreationEnabled = activity.phase === 'tagging' || activity.phase === 'gathering';
  const votingEnabled = activity.settings.tagCreation?.enableVoting;
  const voteThreshold = activity.settings.tagCreation?.voteThreshold || 2;
  const thresholdType = activity.settings.tagCreation?.thresholdType || 'minimum';
  const minimumVotes = activity.settings.tagCreation?.minimumVotes || 1;
  const topNCount = activity.settings.tagCreation?.topNCount || 5;
  
  // Generate voting instruction text based on threshold type
  const getVotingInstruction = () => {
    if (thresholdType === 'off' || !votingEnabled) {
      return '';
    } else if (thresholdType === 'minimum') {
      return ` Sub-topics require ${minimumVotes} vote${minimumVotes === 1 ? '' : 's'} to be included in mapping.`;
    } else if (thresholdType === 'topN') {
      return ` The ${topNCount} sub-topics with the most votes will be included in the next stages.`;
    }
    return '';
  };
  
  // Count approved tags
  const approvedTags = activity.tags.filter((tag: any) => tag.status === 'approved');
  const hasApprovedTags = approvedTags.length > 0;

  return (
    <div className="tags-page">
      <ActivityHeader 
        activityTitle={activity?.settings?.entryView?.title}
        subtitle="1: Nominate Sub-Topics"
        hostName={activity?.hostName}
      />
      
      <GlobalNavigation 
        sessionId={sessionId} 
        activityTitle={activity?.settings?.entryView?.title}
        hostName={activity?.hostName}
        activity={activity}
        currentUserId={user?.id}
      />
      
      <div className="tags-container">
        <div className="tags-header">
          <h1 className="core-question">{activity.settings.tagCreation?.coreQuestion || 'What topics should we explore?'}</h1>
          <p className="instruction">
            {activity.settings.tagCreation?.instruction || 'Add tags for the activity'}{getVotingInstruction()}
          </p>
        </div>

        {activity.status === 'completed' && (
          <div className="completion-strip">
            <div className="completion-content">
              <span className="completion-text">Activity Completed</span>
              <button
                onClick={() => router.push(`/activity/${activity.id}/mapping-results`)}
                className="view-results-button"
              >
                View Results
              </button>
            </div>
          </div>
        )}

        <div className="content-area">
          <TagList
            tags={activity.tags || []}
            currentUser={user}
            isAdmin={isAdmin}
            votingEnabled={votingEnabled && activity.status !== 'completed'}
            voteThreshold={voteThreshold}
            onVote={handleVoteTag}
            onDelete={handleDeleteTag}
          />

          {tagCreationEnabled && activity.status !== 'completed' && (
            <div className="sticky-input">
              <TagCreationForm onAddTag={handleAddTag} />
            </div>
          )}
        </div>
      </div>

      <ConnectionStatus 
        status={{ 
          isConnected: isConnected, 
          error: connectionError 
        }} 
      />

      <div className="navigation-controls">
        <button
          onClick={() => router.push(`/activity/${activity.id}`)}
          className="secondary-button"
        >
          Back to Activity
        </button>
        
        <button
          onClick={() => {
            // Use the real-time changePhase function if admin
            if (isAdmin) {
              changePhase('mapping');
            }
            
            router.push(`/activity/${activity.id}/mapping`);
          }}
          className="primary-button"
          disabled={!hasApprovedTags}
          title={!hasApprovedTags ? "You need at least one approved tag to continue" : ""}
        >
          Continue to Mapping
        </button>
      </div>
      
      <style jsx>{`
        .tags-page {
          color: #202124;
          padding-bottom: 1rem;
        }
        
        .tags-container {
          background-color: #FDF6E9;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 2rem;
          margin: 1rem;
          margin-bottom: 2rem;
          height: calc(100vh - 200px);
          display: flex;
          flex-direction: column;
        }
        
        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .sticky-input {
          position: sticky;
          bottom: 0;
          background-color: #FDF6E9;
          padding-top: 0.75rem;
          border-top: 1px solid #E8C4A0;
          margin-top: 0.5rem;
        }
        
        .tags-header {
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
        
        
        .instruction {
          font-size: 1.1rem;
          color: #5f6368;
          margin-bottom: 2rem;
        }
        
        .loading-container {
          text-align: center;
          padding: 3rem;
          color: #5f6368;
        }
        
        .navigation-controls {
          display: flex;
          justify-content: space-between;
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid #eee;
        }
        
        .navigation-controls {
          display: none;
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
        }
        
        .primary-button:hover:not(:disabled) {
          background-color: #1765cc;
        }
        
        .primary-button:disabled {
          background-color: #c6d4e8;
          cursor: not-allowed;
        }
        
        .completion-strip {
          background-color: #fef7e0;
          border: 1px solid #f9d71c;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 2rem;
          display: flex;
          justify-content: center;
        }
        
        .completion-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .completion-text {
          color: #b06000;
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        .view-results-button {
          background-color: #f9ab00;
          color: #b06000;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
          font-weight: 500;
        }
        
        .view-results-button:hover {
          background-color: #f29900;
        }
      `}</style>
    </div>
  );
}