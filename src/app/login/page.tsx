import React, { Suspense } from 'react';
import LoginPageView from '@/components/auth/LoginPageView';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading sign in" />}>
      <LoginPageView />
    </Suspense>
  );
}
