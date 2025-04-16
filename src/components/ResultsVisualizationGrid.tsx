"use client";

import { memo } from 'react';
import HeatmapCanvas from './HeatmapCanvas';

interface Position {
  tagId: string;
  x: number;
  y: number;
  annotation?: string;
  text?: string;
  count?: number;
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
  viewMode: 'aggregate' | 'individual' | 'heatmap';
  positions: Record<string, Position>;
  selectedTag: string | null;
  heatmapData: any[];
  tags: Tag[];
  onSelectTag: (tagId: string) => void;
}

// Using memo to prevent unnecessary re-renders
const ResultsVisualizationGrid = memo(function ResultsVisualizationGrid({
  settings,
  viewMode,
  positions,
  selectedTag,
  heatmapData,
  tags,
  onSelectTag
}: ResultsVisualizationGridProps) {
  return (
    <div className="grid-container">
      <div className="direction-label top">{settings.yAxisTopLabel}</div>
      
      <div className="grid-row">
        <div className="direction-label left">{settings.xAxisLeftLabel}</div>
        
        {viewMode === 'heatmap' ? (
          <div className="mapping-grid">
            <HeatmapCanvas 
              data={heatmapData}
              axisLabels={{
                xAxisLeftLabel: settings.xAxisLeftLabel,
                xAxisRightLabel: settings.xAxisRightLabel,
                yAxisTopLabel: settings.yAxisTopLabel,
                yAxisBottomLabel: settings.yAxisBottomLabel
              }}
              width={600}
              height={600}
            />
          </div>
        ) : (
          <div className="mapping-grid">
            {/* Red Center Axes */}
            <div className="center-axis horizontal"></div>
            <div className="center-axis vertical"></div>
            
            {/* Positioned Tags */}
            {Object.entries(positions).map(([tagId, position]) => {
              // Skip if a tag is selected and this isn't it
              if (selectedTag && tagId !== selectedTag) return null;
              
              return (
                <div
                  key={tagId}
                  className="positioned-tag"
                  style={{
                    left: `${position.x * 100}%`,
                    top: `${(1 - position.y) * 100}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => onSelectTag(tagId)}
                >
                  <div className="tag-content">
                    {position.text}
                    {position.count && position.count > 1 && (
                      <div className="tag-count">{position.count}</div>
                    )}
                    {position.annotation && (
                      <div className="tag-annotation-indicator" title={position.annotation}>i</div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {selectedTag && (
              <div className="selected-tag-indicator">
                Selected: {tags.find(t => t.id === selectedTag)?.text || selectedTag}
              </div>
            )}
          </div>
        )}
        
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
          padding: 0.5rem;
          min-width: 2.5rem;
          min-height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .positioned-tag:hover {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
          z-index: 20;
        }
        
        .tag-content {
          word-break: break-word;
          position: relative;
          font-size: 0.85rem;
          text-align: center;
          max-width: 80px;
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