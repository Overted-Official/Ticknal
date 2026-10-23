# Design Specification: Cash Balances, Monthly Wealth Check-In & Spend Delta System

**Date**: 2026-10-23  
**Status**: Ready for Review  
**Topic**: Transition from Granular Micro-Transaction Bookkeeping to Account Balance Tracking & 90-Second Monthly Cashflow Closeouts  

---

## 1. Executive Summary & Problem Statement

### The Problem
The current `/transactions` page functions like a traditional accounting ledger, requiring users to manually log every individual financial event (coffee, groceries, ride-shares, utility bills). In markets without Open Banking / automated bank sync (such as Egypt), manual transaction entry suffers from an abandonment rate exceeding 90%. Users find the experience tedious and unrewarding ("feeling like an accountant trying to balance the books"), leading to blank pages, abandoned tracking, and broken net worth history.

### The Solution
Replace granular micro-transaction bookkeeping with **Periodic Account Balance Tracking & Top-Down Monthly Cashflow Check-Ins**:
1. **Accounts & Quick Balances**: Users configure their financial accounts (CIB, QNB, Instapay, Vodafone Cash, Brokerage Cash, Physical Cash, Foreign Currencies) and update balances with a 3-second inline input whenever they choose.
2. **The 90-Second Monthly Check-In**: Once a month (or on payday/month-end), users perform a frictionless check-in:
   - Confirm/edit ending balances across accounts.
   - Enter monthly income.
   - The system automatically derives the monthly burn:
     $$\text{Spend} = \text{Starting Liquid Cash} + \text{Monthly Income} - \text{Ending Liquid Cash}$$
     $$\text{Savings Rate} = \frac{\text{Monthly Income} - \text{Spend}}{\text{Monthly Income}} \times 100\%$$
   - **Optional Expense Allocation**: Users can optionally distribute their calculated spend into 3–5 high-level buckets (e.g., Housing, Food, Cigarettes/Personal, Leisure) using intuitive sliders/inputs with an **auto-balancing remainder** ("General / Living") bucket that absorbs the rest. No user is ever forced to manually make numbers sum to zero.
3. **Authentic Net Worth & Cash Analytics**: Stored monthly snapshots feed directly into the platform's 12-month net worth history engine, producing a genuine, continuous wealth progression curve across cash and investment assets.

---

## 2. Page Architecture & User Interface Surfaces

The route `/transactions` is maintained for URL and bookmark continuity, with its user-facing title refreshed to **"Cash & Balances"** (Arabic: **"الأرصدة والسيولة"**).

```
┌────────────────────────────────────────────────────────────────────────┐
│  Cash & Balances                                                       │
│  [Total Liquid: 173,000 EGP] [Oct Spend: 32,000 EGP] [Savings: 36%]    │
│  [Monthly Check-In (CTA)]  [+ Add Account]                             │
├────────────────────────────────────────────────────────────────────────┤
│  Surface 1: Accounts & Balances Rail                                   │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐    │
│  │ CIB Current       │ │ QNB Savings       │ │ Instapay / Cash   │    │
│  │ 115,000 EGP       │ │ 50,000 EGP        │ │ 8,000 EGP         │    │
│  │ [Quick Update]    │ │ [Quick Update]    │ │ [Quick Update]    │    │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘    │
├────────────────────────────────────────────────────────────────────────┤
│  Surface 2: 12-Month Net Worth & Cash Trend                            │
│  • Actual historical closing cash + equity assets                      │
│  • Monthly savings rate progression indicator                          │
├────────────────────────────────────────────────────────────────────────┤
│  Surface 3: Monthly Closeout Archive & Spending Breakdown              │
│  • Oct 2026: 50k Inflow | 18k Saved | 32k Spend [Category Bar]         │
│  • Sep 2026: 45k Inflow | 15k Saved | 30k Spend [Macro Total]          │
└────────────────────────────────────────────────────────────────────────┘
```

