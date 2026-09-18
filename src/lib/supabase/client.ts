import { createBrowserClient } from '@supabase/ssr';

const DEV_USER = {
  id: '4425418c-eef9-474e-bd27-acf59d2ec7f8',
  email: 'abdelrahman.m.abualola@gmail.com',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Abdelrahman Mamdouh' },
  aud: 'authenticated',
  created_at: '2026-08-15T14:01:17.228Z',
  role: 'authenticated',
};

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (process.env.NEXT_PUBLIC_USE_LOCAL_DB === 'true') {
    const originalGetUser = client.auth.getUser.bind(client.auth);
    client.auth.getUser = async (jwt?: string) => {
      try {
        const res = await originalGetUser(jwt);
        if (res.data?.user) return res;
      } catch {}
      return {
        data: { user: DEV_USER as any },
        error: null,
      };
    };

    const originalGetSession = client.auth.getSession.bind(client.auth);
    client.auth.getSession = async () => {
      try {
        const res = await originalGetSession();
        if (res.data?.session) return res;
      } catch {}
      return {
        data: {
          session: {
            access_token: 'mock-local-token',
            refresh_token: 'mock-local-refresh',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: DEV_USER,
          } as any,
        },
        error: null,
      };
    };
  }

  return client;
}

