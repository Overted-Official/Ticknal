import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyPrices } from "@/db/schema";
import { resolvePsiParamsWithSource } from "@/strategies/PSI/psiParameterStore";
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar } from "@/strategies/PSI/psiStrategy";
import { runQeStrategy } from "@/strategies/QuantumExhaustion/qeStrategy";

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
    
    if (strategy === "quantum_exhaustion") {
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
    });
  } catch (error) {
    console.error("Error computing PSI signals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
