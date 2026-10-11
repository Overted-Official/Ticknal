import { NextResponse } from 'next/server';
import { db } from '@/db';
import { userTelemetryEvents } from '@/db/schema';
import { ensureTelemetryTableExists } from '@/lib/server/telemetry-seed';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    await ensureTelemetryTableExists();

    const body = await req.json().catch(() => ({}));
    const headers = req.headers;
    const userAgent = headers.get('user-agent') || '';
    if (
      userAgent.includes('HeadlessChrome') ||
      userAgent.includes('Playwright') ||
      userAgent.includes('Puppeteer')
    ) {
      return NextResponse.json({ success: true, ignored: true });
    }

    // 1. Resolve client IP
    const forwarded = headers.get('x-forwarded-for');
    const realIp = headers.get('x-real-ip');
    const ip = (forwarded ? forwarded.split(',')[0].trim() : realIp) || '127.0.0.1';

    // 2. Identify Authenticated User (if any)
    let userId: string | null = headers.get('x-user-id');
    if (!userId) {
      try {
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          userId = data.user.id;
        }
      } catch {
        // Unauthenticated visitor
      }
    }

    // 3. Resolve Geolocation from edge headers or defaults
    const headerCountry = headers.get('x-vercel-ip-country') || headers.get('cf-ipcountry');
    const headerCity = headers.get('x-vercel-ip-city');
    const headerRegion = headers.get('x-vercel-ip-country-region');
    const headerLat = headers.get('x-vercel-ip-latitude');
    const headerLng = headers.get('x-vercel-ip-longitude');
    const headerTimezone = headers.get('x-vercel-ip-timezone');

    // Default to Egypt for national EGX platform if IP is local/unresolved
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
    const country = headerCountry === 'EG' || isLocal ? 'Egypt' : headerCountry || 'Egypt';
    const countryCode = headerCountry || 'EG';
    const regionOrGovernorate = headerRegion || (countryCode === 'EG' ? 'Cairo Governorate' : 'Capital Region');
    const city = headerCity || (countryCode === 'EG' ? 'Cairo' : 'Metropolitan');
    const latitude = headerLat || (countryCode === 'EG' ? '30.044420' : '25.204800');
    const longitude = headerLng || (countryCode === 'EG' ? '31.235712' : '55.270800');
    const timezone = headerTimezone || 'Africa/Cairo';

    // 4. Fallback defaults for client payload
    const sessionId = String(body.sessionId || `anon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    const channel = String(body.channel || 'direct');
    const referrer = body.referrer ? String(body.referrer) : null;
    const utmSource = body.utmSource ? String(body.utmSource) : null;
    const utmMedium = body.utmMedium ? String(body.utmMedium) : null;
    const utmCampaign = body.utmCampaign ? String(body.utmCampaign) : null;
    const landingPath = String(body.landingPath || '/');
    const deviceType = String(body.deviceType || 'desktop');
    const os = String(body.os || 'Windows');
    const browser = String(body.browser || 'Chrome');
    const isPwaOrNative = Boolean(body.isPwaOrNative);

    // 5. Insert telemetry record
    const [inserted] = await db
      .insert(userTelemetryEvents)
      .values({
        userId,
        sessionId,
        country,
        countryCode,
        regionOrGovernorate,
        city,
        latitude,
        longitude,
        timezone,
        ispOrCarrier: 'Telecom Egypt / Local Carrier',
        channel,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
        landingPath,
        deviceType,
        os,
        browser,
        isPwaOrNative,
      })
      .returning({ id: userTelemetryEvents.id });

    return NextResponse.json({
      success: true,
      eventId: inserted?.id,
      country,
      city,
    });
  } catch (err) {
    console.error('[/api/telemetry/event] Error logging event:', err);
    return NextResponse.json(
      { success: false, error: 'Internal telemetry ingestion error' },
      { status: 500 }
    );
  }
}
