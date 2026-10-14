# News Page & Ticknal Take Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the news page by creating an AI-filtered quantitative news screener for EGX/Gold/Silver/CBE wires, an expanded 5-post daily "Ticknal take" market intelligence suite, and social-media-ready copy and vector card export tools.

**Architecture:** A two-phase daily pipeline triggered at 17:00 Cairo Time (and via Console API): Phase 1 fetches 24h TradingView wires, enriches with EOD trading metrics, and screens via OpenRouter with a strict `< 500` char / `"irrelevant"` drop gate; Phase 2 computes 5 internal deterministic quantitative takes and generates high-res 16:9 vector SVG cards. The UI is updated to support one-click social media copying and card downloads.

**Tech Stack:** Next.js 16, TypeScript, Drizzle ORM, PostgreSQL, OpenRouter AI, SVG Vector Graphics, Tailwind CSS.

**Spec:** [`docs/superpowers/specs/2026-10-14-news-page-and-ticknal-take-redesign-design.md`](file:///c:/Users/abdelrahman.mamdouh_/Desktop/Overted%20Technologies/Ticknal/docs/superpowers/specs/2026-10-14-news-page-and-ticknal-take-redesign-design.md)

## Global Constraints
- Main widgets & cards must strictly use pitch black (`#000000` / `bg-black`) or transparent surfaces; NO elevated gray backgrounds (`#18181b`, `zinc-900`).
- NEVER use `font-mono` on UI or charts; modern sans-serif with `tabular-nums` for numeric figures.
- Wordmark must be lowercase `ticknal` with `EuclidCircularSemibold` (`tracking-[-0.04em]`).
- Branded strictly as `"Ticknal take"` (Arabic: `"نبض تكنال"`), NEVER `"THE ticknal take"`.
- Zero build or TypeScript errors: `npx tsc --noEmit` and `npm run build` must exit with code 0.

## Review Focus
1. Wires labeled `"irrelevant"` or `"useless"` must NEVER be saved to the database.
2. Market breadth calculation must gracefully handle non-trading days or missing previous closes without dividing by zero.
3. Top 5 gainers/losers must enforce minimum liquidity/turnover ($> 1\text{M EGP}$) to avoid penny-stock illiquidity distortion.
4. "Copy for Social" button must format cleanly without broken markdown artifacts or unescaped characters.
5. High-resolution SVG cards must render identically in English and Arabic RTL modes.

---

### Task 1: Database Purge Utility & Types Contract

**Files:**
- Create: `src/lib/news/types.ts`
- Modify: `src/lib/handlers/cron-handlers.ts`
- Test: `_technical_support/news_audit/test_purge.ts`

**Interfaces:**
- Produces: `TicknalTakeType = 'hot_money' | 'trade_summary' | 'market_breadth' | 'gainers_losers' | 'usd_egp_update'`, `WireCandidate`, `QuantitativeScreenResult`.
- Produces: `purgeLegacyNews(dryRun?: boolean): Promise<{ deletedCount: number }>`

- [ ] **Step 1: Define shared data types in `src/lib/news/types.ts`**
  - Define `TicknalTakeType`, `WireCandidate`, `QuantitativeScreenResult`, `SocialSharePayload`.

- [ ] **Step 2: Implement `purgeLegacyNews()` helper**
  - Delete legacy news rows with outdated schemas or noise patterns.

- [ ] **Step 3: Write test script to verify purge operation**
  - Execute test script and confirm clean database status.

- [ ] **Step 4: Commit**
  - `git add src/lib/news/types.ts src/lib/handlers/cron-handlers.ts`
  - `git commit -m "feat(news): define quantitative screening types and database purge utility"`

---

### Task 2: TradingView Wire Screener & Quantitative AI Gate (Phase 1)

**Files:**
- Create: `src/lib/news/wire-screener.ts`
- Modify: `src/lib/news/news-sync.ts`
- Test: `_technical_support/news_audit/test_wire_screener.ts`

**Interfaces:**
- Consumes: OpenRouter API client (`completeWithKeyPool`), `dailyPrices` table.
- Produces: `screenAndIngestWires(): Promise<{ screened: number; inserted: number; dropped: number }>`

- [ ] **Step 1: Write test for wire relevance filtering**
  - Mock OpenRouter responses returning `"irrelevant"` vs high-signal summary and assert dropped count.

- [ ] **Step 2: Implement 24h wire fetcher for EGX tickers + Gold + Silver + CBE**
  - Filter `publishedAt >= Date.now() - 24 * 3600 * 1000`.
  - Fetch ticker's latest close, 1D % change, and volume from `dailyPrices`.

- [ ] **Step 3: Implement OpenRouter quantitative screening prompt**
  - System prompt: Senior quantitative equities analyst.
  - User prompt: News + EOD context + `< 500` char limit + strict `"irrelevant"` keyword rule.
  - Drop wire if response starts with `"irrelevant"` or `"useless"`.

- [ ] **Step 4: Run test and verify drop gate functionality**
  - Verify that noisy wires are dropped while high-conviction wires are stored in `market_news`.

- [ ] **Step 5: Commit**
  - `git add src/lib/news/wire-screener.ts src/lib/news/news-sync.ts`
  - `git commit -m "feat(news): implement 24h wire screener with strict AI quantitative noise gate"`

---

### Task 3: The 5 Dedicated "Ticknal take" Post Generators (Phase 2)

**Files:**
- Modify: `src/lib/news/ticknal-take-generator.ts`
- Test: `_technical_support/news_audit/test_take_generator.ts`

**Interfaces:**
- Consumes: `dailyPrices`, `egxInvestorFlows`, FX fair value handler.
- Produces: `generateAllDailyTakes(): Promise<{ createdCount: number; takes: string[] }>`

- [ ] **Step 1: Implement Post 1: Hot Money Status ("نبض الأموال الساخنة")**
  - 30-day rolling foreign & Arab flows, flight risk detection, "follow the money" warning.

- [ ] **Step 2: Implement Post 2: Daily Trade Summary ("ملخص جلسة التداول اليومية")**
  - EGX 30, EGX 70 EWI, EGX 100 close and % change, total turnover, session sentiment.

- [ ] **Step 3: Implement Post 3: Market Breadth ("اتساع السوق وسيولة الأسهم")**
  - Gainers, losers, unchanged counts, market advance/decline ratio.

- [ ] **Step 4: Implement Post 4: Gainers & Losers ("الأسهم الأكثر صعوداً وهبوطاً")**
  - Top 5 gainers and Top 5 losers filtered by volume $> 1\text{M EGP}$.

- [ ] **Step 5: Implement Post 5: USD/EGP Update ("تحديث سعر الصرف ومخاطر التعويم")**
  - Real USD/EGP, triangulated fair value, Sagha gold rate, CIB GDR rate, 14D/90D ATR compression, devaluation risk index.

- [ ] **Step 6: Write test script to verify all 5 takes generate cleanly**
  - Run `test_take_generator.ts` and inspect resulting JSON models.

- [ ] **Step 7: Commit**
  - `git add src/lib/news/ticknal-take-generator.ts`
  - `git commit -m "feat(news): implement 5 canonical Ticknal Take intelligence generators"`

---

### Task 4: High-Resolution 16:9 Vector SVG Card Suite

**Files:**
- Modify: `src/lib/news/ticknal-take-charts.ts`
- Test: `_technical_support/news_audit/test_svg_render.ts`

**Interfaces:**
- Produces: `generateHotMoneyChartSvg`, `generateTradeSummaryChartSvg`, `generateMarketBreadthChartSvg`, `generateGainersLosersChartSvg`, `generateUsdEgpUpdateChartSvg`.

- [ ] **Step 1: Implement 1200×675 Hot Money 30D SVG Chart**
  - Dual-axis cumulative flow curve + daily net flow histogram + Arab/Foreign share breakdown.

- [ ] **Step 2: Implement 1200×675 Daily Trade Summary 3-Index SVG Chart**
  - EGX 30 / 70 / 100 comparison bars, session turnover chip, and sentiment meter.

- [ ] **Step 3: Implement 1200×675 Market Breadth SVG Chart**
  - Advance/Decline proportional spectrum bar, advancers vs decliners cards, and median return.

- [ ] **Step 4: Implement 1200×675 Top 5 Gainers & Losers SVG Chart**
  - Split two-column visual card (Emerald Top 5 vs Rose Bottom 5) with ticker, price, and % change.

- [ ] **Step 5: Implement 1200×675 USD/EGP Triangulation & Devaluation Gauge SVG Chart**
  - Multi-proxy rate comparison (Official vs Sagha Gold vs CIB London vs Composite Fair Value) + ATR compression indicator.

- [ ] **Step 6: Run test script and inspect generated SVG data URLs**
  - Verify clean base64 image generation in both English and Arabic.

- [ ] **Step 7: Commit**
  - `git add src/lib/news/ticknal-take-charts.ts`
  - `git commit -m "feat(news): create 5 high-resolution 16:9 vector SVG social cards"`

---

### Task 5: Social Media Copy & Share Toolbar UI

**Files:**
- Modify: `src/components/platform/news/widgets/FeedPost.tsx`
- Modify: `src/components/platform/news/NewsPageView.tsx`
- Create: `src/components/platform/news/widgets/SocialShareModal.tsx`

**Interfaces:**
- Consumes: `MarketNewsItemDTO`, social formatting templates.
- Produces: One-click "Copy for Social" and "Download Visual Card" actions on every feed post.

- [ ] **Step 1: Update branding from "The Ticknal Take" to "Ticknal take"**
  - Update `FeedPost.tsx`, `NewsPageView.tsx`, and `NewsFloatingNav.tsx`.

- [ ] **Step 2: Implement `SocialShareModal.tsx`**
  - Provides pre-formatted social text (Twitter/X hook + bullets + hashtags, LinkedIn detailed post, Telegram broadcast).

- [ ] **Step 3: Add "Copy for Social" and "Download Card" action buttons to `FeedPost.tsx`**
  - Integrates copy-to-clipboard toast and vector card download handler.

- [ ] **Step 4: Commit**
  - `git add src/components/platform/news/`
  - `git commit -m "feat(news): add social media copy formatting and 1-click card export to feed posts"`

---

### Task 6: Daily Scheduler, Admin Console Operations & End-to-End Verification

**Files:**
- Modify: `src/lib/handlers/cron-handlers.ts`
- Modify: `src/app/api/news/sync/route.ts`
- Modify: `src/components/platform/console/tabs/ConsoleOperationsTab.tsx`

- [ ] **Step 1: Wire unified daily job in `cron-handlers.ts`**
  - Trigger `screenAndIngestWires()` + `generateAllDailyTakes()` daily at 17:00 Cairo Time.

- [ ] **Step 2: Add API routes for manual execution and database purge**
  - `POST /api/news/sync?action=full_pipeline` and `POST /api/news/sync?action=purge_legacy`.

- [ ] **Step 3: Add action triggers in Console Operations tab**
  - Add "Run Daily News & Takes Sync" and "Purge Legacy News" buttons for admin testing.

- [ ] **Step 4: Execute database purge and run fresh pipeline**
  - Purge legacy noisy posts and generate fresh, high-signal feed.

- [ ] **Step 5: Run strict verification commands**
  - `cmd /c npx tsc --noEmit` (exit code 0).
  - `cmd /c npm run build` (exit code 0).
  - Verify clean runtime API response on `/api/news`.

- [ ] **Step 6: Commit**
  - `git commit -am "feat(news): finalize daily 17:00 Cairo pipeline, console operations, and verification"`
