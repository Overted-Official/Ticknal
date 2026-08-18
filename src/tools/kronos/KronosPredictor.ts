import path from 'path';
import { getOnnxRuntime, createSafeInferenceSession } from '@/lib/onnx-loader';

export class KronosPredictor {
  private sessionEnc: any = null;
  private sessionDecS1: any = null;
  private sessionDecS2: any = null;
  private sessionDec: any = null;
  private initialized = false;

  constructor() {}

  async init() {
    if (this.initialized) return;

    const ort = await getOnnxRuntime();
    if (!ort) {
      throw new Error('No ONNX runtime (native or WASM) available in this environment');
    }

    const modelsDir = path.join(process.cwd(), 'src', 'tools', 'kronos', 'models');

    this.sessionEnc = await createSafeInferenceSession(ort, path.join(modelsDir, 'tokenizer_encode.onnx'));
    this.sessionDecS1 = await createSafeInferenceSession(ort, path.join(modelsDir, 'model_decode_s1.onnx'));
    this.sessionDecS2 = await createSafeInferenceSession(ort, path.join(modelsDir, 'model_decode_s2.onnx'));
    this.sessionDec = await createSafeInferenceSession(ort, path.join(modelsDir, 'tokenizer_decode.onnx'));

    this.initialized = true;
  }

  /**
   * Helper to sample from logits using Temperature and Top-P (Nucleus) filtering
   */
  private sampleLogits(logits: Float32Array, temperature: number = 1.0, topP: number = 0.9): number {
    const vocabSize = logits.length;
    let maxLogit = -Infinity;
    
    // Apply temperature and find max for numerical stability
    const scaledLogits = new Float32Array(vocabSize);
    for (let i = 0; i < vocabSize; i++) {
      scaledLogits[i] = logits[i] / temperature;
      if (scaledLogits[i] > maxLogit) maxLogit = scaledLogits[i];
    }

    // Softmax
    let sumExp = 0;
    const probs = new Float32Array(vocabSize);
    for (let i = 0; i < vocabSize; i++) {
      probs[i] = Math.exp(scaledLogits[i] - maxLogit);
      sumExp += probs[i];
    }
    for (let i = 0; i < vocabSize; i++) {
      probs[i] /= sumExp;
    }

    // Top-P filtering
    if (topP < 1.0) {
      // Sort probabilities descending
      const sortedIndices = Array.from({ length: vocabSize }, (_, i) => i)
        .sort((a, b) => probs[b] - probs[a]);
      
      let cumulativeProb = 0;
      let cutoffIndex = vocabSize;
      
      for (let i = 0; i < vocabSize; i++) {
        cumulativeProb += probs[sortedIndices[i]];
        if (cumulativeProb > topP) {
          cutoffIndex = i + 1; // Keep up to this index
          break;
        }
      }
      
      // Zero out probabilities below cutoff
      for (let i = cutoffIndex; i < vocabSize; i++) {
        probs[sortedIndices[i]] = 0;
      }
      
      // Re-normalize
      let newSum = 0;
      for (let i = 0; i < vocabSize; i++) {
        newSum += probs[i];
      }
      for (let i = 0; i < vocabSize; i++) {
        probs[i] /= newSum;
      }
    }

    // Sample
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < vocabSize; i++) {
      cumulative += probs[i];
      if (r <= cumulative) return i;
    }
    return vocabSize - 1; // Fallback
  }

  /**
   * Run autoregressive prediction.
   */
  async predict(x: Float32Array, x_stamp: Float32Array, y_stamp: Float32Array, seq_len: number, pred_len: number): Promise<Float32Array> {
    if (!this.initialized) await this.init();
    const ort = await getOnnxRuntime();
    if (!ort) {
      throw new Error('No ONNX runtime (native or WASM) available in this environment');
    }

    const xTensor = new ort.Tensor('float32', x, [1, seq_len, 6]);

    // 1. Encode
    const encResult = await this.sessionEnc!.run({ x: xTensor });
    const s1Ids = encResult.s1_ids;
    const s2Ids = encResult.s2_ids;

    const s1Data = Array.from(s1Ids.data as BigInt64Array);
    const s2Data = Array.from(s2Ids.data as BigInt64Array);

    const xStampData = Array.from(x_stamp);
    const yStampData = Array.from(y_stamp);

    for (let step = 0; step < pred_len; step++) {
      // Build current stamp: x_stamp + y_stamp up to `step`
      const currentStampLen = seq_len + step;
      const currentStampData = new Float32Array(currentStampLen * 5);
      currentStampData.set(xStampData, 0);
      currentStampData.set(yStampData.slice(0, step * 5), seq_len * 5);
      const stampTensor = new ort.Tensor('float32', currentStampData, [1, currentStampLen, 5]);

      const s1IdsTensor = new ort.Tensor('int64', new BigInt64Array(s1Data), [1, s1Data.length]);
      const s2IdsTensor = new ort.Tensor('int64', new BigInt64Array(s2Data), [1, s2Data.length]);

      // 2. Decode S1
      const decS1Result = await this.sessionDecS1!.run({
        s1_ids: s1IdsTensor,
        s2_ids: s2IdsTensor,
        stamp: stampTensor
      });

      const s1Logits = decS1Result.s1_logits.data as Float32Array;
      const context = decS1Result.context;

      // Extract last token logits (vocab size 1024)
      const vocabSize = 1024;
      const lastTokenIdx = currentStampLen - 1;
      const lastS1Logits = s1Logits.subarray(lastTokenIdx * vocabSize, (lastTokenIdx + 1) * vocabSize);

      // Sample next S1 with temperature and Top-P
      const nextS1 = this.sampleLogits(lastS1Logits, 0.6, 0.90);
      s1Data.push(BigInt(nextS1));

      // 3. Decode S2
      const nextS1Tensor = new ort.Tensor('int64', new BigInt64Array([BigInt(nextS1)]), [1, 1]);
      const decS2Result = await this.sessionDecS2!.run({
        context: context,
        s1_ids: nextS1Tensor
      });

      const s2Logits = decS2Result.s2_logits.data as Float32Array;
      const lastS2Logits = s2Logits.subarray(0, vocabSize);

      // Sample next S2
      const nextS2 = this.sampleLogits(lastS2Logits, 0.6, 0.90);
      s2Data.push(BigInt(nextS2));
    }

    // 4. Decode full token sequence back to time series (preserving convolutional receptive field)
    const maxContext = 512;
    const totalTokens = s1Data.length;
    const contextStart = Math.max(0, totalTokens - maxContext);
    const decodeS1 = s1Data.slice(contextStart);
    const decodeS2 = s2Data.slice(contextStart);
    const decodeLen = decodeS1.length;

    const predS1Tensor = new ort.Tensor('int64', new BigInt64Array(decodeS1), [1, decodeLen]);
    const predS2Tensor = new ort.Tensor('int64', new BigInt64Array(decodeS2), [1, decodeLen]);

    const decResult = await this.sessionDec!.run({
      s1_ids: predS1Tensor,
      s2_ids: predS2Tensor
    });

    const allDecoded = decResult.x_pred.data as Float32Array; // shape: (1, decodeLen, 6)
    const predStart = (decodeLen - pred_len) * 6;
    return allDecoded.subarray(predStart, predStart + pred_len * 6);
  }
}
