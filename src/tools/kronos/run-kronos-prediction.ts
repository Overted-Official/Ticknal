let predictorInstance: any = null;

export interface KronosInputBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  amount?: number;
}

export interface KronosPredictedBar {
  time: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  upper80?: number;
  lower80?: number;
}

export interface PredictionPayload {
  predictions: KronosPredictedBar[];
  corridor: {
    lastClose: number;
    expectedClose: number;
    expectedReturnPercent: number;
  };
  cached?: boolean;
}

interface PredictionCacheEntry {
  timestamp: number;
  data: PredictionPayload;
}

const PREDICTION_CACHE = new Map<string, PredictionCacheEntry>();
const IN_FLIGHT_PREDICTIONS = new Map<string, Promise<PredictionPayload>>();
const MAX_PREDICTION_CACHE_SIZE = 200;
const PREDICTION_CACHE_TTL_MS = 14 * 60 * 60 * 1000; // 14 hours (covers whole market day)

async function executePredictionComputation(
  history: KronosInputBar[],
  nDays: number,
  sampleCount: number,
  temperature: number
): Promise<PredictionPayload> {
  const seqLen = history.length;

  const x = new Float32Array(seqLen * 6);
  const x_stamp = new Float32Array(seqLen * 5);

  const featureSums = new Float64Array(6);
  const featureSqSums = new Float64Array(6);

  for (let i = 0; i < seqLen; i++) {
    const row = history[i];
    const open = Number(row.open) || 0;
    const high = Number(row.high) || open;
    const low = Number(row.low) || open;
    const close = Number(row.close) || open;
    const volume = Number(row.volume) || 0;
    const amount = Number(row.amount) || (volume * ((open + high + low + close) / 4));

    const f = [open, high, low, close, volume, amount];

    for (let j = 0; j < 6; j++) {
      x[i * 6 + j] = f[j];
      featureSums[j] += f[j];
      featureSqSums[j] += f[j] * f[j];
    }

    const [year, month, day] = row.time.split('-').map(Number);
    const dt = new Date(Date.UTC(year, month - 1, day));

    const jsDay = dt.getUTCDay();
    const pyWeekday = jsDay === 0 ? 6 : jsDay - 1;

    x_stamp[i * 5 + 0] = dt.getUTCMinutes();
    x_stamp[i * 5 + 1] = dt.getUTCHours();
    x_stamp[i * 5 + 2] = pyWeekday;
    x_stamp[i * 5 + 3] = dt.getUTCDate();
    x_stamp[i * 5 + 4] = dt.getUTCMonth() + 1;
  }

  const means = new Float32Array(6);
  const stds = new Float32Array(6);
  for (let j = 0; j < 6; j++) {
    const mean = featureSums[j] / seqLen;
    const variance = (featureSqSums[j] / seqLen) - (mean * mean);
    const std = Math.sqrt(Math.max(variance, 1e-5));
    means[j] = mean;
    stds[j] = std;

    for (let i = 0; i < seqLen; i++) {
      x[i * 6 + j] = (x[i * 6 + j] - mean) / std;
    }
  }

  const y_stamp = new Float32Array(nDays * 5);
  const lastRowTime = history[history.length - 1].time;
  const [lYear, lMonth, lDay] = lastRowTime.split('-').map(Number);
  let currentDate = new Date(Date.UTC(lYear, lMonth - 1, lDay));

  let generatedDays = 0;
  const futureDates: string[] = [];

  while (generatedDays < nDays) {
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);

    const dayOfWeek = currentDate.getUTCDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) continue; // Skip Friday and Saturday for EGX

    const pyWeekday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    y_stamp[generatedDays * 5 + 0] = currentDate.getUTCMinutes();
    y_stamp[generatedDays * 5 + 1] = currentDate.getUTCHours();
    y_stamp[generatedDays * 5 + 2] = pyWeekday;
    y_stamp[generatedDays * 5 + 3] = currentDate.getUTCDate();
    y_stamp[generatedDays * 5 + 4] = currentDate.getUTCMonth() + 1;

    const yyyy = currentDate.getUTCFullYear();
    const mm = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getUTCDate()).padStart(2, '0');
    futureDates.push(`${yyyy}-${mm}-${dd}`);

    generatedDays++;
  }

  if (!predictorInstance) {
    const { KronosPredictor } = await import('@/tools/kronos/KronosPredictor');
    predictorInstance = new KronosPredictor();
  }

  const predResult = await predictorInstance.predict(x, x_stamp, y_stamp, seqLen, nDays, {
    sampleCount,
    temperature,
  });
  const outNorm = predResult.outNorm ?? predResult;
  const upper80 = predResult.upper80;
  const lower80 = predResult.lower80;

  const rawPredictions = [];
  for (let i = 0; i < nDays; i++) {
    const idx = i * 6;
    const denormOpen = (outNorm[idx + 0] * stds[0]) + means[0];
    const denormHigh = (outNorm[idx + 1] * stds[1]) + means[1];
    const denormLow = (outNorm[idx + 2] * stds[2]) + means[2];
    const denormClose = (outNorm[idx + 3] * stds[3]) + means[3];
    const denormVolume = Math.max(0, (outNorm[idx + 4] * stds[4]) + means[4]);

    const rawUpper80 = upper80 ? (upper80[idx + 3] * stds[3]) + means[3] : undefined;
    const rawLower80 = lower80 ? (lower80[idx + 3] * stds[3]) + means[3] : undefined;

    rawPredictions.push({
      date: futureDates[i],
      open: denormOpen,
      high: denormHigh,
      low: denormLow,
      close: denormClose,
      volume: denormVolume,
      upper80: rawUpper80,
      lower80: rawLower80,
    });
  }

  const lastHistoricalClose = Number(history[seqLen - 1].close);
  const firstPredictedOpen = rawPredictions[0]?.open || lastHistoricalClose;

  const scaleRatio = (firstPredictedOpen > 0 && lastHistoricalClose > 0)
    ? lastHistoricalClose / firstPredictedOpen
    : 1.0;

  const predictions: KronosPredictedBar[] = rawPredictions.map((p) => {
    const scaledOpen = p.open * scaleRatio;
    const scaledClose = p.close * scaleRatio;
    const scaledHigh = Math.max(p.high * scaleRatio, scaledOpen, scaledClose);
    const scaledLow = Math.min(p.low * scaleRatio, scaledOpen, scaledClose);
    const scaledUpper80 = p.upper80 ? Math.max(p.upper80 * scaleRatio, scaledHigh) : undefined;
    const scaledLower80 = p.lower80 ? Math.min(p.lower80 * scaleRatio, scaledLow) : undefined;

    return {
      time: p.date,
      date: p.date,
      open: Number(scaledOpen.toFixed(2)),
      high: Number(scaledHigh.toFixed(2)),
      low: Number(scaledLow.toFixed(2)),
      close: Number(scaledClose.toFixed(2)),
      volume: Math.round(p.volume),
      upper80: scaledUpper80 ? Number(scaledUpper80.toFixed(2)) : undefined,
      lower80: scaledLower80 ? Number(scaledLower80.toFixed(2)) : undefined,
    };
  });

  const finalClose = predictions[predictions.length - 1]?.close || lastHistoricalClose;
  const expectedReturnPercent = Number((((finalClose - lastHistoricalClose) / lastHistoricalClose) * 100).toFixed(2));

  return {
    predictions,
    corridor: {
      lastClose: lastHistoricalClose,
      expectedClose: finalClose,
      expectedReturnPercent,
    },
  };
}

