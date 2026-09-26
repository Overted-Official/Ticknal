import Link from 'next/link';
import { connection } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles, pushSubscriptions, devicePushTokens } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import SettingsPageView, {
  type SettingsUserProfile,
  type DeviceInfo,
} from '@/components/platform/settings/SettingsPageView';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-auto bg-transparent p-8 text-center text-white select-none">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">Ticknal Settings</h2>
        <p className="mb-6 text-xs text-text-muted max-w-sm">Please sign in to manage your account profile, devices, and alert triggers.</p>
        <Link
          href="/"
          className="px-5 py-2 rounded-lg text-xs font-semibold bg-brand-blue hover:opacity-90 text-white transition-colors shadow-xs"
        >
          Sign In
        </Link>
      </div>
    );
  }

  let deviceRows: (typeof pushSubscriptions.$inferSelect)[] = [];
  let mobileDeviceRows: (typeof devicePushTokens.$inferSelect)[] = [];

  try {
    const [devRes, mobileRes] = await Promise.allSettled([
      db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id)).orderBy(desc(pushSubscriptions.createdAt)),
      db.select().from(devicePushTokens).where(eq(devicePushTokens.userId, user.id)).orderBy(desc(devicePushTokens.createdAt)),
    ]);

    if (devRes.status === 'fulfilled') deviceRows = devRes.value;
    if (mobileRes.status === 'fulfilled') mobileDeviceRows = mobileRes.value;
  } catch (err) {
    console.error('Error loading settings data:', err);
  }

  // Fetch profile from public.profiles (canonical source of truth)
  // Falls back to auth metadata if the profile row was somehow missing (shouldn't happen in practice).
  let profileRow: typeof profiles.$inferSelect | undefined;
  try {
    const [row] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
    profileRow = row;
  } catch {
    profileRow = undefined;
  }

  const metadata = user.user_metadata ?? {};
  const identityData = user.identities?.[0]?.identity_data ?? {};

  const name =
    profileRow?.fullName ??
    ((typeof metadata.full_name === 'string' && metadata.full_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      (typeof identityData.full_name === 'string' && identityData.full_name) ||
      user.email?.split('@')[0] ||
      'Trader');

  const avatarUrl =
    profileRow?.avatarUrl ??
    ((typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
      (typeof metadata.picture === 'string' && metadata.picture) ||
      (typeof identityData.avatar_url === 'string' && identityData.avatar_url) ||
      null);

  const userProfile: SettingsUserProfile = {
    id: user.id,
    email: profileRow?.email ?? user.email ?? 'No email provided',
    emailConfirmed: Boolean(user.email_confirmed_at),
    name: name || 'Trader',
    avatarUrl: avatarUrl || null,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
    provider: user.app_metadata?.provider ?? user.identities?.[0]?.provider ?? 'email',
  };

  const devices: DeviceInfo[] = [
    ...deviceRows.map((d) => ({
      id: d.id,
      endpoint: d.endpoint,
      userAgent: d.userAgent,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    ...mobileDeviceRows.map((m) => ({
      id: m.id,
      endpoint: m.token,
      userAgent: `Native App (${m.deviceModel || (m.platform === 'ios' ? 'Apple iPhone' : 'Android Device')})`,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  ];

  return (
    <SettingsPageView
      userProfile={userProfile}
      initialDevices={devices}
    />
  );
}
