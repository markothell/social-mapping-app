"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import ResultsVisualizationGrid from './ResultsVisualizationGrid';
import TagDetailsPanel from './TagDetailsPanel';
import { 
  calculateAveragePositions,
  calculateStandardDeviations,
  getTagAnnotations
} from '@/utils/mappingDataUtils';

interface MappingSettings {
  xAxisLabel: string;
  xAxisLeftLabel: string;
  xAxisRightLabel: string;
  yAxisLabel: string;
  yAxisTopLabel: string;
  yAxisBottomLabel: string;
  gridSize: number;
  enableAnnotations: boolean;
  maxAnnotationLength: number;
}

interface Participant {
  id: string;
  name: string;
  isConnected: boolean;
}

interface Position {
  tagId: string;
  instanceId?: string;
  x: number;
  y: number;
  annotation?: string;
  text?: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
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
  status: string;
  creatorId: string;
  creatorName?: string;
  comments?: Comment[];
}

interface MappingResultsVisualizationProps {
  settings?: MappingSettings;
  tags: Tag[];
  mappings: Mapping[];
  participants: Participant[];
}

export default function MappingResultsVisualization({
  settings,
  tags,
  mappings,
  participants
}: MappingResultsVisualizationProps) {
  const [viewMode, setViewMode] = useState<'aggregate' | 'individual'>('aggregate');
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hoveredComment, setHoveredComment] = useState<{ tagId: string | null, userId: string | null, x?: number, y?: number }>({ tagId: null, userId: null });
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'statistics' | 'comments' | 'individual-mappings'>('statistics');
  
  // Use a ref to track if this is the first render
  const isFirstRender = useRef(true);
  
  // Default settings if not provided
  const defaultSettings = {
    xAxisLabel: 'Knowledge',
    xAxisLeftLabel: "Don't Know",
    xAxisRightLabel: 'Know',
    yAxisLabel: 'Preference',
    yAxisTopLabel: 'Like',
    yAxisBottomLabel: "Don't Like",
    gridSize: 4,
    enableAnnotations: true,
    maxAnnotationLength: 280
  };
  
  // Merge provided settings with defaults
  const mappingSettings = {
    ...defaultSettings,
    ...(settings || {})
  };
  
  
  // Get aggregate positions or participant positions
  const positions = useMemo(() => {
    if (viewMode === 'aggregate') {
      // Filter to only approved tags
      const approvedTags = tags.filter(tag => tag.status === 'approved');
      const approvedTagIds = approvedTags.map(tag => tag.id);
      
      // Filter mappings to only include positions for approved tags
      const filteredMappings = mappings.map(mapping => ({
        ...mapping,
        positions: mapping.positions.filter(pos => approvedTagIds.includes(pos.tagId))
      }));
      
      // Group positions by tag and instance for multiple instances support
      const tagInstanceGroups: Record<string, { positions: Position[], text: string }> = {};
      
      filteredMappings.forEach(mapping => {
        mapping.positions.forEach(pos => {
          const key = pos.tagId; // Group all instances of the same tag together
          
          if (!tagInstanceGroups[key]) {
            const tag = approvedTags.find(t => t.id === pos.tagId);
            tagInstanceGroups[key] = {
              positions: [],
              text: tag?.text || pos.text || pos.tagId
            };
          }
          
          tagInstanceGroups[key].positions.push(pos);
        });
      });
      
      // Calculate average positions for each tag instance
      const result: Record<string, Position> = {};
      
      Object.entries(tagInstanceGroups).forEach(([key, group]) => {
        if (group.positions.length > 0) {
          const avgX = group.positions.reduce((sum, pos) => sum + pos.x, 0) / group.positions.length;
          const avgY = group.positions.reduce((sum, pos) => sum + pos.y, 0) / group.positions.length;
          
          // Calculate consensus (inverse of standard deviation)
          const stdDevX = Math.sqrt(group.positions.reduce((sum, pos) => sum + Math.pow(pos.x - avgX, 2), 0) / group.positions.length);
          const stdDevY = Math.sqrt(group.positions.reduce((sum, pos) => sum + Math.pow(pos.y - avgY, 2), 0) / group.positions.length);
          const combinedStdDev = (stdDevX + stdDevY) / 2;
          const consensus = Math.max(0, 1 - Math.min(1, combinedStdDev * 2));
          
          result[key] = {
            tagId: group.positions[0].tagId,
            instanceId: group.positions[0].instanceId,
            x: avgX,
            y: avgY,
            count: group.positions.length,
            text: group.text,
            consensus: consensus
          };
        }
      });
      
      return result;
    } else {
      // Individual participant's positions
      if (!selectedParticipant) return {};
      
      const mapping = mappings.find(m => m.userId === selectedParticipant);
      if (!mapping) return {};
      
      // Filter to only approved tags
      const approvedTags = tags.filter(tag => tag.status === 'approved');
      const approvedTagIds = approvedTags.map(tag => tag.id);
      
      const participantPositions: Record<string, Position> = {};
      
      mapping.positions.forEach(pos => {
        const tag = approvedTags.find(t => t.id === pos.tagId);
        // Only include positions for approved tags
        if (tag && approvedTagIds.includes(pos.tagId)) {
          const key = pos.instanceId ? `${pos.tagId}_${pos.instanceId}` : pos.tagId;
          participantPositions[key] = {
            ...pos,
            text: tag.text, // Use the approved tag's text
            consensus: 1, // Individual tags have perfect consensus (with themselves)
            count: 1,
            // Include all annotations from this user for all tags
            annotation: pos.annotation || undefined
          };
        }
      });
      
      return participantPositions;
    }
  }, [viewMode, selectedParticipant, mappings, tags]);
  
  // Handle participant selection for individual view
  useEffect(() => {
    // This effect runs once after the first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Auto-select first participant if individual view is selected and none is selected
    if (viewMode === 'individual' && !selectedParticipant && mappings.length > 0) {
      setSelectedParticipant(mappings[0].userId);
    }
  }, [viewMode, selectedParticipant, mappings]);
  
  // Function to handle clicking on a comment - switches to individual view for that user and clears tag selection
  const handleCommentClick = (userId: string) => {
    console.log(`Showing individual view for user ${userId}`);
    setViewMode('individual');
    setSelectedParticipant(userId);
    setSelectedTag(null); // Clear selected tag to show full map
  };
  
  // Update active tab when selected tag changes - separate effect
  useEffect(() => {
    if (selectedTag) {
      setActiveTab('comments'); // Change to show comments tab by default when a tag is selected
    }
  }, [selectedTag]);
  
  // Get tag statistics
  const getTagStats = () => {
    if (!selectedTag) return null;
    
    const tagId = selectedTag; // selectedTag is now just the tagId
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return null;
    
    // Count mappings for this specific instance
    let mappingCount = 0;
    let averageX = 0;
    let averageY = 0;
    let stdDevX = 0;
    let stdDevY = 0;
    
    // Calculate average position for all instances of this tag
    mappings.forEach(mapping => {
      mapping.positions.forEach(position => {
        if (position.tagId === selectedTag) {
          mappingCount++;
          averageX += position.x;
          averageY += position.y;
        }
      });
    });
    
    if (mappingCount > 0) {
      averageX /= mappingCount;
      averageY /= mappingCount;
      
      // Calculate standard deviation for all instances of this tag
      mappings.forEach(mapping => {
        mapping.positions.forEach(position => {
          if (position.tagId === selectedTag) {
            stdDevX += Math.pow(position.x - averageX, 2);
            stdDevY += Math.pow(position.y - averageY, 2);
          }
        });
      });
      
      stdDevX = Math.sqrt(stdDevX / mappingCount);
      stdDevY = Math.sqrt(stdDevY / mappingCount);
    }
    
    // Determine quadrant
    let quadrant = '';
    if (averageX >= 0.5 && averageY >= 0.5) {
      quadrant = `${mappingSettings.xAxisRightLabel} / ${mappingSettings.yAxisTopLabel}`;
    } else if (averageX < 0.5 && averageY >= 0.5) {
      quadrant = `${mappingSettings.xAxisLeftLabel} / ${mappingSettings.yAxisTopLabel}`;
    } else if (averageX < 0.5 && averageY < 0.5) {
      quadrant = `${mappingSettings.xAxisLeftLabel} / ${mappingSettings.yAxisBottomLabel}`;
    } else {
      quadrant = `${mappingSettings.xAxisRightLabel} / ${mappingSettings.yAxisBottomLabel}`;
    }
    
    // Calculate consensus (inverse of standard deviation)
    const consensus = 1 - Math.min(1, (stdDevX + stdDevY) / 2);
    
    // Get annotations for this specific instance
    const annotations: Array<{ text: string; userName: string; x: number; y: number; userId: string }> = [];
    mappings.forEach(mapping => {
      mapping.positions.forEach(position => {
        if (position.tagId === selectedTag && position.annotation) {
          annotations.push({
            text: position.annotation,
            userName: mapping.userName,
            x: position.x,
            y: position.y,
            userId: mapping.userId
          });
        }
      });
    });
    
    // Get individual mappings for this tag (all instances)
    const individualMappings: any[] = [];
    mappings.forEach(mapping => {
      mapping.positions.forEach(position => {
        if (position.tagId === selectedTag) {
          individualMappings.push({
            userId: mapping.userId,
            userName: mapping.userName,
            position: position
          });
        }
      });
    });
    
    return {
      tag,
      mappingCount,
      averageX,
      averageY,
      stdDevX,
      stdDevY,
      quadrant,
      consensus,
      annotations,
      individualMappings
    };
  };
  
  // Export data to CSV
  const exportToCSV = () => {
    // Implementation omitted for brevity
  };
  
  // Export data to JSON
  const exportToJSON = () => {
    // Implementation omitted for brevity
  };
  
  // Get all comments for the currently selected participant
  const getParticipantComments = () => {
    if (viewMode !== 'individual' || !selectedParticipant) return [];
    
    const mapping = mappings.find(m => m.userId === selectedParticipant);
    if (!mapping) return [];
    
    // Filter to only approved tags
    const approvedTags = tags.filter(tag => tag.status === 'approved');
    const approvedTagIds = approvedTags.map(tag => tag.id);
    
    return mapping.positions
      .filter(pos => pos.annotation && approvedTagIds.includes(pos.tagId))
      .map(pos => {
        const tag = approvedTags.find(t => t.id === pos.tagId);
        return {
          tagId: pos.tagId,
          tagText: tag?.text || 'Unknown Tag',
          position: { x: pos.x, y: pos.y },
          annotation: pos.annotation
        };
      });
  };

  // Calculate tag stats only when needed
  const tagStats = selectedTag ? getTagStats() : null;

  return (
    <div className="mapping-results-visualization">
      <div className="visualization-controls">
        <div className="view-mode-selector">
          <button 
            className={viewMode === 'aggregate' ? 'active' : ''}
            onClick={() => {
              setViewMode('aggregate');
              setSelectedTag(null); // Clear selected tag when switching to aggregate view
            }}
          >
            Aggregate View
          </button>
          <button 
            className={viewMode === 'individual' ? 'active' : ''}
            onClick={() => {
              setViewMode('individual');
              setSelectedTag(null); // Clear selected tag when switching to individual view
            }}
          >
            Individual View
          </button>
        </div>
        
        {viewMode === 'individual' && (
          <div className="participant-selector">
            <label htmlFor="participant-select">Select Participant:</label>
            <select 
              id="participant-select"
              value={selectedParticipant || ''}
              onChange={(e) => setSelectedParticipant(e.target.value)}
            >
              <option value="" disabled>Select a participant</option>
              {mappings.map(mapping => (
                <option key={mapping.userId} value={mapping.userId}>
                  {mapping.userName}
                </option>
              ))}
            </select>
          </div>
        )}
        
      </div>
      
      <div className="visualization-container">
        <ResultsVisualizationGrid
          settings={mappingSettings}
          viewMode={viewMode}
          positions={positions}
          selectedTag={selectedTag}
          hoveredComment={hoveredComment}
          tags={tags}
          mappings={mappings} // Pass the full mappings data
          onSelectTag={(tagId) => {
            // Only allow selecting tags in aggregate view
            if (viewMode === 'aggregate') {
              setSelectedTag(tagId === selectedTag ? null : tagId);
            }
          }}
          onHoverTag={(hoverInfo) => {
            setHoveredTag(hoverInfo);
            
            // Parse hover info to set hoveredComment for reverse highlighting
            if (hoverInfo && hoverInfo.includes('-')) {
              const parts = hoverInfo.split('-');
              if (parts.length >= 3) {
                // For individual view: tagId-x-y
                if (viewMode === 'individual' && parts.length === 3) {
                  const [tagId, x, y] = parts;
                  setHoveredComment({ 
                    tagId, 
                    userId: selectedParticipant, 
                    x: parseFloat(x), 
                    y: parseFloat(y) 
                  });
                }
                // For aggregate view: selectedTag-userId-x-y
                else if (viewMode === 'aggregate' && parts.length >= 4) {
                  const [tagId, userId, x, y] = parts;
                  setHoveredComment({ 
                    tagId, 
                    userId, 
                    x: parseFloat(x), 
                    y: parseFloat(y) 
                  });
                }
              }
            } else if (!hoverInfo) {
              // Clear hover when no longer hovering
              setHoveredComment({ tagId: null, userId: null });
            }
          }}
          participantName={viewMode === 'individual' ? 
            mappings.find(m => m.userId === selectedParticipant)?.userName || 'Unknown' : undefined}
        />
        
        <div className="tag-details-panel">
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
            >
              Comments
            </button>
          </div>
          

          
          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="comments-tab">
              {selectedTag && tagStats ? (
                <>
                  <h4>Annotations for "{tagStats.tag.text}"</h4>
                  
                  {tagStats.annotations.length > 0 ? (
                    <div className="annotation-list">
                      {tagStats.annotations.map((annotation, idx) => {
                        return (
                          <div key={idx} className="annotation-wrapper">
                            <div className="annotation-author-above">
                              {annotation.userName}
                            </div>
                            <div 
                              className={`annotation-item ${
                                (hoveredTag === selectedTag) || 
                                (hoveredComment?.tagId === selectedTag && hoveredComment?.userId === annotation.userId && 
                                 hoveredComment?.x === annotation.x && hoveredComment?.y === annotation.y) 
                                ? 'tag-hovered' : ''
                              }`}
                              onClick={() => handleCommentClick(annotation.userId)}
                              onMouseEnter={() => setHoveredComment({ 
                                tagId: selectedTag, 
                                userId: annotation.userId, 
                                x: annotation.x, 
                                y: annotation.y 
                              })}
                              onMouseLeave={() => setHoveredComment({ tagId: null, userId: null })}
                              title="Click to view individual map"
                            >
                              <div className="annotation-content">{annotation.text}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="no-annotations">No annotations available for this tag.</p>
                  )}
                  
                  <button onClick={() => setSelectedTag(null)} className="clear-selection">
                    Clear Selection
                  </button>
                </>
              ) : viewMode === 'individual' && selectedParticipant ? (
                // Show all comments from this participant when in individual view
                <>
                  <h4>All Annotations from {mappings.find(m => m.userId === selectedParticipant)?.userName || 'Participant'}</h4>
                  
                  {(() => {
                    const participantComments = getParticipantComments();
                    return participantComments.length > 0 ? (
                      <div className="annotation-list">
                        {participantComments.map((comment, idx) => (
                          <div 
                            key={idx} 
                            className={`annotation-item individual-comment ${
                              (hoveredTag === comment.tagId) ||
                              (hoveredComment?.tagId === comment.tagId && hoveredComment?.userId === selectedParticipant && 
                               hoveredComment?.x === comment.position.x && hoveredComment?.y === comment.position.y) 
                              ? 'tag-hovered' : ''
                            }`}
                            onMouseEnter={() => setHoveredComment({ 
                              tagId: comment.tagId, 
                              userId: selectedParticipant, 
                              x: comment.position.x, 
                              y: comment.position.y 
                            })}
                            onMouseLeave={() => setHoveredComment({ tagId: null, userId: null })}
                          >
                            <div className="tag-title">{comment.tagText}</div>
                            <div className="annotation-content individual-view">{comment.annotation}</div>
                            <div className="position-coordinates">
                              Position: ({(comment.position.x * 10 - 5).toFixed(1)}, {(comment.position.y * 10 - 5).toFixed(1)})
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-annotations">This participant has not added any annotations.</p>
                    );
                  })()}
                </>
              ) : (
                <p className="no-annotations">Select a tag to view annotations.</p>
              )}
            </div>
          )}
          
          {/* Statistics Tab */}
          {activeTab === 'statistics' && (
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
          )}
        </div>
      </div>
      

      <style jsx>{`
        .mapping-results-visualization {
          width: 100%;
          margin-bottom: 2rem;
        }
        
        .visualization-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .view-mode-selector {
          display: flex;
          gap: 0.5rem;
        }
        
        .view-mode-selector button {
          background-color: #f1f3f4;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .view-mode-selector button.active {
          background-color: #e8f0fe;
          color: #1a73e8;
          font-weight: 500;
        }
        
        .participant-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .participant-selector select {
          padding: 0.4rem 0.8rem;
          border-radius: 4px;
          border: 1px solid #dadce0;
        }
        
        
        .visualization-container {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }
        
        .tag-details-panel {
          flex: 1;
          min-width: 300px;
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
        
        .individual-mappings-tab, .comments-tab {
          background-color: #e8f0fe;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .individual-mappings-tab h4, .comments-tab h4 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 1.1rem;
          color: #1a73e8;
        }
        
        .individual-mappings-list {
          margin-top: 1rem;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .individual-mapping-item {
          background-color: white;
          border-radius: 6px;
          margin-bottom: 0.75rem;
          padding: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .mapping-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .position-coordinates {
          color: #5f6368;
          font-size: 0.9rem;
        }
        
        .mapping-annotation {
          color: #202124;
          font-style: italic;
          margin-bottom: 0.75rem;
          padding: 0.5rem;
          background-color: #f8f9fa;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .view-map-button {
          width: 100%;
          padding: 0.5rem;
          background-color: #e8f0fe;
          color: #1a73e8;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background-color 0.2s;
        }
        
        .view-map-button:hover {
          background-color: #d2e3fc;
        }
        
        .annotation-list {
          margin-top: 0.75rem;
        }
        
        .annotation-wrapper {
          margin-bottom: 1rem;
        }
        
        .annotation-author-above {
          font-size: 0.85rem;
          font-weight: 600;
          color: #5f6368;
          margin-bottom: 0.25rem;
          margin-left: 0.25rem;
        }
        
        .annotation-item {
          background-color: white;
          border-radius: 12px;
          padding: 0.75rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          transition: background-color 0.2s;
          margin-left: 0;
        }
        
        .annotation-item:hover {
          background-color: #f8f9fa;
        }
        
        .annotation-item.tag-hovered {
          background-color: #f1f3f4;
        }
        
        .annotation-content {
          font-size: 0.9rem;
          color: #202124;
          line-height: 1.4;
        }
        
        .annotation-content.individual-view {
          margin-left: 1rem;
        }
        
        .annotation-item.individual-comment {
          margin-bottom: 0.75rem;
        }
        
        .tag-title {
          font-weight: 600;
          font-size: 0.9rem;
          color: #1a73e8;
          margin-bottom: 0.25rem;
          margin-left: 1rem;
        }
        
        .position-coordinates {
          font-size: 0.8rem;
          color: #5f6368;
          font-style: italic;
          margin-top: 0.25rem;
          margin-left: 1rem;
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
        
        .clear-selection {
          margin-top: 1rem;
          width: 100%;
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
        
        @media (max-width: 992px) {
          .visualization-controls {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .visualization-container {
            flex-direction: column;
          }
        }
        
        .tag-title {
          font-weight: 500;
          color: #1a73e8;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }
        
        .position-coordinates {
          font-size: 0.8rem;
          color: #5f6368;
          margin-top: 0.3rem;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}