export async function runKronosPrediction(
  history: KronosInputBar[],
  nDays: number = 10,
  options?: {
    sampleCount?: number;
    temperature?: number;
    customCacheKey?: string;
  }
): Promise<{ result: PredictionPayload; cacheStatus: 'HIT' | 'COALESCED' | 'MISS' }> {
  if (!history || history.length === 0) {
    throw new Error('Missing or empty history data for Kronos prediction');
  }

  const sampleCount = Math.max(1, Math.min(Number(options?.sampleCount) || 1, 5));
  const temperature = Math.max(0.2, Math.min(Number(options?.temperature) || 0.6, 1.2));
  const lastBar = history[history.length - 1];
  const lastRowTime = lastBar?.time || 'unknown';

  const cacheKey = options?.customCacheKey || `KRONOS:${lastRowTime}:${nDays}:${sampleCount}:${temperature.toFixed(2)}`;

  // 1. Check in-memory daily cache
  const cached = PREDICTION_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < PREDICTION_CACHE_TTL_MS) {
    PREDICTION_CACHE.delete(cacheKey);
    PREDICTION_CACHE.set(cacheKey, cached);
    return {
      result: { ...cached.data, cached: true },
      cacheStatus: 'HIT',
    };
  }

  // 2. Coalesce in-flight requests
  let calculationPromise = IN_FLIGHT_PREDICTIONS.get(cacheKey);
  let wasCoalesced = false;

  if (calculationPromise) {
    wasCoalesced = true;
  } else {
    calculationPromise = executePredictionComputation(history, nDays, sampleCount, temperature);
    IN_FLIGHT_PREDICTIONS.set(cacheKey, calculationPromise);
  }

  let result: PredictionPayload;
  try {
    result = await calculationPromise;
  } finally {
    IN_FLIGHT_PREDICTIONS.delete(cacheKey);
  }

  // 3. Store in daily cache
  if (PREDICTION_CACHE.size >= MAX_PREDICTION_CACHE_SIZE) {
    const oldestKey = PREDICTION_CACHE.keys().next().value;
    if (oldestKey) PREDICTION_CACHE.delete(oldestKey);
  }
  PREDICTION_CACHE.set(cacheKey, {
    timestamp: Date.now(),
    data: result,
  });

  return {
    result: { ...result, cached: wasCoalesced },
    cacheStatus: wasCoalesced ? 'COALESCED' : 'MISS',
  };
}
