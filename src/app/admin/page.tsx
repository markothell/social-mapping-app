// src/app/admin/page.tsx
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { activityService } from '@/core/services/activityService';
import ActivityCard from '@/components/ActivityCard';
import styles from './admin.module.css';

export default function AdminDashboardPage() {
  const [activities, setActivities] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const loadActivities = () => {
      let loadedActivities;
      
      switch (activeFilter) {
        case 'active':
          loadedActivities = activityService.getActive();
          break;
        case 'completed':
          loadedActivities = activityService.getCompleted();
          break;
        default:
          loadedActivities = activityService.getAll();
      }
      
      setActivities(loadedActivities);
    };
    
    loadActivities();
  }, [activeFilter]);

  const handleCreateActivity = () => {
    router.push('/admin/create');
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
      
      {activities.length === 0 ? (
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
              onDelete={() => {
                if (window.confirm('Are you sure you want to delete this activity?')) {
                  activityService.delete(activity.id);
                  setActivities(activities.filter(a => a.id !== activity.id));
                }
              }}
              onComplete={() => {
                if (window.confirm('Are you sure you want to mark this activity as completed?')) {
                  activityService.complete(activity.id);
                  // Refresh the activities list
                  setActivities(activities.map(a => 
                    a.id === activity.id 
                      ? { ...a, status: 'completed' } 
                      : a
                  ));
                }
              }}
            />
          ))}
        </div>
      )}

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