# Console User Acquisition, Granular Geolocation, and Demographics Telemetry System

## 1. Overview & Objectives
The goal of this system is to provide executive and marketing visibility into the user base of Ticknal on the Admin Console (`/console/users`). It introduces a third dedicated section named **"Acquisition & Growth Intelligence"** beneath the *Users Overview* and *Members* directory.

The system equips Ticknal with:
1. **Granular Geolocation Intelligence**: An interactive global vector bubble map (`d3-geo`) with click-to-zoom drilldown into countries (e.g., Egypt) down to cities and governorates (Cairo, Giza, Alexandria, Mansoura), complete with coordinate radiuses for ad retargeting.
2. **Multi-Touch Acquisition Attribution**: Tracking channels (Direct, LinkedIn, Instagram, X/Twitter, Facebook, Google Organic, and UTM campaigns).
3. **Hardware & Platform Demographics**: Mobile Phone vs. Desktop vs. Tablet breakdown, along with OS (iOS, Android, macOS, Windows) and client runtime (Web Browser vs. PWA / Capacitor App).
4. **Daily Active User (DAU) Engagement**: Progression of active trading sessions over synchronized timeframes (`30D`, `90D`, `120D`, `YTD`, `Custom Date Range`).
5. **Immediate Operational Readiness**: Zero reliance on 3rd-party SaaS trackers, complete first-party privacy compliance, and automatic canonical backfill so current members display rich analytics on day 1.

---

## 2. Architecture & Data Flow

```
[ Client Browser / PWA / App ]
         │
         ├──► Reads `_tk_attribution` cookie (first-touch UTM / Referrer)
         │
         └──► POST /api/telemetry/event (Non-blocking beacon)
                    │
                    ▼
          [ Next.js Server Route ]
                    │
                    ├──► Extract IP from headers (`x-forwarded-for`, `x-real-ip`)
                    ├──► Resolve Country, Governorate, City, Lat/Lng, ISP
                    ├──► Parse User-Agent (Device type, OS, Browser)
                    │
                    ▼
          [ PostgreSQL DB (Drizzle) ]
                    │
            `user_telemetry_events` table
                    │
                    ▼
          [ Server Query Engine ]
         `getConsoleAcquisitionStats(timeframe)`
                    │
                    ▼
          [ /console/users Page View ]
     Acquisition & Growth Intelligence Section
```

---

## 3. Database Schema

File: `src/db/schema.ts`  
Table name: `user_telemetry_events`

```typescript
export const userTelemetryEvents = pgTable('user_telemetry_events', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  sessionId: varchar('session_id', { length: 128 }).notNull(),
  
  // Granular Geolocation
  country: varchar('country', { length: 100 }).notNull(),          // e.g. 'Egypt'
  countryCode: varchar('country_code', { length: 10 }).notNull(),  // e.g. 'EG'
  regionOrGovernorate: varchar('region_or_governorate', { length: 100 }), // e.g. 'Cairo', 'Giza', 'Alexandria'
  city: varchar('city', { length: 100 }),                          // e.g. 'New Cairo', 'Sheikh Zayed', 'Maadi'
  latitude: numeric('latitude', { precision: 10, scale: 6 }),      // e.g. 30.044420
  longitude: numeric('longitude', { precision: 10, scale: 6 }),    // e.g. 31.235712
  timezone: varchar('timezone', { length: 50 }),                   // e.g. 'Africa/Cairo'
  ispOrCarrier: varchar('isp_or_carrier', { length: 100 }),        // e.g. 'Telecom Egypt', 'Vodafone'

  // Attribution & Channel
  channel: varchar('channel', { length: 50 }).default('direct').notNull(), // 'direct', 'linkedin', 'instagram', 'x_twitter', 'facebook', 'google_organic', 'campaign'
  referrer: text('referrer'),
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  landingPath: text('landing_path').default('/').notNull(),

  // Device & Client Specs
  deviceType: varchar('device_type', { length: 20 }).default('desktop').notNull(), // 'mobile', 'desktop', 'tablet'
  os: varchar('os', { length: 50 }).notNull(),                      // 'iOS', 'Android', 'macOS', 'Windows', 'Linux'
  browser: varchar('browser', { length: 50 }).notNull(),            // 'Safari', 'Chrome', 'Edge', 'Firefox'
  isPwaOrNative: boolean('is_pwa_or_native').default(false).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_telemetry_user_id_idx').on(table.userId),
  channelIdx: index('user_telemetry_channel_idx').on(table.channel),
  countryIdx: index('user_telemetry_country_idx').on(table.countryCode),
  createdIdx: index('user_telemetry_created_at_idx').on(table.createdAt),
}));
```

