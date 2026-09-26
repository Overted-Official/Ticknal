'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { SectorPerformanceItem } from '@/lib/sectors-math';
import { LineChart } from '@/components/ui/icon-library';

export interface SectorConcentrationFlowPanelProps {
  sector: SectorPerformanceItem | null;
  totalMarketTurnover?: number;
  benchmarkReturn?: number;
}

function StockLogoAvatar({ logoUrl, symbol }: { logoUrl?: string | null; symbol: string }) {
  const [imgError, setImgError] = useState(false);
  const initial = symbol.slice(0, 2);

  if (logoUrl && !imgError) {
    return (
      <div className="w-6 h-6 rounded-full border border-white/10 bg-white/[0.04] overflow-hidden shrink-0">
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-6 h-6 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-[9px] font-bold text-neutral-300 shrink-0 select-none">
      {initial}
    </div>
  );
}

function formatTurnoverDisplay(val: number): string {
  if (!val || isNaN(val)) return '0 EGP';
  if (val >= 1_000_000_000_000) {
    return `${(val / 1_000_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tn EGP`;
  }
  if (val >= 1_000_000_000) {
    return `${(val / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bn EGP`;
  }
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M EGP`;
  }
  return `${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} EGP`;
}

export default function SectorConcentrationFlowPanel({
  sector,
  totalMarketTurnover = 0,
  benchmarkReturn = 0,
}: SectorConcentrationFlowPanelProps) {
  if (!sector) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-neutral-500 text-xs font-sans">
        <p>Select any sector on the matrix to view capital flow & concentration analysis</p>
      </div>
    );
  }

  const sectorTurnover = sector.totalTurnover || 0;
  const marketSharePct =
    totalMarketTurnover > 0 ? (sectorTurnover / totalMarketTurnover) * 100 : 0;

  // 1. Pareto Concentration Analysis (Top 3 stocks turnover share)
  const concentration = useMemo(() => {
    if (!sector.stocks || sector.stocks.length === 0) {
      return { top3Share: 0, riskLevel: 'low' as const, topStocks: [], otherShare: 0 };
    }
    const sorted = [...sector.stocks].sort((a, b) => b.turnover - a.turnover);
    const top3 = sorted.slice(0, 3);
    const top3Turnover = top3.reduce((sum, s) => sum + s.turnover, 0);
    const top3Share = sectorTurnover > 0 ? (top3Turnover / sectorTurnover) * 100 : 0;

    const riskLevel: 'high' | 'moderate' | 'low' =
      top3Share >= 65 ? 'high' : top3Share >= 40 ? 'moderate' : 'low';

    return {
      top3Share,
      riskLevel,
      topStocks: top3.map((s) => ({
        symbol: s.symbol.replace('.CA', '').trim().toUpperCase(),
        companyName: s.companyName,
        sharePct: sectorTurnover > 0 ? (s.turnover / sectorTurnover) * 100 : 0,
      })),
      otherShare: Math.max(0, 100 - top3Share),
    };
  }, [sector.stocks, sectorTurnover]);

  // 2. Market Breadth & Internal Participation
  const breadth = useMemo(() => {
    const total = sector.stocks?.length || 1;
    const gainers = sector.gainersCount ?? sector.stocks?.filter((s) => s.returnPct > 0).length ?? 0;
    const losers = sector.losersCount ?? sector.stocks?.filter((s) => s.returnPct < 0).length ?? 0;
    const unchanged = Math.max(0, total - gainers - losers);
    const advancerPct = Math.round((gainers / total) * 100);
    const declinerPct = Math.round((losers / total) * 100);
    const unchangedPct = Math.max(0, 100 - advancerPct - declinerPct);

    return {
      gainers,
      losers,
      unchanged,
      total,
      advancerPct,
      declinerPct,
      unchangedPct,
    };
  }, [sector]);

  // 3. Catalysts: Top 3 Pushers vs Top 3 Draggers
  const catalysts = useMemo(() => {
    if (!sector.stocks || sector.stocks.length === 0) {
      return { drivers: [], drags: [] };
    }
    const sortedByAlpha = [...sector.stocks].sort((a, b) => {
      const alphaA = a.returnPct - benchmarkReturn;
      const alphaB = b.returnPct - benchmarkReturn;
      return alphaB - alphaA;
    });

    const drivers = sortedByAlpha.slice(0, 3).map((s) => ({
      symbol: s.symbol.replace('.CA', '').trim().toUpperCase(),
      companyName: s.companyName,
      alpha: s.returnPct - benchmarkReturn,
      returnPct: s.returnPct,
      logoUrl: s.logoUrl,
    }));

    const drags = (sortedByAlpha.length > 3 ? sortedByAlpha.slice(-3).reverse() : []).map((s) => ({
      symbol: s.symbol.replace('.CA', '').trim().toUpperCase(),
      companyName: s.companyName,
      alpha: s.returnPct - benchmarkReturn,
      returnPct: s.returnPct,
      logoUrl: s.logoUrl,
    }));

    return { drivers, drags };
  }, [sector.stocks, benchmarkReturn]);

  const regimeBadgeStyle =
    sector.rotationRegime === 'Leading'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
      : sector.rotationRegime === 'Improving'
      ? 'bg-sky-500/15 text-sky-400 border-sky-500/20'
      : sector.rotationRegime === 'Weakening'
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
      : 'bg-rose-500/15 text-rose-400 border-rose-500/20';

  return (
    <div className="flex flex-col h-full font-sans select-none divide-y divide-white/[0.08] px-1 overflow-hidden">
      {/* 1. Panel Header */}
      <div className="pb-3 flex items-center justify-between shrink-0 bg-transparent">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white truncate max-w-[190px]" title={sector.sector}>
              {sector.sector}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${regimeBadgeStyle}`}>
              {sector.rotationRegime}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {sector.stockCount} {sector.stockCount === 1 ? 'constituent' : 'constituents'} · Flow & Concentration
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
              sector.turnoverWeightedReturn >= 0
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
            }`}
            title="Volume-weighted sector return"
          >
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-75">Return</span>
            <span>
              {sector.turnoverWeightedReturn > 0 ? '+' : ''}
              {sector.turnoverWeightedReturn.toFixed(1)}%
            </span>
          </span>
        </div>
      </div>

      {/* 2. Market Liquidity Share (Clean Monochrome Bar, No Extraneous Blues) */}
      <div className="py-2.5 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium text-text-muted">
            Market Liquidity Share
          </span>
          <span className="font-semibold tabular-nums text-white">
            {marketSharePct.toFixed(1)}% of EGX
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-base font-bold tabular-nums text-white">
            {formatTurnoverDisplay(sectorTurnover)}
          </span>
          <span className="text-[10px] text-text-muted">
            Traded Turnover
          </span>
        </div>

        {/* Clean Monochrome Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-white/70 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(2, marketSharePct))}%` }}
          />
        </div>
      </div>

      {/* 3. Rally Participation & Breadth */}
      <div className="py-2.5 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium text-text-muted">
            Rally Participation (Breadth)
          </span>
          <span className="font-semibold tabular-nums text-white">
            {breadth.advancerPct}% Advancing
          </span>
        </div>

        <div className="flex items-center justify-between text-xs tabular-nums">
          <span className="text-profit-num font-semibold">
            {breadth.gainers} Advancing (W)
          </span>
          <span className="text-text-muted text-[11px]">
            {breadth.unchanged} Flat
          </span>
          <span className="text-loss-num font-semibold">
            {breadth.losers} Declining (L)
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-white/[0.08] flex overflow-hidden gap-0.5">
          {breadth.advancerPct > 0 && (
            <div
              className="h-full bg-profit-chart transition-all duration-300"
              style={{ width: `${breadth.advancerPct}%` }}
              title={`Advancing: ${breadth.advancerPct}%`}
            />
          )}
          {breadth.unchangedPct > 0 && (
            <div
              className="h-full bg-white/15 transition-all duration-300"
              style={{ width: `${breadth.unchangedPct}%` }}
              title={`Flat: ${breadth.unchangedPct}%`}
            />
          )}
          {breadth.declinerPct > 0 && (
            <div
              className="h-full bg-loss-chart transition-all duration-300"
              style={{ width: `${breadth.declinerPct}%` }}
              title={`Declining: ${breadth.declinerPct}%`}
            />
          )}
        </div>
      </div>

      {/* 4. Pareto Concentration Risk (Calm Monochrome Tones, No Neon Rainbows) */}
      <div className="py-2.5 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium text-text-muted">
            Concentration Risk
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-white/10 bg-white/[0.06] text-neutral-300">
            {concentration.riskLevel === 'high'
              ? 'High Skew'
              : concentration.riskLevel === 'moderate'
              ? 'Moderate'
              : 'Well Spread'}
          </span>
        </div>

        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-white">
            Top 3 Stocks Drive <span className="tabular-nums font-bold text-white">{concentration.top3Share.toFixed(1)}%</span>
          </span>
          <span className="text-[10px] text-text-muted">
            of Sector Volume
          </span>
        </div>

        {/* Tonal Monochrome Segmented Bar */}
        <div className="w-full h-1.5 rounded-full bg-white/[0.08] flex overflow-hidden gap-0.5">
          {concentration.topStocks.map((st, i) => (
            <div
              key={st.symbol}
              className={`h-full transition-all duration-300 ${
                i === 0 ? 'bg-white/80' : i === 1 ? 'bg-white/50' : 'bg-white/30'
              }`}
              style={{ width: `${Math.max(2, st.sharePct)}%` }}
              title={`${st.symbol}: ${st.sharePct.toFixed(1)}%`}
            />
          ))}
          {concentration.otherShare > 0 && (
            <div
              className="h-full bg-white/10 transition-all duration-300"
              style={{ width: `${concentration.otherShare}%` }}
              title={`Others: ${concentration.otherShare.toFixed(1)}%`}
            />
          )}
        </div>
      </div>

      {/* 5. Key Catalysts: Pushers & Draggers (Transparent Background, Circular Logo, Full Name + Ticker Below) */}
      <div className="pt-2.5 flex flex-col gap-2 shrink-0">
        <span className="text-[11px] font-medium text-text-muted">
          Key Catalysts (Alpha vs EGX30)
        </span>

        <div className="grid grid-cols-2 gap-3.5">
          {/* Left Column: Pushers */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
              Pushers
            </span>
            <div className="space-y-1.5">
              {catalysts.drivers.length > 0 ? (
                catalysts.drivers.map((drv) => (
                  <div
                    key={drv.symbol}
                    className="py-1 flex items-center justify-between group bg-transparent hover:bg-white/[0.03] rounded transition-colors"
                  >
                    {/* Small Circular Logo + Full Name & Ticker Below */}
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <StockLogoAvatar logoUrl={drv.logoUrl} symbol={drv.symbol} />
                      <div className="flex flex-col min-w-0 leading-tight">
                        <span
                          className="text-xs font-medium text-white truncate max-w-[75px] sm:max-w-[95px]"
                          title={drv.companyName}
                        >
                          {drv.companyName || drv.symbol}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {drv.symbol}
                        </span>
                      </div>
                    </div>

                    {/* Alpha + Chart Button */}
                    <div className="flex items-center gap-1 shrink-0 tabular-nums">
                      <span className="font-semibold text-profit-num text-xs">
                        {drv.alpha >= 0 ? '+' : ''}{drv.alpha.toFixed(1)}%
                      </span>
                      <Link
                        href={`/charts?symbol=${drv.symbol}`}
                        className="w-4 h-4 rounded flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
                        title={`Open ${drv.symbol} Chart`}
                      >
                        <LineChart size={11} />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-[11px] text-text-muted italic">None</span>
              )}
            </div>
          </div>

          {/* Right Column: Draggers */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
              Draggers
            </span>
            <div className="space-y-1.5">
              {catalysts.drags.length > 0 ? (
                catalysts.drags.map((drg) => (
                  <div
                    key={drg.symbol}
                    className="py-1 flex items-center justify-between group bg-transparent hover:bg-white/[0.03] rounded transition-colors"
                  >
                    {/* Small Circular Logo + Full Name & Ticker Below */}
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <StockLogoAvatar logoUrl={drg.logoUrl} symbol={drg.symbol} />
                      <div className="flex flex-col min-w-0 leading-tight">
                        <span
                          className="text-xs font-medium text-white truncate max-w-[75px] sm:max-w-[95px]"
                          title={drg.companyName}
                        >
                          {drg.companyName || drg.symbol}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {drg.symbol}
                        </span>
                      </div>
                    </div>

                    {/* Alpha + Chart Button */}
                    <div className="flex items-center gap-1 shrink-0 tabular-nums">
                      <span className="font-semibold text-loss-num text-xs">
                        {drg.alpha >= 0 ? '+' : ''}{drg.alpha.toFixed(1)}%
                      </span>
                      <Link
                        href={`/charts?symbol=${drg.symbol}`}
                        className="w-4 h-4 rounded flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
                        title={`Open ${drg.symbol} Chart`}
                      >
                        <LineChart size={11} />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-[11px] text-text-muted italic">None</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
