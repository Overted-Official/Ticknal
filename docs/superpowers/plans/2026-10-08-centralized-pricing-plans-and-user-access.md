# Centralized Pricing Plans & User Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize pricing, features, and usage limitations into a single system of record (`subscription_plans` table), unify the Landing Page, Console Users, and Console Subscriptions around it, rename the subscriptions section to "Pricing Plans", and provide a direct Admin editing drawer with a unified user access control system.

---

## File Structure & Module Map

```
src/
├── db/
│   └── schema.ts                                      # Add `subscriptionPlans` table definition
├── lib/
│   ├── server/
│   │   ├── plans-service.ts                           # Canonical CRUD, seeding, and getUserAccessEntitlements()
│   │   ├── plans-seed.ts                              # Initial seed matching Landing Page (Free, Plus, Elite, VIP)
│   │   └── console-queries.ts                         # Integrate dynamic plans into getConsoleSubscriptionsPageData & getConsoleOverviewStats
│   ├── hooks/
│   │   └── useUserEntitlements.ts                     # React hook for client-side feature gating & limits checking
├── app/
│   ├── api/
│   │   ├── console/
│   │   │   └── plans/
│   │   │       ├── route.ts                           # GET /api/console/plans (all plans + live subscriber counts)
│   │   │       └── [id]/route.ts                      # PATCH /api/console/plans/[id] (admin-guarded plan updates)
│   │   └── user/
│   │       └── entitlements/route.ts                  # GET /api/user/entitlements (current user's limits & features)
├── components/
│   ├── landing/
│   │   └── LandingPricingSection.tsx                  # Consume centralized plan definitions
│   └── platform/
│       └── console/
│           └── subscriptions/
│               ├── ConsoleSubscriptionsView.tsx       # Rename section to "Pricing Plans"
│               ├── pricing-plans/
│               │   ├── PricingPlansSection.tsx        # Section container replacing SubscriptionPlansMatrix
│               │   ├── PricingPlanCard.tsx            # Clean modular plan card (< 250 lines)
│               │   ├── EditPlanDrawer.tsx             # Sharp black admin drawer for editing prices & limits
│               │   └── PlanLimitsPills.tsx            # Visual summary of limits & indicator badges
```

---

## Tasks

### Task 1: Database Schema & Baseline Plans Seed
- [ ] In `src/db/schema.ts`, define `subscriptionPlans` table with:
  - `id`: varchar(50) primary key (`free`, `plus`, `elite`, `vip`)
  - `name`: varchar(100)
  - `description`: text
  - `monthlyPriceEgp`: numeric
  - `annualPriceEgp`: numeric
  - `annualDiscountPct`: integer
  - `badge`: varchar(50)
  - `color`: varchar(20)
  - `displayOrder`: integer
  - `isActive`: boolean
  - `limits`: jsonb (`chartsPerTab`, `indicatorsPerChart`, `historicalBars`, `parallelConnections`, `priceAlerts`, `technicalAlerts`, `pushAlerts`)
  - `features`: jsonb (`breakoutDetection`, `hydraIndicator`, `typhoonEngine`, `cerberusConfluence`, `egxCoverage`, `screeners`, `devicesSync`, `noAds`)
  - `updatedAt`, `createdAt`
- [ ] Create `src/lib/server/plans-seed.ts` seeding:
  - `free`: 0 EGP / mo, 0 EGP / yr, 2 charts, 5 indicators, 2K bars, 0 price alerts, 0 push alerts.
  - `plus`: 50 EGP / mo, 500 EGP / yr, 4 charts, 10 indicators, 10K bars, 100 price alerts, 25 push alerts, intraday breakout.
  - `elite`: 95 EGP / mo, 950 EGP / yr, 8 charts, 25 indicators, 40K bars, 500 price alerts, unlimited push, Hydra, Typhoon, Cerberus.
  - `vip`: 0 EGP / mo, 0 EGP / yr, Elite limits & features with 0 EGP billing.
- [ ] Verify database schema and seed execution via a verification script in `_technical_support/`.

