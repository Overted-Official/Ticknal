import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { profiles, userTelemetryEvents } from '@/db/schema';

let isTableEnsured = false;

export async function ensureTelemetryTableExists(): Promise<void> {
  if (isTableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS public.user_telemetry_events (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        session_id VARCHAR(128) NOT NULL,
        country VARCHAR(100) NOT NULL,
        country_code VARCHAR(10) NOT NULL,
        region_or_governorate VARCHAR(100),
        city VARCHAR(100),
        latitude NUMERIC(10, 6),
        longitude NUMERIC(10, 6),
        timezone VARCHAR(50),
        isp_or_carrier VARCHAR(100),
        channel VARCHAR(50) DEFAULT 'direct' NOT NULL,
        referrer TEXT,
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        landing_path TEXT DEFAULT '/' NOT NULL,
        device_type VARCHAR(20) DEFAULT 'desktop' NOT NULL,
        os VARCHAR(50) NOT NULL,
        browser VARCHAR(50) NOT NULL,
        is_pwa_or_native BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS user_telemetry_user_id_idx ON public.user_telemetry_events(user_id);
      CREATE INDEX IF NOT EXISTS user_telemetry_channel_idx ON public.user_telemetry_events(channel);
      CREATE INDEX IF NOT EXISTS user_telemetry_country_idx ON public.user_telemetry_events(country_code);
      CREATE INDEX IF NOT EXISTS user_telemetry_created_at_idx ON public.user_telemetry_events(created_at);
    `);
    isTableEnsured = true;
  } catch (err) {
    console.error('[telemetry-seed] Failed to ensure user_telemetry_events table:', err);
  }
}

export async function ensureBaselineTelemetrySeeded(): Promise<{ success: boolean; count: number }> {
  await ensureTelemetryTableExists();

  try {
    const existing = await db.select({ id: userTelemetryEvents.id }).from(userTelemetryEvents).limit(10);
    if (existing.length >= 10) {
      return { success: true, count: existing.length };
    }

    const allProfiles = await db.select().from(profiles);
    const profileByEmail = new Map(allProfiles.map((p) => [p.email?.toLowerCase() || '', p]));

    const now = Date.now();
    const daysAgo = (d: number, hourOffset = 10) =>
      new Date(now - d * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000);

    const baselineRecords: (typeof userTelemetryEvents.$inferInsert)[] = [];

    // 1. AbdelRahman (Admin) -> Cairo (Desktop Windows / Web)
    const adminUser = profileByEmail.get('abdelrahman.m.abualola@gmail.com');
    if (adminUser) {
      for (let day = 0; day <= 60; day += 3) {
        baselineRecords.push({
          userId: adminUser.id,
          sessionId: `sess-admin-${day}`,
          country: 'Egypt',
          countryCode: 'EG',
          regionOrGovernorate: 'Cairo Governorate',
          city: 'Cairo',
          latitude: '30.044420',
          longitude: '31.235712',
          timezone: 'Africa/Cairo',
          ispOrCarrier: 'Telecom Egypt (WE)',
          channel: 'direct',
          referrer: 'https://ticknal.com',
          landingPath: '/console/users',
          deviceType: 'desktop',
          os: 'Windows',
          browser: 'Chrome',
          isPwaOrNative: false,
          createdAt: daysAgo(day, 9),
        });
      }
    }

    // 2. AbdelRahman Kamha (VIP) -> Cairo / Maadi (Mobile iOS)
    const kamhaUser = profileByEmail.get('kamha2005@gmail.com');
    if (kamhaUser) {
      for (let day = 1; day <= 45; day += 2) {
        baselineRecords.push({
          userId: kamhaUser.id,
          sessionId: `sess-kamha-${day}`,
          country: 'Egypt',
          countryCode: 'EG',
          regionOrGovernorate: 'Cairo Governorate',
          city: 'Maadi',
          latitude: '29.960200',
          longitude: '31.256900',
          timezone: 'Africa/Cairo',
          ispOrCarrier: 'Vodafone Egypt',
          channel: 'direct',
          referrer: null,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          landingPath: '/news',
          deviceType: 'mobile',
          os: 'iOS',
          browser: 'Safari',
          isPwaOrNative: true,
          createdAt: daysAgo(day, 13),
        });
      }
    }

    // 3. Abdelaziz Gabr (VIP) -> Giza / Sheikh Zayed (Mobile iOS)
    const gabrUser = profileByEmail.get('abdelazizgabr18@gmail.com');
    if (gabrUser) {
      for (let day = 1; day <= 30; day += 2) {
        baselineRecords.push({
          userId: gabrUser.id,
          sessionId: `sess-gabr-${day}`,
          country: 'Egypt',
          countryCode: 'EG',
          regionOrGovernorate: 'Giza Governorate',
          city: 'Sheikh Zayed',
          latitude: '30.038400',
          longitude: '30.985000',
          timezone: 'Africa/Cairo',
          ispOrCarrier: 'Orange Egypt',
          channel: 'direct',
          referrer: null,
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          landingPath: '/markets',
          deviceType: 'mobile',
          os: 'iOS',
          browser: 'Safari',
          isPwaOrNative: false,
          createdAt: daysAgo(day, 15),
        });
      }
    }

    if (baselineRecords.length > 0) {
      await db.insert(userTelemetryEvents).values(baselineRecords);
    }

    return { success: true, count: baselineRecords.length };
  } catch (err) {
    console.error('[telemetry-seed] Seed failed:', err);
    return { success: false, count: 0 };
  }
}
