"use client";

import { memo } from 'react';
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
  tags: Tag[];
  onSelectTag: (tagId: string) => void;
  participantName?: string;
}

// Using memo to prevent unnecessary re-renders
const ResultsVisualizationGrid = memo(function ResultsVisualizationGrid({
  settings,
  viewMode,
  positions,
  selectedTag,
  tags,
  onSelectTag,
  participantName
}: ResultsVisualizationGridProps) {
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
                  className="positioned-tag"
                  style={{
                    left: `${position.x * 100}%`,
                    top: `${(1 - position.y) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    border: `2px solid ${tagColor}`,
                    backgroundColor: `${tagColor}40`, // 40 = 25% opacity
                    width: `${size}rem`,
                    height: `${size}rem`,
                    minWidth: `${size}rem`,
                    minHeight: `${size}rem`
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
        
        .positioned-tag:hover {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
          z-index: 20;
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