'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  LineStyle,
  createSeriesMarkers,
  type CandlestickData,
  type LineData,
  type WhitespaceData,
  type Time,
  type SeriesMarker,
  type ISeriesApi,
} from 'lightweight-charts';
import { ChevronDown, Settings, Eye, EyeOff } from 'lucide-react';
import { type SimpleSignal, formatMetricsForApi } from '../../../_dynamic-psi-test/psiStrategy';
import { identifySwings, runExhaustionStrategy, type ExhaustionBar } from '../../../_dynamic-psi-test/exhaustionStrategy';

interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ComputedPsiBar extends PriceBar {
  masterIndex: number | null;
}

interface TestChartWidgetProps {
  data: ComputedPsiBar[];
  metrics?: Record<string, string>;
  zoneMetrics?: Record<string, string>;
  psiSignals?: SimpleSignal[];
  zoneSignals?: SimpleSignal[];
  exhaustionSignals?: SimpleSignal[];
  exhaustionSeries?: ExhaustionBar[];
  exhaustionMetrics?: Record<string, string>;
}

function formatColor(value: string | undefined): string {
  if (!value) return 'text-tv-text';
  if (value.startsWith('+')) return 'text-tv-up';
  if (value.startsWith('-')) return 'text-tv-down';
  return 'text-tv-text';
}

function formatPlus(value: string | undefined): string {
  if (!value) return '-';
  if (!value.startsWith('-') && !value.startsWith('+') && value !== '0' && value !== '0.00' && value !== '0.00%') {
    return `+${value}`;
  }
  return value;
}

