// src/components/ActivityCard.tsx
"use client"

import { useState } from 'react';

export interface Activity {
  id: string;
  type: string;
  settings: {
    entryView?: {
      title?: string;
    };
  };
  createdAt: Date;
  status: string;
  phase: string;
  participants: any[];
}

interface ActivityCardProps {
  activity: Activity;
  onNavigate: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onEdit?: () => void;
}

export default function ActivityCard({ 
  activity, 
  onNavigate, 
  onDelete, 
  onComplete,
  onEdit
}: ActivityCardProps) {
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'mapping': return 'Social Mapping';
      case 'ranking': return 'Ranking Activity';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <div className="activity-card" onClick={onNavigate}>
      <div className="activity-info">
        <h2>{activity.settings.entryView?.title || 'Untitled Activity'}</h2>
        <span className="activity-type">{getActivityTypeLabel(activity.type)}</span>
        <span className="activity-phase">Current phase: {activity.phase}</span>
        <span className="activity-date">Created: {formatDate(activity.createdAt)}</span>
        <span className="activity-participants">
          {activity.participants.length} participant(s)
        </span>
      </div>
      
      <div className="activity-actions" onClick={(e) => e.stopPropagation()}>
        {onEdit && (
          <button
            onClick={onEdit}
            className="edit-button"
          >
            Edit
          </button>
        )}
        {activity.status === 'active' && (
          <button
            onClick={onComplete}
            className="complete-button"
          >
            Complete
          </button>
        )}
        <button
          onClick={onDelete}
          className="delete-button"
        >
          Delete
        </button>
      </div>

      <style jsx>{`
        .activity-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 1.5rem;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
        }

        .activity-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .activity-card.completed {
          opacity: 0.7;
        }

        .activity-info h2 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.3rem;
          color: #202124;
        }

        .activity-info span {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: #5f6368;
        }

        .activity-type {
          font-weight: 500;
          color: #1a73e8 !important;
        }

        .activity-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .activity-actions button {
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .edit-button {
          background-color: #4285f4;
          color: white;
        }

        .edit-button:hover {
          background-color: #3367d6;
        }

        .complete-button {
          background-color: #34a853;
          color: white;
        }

        .complete-button:hover {
          background-color: #2e9549;
        }

        .delete-button {
          background-color: #ea4335;
          color: white;
        }

        .delete-button:hover {
          background-color: #d33426;
        }
      `}</style>
    </div>
  );
}