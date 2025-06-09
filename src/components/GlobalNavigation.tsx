"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

interface NavigationStep {
  id: string;
  label: string;
  icon: string;
  path?: string;
}

interface GlobalNavigationProps {
  sessionId?: string;
  activityTitle?: string;
  onNavigate?: (path: string) => void;
  hostName?: string;
  activity?: any;
  currentUserId?: string;
}

export default function GlobalNavigation({ sessionId, activityTitle, onNavigate, hostName, activity, currentUserId }: GlobalNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);
  
  const { notifications, markNewTagsSeen, markApprovedTagsSeen, getNewTagsCountForUser } = useNotifications();

  const renderIcon = (iconType: string, isActive: boolean = false) => {
    const iconColor = isActive ? 'white' : 'var(--carafe-brown)';
    const iconSize = '20';
    
    switch (iconType) {
      case 'home':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
        );
      case 'clock':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        );
      case 'grid':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
        );
      case 'chart':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
          </svg>
        );
      default:
        return <span style={{color: iconColor}}>{iconType}</span>;
    }
  };

  const steps: NavigationStep[] = [
    { id: 'home', label: 'Home', icon: 'home', path: sessionId ? `/activity/${sessionId}` : '/' },
    { id: 'nominate', label: 'Nominate', icon: 'clock', path: sessionId ? `/activity/${sessionId}/tags` : undefined },
    { id: 'map', label: 'Map', icon: 'grid', path: sessionId ? `/activity/${sessionId}/mapping` : undefined },
    { id: 'results', label: 'Results', icon: 'chart', path: sessionId ? `/activity/${sessionId}/mapping-results` : undefined }
  ];

  useEffect(() => {
    if (pathname.includes('/mapping-results')) {
      setCurrentStep(3);
    } else if (pathname.includes('/mapping')) {
      setCurrentStep(2);
      // Don't auto-clear notifications here - only clear when user clicks navigation
    } else if (pathname.includes('/tags')) {
      setCurrentStep(1);
    } else {
      setCurrentStep(0);
    }
  }, [pathname]);

  const handleStepClick = (stepIndex: number, step: NavigationStep) => {
    if (step.path) {
      // Clear notifications when navigating to relevant pages
      if (step.id === 'nominate') {
        markNewTagsSeen();
      } else if (step.id === 'map') {
        markApprovedTagsSeen();
      }
      
      if (onNavigate) {
        onNavigate(step.path);
      } else {
        router.push(step.path);
      }
    }
  };

  return (
    <div className="global-navigation">
      <div className="nav-container">        
        <div className="nav-steps">
          {steps.map((step, index) => (
            <div key={step.id} className="nav-step-container">
              <button
                className={`nav-step ${index === currentStep ? 'active' : ''} ${!step.path ? 'disabled' : ''}`}
                onClick={() => handleStepClick(index, step)}
                disabled={!step.path}
              >
                <span className="step-icon">{renderIcon(step.icon, index === currentStep)}</span>
                <span className="step-label">{step.label}</span>
                {step.id === 'nominate' && currentUserId && getNewTagsCountForUser(currentUserId) > 0 && (
                  <span className="notification-dot"></span>
                )}
                {step.id === 'map' && notifications.approvedTagsChanged && (
                  <span className="notification-dot"></span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        /* Mobile-first approach: Bottom navigation by default */
        .global-navigation {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid var(--dust-beige);
          z-index: 1000;
          padding: 0.5rem 0;
        }

        .nav-container {
          display: flex;
          justify-content: center;
          max-width: 100%;
          margin: 0 auto;
        }

        .nav-steps {
          display: flex;
          align-items: center;
          justify-content: space-around;
          width: 100%;
          max-width: 400px;
        }

        .nav-step-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
        }

        .nav-step {
          background: transparent;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          padding: 0.5rem;
          border-radius: 12px;
          min-height: 60px;
          min-width: 60px;
          justify-content: center;
        }

        .nav-step.active {
          background: var(--rust-button);
          color: white;
        }

        .nav-step.disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .nav-step:hover:not(.disabled):not(.active) {
          background: var(--dust-beige);
        }

        .step-icon {
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .step-label {
          font-size: 0.7rem;
          color: var(--carafe-brown);
          text-align: center;
          font-weight: 500;
          line-height: 1;
        }

        .nav-step.active .step-label {
          color: white;
        }

        .notification-dot {
          position: absolute;
          top: 2px;
          right: 6px;
          background: var(--rust-button);
          border-radius: 50%;
          width: 10px;
          height: 10px;
          border: 2px solid white;
          z-index: 10;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        /* Desktop: Position under activity header */
        @media (min-width: 768px) {
          .global-navigation {
            position: relative;
            background: transparent;
            border-top: none;
            border-bottom: none;
            border-radius: 0;
            padding: 0 1rem 1rem 1rem;
          }

          .nav-container {
            justify-content: flex-start;
            max-width: 1200px;
            margin: 0;
          }

          .nav-steps {
            max-width: none;
            width: auto;
            gap: 1rem;
          }

          .nav-step-container {
            flex: none;
          }

          .nav-step {
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
            padding: 0.75rem;
            min-height: 60px;
            min-width: 60px;
            border-radius: 12px;
            background: transparent;
            border: 2px solid var(--carafe-brown);
          }

          .nav-step.active {
            background: var(--rust-button);
            color: white;
            border: 2px solid var(--rust-button);
          }

          .nav-step.active .step-label {
            color: white;
          }

          .nav-step:hover:not(.disabled):not(.active) {
            background: var(--dust-beige);
          }

          .step-icon {
            margin-bottom: 4px;
          }

          .step-label {
            font-size: 0.7rem;
          }

          .notification-dot {
            top: 2px;
            right: 6px;
            width: 10px;
            height: 10px;
            z-index: 10;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          }
        }
      `}</style>
    </div>
  );
}