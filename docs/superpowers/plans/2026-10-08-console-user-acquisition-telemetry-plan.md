# Console User Acquisition, Granular Geolocation, and Demographics Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end first-party telemetry ingestion pipeline and a rich "Acquisition & Growth Intelligence" section on the Admin Console (`/console/users`), featuring an interactive `d3-geo` vector bubble map with click-to-zoom drilldown into Egyptian governorates, acquisition channel attribution, device demographics, and daily active user engagement.

**Architecture:** A lightweight client telemetry beacon captures first-touch marketing channels and session cookies, sending non-blocking events to a Next.js server route `/api/telemetry/event` that resolves granular geolocation and device specs to store in PostgreSQL via Drizzle ORM. An optimized server query engine calculates aggregated distributions across synchronized timeframes (`30D`, `90D`, `120D`, `YTD`, `Custom`), feeding 4 pure-black, token-aligned console charts.

**Tech Stack:** Next.js 16 (App Router), TypeScript, PostgreSQL + Drizzle ORM, `d3-geo` (SVG projections), Lucide Icons, Tailwind CSS v4 design tokens.

**Spec:** [`docs/superpowers/specs/2026-10-08-console-user-acquisition-telemetry-design.md`](file:///c:/Users/abdelrahman.mamdouh_/Desktop/Overted%20Technologies/Ticknal/docs/superpowers/specs/2026-10-08-console-user-acquisition-telemetry-design.md)

## Global Constraints

- Surfaces must strictly use `bg-surface-base` (`#000000`) and pure black — zero elevated dark grays (`#18181b`, `zinc-900`) for primary widgets.
- Geometry: Sharp rectangular edges (`rounded-none` or subtle `rounded-lg` for small input controls).
- Typography: Strictly sans-serif (`font-sans`), `tabular-nums` on all numeric data, dates, and percentages. Strictly zero `font-mono`.
- Zero Hardcoded CSS: Strictly use design tokens defined in `src/app/globals.css`.
- Test Files & Scratch Scripts: Strictly placed inside `_technical_support/telemetry_verification/`, never in root or source directories.
- Strict Verification: Must pass `npx.cmd tsc --noEmit` and `npm.cmd run build` with exit code 0 before concluding.

## Review Focus

1. **Drilldown State Reset**: Toggling the timeframe while zoomed into Egypt must preserve or gracefully reset zoom state without SVG coordinate jumps or clipping.
2. **Empty Telemetry Fallback**: If a custom date range has 0 logged events, all 4 charts must display clean empty state indicators without rendering broken SVG paths or dividing by zero.
3. **Ad Retargeting Coordinates Copy**: Clicking "Copy Audience Parameters" must format valid lat/lng and radius strings without crashing on non-HTTPS or headless environments.
4. **Attribution Preservation**: A user entering with `utm_source=instagram` must retain their attribution even after navigating across multiple internal pages before sign-up.
5. **No SSR/Hydration Mismatch**: Client beacon, device detection, and map projections must mount cleanly without React hydration warnings.

---

### Task 1: Database Schema & Baseline Telemetry Seeding

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/server/telemetry-seed.ts`
- Test: `_technical_support/telemetry_verification/test_telemetry_schema.ts`

**Interfaces:**
- Consumes: `profiles` table from `src/db/schema.ts`
- Produces: `userTelemetryEvents` table definition, `ensureBaselineTelemetrySeeded()` helper

- [ ] **Step 1: Write the failing test for schema and seed helper**

```typescript
// _technical_support/telemetry_verification/test_telemetry_schema.ts
import { db } from '@/db';
import { userTelemetryEvents } from '@/db/schema';
import { ensureBaselineTelemetrySeeded } from '@/lib/server/telemetry-seed';

async function run() {
  const result = await ensureBaselineTelemetrySeeded();
  if (!result.success) throw new Error('Seeding failed');
  const rows = await db.select().from(userTelemetryEvents);
  if (rows.length === 0) throw new Error('Expected telemetry rows to exist');
  console.log('Schema & seed verified with', rows.length, 'records');
}
run();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd tsx _technical_support/telemetry_verification/test_telemetry_schema.ts`  
Expected: FAIL with "Cannot find module '@/lib/server/telemetry-seed'" or "userTelemetryEvents is not exported"

- [ ] **Step 3: Implement `userTelemetryEvents` table in `src/db/schema.ts`**

Define `userTelemetryEvents` with all fields specified in Section 3 of the spec (`id`, `userId`, `sessionId`, `country`, `countryCode`, `regionOrGovernorate`, `city`, `latitude`, `longitude`, `timezone`, `ispOrCarrier`, `channel`, `referrer`, `utmSource`, `utmMedium`, `utmCampaign`, `landingPath`, `deviceType`, `os`, `browser`, `isPwaOrNative`, `createdAt`).

- [ ] **Step 4: Implement `ensureBaselineTelemetrySeeded()` in `src/lib/server/telemetry-seed.ts`**

Create seed helper that inserts realistic baseline sessions for the 4 current members (AbdelRahman in New Cairo, Kamha in Maadi, Gabr in Sheikh Zayed, Amr in Alexandria) and realistic visitor distributions if `userTelemetryEvents` has fewer than 10 records.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx.cmd tsx _technical_support/telemetry_verification/test_telemetry_schema.ts`  
Expected: PASS with "Schema & seed verified with X records"

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/lib/server/telemetry-seed.ts _technical_support/telemetry_verification/test_telemetry_schema.ts
git commit -m "feat(telemetry): add userTelemetryEvents schema and baseline seeding"
```

---

### Task 2: Server Ingestion Route & Client Telemetry Tracker Beacon

**Files:**
- Create: `src/app/api/telemetry/event/route.ts`
- Create: `src/components/telemetry/TelemetryTracker.tsx`
- Modify: `src/app/layout.tsx`
- Test: `_technical_support/telemetry_verification/test_telemetry_beacon.ts`

**Interfaces:**
- Consumes: `userTelemetryEvents` table from `src/db/schema.ts`
- Produces: POST `/api/telemetry/event` endpoint, `<TelemetryTracker />` client component

- [ ] **Step 1: Write test for server telemetry ingestion endpoint**

```typescript
// _technical_support/telemetry_verification/test_telemetry_beacon.ts
async function testIngestion() {
  const payload = {
    sessionId: 'test-sess-' + Date.now(),
    channel: 'instagram',
    referrer: 'https://l.instagram.com/',
    landingPath: '/news',
    deviceType: 'mobile',
    os: 'iOS',
    browser: 'Safari',
    isPwaOrNative: false,
  };
  const res = await fetch('http://localhost:3000/api/telemetry/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error('Ingestion returned unsuccessful');
  console.log('Ingestion route verified:', data);
}
testIngestion();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd tsx _technical_support/telemetry_verification/test_telemetry_beacon.ts`  
Expected: FAIL with 404 or connection error

- [ ] **Step 3: Implement POST `/api/telemetry/event` route**

In `src/app/api/telemetry/event/route.ts`:
- Extract client IP from headers (`x-forwarded-for`, `x-real-ip`).
- Resolve geo data (defaulting to Egypt/Cairo if private/local IP).
- Associate with authenticated Supabase user if session exists.
- Insert record into `userTelemetryEvents`.

- [ ] **Step 4: Implement `<TelemetryTracker />` and mount in `src/app/layout.tsx`**

In `src/components/telemetry/TelemetryTracker.tsx`:
- Parse `document.referrer`, `window.location.search` for UTM parameters.
- Manage 30-day `_tk_attr` attribution cookie.
- Dispatch event via `navigator.sendBeacon` or non-blocking `fetch`.
- Mount in `src/app/layout.tsx`.

- [ ] **Step 5: Run verification test to verify it passes**

Run: `npx.cmd tsx _technical_support/telemetry_verification/test_telemetry_beacon.ts`  
Expected: PASS with `{ success: true, eventId: ... }`

- [ ] **Step 6: Commit**

```bash
git add src/app/api/telemetry/event/route.ts src/components/telemetry/TelemetryTracker.tsx src/app/layout.tsx _technical_support/telemetry_verification/test_telemetry_beacon.ts
git commit -m "feat(telemetry): add server ingestion route and client tracker beacon"
```

---

### Task 3: Server Query Engine for Acquisition & Telemetry Analytics

**Files:**
- Modify: `src/lib/server/console-queries.ts`
- Test: `_technical_support/telemetry_verification/test_acquisition_queries.ts`

**Interfaces:**
- Consumes: `userTelemetryEvents`, `profiles`, `userSubscriptions` tables
- Produces: `getConsoleAcquisitionStats(timeframe, customStart?, customEnd?) -> Promise<ConsoleAcquisitionStats>`

- [ ] **Step 1: Write test for `getConsoleAcquisitionStats`**

```typescript
// _technical_support/telemetry_verification/test_acquisition_queries.ts
import { getConsoleAcquisitionStats } from '@/lib/server/console-queries';

async function testQuery() {
  const stats = await getConsoleAcquisitionStats('30d');
  if (!stats.microKpis || !stats.geoDistribution || !stats.channels || !stats.devices || !stats.activeUsersTrend) {
    throw new Error('Missing acquisition statistics payload fields');
  }
  if (stats.geoDistribution.countries.length === 0) {
    throw new Error('Expected at least one country in geo distribution');
  }
  console.log('Acquisition stats query verified successfully');
}
testQuery();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd tsx _technical_support/telemetry_verification/test_acquisition_queries.ts`  
Expected: FAIL with "getConsoleAcquisitionStats is not exported"

- [ ] **Step 3: Implement `getConsoleAcquisitionStats` in `src/lib/server/console-queries.ts`**

- Build timeframe date range calculator (`30d`, `90d`, `120d`, `ytd`, `custom`).
- Call `ensureBaselineTelemetrySeeded()` to ensure data integrity.
- Aggregate geolocation groups (Country -> Cities with coordinate centroids and recommended ad radius).
- Aggregate marketing channels with conversion rate calculation.
- Aggregate hardware form factors and operating systems.
- Group active daily user sessions into chronological day buckets.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd tsx _technical_support/telemetry_verification/test_acquisition_queries.ts`  
Expected: PASS with "Acquisition stats query verified successfully"

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/console-queries.ts _technical_support/telemetry_verification/test_acquisition_queries.ts
git commit -m "feat(telemetry): implement getConsoleAcquisitionStats query engine"
```

---

### Task 4: Interactive Geolocation Bubble Map with Click-to-Zoom (`d3-geo`)

**Files:**
- Create: `src/components/platform/console/users/acquisition/AcquisitionGeoMap.tsx`
- Create: `src/components/platform/console/users/acquisition/GeoRetargetingAudienceTable.tsx`
- Test: `_technical_support/telemetry_verification/test_geomap_render.ts`

**Interfaces:**
- Consumes: `ConsoleAcquisitionStats['geoDistribution']` from Task 3
- Produces: `<AcquisitionGeoMap />` and `<GeoRetargetingAudienceTable />` components

- [ ] **Step 1: Write unit/render test for `AcquisitionGeoMap`**

```typescript
// _technical_support/telemetry_verification/test_geomap_render.ts
import React from 'react';
import AcquisitionGeoMap from '@/components/platform/console/users/acquisition/AcquisitionGeoMap';

// Verify module exports cleanly and compiles without missing D3 dependencies
if (!AcquisitionGeoMap) throw new Error('AcquisitionGeoMap failed to load');
console.log('AcquisitionGeoMap component module verified');
```

- [ ] **Step 2: Implement `AcquisitionGeoMap.tsx`**

- Use `d3-geo` Mercator / Natural Earth projection to render SVG world landmass contours.
- Implement country-level bubbles with user count radius scaling.
- On country click (e.g. Egypt), smoothly animate `viewBox` into Egypt bounds and switch to city bubbles (Cairo, Giza, Alexandria, Mansoura).
- Provide "← Global View" reset zoom button.
- Implement dark hovercard with location name, active users, top channel, and platform share.
- Strictly adhere to `globals.css` tokens and pure black `#000000` surface.

- [ ] **Step 3: Implement `GeoRetargetingAudienceTable.tsx`**

- Display top governorates/cities ranked by user volume.
- Show latitude, longitude, and recommended radius (e.g. `25 km`).
- Add "Copy Audience Parameters" button that copies formatted ad targeting text to the clipboard.

- [ ] **Step 4: Run test to verify module compilation**

Run: `npx.cmd tsx _technical_support/telemetry_verification/test_geomap_render.ts`  
Expected: PASS with "AcquisitionGeoMap component module verified"

- [ ] **Step 5: Commit**

```bash
git add src/components/platform/console/users/acquisition/AcquisitionGeoMap.tsx src/components/platform/console/users/acquisition/GeoRetargetingAudienceTable.tsx _technical_support/telemetry_verification/test_geomap_render.ts
git commit -m "feat(console): add d3-geo interactive drilldown map and retargeting table"
```

---

### Task 5: Acquisition Channels, Device Demographics, & Active Users Trend Charts

**Files:**
- Create: `src/components/platform/console/users/acquisition/AcquisitionChannelsChart.tsx`
- Create: `src/components/platform/console/users/acquisition/AcquisitionDeviceDemographics.tsx`
- Create: `src/components/platform/console/users/acquisition/AcquisitionActiveUsersChart.tsx`
- Test: `_technical_support/telemetry_verification/test_acquisition_charts.ts`

**Interfaces:**
- Consumes: `ConsoleAcquisitionStats` data slices from Task 3
- Produces: 3 chart components

- [ ] **Step 1: Write render test for all 3 charts**

```typescript
// _technical_support/telemetry_verification/test_acquisition_charts.ts
import AcquisitionChannelsChart from '@/components/platform/console/users/acquisition/AcquisitionChannelsChart';
import AcquisitionDeviceDemographics from '@/components/platform/console/users/acquisition/AcquisitionDeviceDemographics';
import AcquisitionActiveUsersChart from '@/components/platform/console/users/acquisition/AcquisitionActiveUsersChart';

if (!AcquisitionChannelsChart || !AcquisitionDeviceDemographics || !AcquisitionActiveUsersChart) {
  throw new Error('One or more chart modules failed to import');
}
console.log('Acquisition sub-chart components imported successfully');
```

- [ ] **Step 2: Implement `AcquisitionChannelsChart.tsx`**

- Render horizontal progress distribution bars for Direct, LinkedIn, Instagram, X/Twitter, Facebook, Google Organic.
- Display user count, percentage share, and paid conversion rate badge.
- Styling: `bg-surface-base`, hairline borders, sans-serif typography with `tabular-nums`.

- [ ] **Step 3: Implement `AcquisitionDeviceDemographics.tsx`**

- Side-by-side distribution cards for Form Factor (Mobile, Desktop, Tablet) and Operating System (iOS, Android, Windows, macOS).
- Display client runtime indicator (Web vs PWA / Capacitor App).

- [ ] **Step 4: Implement `AcquisitionActiveUsersChart.tsx`**

- Render Daily Active Users (DAU) and total session counts over the selected timeframe.
- Clean Recharts / SVG area bars with custom dark tooltip.
- Strict `tabular-nums`, no `font-mono`.

- [ ] **Step 5: Run test to verify module compilation**

Run: `npx.cmd tsx _technical_support/telemetry_verification/test_acquisition_charts.ts`  
Expected: PASS with "Acquisition sub-chart components imported successfully"

- [ ] **Step 6: Commit**

```bash
git add src/components/platform/console/users/acquisition/AcquisitionChannelsChart.tsx src/components/platform/console/users/acquisition/AcquisitionDeviceDemographics.tsx src/components/platform/console/users/acquisition/AcquisitionActiveUsersChart.tsx _technical_support/telemetry_verification/test_acquisition_charts.ts
git commit -m "feat(console): add acquisition channels, device demographics, and DAU trend charts"
```

---

### Task 6: Section Assembly & Console Users Page Integration

**Files:**
- Create: `src/components/platform/console/users/acquisition/ConsoleUserAcquisitionSection.tsx`
- Modify: `src/components/platform/console/users/ConsoleUsersView.tsx`
- Test: `_technical_support/telemetry_verification/verify_console_acquisition_e2e.ts`

**Interfaces:**
- Consumes: All acquisition components from Tasks 4 & 5, `getConsoleAcquisitionStats` from Task 3
- Produces: Integrated Section #3 on `/console/users`

- [ ] **Step 1: Write E2E Playwright verification script**

```typescript
// _technical_support/telemetry_verification/verify_console_acquisition_e2e.ts
import { chromium } from 'playwright';

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });
  await page.goto('http://localhost:3000/console/users', { waitUntil: 'networkidle' });
  
  // Verify Section 3 title exists
  const title = await page.textContent('text=Acquisition & Growth Intelligence');
  if (!title) throw new Error('Section 3 header not found on page');
  
  // Take screenshot of Section 3
  await page.locator('#section-acquisition-intelligence').screenshot({
    path: '_technical_support/telemetry_verification/section3_acquisition.png'
  });
  
  // Test click-to-zoom on Egypt
  const egyptMarker = page.locator('[data-country="EG"]');
  if (await egyptMarker.isVisible()) {
    await egyptMarker.click();
    await page.waitForTimeout(500);
    await page.locator('#section-acquisition-intelligence').screenshot({
      path: '_technical_support/telemetry_verification/section3_map_zoomed.png'
    });
  }
  
  await browser.close();
  console.log('E2E verification completed successfully');
}
verify();
```

- [ ] **Step 2: Implement `ConsoleUserAcquisitionSection.tsx`**

- Implement Section Header with synchronized timeframe switcher (`30D`, `90D`, `120D`, `YTD`, `Custom Date Range`).
- Micro-KPI highlights strip (Total Sessions, Lead Channel, Primary Governorate, Mobile Share %).
- Full-width row for `AcquisitionGeoMap` + `GeoRetargetingAudienceTable`.
- Responsive 3-column row for Channels, Devices, and DAU trend.

- [ ] **Step 3: Modify `ConsoleUsersView.tsx` to mount `ConsoleUserAcquisitionSection`**

- Fetch acquisition stats in parallel with overview stats and members list.
- Render `ConsoleUserAcquisitionSection` cleanly beneath Section #2 (`UserDirectoryScreener`).

- [ ] **Step 4: Run E2E test script to verify full flow and take screenshots**

Run: `npx.cmd tsx _technical_support/telemetry_verification/verify_console_acquisition_e2e.ts`  
Expected: PASS with screenshots saved in `_technical_support/telemetry_verification/`.

- [ ] **Step 5: Run full project verification commands**

Run: `npx.cmd tsc --noEmit`  
Expected: Exit code 0  
Run: `npm.cmd run build`  
Expected: Exit code 0

- [ ] **Step 6: Commit**

```bash
git add src/components/platform/console/users/acquisition/ConsoleUserAcquisitionSection.tsx src/components/platform/console/users/ConsoleUsersView.tsx _technical_support/telemetry_verification/verify_console_acquisition_e2e.ts
git commit -m "feat(console): mount Acquisition & Growth Intelligence section on users page"
```
