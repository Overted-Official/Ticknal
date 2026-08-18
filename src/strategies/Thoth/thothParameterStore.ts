export interface BespokeThothParamConfig {
  buyThreshold: number;
  sellThreshold: number;
  requireGreen: boolean;
  metrics?: {
    roi: number;
    bhRoi: number;
    alpha: number;
    winRate: number;
    trades: number;
    avgWin: number;
  };
}

/**
 * Hardcoded Bespoke Thoth-EGX-Macro-V2 Optimized Parameter Store
 * Generated from Out-of-Sample Walk-Forward Optimization on the 2025-2026 Test Vault.
 */
export const BESPOKE_THOTH_PARAMS: Record<string, BespokeThothParamConfig> = {
  EGAL: {
    buyThreshold: 20.0,
    sellThreshold: 80.0,
    requireGreen: false,
    metrics: { roi: 243.2, bhRoi: 184.2, alpha: 59.0, winRate: 100.0, trades: 4, avgWin: 30.8 }
  },
  PHDC: {
    buyThreshold: 30.0,
    sellThreshold: 85.0,
    requireGreen: false,
    metrics: { roi: 158.7, bhRoi: 120.3, alpha: 38.4, winRate: 100.0, trades: 4, avgWin: 5.6 }
  },
  ORAS: {
    buyThreshold: 15.0,
    sellThreshold: 85.0,
    requireGreen: false,
    metrics: { roi: 195.9, bhRoi: 159.2, alpha: 36.7, winRate: 100.0, trades: 1, avgWin: 2.9 }
  },
  MASR: {
    buyThreshold: 25.0,
    sellThreshold: 80.0,
    requireGreen: false,
    metrics: { roi: 133.3, bhRoi: 99.9, alpha: 33.4, winRate: 100.0, trades: 4, avgWin: 26.1 }
  },
  HRHO: {
    buyThreshold: 35.0,
    sellThreshold: 75.0,
    requireGreen: true,
    metrics: { roi: 47.4, bhRoi: 27.4, alpha: 20.0, winRate: 100.0, trades: 4, avgWin: 8.2 }
  },
  BTFH: {
    buyThreshold: 20.0,
    sellThreshold: 70.0,
    requireGreen: false,
    metrics: { roi: 51.9, bhRoi: 34.9, alpha: 17.0, winRate: 100.0, trades: 4, avgWin: 11.5 }
  },
  ORHD: {
    buyThreshold: 35.0,
    sellThreshold: 75.0,
    requireGreen: true,
    metrics: { roi: 141.9, bhRoi: 129.4, alpha: 12.6, winRate: 100.0, trades: 3, avgWin: 11.8 }
  },
  ALCN: {
    buyThreshold: 15.0,
    sellThreshold: 75.0,
    requireGreen: false,
    metrics: { roi: 53.0, bhRoi: 40.8, alpha: 12.1, winRate: 100.0, trades: 2, avgWin: 0.9 }
  },
  ABUK: {
    buyThreshold: 20.0,
    sellThreshold: 70.0,
    requireGreen: true,
    metrics: { roi: 64.6, bhRoi: 55.9, alpha: 8.7, winRate: 100.0, trades: 3, avgWin: 14.9 }
  },
  TMGH: {
    buyThreshold: 25.0,
    sellThreshold: 85.0,
    requireGreen: true,
    metrics: { roi: 81.6, bhRoi: 77.0, alpha: 4.6, winRate: 100.0, trades: 1, avgWin: 2.2 }
  },
  OCDI: {
    buyThreshold: 15.0,
    sellThreshold: 85.0,
    requireGreen: true,
    metrics: { roi: 118.9, bhRoi: 114.7, alpha: 4.2, winRate: 100.0, trades: 2, avgWin: 5.2 }
  },
  ORWE: {
    buyThreshold: 15.0,
    sellThreshold: 70.0,
    requireGreen: true,
    metrics: { roi: 4.5, bhRoi: 1.0, alpha: 3.4, winRate: 100.0, trades: 2, avgWin: 2.2 }
  },
  SKPC: {
    buyThreshold: 15.0,
    sellThreshold: 70.0,
    requireGreen: false,
    metrics: { roi: 10.3, bhRoi: 7.3, alpha: 2.9, winRate: 100.0, trades: 3, avgWin: 3.3 }
  },
  CIEB: {
    buyThreshold: 25.0,
    sellThreshold: 70.0,
    requireGreen: true,
    metrics: { roi: 30.1, bhRoi: 27.4, alpha: 2.7, winRate: 100.0, trades: 3, avgWin: 10.1 }
  },
  ETEL: {
    buyThreshold: 35.0,
    sellThreshold: 75.0,
    requireGreen: true,
    metrics: { roi: 229.8, bhRoi: 229.6, alpha: 0.3, winRate: 100.0, trades: 10, avgWin: 11.9 }
  },
  COMI: {
    buyThreshold: 25.0,
    sellThreshold: 75.0,
    requireGreen: true,
    metrics: { roi: 81.4, bhRoi: 93.7, alpha: -12.3, winRate: 100.0, trades: 7, avgWin: 7.7 }
  },
  SWDY: {
    buyThreshold: 15.0,
    sellThreshold: 80.0,
    requireGreen: true,
    metrics: { roi: 30.2, bhRoi: 39.6, alpha: -9.4, winRate: 100.0, trades: 1, avgWin: 30.2 }
  },
  FWRY: {
    buyThreshold: 25.0,
    sellThreshold: 70.0,
    requireGreen: false,
    metrics: { roi: 59.3, bhRoi: 120.0, alpha: -60.7, winRate: 100.0, trades: 6, avgWin: 8.7 }
  },
  ADIB: {
    buyThreshold: 25.0,
    sellThreshold: 75.0,
    requireGreen: true,
    metrics: { roi: 152.1, bhRoi: 217.9, alpha: -65.8, winRate: 100.0, trades: 3, avgWin: 6.3 }
  }
};

/**
 * Resolves bespoke Thoth parameters for a ticker if available, or returns an empty partial object.
 */
export function getBespokeThothParams(ticker: string): Partial<BespokeThothParamConfig> {
  const cleanSym = ticker.toUpperCase().trim().replace('.CA', '');
  return BESPOKE_THOTH_PARAMS[cleanSym] ?? {};
}
