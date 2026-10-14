# FX & Currency Risk Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**: Overhaul the **FX & Currency Risk** section on the Markets page into a 5-card macro barometer featuring live Egyptian Sagha gold ("دولار الصاغة"), offshore CIB London GDR ("دولار CIB"), ATR volatility compression devaluation risk, and mini SVG sparklines.

**Architecture Spec**: [docs/superpowers/specs/2026-10-13-fx-currency-risk-redesign-design.md](file:///c:/Users/abdelrahman.mamdouh_/Desktop/Overted%20Technologies/Ticknal/docs/superpowers/specs/2026-10-13-fx-currency-risk-redesign-design.md)

---

## File Structure & Responsibilities

1. **`src/lib/server/isagha-scraper.ts`**:
   - Parses live 24k and 21k gold prices from `market.isagha.com/prices`.
   - Computes purity fallback: $24\text{k} = 21\text{k} \times 24 / 21$.
   - Provides cached, high-availability Sagha quotes.
2. **`src/lib/handlers/fx-fair-value-handler.ts`**:
   - Ingests official `USDEGP`, `COMI`, `CBKD` (LSE GDR), and local Sagha 24k gold.
   - Computes:
     - 14D and 90D Average True Range (ATR) on `USDEGP`.
     - "دولار الصاغة" (Local 24k $\times 31.1035 \div$ Spot Ounce).
     - "دولار CIB" (`COMI` EGP $\div$ `CBKD` USD).
     - Composite real fair value.
     - Dynamic Devaluation Risk Index (0–100) with ATR suppression and proxy spread factors.
     - 14-day / 30-day sparkline arrays for each card.
3. **`src/components/ui/Sparkline.tsx`**:
   - Lightweight, zero-dependency SVG sparkline component.
   - Renders hairline trend paths with gradient fills and smooth normalization.
4. **`src/components/platform/home/investments/performance/kpi-rails/KPICard.tsx`**:
   - Enhanced to accept `sparklineData?: number[]`, `sparklineColor?: string`, `gaugeValue?: number`.
5. **`src/components/platform/markets/sections/FxDevaluationSection.tsx`**:
   - Renders the 5 cards:
     1. Official USD/EGP Spot (with 14D ATR indicator & 30D sparkline)
     2. Real EGP Fair Value (with delta gap gauge & spread)
     3. Local Gold Proxy ("دولار الصاغة" with 14D sparkline)
     4. Offshore Equity Proxy ("دولار CIB" with 14D sparkline)
     5. Devaluation Risk Index (with dynamic color-coded risk meter)
   - Desktop: 5-column grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5`).
   - Mobile: Side-scrollable rail (`flex overflow-x-auto snap-x no-scrollbar gap-3`) with peek.

---

## Tasks

### Task 1: Create Live Egyptian Sagha Gold Scraper
- [ ] Create `src/lib/server/isagha-scraper.ts` with HTML parsing for 24k/21k prices.
- [ ] Add unit test `_technical_support/gold_data_audit/test_scraper.ts` verifying extraction and mathematical purity ratio.
- [ ] Run test and confirm successful scrape with valid numbers.

### Task 2: Upgrade Backend FX Handler & Dynamic Devaluation Risk Engine
- [ ] In `src/lib/handlers/fx-fair-value-handler.ts`, implement ATR calculation function over the last 14 and 90 days of `USDEGP`.
- [ ] Ingest live Sagha 24k gold and calculate the true Sagha Dollar (`goldImpliedRate`).
- [ ] Calculate the London CIB GDR Dollar (`gdrImpliedRate`).
- [ ] Implement the multi-factor Devaluation Pressure Index (0–100) incorporating ATR suppression, proxy spread, and NFA balance.
- [ ] Generate 14-day and 30-day historical sparkline series for `officialUsd`, `compositeFair`, `goldImplied`, and `gdrImplied`.
- [ ] Test API handler using a scratch test script in `_technical_support/gold_data_audit/` and verify JSON structure.

### Task 3: Build Mini SVG Sparkline Component & Update KPICard
- [ ] Create `src/components/ui/Sparkline.tsx` supporting arbitrary numeric arrays, min/max normalization, and SVG stroke/gradient styling.
- [ ] Update `KPICard.tsx` to render `<Sparkline />` when `sparklineData` is provided, and support mini delta gauges for spread indicators.

### Task 4: Redesign FxDevaluationSection UI
- [ ] Update `FxDevaluationSection.tsx` to render the 5 updated cards with clear bilingual labels:
  - Official USD/EGP (`سعر الدولار الرسمي`)
  - Real EGP Fair Value (`القيمة العادلة الحقيقية`)
  - Local Gold Proxy ("دولار الصاغة")
  - Offshore Equity Proxy ("دولار CIB في لندن")
  - Devaluation Risk Index (`مؤشر ضغط التعويم`)
- [ ] Implement responsive layout: single 5-column grid on desktop, side-scrollable horizontal rail on mobile.
- [ ] Ensure strict adherence to AGENTS.md (`bg-black`, hairline borders, sans-serif typography, `tabular-nums`).

### Task 5: End-to-End Verification
- [ ] Run `npx tsc --noEmit` and confirm 0 errors.
- [ ] Run `npm run build` and confirm all pages compile with code 0.
