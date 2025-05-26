"use client";

import { useState, useEffect } from 'react';

interface EntryFormProps {
  user: {
    id?: string;
    name?: string;
  } | null;
  onJoin: (name: string) => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export default function EntryForm({ user, onJoin, onCancel, showCancel }: EntryFormProps) {
  const [userName, setUserName] = useState('');
  
  useEffect(() => {
    // Initialize name field with user's name if available
    if (user && user.name) {
      setUserName(user.name);
    }
  }, [user]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      alert('Please enter your name to continue');
      return;
    }
    
    onJoin(userName);
  };
  
  return (
    <div className="entry-form-container">
      <h2>Join this activity</h2>
      
      <form onSubmit={handleSubmit} className="join-form">
        <div className="form-group">
          <label htmlFor="userName">Your Name</label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name to join"
            required
          />
        </div>
        
        <div className="form-buttons">
          <button type="submit" className="join-button">
            {user ? 'Update Name' : 'Join Activity'}
          </button>
          {showCancel && onCancel && (
            <button type="button" className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <style jsx>{`
        .entry-form-container {
          margin-top: 2rem;
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          color: #202124;
        }
        
        .join-form {
          max-width: 400px;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #202124;
        }
        
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #dadce0;
          border-radius: 4px;
          font-size: 1rem;
        }
        
        .form-buttons {
          display: flex;
          gap: 0.75rem;
        }
        
        .join-button {
          flex: 1;
          padding: 0.75rem;
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .join-button:hover {
          background-color: #1765cc;
        }
        
        .cancel-button {
          padding: 0.75rem 1.5rem;
          background-color: #f1f3f4;
          color: #202124;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .cancel-button:hover {
          background-color: #e8eaed;
        }
      `}</style>
    </div>
  );
}