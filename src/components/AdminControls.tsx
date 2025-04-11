"use client";

import { useState } from 'react';
import ActivityShareLinks from './ActivityShareLinks';
import ParticipantManager from './ParticipantManager';

interface AdminControlsProps {
  activity: any;
  onChangePhase: (phase: string) => void;
}

export default function AdminControls({ activity, onChangePhase }: AdminControlsProps) {
  // Get available phases based on activity type
  const getAvailablePhases = () => {
    if (activity.type === 'mapping') {
      return ['gathering', 'tagging', 'mapping', 'mapping-results'];
    } else if (activity.type === 'ranking') {
      return ['gathering', 'tagging', 'ranking', 'results'];
    }
    return ['gathering', 'tagging', 'results'];
  };
  
  return (
    <div className="admin-controls">
      <h2>Administrator Controls</h2>
      
      <div className="phase-controls">
        <p>Change activity phase:</p>
        <div className="button-group">
          {getAvailablePhases().map(phase => (
            <button
              key={phase}
              onClick={() => onChangePhase(phase)}
              className={activity.phase === phase ? 'active' : ''}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>
      
      <ActivityShareLinks activityId={activity.id} />
      <ParticipantManager activity={activity} />
      
      <style jsx>{`
        .admin-controls {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #eee;
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.3rem;
        }
        
        .phase-controls {
          margin-bottom: 2rem;
        }
        
        .button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 0.75rem;
        }
        
        .button-group button {
          background-color: #f1f3f4;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .button-group button:hover {
          background-color: #e8eaed;
        }
        
        .button-group button.active {
          background-color: #e8f0fe;
          color: #1a73e8;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}