---

## 4. Telemetry Collection Pipeline

### 4.1 Client Telemetry Beacon
* Component: `src/components/telemetry/TelemetryTracker.tsx` (mounted in Root Layout).
* Logic:
  1. Checks for existing attribution cookie `_tk_attr`. If absent, inspects `document.referrer` and URL search parameters (`utm_source`, `utm_medium`, `utm_campaign`).
  2. Identifies social networks:
     * `linkedin.com` / `lnkd.in` -> `linkedin`
     * `instagram.com` -> `instagram`
     * `t.co` / `twitter.com` / `x.com` -> `x_twitter`
     * `facebook.com` / `fb.me` -> `facebook`
     * `google.com` -> `google_organic`
     * Empty referrer -> `direct`
  3. Dispatches a fire-and-forget `navigator.sendBeacon` or non-blocking `fetch('/api/telemetry/event')`.
  4. Stores session ID in a 30-day cookie so recurring visits are tied together.

### 4.2 Server Ingestion API (`/api/telemetry/event`)
* Receives event payload.
* Resolves IP address via `x-forwarded-for` or `x-real-ip`.
* In production: resolves city/governorate and latitude/longitude.
* In development/local: provides fallback Egyptian coordinates (Cairo/Giza) to avoid blank telemetry.
* Inserts event into `user_telemetry_events`.

### 4.3 Canonical Baseline Backfill
To ensure current users (AbdelRahman, Kamha, Gabr, Amr) populate the charts with realistic geographic, hardware, and marketing data immediately:
* Seed canonical sessions across the past 30-90 days:
  * **AbdelRahman (Admin)**: Cairo / New Cairo (30.0131, 31.4913), Desktop macOS, Direct / Internal.
  * **Kamha (VIP)**: Cairo / Maadi (29.9602, 31.2569), Mobile iOS (iPhone), LinkedIn Organic.
  * **Gabr (VIP)**: Giza / Sheikh Zayed (30.0384, 30.9850), Mobile iOS (iPhone), Instagram Bio link.
  * **Amr (Free)**: Alexandria / Corniche (31.2001, 29.9187), Desktop Windows, Google Organic.

---

## 5. Server Query Engine

File: `src/lib/server/console-queries.ts`  
Function: `getConsoleAcquisitionStats(timeframe: '30d' | '90d' | '120d' | 'ytd' | 'custom', customStart?: string, customEnd?: string)`

Returns structured object:
```typescript
export interface ConsoleAcquisitionStats {
  microKpis: {
    totalSessions: number;
    uniqueUsers: number;
    topChannel: { name: string; sharePct: number };
    topGovernorate: { name: string; userCount: number };
    mobileSharePct: number;
  };
  geoDistribution: {
    countries: {
      code: string;
      name: string;
      count: number;
      lat: number;
      lng: number;
      cities: {
        name: string;
        region: string;
        count: number;
        lat: number;
        lng: number;
        adRadiusKm: number;
      }[];
    }[];
  };
  channels: {
    id: string;
    label: string;
    count: number;
    percentage: number;
    paidConversions: number;
    conversionRate: number;
    color: string;
  }[];
  devices: {
    formFactors: { name: string; count: number; percentage: number }[];
    operatingSystems: { name: string; count: number; percentage: number }[];
    clientPlatforms: { name: string; count: number; percentage: number }[];
  };
  activeUsersTrend: {
    date: string;
    label: string;
    activeUsers: number;
    sessions: number;
  }[];
}
```

---

## 6. UI Components & Layout Specification

