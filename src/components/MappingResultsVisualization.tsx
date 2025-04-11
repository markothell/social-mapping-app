"use client";

import { useState, useEffect, useRef } from 'react';
import HeatmapCanvas from './HeatmapCanvas';

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
  const [viewMode, setViewMode] = useState<'aggregate' | 'individual' | 'heatmap'>('aggregate');
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [quadrantStats, setQuadrantStats] = useState<any>({});
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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
  
  // Process data for different visualizations
  useEffect(() => {
    calculateQuadrantStats();
    generateHeatmapData();
    
    // Auto-select first participant if individual view is selected
    if (viewMode === 'individual' && !selectedParticipant && mappings.length > 0) {
      setSelectedParticipant(mappings[0].userId);
    }
  }, [mappings, viewMode, tags]);
  
  // Calculate which quadrant each tag appears in most frequently
  const calculateQuadrantStats = () => {
    // Initialize counters for each quadrant
    const quadStats = {
      q1: { count: 0, tags: [] }, // top-right
      q2: { count: 0, tags: [] }, // top-left
      q3: { count: 0, tags: [] }, // bottom-left
      q4: { count: 0, tags: [] }, // bottom-right
    };
    
    // Initialize tag counts in each quadrant
    const tagQuadrants: Record<string, Record<string, number>> = {};
    
    tags.forEach(tag => {
      tagQuadrants[tag.id] = { q1: 0, q2: 0, q3: 0, q4: 0 };
    });
    
    // Count positions in each quadrant
    mappings.forEach(mapping => {
      mapping.positions.forEach(pos => {
        // Determine quadrant (center is at 0.5, 0.5)
        let quadrant: 'q1' | 'q2' | 'q3' | 'q4';
        
        if (pos.x >= 0.5 && pos.y >= 0.5) {
          quadrant = 'q1'; // top-right
        } else if (pos.x < 0.5 && pos.y >= 0.5) {
          quadrant = 'q2'; // top-left
        } else if (pos.x < 0.5 && pos.y < 0.5) {
          quadrant = 'q3'; // bottom-left
        } else {
          quadrant = 'q4'; // bottom-right
        }
        
        // Increment counters
        quadStats[quadrant].count++;
        tagQuadrants[pos.tagId][quadrant]++;
      });
    });
    
    // Find dominant quadrant for each tag
    tags.forEach(tag => {
      const tagCounts = tagQuadrants[tag.id];
      const maxQuad = Object.entries(tagCounts).reduce(
        (max, [quad, count]) => (count > max.count ? { quad, count } : max),
        { quad: '', count: -1 }
      );
      
      if (maxQuad.count > 0) {
        quadStats[maxQuad.quad as keyof typeof quadStats].tags.push({
          ...tag,
          count: maxQuad.count,
        });
      }
    });
    
    setQuadrantStats(quadStats);
  };
  
  // Generate data for the heatmap visualization
  const generateHeatmapData = () => {
    // Create a grid for the heatmap (resolution can be adjusted)
    const resolution = 20;
    const grid = Array(resolution).fill(0).map(() => Array(resolution).fill(0));
    
    // Count positions in each cell
    mappings.forEach(mapping => {
      mapping.positions.forEach(pos => {
        // Convert position to grid indices
        const x = Math.min(resolution - 1, Math.floor(pos.x * resolution));
        const y = Math.min(resolution - 1, Math.floor((1 - pos.y) * resolution)); // Invert y
        
        // Increment counter
        grid[y][x]++;
      });
    });
    
    // Convert grid to heatmap data points
    const data: any[] = [];
    
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        if (grid[y][x] > 0) {
          data.push({
            x: (x + 0.5) / resolution,
            y: (y + 0.5) / resolution,
            value: grid[y][x],
          });
        }
      }
    }
    
    setHeatmapData(data);
  };
  

  
  // Get aggregate positions (average position for each tag)
  const getAggregatePositions = () => {
    const aggregatePositions: Record<string, {
      x: number;
      y: number;
      count: number;
      text: string;
    }> = {};
    
    // Calculate sum of positions for each tag
    mappings.forEach(mapping => {
      mapping.positions.forEach(pos => {
        if (!aggregatePositions[pos.tagId]) {
          // Get tag text
          const tag = tags.find(t => t.id === pos.tagId);
          
          aggregatePositions[pos.tagId] = {
            x: 0,
            y: 0,
            count: 0,
            text: tag?.text || pos.text || pos.tagId,
          };
        }
        
        aggregatePositions[pos.tagId].x += pos.x;
        aggregatePositions[pos.tagId].y += pos.y;
        aggregatePositions[pos.tagId].count++;
      });
    });
    
    // Calculate average position
    Object.keys(aggregatePositions).forEach(tagId => {
      const pos = aggregatePositions[tagId];
      if (pos.count > 0) {  // Ensure we don't divide by zero
        pos.x /= pos.count;
        pos.y /= pos.count;
      }
    });
    
    return aggregatePositions;
  };
  
  // Get positions for selected participant
  const getParticipantPositions = () => {
    if (!selectedParticipant) return {};
    
    const mapping = mappings.find(m => m.userId === selectedParticipant);
    if (!mapping) return {};
    
    const positions: Record<string, Position> = {};
    
    mapping.positions.forEach(pos => {
      const tag = tags.find(t => t.id === pos.tagId);
      positions[pos.tagId] = {
        ...pos,
        text: tag?.text || pos.text || pos.tagId,
      };
    });
    
    return positions;
  };
  
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
    
    return {
      tag,
      mappingCount,
      averageX,
      averageY,
      stdDevX,
      stdDevY,
      quadrant,
      consensus,
    };
  };
  
  // Export data to CSV
  const exportToCSV = () => {
    // Create header row
    const header = 'Tag ID,Tag Text,Participant ID,Participant Name,X Position,Y Position,Annotation\n';
    
    // Create data rows
    const rows = mappings.flatMap(mapping => {
      return mapping.positions.map(pos => {
        const tag = tags.find(t => t.id === pos.tagId);
        const tagText = tag?.text || pos.text || pos.tagId;
        const annotation = pos.annotation ? `"${pos.annotation.replace(/"/g, '""')}"` : '';
        
        return `${pos.tagId},"${tagText}",${mapping.userId},"${mapping.userName}",${pos.x},${pos.y},${annotation}`;
      });
    });
    
    // Combine header and rows
    const csv = header + rows.join('\n');
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mapping_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Export data to JSON
  const exportToJSON = () => {
    const data = {
      settings,
      tags,
      mappings,
      participants,
    };
    
    // Create download link
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mapping_results.json');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const tagStats = getTagStats();

  return (
    <div className="mapping-results-visualization">
      <div className="visualization-controls">
        <div className="view-mode-selector">
          <button 
            className={viewMode === 'aggregate' ? 'active' : ''}
            onClick={() => setViewMode('aggregate')}
          >
            Aggregate View
          </button>
          <button 
            className={viewMode === 'individual' ? 'active' : ''}
            onClick={() => setViewMode('individual')}
          >
            Individual View
          </button>
          <button 
            className={viewMode === 'heatmap' ? 'active' : ''}
            onClick={() => setViewMode('heatmap')}
          >
            Heatmap View
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
        
        <div className="export-controls">
          <button onClick={exportToCSV}>Export CSV</button>
          <button onClick={exportToJSON}>Export JSON</button>
        </div>
      </div>
      
      <div className="visualization-container">
        <div className="grid-container">
          <div className="direction-label top">{mappingSettings.yAxisTopLabel}</div>
          
          <div className="grid-row">
            <div className="direction-label left">{mappingSettings.xAxisLeftLabel}</div>
            
            {viewMode === 'heatmap' ? (
              <div className="mapping-grid">
                <HeatmapCanvas 
                  data={heatmapData}
                  axisLabels={{
                    xAxisLeftLabel: mappingSettings.xAxisLeftLabel,
                    xAxisRightLabel: mappingSettings.xAxisRightLabel,
                    yAxisTopLabel: mappingSettings.yAxisTopLabel,
                    yAxisBottomLabel: mappingSettings.yAxisBottomLabel
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
                {Object.entries(viewMode === 'aggregate' ? getAggregatePositions() : getParticipantPositions()).map(([tagId, position]) => {
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
                      onClick={() => setSelectedTag(selectedTag === tagId ? null : tagId)}
                    >
                      <div className="tag-content">
                        {position.text}
                        {'count' in position && position.count > 1 && (
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
            
            <div className="direction-label right">{mappingSettings.xAxisRightLabel}</div>
          </div>
          
          <div className="direction-label bottom">{mappingSettings.yAxisBottomLabel}</div>
        </div>
        
        <div className="statistics-panel">
          <h3>Mapping Statistics</h3>
          
          {selectedTag && tagStats ? (
            <div className="selected-tag-stats">
              <h4>Selected Tag: {tagStats.tag.text}</h4>
              <p>Creator: {tagStats.tag.creatorName || 'Unknown'}</p>
              <p>Mapped by {tagStats.mappingCount} participants</p>
              <p>Average position: ({tagStats.averageX.toFixed(2)}, {tagStats.averageY.toFixed(2)})</p>
              <p>Typical quadrant: {tagStats.quadrant}</p>
              <p>Consensus level: {Math.round(tagStats.consensus * 100)}%</p>
              <button onClick={() => setSelectedTag(null)}>Clear Selection</button>
            </div>
          ) : (
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
          )}
          
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
        
        .export-controls {
          display: flex;
          gap: 0.5rem;
        }
        
        .export-controls button {
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .export-controls button:hover {
          background-color: #1765cc;
        }
        
        .visualization-container {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }
        
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
        
        .heatmap-canvas {
          width: 100%;
          height: 100%;
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
        
        .statistics-panel {
          flex: 1;
          min-width: 300px;
        }
        
        .statistics-panel h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.2rem;
          color: #202124;
        }
        
        .statistics-panel h4 {
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          font-size: 1rem;
          color: #202124;
        }
        
        .selected-tag-stats {
          background-color: #e8f0fe;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .selected-tag-stats p {
          margin: 0.4rem 0;
          font-size: 0.9rem;
        }
        
        .selected-tag-stats button {
          margin-top: 0.7rem;
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.4rem 0.8rem;
          font-size: 0.9rem;
          cursor: pointer;
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
}