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
  
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [desktopTagText, setDesktopTagText] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    setShowTagForm(false); // Close form after adding
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
  const approvedTags = activity.tags.filter((tag: { status: string }) => tag.status === 'approved');
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
          <div className="core-question-container">
            <h1 className="core-question">{activity.settings.tagCreation?.coreQuestion || 'What topics should we explore?'}</h1>
            {(activity.settings.tagCreation?.instruction || getVotingInstruction()) && (
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
                {activity.settings.tagCreation?.instruction || 'Add tags for the activity'}
                {getVotingInstruction()}
              </p>
            </div>
          )}
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
        </div>

        {/* Desktop Add Tag Input - Bottom of Container */}
        {tagCreationEnabled && activity.status !== 'completed' && (
          <div className="desktop-add-tag">
            <div className="add-tag-input-container">
              <input
                type="text"
                placeholder="Enter Sub-topic"
                className="add-tag-input"
                value={desktopTagText}
                onChange={(e) => setDesktopTagText(e.target.value)}
                maxLength={100}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && desktopTagText.trim()) {
                    handleAddTag(desktopTagText.trim());
                    setDesktopTagText('');
                  }
                }}
              />
              <button
                className="add-tag-button"
                onClick={() => {
                  if (desktopTagText.trim()) {
                    handleAddTag(desktopTagText.trim());
                    setDesktopTagText('');
                  }
                }}
                aria-label="Add tag"
              >
                +
              </button>
            </div>
            <div className="desktop-character-counter">
              {desktopTagText.length}/100
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button for adding tags */}
      {tagCreationEnabled && activity.status !== 'completed' && (
        <button
          className="fab"
          onClick={() => setShowTagForm(true)}
          aria-label="Add new tag"
        >
          +
        </button>
      )}

      {/* Tag Creation Modal */}
      {showTagForm && (
        <div className="modal-overlay" onClick={() => setShowTagForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Tag</h3>
              <button 
                className="close-button"
                onClick={() => setShowTagForm(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <TagCreationForm onAddTag={handleAddTag} />
          </div>
        </div>
      )}

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
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .tags-container {
          background-color: #FDF6E9;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 1.5rem 1.5rem 0.75rem 1.5rem;
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
        
        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
        }
        
        .tags-header {
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
        
        .loading-container {
          text-align: center;
          padding: 3rem;
          color: #5f6368;
        }
        
        .desktop-add-tag {
          padding: 1.5rem;
          padding-bottom: 0;
          margin-top: auto;
          flex-shrink: 0;
        }
        
        .add-tag-input-container {
          display: flex;
          background-color: rgba(255, 255, 255, 0.8);
          border: 2px solid #E8C4A0;
          border-radius: 25px;
          padding: 0.25rem;
          align-items: center;
          gap: 0.5rem;
        }
        
        .add-tag-input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 0.75rem 1rem;
          font-size: 1rem;
          color: #202124;
          outline: none;
        }
        
        .add-tag-input::placeholder {
          color: #8B7355;
        }
        
        .add-tag-button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #E86C2B;
          color: white;
          border: none;
          font-size: 20px;
          font-weight: 300;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.25rem;
        }
        
        .add-tag-button:hover {
          background-color: #d45a21;
          transform: scale(1.05);
        }

        .desktop-character-counter {
          text-align: right;
          font-size: 0.8rem;
          color: #5f6368;
          margin-top: 0.25rem;
          padding-right: 1rem;
        }

        .fab {
          position: fixed;
          bottom: 100px;
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background-color: #E86C2B;
          color: white;
          border: none;
          font-size: 24px;
          font-weight: 300;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(232, 108, 43, 0.4);
          transition: all 0.2s ease;
          z-index: 1000;
          display: none;
          align-items: center;
          justify-content: center;
        }
        
        .fab:hover {
          background-color: #d45a21;
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(232, 108, 43, 0.6);
        }
        
        .fab:active {
          transform: scale(0.95);
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        
        .modal-content {
          background-color: #FDF6E9;
          border-radius: 12px;
          padding: 0;
          max-width: 90vw;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          animation: modalSlideUp 0.3s ease-out;
        }
        
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 1.5rem 0 1.5rem;
          margin-bottom: 1rem;
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 1.2rem;
          color: #202124;
          font-weight: 600;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          color: #5f6368;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        
        .close-button:hover {
          background-color: rgba(0, 0, 0, 0.1);
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
          padding: 0.75rem;
          margin-bottom: 1rem;
          display: flex;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .completion-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .completion-text {
          color: #b06000;
          font-weight: 600;
          font-size: 1rem;
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
        
        /* Desktop - show input, hide fab */
        @media (min-width: 769px) {
          .desktop-add-tag {
            display: block;
          }
          
          .fab {
            display: none !important;
          }
        }

        /* Mobile-specific optimizations */
        @media (max-width: 768px) {
          .tags-container {
            border-radius: 0;
            margin: 0;
            padding: 1rem;
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
          
          .tags-header {
            margin-bottom: 1rem;
          }
          
          .desktop-add-tag {
            display: none;
          }
          
          .fab {
            display: flex !important;
            bottom: 90px;
            right: 16px;
          }
          
          .modal-content {
            max-width: 95vw;
            margin: 1rem;
          }
          
          .completion-strip {
            padding: 0.5rem;
            margin-bottom: 0.5rem;
          }
          
          .completion-content {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
          }
          
          .completion-text {
            font-size: 0.9rem;
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
          
          .fab {
            width: 48px;
            height: 48px;
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}