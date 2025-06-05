// src/utils/mappingDataUtils.ts

/**
 * Utility functions for processing and analyzing mapping data
 */


/**
 * Calculate the size of a tag circle based on variance
 * Higher consensus (lower variance) = smaller circle
 * Lower consensus (higher variance) = larger circle
 * @param consensus - A value between 0 and 1, where 1 is perfect consensus
 * @param count - The number of mappings for this tag
 * @returns Size in rem units 
 */
export function calculateTagSize(consensus: number, count: number): {
  size: number;
  fontSize: number;
  maxChars: number;
} {
  // Ensure count is at least 1 to avoid division by zero
  const mappingCount = Math.max(1, count);
  
  // Base size calculations
  const minSize = 2.5; // Minimum size in rem
  const maxSize = 6; // Maximum size in rem
  
  // Calculate circle size based on consensus value:
  // - High consensus (consensus close to 1) → smaller circle
  // - Low consensus (consensus close to 0) → larger circle
  const inverseConsensus = 1 - (consensus || 0); // Convert to a value where higher means larger
  let size = minSize + (inverseConsensus * (maxSize - minSize));
  
  // Adjust for mapping count - more mappings means slightly larger circles
  const countFactor = Math.min(0.5, (Math.log(mappingCount) / 10)); // Logarithmic scale
  size += countFactor;
  
  // Now determine font size based on circle size
  const fontSize = Math.max(0.7, size * 0.3); // Scale font proportionally
  
  // Calculate how many characters can fit
  // Assume each character is roughly 0.5rem wide for the calculated font size
  const circleWidth = size * 0.8; // Available width is less than circle diameter
  const charWidth = fontSize * 0.5; // Approximate width of a character
  const maxChars = Math.floor(circleWidth / charWidth);
  
  return {
    size,
    fontSize,
    maxChars: Math.max(3, maxChars) // Ensure at least 3 characters are shown
  };
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

/**
 * Calculate which quadrant each tag appears in most frequently
 */
export function calculateQuadrantStats(
  mappings: Mapping[],
  tags: Tag[],
  settings: any
) {
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
      
      if (tagQuadrants[pos.tagId]) {
        tagQuadrants[pos.tagId][quadrant]++;
      }
    });
  });
  
  // Find dominant quadrant for each tag
  tags.forEach(tag => {
    const tagCounts = tagQuadrants[tag.id];
    if (!tagCounts) return;
    
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
  
  return quadStats;
}

/**
 * Generate data for the heatmap visualization
 */
export function generateHeatmapData(
  mappings: Mapping[],
  resolution = 20
): Array<{ x: number; y: number; value: number }> {
  // Create a grid for the heatmap
  const grid = Array(resolution).fill(0).map(() => Array(resolution).fill(0));
  
  // Count positions in each cell
  mappings.forEach(mapping => {
    mapping.positions.forEach(pos => {
      // Convert position to grid indices
      const x = Math.min(resolution - 1, Math.floor(pos.x * resolution));
      const y = Math.min(resolution - 1, Math.floor((1 - pos.y) * resolution)); // Invert y for display
      
      // Increment counter
      grid[y][x]++;
    });
  });
  
  // Convert grid to heatmap data points
  const data: Array<{ x: number; y: number; value: number }> = [];
  
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      if (grid[y][x] > 0) {
        data.push({
          x: (x + 0.5) / resolution, // Center in the cell
          y: (y + 0.5) / resolution,
          value: grid[y][x],
        });
      }
    }
  }
  
  return data;
}

/**
 * Calculate the average position for each tag across all mappings
 */
export function calculateAveragePositions(
  mappings: Mapping[], 
  tags: Tag[]
): Record<string, { x: number; y: number; count: number; text: string }> {
  const aggregatePositions: Record<string, {
    x: number;
    y: number;
    count: number;
    text: string;
  }> = {};
  
  // Initialize with all tags (even those without positions)
  tags.forEach(tag => {
    aggregatePositions[tag.id] = {
      x: 0,
      y: 0,
      count: 0,
      text: tag.text,
    };
  });
  
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
    if (pos.count > 0) {
      pos.x /= pos.count;
      pos.y /= pos.count;
    }
  });
  
  return aggregatePositions;
}

