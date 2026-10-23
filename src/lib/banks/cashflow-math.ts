export interface MonthlySpendAndSavingsRate {
  deltaCash: number;
  spend: number;
  savingsRatePct: number;
}

export interface ExpenseAllocationResultItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface CategoryAllocationResult {
  allocatedTotal: number;
  remainder: number;
  isOverallocated: boolean;
  items: ExpenseAllocationResultItem[];
}

/**
 * Calculates net spend and savings rate using the top-down formula:
 * Delta Cash = Ending Cash - Starting Cash
 * Spend = Income - Delta Cash
 * Savings Rate (%) = ((Income - Spend) / Income) * 100% = (Delta Cash / Income) * 100%
 */
export function calculateMonthlySpendAndSavingsRate(
  startingCash: number,
  endingCash: number,
  income: number
): MonthlySpendAndSavingsRate {
  const deltaCash = Number(endingCash) - Number(startingCash);
  const inc = Math.max(0, Number(income));
  const rawSpend = inc - deltaCash;
  const spend = Math.max(0, rawSpend);

  let savingsRatePct = 0;
  if (inc > 0) {
    const rawRate = (deltaCash / inc) * 100;
    savingsRatePct = Number(rawRate.toFixed(2));
  }

  return {
    deltaCash,
    spend,
    savingsRatePct,
  };
}

/**
 * Computes expense category distribution with an auto-balancing General remainder.
 */
export function computeCategoryAllocation(
  totalSpend: number,
  categories: Array<{ category: string; amount: number }>
): CategoryAllocationResult {
  const spend = Math.max(0, Number(totalSpend));
  let allocatedTotal = 0;

  const sanitizedCategories = (categories || []).map((cat) => {
    const amt = Math.max(0, Number(cat.amount) || 0);
    allocatedTotal += amt;
    return {
      category: cat.category.trim() || 'Custom',
      amount: amt,
      percentage: spend > 0 ? Number(((amt / spend) * 100).toFixed(1)) : 0,
    };
  });

  const isOverallocated = allocatedTotal > spend;
  const rawRemainder = spend - allocatedTotal;
  const remainder = isOverallocated ? 0 : Math.max(0, rawRemainder);

  const items: ExpenseAllocationResultItem[] = [...sanitizedCategories];
  if (remainder > 0 || items.length === 0) {
    items.push({
      category: 'General',
      amount: remainder,
      percentage: spend > 0 ? Number(((remainder / spend) * 100).toFixed(1)) : 0,
    });
  }

  return {
    allocatedTotal,
    remainder,
    isOverallocated,
    items,
  };
}
