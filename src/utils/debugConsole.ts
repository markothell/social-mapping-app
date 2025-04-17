// src/utils/debugConsole.ts

/**
 * Enhanced logging utility for debugging
 * Add this file to your project to help track down issues
 */

// Configure logging levels
const LOG_LEVELS = {
  DEBUG: true,  // Set to false in production
  INFO: true,
  WARN: true,
  ERROR: true
};

// Tag deletion tracking
let tagDeletionAttempts = 0;
let tagDeletionSuccesses = 0;
let tagDeletionFailures = 0;
let lastFailedTagId = null;
let lastFailedReason = null;

export const debugConsole = {
  // Standard logging with prefixes
  debug: (message: string, ...args: any[]) => {
    if (!LOG_LEVELS.DEBUG) return;
    console.log(`[DEBUG] ${message}`, ...args);
  },
  
  info: (message: string, ...args: any[]) => {
    if (!LOG_LEVELS.INFO) return;
    console.log(`[INFO] ${message}`, ...args);
  },
  
  warn: (message: string, ...args: any[]) => {
    if (!LOG_LEVELS.WARN) return;
    console.warn(`[WARN] ${message}`, ...args);
  },
  
  error: (message: string, ...args: any[]) => {
    if (!LOG_LEVELS.ERROR) return;
    console.error(`[ERROR] ${message}`, ...args);
  },
  
  // Special function for tag tracking
  trackTagDeletion: {
    attempt: (tagId: string) => {
      tagDeletionAttempts++;
      debugConsole.info(`Tag deletion attempted: ${tagId} (Attempt #${tagDeletionAttempts})`);
    },
    
    success: (tagId: string) => {
      tagDeletionSuccesses++;
      debugConsole.info(`Tag deletion succeeded: ${tagId} (Success #${tagDeletionSuccesses}/${tagDeletionAttempts})`);
    },
    
    failure: (tagId: string, reason: string) => {
      tagDeletionFailures++;
      lastFailedTagId = tagId;
      lastFailedReason = reason;
      debugConsole.error(`Tag deletion failed: ${tagId} (Failure #${tagDeletionFailures}/${tagDeletionAttempts})`);
      debugConsole.error(`Reason: ${reason}`);
    },
    
    getStats: () => {
      return {
        attempts: tagDeletionAttempts,
        successes: tagDeletionSuccesses,
        failures: tagDeletionFailures,
        lastFailedTagId,
        lastFailedReason
      };
    }
  },
  
  // Function to track an object's state changes
  compareStates: (label: string, before: any, after: any) => {
    try {
      if (typeof before !== 'object' || typeof after !== 'object') {
        debugConsole.warn(`Cannot compare non-objects in compareStates: ${label}`);
        return;
      }
      
      // For arrays of objects with IDs (like tags)
      if (Array.isArray(before) && Array.isArray(after)) {
        const beforeIds = new Set(before.map((item: any) => item.id).filter(Boolean));
        const afterIds = new Set(after.map((item: any) => item.id).filter(Boolean));
        
        // Find items that were removed
        const removedIds = [...beforeIds].filter(id => !afterIds.has(id));
        if (removedIds.length > 0) {
          debugConsole.info(`${label}: Items removed: ${removedIds.join(', ')}`);
        } else {
          debugConsole.warn(`${label}: No items were removed despite deletion attempt`);
        }
        
        // Find items that were added
        const addedIds = [...afterIds].filter(id => !beforeIds.has(id));
        if (addedIds.length > 0) {
          debugConsole.info(`${label}: Items added: ${addedIds.join(', ')}`);
        }
        
        return;
      }
      
      // For regular objects
      const beforeKeys = Object.keys(before);
      const afterKeys = Object.keys(after);
      
      // Find changed properties
      for (const key of beforeKeys) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
          debugConsole.info(`${label}: "${key}" changed:`, { 
            before: before[key],
            after: after[key]
          });
        }
      }
    } catch (error) {
      debugConsole.error('Error in compareStates:', error);
    }
  }
};

// Add this to the window object for console access
if (typeof window !== 'undefined') {
  (window as any).debugConsole = debugConsole;
}

export default debugConsole;