'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/core/services/websocketService';

interface CapacityInfo {
  message: string;
  currentConnections: number;
  maxConnections: number;
  capacityLevel?: 'normal' | 'high';
  estimatedWaitTime?: string;
  reason?: string;
}

export default function CapacityAlert() {
  const [capacityInfo, setCapacityInfo] = useState<CapacityInfo | null>(null);
  const [isRejected, setIsRejected] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleConnectionAccepted = (data: CapacityInfo) => {
      if (data.capacityLevel === 'high') {
        setCapacityInfo(data);
      }
    };

    const handleCapacityWarning = (data: CapacityInfo) => {
      setCapacityInfo(data);
    };

    const handleConnectionRejected = (data: CapacityInfo) => {
      setCapacityInfo(data);
      setIsRejected(true);
    };

    socket.on('connection_accepted', handleConnectionAccepted);
    socket.on('capacity_warning', handleCapacityWarning);
    socket.on('connection_rejected', handleConnectionRejected);

    return () => {
      socket.off('connection_accepted', handleConnectionAccepted);
      socket.off('capacity_warning', handleCapacityWarning);
      socket.off('connection_rejected', handleConnectionRejected);
    };
  }, [socket]);

  if (!capacityInfo) return null;

  if (isRejected) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Server at Capacity
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {capacityInfo.message}
              </p>
              {capacityInfo.estimatedWaitTime && (
                <div className="mt-2 text-xs text-red-600">
                  <span className="block">Estimated wait: {capacityInfo.estimatedWaitTime}</span>
                </div>
              )}
              <div className="mt-3">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              High Traffic
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              {capacityInfo.message}
            </p>
            <div className="mt-3">
              <button
                onClick={() => setCapacityInfo(null)}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}