# Console Admin Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure, live-data administrative command center at `/console` that replicates the core platform's TradingView visual design tokens (`globals.css`), provides high-level platform intelligence (Users, Subscriptions, Signals, Cron Logs, Audit Trail), cleans up the public notifications drawer, and works seamlessly on desktop and mobile.

**Architecture:** Defense-in-depth Next.js App Router subsystem inside `src/app/(console)/console/**`. Enforces multi-layer auth via Edge Middleware, Server Component layout verification against `profiles.role`, and Server Action privilege assertions writing to `audit_logs`. Reuses existing production widgets (`KPICard`, `tv-kpi-card`, `ConsoleFloatingNav`, table rows, square slide-over drawers).

**Tech Stack:** Next.js 16 (App Router, Server Actions, React 19), Supabase Auth (`@supabase/ssr`), Drizzle ORM (PostgreSQL), Tailwind CSS (`globals.css`), Framer Motion, Recharts, Lucide icons.

**Spec:** [docs/superpowers/specs/2026-10-05-console-admin-portal-design.md](file:///c:/Users/abdelrahman.mamdouh_/Desktop/Overted%20Technologies/Ticknal/docs/superpowers/specs/2026-10-05-console-admin-portal-design.md)

---

## Global Constraints

- **Strict Design Tokens:** All surfaces must use pure pitch black (`#000000` / `bg-black`) and `bg-transparent` for widget panels. NEVER use elevated gray fills (`#18181b`, `#121214`, `zinc-900`) per `AGENTS.md`.
- **Zero Monospace:** Typography must strictly use `font-sans`. NEVER use `font-mono`. Numeric columns, dates, prices, and metrics must use `tabular-nums`.
- **Zero Mock Data:** 100% of data rendered in `/console` must be live, queried directly from PostgreSQL via Drizzle ORM (`profiles`, `user_subscriptions`, `system_logs`, `tickers`, `daily_prices`, `push_subscriptions`, `audit_logs`).
- **Production Component Reuse:** Reuse `tv-kpi-card` (`KPICard.tsx`), `HomeFloatingNav` / `MarketsFloatingNav` pattern (`ConsoleFloatingNav.tsx`), `OpportunityTable` / `MarketsPageView` row patterns, and slide-over square drawers (`rounded-none`).
- **Mobile First / Phone Parity:** Console pages must be fully responsive, supporting small phone viewports (safe-area insets, swipeable tab pills, horizontal scroll tables with custom scrollbars, full-screen mobile drawers).
- **Verification Rule:** `npm run build` and `npx tsc --noEmit` must pass with exit code 0 after every single task.

---

## Review Focus

1. **Privilege Escalation Prevention:** Non-admin users (`role: 'user'`) navigating directly to `/console` or invoking admin Server Actions must be strictly blocked and redirected without leaking data.
2. **Zero Mock Leakage:** Verify that all queries read live PostgreSQL tables and handle empty states gracefully without fallback to synthetic mock arrays.
3. **Mobile Layout Integrity:** Verify that on 375px/390px phone screens, KPI cards stack 2-per-row, tables scroll smoothly without breaking page width, and drawers take full width without overflow.
4. **Audit Trail Completeness:** Verify that any administrative action (changing user role, granting subscription, triggering manual cron run) writes an immutable record to `audit_logs`.
5. **Core Drawer Cleanup:** Verify that regular users viewing `NotificationsDrawer.tsx` no longer see the technical "Logs" tab with raw cron database errors.

---

## File Structure

```
src/
├── db/
│   └── schema.ts                                      # Add auditLogs and userSubscriptions tables
├── lib/
│   └── server/
│       ├── admin-guard.ts                             # Server-side auth & audit logging assertions
│       └── console-queries.ts                         # Live data aggregations & queries for all console pages
├── middleware.ts                                      # Edge middleware session & route check
├── components/
│   └── platform/
│       ├── NotificationsDrawer.tsx                    # Clean up: remove public system logs tab
│       └── console/
│           ├── ConsoleHeader.tsx                      # Top bar with wordmark, breadcrumbs, return to app
│           ├── ConsoleFloatingNav.tsx                 # Sticky top pill navigation rail
│           ├── ConsoleKPIRail.tsx                     # Reusable KPI rail using tv-kpi-card
│           ├── ConsoleDrawer.tsx                      # Slide-over inspector drawer (rounded-none, bg-black)
│           ├── overview/
│           │   ├── ConsoleOverviewView.tsx            # Overview dashboard client view
│           │   ├── SubscriptionDonutChart.tsx         # 5/12 donut + 7/12 table breakdown
│           │   └── LiveActivityFeed.tsx               # Recent platform events list
│           ├── users/
│           │   ├── ConsoleUsersView.tsx               # User screener table client view
│           │   └── ConsoleUserDetailDrawer.tsx        # Profile, portfolio, push devices inspector
│           ├── subscriptions/
│           │   └── ConsoleSubscriptionsView.tsx       # Subscriptions ledger and plan manager
│           ├── signals/
│           │   └── ConsoleSignalsView.tsx             # Quant engine, active strategies, ticker registry
│           └── logs/
│               ├── ConsoleLogsView.tsx                # Cron health, system logs stream, audit trail
│               └── LogMetadataModal.tsx               # JSON payload & stack trace viewer
└── app/
    └── (console)/
        └── console/
            ├── layout.tsx                             # Server layout role verification & shell
            ├── loading.tsx                            # Skeleton loader
            ├── page.tsx                               # Redirects to /console/overview
            ├── overview/page.tsx                      # High-level summary dashboard
            ├── users/page.tsx                         # Users directory & management
            ├── subscriptions/page.tsx                 # Subscriptions & monetization
            ├── signals/page.tsx                       # Quant engine & market data operations
            └── logs/page.tsx                          # Cron jobs health & audit trail
```

---

## Tasks

### Task 1: Database Schema Expansion (`audit_logs` & `user_subscriptions`)

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/lib/server/admin-guard.ts`

- [ ] Step 1: Add `auditLogs` table to `src/db/schema.ts` with columns: `id`, `adminId`, `action`, `targetId`, `metadata`, `ipAddress`, `userAgent`, `createdAt`.
- [ ] Step 2: Add `userSubscriptions` table to `src/db/schema.ts` with columns: `id`, `userId`, `tier`, `status`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `provider`, `providerCustomerId`, `providerSubscriptionId`, `createdAt`, `updatedAt`.
- [ ] Step 3: Create `src/lib/server/admin-guard.ts` exporting:
  - `assertAdminUser(userId?: string): Promise<{ user: User; profile: Profile }>`
  - `logAdminAction(adminId: string, action: string, targetId?: string, metadata?: any)`
- [ ] Step 4: Run typecheck `npx tsc --noEmit` and verify code compiles cleanly.

---

### Task 2: Console Shell Layout, Navigation & Edge Route Guard

**Files:**
- Modify: `src/middleware.ts`
- Create: `src/app/(console)/console/layout.tsx`
- Create: `src/app/(console)/console/loading.tsx`
- Create: `src/app/(console)/console/page.tsx`
- Create: `src/components/platform/console/ConsoleHeader.tsx`
- Create: `src/components/platform/console/ConsoleFloatingNav.tsx`

- [ ] Step 1: Update `src/middleware.ts` to ensure `/console` requests require an active Supabase auth session, redirecting to `/login` if absent.
- [ ] Step 2: Implement `src/app/(console)/console/layout.tsx`:
  - Run server-side `assertAdminUser()` against `profiles.role`. If user is not `admin` or `superadmin`, redirect immediately to `/home`.
  - Render console app shell (`bg-black text-plt-text flex flex-col h-dvh w-full overflow-hidden`).
  - Embed `ConsoleHeader` and `ConsoleFloatingNav` with page transitions.
- [ ] Step 3: Implement `ConsoleHeader.tsx`:
  - Left: `<TicknalBrand />` wordmark + `CONSOLE` badge (`bg-white/10 text-white text-[10px] uppercase font-semibold px-2 py-0.5 rounded-none`).
  - Center: Breadcrumb path (`Console > Overview`, etc.).
  - Right: Return to App button (`href="/home"`) + admin user email/avatar.
- [ ] Step 4: Implement `ConsoleFloatingNav.tsx`:
  - Sticky top horizontal pill rail matching `HomeFloatingNav` / `MarketsFloatingNav`:
    - `Overview`, `Users`, `Subscriptions`, `Signals`, `Logs`.
  - Active pill styling: `bg-[#1e222d] text-white font-semibold shadow-xs border border-[#2a2e39]`.
  - Mobile swipeable horizontal container (`overflow-x-auto no-scrollbar`).
- [ ] Step 5: Implement `src/app/(console)/console/page.tsx` redirecting to `/console/overview`.
- [ ] Step 6: Verify build: `npm run build`.

---

### Task 3: Live Data Queries Service (`src/lib/server/console-queries.ts`)

**Files:**
- Create: `src/lib/server/console-queries.ts`

- [ ] Step 1: Implement `getConsoleOverviewStats()`:
  - Query total users count from `profiles`.
  - Query new users joined in last 7 and 30 days.
  - Query active subscriptions and calculate live MRR from `userSubscriptions`.
  - Query plan distribution count (`Free`, `Pro Monthly`, `Pro Annual`, `Elite`).
  - Query latest market data date from `dailyPrices`.
  - Query latest cron job execution status from `systemLogs`.
- [ ] Step 2: Implement `getConsoleUsersList(options: { search?: string; role?: string; limit?: number; offset?: number })`:
  - Live query joining `profiles` with device push tokens count and active subscription status.
- [ ] Step 3: Implement `getConsoleUserDetail(userId: string)`:
  - Fetch user profile, connected bank accounts (`userBankAccounts`), positions (`positions`), strategy settings (`userStrategySettings`), and push tokens (`devicePushTokens`).
- [ ] Step 4: Implement `getConsoleSubscriptionsList()`:
  - Fetch active subscriptions joined with user email and profile name.
- [ ] Step 5: Implement `getConsoleSignalsStats()`:
  - Query total tracked tickers from `tickers`.
  - Query recent signal notifications count from `signalNotifications` grouped by strategy.
  - Query latest daily price dates per ticker.
- [ ] Step 6: Implement `getConsoleLogsData(options: { level?: string; source?: string; limit?: number })`:
  - Fetch recent `systemLogs` (cron executions) and `auditLogs`.
- [ ] Step 7: Run typecheck `npx tsc --noEmit`.

---

### Task 4: Overview Dashboard (`/console/overview`)

**Files:**
- Create: `src/app/(console)/console/overview/page.tsx`
- Create: `src/components/platform/console/overview/ConsoleOverviewView.tsx`
- Create: `src/components/platform/console/overview/SubscriptionDonutChart.tsx`
- Create: `src/components/platform/console/overview/LiveActivityFeed.tsx`

- [ ] Step 1: Implement `src/app/(console)/console/overview/page.tsx` as a Server Component fetching live data via `getConsoleOverviewStats()`.
- [ ] Step 2: Implement `ConsoleOverviewView.tsx`:
  - Top KPI rail: 4 cards using `KPICard.tsx` / `tv-kpi-card`:
    1. Total Platform Users (with 30d delta).
    2. Active Subscriptions & MRR.
    3. Daily Active Traders.
    4. Quant Engine Pipeline Health (`Optimal` / `Delayed`).
  - Middle: 5/12 Donut + 7/12 Table distribution pattern (`SubscriptionDonutChart.tsx`) displaying live subscriber split across tiers.
  - Operations card: Latest EGX ingestion date and nightly signals status.
  - Bottom: `LiveActivityFeed.tsx` showing recent live platform events.
- [ ] Step 3: Test on mobile viewports (stacking KPI cards 2-by-2, responsive donut chart).
- [ ] Step 4: Verify build: `npm run build`.

---

### Task 5: User Management & Inspector Drawer (`/console/users`)

**Files:**
- Create: `src/app/(console)/console/users/page.tsx`
- Create: `src/components/platform/console/users/ConsoleUsersView.tsx`
- Create: `src/components/platform/console/users/ConsoleUserDetailDrawer.tsx`
- Create: `src/lib/server/console-actions.ts`

- [ ] Step 1: Implement Server Action in `console-actions.ts`:
  - `updateUserRoleAction(targetUserId: string, newRole: string)`:
    - Validates caller is admin via `assertAdminUser()`.
    - Updates `profiles.role`.
    - Logs mutation to `audit_logs`.
- [ ] Step 2: Implement `src/app/(console)/console/users/page.tsx` fetching initial users list.
- [ ] Step 3: Implement `ConsoleUsersView.tsx`:
  - User KPI Rail: Total Accounts, Verified Users, Push Devices, Admins.
  - Search and role filter toolbar (`All`, `User`, `Pro`, `Analyst`, `Admin`).
  - Screener table reusing platform table styling:
    - Avatar + Name (bold white) + Email (muted gray).
    - Role badge (`bg-blue-500/10 text-blue-400` for Admin, `bg-emerald-500/10 text-emerald-400` for Pro).
    - Push device count icon.
    - Registration date (`tabular-nums`).
    - Clickable row opening `ConsoleUserDetailDrawer`.
- [ ] Step 4: Implement `ConsoleUserDetailDrawer.tsx`:
  - Square slide-over drawer (`rounded-none`, `bg-black`, hairline border).
  - Tab 1: Profile & Permissions (Role selector dropdown + save button).
  - Tab 2: User Support & Portfolio (Read-only summary of bank accounts and positions).
  - Tab 3: Device Push Tokens (Platform, user-agent, last registered).
- [ ] Step 5: Verify build & typecheck: `npx tsc --noEmit`.

---

### Task 6: Subscriptions & Monetization (`/console/subscriptions`)

**Files:**
- Create: `src/app/(console)/console/subscriptions/page.tsx`
- Create: `src/components/platform/console/subscriptions/ConsoleSubscriptionsView.tsx`
- Modify: `src/lib/server/console-actions.ts`

- [ ] Step 1: Implement Server Action `grantProAccessAction(targetUserId: string, days: number)`:
  - Grants or extends active subscription in `userSubscriptions`.
  - Sets `profiles.role = 'pro'` if currently `'user'`.
  - Logs action to `audit_logs`.
- [ ] Step 2: Implement `src/app/(console)/console/subscriptions/page.tsx` fetching live subscriber ledger.
- [ ] Step 3: Implement `ConsoleSubscriptionsView.tsx`:
  - Monetization KPI Rail: MRR (EGP/USD), Active Paid Subs, Annual Members, Churn Rate.
  - Tier Summary Cards: Free vs Pro Monthly vs Pro Annual vs Elite.
  - Subscribers Table: User email, active tier, status badge (`active`, `past_due`, `canceled`), renewal date, and quick action `[ Grant 30D Pro ]`.
- [ ] Step 4: Verify build: `npm run build`.

---

### Task 7: Quant Signals & Market Operations (`/console/signals`)

**Files:**
- Create: `src/app/(console)/console/signals/page.tsx`
- Create: `src/components/platform/console/signals/ConsoleSignalsView.tsx`
- Modify: `src/lib/server/console-actions.ts`

- [ ] Step 1: Implement Server Action `triggerCronAction(cronJobName: string)`:
  - Verifies admin session.
  - Invokes internal cron handler (e.g., `handleUpdateStocks` or `handleProcessSignals`).
  - Logs execution to `audit_logs`.
- [ ] Step 2: Implement `src/app/(console)/console/signals/page.tsx` fetching market status.
- [ ] Step 3: Implement `ConsoleSignalsView.tsx`:
  - Engine KPI Rail: Tracked Tickers, Latest Ingestion Date, Signals Output, Engine Health.
  - Strategy Cards Grid: Cards for Champion, PSI, and Momentum strategies with signal counts and `[ Run Recalculation ]` button.
  - Ticker Registry Table: Symbol, company name, latest bar date, currency, status pill.
- [ ] Step 4: Verify build & typecheck: `npx tsc --noEmit`.

---

### Task 8: Cron Jobs & Audit Logs (`/console/logs`)

**Files:**
- Create: `src/app/(console)/console/logs/page.tsx`
- Create: `src/components/platform/console/logs/ConsoleLogsView.tsx`
- Create: `src/components/platform/console/logs/LogMetadataDrawer.tsx`

- [ ] Step 1: Implement `src/app/(console)/console/logs/page.tsx` querying live `system_logs` and `audit_logs`.
- [ ] Step 2: Implement `ConsoleLogsView.tsx` with two tabs:
  - **Tab 1: Cron Jobs & Engine Health**:
    - Cron Health KPI Rail (`Latest Run`, `Errors (24h)`, `Active Workers`, `Avg Latency`).
    - Cron Job Cards (`cron:update-stocks`, `cron:process-signals`, `cron:update-funds`, `cron:watchdog`) with status, last run, and `[ Execute Now ]` trigger.
    - System Logs Stream Table: Level filter (`ERROR`, `WARN`, `INFO`), source filter, search input, expandable row to view full JSON payload and error stack traces in `LogMetadataDrawer`.
  - **Tab 2: Platform Audit Trail**:
    - Table of privileged actions from `audit_logs` (Timestamp, Admin Actor, Event Type, Target ID, Metadata diff).
- [ ] Step 3: Verify build: `npm run build`.

---

### Task 9: Core App Cleanup: Notifications Drawer Hygiene

**Files:**
- Modify: `src/components/platform/NotificationsDrawer.tsx`

- [ ] Step 1: Remove the public "Logs" tab and `/api/system-logs` query from the default user drawer view.
- [ ] Step 2: Ensure regular users only see their personal trading signals and notifications (`signals`).
- [ ] Step 3: If authenticated user has `profiles.role === 'admin'`, display a clean shortcut link at the bottom: `[ System Console Logs ↗ ]` directing to `/console/logs`.
- [ ] Step 4: Verify typecheck: `npx tsc --noEmit`.

---

### Task 10: Multi-Agent Validation via `/teamwork-preview` Quality Gates

- [ ] Step 1: Run comprehensive build and typecheck verification:
  - `npm run build` exits 0.
  - `npx tsc --noEmit` exits 0.
- [ ] Step 2: Assemble prompt draft artifact for the teamwork multi-agent system.
- [ ] Step 3: Invoke `teamwork_preview` subagent to execute adversarial validation across all 4 gates:
  1. Design token consistency with `globals.css` (pure `#000000` black, hairline borders, no monospace).
  2. 100% live PostgreSQL data with zero hardcoded/mock arrays.
  3. Reused production components (`tv-kpi-card`, `ConsoleFloatingNav`, table rows, drawers).
  4. Mobile accessibility & phone layout parity (safe-area insets, swipeable nav, responsive grids).
