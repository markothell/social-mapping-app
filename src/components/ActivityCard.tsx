// src/components/ActivityCard.tsx
"use client"

import { useState, useEffect, useRef } from 'react';
import { getActivityUrl } from '@/utils/adminUrls';

export interface Activity {
  id: string;
  type: string;
  settings?: {
    entryView?: {
      title?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
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
  
  // Calculate active participants (connected participants)
  const activeParticipants = activity.participants.filter(p => p.isConnected).length;
  const totalParticipants = activity.participants.length;
  
  // Track activity-specific notifications
  const [hasUnseenChanges, setHasUnseenChanges] = useState(false);
  
  // Check for unseen changes in this activity
  useEffect(() => {
    const checkForUpdates = () => {
      try {
        const lastSeenKey = `activity_last_seen_${activity.id}`;
        const lastSeen = localStorage.getItem(lastSeenKey);
        const activityUpdatedAt = new Date(activity.updatedAt).getTime();
        
        if (!lastSeen) {
          // First time seeing this activity, mark as seen
          localStorage.setItem(lastSeenKey, activityUpdatedAt.toString());
          setHasUnseenChanges(false);
        } else {
          const lastSeenTime = parseInt(lastSeen);
          setHasUnseenChanges(activityUpdatedAt > lastSeenTime);
        }
      } catch (error) {
        console.error('Error checking activity updates:', error);
        setHasUnseenChanges(false);
      }
    };
    
    checkForUpdates();
  }, [activity.id, activity.updatedAt]);
  
  // Listen for real-time updates for this activity
  useEffect(() => {
    const handleActivityUpdate = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.activityId === activity.id) {
        setHasUnseenChanges(true);
      }
    };
    
    const handleTagAdded = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.activityId === activity.id) {
        setHasUnseenChanges(true);
      }
    };
    
    const handleTagVoted = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail.activityId === activity.id) {
        setHasUnseenChanges(true);
      }
    };
    
    window.addEventListener('activity_updated', handleActivityUpdate as EventListener);
    window.addEventListener('tag_added', handleTagAdded as EventListener);
    window.addEventListener('tag_voted', handleTagVoted as EventListener);
    
    return () => {
      window.removeEventListener('activity_updated', handleActivityUpdate as EventListener);
      window.removeEventListener('tag_added', handleTagAdded as EventListener);
      window.removeEventListener('tag_voted', handleTagVoted as EventListener);
    };
  }, [activity.id]);
  
  // Handler to dismiss notifications
  const handleDismissNotification = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const lastSeenKey = `activity_last_seen_${activity.id}`;
      const now = Date.now().toString();
      localStorage.setItem(lastSeenKey, now);
      setHasUnseenChanges(false);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

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
        <h2>
          <span className={`status-indicator-container ${hasUnseenChanges ? 'has-notification' : ''}`}>
            <span className={`status-indicator ${activity.status === 'active' ? 'active-status' : activity.status === 'completed' ? 'completed-status' : ''}`}></span>
            {hasUnseenChanges && (
              <span 
                className="notification-ring clickable" 
                onClick={handleDismissNotification}
                title="Click to mark as seen"
              ></span>
            )}
          </span>
          {activity.settings?.entryView?.title || 'Untitled Activity'}
        </h2>
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
          {activeParticipants}/{totalParticipants} participants
        </span>
      </div>
      
      <div className="activity-actions" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => window.open(getActivityUrl(`/activity/${activity.id}`), '_blank')}
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
          display: flex;
          align-items: center;
        }

        .status-indicator-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          margin-right: 12px;
        }

        .status-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }

        .notification-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          border: 2px solid #34a853;
          border-radius: 50%;
          z-index: 1;
        }

        .notification-ring.clickable {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .notification-ring.clickable:hover {
          border-color: #2d8f3f;
          background-color: rgba(52, 169, 83, 0.1);
          transform: translate(-50%, -50%) scale(1.1);
        }

        .active-status {
          background-color: #F9AB00;
        }

        .completed-status {
          background-color: #8B4827;
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
          color: #8B7355 !important;
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
          background-color: #7A403E;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s;
          font-weight: 500;
        }

        .go-to-button:hover {
          background-color: #6B352F;
        }
      `}</style>
    </div>
  );
}