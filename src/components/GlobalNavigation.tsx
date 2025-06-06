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

  const getSubtitle = () => {
    if (pathname.includes('/mapping-results')) {
      return 'Results';
    } else if (pathname.includes('/mapping')) {
      return 'Map Concepts';
    } else if (pathname.includes('/tags')) {
      return 'Nominate topics';
    } else {
      // Check both hostName prop and activity.settings.entryView.hostName for backwards compatibility
      const effectiveHostName = hostName || activity?.settings?.entryView?.hostName;
      return effectiveHostName ? `Created by ${effectiveHostName}` : 'Social Activity';
    }
  };

  const steps: NavigationStep[] = [
    { id: 'home', label: 'Home', icon: '🏠', path: sessionId ? `/activity/${sessionId}` : '/' },
    { id: 'nominate', label: 'Nominate', icon: '✚', path: sessionId ? `/activity/${sessionId}/tags` : undefined },
    { id: 'map', label: 'Map', icon: '📊', path: sessionId ? `/activity/${sessionId}/mapping` : undefined },
    { id: 'results', label: 'Results', icon: '📈', path: sessionId ? `/activity/${sessionId}/mapping-results` : undefined }
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
        <div className="nav-brand">
          <span className="brand-text">FORM.{activityTitle || 'activity'}</span>
          <span className="brand-subtitle">{getSubtitle()}</span>
        </div>
        
        <div className="nav-steps">
          {steps.map((step, index) => (
            <div key={step.id} className="nav-step-container">
              <button
                className={`nav-step ${index <= currentStep ? 'active' : ''} ${!step.path ? 'disabled' : ''}`}
                onClick={() => handleStepClick(index, step)}
                disabled={!step.path}
              >
                <span className="step-icon">{step.icon}</span>
                {step.id === 'nominate' && currentUserId && getNewTagsCountForUser(currentUserId) > 0 && (
                  <span className="notification-dot"></span>
                )}
                {step.id === 'map' && notifications.approvedTagsChanged && (
                  <span className="notification-dot"></span>
                )}
              </button>
              <span className="step-label">{step.label}</span>
              {index < steps.length - 1 && (
                <div className={`step-connector ${index < currentStep ? 'completed' : ''}`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .global-navigation {
          background: linear-gradient(135deg, #f5c2c7 0%, #f8d7da 100%);
          border-radius: 8px 8px 0 0;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        }

        .nav-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
        }

        .nav-brand {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .brand-text {
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
          line-height: 1;
        }

        .brand-subtitle {
          font-size: 0.9rem;
          color: #666;
          margin-top: -2px;
        }

        .nav-steps {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .nav-step-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .nav-step {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 3px solid #999;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          z-index: 2;
        }

        .nav-step.active {
          border-color: #dc3545;
          background: #dc3545;
          color: white;
        }

        .nav-step.disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .nav-step:hover:not(.disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .step-icon {
          font-size: 1.2rem;
        }

        .notification-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #dc3545;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          border: 2px solid white;
          z-index: 3;
        }

        .notification-dot {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #dc3545;
          border-radius: 50%;
          width: 12px;
          height: 12px;
          border: 2px solid white;
          z-index: 3;
        }

        .step-label {
          font-size: 0.8rem;
          color: #666;
          margin-top: 0.5rem;
          text-align: center;
        }

        .step-connector {
          position: absolute;
          top: 25px;
          left: 50px;
          width: 40px;
          height: 3px;
          background: #ddd;
          z-index: 1;
          transition: background-color 0.3s ease;
        }

        .step-connector.completed {
          background: #dc3545;
        }

        @media (max-width: 768px) {
          .nav-container {
            flex-direction: column;
            gap: 1rem;
            padding: 0 1rem;
          }

          .nav-steps {
            gap: 0.5rem;
          }

          .nav-step {
            width: 40px;
            height: 40px;
          }

          .step-icon {
            font-size: 1rem;
          }

          .step-connector {
            width: 30px;
            left: 40px;
            top: 20px;
          }
        }
      `}</style>
    </div>
  );
}