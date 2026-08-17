import { NextRequest, NextResponse } from 'next/server';
import { KronosPredictor } from '@/tools/kronos/KronosPredictor';
import { createClient } from '@/lib/supabase/server';

let predictor: KronosPredictor | null = null;

export async function POST(req: NextRequest) {
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

    // We need 6 features: open, high, low, close, volume, amount
    const x = new Float32Array(seqLen * 6);
    const x_stamp = new Float32Array(seqLen * 5); // minute, hour, weekday, day, month

    // We need mean and std for normalization
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

      // Parse date for stamps (using row.time which is "YYYY-MM-DD")
      const [year, month, day] = row.time.split('-').map(Number);
      const dt = new Date(Date.UTC(year, month - 1, day));
      
      const jsDay = dt.getUTCDay(); // Sunday=0, Monday=1...
      const pyWeekday = jsDay === 0 ? 6 : jsDay - 1; // Monday=0, Sunday=6
      
      x_stamp[i * 5 + 0] = dt.getUTCMinutes();
      x_stamp[i * 5 + 1] = dt.getUTCHours();
      x_stamp[i * 5 + 2] = pyWeekday; 
      x_stamp[i * 5 + 3] = dt.getUTCDate(); // 1-31
      x_stamp[i * 5 + 4] = dt.getUTCMonth() + 1; // 1-12
    }

    // Normalize
    const x_mean = new Float32Array(6);
    const x_std = new Float32Array(6);
    for (let j = 0; j < 6; j++) {
      x_mean[j] = featureSums[j] / seqLen;
      const variance = (featureSqSums[j] / seqLen) - (x_mean[j] * x_mean[j]);
      x_std[j] = Math.sqrt(Math.max(variance, 0));
    }

    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < 6; j++) {
        let norm = (x[i * 6 + j] - x_mean[j]) / (x_std[j] + 1e-5);
        norm = Math.max(-5.0, Math.min(5.0, norm)); // Clip
        x[i * 6 + j] = norm;
      }
    }

    // Generate future stamps (respecting EGX business days: Sunday-Thursday)
    const y_stamp = new Float32Array(nDays * 5);
    const [ly, lm, ld] = history[seqLen - 1].time.split('-').map(Number);
    const lastDate = new Date(Date.UTC(ly, lm - 1, ld));
    
    const futureDates: string[] = [];

    for (let i = 0; i < nDays; i++) {
      // Advance day
      lastDate.setUTCDate(lastDate.getUTCDate() + 1);
      
      // EGX Weekend: Friday (5) -> Sunday (+2 days), Saturday (6) -> Sunday (+1 day)
      if (lastDate.getUTCDay() === 5) {
        lastDate.setUTCDate(lastDate.getUTCDate() + 2); // Friday -> Sunday
      } else if (lastDate.getUTCDay() === 6) {
        lastDate.setUTCDate(lastDate.getUTCDate() + 1); // Saturday -> Sunday
      }
      
      const isoDate = lastDate.toISOString().split('T')[0];
      futureDates.push(isoDate);
      
      const jsDay = lastDate.getUTCDay();
      const pyWeekday = jsDay === 0 ? 6 : jsDay - 1;
      
      y_stamp[i * 5 + 0] = lastDate.getUTCMinutes();
      y_stamp[i * 5 + 1] = lastDate.getUTCHours();
      y_stamp[i * 5 + 2] = pyWeekday;
      y_stamp[i * 5 + 3] = lastDate.getUTCDate();
      y_stamp[i * 5 + 4] = lastDate.getUTCMonth() + 1;
    }

    // Initialize predictor if needed
    if (!predictor) {
      predictor = new KronosPredictor();
      await predictor.init();
    }

    // Run inference
    const predNorm = await predictor.predict(x, x_stamp, y_stamp, seqLen, nDays);

    // Denormalize and calculate raw predictions
    const rawPredictions = [];
    for (let i = 0; i < nDays; i++) {
      const idx = i * 6;
      const denormOpen = (predNorm[idx + 0] * x_std[0]) + x_mean[0];
      const denormHigh = (predNorm[idx + 1] * x_std[1]) + x_mean[1];
      const denormLow = (predNorm[idx + 2] * x_std[2]) + x_mean[2];
      const denormClose = (predNorm[idx + 3] * x_std[3]) + x_mean[3];
      
      rawPredictions.push({
        date: futureDates[i],
        open: denormOpen,
        high: denormHigh,
        low: denormLow,
        close: denormClose
      });
    }

    // Anchor predicted candles to the last historical close price
    // This ensures smooth continuity without jarring vertical gaps caused by global lookback variance
    const lastHistoricalClose = Number(history[seqLen - 1].close);
    const firstPredictedOpen = rawPredictions[0]?.open || lastHistoricalClose;
    
    // Calculate continuity scale ratio
    const scaleRatio = (firstPredictedOpen > 0 && lastHistoricalClose > 0)
      ? lastHistoricalClose / firstPredictedOpen
      : 1.0;

    const predictions = rawPredictions.map((p) => {
      const scaledOpen = p.open * scaleRatio;
      const scaledClose = p.close * scaleRatio;
      const scaledHigh = Math.max(p.high * scaleRatio, scaledOpen, scaledClose);
      const scaledLow = Math.min(p.low * scaleRatio, scaledOpen, scaledClose);

      return {
        date: p.date,
        open: Number(scaledOpen.toFixed(2)),
        high: Number(scaledHigh.toFixed(2)),
        low: Number(scaledLow.toFixed(2)),
        close: Number(scaledClose.toFixed(2)),
      };
    });

    return NextResponse.json({ predictions });

  } catch (error: any) {
    console.error('Kronos Prediction API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
