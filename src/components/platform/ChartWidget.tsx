'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  createSeriesMarkers,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';
import { Pause, Play, RotateCcw, SkipBack, SkipForward, StepBack, StepForward } from '@/components/ui/icons';

export interface ChartData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StrategySignal {
  date: string;
  signal: string;
}

interface SignalsResponse {
  signals?: StrategySignal[];
}

interface LiveQuote {
  date: string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string;
}

export type ReplayState = {
  active: boolean;
  startDate: string | null;
  endDate: string | null;
};

interface ChartWidgetProps {
  data: ChartData[];
  symbol: string;
  initialReplayMode?: boolean;
  onReplayStateChange?: (state: ReplayState) => void;
}

const DEFAULT_REPLAY_DATE = '2019-12-31';
const PLAYBACK_SPEEDS = [
  { label: '1x', delay: 900 },
  { label: '2x', delay: 450 },
  { label: '4x', delay: 180 },
];

export default function ChartWidget({
  data,
  symbol,
  initialReplayMode = false,
  onReplayStateChange,
}: ChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markerApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const [metrics, setMetrics] = useState<Record<string, string> | null>(null);
  const [replayMode, setReplayMode] = useState(initialReplayMode);
  const [replayIndex, setReplayIndex] = useState(() =>
    initialReplayMode ? getDefaultReplayIndex(data) : Math.max(0, data.length - 1),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(PLAYBACK_SPEEDS[0].delay);

  const replayDate = replayMode ? data[replayIndex]?.time ?? null : null;
  const replayStartDate = replayMode ? data[0]?.time ?? null : null;
  const visibleData = useMemo(
    () => (replayMode ? data.slice(0, replayIndex + 1) : data),
    [data, replayIndex, replayMode],
  );
  const hasReplayRoom = data.length > 1;

  useEffect(() => {
    onReplayStateChange?.({
      active: replayMode,
      startDate: replayStartDate,
      endDate: replayDate,
    });
  }, [onReplayStateChange, replayDate, replayMode, replayStartDate]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const computedStyle = getComputedStyle(document.documentElement);
    const bgBase = '#131722';
    const textMuted = computedStyle.getPropertyValue('--text-secondary').trim() || '#787b86';
    const borderColor = computedStyle.getPropertyValue('--border-color').trim() || '#2a2e39';
    const upColor = '#089981';
    const downColor = '#f23645';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: bgBase },
        textColor: textMuted,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
      },
      autoSize: true,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor,
      },
      rightPriceScale: {
        borderColor,
      },
      crosshair: {
        vertLine: {
          color: textMuted,
          width: 1,
          style: 3,
          labelBackgroundColor: borderColor,
        },
        horzLine: {
          color: textMuted,
          width: 1,
          style: 3,
          labelBackgroundColor: borderColor,
        },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    markerApiRef.current = createSeriesMarkers(candlestickSeries, []);

    return () => {
      markerApiRef.current?.detach();
      markerApiRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      chartRef.current = null;
      chart.remove();
    };
  }, [symbol]);

  useEffect(() => {
    const candlestickSeries = candlestickSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!candlestickSeries || !volumeSeries) return;

    const upColor = '#089981';
    const downColor = '#f23645';
    const cData: CandlestickData<Time>[] = visibleData.map((d) => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    const vData: HistogramData<Time>[] = visibleData.map((d) => ({
      time: d.time as Time,
      value: d.volume,
      color: d.close >= d.open ? `${upColor}80` : `${downColor}80`,
    }));

    candlestickSeries.setData(cData);
    volumeSeries.setData(vData);

    if (visibleData.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [visibleData]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchMetrics() {
      try {
        const params = new URLSearchParams({ symbol });
        if (replayMode && replayDate) {
          params.set('start', replayStartDate ?? data[0]?.time ?? replayDate);
          params.set('end', replayDate);
        }

        const res = await fetch(`/api/metrics?${params.toString()}`, { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          if (json.metrics) setMetrics(json.metrics);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to fetch metrics', error);
        }
      }
    }

    fetchMetrics();
    return () => controller.abort();
  }, [data, replayDate, replayMode, replayStartDate, symbol]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSignals() {
      try {
        const params = new URLSearchParams({ symbol });
        if (replayMode && replayDate) {
          params.set('start', replayStartDate ?? data[0]?.time ?? replayDate);
          params.set('end', replayDate);
        }

        const res = await fetch(`/api/signals?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) return;

        const signalResponse = (await res.json()) as SignalsResponse;
        markerApiRef.current?.setMarkers(buildMarkers(signalResponse.signals ?? []));
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to fetch signals', error);
        }
      }
    }

    markerApiRef.current?.setMarkers([]);
    fetchSignals();
    return () => controller.abort();
  }, [data, replayDate, replayMode, replayStartDate, symbol]);

  useEffect(() => {
    if (replayMode) return;

    const fetchLiveQuote = async () => {
      try {
        const res = await fetch(`/api/quote?symbol=${symbol}`);
        if (!res.ok) return;
        const liveData = (await res.json()) as LiveQuote;
        const close = Number(liveData.close);
        const open = Number(liveData.open);

        candlestickSeriesRef.current?.update({
          time: liveData.date as Time,
          open,
          high: Number(liveData.high),
          low: Number(liveData.low),
          close,
        });

        volumeSeriesRef.current?.update({
          time: liveData.date as Time,
          value: Number(liveData.volume),
          color: close >= open ? '#08998180' : '#f2364580',
        });
      } catch (error) {
        console.error('Failed to poll live chart data', error);
      }
    };

    fetchLiveQuote();
    const intervalId = setInterval(fetchLiveQuote, 15000);
    return () => clearInterval(intervalId);
  }, [replayMode, symbol]);

  useEffect(() => {
    if (!replayMode || !isPlaying) return;
    if (replayIndex >= data.length - 1) return;

    const intervalId = window.setInterval(() => {
      setReplayIndex((current) => {
        const next = Math.min(current + 1, data.length - 1);
        if (next >= data.length - 1) {
          window.setTimeout(() => setIsPlaying(false), 0);
        }
        return next;
      });
    }, playbackSpeed);

    return () => window.clearInterval(intervalId);
  }, [data.length, isPlaying, playbackSpeed, replayIndex, replayMode]);

  const enableReplay = () => {
    if (!hasReplayRoom) return;
    setIsPlaying(false);
    setReplayMode(true);
    setReplayIndex((current) => (current >= data.length - 1 ? getDefaultReplayIndex(data) : current));
    syncReplayUrl(true);
  };

  const exitReplay = () => {
    setIsPlaying(false);
    setReplayMode(false);
    setReplayIndex(Math.max(0, data.length - 1));
    syncReplayUrl(false);
  };

  const jumpToStart = () => {
    setIsPlaying(false);
    setReplayIndex(getDefaultReplayIndex(data));
  };

  const jumpToLatest = () => {
    setIsPlaying(false);
    setReplayIndex(Math.max(0, data.length - 1));
  };

  const stepReplay = (step: number) => {
    setIsPlaying(false);
    setReplayIndex((current) => Math.min(Math.max(current + step, 0), Math.max(0, data.length - 1)));
  };

  const handleDateChange = (value: string) => {
    setIsPlaying(false);
    setReplayIndex(findIndexAtOrBefore(data, value));
  };

  const formatColor = (valStr: string) => {
    if (!valStr) return '';
    const val = parseFloat(valStr);
    if (isNaN(val)) return 'text-tv-text';
    return val > 0 ? 'text-[#089981]' : val < 0 ? 'text-[#f23645]' : 'text-tv-text';
  };

  const formatPlus = (valStr: string) => {
    if (!valStr) return '';
    const val = parseFloat(valStr);
    if (isNaN(val)) return valStr;
    return val > 0 ? `+${valStr}%` : `${valStr}%`;
  };

  return (
    <div className="flex-1 w-full h-full relative bg-[#131722]">
      <div className="absolute inset-0" ref={chartContainerRef} />

      {!replayMode ? (
        <div className="absolute left-4 top-4 z-50">
          <button
            type="button"
            title="Bar Replay"
            aria-label="Bar Replay"
            disabled={!hasReplayRoom}
            onClick={enableReplay}
            className="h-9 rounded-tv-sm border border-tv-border bg-tv-surface px-3 text-xs font-weight-medium text-tv-text shadow-lg transition-colors hover:bg-tv-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Replay
            </span>
          </button>
        </div>
      ) : (
        <div className="absolute left-4 top-4 z-50 flex max-w-[calc(100vw-120px)] flex-wrap items-center gap-1 rounded-tv-sm border border-tv-border bg-tv-surface p-1 text-xs text-tv-text shadow-lg">
          <button
            type="button"
            title="Reset replay point"
            aria-label="Reset replay point"
            onClick={jumpToStart}
            className="flex h-8 w-8 items-center justify-center rounded-tv-sm text-tv-muted transition-colors hover:bg-tv-hover hover:text-tv-text"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Step back"
            aria-label="Step back"
            disabled={replayIndex <= 0}
            onClick={() => stepReplay(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-tv-sm text-tv-muted transition-colors hover:bg-tv-hover hover:text-tv-text disabled:opacity-40"
          >
            <StepBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            title={isPlaying ? 'Pause replay' : 'Play replay'}
            aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
            disabled={replayIndex >= data.length - 1}
            onClick={() => setIsPlaying((value) => !value)}
            className="flex h-8 w-8 items-center justify-center rounded-tv-sm bg-tv-accent text-white transition-colors hover:bg-tv-accent-hover disabled:opacity-40"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            title="Step forward"
            aria-label="Step forward"
            disabled={replayIndex >= data.length - 1}
            onClick={() => stepReplay(1)}
            className="flex h-8 w-8 items-center justify-center rounded-tv-sm text-tv-muted transition-colors hover:bg-tv-hover hover:text-tv-text disabled:opacity-40"
          >
            <StepForward className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Jump to latest"
            aria-label="Jump to latest"
            onClick={jumpToLatest}
            className="flex h-8 w-8 items-center justify-center rounded-tv-sm text-tv-muted transition-colors hover:bg-tv-hover hover:text-tv-text"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <div className="mx-1 h-5 w-px bg-tv-border" />

          <input
            type="date"
            title="Replay date"
            aria-label="Replay date"
            min={data[0]?.time}
            max={data[data.length - 1]?.time}
            value={replayDate ?? ''}
            onChange={(event) => handleDateChange(event.target.value)}
            className="h-8 w-36 rounded-tv-sm border border-tv-border bg-tv-base px-2 text-xs text-tv-text outline-none transition-colors hover:border-tv-border-highlight focus:border-tv-accent"
          />
          <input
            type="range"
            title="Replay position"
            aria-label="Replay position"
            min={0}
            max={Math.max(0, data.length - 1)}
            value={replayIndex}
            onChange={(event) => handleDateChange(data[Number(event.target.value)]?.time ?? replayDate ?? '')}
            className="h-8 w-32 accent-[#2962FF]"
          />
          <select
            title="Replay speed"
            aria-label="Replay speed"
            value={playbackSpeed}
            onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
            className="h-8 rounded-tv-sm border border-tv-border bg-tv-base px-2 text-xs text-tv-text outline-none transition-colors hover:border-tv-border-highlight focus:border-tv-accent"
          >
            {PLAYBACK_SPEEDS.map((speed) => (
              <option key={speed.label} value={speed.delay}>
                {speed.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exitReplay}
            className="h-8 rounded-tv-sm px-3 text-xs font-weight-medium text-tv-muted transition-colors hover:bg-tv-hover hover:text-tv-text"
          >
            Live
          </button>
        </div>
      )}

      {replayMode && replayDate && (
        <div className="absolute left-4 top-16 z-40 rounded-tv-sm border border-tv-border bg-tv-base px-2 py-1 text-[11px] text-tv-muted shadow-lg">
          <span className="text-tv-accent">Replay</span> {data[0]?.time} to {replayDate}
        </div>
      )}

      {metrics && (
        <div
          className="z-50 bg-tv-surface border border-tv-border rounded shadow-lg text-xs opacity-95 pointer-events-none w-64"
          style={{ position: 'absolute', top: '16px', right: '65px' }}
        >
          <table className="w-full text-right border-collapse">
            <tbody>
              <tr className="border-b border-tv-border">
                <td className="py-1 px-2 text-tv-text font-medium text-left">System Total ROI</td>
                <td className={`py-1 px-2 ${formatColor(metrics['Sys ROI'])}`}>{formatPlus(metrics['Sys ROI'])}</td>
              </tr>
              <tr className="border-b border-tv-border">
                <td className="py-1 px-2 text-tv-text font-medium text-left">Buy & Hold ROI</td>
                <td className="py-1 px-2 text-tv-text">{metrics['B&H ROI']}%</td>
              </tr>
              <tr className="border-b border-tv-border">
                <td className="py-1 px-2 text-tv-text font-medium text-left">ROI Margin</td>
                <td className={`py-1 px-2 ${formatColor(metrics['ROI Margin'])}`}>{formatPlus(metrics['ROI Margin'])}</td>
              </tr>
              <tr className="border-b border-tv-border">
                <td className="py-1 px-2 text-tv-text font-medium text-left">Win Rate</td>
                <td className="py-1 px-2 text-tv-text">{metrics['Win Rate']}%</td>
              </tr>
              <tr className="border-b border-tv-border">
                <td className="py-1 px-2 text-tv-text font-medium text-left">Max Drawdown</td>
                <td className="py-1 px-2 text-[#f23645]">{metrics['Max Drawdown']}%</td>
              </tr>
              <tr className="border-b border-tv-border">
                <td className="py-1 px-2 text-tv-text font-medium text-left">Max Adverse Excursion</td>
                <td className={`py-1 px-2 ${formatColor(metrics['Max Adverse Excursion'])}`}>{formatPlus(metrics['Max Adverse Excursion'])}</td>
              </tr>
              <tr className="border-b border-tv-border">
                <td className="py-1 px-2 text-tv-text font-medium text-left">Avg Bars/Trade</td>
                <td className="py-1 px-2 text-tv-text">{metrics['Avg Bars/Trade']}</td>
              </tr>
              <tr className="border-b border-tv-border">
                <td className="py-1 px-2 text-tv-text font-medium text-left">Avg Return / Trade</td>
                <td className={`py-1 px-2 ${formatColor(metrics['Avg. Return/Trade'])}`}>{formatPlus(metrics['Avg. Return/Trade'])}</td>
              </tr>
              <tr>
                <td className="py-1 px-2 text-tv-text font-medium text-left">Annual CAGR</td>
                <td className={`py-1 px-2 ${formatColor(metrics['Annual CAGR'])}`}>{formatPlus(metrics['Annual CAGR'])}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function buildMarkers(signals: StrategySignal[]): SeriesMarker<Time>[] {
  const sortedSignals = [...signals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const markers: SeriesMarker<Time>[] = [];
  let currentPosition: 'CASH' | 'LONG' = 'CASH';

  for (const signal of sortedSignals) {
    if (signal.signal === 'HOLD') continue;

    if (currentPosition === 'CASH' && signal.signal === 'BUY') {
      currentPosition = 'LONG';
      markers.push({
        time: signal.date as Time,
        position: 'belowBar',
        color: '#22c55e',
        shape: 'arrowUp',
        text: 'BUY',
      });
    } else if (currentPosition === 'LONG' && signal.signal.startsWith('SELL')) {
      currentPosition = 'CASH';
      const exitMarker = getExitMarker(signal.signal);
      markers.push({
        time: signal.date as Time,
        position: 'aboveBar',
        color: exitMarker.color,
        shape: 'arrowDown',
        text: exitMarker.text,
      });
    }
  }

  return markers;
}

function getExitMarker(signal: string): { text: string; color: string } {
  if (signal === 'SELL_TP') return { text: 'TAKE PROFIT', color: '#3b82f6' };
  if (signal === 'SELL_TRAIL') return { text: 'TRAIL STOP', color: '#f59e0b' };
  if (signal === 'SELL_SL') return { text: 'STOP LOSS', color: '#ef4444' };
  if (signal === 'SELL_STRUCT') return { text: 'STRUCT STOP', color: '#ef4444' };
  return { text: 'EXIT', color: '#ef4444' };
}

function getDefaultReplayIndex(data: ChartData[]): number {
  if (data.length <= 1) return 0;
  const targetIndex = findIndexAtOrBefore(data, DEFAULT_REPLAY_DATE);
  if (targetIndex > 0 && targetIndex < data.length - 1) return targetIndex;
  if (targetIndex >= data.length - 1) return Math.max(0, data.length - 2);
  return 0;
}

function findIndexAtOrBefore(data: ChartData[], date: string): number {
  if (data.length === 0) return 0;
  let low = 0;
  let high = data.length - 1;
  let answer = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (data[middle].time <= date) {
      answer = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return answer;
}

function syncReplayUrl(active: boolean) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (active) {
    params.set('replay', '1');
  } else {
    params.delete('replay');
  }
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}
