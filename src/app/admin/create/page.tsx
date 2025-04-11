// src/app/admin/create/page.tsx
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { activityService } from '@/core/services/activityService';

export default function CreateActivityPage() {
  const router = useRouter();
  const [activityType, setActivityType] = useState('mapping');
  const [title, setTitle] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create basic activity with minimal settings
    const activity = activityService.create(activityType, {
      entryView: { title }
    });
    
    // Navigate to the new activity
    router.push(`/activity/${activity.id}`);
  };
  
  return (
    <div className="create-activity">
      <h1>Create New Activity</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Activity Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Enter a title for your activity"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="activityType">Activity Type</label>
          <select
            id="activityType"
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
          >
            <option value="mapping">Social Mapping</option>
            <option value="ranking">Ranking</option>
          </select>
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={() => router.push('/admin')}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Create Activity
          </button>
        </div>
      </form>

      <style jsx>{`
        .create-activity {
          max-width: 800px;
          margin: 0 auto;
        }
        
        h1 {
          margin-bottom: 2rem;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #dadce0;
          border-radius: 4px;
          font-size: 1rem;
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }
        
        .form-actions button {
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          border: none;
          font-size: 1rem;
          cursor: pointer;
        }
        
        .form-actions button:not(.primary) {
          background-color: #f1f3f4;
          color: #202124;
        }
        
        .form-actions button.primary {
          background-color: #4285f4;
          color: white;
        }
      `}</style>
    </div>
  );
}