import assert from 'node:assert';
import {
  formatSmartCompact,
  formatExactRaw,
  formatPercent,
  formatMultiple,
  formatYoYDelta,
  getAltmanZone,
  getPiotroskiRating,
} from './formatters';

// Dual runner: runs under Vitest if in Vitest, or executes standalone with node:assert under tsx.
interface TestItem {
  name: string;
  fn: () => void | Promise<void>;
}
interface SuiteItem {
  name: string;
  tests: TestItem[];
}

const isVitest =
  typeof (globalThis as any).describe === 'function' &&
  typeof (globalThis as any).it === 'function';

const standaloneSuites: SuiteItem[] = [];
let activeSuite: SuiteItem = { name: 'Root', tests: [] };
standaloneSuites.push(activeSuite);

const describe = isVitest
  ? (globalThis as any).describe
  : (name: string, fn: () => void) => {
      const prev = activeSuite;
      const suite: SuiteItem = { name, tests: [] };
      standaloneSuites.push(suite);
      activeSuite = suite;
      fn();
      activeSuite = prev;
    };

const it = isVitest
  ? (globalThis as any).it
  : (name: string, fn: () => void | Promise<void>) => {
      activeSuite.tests.push({ name, fn });
    };

// =========================================================================
// 1. Smart Compact Formatting Tests
// =========================================================================
describe('formatSmartCompact', () => {
  it('formats trillions, billions, millions, and thousands with currency', () => {
    assert.strictEqual(formatSmartCompact(1.5e12, 'EGP'), '1.50T EGP');
    assert.strictEqual(formatSmartCompact(230151557000, 'EGP'), '230.15B EGP');
    assert.strictEqual(formatSmartCompact(48200000, 'EGP'), '48.20M EGP');
    assert.strictEqual(formatSmartCompact(250000, 'EGP'), '250.00K EGP');
    assert.strictEqual(formatSmartCompact(123.456, 'EGP'), '123.46 EGP');
  });

  it('formats numbers without currency when currency parameter is omitted or empty', () => {
    assert.strictEqual(formatSmartCompact(230151557000), '230.15B');
    assert.strictEqual(formatSmartCompact(48200000, ''), '48.20M');
    assert.strictEqual(formatSmartCompact(125.5), '125.50');
  });

  it('correctly handles negative values preserving negative sign', () => {
    assert.strictEqual(formatSmartCompact(-5200000000, 'EGP'), '-5.20B EGP');
    assert.strictEqual(formatSmartCompact(-1500000, 'USD'), '-1.50M USD');
    assert.strictEqual(formatSmartCompact(-45000), '-45.00K');
    assert.strictEqual(formatSmartCompact(-12.5, 'EGP'), '-12.50 EGP');
  });

  it('handles zero correctly', () => {
    assert.strictEqual(formatSmartCompact(0, 'EGP'), '0.00 EGP');
    assert.strictEqual(formatSmartCompact(0), '0.00');
  });

  it('handles null, undefined, and NaN gracefully by returning em-dash', () => {
    assert.strictEqual(formatSmartCompact(null), '—');
    assert.strictEqual(formatSmartCompact(undefined, 'EGP'), '—');
    assert.strictEqual(formatSmartCompact(Number.NaN, 'EGP'), '—');
  });
});

// =========================================================================
// 2. Exact Raw Formatting Tests
// =========================================================================
describe('formatExactRaw', () => {
  it('formats large numbers with locale comma separators and currency', () => {
    assert.strictEqual(formatExactRaw(230151557000, 'EGP'), '230,151,557,000 EGP');
    assert.strictEqual(formatExactRaw(1250000, 'USD'), '1,250,000 USD');
  });

  it('formats numbers without currency when currency parameter is omitted', () => {
    assert.strictEqual(formatExactRaw(230151557000), '230,151,557,000');
  });

  it('formats decimal numbers properly', () => {
    assert.strictEqual(formatExactRaw(1234.56, 'EGP'), '1,234.56 EGP');
  });

  it('preserves negative values', () => {
    assert.strictEqual(formatExactRaw(-5420000, 'EGP'), '-5,420,000 EGP');
  });

  it('formats zero correctly', () => {
    assert.strictEqual(formatExactRaw(0, 'EGP'), '0 EGP');
    assert.strictEqual(formatExactRaw(0), '0');
  });

  it('returns em-dash for null, undefined, and NaN', () => {
    assert.strictEqual(formatExactRaw(null), '—');
    assert.strictEqual(formatExactRaw(undefined), '—');
    assert.strictEqual(formatExactRaw(Number.NaN), '—');
  });
});

