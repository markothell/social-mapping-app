// src/app/activity/[sessionId]/mapping/page.tsx
"use client";

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRealTimeActivity } from '@/core/hooks/useRealTimeActivity';
import MappingGrid from '@/components/MappingGrid';
import TagSelectionPanel from '@/components/TagSelectionPanel';
import ActivityNotFound from '@/components/ActivityNotFound';
import ConnectionStatus from '@/components/ConnectionStatus';
import UnsavedChangesDialog from '@/components/UnsavedChangesDialog';

function useParams<T>(params: T | Promise<T>): T {
  return params instanceof Promise ? use(params) : params;
}

export default function MappingPage({ 
  params 
}: { 
  params: { sessionId: string } | Promise<{ sessionId: string }> 
}) {
  const router = useRouter();
  const unwrappedParams = useParams(params);
  const sessionId = unwrappedParams.sessionId;
  
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [mappedTags, setMappedTags] = useState<string[]>([]);
  const [userMappings, setUserMappings] = useState<any>({});
  const [tagInstanceCounts, setTagInstanceCounts] = useState<{ [tagId: string]: number }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [editingContext, setEditingContext] = useState<string>('');
  const [selectedInstanceKey, setSelectedInstanceKey] = useState<string | null>(null);
  const [isAddingNewInstance, setIsAddingNewInstance] = useState(false);
  const [pendingInstanceKey, setPendingInstanceKey] = useState<string | null>(null);
  const lastSavedMappings = useRef<any>({});
  
  // Use the real-time activity hook
  const {
    activity,
    loading,
    isConnected,
    connectionError,
    updateMapping,
    changePhase
  } = useRealTimeActivity(sessionId, user);
  
  // Load user data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAdmin(parsedUser.id === 'admin' || localStorage.getItem('isAdmin') === 'true');
        } catch (error) {
          console.error('Error parsing user data:', error);
          router.push(`/activity/${sessionId}`);
        }
      } else {
        // Redirect back to entry if no user
        router.push(`/activity/${sessionId}`);
      }
    }
  }, [sessionId, router]);
  
  // Load user's existing mappings
  useEffect(() => {
    if (activity && user) {
      // Get approved tags and all tags for restoration
      const approvedTags = activity.tags.filter((tag: any) => tag.status === 'approved');
      const allTags = activity.tags;
      
      const userMapping = activity.mappings.find((m: any) => m.userId === user.id);
      
      if (userMapping) {
        // Create a map of tagId -> positions array for multiple instances
        const mappings: any = {};
        const mappedTagIds: string[] = [];
        const instanceCounts: { [tagId: string]: number } = {};
        
        userMapping.positions.forEach((position: any) => {
          // Find the tag text from all tags (not just approved ones)
          const tagInfo = allTags.find(tag => tag.id === position.tagId);
          const tagText = tagInfo?.text || position.text || position.tagId;
          
          // Generate unique key for each position
          const instanceId = position.instanceId || `${position.tagId}_${position.x}_${position.y}`;
          const positionKey = `${position.tagId}_${instanceId}`;
          
          // Store the tag text along with the position
          mappings[positionKey] = {
            ...position,
            instanceId,
            text: tagText
          };
          
          // Count instances per tag
          instanceCounts[position.tagId] = (instanceCounts[position.tagId] || 0) + 1;
          
          // Only add to mappedTags if the tag is currently approved and not already in the list
          if (approvedTags.find(tag => tag.id === position.tagId) && !mappedTagIds.includes(position.tagId)) {
            mappedTagIds.push(position.tagId);
          }
        });
        
        setUserMappings(mappings);
        setMappedTags(mappedTagIds);
        setTagInstanceCounts(instanceCounts);
        lastSavedMappings.current = mappings;
        setHasUnsavedChanges(false);
      }
    }
  }, [activity, user]);

  // Check for unsaved changes
  useEffect(() => {
    const mappingsChanged = JSON.stringify(userMappings) !== JSON.stringify(lastSavedMappings.current);
    const hasChanges = mappingsChanged && Object.keys(userMappings).length > 0;
    console.log('Unsaved changes check:', { 
      mappingsChanged, 
      userMappingsCount: Object.keys(userMappings).length,
      lastSavedCount: Object.keys(lastSavedMappings.current).length,
      hasChanges 
    });
    setHasUnsavedChanges(hasChanges);
  }, [userMappings]);
  
  const handleTagSelect = (tagId: string | null, instanceId?: string | null) => {
    setSelectedTag(tagId);
    setSelectedInstanceId(instanceId || null);
    setIsAddingNewInstance(false);
    setPendingInstanceKey(null);
    
    // Populate context input with the selected instance's annotation
    if (tagId) {
      if (instanceId) {
        // Find specific instance
        const instance = Object.values(userMappings).find((mapping: any) => 
          mapping.tagId === tagId && mapping.instanceId === instanceId
        );
        setEditingContext(instance?.annotation || '');
      } else {
        // Find most recent instance for unmapped tags
        const selectedTagMappings = Object.entries(userMappings)
          .filter(([, mapping]: [string, any]) => mapping.tagId === tagId);
        
        if (selectedTagMappings.length > 0) {
          const [, lastMapping] = selectedTagMappings[selectedTagMappings.length - 1];
          setEditingContext(lastMapping.annotation || '');
        } else {
          setEditingContext('');
        }
      }
    } else {
      setEditingContext('');
    }
  };
  
  const handleAddTagInstance = (tagId: string) => {
    // Create a placeholder instance immediately
    const tagText = approvedTags.find(t => t.id === tagId)?.text || '';
    const instanceId = `${tagId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const positionKey = `${tagId}_${instanceId}`;
    
    // Add placeholder instance (no position yet)
    const newUserMappings = {
      ...userMappings,
      [positionKey]: { 
        tagId, 
        instanceId, 
        x: 0, 
        y: 0, 
        text: tagText,
        isPlaceholder: true // Mark as placeholder until positioned
      }
    };
    
    setUserMappings(newUserMappings);
    setSelectedTag(tagId);
    setIsAddingNewInstance(true);
    setPendingInstanceKey(positionKey);
    setEditingContext(''); // Clear context until positioned
    
    // Update instance counts
    const newInstanceCounts = { ...tagInstanceCounts };
    newInstanceCounts[tagId] = (newInstanceCounts[tagId] || 0) + 1;
    setTagInstanceCounts(newInstanceCounts);
    
    if (!mappedTags.includes(tagId)) {
      setMappedTags([...mappedTags, tagId]);
    }
  };
  
  const handleRemoveTagInstance = (tagId: string, instanceId?: string) => {
    let newUserMappings = { ...userMappings };
    
    if (instanceId) {
      // Remove specific instance
      const positionKey = `${tagId}_${instanceId}`;
      delete newUserMappings[positionKey];
    } else {
      // Remove the most recent instance of this tag
      const tagPositions = Object.entries(userMappings).filter(([, mapping]: [string, any]) => 
        mapping.tagId === tagId
      );
      
      if (tagPositions.length > 0) {
        // Remove the last instance (most recently added)
        const [lastPositionKey] = tagPositions[tagPositions.length - 1];
        delete newUserMappings[lastPositionKey];
      }
    }
    
    setUserMappings(newUserMappings);
    
    // Update instance counts and mapped tags based on the new mappings
    const remainingMappings = Object.values(newUserMappings).filter((mapping: any) => mapping.tagId === tagId);
    const newInstanceCounts = { ...tagInstanceCounts };
    
    if (remainingMappings.length === 0) {
      // If no instances left, remove from mapped tags
      setMappedTags(mappedTags.filter(id => id !== tagId));
      delete newInstanceCounts[tagId];
    } else {
      newInstanceCounts[tagId] = remainingMappings.length;
    }
    
    setTagInstanceCounts(newInstanceCounts);
  };
  
  const handleTagPosition = (tagId: string, x: number, y: number, annotation?: string) => {
    if (!activity || !user) return;
    
    const tagText = approvedTags.find(tag => tag.id === tagId)?.text || '';
    
    if (isAddingNewInstance && pendingInstanceKey) {
      // Position the pending placeholder instance
      const newUserMappings = {
        ...userMappings,
        [pendingInstanceKey]: { 
          ...userMappings[pendingInstanceKey],
          x, 
          y, 
          annotation,
          isPlaceholder: false // Remove placeholder flag
        }
      };
      
      setUserMappings(newUserMappings);
      setIsAddingNewInstance(false);
      setPendingInstanceKey(null);
      
      // Enable context editing
      setEditingContext('');
      
    } else {
      // Reposition existing instance or create new one if no existing instances
      const existingMappings = Object.entries(userMappings)
        .filter(([, mapping]: [string, any]) => mapping.tagId === tagId);
      
      if (existingMappings.length > 0) {
        // Reposition the most recent instance
        const [lastPositionKey, lastMapping] = existingMappings[existingMappings.length - 1];
        const newUserMappings = {
          ...userMappings,
          [lastPositionKey]: { 
            ...lastMapping,
            x, 
            y, 
            annotation: annotation || lastMapping.annotation
          }
        };
        setUserMappings(newUserMappings);
      } else {
        // Create first instance
        const instanceId = `${tagId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const positionKey = `${tagId}_${instanceId}`;
        
        const newUserMappings = {
          ...userMappings,
          [positionKey]: { tagId, instanceId, x, y, annotation, text: tagText }
        };
        
        setUserMappings(newUserMappings);
        
        // Update instance counts
        const newInstanceCounts = { ...tagInstanceCounts };
        newInstanceCounts[tagId] = 1;
        setTagInstanceCounts(newInstanceCounts);
        
        if (!mappedTags.includes(tagId)) {
          setMappedTags([...mappedTags, tagId]);
        }
      }
    }
    
    // Don't clear selected tag when repositioning
    if (!isAddingNewInstance) {
      // Keep tag selected for repositioning
    }
    
    console.log('Tag positioned locally, not auto-submitting');
  };
  
  // Navigation functions that check for unsaved changes
  const navigateWithUnsavedCheck = useCallback((path: string) => {
    console.log('Navigate check:', { hasUnsavedChanges, path });
    if (hasUnsavedChanges) {
      console.log('Showing unsaved dialog');
      setPendingNavigation(path);
      setShowUnsavedDialog(true);
    } else {
      console.log('No unsaved changes, navigating directly');
      router.push(path);
    }
  }, [hasUnsavedChanges, router]);

  const handleSubmitChanges = () => {
    if (!activity || !user) return;
    
    // Convert mappings back to position array format for server
    const positions = Object.values(userMappings).map((mapping: any) => ({
      tagId: mapping.tagId,
      instanceId: mapping.instanceId,
      x: mapping.x,
      y: mapping.y,
      annotation: mapping.annotation
    }));
    
    updateMapping(positions, true); // Mark as complete like the main submit button
    lastSavedMappings.current = { ...userMappings };
    setHasUnsavedChanges(false);
    setShowUnsavedDialog(false);
    
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleDiscardChanges = () => {
    setUserMappings(lastSavedMappings.current);
    setHasUnsavedChanges(false);
    setShowUnsavedDialog(false);
    
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const handleCompleteMappings = () => {
    if (!activity || !user) return;
    
    // Convert mappings back to position array format for server
    const positions = Object.values(userMappings).map((mapping: any) => ({
      tagId: mapping.tagId,
      instanceId: mapping.instanceId,
      x: mapping.x,
      y: mapping.y,
      annotation: mapping.annotation
    }));
    
    // Update with real-time updates
    // Important: Create a properly structured mapping update
    // with the isComplete flag set at the mapping level, not just on positions
    updateMapping(positions, true); // Pass true to mark the entire mapping as complete
    lastSavedMappings.current = { ...userMappings };
    setHasUnsavedChanges(false);
    
    // If admin, redirect to results and change phase
    if (isAdmin) {
      changePhase('mapping-results');
      router.push(`/activity/${activity.id}/mapping-results`);
    } else {
      // Show completion message
      alert('Your mappings have been submitted successfully!');
    }
  };
  
  if (loading) {
    return <div className="loading-container">Loading mapping interface...</div>;
  }
  
  if (!activity) {
    return <ActivityNotFound />;
  }
  
  const approvedTags = activity.tags.filter((tag: any) => tag.status === 'approved');
  const mappingSettings = activity.settings.mapping || {
    xAxisLabel: 'Knowledge',
    xAxisLeftLabel: "Don't Know",
    xAxisRightLabel: 'Know',
    xAxisMinLabel: "Don't Know",
    xAxisMaxLabel: 'Know',
    yAxisLabel: 'Preference',
    yAxisTopLabel: 'Like',
    yAxisBottomLabel: "Don't Like",
    yAxisMinLabel: "Don't Like",
    yAxisMaxLabel: 'Like',
    gridSize: 4,
    enableAnnotations: true,
    maxAnnotationLength: 280,
    instruction: 'Position each tag on the grid according to your perspective. You can add comments to explain your choices.',
    contextInstructions: 'Why did you position this here?'
  };
  
  const completionPercentage = approvedTags.length > 0 
    ? Math.round((mappedTags.length / approvedTags.length) * 100) 
    : 0;

  return (
    <div className="mapping-page">
      <div className="mapping-container">
        <div className="mapping-header">
          <h1 className="core-question">{activity.settings.mapping?.coreQuestion || 'Position each tag on the grid'}</h1>
          
          <div className="mapping-instructions">
            <p>
              {mappingSettings.instruction || 
                `Position each tag on the grid according to your perspective.${
                  mappingSettings.enableAnnotations ? ' You can add comments to explain your choices.' : ''
                }`
              }
            </p>
          </div>
          
        </div>
        
        <div className="mapping-workspace">
          <TagSelectionPanel 
            tags={approvedTags}
            tagInstances={Object.values(userMappings)
              .filter((mapping: any) => 
                approvedTags.some(tag => tag.id === mapping.tagId) && !mapping.isPlaceholder
              )
              .map((mapping: any) => ({
                id: mapping.instanceId || mapping.tagId,
                tagId: mapping.tagId,
                instanceId: mapping.instanceId,
                text: mapping.text,
                status: 'approved',
                annotation: mapping.annotation
              }))}
            selectedTag={selectedTag}
            selectedInstanceId={selectedInstanceId}
            onSelectTag={handleTagSelect}
            onAddTagInstance={handleAddTagInstance}
            onRemoveTagInstance={handleRemoveTagInstance}
          />
          
          <div className="map-and-context-container">
            <MappingGrid 
              settings={mappingSettings}
              selectedTag={selectedTag ? approvedTags.find(t => t.id === selectedTag) : null}
              selectedInstanceId={selectedInstanceId}
              userMappings={userMappings}
              approvedTagIds={approvedTags.map(tag => tag.id)}
              onPositionTag={handleTagPosition}
            />
            
            {/* Context Display - Single input for selected tag */}
            <div className="context-display">
              <div className="context-header">
                <h3>
                  {selectedTag 
                    ? isAddingNewInstance 
                      ? 'First position on map then add context'
                      : `Context for ${approvedTags.find(t => t.id === selectedTag)?.text}` 
                    : 'Context'
                  }
                </h3>
                {selectedTag && !isAddingNewInstance && (
                  <button
                    className="update-context-button"
                    onClick={() => {
                      // Find the most recent instance of the selected tag
                      const selectedTagMappings = Object.entries(userMappings)
                        .filter(([, mapping]: [string, any]) => mapping.tagId === selectedTag);
                      
                      if (selectedTagMappings.length > 0) {
                        const [lastPositionKey, lastMapping] = selectedTagMappings[selectedTagMappings.length - 1];
                        const newUserMappings = {
                          ...userMappings,
                          [lastPositionKey]: {
                            ...lastMapping,
                            annotation: editingContext
                          }
                        };
                        setUserMappings(newUserMappings);
                        
                        // Deselect the current tag after updating context
                        setSelectedTag(null);
                        setSelectedInstanceId(null);
                        setEditingContext('');
                      }
                    }}
                  >
                    Update Context
                  </button>
                )}
              </div>
              <div className="context-input-container">
                <textarea
                  value={editingContext}
                  onChange={(e) => setEditingContext(e.target.value)}
                  placeholder={selectedTag ? "Add context for this positioning..." : "Select a tag to add context"}
                  className="context-input"
                  rows={4}
                  disabled={!selectedTag || isAddingNewInstance}
                />
              </div>
            </div>
          </div>
        </div>

        <ConnectionStatus 
          status={{ 
            isConnected: isConnected, 
            error: connectionError 
          }} 
        />

        <div className="navigation-controls">
          <button
            onClick={() => navigateWithUnsavedCheck(`/activity/${activity.id}/tags`)}
            className="secondary-button"
          >
            Back to Tags
          </button>
          
          <button
            onClick={() => navigateWithUnsavedCheck(`/activity/${activity.id}/mapping-results`)}
            className="secondary-button"
          >
            View Results
          </button>
          
          <button
            onClick={handleCompleteMappings}
            className="primary-button"
            disabled={mappedTags.length === 0}
          >
            {isAdmin ? 'Complete and View Results' : 'Submit My Mappings'}
          </button>
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSubmit={handleSubmitChanges}
        onDiscard={handleDiscardChanges}
        onCancel={handleCancelNavigation}
      />

      <style jsx>{`
        .mapping-page {
          color: #202124;
        }
        
        .mapping-container {
          background-color: white;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 2rem;
          margin-top: -1px;
        }
        
        .mapping-header {
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .core-question {
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 2.2rem;
          color: #202124;
          font-weight: 600;
        }
        
        
        .mapping-instructions {
          margin-bottom: 1.5rem;
          color: #5f6368;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .unsaved-indicator {
          color: #ea4335;
          font-weight: 500;
        }
        
        .mapping-workspace {
          display: flex;
          align-items: flex-start;
          gap: 2rem;
          margin-bottom: 2rem;
          position: relative;
        }
        
        .mapping-workspace :global(.tag-selection-panel) {
          margin-top: calc(0.9rem + 0.5rem + 1rem);
          height: calc(600px + 1rem + 200px);
        }
        
        .map-and-context-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-top: 0;
          margin-left: calc(30px + 0.5rem);
        }
        
        .context-display {
          margin-top: 1rem;
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
          min-height: 200px;
          margin-right: calc(30px + 0.5rem + 0.5rem);
        }
        
        .context-placeholder {
          text-align: center;
          color: #5f6368;
          font-style: italic;
          padding: 2rem;
        }
        
        .context-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .context-display h3 {
          margin: 0;
          color: #202124;
          font-size: 1.1rem;
          flex: 1;
        }
        
        .context-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        
        .context-item {
          background-color: white;
          border-radius: 6px;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .context-tag {
          font-weight: 500;
          margin-bottom: 0.5rem;
          padding-left: 0.75rem;
          color: #202124;
        }
        
        .context-input-container {
          margin-top: 0;
        }
        
        .context-input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #dadce0;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: inherit;
          resize: vertical;
          min-height: 60px;
        }
        
        .context-input:focus {
          outline: none;
          border-color: #1a73e8;
          box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
        }
        
        .context-input:disabled {
          background-color: #f8f9fa;
          color: #9aa0a6;
          cursor: not-allowed;
        }
        
        .update-context-button {
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.4rem 0.8rem;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background-color 0.2s;
          white-space: nowrap;
        }
        
        .update-context-button:hover {
          background-color: #1765cc;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: #5f6368;
          text-align: center;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(26, 115, 232, 0.2);
          border-radius: 50%;
          border-top-color: #1a73e8;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .navigation-controls {
          display: flex;
          justify-content: space-between;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #eee;
          gap: 1rem;
        }
        
        .secondary-button {
          background-color: #f1f3f4;
          color: #202124;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .secondary-button:hover {
          background-color: #e8eaed;
        }
        
        .primary-button {
          background-color: #1a73e8;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-left: auto;
        }
        
        .primary-button:hover:not(:disabled) {
          background-color: #1765cc;
        }
        
        .primary-button:disabled {
          background-color: #c6d4e8;
          cursor: not-allowed;
        }
        
        @media (max-width: 992px) {
          .mapping-workspace {
            flex-direction: column;
          }
          
          .completion-badge {
            position: static;
            display: inline-block;
            margin-top: 0.5rem;
          }
          
          .mapping-page {
            padding: 1rem;
          }
          
          .mapping-container {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}