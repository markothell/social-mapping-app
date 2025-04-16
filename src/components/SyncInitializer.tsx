// src/components/SyncInitializer.tsx
"use client";

import { useEffect } from 'react';
import { syncService } from '@/core/services/syncService';

// This is a "headless" component that sets up automatic synchronization
// It doesn't render anything visible, but initializes the sync process
export function SyncInitializer() {
  useEffect(() => {
    // Setup automatic synchronization on component mount
    syncService.setupAutoSync(5); // Check every 5 minutes
    
    // Return cleanup function
    return () => {
      // Cleanup code if needed
    };
  }, []);
  
  // This component doesn't render anything
  return null;
}