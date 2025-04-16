"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import ResultsVisualizationGrid from './ResultsVisualizationGrid';
import TagDetailsPanel from './TagDetailsPanel';
import { calculateQuadrantStats, generateHeatmapData } from '@/utils/mappingDataUtils';

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
  const [viewMode, setViewMode] = useState<'aggregate' | 'individual' | 'heatmap'>('aggregate');
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'statistics' | 'comments'>('statistics');
  
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
  
  const heatmapData = useMemo(() => {
    return generateHeatmapData(mappings);
  }, [mappings]);
  
  // Get aggregate positions or participant positions
  const positions = useMemo(() => {
    if (viewMode === 'aggregate') {
      // Calculate average positions
      const aggregatePositions: Record<string, {
        x: number;
        y: number;
        count: number;
        text: string;
      }> = {};
      
      mappings.forEach(mapping => {
        mapping.positions.forEach(pos => {
          if (!aggregatePositions[pos.tagId]) {
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
      
      // Calculate averages
      Object.keys(aggregatePositions).forEach(tagId => {
        const pos = aggregatePositions[tagId];
        if (pos.count > 0) {
          pos.x /= pos.count;
          pos.y /= pos.count;
        }
      });
      
      return aggregatePositions;
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
  
  // Update active tab when selected tag changes - separate effect
  useEffect(() => {
    if (selectedTag) {
      setActiveTab('comments');
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
    const annotations: { text: string; userName: string }[] = [];
    
    mappings.forEach(mapping => {
      const position = mapping.positions.find(p => p.tagId === selectedTag);
      if (position && position.annotation) {
        annotations.push({
          text: position.annotation,
          userName: mapping.userName
        });
      }
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
      annotations
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
  
  // Calculate tag stats only when needed
  const tagStats = selectedTag ? getTagStats() : null;

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
        <ResultsVisualizationGrid
          settings={mappingSettings}
          viewMode={viewMode}
          positions={positions}
          selectedTag={selectedTag}
          heatmapData={heatmapData}
          tags={tags}
          onSelectTag={(tagId) => setSelectedTag(tagId === selectedTag ? null : tagId)}
        />
        
        <TagDetailsPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedTag={selectedTag}
          tagStats={tagStats}
          quadrantStats={quadrantStats}
          mappingSettings={mappingSettings}
          tags={tags}
          mappings={mappings}
          participants={participants}
          onSelectTag={(tagId) => setSelectedTag(tagId)}
          onClearSelection={() => setSelectedTag(null)}
        />
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
        
        @media (max-width: 992px) {
          .visualization-controls {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .visualization-container {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}