//src/app/activity/layout.tsx
"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import GlobalNavigation from '@/components/GlobalNavigation';
import { activityService } from '@/core/services/activityService';

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, setUserName] = useState('Guest');
  const [userId, setUserId] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [activityTitle, setActivityTitle] = useState<string>('activity');
  const [hostName, setHostName] = useState<string | undefined>();
  const [activity, setActivity] = useState<any>(null);
  const pathname = usePathname();

  // Extract sessionId from pathname and load activity data
  useEffect(() => {
    const pathSegments = pathname.split('/');
    const activityIndex = pathSegments.indexOf('activity');
    if (activityIndex !== -1 && pathSegments[activityIndex + 1]) {
      const extractedSessionId = pathSegments[activityIndex + 1];
      setSessionId(extractedSessionId);
      
      // Load activity to get title and host
      const loadedActivity = activityService.getById(extractedSessionId);
      if (loadedActivity) {
        setActivity(loadedActivity);
        if (loadedActivity.settings.entryView?.title) {
          setActivityTitle(loadedActivity.settings.entryView.title);
        }
        if (loadedActivity.hostName) {
          setHostName(loadedActivity.hostName);
        }
      }
    }
  }, [pathname]);

  // Only access localStorage after the component has mounted (client-side)
  useEffect(() => {
    const updateUserName = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setUserName(user.name || 'User');
          setUserId(user.id);
        } else {
          setUserName('Guest');
          setUserId(undefined);
        }
      } catch (e) {
        console.error('Error getting user from localStorage:', e);
        setUserName('Guest');
      }
    };

    // Initial load
    updateUserName();

    // Listen for storage changes
    window.addEventListener('storage', updateUserName);
    
    // Listen for custom user change events
    window.addEventListener('userChanged', updateUserName);

    return () => {
      window.removeEventListener('storage', updateUserName);
      window.removeEventListener('userChanged', updateUserName);
    };
  }, []);

  return (
    <div className="activity-layout">
      <main className="app-content">
        <div className="content-wrapper">
          {children}
        </div>
      </main>

      <style jsx>{`
        .activity-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .app-content {
          flex: 1;
          background: transparent;
          color: var(--carafe-brown);
          padding: 0;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .content-wrapper {
            max-width: none;
          }
        }
        
        /* Handle safe areas on modern devices */
        @supports (padding: max(0px)) {
          .content-wrapper {
            padding-top: env(safe-area-inset-top);
          }
        }
      `}</style>
    </div>
  );
}