### A. Header & Top Action Controls
- **Page Header**: "Cash & Balances" (*الأرصدة والسيولة*) with subtitle: "Monitor liquid account balances, track true month-over-month cashflow, and review net worth progression."
- **Primary Action**: **"Monthly Check-In"** (`btn-primary-cta`), prominent button with month badge (e.g. `October 2026`).
- **Secondary Action**: **"+ Add Account"** button for adding new bank, wallet, or cash accounts.
- **KPI Rail**:
  - **Total Liquid Cash**: Real-time aggregated balance across all active accounts (EGP with USD conversion toggle).
  - **Latest Monthly Burn**: Actual calculated outflow from the most recent completed check-in.
  - **Savings Rate**: Percentage of income retained (e.g., `+36.0%`).
  - **Status Badge**: "Updated 2 days ago" or "October Check-in Ready".

### B. Surface 1: Accounts Grid & Quick Balance Updates
- Visual account cards grouped or filtered by type:
  - **Egyptian Banks**: CIB, QNB, NBE, Banque Misr, etc. (with authentic brand badges).
  - **Cash & Wallets**: Instapay, Vodafone Cash, Physical Cash, Vault.
  - **Brokerage Cash**: Thndr, EFG Hermes, CI Capital.
  - **Foreign Currency**: Wise, HSBC USD, USD Cash (converted via live USD/EGP rate).
- **Inline Quick Update**:
  - Each card features an inline "Quick Update" button.
  - Clicking replaces the balance text with a clean numerical input. Pressing Enter or clicking checkmark immediately updates the balance in `user_bank_accounts` and updates the total liquid KPI without opening a heavy modal.

### C. Surface 2: The 90-Second Monthly Check-In Drawer
A sharp, full-height slide-over drawer (`rounded-none`, pure black `bg-black`, no gray sheet fills):
1. **Step 1: Account Balances Reconciliation (30s)**:
   - Displays all active accounts pre-filled with their last recorded balance.
   - User edits only the numbers that changed.
   - Displays real-time Starting Cash, Ending Cash, and Net Change ($\Delta\text{Cash}$).
2. **Step 2: Income & Instant Spend Derivation (15s)**:
   - Income input pre-filled with the previous month’s income (e.g. `50,000 EGP`).
   - Dynamic math engine computes:
     $$\text{Spend} = \text{Income} - \Delta\text{Cash}$$
   - Displays a celebratory summary card: *"You earned 50,000 EGP, saved +18,000 EGP (+36% savings rate), and spent 32,000 EGP."*
   - Immediate **"Save & Close Month"** button for users who wish to exit immediately (<45s elapsed).
3. **Step 3: Optional Expense Distribution (30s)**:
   - Checkbox: `[ ] Break down spending into categories (Optional)`.
   - If selected, shows a live **"General / Uncategorized"** remainder chip:
     - Example: Total Spend is `32,000 EGP`.
     - User inputs **Housing / Rent**: `12,000 EGP` $\rightarrow$ General remainder drops to `20,000 EGP`.
     - User inputs **Cigarettes**: `4,000 EGP` $\rightarrow$ General remainder drops to `16,000 EGP`.
     - User inputs **Food & Groceries**: `8,000 EGP` $\rightarrow$ General remainder drops to `8,000 EGP`.
   - The user never has to force numbers to zero; unallocated spend remains in General.
   - Users can add custom categories on the fly (*Gym*, *Tuition*, *Subscriptions*).

### D. Surface 3: 12-Month Net Worth & Monthly Cashflow Analytics
- Clean chart with mode toggles:
  - **Total Net Worth** (Investments + Liquid Cash over 12 months).
  - **Cash Progression** (Liquid Cash evolution over 12 months).
  - **Monthly Burn vs Savings** (Bar chart of monthly spend vs income).
- Backed by genuine historical monthly closing snapshots.

### E. Surface 4: Past Monthly Closeouts Archive
- Reverse-chronological timeline of closed months (e.g. Oct 2026, Sep 2026, Aug 2026).
- Displays Starting Cash, Income, Ending Cash, Total Spend, and Savings Rate.
- If expense categories were distributed, displays a proportional stacked color bar with hover tooltip detailing category breakdown.
- Option to edit or re-open a past check-in if adjustments are needed.

---

