import * as fs from 'fs';
import * as path from 'path';
import { computePsiSeries } from '../../_dynamic-psi-test/psiStrategy';
import { identifySwings, computeSwingDeltas, computeExhaustionSeries } from '../../_dynamic-psi-test/exhaustionStrategy';

const usePsi8 = process.argv.includes('--psi8');
const dataPath = path.join(__dirname, '..', '..', '_data', 'consolidated_prices_new.csv');

console.log(`Loading dataset from ${dataPath}...`);
const fileContent = fs.readFileSync(dataPath, 'utf-8');
const lines = fileContent.trim().split('\n').filter(l => l.trim() !== '');

console.log(`Grouping ${lines.length} lines by ticker...`);
const tickerMap = new Map<string, any[]>();

const latentsPath = path.join(__dirname, 'autoencoder_latents.csv');
const latentsMap = new Map<string, string[]>();

if (fs.existsSync(latentsPath)) {
  console.log('Loading latent features...');
  const latentsContent = fs.readFileSync(latentsPath, 'utf-8');
  const latentsLines = latentsContent.trim().split('\n');
  for (let i = 1; i < latentsLines.length; i++) {
    const parts = latentsLines[i].replace('\r', '').split(',');
    if (parts.length >= 10) {
      const ticker = parts[0];
      const date = parts[1];
      const key = `${ticker}|${date}`;
      latentsMap.set(key, parts.slice(2)); // [latent_0, ..., latent_7]
    }
  }
  console.log(`Loaded ${latentsMap.size} latent feature vectors.`);
} else {
  console.log('Warning: autoencoder_latents.csv not found. Latents will be zeroed.');
}

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  const ticker = parts[0];
  
  if (!tickerMap.has(ticker)) {
    tickerMap.set(ticker, []);
  }

  const parsedDate = new Date(parts[1]);
  const isoDate = isNaN(parsedDate.getTime()) ? parts[1] : parsedDate.toISOString().split('T')[0];
  
  tickerMap.get(ticker)!.push({
    date: isoDate,
    open: parseFloat(parts[2]),
    high: parseFloat(parts[3]),
    low: parseFloat(parts[4]),
    close: parseFloat(parts[5]),
    volume: parseFloat(parts[6]),
  });
}

const outPath = path.join(__dirname, usePsi8 ? 'dataset_psi8.csv' : 'dataset_psi40.csv');
const csvHeaders = [
  'ticker', 'date', 'delta_to_red', 'delta_to_green', 'momentum', 
  'curr_is_bullish', 'last_red_is_bullish', 'last_green_is_bullish', 
  'bars_since_red', 'bars_since_green', 'swing_roi_up', 'swing_roi_down', 
  'roi_median_multiple_up', 'roi_median_multiple_down',
  // NEW Phase 1 features
  'delta_to_red_lag5', 'momentum_lag5', 'delta_velocity',
  'psi_index_value',
  'volume_ratio', 'cumulative_volume_ratio',
  'latent_0', 'latent_1', 'latent_2', 'latent_3', 'latent_4', 'latent_5', 'latent_6', 'latent_7',
  'direction', 'target_exhaustion'
];

const stream = fs.createWriteStream(outPath);
stream.write(csvHeaders.join(',') + '\n');

let totalWritten = 0;
let totalSkipped = 0;

// Winsorization caps (from 99th percentile analysis)
const ROI_MEDIAN_MULTIPLE_CAP = 100;  // Cap at 100x median daily move
const SWING_ROI_CAP = 50;            // Cap at 50% ROI

