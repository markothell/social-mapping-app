// src/core/services/mongoDbService.ts
"use client"

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Helper function to sanitize data for MongoDB - place this outside the object
function structureSanitizeForMongoDB(data: any) {
  // Deep clone the object to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Ensure these fields exist with proper values
  if (!sanitized.type || !['mapping', 'ranking'].includes(sanitized.type)) {
    sanitized.type = 'mapping'; // Default to mapping if type is invalid
  }
  
  // Make sure dates are properly formatted as strings
  if (sanitized.createdAt) {
    sanitized.createdAt = new Date(sanitized.createdAt).toISOString();
  } else {
    sanitized.createdAt = new Date().toISOString();
  }
  
  if (sanitized.updatedAt) {
    sanitized.updatedAt = new Date(sanitized.updatedAt).toISOString();
  } else {
    sanitized.updatedAt = new Date().toISOString();
  }
  
  // Ensure settings object exists with required fields
  if (!sanitized.settings) {
    sanitized.settings = {};
  }
  
  // Ensure entryView exists
  if (!sanitized.settings.entryView) {
    sanitized.settings.entryView = { 
      title: sanitized.id || 'Untitled Activity',
      description: '' 
    };
  }
  
  // Ensure required settings exist based on activity type - use merge instead of replace
  if (sanitized.type === 'mapping') {
    const defaultMapping = {
      xAxisMinLabel: "Don't Know",
      xAxisMaxLabel: 'Know',
      yAxisMinLabel: "Don't Like",
      yAxisMaxLabel: 'Like',
      gridSize: 4,
      enableAnnotations: true,
      maxAnnotationLength: 280
    };
    sanitized.settings.mapping = {
      ...defaultMapping,
      ...sanitized.settings.mapping
    };
  }
  
  if (sanitized.type === 'ranking') {
    const defaultRanking = {
      orderType: 'ascending',
      context: 'of importance',
      topRankMeaning: 'most important'
    };
    sanitized.settings.ranking = {
      ...defaultRanking,
      ...sanitized.settings.ranking
    };
  }
  
  // Ensure tag creation settings exist - use merge instead of replace
  const defaultTagCreation = {
    instruction: 'Add tags for the activity',
    enableVoting: true,
    voteThreshold: 2
  };
  sanitized.settings.tagCreation = {
    ...defaultTagCreation,
    ...sanitized.settings.tagCreation
  };
  
  // Ensure these arrays exist
  sanitized.participants = sanitized.participants || [];
  sanitized.tags = sanitized.tags || [];
  sanitized.mappings = sanitized.mappings || [];
  sanitized.rankings = sanitized.rankings || [];
  
  // FIX: Ensure each participant has a name field
  sanitized.participants = sanitized.participants.map(participant => {
    if (!participant.name && participant.id) {
      // If participant has no name but has an ID, set a default name
      return {
        ...participant,
        name: participant.userName || `User ${participant.id.substring(0, 6)}`
      };
    }
    return participant;
  });
  
  // Make sure phase is a valid value
  const validPhases = ['gathering', 'tagging', 'mapping', 'mapping-results', 'ranking', 'results'];
  if (!sanitized.phase || !validPhases.includes(sanitized.phase)) {
    sanitized.phase = 'gathering';
  }
  
  // Make sure status is a valid value
  if (!sanitized.status || !['active', 'completed'].includes(sanitized.status)) {
    sanitized.status = 'active';
  }
  
  // Ensure ownership fields exist with defaults for backward compatibility
  if (!sanitized.ownerId) {
    sanitized.ownerId = 'teleodelic@gmail.com';
  }
  
  if (!sanitized.ownerName) {
    sanitized.ownerName = 'Mo';
  }
  
  // Ensure permissions object exists with defaults
  if (!sanitized.permissions) {
    sanitized.permissions = {
      isPublic: true,
      allowGuestParticipants: true,
      visibility: 'public'
    };
  } else {
    // Ensure all permission fields have valid values
    if (typeof sanitized.permissions.isPublic !== 'boolean') {
      sanitized.permissions.isPublic = true;
    }
    if (typeof sanitized.permissions.allowGuestParticipants !== 'boolean') {
      sanitized.permissions.allowGuestParticipants = true;
    }
    if (!sanitized.permissions.visibility || !['public', 'unlisted', 'private'].includes(sanitized.permissions.visibility)) {
      sanitized.permissions.visibility = 'public';
    }
  }
  
  return sanitized;
}


