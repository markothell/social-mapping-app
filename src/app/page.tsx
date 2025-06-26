"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminUrl, isAdminDomain } from '@/utils/adminUrls';
import ActivityDashboard from '@/components/ActivityDashboard';
import { Activity } from '@/models/Activity';
import { hybridActivityService } from '@/core/services/hybridActivityService';

export default function HomePage() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // If we're on the admin domain, redirect to admin
    if (isAdminDomain()) {
      router.push('/admin');
      return;
    }

    // Load activities for dashboard
    const loadActivities = async () => {
      try {
        console.log('Loading activities for dashboard...');
        const allActivities = await hybridActivityService.getAll();
        console.log('Loaded activities:', allActivities.length, allActivities);
        setActivities(allActivities);
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [router]);
  
  if (isAdminDomain()) {
    return <div>Redirecting to admin...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading activities...</p>
        </div>
      </div>
    );
  }

  return <ActivityDashboard activities={activities} />;
}