export default function TestChartWidget({ data, metrics, zoneMetrics, exhaustionMetrics: initialExhMetrics, psiSignals, zoneSignals, exhaustionSignals: initialExhSignals, exhaustionSeries }: TestChartWidgetProps) {
  const topChartContainerRef = useRef<HTMLDivElement>(null);
  const bottomChartContainerRef = useRef<HTMLDivElement>(null);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isZoneExpanded, setIsZoneExpanded] = useState(false);
  const [isExhaustionExpanded, setIsExhaustionExpanded] = useState(false);
  const [isExhaustionSettingsOpen, setIsExhaustionSettingsOpen] = useState(false);
  const [exhaustionBuyThreshold, setExhaustionBuyThreshold] = useState(90);
  const [exhaustionSellThreshold, setExhaustionSellThreshold] = useState(90);
  const [exhaustionIndexType, setExhaustionIndexType] = useState<'psi8' | 'psi40'>('psi40');
  const [activeSignalSet, setActiveSignalSet] = useState<'psi' | 'zone' | 'exhaustion' | null>(null);

  const computedExhaustion = useMemo(() => {
    if (!exhaustionSeries) return { metrics: initialExhMetrics, signals: initialExhSignals };
    // We pass both thresholds and the index type
    const res = runExhaustionStrategy(data as any, exhaustionSeries, exhaustionBuyThreshold, exhaustionSellThreshold, exhaustionIndexType);
    return {
      metrics: formatMetricsForApi(res.metrics),
      signals: res.signals,
      series: res.series
    };
  }, [data, exhaustionSeries, exhaustionBuyThreshold, exhaustionSellThreshold, exhaustionIndexType, initialExhMetrics, initialExhSignals]);

  const exhaustionMetrics = computedExhaustion.metrics;
  const exhaustionSignals = computedExhaustion.signals;
  const computedExhaustionSeries = computedExhaustion.series;

  const [showIndexLine, setShowIndexLine] = useState(true);
  const [showExhaustionLines, setShowExhaustionLines] = useState(true);
  const [showDeltaLine, setShowDeltaLine] = useState(false);
  const [showSwingDots, setShowSwingDots] = useState(true);

  const indexSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const exhaustionUpSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const exhaustionDownSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const deltaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerApiRef = useRef<any>(null);
  const baseMarkersRef = useRef<SeriesMarker<Time>[]>([]);

  useEffect(() => {
    if (!topChartContainerRef.current || !bottomChartContainerRef.current) return;

    const computedStyle = getComputedStyle(document.documentElement);
    const bgBase = computedStyle.getPropertyValue('--bg-chart').trim() || '#06101A';
    const textMuted = computedStyle.getPropertyValue('--text-secondary').trim() || '#8B949E';
    const borderColor = computedStyle.getPropertyValue('--border-color').trim() || '#1F2833';
    const upColor = computedStyle.getPropertyValue('--up-color').trim() || '#089981';
    const downColor = computedStyle.getPropertyValue('--down-color').trim() || '#f23645';

    // Shared options
    const commonOptions = {
      layout: {
        background: { type: ColorType.Solid, color: bgBase },
        textColor: textMuted,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      autoSize: true,
      crosshair: { mode: 0 },
    };

    // Create Top Chart
    const topChart = createChart(topChartContainerRef.current, {
      ...commonOptions,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor,
      },
      rightPriceScale: { borderColor },
    });

    // Create Bottom Chart
    const bottomChart = createChart(bottomChartContainerRef.current, {
      ...commonOptions,
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { visible: false },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor,
        visible: false, // hide time axis on bottom if desired, or keep it. We keep it synced.
      },
      rightPriceScale: { borderColor },
    });

    const candlestickSeries = topChart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    const indexSeries = bottomChart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
    });
    indexSeriesRef.current = indexSeries;
    
    indexSeries.createPriceLine({
      price: 0,
      color: 'rgba(255, 255, 255, 0.2)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
    });

    // Overall median buy zone (16.18) and sell zone (80.90) from swing ledger analysis
    indexSeries.createPriceLine({
      price: 16.18,
      color: upColor,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Buy Zone',
    });

    indexSeries.createPriceLine({
      price: 80.90,
      color: downColor,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Sell Zone',
    });

    // Exhaustion probability series: shows 0-100% how far into current swing we are
    const exhaustionUpSeries = bottomChart.addSeries(LineSeries, {
      color: downColor,       // red = upswing exhaustion (approaching top)
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      crosshairMarkerVisible: true,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    exhaustionUpSeriesRef.current = exhaustionUpSeries;
    
    const exhaustionDownSeries = bottomChart.addSeries(LineSeries, {
      color: upColor,         // green = downswing exhaustion (approaching bottom)
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      crosshairMarkerVisible: true,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    exhaustionDownSeriesRef.current = exhaustionDownSeries;

    const deltaSeries = bottomChart.addSeries(LineSeries, {
      color: '#eab308',       // yellow = raw running delta points
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      crosshairMarkerVisible: true,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: false,         // hidden by default
    });
    deltaSeriesRef.current = deltaSeries;

    const cData: CandlestickData<Time>[] = [];
    const iData: (LineData<Time> | WhitespaceData<Time>)[] = [];

    data.forEach((d) => {
      const timeStr = (typeof d.date === 'string' ? d.date.split('T')[0] : new Date(d.date).toISOString().split('T')[0]) as Time;
      if (!Number.isFinite(d.open) || !Number.isFinite(d.high) || !Number.isFinite(d.low) || !Number.isFinite(d.close)) return;

      cData.push({ time: timeStr, open: d.open, high: d.high, low: d.low, close: d.close });
      if (d.masterIndex !== null && Number.isFinite(d.masterIndex)) {
        iData.push({ time: timeStr, value: d.masterIndex });
      } else {
        iData.push({ time: timeStr });
      }
    });

    candlestickSeries.setData(cData);
    indexSeries.setData(iData);

    // Populate exhaustion probability series
    if (computedExhaustionSeries && computedExhaustionSeries.length > 0) {
      const eUpData: any[] = [];
      const eDownData: any[] = [];
      const dData: (LineData<Time> | WhitespaceData<Time>)[] = [];
      
      computedExhaustionSeries.forEach((e) => {
        const timeStr = e.date.split('T')[0] as Time;
        const sDelta = e.signedDelta ?? 0;
        
        dData.push({ time: timeStr, value: sDelta });
        
        const mlExh = (exhaustionIndexType === 'psi40' && e.mlExhaustion !== null && e.mlExhaustion !== undefined) ? e.mlExhaustion 
                      : (exhaustionIndexType === 'psi8' && e.mlExhaustion8 !== null && e.mlExhaustion8 !== undefined) ? e.mlExhaustion8 
                      : (e.exhaustion ?? null);
        
        if (mlExh !== null && e.direction === 'up') {
          eUpData.push({ time: timeStr, value: mlExh });
          eDownData.push({ time: timeStr, value: 0 });
        } else if (mlExh !== null && e.direction === 'down') {
          eDownData.push({ time: timeStr, value: mlExh });
          eUpData.push({ time: timeStr, value: 0 });
        } else {
          eUpData.push({ time: timeStr, value: 0 });
          eDownData.push({ time: timeStr, value: 0 });
        }
      });
      exhaustionUpSeries.setData(eUpData);
      exhaustionDownSeries.setData(eDownData);
      deltaSeries.setData(dData);
    }

    const swings = identifySwings(data);
    const markers: SeriesMarker<Time>[] = [];
    swings.forEach((swing) => {
      const timeStr = (typeof swing.date === 'string' ? swing.date.split('T')[0] : new Date(swing.date).toISOString().split('T')[0]) as Time;
      if (swing.type === 'Buy') {
        markers.push({
          time: timeStr,
          position: 'belowBar',
          color: upColor,
          shape: 'circle',
          size: 1,
        });
      } else {
        markers.push({
          time: timeStr,
          position: 'aboveBar',
          color: downColor,
          shape: 'circle',
          size: 1,
        });
      }
    });
    markers.sort((a, b) => (a.time as string).localeCompare(b.time as string));
    baseMarkersRef.current = markers;
    markerApiRef.current = createSeriesMarkers(candlestickSeries, markers);


    if (data.length > 0) {
      topChart.timeScale().fitContent();
    }

    // Sync time scales
    let isSyncingTop = false;
    let isSyncingBottom = false;

    topChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range || isSyncingTop) return;
      isSyncingBottom = true;
      bottomChart.timeScale().setVisibleLogicalRange(range);
      isSyncingBottom = false;
    });

    bottomChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range || isSyncingBottom) return;
      isSyncingTop = true;
      topChart.timeScale().setVisibleLogicalRange(range);
      isSyncingTop = false;
    });

    // Sync crosshairs
    topChart.subscribeCrosshairMove((param) => {
      if (param.time) {
        bottomChart.setCrosshairPosition(0, param.time, indexSeries);
      } else {
        bottomChart.clearCrosshairPosition();
      }
    });

    bottomChart.subscribeCrosshairMove((param) => {
      if (param.time) {
        topChart.setCrosshairPosition(0, param.time, candlestickSeries);
      } else {
        topChart.clearCrosshairPosition();
      }
    });

    return () => {
      topChart.remove();
      bottomChart.remove();
    };
  }, [data]);

  useEffect(() => {
    if (indexSeriesRef.current) {
      indexSeriesRef.current.applyOptions({ visible: showIndexLine });
    }
  }, [showIndexLine]);

  useEffect(() => {
    if (exhaustionUpSeriesRef.current) {
      exhaustionUpSeriesRef.current.applyOptions({ visible: showExhaustionLines });
    }
    if (exhaustionDownSeriesRef.current) {
      exhaustionDownSeriesRef.current.applyOptions({ visible: showExhaustionLines });
    }
  }, [showExhaustionLines]);

  useEffect(() => {
    if (deltaSeriesRef.current) {
      deltaSeriesRef.current.applyOptions({ visible: showDeltaLine });
    }
  }, [showDeltaLine]);

  // Reactive effect: update signal overlay markers whenever active set changes
  useEffect(() => {
    if (!markerApiRef.current) return;
    const base = baseMarkersRef.current;

    const toMarker = (s: SimpleSignal, isBuy: boolean, color: string): SeriesMarker<Time> => ({
      time: s.date.split('T')[0] as Time,
      position: isBuy ? 'belowBar' : 'aboveBar',
      color,
      shape: isBuy ? 'arrowUp' : 'arrowDown',
      size: 1.5,
    });

    let overlay: SeriesMarker<Time>[] = [];
    if (activeSignalSet === 'psi' && psiSignals) {
      overlay = psiSignals.map(s => toMarker(s, s.type === 'BUY', s.type === 'BUY' ? '#22d3ee' : '#f59e0b'));
    } else if (activeSignalSet === 'zone' && zoneSignals) {
      overlay = zoneSignals.map(s => toMarker(s, s.type === 'BUY', s.type === 'BUY' ? '#a78bfa' : '#fb923c'));
    } else if (activeSignalSet === 'exhaustion' && exhaustionSignals) {
      overlay = exhaustionSignals.map(s => toMarker(s, s.type === 'BUY', s.type === 'BUY' ? '#34d399' : '#f43f5e'));
    }

    const combined = [...(showSwingDots ? base : []), ...overlay].sort(
      (a, b) => (a.time as string).localeCompare(b.time as string)
    );
    markerApiRef.current.setMarkers(combined);
  }, [activeSignalSet, psiSignals, zoneSignals, exhaustionSignals, showSwingDots]);

  const renderMetricsTable = (metricsObj: any) => (
    <table className="w-full text-right border-collapse">
      <tbody>
        <tr className="border-b border-tv-border">
          <td className="py-1 px-3 text-tv-muted font-medium text-left">System Total ROI</td>
          <td className={`py-1 px-3 ${formatColor(metricsObj['Sys ROI'])}`}>{formatPlus(metricsObj['Sys ROI'])}</td>
        </tr>
        <tr className="border-b border-tv-border">
          <td className="py-1 px-3 text-tv-muted font-medium text-left">Buy & Hold ROI</td>
          <td className="py-1 px-3 text-tv-text">{metricsObj['B&H ROI']}%</td>
        </tr>
        <tr className="border-b border-tv-border">
          <td className="py-1 px-3 text-tv-muted font-medium text-left">ROI Margin</td>
          <td className={`py-1 px-3 ${formatColor(metricsObj['ROI Margin'])}`}>{formatPlus(metricsObj['ROI Margin'])}</td>
        </tr>
        <tr className="border-b border-tv-border">
          <td className="py-1 px-3 text-tv-muted font-medium text-left"># of Trades</td>
          <td className="py-1 px-3 text-tv-text">{metricsObj['# of Trades']}</td>
        </tr>
        <tr className="border-b border-tv-border">
          <td className="py-1 px-3 text-tv-muted font-medium text-left">Win Rate</td>
          <td className="py-1 px-3 text-tv-text">{metricsObj['Win Rate']}%</td>
        </tr>
        <tr className="border-b border-tv-border">
          <td className="py-1 px-3 text-tv-muted font-medium text-left">Max Drawdown</td>
          <td className="py-1 px-3 text-tv-down">{metricsObj['Max Drawdown']}%</td>
        </tr>
        <tr className="border-b border-tv-border">
          <td className="py-1 px-3 text-tv-muted font-medium text-left">Max Adverse Excursion</td>
          <td className={`py-1 px-3 ${formatColor(metricsObj['Max Adverse Excursion'])}`}>{formatPlus(metricsObj['Max Adverse Excursion'])}</td>
        </tr>
        <tr className="border-b border-tv-border">
          <td className="py-1 px-3 text-tv-muted font-medium text-left">Avg Bars/Trade</td>
          <td className="py-1 px-3 text-tv-text">{metricsObj['Avg Bars/Trade']}</td>
        </tr>
        <tr className="border-b border-tv-border">
          <td className="py-1 px-3 text-tv-muted font-medium text-left">Avg Return / Trade</td>
          <td className={`py-1 px-3 ${formatColor(metricsObj['Avg. Return/Trade'])}`}>{formatPlus(metricsObj['Avg. Return/Trade'])}</td>
        </tr>
        <tr>
          <td className="py-1 px-3 text-tv-muted font-medium text-left">Annual CAGR</td>
          <td className={`py-1 px-3 ${formatColor(metricsObj['Annual CAGR'])}`}>{formatPlus(metricsObj['Annual CAGR'])}</td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-tv-chart relative">
      <div className="absolute z-50 top-4 right-4 flex gap-4 flex-row-reverse pointer-events-none">
      {metrics && (
        <div className="rounded-tv-sm border border-tv-border bg-tv-glass backdrop-blur-md shadow-lg text-[11px] transition-all pointer-events-auto min-w-[280px]">
          {/* Summary Badge */}
          <div 
            className={`flex items-center justify-between gap-4 px-3 py-1.5 cursor-pointer border-b transition-colors ${isMetricsExpanded ? 'border-tv-border bg-tv-surface' : 'border-transparent hover:bg-tv-hover/50'}`}
            onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}
          >
            <span className="text-tv-muted font-medium flex items-center gap-1.5">
              <ChevronDown size={12} className={`transition-transform duration-200 ${isMetricsExpanded ? 'rotate-180' : ''}`} />
              Performance Metrics
            </span>
            <div className="flex items-center gap-3">
              <span className={`font-medium ${formatColor(metrics['Sys ROI'])}`}>
                {formatPlus(metrics['Sys ROI'])}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveSignalSet(activeSignalSet === 'psi' ? null : 'psi'); }}
                className={`p-1 rounded transition-colors ${activeSignalSet === 'psi' ? 'text-cyan-400 bg-cyan-400/10' : 'text-tv-muted hover:text-cyan-400 hover:bg-tv-hover'}`}
                title="Toggle PSI signals on chart"
              >
                {activeSignalSet === 'psi' ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}
                className={`p-1 rounded transition-colors ${isSettingsOpen ? 'text-tv-accent bg-tv-accent/10' : 'text-tv-muted hover:text-tv-accent hover:bg-tv-hover'}`}
              >
                <Settings size={14} />
              </button>
            </div>
          </div>

          {/* Expanded Table */}
          {isMetricsExpanded && (
            <div className="bg-tv-surface/90 backdrop-blur-md max-h-[300px] overflow-y-auto">
              {renderMetricsTable(metrics)}
            </div>
          )}
        </div>
      )}

      {zoneMetrics && (
        <div className="rounded-tv-sm border border-tv-border bg-tv-glass backdrop-blur-md shadow-lg text-[11px] transition-all pointer-events-auto min-w-[280px]">
          <div
            className={`flex items-center justify-between gap-4 px-3 py-1.5 cursor-pointer border-b transition-colors ${isZoneExpanded ? 'border-tv-border bg-tv-surface' : 'border-transparent hover:bg-tv-hover/50'}`}
            onClick={() => setIsZoneExpanded(!isZoneExpanded)}
          >
            <span className="text-tv-muted font-medium flex items-center gap-1.5">
              <ChevronDown size={12} className={`transition-transform duration-200 ${isZoneExpanded ? 'rotate-180' : ''}`} />
              Zone-Cross Strategy
            </span>
            <div className="flex items-center gap-3">
              <span className={`font-medium ${formatColor(zoneMetrics['Sys ROI'])}`}>
                {formatPlus(zoneMetrics['Sys ROI'])}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveSignalSet(activeSignalSet === 'zone' ? null : 'zone'); }}
                className={`p-1 rounded transition-colors ${activeSignalSet === 'zone' ? 'text-violet-400 bg-violet-400/10' : 'text-tv-muted hover:text-violet-400 hover:bg-tv-hover'}`}
                title="Toggle Zone-Cross signals on chart"
              >
                {activeSignalSet === 'zone' ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            </div>
          </div>
          {isZoneExpanded && (
            <div className="bg-tv-surface/90 backdrop-blur-md max-h-[300px] overflow-y-auto">
              {renderMetricsTable(zoneMetrics)}
            </div>
          )}
        </div>
      )}

      {exhaustionMetrics && (
        <div className="rounded-tv-sm border border-tv-border bg-tv-glass backdrop-blur-md shadow-lg text-[11px] transition-all pointer-events-auto min-w-[280px]">
          <div
            className={`flex items-center justify-between gap-4 px-3 py-1.5 cursor-pointer border-b transition-colors ${isExhaustionExpanded ? 'border-tv-border bg-tv-surface' : 'border-transparent hover:bg-tv-hover/50'}`}
            onClick={() => setIsExhaustionExpanded(!isExhaustionExpanded)}
          >
            <span className="text-tv-muted font-medium flex items-center gap-1.5">
              <ChevronDown size={12} className={`transition-transform duration-200 ${isExhaustionExpanded ? 'rotate-180' : ''}`} />
              Exhaustion Strategy
            </span>
            <div className="flex items-center gap-3">
              <span className={`font-medium ${formatColor(exhaustionMetrics['Sys ROI'])}`}>
                {formatPlus(exhaustionMetrics['Sys ROI'])}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveSignalSet(activeSignalSet === 'exhaustion' ? null : 'exhaustion'); }}
                className={`p-1 rounded transition-colors ${activeSignalSet === 'exhaustion' ? 'text-emerald-400 bg-emerald-400/10' : 'text-tv-muted hover:text-emerald-400 hover:bg-tv-hover'}`}
                title="Toggle Exhaustion signals on chart"
              >
                {activeSignalSet === 'exhaustion' ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExhaustionSettingsOpen(!isExhaustionSettingsOpen); }}
                className={`p-1 rounded transition-colors ${isExhaustionSettingsOpen ? 'text-tv-accent bg-tv-accent/10' : 'text-tv-muted hover:text-tv-accent hover:bg-tv-hover'}`}
                title="Exhaustion Strategy Settings"
              >
                <Settings size={14} />
              </button>
            </div>
          </div>
          {isExhaustionSettingsOpen && (
            <div className="p-3 border-b border-tv-border bg-tv-surface/95 backdrop-blur-md flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-tv-text font-medium text-xs">Strategy Index</label>
                </div>
                <select 
                  value={exhaustionIndexType} 
                  onChange={(e) => setExhaustionIndexType(e.target.value as 'psi8' | 'psi40')}
                  className="w-full bg-tv-border text-tv-text text-sm rounded px-2 py-1 outline-none"
                >
                  <option value="psi40">PSI-40 (High Res)</option>
                  <option value="psi8">PSI-8 (Classic)</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-tv-text font-medium text-xs">Buy Threshold (%)</label>
                  <span className="text-tv-accent font-mono">{exhaustionBuyThreshold}</span>
                </div>
                <input 
                  type="range" min="50" max="99" step="1"
                  value={exhaustionBuyThreshold}
                  onChange={(e) => setExhaustionBuyThreshold(Number(e.target.value))}
                  className="w-full accent-tv-accent h-1 bg-tv-border rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-tv-text font-medium text-xs">Sell Threshold (%)</label>
                  <span className="text-tv-accent font-mono">{exhaustionSellThreshold}</span>
                </div>
                <input 
                  type="range" min="50" max="99" step="1"
                  value={exhaustionSellThreshold}
                  onChange={(e) => setExhaustionSellThreshold(Number(e.target.value))}
                  className="w-full accent-tv-accent h-1 bg-tv-border rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}
          {isExhaustionExpanded && (
            <div className="bg-tv-surface/90 backdrop-blur-md max-h-[300px] overflow-y-auto">
              {renderMetricsTable(exhaustionMetrics)}
            </div>
          )}
        </div>
      )}
      </div>

      <div className="w-full relative" style={{ height: '75%' }}>
        <div className="absolute inset-0" ref={topChartContainerRef} />
        
        {/* Top Chart Legend / Toggles */}
        <div className="absolute top-2 left-2 z-10 flex gap-2">
          <button 
            onClick={() => setShowSwingDots(!showSwingDots)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors backdrop-blur-md border ${showSwingDots ? 'text-tv-text border-tv-border bg-tv-glass' : 'text-tv-muted border-tv-border bg-tv-glass hover:text-white'}`}
            title="Toggle Historical Swing Dots"
          >
            {showSwingDots ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>Swings</span>
          </button>
        </div>
      </div>
      {/* Divider */}
      <div className="h-[1px] w-full bg-tv-border z-10" />
      <div className="w-full relative" style={{ height: '25%' }}>
        <div className="absolute inset-0" ref={bottomChartContainerRef} />
        
        {/* Bottom Chart Legend / Toggles */}
        <div className="absolute top-2 left-2 z-10 flex gap-2">
          <button 
            onClick={() => setShowIndexLine(!showIndexLine)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors backdrop-blur-md border ${showIndexLine ? 'text-[#3b82f6] border-[#3b82f6]/30 bg-[#3b82f6]/10' : 'text-tv-muted border-tv-border bg-tv-glass hover:text-white'}`}
            title="Toggle PSI Index Line"
          >
            {showIndexLine ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>PSI</span>
          </button>
          
          <button 
            onClick={() => setShowExhaustionLines(!showExhaustionLines)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors backdrop-blur-md border ${showExhaustionLines ? 'text-tv-text border-tv-border bg-tv-glass hover:bg-tv-hover/50' : 'text-tv-muted border-tv-border bg-tv-glass hover:text-white'}`}
            title="Toggle Exhaustion Probabilities"
          >
            {showExhaustionLines ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>Exhaustion</span>
          </button>
          
          <button 
            onClick={() => setShowDeltaLine(!showDeltaLine)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors backdrop-blur-md border ${showDeltaLine ? 'text-[#eab308] border-[#eab308]/30 bg-[#eab308]/10' : 'text-tv-muted border-tv-border bg-tv-glass hover:text-white'}`}
            title="Toggle Raw Running Delta"
          >
            {showDeltaLine ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>Raw Delta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
