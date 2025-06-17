// src/components/ActivityHeader.tsx
"use client";


interface ActivityHeaderProps {
  activityTitle?: string;
  subtitle?: string;
  compact?: boolean;
  variant?: 'default' | 'entry';
}

export default function ActivityHeader({ 
  activityTitle = "Activity", 
  subtitle,
  compact = false,
  variant = 'default'
}: ActivityHeaderProps) {

  return (
    <header className="activity-header">
      <div className="header-content">
        <div className="main-info">
          <div className="title-row">
            <a href="https://socialinsight.tools" className="logo-link" target="_blank" rel="noopener noreferrer">
              <img src="/sit_logo.svg" alt="Social Insight Tools" className="header-logo" />
            </a>
            {variant === 'default' && (
              <div className="title-content">
                <h1 className="activity-title">Social_Map.{activityTitle}</h1>
                {subtitle && (
                  <div className="subtitle-container">
                    <span className="subtitle">{subtitle}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .activity-header {
          ${variant === 'entry' ? `
            background-color: transparent;
            border-bottom: none;
          ` : `
            background-color: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(232, 196, 160, 0.3);
          `}
          padding: 0.75rem 0;
          position: sticky;
          top: 0;
          z-index: 100;
          flex-shrink: 0;
          width: 100%;
        }
        
        .header-content {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 1rem;
          padding: 0 1rem;
        }
        
        .main-info {
          flex: 1;
          min-width: 0;
        }
        
        .title-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        
        .logo-link {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          transition: opacity 0.2s ease;
          align-self: stretch;
        }
        
        .logo-link:hover {
          opacity: 0.8;
        }
        
        .header-logo {
          height: 100%;
          width: 50px;
          object-fit: contain;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        .title-content {
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
          flex-wrap: wrap;
        }
        
        .subtitle {
          font-size: 0.85rem;
          color: var(--warm-earth);
          font-weight: 500;
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
        ` : ''}
      `}</style>
    </header>
  );
}