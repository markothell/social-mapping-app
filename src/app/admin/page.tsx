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
          <Link href="/" className="logo">
            Social Insight Tools
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
                Active 
              </button>
              <button 
                className={activeFilter === 'completed' ? 'active' : ''}
                onClick={() => setActiveFilter('completed')}
              >
                Completed
              </button>
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
        
        .logo {
          font-size: 1.2rem;
          font-weight: 500;
          color: white;
          text-decoration: none;
        }
        
        
        .app-content {
          flex: 1;
          background-color: #f8f9fa;
          color: #202124;
          padding: 2rem 0;
        }
        
        .content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }
        
        .admin-dashboard {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 2rem;
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
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .create-button:hover {
          background-color: #1765cc;
        }

        .filter-controls {
          display: flex;
          margin-bottom: 1.5rem;
          gap: 1rem;
        }

        .filter-controls button {
          background-color: #f1f3f4;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .filter-controls button.active {
          background-color: #e8f0fe;
          color: #1a73e8;
          font-weight: 500;
        }

        .activity-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
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