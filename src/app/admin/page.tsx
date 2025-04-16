// src/app/admin/page.tsx
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ActivityCard from '@/components/ActivityCard';
import { hybridActivityService } from '@/core/services/hybridActivityService';
import ConnectionStatus from '@/components/ConnectionStatus';
import { useWebSocket } from '@/core/services/websocketService';
import { useActivities } from '@/core/hooks/useActivities';

export default function AdminDashboardPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const router = useRouter();
  const { isConnected, error: connectionError } = useWebSocket();
  
  // Use our new hook
  const { activities, loading, error, refresh } = useActivities(activeFilter as any);

  const handleCreateActivity = () => {
    router.push('/admin/create');
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
  
  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>Activity Administration</h1>
        <button 
          className="create-button"
          onClick={handleCreateActivity}
        >
          Create New Activity
        </button>
      </header>
      
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
              onNavigate={() => router.push(`/activity/${activity.id}`)}
              onDelete={() => handleDeleteActivity(activity.id)}
              onComplete={() => handleCompleteActivity(activity.id)}
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

      <style jsx>{`
        .admin-dashboard {
          max-width: 1200px;
          margin: 0 auto;
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
        }

        .create-button {
          background-color: #4285f4;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .create-button:hover {
          background-color: #3367d6;
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