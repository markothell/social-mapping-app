// src/app/admin/create/page.tsx
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { activityService } from '@/core/services/activityService';

export default function CreateActivityPage() {
  const router = useRouter();
  const [activityType, setActivityType] = useState('mapping');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('Join this collaborative activity to contribute.');
  
  // Instruction text customization
  const [tagCreationInstruction, setTagCreationInstruction] = useState('Add tags for the activity');
  const [mappingInstruction, setMappingInstruction] = useState('Position each tag on the grid according to your perspective. You can add comments to explain your choices.');
  
  // Axis labels customization
  const [xAxisLeftLabel, setXAxisLeftLabel] = useState("Don't Know");
  const [xAxisRightLabel, setXAxisRightLabel] = useState("Know");
  const [yAxisTopLabel, setYAxisTopLabel] = useState("Like");
  const [yAxisBottomLabel, setYAxisBottomLabel] = useState("Don't Like");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store the custom mapping instruction in localStorage
    localStorage.setItem('mapping_instruction', mappingInstruction);
    
    // Create activity with customized settings
    const activitySettings = {
      entryView: { 
        title,
        description 
      },
      tagCreation: {
        instruction: tagCreationInstruction,
        enableVoting: true,
        voteThreshold: 1
      },
      mapping: {
        xAxisLabel: 'Knowledge',
        xAxisLeftLabel,
        xAxisRightLabel,
        yAxisLabel: 'Preference',
        yAxisTopLabel,
        yAxisBottomLabel,
        gridSize: 4,
        enableAnnotations: true,
        maxAnnotationLength: 280,
        instruction: mappingInstruction
      }
    };
    
    const activity = activityService.create(activityType, activitySettings);
    
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
          <label htmlFor="description">Entry Screen Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description text for the entry screen"
            rows={2}
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
        
        {activityType === 'mapping' && (
          <>
            <div className="form-section">
              <h2>Tag Creation Settings</h2>
              <div className="form-group">
                <label htmlFor="tagCreationInstruction">Tag Creation Instructions</label>
                <textarea
                  id="tagCreationInstruction"
                  value={tagCreationInstruction}
                  onChange={(e) => setTagCreationInstruction(e.target.value)}
                  placeholder="Instructions for the tag creation page"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="form-section">
              <h2>Mapping Settings</h2>
              <div className="form-group">
                <label htmlFor="mappingInstruction">Mapping Instructions</label>
                <textarea
                  id="mappingInstruction"
                  value={mappingInstruction}
                  onChange={(e) => setMappingInstruction(e.target.value)}
                  placeholder="Instructions for the mapping page"
                  rows={3}
                />
              </div>
              
              <h3>Axis Labels</h3>
              <div className="grid-labels">
                <div className="form-group">
                  <label htmlFor="yAxisTopLabel">Y-Axis Top Label</label>
                  <input
                    type="text"
                    id="yAxisTopLabel"
                    value={yAxisTopLabel}
                    onChange={(e) => setYAxisTopLabel(e.target.value)}
                    placeholder="Top label (e.g. Like)"
                  />
                </div>
                
                <div className="grid-center">
                  <div className="grid-placeholder"></div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="xAxisLeftLabel">X-Axis Left Label</label>
                  <input
                    type="text"
                    id="xAxisLeftLabel"
                    value={xAxisLeftLabel}
                    onChange={(e) => setXAxisLeftLabel(e.target.value)}
                    placeholder="Left label (e.g. Don't Know)"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="xAxisRightLabel">X-Axis Right Label</label>
                  <input
                    type="text"
                    id="xAxisRightLabel"
                    value={xAxisRightLabel}
                    onChange={(e) => setXAxisRightLabel(e.target.value)}
                    placeholder="Right label (e.g. Know)"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="yAxisBottomLabel">Y-Axis Bottom Label</label>
                  <input
                    type="text"
                    id="yAxisBottomLabel"
                    value={yAxisBottomLabel}
                    onChange={(e) => setYAxisBottomLabel(e.target.value)}
                    placeholder="Bottom label (e.g. Don't Like)"
                  />
                </div>
              </div>
            </div>
          </>
        )}
        
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
          padding-bottom: 2rem;
        }
        
        h1 {
          margin-bottom: 2rem;
        }
        
        h2 {
          font-size: 1.4rem;
          color: #202124;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #eee;
        }
        
        h3 {
          font-size: 1.2rem;
          color: #5f6368;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }
        
        .form-section {
          margin-bottom: 2rem;
          background-color: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
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
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #dadce0;
          border-radius: 4px;
          font-size: 1rem;
        }
        
        .grid-labels {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto auto auto;
          gap: 1rem;
          align-items: start;
        }
        
        .grid-center {
          grid-column: 1 / span 2;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 80px;
        }
        
        .grid-placeholder {
          width: 60px;
          height: 60px;
          background-color: #e8eaed;
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .grid-placeholder::after {
          content: 'Grid';
          color: #5f6368;
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