import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { PriceBar, PsiBacktestResult, PsiMetrics, PsiSignal } from "../PSI/psiStrategy";

const DEPLOY_DIR = path.join(process.cwd(), "src", "strategies", "QuantumExhaustion-v2", "deploy");
const SUPPORTED_SCHEMA_VERSION = 2;

type DeploymentManifest = {
  schemaVersion: number;
  modelVersion: string;
  status: "research" | "promoted";
  generatedAt: string | null;
  asOfDate: string | null;
  maxStalenessDays: number;
  scoreHashes?: Record<string, string>;
};

export type QeV2Score = {
  ticker: string;
  date: string;
  psi40: number;
  psi_direction: number;
  exhaustion_percentile: number;
  reversal_probability_3: number;
  reversal_probability_5: number;
  reversal_probability_10: number;
  expected_return_5: number;
  expected_return_10: number;
  expected_return_20: number;
  barrier_probability: number;
  expected_mfe_10: number;
  expected_mae_10: number;
  prediction_uncertainty: number;
  target_position: 0 | 1;
  reason: string;
};

export type QeV2Signal = PsiSignal & {
  reversalProbability3: number;
  reversalProbability5: number;
  reversalProbability10: number;
  expectedReturn5: number;
  expectedReturn10: number;
  expectedReturn20: number;
  uncertainty: number;
  exhaustionPercentile: number;
  targetPosition: 0 | 1;
  reason: string;
  asOfDate: string;
};

export class QeV2DeploymentError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "QeV2DeploymentError";
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function sha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function loadScores(ticker: string, latestBarDate?: string): { manifest: DeploymentManifest; scores: QeV2Score[] } {
  const manifestPath = path.join(DEPLOY_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new QeV2DeploymentError("QE-v2 has no deployment manifest", 503);
  }
  const manifest = readJson<DeploymentManifest>(manifestPath);
  if (manifest.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new QeV2DeploymentError("QE-v2 deployment schema is incompatible", 503);
  }
  if (manifest.status !== "promoted") {
    throw new QeV2DeploymentError("QE-v2 remains research-only until every promotion gate passes", 503);
  }
  if (!manifest.asOfDate) {
    throw new QeV2DeploymentError("QE-v2 deployment has no as-of date", 503);
  }
  const asOfDate = manifest.asOfDate;
  const ageMs = Date.now() - Date.parse(`${asOfDate}T23:59:59Z`);
  if (ageMs > manifest.maxStalenessDays * 86_400_000 || (latestBarDate && asOfDate < latestBarDate)) {
    throw new QeV2DeploymentError("QE-v2 deployment scores are stale", 503);
  }
  const relativePath = `scores/${ticker}.json`;
  const scorePath = path.join(DEPLOY_DIR, "scores", `${ticker}.json`);
  if (!fs.existsSync(scorePath)) {
    throw new QeV2DeploymentError(`QE-v2 has no scores for ${ticker}`, 404);
  }
  const expectedHash = manifest.scoreHashes?.[relativePath];
  if (!expectedHash || sha256(scorePath) !== expectedHash) {
    throw new QeV2DeploymentError(`QE-v2 score artifact failed its hash check for ${ticker}`, 503);
  }
  return { manifest, scores: readJson<QeV2Score[]>(scorePath) };
}

