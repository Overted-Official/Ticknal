/**
 * Centralized Category Color Definitions for Transactions & Breakdown Charts.
 *
 * Ensures 100% visual alignment between the Donut Breakdown Chart and the
 * Activity Ledger row badges.
 */

export const TRANSACTION_CATEGORY_COLORS: Record<string, string> = {
  // Outflows
  'Food & Groceries': '#06b6d4',
  'Smoking': '#3b82f6',
  'Living & Bills': '#8b5cf6',
  'Housing & Rent': '#a855f7',
  'Entertainment': '#ec4899',
  'Transport': '#f59e0b',
  'Healthcare': '#10b981',
  'Subscriptions': '#6366f1',
  'Shopping': '#f43f5e',
  'Investments': '#eab308',
  'Trading Injection': '#d97706',
  // Inflows
  'Salary & Income': '#10b981',
  'Interest & Yield': '#14b8a6',
  'Trading Withdrawal': '#22c55e',
  'Deposit': '#34d399',
  // Special transaction kinds
  'Trading': '#2962ff',
  'Internal Transfer': '#38bdf8',
  'Transfer': '#38bdf8',
  'General': '#71717a',
  'Other': '#71717a',
};

/**
 * Returns the hex color corresponding to a given transaction category.
 * Performs direct lookup, case-insensitive match, and keyword fallback.
 */
export function getCategoryColor(category?: string | null): string {
  if (!category) return '#71717a';

  if (TRANSACTION_CATEGORY_COLORS[category]) {
    return TRANSACTION_CATEGORY_COLORS[category];
  }

  const catLower = category.toLowerCase().trim();
  for (const [key, val] of Object.entries(TRANSACTION_CATEGORY_COLORS)) {
    if (key.toLowerCase() === catLower) return val;
  }

  // Keyword-based fallbacks for dynamic or custom user categories
  if (catLower.includes('invest')) return '#eab308';
  if (catLower.includes('food') || catLower.includes('grocer') || catLower.includes('dine')) return '#06b6d4';
  if (catLower.includes('smok') || catLower.includes('vape')) return '#3b82f6';
  if (catLower.includes('subscri') || catLower.includes('software')) return '#6366f1';
  if (catLower.includes('health') || catLower.includes('med') || catLower.includes('pharma')) return '#10b981';
  if (catLower.includes('living') || catLower.includes('bill') || catLower.includes('util')) return '#8b5cf6';
  if (catLower.includes('rent') || catLower.includes('hous')) return '#a855f7';
  if (catLower.includes('entertain') || catLower.includes('game') || catLower.includes('movie')) return '#ec4899';
  if (catLower.includes('transp') || catLower.includes('uber') || catLower.includes('gas') || catLower.includes('fuel')) return '#f59e0b';
  if (catLower.includes('shop') || catLower.includes('cloth')) return '#f43f5e';
  if (catLower.includes('trade') || catLower.includes('trading') || catLower.includes('broker')) return '#2962ff';
  if (catLower.includes('transfer')) return '#38bdf8';
  if (catLower.includes('salary') || catLower.includes('income')) return '#10b981';
  if (catLower.includes('interest') || catLower.includes('yield')) return '#14b8a6';
  if (catLower.includes('deposit')) return '#34d399';

  return '#71717a';
}

/**
 * Returns dynamic CSS style object for inline badges.
 * Generates color, transparent background tint, and subtle border.
 */
export function getCategoryBadgeStyle(category?: string | null): React.CSSProperties {
  const color = getCategoryColor(category);
  return {
    color: color,
    backgroundColor: `${color}18`, // ~10% opacity hex
    borderColor: `${color}35`,     // ~20% opacity hex
  };
}
