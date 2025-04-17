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

  // Sort tags: approved first, then by vote count
  const sortedTags = [...filteredTags].sort((a, b) => {
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
              <div className="tag-content">
                <div className="tag-text">{tag.text}</div>
                <div className="tag-meta">
                  <span className="tag-creator">Added by: {tag.creatorName || 'Anonymous'}</span>
                  {votingEnabled && (
                    <span className="vote-status">
                      {tag.votes.length}/{voteThreshold} votes needed
                      {tag.status === 'approved' && ' (Approved)'}
                    </span>
                  )}
                </div>
              </div>
              <div className="tag-actions">
                {votingEnabled && currentUser && canUserVote(tag) ? (
                  <button
                    onClick={(e) => handleVoteTag(tag.id, e)}
                    className={`vote-button ${hasUserVoted(tag) ? 'voted' : ''}`}
                  >
                    {hasUserVoted(tag) ? 'Unvote' : 'Vote'}
                    <span className="vote-count">{tag.votes.length}</span>
                  </button>
                ) : tag.creatorId === currentUser?.id && (
                  <span className="creator-note">Your tag</span>
                )}
                {(isAdmin || (currentUser && tag.creatorId === currentUser.id)) && (
                  <button
                    onClick={(e) => handleDeleteTag(tag.id, e)}
                    className="delete-button"
                  >
                    Delete
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
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 1rem;
          border-left: 4px solid #fbbc04;
        }
        
        .tag-item.approved {
          border-left-color: #34a853;
        }
        
        .tag-content {
          margin-bottom: 1rem;
        }
        
        .tag-text {
          font-size: 1.1rem;
          color: #202124;
          margin-bottom: 0.5rem;
          word-break: break-word;
        }
        
        .tag-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #5f6368;
        }
        
        .tag-actions {
          display: flex;
          justify-content: space-between;
        }
        
        .vote-button {
          display: flex;
          align-items: center;
          background-color: #f1f3f4;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 0.75rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .vote-button:hover {
          background-color: #e8eaed;
        }
        
        .vote-button.voted {
          background-color: #e8f0fe;
          color: #1a73e8;
        }
        
        .vote-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: 0.5rem;
          background-color: white;
          color: #202124;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .creator-note {
          font-size: 0.9rem;
          color: #5f6368;
          font-style: italic;
          align-self: center;
        }
        
        .delete-button {
          background-color: #fdeded;
          color: #ea4335;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 0.75rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .delete-button:hover {
          background-color: #fad2d2;
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