# Console Admin Portal Design Specification

**Feature:** `/console` Administrative Operations & High-Level Platform Intelligence  
**Date:** 2026-10-05  
**Status:** In Review  
**Target Routes:** `src/app/(console)/console/**`

---

## 1. Executive Summary & Goals

Ticknal requires a centralized, secure operational command center (`/console`) for platform owners and administrators to:
1. **Monitor High-Level Health & Growth:** Track total users, paid subscriptions, MRR, daily active traders, and quant engine status.
2. **Manage Users & Permissions:** Search, inspect, and update user accounts, roles (`admin`, `analyst`, `pro`, `user`), connected bank accounts/positions (read-only support), and push alert devices.
3. **Track Subscriptions & Monetization:** View active plans, churn rates, payment provider synchronization, and perform manual grant/override actions.
4. **Quant Engine & Market Data Operations:** Monitor EGX price ingestion completeness, view strategy signal outputs (Champion, PSI, Momentum), and trigger manual calculations.
5. **Centralized Cron & System Diagnostics:** Ingest and monitor cron job runs (`cron:update-stocks`, `cron:process-signals`, `cron:update-funds`, `cron:watchdog`) from `system_logs`, freeing the customer-facing `NotificationsDrawer` from technical diagnostic logs.
6. **Immutable Audit Trail:** Record all privileged mutations (role changes, manual plan adjustments, market sync triggers) in a dedicated `audit_logs` table.

---

## 2. Design System Alignment & Component Reuse

The `/console` interface must be indistinguishable in visual sophistication and polish from the public and member areas of Ticknal (`/home`, `/markets`), strictly adhering to `AGENTS.md` and the `ticknal-tv-design` system.

### Reused Production Components & Patterns

| Platform Pattern | Source Component / Class | Console Re-use |
| :--- | :--- | :--- |
| **KPI Metric Cards** | `tv-kpi-card` & `KPICard.tsx` | All top metric rails (`overview`, `users`, `subscriptions`, `signals`, `logs`). Two-row layout: Title + Badge, large bold Value + Meta text, `tabular-nums`. |
| **Sticky Floating Nav** | `HomeFloatingNav.tsx`, `MarketsFloatingNav.tsx` | `ConsoleFloatingNav.tsx` using `tv-floating-nav` styling, fixed-top pill navigation with active highlights. |
| **Table Rows & Entity Displays** | `OpportunityTable.tsx`, `MarketsPageView.tsx` | Table rows displaying users, subscribers, tickers, and logs. Reuses the logo/avatar + primary label (white bold) + secondary label (cold gray muted) layout. |
| **Slide-Over Drawers** | `NotificationsDrawer.tsx`, `QuickAddDrawer.tsx` | User detail and log metadata inspector drawers: `bg-black`, `rounded-none`, hairline `border-l border-white/10`, framer-motion slide animation. |
| **Donut + Table Allocation** | `SectorDonutChart.tsx`, `ticknal-tv-design` | Subscription tier breakdown on `/console/overview`: 5/12 donut column + 7/12 table breakdown. |
| **Brand Wordmark** | `<TicknalBrand />` (`@/components/ui/TicknalBrand`) | Header branding: lowercase `ticknal` in `EuclidCircularSemibold`, `tracking-[-0.04em]`. |
| **Icons & Spinners** | `@/components/ui/icon-library`, `InlineSpinner` | Lucide icons, loading states, and status badges. |

### Visual Design Rules (Zero Exceptions)
- **Surfaces:** Pure pitch black (`#000000` / `bg-black`) for pages and drawers. `bg-transparent` for widget cards and containers. NEVER use gray fills (`#18181b`, `#121214`, `zinc-900`).
- **Borders:** Hairline borders only: `border-white/10`, `border-white/[0.06]`, or `#222225`.
- **Typography:** Modern sans-serif exclusively (`font-sans`). NEVER `font-mono`. Numeric columns, timestamps, and currencies must use `tabular-nums`.
- **Drawer Geometry:** Drawers must have square, sharp edges (`rounded-none`).

