"use client";

import { useState } from 'react';
import { getTagColor } from '@/utils/mappingDataUtils';

interface Tag {
  id: string;
  text: string;
  status: string;
}

interface TagSelectionPanelProps {
  tags: Tag[];
  mappedTags: string[];
  selectedTag: string | null;
  onSelectTag: (tagId: string) => void;
}

export default function TagSelectionPanel({
  tags,
  mappedTags,
  selectedTag,
  onSelectTag
}: TagSelectionPanelProps) {
  const [filter, setFilter] = useState<'all' | 'unmapped' | 'mapped'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!tags || tags.length === 0) {
    return (
      <div className="tag-selection-panel">
        <div className="panel-header">
          <h2>Tags</h2>
        </div>
        <div className="no-tags">
          <p>No tags available for mapping</p>
        </div>
      </div>
    );
  }
  
  // Filter tags based on selected filter and search term
  const filteredTags = tags.filter(tag => {
    // First apply the mapping filter
    if (filter !== 'all') {
      const isMapped = mappedTags.includes(tag.id);
      if (filter === 'mapped' && !isMapped) return false;
      if (filter === 'unmapped' && isMapped) return false;
    }
    
    // Then apply the search filter if there's a search term
    if (searchTerm.trim() !== '') {
      return tag.text.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return true;
  });

  // Count mapped and unmapped tags
  const mappedCount = mappedTags.length;
  const unmappedCount = tags.length - mappedCount;

  return (
    <div className="tag-selection-panel">
      <div className="panel-header">
        <h2>Tags</h2>
        
        <div className="search-container">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tags..."
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search" 
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="filter-controls">
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'active' : ''}
          >
            All ({tags.length})
          </button>
          <button
            onClick={() => setFilter('unmapped')}
            className={filter === 'unmapped' ? 'active' : ''}
          >
            Unmapped ({unmappedCount})
          </button>
          <button
            onClick={() => setFilter('mapped')}
            className={filter === 'mapped' ? 'active' : ''}
          >
            Mapped ({mappedCount})
          </button>
        </div>
      </div>
      
      {filteredTags.length === 0 ? (
        <div className="no-tags">
          <p>No tags match the current filter</p>
        </div>
      ) : (
        <div className="tag-list">
          {filteredTags.map(tag => {
            const isMapped = mappedTags.includes(tag.id);
            const isSelected = selectedTag === tag.id;
            
            const tagColor = getTagColor(tag.id);
            
            return (
              <div
                key={tag.id}
                className={`tag-item ${isMapped ? 'mapped' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectTag(tag.id)}
                style={{ borderLeft: `4px solid ${tagColor}` }}
              >
                <div className="color-indicator" style={{ backgroundColor: tagColor }}></div>
                <div className="tag-text">{tag.text}</div>
                <div className="tag-status">
                  {isMapped ? (
                    <span className="mapped-indicator">✓ Mapped</span>
                  ) : (
                    <span className="unmapped-indicator">Click to map</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="helper-text">
        {selectedTag ? (
          <p>Click on the grid to position the selected tag</p>
        ) : (
          <p>Select a tag to position it on the grid</p>
        )}
      </div>

      <style jsx>{`
        .tag-selection-panel {
          width: 300px;
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          height: 600px;
        }
        
        .panel-header {
          margin-bottom: 1rem;
        }
        
        .panel-header h2 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 1.2rem;
          color: #202124;
        }
        
        .search-container {
          position: relative;
          margin-bottom: 1rem;
        }
        
        .search-input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #dadce0;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .clear-search {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          color: #5f6368;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .filter-controls {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .filter-controls button {
          background-color: white;
          border: 1px solid #dadce0;
          border-radius: 4px;
          padding: 0.4rem 0.25rem;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .filter-controls button.active {
          background-color: #e8f0fe;
          color: #1a73e8;
          border-color: #1a73e8;
          font-weight: 500;
        }
        
        .tag-list {
          flex-grow: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-right: 0.25rem;
        }

        /* Custom scrollbar */
        .tag-list::-webkit-scrollbar {
          width: 6px;
        }

        .tag-list::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .tag-list::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 4px;
        }

        .tag-list::-webkit-scrollbar-thumb:hover {
          background: #aaa;
        }
        
        .tag-item {
          background-color: white;
          border-radius: 6px;
          padding: 0.75rem 1rem;
          cursor: pointer;
          border: 1px solid #dadce0;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        
        .tag-item:hover {
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        
        .color-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
        }
        
        .tag-item.selected {
          border-color: #1a73e8;
          box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
          background-color: #e8f0fe;
        }
        
        .tag-text {
          font-size: 0.95rem;
          margin-bottom: 0.5rem;
          color: #202124;
          word-break: break-word;
        }
        
        .tag-status {
          font-size: 0.8rem;
        }
        
        .mapped-indicator {
          color: #34a853;
          font-weight: 500;
        }
        
        .unmapped-indicator {
          color: #5f6368;
        }
        
        .no-tags {
          flex-grow: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #5f6368;
          text-align: center;
          padding: 1rem;
          background-color: rgba(255, 255, 255, 0.5);
          border-radius: 6px;
        }
        
        .helper-text {
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid #dadce0;
          font-size: 0.85rem;
          color: #5f6368;
          text-align: center;
        }
        
        .helper-text p {
          margin: 0;
        }
        
        @media (max-width: 992px) {
          .tag-selection-panel {
            width: 100%;
            height: auto;
            max-height: 300px;
            margin-bottom: 1.5rem;
          }
          
          .helper-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}