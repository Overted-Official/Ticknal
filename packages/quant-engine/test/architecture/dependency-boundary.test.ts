import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const CANONICAL_ROOT = resolve(TEST_DIRECTORY, '../../src/canonical');

const FORBIDDEN_IMPORTS = [
  /(^|\/)next(?:\/|$)/,
  /(^|\/)react(?:\/|$)/,
  /drizzle/i,
  /supabase/i,
  /lightweight-charts/i,
  /(^|\/)strategies(?:\/|$)/,
  /(^|\/)src\/indicators(?:\/|$)/,
  /(?:^|\/)(?:axios|node-fetch|undici)(?:\/|$)/i,
  /(?:^|\/)(?:database|db-client|network-client)(?:\/|$)/i,
] as const;

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory()
        ? listTypeScriptFiles(path)
        : path.endsWith('.ts')
          ? [path]
          : [];
    })
    .sort();
}

function importedSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

describe('canonical dependency boundary', () => {
  it('keeps canonical production modules independent from app and I/O layers', () => {
    const violations = listTypeScriptFiles(CANONICAL_ROOT).flatMap((file) =>
      importedSpecifiers(readFileSync(file, 'utf8'))
        .filter((specifier) => FORBIDDEN_IMPORTS.some((pattern) => pattern.test(specifier)))
        .map((specifier) => `${relative(CANONICAL_ROOT, file)} -> ${specifier}`),
    );

    expect(violations).toEqual([]);
  });
});
