import React, { Suspense } from 'react';
import LoginPageView from '@/components/auth/LoginPageView';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginPageView />
    </Suspense>
  );
}
