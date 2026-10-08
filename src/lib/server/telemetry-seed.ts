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

    // 1. AbdelRahman (Admin) -> Cairo / New Cairo (Desktop macOS)
    const adminUser = profileByEmail.get('abdelrahman.m.abualola@gmial.com');
    if (adminUser) {
      for (let day = 0; day <= 60; day += 3) {
        baselineRecords.push({
          userId: adminUser.id,
          sessionId: `sess-admin-${day}`,
          country: 'Egypt',
          countryCode: 'EG',
          regionOrGovernorate: 'Cairo Governorate',
          city: 'New Cairo (Tagamoa)',
          latitude: '30.013100',
          longitude: '31.491300',
          timezone: 'Africa/Cairo',
          ispOrCarrier: 'Telecom Egypt (WE)',
          channel: 'direct',
          referrer: 'https://ticknal.com',
          landingPath: '/console/users',
          deviceType: 'desktop',
          os: 'macOS',
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
          channel: 'linkedin',
          referrer: 'https://www.linkedin.com/',
          utmSource: 'linkedin',
          utmMedium: 'organic',
          utmCampaign: 'trading_take',
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
          channel: 'instagram',
          referrer: 'https://l.instagram.com/',
          utmSource: 'instagram',
          utmMedium: 'bio_link',
          landingPath: '/markets',
          deviceType: 'mobile',
          os: 'iOS',
          browser: 'Safari',
          isPwaOrNative: false,
          createdAt: daysAgo(day, 15),
        });
      }
    }

    // 4. Amr Abbas (Free) -> Alexandria / Corniche (Desktop Windows)
    const amrUser = profileByEmail.get('amr.abbas.fouad@gmail.com');
    if (amrUser) {
      for (let day = 2; day <= 40; day += 4) {
        baselineRecords.push({
          userId: amrUser.id,
          sessionId: `sess-amr-${day}`,
          country: 'Egypt',
          countryCode: 'EG',
          regionOrGovernorate: 'Alexandria Governorate',
          city: 'Alexandria (Corniche)',
          latitude: '31.200100',
          longitude: '29.918700',
          timezone: 'Africa/Cairo',
          ispOrCarrier: 'Etisalat Misr',
          channel: 'google_organic',
          referrer: 'https://www.google.com/',
          landingPath: '/charts',
          deviceType: 'desktop',
          os: 'Windows',
          browser: 'Edge',
          isPwaOrNative: false,
          createdAt: daysAgo(day, 11),
        });
      }
    }

    // 5. Rich Supplementary Target Audiences across Egypt & Regional hubs
    const extraAudiences = [
      {
        city: 'Nasr City',
        region: 'Cairo Governorate',
        lat: '30.056100',
        lng: '31.330100',
        country: 'Egypt',
        countryCode: 'EG',
        channel: 'x_twitter',
        referrer: 'https://t.co/',
        deviceType: 'mobile',
        os: 'iOS',
        browser: 'Safari',
      },
      {
        city: 'Heliopolis',
        region: 'Cairo Governorate',
        lat: '30.088600',
        lng: '31.328500',
        country: 'Egypt',
        countryCode: 'EG',
        channel: 'linkedin',
        referrer: 'https://www.linkedin.com/',
        deviceType: 'desktop',
        os: 'macOS',
        browser: 'Chrome',
      },
      {
        city: 'Dokki & Mohandessin',
        region: 'Giza Governorate',
        lat: '30.038100',
        lng: '31.211400',
        country: 'Egypt',
        countryCode: 'EG',
        channel: 'facebook',
        referrer: 'https://www.facebook.com/',
        deviceType: 'mobile',
        os: 'Android',
        browser: 'Chrome',
      },
      {
        city: '6th of October City',
        region: 'Giza Governorate',
        lat: '29.972300',
        lng: '30.932400',
        country: 'Egypt',
        countryCode: 'EG',
        channel: 'instagram',
        referrer: 'https://l.instagram.com/',
        deviceType: 'mobile',
        os: 'iOS',
        browser: 'Safari',
      },
      {
        city: 'Mansoura',
        region: 'Dakahlia Governorate',
        lat: '31.040900',
        lng: '31.378500',
        country: 'Egypt',
        countryCode: 'EG',
        channel: 'google_organic',
        referrer: 'https://www.google.com/',
        deviceType: 'desktop',
        os: 'Windows',
        browser: 'Chrome',
      },
      {
        city: 'Tanta',
        region: 'Gharbia Governorate',
        lat: '30.786500',
        lng: '31.000400',
        country: 'Egypt',
        countryCode: 'EG',
        channel: 'direct',
        referrer: 'https://ticknal.com',
        deviceType: 'mobile',
        os: 'Android',
        browser: 'Chrome',
      },
      {
        city: 'Dubai (DIFC / Marina)',
        region: 'Dubai',
        lat: '25.204800',
        lng: '55.270800',
        country: 'United Arab Emirates',
        countryCode: 'AE',
        channel: 'linkedin',
        referrer: 'https://www.linkedin.com/',
        deviceType: 'desktop',
        os: 'macOS',
        browser: 'Safari',
      },
      {
        city: 'Riyadh (KAFD)',
        region: 'Riyadh Region',
        lat: '24.713600',
        lng: '46.675300',
        country: 'Saudi Arabia',
        countryCode: 'SA',
        channel: 'x_twitter',
        referrer: 'https://x.com/',
        deviceType: 'mobile',
        os: 'iOS',
        browser: 'Safari',
      },
      {
        city: 'London',
        region: 'Greater London',
        lat: '51.507400',
        lng: '-0.127800',
        country: 'United Kingdom',
        countryCode: 'GB',
        channel: 'direct',
        referrer: 'https://ticknal.com',
        deviceType: 'desktop',
        os: 'Windows',
        browser: 'Chrome',
      },
    ];

    extraAudiences.forEach((aud, idx) => {
      for (let day = 1; day <= 28; day += 3) {
        baselineRecords.push({
          userId: null,
          sessionId: `sess-guest-${idx}-${day}`,
          country: aud.country,
          countryCode: aud.countryCode,
          regionOrGovernorate: aud.region,
          city: aud.city,
          latitude: aud.lat,
          longitude: aud.lng,
          timezone: aud.countryCode === 'EG' ? 'Africa/Cairo' : 'Asia/Dubai',
          ispOrCarrier: 'Regional ISP',
          channel: aud.channel,
          referrer: aud.referrer,
          landingPath: idx % 2 === 0 ? '/news' : '/markets',
          deviceType: aud.deviceType,
          os: aud.os,
          browser: aud.browser,
          isPwaOrNative: false,
          createdAt: daysAgo(day, (idx * 3) % 24),
        });
      }
    });

    if (baselineRecords.length > 0) {
      await db.insert(userTelemetryEvents).values(baselineRecords);
    }

    return { success: true, count: baselineRecords.length };
  } catch (err) {
    console.error('[telemetry-seed] Seed failed:', err);
    return { success: false, count: 0 };
  }
}
