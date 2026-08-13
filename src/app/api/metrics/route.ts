import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyPrices } from "@/db/schema";
import { resolvePsiParamsWithSource } from "@/strategies/PSI/psiParameterStore";
import {
  formatMetricsForApi,
  normalizeTickerSymbol,
  runPsiStrategy,
  type PriceBar,
} from "@/strategies/PSI/psiStrategy";
import { runQeStrategy, simulateQePerformance } from "@/strategies/QuantumExhaustion/qeStrategy";
import {
  QeV2DeploymentError,
  runQeV2Strategy,
  simulateQeV2Performance,
} from "@/strategies/QuantumExhaustion-v2/qeV2Strategy";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const strategy = searchParams.get("strategy") ?? "psi";
    const buyThreshold = Number(searchParams.get("buyThreshold") ?? 75);
    const sellThreshold = Number(searchParams.get("sellThreshold") ?? 75);

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    const ticker = normalizeTickerSymbol(symbol);
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

    if (bars.length < 260) {
      return NextResponse.json({ error: "Insufficient price history" }, { status: 404 });
    }

    let metricsPayload;
    let parameterSource;

    if (strategy === "quantum_exhaustion_v2") {
      const qeV2Result = runQeV2Strategy(ticker, bars, startDate, endDate);
      const simResult = simulateQeV2Performance(bars, qeV2Result.scores, startDate, endDate);
      metricsPayload = simResult.metrics;
      parameterSource = `${qeV2Result.modelVersion} (locked policy, as of ${qeV2Result.asOfDate})`;
    } else if (strategy === "quantum_exhaustion") {
      const qeResult = runQeStrategy(ticker, bars, startDate, endDate, buyThreshold, sellThreshold);
      const simResult = simulateQePerformance(bars, qeResult.signals, startDate, endDate);
      metricsPayload = simResult.metrics;
      parameterSource = "Quantum Exhaustion Model";
    } else {
      const parameterResolution = resolvePsiParamsWithSource(ticker, { startDate, endDate });
      const result = runPsiStrategy(bars, parameterResolution.params);
      metricsPayload = result.metrics;
      parameterSource = parameterResolution.parameterSource;
    }

    return NextResponse.json({
      metrics: formatMetricsForApi(metricsPayload),
      parameterSource,
    });
  } catch (error) {
    if (error instanceof QeV2DeploymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error computing PSI metrics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
