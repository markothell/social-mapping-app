"use client";

import { useState } from 'react';
import ActivityShareLinks from './ActivityShareLinks';
import ParticipantManager from './ParticipantManager';

interface AdminControlsProps {
  activity: any;
}

export default function AdminControls({ activity }: AdminControlsProps) {
  return (
    <div className="admin-controls">
      <h2>Administrator Controls</h2>
      
      <ActivityShareLinks activityId={activity.id} />
      <ParticipantManager activity={activity} />
      
      <style jsx>{`
        .admin-controls {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #eee;
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.3rem;
        }
        
      `}</style>
    </div>
  );
}