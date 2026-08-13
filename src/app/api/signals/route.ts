import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyPrices } from "@/db/schema";
import { resolvePsiParamsWithSource } from "@/strategies/PSI/psiParameterStore";
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar } from "@/strategies/PSI/psiStrategy";
import { runQeStrategy } from "@/strategies/QuantumExhaustion/qeStrategy";
import { QeV2DeploymentError, runQeV2Strategy } from "@/strategies/QuantumExhaustion-v2/qeV2Strategy";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    const ticker = normalizeTickerSymbol(symbol);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const strategy = searchParams.get("strategy") ?? "psi";
    const buyThreshold = Number(searchParams.get("buyThreshold") ?? 75);
    const sellThreshold = Number(searchParams.get("sellThreshold") ?? 75);
    const startDate = searchParams.get("start") ?? "2021-01-01";
    const endDate = searchParams.get("end") ?? undefined;

    const rows = await db
      .select()
      .from(dailyPrices)
      .where(eq(dailyPrices.tickerSymbol, ticker))
      .orderBy(asc(dailyPrices.date));

    const bars: PriceBar[] = rows
      .map((record) => ({
        date: typeof record.date === "string" ? record.date.split("T")[0] : new Date(record.date as Date).toISOString().split("T")[0],
        open: Number(record.open),
        high: Number(record.high),
        low: Number(record.low),
        close: Number(record.close),
        volume: Number(record.volume ?? 0),
      }))
      .filter((bar) => bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0);

    if (bars.length < 260 && strategy === "psi") {
      return NextResponse.json({ signals: [], latestMasterIndex: null, latestMasterIndexAdjusted: null });
    }

    let result: { signals: any[]; latestMasterIndex: number | null; latestMasterIndexAdjusted: number | null; parameterSource?: any };
    let qeV2Details: Record<string, unknown> | undefined;
    
    if (strategy === "quantum_exhaustion_v2") {
      const qeV2Result = runQeV2Strategy(ticker, bars, startDate, endDate);
      result = {
        signals: qeV2Result.signals,
        latestMasterIndex: qeV2Result.latestMasterIndex,
        latestMasterIndexAdjusted: qeV2Result.latestMasterIndexAdjusted,
        parameterSource: `${qeV2Result.modelVersion} (locked policy, as of ${qeV2Result.asOfDate})`,
      };
      const latest = qeV2Result.scores.at(-1);
      qeV2Details = latest ? {
        reversalProbabilities: {
          sessions3: latest.reversal_probability_3,
          sessions5: latest.reversal_probability_5,
          sessions10: latest.reversal_probability_10,
        },
        expectedReturns: {
          sessions5: latest.expected_return_5,
          sessions10: latest.expected_return_10,
          sessions20: latest.expected_return_20,
        },
        uncertainty: latest.prediction_uncertainty,
        exhaustionPercentile: latest.exhaustion_percentile,
        targetPosition: latest.target_position,
        reason: latest.reason,
        modelVersion: qeV2Result.modelVersion,
        asOfDate: qeV2Result.asOfDate,
      } : undefined;
    } else if (strategy === "quantum_exhaustion") {
      result = runQeStrategy(ticker, bars, startDate, endDate, buyThreshold, sellThreshold);
      result.parameterSource = "Quantum Exhaustion Model";
    } else {
      const parameterResolution = resolvePsiParamsWithSource(ticker, { startDate, endDate });
      const psiResult = runPsiStrategy(bars, parameterResolution.params);
      result = {
        ...psiResult,
        parameterSource: parameterResolution.parameterSource,
      };
    }

    const signals =
      limit && limit > 0
        ? [...result.signals].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, limit)
        : result.signals;

    return NextResponse.json({
      signals,
      latestMasterIndex: result.latestMasterIndex,
      latestMasterIndexAdjusted: result.latestMasterIndexAdjusted,
      parameterSource: result.parameterSource,
      qeV2: qeV2Details,
    });
  } catch (error) {
    if (error instanceof QeV2DeploymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error computing PSI signals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
