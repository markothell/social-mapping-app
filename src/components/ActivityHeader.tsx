// src/components/ActivityHeader.tsx
"use client";

import { useState } from 'react';

interface ActivityHeaderProps {
  activityTitle?: string;
  subtitle?: string;
  hostName?: string;
  compact?: boolean;
}

export default function ActivityHeader({ 
  activityTitle = "Activity", 
  subtitle,
  hostName,
  compact = false
}: ActivityHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <header className="activity-header">
      <div className="header-content">
        <div className="main-info">
          <h1 className="activity-title">{activityTitle}</h1>
          {subtitle && (
            <div className="subtitle-container">
              <span className="subtitle">{subtitle}</span>
              {hostName && (
                <button 
                  className="expand-toggle"
                  onClick={() => setIsExpanded(!isExpanded)}
                  aria-label={isExpanded ? "Hide details" : "Show details"}
                >
                  {isExpanded ? '−' : '+'}
                </button>
              )}
            </div>
          )}
        </div>
        
        {hostName && (
          <div className={`host-info ${isExpanded ? 'expanded' : ''}`}>
            <span className="host-label">Host:</span>
            <span className="host-name">{hostName}</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .activity-header {
          background-color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(232, 196, 160, 0.3);
          padding: 0.75rem 1rem;
          position: sticky;
          top: 0;
          z-index: 100;
          flex-shrink: 0;
        }
        
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        
        .main-info {
          flex: 1;
          min-width: 0;
        }
        
        .activity-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--carafe-brown);
          margin: 0;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .subtitle-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        
        .subtitle {
          font-size: 0.85rem;
          color: var(--warm-earth);
          font-weight: 500;
        }
        
        .expand-toggle {
          background: var(--dust-beige);
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--carafe-brown);
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        
        .expand-toggle:hover {
          background: var(--amber-highlight);
          transform: scale(1.1);
        }
        
        .host-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          opacity: 0;
          max-width: 0;
          overflow: hidden;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        
        .host-info.expanded {
          opacity: 1;
          max-width: 200px;
        }
        
        .host-label {
          color: var(--warm-earth);
          font-weight: 500;
        }
        
        .host-name {
          color: var(--carafe-brown);
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .activity-header {
            padding: 0.5rem 1rem;
          }
          
          .activity-title {
            font-size: 1.1rem;
          }
          
          .subtitle {
            font-size: 0.8rem;
          }
          
          .host-info {
            position: absolute;
            top: 100%;
            left: 1rem;
            right: 1rem;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(232, 196, 160, 0.5);
            border-radius: 8px;
            padding: 0.5rem;
            margin-top: 0.25rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            max-width: none;
            justify-content: center;
          }
          
          .host-info.expanded {
            max-width: none;
          }
          
          .expand-toggle {
            width: 24px;
            height: 24px;
          }
        }
        
        /* Very small screens */
        @media (max-width: 480px) {
          .activity-header {
            padding: 0.5rem 0.75rem;
          }
          
          .activity-title {
            font-size: 1rem;
          }
          
          .subtitle {
            font-size: 0.75rem;
          }
          
          .host-info {
            font-size: 0.75rem;
          }
        }
        
        /* Compact mode for when space is at premium */
        ${compact ? `
          .activity-header {
            padding: 0.5rem 1rem;
          }
          
          .activity-title {
            font-size: 1rem;
          }
          
          .subtitle {
            font-size: 0.75rem;
          }
          
          .host-info {
            display: none;
          }
          
          .expand-toggle {
            display: none;
          }
        ` : ''}
      `}</style>
    </header>
  );
}