export interface KronosForecastPoint {
  time: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  upper80?: number;
  lower80?: number;
}

export type CopilotRiskLevel = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';

export interface KronosStrategyAdvisory {
  holdingHorizonBars: number;
  triggerPrice: number;

  // 1. Expected Return
  expectedReturnPercent: number;
  expectedFinalPrice: number;

  // 2. Max Adverse Excursion (Lowest point reached during the holding horizon)
  maxAdverseExcursionPercent: number;
  maxAdverseTroughPrice: number;
  troughBarIndex: number; // 1-based session index

  // 3. Forecasted Price Range at Horizon End (80% confidence corridor)
  priceRangeAtHorizon: {
    minPrice: number;
    maxPrice: number;
    minPercent: number;
    maxPercent: number;
  };

  // 4. Model Confidence Rate
  confidenceScore: number;
  confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW';

  // 5. Risk Assessment (Low Risk, Medium Risk, High Risk)
  riskLevel: CopilotRiskLevel;
  rewardToRiskRatio: number;

  concordance?: 'HIGH' | 'NEUTRAL' | 'DIVERGENT';
}

/**
 * Computes transparent, actionable AI metrics from Kronos predictions
 * matched to the strategy's average trade duration (holding horizon).
 */
export function computeKronosSignalAdvisory(
  predictions: KronosForecastPoint[],
  triggerPrice: number,
  signalAction: 'BUY' | 'HOLD' | 'SELL',
  holdingHorizonBars: number = 8
): KronosStrategyAdvisory | null {
  if (!predictions || predictions.length === 0 || !triggerPrice || triggerPrice <= 0) {
    return null;
  }

  // Target bar at the end of the holding horizon
  const horizonIdx = Math.min(predictions.length - 1, Math.max(0, holdingHorizonBars - 1));
  const finalPoint = predictions[horizonIdx];
  const finalClose = finalPoint.close;

  // 1. Expected Return at Horizon
  const expectedReturnPercent = Number(
    (((finalClose - triggerPrice) / triggerPrice) * 100).toFixed(2)
  );
  const expectedFinalPrice = Number(finalClose.toFixed(2));

  // 2. Max Adverse Excursion (Lowest low reached across the holding horizon)
  let lowestTroughPrice = triggerPrice;
  let troughBarIdx = 0;

  for (let i = 0; i <= horizonIdx; i++) {
    const point = predictions[i];
    const barLow = point.low || point.close;
    if (barLow < lowestTroughPrice) {
      lowestTroughPrice = barLow;
      troughBarIdx = i + 1; // 1-based session
    }
  }

  const maxAdverseExcursionPercent = Number(
    (((lowestTroughPrice - triggerPrice) / triggerPrice) * 100).toFixed(2)
  );
  const maxAdverseTroughPrice = Number(lowestTroughPrice.toFixed(2));

  // 3. Forecasted Price Range at Horizon End (80% confidence corridor)
  const upperPrice = finalPoint.upper80 ?? (finalClose * 1.03);
  const lowerPrice = finalPoint.lower80 ?? (finalClose * 0.97);
  const upperPercent = Number((((upperPrice - triggerPrice) / triggerPrice) * 100).toFixed(2));
  const lowerPercent = Number((((lowerPrice - triggerPrice) / triggerPrice) * 100).toFixed(2));

  const priceRangeAtHorizon = {
    minPrice: Number(lowerPrice.toFixed(2)),
    maxPrice: Number(upperPrice.toFixed(2)),
    minPercent: lowerPercent,
    maxPercent: upperPercent,
  };

  // 4. Model Confidence Rate
  // Based on the dispersion of the 80% corridor relative to projected price.
  // Tight corridor spread across Monte Carlo stochastic paths indicates high model certainty.
  const corridorSpread = Math.max(0, upperPrice - lowerPrice);
  const dispersionRatio = finalClose > 0 ? corridorSpread / finalClose : 0.1;
  const rawConfidence = Math.round(100 - dispersionRatio * 200);
  const confidenceScore = Math.max(50, Math.min(rawConfidence, 96));
  const confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW' =
    confidenceScore >= 80 ? 'HIGH' : confidenceScore >= 65 ? 'MODERATE' : 'LOW';

  // 5. Risk Assessment (Low Risk, Medium Risk, High Risk)
  // Evaluates Expected Return vs Max Adverse Excursion (Reward-to-Risk)
  const absMae = Math.abs(Math.min(0, maxAdverseExcursionPercent));
  let rewardToRiskRatio = 1.0;
  let riskLevel: CopilotRiskLevel = 'MEDIUM_RISK';

  if (expectedReturnPercent <= 0) {
    // If expected return is negative, risk is unconditionally High
    riskLevel = 'HIGH_RISK';
    rewardToRiskRatio = 0.0;
  } else if (absMae <= 0.5) {
    // Virtually no adverse dip projected before moving higher
    rewardToRiskRatio = Number((expectedReturnPercent / 0.5).toFixed(2));
    riskLevel = 'LOW_RISK';
  } else {
    rewardToRiskRatio = Number((expectedReturnPercent / absMae).toFixed(2));

    if (rewardToRiskRatio >= 1.7 && absMae <= 10) {
      riskLevel = 'LOW_RISK';
    } else if (rewardToRiskRatio < 0.8 || absMae >= 25) {
      riskLevel = 'HIGH_RISK';
    } else {
      riskLevel = 'MEDIUM_RISK';
    }
  }

  // Concordance with quant signal
  let concordance: 'HIGH' | 'NEUTRAL' | 'DIVERGENT' = 'NEUTRAL';
  if (signalAction === 'BUY') {
    concordance = expectedReturnPercent >= 1.0 ? 'HIGH' : expectedReturnPercent <= -1.0 ? 'DIVERGENT' : 'NEUTRAL';
  } else if (signalAction === 'SELL') {
    concordance = expectedReturnPercent <= -1.0 ? 'HIGH' : expectedReturnPercent >= 1.0 ? 'DIVERGENT' : 'NEUTRAL';
  }

  return {
    holdingHorizonBars: horizonIdx + 1,
    triggerPrice,
    expectedReturnPercent,
    expectedFinalPrice,
    maxAdverseExcursionPercent,
    maxAdverseTroughPrice,
    troughBarIndex: troughBarIdx,
    priceRangeAtHorizon,
    confidenceScore,
    confidenceLevel,
    riskLevel,
    rewardToRiskRatio,
    concordance,
  };
}
