import { NextResponse } from "next/server";
import { getCachedDailyPrices } from "@/lib/data-cache";
import { resolvePsiParamsWithSource } from "@/strategies/PSI/psiParameterStore";
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar } from "@/strategies/PSI/psiStrategy";
import { runThothStrategy } from "@/strategies/Thoth/thothStrategy";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const strategy = searchParams.get("strategy") || "psi";

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    const ticker = normalizeTickerSymbol(symbol);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const startDate = searchParams.get("start") ?? "2025-01-01";
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

    if (bars.length < 130) {
      return NextResponse.json({ signals: [], latestMasterIndex: null, latestMasterIndexAdjusted: null });
    }

    let result;
    if (strategy === "thoth_egx_macro") {
      const buyThreshold = searchParams.get("buyThreshold") ? Number(searchParams.get("buyThreshold")) : 65.0;
      const sellThreshold = searchParams.get("sellThreshold") ? Number(searchParams.get("sellThreshold")) : 80.0;
      const minNetProfit = searchParams.get("minNetProfit") !== null ? Number(searchParams.get("minNetProfit")) : 0.5;

      const thothResult = await runThothStrategy(bars, {
        buyThreshold,
        sellThreshold,
        minNetProfit,
        startDate,
        endDate,
      });

      result = {
        ...thothResult,
        parameterSource: "thoth-egx-macro-onnx",
      };
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
    console.error("Error computing signals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
