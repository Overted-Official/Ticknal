import { describe, it, expect } from 'vitest';
import {
  ORDERED_BRACKETS,
  AVAILABLE_YEARS,
  AVAILABLE_COHORTS,
  POVERTY_BRACKETS,
  LOW_CLASS_BRACKETS,
  MIDDLE_CLASS_BRACKETS,
  AFFLUENT_BRACKETS,
  getIncomeDistributionForYearAndCohort,
  getMacroKPIs,
  getGrossIncomeLifecycleSeries,
} from './income-distribution-types';

describe('Income Distribution Types & Helpers', () => {
  it('loads 21 brackets, 21 years, and 12 cohorts correctly', () => {
    expect(ORDERED_BRACKETS).toHaveLength(21);
    expect(AVAILABLE_YEARS).toHaveLength(21);
    expect(AVAILABLE_COHORTS).toHaveLength(12);
    expect(ORDERED_BRACKETS[0]).toBe('0-500');
    expect(ORDERED_BRACKETS[20]).toBe('250,001+');
    expect(POVERTY_BRACKETS.length + LOW_CLASS_BRACKETS.length + MIDDLE_CLASS_BRACKETS.length + AFFLUENT_BRACKETS.length).toBe(21);
  });

  it('calculates 2026 macro KPIs with sparklines in annual and monthly modes', () => {
    const kpisUsd = getMacroKPIs('2026', 'Total', 'USD', 'annual');
    expect(kpisUsd.totalPopulation).toBeGreaterThan(70000000);
    expect(kpisUsd.totalPopulationFmt).toBe('74.3M');
    expect(kpisUsd.peakCohort).toBe('40-44');
    expect(kpisUsd.peakGrossIncomeValue).toBe(5014);
    expect(kpisUsd.povertyPercent).toBeCloseTo(31.6, 0.5);
    expect(kpisUsd.lowClassPercent).toBeCloseTo(34.9, 0.5);
    expect(kpisUsd.middleClassPercent).toBeCloseTo(32.3, 0.5);
    expect(kpisUsd.affluentPercent).toBeCloseTo(1.2, 0.5);
    expect(kpisUsd.modalBracket).toBe('3,501-5,000');
    expect(kpisUsd.workingPopSparkline).toHaveLength(21);
    expect(kpisUsd.povertySparkline).toHaveLength(21);
    expect(kpisUsd.lowClassSparkline).toHaveLength(21);
    expect(kpisUsd.middleClassSparkline).toHaveLength(21);
    expect(kpisUsd.affluentSparkline).toHaveLength(21);
    expect(kpisUsd.modalSparkline).toHaveLength(21);

    const kpisMonthly = getMacroKPIs('2026', 'Total', 'USD', 'monthly');
    expect(kpisMonthly.peakGrossIncomeValue).toBe(Math.round(5014 / 12));
    expect(kpisMonthly.peakGrossIncomeFmt).toContain('/ mo');
    expect(kpisMonthly.povertySalaryRangeEn).toContain('/ mo');

    const kpisEgp = getMacroKPIs('2026', 'Total', 'EGP', 'annual');
    expect(kpisEgp.peakGrossIncomeValue).toBe(250690);
    expect(kpisEgp.povertySalaryRangeEn).toContain('EGP');
  });

  it('updates KPIs dynamically when cohort is selected', () => {
    const kpis25 = getMacroKPIs('2026', '25-29', 'USD', 'annual');
    expect(kpis25.totalPopulation).toBeLessThan(10000000);
    expect(kpis25.modalBracket).toBe('5,001-7,500');
    expect(kpis25.cohort).toBe('25-29');
  });

  it('retrieves distribution items sorted strictly ascending', () => {
    const items = getIncomeDistributionForYearAndCohort('2026', 'Total', 'USD', 'annual');
    expect(items).toHaveLength(21);
    expect(items[0].bracket).toBe('0-500');
    expect(items[20].bracket).toBe('250,001+');

    const peakBracket = items.find((i) => i.bracket === '3,501-5,000');
    expect(peakBracket).toBeDefined();
    expect(peakBracket?.isPeak).toBe(true);
  });

  it('formats monthly brackets properly', () => {
    const monthlyItems = getIncomeDistributionForYearAndCohort('2026', 'Total', 'USD', 'monthly');
    expect(monthlyItems[0].labelEn).toContain('/ mo');
    expect(monthlyItems[0].labelEn).toContain('41.7');
  });

  it('generates gross income series for all years in monthly mode', () => {
    const series = getGrossIncomeLifecycleSeries('USD', 'monthly');
    expect(series).toHaveLength(21);
    expect(series[0].year).toBe('2009');
    expect(series[20].year).toBe('2029');
    expect(series[0]['40-44']).toBe(Math.round(4193 / 12));
  });
});
