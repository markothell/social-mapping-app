"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import ResultsVisualizationGrid from './ResultsVisualizationGrid';
import TagDetailsPanel from './TagDetailsPanel';
import { 
  calculateQuadrantStats, 
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
  const [hoveredComment, setHoveredComment] = useState<{ tagId: string | null, userId: string | null }>({ tagId: null, userId: null });
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
  
  // Compute these values only when needed inputs change
  const quadrantStats = useMemo(() => {
    return calculateQuadrantStats(mappings, tags, mappingSettings);
  }, [mappings, tags, mappingSettings]);
  
  // Get aggregate positions or participant positions
  const positions = useMemo(() => {
    if (viewMode === 'aggregate') {
      // Calculate average positions using our utility function
      const averagePositions = calculateAveragePositions(mappings, tags);
      
      // Calculate standard deviations and consensus
      const stdDeviations = calculateStandardDeviations(mappings, averagePositions);
      
      // Combine the data for display
      const result: Record<string, Position> = {};
      
      Object.keys(averagePositions).forEach(tagId => {
        const avgPos = averagePositions[tagId];
        const stdDev = stdDeviations[tagId] || { consensus: 1 };
        
        result[tagId] = {
          tagId,
          x: avgPos.x,
          y: avgPos.y,
          count: avgPos.count,
          text: avgPos.text,
          consensus: stdDev.consensus
        };
      });
      
      return result;
    } else {
      // Individual participant's positions
      if (!selectedParticipant) return {};
      
      const mapping = mappings.find(m => m.userId === selectedParticipant);
      if (!mapping) return {};
      
      const participantPositions: Record<string, Position> = {};
      
      mapping.positions.forEach(pos => {
        const tag = tags.find(t => t.id === pos.tagId);
        participantPositions[pos.tagId] = {
          ...pos,
          text: tag?.text || pos.text || pos.tagId,
          consensus: 1, // Individual tags have perfect consensus (with themselves)
          count: 1,
          // Include all annotations from this user for all tags
          annotation: pos.annotation || undefined
        };
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
    
    const tag = tags.find(t => t.id === selectedTag);
    if (!tag) return null;
    
    // Count mappings
    let mappingCount = 0;
    let averageX = 0;
    let averageY = 0;
    let stdDevX = 0;
    let stdDevY = 0;
    
    // Calculate average position
    mappings.forEach(mapping => {
      const position = mapping.positions.find(p => p.tagId === selectedTag);
      if (position) {
        mappingCount++;
        averageX += position.x;
        averageY += position.y;
      }
    });
    
    if (mappingCount > 0) {
      averageX /= mappingCount;
      averageY /= mappingCount;
      
      // Calculate standard deviation
      mappings.forEach(mapping => {
        const position = mapping.positions.find(p => p.tagId === selectedTag);
        if (position) {
          stdDevX += Math.pow(position.x - averageX, 2);
          stdDevY += Math.pow(position.y - averageY, 2);
        }
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
    
    // Get annotations
    const annotations = getTagAnnotations(mappings, selectedTag);
    
    // Get individual mappings for this tag
    const individualMappings = mappings
      .filter(mapping => mapping.positions.some(pos => pos.tagId === selectedTag))
      .map(mapping => {
        const position = mapping.positions.find(pos => pos.tagId === selectedTag);
        return {
          userId: mapping.userId,
          userName: mapping.userName,
          position: position
        };
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
    
    return mapping.positions
      .filter(pos => pos.annotation)
      .map(pos => {
        const tag = tags.find(t => t.id === pos.tagId);
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
                        // Find mapping with this userName
                        const mapping = mappings.find(m => m.userName === annotation.userName);
                        const userId = mapping?.userId;
                        
                        return (
                          <div 
                            key={idx} 
                            className="annotation-item"
                            onClick={() => userId && handleCommentClick(userId)}
                            onMouseEnter={() => setHoveredComment({ tagId: selectedTag, userId: userId || null })}
                            onMouseLeave={() => setHoveredComment({ tagId: null, userId: null })}
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
                            className="annotation-item"
                            onMouseEnter={() => setHoveredComment({ tagId: comment.tagId, userId: selectedParticipant })}
                            onMouseLeave={() => setHoveredComment({ tagId: null, userId: null })}
                          >
                            <div className="tag-title">{comment.tagText}</div>
                            <div className="annotation-content">{comment.annotation}</div>
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
            <>
              <div className="quadrant-stats">
                <h4>Quadrant Analysis</h4>
                <div className="quadrant-grid">
                  <div className="quadrant q2">
                    <div className="quadrant-label">
                      {mappingSettings.xAxisLeftLabel} / {mappingSettings.yAxisTopLabel}
                      <span className="count">{quadrantStats.q2?.count || 0}</span>
                    </div>
                    <div className="tag-list">
                      {quadrantStats.q2?.tags?.slice(0, 3).map((tag: any) => (
                        <div 
                          key={tag.id} 
                          className="tag-pill"
                          onClick={() => setSelectedTag(tag.id)}
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
                      {mappingSettings.xAxisRightLabel} / {mappingSettings.yAxisTopLabel}
                      <span className="count">{quadrantStats.q1?.count || 0}</span>
                    </div>
                    <div className="tag-list">
                      {quadrantStats.q1?.tags?.slice(0, 3).map((tag: any) => (
                        <div 
                          key={tag.id} 
                          className="tag-pill"
                          onClick={() => setSelectedTag(tag.id)}
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
                      {mappingSettings.xAxisLeftLabel} / {mappingSettings.yAxisBottomLabel}
                      <span className="count">{quadrantStats.q3?.count || 0}</span>
                    </div>
                    <div className="tag-list">
                      {quadrantStats.q3?.tags?.slice(0, 3).map((tag: any) => (
                        <div 
                          key={tag.id} 
                          className="tag-pill"
                          onClick={() => setSelectedTag(tag.id)}
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
                      {mappingSettings.xAxisRightLabel} / {mappingSettings.yAxisBottomLabel}
                      <span className="count">{quadrantStats.q4?.count || 0}</span>
                    </div>
                    <div className="tag-list">
                      {quadrantStats.q4?.tags?.slice(0, 3).map((tag: any) => (
                        <div 
                          key={tag.id} 
                          className="tag-pill"
                          onClick={() => setSelectedTag(tag.id)}
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
        
        .annotation-item {
          background-color: white;
          border-radius: 6px;
          padding: 0.75rem;
          margin-bottom: 0.75rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .annotation-item:hover {
          background-color: #f8f9fa;
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
        
        .view-map-link {
          color: #1a73e8;
          text-decoration: underline;
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