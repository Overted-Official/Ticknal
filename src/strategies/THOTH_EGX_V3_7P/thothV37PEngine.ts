import fs from 'fs';
import path from 'path';

import { createSafeInferenceSession, getOnnxRuntime } from '@/lib/onnx-loader';
import type { PriceBar } from '@/strategies/PSI/psiStrategy';

import {
  enrichThothV37Features,
  extractThothFeatures,
  THOTH_FEATURE_COUNT,
  type ThothV37DeltaCalibration,
  type ThothV37Direction,
} from './thothPsi8FeatureExtractor';

type DirectionalScaler = {
  mean: number[];
  scale: number[];
};

type ThothV37PArtifactConfig = {
  version: string;
  seq_len_up: number;
  seq_len_down: number;
  scalers: {
    up: DirectionalScaler;
    down: DirectionalScaler;
  };
  validation_selected_thresholds: {
    down_buy_dip_min_exhaustion: number;
    up_exit_peak_min_exhaustion: number;
  };
};

export interface ThothV37PPrediction {
  date: string;
  direction: ThothV37Direction;
  predictedExhaustion: number | null;
  psiIndexValue: number;
  deltaPercentile: number;
  reversalHazardNextBar: number;
  convictionScore: number | null;
}

type RuntimeState = {
  ort: any;
  sessionUp: any;
  sessionDown: any;
  config: ThothV37PArtifactConfig;
  calibration: ThothV37DeltaCalibration;
};

const ARTIFACTS_DIR = path.join(
  process.cwd(),
  'src',
  'strategies',
  'THOTH_EGX_V3_7P',
  'artifacts',
  'models',
);

const MODEL_PATHS = {
  up: path.join(ARTIFACTS_DIR, 'thoth_egx_v3_7P_up.onnx'),
  down: path.join(ARTIFACTS_DIR, 'thoth_egx_v3_7P_down.onnx'),
  scalers: path.join(ARTIFACTS_DIR, 'scalers_egx_v3_7P.json'),
  calibration: path.join(ARTIFACTS_DIR, 'thoth_egx_v3_7P_delta_calibration.json'),
} as const;

const EXPECTED_VERSION = '3.7-psi8-lookback-synthesis-21-126';
const EXPECTED_CALIBRATION_VERSION = '3.7-psi8-historical-delta-calibration';
const INFERENCE_BATCH_SIZE = 128;

function readJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`THOTH EGX V3.7P artifact is missing: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function validateScaler(name: string, scaler: DirectionalScaler): void {
  if (
    !scaler ||
    scaler.mean.length !== THOTH_FEATURE_COUNT ||
    scaler.scale.length !== THOTH_FEATURE_COUNT ||
    scaler.mean.some((value) => !Number.isFinite(value)) ||
    scaler.scale.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error(`Invalid ${name} scaler in the frozen THOTH EGX V3.7P package.`);
  }
}

function validateArtifacts(
  config: ThothV37PArtifactConfig,
  calibration: ThothV37DeltaCalibration,
): void {
  if (config.version !== EXPECTED_VERSION) {
    throw new Error(`Unexpected THOTH scaler version: ${config.version}`);
  }
  if (config.seq_len_up !== 21 || config.seq_len_down !== 126) {
    throw new Error('THOTH EGX V3.7P requires UP=21 and DOWN=126 sequence lengths.');
  }
  if (calibration.version !== EXPECTED_CALIBRATION_VERSION) {
    throw new Error(`Unexpected THOTH calibration version: ${calibration.version}`);
  }
  validateScaler('UP', config.scalers.up);
  validateScaler('DOWN', config.scalers.down);
}

function calculateConviction(
  predictedExhaustion: number,
  deltaPercentile: number,
  reversalHazardNextBar: number,
): number {
  const score =
    predictedExhaustion * 0.6 +
    deltaPercentile * 0.25 +
    Math.min(reversalHazardNextBar * 5, 100) * 0.15;
  return Number(score.toFixed(2));
}

export class ThothV37PEngine {
  private runtime: RuntimeState | null = null;
  private loading: Promise<RuntimeState> | null = null;

  private async load(): Promise<RuntimeState> {
    if (this.runtime) return this.runtime;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const config = readJson<ThothV37PArtifactConfig>(MODEL_PATHS.scalers);
      const calibration = readJson<ThothV37DeltaCalibration>(MODEL_PATHS.calibration);
      validateArtifacts(config, calibration);

      const ort = await getOnnxRuntime();
      if (!ort) throw new Error('No ONNX runtime is available for THOTH EGX V3.7P.');

      const [sessionUp, sessionDown] = await Promise.all([
        createSafeInferenceSession(ort, MODEL_PATHS.up),
        createSafeInferenceSession(ort, MODEL_PATHS.down),
      ]);

      const runtime = { ort, sessionUp, sessionDown, config, calibration };
      this.runtime = runtime;
      return runtime;
    })();

    try {
      return await this.loading;
    } finally {
      this.loading = null;
    }
  }

  public async predict(
    bars: PriceBar[],
    endpointStartDate?: string,
  ): Promise<ThothV37PPrediction[]> {
    if (bars.length === 0) return [];

    const runtime = await this.load();
    const featureBars = extractThothFeatures(bars);
    const requestedStartIndex = endpointStartDate
      ? featureBars.findIndex((bar) => bar.date >= endpointStartDate)
      : 0;
    const endpointStartIndex = requestedStartIndex >= 0 ? requestedStartIndex : featureBars.length;
    const enrichmentStartIndex = Math.max(
      0,
      endpointStartIndex - runtime.config.seq_len_down + 1,
    );
    const enrichedDown = new Array<number[]>(featureBars.length);
    const enrichedUp = new Array<number[]>(featureBars.length);
    for (let index = enrichmentStartIndex; index < featureBars.length; index += 1) {
      enrichedDown[index] = enrichThothV37Features(
        featureBars[index].featuresDown,
        'down',
        runtime.calibration,
      );
      enrichedUp[index] = enrichThothV37Features(
        featureBars[index].featuresUp,
        'up',
        runtime.calibration,
      );
    }
    const predicted = new Array<number | null>(featureBars.length).fill(null);

    const runDirection = async (
      direction: ThothV37Direction,
      session: any,
      sequenceLength: number,
      scaler: DirectionalScaler,
      featureRows: number[][],
    ) => {
      const endpoints: number[] = [];
      for (
        let i = Math.max(sequenceLength - 1, endpointStartIndex);
        i < featureBars.length;
        i += 1
      ) {
        if (featureBars[i].direction === direction) endpoints.push(i);
      }

      for (let offset = 0; offset < endpoints.length; offset += INFERENCE_BATCH_SIZE) {
        const batchEndpoints = endpoints.slice(offset, offset + INFERENCE_BATCH_SIZE);
        const input = new Float32Array(
          batchEndpoints.length * sequenceLength * THOTH_FEATURE_COUNT,
        );

        for (let batchIndex = 0; batchIndex < batchEndpoints.length; batchIndex += 1) {
          const endpoint = batchEndpoints[batchIndex];
          const start = endpoint - sequenceLength + 1;
          for (let sequenceIndex = 0; sequenceIndex < sequenceLength; sequenceIndex += 1) {
            const row = featureRows[start + sequenceIndex];
            for (let featureIndex = 0; featureIndex < THOTH_FEATURE_COUNT; featureIndex += 1) {
              const scale = scaler.scale[featureIndex] || 1;
              const targetIndex =
                (batchIndex * sequenceLength + sequenceIndex) * THOTH_FEATURE_COUNT + featureIndex;
              input[targetIndex] = (row[featureIndex] - scaler.mean[featureIndex]) / scale;
            }
          }
        }

        const tensor = new runtime.ort.Tensor('float32', input, [
          batchEndpoints.length,
          sequenceLength,
          THOTH_FEATURE_COUNT,
        ]);
        const output = await session.run({ input_sequences: tensor });
        const values = output.predicted_exhaustion?.data as ArrayLike<number> | undefined;
        if (!values || values.length !== batchEndpoints.length) {
          throw new Error(`Invalid ${direction.toUpperCase()} output from THOTH EGX V3.7P.`);
        }

        for (let batchIndex = 0; batchIndex < batchEndpoints.length; batchIndex += 1) {
          const value = Number(values[batchIndex]);
          if (!Number.isFinite(value)) {
            throw new Error(`Non-finite ${direction.toUpperCase()} THOTH prediction.`);
          }
          predicted[batchEndpoints[batchIndex]] = Math.max(0, Math.min(100, value));
        }
      }
    };

    await runDirection(
      'up',
      runtime.sessionUp,
      runtime.config.seq_len_up,
      runtime.config.scalers.up,
      enrichedUp,
    );
    await runDirection(
      'down',
      runtime.sessionDown,
      runtime.config.seq_len_down,
      runtime.config.scalers.down,
      enrichedDown,
    );

    return featureBars.slice(enrichmentStartIndex).map((bar, relativeIndex) => {
      const index = enrichmentStartIndex + relativeIndex;
      const directionalFeatures = bar.direction === 'down' ? enrichedDown[index] : enrichedUp[index];
      const exhaustion = predicted[index];
      const deltaPercentile = directionalFeatures[18];
      const reversalHazardNextBar = directionalFeatures[19];
      return {
        date: bar.date,
        direction: bar.direction,
        predictedExhaustion: exhaustion,
        psiIndexValue: directionalFeatures[15],
        deltaPercentile,
        reversalHazardNextBar,
        convictionScore:
          bar.direction === 'down' && exhaustion !== null
            ? calculateConviction(exhaustion, deltaPercentile, reversalHazardNextBar)
            : null,
      };
    });
  }
}

export const thothV37PEngine = new ThothV37PEngine();