// Export the service as an object with methods
export const mongoDbService = {
  // Activities
  async getActivities() {
    try {
      console.log('Fetching activities from:', `${API_BASE_URL}/activities`);
      const response = await axios.get(`${API_BASE_URL}/activities`);
      return response.data;
    } catch (error) {
      console.warn('Error fetching activities:', error);
      return [];
    }
  },
  
  async getActivityById(id: string) {
    try {
      console.log(`MongoDB Service: Fetching activity ${id} from:`, `${API_BASE_URL}/activities/${id}`);
      const response = await axios.get(`${API_BASE_URL}/activities/${id}`);
      console.log(`MongoDB Service: Successfully fetched activity ${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.warn(`MongoDB Service: Error fetching activity ${id}:`, 
          `Status: ${error.response.status}`, 
          `Message: ${error.response.data?.message || 'No message'}`);
      } else if (error.request) {
        console.warn(`MongoDB Service: No response received when fetching activity ${id}:`, error.message);
      } else {
        console.warn(`MongoDB Service: Error setting up request for activity ${id}:`, error.message);
      }
      return null;
    }
  },
  
  async createActivity(activity: any) {
    try {
      // Sanitize the activity data
      const sanitizedActivity = structureSanitizeForMongoDB(activity);
      
      console.log('Creating activity:', sanitizedActivity.id);
      console.log('Activity type:', sanitizedActivity.type);
      console.log('Activity phase:', sanitizedActivity.phase);
      
      const response = await axios.post(`${API_BASE_URL}/activities`, sanitizedActivity);
      return response.data;
    } catch (error: any) {
      // Detailed error logging
      if (error.response) {
        console.error(`MongoDB create error (${error.response.status}):`, 
          error.response.data?.message || error.response.data || 'Unknown error');
        
        // Log more details about the error
        if (error.response.data && error.response.data.details) {
          console.error('Error details:', error.response.data.details);
        }
        
        if (error.response.data && error.response.data.errors) {
          console.error('Validation errors:', error.response.data.errors);
        }
      } else if (error.request) {
        console.error('MongoDB create error: No response received');
      } else {
        console.error('MongoDB create error:', error.message);
      }
      return null;
    }
  },
  
  // Update the updateActivity method in mongoDbService.ts with retry logic
  async updateActivity(id: string, updates: any, retryCount = 0, maxRetries = 3) {
    try {
      console.log(`MongoDB Service: Updating activity ${id} directly (attempt ${retryCount + 1}/${maxRetries + 1})`);
      console.log(`MongoDB Service: Original updates object:`, JSON.stringify(updates, null, 2));
      
      // Transform dates to strings to avoid transmission issues
      const sanitizedUpdates = structureSanitizeForMongoDB(updates);
      console.log(`MongoDB Service: Sanitized updates object:`, JSON.stringify(sanitizedUpdates, null, 2));
      
      // Ensure we're only updating fields that are allowed
      const allowedFields = [
        'settings', 'status', 'phase', 'tags', 'mappings', 'rankings', 'participants', 'updatedAt'
      ];
      
      const filteredUpdates = {};
      allowedFields.forEach(field => {
        if (sanitizedUpdates[field] !== undefined) {
          filteredUpdates[field] = sanitizedUpdates[field];
        }
      });
      
      // For participant updates, make sure we're handling them correctly
      if (filteredUpdates['participants']) {
        // Ensure each participant has a name and isConnected property
        filteredUpdates['participants'] = filteredUpdates['participants'].map(p => ({
          ...p,
          name: p.name || p.userName || `User-${p.id.substring(0, 6)}`,
          isConnected: typeof p.isConnected === 'boolean' ? p.isConnected : true
        }));
        
        // Filter out any duplicates by ID
        const uniqueParticipants = [];
        const participantIds = new Set();
        
        filteredUpdates['participants'].forEach(p => {
          if (!participantIds.has(p.id)) {
            participantIds.add(p.id);
            uniqueParticipants.push(p);
          }
        });
        
        filteredUpdates['participants'] = uniqueParticipants;
      }
      
      // Add a fresh timestamp to ensure version change
      filteredUpdates['updatedAt'] = new Date().toISOString();
      
      console.log(`MongoDB Service: Final filtered updates being sent:`, JSON.stringify(filteredUpdates, null, 2));
      
      // Send update request
      try {
        const response = await axios.patch(`${API_BASE_URL}/activities/${id}`, filteredUpdates);
        console.log(`MongoDB Service: Update response received:`, JSON.stringify(response.data, null, 2));
        return response.data;
      } catch (error: any) {
        // Handle 404 errors by creating the activity instead
        if (error.response && error.response.status === 404) {
          console.log(`Activity ${id} not found for update, creating it instead`);
          return this.createActivity({...updates, id});
        }
        
        // Handle version conflict errors with retry logic
        if (error.response && 
            error.response.status === 400 && 
            error.response.data && 
            (error.response.data.message === 'Validation error' || 
             error.response.data.details?.includes('No matching document found'))) {
          
          // If we haven't exceeded max retries, get fresh data and retry
          if (retryCount < maxRetries) {
            console.log(`MongoDB Service: Version conflict for activity ${id}, retrying (${retryCount + 1}/${maxRetries})`);
            
            // Get fresh data
            const freshActivity = await this.getActivityById(id);
            if (freshActivity) {
              // If we're updating participants, merge carefully
              if (updates.participants && freshActivity.participants) {
                // Create a map of existing participants
                const existingParticipantsMap = new Map();
                freshActivity.participants.forEach(p => {
                  existingParticipantsMap.set(p.id, p);
                });
                
                // Process updates.participants and merge with existing
                updates.participants.forEach(updatedParticipant => {
                  if (existingParticipantsMap.has(updatedParticipant.id)) {
                    // Update existing participant
                    const existingParticipant = existingParticipantsMap.get(updatedParticipant.id);
                    existingParticipantsMap.set(updatedParticipant.id, {
                      ...existingParticipant,
                      ...updatedParticipant
                    });
                  } else {
                    // Add new participant
                    existingParticipantsMap.set(updatedParticipant.id, updatedParticipant);
                  }
                });
                
                // Convert map back to array
                const mergedParticipants = Array.from(existingParticipantsMap.values());
                
                // Update the participants array
                updates = {
                  ...updates,
                  participants: mergedParticipants
                };
              }
              
              // Wait a short time before retrying to avoid race conditions
              await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
              
              // Retry the update with a backoff
              return this.updateActivity(id, updates, retryCount + 1, maxRetries);
            }
          }
        }
        
        throw error; // Re-throw for other types of errors
      }
    } catch (error: any) {
      if (error.response) {
        console.error(`Error updating activity ${id}:`, 
          `Status: ${error.response.status}`, 
          `Message:`, error.response.data);
      } else {
        console.error(`Error updating activity ${id}:`, error);
      }
      
      // For the last retry attempt, try to recover by getting the latest data
      if (retryCount >= maxRetries) {
        console.log(`MongoDB Service: Max retries reached for activity ${id}, returning latest data`);
        return this.getActivityById(id);
      }
      
      return null;
    }
  },
  
  async deleteActivity(id: string) {
    try {
      console.log(`MongoDB Service: Attempting to delete activity ${id}`);
      
      const response = await axios.delete(`${API_BASE_URL}/activities/${id}`);
      console.log(`MongoDB Service: Successfully deleted activity ${id}`);
      return true;
    } catch (error: any) {
      // Check if this is a 404 (Not Found) error
      if (error.response && error.response.status === 404) {
        console.log(`Activity ${id} not found in MongoDB, considering deletion successful`);
        return true; // Consider it a success if the activity doesn't exist
      }
      
      console.error(`MongoDB Service: Error deleting activity ${id}:`, error);
      return false; // Return false for other errors instead of throwing
    }
  },
  
  // Participants
  async addParticipant(activityId: string, participant: any) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/activities/${activityId}/participants`, 
        participant
      );
      return response.data;
    } catch (error) {
      console.error(`Error adding participant to activity ${activityId}:`, error);
      return null;
    }
  },
  
  async updateParticipant(activityId: string, participantId: string, updates: any) {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/activities/${activityId}/participants/${participantId}`, 
        updates
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating participant ${participantId}:`, error);
      return null;
    }
  },
  
  async removeParticipant(activityId: string, participantId: string) {
    try {
      await axios.delete(`${API_BASE_URL}/activities/${activityId}/participants/${participantId}`);
      return true;
    } catch (error) {
      console.error(`Error removing participant ${participantId}:`, error);
      return false;
    }
  },
  
  // Tags
  async addTag(activityId: string, tag: any) {
    try {
      const response = await axios.post(`${API_BASE_URL}/activities/${activityId}/tags`, tag);
      return response.data;
    } catch (error) {
      console.error(`Error adding tag to activity ${activityId}:`, error);
      return null;
    }
  },
  
  async updateTag(activityId: string, tagId: string, updates: any) {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/activities/${activityId}/tags/${tagId}`, 
        updates
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating tag ${tagId}:`, error);
      return null;
    }
  },
  
  async deleteTag(activityId: string, tagId: string) {
    try {
      await axios.delete(`${API_BASE_URL}/activities/${activityId}/tags/${tagId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting tag ${tagId}:`, error);
      return false;
    }
  },
  
  // Mappings
  async updateMappings(activityId: string, userId: string, positions: any[]) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/activities/${activityId}/mappings/${userId}`, 
        { positions }
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating mappings for user ${userId}:`, error);
      return null;
    }
  },
  
  async completeMappings(activityId: string, userId: string) {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/activities/${activityId}/mappings/${userId}/complete`
      );
      return response.data;
    } catch (error) {
      console.error(`Error completing mappings for user ${userId}:`, error);
      return null;
    }
  }
};