/**
 * Calculate standard deviations for tag positions
 */
export function calculateStandardDeviations(
  mappings: Mapping[],
  averagePositions: Record<string, { x: number; y: number; count: number; text: string }>
): Record<string, { stdDevX: number; stdDevY: number; consensus: number }> {
  const stdDeviations: Record<string, {
    stdDevX: number;
    stdDevY: number;
    consensus: number;
  }> = {};
  
  // For each tag with positions
  Object.keys(averagePositions).forEach(tagId => {
    const avgPos = averagePositions[tagId];
    
    // Skip tags without any positions
    if (avgPos.count === 0) {
      stdDeviations[tagId] = {
        stdDevX: 0,
        stdDevY: 0,
        consensus: 0,
      };
      return;
    }
    
    let sumSquaredDiffX = 0;
    let sumSquaredDiffY = 0;
    
    // Sum squared differences
    mappings.forEach(mapping => {
      const position = mapping.positions.find(p => p.tagId === tagId);
      if (position) {
        sumSquaredDiffX += Math.pow(position.x - avgPos.x, 2);
        sumSquaredDiffY += Math.pow(position.y - avgPos.y, 2);
      }
    });
    
    // Calculate standard deviations
    const stdDevX = Math.sqrt(sumSquaredDiffX / avgPos.count);
    const stdDevY = Math.sqrt(sumSquaredDiffY / avgPos.count);
    
    // Calculate consensus (inverse of combined standard deviation)
    // Normalize so that 0 means no consensus, 1 means perfect consensus
    const combinedStdDev = (stdDevX + stdDevY) / 2;
    const consensus = Math.max(0, 1 - Math.min(1, combinedStdDev * 2));
    
    stdDeviations[tagId] = {
      stdDevX,
      stdDevY,
      consensus,
    };
  });
  
  return stdDeviations;
}

/**
 * Collect all annotations for a specific tag
 */
export function getTagAnnotations(
  mappings: Mapping[],
  tagId: string
): Array<{ text: string; userName: string }> {
  const annotations: Array<{ text: string; userName: string }> = [];
  
  mappings.forEach(mapping => {
    const position = mapping.positions.find(p => p.tagId === tagId);
    if (position && position.annotation) {
      annotations.push({
        text: position.annotation,
        userName: mapping.userName
      });
    }
  });
  
  return annotations;
}

/**
 * Format mapping data as CSV
 */
export function formatMappingsAsCSV(
  mappings: Mapping[],
  tags: Tag[]
): string {
  // Create header row
  const header = 'Tag ID,Tag Text,Participant ID,Participant Name,X Position,Y Position,Annotation\n';
  
  // Create data rows
  const rows = mappings.flatMap(mapping => {
    return mapping.positions.map(pos => {
      const tag = tags.find(t => t.id === pos.tagId);
      const tagText = tag?.text || pos.text || pos.tagId;
      // Escape quotes in text fields
      const escapedTagText = `"${tagText.replace(/"/g, '""')}"`;
      const escapedUserName = `"${mapping.userName.replace(/"/g, '""')}"`;
      const annotation = pos.annotation 
        ? `"${pos.annotation.replace(/"/g, '""')}"` 
        : '';
      
      return `${pos.tagId},${escapedTagText},${mapping.userId},${escapedUserName},${pos.x},${pos.y},${annotation}`;
    });
  });
  
  // Combine header and rows
  return header + rows.join('\n');
}

/**
 * Export mapping data as JSON
 */
export function formatMappingsAsJSON(
  mappings: Mapping[],
  tags: Tag[]
): string {
  const data = {
    tags,
    mappings,
  };
  
  return JSON.stringify(data, null, 2);
}