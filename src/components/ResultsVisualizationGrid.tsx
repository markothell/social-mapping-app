"use client";

import { memo, useState } from 'react';
import { getTagColor, calculateTagSize } from '@/utils/mappingDataUtils';

interface Position {
  tagId: string;
  x: number;
  y: number;
  annotation?: string;
  text?: string;
  count?: number;
  consensus?: number;
}

interface Mapping {
  userId: string;
  userName: string;
  positions: Position[];
  isComplete: boolean;
}

interface Tag {
  id: string;
  text: string;
}

interface ResultsVisualizationGridProps {
  settings: {
    xAxisLabel: string;
    xAxisLeftLabel: string;
    xAxisRightLabel: string;
    yAxisLabel: string;
    yAxisTopLabel: string;
    yAxisBottomLabel: string;
  };
  viewMode: 'aggregate' | 'individual';
  positions: Record<string, Position>;
  selectedTag: string | null;
  hoveredComment?: { tagId: string | null, userId: string | null };
  tags: Tag[];
  mappings: Mapping[];
  onSelectTag: (tagId: string) => void;
  participantName?: string;
}

// Using memo to prevent unnecessary re-renders
const ResultsVisualizationGrid = memo(function ResultsVisualizationGrid({
  settings,
  viewMode,
  positions,
  selectedTag,
  hoveredComment,
  tags,
  mappings,
  onSelectTag,
  participantName
}: ResultsVisualizationGridProps) {
  // State to track which individual mapping is being hovered
  const [hoveredMapping, setHoveredMapping] = useState<string | null>(null);
  
  // Function to get individual positions for a selected tag
  const getIndividualPositions = (tagId: string) => {
    return mappings
      .filter(mapping => mapping.positions.some(pos => pos.tagId === tagId))
      .map(mapping => {
        const position = mapping.positions.find(pos => pos.tagId === tagId);
        if (!position) return null;
        
        return {
          userId: mapping.userId,
          userName: mapping.userName,
          x: position.x,
          y: position.y,
          annotation: position.annotation
        };
      })
      .filter(Boolean); // Remove any nulls
  };
  
  // Get individual positions if a tag is selected
  // In individual view, we shouldn't show individual positions from all users
  const individualPositions = selectedTag && viewMode === 'aggregate' ? getIndividualPositions(selectedTag) : [];

  return (
    <div className="grid-container">
      <div className="direction-label top">{settings.yAxisTopLabel}</div>
      
      <div className="grid-row">
        <div className="direction-label left">{settings.xAxisLeftLabel}</div>
        
        <div className="mapping-grid">
          {/* Red Center Axes */}
          <div className="center-axis horizontal black"></div>
          <div className="center-axis vertical black"></div>
          
          {/* Display participant name in individual view */}
          {viewMode === 'individual' && participantName && (
            <div className="participant-name-label">
              Individual Map for: {participantName}
            </div>
          )}
          
          {/* Connection lines between individual positions and aggregate - removed */}
          
          {/* Individual Tag Positions - only shown in aggregate view when a tag is selected */}
          {selectedTag && viewMode === 'aggregate' && individualPositions.map((pos, index) => {
            const tagColor = getTagColor(selectedTag);
            const isHovered = hoveredMapping === pos.userId;
            
            return (
              <div
                key={`individual-${index}`}
                className={`individual-tag-position ${isHovered ? 'hovered' : ''} ${
                  hoveredComment?.tagId === selectedTag && hoveredComment?.userId === pos.userId ? 'hovered-comment' : ''
                }`}
                style={{
                  left: `${pos.x * 100}%`,
                  top: `${(1 - pos.y) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: hoveredComment?.tagId === selectedTag && hoveredComment?.userId === pos.userId 
                    ? `${tagColor}70` // Brighter when it's the hovered comment
                    : `${tagColor}30`, // Normal lighter background
                  border: `2px solid ${tagColor}`,
                  zIndex: hoveredComment?.tagId === selectedTag && hoveredComment?.userId === pos.userId ? 25 : (isHovered ? 15 : 10)
                }}
                onMouseEnter={() => setHoveredMapping(pos.userId)}
                onMouseLeave={() => setHoveredMapping(null)}
                title={`${pos.userName}'s mapping${pos.annotation ? `: ${pos.annotation}` : ''}`}
              >
                {/* Show username on hover */}
                {isHovered && (
                  <div className="user-label">
                    {pos.userName}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Positioned Tags */}
          {Object.entries(positions).map(([tagId, position]) => {
            // Skip if a tag is selected and this isn't it
            if (selectedTag && tagId !== selectedTag) return null;
            
            const tagColor = getTagColor(tagId);
            
            // Calculate size based on consensus and count
            const count = position.count || 1;
            const consensus = position.consensus !== undefined ? position.consensus : 1;
            const { size, fontSize, maxChars } = calculateTagSize(consensus, count);
            
            // Truncate text if needed
            const displayText = position.text || '';
            const truncatedText = displayText.length > maxChars
              ? displayText.substring(0, maxChars - 1) + '…'
              : displayText;
            
            return (
              <div
                key={tagId}
                className={`positioned-tag ${selectedTag === tagId ? 'selected' : ''} ${
                  viewMode === 'individual' && hoveredComment?.tagId === tagId ? 'hovered-comment' : ''
                }`}
                style={{
                  left: `${position.x * 100}%`,
                  top: `${(1 - position.y) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  border: selectedTag === tagId ? `2px dashed ${tagColor}` : `2px solid ${tagColor}`,
                  backgroundColor: viewMode === 'individual' && hoveredComment?.tagId === tagId 
                    ? `${tagColor}70` // Brighter background when hovered in individual view
                    : `${tagColor}40`, // Normal background
                  width: `${size}rem`,
                  height: `${size}rem`,
                  minWidth: `${size}rem`,
                  minHeight: `${size}rem`,
                  zIndex: viewMode === 'individual' && hoveredComment?.tagId === tagId ? 25 : (selectedTag === tagId ? 20 : 5)
                }}
                onClick={() => onSelectTag(tagId)}
                title={position.text} // Show full text on hover
              >
                <div 
                  className="tag-content"
                  style={{ fontSize: `${fontSize}rem` }}
                >
                  {position.count && position.count > 1 && (
                    <div className="tag-count" style={{ backgroundColor: tagColor }}>{position.count}</div>
                  )}
                  {position.annotation && (
                    <div className="tag-annotation-indicator" title={position.annotation}>i</div>
                  )}
                  {selectedTag === tagId && (
                    <div className="aggregate-marker">Average</div>
                  )}
                </div>
              </div>
            );
          })}
            
          {selectedTag && (
            <div 
              className="selected-tag-indicator"
              style={{ 
                borderColor: getTagColor(selectedTag),
                backgroundColor: `${getTagColor(selectedTag)}20` // 20 = 12.5% opacity
              }}
            >
              Selected: {tags.find(t => t.id === selectedTag)?.text || selectedTag}
            </div>
          )}
        </div>
        
        <div className="direction-label right">{settings.xAxisRightLabel}</div>
      </div>
      
      <div className="direction-label bottom">{settings.yAxisBottomLabel}</div>

      <style jsx>{`
        .grid-container {
          flex: 0 0 600px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .grid-row {
          display: flex;
          align-items: center;
          width: 100%;
        }
        
        .mapping-grid {
          position: relative;
          width: 600px;
          height: 600px;
          background-color: white;
          border: 1px solid #dadce0;
          overflow: visible;
          z-index: 1;
        }
        
        .center-axis {
          position: absolute;
          background-color: #ff6347; /* Red color for the axes */
          z-index: 1;
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
        
        .direction-label {
          color: #202124;
          font-size: 0.9rem;
          font-weight: 500;
          text-align: center;
          padding: 0.5rem;
        }
        
        .direction-label.top, .direction-label.bottom {
          width: 600px;
        }
        
        .positioned-tag {
          position: absolute;
          transform: translate(-50%, -50%);
          background-color: rgba(232, 240, 254, 0.9);
          border: 2px solid #1a73e8;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          overflow: hidden;
          padding: 0;
          box-sizing: border-box;
        }
        
        .positioned-tag.selected {
          border-style: dashed;
          box-shadow: 0 0 0 4px rgba(26, 115, 232, 0.1);
        }
        
        .positioned-tag:hover {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
          z-index: 20;
        }
        
        .positioned-tag.hovered-comment {
          transform: translate(-50%, -50%) scale(1.15);
          box-shadow: 0 0 12px rgba(0, 0, 0, 0.25);
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.5);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(26, 115, 232, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(26, 115, 232, 0);
          }
        }
        
        .individual-tag-position {
          position: absolute;
          transform: translate(-50%, -50%);
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .individual-tag-position.hovered {
          transform: translate(-50%, -50%) scale(1.3);
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
        }
        
        .individual-tag-position.hovered-comment {
          transform: translate(-50%, -50%) scale(1.5);
          box-shadow: 0 0 15px rgba(26, 115, 232, 0.5);
          animation: pulse 1.5s infinite;
        }
        
        .user-label {
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #333;
          color: white;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          white-space: nowrap;
          pointer-events: none;
        }
        
        .user-label:after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 4px;
          border-style: solid;
          border-color: #333 transparent transparent transparent;
        }
        
        .tag-content {
          word-break: break-word;
          word-wrap: break-word;
          position: relative;
          text-align: center;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          box-sizing: border-box;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .tag-count {
          position: absolute;
          top: -8px;
          right: -8px;
          background-color: #1a73e8;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
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
          z-index: 11;
        }
        
        .aggregate-marker {
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #4285f4;
          color: white;
          font-size: 0.6rem;
          padding: 2px 6px;
          border-radius: 10px;
          white-space: nowrap;
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
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .participant-name-label {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: rgba(255, 255, 255, 0.9);
          border: 1px solid #dadce0;
          border-radius: 4px;
          padding: 0.4rem 0.6rem;
          font-size: 0.9rem;
          color: #1a73e8;
          font-weight: 500;
          z-index: 10;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        @media (max-width: 992px) {
          .grid-container {
            flex: 0 0 auto;
            width: 100%;
          }
          
          .mapping-grid, .direction-label.top, .direction-label.bottom {
            width: 100%;
            max-width: 600px;
          }
          
          .mapping-grid {
            height: 0;
            padding-bottom: 100%; /* Make it square */
          }
          
          .direction-label.left, .direction-label.right {
            padding: 0 0.25rem;
          }
        }
      `}</style>
    </div>
  );
});

export default ResultsVisualizationGrid;