'use client';

import React, { useState, useEffect } from 'react';
import { Activity } from '@/models/Activity';
import { hybridActivityService } from '@/core/services/hybridActivityService';

interface ActivityDashboardProps {
  activities: Activity[];
}

interface DashboardTab {
  id: 'general' | 'settings' | 'lineage';
  label: string;
}

const TABS: DashboardTab[] = [
  { id: 'general', label: 'General Stats' },
  { id: 'settings', label: 'Activity Settings' },
  { id: 'lineage', label: 'Lineage' }
];

export default function ActivityDashboard({ activities }: ActivityDashboardProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'settings' | 'lineage'>('general');
  const [allActivities, setAllActivities] = useState<Activity[]>(activities);

  useEffect(() => {
    setAllActivities(activities);
  }, [activities]);

  const handleActivitySelect = (activity: Activity) => {
    setSelectedActivity(activity);
    setActiveTab('general');
  };

  const handleClone = async (activity: Activity) => {
    try {
      const response = await fetch(`https://social-mapping-socket-server.onrender.com/api/activities/${activity.id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clone activity');
      }

      const clonedActivity = await response.json();
      
      // Redirect to admin page to see the cloned activity
      window.location.href = '/admin';
    } catch (error) {
      console.error('Failed to clone activity:', error);
    }
  };

  const handleGoToActivity = (activity: Activity) => {
    window.open(`/activity/${activity.id}`, '_blank');
  };

  const renderGeneralStats = (activity: Activity) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Participants</div>
          <div className="text-2xl font-bold">{activity.participants.length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Tags</div>
          <div className="text-2xl font-bold">{activity.tags.length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Status</div>
          <div className={`text-lg font-semibold capitalize ${activity.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
            {activity.status}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Created</div>
          <div className="text-lg">{new Date(activity.createdAt).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );

  const renderSettings = (activity: Activity) => {
    const tagCoreQuestion = activity.settings.tagCreation?.coreQuestion;
    const mappingCoreQuestion = activity.settings.mapping?.coreQuestion;
    
    // Get core questions, including default ones
    const questions = [];
    if (tagCoreQuestion) {
      questions.push(tagCoreQuestion);
    } else if (activity.settings.tagCreation?.instruction) {
      questions.push(activity.settings.tagCreation.instruction);
    }
    
    if (mappingCoreQuestion) {
      questions.push(mappingCoreQuestion);
    } else if (activity.settings.mapping?.instruction) {
      questions.push(activity.settings.mapping.instruction);
    }
    
    return (
      <div className="space-y-4">
        {questions.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Core Questions:</h4>
            <div className="bg-gray-50 p-3 rounded">
              {questions.map((question, index) => (
                <div key={index} className={index > 0 ? "mt-2 pt-2 border-t border-gray-300" : ""}>
                  {question}
                </div>
              ))}
            </div>
          </div>
        )}

        {activity.type === 'mapping' && activity.settings.mapping && (
          <div>
            <h4 className="font-semibold mb-2">Map:</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">X-Axis</div>
                <div>{activity.settings.mapping.xAxisMinLabel} ↔ {activity.settings.mapping.xAxisMaxLabel}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Y-Axis</div>
                <div>{activity.settings.mapping.yAxisMinLabel} ↔ {activity.settings.mapping.yAxisMaxLabel}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLineage = (activity: Activity) => (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2">Lineage Path</h4>
        {activity.lineage.length > 0 ? (
          <div className="space-y-2">
            {activity.lineage.map((ancestorId, index) => {
              const ancestor = allActivities.find(a => a.id === ancestorId);
              return (
                <div key={ancestorId} className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm">
                    {ancestor?.settings.entryView?.title || ancestorId} 
                    {index < activity.lineage.length - 1 && ' →'}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-semibold">
                {activity.settings.entryView?.title || 'Current Activity'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">This is an original activity</div>
        )}
      </div>

      <div>
        <h4 className="font-semibold mb-2">Children ({activity.children.length})</h4>
        {activity.children.length > 0 ? (
          <div className="space-y-2">
            {activity.children.map(childId => {
              const child = allActivities.find(a => a.id === childId);
              return (
                <div key={childId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-sm">
                    {child?.settings.entryView?.title || childId}
                  </span>
                  {child && (
                    <button
                      onClick={() => setSelectedActivity(child)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No cloned activities</div>
        )}
      </div>

      {activity.clonedFrom && (
        <div>
          <h4 className="font-semibold mb-2">Cloned From</h4>
          <div className="bg-gray-50 p-2 rounded">
            <span className="text-sm">
              {allActivities.find(a => a.id === activity.clonedFrom)?.settings.entryView?.title || activity.clonedFrom}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Social Insight Tools</h1>
        <p className="text-gray-600">Select an activity to view detailed information</p>
      </div>

      <div className="space-y-6">
        {selectedActivity && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">
                {selectedActivity.settings.entryView?.title || 'Untitled Activity'}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleClone(selectedActivity)}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Clone
                </button>
                <button
                  onClick={() => handleGoToActivity(selectedActivity)}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  Go To Activity
                </button>
              </div>
            </div>

            <div className="border-b mb-4">
              <nav className="flex space-x-4">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-3 text-sm font-medium border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="space-y-4">
              {activeTab === 'general' && renderGeneralStats(selectedActivity)}
              {activeTab === 'settings' && renderSettings(selectedActivity)}
              {activeTab === 'lineage' && renderLineage(selectedActivity)}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Activities</h2>
          <div className="divide-y divide-gray-200">
            {allActivities.map(activity => (
              <div
                key={activity.id}
                onClick={() => handleActivitySelect(activity)}
                className={`py-4 cursor-pointer transition-colors ${
                  selectedActivity?.id === activity.id
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start px-4">
                  <div className="flex-1">
                    <div className="font-medium text-lg">
                      {activity.settings.entryView?.title || 'Untitled Activity'}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>By {activity.ownerName}</span>
                      <span>{activity.participants.length} participants</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        activity.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}