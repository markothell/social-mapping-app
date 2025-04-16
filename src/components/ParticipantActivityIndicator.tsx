// src/components/ParticipantActivityIndicator.tsx
"use client";

import { useState, useEffect } from 'react';

interface Participant {
  id: string;
  name: string;
  isConnected: boolean;
}

interface ParticipantActivityIndicatorProps {
  participants: Participant[];
}

export default function ParticipantActivityIndicator({ 
  participants 
}: ParticipantActivityIndicatorProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Get connected participants
  const connectedParticipants = participants.filter(p => p.isConnected);
  const disconnectedParticipants = participants.filter(p => !p.isConnected);
  
  // Max participants to show initially
  const maxInitialDisplay = 5;
  const hasMoreConnected = connectedParticipants.length > maxInitialDisplay;
  
  // Format display participants
  const displayConnected = showAll 
    ? connectedParticipants 
    : connectedParticipants.slice(0, maxInitialDisplay);
  
  if (participants.length === 0) {
    return null;
  }
  
  return (
    <div className="participant-activity">
      <h4>
        Active Participants ({connectedParticipants.length}/{participants.length})
        <span className="refresh-note">Updates in real-time</span>
      </h4>
      
      <div className="participant-list">
        {connectedParticipants.length === 0 ? (
          <div className="no-participants">No active participants</div>
        ) : (
          <div className="active-participants">
            {displayConnected.map(participant => (
              <div key={participant.id} className="participant-badge">
                <span className="status-dot"></span>
                {participant.name}
              </div>
            ))}
            
            {hasMoreConnected && !showAll && (
              <button 
                className="show-more-button"
                onClick={() => setShowAll(true)}
              >
                +{connectedParticipants.length - maxInitialDisplay} more
              </button>
            )}
            
            {showAll && disconnectedParticipants.length > 0 && (
              <div className="disconnected-section">
                <h5>Offline Participants</h5>
                <div className="disconnected-participants">
                  {disconnectedParticipants.map(participant => (
                    <div key={participant.id} className="participant-badge offline">
                      {participant.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {showAll && (
              <button 
                className="show-less-button"
                onClick={() => setShowAll(false)}
              >
                Show less
              </button>
            )}
          </div>
        )}
      </div>
      
      <style jsx>{`
        .participant-activity {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1rem;
          margin-bottom: 1rem;
        }
        
        h4 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1rem;
          color: #202124;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .refresh-note {
          font-size: 0.7rem;
          font-style: italic;
          color: #5f6368;
          font-weight: normal;
        }
        
        h5 {
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: #5f6368;
        }
        
        .participant-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .active-participants {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .participant-badge {
          background-color: #e8f0fe;
          color: #1a73e8;
          border-radius: 16px;
          padding: 0.25rem 0.75rem;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        
        .participant-badge.offline {
          background-color: #f1f3f4;
          color: #5f6368;
        }
        
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #34a853;
        }
        
        .no-participants {
          color: #5f6368;
          font-size: 0.9rem;
          font-style: italic;
        }
        
        .disconnected-section {
          width: 100%;
          margin-top: 0.5rem;
        }
        
        .disconnected-participants {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .show-more-button, .show-less-button {
          background: none;
          border: none;
          font-size: 0.85rem;
          color: #1a73e8;
          cursor: pointer;
          padding: 0.25rem;
          text-decoration: underline;
        }
        
        .show-less-button {
          display: block;
          width: 100%;
          text-align: center;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}