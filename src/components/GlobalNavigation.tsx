// src/components/GlobalNavigation.tsx
"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface GlobalNavigationProps {
  sessionId: string;
  activityTitle?: string;
  hostName?: string;
  activity?: any;
  currentUserId?: string;
}

export default function GlobalNavigation({
  sessionId,
  activityTitle,
  hostName,
  activity,
  currentUserId
}: GlobalNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  // Navigation items with their routes and icons
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: '🏠',
      route: `/activity/${sessionId}`,
      description: 'Activity overview'
    },
    {
      id: 'nominate',
      label: 'Nominate',
      icon: '⏰',
      route: `/activity/${sessionId}/tags`,
      description: 'Add and vote on topics'
    },
    {
      id: 'map',
      label: 'Map',
      icon: '▦',
      route: `/activity/${sessionId}/mapping`,
      description: 'Position topics on grid'
    },
    {
      id: 'results',
      label: 'Results',
      icon: '📊',
      route: `/activity/${sessionId}/mapping-results`,
      description: 'View final results'
    }
  ];

  // Determine current active tab
  const getCurrentTab = () => {
    if (pathname.includes('/tags')) return 'nominate';
    if (pathname.includes('/mapping-results')) return 'results';
    if (pathname.includes('/mapping')) return 'map';
    return 'home';
  };

  const activeTab = getCurrentTab();

  // Check if tab should be disabled
  const isTabDisabled = (tabId: string) => {
    if (!activity) return false;
    
    const approvedTags = activity.tags?.filter((tag: any) => tag.status === 'approved') || [];
    
    switch (tabId) {
      case 'map':
        return approvedTags.length === 0;
      case 'results':
        return false;
      default:
        return false;
    }
  };

  const handleNavigation = (route: string, tabId: string) => {
    if (isTabDisabled(tabId)) return;
    
    setIsExpanded(false);
    router.push(route);
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isDisabled = isTabDisabled(item.id);
          
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => handleNavigation(item.route, item.id)}
              disabled={isDisabled}
              aria-label={`Navigate to ${item.label}`}
              title={isDisabled ? `${item.label} not available yet` : item.description}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {isActive && <div className="active-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* Desktop Navigation - Horizontal tabs */}
      <nav className="desktop-nav">
        <div className="nav-container">
          <div className="nav-tabs">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isDisabled = isTabDisabled(item.id);
              
              return (
                <button
                  key={item.id}
                  className={`nav-tab ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => handleNavigation(item.route, item.id)}
                  disabled={isDisabled}
                  title={isDisabled ? `${item.label} not available yet` : item.description}
                >
                  <span className="tab-icon">{item.icon}</span>
                  <span className="tab-label">{item.label}</span>
                  {isActive && <div className="tab-indicator" />}
                </button>
              );
            })}
          </div>
          
          {activity && (
            <div className="activity-info">
              <span className="participants-count">
                {activity.participants?.length || 0} participant{activity.participants?.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </nav>

      <style jsx>{`
        /* Mobile Navigation */
        .mobile-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(232, 196, 160, 0.3);
          display: flex;
          justify-content: space-around;
          padding: 0.5rem 0.25rem;
          z-index: 1000;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .nav-item {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 8px;
          min-width: 60px;
          position: relative;
          color: var(--warm-earth);
        }
        
        .nav-item:not(.disabled):hover {
          background: rgba(232, 108, 43, 0.1);
          transform: translateY(-1px);
        }
        
        .nav-item.active {
          color: var(--rust-button);
          background: rgba(232, 108, 43, 0.1);
        }
        
        .nav-item.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        .nav-icon {
          font-size: 1.2rem;
          margin-bottom: 0.125rem;
          filter: grayscale(0.2);
        }
        
        .nav-item.active .nav-icon {
          filter: none;
          transform: scale(1.1);
        }
        
        .nav-label {
          font-size: 0.7rem;
          font-weight: 500;
          line-height: 1;
        }
        
        .active-indicator {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 2px;
          background: var(--rust-button);
          border-radius: 1px;
        }
        
        /* Desktop Navigation */
        .desktop-nav {
          display: none;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(232, 196, 160, 0.3);
          position: sticky;
          top: 0;
          z-index: 90;
        }
        
        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 1rem;
        }
        
        .nav-tabs {
          display: flex;
          gap: 0.5rem;
        }
        
        .nav-tab {
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 8px;
          position: relative;
          color: var(--warm-earth);
          font-weight: 500;
        }
        
        .nav-tab:not(.disabled):hover {
          background: rgba(232, 108, 43, 0.1);
          color: var(--rust-button);
        }
        
        .nav-tab.active {
          color: var(--rust-button);
          background: rgba(232, 108, 43, 0.1);
        }
        
        .nav-tab.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        .tab-icon {
          font-size: 1rem;
        }
        
        .tab-label {
          font-size: 0.9rem;
        }
        
        .tab-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--rust-button);
          border-radius: 1px 1px 0 0;
        }
        
        .activity-info {
          font-size: 0.8rem;
          color: var(--warm-earth);
          font-weight: 500;
        }
        
        .participants-count {
          padding: 0.25rem 0.5rem;
          background: rgba(232, 196, 160, 0.2);
          border-radius: 12px;
        }
        
        /* Show mobile nav only on mobile */
        @media (max-width: 768px) {
          .desktop-nav {
            display: none;
          }
        }
        
        /* Show desktop nav only on desktop */
        @media (min-width: 769px) {
          .mobile-nav {
            display: none;
          }
          
          .desktop-nav {
            display: block;
          }
        }
        
        /* Handle safe areas */
        @supports (padding: max(0px)) {
          .mobile-nav {
            padding-bottom: max(0.5rem, env(safe-area-inset-bottom) + 0.5rem);
          }
        }
        
        /* Very small screens */
        @media (max-width: 480px) {
          .nav-label {
            font-size: 0.65rem;
          }
          
          .nav-icon {
            font-size: 1.1rem;
          }
          
          .nav-item {
            min-width: 50px;
            padding: 0.4rem 0.2rem;
          }
        }
      `}</style>
    </>
  );
}