// =========================================================================
// 3. Percentage Formatting Tests
// =========================================================================
describe('formatPercent', () => {
  it('formats numbers to single decimal percentage by default', () => {
    assert.strictEqual(formatPercent(14.23), '14.2%');
    assert.strictEqual(formatPercent(34.88), '34.9%');
    assert.strictEqual(formatPercent(-5.42), '-5.4%');
  });

  it('respects custom decimal places', () => {
    assert.strictEqual(formatPercent(14.236, 2), '14.24%');
    assert.strictEqual(formatPercent(14.2, 0), '14%');
  });

  it('formats zero correctly', () => {
    assert.strictEqual(formatPercent(0), '0.0%');
    assert.strictEqual(formatPercent(0, 2), '0.00%');
  });

  it('returns em-dash for null, undefined, and NaN', () => {
    assert.strictEqual(formatPercent(null), '—');
    assert.strictEqual(formatPercent(undefined), '—');
    assert.strictEqual(formatPercent(Number.NaN), '—');
  });
});

// =========================================================================
// 4. Multiple Formatting Tests (Valuation P/E, P/B, EV/EBITDA)
// =========================================================================
describe('formatMultiple', () => {
  it('formats positive numbers with "x" suffix', () => {
    assert.strictEqual(formatMultiple(6.01), '6.0x');
    assert.strictEqual(formatMultiple(11.24), '11.2x');
    assert.strictEqual(formatMultiple(1.83), '1.8x');
  });

  it('returns "N/A" for negative or zero multiples (loss-making P/E normalization)', () => {
    assert.strictEqual(formatMultiple(-4.5), 'N/A');
    assert.strictEqual(formatMultiple(0), 'N/A');
  });

  it('returns "N/A" for null, undefined, or NaN multiples', () => {
    assert.strictEqual(formatMultiple(null), 'N/A');
    assert.strictEqual(formatMultiple(undefined), 'N/A');
    assert.strictEqual(formatMultiple(Number.NaN), 'N/A');
  });

  it('allows custom suffix', () => {
    assert.strictEqual(formatMultiple(3.5, ' times'), '3.5 times');
  });
});

// =========================================================================
// 5. YoY Delta Calculation Tests
// =========================================================================
describe('formatYoYDelta', () => {
  it('calculates positive growth with positive flag and sign prefix', () => {
    const res = formatYoYDelta(120, 100);
    assert.ok(res !== null);
    assert.strictEqual(res.label, '+20.0%');
    assert.strictEqual(res.positive, true);
    assert.strictEqual(res.neutral, false);
  });

  it('calculates contraction with negative flag', () => {
    const res = formatYoYDelta(80, 100);
    assert.ok(res !== null);
    assert.strictEqual(res.label, '-20.0%');
    assert.strictEqual(res.positive, false);
    assert.strictEqual(res.neutral, false);
  });

  it('handles unchanged or near-zero delta as neutral', () => {
    const resExact = formatYoYDelta(100, 100);
    assert.ok(resExact !== null);
    assert.strictEqual(resExact.label, '+0.0%');
    assert.strictEqual(resExact.positive, false);
    assert.strictEqual(resExact.neutral, true);

    const resNear = formatYoYDelta(100.02, 100);
    assert.ok(resNear !== null);
    assert.strictEqual(resNear.neutral, true);
  });

  it('handles negative base (turnaround/improvement from negative prior)', () => {
    const res = formatYoYDelta(-50, -100);
    assert.ok(res !== null);
    assert.strictEqual(res.label, '+50.0%');
    assert.strictEqual(res.positive, true);
  });

  it('returns null if prior is zero, null, undefined, or NaN', () => {
    assert.strictEqual(formatYoYDelta(100, 0), null);
    assert.strictEqual(formatYoYDelta(100, null), null);
    assert.strictEqual(formatYoYDelta(100, undefined), null);
    assert.strictEqual(formatYoYDelta(100, Number.NaN), null);
  });

  it('returns null if current is null, undefined, or NaN', () => {
    assert.strictEqual(formatYoYDelta(null, 100), null);
    assert.strictEqual(formatYoYDelta(undefined, 100), null);
    assert.strictEqual(formatYoYDelta(Number.NaN, 100), null);
  });
});

