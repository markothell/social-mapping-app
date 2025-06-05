"use client";

import { useRef } from 'react';
import { getTagColor } from '@/utils/tagColorUtils';

interface MappingSettings {
  xAxisLabel: string;
  xAxisLeftLabel?: string;
  xAxisRightLabel?: string;
  xAxisMinLabel?: string;
  xAxisMaxLabel?: string;
  yAxisLabel: string;
  yAxisTopLabel?: string;
  yAxisBottomLabel?: string;
  yAxisMinLabel?: string;
  yAxisMaxLabel?: string;
  gridSize: number;
  enableAnnotations: boolean;
  maxAnnotationLength: number;
  contextInstructions?: string;
}

interface Tag {
  id: string;
  text: string;
}

interface Position {
  tagId: string;
  x: number;
  y: number;
  annotation?: string;
  text?: string;
}

interface MappingGridProps {
  settings: MappingSettings;
  selectedTag: Tag | null;
  selectedInstanceId?: string | null;
  userMappings: Record<string, Position>;
  approvedTagIds: string[];
  onPositionTag: (tagId: string, x: number, y: number, annotation?: string) => void;
}

export default function MappingGrid({
  settings,
  selectedTag,
  selectedInstanceId,
  userMappings,
  approvedTagIds,
  onPositionTag
}: MappingGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Handle grid click
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedTag || !gridRef.current) return;
    
    const rect = gridRef.current.getBoundingClientRect();
    
    // Calculate relative position (0-1)
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;
    
    // Clamp between 0 and 1
    const clampedX = Math.max(0, Math.min(1, relativeX));
    const clampedY = Math.max(0, Math.min(1, 1 - relativeY)); // Invert Y so 0 is bottom and 1 is top
    
    // Always position tag directly - context will be added in the persistent context box
    onPositionTag(selectedTag.id, clampedX, clampedY);
  };
  
  
  // Render positioned tags
  const renderPositionedTags = () => {
    return Object.entries(userMappings).map(([tagId, position]) => {
      // Use the text stored with the position
      const displayText = position.text || tagId;
      
      return (
        <div
          key={tagId}
          className="positioned-tag"
          style={{
            left: `${position.x * 100}%`,
            top: `${(1 - position.y) * 100}%`,
            transform: 'translate(-50%, -50%)' // Center the tag on the exact point
          }}
        >
          <div className="tag-content">
            {displayText}
            {position.annotation && (
              <div className="tag-annotation-indicator" title={position.annotation}>i</div>
            )}
          </div>
        </div>
      );
    });
  };
  
  return (
    <>
      <div className="mapping-grid-container">
        {/* Top label */}
        <div className="direction-label top">{settings.yAxisMaxLabel || settings.yAxisTopLabel}</div>
        
        <div className="grid-row">
          {/* Left label */}
          <div className="direction-label left">{settings.xAxisMinLabel || settings.xAxisLeftLabel}</div>
          
          {/* Main grid */}
          <div 
            className={`mapping-grid ${selectedTag ? 'selectable' : ''}`}
            ref={gridRef}
            onClick={handleGridClick}
          >
            {/* Red Center Axes */}
            <div className="center-axis horizontal black"></div>
            <div className="center-axis vertical black"></div>
            
            {/* Position Tags - Only show approved tags and non-placeholder instances */}
            {Object.entries(userMappings)
              .filter(([, position]) => approvedTagIds.includes(position.tagId) && !position.isPlaceholder)
              .map(([positionKey, position]) => {
                const displayText = position.text || position.tagId;
                
                // Get tag color
                const tagColor = getTagColor(position.tagId);
                
                // Check if this positioned tag is selected
                const isSelected = selectedInstanceId 
                  ? position.instanceId === selectedInstanceId
                  : selectedTag?.id === position.tagId;
                
                // Default size and text display
                const size = 2.5; // Default size in rem
                const fontSize = 0.85;
                const maxChars = 10;
                
                // Truncate text if needed
                const truncatedText = displayText.length > maxChars
                  ? displayText.substring(0, maxChars - 1) + '…'
                  : displayText;
                
                return (
                  <div
                    key={positionKey}
                    className={`positioned-tag ${isSelected ? 'selected' : ''}`}
                    style={{
                      left: `${position.x * 100}%`,
                      top: `${(1 - position.y) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      border: `2px solid ${tagColor}`,
                      backgroundColor: `${tagColor}40` // 40 = 25% opacity
                    }}
                    title={displayText} // Show full text on hover
                  >
                    <div 
                      className="tag-content"
                      style={{ fontSize: `${fontSize}rem` }}
                    >
                      {position.annotation && (
                        <div className="tag-annotation-indicator" title={position.annotation}>i</div>
                      )}
                    </div>
                  </div>
                );
              })}
            
            {selectedTag && (
              <div 
                className="selected-tag-indicator"
                style={{ 
                  borderColor: getTagColor(selectedTag.id),
                  backgroundColor: `${getTagColor(selectedTag.id)}20` // 20 = 12.5% opacity
                }}
              >
                Click to position: {selectedTag.text}
              </div>
            )}
          </div>
          
          {/* Right label */}
          <div className="direction-label right">{settings.xAxisMaxLabel || settings.xAxisRightLabel}</div>
        </div>
        
        {/* Bottom label */}
        <div className="direction-label bottom">{settings.yAxisMinLabel || settings.yAxisBottomLabel}</div>
      </div>
      

      <style jsx>{`
        .mapping-grid-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }
        
        .grid-row {
          display: flex;
          align-items: center;
          width: 100%;
          gap: 0.5rem;
        }
        
        .mapping-grid {
          position: relative;
          flex: 1;
          height: 600px;
          background-color: white;
          border: 1px solid #dadce0;
          cursor: default;
        }
        
        .mapping-grid.selectable {
          cursor: crosshair;
        }
        
        /* Center axes */
        .center-axis {
          position: absolute;
          background-color: #ff6347; /* Red color for the axes */
          z-index: 5;
        }
        
        .center-axis.black {
          background-color: #000000;
        }
        
        .center-axis.horizontal {
          width: 100%;
          height: 1px;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .center-axis.vertical {
          height: 100%;
          width: 1px;
          left: 50%;
          transform: translateX(-50%);
        }
        
        /* Direction labels */
        .direction-label {
          color: #202124;
          font-size: 0.9rem;
          font-weight: 500;
          text-align: center;
          padding: 0.5rem;
        }
        
        .direction-label.top {
          margin-bottom: 0.5rem;
        }
        
        .direction-label.bottom {
          margin-top: 0.5rem;
        }
        
        .direction-label.left {
          writing-mode: vertical-lr;
          text-orientation: mixed;
          padding-right: 0.5rem;
          width: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(180deg);
        }
        
        .direction-label.right {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          padding-left: 0.5rem;
          width: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .positioned-tag {
          position: absolute;
          transform: translate(-50%, -50%);
          background-color: rgba(232, 240, 254, 0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100; /* Increased z-index to ensure tags appear above other elements */
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          pointer-events: auto; /* Ensure tags can be clicked */
          overflow: hidden;
          padding: 0;
          box-sizing: border-box;
          width: 2.5rem;
          height: 2.5rem;
          transition: all 0.2s ease;
        }
        
        .positioned-tag.selected {
          z-index: 101;
          box-shadow: 0 0 0 3px #1a73e8, 0 4px 8px rgba(0, 0, 0, 0.2);
          transform: translate(-50%, -50%) scale(1.1);
        }
        
        /* Ensure the mapping grid has position relative for absolute positioning context */
        .mapping-grid {
          position: relative !important; /* Force position relative */
          flex: 1;
          height: 600px;
          background-color: white;
          border: 1px solid #dadce0;
          cursor: default;
          z-index: 1;
          isolation: isolate; /* Create a new stacking context */
          overflow: visible;
        }
        
        .tag-content {
          word-break: break-word;
          word-wrap: break-word;
          position: relative;
          font-size: 0.85rem;
          text-align: center;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          box-sizing: border-box;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .tag-annotation-indicator {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 16px;
          height: 16px;
          background-color: #fbbc04;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-style: italic;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        .selected-tag-indicator {
          position: absolute;
          top: 10px;
          left: 10px;
          background-color: #e8f0fe;
          border: 2px solid #1a73e8;
          border-radius: 4px;
          padding: 0.4rem 0.6rem;
          font-size: 0.9rem;
          z-index: 100;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .annotation-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .annotation-modal {
          background-color: white;
          border-radius: 8px;
          padding: 1.5rem;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .annotation-modal h3 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          color: #202124;
        }
        
        .annotation-modal p {
          margin-bottom: 1rem;
          color: #5f6368;
        }
        
        .annotation-modal textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #dadce0;
          border-radius: 4px;
          font-size: 1rem;
          resize: vertical;
        }
        
        .character-counter {
          text-align: right;
          font-size: 0.8rem;
          color: #5f6368;
          margin-top: 0.25rem;
          margin-bottom: 1rem;
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        
        .cancel-button {
          background-color: #f1f3f4;
          color: #202124;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.25rem;
          font-size: 0.9rem;
          cursor: pointer;
        }
        
        .save-button {
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.25rem;
          font-size: 0.9rem;
          cursor: pointer;
        }
        
        @media (max-width: 768px) {
          .grid-row {
            flex-direction: column;
          }
          
          .direction-label.left, 
          .direction-label.right {
            padding: 0.5rem 0;
          }
          
          .mapping-grid {
            height: 400px;
          }
        }
      `}</style>
    </>
  );
}