---

## 3. Security Architecture & Authorization

Access to `/console` enforces **Defense-in-Depth** across three independent layers:

```
[ Incoming Request ]
         │
         ▼
[ Layer 1: Next.js Edge Middleware ]  ──> Checks session exists, redirects unauthenticated to /login
         │
         ▼
[ Layer 2: Server Layout Guard ]       ──> Queries DB profiles.role === 'admin' | 'superadmin'
         │                                 Throws / Redirects to /home if unauthorized
         ▼
[ Layer 3: Server Actions & API ]      ──> Every mutation calls assertAdminSession(user.id)
                                           and writes an immutable entry to audit_logs
```

### Database Schema Updates (`src/db/schema.ts`)

```typescript
// 1. Immutable Admin Audit Log Table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  adminId: uuid('admin_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(), // e.g. 'user.role_update', 'subscription.grant', 'market.manual_sync'
  targetId: varchar('target_id', { length: 255 }),      // User ID, ticker symbol, or resource ID
  metadata: jsonb('metadata'),                          // Previous value, new value, reason
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  adminIdx: index('audit_logs_admin_id_idx').on(table.adminId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));
```

---

## 4. Console Route & Page Specifications

### Route Map
```
src/app/(console)/console/
├── layout.tsx                     # Zero-trust server guard & app shell
├── loading.tsx                    # Shared skeleton loader
├── page.tsx                       # Redirects to /console/overview
│
├── overview/                      # Executive platform dashboard
│   └── page.tsx
├── users/                         # User directory & inspector drawer
│   └── page.tsx
├── subscriptions/                 # Monetization & tier management
│   └── page.tsx
├── signals/                       # Quant engine & market data health
│   └── page.tsx
└── logs/                          # Cron jobs health & audit trail
    └── page.tsx
```

---

### Page 1: Overview (`/console/overview`)
* **Section 1: Executive KPI Rail (`tv-kpi-card`)**
  - `Total Platform Users`: Count from `profiles` + 30-day net addition badge.
  - `Active Paid Subscriptions`: Total Pro/Elite subscribers with estimated MRR.
  - `Daily Active Traders`: Users active in the last 24h.
  - `Quant Pipeline Health`: Latest EGX sync status badge (`Optimal` / `Delayed`).
* **Section 2: Subscription Distribution (Donut + Table Pattern)**
  - 5/12 PieChart showing plan breakdown (`Free`, `Pro Monthly`, `Pro Annual`).
  - 7/12 Table showing plan tier name, member count, percentage allocation, and revenue contribution.
* **Section 3: Pipeline & Engine Quick Status**
  - Latest EGX price date imported, total tickers updated, and last signals calculation run time.
* **Section 4: Recent Platform Activity Stream**
  - Compact feed of recent signups, upgrades, and alert events.

---

### Page 2: Users Management (`/console/users`)
* **Section 1: User Metrics KPI Rail**
  - `Total Accounts`, `Verified Users`, `Device Push Tokens`, `Suspended / Inactive`.
* **Section 2: User Screener Table**
  - **Toolbar:** Real-time search by name/email/ID, filter pills by role (`All`, `Admin`, `Pro`, `User`).
  - **Table Columns:**
    - User: Avatar + Full Name (bold) + Email (muted subtitle).
    - Role: Semantic badge (`Admin` in blue, `Pro` in emerald, `User` in cold gray).
    - Status: Active / Suspended pill.
    - Push Devices: Count of registered push tokens with device icons (Android/iOS/Web).
    - Joined: Formatted registration date (`tabular-nums`).
    - Actions: `[ Inspect ↗ ]` trigger opening the slide-over drawer.
* **Section 3: User Inspector Slide-Over Drawer (`ConsoleUserDrawer.tsx`)**
  - Pure black (`bg-black`), `rounded-none`, `border-l border-white/10`.
  - Tabs:
    1. *Profile & Permissions:* Update role (`user` -> `pro` -> `analyst` -> `admin`), reset session, suspend account.
    2. *Portfolio Overview:* Read-only inspection of connected bank accounts, cash balance, and positions (for user support).
    3. *Device Tokens:* Registered push tokens with a **"Send Test Ping"** button.

