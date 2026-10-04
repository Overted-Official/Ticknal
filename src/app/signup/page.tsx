'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useTranslation } from '@/lib/i18n';

export default function SignupPage() {
  const { locale } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    router.replace('/login?mode=signup');
  }, [router]);

  return (
    <LoadingScreen
      label={locale === 'ar' ? 'جارٍ فتح التسجيل...' : 'Opening registration...'}
    />
  );
}

