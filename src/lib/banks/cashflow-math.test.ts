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

  it('handles zero spend / income equal to delta', () => {
    const res = calculateMonthlySpendAndSavingsRate(100000, 150000, 50000);
    expect(res.spend).toBe(0);
    expect(res.savingsRatePct).toBe(100);
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
