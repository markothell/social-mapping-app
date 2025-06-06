// src/components/ActivityCard.tsx
"use client"

import { useState, useEffect, useRef } from 'react';

export interface Activity {
  id: string;
  type: string;
  settings: {
    entryView?: {
      title?: string;
    };
  };
  createdAt: Date;
  completedAt?: Date;
  status: string;
  participants: any[];
}

interface ActivityCardProps {
  activity: Activity;
  onNavigate: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onEdit?: () => void;
  onClone?: () => void;
}

export default function ActivityCard({ 
  activity, 
  onNavigate, 
  onDelete, 
  onComplete,
  onEdit,
  onClone
}: ActivityCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  
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
    <div className="activity-card">
      <div className="card-header">
        <h2>{activity.settings.entryView?.title || 'Untitled Activity'}</h2>
        <div className="menu-container" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button 
            className="menu-trigger"
            onClick={() => setShowMenu(!showMenu)}
          >
            ⋯
          </button>
          {showMenu && (
            <div className="dropdown-menu">
              {onEdit && (
                <button onClick={() => { onEdit(); setShowMenu(false); }} className="menu-item">
                  Edit
                </button>
              )}
              {activity.status === 'active' && onComplete && (
                <button onClick={() => { onComplete(); setShowMenu(false); }} className="menu-item">
                  Complete
                </button>
              )}
              {onClone && (
                <button onClick={() => { onClone(); setShowMenu(false); }} className="menu-item">
                  Clone
                </button>
              )}
              <button onClick={() => { onDelete(); setShowMenu(false); }} className="menu-item delete">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="activity-info" onClick={onNavigate}>
        <span className="activity-type">{getActivityTypeLabel(activity.type)}</span>
        <span className="activity-date">Created: {formatDate(activity.createdAt)}</span>
        {activity.status === 'completed' && activity.completedAt && (
          <span className="activity-completed">Completed: {formatDate(activity.completedAt)}</span>
        )}
        <span className="activity-participants">
          {activity.participants.length} participant(s)
        </span>
      </div>
      
      <div className="activity-actions" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => window.open(`/activity/${activity.id}`, '_blank')}
          className="go-to-button"
        >
          Go To Activity
        </button>
      </div>

      <style jsx>{`
        .activity-card {
          display: flex;
          flex-direction: column;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 1.5rem;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .activity-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .activity-card.completed {
          opacity: 0.7;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .card-header h2 {
          margin: 0;
          font-size: 1.3rem;
          color: #202124;
          flex: 1;
        }

        .menu-container {
          position: relative;
        }

        .menu-trigger {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #5f6368;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(90deg);
        }

        .menu-trigger:hover {
          background-color: #f1f3f4;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #dadce0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          min-width: 120px;
          z-index: 1000;
        }

        .menu-item {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          color: #202124;
        }

        .menu-item:hover {
          background-color: #f1f3f4;
        }

        .menu-item.delete {
          color: #ea4335;
        }

        .menu-item.delete:hover {
          background-color: #fce8e6;
        }

        .activity-info {
          cursor: pointer;
          flex: 1;
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

        .activity-completed {
          color: #34a853 !important;
          font-weight: 500;
        }

        .activity-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }

        .go-to-button {
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s;
        }

        .go-to-button:hover {
          background-color: #1765cc;
        }
      `}</style>
    </div>
  );
}