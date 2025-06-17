// src/app/admin/page.tsx
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ActivityCard from '@/components/ActivityCard';
import { hybridActivityService } from '@/core/services/hybridActivityService';
import ConnectionStatus from '@/components/ConnectionStatus';
import { useWebSocket } from '@/core/services/websocketService';
import { useActivities } from '@/core/hooks/useActivities';
import { getAdminUrl, getActivityUrl } from '@/utils/adminUrls';

export default function AdminDashboardPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const router = useRouter();
  const { isConnected, error: connectionError } = useWebSocket();
  
  // Use our new hook
  const { activities, loading, error, refresh } = useActivities(activeFilter as any);

  const handleCreateActivity = () => {
    router.push(getAdminUrl('/admin/create'));
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      const success = await hybridActivityService.delete(activityId);
      if (success) {
        refresh(); // Refresh the list
      } else {
        alert('Failed to delete activity. Please try again.');
      }
    }
  };
  
  const handleCompleteActivity = async (activityId: string) => {
    if (window.confirm('Are you sure you want to mark this activity as completed?')) {
      const updatedActivity = await hybridActivityService.complete(activityId);
      if (updatedActivity) {
        refresh(); // Refresh the list
      } else {
        alert('Failed to complete activity. Please try again.');
      }
    }
  };

  const handleEditActivity = (activityId: string) => {
    router.push(getAdminUrl(`/admin/edit/${activityId}`));
  };

  const handleCloneActivity = async (activityId: string) => {
    if (window.confirm('Are you sure you want to clone this activity? This will create a copy with the same settings but no user data.')) {
      const clonedActivity = await hybridActivityService.clone(activityId);
      if (clonedActivity) {
        refresh(); // Refresh the list
      } else {
        alert('Failed to clone activity. Please try again.');
      }
    }
  };
  
  return (
    <div className="activity-layout">
      <header className="app-header">
        <div className="container">
          <Link href="/" className="logo-link">
            <img src="/sit_logo.svg" alt="Social Insight Tools" className="header-logo" />
          </Link>
        </div>
      </header>
      
      <main className="app-content">
        <div className="content-wrapper">
          <div className="admin-dashboard">
            <div className="dashboard-header">
              <h1>Your Maps</h1>
              <button 
                className="create-button"
                onClick={handleCreateActivity}
              >
                Create New Activity
              </button>
            </div>
      
            <div className="filter-controls">
              <div className="filter-buttons">
                <button 
                  className={activeFilter === 'all' ? 'active' : ''}
                  onClick={() => setActiveFilter('all')}
                >
                  All Activities
                </button>
                <button 
                  className={activeFilter === 'active' ? 'active' : ''}
                  onClick={() => setActiveFilter('active')}
                >
                  <span className="color-indicator active-indicator"></span>
                  Active 
                </button>
                <button 
                  className={activeFilter === 'completed' ? 'active' : ''}
                  onClick={() => setActiveFilter('completed')}
                >
                  <span className="color-indicator completed-indicator"></span>
                  Completed
                </button>
              </div>
            </div>
      
            {loading ? (
              <div className="loading-container">Loading activities...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : activities.length === 0 ? (
              <div className="no-activities">
                <p>No activities found. Click "Create New Activity" to get started.</p>
              </div>
            ) : (
              <div className="activity-list">
                {activities.map((activity) => (
                  <ActivityCard 
                    key={activity.id} 
                    activity={activity} 
                    onNavigate={() => window.open(getActivityUrl(`/activity/${activity.id}`), '_blank')}
                    onDelete={() => handleDeleteActivity(activity.id)}
                    onComplete={() => handleCompleteActivity(activity.id)}
                    onEdit={() => handleEditActivity(activity.id)}
                    onClone={() => handleCloneActivity(activity.id)}
                  />
                ))}
              </div>
            )}

            <ConnectionStatus 
              status={{ 
                isConnected, 
                error: connectionError 
              }} 
            />
          </div>
        </div>
      </main>

      <style jsx>{`
        .activity-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          color: #202124;
          --warm-earth: #8B7355;
          --rust-button: #E86C2B;
          background: linear-gradient(to bottom, #F7E9CB 0%, #D8CD9D 100%);
          background-attachment: fixed;
          background-repeat: no-repeat;
        }
        
        .app-header {
          background-color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(232, 196, 160, 0.3);
          color: #202124;
          padding: 1rem 0;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          display: flex;
          justify-content: flex-start;
          align-items: center;
        }
        
        .logo-link {
          display: flex;
          align-items: center;
          transition: opacity 0.2s ease;
        }
        
        .logo-link:hover {
          opacity: 0.8;
        }
        
        .header-logo {
          height: 40px;
          width: 40px;
          object-fit: contain;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        
        .app-content {
          flex: 1;
          background: transparent;
          color: #202124;
          padding: 2rem 0;
        }
        
        .content-wrapper {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 1rem;
        }
        
        .admin-dashboard {
          background-color: #FDF6E9;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 1.5rem;
          margin: 0.5rem auto;
          margin-bottom: 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
          max-width: 800px;
          width: 100%;
        }
        
        @media (min-width: 768px) {
          .admin-dashboard {
            padding: 2rem;
          }
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .dashboard-header h1 {
          margin: 0;
          font-size: 2rem;
          color: #202124;
        }

        .create-button {
          background-color: #7A403E;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .create-button:hover {
          background-color: #6B352F;
        }

        .filter-controls {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
          flex-shrink: 0;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
          background-color: #FDF0E1;
          padding: 0.25rem;
          border-radius: 25px;
          border: 1px solid #E8C4A0;
          width: fit-content;
        }

        .filter-buttons button {
          background-color: transparent;
          border: none;
          border-radius: 20px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          color: #8B7355;
          font-weight: 500;
        }

        .filter-buttons button.active {
          background-color: #D8CD9D;
          color: #202124;
        }

        .color-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 8px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .active-indicator {
          background-color: #F9AB00;
        }

        .completed-indicator {
          background-color: #8B4827;
        }

        .activity-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        @media (min-width: 768px) {
          .activity-list {
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 1.5rem;
          }
        }

        .no-activities {
          text-align: center;
          padding: 3rem;
          background-color: #f8f9fa;
          border-radius: 8px;
          color: #5f6368;
        }
      `}</style>
    </div>
  );
}