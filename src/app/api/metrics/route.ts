import { NextResponse } from "next/server";
import { getCachedDailyPrices } from "@/lib/data-cache";
import { resolvePsiParamsWithSource } from "@/strategies/PSI/psiParameterStore";
import {
  formatMetricsForApi,
  normalizeTickerSymbol,
  runPsiStrategy,
  type PriceBar,
} from "@/strategies/PSI/psiStrategy";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    const ticker = normalizeTickerSymbol(symbol);
    const startDate = searchParams.get("start") ?? "2021-01-01";
    const endDate = searchParams.get("end") ?? undefined;
    const rows = await getCachedDailyPrices(ticker);

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

    const parameterResolution = resolvePsiParamsWithSource(ticker, { startDate, endDate });
    const result = runPsiStrategy(bars, parameterResolution.params);
    const metricsPayload = result.metrics;
    const parameterSource = parameterResolution.parameterSource;

    return NextResponse.json({
      metrics: formatMetricsForApi(metricsPayload),
      parameterSource,
    });
  } catch (error) {
    console.error("Error computing PSI metrics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
