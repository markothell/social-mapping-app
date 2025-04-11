"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { activityService } from '@/core/services/activityService';
import TagCreationForm from '@/components/TagCreationForm';
import TagList from '@/components/TagList';
import ActivityNotFound from '@/components/ActivityNotFound';
import ConnectionStatus from '@/components/ConnectionStatus';

// Helper function for consistent params handling across the app
function useParams<T>(params: T | Promise<T>): T {
  return params instanceof Promise ? use(params) : params;
}

export default function TagsPage({ params }: { params: { sessionId: string } | Promise<{ sessionId: string }> }) {
  const router = useRouter();
  
  // Properly unwrap params using React.use() for forward compatibility
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
        } else {
          // Redirect back to entry if no user
          router.push(`/activity/${sessionId}`);
        }
      }
    };

    loadActivity();
    loadUser();
  }, [sessionId, router]);

  // Function to add a new tag
  const handleAddTag = (tagText: string) => {
    if (!activity || !user) return;

    const newTag = {
      text: tagText,
      creatorId: user.id,
      creatorName: user.name
    };

    // Update the activity with the new tag
    const updatedActivity = activityService.update(activity.id, (currentActivity) => {
      const tag = {
        id: Math.random().toString(36).substring(2, 9),
        text: tagText,
        creatorId: user.id,
        creatorName: user.name,
        votes: [],
        comments: [],
        commentCount: 0,
        hasNewComments: false,
        status: activity.settings.tagCreation?.enableVoting ? 'pending' : 'approved'
      };

      currentActivity.tags.push(tag);
      currentActivity.updatedAt = new Date();
      return currentActivity;
    });

    if (updatedActivity) {
      setActivity(updatedActivity);
    }
  };

  // Function to vote for a tag
  const handleVoteTag = (tagId: string) => {
    if (!activity || !user) return;

    const updatedActivity = activityService.update(activity.id, (currentActivity) => {
      const tag = currentActivity.tags.find((t: any) => t.id === tagId);
      if (!tag) return currentActivity;

      // Check if user already voted
      if (tag.votes.some((v: any) => v.userId === user.id)) {
        // Remove the vote
        tag.votes = tag.votes.filter((v: any) => v.userId !== user.id);
      } else {
        // Add the vote
        tag.votes.push({
          userId: user.id,
          userName: user.name,
          timestamp: new Date()
        });

        // Update tag status if vote threshold is reached
        if (
          currentActivity.settings.tagCreation?.enableVoting &&
          tag.status === 'pending' &&
          tag.votes.length >= currentActivity.settings.tagCreation.voteThreshold
        ) {
          tag.status = 'approved';
        }
      }

      currentActivity.updatedAt = new Date();
      return currentActivity;
    });

    if (updatedActivity) {
      setActivity(updatedActivity);
    }
  };

  // Function to delete a tag (admin only)
  const handleDeleteTag = (tagId: string) => {
    if (!activity || !isAdmin) return;

    if (window.confirm('Are you sure you want to delete this tag?')) {
      const updatedActivity = activityService.update(activity.id, (currentActivity) => {
        currentActivity.tags = currentActivity.tags.filter((t: any) => t.id !== tagId);
        currentActivity.updatedAt = new Date();
        return currentActivity;
      });

      if (updatedActivity) {
        setActivity(updatedActivity);
      }
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
      <div className="tags-container">
        <div className="tags-header">
          <h1>Tag Creation</h1>
          <p className="activity-title">{activity.settings.entryView?.title || 'Collaborative Activity'}</p>
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

        <ConnectionStatus status={connectionStatus} />

        <div className="navigation-controls">
          <button
            onClick={() => router.push(`/activity/${activity.id}`)}
            className="secondary-button"
          >
            Back to Activity
          </button>
          
          {/* Show a continue button for all users, not just admins */}
          <button
            onClick={() => router.push(`/activity/${activity.id}/mapping`)}
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
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .tags-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 2rem;
        }
        
        .tags-header {
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .tags-header h1 {
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