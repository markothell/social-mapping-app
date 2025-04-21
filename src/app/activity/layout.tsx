//src/app/activity/layout.tsx
"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, setUserName] = useState('Guest');

  // Only access localStorage after the component has mounted (client-side)
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserName(user.name || 'User');
      }
    } catch (e) {
      console.error('Error getting user from localStorage:', e);
    }
  }, []);

  return (
    <div className="activity-layout">
      <header className="app-header">
        <div className="container">
          <Link href="/" className="logo">
            Social Mapping App
          </Link>
          <div className="user-name">
            User: {userName}
          </div>
        </div>
      </header>
      
      <main className="app-content">
        {children}
      </main>
      
      <footer className="app-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Social Mapping App</p>
        </div>
      </footer>

      <style jsx>{`
        .activity-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .app-header {
          background-color: #1a73e8;
          color: white;
          padding: 1rem 0;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .user-name {
          color: white;
          font-weight: 500;
          font-size: 0.9rem;
        }
        
        .logo {
          font-size: 1.2rem;
          font-weight: 500;
          color: white;
          text-decoration: none;
        }
        
        .app-content {
          flex: 1;
          padding: 2rem 0;
        }
        
        .app-footer {
          background-color: #f8f9fa;
          padding: 1.5rem 0;
          margin-top: auto;
          border-top: 1px solid #e8eaed;
        }
        
        .app-footer p {
          margin: 0;
          color: #5f6368;
          font-size: 0.9rem;
          text-align: center;
        }
      `}</style>
    </div>
  );
}