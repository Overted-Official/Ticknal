# Design Specification: News Page & Ticknal Take Redesign

**Date**: 2026-10-14  
**Status**: Approved  
**Topic**: High-Signal News Pipeline, Quantitative AI Noise Filter & 5-Post Ticknal Take Social Suite  

---

## 1. Executive Summary & Goals

The news page and intelligence system are overhauled to transform raw, noisy headlines into high-value quantitative market insights. The architecture consists of two primary operational phases:

1. **Phase 1: TradingView Wire Ingestion & AI Quantitative Noise Filter**
   - Ingests wires from TradingView for EGX constituent tickers, Gold (local & global), Silver, and Central Bank of Egypt (CBE) published within the last 24 hours.
   - Enriches each wire with end-of-day market context (last closing price, 1-day percentage change, volume).
   - Prompts OpenRouter AI using a specialized Quantitative Trading Analyst persona.
   - Enforces a strict relevance filter: returns a maximum 500-character summary only if the news has actionable fundamental or pricing value; if the news is procedural noise (e.g. routine COMEX delivery intentions), the AI responds with `"irrelevant"` or `"useless"`, and the item is discarded without posting to the feed.

2. **Phase 2: The "Ticknal take" 5-Post Daily Suite**
   - Renames all branding from *"THE ticknal take"* to strictly **"Ticknal take"** (Arabic: **"نبض تكنال"**).
   - Generates five dedicated, deterministic quantitative posts daily using internal Ticknal market data:
     1. **Hot Money Status**: 30-day rolling net foreign/Arab flows, institutional flight detection, and a critical "follow the money" warning against taking technical buy signals during liquidity exit.
     2. **Daily Trade Summary**: EGX 30, EGX 70 EWI, and EGX 100 benchmark performance, turnover, and session sentiment.
     3. **Market Breadth**: Advancers, decliners, and unchanged tickers distribution with market participation health.
     4. **Gainers & Losers**: Visual breakdown of top 5 gainers and top 5 losers with volume thresholds.
     5. **USD/EGP Update**: Real exchange rate, triangulated fair value, Sagha gold proxy, London CIB proxy, ATR compression, and critical devaluation likelihood assessment.
   - Generates five standalone, high-definition 16:9 vector SVG infographic cards (1200×675).

3. **Social Media Ready Exporting**
   - Every post includes a dedicated **"Share / Social"** toolbar providing:
     - **Copy Post**: One-click copy formatted for Twitter/X and LinkedIn (hook, key takeaways, quantitative bullet points, hashtags).
     - **Download HD Card**: Direct download/copy of the 1200×675 branded vector visual card ready for immediate attachment on social platforms.

4. **Database Purge & Scheduling**
   - All legacy noisy news entries are purged from the database table.
   - Daily job runs automatically at **17:00 Cairo Time** (14:00 UTC) with an on-demand manual trigger in `/console/operations`.

---

## 2. Technical Architecture & File Map

### A. Phase 1 — Wire Ingestion & Quantitative Screener
- **File**: `src/lib/news/wire-screener.ts`
  - Fetches 24-hour TradingView wires for:
    - Primary EGX constituents (e.g., `COMI`, `TMGH`, `SWDY`, `EAST`, `FWRY`, `ETEL`, `ABUK`, `EKHO`, `ORAS`, `ESRS`, `HRHO`, `MFPC`, `ISPH`, `AMOC`, `EGX30`).
    - Bullion & Precious Metals (`GOLD`, `SILVER`, `XAUUSD`, `XAGUSD`).
    - CBE / Macro Currency (`USDEGP`, `CBE`, Central Bank disclosures).
  - Joins latest EOD trade statistics from `dailyPrices` table (latest close, previous close, daily volume).
  - Calls OpenRouter with strict prompt:
    - System prompt: Senior quantitative analyst & Egyptian equities strategist.
    - User prompt: News text + market context + strict relevance criteria.
    - If output starts with `"irrelevant"` or `"useless"`, drops the item immediately.
    - Otherwise, saves to `market_news` with `source: 'TradingView Wire'` and summary $\le 500$ chars.

