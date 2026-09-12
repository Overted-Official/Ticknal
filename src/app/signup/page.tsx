'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login?mode=signup');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white text-sm">
      Redirecting to Ticknal Registration...
    </div>
  );
}
