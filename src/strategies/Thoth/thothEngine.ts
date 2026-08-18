import * as ort from 'onnxruntime-node';
import path from 'path';
import fs from 'fs';
import { extractThothFeatures, type ThothBarFeatures } from './thothFeatureExtractor';
import type { PriceBar } from '../PSI/psiStrategy';

export interface ThothModelPrediction {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  direction: 'up' | 'down';
  predictedExhaustion: number; // 0.0 to 100.0%
  masterIndex: number;
}

interface ScalerParams {
  features: string[];
  up: { mean: number[]; scale: number[] };
  down: { mean: number[]; scale: number[] };
}

export class ThothEngine {
  private static instance: ThothEngine | null = null;
  private sessionUp: ort.InferenceSession | null = null;
  private sessionDown: ort.InferenceSession | null = null;
  private scalers: ScalerParams | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): ThothEngine {
    if (!ThothEngine.instance) {
      ThothEngine.instance = new ThothEngine();
    }
    return ThothEngine.instance;
  }

  public async initialize(): Promise<void> {
    if (this.sessionUp && this.sessionDown && this.scalers) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const modelsDir = path.join(process.cwd(), 'src', 'strategies', 'Thoth', 'models');
        const upPath = path.join(modelsDir, 'thoth_egx_macro_up.onnx');
        const downPath = path.join(modelsDir, 'thoth_egx_macro_down.onnx');
        const scalersPath = path.join(modelsDir, 'scalers_egx_macro.json');

        if (!fs.existsSync(upPath) || !fs.existsSync(downPath) || !fs.existsSync(scalersPath)) {
          throw new Error(`Thoth ONNX models or scalers missing in ${modelsDir}`);
        }

        const scalersContent = fs.readFileSync(scalersPath, 'utf-8');
        this.scalers = JSON.parse(scalersContent);

        // Load ONNX sessions
        this.sessionUp = await ort.InferenceSession.create(upPath);
        this.sessionDown = await ort.InferenceSession.create(downPath);
      } catch (err) {
        this.initPromise = null;
        console.error('[ThothEngine] Failed to initialize ONNX sessions:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  /**
   * Runs end-to-end Thoth inference on historical price bars.
   */
  public async predict(bars: PriceBar[]): Promise<ThothModelPrediction[]> {
    await this.initialize();
    if (!this.sessionUp || !this.sessionDown || !this.scalers) {
      throw new Error('ThothEngine not initialized');
    }

    const featureBars = extractThothFeatures(bars);
    if (featureBars.length === 0) return [];

    const seqLen = 120;
    const numFeatures = 18;
    const results: ThothModelPrediction[] = [];

    // Separate directional feature history
    const upBars: { idx: number; feat: number[] }[] = [];
    const downBars: { idx: number; feat: number[] }[] = [];

    for (let i = 0; i < featureBars.length; i++) {
      if (featureBars[i].direction === 'up') {
        upBars.push({ idx: i, feat: featureBars[i].features });
      } else {
        downBars.push({ idx: i, feat: featureBars[i].features });
      }
    }

    const predictions = new Float32Array(featureBars.length);
    predictions.fill(0.0); // Default to 0.0 before sequence window is filled

    // 1. Infer UP directional sequences
    if (upBars.length >= seqLen) {
      const validUpCount = upBars.length - seqLen + 1;
      const inputBuffer = new Float32Array(validUpCount * seqLen * numFeatures);

      for (let b = 0; b < validUpCount; b++) {
        for (let s = 0; s < seqLen; s++) {
          const feat = upBars[b + s].feat;
          const destOffset = (b * seqLen + s) * numFeatures;
          for (let f = 0; f < numFeatures; f++) {
            inputBuffer[destOffset + f] = (feat[f] - this.scalers.up.mean[f]) / this.scalers.up.scale[f];
          }
        }
      }

      const inputTensor = new ort.Tensor('float32', inputBuffer, [validUpCount, seqLen, numFeatures]);
      const output = await this.sessionUp.run({ input_sequences: inputTensor });
      const outData = output.predicted_exhaustion.data as Float32Array;

      for (let b = 0; b < validUpCount; b++) {
        const origIdx = upBars[b + seqLen - 1].idx;
        predictions[origIdx] = Math.max(0.0, Math.min(100.0, outData[b]));
      }
    }

    // 2. Infer DOWN directional sequences
    if (downBars.length >= seqLen) {
      const validDownCount = downBars.length - seqLen + 1;
      const inputBuffer = new Float32Array(validDownCount * seqLen * numFeatures);

      for (let b = 0; b < validDownCount; b++) {
        for (let s = 0; s < seqLen; s++) {
          const feat = downBars[b + s].feat;
          const destOffset = (b * seqLen + s) * numFeatures;
          for (let f = 0; f < numFeatures; f++) {
            inputBuffer[destOffset + f] = (feat[f] - this.scalers.down.mean[f]) / this.scalers.down.scale[f];
          }
        }
      }

      const inputTensor = new ort.Tensor('float32', inputBuffer, [validDownCount, seqLen, numFeatures]);
      const output = await this.sessionDown.run({ input_sequences: inputTensor });
      const outData = output.predicted_exhaustion.data as Float32Array;

      for (let b = 0; b < validDownCount; b++) {
        const origIdx = downBars[b + seqLen - 1].idx;
        predictions[origIdx] = Math.max(0.0, Math.min(100.0, outData[b]));
      }
    }

    // Build final results
    for (let i = 0; i < featureBars.length; i++) {
      results.push({
        date: featureBars[i].date,
        close: featureBars[i].close,
        open: featureBars[i].open,
        high: featureBars[i].high,
        low: featureBars[i].low,
        direction: featureBars[i].direction,
        predictedExhaustion: Number(predictions[i].toFixed(2)),
        masterIndex: featureBars[i].features[15] ?? 50.0,
      });
    }

    return results;
  }

  /**
   * Fast single-bar inference on latest sequence.
   */
  public async predictLatest(bars: PriceBar[]): Promise<ThothModelPrediction | null> {
    const all = await this.predict(bars);
    return all.length > 0 ? all[all.length - 1] : null;
  }
}