// =========================================================================
// 6. Altman Z-Score Zone Classification Tests
// =========================================================================
describe('getAltmanZone', () => {
  it('classifies score > 2.6 as Safe Zone', () => {
    const safe = getAltmanZone(3.5);
    assert.strictEqual(safe.zone, 'safe');
    assert.strictEqual(safe.label, 'Safe Zone');
    assert.strictEqual(
      safe.statusClass,
      'text-plt-profit bg-plt-profit-soft border-plt-profit-border'
    );
  });

  it('classifies score between 1.1 and 2.6 inclusive as Grey Zone', () => {
    const greyHigh = getAltmanZone(2.6);
    assert.strictEqual(greyHigh.zone, 'grey');
    assert.strictEqual(greyHigh.label, 'Grey Zone');
    assert.strictEqual(
      greyHigh.statusClass,
      'text-plt-warning bg-plt-warning-soft border-plt-warning-border'
    );

    const greyLow = getAltmanZone(1.1);
    assert.strictEqual(greyLow.zone, 'grey');
    assert.strictEqual(greyLow.label, 'Grey Zone');
  });

  it('classifies score < 1.1 as Distress Zone', () => {
    const distress = getAltmanZone(0.95);
    assert.strictEqual(distress.zone, 'distress');
    assert.strictEqual(distress.label, 'Distress Zone');
    assert.strictEqual(
      distress.statusClass,
      'text-plt-risk bg-plt-risk-soft border-plt-risk-border'
    );
  });

  it('classifies null, undefined, and NaN as Unrated Grey Zone', () => {
    const unrated = getAltmanZone(null);
    assert.strictEqual(unrated.zone, 'grey');
    assert.strictEqual(unrated.label, 'Unrated');
    assert.strictEqual(
      unrated.statusClass,
      'text-plt-muted bg-plt-card border-plt-border-soft'
    );

    assert.strictEqual(getAltmanZone(undefined).label, 'Unrated');
    assert.strictEqual(getAltmanZone(Number.NaN).label, 'Unrated');
  });
});

// =========================================================================
// 7. Piotroski F-Score Rating Tests
// =========================================================================
describe('getPiotroskiRating', () => {
  it('rates scores 8 and 9 as High Quality', () => {
    const high9 = getPiotroskiRating(9);
    assert.strictEqual(high9.rating, 'high');
    assert.strictEqual(high9.label, 'High Quality');
    assert.strictEqual(
      high9.statusClass,
      'text-plt-profit bg-plt-profit-soft border-plt-profit-border'
    );

    const high8 = getPiotroskiRating(8);
    assert.strictEqual(high8.rating, 'high');
  });

  it('rates scores 5 to 7 as Stable', () => {
    const stable7 = getPiotroskiRating(7);
    assert.strictEqual(stable7.rating, 'stable');
    assert.strictEqual(stable7.label, 'Stable');
    assert.strictEqual(
      stable7.statusClass,
      'text-plt-warning bg-plt-warning-soft border-plt-warning-border'
    );

    const stable5 = getPiotroskiRating(5);
    assert.strictEqual(stable5.rating, 'stable');
  });

  it('rates scores 0 to 4 as Weak', () => {
    const weak4 = getPiotroskiRating(4);
    assert.strictEqual(weak4.rating, 'weak');
    assert.strictEqual(weak4.label, 'Weak');
    assert.strictEqual(
      weak4.statusClass,
      'text-plt-risk bg-plt-risk-soft border-plt-risk-border'
    );

    const weak0 = getPiotroskiRating(0);
    assert.strictEqual(weak0.rating, 'weak');
  });

  it('rates null, undefined, and NaN as Unrated', () => {
    const unrated = getPiotroskiRating(null);
    assert.strictEqual(unrated.rating, 'weak');
    assert.strictEqual(unrated.label, 'Unrated');
    assert.strictEqual(
      unrated.statusClass,
      'text-plt-muted bg-plt-card border-plt-border-soft'
    );

    assert.strictEqual(getPiotroskiRating(undefined).label, 'Unrated');
    assert.strictEqual(getPiotroskiRating(Number.NaN).label, 'Unrated');
  });
});

// =========================================================================
// Standalone runner execution for tsx
// =========================================================================
if (!isVitest) {
  (async () => {
    let total = 0;
    let passed = 0;
    console.log('\n================ FINANCIALS FORMATTERS TEST SUITE ================');
    for (const s of standaloneSuites) {
      if (s.tests.length === 0) continue;
      console.log(`\n[Suite] ${s.name}`);
      for (const t of s.tests) {
        total++;
        try {
          await t.fn();
          console.log(`  ✓ ${t.name}`);
          passed++;
        } catch (err: any) {
          console.error(`  ✗ ${t.name}`);
          console.error(`    ${err.stack || err.message}`);
          throw err;
        }
      }
    }
    console.log(
      `\n================ ALL ${passed}/${total} TESTS PASSED =================\n`
    );
  })().catch((err) => {
    console.error('\nTest Suite Failed:', err.message);
    process.exit(1);
  });
}