## 3. Database Schema & Data Models

### Existing Tables Leveraged
- **`user_bank_accounts`**:
  - Maintains `id`, `user_id`, `account_name`, `currency`, `balance`, `account_type`, `color`, `updated_at`.
- **`bank_monthly_snapshots`**:
  - Already present in schema:
    - `id`, `user_id`, `account_id`, `year_month` (YYYY-MM), `closing_balance`, `created_at`.
    - Unique index on `(account_id, year_month)`.

### New Table: `monthly_cashflow_summaries`
Stores the aggregated monthly financial closeout and optional category distribution:
```ts
export const monthlyCashflowSummaries = pgTable('monthly_cashflow_summaries', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  yearMonth: varchar('year_month', { length: 7 }).notNull(), // '2026-10'
  totalIncome: numeric('total_income', { precision: 16, scale: 2 }).default('0').notNull(),
  startingCashEgp: numeric('starting_cash_egp', { precision: 16, scale: 2 }).notNull(),
  endingCashEgp: numeric('ending_cash_egp', { precision: 16, scale: 2 }).notNull(),
  calculatedSpendEgp: numeric('calculated_spend_egp', { precision: 16, scale: 2 }).notNull(),
  savingsRatePct: numeric('savings_rate_pct', { precision: 5, scale: 2 }), // e.g. 36.00
  expenseBreakdown: jsonb('expense_breakdown').$type<Array<{ category: string; amount: number; percentage: number }>>(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userMonthUnique: unique('monthly_cashflow_user_month_unique').on(table.userId, table.yearMonth),
  userIdIdx: index('monthly_cashflow_user_id_idx').on(table.userId),
}));
```

---

## 4. Net Worth Engine Integration (`portfolio-queries.ts`)

In [`src/lib/server/portfolio-queries.ts`](file:///c:/Users/abdelrahman.mamdouh_/Desktop/Overted%20Technologies/Ticknal/src/lib/server/portfolio-queries.ts):
- Upgrade `buildCashTrend` / `getNetWorthHistory`:
  1. For each month in the 12-month window (`YYYY-MM`), query `bank_monthly_snapshots` for the user.
  2. If snapshots exist for that month, calculate the exact total closing cash:
     $$\text{Cash}_{\text{month}} = \sum (\text{closing\_balance} \times \text{FX})$$
  3. If a past month lacks snapshots, calculate backward from the earliest known snapshot using any recorded capital flows, or hold steady.
  4. Combine with the historical month-end closing price of stock holdings from `getMonthlyCloseMap`.
  5. The resulting `NetWorthHistoryPoint[]` is 100% factual and deterministic.

---

## 5. API Endpoints

1. `GET /api/banks/accounts`:
   - Returns active accounts with current balances, currency, and last updated timestamp.
2. `PATCH /api/banks/accounts/[id]/balance`:
   - Fast inline balance update for single account.
   - Updates `balance` in `user_bank_accounts` and sets `updated_at`.
3. `POST /api/banks/snapshots/closeout`:
   - Submits monthly check-in.
   - Body: `{ yearMonth, accountBalances: [{ accountId, balance }], totalIncome, expenseBreakdown }`.
   - Upserts `bank_monthly_snapshots` for each account.
   - Upserts `monthly_cashflow_summaries` for that `yearMonth`.
   - Updates `balance` on `user_bank_accounts`.
4. `GET /api/banks/snapshots/history`:
   - Returns monthly closeouts and spending archive for timeline rendering.

---

## 6. Design System & Typography Constraints

1. **Surfaces**: Pure pitch black (`#000000` / `bg-black`) and `bg-transparent`. No elevated dark grays (`zinc-900`, `#18181b`) on main containers, drawers, or cards.
2. **Drawer Geometry**: Sharp corners (`rounded-none`).
3. **Typography**: Strictly sans-serif (`font-sans`), with `tabular-nums` for all financial figures, percentages, and metrics. Zero `font-mono`.
4. **Bilingual / RTL**: Full mirror support for Arabic (`locale === 'ar'`), including slider direction, number formatting (`ar-EG`), and currency symbols (`ج.م`).
