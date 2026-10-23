# Cash Balances, Monthly Wealth Check-In & Spend Delta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the `/transactions` page from a manual micro-transaction bookkeeping ledger into an accounts & liquid balance hub with a 90-second top-down monthly cashflow check-in.

**Architecture:** The page is restructured around periodic account balance snapshots (`bank_monthly_snapshots`) and a new `monthly_cashflow_summaries` table. When users close out a month, Ticknal computes $\text{Spend} = \text{Starting Cash} + \text{Income} - \text{Ending Cash}$ and offers an optional category allocation with an auto-balancing remainder chip. Stored snapshots integrate directly into `getNetWorthHistory` in `portfolio-queries.ts` to power an authentic 12-month net worth trajectory.

**Tech Stack:** Next.js 16 (Turbopack, App Router), TypeScript, PostgreSQL via Drizzle ORM, Tailwind CSS, Lucide / Ticknal Icon Library, Recharts, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-23-cash-balances-and-monthly-closeout-design.md`](file:///c:/Users/abdelrahman.mamdouh_/Desktop/Overted%20Technologies/Ticknal/docs/superpowers/specs/2026-10-23-cash-balances-and-monthly-closeout-design.md)

## Global Constraints
- Main page surfaces and drawers must strictly use pure pitch black (`#000000` / `bg-black`) or `bg-transparent`. No elevated gray fills (`#18181b`, `zinc-900`) on main containers.
- Drawers must have sharp corners (`rounded-none`).
- Strictly modern sans-serif typography (`font-sans`), with `tabular-nums` for all numbers, prices, and metrics. Zero `font-mono`.
- Full English and Arabic (RTL) mirror support.
- Zero build, typecheck, console, or runtime errors (`npx tsc --noEmit` and `npm run build` must pass with exit code 0).

## Review Focus
1. **Zero / Inverted Income Handling**: If user enters 0 income or if ending cash grew by more than income, calculated spend is $\le 0$ (net savings). Math engine must handle zero or negative spend gracefully without NaN or negative division in savings rate.
2. **Auto-Balancing Remainder Overflow**: If user manually enters category amounts totaling more than the calculated spend, the General remainder must clamp to 0 and show a warning rather than breaking.
3. **Multi-Currency Account Aggregation**: Accounts with USD or foreign currencies must be accurately converted to EGP using the live USD/EGP rate before summing total liquid cash.
4. **Empty Historical Snapshots Fallback**: In `getNetWorthHistory`, if a user only recently started tracking, months prior to the first snapshot must hold steady or interpolate rather than dropping to 0.
5. **Rapid Inline Update Concurrency**: Updating a balance inline on an account card must update `user_bank_accounts.balance` immediately and invalidate the server cache without triggering full page re-renders.

---

### Task 1: Database Schema & Core Cashflow Math Types

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/types/bank.ts`
- Create: `src/lib/banks/cashflow-math.ts`
- Test: `src/lib/banks/cashflow-math.test.ts`

**Interfaces:**
- Produces:
  - `monthlyCashflowSummaries` Drizzle table definition
  - `calculateMonthlySpendAndSavingsRate(startingCash: number, endingCash: number, income: number)`
  - `computeCategoryAllocation(totalSpend: number, categories: Array<{ category: string; amount: number }>)`
  - Types `MonthlyCashflowSummary`, `ExpenseAllocationItem`

- [x] **Step 1: Write the failing unit tests for cashflow math and allocation**

```ts
// src/lib/banks/cashflow-math.test.ts
import { describe, it, expect } from 'vitest';
import { calculateMonthlySpendAndSavingsRate, computeCategoryAllocation } from './cashflow-math';

