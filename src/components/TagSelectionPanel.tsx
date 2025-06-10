//src/components/TagSelectionPanel.tsx.txt
"use client";

import { useState } from 'react';
import { getTagColor } from '@/utils/tagColorUtils';

interface Tag {
  id: string;
  text: string;
  status: string;
}

interface TagInstance {
  id: string;
  tagId: string;
  instanceId?: string;
  text: string;
  status: string;
  annotation?: string;
}

interface TagSelectionPanelProps {
  tags: Tag[];
  tagInstances: TagInstance[];
  selectedTag: string | null;
  selectedInstanceId?: string | null;
  onSelectTag: (tagId: string | null, instanceId?: string | null) => void;
  onAddTagInstance?: (tagId: string) => void;
  onRemoveTagInstance?: (tagId: string, instanceId?: string) => void;
  onNavigateToMap?: () => void;
  filter?: 'all' | 'unmapped' | 'mapped';
  disabled?: boolean;
}

export default function TagSelectionPanel({
  tags,
  tagInstances,
  selectedTag,
  selectedInstanceId,
  onSelectTag,
  onAddTagInstance,
  onRemoveTagInstance,
  onNavigateToMap,
  filter = 'all',
  disabled = false
}: TagSelectionPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
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
  
  // Create a combined list: unmapped tags + mapped instances
  const allDisplayItems = [];
  
  // Add unmapped approved tags only
  const mappedTagIds = new Set(tagInstances.map(instance => instance.tagId));
  const unmappedTags = tags.filter(tag => !mappedTagIds.has(tag.id) && tag.status === 'approved');
  unmappedTags.forEach(tag => {
    allDisplayItems.push({
      id: tag.id,
      tagId: tag.id,
      text: tag.text,
      status: tag.status,
      isMapped: false,
      isInstance: false
    });
  });
  
  // Add mapped instances
  tagInstances.forEach(instance => {
    allDisplayItems.push({
      id: instance.id,
      tagId: instance.tagId,
      instanceId: instance.instanceId,
      text: instance.text,
      status: instance.status,
      annotation: instance.annotation,
      isMapped: true,
      isInstance: true
    });
  });
  
  // Filter items based on selected filter and search term
  const filteredItems = allDisplayItems.filter(item => {
    // First apply the mapping filter
    if (filter !== 'all') {
      if (filter === 'mapped' && !item.isMapped) return false;
      if (filter === 'unmapped' && item.isMapped) return false;
    }
    
    // Then apply the search filter if there's a search term
    if (searchTerm.trim() !== '') {
      return item.text.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return true;
  });

  // Count mapped and unmapped tags
  const mappedCount = tagInstances.length;
  const unmappedCount = tags.length - mappedTagIds.size;

  return (
    <div className="tag-selection-panel">
      
      {filteredItems.length === 0 ? (
        <div className="no-tags">
          <p>No tags match the current filter</p>
        </div>
      ) : (
        <div className="tag-list">
          {filteredItems.map(item => {
            const isSelected = item.isMapped 
              ? selectedInstanceId === item.instanceId 
              : selectedTag === item.tagId;
            const tagColor = getTagColor(item.tagId);
            
            return (
              <div key={item.id} className={`tag-item-container ${item.isMapped ? 'mapped' : ''}`}>
                <div
                  className={`tag-item ${item.isMapped ? 'mapped' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => disabled ? null : onSelectTag(
                    isSelected ? null : item.tagId, 
                    isSelected ? null : (item.isMapped ? item.instanceId : null)
                  )}
                  style={{ 
                    border: `2px solid ${tagColor}`
                  }}
                >
                  <div className="tag-content">
                    <div className="tag-text">{item.text}</div>
                  </div>
                </div>
                
                {/* Map link for selected tags */}
                {isSelected && onNavigateToMap && (
                  <button
                    className="map-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToMap();
                    }}
                    title="Go to map to position this tag"
                  >
                    Map →
                  </button>
                )}
                
                {item.isMapped && onAddTagInstance && onRemoveTagInstance && (
                  <div className="tag-menu">
                    <button
                      className="menu-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === item.id ? null : item.id);
                      }}
                      title="Tag options"
                    >
                      ⋮
                    </button>
                    {openMenuId === item.id && (
                      <div className="menu-dropdown">
                        <button
                          className="menu-item add-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!disabled) onAddTagInstance(item.tagId);
                            setOpenMenuId(null);
                          }}
                        >
                          Add another
                        </button>
                        <button
                          className="menu-item remove-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!disabled) onRemoveTagInstance(item.tagId, item.instanceId);
                            setOpenMenuId(null);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="helper-text">
        {selectedTag ? (
          <p>Click <strong>Map</strong> to position the selected tag, or click the tag again to deselect</p>
        ) : (
          <p>Select a tag to position it on the grid</p>
        )}
      </div>

      <style jsx>{`
        .tag-selection-panel {
          width: 100%;
          background-color: transparent;
          border-radius: 8px;
          padding: 0;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        
        
        .tag-list {
          flex-grow: 1;
          overflow-y: auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
          padding: 0.25rem;
        }
        
        @media (min-width: 768px) {
          .tag-list {
            grid-template-columns: 1fr 1fr;
            column-gap: 2rem;
            row-gap: 0;
          }
        }
        
        .tag-item-container {
          position: relative;
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.25rem;
          border-bottom: 1px solid #E8C4A0;
          margin: 0.125rem 0;
        }
        
        .tag-item-container:last-child {
          border-bottom: none;
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
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1rem;
          border-radius: 25px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
          max-width: fit-content;
          border: none;
        }
        
        .tag-item:not(.mapped) {
          background-color: #F7E9CB;
          color: #202124;
        }
        
        .tag-item.mapped {
          background-color: #D8CD9D;
          color: #202124;
        }
        
        .tag-menu {
          position: relative;
        }
        
        .map-link {
          background-color: #F9AB00;
          color: #202124;
          border: none;
          border-radius: 15px;
          padding: 0.25rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .map-link:hover {
          background-color: #f29900;
          transform: scale(1.05);
        }
        
        .menu-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          color: #5f6368;
          padding: 0.2rem;
          border-radius: 3px;
          transition: all 0.2s;
        }
        
        .menu-button:hover {
          background-color: #f1f3f4;
          color: #202124;
        }
        
        .menu-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background-color: white;
          border: 1px solid #dadce0;
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          min-width: 140px;
        }
        
        .menu-item {
          display: block;
          width: 100%;
          background: none;
          border: none;
          padding: 0.5rem 0.75rem;
          text-align: left;
          cursor: pointer;
          font-size: 0.85rem;
          color: #202124;
          transition: background-color 0.2s;
        }
        
        .menu-item:hover {
          background-color: #f8f9fa;
        }
        
        .add-item {
          color: #1a73e8;
        }
        
        .remove-item {
          color: #ea4335;
        }
        
        .tag-item.selected {
          box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.3);
          transform: scale(1.02);
        }
        
        .tag-content {
          display: flex;
          align-items: center;
          flex: 1;
        }
        
        .tag-text {
          font-size: 0.9rem;
          margin-bottom: 0;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        
        .tag-annotation {
          font-size: 0.8rem;
          color: #5f6368;
          font-style: italic;
          margin-left: 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
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
        
        @media (max-width: 768px) {
          .tag-selection-panel {
            padding: 1rem;
          }
          
          .helper-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}