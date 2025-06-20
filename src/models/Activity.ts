// src/models/Activity.ts
// 
// ⚠️  CRITICAL: DUAL MODEL ARCHITECTURE ⚠️
// This TypeScript interface MUST stay in sync with server/models/Activity.js (MongoDB schema)
// 
// When updating this model:
// 1. Update this TypeScript interface
// 2. Update server/models/Activity.js MongoDB schema  
// 3. Restart the backend server (node websocket-server.js)
// 4. Test that data saves/loads correctly
//
// Common issue: Frontend saves data but backend schema strips unknown fields
// Solution: Always update BOTH models when adding new fields

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
  instanceId?: string; // For multiple instances of the same tag
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
    thresholdType: 'off' | 'minimum' | 'topN';
    minimumVotes?: number;
    topNCount?: number;
  };
  mapping?: {
    xAxisMinLabel: string;
    xAxisMaxLabel: string;
    yAxisMinLabel: string;
    yAxisMaxLabel: string;
    gridSize: number;
    enableAnnotations: boolean;
    maxAnnotationLength: number;
    instruction?: string;
  };
  ranking?: {
    orderType: 'ascending' | 'descending';
    context: string;
    topRankMeaning: string;
  };
  results?: {
    instruction?: string;
  };
}

export interface Activity {
  id: string;
  type: 'mapping' | 'ranking';
  settings: ActivitySettings;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  status: 'active' | 'completed';
  participants: Participant[];
  phase: 'gathering' | 'tagging' | 'mapping' | 'mapping-results' | 'ranking' | 'results';
  tags: Tag[];
  mappings: Mapping[];
  rankings: Ranking[];
  hostName?: string;
  ownerId: string;
  ownerName: string;
  permissions: {
    isPublic: boolean;
    allowGuestParticipants: boolean;
    visibility: 'public' | 'unlisted' | 'private';
  };
}

export function createDefaultActivity(type: 'mapping' | 'ranking', title: string): Activity {
  const now = new Date();
  
  // More reliable unique ID generation
  const timestamp = now.getTime().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  const id = `${timestamp}_${random}`;
  
  const commonSettings = {
    entryView: {
      title: title || 'New Activity',
      description: ''
    },
    tagCreation: {
      instruction: 'Add tags for the activity',
      enableVoting: true,
      voteThreshold: 1,
      thresholdType: 'minimum',
      minimumVotes: 1
    }
  };
  
  const mappingSettings = {
    ...commonSettings,
    mapping: {
      xAxisMinLabel: "Don't Know",
      xAxisMaxLabel: 'Know',
      yAxisMinLabel: "Don't Like",
      yAxisMaxLabel: 'Like',
      gridSize: 4,
      enableAnnotations: true,
      maxAnnotationLength: 280,
      instruction: 'Position each tag on the grid according to your perspective. You can add comments to explain your choices.'
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
    id,
    type,
    settings: type === 'mapping' ? mappingSettings : rankingSettings,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    participants: [],
    phase: 'gathering',
    tags: [],
    mappings: [],
    rankings: [],
    ownerId: 'teleodelic@gmail.com',
    ownerName: 'Mo',
    permissions: {
      isPublic: true,
      allowGuestParticipants: true,
      visibility: 'public'
    }
  };
}