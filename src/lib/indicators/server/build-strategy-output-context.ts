import {
  createIndicatorInputBundle,
  type ModelOutputFrame,
  type ObservationTime,
  type TimeSeriesFrame,
} from '@ticknal/quant-engine/canonical';

type ModelValue = number | boolean | string | null;

export interface StrategyOutputSnapshot {
  readonly modelVersion: string;
  readonly values: Readonly<Record<string, ModelValue>>;
}

export interface StrategyOutputSnapshotSet {
  readonly observationTime: ObservationTime;
  readonly receivedAt: string;
  readonly typhon?: StrategyOutputSnapshot;
  readonly psi40?: StrategyOutputSnapshot;
  readonly cerberus?: StrategyOutputSnapshot;
  readonly hydra?: StrategyOutputSnapshot;
  readonly champion?: StrategyOutputSnapshot;
}

export function mapStrategyAnalysesToModelOutputs(
  snapshots: StrategyOutputSnapshotSet,
): Readonly<Record<string, ModelOutputFrame>> {
  const frames = Object.fromEntries(
    (['typhon', 'psi40', 'cerberus', 'hydra', 'champion'] as const).flatMap((modelId) => {
      const snapshot = snapshots[modelId];
      if (snapshot === undefined) return [];
      const frame: ModelOutputFrame = {
        domain: 'model-output',
        modelId,
        points: [{ time: snapshots.observationTime, values: snapshot.values }],
        provenance: {
          sourceId: `${modelId}-strategy-adapter`,
          sourceType: 'protected-model-output',
          sourceRevision: `${snapshot.modelVersion}:${String(snapshots.observationTime)}`,
          modelVersion: snapshot.modelVersion,
          asOf: String(snapshots.observationTime),
          receivedAt: snapshots.receivedAt,
        },
      };
      return [[modelId, frame] as const];
    }),
  );
  return createIndicatorInputBundle({ modelOutputsById: frames }).modelOutputsById;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function voteFromSignal(signal: unknown): number | null {
  if (signal === 'BUY') return 1;
  if (typeof signal === 'string' && signal.startsWith('SELL')) return -1;
  if (signal === 'HOLD' || signal === 'NEUTRAL') return 0;
  return null;
}

interface StrategyAnalysisInput {
  readonly strategyId: string;
  readonly parameterVersion?: string;
  readonly rawResult?: unknown;
  readonly metrics: Readonly<{ alpha?: number | null }>;
}

interface StrategySnapshotExtractionInput {
  readonly observationTime: ObservationTime;
  readonly receivedAt: string;
  readonly champion: Readonly<{
    strategyId: string;
    alpha: number;
    analyses: readonly StrategyAnalysisInput[];
  }>;
  readonly psi40: Readonly<{ latestMasterIndex: number | null }>;
}

export function extractStrategyOutputSnapshots(
  input: StrategySnapshotExtractionInput,
): StrategyOutputSnapshotSet {
  const byId = new Map(input.champion.analyses.map((analysis) => [analysis.strategyId, analysis]));
  const typhonAnalysis = byId.get('psi');
  const cerberusAnalysis = byId.get('psi_v2');
  const hydraAnalysis = byId.get('hydra');
  const typhonRaw = asRecord(typhonAnalysis?.rawResult);
  const typhonSignals = Array.isArray(typhonRaw.signals) ? typhonRaw.signals : [];
  const typhonLatest = asRecord(typhonSignals.at(-1));
  const typhonMaster = finiteOrNull(typhonRaw.latestMasterIndex);
  const cerberusRaw = asRecord(cerberusAnalysis?.rawResult);
  const cerberusLatest = asRecord(cerberusRaw.latestSignal);
  const cerberusZone = finiteOrNull(cerberusLatest.psiZone)
    ?? finiteOrNull(cerberusRaw.latestMasterIndex);
  const hydraRaw = asRecord(hydraAnalysis?.rawResult);
  const hydraLatest = asRecord(hydraRaw.latestSignal);
  const hydraRegime = finiteOrNull(hydraLatest.continuousVal)
    ?? finiteOrNull(hydraRaw.latestMasterIndex);
  const psi40Score = finiteOrNull(input.psi40.latestMasterIndex);
  const winningAnalysis = byId.get(input.champion.strategyId);
  const winningAlpha = finiteOrNull(winningAnalysis?.metrics.alpha);
  const rankedAlphas = input.champion.analyses
    .map((analysis) => finiteOrNull(analysis.metrics.alpha))
    .filter((value): value is number => value !== null)
    .sort((left, right) => right - left);
  const alphaGap = rankedAlphas.length > 1 ? rankedAlphas[0]! - rankedAlphas[1]! : 0;

  return {
    observationTime: input.observationTime,
    receivedAt: input.receivedAt,
    typhon: typhonAnalysis !== undefined
      && typhonAnalysis.parameterVersion
      && typhonMaster !== null
      ? {
          modelVersion: typhonAnalysis.parameterVersion,
          values: {
            rawIndex: null,
            masterIndex: typhonMaster,
            adjustedIndex: finiteOrNull(typhonRaw.latestMasterIndexAdjusted),
            levelsCrossed: null,
            vote: voteFromSignal(typhonLatest.signal),
          },
        }
      : undefined,
    psi40: psi40Score === null
      ? undefined
      : {
          modelVersion: 'psi40-public-runner-v1',
          values: {
            score: psi40Score,
            categorySubscores: null,
            agreementCount: Math.round(Math.max(0, Math.min(100, psi40Score)) * 0.4),
          },
        },
    cerberus: cerberusAnalysis !== undefined
      && cerberusAnalysis.parameterVersion
      && cerberusZone !== null
      ? {
          modelVersion: cerberusAnalysis.parameterVersion,
          values: {
            zone: cerberusZone,
            up: finiteOrNull(cerberusLatest.psiUp),
            down: finiteOrNull(cerberusLatest.psiDown),
            regimeDirection: typeof cerberusLatest.regimeDirection === 'string'
              ? cerberusLatest.regimeDirection
              : null,
            stateChanges: typeof cerberusLatest.signal === 'string'
              ? cerberusLatest.signal
              : null,
            vote: voteFromSignal(cerberusLatest.signal),
          },
        }
      : undefined,
    hydra: hydraAnalysis !== undefined
      && hydraAnalysis.parameterVersion
      && hydraRegime !== null
      ? {
          modelVersion: hydraAnalysis.parameterVersion,
          values: {
            positionState: finiteOrNull(hydraLatest.hydraState) === null
              ? null
              : finiteOrNull(hydraLatest.hydraState) === 1 ? 'invested' : 'cash',
            regimeValue: hydraRegime >= 50 ? 'bullish' : 'bearish',
            dynamicTheta: finiteOrNull(hydraLatest.volatilityTheta),
            entryExitEvent: typeof hydraLatest.signal === 'string'
              ? hydraLatest.signal === 'BUY' || hydraLatest.signal === 'SELL'
              : null,
            vote: voteFromSignal(hydraLatest.signal),
          },
        }
      : undefined,
    champion: winningAnalysis !== undefined && winningAlpha !== null
      ? {
          modelVersion: 'champion-public-analysis-v1',
          values: {
            winningModel: input.champion.strategyId,
            alpha: winningAlpha,
            confidence: Math.max(0, Math.min(1, 0.5 + alphaGap / 200)),
            comparisonMetrics: rankedAlphas.length,
          },
        }
      : undefined,
  };
}

export async function buildStrategyOutputContext(
  frame: TimeSeriesFrame,
  symbol: string,
  receivedAt = new Date().toISOString(),
): Promise<Readonly<Record<string, ModelOutputFrame>>> {
  const last = frame.bars.at(-1);
  if (last === undefined) return {};
  const bars = frame.bars.map((bar) => ({
    date: String(bar.time), open: bar.open, high: bar.high, low: bar.low,
    close: bar.close, volume: bar.volume ?? 0,
  }));

  const [{ analyzeTickerChampion }, { runPsiStrategy }] = await Promise.all([
    import('@/lib/finance/strategy-analysis'),
    import('@ticknal/quant-engine'),
  ]);
  const champion = await analyzeTickerChampion(symbol, bars);
  const psi40 = runPsiStrategy(bars, {
    model: 'psi40', entryLevels: [14.6, 23.6, 38.2, 50, 61.8], useAym: false,
    aymMultiplier: null, aymLimit: null, useAtr: false, atrDistance: null,
    initialCapital: 100_000, startDate: bars[0]?.date ?? String(last.time),
  });

  return mapStrategyAnalysesToModelOutputs(extractStrategyOutputSnapshots({
    observationTime: last.time,
    receivedAt,
    champion,
    psi40,
  }));
}