### B. Phase 2 — Ticknal Take Generator & Infographics
- **File**: `src/lib/news/ticknal-take-generator.ts`
  - Computes the 5 canonical data snapshots:
    1. `hot_money`: 30-day cumulative foreign & Arab net flows, turnover, inflow/outflow day ratio.
    2. `trade_summary`: EGX 30, EGX 70, EGX 100 close and % change, session volume.
    3. `market_breadth`: Advancers, decliners, unchanged count and percentage ratio.
    4. `gainers_losers`: Top 5 gainers and Top 5 losers with minimum turnover $> 1\text{M EGP}$.
    5. `usd_egp_update`: Official USD/EGP, triangulated composite fair value, Sagha gold rate, London CIB GDR rate, ATR 14/90 compression, devaluation risk score.
  - Generates critical AI analyst commentary for each take.
  - Inserts the 5 posts into `market_news` with `category: 'ticknal_take'` and `source: 'Ticknal take'`.
- **File**: `src/lib/news/ticknal-take-charts.ts`
  - Implements 5 dedicated SVG generators (1200×675, pure black `#000000`, sans-serif typography, `tabular-nums`):
    - `generateHotMoneyChartSvg`
    - `generateTradeSummaryChartSvg`
    - `generateMarketBreadthChartSvg`
    - `generateGainersLosersChartSvg`
    - `generateUsdEgpUpdateChartSvg`
  - Generates both English and Arabic versions with sharp contrast and brand wordmark.

### C. UI & Social Export
- **File**: `src/components/platform/news/widgets/FeedPost.tsx`
  - Displays `"Ticknal take"` (Arabic: `"نبض تكنال"`) with verified badge.
  - Renders 16:9 visual card with zoom modal and high-res preview.
  - Adds a dedicated social action bar:
    - `Copy for Social` button with tooltip and confirmation toast.
    - `Download Visual Card` button to export the SVG/PNG asset.
- **File**: `src/components/platform/news/widgets/SocialShareModal.tsx`
  - Modal providing ready-to-copy social text templates (Twitter/X character-optimized, LinkedIn full format, Telegram channel broadcast).

### D. Console & Cron Triggers
- **File**: `src/lib/handlers/cron-handlers.ts`
  - Registers the unified daily job `runDailyNewsAndTakesPipeline()` scheduled at 17:00 Cairo Time.
- **File**: `src/app/api/news/sync/route.ts`
  - Supports authenticated admin manual trigger `POST /api/news/sync?action=full_pipeline` and `POST /api/news/sync?action=purge_legacy`.
- **File**: `src/components/platform/console/tabs/ConsoleOperationsTab.tsx`
  - Surfaces a one-click button: **"Run Daily News & Takes Sync"** and **"Purge Legacy News"**.

---

## 3. Strict Compliance Checks
- Pure black `#000000` and transparent surfaces only (no elevated gray `#18181b` containers).
- No `font-mono` on UI or charts; modern sans-serif with `tabular-nums` for numbers.
- Lowercase `ticknal` brand typography using `EuclidCircularSemibold` (`tracking-[-0.04em]`).
- Proactive verification: `npx tsc --noEmit` and `npm run build` exit code 0.

---

## 4. Acceptance Criteria
1. Legacy noise (e.g. COMEX delivery intentions) is completely purged from the database feed.
2. Wires failing the quantitative value test are dropped (0 database rows inserted).
3. Exactly 5 high-impact "Ticknal take" daily posts are published with high-res 16:9 infographic cards.
4. "THE ticknal take" is renamed to "Ticknal take" everywhere across English and Arabic UI.
5. Users can copy social-media-formatted text and download visual cards in one click.
6. Zero build, TypeScript, or runtime console errors.
