'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function SignupPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login?mode=signup');
  }, [router]);

  return <LoadingScreen label="Opening registration" />;
}
