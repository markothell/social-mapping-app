// src/app/admin/create/page.tsx
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { hybridActivityService } from '@/core/services/hybridActivityService';
import { getAdminUrl, getActivityUrl } from '@/utils/adminUrls';

export default function CreateActivityPage() {
  const router = useRouter();
  const [activityType, setActivityType] = useState('mapping');
  const [title, setTitle] = useState('');
  const [hostName, setHostName] = useState('');
  const [description, setDescription] = useState('Join this collaborative activity to contribute.');
  
  // Instruction text customization
  const [tagCoreQuestion, setTagCoreQuestion] = useState('');
  const [tagCreationInstruction, setTagCreationInstruction] = useState('Add tags for the activity');
  
  // Voting threshold settings
  const [thresholdType, setThresholdType] = useState('minimum');
  const [minimumVotes, setMinimumVotes] = useState(1);
  const [topNCount, setTopNCount] = useState(5);
  const [mappingCoreQuestion, setMappingCoreQuestion] = useState('');
  const [mappingInstruction, setMappingInstruction] = useState('Position each tag on the grid according to your perspective. You can add comments to explain your choices.');
  const [contextInstructions, setContextInstructions] = useState('Why did you position this here?');
  
  // Axis labels customization
  const [xAxisMinLabel, setXAxisMinLabel] = useState("Don't Know");
  const [xAxisMaxLabel, setXAxisMaxLabel] = useState("Know");
  const [yAxisMinLabel, setYAxisMinLabel] = useState("Don't Like");
  const [yAxisMaxLabel, setYAxisMaxLabel] = useState("Like");
  
  // Results settings
  const [resultsInstruction, setResultsInstruction] = useState('Review the collective mapping to understand different perspectives and insights.');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store the custom mapping instruction in localStorage
    localStorage.setItem('mapping_instruction', mappingInstruction);
    
    // Create activity with customized settings
    const activitySettings = {
      entryView: { 
        title,
        hostName,
        description 
      },
      tagCreation: {
        coreQuestion: tagCoreQuestion,
        instruction: tagCreationInstruction,
        enableVoting: thresholdType !== 'off',
        voteThreshold: thresholdType === 'minimum' ? minimumVotes : 1,
        thresholdType,
        minimumVotes: thresholdType === 'minimum' ? minimumVotes : undefined,
        topNCount: thresholdType === 'topN' ? topNCount : undefined
      },
      mapping: {
        coreQuestion: mappingCoreQuestion,
        xAxisLabel: 'Knowledge',
        xAxisMinLabel,
        xAxisMaxLabel,
        yAxisLabel: 'Preference',
        yAxisMinLabel,
        yAxisMaxLabel,
        gridSize: 4,
        enableAnnotations: true,
        maxAnnotationLength: 280,
        instruction: mappingInstruction,
        contextInstructions
      },
      results: {
        instruction: resultsInstruction
      }
    };
    
    const activity = await hybridActivityService.create(activityType, activitySettings);
    
    console.log('Created new activity with ID:', activity.id);
    console.log('Activity object:', activity);
    
    // Navigate back to admin panel
    router.push(getAdminUrl('/admin'));
  };
  
  return (
    <div className="activity-layout">
      <header className="app-header">
        <div className="container">
          <Link href="/" className="logo-link">
            <img src="/sit_logo.svg" alt="Social Insight Tools" className="header-logo" />
          </Link>
          <h1>Create New Activity</h1>
        </div>
      </header>
      
      <main className="app-content">
        <div className="content-wrapper">
          <div className="create-activity">
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
          <label htmlFor="hostName">Host Name</label>
          <input
            type="text"
            id="hostName"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="Enter the host's name"
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
                <label htmlFor="tagCoreQuestion">Core Question</label>
                <input
                  type="text"
                  id="tagCoreQuestion"
                  value={tagCoreQuestion}
                  onChange={(e) => setTagCoreQuestion(e.target.value)}
                  placeholder="What is the core question for tag creation?"
                />
              </div>
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
              
              <div className="form-group">
                <label htmlFor="thresholdType">Voting Threshold</label>
                <select
                  id="thresholdType"
                  value={thresholdType}
                  onChange={(e) => setThresholdType(e.target.value)}
                >
                  <option value="off">Off - No voting required</option>
                  <option value="minimum">Minimum votes required</option>
                  <option value="topN">Top N ranked tags</option>
                </select>
              </div>
              
              {thresholdType === 'minimum' && (
                <div className="form-group">
                  <label htmlFor="minimumVotes">Minimum Votes Required</label>
                  <input
                    type="number"
                    id="minimumVotes"
                    value={minimumVotes}
                    onChange={(e) => setMinimumVotes(parseInt(e.target.value) || 1)}
                    min="1"
                    placeholder="Number of votes required"
                  />
                </div>
              )}
              
              {thresholdType === 'topN' && (
                <div className="form-group">
                  <label htmlFor="topNCount">Number of Top Tags</label>
                  <input
                    type="number"
                    id="topNCount"
                    value={topNCount}
                    onChange={(e) => setTopNCount(parseInt(e.target.value) || 1)}
                    min="1"
                    placeholder="Number of top ranked tags to include"
                  />
                </div>
              )}
            </div>
            
            <div className="form-section">
              <h2>Mapping Settings</h2>
              <div className="form-group">
                <label htmlFor="mappingCoreQuestion">Core Question</label>
                <input
                  type="text"
                  id="mappingCoreQuestion"
                  value={mappingCoreQuestion}
                  onChange={(e) => setMappingCoreQuestion(e.target.value)}
                  placeholder="What is the core question for mapping?"
                />
              </div>
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
              
              <div className="form-group">
                <label htmlFor="contextInstructions">Context Instructions</label>
                <input
                  type="text"
                  id="contextInstructions"
                  value={contextInstructions}
                  onChange={(e) => setContextInstructions(e.target.value)}
                  placeholder="Subtext for the input popup (e.g. Why did you position this here?)"
                />
              </div>
              
              <h3>Axis Labels</h3>
              <div className="axis-labels">
                <div className="axis-visual">
                  <div className="axis-display">
                    <div className="y-axis">
                      <div className="axis-endpoint y-max"></div>
                      <div className="axis-line vertical"></div>
                      <div className="axis-endpoint y-min"></div>
                    </div>
                    <div className="x-axis">
                      <div className="axis-endpoint x-min"></div>
                      <div className="axis-line horizontal"></div>
                      <div className="axis-endpoint x-max"></div>
                    </div>
                  </div>
                </div>
                <div className="axis-inputs">
                  <div className="form-group">
                    <label htmlFor="xAxisMinLabel">X-Axis Min</label>
                    <input
                      type="text"
                      id="xAxisMinLabel"
                      value={xAxisMinLabel}
                      onChange={(e) => setXAxisMinLabel(e.target.value)}
                      placeholder="Min value (e.g. Don't Know)"
                      className="x-min-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="xAxisMaxLabel">X-Axis Max</label>
                    <input
                      type="text"
                      id="xAxisMaxLabel"
                      value={xAxisMaxLabel}
                      onChange={(e) => setXAxisMaxLabel(e.target.value)}
                      placeholder="Max value (e.g. Know)"
                      className="x-max-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="yAxisMinLabel">Y-Axis Min</label>
                    <input
                      type="text"
                      id="yAxisMinLabel"
                      value={yAxisMinLabel}
                      onChange={(e) => setYAxisMinLabel(e.target.value)}
                      placeholder="Min value (e.g. Don't Like)"
                      className="y-min-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="yAxisMaxLabel">Y-Axis Max</label>
                    <input
                      type="text"
                      id="yAxisMaxLabel"
                      value={yAxisMaxLabel}
                      onChange={(e) => setYAxisMaxLabel(e.target.value)}
                      placeholder="Max value (e.g. Like)"
                      className="y-max-input"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h2>Results Settings</h2>
              <div className="form-group">
                <label htmlFor="resultsInstruction">Results Instructions</label>
                <textarea
                  id="resultsInstruction"
                  value={resultsInstruction}
                  onChange={(e) => setResultsInstruction(e.target.value)}
                  placeholder="Instructions for the results page"
                  rows={3}
                />
              </div>
            </div>
          </>
        )}
        
              <div className="form-actions">
                <button type="button" onClick={() => router.push(getAdminUrl('/admin'))}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Create Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <style jsx>{`
        .activity-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          color: #202124;
          --warm-earth: #8B7355;
          --rust-button: #E86C2B;
          background: linear-gradient(to bottom, #F7E9CB 0%, #D8CD9D 100%);
          background-attachment: fixed;
          background-repeat: no-repeat;
        }
        
        .app-header {
          background-color: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(232, 196, 160, 0.3);
          color: #202124;
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
        
        .logo-link {
          display: flex;
          align-items: center;
          transition: opacity 0.2s ease;
        }
        
        .logo-link:hover {
          opacity: 0.8;
        }
        
        .header-logo {
          height: 40px;
          width: 40px;
          object-fit: contain;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        .app-content {
          flex: 1;
          background: transparent;
          color: #202124;
          padding: 2rem 0;
        }
        
        .content-wrapper {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 1rem;
        }
        
        .create-activity {
          background-color: #FDF6E9;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 1.5rem;
          margin: 0.5rem auto;
          margin-bottom: 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
          max-width: 800px;
          width: 100%;
        }
        
        @media (min-width: 768px) {
          .create-activity {
            padding: 2rem;
          }
        }
        
        .app-header h1 {
          margin: 0;
          font-size: 1.5rem;
          color: #202124;
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
          background-color: transparent;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #E96C2B;
        }
        
        @media (min-width: 768px) {
          .form-section {
            padding: 1.5rem;
          }
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
          background-color: rgba(255, 255, 255, 0.8);
        }
        
        .axis-labels {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: flex-start;
        }
        
        @media (min-width: 768px) {
          .axis-labels {
            flex-direction: row;
            gap: 2rem;
          }
        }
        
        .axis-visual {
          flex-shrink: 0;
        }
        
        .axis-display {
          position: relative;
          width: 240px;
          height: 240px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .y-axis {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100px;
        }
        
        .x-axis {
          position: absolute;
          display: flex;
          align-items: center;
          width: 100px;
        }
        
        .axis-line {
          background-color: #5f6368;
        }
        
        .axis-line.vertical {
          width: 2px;
          height: 120px;
        }
        
        .axis-line.horizontal {
          width: 120px;
          height: 2px;
        }
        
        .axis-endpoint {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin: 2px;
        }
        
        .axis-endpoint.x-min {
          background-color: #ea4335;
        }
        
        .axis-endpoint.x-max {
          background-color: #34a853;
        }
        
        .axis-endpoint.y-min {
          background-color: #fbbc04;
        }
        
        .axis-endpoint.y-max {
          background-color: #4285f4;
        }
        
        .axis-inputs {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 200px;
        }
        
        .axis-inputs input {
          max-width: 150px;
        }
        
        .x-min-input {
          border-bottom: 3px solid #ea4335 !important;
        }
        
        .x-max-input {
          border-bottom: 3px solid #34a853 !important;
        }
        
        .y-min-input {
          border-bottom: 3px solid #fbbc04 !important;
        }
        
        .y-max-input {
          border-bottom: 3px solid #4285f4 !important;
        }
        
        .checkbox-group {
          display: flex;
          align-items: center;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: 500;
        }
        
        .checkbox-label input[type="checkbox"] {
          width: auto;
          margin: 0;
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
          background-color: #7A403E;
          color: white;
          transition: background-color 0.2s;
        }

        .form-actions button.primary:hover {
          background-color: #6B352F;
        }
      `}</style>
    </div>
  );
}