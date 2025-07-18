"use client";

import { memo, useState } from 'react';
import { getTagColor } from '@/utils/tagColorUtils';
import { calculateTagSize } from '@/utils/mappingDataUtils';

interface Position {
  tagId: string;
  instanceId?: string;
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
    xAxisMinLabel: string;
    xAxisMaxLabel: string;
    yAxisMinLabel: string;
    yAxisMaxLabel: string;
  };
  viewMode: 'aggregate' | 'individual';
  positions: Record<string, Position>;
  selectedTag: string | null;
  hoveredComment?: { tagId: string | null, userId: string | null };
  tags: Tag[];
  mappings: Mapping[];
  onSelectTag: (tagId: string) => void;
  onHoverTag?: (tagId: string | null) => void;
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
  onHoverTag,
  participantName
}: ResultsVisualizationGridProps) {
  // State to track which individual mapping is being hovered
  const [hoveredMapping, setHoveredMapping] = useState<string | null>(null);
  
  // Function to get individual positions for a selected tag instance
  const getIndividualPositions = (selectedKey: string) => {
    const tagId = selectedKey; // Now selectedKey is just the tagId
    
    const allPositions: any[] = [];
    
    mappings.forEach(mapping => {
      mapping.positions.forEach(pos => {
        if (pos.tagId === tagId) {
          allPositions.push({
            userId: mapping.userId,
            userName: mapping.userName,
            x: pos.x,
            y: pos.y,
            annotation: pos.annotation
          });
        }
      });
    });
    
    return allPositions;
  };
  
  // Get individual positions if a tag is selected
  // In individual view, we shouldn't show individual positions from all users
  const individualPositions = selectedTag && viewMode === 'aggregate' ? getIndividualPositions(selectedTag) : [];

  return (
    <div className="grid-container">
      <div className="direction-label top">{settings.yAxisMaxLabel}</div>
      
      <div className="grid-row">
        <div className="direction-label left">{settings.xAxisMinLabel}</div>
        
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
            // Use the same tagId as the main positioned tag for consistent coloring
            const positionData = positions[selectedTag];
            const tagColor = getTagColor(positionData?.tagId || selectedTag.split('_')[0]);
            const positionKey = `${pos.userId}-${pos.x}-${pos.y}`; // Unique key for this specific position
            const isHovered = hoveredMapping === positionKey;
            
            return (
              <div
                key={`individual-${index}`}
                className={`individual-tag-position ${isHovered ? 'hovered' : ''} ${
                  hoveredComment?.tagId === selectedTag && hoveredComment?.userId === pos.userId && 
                  hoveredComment?.x === pos.x && hoveredComment?.y === pos.y ? 'hovered-comment' : ''
                }`}
                style={{
                  left: `${pos.x * 100}%`,
                  top: `${(1 - pos.y) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: hoveredComment?.tagId === selectedTag && hoveredComment?.userId === pos.userId && 
                    hoveredComment?.x === pos.x && hoveredComment?.y === pos.y
                    ? `${tagColor}70` // Brighter when it's the hovered comment
                    : `${tagColor}30`, // Normal lighter background
                  border: `2px solid ${tagColor}`,
                  zIndex: hoveredComment?.tagId === selectedTag && hoveredComment?.userId === pos.userId && 
                    hoveredComment?.x === pos.x && hoveredComment?.y === pos.y ? 25 : (isHovered ? 15 : 10)
                }}
                onMouseEnter={() => {
                  setHoveredMapping(positionKey);
                  // Also set hovered comment to highlight corresponding comment
                  onHoverTag?.(`${selectedTag}-${pos.userId}-${pos.x}-${pos.y}`);
                }}
                onMouseLeave={() => {
                  setHoveredMapping(null);
                  onHoverTag?.(null);
                }}
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
          {Object.entries(positions).map(([key, position]) => {
            // Skip if a tag is selected and this isn't it
            if (selectedTag && key !== selectedTag) return null;
            
            const tagColor = getTagColor(position.tagId);
            
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
                key={key}
                className={`positioned-tag ${selectedTag === key ? 'selected' : ''} ${
                  hoveredMapping === key ? 'hovered' : ''
                } ${
                  viewMode === 'individual' && hoveredComment?.tagId === position.tagId && 
                  hoveredComment?.x === position.x && hoveredComment?.y === position.y ? 'hovered-comment' : ''
                }`}
                style={{
                  left: `${position.x * 100}%`,
                  top: `${(1 - position.y) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  border: selectedTag === key ? `2px dashed ${tagColor}` : `2px solid ${tagColor}`,
                  backgroundColor: viewMode === 'individual' && hoveredComment?.tagId === position.tagId && 
                    hoveredComment?.x === position.x && hoveredComment?.y === position.y
                    ? `${tagColor}70` // Brighter background when hovered in individual view
                    : `${tagColor}40`, // Normal background
                  width: `${size}rem`,
                  height: `${size}rem`,
                  minWidth: `${size}rem`,
                  minHeight: `${size}rem`,
                  zIndex: viewMode === 'individual' && hoveredComment?.tagId === position.tagId && 
                    hoveredComment?.x === position.x && hoveredComment?.y === position.y ? 25 : (selectedTag === key ? 20 : 5)
                }}
                onClick={() => onSelectTag(key)}
                onMouseEnter={() => {
                  setHoveredMapping(key);
                  // For individual view, pass position info to highlight corresponding comment
                  if (viewMode === 'individual') {
                    onHoverTag?.(`${position.tagId}-${position.x}-${position.y}`);
                  } else {
                    onHoverTag?.(key);
                  }
                }}
                onMouseLeave={() => {
                  setHoveredMapping(null);
                  onHoverTag?.(null);
                }}
                title={position.text} // Show full text on hover
              >
                <div 
                  className="tag-content"
                  style={{ fontSize: `${fontSize}rem` }}
                >
                </div>
                {position.count && position.count > 1 && (
                  <div className="tag-count" style={{ backgroundColor: tagColor }}>{position.count}</div>
                )}
                {position.annotation && (
                  <div className="tag-annotation-indicator" title={position.annotation}>i</div>
                )}
                {selectedTag === key && (
                  <div className="aggregate-marker">Average</div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="direction-label right">{settings.xAxisMaxLabel}</div>
      </div>
      
      <div className="direction-label bottom">{settings.yAxisMinLabel}</div>

      <style jsx>{`
        .grid-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          background-color: white;
          border: 1px solid #dadce0;
          border-radius: 4px;
          padding: 0.5rem 1rem;
        }
        
        .grid-row {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 680px;
          gap: 0.125rem;
          flex: 0 0 auto;
        }
        
        .mapping-grid {
          position: relative;
          flex: 1;
          width: 100%;
          aspect-ratio: 1;
          max-width: 600px;
          max-height: 600px;
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
        
        .center-axis.horizontal::before,
        .center-axis.horizontal::after {
          content: '';
          position: absolute;
          top: -4px;
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-bottom: 8px solid #000000;
        }
        
        .center-axis.horizontal::before {
          left: -2px;
          transform: rotate(-90deg);
        }
        
        .center-axis.horizontal::after {
          right: -2px;
          transform: rotate(90deg);
        }
        
        .center-axis.vertical {
          height: 100%;
          width: 1px;
          left: 50%;
          transform: translateX(-50%);
        }
        
        .center-axis.vertical::before,
        .center-axis.vertical::after {
          content: '';
          position: absolute;
          left: -4px;
          width: 0;
          height: 0;
          border-top: 5px solid transparent;
          border-bottom: 5px solid transparent;
          border-right: 8px solid #000000;
        }
        
        .center-axis.vertical::before {
          top: -2px;
          transform: rotate(90deg);
        }
        
        .center-axis.vertical::after {
          bottom: -2px;
          transform: rotate(-90deg);
        }
        
        .direction-label {
          color: #202124;
          font-size: 0.9rem;
          font-weight: 500;
          text-align: center;
          padding: 0.5rem;
        }
        
        .direction-label.top {
          width: 100%;
          max-width: 680px;
        }
        
        .direction-label.bottom {
          width: 100%;
          max-width: 680px;
        }
        
        .direction-label.left {
          writing-mode: vertical-lr;
          text-orientation: mixed;
          padding-right: 0.125rem;
          width: 20px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(180deg);
        }
        
        .direction-label.right {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          padding-left: 0.125rem;
          width: 20px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
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
        
        .positioned-tag:hover,
        .positioned-tag.hovered {
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
        
        @media (max-width: 768px) {
          .direction-label.left, 
          .direction-label.right {
            font-size: 0.8rem;
            width: 18px;
          }
          
          .direction-label.left {
            padding-right: 0.1rem;
          }
          
          .direction-label.right {
            padding-left: 0.1rem;
          }
        }
      `}</style>
    </div>
  );
});

export default ResultsVisualizationGrid;