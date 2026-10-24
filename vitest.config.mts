import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      '@ticknal/quant-engine/canonical': resolve(import.meta.dirname, 'packages/quant-engine/src/canonical/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // Most production tests live beside the code; keep the strategy release
    // regression suite in the default gate despite the support-folder rule.
    include: [
      'src/**/*.test.{ts,tsx}',
      'packages/**/*.test.{ts,tsx}',
      'apps/**/*.test.{ts,tsx}',
      '_technical_support/strategy-ship/**/*.test.{ts,tsx}',
      '_technical_support/strategy-ai/**/*.test.{ts,tsx}',
    ],
  },
});
