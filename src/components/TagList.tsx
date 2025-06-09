// src/components/TagList.tsx
"use client";

import { useState } from 'react';

interface Tag {
  id: string;
  text: string;
  creatorId: string;
  creatorName?: string;
  votes: Array<{
    userId: string;
    userName: string;
    timestamp: Date;
  }>;
  status: 'pending' | 'approved' | 'rejected';
  comments: Array<any>;
  commentCount: number;
}

interface TagListProps {
  tags: Tag[];
  currentUser: {
    id: string;
    name: string;
  } | null;
  isAdmin: boolean;
  votingEnabled: boolean;
  voteThreshold: number;
  onVote: (tagId: string) => void;
  onDelete: (tagId: string) => void;
}

export default function TagList({
  tags,
  currentUser,
  isAdmin,
  votingEnabled,
  voteThreshold,
  onVote,
  onDelete
}: TagListProps) {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

  if (!tags || tags.length === 0) {
    return (
      <div className="no-tags">
        <p>No tags have been added yet. Be the first to contribute!</p>
      </div>
    );
  }

  // Ensure no duplicate tags by ID
  const uniqueTags = Array.from(
    new Map(tags.map(tag => [tag.id, tag])).values()
  );

  // Filter tags by status
  const filteredTags = uniqueTags.filter(tag => {
    if (filter === 'all') return true;
    return tag.status === filter;
  });

  // Sort tags based on current filter
  const sortedTags = [...filteredTags].sort((a, b) => {
    // For the 'all' tab, maintain creation time order (using IDs with timestamps)
    if (filter === 'all') {
      // Extract the timestamp portion from the ID (assuming format tag_TIMESTAMP_random)
      const getTimestamp = (tag: Tag) => {
        const parts = tag.id.split('_');
        return parts.length > 1 ? parseInt(parts[1]) : 0;
      };
      return getTimestamp(a) - getTimestamp(b);
    }
    
    // For other tabs (approved, pending), sort by approval status then votes
    // Approved tags first
    if (a.status === 'approved' && b.status !== 'approved') return -1;
    if (a.status !== 'approved' && b.status === 'approved') return 1;
    
    // Then by vote count
    return b.votes.length - a.votes.length;
  });

  const hasUserVoted = (tag: Tag) => {
    if (!currentUser) return false;
    return tag.votes.some(vote => vote.userId === currentUser.id);
  };

  // Check if user can vote on this tag
  const canUserVote = (tag: Tag) => {
    if (!currentUser) return false;
    
    // User cannot vote on their own tags
    if (tag.creatorId === currentUser.id) return false;
    
    return true;
  };

  // Fixed delete handler - stops propagation and calls the parent's onDelete
  const handleDeleteTag = (tagId: string, event: React.MouseEvent) => {
    // Explicitly stop propagation
    event.preventDefault();
    event.stopPropagation();
    console.log('Delete button clicked for tag:', tagId);
    
    // Call the parent delete handler directly
    onDelete(tagId);
  };

  const handleVoteTag = (tagId: string, event: React.MouseEvent) => {
    // Prevent event bubbling
    event.stopPropagation();
    
    // Call the parent component's vote handler
    onVote(tagId);
  };

  return (
    <div className="tag-list-container">
      <div className="filter-controls">
        <div className="filter-buttons">
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'active' : ''}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={filter === 'pending' ? 'active' : ''}
          >
            <span className="color-indicator pending-indicator"></span>
            Nominated
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={filter === 'approved' ? 'active' : ''}
          >
            <span className="color-indicator approved-indicator"></span>
            Approved
          </button>
        </div>
      </div>

      <div className="scrollable-tags">
        {filteredTags.length === 0 ? (
          <div className="no-tags">
            <p>No tags match the current filter.</p>
          </div>
        ) : (
          <div className="tag-list">
            {sortedTags.map(tag => (
              <div key={tag.id} className="tag-row">
                <div className={`tag-pill ${tag.status === 'approved' ? 'approved' : 'pending'}`}>
                  <span className="tag-text">{tag.text}</span>
                </div>
                <div className="vote-column">
                  {votingEnabled && currentUser && canUserVote(tag) ? (
                    <button
                      onClick={(e) => handleVoteTag(tag.id, e)}
                      className={`vote-button ${hasUserVoted(tag) ? 'voted' : ''}`}
                      title={hasUserVoted(tag) ? 'Remove your vote' : 'Vote for this tag'}
                    >
                      ↑
                    </button>
                  ) : votingEnabled && currentUser && tag.creatorId === currentUser.id ? (
                    <span
                      className="vote-button creator-vote"
                      title="You cannot vote on your own tag"
                    >
                      ↑
                    </span>
                  ) : votingEnabled ? (
                    <div className="vote-placeholder"></div>
                  ) : null}
                </div>
                <div className="delete-column">
                  {(isAdmin || (currentUser && tag.creatorId === currentUser.id)) ? (
                    <button
                      onClick={(e) => handleDeleteTag(tag.id, e)}
                      className="delete-button"
                      title="Delete tag"
                    >
                      ×
                    </button>
                  ) : (
                    <div className="delete-placeholder"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .tag-list-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .filter-controls {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
          flex-shrink: 0;
        }
        
        .scrollable-tags {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 1.5rem;
        }
        
        .filter-buttons {
          display: flex;
          gap: 0.5rem;
          background-color: #FDF0E1;
          padding: 0.25rem;
          border-radius: 25px;
          border: 1px solid #E8C4A0;
        }
        
        .filter-buttons button {
          background-color: transparent;
          border: none;
          border-radius: 20px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          color: #8B7355;
          font-weight: 500;
        }
        
        .filter-buttons button.active {
          background-color: #D8CD9D;
          color: #202124;
        }
        
        .color-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 8px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .pending-indicator {
          background-color: #8B4513;
        }
        
        .approved-indicator {
          background-color: #F9AB00;
        }
        
        .tag-list {
          display: grid;
          grid-template-columns: 1fr;
        }
        
        @media (min-width: 768px) {
          .tag-list {
            grid-template-columns: 1fr 1fr;
            column-gap: 2rem;
            row-gap: 0;
          }
        }
        
        .tag-row {
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid #E8C4A0;
        }
        
        .tag-row:last-child {
          border-bottom: none;
        }
        
        .tag-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1rem;
          border-radius: 25px;
          font-size: 0.9rem;
          transition: all 0.2s;
          max-width: fit-content;
        }
        
        .tag-pill.pending {
          background-color: #8B4513;
          color: white;
        }
        
        .tag-pill.approved {
          background-color: #F9AB00;
          color: #202124;
        }
        
        .tag-text {
          font-weight: 500;
        }
        
        .vote-column {
          display: flex;
          justify-content: center;
          align-items: center;
          min-width: 32px;
        }
        
        .delete-column {
          display: flex;
          justify-content: center;
          align-items: center;
          min-width: 32px;
        }
        
        .vote-placeholder, .delete-placeholder {
          width: 24px;
          height: 24px;
        }
        
        .vote-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 3px;
          transition: all 0.2s;
          font-size: 1.4rem;
          font-weight: bold;
          min-width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #C4A484;
        }
        
        .vote-button:hover {
          transform: scale(1.2);
          color: #A67C5A;
        }
        
        .vote-button.voted {
          color: #F9AB00 !important;
        }
        
        .vote-button.creator-vote {
          cursor: default;
          color: #F9AB00 !important;
        }
        
        .delete-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 3px;
          transition: all 0.2s;
          font-size: 1.4rem;
          font-weight: bold;
          min-width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8B4513;
          opacity: 0.7;
        }
        
        .delete-button:hover {
          opacity: 1;
          transform: scale(1.2);
        }
        
        .no-tags {
          text-align: center;
          padding: 3rem;
          background-color: #FDF0E1;
          border-radius: 12px;
          color: #8B7355;
          border: 1px solid #E8C4A0;
        }
        
        @media (max-width: 600px) {
          .filter-controls {
            justify-content: center;
          }
          
          .tag-row {
            grid-template-columns: 1fr auto auto;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}