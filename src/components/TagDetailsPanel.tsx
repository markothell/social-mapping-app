"use client";

import { memo } from 'react';

interface Tag {
  id: string;
  text: string;
}

interface Mapping {
  userId: string;
  userName: string;
  positions: any[];
  isComplete: boolean;
}

interface TagStats {
  tag: Tag;
  mappingCount: number;
  averageX: number;
  averageY: number;
  quadrant: string;
  consensus: number;
  annotations: { text: string; userName: string }[];
}

interface TagDetailsPanelProps {
  activeTab: 'statistics' | 'comments';
  setActiveTab: (tab: 'statistics' | 'comments') => void;
  selectedTag: string | null;
  tagStats: TagStats | null;
  quadrantStats: any;
  mappingSettings: any;
  tags: Tag[];
  mappings: Mapping[];
  participants: any[];
  onSelectTag: (tagId: string) => void;
  onClearSelection: () => void;
  onCommentClick?: (userId: string) => void;
  viewMode?: 'aggregate' | 'individual';
  participantName?: string;
}

// Using memo to prevent unnecessary re-renders
const TagDetailsPanel = memo(function TagDetailsPanel({
  activeTab,
  setActiveTab,
  selectedTag,
  tagStats,
  quadrantStats,
  mappingSettings,
  tags,
  mappings,
  participants,
  onSelectTag,
  onClearSelection,
  onCommentClick,
  viewMode = 'aggregate',
  participantName
}: TagDetailsPanelProps) {
  
  // Helper function to get all comments for the current user
  const getAllUserComments = () => {
    if (viewMode !== 'individual' || !participantName) return [];
    
    const comments = [];
    const mapping = mappings.find(m => m.userName === participantName);
    
    if (!mapping) return [];
    
    for (const position of mapping.positions) {
      if (position.annotation) {
        const tag = tags.find(t => t.id === position.tagId);
        comments.push({
          tagId: position.tagId,
          tagText: tag?.text || position.tagId,
          text: position.annotation
        });
      }
    }
    
    return comments;
  };

  return (
    <div className="statistics-panel">
      {/* Tab Navigation */}
      <div className="tab-controls">
        <button 
          className={activeTab === 'statistics' ? 'active' : ''}
          onClick={() => setActiveTab('statistics')}
        >
          Statistics
        </button>
        <button 
          className={activeTab === 'comments' ? 'active' : ''}
          onClick={() => setActiveTab('comments')}
          disabled={!selectedTag && !(viewMode === 'individual' && !selectedTag && participantName)}
        >
          Comments
        </button>
      </div>
      
      {activeTab === 'comments' && viewMode === 'individual' && !selectedTag ? (
        <div className="selected-tag-stats">
          <h4>All Comments from {participantName}</h4>
          <div className="tag-comments-section">
            {getAllUserComments().length > 0 ? (
              <div className="annotation-list">
                {getAllUserComments().map((comment, idx) => (
                  <div key={idx} className="annotation-item">
                    <div className="comment-tag-name">{comment.tagText}</div>
                    <div className="annotation-content">{comment.text}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-annotations">No comments available from this participant.</p>
            )}
          </div>
        </div>
      ) : selectedTag && tagStats ? (
        <div className="selected-tag-stats">
          <h4>{tagStats.tag.text}</h4>
          <p>Creator: {tagStats.tag.creatorName || 'Unknown'}</p>
          <p>Mapped by {tagStats.mappingCount} participants</p>
          <p>Average position: ({tagStats.averageX.toFixed(2)}, {tagStats.averageY.toFixed(2)})</p>
          <p>Typical quadrant: {tagStats.quadrant}</p>
          <p>Consensus level: {Math.round(tagStats.consensus * 100)}%</p>
          
          {activeTab === 'comments' && (
            <div className="tag-comments-section">
              <h4>Annotations & Comments</h4>
              
              {tagStats.annotations.length > 0 ? (
                <div className="annotation-list">
                  {tagStats.annotations.map((annotation, idx) => {
                    // Find mapping with this userName
                    const mapping = mappings.find(m => m.userName === annotation.userName);
                    const userId = mapping?.userId;
                    
                    return (
                      <div 
                        key={idx} 
                        className="annotation-item"
                        onClick={() => onCommentClick && userId && onCommentClick(userId)}
                      >
                        <div className="annotation-content">{annotation.text}</div>
                        <div className="annotation-author">
                          — {annotation.userName}
                          {userId && (
                            <span className="view-map-link"> (Click to view map)</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="no-annotations">No annotations available for this tag.</p>
              )}
            </div>
          )}
          
          <button onClick={onClearSelection} className="clear-selection">
            Clear Selection
          </button>
        </div>
      ) : (
        // Show statistics when no tag is selected or when stats tab is active
        activeTab === 'statistics' && (
          <>
            <div className="quadrant-stats">
              <h4>Quadrant Analysis</h4>
              <div className="quadrant-grid">
                <div className="quadrant q2">
                  <div className="quadrant-label">
                    {mappingSettings.xAxisMinLabel} / {mappingSettings.yAxisMaxLabel}
                    <span className="count">{quadrantStats.q2?.count || 0}</span>
                  </div>
                  <div className="tag-list">
                    {quadrantStats.q2?.tags?.slice(0, 3).map((tag: any) => (
                      <div 
                        key={tag.id} 
                        className="tag-pill"
                        onClick={() => onSelectTag(tag.id)}
                      >
                        {tag.text}
                      </div>
                    ))}
                    {(quadrantStats.q2?.tags?.length || 0) > 3 && (
                      <div className="more-tags">+{quadrantStats.q2?.tags?.length - 3} more</div>
                    )}
                  </div>
                </div>
                <div className="quadrant q1">
                  <div className="quadrant-label">
                    {mappingSettings.xAxisMaxLabel} / {mappingSettings.yAxisMaxLabel}
                    <span className="count">{quadrantStats.q1?.count || 0}</span>
                  </div>
                  <div className="tag-list">
                    {quadrantStats.q1?.tags?.slice(0, 3).map((tag: any) => (
                      <div 
                        key={tag.id} 
                        className="tag-pill"
                        onClick={() => onSelectTag(tag.id)}
                      >
                        {tag.text}
                      </div>
                    ))}
                    {(quadrantStats.q1?.tags?.length || 0) > 3 && (
                      <div className="more-tags">+{quadrantStats.q1?.tags?.length - 3} more</div>
                    )}
                  </div>
                </div>
                <div className="quadrant q3">
                  <div className="quadrant-label">
                    {mappingSettings.xAxisMinLabel} / {mappingSettings.yAxisMinLabel}
                    <span className="count">{quadrantStats.q3?.count || 0}</span>
                  </div>
                  <div className="tag-list">
                    {quadrantStats.q3?.tags?.slice(0, 3).map((tag: any) => (
                      <div 
                        key={tag.id} 
                        className="tag-pill"
                        onClick={() => onSelectTag(tag.id)}
                      >
                        {tag.text}
                      </div>
                    ))}
                    {(quadrantStats.q3?.tags?.length || 0) > 3 && (
                      <div className="more-tags">+{quadrantStats.q3?.tags?.length - 3} more</div>
                    )}
                  </div>
                </div>
                <div className="quadrant q4">
                  <div className="quadrant-label">
                    {mappingSettings.xAxisMaxLabel} / {mappingSettings.yAxisMinLabel}
                    <span className="count">{quadrantStats.q4?.count || 0}</span>
                  </div>
                  <div className="tag-list">
                    {quadrantStats.q4?.tags?.slice(0, 3).map((tag: any) => (
                      <div 
                        key={tag.id} 
                        className="tag-pill"
                        onClick={() => onSelectTag(tag.id)}
                      >
                        {tag.text}
                      </div>
                    ))}
                    {(quadrantStats.q4?.tags?.length || 0) > 3 && (
                      <div className="more-tags">+{quadrantStats.q4?.tags?.length - 3} more</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          
            <div className="mapping-summary">
              <h4>Overall Statistics</h4>
              <ul>
                <li>Total tags: {tags.length}</li>
                <li>Total participants: {participants.length}</li>
                <li>Completed mappings: {mappings.filter(m => m.isComplete).length}</li>
                <li>Average tags mapped per participant: {mappings.length > 0 
                  ? (mappings.reduce((sum, m) => sum + m.positions.length, 0) / mappings.length).toFixed(1) 
                  : '0'}</li>
              </ul>
            </div>
          </>
        )
      )}

      <style jsx>{`
        .statistics-panel {
          flex: 1;
          min-width: 300px;
        }
        
        .annotation-item {
          cursor: pointer;
          transition: background-color 0.2s;
          padding: 8px;
          border-radius: 4px;
        }
        
        .annotation-item:hover {
          background-color: #f1f3f4;
        }
        
        .view-map-link {
          color: #1a73e8;
          font-size: 0.8rem;
          font-style: italic;
        }
        
        .comment-tag-name {
          font-weight: 500;
          color: #1a73e8;
          margin-bottom: 0.3rem;
          font-size: 0.85rem;
        }
        
        .tab-controls {
          display: flex;
          margin-bottom: 1rem;
          border-bottom: 1px solid #dadce0;
        }
        
        .tab-controls button {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          color: #5f6368;
        }
        
        .tab-controls button.active {
          color: #1a73e8;
          border-bottom: 3px solid #1a73e8;
          font-weight: 500;
        }
        
        .tab-controls button:disabled {
          color: #dadce0;
          cursor: not-allowed;
        }
        
        .selected-tag-stats {
          background-color: #e8f0fe;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .selected-tag-stats h4 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 1.1rem;
          color: #1a73e8;
        }
        
        .selected-tag-stats p {
          margin: 0.4rem 0;
          font-size: 0.9rem;
        }
        
        .clear-selection {
          margin-top: 1rem;
          background-color: #f1f3f4;
          color: #202124;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .clear-selection:hover {
          background-color: #e8eaed;
        }
        
        .tag-comments-section {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #dadce0;
        }
        
        .annotation-list {
          margin-top: 0.75rem;
        }
        
        .annotation-item {
          background-color: white;
          border-radius: 6px;
          padding: 0.75rem;
          margin-bottom: 0.75rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }
        
        .annotation-content {
          font-size: 0.9rem;
          color: #202124;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        
        .annotation-author {
          font-size: 0.8rem;
          color: #5f6368;
          text-align: right;
          font-style: italic;
        }
        
        .no-annotations {
          color: #5f6368;
          font-style: italic;
          font-size: 0.9rem;
          text-align: center;
          padding: 1rem;
          background-color: #f8f9fa;
          border-radius: 6px;
        }
        
        .quadrant-stats {
          margin-bottom: 1.5rem;
        }
        
        .quadrant-stats h4 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 1.1rem;
        }
        
        .quadrant-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .quadrant {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 0.75rem;
        }
        
        .quadrant.q1 {
          border-left: 4px solid #34a853;
        }
        
        .quadrant.q2 {
          border-left: 4px solid #4285f4;
        }
        
        .quadrant.q3 {
          border-left: 4px solid #ea4335;
        }
        
        .quadrant.q4 {
          border-left: 4px solid #fbbc04;
        }
        
        .quadrant-label {
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .quadrant-label .count {
          background-color: #e8eaed;
          border-radius: 10px;
          padding: 0.1rem 0.5rem;
          font-size: 0.75rem;
        }
        
        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .tag-pill {
          background-color: #e8f0fe;
          color: #1a73e8;
          border-radius: 12px;
          padding: 0.2rem 0.5rem;
          font-size: 0.75rem;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        
        .tag-pill:hover {
          background-color: #d2e3fc;
        }
        
        .more-tags {
          font-size: 0.75rem;
          color: #5f6368;
        }
        
        .mapping-summary {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 1rem;
        }
        
        .mapping-summary h4 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
        }
        
        .mapping-summary ul {
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }
        
        .mapping-summary li {
          margin-bottom: 0.3rem;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}); 

export default TagDetailsPanel;