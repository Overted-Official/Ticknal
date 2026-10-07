import { describe, expect, it } from 'vitest';

import { parseBlsCpiResponse } from './sources/bls-cpi';
import { parseCbeInflationHistoryHtml, parseCbeInflationHtml, parseCbePolicyRateHtml, parseCbeTreasuryBillHtml } from './sources/cbe-current';

describe('official macro source parsers', () => {
  it('parses monthly BLS CPI indexes and calculates YoY observations', () => {
    const data = Array.from({ length: 13 }, (_, index) => ({
      year: index < 12 ? '2025' : '2026',
      period: `M${String(index < 12 ? index + 1 : 12).padStart(2, '0')}`,
      value: String(300 + index),
      footnotes: [],
    }));
    const result = parseBlsCpiResponse({ Results: { series: [{ data }] } }, '2026-02-15T00:00:00.000Z');
    expect(result.filter((item) => item.seriesCode === 'US_CPI_INDEX')).toHaveLength(13);
    expect(result.find((item) => item.seriesCode === 'US_CPI_YOY')?.value).toBeCloseTo((312 / 311 - 1) * 100, 10);
  });

  it('parses the four CBE inflation cells and official month', () => {
    const html = '<p>Inflation for Last Month: Aug 2026</p>'
      + '<td class="table-cell">1.2%</td><td class="table-cell">0.8%</td>'
      + '<td class="table-cell">13.9%</td><td class="table-cell">11.1%</td>';
    const result = parseCbeInflationHtml(html, '2026-09-10T00:00:00.000Z');
    expect(result.map((item) => [item.seriesCode, item.value])).toEqual([
      ['EG_CPI_HEADLINE_MOM', 1.2], ['EG_CPI_HEADLINE_YOY', 13.9], ['EG_CPI_CORE_YOY', 11.1],
    ]);
  });

  it('parses historical CBE monthly inflation rows for CPI reconstruction', () => {
    const html = '<tr><td class="table-cell">Jan 2025</td><td class="table-cell">1.510%</td><td class="table-cell">1.690%</td></tr>'
      + '<tr><td class="table-cell">Feb 2025</td><td class="table-cell">1.390%</td><td class="table-cell">1.630%</td></tr>';
    const result = parseCbeInflationHistoryHtml(html, 'mm', '2026-01-01T00:00:00.000Z');
    expect(result.map((item) => [item.observationDate, item.value])).toEqual([
      ['2025-01-01', 1.51], ['2025-02-01', 1.39],
    ]);
    expect(result[0]?.publishedAt).toBe('2025-02-15T00:00:00.000Z');
  });

  it('parses labeled policy rates without relying on card order', () => {
    const html = '<div>Overnight Deposit Rate</div><strong>21.00%</strong>'
      + '<div>Overnight Lending Rate</div><strong>22.00%</strong>'
      + '<div>Main Operation Rate</div><strong>21.50%</strong>'
      + '<div>Discount Rate</div><strong>21.50%</strong><p>Effective from 12 July 2026</p>';
    const result = parseCbePolicyRateHtml(html, '2026-07-12T20:00:00.000Z');
    expect(result.map((item) => [item.seriesCode, item.value])).toEqual([
      ['CBE_OVERNIGHT_DEPOSIT_RATE', 21], ['CBE_OVERNIGHT_LENDING_RATE', 22],
      ['CBE_MAIN_OPERATION_RATE', 21.5], ['CBE_DISCOUNT_RATE', 21.5],
    ]);
  });

  it('parses treasury tenors and yields', () => {
    const html = '<tr><td>91 days</td><td>25.10%</td></tr><tr><td>182 days</td><td>26.20%</td></tr>'
      + '<tr><td>273 days</td><td>26.80%</td></tr><tr><td>364 days</td><td>27.10%</td></tr>';
    expect(parseCbeTreasuryBillHtml(html, '2026-10-01T00:00:00.000Z').map((item) => item.value))
      .toEqual([25.1, 26.2, 26.8, 27.1]);
  });
});
