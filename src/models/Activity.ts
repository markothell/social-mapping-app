// src/models/Activity.ts

export interface User {
  id: string;
  name: string;
}

export interface Participant extends User {
  isConnected: boolean;
  hasCompletedTagging?: boolean;
}

export interface Tag {
  id: string;
  text: string;
  creatorId: string;
  creatorName?: string;
  votes: Vote[];
  comments: Comment[];
  commentCount: number;
  hasNewComments: boolean;
  status: 'pending' | 'approved' | 'rejected';
  seenBy?: Set<string>;
}

export interface Vote {
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
}

export interface Position {
  tagId: string;
  x: number;
  y: number;
  annotation?: string;
}

export interface Mapping {
  userId: string;
  userName: string;
  positions: Position[];
  isComplete: boolean;
}

export interface Ranking {
  userId: string;
  userName: string;
  items: {
    tagId: string;
    rank: number;
    note?: string;
  }[];
  isComplete: boolean;
}

export interface ActivitySettings {
  entryView?: {
    title?: string;
    description?: string;
  };
  tagCreation?: {
    instruction: string;
    enableVoting: boolean;
    voteThreshold: number;
  };
  mapping?: {
    xAxisLabel: string;
    xAxisLeftLabel: string;
    xAxisRightLabel: string;
    yAxisLabel: string;
    yAxisTopLabel: string;
    yAxisBottomLabel: string;
    gridSize: number;
    enableAnnotations: boolean;
    maxAnnotationLength: number;
  };
  ranking?: {
    orderType: 'ascending' | 'descending';
    context: string;
    topRankMeaning: string;
  };
}

export interface Activity {
  id: string;
  type: 'mapping' | 'ranking';
  settings: ActivitySettings;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed';
  participants: Participant[];
  phase: 'gathering' | 'tagging' | 'mapping' | 'mapping-results' | 'ranking' | 'results';
  tags: Tag[];
  mappings: Mapping[];
  rankings: Ranking[];
}

export function createDefaultActivity(type: 'mapping' | 'ranking', title: string): Activity {
  const now = new Date();
  
  const commonSettings = {
    entryView: {
      title: title || 'New Activity',
      description: ''
    },
    tagCreation: {
      instruction: 'Add tags for the activity',
      enableVoting: true,
      voteThreshold: 2
    }
  };
  
  const mappingSettings = {
    ...commonSettings,
    mapping: {
      xAxisLabel: 'Knowledge',
      xAxisLeftLabel: "Don't Know",
      xAxisRightLabel: 'Know',
      yAxisLabel: 'Preference',
      yAxisTopLabel: 'Like',
      yAxisBottomLabel: "Don't Like",
      gridSize: 4,
      enableAnnotations: true,
      maxAnnotationLength: 280
    }
  };
  
  const rankingSettings = {
    ...commonSettings,
    ranking: {
      orderType: 'ascending',
      context: 'of importance',
      topRankMeaning: 'most important'
    }
  };
  
  return {
    id: Math.random().toString(36).substring(2, 9),
    type,
    settings: type === 'mapping' ? mappingSettings : rankingSettings,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    participants: [],
    phase: 'gathering',
    tags: [],
    mappings: [],
    rankings: []
  };
}