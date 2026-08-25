import { NextResponse } from 'next/server';
import { getCachedDailyPrices, getCachedHourlyPrices } from '@/lib/data-cache';
import { resolvePsiParamsAsync } from '@/strategies/PSI/psiParameterStore';
import {
  formatMetricsForApi,
  normalizeTickerSymbol,
  resolvePsiParams,
  runPsiStrategy,
  type PriceBar,
} from '@/strategies/PSI/psiStrategy';
import { runFullStrategyBacktest } from '@/strategies/PSI/psiBacktestEngine';
import {
  runFullThothV37PBacktest,
  runThothV37PStrategy,
} from '@/strategies/THOTH_EGX_V3_7P/thothV37PStrategy';
import {
  runFullPsiV2Backtest,
  runPsiV2Strategy,
  formatPsiV2MetricsForApi,
} from '@/strategies/PSI_V2';
import { derivePositionLevels, getDailyPriceBars } from '@/lib/strategyOrders';
import { createClient } from '@/lib/supabase/server';

let predictorInstance: any = null;

export async function handleSignalsGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const strategy = searchParams.get('strategy') || 'psi';
    const timeframe = searchParams.get('timeframe') || searchParams.get('tf') || 'D';
    const is1H = timeframe === '1H' || timeframe === '60' || timeframe === '1h';

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
    }

    const ticker = normalizeTickerSymbol(symbol);
    const startDate = searchParams.get('start') ?? searchParams.get('startDate') ?? (is1H ? undefined : '2025-01-01');
    const endDate = searchParams.get('end') ?? searchParams.get('endDate') ?? undefined;

    const rows = is1H
      ? await getCachedHourlyPrices(ticker)
      : await getCachedDailyPrices(ticker);

    const bars: PriceBar[] = rows
      .map((record) => ({
        date: typeof record.date === 'string'
          ? (is1H ? record.date : record.date.split('T')[0])
          : (is1H ? (record.date as Date).toISOString() : (record.date as Date).toISOString().split('T')[0]),
        open: Number(record.open),
        high: Number(record.high),
        low: Number(record.low),
        close: Number(record.close),
        volume: Number(record.volume ?? 0),
      }))
      .filter((bar) => bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0);

    if (bars.length < 30) {
      return NextResponse.json({ signals: [], latestMasterIndex: null });
    }

    let result;
    if (strategy === 'psi_v2') {
      const psiV2Overrides: Record<string, any> = {
        ticker,
        startDate,
        endDate,
        timeframe,
      };

      const psiV2Result = runPsiV2Strategy(bars, psiV2Overrides);

      result = {
        ...psiV2Result,
        formattedMetrics: formatPsiV2MetricsForApi(psiV2Result.metrics),
        parameterSource: is1H ? 'gpt-3psi-v2-1h-intraday' : 'gpt-3psi-v2-production',
      };
    } else if (strategy === 'thoth_egx_macro') {
      const thothOverrides: Record<string, any> = {
        ticker,
        startDate,
        endDate,
      };

      const thothResult = await runThothV37PStrategy(bars, thothOverrides);

      result = {
        ...thothResult,
        formattedMetrics: formatMetricsForApi(thothResult.metrics),
        parameterSource: 'thoth-egx-v3.7p-production-frozen',
      };
    } else {
      const overrides: Record<string, any> = { startDate, endDate };
      if (searchParams.has('model')) overrides.model = searchParams.get('model');
      if (searchParams.has('useAym')) overrides.useAym = searchParams.get('useAym') === 'true';
      if (searchParams.has('aymMultiplier')) overrides.aymMultiplier = Number(searchParams.get('aymMultiplier'));
      if (searchParams.has('aymLimit')) overrides.aymLimit = Number(searchParams.get('aymLimit'));
      if (searchParams.has('useAtr')) overrides.useAtr = searchParams.get('useAtr') === 'true';
      if (searchParams.has('atrDistance')) overrides.atrDistance = Number(searchParams.get('atrDistance'));
      if (searchParams.has('entryLevels')) {
        try {
          overrides.entryLevels = searchParams.get('entryLevels')?.split(',').map(Number);
        } catch (e) {}
      }

      const parameterResolution = await resolvePsiParamsAsync(ticker, overrides, timeframe);
      const psiResult = runPsiStrategy(bars, parameterResolution.params);

      result = {
        ...psiResult,
        formattedMetrics: formatMetricsForApi(psiResult.metrics),
        parameterSource: parameterResolution.parameterSource,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error calculating signals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleMetricsGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const strategy = searchParams.get('strategy') || 'psi';
    const timeframe = searchParams.get('timeframe') || searchParams.get('tf') || 'D';
    const is1H = timeframe === '1H' || timeframe === '60' || timeframe === '1h';

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
    }

    const ticker = normalizeTickerSymbol(symbol);
    const startDate = searchParams.get('start') ?? (is1H ? undefined : '2025-01-01');
    const endDate = searchParams.get('end') ?? undefined;

    const rows = is1H
      ? await getCachedHourlyPrices(ticker)
      : await getCachedDailyPrices(ticker);

    const bars: PriceBar[] = rows
      .map((record) => ({
        date: typeof record.date === 'string'
          ? (is1H ? record.date : record.date.split('T')[0])
          : (is1H ? (record.date as Date).toISOString() : (record.date as Date).toISOString().split('T')[0]),
        open: Number(record.open),
        high: Number(record.high),
        low: Number(record.low),
        close: Number(record.close),
        volume: Number(record.volume ?? 0),
      }))
      .filter((bar) => bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0);

    if (bars.length < 30) {
      return NextResponse.json({ error: 'Insufficient price history' }, { status: 404 });
    }

    let formattedMetrics: Record<string, string>;
    let parameterSource: string;

    if (strategy === 'psi_v2') {
      const psiV2Overrides: Record<string, any> = {
        ticker,
        startDate,
        endDate,
        timeframe,
      };

      const psiV2Result = runPsiV2Strategy(bars, psiV2Overrides);
      formattedMetrics = formatPsiV2MetricsForApi(psiV2Result.metrics);
      parameterSource = is1H ? 'gpt-3psi-v2-1h-intraday' : 'gpt-3psi-v2-production';
    } else if (strategy === 'thoth_egx_macro') {
      const thothOverrides: Record<string, any> = {
        ticker,
        startDate,
        endDate,
      };

      const thothResult = await runThothV37PStrategy(bars, thothOverrides);
      formattedMetrics = formatMetricsForApi(thothResult.metrics);
      parameterSource = 'thoth-egx-v3.7p-production-frozen';
    } else {
      const overrides: Record<string, any> = { startDate, endDate };
      if (searchParams.has('model')) overrides.model = searchParams.get('model');
      if (searchParams.has('useAym')) overrides.useAym = searchParams.get('useAym') === 'true';
      if (searchParams.has('aymMultiplier')) overrides.aymMultiplier = Number(searchParams.get('aymMultiplier'));
      if (searchParams.has('aymLimit')) overrides.aymLimit = Number(searchParams.get('aymLimit'));
      if (searchParams.has('useAtr')) overrides.useAtr = searchParams.get('useAtr') === 'true';
      if (searchParams.has('atrDistance')) overrides.atrDistance = Number(searchParams.get('atrDistance'));
      if (searchParams.has('entryLevels')) {
        try {
          overrides.entryLevels = searchParams.get('entryLevels')?.split(',').map(Number);
        } catch (e) {}
      }

      const parameterResolution = await resolvePsiParamsAsync(ticker, overrides, timeframe);
      const psiResult = runPsiStrategy(bars, parameterResolution.params);
      formattedMetrics = formatMetricsForApi(psiResult.metrics);
      parameterSource = parameterResolution.parameterSource;
    }

    return NextResponse.json({
      ticker,
      startDate: bars[0].date,
      endDate: bars[bars.length - 1].date,
      parameterSource,
      metrics: formattedMetrics,
    });
  } catch (error) {
    console.error('Error calculating metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleLevelsGet(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const date = searchParams.get('date');
  const entryPrice = Number(searchParams.get('entryPrice'));

  if (!symbol || !date || !Number.isFinite(entryPrice) || entryPrice <= 0) {
    return NextResponse.json({ error: 'symbol, date, and entryPrice are required' }, { status: 400 });
  }

  try {
    const ticker = normalizeTickerSymbol(symbol);
    const bars = await getDailyPriceBars(ticker);
    if (bars.length === 0) {
      return NextResponse.json({ error: 'No price history found' }, { status: 404 });
    }

    const paramRes = await resolvePsiParamsAsync(ticker);
    const levels = derivePositionLevels(ticker, bars, date, entryPrice, paramRes.params);
    return NextResponse.json({
      symbol: ticker,
      entryDate: date,
      entryPrice,
      ...formatLevels(levels),
    });
  } catch (error) {
    console.error('Error deriving strategy levels:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function formatLevels<T extends { targetPrice: number | null; stopPrice: number | null }>(levels: T): T {
  return {
    ...levels,
    targetPrice: levels.targetPrice === null ? null : Number(levels.targetPrice.toFixed(4)),
    stopPrice: levels.stopPrice === null ? null : Number(levels.stopPrice.toFixed(4)),
  };
}

export async function handleReportGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const strategy = searchParams.get('strategy') || 'psi';
    const timeframe = searchParams.get('timeframe') || searchParams.get('tf') || 'D';
    const is1H = timeframe === '1H' || timeframe === '60' || timeframe === '1h';
    const model = searchParams.get('model') || (strategy === 'thoth_egx_macro' ? 'thoth_egx_macro' : strategy === 'psi_v2' ? 'psi_v2' : 'psi8');
    const startDate = searchParams.get('start') ?? (is1H ? undefined : '2025-01-01');
    const endDate = searchParams.get('end') ?? undefined;
    const initialCapital = searchParams.get('initialCapital') ? Number(searchParams.get('initialCapital')) : 1000;

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
    }

    const ticker = normalizeTickerSymbol(symbol);
    const rows = is1H
      ? await getCachedHourlyPrices(ticker)
      : await getCachedDailyPrices(ticker);

    const bars: PriceBar[] = rows
      .map((record) => ({
        date: typeof record.date === 'string'
          ? (is1H ? record.date : record.date.split('T')[0])
          : (is1H ? (record.date as Date).toISOString() : (record.date as Date).toISOString().split('T')[0]),
        open: Number(record.open),
        high: Number(record.high),
        low: Number(record.low),
        close: Number(record.close),
        volume: Number(record.volume ?? 0),
      }))
      .filter((bar) => bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0);

    if (bars.length < 30) {
      return NextResponse.json({ error: 'Insufficient price history' }, { status: 404 });
    }

    if (strategy === 'psi_v2' || model === 'psi_v2') {
      const psiV2Overrides: Record<string, any> = {
        ticker,
        startDate,
        endDate,
        initialCapital,
        timeframe,
      };

      const report = runFullPsiV2Backtest(bars, psiV2Overrides);
      return NextResponse.json(report);
    } else if (strategy === 'thoth_egx_macro' || model === 'thoth_egx_macro') {
      const thothOverrides: Record<string, any> = {
        ticker,
        startDate,
        endDate,
        initialCapital,
      };

      const report = await runFullThothV37PBacktest(bars, thothOverrides);
      return NextResponse.json(report);
    } else {
      const parameterResolution = await resolvePsiParamsAsync(ticker, {
        model: model as 'psi8' | 'psi40',
        initialCapital,
        startDate,
        endDate,
      }, timeframe);
      const report = runFullStrategyBacktest(bars, parameterResolution.params);
      return NextResponse.json(report);
    }
  } catch (error) {
    console.error('Error generating strategy report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handlePredictPost(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { history, predictDays } = body;

    if (!history || !Array.isArray(history) || history.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid history data.' }, { status: 400 });
    }

    const nDays = predictDays ? parseInt(predictDays, 10) : 10;
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

    const outNorm = await predictorInstance.predict(x, x_stamp, y_stamp, seqLen, nDays);
    const rawPredictions = [];
    for (let i = 0; i < nDays; i++) {
      const idx = i * 6;
      const denormOpen = (outNorm[idx + 0] * stds[0]) + means[0];
      const denormHigh = (outNorm[idx + 1] * stds[1]) + means[1];
      const denormLow = (outNorm[idx + 2] * stds[2]) + means[2];
      const denormClose = (outNorm[idx + 3] * stds[3]) + means[3];
      
      rawPredictions.push({
        date: futureDates[i],
        open: denormOpen,
        high: denormHigh,
        low: denormLow,
        close: denormClose
      });
    }

    const lastHistoricalClose = Number(history[seqLen - 1].close);
    const firstPredictedOpen = rawPredictions[0]?.open || lastHistoricalClose;
    
    const scaleRatio = (firstPredictedOpen > 0 && lastHistoricalClose > 0)
      ? lastHistoricalClose / firstPredictedOpen
      : 1.0;

    const predictions = rawPredictions.map((p) => {
      const scaledOpen = p.open * scaleRatio;
      const scaledClose = p.close * scaleRatio;
      const scaledHigh = Math.max(p.high * scaleRatio, scaledOpen, scaledClose);
      const scaledLow = Math.min(p.low * scaleRatio, scaledOpen, scaledClose);

      return {
        time: p.date,
        date: p.date,
        open: Number(scaledOpen.toFixed(2)),
        high: Number(scaledHigh.toFixed(2)),
        low: Number(scaledLow.toFixed(2)),
        close: Number(scaledClose.toFixed(2)),
      };
    });

    return NextResponse.json({ predictions });
  } catch (error: any) {
    console.error('Error during prediction:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
