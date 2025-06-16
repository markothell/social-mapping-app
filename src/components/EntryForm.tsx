"use client";

import { useState, useEffect } from 'react';

interface Participant {
  id: string;
  name: string;
  isConnected?: boolean;
  hasCompletedTagging?: boolean;
}

interface EntryFormProps {
  user: {
    id?: string;
    name?: string;
  } | null;
  participants?: Participant[];
  onJoin: (name: string, existingParticipant?: Participant) => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export default function EntryForm({ user, participants = [], onJoin, onCancel, showCancel }: EntryFormProps) {
  const [userName, setUserName] = useState('');
  const [existingParticipant, setExistingParticipant] = useState<Participant | null>(null);
  const [showExistingUserPrompt, setShowExistingUserPrompt] = useState(false);
  
  useEffect(() => {
    // Initialize name field with user's name if available
    if (user && user.name) {
      setUserName(user.name);
    }
  }, [user]);

  const checkForExistingParticipant = (name: string) => {
    if (!name.trim()) return;
    
    const existing = participants.find(p => 
      p.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    
    if (existing) {
      // Check if this is the same user (multiple ways to identify)
      let isOriginalUser = false;
      
      // Check current user in localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.id === existing.id) {
            isOriginalUser = true;
          }
        } catch (error) {
          console.error('Error parsing stored user:', error);
        }
      }
      
      // Check current user prop
      if (user && user.id === existing.id) {
        isOriginalUser = true;
      }
      
      // Check user history in localStorage
      const userHistory = localStorage.getItem('userHistory');
      if (userHistory && !isOriginalUser) {
        try {
          const history = JSON.parse(userHistory);
          if (Array.isArray(history) && history.some(u => u.id === existing.id)) {
            isOriginalUser = true;
          }
        } catch (error) {
          console.error('Error parsing user history:', error);
        }
      }
      
      if (isOriginalUser) {
        setExistingParticipant(existing);
        setShowExistingUserPrompt(true);
      } else {
        setExistingParticipant(existing);
        setShowExistingUserPrompt(false);
      }
    } else {
      setExistingParticipant(null);
      setShowExistingUserPrompt(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setUserName(newName);
    
    // Check for existing participant after a short delay
    if (newName.trim().length > 0) {
      setTimeout(() => checkForExistingParticipant(newName), 300);
    } else {
      setExistingParticipant(null);
      setShowExistingUserPrompt(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      alert('Please enter your name to continue');
      return;
    }
    
    // Check if name is taken by someone else
    if (existingParticipant && !showExistingUserPrompt) {
      alert(`The name "${userName.trim()}" is already taken by another participant. Please choose a different name.`);
      return;
    }
    
    // If there's an existing participant and user is authorized, pass it to the join handler
    onJoin(userName.trim(), existingParticipant || undefined);
  };

  const handleUseExistingParticipant = () => {
    if (existingParticipant) {
      onJoin(existingParticipant.name, existingParticipant);
    }
  };
  
  return (
    <div className="entry-form-container">
      
      <form onSubmit={handleSubmit} className="join-form">
        <div className="form-group">
          <label htmlFor="userName">Enter a name to join</label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={handleNameChange}
            placeholder=""
            required
          />
          {showExistingUserPrompt && existingParticipant && (
            <div className="existing-user-prompt">
              <p>
                Welcome back! We found your previous data for "{existingParticipant.name}".
              </p>
              <div className="existing-user-actions">
                <button 
                  type="button" 
                  className="load-existing-button"
                  onClick={handleUseExistingParticipant}
                >
                  Continue Where I Left Off
                </button>
              </div>
            </div>
          )}
          {existingParticipant && !showExistingUserPrompt && (
            <div className="name-taken-warning">
              <p>
                This name is already taken by another participant. Please choose a different name.
              </p>
            </div>
          )}
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
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          color: #202124;
        }
        
        .join-form {
          max-width: 400px;
          width: 100%;
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
          background-color: var(--amber-highlight, #F5B700);
          color: var(--carafe-brown, #3E2B20);
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .join-button:hover {
          background-color: #F29900;
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
        
        .existing-user-prompt {
          margin-top: 0.75rem;
          padding: 1rem;
          background-color: #e8f0fe;
          border-radius: 4px;
          border: 1px solid #dadce0;
        }
        
        .existing-user-prompt p {
          margin: 0 0 0.75rem 0;
          color: #1a73e8;
          font-weight: 500;
        }
        
        .existing-user-actions {
          display: flex;
          justify-content: center;
        }
        
        .load-existing-button {
          padding: 0.5rem 1rem;
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .load-existing-button:hover {
          background-color: #1765cc;
        }
        
        .name-taken-warning {
          margin-top: 0.75rem;
          padding: 1rem;
          background-color: #fce8e6;
          border-radius: 4px;
          border: 1px solid #f28b82;
        }
        
        .name-taken-warning p {
          margin: 0;
          color: #d93025;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}