import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LandingPageView from '@/components/landing/LandingPageView';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect('/home');
  }

  return <LandingPageView />;
}
