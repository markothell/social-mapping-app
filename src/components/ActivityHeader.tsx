"use client";

interface ActivityHeaderProps {
  activityTitle?: string;
  subtitle?: string;
  hostName?: string;
  className?: string;
}

export default function ActivityHeader({ activityTitle, subtitle, hostName, className = "" }: ActivityHeaderProps) {
  const getSubtitle = () => {
    if (subtitle) return subtitle;
    return hostName ? `Created by ${hostName}` : '';
  };

  return (
    <div className={`activity-header ${className}`}>
      <h1 className="activity-title">
        Social_Map.{activityTitle || 'activity'}
      </h1>
      <p className="activity-subtitle">{getSubtitle()}</p>
      
      <style jsx>{`
        .activity-header {
          padding: 1.5rem 1rem 1rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: transparent;
        }

        .activity-title {
          font-size: 1.8rem;
          font-weight: 600;
          color: var(--carafe-brown);
          margin: 0 0 0.25rem 0;
          line-height: 1.2;
          align-self: flex-start;
          width: 100%;
          max-width: 600px;
        }

        .activity-subtitle {
          font-size: 1rem;
          color: var(--warm-earth);
          margin: 0;
          opacity: 0.8;
          align-self: flex-start;
          width: 100%;
          max-width: 600px;
        }

        @media (max-width: 768px) {
          .activity-header {
            padding: 1rem 1rem 0.5rem 1rem;
          }
          
          .activity-title {
            font-size: 1.5rem;
          }
          
          .activity-subtitle {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}