### Task 2: Core Plans Service & User Access Entitlements Engine
- [ ] Create `src/lib/server/plans-service.ts` exposing:
  - `getSubscriptionPlans()`: cached read with database fallback.
  - `getSubscriptionPlanById(id: string)`: single plan fetcher.
  - `updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>)`: admin update helper with validation.
  - `getUserAccessEntitlements(userId: string)`:
    - Resolves user's active tier from `userSubscriptions`.
    - Returns `{ tier, planName, isPaid, limits, features, canCreateAlert, canAddIndicator, canAddChart, canUseIndicator }`.
- [ ] Create `src/lib/hooks/useUserEntitlements.ts` for frontend components to query current user access limits seamlessly.
- [ ] Test `getUserAccessEntitlements` for all 3 existing users (`Abdelrahman`, `Kamha`, `Gabr` -> all receive VIP/Elite entitlements with isPaid: false).

### Task 3: Admin Plans API Endpoints
- [ ] Implement `GET /api/console/plans`: returns all plans with active subscriber seats.
- [ ] Implement `PATCH /api/console/plans/[id]`:
  - Enforces `adminGuard(req)`.
  - Validates numeric prices and quotas.
  - Updates `subscriptionPlans` and records an entry in `auditLogs`.
  - Returns the updated plan.
- [ ] Implement `GET /api/user/entitlements`: returns current authenticated user's access entitlements.

### Task 4: Integrate Centralized Plans into Console Queries
- [ ] Update `src/lib/server/console-queries.ts`:
  - `getConsoleSubscriptionsPageData`: Replace hardcoded `tierSummary` with dynamic data from `getSubscriptionPlans()`.
  - `getConsoleOverviewStats`: Replace hardcoded pricing with dynamic monthly & annual rates from `getSubscriptionPlans()`.
  - Ensure all revenue and MRR calculations use the canonical prices (Plus: 50 EGP, Elite: 95 EGP, VIP: 0 EGP).

### Task 5: Subscriptions Console UI — Rename & Build "Pricing Plans" Section
- [ ] In `src/components/platform/console/subscriptions/ConsoleSubscriptionsView.tsx`:
  - Rename Section 4 header from `"Pricing & Commercial Packaging Matrix"` to **"Pricing Plans"**.
  - Subtitle: *"Live commercial tier packaging, quotas, feature allocations, and subscriber yields"*.
- [ ] Replace `SubscriptionPlansMatrix.tsx` with modular components in `src/components/platform/console/subscriptions/pricing-plans/`:
  - `PricingPlansSection.tsx`: Container grid for the 4 plans (`free`, `plus`, `elite`, `vip`).
  - `PricingPlanCard.tsx`: Display card (<200 lines) showing:
    - Tier name, badge, and live subscriber seats.
    - Monthly & annual pricing with annual discount percentage.
    - Entitlements & limits grid (price alerts, charts, indicators, premium engines).
    - "Edit Plan" action button.
  - `EditPlanDrawer.tsx`: Sharp, pure black (`bg-black`, `rounded-none`, `border-white/10`) admin edit sheet:
    - Inputs for Monthly Price (EGP), Annual Price (EGP).
    - Limit inputs for Price Alerts, Technical Alerts, Push Alerts, Charts, Indicators.
    - Toggle switches for Hydra, Typhoon, Cerberus, and Breakout Engine.
    - Save button triggering `PATCH /api/console/plans/[id]` with real-time UI feedback.
- [ ] Ensure full compliance with Ticknal TV Design System:
  - `bg-transparent` / `bg-black`, `border-white/10`, sans-serif `tabular-nums`, no `font-mono`, no elevated gray backgrounds.

### Task 6: Unify Landing Page Pricing
- [ ] Update `src/components/landing/LandingPricingSection.tsx` to read the unified plan prices (50 EGP Plus, 95 EGP Elite, 500 EGP Annual Plus, 950 EGP Annual Elite) and features from the centralized service.

### Task 7: Comprehensive Verification & Visual Audit (Strict AGENTS.md Rule)
- [ ] Run `npx tsc --noEmit` and confirm exit code 0.
- [ ] Run `npm run build` and confirm exit code 0.
- [ ] Run an E2E test script in `_technical_support/` that:
  - Fetches plans via API.
  - Triggers a plan update via `PATCH`.
  - Confirms updated limits propagate to `getUserAccessEntitlements`.
  - Captures full visual screenshots of the updated **Pricing Plans** section in `/console/subscriptions`.
