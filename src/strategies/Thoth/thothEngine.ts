import path from 'path';
import fs from 'fs';
import { extractThothFeatures } from './thothFeatureExtractor';
import type { PriceBar } from '../PSI/psiStrategy';
import { getOnnxRuntime, createSafeInferenceSession } from '@/lib/onnx-loader';

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

/**
 * Chunk size for streamed ONNX inference.
 * 32 windows × 120 seqLen × 18 features = 69,120 floats ≈ 270 KB per direction per chunk.
 * This keeps peak memory well within Vercel's serverless limit (was OOM-ing at ~11 MB+ per pass).
 */
const INFERENCE_CHUNK_SIZE = 32;

export class ThothEngine {
  private static instance: ThothEngine | null = null;
  private sessionUp: any = null;
  private sessionDown: any = null;
  private scalers: ScalerParams | null = null;
  private initPromise: Promise<void> | null = null;
  private isAvailable: boolean = true;

  private constructor() {}

  public static getInstance(): ThothEngine {
    if (!ThothEngine.instance) {
      ThothEngine.instance = new ThothEngine();
    }
    return ThothEngine.instance;
  }

  public async initialize(): Promise<void> {
    if (!this.isAvailable) return;
    if (this.sessionUp && this.sessionDown && this.scalers) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const ort = await getOnnxRuntime();
        if (!ort) {
          this.isAvailable = false;
          return;
        }

        const modelsDir = path.join(process.cwd(), 'src', 'strategies', 'Thoth', 'models');
        const upPath = path.join(modelsDir, 'thoth_egx_macro_up.onnx');
        const downPath = path.join(modelsDir, 'thoth_egx_macro_down.onnx');
        const scalersPath = path.join(modelsDir, 'scalers_egx_macro.json');

        if (!fs.existsSync(upPath) || !fs.existsSync(downPath) || !fs.existsSync(scalersPath)) {
          console.warn(`[ThothEngine] Models or scalers missing at ${modelsDir}`);
          this.isAvailable = false;
          return;
        }

        this.scalers = JSON.parse(fs.readFileSync(scalersPath, 'utf-8'));
        this.sessionUp = await createSafeInferenceSession(ort, upPath);
        this.sessionDown = await createSafeInferenceSession(ort, downPath);
      } catch (err) {
        this.isAvailable = false;
        console.warn('[ThothEngine] Failed to initialize ONNX sessions (gracefully disabling Thoth AI inference):', (err as Error).message);
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Runs chunked Thoth inference on historical price bars.
   * Instead of one monolithic Float32Array per direction (which caused OOM),
   * we process INFERENCE_CHUNK_SIZE windows at a time, keeping peak allocation ~270 KB.
   */
  public async predict(bars: PriceBar[]): Promise<ThothModelPrediction[]> {
    await this.initialize();
    const ort = await getOnnxRuntime();
    if (!this.isAvailable || !this.sessionUp || !this.sessionDown || !this.scalers || !ort) {
      return [];
    }

    const featureBars = extractThothFeatures(bars);
    if (featureBars.length === 0) return [];

    const seqLen = 120;
    const numFeatures = 18;
    const predictions = new Float32Array(featureBars.length);
    // Default 0.0 — bars before the first full window will have no prediction

    // Partition bars by direction
    const upBars: { idx: number; feat: number[] }[] = [];
    const downBars: { idx: number; feat: number[] }[] = [];

    for (let i = 0; i < featureBars.length; i++) {
      if (featureBars[i].direction === 'up') {
        upBars.push({ idx: i, feat: featureBars[i].features });
      } else {
        downBars.push({ idx: i, feat: featureBars[i].features });
      }
    }

    /**
     * Runs chunked inference for a single direction.
     * Each chunk allocates: CHUNK_SIZE × seqLen × numFeatures = max ~270 KB.
     */
    const runChunked = async (
      session: any,
      dirBars: { idx: number; feat: number[] }[],
      scalerMean: number[],
      scalerScale: number[]
    ) => {
      const validCount = dirBars.length - seqLen + 1;
      if (validCount <= 0) return;

      for (let chunkStart = 0; chunkStart < validCount; chunkStart += INFERENCE_CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + INFERENCE_CHUNK_SIZE, validCount);
        const chunkSize = chunkEnd - chunkStart;

        const inputBuffer = new Float32Array(chunkSize * seqLen * numFeatures);

        for (let b = 0; b < chunkSize; b++) {
          for (let s = 0; s < seqLen; s++) {
            const feat = dirBars[chunkStart + b + s].feat;
            const destOffset = (b * seqLen + s) * numFeatures;
            for (let f = 0; f < numFeatures; f++) {
              const scale = scalerScale[f] !== 0 ? scalerScale[f] : 1;
              inputBuffer[destOffset + f] = (feat[f] - scalerMean[f]) / scale;
            }
          }
        }

        try {
          const inputTensor = new ort.Tensor('float32', inputBuffer, [chunkSize, seqLen, numFeatures]);
          const output = await session.run({ input_sequences: inputTensor });
          const outData = output.predicted_exhaustion.data as Float32Array;

          for (let b = 0; b < chunkSize; b++) {
            const origIdx = dirBars[chunkStart + b + seqLen - 1].idx;
            predictions[origIdx] = Math.max(0.0, Math.min(100.0, outData[b]));
          }
        } catch (runErr) {
          console.warn('[ThothEngine] Chunk inference failed:', (runErr as Error).message);
        }
      }
    };

    // 1. UP direction — chunked
    if (upBars.length >= seqLen) {
      await runChunked(this.sessionUp, upBars, this.scalers.up.mean, this.scalers.up.scale);
    }

    // 2. DOWN direction — chunked
    if (downBars.length >= seqLen) {
      await runChunked(this.sessionDown, downBars, this.scalers.down.mean, this.scalers.down.scale);
    }

    // Build final results array
    const results: ThothModelPrediction[] = [];
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
   * Convenience: run predict on all bars, return only the last prediction.
   */
  public async predictLatest(bars: PriceBar[]): Promise<ThothModelPrediction | null> {
    const all = await this.predict(bars);
    return all.length > 0 ? all[all.length - 1] : null;
  }
}
