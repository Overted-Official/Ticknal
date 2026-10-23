import type { AltmanZone, PiotroskiRating } from './types';

/**
 * Formats large financial figures into smart compact human-readable representation
 * (Trillions, Billions, Millions, Thousands) while preserving negative signs and currency.
 *
 * e.g. 230151557000, 'EGP' -> '230.15B EGP'
 *      48200000, 'EGP'     -> '48.20M EGP'
 *      -5200000000, 'EGP'  -> '-5.20B EGP'
 *      null, 'EGP'         -> '—'
 */
export function formatSmartCompact(
  val: number | null | undefined,
  currency?: string
): string {
  if (val == null || Number.isNaN(val)) {
    return '—';
  }

  const abs = Math.abs(val);
  let formattedNumber: string;

  if (abs >= 1e12) {
    formattedNumber = `${(val / 1e12).toFixed(2)}T`;
  } else if (abs >= 1e9) {
    formattedNumber = `${(val / 1e9).toFixed(2)}B`;
  } else if (abs >= 1e6) {
    formattedNumber = `${(val / 1e6).toFixed(2)}M`;
  } else if (abs >= 1e3) {
    formattedNumber = `${(val / 1e3).toFixed(2)}K`;
  } else {
    formattedNumber = val.toFixed(2);
  }

  const cleanCurrency = currency?.trim();
  return cleanCurrency ? `${formattedNumber} ${cleanCurrency}` : formattedNumber;
}

/**
 * Formats unrounded numbers with locale thousands comma separators.
 *
 * e.g. 230151557000, 'EGP' -> '230,151,557,000 EGP'
 *      1234.56, 'EGP'      -> '1,234.56 EGP'
 *      null                -> '—'
 */
export function formatExactRaw(
  val: number | null | undefined,
  currency?: string
): string {
  if (val == null || Number.isNaN(val)) {
    return '—';
  }

  const formattedNumber = val.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
  const cleanCurrency = currency?.trim();
  return cleanCurrency ? `${formattedNumber} ${cleanCurrency}` : formattedNumber;
}

/**
 * Formats a ratio / rate into a clean percentage string.
 *
 * e.g. 14.23 -> '14.2%'
 *      null  -> '—'
 */
export function formatPercent(
  val: number | null | undefined,
  decimals = 1
): string {
  if (val == null || Number.isNaN(val)) {
    return '—';
  }
  return `${val.toFixed(decimals)}%`;
}

/**
 * Formats financial multiples (P/E, P/B, EV/EBITDA).
 * Normalizes negative and zero multiples to 'N/A' (e.g. loss-making quarters).
 *
 * e.g. 6.01 -> '6.0x'
 *      -4.5 -> 'N/A'
 *      null -> 'N/A'
 */
export function formatMultiple(
  val: number | null | undefined,
  suffix = 'x'
): string {
  if (val == null || Number.isNaN(val) || val <= 0) {
    return 'N/A';
  }
  return `${val.toFixed(1)}${suffix}`;
}

/**
 * Calculates Year-over-Year (YoY) percentage change between current and prior period.
 * Returns null if prior is 0 or either value is absent/NaN.
 *
 * e.g. 120, 100 -> { label: '+20.0%', positive: true, neutral: false }
 *      80, 100  -> { label: '-20.0%', positive: false, neutral: false }
 *      100, 0   -> null
 */
export function formatYoYDelta(
  current: number | null | undefined,
  prior: number | null | undefined
): { label: string; positive: boolean; neutral: boolean } | null {
  if (
    current == null ||
    Number.isNaN(current) ||
    prior == null ||
    Number.isNaN(prior) ||
    prior === 0
  ) {
    return null;
  }

  const delta = ((current - prior) / Math.abs(prior)) * 100;
  const absDelta = Math.abs(delta);
  const neutral = absDelta < 0.05;
  const positive = delta > 0;
  const sign = delta >= 0 ? '+' : '';
  const label = `${sign}${delta.toFixed(1)}%`;

  return {
    label,
    positive,
    neutral,
  };
}

/**
 * Classifies Emerging Markets Altman Z''-Score into institutional solvency risk zones.
 * Safe (> 2.6), Grey (1.1 - 2.6), Distress (< 1.1).
 */
export function getAltmanZone(score: number | null | undefined): {
  zone: AltmanZone;
  label: string;
  statusClass: string;
  desc: string;
} {
  if (score == null || Number.isNaN(score)) {
    return {
      zone: 'grey',
      label: 'Unrated',
      statusClass: 'text-plt-muted bg-plt-card border-plt-border-soft',
      desc: 'Insufficient statement data to calculate Altman Z-Score',
    };
  }

  if (score > 2.6) {
    return {
      zone: 'safe',
      label: 'Safe Zone',
      statusClass: 'text-plt-profit bg-plt-profit-soft border-plt-profit-border',
      desc: 'Low probability of financial distress / insolvency',
    };
  }

  if (score >= 1.1) {
    return {
      zone: 'grey',
      label: 'Grey Zone',
      statusClass: 'text-plt-warning bg-plt-warning-soft border-plt-warning-border',
      desc: 'Moderate financial risk / Caution advised',
    };
  }

  return {
    zone: 'distress',
    label: 'Distress Zone',
    statusClass: 'text-plt-risk bg-plt-risk-soft border-plt-risk-border',
    desc: 'High financial risk / Elevated default probability',
  };
}

/**
 * Categorizes Piotroski F-Score (0 to 9) into fundamental quality tiers.
 * High (8-9), Stable (5-7), Weak (0-4).
 */
export function getPiotroskiRating(score: number | null | undefined): {
  rating: PiotroskiRating;
  label: string;
  statusClass: string;
} {
  if (score == null || Number.isNaN(score)) {
    return {
      rating: 'weak',
      label: 'Unrated',
      statusClass: 'text-plt-muted bg-plt-card border-plt-border-soft',
    };
  }

  if (score >= 8) {
    return {
      rating: 'high',
      label: 'High Quality',
      statusClass: 'text-plt-profit bg-plt-profit-soft border-plt-profit-border',
    };
  }

  if (score >= 5) {
    return {
      rating: 'stable',
      label: 'Stable',
      statusClass: 'text-plt-warning bg-plt-warning-soft border-plt-warning-border',
    };
  }

  return {
    rating: 'weak',
    label: 'Weak',
    statusClass: 'text-plt-risk bg-plt-risk-soft border-plt-risk-border',
  };
}
