require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Activity = require('../server/models/Activity');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const activity = new Activity({
    id: 'test1234',
    type: 'mapping',
    settings: {
      entryView: { title: 'Seeded Activity', description: 'Development seed' },
      tagCreation: { enableVoting: true, voteThreshold: 1 },
      mapping: {},
      ranking: {}
    },
    participants: [],
    tags: [],
    mappings: [],
    rankings: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await activity.save();
  console.log('✅ Seeded activity created');
  await mongoose.disconnect();
};

seed();
