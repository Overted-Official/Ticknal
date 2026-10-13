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
    // _technical_support contains task-specific probes and retired UI test harnesses.
    // Production unit tests live beside the code they verify.
    include: [
      'src/**/*.test.{ts,tsx}',
      'packages/**/*.test.{ts,tsx}',
      'apps/**/*.test.{ts,tsx}',
    ],
  },
});
