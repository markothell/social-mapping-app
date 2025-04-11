"use client";

import { useState } from 'react';
import { activityService } from '@/core/services/activityService';

interface ParticipantManagerProps {
  activity: any;
}

export default function ParticipantManager({ activity }: ParticipantManagerProps) {
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  
  if (!activity || !activity.participants) {
    return <p>No participants yet</p>;
  }
  
  const handleRemoveParticipant = (participantId: string) => {
    if (window.confirm('Are you sure you want to remove this participant?')) {
      activityService.update(activity.id, (currentActivity) => {
        currentActivity.participants = currentActivity.participants.filter(
          (p: any) => p.id !== participantId
        );
        return currentActivity;
      });
      
      // This would be improved with proper state management,
      // but for now we'll just force a page reload
      window.location.reload();
    }
  };
  
  return (
    <div className="participant-manager">
      <h3>Participants ({activity.participants.length})</h3>
      
      <div className="participant-list">
        {activity.participants.length === 0 ? (
          <p className="no-participants">No participants have joined yet</p>
        ) : (
          <ul>
            {activity.participants.map((participant: any) => (
              <li 
                key={participant.id}
                className={`participant-item ${participant.isConnected ? 'connected' : 'disconnected'}`}
              >
                <div className="participant-header">
                  <span className="participant-name">{participant.name}</span>
                  <div className="participant-actions">
                    <button
                      onClick={() => setExpandedParticipant(
                        expandedParticipant === participant.id ? null : participant.id
                      )}
                    >
                      {expandedParticipant === participant.id ? 'Hide' : 'Details'}
                    </button>
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveParticipant(participant.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                {expandedParticipant === participant.id && (
                  <div className="participant-details">
                    <div>ID: {participant.id}</div>
                    <div>Connection: {participant.isConnected ? 'Online' : 'Offline'}</div>
                    
                    {activity.type === 'mapping' && (
                      <div>
                        Mapping Status: {
                          activity.mappings.find((m: any) => m.userId === participant.id)?.isComplete
                            ? 'Completed'
                            : 'In Progress'
                        }
                      </div>
                    )}
                    
                    {activity.type === 'ranking' && (
                      <div>
                        Ranking Status: {
                          activity.rankings.find((r: any) => r.userId === participant.id)
                            ? 'Submitted'
                            : 'Not Submitted'
                        }
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <style jsx>{`
        .participant-manager {
          margin-top: 2rem;
        }
        
        h3 {
          margin-top: 0;
          margin-bottom: 1rem;
        }
        
        .participant-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .participant-item {
          background-color: white;
          border-radius: 6px;
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);
          margin-bottom: 0.75rem;
          padding: 1rem;
        }
        
        .participant-item.connected {
          border-left: 4px solid #34a853;
        }
        
        .participant-item.disconnected {
          border-left: 4px solid #ea4335;
          opacity: 0.7;
        }
        
        .participant-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .participant-name {
          font-weight: 500;
          font-size: 1rem;
        }
        
        .participant-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .participant-actions button {
          background-color: #f1f3f4;
          border: none;
          border-radius: 4px;
          padding: 0.3rem 0.75rem;
          font-size: 0.8rem;
          cursor: pointer;
        }
        
        .participant-actions button:hover {
          background-color: #e8eaed;
        }
        
        .participant-actions .remove-button {
          color: #ea4335;
        }
        
        .participant-actions .remove-button:hover {
          background-color: #fdeded;
        }
        
        .participant-details {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
          font-size: 0.9rem;
          color: #5f6368;
        }
        
        .participant-details div {
          margin-bottom: 0.5rem;
        }
        
        .no-participants {
          padding: 1.5rem;
          text-align: center;
          background-color: #f8f9fa;
          border-radius: 6px;
          color: #5f6368;
        }
      `}</style>
    </div>
  );
}