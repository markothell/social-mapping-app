//server/models/Activity.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the participant schema
const participantSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },  // This is the field causing the validation error
  isConnected: { type: Boolean, default: false },
  hasCompletedTagging: { type: Boolean }
});

// Define vote schema
const voteSchema = new Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Define comment schema
const commentSchema = new Schema({
  id: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Define tag schema
const tagSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  creatorId: { type: String, required: true },
  creatorName: String,
  votes: [voteSchema],
  comments: [commentSchema],
  commentCount: { type: Number, default: 0 },
  hasNewComments: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
});

// Define position schema for mappings
const positionSchema = new Schema({
  tagId: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  annotation: String
});

// Define mapping schema
const mappingSchema = new Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  positions: [positionSchema],
  isComplete: { type: Boolean, default: false }
});

// Define ranking item schema
const rankingItemSchema = new Schema({
  tagId: { type: String, required: true },
  rank: { type: Number, required: true },
  note: String
});

// Define ranking schema
const rankingSchema = new Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  items: [rankingItemSchema],
  isComplete: { type: Boolean, default: false }
});

// Define settings schema
const settingsSchema = new Schema({
  entryView: {
    title: String,
    description: String
  },
  tagCreation: {
    instruction: String,
    enableVoting: { type: Boolean, default: true },
    voteThreshold: { type: Number, default: 2 }
  },
  mapping: {
    xAxisLabel: String,
    xAxisLeftLabel: String,
    xAxisRightLabel: String,
    yAxisLabel: String,
    yAxisTopLabel: String,
    yAxisBottomLabel: String,
    gridSize: { type: Number, default: 4 },
    enableAnnotations: { type: Boolean, default: true },
    maxAnnotationLength: { type: Number, default: 280 }
  },
  ranking: {
    orderType: { type: String, enum: ['ascending', 'descending'], default: 'ascending' },
    context: String,
    topRankMeaning: String
  }
});

// Define the main Activity schema
const activitySchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['mapping', 'ranking'],
    required: true
  },
  settings: settingsSchema,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['active', 'completed'],
    default: 'active'
  },
  participants: [participantSchema],
  phase: { 
    type: String, 
    enum: ['gathering', 'tagging', 'mapping', 'mapping-results', 'ranking', 'results'],
    default: 'gathering'
  },
  tags: [tagSchema],
  mappings: [mappingSchema],
  rankings: [rankingSchema]
});

module.exports = mongoose.model('Activity', activitySchema);