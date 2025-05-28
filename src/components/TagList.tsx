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
        <h2>Tags ({uniqueTags.length})</h2>
        <div className="filter-buttons">
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'active' : ''}
          >
            All
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={filter === 'approved' ? 'active' : ''}
          >
            Approved
          </button>
          {votingEnabled && (
            <button
              onClick={() => setFilter('pending')}
              className={filter === 'pending' ? 'active' : ''}
            >
              Pending
            </button>
          )}
        </div>
      </div>

      {filteredTags.length === 0 ? (
        <div className="no-tags">
          <p>No tags match the current filter.</p>
        </div>
      ) : (
        <div className="tag-list">
          {sortedTags.map(tag => (
            <div 
              key={tag.id} 
              className={`tag-item ${tag.status === 'approved' ? 'approved' : 'pending'}`}
            >
              <div className="tag-row">
                <div className="tag-text">{tag.text}</div>
                <div className="vote-controls">
                  {votingEnabled && currentUser && canUserVote(tag) ? (
                    <button
                      onClick={(e) => handleVoteTag(tag.id, e)}
                      className={`vote-button ${hasUserVoted(tag) ? 'voted' : ''}`}
                      title={hasUserVoted(tag) ? 'Remove your vote' : 'Vote for this tag'}
                    >
                      <div className="vote-arrow">
                        <div className="arrow-triangle"></div>
                      </div>
                    </button>
                  ) : votingEnabled && currentUser && tag.creatorId === currentUser.id ? (
                    <span
                      className="vote-button creator-vote"
                      title="You cannot vote on your own tag"
                    >
                      <div className="vote-arrow">
                        <div className="arrow-triangle"></div>
                      </div>
                    </span>
                  ) : null}
                  {votingEnabled && (
                    <span className="vote-count">({tag.votes.length})</span>
                  )}
                </div>
              </div>
              <div className="tag-row">
                <span className="tag-creator">Added by: {tag.creatorName || 'Anonymous'}</span>
                {(isAdmin || (currentUser && tag.creatorId === currentUser.id)) && (
                  <button
                    onClick={(e) => handleDeleteTag(tag.id, e)}
                    className="delete-button"
                    title="Delete tag"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .tag-list-container {
          margin-bottom: 2rem;
        }
        
        .filter-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .filter-controls h2 {
          margin: 0;
          font-size: 1.3rem;
          color: #202124;
        }
        
        .filter-buttons {
          display: flex;
          gap: 0.5rem;
        }
        
        .filter-buttons button {
          background-color: #f1f3f4;
          border: none;
          border-radius: 4px;
          padding: 0.4rem 0.8rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .filter-buttons button.active {
          background-color: #e8f0fe;
          color: #1a73e8;
          font-weight: 500;
        }
        
        .tag-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        
        .tag-item {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 0.5rem;
          border-left: 4px solid #fbbc04;
        }
        
        .tag-item.approved {
          border-left-color: #34a853;
        }
        
        .tag-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }
        
        .tag-row:last-child {
          margin-bottom: 0;
        }
        
        .tag-text {
          font-size: 1.1rem;
          color: #202124;
          word-break: break-word;
          flex: 1;
        }
        
        .vote-controls {
          display: flex;
          align-items: center;
          gap: 0.125rem;
        }
        
        .tag-creator {
          font-size: 0.8rem;
          color: #5f6368;
        }
        
        .vote-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 3px;
          transition: all 0.2s;
        }
        
        .vote-button:hover {
          background-color: #f0f0f0;
        }
        
        .vote-button.voted .vote-arrow {
          border-color: #34a853;
          background-color: #e8f5e8;
        }
        
        .vote-button.voted .arrow-triangle {
          border-bottom-color: #34a853;
        }
        
        .vote-button.creator-vote {
          cursor: default;
        }
        
        .vote-button.creator-vote .vote-arrow {
          border-color: #34a853;
        }
        
        .vote-button.creator-vote .arrow-triangle {
          border-bottom-color: #34a853;
        }
        
        .vote-arrow {
          width: 24px;
          height: 24px;
          border: 1.5px solid #9aa0a6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .arrow-triangle {
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-bottom: 6px solid #9aa0a6;
          transition: all 0.2s;
        }
        
        .vote-count {
          font-size: 0.9rem;
          color: #5f6368;
          margin-left: 0.125rem;
        }
        
        .delete-button {
          background: none;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 3px;
          transition: background-color 0.2s;
        }
        
        .delete-button:hover {
          background-color: #ffeaea;
        }
        
        .no-tags {
          text-align: center;
          padding: 3rem;
          background-color: #f8f9fa;
          border-radius: 8px;
          color: #5f6368;
        }
        
        @media (max-width: 600px) {
          .tag-list {
            grid-template-columns: 1fr;
          }
          
          .filter-controls {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .filter-buttons {
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}