describe('calculateMonthlySpendAndSavingsRate', () => {
  it('calculates spend and savings rate correctly for positive net savings', () => {
    // Starting 100k, Ending 120k (+20k delta), Income 50k -> Spend = 30k, Savings Rate = 40%
    const res = calculateMonthlySpendAndSavingsRate(100000, 120000, 50000);
    expect(res.deltaCash).toBe(20000);
    expect(res.spend).toBe(30000);
    expect(res.savingsRatePct).toBe(40);
  });

  it('calculates spend when net cash decreases (spend > income)', () => {
    // Starting 100k, Ending 80k (-20k delta), Income 30k -> Spend = 50k, Savings Rate = -66.67%
    const res = calculateMonthlySpendAndSavingsRate(100000, 80000, 30000);
    expect(res.deltaCash).toBe(-20000);
    expect(res.spend).toBe(50000);
    expect(res.savingsRatePct).toBe(-66.67);
  });

  it('handles zero income safely without NaN', () => {
    const res = calculateMonthlySpendAndSavingsRate(100000, 90000, 0);
    expect(res.spend).toBe(10000);
    expect(res.savingsRatePct).toBe(0);
  });
});

describe('computeCategoryAllocation', () => {
  it('calculates unallocated remainder accurately', () => {
    const totalSpend = 32000;
    const categories = [
      { category: 'Housing', amount: 12000 },
      { category: 'Cigarettes', amount: 4000 },
      { category: 'Food', amount: 8000 },
    ];
    const res = computeCategoryAllocation(totalSpend, categories);
    expect(res.allocatedTotal).toBe(24000);
    expect(res.remainder).toBe(8000);
    expect(res.items.find((i) => i.category === 'General')?.amount).toBe(8000);
  });

  it('clamps remainder to 0 if categories exceed total spend', () => {
    const res = computeCategoryAllocation(20000, [{ category: 'Car', amount: 25000 }]);
    expect(res.remainder).toBe(0);
    expect(res.isOverallocated).toBe(true);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cmd /c "npm test src/lib/banks/cashflow-math.test.ts"`  
Expected: FAIL with "Cannot find module './cashflow-math'"

- [x] **Step 3: Implement `cashflow-math.ts`, update `src/types/bank.ts`, and add `monthlyCashflowSummaries` in `src/db/schema.ts`**

Add `monthlyCashflowSummaries` to `src/db/schema.ts`:
```ts
export const monthlyCashflowSummaries = pgTable('monthly_cashflow_summaries', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  yearMonth: varchar('year_month', { length: 7 }).notNull(), // 'YYYY-MM'
  totalIncome: numeric('total_income', { precision: 16, scale: 2 }).default('0').notNull(),
  startingCashEgp: numeric('starting_cash_egp', { precision: 16, scale: 2 }).notNull(),
  endingCashEgp: numeric('ending_cash_egp', { precision: 16, scale: 2 }).notNull(),
  calculatedSpendEgp: numeric('calculated_spend_egp', { precision: 16, scale: 2 }).notNull(),
  savingsRatePct: numeric('savings_rate_pct', { precision: 5, scale: 2 }),
  expenseBreakdown: jsonb('expense_breakdown').$type<Array<{ category: string; amount: number; percentage: number }>>(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userMonthUnique: unique('monthly_cashflow_user_month_unique').on(table.userId, table.yearMonth),
  userIdIdx: index('monthly_cashflow_user_id_idx').on(table.userId),
}));
```

Implement pure math functions in `src/lib/banks/cashflow-math.ts`.

- [x] **Step 4: Run test to verify it passes**

Run: `cmd /c "npm test src/lib/banks/cashflow-math.test.ts"`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/db/schema.ts src/types/bank.ts src/lib/banks/cashflow-math.ts src/lib/banks/cashflow-math.test.ts
git commit -m "feat(banks): add monthly cashflow schema and delta math engine"
```

---

### Task 2: Net Worth Engine Integration with Monthly Snapshots

**Files:**
- Modify: `src/lib/server/portfolio-queries.ts`
- Test: `src/lib/server/portfolio-queries-snapshots.test.ts`

**Interfaces:**
- Consumes: `bankMonthlySnapshots`, `monthlyCashflowSummaries`, `userBankAccounts`
- Produces: Updated `getNetWorthHistory(userId, accounts, transactions, fxRates)` that incorporates authentic closing snapshots from `bank_monthly_snapshots` instead of transaction back-reconstruction.

- [x] **Step 1: Write unit test verifying snapshot-aware net worth cash resolution**

```ts
// src/lib/server/portfolio-queries-snapshots.test.ts
import { describe, it, expect } from 'vitest';
import { resolveMonthlyCashBalances } from './portfolio-queries-helpers';

describe('resolveMonthlyCashBalances', () => {
  it('uses snapshot closing balance when available for a given month', () => {
    const snapshots = [
      { accountId: 1, yearMonth: '2026-09', closingBalance: '100000' },
      { accountId: 2, yearMonth: '2026-09', closingBalance: '50000' },
    ];
    const accounts = [
      { id: 1, balance: '120000', currency: 'EGP' },
      { id: 2, balance: '55000', currency: 'EGP' },
    ];
    const totalEgp = resolveMonthlyCashBalances('2026-09', snapshots, accounts, { USD: 50 });
    expect(totalEgp).toBe(150000);
  });

  it('falls back to current balance if month is current and has no snapshot yet', () => {
    const snapshots: any[] = [];
    const accounts = [
      { id: 1, balance: '120000', currency: 'EGP' },
      { id: 2, balance: '1000', currency: 'USD' },
    ];
    const totalEgp = resolveMonthlyCashBalances('2026-10', snapshots, accounts, { USD: 50 });
    expect(totalEgp).toBe(170000); // 120k + (1000 * 50)
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cmd /c "npm test src/lib/server/portfolio-queries-snapshots.test.ts"`  
Expected: FAIL

- [x] **Step 3: Implement `resolveMonthlyCashBalances` and update `getNetWorthHistory` in `src/lib/server/portfolio-queries.ts`**

Update `portfolio-queries.ts` to query `bankMonthlySnapshots` for `userId` across the requested 12 months and resolve cash totals accurately.

- [x] **Step 4: Run test to verify it passes**

Run: `cmd /c "npm test src/lib/server/portfolio-queries-snapshots.test.ts"`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/lib/server/portfolio-queries.ts src/lib/server/portfolio-queries-snapshots.test.ts
git commit -m "feat(portfolio): integrate bank monthly snapshots into net worth history"
```

---

### Task 3: Backend API Endpoints for Accounts & Monthly Closeouts

**Files:**
- Create/Modify: `src/lib/handlers/bank-handlers.ts`
- Modify: `src/app/api/[[...slug]]/route.ts`
- Test: `src/lib/handlers/bank-handlers.test.ts`

**Interfaces:**
- Produces:
  - `PATCH /api/banks/accounts/[id]/balance`: Fast inline update `{ balance: number }`
  - `POST /api/banks/snapshots/closeout`: Monthly closeout submission `{ yearMonth, accountBalances, totalIncome, expenseBreakdown, notes }`
  - `GET /api/banks/snapshots/history`: Returns closed months summaries and snapshots archive

- [x] **Step 1: Write integration tests for closeout handler and balance update**

```ts
// src/lib/handlers/bank-handlers.test.ts
import { describe, it, expect } from 'vitest';
import { validateCloseoutPayload } from './bank-handlers-helpers';

describe('validateCloseoutPayload', () => {
  it('validates yearMonth and numeric balances correctly', () => {
    const payload = {
      yearMonth: '2026-10',
      accountBalances: [{ accountId: 1, balance: 115000 }],
      totalIncome: 50000,
      expenseBreakdown: [{ category: 'Food', amount: 8000, percentage: 25 }],
    };
    const valid = validateCloseoutPayload(payload);
    expect(valid.isValid).toBe(true);
    expect(valid.yearMonth).toBe('2026-10');
  });

  it('rejects invalid yearMonth format', () => {
    const payload = { yearMonth: 'invalid-date', accountBalances: [] };
    const valid = validateCloseoutPayload(payload);
    expect(valid.isValid).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cmd /c "npm test src/lib/handlers/bank-handlers.test.ts"`  
Expected: FAIL

- [x] **Step 3: Implement handlers in `src/lib/handlers/bank-handlers.ts` and wire routes in `src/app/api/[[...slug]]/route.ts`**

Wire endpoints under `root === 'banks'` in `route.ts`:
- `/api/banks/accounts/:id/balance`
- `/api/banks/snapshots/closeout`
- `/api/banks/snapshots/history`

- [x] **Step 4: Run test to verify it passes**

Run: `cmd /c "npm test src/lib/handlers/bank-handlers.test.ts"`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/lib/handlers/bank-handlers.ts src/app/api/[[...slug]]/route.ts src/lib/handlers/bank-handlers.test.ts
git commit -m "feat(api): add endpoints for inline balance patch and monthly closeouts"
```

---

### Task 4: Surface 1 — Accounts Rail & Fast Inline Balance Updating

**Files:**
- Create: `src/components/platform/transactions/AccountsRail.tsx`
- Create: `src/components/platform/transactions/AccountBalanceCard.tsx`
- Modify: `src/components/platform/AddAccountModal.tsx` (or ensure modern drawer exists)

**Interfaces:**
- Consumes: `BankAccount[]`, `usdRate`, `onBalanceUpdated(accountId, newBalance)`
- Produces: Visual account cards with authentic bank styling, current balance, last updated relative badge, and inline click-to-edit.

- [x] **Step 1: Build `AccountBalanceCard.tsx` with inline editing mode**

Features:
- Bank icon and color pill.
- Large numerical balance display with `tabular-nums` and currency symbol.
- Inline "Quick Update": clicking triggers a lightweight number input with save/cancel buttons.
- On save, performs `PATCH /api/banks/accounts/[id]/balance` optimistically, updating state immediately.

- [x] **Step 2: Build `AccountsRail.tsx`**

Features:
- Grid layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3`).
- Accounts grouped by type: Banks, Wallets/Cash, Brokerage Cash, Foreign Currencies.
- "+ Add Account" quick card to trigger account creation drawer.

- [x] **Step 3: Verify TypeScript compilation**

Run: `cmd /c "npx tsc --noEmit"`  
Expected: 0 errors

- [x] **Step 4: Commit**

```bash
git add src/components/platform/transactions/AccountsRail.tsx src/components/platform/transactions/AccountBalanceCard.tsx
git commit -m "feat(ui): implement accounts rail and inline balance quick updater"
```

---

### Task 5: Surface 2 — The 90-Second Monthly Check-In Drawer

**Files:**
- Create: `src/components/platform/transactions/MonthlyCheckInDrawer.tsx`
- Create: `src/components/platform/transactions/ExpenseAllocationSlider.tsx`

**Interfaces:**
- Consumes: `isOpen`, `onClose()`, `accounts: BankAccount[]`, `previousSummary?: MonthlyCashflowSummary`, `onCheckInComplete(summary)`
- Produces: 3-step check-in slide-over drawer:
  1. Balances reconciliation
  2. Income input & instant delta spend display
  3. Optional category allocation with auto-balancing General remainder chip.

- [x] **Step 1: Build `ExpenseAllocationSlider.tsx`**

Features:
- Categories list (Housing, Groceries/Food, Cigarettes/Personal, Leisure, Transport, Custom).
- Sliders and direct numerical inputs.
- Floating/sticky **"General / Uncategorized Remainder"** chip:
  $$\text{Remainder} = \text{Total Spend} - \sum \text{Categories}$$
- Clamps to zero with alert if user exceeds total spend.

- [x] **Step 2: Build `MonthlyCheckInDrawer.tsx`**

Features:
- Pure pitch black (`bg-black`), sharp corners (`rounded-none`).
- Full bilingual translation (English & Arabic RTL).
- Step 1: Account balances table pre-filled with last recorded balance.
- Step 2: Income input with instant spend summary card.
- Step 3: Optional toggle for expense distribution.
- Primary CTA: "Save & Close Month" submitting to `/api/banks/snapshots/closeout`.

- [x] **Step 3: Verify TypeScript compilation**

Run: `cmd /c "npx tsc --noEmit"`  
Expected: 0 errors

- [x] **Step 4: Commit**

```bash
git add src/components/platform/transactions/MonthlyCheckInDrawer.tsx src/components/platform/transactions/ExpenseAllocationSlider.tsx
git commit -m "feat(ui): add 90-second monthly check-in drawer with expense allocation"
```

---

### Task 6: Surface 3 & 4 — Cash & Balances Page Assembly & Archive

**Files:**
- Modify: `src/components/platform/transactions/TransactionsKPIRail.tsx`
- Create: `src/components/platform/transactions/MonthlyCloseoutArchive.tsx`
- Modify: `src/components/platform/transactions/TransactionsPageView.tsx`
- Modify: `src/app/(main)/transactions/page.tsx`
- Modify: `src/lib/i18n/translations/` (en & ar strings for Cash & Balances)

**Interfaces:**
- Replaces legacy ledger table with the new unified experience:
  1. Header with Total Liquid KPI & "Monthly Check-In" CTA.
  2. Accounts Rail with inline editing.
  3. Net Worth & Cash Trend Area Chart.
  4. Monthly Closeouts Archive with category breakdown bars.

- [x] **Step 1: Update `TransactionsKPIRail.tsx`**

Shows:
- **Total Liquid Cash**: Real-time aggregated balance across accounts in EGP.
- **Latest Monthly Spend**: Actual calculated burn from last closeout.
- **Savings Rate**: Percentage of income retained.
- **Status Badge**: Days since last check-in.

- [x] **Step 2: Build `MonthlyCloseoutArchive.tsx`**

Features:
- Cards for past months (Oct 2026, Sep 2026, etc.).
- Displays Starting Cash $\rightarrow$ Income $\rightarrow$ Ending Cash $\rightarrow$ Spend.
- Stacked category colored bar showing breakdown with hover tooltips.

- [x] **Step 3: Refactor `TransactionsPageView.tsx` & `page.tsx`**

Assemble all surfaces into the page layout, removing the heavy accounting ledger while maintaining tour and mobile responsiveness.

- [x] **Step 4: Verify TypeScript compilation**

Run: `cmd /c "npx tsc --noEmit"`  
Expected: 0 errors

- [x] **Step 5: Commit**

```bash
git add src/components/platform/transactions/TransactionsKPIRail.tsx src/components/platform/transactions/MonthlyCloseoutArchive.tsx src/components/platform/transactions/TransactionsPageView.tsx src/app/(main)/transactions/page.tsx
git commit -m "feat(pages): assemble cash and balances hub and monthly closeout archive"
```

---

### Task 7: Full System Verification & Regression Guard

**Files:**
- Entire codebase

- [x] **Step 1: Run complete test suite**

Run: `cmd /c "npm test"`  
Expected: All tests pass (exit code 0).

- [x] **Step 2: Run complete TypeScript typecheck**

Run: `cmd /c "npx tsc --noEmit"`  
Expected: Exit code 0, zero type errors.

- [x] **Step 3: Run production Next.js build**

Run: `cmd /c "npm run build"`  
Expected: Next.js build finishes successfully with exit code 0.

- [x] **Step 4: Final Git Commit**

```bash
git commit --allow-empty -m "chore: verify cash balances and monthly closeout build health"
```
