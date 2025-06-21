#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the sample data
const dataPath = '/Users/mokenly/Documents/OpenSourceLife/code/prosperity-simulation-1750452563026.json';
const sampleData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const activityId = 'mc58dvbn_eds5c';
const baseUrl = 'https://app.socialinsight.tools/api/activities';

async function loadData() {
  try {
    console.log('🔍 Checking if activity exists...');
    
    // First try to get the activity
    const getResponse = await fetch(`${baseUrl}/${activityId}`);
    
    if (getResponse.status === 404) {
      console.log('❌ Activity not found or API endpoints not available');
      console.log('Response status:', getResponse.status);
      console.log('Response text:', await getResponse.text());
      return;
    }
    
    if (!getResponse.ok) {
      console.log('❌ Error getting activity:', getResponse.status, getResponse.statusText);
      return;
    }
    
    const activity = await getResponse.json();
    console.log('✅ Activity found:', activity.id);
    
    // Try the new load-data endpoint
    console.log('📤 Attempting to load data using new endpoint...');
    const loadResponse = await fetch(`${baseUrl}/${activityId}/load-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleData)
    });
    
    if (loadResponse.ok) {
      const result = await loadResponse.json();
      console.log('✅ Data loaded successfully:', result);
      return;
    }
    
    console.log('❌ Load-data endpoint failed:', loadResponse.status, loadResponse.statusText);
    
    // Fallback: Load data using individual endpoints
    console.log('🔄 Falling back to individual API calls...');
    
    // Load participants
    if (sampleData.participants) {
      console.log(`📤 Loading ${sampleData.participants.length} participants...`);
      for (const participant of sampleData.participants) {
        try {
          const response = await fetch(`${baseUrl}/${activityId}/participants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(participant)
          });
          if (!response.ok) {
            console.log(`⚠️  Failed to add participant ${participant.id}: ${response.status}`);
          }
        } catch (error) {
          console.log(`⚠️  Error adding participant ${participant.id}:`, error.message);
        }
      }
    }
    
    // Load tags
    if (sampleData.tags) {
      console.log(`📤 Loading ${sampleData.tags.length} tags...`);
      for (const tag of sampleData.tags) {
        try {
          const response = await fetch(`${baseUrl}/${activityId}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tag)
          });
          if (!response.ok) {
            console.log(`⚠️  Failed to add tag ${tag.id}: ${response.status}`);
          }
        } catch (error) {
          console.log(`⚠️  Error adding tag ${tag.id}:`, error.message);
        }
      }
    }
    
    // Load mappings
    if (sampleData.mappings) {
      console.log(`📤 Loading ${sampleData.mappings.length} mappings...`);
      for (const mapping of sampleData.mappings) {
        try {
          const response = await fetch(`${baseUrl}/${activityId}/mappings/${mapping.userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ positions: mapping.positions })
          });
          if (!response.ok) {
            console.log(`⚠️  Failed to add mapping for ${mapping.userId}: ${response.status}`);
          }
        } catch (error) {
          console.log(`⚠️  Error adding mapping for ${mapping.userId}:`, error.message);
        }
      }
    }
    
    // Update phase
    if (sampleData.phase) {
      console.log(`📤 Setting phase to ${sampleData.phase}...`);
      try {
        const response = await fetch(`${baseUrl}/${activityId}/phase`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase: sampleData.phase })
        });
        if (!response.ok) {
          console.log(`⚠️  Failed to set phase: ${response.status}`);
        }
      } catch (error) {
        console.log(`⚠️  Error setting phase:`, error.message);
      }
    }
    
    console.log('✅ Data loading completed (using fallback method)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
loadData();