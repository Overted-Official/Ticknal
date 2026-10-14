import { describe, it, expect } from 'vitest';
import {
  parseTradingViewScannerItem,
  mapTradingViewSector,
  computeMissingTickers,
  computeDelistedTickers,
  computeReactivatedTickers,
  type ScannedEGXTicker,
} from './egx-ticker-sync';

describe('egx-ticker-sync', () => {
  describe('mapTradingViewSector', () => {
    it('maps TradingView sectors to canonical Ticknal GICS sectors', () => {
      expect(mapTradingViewSector('Finance')).toBe('Financials');
      expect(mapTradingViewSector('Health Technology')).toBe('Health Care');
      expect(mapTradingViewSector('Health Services')).toBe('Health Care');
      expect(mapTradingViewSector('Technology Services')).toBe('Information Technology');
      expect(mapTradingViewSector('Electronic Technology')).toBe('Information Technology');
      expect(mapTradingViewSector('Communications')).toBe('Communication Services');
      expect(mapTradingViewSector('Consumer Non-Durables')).toBe('Consumer Staples');
      expect(mapTradingViewSector('Consumer Durables')).toBe('Consumer Discretionary');
      expect(mapTradingViewSector('Consumer Services')).toBe('Consumer Discretionary');
      expect(mapTradingViewSector('Transportation')).toBe('Industrials');
      expect(mapTradingViewSector('Utilities')).toBe('Utilities');
      expect(mapTradingViewSector('Energy Minerals')).toBe('Energy');
    });

    it('falls back gracefully for unknown or undefined sectors', () => {
      expect(mapTradingViewSector(null)).toBe('Industrials');
      expect(mapTradingViewSector('Unknown Sector')).toBe('Unknown Sector');
    });
  });

  describe('parseTradingViewScannerItem', () => {
    it('correctly parses standard EGX stock with logoid', () => {
      const raw = {
        s: 'EGX:MNTH',
        d: [
          'MNTH',
          'MNT-Halan Microfinance & Tech',
          'Finance',
          'Financial Technology',
          'EGP',
          'mnt-halan-logo',
        ],
      };

      const parsed = parseTradingViewScannerItem(raw);
      expect(parsed).toEqual({
        symbol: 'MNTH',
        companyName: 'MNT-Halan Microfinance & Tech',
        exchange: 'EGX',
        sector: 'Financials',
        industry: 'Financial Technology',
        currency: 'EGP',
        logoUrl: 'https://s3-symbol-logo.tradingview.com/mnt-halan-logo.svg',
      });
    });

    it('handles item without logoid or missing currency', () => {
      const raw = {
        s: 'EGX:NEWCO',
        d: [
          'NEWCO',
          'New Listing Co.',
          'Technology Services',
          'Software',
          null,
          null,
        ],
      };

      const parsed = parseTradingViewScannerItem(raw);
      expect(parsed).toEqual({
        symbol: 'NEWCO',
        companyName: 'New Listing Co.',
        exchange: 'EGX',
        sector: 'Information Technology',
        industry: 'Software',
        currency: 'EGP',
        logoUrl: null,
      });
    });

    it('strips EGX: prefix if symbol has it', () => {
      const raw = {
        s: 'EGX:COMI',
        d: ['EGX:COMI', 'Commercial International Bank', 'Finance', 'Banks', 'EGP', null],
      };

      const parsed = parseTradingViewScannerItem(raw);
      expect(parsed?.symbol).toBe('COMI');
    });
  });

  describe('computeMissingTickers', () => {
    it('identifies new tickers not present in existing DB list', () => {
      const scanned: ScannedEGXTicker[] = [
        { symbol: 'COMI', companyName: 'CIB', exchange: 'EGX', sector: 'Financials', industry: 'Banks', currency: 'EGP', logoUrl: null },
        { symbol: 'MNTH', companyName: 'MNT-Halan', exchange: 'EGX', sector: 'Financials', industry: 'Fintech', currency: 'EGP', logoUrl: null },
        { symbol: 'FWRY', companyName: 'Fawry', exchange: 'EGX', sector: 'Financials', industry: 'Fintech', currency: 'EGP', logoUrl: null },
      ];

      const existingSymbols = new Set(['COMI', 'FWRY']);

      const missing = computeMissingTickers(scanned, existingSymbols);
      expect(missing).toHaveLength(1);
      expect(missing[0].symbol).toBe('MNTH');
    });

    it('returns empty array when all tickers already exist', () => {
      const scanned: ScannedEGXTicker[] = [
        { symbol: 'COMI', companyName: 'CIB', exchange: 'EGX', sector: 'Financials', industry: 'Banks', currency: 'EGP', logoUrl: null },
      ];

      const existingSymbols = new Set(['COMI']);
      expect(computeMissingTickers(scanned, existingSymbols)).toHaveLength(0);
    });

    it('ignores empty or malformed symbols', () => {
      const scanned: ScannedEGXTicker[] = [
        { symbol: '', companyName: 'Invalid', exchange: 'EGX', sector: 'Financials', industry: 'Banks', currency: 'EGP', logoUrl: null },
      ];

      const existingSymbols = new Set(['COMI']);
      expect(computeMissingTickers(scanned, existingSymbols)).toHaveLength(0);
    });
  });

  describe('computeDelistedTickers', () => {
    it('identifies active DB equities missing from the exchange scan', () => {
      const scannedSymbols = new Set(['COMI', 'FWRY']);
      const activeDbTickers = [
        { symbol: 'COMI', sector: 'Financials', exchange: 'EGX' },
        { symbol: 'FWRY', sector: 'Financials', exchange: 'EGX' },
        { symbol: 'OLDCO', sector: 'Industrials', exchange: 'EGX' }, // Missing from scanner
      ];

      const delisted = computeDelistedTickers(scannedSymbols, activeDbTickers);
      expect(delisted).toEqual(['OLDCO']);
    });

    it('exempts Funds, Macro, and Indices from delisting detection', () => {
      const scannedSymbols = new Set(['COMI']);
      const activeDbTickers = [
        { symbol: 'COMI', sector: 'Financials', exchange: 'EGX' },
        { symbol: 'EGX30', sector: 'Indices', exchange: 'EGX' },
        { symbol: 'AZG', sector: 'Funds', exchange: 'EGX' },
        { symbol: 'EG_M2', sector: 'Macro', exchange: 'EGX' },
      ];

      const delisted = computeDelistedTickers(scannedSymbols, activeDbTickers);
      expect(delisted).toEqual([]);
    });

    it('normalizes .CA suffix when checking presence', () => {
      const scannedSymbols = new Set(['COMI']);
      const activeDbTickers = [
        { symbol: 'COMI.CA', sector: 'Financials', exchange: 'EGX' },
      ];

      const delisted = computeDelistedTickers(scannedSymbols, activeDbTickers);
      expect(delisted).toEqual([]);
    });
  });

  describe('computeReactivatedTickers', () => {
    it('identifies delisted DB tickers that have reappeared in the exchange scan', () => {
      const scannedSymbols = new Set(['COMI', 'RELCO']);
      const delistedDbTickers = [
        { symbol: 'RELCO', sector: 'Industrials', exchange: 'EGX' },
        { symbol: 'STILL_DEAD', sector: 'Materials', exchange: 'EGX' },
      ];

      const reactivated = computeReactivatedTickers(scannedSymbols, delistedDbTickers);
      expect(reactivated).toEqual(['RELCO']);
    });
  });
});