---

### Page 3: Subscriptions (`/console/subscriptions`)
* **Section 1: Monetization KPI Rail**
  - `Total MRR`, `Active Paid Subs`, `Annual Subscriptions`, `30-Day Churn Rate`.
* **Section 2: Plan Performance Breakdown**
  - Plan comparison table: Tier name, price (EGP / USD), active count, churn, features unlocked.
* **Section 3: Subscriber Ledger Table**
  - Searchable subscriber list: User email, active tier, payment status (`active`, `past_due`), renewal date, and quick action: `[ Grant 30-Day Pro Access ]`.

---

### Page 4: Market Data & Quant Signals (`/console/signals`)
* **Section 1: Engine Health KPI Rail**
  - `Tracked EGX Tickers`, `Latest Ingestion Date`, `Active Strategies`, `Signals Calculated Today`.
* **Section 2: Active Strategies Performance**
  - Grid of strategy cards (Champion, PSI, Momentum, Trend Following) showing last calculation timestamp, total BUY and EXIT signals active, and a button: `[ Trigger Recalculation ]`.
* **Section 3: Ticker Data Completeness Registry**
  - Table showing ticker symbol, company name, latest bar date, currency, and data health badge (`Up to date` / `Missing bars`).

---

### Page 5: Cron Jobs & Audit Logs (`/console/logs`)
* **Sub-Tab 1: Cron Jobs & Engine Health (Ingesting `system_logs`)**
  - **Cron Health KPI Rail:** `Latest Job Run`, `Failed Jobs (24h)`, `Cron Workers Active`, `Avg Execution Duration`.
  - **Cron Worker Control Cards:**
    - `cron:update-stocks`: Last ran, rows inserted, status, and manual trigger button.
    - `cron:process-signals`: Last ran, signals generated, status, and manual trigger button.
    - `cron:update-funds` & `cron:update-commodities`: Mutual fund & macro price sync status.
    - `cron:watchdog`: Heartbeat status.
  - **System Logs Stream Table:** Filter by Level (`ERROR`, `WARN`, `INFO`), Source (`cron:update-stocks`, etc.), live search, and expandable row to view full JSON metadata / error traces.
* **Sub-Tab 2: Platform Audit Trail (Ingesting `audit_logs`)**
  - Table of all privileged admin actions: Timestamp, Admin Actor, Event Type (`user.role_change`, `subscription.grant`, `market.manual_sync`), Target ID, IP address, and metadata diff.

---

## 5. Core Platform Hygiene: Cleaning `NotificationsDrawer.tsx`

In `src/components/platform/NotificationsDrawer.tsx`:
- Currently, end users have a technical "Logs" tab that fetches `/api/system-logs` and displays raw cron/database diagnostics.
- **Change:**
  1. Remove the "Logs" tab from the public end-user view so users only see their personal trading alerts (`signals`).
  2. For authenticated users with `profiles.role === 'admin'`, provide a direct link button at the bottom of the drawer: `[ Open System Console Logs ↗ ]` directing to `/console/logs`.

---

## 6. Implementation Verification Plan

1. **Type Safety & Build Verification:**
   - Run `npx tsc --noEmit` and `npm run build` after every step to ensure zero type errors or broken imports.
2. **Security & Route Guard Tests:**
   - Verify unauthenticated users attempting to access `/console` are redirected to `/login`.
   - Verify authenticated regular users (`role: 'user'`) attempting to access `/console` receive a 403 or redirect to `/home`.
   - Verify only users with `role: 'admin'` or `'superadmin'` can render console pages and invoke admin Server Actions.
3. **Audit Log Verification:**
   - Verify any role modification or manual trigger writes an entry into `audit_logs`.
4. **Console & UI Token Verification:**
   - Ensure pure black backgrounds (`bg-black`), `tv-kpi-card` usage, square drawer geometry (`rounded-none`), and sans-serif `tabular-nums`.
