// src/core/hooks/useLocalStorageService.ts
"use client"

import { useState, useEffect, useCallback } from 'react';

/**
 * A hook that provides a standardized interface for interacting
 * with local storage, including serialization and error handling
 * 
 * @param {string} key - The storage key
 * @param {any} initialValue - Default value if key doesn't exist
 * @returns {array} [storedValue, setValue, removeValue]
 */
export const useLocalStorageService = (key: string, initialValue: any) => {
  // State to store our value
  const [storedValue, setStoredValue] = useState(initialValue);
  
  // Get stored value from localStorage or use initialValue
  const getStoredValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error getting ${key} from localStorage:`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  // Initialize stored value on mount
  useEffect(() => {
    setStoredValue(getStoredValue());
  }, [getStoredValue]);

  // Return a wrapped version of useState's setter function
  const setValue = useCallback((value: any) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        if (valueToStore !== undefined) {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      }
    } catch (error) {
      console.error(`Error setting ${key} in localStorage:`, error);
    }
  }, [key, storedValue]);

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  }, [key, initialValue]);

  // Update local state if localStorage changes in another tab
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === key) {
        setStoredValue(getStoredValue());
      }
    }
    
    // Listen for storage changes
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [key, getStoredValue]);

  return [storedValue, setValue, removeValue];
};

/**
 * A utility to create storage service for specific features
 * to provide more structure and namespacing
 * 
 * @param {string} feature - Feature name for namespacing
 * @returns {object} Storage methods scoped to the feature
 */
export const createFeatureStorage = (feature: string) => {
  const prefix = `app_${feature}_`;
  
  // Check if we're in the browser
  const isBrowser = typeof window !== 'undefined';
  
  return {
    /**
     * Get value for a feature-specific key
     * @param {string} key - The key within the feature namespace
     * @param {any} defaultValue - Default value if not found
     */
    get: (key: string, defaultValue: any = null) => {
      if (!isBrowser) return defaultValue;
      
      try {
        const value = localStorage.getItem(`${prefix}${key}`);
        return value ? JSON.parse(value) : defaultValue;
      } catch (error) {
        console.error(`Error getting ${key} from ${feature} storage:`, error);
        return defaultValue;
      }
    },
    
    /**
     * Set value for a feature-specific key
     * @param {string} key - The key within the feature namespace
     * @param {any} value - Value to store
     */
    set: (key: string, value: any) => {
      if (!isBrowser) return;
      
      try {
        localStorage.setItem(`${prefix}${key}`, JSON.stringify(value));
      } catch (error) {
        console.error(`Error setting ${key} in ${feature} storage:`, error);
      }
    },
    
    /**
     * Remove a key from feature-specific storage
     * @param {string} key - The key within the feature namespace
     */
    remove: (key: string) => {
      if (!isBrowser) return;
      
      try {
        localStorage.removeItem(`${prefix}${key}`);
      } catch (error) {
        console.error(`Error removing ${key} from ${feature} storage:`, error);
      }
    },
    
    /**
     * Clear all keys for this feature
     */
    clear: () => {
      if (!isBrowser) return;
      
      try {
        Object.keys(localStorage)
          .filter(key => key.startsWith(prefix))
          .forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.error(`Error clearing ${feature} storage:`, error);
      }
    }
  };
};