export function runQeV2Strategy(
  ticker: string,
  bars: PriceBar[],
  startDate: string,
  endDate?: string,
): { signals: QeV2Signal[]; scores: QeV2Score[]; latestMasterIndex: number | null; latestMasterIndexAdjusted: number | null; modelVersion: string; asOfDate: string } {
  const latestBarDate = bars.at(-1)?.date;
  const { manifest, scores } = loadScores(ticker, latestBarDate);
  const asOfDate = manifest.asOfDate;
  if (!asOfDate) throw new QeV2DeploymentError("QE-v2 deployment has no as-of date", 503);
  const barByDate = new Map(bars.map((bar) => [bar.date, bar]));
  const selected = scores.filter((score) => score.date >= startDate && (!endDate || score.date <= endDate));
  const signals: QeV2Signal[] = [];
  let previousTarget: 0 | 1 = 0;
  for (const score of selected) {
    if (score.target_position === previousTarget) continue;
    const bar = barByDate.get(score.date);
    if (!bar) continue;
    const buying = score.target_position === 1;
    signals.push({
      date: score.date,
      signal: buying ? "BUY" : "SELL_STRUCT",
      confidence: score.reversal_probability_5 * 100,
      price: bar.close,
      masterIndex: score.psi40,
      masterIndexAdjusted: score.exhaustion_percentile,
      medianDailyMove: null,
      entryReason: buying ? score.reason : undefined,
      exitReason: buying ? undefined : score.reason,
      modelVersion: manifest.modelVersion,
      reversalProbability3: score.reversal_probability_3,
      reversalProbability5: score.reversal_probability_5,
      reversalProbability10: score.reversal_probability_10,
      expectedReturn5: score.expected_return_5,
      expectedReturn10: score.expected_return_10,
      expectedReturn20: score.expected_return_20,
      uncertainty: score.prediction_uncertainty,
      exhaustionPercentile: score.exhaustion_percentile,
      targetPosition: score.target_position,
      reason: score.reason,
      asOfDate,
    });
    previousTarget = score.target_position;
  }
  return {
    signals,
    scores: selected,
    latestMasterIndex: selected.at(-1)?.psi40 ?? null,
    latestMasterIndexAdjusted: selected.at(-1)?.exhaustion_percentile ?? null,
    modelVersion: manifest.modelVersion,
    asOfDate,
  };
}

export function simulateQeV2Performance(
  bars: PriceBar[], scores: QeV2Score[], startDate: string, endDate?: string, initialCapital = 100_000,
): PsiBacktestResult {
  const selectedBars = bars.filter((bar) => bar.date >= startDate && (!endDate || bar.date <= endDate));
  const scoresByDate = new Map(scores.map((score) => [score.date, score]));
  let cash = initialCapital;
  let shares = 0;
  let pendingTarget: 0 | 1 | null = 1;
  let entryPrice = 0;
  let entryIndex = 0;
  let peak = initialCapital;
  let maxDrawdown = 0;
  const returns: number[] = [];
  const holdingPeriods: number[] = [];
  for (let index = 0; index < selectedBars.length; index += 1) {
    const bar = selectedBars[index];
    if (pendingTarget === 1 && shares === 0) {
      shares = cash / bar.open;
      cash = 0;
      entryPrice = bar.open;
      entryIndex = index;
    } else if (pendingTarget === 0 && shares > 0) {
      cash = shares * bar.open;
      returns.push(bar.open / entryPrice - 1);
      holdingPeriods.push(index - entryIndex);
      shares = 0;
    }
    pendingTarget = null;
    const score = scoresByDate.get(bar.date);
    if (score && score.target_position !== (shares > 0 ? 1 : 0)) pendingTarget = score.target_position;
    const equity = cash + shares * bar.close;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak > 0 ? (peak - equity) / peak : 0);
  }
  const finalBar = selectedBars.at(-1);
  const finalEquity = finalBar ? cash + shares * finalBar.close : initialCapital;
  const years = Math.max(selectedBars.length / 252, 1 / 252);
  const sysRoi = (finalEquity / initialCapital - 1) * 100;
  const buyHoldRoi = selectedBars.length > 1 ? (selectedBars.at(-1)!.close / selectedBars[0].open - 1) * 100 : 0;
  const metrics: PsiMetrics = {
    sysRoi,
    buyHoldRoi,
    roiMargin: sysRoi - buyHoldRoi,
    trades: returns.length,
    winRate: returns.length ? returns.filter((value) => value > 0).length / returns.length * 100 : 0,
    maxDrawdown: maxDrawdown * 100,
    maxAdverseExcursion: 0,
    avgAdverseExcursion: 0,
    avgFavorableExcursion: 0,
    annualCagr: (Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100,
    avgReturnPerTrade: returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length * 100 : 0,
    avgBarsPerTrade: holdingPeriods.length ? holdingPeriods.reduce((sum, value) => sum + value, 0) / holdingPeriods.length : 0,
    currentBalance: finalEquity,
  };
  return { metrics, signals: [], latestMasterIndex: null, latestMasterIndexAdjusted: null };
}
