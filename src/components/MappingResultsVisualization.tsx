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
  allMappings?: Mapping[]; // All mappings including incomplete ones for participant dropdown
}

export default function MappingResultsVisualization({
  settings,
  tags,
  mappings,
  participants,
  allMappings
}: MappingResultsVisualizationProps) {
  const [viewMode, setViewMode] = useState<'aggregate' | 'individual'>('aggregate');
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hoveredComment, setHoveredComment] = useState<{ tagId: string | null, userId: string | null, x?: number, y?: number }>({ tagId: null, userId: null });
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [activeContentTab, setActiveContentTab] = useState<'map' | 'comments' | 'stats'>('map');
  
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
      
      const mapping = (allMappings || mappings).find(m => m.userId === selectedParticipant);
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
    const availableMappings = allMappings || mappings;
    if (viewMode === 'individual' && !selectedParticipant && availableMappings.length > 0) {
      setSelectedParticipant(availableMappings[0].userId);
    }
  }, [viewMode, selectedParticipant, mappings, allMappings]);
  
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
      // Only switch to comments in individual view, not aggregate view
      if (viewMode === 'individual') {
        setActiveContentTab('comments');
      }
    } else {
      // When tag is deselected, switch back to map view
      setActiveContentTab('map');
    }
  }, [selectedTag, viewMode]);
  
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
    
    const mapping = (allMappings || mappings).find(m => m.userId === selectedParticipant);
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
      <div className="tab-navigation">
        {/* First Line: View Type and Participant Selector */}
        <div className="tab-navigation-row">
          <div className="tab-button-group">
            <button
              className={`tab-button ${viewMode === 'aggregate' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('aggregate');
                setSelectedTag(null);
              }}
            >
              Aggregate
            </button>
            <button
              className={`tab-button ${viewMode === 'individual' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('individual');
                setSelectedTag(null);
              }}
            >
              Individual
            </button>
          </div>

          {/* Participant selector for individual view */}
          {viewMode === 'individual' && (
            <div className="participant-selector">
              <select 
                value={selectedParticipant || ''}
                onChange={(e) => setSelectedParticipant(e.target.value)}
              >
                <option value="" disabled>Select participant</option>
                {(allMappings || mappings).map(mapping => (
                  <option key={mapping.userId} value={mapping.userId}>
                    {mapping.userName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Second Line: Content Tabs */}
        <div className="tab-navigation-row">
          <div className="tab-button-group">
            <button
              className={`tab-button ${activeContentTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveContentTab('map')}
            >
              Map
            </button>
            <button
              className={`tab-button comments-tab ${activeContentTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveContentTab('comments')}
            >
              Comments
            </button>
            <button
              className={`tab-button ${activeContentTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveContentTab('stats')}
            >
              Stats
            </button>
          </div>
        </div>
      </div>

      <div className="tab-content-container">
        {/* Map Tab Content - Always show map, but make it visible through comments */}
        <div className={`tab-content map-content ${activeContentTab === 'map' || activeContentTab === 'comments' ? 'active' : ''}`}>
          <ResultsVisualizationGrid
            settings={mappingSettings}
            viewMode={viewMode}
            positions={positions}
            selectedTag={selectedTag}
            hoveredComment={hoveredComment}
            tags={tags}
            mappings={mappings}
            onSelectTag={(tagId) => {
              if (viewMode === 'aggregate') {
                setSelectedTag(tagId === selectedTag ? null : tagId);
              }
            }}
            onHoverTag={(hoverInfo) => {
              setHoveredTag(hoverInfo);
              
              if (hoverInfo && hoverInfo.includes('-')) {
                const parts = hoverInfo.split('-');
                if (parts.length >= 3) {
                  if (viewMode === 'individual' && parts.length === 3) {
                    const [tagId, x, y] = parts;
                    setHoveredComment({ 
                      tagId, 
                      userId: selectedParticipant, 
                      x: parseFloat(x), 
                      y: parseFloat(y) 
                    });
                  } else if (viewMode === 'aggregate' && parts.length >= 4) {
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
                setHoveredComment({ tagId: null, userId: null });
              }
            }}
            participantName={viewMode === 'individual' ? 
              (allMappings || mappings).find(m => m.userId === selectedParticipant)?.userName || 'Unknown' : undefined}
          />
        </div>

        {/* Comments Tab Content */}
        <div className={`tab-content comments-content ${activeContentTab === 'comments' ? 'active' : ''}`}>
          <div className="comments-overlay">
            {selectedTag && tagStats ? (
              <>
                <h4 className="comments-title">Comments for "{tagStats.tag.text}"</h4>
                <div className="comments-scrollable">
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
                </div>
                <button onClick={() => {
                  setSelectedTag(null);
                  setActiveContentTab('map');
                }} className="clear-selection">
                  Clear Selection
                </button>
              </>
            ) : viewMode === 'individual' && selectedParticipant ? (
              <>
                <h4 className="comments-title">Comments from {(allMappings || mappings).find(m => m.userId === selectedParticipant)?.userName || 'Participant'}</h4>
                <div className="comments-scrollable">
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
                </div>
              </>
            ) : (
              <div className="comments-scrollable">
                <p className="no-annotations">Select a tag to view annotations.</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Tab Content */}
        <div className={`tab-content stats-content ${activeContentTab === 'stats' ? 'active' : ''}`}>
          <div className="stats-display">
            <h4>Overall Statistics</h4>
            <ul>
              <li>Total tags: {tags.length}</li>
              <li>Total participants: {participants.length}</li>
              <li>Completed mappings: {mappings.filter(m => m.isComplete).length}</li>
              <li>Average tags mapped per participant: {mappings.length > 0 
                ? (mappings.reduce((sum, m) => sum + m.positions.length, 0) / mappings.length).toFixed(1) 
                : '0'}</li>
            </ul>

            {selectedTag && tagStats && (
              <div className="tag-stats">
                <h4>Statistics for "{tagStats.tag.text}"</h4>
                <ul>
                  <li>Mappings: {tagStats.mappingCount}</li>
                  <li>Average position: ({(tagStats.averageX * 10 - 5).toFixed(1)}, {(tagStats.averageY * 10 - 5).toFixed(1)})</li>
                  <li>Quadrant: {tagStats.quadrant}</li>
                  <li>Consensus: {(tagStats.consensus * 100).toFixed(1)}%</li>
                  <li>Standard deviation X: {tagStats.stdDevX.toFixed(2)}</li>
                  <li>Standard deviation Y: {tagStats.stdDevY.toFixed(2)}</li>
                </ul>
                <button onClick={() => {
                  setSelectedTag(null);
                  setActiveContentTab('map');
                }} className="clear-selection">
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      

      <style jsx>{`
        .mapping-results-visualization {
          width: 100%;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          min-height: 500px;
        }

        /* Tab navigation */
        .tab-navigation {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          flex-shrink: 0;
        }

        .tab-navigation-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .tab-button-group {
          display: flex;
          gap: 0.5rem;
          background-color: #FDF0E1;
          border: 1px solid #E8C4A0;
          border-radius: 25px;
          padding: 0.25rem;
          align-items: center;
        }

        .tab-button {
          flex: 1;
          background: transparent;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #8B7355;
          min-width: 80px;
        }

        .tab-button.active {
          background-color: #D8CD9D;
          color: #202124;
        }

        .tab-button:not(.active):hover {
          color: #202124;
          background-color: rgba(216, 205, 157, 0.5);
        }

        .tab-button:focus {
          outline: 2px solid #8B7355;
          outline-offset: 2px;
        }

        .tab-button.comments-tab {
          min-width: 100px;
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
          background-color: white;
          font-size: 0.9rem;
        }

        /* Tab content container - sized for map */
        .tab-content-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 700px;
          position: relative;
        }

        .tab-content {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0;
          visibility: hidden;
          flex: 1;
          display: flex;
          flex-direction: column;
          transition: opacity 0.2s ease-in-out;
        }

        .tab-content.active {
          opacity: 1;
          visibility: visible;
        }

        .tab-content.map-content {
          z-index: 1;
        }

        .tab-content.comments-content {
          z-index: 2;
          pointer-events: none;
        }

        .tab-content.comments-content .comments-display {
          pointer-events: all;
        }

        .tab-content.stats-content {
          z-index: 3;
        }

        .comments-overlay {
          position: absolute;
          top: 0;
          right: 0;
          width: 400px;
          height: 100%;
          display: flex;
          flex-direction: column;
          pointer-events: all;
          z-index: 2;
        }

        .comments-title {
          background-color: rgba(248, 249, 250, 0.6375);
          border: 2px solid #E8C4A0;
          border-bottom: none;
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          padding: 1rem 1.5rem 0.5rem 1.5rem;
          margin: 0;
          font-size: 1.1rem;
          color: #202124;
          text-align: right;
          flex-shrink: 0;
        }

        .comments-scrollable {
          background-color: rgba(248, 249, 250, 0.6375);
          border: 2px solid #E8C4A0;
          border-top: none;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          padding: 0.5rem 1.5rem 1.5rem 1.5rem;
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        .stats-display {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
          height: 100%;
          flex: 1;
          overflow-y: auto;
        }

        .comments-display h4, .stats-display h4 {
          margin-top: 0;
          margin-bottom: 0.75rem;
          font-size: 1.1rem;
          color: #202124;
        }

        .tag-stats {
          background-color: #e8f0fe;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1rem;
        }

        .tag-stats h4 {
          color: #1a73e8;
          margin-top: 0;
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
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        
        .annotation-wrapper {
          margin-bottom: 1rem;
          max-width: 80%;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        
        .annotation-author-above {
          font-size: 0.85rem;
          font-weight: 600;
          color: #5f6368;
          margin-bottom: 0.25rem;
          margin-right: 0.25rem;
        }
        
        .annotation-item {
          background-color: rgba(248, 249, 250, 0.85);
          border-radius: 12px;
          padding: 0.75rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          transition: background-color 0.2s;
          display: inline-block;
          max-width: 100%;
          word-wrap: break-word;
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
        
        .stats-display ul {
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }
        
        .stats-display li, .tag-stats li {
          margin-bottom: 0.3rem;
          font-size: 0.9rem;
        }

        .tag-stats ul {
          padding-left: 1.25rem;
          margin: 0.5rem 0;
        }
        
        @media (max-width: 768px) {
          .tab-navigation {
            gap: 0.5rem;
          }
          
          .tab-navigation-row {
            justify-content: center;
            gap: 1rem;
          }
          
          .tab-button {
            padding: 0.6rem 0.8rem;
            font-size: 0.85rem;
            min-width: 70px;
          }

          .tab-button.comments-tab {
            min-width: 90px;
          }

          .participant-selector select {
            font-size: 0.85rem;
            padding: 0.35rem 0.6rem;
          }
          
          .comments-overlay {
            width: 100%;
            position: relative;
          }

          .comments-title {
            padding: 0.75rem 1rem 0.5rem 1rem;
            text-align: right;
          }

          .comments-scrollable {
            padding: 0.5rem 1rem 1rem 1rem;
          }

          .stats-display {
            padding: 1rem;
          }

          .annotation-wrapper {
            max-width: 90%;
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