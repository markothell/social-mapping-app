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
      // If we're on the main domain, redirect to admin subdomain
      window.location.href = getAdminUrl('/admin');
    }
  }, [router]);
  
  return <div>Redirecting to admin dashboard...</div>;
}