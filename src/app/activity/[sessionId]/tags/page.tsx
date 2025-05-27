// src/app/activity/[sessionId]/tags/page.tsx
"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useRealTimeActivity } from '@/core/hooks/useRealTimeActivity';
import TagCreationForm from '@/components/TagCreationForm';
import TagList from '@/components/TagList';
import ActivityNotFound from '@/components/ActivityNotFound';
import ConnectionStatus from '@/components/ConnectionStatus';
import GlobalNavigation from '@/components/GlobalNavigation';

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
  
  // Count approved tags
  const approvedTags = activity.tags.filter((tag: any) => tag.status === 'approved');
  const hasApprovedTags = approvedTags.length > 0;

  return (
    <div className="tags-page">
      <GlobalNavigation 
        sessionId={sessionId} 
        activityTitle={activity.settings.entryView?.title || 'activity'}
        hostName={activity.hostName}
        activity={activity}
      />
      <div className="tags-container">
        <div className="tags-header">
          <h1 className="core-question">{activity.settings.tagCreation?.coreQuestion || 'What topics should we explore?'}</h1>
          <p className="stage-subtitle">Tag Creation</p>
          <p className="instruction">
            {activity.settings.tagCreation?.instruction || 'Add tags for the activity'}
          </p>
        </div>

        {tagCreationEnabled && (
          <TagCreationForm onAddTag={handleAddTag} />
        )}

        <TagList
          tags={activity.tags || []}
          currentUser={user}
          isAdmin={isAdmin}
          votingEnabled={votingEnabled}
          voteThreshold={voteThreshold}
          onVote={handleVoteTag}
          onDelete={handleDeleteTag}
        />

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
      </div>
      
      <style jsx>{`
        .tags-page {
          color: #202124;
        }
        
        .tags-container {
          background-color: white;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 2rem;
          margin-top: -1px;
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
        
        .stage-subtitle {
          font-size: 1.3rem;
          color: #1a73e8;
          margin-top: 0;
          margin-bottom: 1rem;
          font-weight: 500;
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
      `}</style>
    </div>
  );
}