import * as fs from 'fs';
import * as path from 'path';

export interface TurboOpenPosition {
  symbol: string;
  companyName: string;
  sector: string;
  logoUrl?: string | null;
  champion: 'typhon' | 'cerberus' | 'hydra';
  entryDate: string;
  entryPrice: number;
  lastPrice: number;
  shares: number;
  cost: number;
  currentValue: number;
  unrealizedPnlPct: number;
}

export interface TurboClosedTrade {
  sym: string;
  name: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  cost: number;
  proceeds: number;
  retPct: number;
  champion: 'typhon' | 'cerberus' | 'hydra';
}

export interface TurboPortfolioData {
  slots: number;
  startingCapital: number;
  finalNav: number;
  roiPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
  closedTradesCount: number;
  totalTradesCount?: number;
  maxAdverseExcursionPct?: number;
  averageAdverseExcursionPct?: number;
  totalSlots: number;
  activeSlots: number;
  cash: number;
  openPositions: TurboOpenPosition[];
  closedTrades: TurboClosedTrade[];
  navSeries: Array<{ date: string; nav: number }>;
}

export interface TurboSnapshot {
  updatedAt: string;
  simulationWindow: {
    startDate: string;
    endDate: string;
    totalMonths: number;
    warmUpPeriod: string;
  };
  benchmark: {
    name: string;
    roiPct: number;
    maxDrawdownPct: number;
  };
  defaultSlots: number;
  qualifiedTickers: string[];
  tickerLogos?: Record<string, string>;
  tickerNames?: Record<string, string>;
  portfolios: {
    slots16: TurboPortfolioData;
    slots10: TurboPortfolioData;
  };
}

let cachedSnapshot: TurboSnapshot | null = null;
let cachedMtime: number = 0;

function loadSnapshot(): TurboSnapshot | null {
  try {
    const filePath = path.resolve(process.cwd(), 'src', 'lib', 'finance', 'turbo-snapshot.json');
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (cachedSnapshot && stats.mtimeMs === cachedMtime) {
        return cachedSnapshot;
      }
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      cachedSnapshot = data;
      cachedMtime = stats.mtimeMs;
      return cachedSnapshot;
    }
  } catch (err) {
    console.warn('[turbo-engine] Failed to read turbo-snapshot.json:', err);
  }
  return cachedSnapshot;
}

/**
 * Returns the full Turbo Portfolio snapshot data.
 */
export function getTurboSnapshot(): TurboSnapshot | null {
  return loadSnapshot();
}

/**
 * Checks whether a given ticker is qualified in the active Ticknal Turbo basket.
 */
export function isTurboQualified(symbol: string): boolean {
  const snapshot = loadSnapshot();
  if (!snapshot || !Array.isArray(snapshot.qualifiedTickers)) return false;
  const clean = symbol.replace(/\.CA$/i, '').trim().toUpperCase();
  return snapshot.qualifiedTickers.includes(clean);
}

/**
 * Returns the list of clean symbols qualified in the Turbo basket.
 */
export function getTurboQualifiedSymbols(): string[] {
  const snapshot = loadSnapshot();
  return snapshot?.qualifiedTickers || [];
}
