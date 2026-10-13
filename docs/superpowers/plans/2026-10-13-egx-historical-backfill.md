# EGX Historical Daily Price Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Identify all missing historical trading bars prior to the oldest recorded date (`MIN(date)`) for each EGX ticker in the database, and backfill the missing historical depth up to TradingView's maximum historical lookback (~10,000 trading sessions) with split-adjusted price consistency.

**Architecture:** Build a standalone, robust CLI tool and background runner in `_technical_support/historical_backfill/` that connects to TradingView WebSocket client (`@mathieuc/tradingview`), compares `MIN(date)` against the available TradingView series with controlled concurrency (5 charts per batch, 10s timeout, exponential backoff), performs chunked idempotent upserts (`ON CONFLICT (ticker_symbol, date) DO NOTHING`) into `daily_prices`, and invalidates strategy caches.

**Tech Stack:** TypeScript, Next.js, Drizzle ORM, PostgreSQL (`postgres.js`), `@mathieuc/tradingview`.

---

## Global Constraints

- **Historical Range Target:** Fetch full historical depth using `range: 10000` with `timeframe: 'D'` and `adjustment: 'splits'`.
- **Target Condition:** Backfill exclusively bars where `bar.date < db_min_date` for each ticker, without mutating existing verified canonical bars.
- **Idempotency:** Batch insert using `ON CONFLICT (ticker_symbol, date) DO NOTHING`.
- **Concurrency & Rate Limit Guard:** Maximum 5-8 concurrent chart sessions per WebSocket connection with 10-second timeout and 500ms pacing between batches to prevent TradingView rate-limits.
- **Clean Separation:** Operational scripts and test suites must strictly reside in `_technical_support/historical_backfill/` per project agent rules.
- **Cache Invalidation:** Call `invalidatePrecomputedMarketCache()` upon completion so PSI/Hydra strategies and market overview immediately recognize the new depth.

---

## Review Focus

1. **Unlisted / OTC / Non-Trading Symbols:** Tickers in the DB with zero TradingView volume or no active listing must fail gracefully without hanging the batch runner.
2. **Boundary Discontinuity / Split Mismatches:** When stitching backfilled bars (`date < min_date`) with existing bars (`date >= min_date`), verify that the ratio between the oldest stored bar and newest backfilled bar does not represent an unadjusted corporate action split.
3. **ISIN Tickers (`EGS...`):** Certain EGX tickers are stored under ISIN codes or dual-currency symbols (e.g. `EGS3E071C013-EGP`); resolve them to their TradingView trading symbols where available.
4. **Time Budget / Process Survival:** Scanning and inserting 296 tickers must support resumability, saving progress checkpoints to disk so interruption does not require restarting from scratch.
5. **Strategy Universe Threshold (<130 bars):** Confirm that tickers previously disqualified from 120-day MA strategy models (fewer than 130 bars) are properly upgraded to active model evaluation once historical depth is seeded.

---

## Task Breakdown

### Task 1: Audit & Discovery Matrix Generator

**Files:**
- Create: `_technical_support/historical_backfill/discover-gaps.ts`
- Output: `_technical_support/historical_backfill/backfill-manifest.json`

**Interfaces:**
- Consumes: `tickers` table and `daily_prices` table in PostgreSQL.
- Produces: `backfill-manifest.json` containing an array of `{ symbol, cleanSymbol, tvSymbol, dbMinDate, dbBarsCount, tvMinDate, tvBarsCount, missingBarsCount, status }`.

- [ ] **Step 1: Write gap discovery engine with rate-limited WebSocket batching**
  - Implement `discoverGaps()` with batch size 5, 8s timeout, and 500ms delay.
  - Query DB for `MIN(date)`, `MAX(date)`, `COUNT(*)` for all non-macro tickers.
  - Probe TradingView for each ticker with `range: 10000` and compute `missingBarsCount = bars.filter(b => b.date < dbMinDate).length`.

- [ ] **Step 2: Run discovery engine in dry-run mode**
  - Run: `cmd /c npx tsx _technical_support/historical_backfill/discover-gaps.ts`
  - Expected: Exits with code 0, outputs summary of candidates, and generates `backfill-manifest.json`.

- [ ] **Step 3: Verify manifest data integrity**
  - Check that candidate tickers have verified `missingBarsCount > 0` and valid dates.

---

### Task 2: Robust Chunked Historical Seeder

**Files:**
- Create: `_technical_support/historical_backfill/seed-history.ts`
- Consumes: `_technical_support/historical_backfill/backfill-manifest.json`
- Modifies: `daily_prices` table

**Interfaces:**
- Input: `--tier=all|sample|priority|missing-only` and optional `--dry-run`.
- Output: Logs total rows inserted per ticker and records execution in `_technical_support/historical_backfill/seed-log.json`.

- [ ] **Step 1: Implement boundary sanity check**
  - Before inserting older bars, verify that `newestBackfilledBar.close` is within a reasonable multiple of `oldestStoredBar.open` to guard against split scale inversion.

- [ ] **Step 2: Implement chunked batch insertion**
  - Insert rows in chunks of 500 using:
    ```sql
    INSERT INTO daily_prices (ticker_symbol, date, open, high, low, close, volume)
    VALUES (...)
    ON CONFLICT (ticker_symbol, date) DO NOTHING;
    ```
  - Wrap per ticker in a transaction so every ticker is all-or-nothing.

- [ ] **Step 3: Test seeder on a single ticker (e.g. `SNFI` or `LKGP`) with dry-run and live run**
  - Run: `cmd /c npx tsx _technical_support/historical_backfill/seed-history.ts --symbol=SNFI`
  - Verify row count in `daily_prices` before and after.

---

### Task 3: Comprehensive Multi-Batch Execution & Resumability

**Files:**
- Modify: `_technical_support/historical_backfill/seed-history.ts`
- Produces: Progress checkpoint file `_technical_support/historical_backfill/seed-progress.json`

- [ ] **Step 1: Add checkpointing & resume capability**
  - If process is interrupted or reaches a network timeout, save completed ticker symbols to `seed-progress.json`.
  - On restart, automatically skip tickers already seeded.

- [ ] **Step 2: Execute historical backfill for all candidate tickers**
  - Run: `cmd /c npx tsx _technical_support/historical_backfill/seed-history.ts --all`

- [ ] **Step 3: Verify database stats post-seeding**
  - Verify that `MIN(date)` for candidate tickers has shifted back to TradingView inception dates.
  - Check total rows added to `daily_prices`.

---

### Task 4: Strategy Precomputation & Platform Cache Invalidation

**Files:**
- Create: `_technical_support/historical_backfill/invalidate-and-verify.ts`

- [ ] **Step 1: Invalidate in-memory caches and re-evaluate strategy models**
  - Call `invalidatePrecomputedMarketCache()` and trigger a test performance & signals query.
  - Verify that tickers previously under 130 bars now have complete metrics.

- [ ] **Step 2: Run full build and typecheck verification**
  - Run: `cmd /c npx tsc --noEmit`
  - Run: `cmd /c npm run build`
  - Confirm both exit with code 0.
