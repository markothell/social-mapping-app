"use client";

import { useState } from 'react';

interface TagCreationFormProps {
  onAddTag: (tagText: string) => void;
}

export default function TagCreationForm({ onAddTag }: TagCreationFormProps) {
  const [tagText, setTagText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate tag text
    if (!tagText.trim()) {
      setError('Please enter a tag');
      return;
    }
    
    if (tagText.length > 100) {
      setError('Tag text must be 100 characters or less');
      return;
    }
    
    // Clear error and submit
    setError('');
    onAddTag(tagText.trim());
    setTagText('');
  };

  return (
    <div className="tag-creation-form">
      <form onSubmit={handleSubmit}>
        <div className="input-container">
          <input
            type="text"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            placeholder="Enter Sub-topic"
            maxLength={100}
            className="tag-input"
          />
          <button type="submit" className="add-button">
            +
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </form>

      <style jsx>{`
        .tag-creation-form {
          margin-bottom: 0;
          padding: 0 1.5rem 1.5rem 1.5rem;
        }
        
        .input-container {
          display: flex;
          align-items: center;
          background-color: #FDF0E1;
          border-radius: 25px;
          padding: 0.5rem 0.5rem 0.5rem 1rem;
          border: 1px solid #E8C4A0;
          gap: 0.5rem;
        }
        
        .tag-input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 0.75rem 0;
          font-size: 1rem;
          outline: none;
          color: #202124;
          min-width: 0;
        }
        
        .tag-input::placeholder {
          color: #8B7355;
        }
        
        .add-button {
          background-color: #F9AB00;
          color: #202124;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          font-size: 1.5rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        
        .add-button:hover {
          background-color: #F29900;
          transform: scale(1.05);
        }
        
        .error-message {
          color: #ea4335;
          font-size: 0.9rem;
          margin-top: 0.5rem;
          padding-left: 1rem;
        }
      `}</style>
    </div>
  );
}