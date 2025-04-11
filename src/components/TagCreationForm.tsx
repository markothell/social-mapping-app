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
      <h2>Add a New Tag</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="tagText">Tag Text</label>
          <textarea
            id="tagText"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            placeholder="Enter a concept, idea, or topic"
            rows={3}
            maxLength={100}
          />
          <div className="char-counter">
            {tagText.length}/100 characters
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
        
        <button type="submit" className="add-button">
          Add Tag
        </button>
      </form>

      <style jsx>{`
        .tag-creation-form {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.3rem;
          color: #202124;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #202124;
        }
        
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #dadce0;
          border-radius: 4px;
          font-size: 1rem;
          resize: vertical;
        }
        
        .char-counter {
          text-align: right;
          font-size: 0.8rem;
          color: #5f6368;
          margin-top: 0.25rem;
        }
        
        .error-message {
          color: #ea4335;
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }
        
        .add-button {
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
          display: block;
          width: 100%;
        }
        
        .add-button:hover {
          background-color: #1765cc;
        }
      `}</style>
    </div>
  );
}