import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

let ortModule: any = null;

export async function getOnnxRuntime() {
  if (ortModule) return ortModule;

  // 1. Try native onnxruntime-node
  try {
    throw new Error('Forcing fallback');
    ortModule = await import('onnxruntime-node');
    return ortModule;
  } catch (nodeErr) {
    // 2. Fall back cleanly to onnxruntime-web (WebAssembly engine)
    try {
      // @ts-ignore
      ortModule = await import('onnxruntime-web');

      if (ortModule.env?.wasm) {
        const distDir = path.join(process.cwd(), 'node_modules', 'onnxruntime-web', 'dist');
        if (fs.existsSync(distDir)) {
          const distUrl = pathToFileURL(distDir).href + '/';
          ortModule.env.wasm.wasmPaths = distUrl;
        }
        ortModule.env.wasm.numThreads = 1;
      }

      return ortModule;
    } catch (webErr) {
      console.warn('[ONNX Loader] Failed to load ONNX runtime:', (webErr as Error).message);
      return null;
    }
  }
}

/**
 * Creates an InferenceSession safely across Node native and WASM web runtimes.
 * Reading buffer ensures seamless compatibility across both onnxruntime-node and onnxruntime-web.
 */
export async function createSafeInferenceSession(ort: any, filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`ONNX model file not found at ${filePath}`);
  }
  const buffer = fs.readFileSync(filePath);
  return await ort.InferenceSession.create(buffer);
}
