//src/app/activity/layout.tsx
"use client";
import { useState, useEffect } from 'react';

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userName, setUserName] = useState('Guest');


  // Only access localStorage after the component has mounted (client-side)
  useEffect(() => {
    const updateUserName = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setUserName(user.name || 'User');
        } else {
          setUserName('Guest');
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
          padding: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
          overflow: visible;
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