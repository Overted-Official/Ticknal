import fs from "fs";
import path from "path";
import { normalizeTickerSymbol, resolvePsiParams, type PsiStrategyParams } from "@/lib/psiStrategy";

const BEST_COMBINATION_FILES = [
  path.join(process.cwd(), "Data", "psi_best_combinations.csv"),
  path.join(process.cwd(), "Data", "psi_egx30_best_combinations.csv"),
  path.join(process.cwd(), "Data", "psi_comi_best_combination.csv"),
];

const ENTRY_LEVEL_COLUMNS: Array<[keyof CsvRow, number]> = [
  ["L-14.6", 14.6],
  ["L-23.6", 23.6],
  ["L-38.2", 38.2],
  ["L-50.0", 50.0],
  ["L-61.8", 61.8],
];

type CsvRow = Record<string, string | undefined>;

export function resolvePsiParamsFromStore(
  symbol: string,
  overrides: Partial<PsiStrategyParams> = {},
): PsiStrategyParams {
  const optimizedParams = readOptimizedParams(symbol);
  return resolvePsiParams(symbol, { ...(optimizedParams ?? {}), ...overrides });
}

function readOptimizedParams(symbol: string): Partial<PsiStrategyParams> | null {
  const ticker = normalizeTickerSymbol(symbol);

  for (const filePath of BEST_COMBINATION_FILES) {
    const csvText = readCsvFile(filePath);
    if (!csvText) continue;

    const rows = parseCsvText(csvText);
    const row = rows.find((candidate) => normalizeTickerSymbol(candidate.ticker_id ?? "") === ticker);
    if (row) return rowToParams(row);
  }

  return null;
}

function readCsvFile(filePath: string): string | null {
  try {
    return fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf8");
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") return null;
    throw error;
  }
}

function parseCsvText(csvText: string): CsvRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index];
      return row;
    }, {});
  });
}

function rowToParams(row: CsvRow): Partial<PsiStrategyParams> {
  const entryLevels = ENTRY_LEVEL_COLUMNS.filter(([column]) => isTrue(row[column])).map(([, level]) => level);
  const useAym = isTrue(row["Use AYM"]);
  const useAtr = isTrue(row["Use ATR"]);
  const useStoploss = isTrue(row["Use Stoploss"]);

  return {
    ...(entryLevels.length > 0 ? { entryLevels } : {}),
    useAym,
    aymMultiplier: useAym ? toNumber(row["AYM TP Multiplier"]) : null,
    aymLimit: useAym ? toNumber(row["AYM Limit"]) : null,
    useAtr,
    atrDistance: useAtr ? toNumber(row["ATR Distance"]) : null,
    useStoploss,
    stoplossLevel: useStoploss ? toNumber(row["Stoploss Level"]) : null,
    useStructStop: false,
  };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function isTrue(value: string | undefined): boolean {
  return value?.trim().toUpperCase() === "TRUE";
}

function toNumber(value: string | undefined): number | null {
  if (!value || value.trim().toLowerCase() === "null") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
