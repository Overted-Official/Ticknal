import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const root = resolve(import.meta.dirname, '../..');

export default defineConfig({
  resolve: { alias: { '@': resolve(root, 'src'), '@ticknal/quant-engine/canonical': resolve(root, 'packages/quant-engine/src/canonical/index.ts') } },
  test: { environment: 'node', include: ['_technical_support/strategy-ship/**/*.test.{ts,tsx}'] },
});