for (const [ticker, data] of tickerMap.entries()) {
  data.sort((a, b) => a.date.localeCompare(b.date));
  
  if (data.length < 500) {
    totalSkipped++;
    continue;
  }

  const computedBars = computePsiSeries(data);
  const swings = identifySwings(computedBars as any, usePsi8 ? 'psi8' : 'psi40');
  const { upDeltas, downDeltas } = computeSwingDeltas(computedBars, swings, usePsi8 ? 'psi8' : 'psi40');
  const exhaustionSeries = computeExhaustionSeries(computedBars, swings, upDeltas, downDeltas, usePsi8 ? 'psi8' : 'psi40');

  let state = 0;
  let extremumPrice = usePsi8 ? (computedBars[0] as any).masterIndex : (computedBars[0] as any).masterIndex40;
  let extremumIndex = 0;
  const threshold = 0.05;

  let lastConfirmedRedIndex: number | null = null;
  let lastConfirmedGreenIndex: number | null = null;
  let lastConfirmedRedIsBullish: number | null = null;
  let lastConfirmedGreenIsBullish: number | null = null;
  let lastConfirmedRedBarIdx: number | null = null;
  let lastConfirmedGreenBarIdx: number | null = null;

  // Track daily moves for rolling median
  const dailyMoves: number[] = [];

  // NEW: Rolling buffers for lagged features
  const deltaToRedBuffer: number[] = [];
  const momentumBuffer: number[] = [];

  // NEW: Volume tracking
  const volumeBuffer: number[] = [];
  let swingStartBarIdx = 0;
  let cumulativeVolumeSinceSwing = 0;

  for (let i = 1; i < computedBars.length; i++) {
    const bar = computedBars[i] as any;
    const price = usePsi8 ? bar.masterIndex : bar.masterIndex40;
    
    // Calculate daily move % (Open to Close)
    const dailyMovePct = bar.open > 0 ? (Math.abs(bar.close - bar.open) / bar.open) * 100 : 0;
    dailyMoves.push(dailyMovePct);
    if (dailyMoves.length > 64) {
      dailyMoves.shift();
    }

    // NEW: Track volume in rolling buffer (20-day)
    volumeBuffer.push(bar.volume || 0);
    if (volumeBuffer.length > 20) {
      volumeBuffer.shift();
    }
    
    if (price === null || price === undefined) continue;

    if (state === 0) {
      if (price > extremumPrice * (1.0 + threshold)) {
        state = 1;
        lastConfirmedGreenIndex = usePsi8 ? (computedBars[extremumIndex] as any).masterIndex : (computedBars[extremumIndex] as any).masterIndex40;
        lastConfirmedGreenIsBullish = (computedBars[extremumIndex] as any).close >= (computedBars[extremumIndex] as any).open ? 1 : 0;
        lastConfirmedGreenBarIdx = extremumIndex;
        swingStartBarIdx = extremumIndex;
        cumulativeVolumeSinceSwing = 0;
        extremumIndex = i;
        extremumPrice = price;
      } else if (price < extremumPrice * (1.0 - threshold)) {
        state = -1;
        lastConfirmedRedIndex = usePsi8 ? (computedBars[extremumIndex] as any).masterIndex : (computedBars[extremumIndex] as any).masterIndex40;
        lastConfirmedRedIsBullish = (computedBars[extremumIndex] as any).close >= (computedBars[extremumIndex] as any).open ? 1 : 0;
        lastConfirmedRedBarIdx = extremumIndex;
        swingStartBarIdx = extremumIndex;
        cumulativeVolumeSinceSwing = 0;
        extremumIndex = i;
        extremumPrice = price;
      } else {
        if (price > extremumPrice) { extremumPrice = price; extremumIndex = i; }
        else if (price < extremumPrice) { extremumPrice = price; extremumIndex = i; } 
      }
    } else if (state === 1) {
      if (price > extremumPrice) {
        extremumPrice = price;
        extremumIndex = i;
      } else if (price < extremumPrice * (1.0 - threshold)) {
        lastConfirmedRedIndex = usePsi8 ? (computedBars[extremumIndex] as any).masterIndex : (computedBars[extremumIndex] as any).masterIndex40;
        lastConfirmedRedIsBullish = (computedBars[extremumIndex] as any).close >= (computedBars[extremumIndex] as any).open ? 1 : 0;
        lastConfirmedRedBarIdx = extremumIndex;
        swingStartBarIdx = extremumIndex;
        cumulativeVolumeSinceSwing = 0;
        state = -1;
        extremumIndex = i;
        extremumPrice = price;
      }
    } else if (state === -1) {
      if (price < extremumPrice) {
        extremumPrice = price;
        extremumIndex = i;
      } else if (price > extremumPrice * (1.0 + threshold)) {
        lastConfirmedGreenIndex = usePsi8 ? (computedBars[extremumIndex] as any).masterIndex : (computedBars[extremumIndex] as any).masterIndex40;
        lastConfirmedGreenIsBullish = (computedBars[extremumIndex] as any).close >= (computedBars[extremumIndex] as any).open ? 1 : 0;
        lastConfirmedGreenBarIdx = extremumIndex;
        swingStartBarIdx = extremumIndex;
        cumulativeVolumeSinceSwing = 0;
        state = 1;
        extremumIndex = i;
        extremumPrice = price;
      }
    }

    // Track cumulative volume since swing start
    cumulativeVolumeSinceSwing += (bar.volume || 0);

    const currIndex = usePsi8 ? bar.masterIndex : bar.masterIndex40;
    const prevIndex = usePsi8 ? (computedBars[i - 1] as any).masterIndex : (computedBars[i - 1] as any).masterIndex40;
    
    if (currIndex !== null && prevIndex !== null && 
        lastConfirmedRedIndex !== null && lastConfirmedGreenIndex !== null && 
        lastConfirmedRedBarIdx !== null && lastConfirmedGreenBarIdx !== null &&
        dailyMoves.length === 64) {
          
      const momentum = (currIndex - prevIndex) / (Math.abs(prevIndex) + 0.0001) * 100;
      const deltaToRed = (currIndex - lastConfirmedRedIndex) / (Math.abs(lastConfirmedRedIndex) + 0.0001) * 100;
      const deltaToGreen = (currIndex - lastConfirmedGreenIndex) / (Math.abs(lastConfirmedGreenIndex) + 0.0001) * 100;
      const currIsBullish = bar.close >= bar.open ? 1 : 0;
      
      const barsSinceRed = i - lastConfirmedRedBarIdx;
      const barsSinceGreen = i - lastConfirmedGreenBarIdx;
      
      const redClose = (computedBars[lastConfirmedRedBarIdx] as any).close;
      const greenClose = (computedBars[lastConfirmedGreenBarIdx] as any).close;
      
      let swingRoiUp = greenClose > 0 ? ((bar.close - greenClose) / greenClose) * 100 : 0;
      let swingRoiDown = redClose > 0 ? ((redClose - bar.close) / redClose) * 100 : 0;
      
      const sortedMoves = [...dailyMoves].sort((a, b) => a - b);
      const medianMove = sortedMoves[32]; // 64 / 2
      const safeMedian = Math.max(medianMove, 0.0001); // avoid division by zero
      
      let roiMedianMultipleUp = swingRoiUp / safeMedian;
      let roiMedianMultipleDown = swingRoiDown / safeMedian;

      // WINSORIZE: Cap extreme values
      swingRoiUp = Math.max(-SWING_ROI_CAP, Math.min(SWING_ROI_CAP, swingRoiUp));
      swingRoiDown = Math.max(-SWING_ROI_CAP, Math.min(SWING_ROI_CAP, swingRoiDown));
      roiMedianMultipleUp = Math.max(-ROI_MEDIAN_MULTIPLE_CAP, Math.min(ROI_MEDIAN_MULTIPLE_CAP, roiMedianMultipleUp));
      roiMedianMultipleDown = Math.max(-ROI_MEDIAN_MULTIPLE_CAP, Math.min(ROI_MEDIAN_MULTIPLE_CAP, roiMedianMultipleDown));

      // LAGGED FEATURES: Push current values into buffers
      deltaToRedBuffer.push(deltaToRed);
      momentumBuffer.push(momentum);
      // Keep only last 6 (need index -5 = 6 elements)
      if (deltaToRedBuffer.length > 6) deltaToRedBuffer.shift();
      if (momentumBuffer.length > 6) momentumBuffer.shift();

      const deltaToRedLag5 = deltaToRedBuffer.length >= 6 ? deltaToRedBuffer[0] : deltaToRed;
      const momentumLag5 = momentumBuffer.length >= 6 ? momentumBuffer[0] : momentum;
      const deltaVelocity = deltaToRed - deltaToRedLag5;
      const psiIndexValue = currIndex;

      // VOLUME FEATURES
      const avgVolume20 = volumeBuffer.length > 0 
        ? volumeBuffer.reduce((a, b) => a + b, 0) / volumeBuffer.length 
        : 1;
      const volumeRatio = avgVolume20 > 0 ? (bar.volume || 0) / avgVolume20 : 1;
      
      const barsSinceSwing = i - swingStartBarIdx;
      const avgVolPerBar = barsSinceSwing > 0 ? cumulativeVolumeSinceSwing / barsSinceSwing : avgVolume20;
      const cumulativeVolumeRatio = avgVolume20 > 0 ? avgVolPerBar / avgVolume20 : 1;

      // Cap volume ratios to avoid extremes
      const cappedVolumeRatio = Math.min(volumeRatio, 10);
      const cappedCumulativeVolumeRatio = Math.min(cumulativeVolumeRatio, 10);

      const targetExhaustion = (exhaustionSeries as any)[i]?.exhaustion;
      const targetDirection = (exhaustionSeries as any)[i]?.direction;
      
      if (targetExhaustion !== null && targetExhaustion !== undefined && targetDirection !== null) {
        const key = `${ticker}|${bar.date}`;
        const latents = latentsMap.get(key) || ['0.0','0.0','0.0','0.0','0.0','0.0','0.0','0.0'];
        
        const rowData = [
          ticker,
          bar.date,
          deltaToRed.toFixed(4),
          deltaToGreen.toFixed(4),
          momentum.toFixed(4),
          currIsBullish,
          lastConfirmedRedIsBullish,
          lastConfirmedGreenIsBullish,
          barsSinceRed,
          barsSinceGreen,
          swingRoiUp.toFixed(4),
          swingRoiDown.toFixed(4),
          roiMedianMultipleUp.toFixed(4),
          roiMedianMultipleDown.toFixed(4),
          // NEW features
          deltaToRedLag5.toFixed(4),
          momentumLag5.toFixed(4),
          deltaVelocity.toFixed(4),
          psiIndexValue.toFixed(4),
          cappedVolumeRatio.toFixed(4),
          cappedCumulativeVolumeRatio.toFixed(4),
          ...latents,
          targetDirection,
          targetExhaustion.toFixed(4)
        ];
        stream.write(rowData.join(',') + '\n');
        totalWritten++;
      }
    }
  }
}

stream.end();
console.log(`Wrote ${totalWritten} rows to ${outPath}. Skipped ${totalSkipped} tickers with < 500 bars.`);
