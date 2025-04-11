"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/admin');
  }, [router]);
  
  return <div>Redirecting to admin dashboard...</div>;
}