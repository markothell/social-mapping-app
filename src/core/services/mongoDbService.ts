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
  
  // Ensure required settings exist based on activity type
  if (sanitized.type === 'mapping' && !sanitized.settings.mapping) {
    sanitized.settings.mapping = {
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
  }
  
  if (sanitized.type === 'ranking' && !sanitized.settings.ranking) {
    sanitized.settings.ranking = {
      orderType: 'ascending',
      context: 'of importance',
      topRankMeaning: 'most important'
    };
  }
  
  // Ensure tag creation settings exist
  if (!sanitized.settings.tagCreation) {
    sanitized.settings.tagCreation = {
      instruction: 'Add tags for the activity',
      enableVoting: true,
      voteThreshold: 2
    };
  }
  
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
  
  // Update the updateActivity method in mongoDbService.ts
  async updateActivity(id: string, updates: any) {
    try {
      console.log(`MongoDB Service: Updating activity ${id} directly`);
      
      // Transform dates to strings to avoid transmission issues
      const sanitizedUpdates = structureSanitizeForMongoDB(updates);
      
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
      
      // Send update request directly without checking first
      try {
        const response = await axios.patch(`${API_BASE_URL}/activities/${id}`, filteredUpdates);
        return response.data;
      } catch (error: any) {
        // Handle 404 errors by creating the activity instead
        if (error.response && error.response.status === 404) {
          console.log(`Activity ${id} not found for update, creating it instead`);
          return this.createActivity(updates);
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