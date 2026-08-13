import fs from 'fs';
import path from 'path';
import TestChartWidget from '@/components/platform/TestChartWidget';
import { computePsiSeries, runPsiStrategy, resolvePsiParams, formatMetricsForApi, type SimpleSignal } from '../../../../_dynamic-psi-test/psiStrategy';
import { runZoneCrossStrategy } from '../../../../_dynamic-psi-test/zoneCrossStrategy';
import { runExhaustionStrategy, identifySwings, computeSwingDeltas, computeExhaustionSeries, type ExhaustionBar } from '../../../../_dynamic-psi-test/exhaustionStrategy';

// Helper to load the CSV
function loadComiData() {
  const filePath = path.join(process.cwd(), '_dynamic-psi-test', 'comi_data.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.trim().split('\n');
  
  const bars = [];
  const seenDates = new Set();
  const startIndex = lines[0].startsWith('ticker_symbol') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 7) {
      const dateStr = parts[1];
      if (!seenDates.has(dateStr)) {
        seenDates.add(dateStr);
        bars.push({
          date: dateStr,
          open: parseFloat(parts[2]),
          high: parseFloat(parts[3]),
          low: parseFloat(parts[4]),
          close: parseFloat(parts[5]),
          volume: parseFloat(parts[6]),
        });
      }
    }
  }
  
  bars.sort((a, b) => a.date.localeCompare(b.date));
  return bars;
}

function loadMLPredictions(filename: string) {
  const filePath = path.join(process.cwd(), '_technical_support', 'ml', filename);
  if (!fs.existsSync(filePath)) return new Map<string, number>();
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.trim().split('\n');
  const preds = new Map<string, number>();
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 3) {
      preds.set(parts[0], parseFloat(parts[2]));
    }
  }
  return preds;
}

export default function TestPage() {
  const bars = loadComiData();
  const computedBars = computePsiSeries(bars);

  const params = resolvePsiParams('COMI');
  const backtestResult = runPsiStrategy(bars, params);
  const metrics = formatMetricsForApi(backtestResult.metrics);
  const psiSignals: SimpleSignal[] = backtestResult.signals.map(s => ({
    date: s.date,
    type: s.signal === 'BUY' ? 'BUY' : 'SELL',
  }));

  // Zone-cross strategy: buy when index crosses up through 16.18, sell when crosses down through 80.90
  const zoneResult = runZoneCrossStrategy(computedBars, 16.18, 80.90);
  const zoneMetrics = formatMetricsForApi(zoneResult.metrics);
  const zoneSignals: SimpleSignal[] = zoneResult.signals;

  // Exhaustion probability series
  const swings = identifySwings(computedBars);
  const { upDeltas, downDeltas } = computeSwingDeltas(computedBars, swings);
  const exhaustionSeries: ExhaustionBar[] = computeExhaustionSeries(computedBars, swings, upDeltas, downDeltas);
  
  // Merge ML Predictions
  const mlPreds40 = loadMLPredictions('predictions_psi40.csv');
  const mlPreds8 = loadMLPredictions('predictions_psi8.csv');
  
  exhaustionSeries.forEach(e => {
    const isoDate = new Date(e.date).toISOString().split('T')[0];
    
    if (mlPreds40.has(isoDate)) {
      e.mlExhaustion = mlPreds40.get(isoDate)!;
    } else {
      e.mlExhaustion = null;
    }

    if (mlPreds8.has(isoDate)) {
      e.mlExhaustion8 = mlPreds8.get(isoDate)!;
    } else {
      e.mlExhaustion8 = null;
    }
  });
  
  // Exhaustion Strategy
  const exhaustionResult = runExhaustionStrategy(computedBars, exhaustionSeries);
  const exhaustionMetrics = formatMetricsForApi(exhaustionResult.metrics);
  const exhaustionSignals: SimpleSignal[] = exhaustionResult.signals;

  return (
    <div className="flex flex-col h-full w-full bg-tv-base text-tv-text overflow-hidden">
      <div className="p-4 border-b border-tv-border flex-none">
        <h1 className="text-xl font-bold">Dynamic PSI Test - COMI</h1>
        <p className="text-sm text-tv-muted">Chart at top 75%, Index line at bottom 25% (Loaded {computedBars.length} bars)</p>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 relative">
          <TestChartWidget 
            data={computedBars} 
            metrics={metrics} 
            zoneMetrics={zoneMetrics} 
            exhaustionMetrics={exhaustionMetrics}
            psiSignals={psiSignals} 
            zoneSignals={zoneSignals} 
            exhaustionSignals={exhaustionSignals}
            exhaustionSeries={exhaustionSeries} 
          />
        </div>
      </div>
    </div>
  );
}
