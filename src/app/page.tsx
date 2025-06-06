"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminUrl, isAdminDomain } from '@/utils/adminUrls';

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // If we're already on the admin domain, just go to /admin
    if (isAdminDomain()) {
      router.push('/admin');
    } else {
      // If we're on the app domain, redirect to main domain
      window.location.href = 'https://socialinsight.tools';
    }
  }, [router]);
  
  return <div>Redirecting...</div>;
}