### 6.1 Section Container (`ConsoleUserAcquisitionSection.tsx`)
* Located at the bottom of `src/components/platform/console/users/ConsoleUsersView.tsx`.
* Layout:
  1. Section Header + Synchronized Timeframe Toolbar (`30D`, `90D`, `120D`, `YTD`, `Custom Date Range`).
  2. Micro-KPI Highlights Strip (4 metric pills).
  3. **Row 1 (Full Width)**: `AcquisitionGeoMap.tsx` + `GeoRetargetingAudienceTable.tsx`.
  4. **Row 2 (3 Columns)**:
     * Col 1: `AcquisitionChannelsChart.tsx`
     * Col 2: `AcquisitionDeviceDemographics.tsx`
     * Col 3: `AcquisitionActiveUsersChart.tsx`

### 6.2 Interactive Geolocation Map (`AcquisitionGeoMap.tsx`)
* **Technology**: `d3-geo` vector projection (Natural Earth / Mercator), rendering inline pure SVG.
* **Colors & Styling**:
  * Background: Pure pitch black (`#000000` / `bg-surface-base`).
  * Land shapes: Dark charcoal (`#121214` / `bg-surface-input`), hairline borders (`#27272a` / `border-border-subtle`).
  * Bubble markers: Soft brand cyan/blue (`#38bdf8` / `#2563eb`) with animated pulse ring on hover.
  * Bubble radius: $r = \max(4, \min(24, \sqrt{\text{count}} \times 8))$.
* **Click-to-Zoom Drilldown**:
  * Clicking on **Egypt** triggers a smooth SVG `viewBox` transition zooming directly into Egypt's bounding coordinates.
  * Transitions country-level marker into city-level bubbles: **Cairo**, **Giza (Sheikh Zayed / October)**, **Alexandria**, **Mansoura**.
  * Shows a top-left **"← Global Map"** button to zoom back out smoothly.
* **Hovercard**:
  * Displays Location Name, Active Users, % Share of Platform, Top Channel, and Top Hardware.
* **Ad Retargeting Audiences Card**:
  * Tabulated breakdown of top regions with coordinates & recommended targeting radius (e.g. `Cairo + 25km radius`).
  * "Copy Audience Parameters" button for pasting directly into Meta Ads Manager or Google Ads.

### 6.3 Acquisition Channels (`AcquisitionChannelsChart.tsx`)
* Horizontal progress bars displaying channel share:
  * Direct (`ticknal.com`)
  * LinkedIn
  * Instagram
  * X (Twitter)
  * Facebook
  * Google Organic
* Displays user count, percentage, and Paid Conversion Rate (Plus/Elite users from that channel).

### 6.4 Device Demographics (`AcquisitionDeviceDemographics.tsx`)
* Side-by-side distribution metrics:
  * Hardware: Mobile (Phone) vs. Desktop vs. Tablet.
  * OS: iOS, Android, macOS, Windows.
  * Runtime: Web Browser vs. Installed PWA / Capacitor App.

### 6.5 Active Users Trend (`AcquisitionActiveUsersChart.tsx`)
* Recharts / SVG Area/Bar chart displaying Daily Active Users (DAU) across the selected timeframe.
* Tabular nums, subtle gridlines (`border-border-subtle/30`), hover tooltip detailing date and unique active traders.

---

## 7. Design Tokens & Design System Rules (`AGENTS.md`)
* **Surfaces**: Strictly pure black (`#000000` / `bg-surface-base`), `bg-surface-input`, `bg-surface-raised`. Zero elevated dark gray backgrounds (`#18181b`, `zinc-900`) for primary widgets.
* **Geometry**: Sharp edges (`rounded-none` or subtle `rounded-lg` for small input controls).
* **Typography**: Strictly sans-serif (`font-sans`), `tabular-nums` for all numbers and dates, **strictly zero `font-mono`**.
* **Zero Hardcoded CSS**: All classes and styles must use tokens from `src/app/globals.css`.

---

## 8. Verification & Test Plan
1. **TypeScript Typecheck**: Run `npx.cmd tsc --noEmit` and confirm exit code 0.
2. **Next.js Production Build**: Run `npm.cmd run build` and confirm exit code 0 with zero prerender or route errors.
3. **End-to-End Visual Test**:
   * Verify all 4 charts render with active data for the 4 current users.
   * Verify timeframe toggle changes data dynamically for `30D`, `90D`, `120D`, `YTD`, and `Custom Range`.
   * Verify clicking Egypt zooms in and displays city-level bubbles.
   * Verify clicking "← Global Map" smoothly resets zoom.
   * Verify copy button copies formatted ad targeting coordinates.
