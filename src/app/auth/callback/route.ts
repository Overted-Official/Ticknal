import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  // Default to /dashboard when next param is not provided
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Determine true external origin (handling proxies, Vercel headers, and custom domains)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const isLocalEnv = process.env.NODE_ENV === 'development';

  let siteOrigin = requestUrl.origin;
  if (!isLocalEnv && forwardedHost) {
    siteOrigin = `${forwardedProto}://${forwardedHost}`;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = next.startsWith('/') ? next : `/${next}`;
      return NextResponse.redirect(new URL(destination, siteOrigin).toString());
    }
  }

  // Return the user to home page with error parameter if authentication fails
  return NextResponse.redirect(new URL('/?error=auth', siteOrigin).toString());
}
