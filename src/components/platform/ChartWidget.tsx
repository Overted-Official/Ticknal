'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createSeriesMarkers,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';
import { Pause, Play, RotateCcw, SkipBack, SkipForward, StepBack, StepForward, X, ChevronDown, Eye, EyeOff, Sparkles, Loader2 } from '@/components/ui/icons';
import { INDICATORS } from '@/indicators';

export interface ChartData {
  time: string; // "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SignalBadge {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  label: string;
  detail: string;
  kind: 'buy' | 'sell';
}

interface StrategySignal {
  date: string;
  signal: string;
  price?: number;
  entryReason?: string;
  exitReason?: string;
}

interface SignalsResponse {
  signals?: StrategySignal[];
}

type StrategyLevelsResponse = {
  targetPrice: number | null;
  stopPrice: number | null;
  targetLabel: string | null;
  stopLabel: string | null;
};

type ChartOrder = {
  id: number;
  tickerSymbol: string;
  status: string;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  targetPrice: number | null;
  stopPrice: number | null;
  currentPrice: number;
  profitLoss: number;
  profitLossPct: number;
};

type OrderDraft = {
  date: string;
  entryPrice: string;
  quantity: string;
  targetPrice: string;
  stopPrice: string;
  targetLabel: string | null;
  stopLabel: string | null;
  x: number;
  y: number;
  loadingLevels: boolean;
};

type OrderOverlay = {
  id: number;
  left: number;
  width: number;
  entryTop: number;
  targetTop: number | null;
  stopTop: number | null;
  targetHeight: number;
  stopHeight: number;
  targetPrice: number | null;
  stopPrice: number | null;
  entryPrice: number;
  profitLossPct: number;
};


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
  selectedStrategy?: string;
  strategyParams?: Record<string, any>;
  strategyStartDate?: string;
  strategyEndDate?: string;
  setStrategyStartDate?: (d: string) => void;
  setStrategyEndDate?: (d: string) => void;
  activeIndicators?: string[];
}

const DEFAULT_REPLAY_DATE = '2019-12-31';
const PLAYBACK_SPEEDS = [
  { label: '1x', delay: 900 },
  { label: '2x', delay: 450 },
  { label: '4x', delay: 180 },
];
const MAX_VISIBLE_SIGNAL_BADGES = 7;

export default function ChartWidget({
  data,
  symbol,
  initialReplayMode = false,
  onReplayStateChange,
  selectedStrategy = 'psi',
  strategyParams = {},
  strategyStartDate,
  strategyEndDate,
  setStrategyStartDate,
  setStrategyEndDate,
  activeIndicators = [],
}: ChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markerApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const orderPriceLineRefs = useRef<Map<number, IPriceLine[]>>(new Map());

  const [metrics, setMetrics] = useState<Record<string, string> | null>(null);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);
  const [showSignals, setShowSignals] = useState(true);
  const [orders, setOrders] = useState<ChartOrder[]>([]);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderOverlays, setOrderOverlays] = useState<OrderOverlay[]>([]);
  const [chartSignals, setChartSignals] = useState<StrategySignal[]>([]);
  const [replayMode, setReplayMode] = useState(initialReplayMode);
  const [replayIndex, setReplayIndex] = useState(() =>
    initialReplayMode ? getDefaultReplayIndex(data) : Math.max(0, data.length - 1),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(PLAYBACK_SPEEDS[0].delay);

  const [isPredicting, setIsPredicting] = useState(false);
  const predictionSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [predictPopoverOpen, setPredictPopoverOpen] = useState(false);
  const [predictDaysInput, setPredictDaysInput] = useState("10");

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const replayDate = replayMode ? data[replayIndex]?.time ?? null : null;
  const replayStartDate = replayMode ? data[0]?.time ?? null : null;
  const visibleData = useMemo(
    () => (replayMode ? data.slice(0, replayIndex + 1) : data),
    [data, replayIndex, replayMode],
  );
  const hasReplayRoom = data.length > 1;

  const clearOrderPriceLines = useCallback(() => {
    const candlestickSeries = candlestickSeriesRef.current;
    if (candlestickSeries) {
      for (const lines of orderPriceLineRefs.current.values()) {
        for (const line of lines) {
          candlestickSeries.removePriceLine(line);
        }
      }
    }
    orderPriceLineRefs.current.clear();
  }, []);

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
    const bgBase = computedStyle.getPropertyValue('--bg-chart').trim() || '#171B26';
    const textMuted = computedStyle.getPropertyValue('--text-secondary').trim() || '#8b929f';
    const borderColor = computedStyle.getPropertyValue('--border-color').trim() || 'rgba(255, 255, 255, 0.08)';
    const upColor = computedStyle.getPropertyValue('--up-color').trim() || '#22c55e';
    const downColor = computedStyle.getPropertyValue('--down-color').trim() || '#ef4444';

    const chart = createChart(chartContainerRef.current, {
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
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor,
      },
      rightPriceScale: {
        borderColor,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
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
      color: '#6A2CFF',
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
      clearOrderPriceLines();
      markerApiRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      chartRef.current = null;
      chart.remove();
    };
  }, [clearOrderPriceLines, symbol]);

  useEffect(() => {
    const candlestickSeries = candlestickSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const timeScale = chartRef.current?.timeScale();
    if (!candlestickSeries || !volumeSeries || !timeScale) return;

    const currentLogicalRange = timeScale.getVisibleLogicalRange();

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
      if (replayMode) {
        if (currentLogicalRange) {
          const barsVisible = currentLogicalRange.to - currentLogicalRange.from;
          const half = Math.floor(barsVisible / 2);
          const newLastIndex = visibleData.length - 1;
          timeScale.setVisibleLogicalRange({
            from: newLastIndex - half,
            to: newLastIndex + half,
          });
        }
      } else {
        timeScale.fitContent();
      }
    }
  }, [visibleData, replayMode]);

  useEffect(() => {
    const recenterChart = () => {
      chartRef.current?.priceScale('right').applyOptions({ autoScale: true });
      chartRef.current?.timeScale().scrollToRealTime();
    };

    window.addEventListener('quantegx:chart-recenter', recenterChart);
    return () => window.removeEventListener('quantegx:chart-recenter', recenterChart);
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const candlestickSeries = candlestickSeriesRef.current;
    if (!chart || !candlestickSeries) return;

    const handleChartClick = (param: MouseEventParams<Time>) => {
      if (!param.point || !param.time) return;
      const seriesData = param.seriesData.get(candlestickSeries) as CandlestickData<Time> | undefined;
      const candle = seriesData ?? visibleData.find((item) => item.time === String(param.time));
      if (!candle || !('close' in candle)) return;

      const containerWidth = chartContainerRef.current?.clientWidth ?? 0;
      const containerHeight = chartContainerRef.current?.clientHeight ?? 0;
      const date = String(candle.time);
      const entryPrice = Number(candle.close);
      const x = Math.min(Math.max(param.point.x, 12), Math.max(12, containerWidth - 300));
      const y = Math.min(Math.max(param.point.y, 12), Math.max(12, containerHeight - 210));
      const entryPriceText = entryPrice.toFixed(2);

      setOrderError(null);
      setOrderDraft({
        date,
        entryPrice: entryPriceText,
        quantity: '1',
        targetPrice: '',
        stopPrice: '',
        targetLabel: null,
        stopLabel: null,
        x,
        y,
        loadingLevels: true,
      });

      fetch(`/api/strategy-levels?symbol=${encodeURIComponent(symbol)}&date=${date}&entryPrice=${entryPrice}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((levels: StrategyLevelsResponse | null) => {
          if (!levels) return;
          setOrderDraft((current) => {
            if (!current || current.date !== date || current.entryPrice !== entryPriceText) return current;
            return {
              ...current,
              targetPrice: levels.targetPrice === null ? '' : levels.targetPrice.toFixed(2),
              stopPrice: levels.stopPrice === null ? '' : levels.stopPrice.toFixed(2),
              targetLabel: levels.targetLabel,
              stopLabel: levels.stopLabel,
              loadingLevels: false,
            };
          });
        })
        .catch((error) => {
          console.error('Failed to derive strategy order levels:', error);
          setOrderDraft((current) => (current?.date === date ? { ...current, loadingLevels: false } : current));
        });
    };

    chart.subscribeClick(handleChartClick);
    return () => chart.unsubscribeClick(handleChartClick);
  }, [symbol, visibleData]);

  useEffect(() => {
    let isActive = true;

    async function fetchOrders() {
      try {
        const res = await fetch(`/api/positions?symbol=${encodeURIComponent(symbol)}&status=OPEN`);
        if (!res.ok || !isActive) return;
        const json = await res.json();
        if (isActive) setOrders(json.orders ?? []);
      } catch (error) {
        if (isActive) {
          console.error('Failed to fetch chart orders', error);
        }
      }
    }

    void fetchOrders();
    return () => {
      isActive = false;
    };
  }, [symbol]);

  useEffect(() => {
    const candlestickSeries = candlestickSeriesRef.current;
    if (!candlestickSeries) return;

    clearOrderPriceLines();

    for (const order of orders) {
      const lines: IPriceLine[] = [
        candlestickSeries.createPriceLine({
          price: order.entryPrice,
          color: '#6A2CFF',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${order.tickerSymbol} entry`,
        }),
      ];

      if (order.targetPrice !== null) {
        lines.push(
          candlestickSeries.createPriceLine({
            price: order.targetPrice,
            color: '#B36BFF',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'target',
          }),
        );
      }

      if (order.stopPrice !== null) {
        lines.push(
          candlestickSeries.createPriceLine({
            price: order.stopPrice,
            color: '#F23645',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'stop',
          }),
        );
      }

      orderPriceLineRefs.current.set(order.id, lines);
    }

    return clearOrderPriceLines;
  }, [clearOrderPriceLines, orders]);

  useEffect(() => {
    const chart = chartRef.current;
    const candlestickSeries = candlestickSeriesRef.current;
    const container = chartContainerRef.current;
    if (!chart || !candlestickSeries || !container) return;

    const updateOverlays = () => {
      const nextOrderOverlays = orders
        .map((order) => buildOrderOverlay(order, chart, candlestickSeries, container))
        .filter((overlay): overlay is OrderOverlay => overlay !== null);

      setOrderOverlays(nextOrderOverlays);
    };

    updateOverlays();
    chart.timeScale().subscribeVisibleTimeRangeChange(updateOverlays);
    window.addEventListener('resize', updateOverlays);

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(updateOverlays);
      window.removeEventListener('resize', updateOverlays);
    };
  }, [chartSignals, orders, visibleData]);

  useEffect(() => {
    let isActive = true;

    async function fetchMetrics() {
      try {
        const params = new URLSearchParams({ 
          symbol, 
          strategy: selectedStrategy,
        });

        Object.entries(strategyParams).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            params.set(k, String(v));
          }
        });
        if (replayMode && replayDate) {
          let parsedReplayDate = replayDate;
          if (typeof replayDate === 'object') {
             // Handle lightweight-charts BusinessDay object
             parsedReplayDate = `${(replayDate as any).year}-${String((replayDate as any).month).padStart(2, '0')}-${String((replayDate as any).day).padStart(2, '0')}`;
          }
          if (strategyStartDate) params.set('start', strategyStartDate);
          params.set('end', parsedReplayDate as string);
        } else {
          if (strategyStartDate) params.set('start', strategyStartDate);
          if (strategyEndDate) params.set('end', strategyEndDate);
        }

        const res = await fetch(`/api/metrics?${params.toString()}`);
        if (res.ok && isActive) {
          const json = await res.json();
          if (isActive && json.metrics) setMetrics(json.metrics);
        }
      } catch (error: any) {
        if (isActive) {
          console.error('Failed to fetch metrics', error);
        }
      }
    }

    void fetchMetrics();
    return () => {
      isActive = false;
    };
  }, [data, replayDate, replayMode, replayStartDate, symbol, strategyStartDate, strategyEndDate]);

  useEffect(() => {
    let isActive = true;

    async function fetchSignals() {
      try {
        const params = new URLSearchParams({ 
          symbol, 
          strategy: selectedStrategy,
        });
        
        Object.entries(strategyParams).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            params.set(k, String(v));
          }
        });
        if (replayMode && replayDate) {
          let parsedReplayDate = replayDate;
          if (typeof replayDate === 'object') {
             parsedReplayDate = `${(replayDate as any).year}-${String((replayDate as any).month).padStart(2, '0')}-${String((replayDate as any).day).padStart(2, '0')}`;
          }
          if (strategyStartDate) params.set('start', strategyStartDate);
          params.set('end', parsedReplayDate as string);
        } else {
          if (strategyStartDate) params.set('start', strategyStartDate);
          if (strategyEndDate) params.set('end', strategyEndDate);
        }

        const res = await fetch(`/api/signals?${params.toString()}`);
        if (!res.ok || !isActive) return;

        const signalResponse = (await res.json()) as SignalsResponse;
        const signals = signalResponse.signals ?? [];
        if (!isActive) return;
        setChartSignals(signals);
      } catch (error: any) {
        if (isActive) {
          console.error('Failed to fetch signals', error);
        }
      }
    }
    void fetchSignals();
    return () => {
      isActive = false;
    };
  }, [
    symbol,
    data,
    replayMode,
    replayDate,
    replayStartDate,
    strategyStartDate,
    strategyEndDate,
    selectedStrategy,
    strategyParams,
  ]);

  const indicatorMarkers = useMemo(() => {
    let combinedMarkers: SeriesMarker<Time>[] = [];
    if (!activeIndicators || activeIndicators.length === 0) return combinedMarkers;
    for (const id of activeIndicators) {
      const ind = INDICATORS[id];
      if (ind) {
        const res = ind.compute(data);
        if (res.markers) combinedMarkers = [...combinedMarkers, ...res.markers];
      }
    }
    return combinedMarkers;
  }, [data, activeIndicators]);

  useEffect(() => {
    if (!markerApiRef.current) return;
    
    const strategyMarkers = showSignals ? buildMarkers(chartSignals) : [];
    
    // Sort all markers by time as required by lightweight-charts
    const allMarkers = [...strategyMarkers, ...indicatorMarkers].sort((a, b) => {
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      return 0;
    });
    
    markerApiRef.current.setMarkers(allMarkers);
  }, [chartSignals, indicatorMarkers, buildMarkers, showSignals]);

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
        if (current >= data.length - 2) {
          // Pause when reaching the end
          window.setTimeout(() => setIsPlaying(false), 0);
          return current + 1;
        }
        return current + 1;
      });
    }, playbackSpeed);

    return () => window.clearInterval(intervalId);
  }, [data.length, isPlaying, playbackSpeed, replayIndex, replayMode]);

  const handlePredict = async () => {
    const days = parseInt(predictDaysInput, 10);
    if (isNaN(days) || days <= 0) return;

    setPredictPopoverOpen(false);
    setIsPredicting(true);
    try {
      // Use up to 90 days of history for context
      const historySize = Math.min(90, visibleData.length);
      const history = visibleData.slice(visibleData.length - historySize);
      
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, predictDays: days })
      });
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const { predictions } = await res.json();
      
      if (chartRef.current) {
        if (!predictionSeriesRef.current) {
          predictionSeriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
            upColor: 'rgba(245, 158, 11, 0.4)',    // TV Accent orange (transparent)
            downColor: 'rgba(245, 158, 11, 0.4)',  // TV Accent orange (transparent)
            borderVisible: true,
            borderColor: '#F59E0B',
            wickUpColor: '#F59E0B',
            wickDownColor: '#F59E0B',
          });
        }
        
        // Connect the prediction line to the last candle
        const lineData = predictions.map((p: any) => ({
          time: p.date as Time,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close
        }));
        
        if (predictionSeriesRef.current) {
          predictionSeriesRef.current.setData(lineData);
        }
      }
    } catch (err) {
      console.error("Prediction failed:", err);
      alert("Prediction failed. Check console for details.");
    } finally {
      setIsPredicting(false);
    }
  };

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
    if (setStrategyStartDate) {
      setStrategyStartDate(value);
    }
  };

  const saveOrderDraft = async () => {
    if (!orderDraft) return;

    const entryPrice = Number(orderDraft.entryPrice);
    const quantity = Number(orderDraft.quantity);
    const targetPrice = parseOptionalNumber(orderDraft.targetPrice);
    const stopPrice = parseOptionalNumber(orderDraft.stopPrice);

    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      setOrderError('Entry price must be greater than zero.');
      return;
    }

    setSavingOrder(true);
    setOrderError(null);

    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          entryDate: orderDraft.date,
          entryPrice,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
          targetPrice,
          stopPrice,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setOrderError(json.error ?? 'Could not save the order.');
        return;
      }

      setOrders((current) => [json.order, ...current.filter((order) => order.id !== json.order.id)]);
      setOrderDraft(null);
    } catch (error) {
      console.error('Failed to save order:', error);
      setOrderError('Could not save the order.');
    } finally {
      setSavingOrder(false);
    }
  };

  const formatColor = (valStr: string) => {
    if (!valStr) return 'text-white';
    const val = parseFloat(valStr);
    if (isNaN(val)) return 'text-white';
    return val > 0 ? 'text-[#22c55e]' : val < 0 ? 'text-[#ef4444]' : 'text-white';
  };

  const formatPlus = (valStr: string) => {
    if (!valStr) return '';
    const val = parseFloat(valStr);
    if (isNaN(val)) return valStr;
    return val > 0 ? `+${valStr}%` : `${valStr}%`;
  };

  const predictButtonUI = (
    <div className="relative">
      <button
        type="button"
        title="Predict Future"
        onClick={() => setPredictPopoverOpen(true)}
        disabled={isPredicting || data.length === 0}
        className="h-8 rounded-full border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:border-plt-orange/40 hover:text-plt-orange px-3 text-[11px] font-semibold text-white/90 shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 flex items-center"
      >
        <span className="flex items-center gap-1.5">
          {isPredicting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-plt-orange" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-plt-orange" />
          )}
          {isPredicting ? 'Predicting...' : 'Predict N Days'}
        </span>
      </button>

      {predictPopoverOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-60 rounded-md border border-white/[0.1] bg-[#161616] p-3.5 text-xs text-white shadow-2xl z-[60]">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="font-semibold text-white/90 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-plt-orange" /> AI Forecast
            </div>
            <button
              type="button"
              onClick={() => setPredictPopoverOpen(false)}
              className="flex h-5 w-5 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          
          <div className="space-y-2.5">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-white/50">Forecast Horizon (Days)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={predictDaysInput}
                onChange={(e) => setPredictDaysInput(e.target.value)}
                className="h-7 w-full rounded-lg border border-white/[0.08] bg-black/40 px-2.5 text-xs text-white outline-none transition-colors focus:border-plt-orange"
              />
            </div>
            
            <button
              type="button"
              onClick={handlePredict}
              className="h-8 w-full rounded-lg bg-plt-orange text-xs font-medium text-white transition-all hover:bg-plt-orange-hover"
            >
              Run Prediction
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 w-full h-full relative bg-tv-chart">
      <div className="absolute inset-0" ref={chartContainerRef} />

      {orderOverlays.map((overlay) => (
        <div key={overlay.id} className="pointer-events-none absolute inset-0 z-20">
          {overlay.targetTop !== null && (
            <div
              className="absolute rounded-tv-sm border border-tv-accent-hover/60 bg-tv-accent-hover/15"
              style={{
                left: overlay.left,
                width: overlay.width,
                top: overlay.targetTop,
                height: overlay.targetHeight,
              }}
            />
          )}
          {overlay.stopTop !== null && (
            <div
              className="absolute rounded-tv-sm border border-tv-down/60 bg-tv-down/15"
              style={{
                left: overlay.left,
                width: overlay.width,
                top: overlay.entryTop,
                height: overlay.stopHeight,
              }}
            />
          )}
          <div
            className="absolute flex -translate-y-1/2 items-center gap-2 rounded-tv-sm border border-tv-highlight/70 bg-tv-surface/95 px-2 py-1 text-[11px] text-tv-text shadow-lg"
            style={{ left: overlay.left, top: overlay.entryTop }}
          >
            <span className="font-weight-medium">LONG</span>
            <span className={overlay.profitLossPct >= 0 ? 'text-tv-up' : 'text-tv-down'}>
              {overlay.profitLossPct >= 0 ? '+' : ''}{overlay.profitLossPct.toFixed(2)}%
            </span>
          </div>
        </div>
      ))}



      {orderDraft && (
        <div
          className="absolute z-[70] w-72 rounded-tv-lg border border-tv-highlight/60 bg-tv-surface/95 p-3 text-xs text-tv-text shadow-2xl backdrop-blur-md"
          style={{ left: orderDraft.x, top: orderDraft.y }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-weight-medium">Open Long Position</div>
              <div className="mt-0.5 text-[11px] text-tv-muted">{symbol} · {orderDraft.date}</div>
            </div>
            <button
              type="button"
              aria-label="Close order popover"
              onClick={() => setOrderDraft(null)}
              className="flex h-7 w-7 items-center justify-center rounded-tv-sm text-tv-muted transition-colors hover:bg-tv-hover hover:text-tv-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-tv-muted">
              Entry
              <input
                type="number"
                step="0.01"
                value={orderDraft.entryPrice}
                onChange={(event) => setOrderDraft((current) => current ? { ...current, entryPrice: event.target.value } : current)}
                className="mt-1 h-8 w-full rounded-tv-sm border border-tv-border bg-tv-base px-2 text-sm text-tv-text outline-none focus:border-tv-highlight"
              />
            </label>
            <label className="text-[11px] text-tv-muted">
              Quantity
              <input
                type="number"
                step="1"
                min="0"
                value={orderDraft.quantity}
                onChange={(event) => setOrderDraft((current) => current ? { ...current, quantity: event.target.value } : current)}
                className="mt-1 h-8 w-full rounded-tv-sm border border-tv-border bg-tv-base px-2 text-sm text-tv-text outline-none focus:border-tv-highlight"
              />
            </label>
            <label className="text-[11px] text-tv-muted">
              Target
              <input
                type="number"
                step="0.01"
                value={orderDraft.targetPrice}
                placeholder={orderDraft.loadingLevels ? 'Loading' : 'Optional'}
                onChange={(event) => setOrderDraft((current) => current ? { ...current, targetPrice: event.target.value } : current)}
                className="mt-1 h-8 w-full rounded-tv-sm border border-tv-border bg-tv-base px-2 text-sm text-tv-text outline-none placeholder:text-tv-muted/60 focus:border-tv-highlight"
              />
            </label>
            <label className="text-[11px] text-tv-muted">
              Stop
              <input
                type="number"
                step="0.01"
                value={orderDraft.stopPrice}
                placeholder={orderDraft.loadingLevels ? 'Loading' : 'Optional'}
                onChange={(event) => setOrderDraft((current) => current ? { ...current, stopPrice: event.target.value } : current)}
                className="mt-1 h-8 w-full rounded-tv-sm border border-tv-border bg-tv-base px-2 text-sm text-tv-text outline-none placeholder:text-tv-muted/60 focus:border-tv-highlight"
              />
            </label>
          </div>

          {(orderDraft.targetLabel || orderDraft.stopLabel || orderError) && (
            <div className="mt-2 text-[11px] text-tv-muted">
              {[orderDraft.targetLabel, orderDraft.stopLabel].filter(Boolean).join(' · ')}
              {orderError && <div className="mt-1 text-tv-down">{orderError}</div>}
            </div>
          )}

          <button
            type="button"
            onClick={saveOrderDraft}
            disabled={savingOrder}
            className="mt-3 h-9 w-full rounded-tv-sm bg-tv-accent text-sm font-weight-medium text-tv-base transition-colors hover:bg-tv-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingOrder ? 'Saving' : 'Save Position'}
          </button>
        </div>
      )}

      {!replayMode ? (
        <div className="absolute bottom-5 left-5 z-40 flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#121212]/80 backdrop-blur-xl p-1 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <button
            type="button"
            title="Bar Replay"
            aria-label="Bar Replay"
            disabled={!hasReplayRoom}
            onClick={enableReplay}
            className="h-8 rounded-full px-3 text-[11px] font-semibold text-white/80 transition-all hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5 text-white/60" />
            Replay
          </button>

          {predictButtonUI}
        </div>
      ) : (
        <div className="absolute bottom-5 left-5 z-40 flex max-w-[calc(100vw-120px)] flex-wrap items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#121212]/85 backdrop-blur-xl p-1.5 text-xs text-white shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <button
            type="button"
            title="Reset replay point"
            aria-label="Reset replay point"
            onClick={jumpToStart}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Step back"
            aria-label="Step back"
            disabled={replayIndex <= 0}
            onClick={() => stepReplay(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
          >
            <StepBack className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={isPlaying ? 'Pause replay' : 'Play replay'}
            aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
            disabled={replayIndex >= data.length - 1}
            onClick={() => setIsPlaying((value) => !value)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-plt-orange text-white transition-all hover:bg-plt-orange-hover disabled:opacity-30"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            title="Step forward"
            aria-label="Step forward"
            disabled={replayIndex >= data.length - 1}
            onClick={() => stepReplay(1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
          >
            <StepForward className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Jump to latest"
            aria-label="Jump to latest"
            onClick={jumpToLatest}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>

          <div className="mx-1 h-4 w-px bg-white/10" />

          <input
            type="date"
            title="Replay date"
            aria-label="Replay date"
            min={data[0]?.time}
            max={data[data.length - 1]?.time}
            value={replayDate ?? ''}
            onChange={(event) => handleDateChange(event.target.value)}
            className="h-7 w-32 rounded-lg border border-white/[0.08] bg-black/40 px-2 text-[10px] text-white outline-none transition-colors focus:border-plt-orange"
          />
          <input
            type="range"
            title="Replay position"
            aria-label="Replay position"
            min={0}
            max={Math.max(0, data.length - 1)}
            value={replayIndex}
            onChange={(event) => handleDateChange(data[Number(event.target.value)]?.time ?? replayDate ?? '')}
            className="h-7 w-28 accent-plt-orange cursor-pointer"
          />
          <select
            title="Replay speed"
            aria-label="Replay speed"
            value={playbackSpeed}
            onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
            className="h-7 rounded-lg border border-white/[0.08] bg-black/40 px-1.5 text-[10px] text-white outline-none transition-colors focus:border-plt-orange"
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
            className="h-7 rounded-full px-2.5 text-[10px] font-semibold text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            Live
          </button>
          {predictButtonUI}
        </div>
      )}

      {replayMode && replayDate && (
        <div className="absolute right-4 bottom-4 z-40 rounded-tv-sm border border-plt-border bg-plt-card px-2 py-1 text-[11px] text-plt-muted shadow-lg">
          <span className="text-plt-red">Replay</span> {data[0]?.time} to {replayDate}
        </div>
      )}

      {metrics && (
        <div
          className="absolute z-50 rounded-md border border-white/[0.08] bg-black/90 backdrop-blur-xl shadow-2xl text-[11px] transition-all overflow-hidden"
          style={{ top: '16px', right: '65px' }}
        >
          {/* Summary Badge */}
          <div 
            className={`flex items-center justify-between gap-3 px-3 py-1.5 cursor-pointer transition-colors ${isMetricsExpanded ? 'border-b border-white/[0.08] bg-white/[0.04]' : 'hover:bg-white/[0.04]'}`}
            onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}
          >
            <span className="text-white/60 font-medium flex items-center gap-1.5 text-[11px]">
              <ChevronDown size={12} className={`transition-transform duration-200 opacity-60 ${isMetricsExpanded ? 'rotate-180' : ''}`} />
              Performance
            </span>
            <div className="flex items-center gap-2.5">
              <span className={`font-bold font-mono text-[11px] ${formatColor(metrics['Sys ROI'])}`}>
                {formatPlus(metrics['Sys ROI'])}
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowSignals(!showSignals); }}
                className={`p-1 rounded-md transition-colors ${!showSignals ? 'text-plt-orange bg-plt-orange/15' : 'text-white/40 hover:text-white hover:bg-white/[0.06]'}`}
                title={showSignals ? "Hide Signals" : "Show Signals"}
              >
                {showSignals ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            </div>
          </div>

          {/* Expanded Table */}
          {isMetricsExpanded && (
            <div className="w-64 bg-black/40 backdrop-blur-2xl p-1">
              <table className="w-full text-right border-collapse text-[10px]">
                <tbody>
                  <tr className="border-b border-white/[0.05]">
                    <td className="py-1.5 px-2.5 text-white/50 font-medium text-left">System Total ROI</td>
                    <td className={`py-1.5 px-2.5 font-mono font-semibold ${formatColor(metrics['Sys ROI'])}`}>{formatPlus(metrics['Sys ROI'])}</td>
                  </tr>
                  <tr className="border-b border-white/[0.05]">
                    <td className="py-1.5 px-2.5 text-white/50 font-medium text-left">Buy & Hold ROI</td>
                    <td className="py-1.5 px-2.5 font-mono text-white">{metrics['B&H ROI']}%</td>
                  </tr>
                  <tr className="border-b border-white/[0.05]">
                    <td className="py-1.5 px-2.5 text-white/50 font-medium text-left">ROI Margin</td>
                    <td className={`py-1.5 px-2.5 font-mono font-semibold ${formatColor(metrics['ROI Margin'])}`}>{formatPlus(metrics['ROI Margin'])}</td>
                  </tr>
                  <tr className="border-b border-white/[0.05]">
                    <td className="py-1.5 px-2.5 text-white/50 font-medium text-left">Win Rate</td>
                    <td className="py-1.5 px-2.5 font-mono text-white">{metrics['Win Rate']}%</td>
                  </tr>
                  <tr className="border-b border-white/[0.05]">
                    <td className="py-1.5 px-2.5 text-white/50 font-medium text-left">Max Drawdown</td>
                    <td className="py-1.5 px-2.5 font-mono text-[#ef4444] font-semibold">{metrics['Max Drawdown']}%</td>
                  </tr>
                  <tr className="border-b border-white/[0.05]">
                    <td className="py-1.5 px-2.5 text-white/50 font-medium text-left">Max Adverse Excursion</td>
                    <td className={`py-1.5 px-2.5 font-mono ${formatColor(metrics['Max Adverse Excursion'])}`}>{formatPlus(metrics['Max Adverse Excursion'])}</td>
                  </tr>
                  <tr className="border-b border-white/[0.05]">
                    <td className="py-1.5 px-2.5 text-white/50 font-medium text-left">Avg Bars/Trade</td>
                    <td className="py-1.5 px-2.5 font-mono text-white">{metrics['Avg Bars/Trade']}</td>
                  </tr>
                  <tr className="border-b border-white/[0.05]">
                    <td className="py-1.5 px-2.5 text-white/50 font-medium text-left">Avg Return / Trade</td>
                    <td className={`py-1.5 px-2.5 font-mono ${formatColor(metrics['Avg. Return/Trade'])}`}>{formatPlus(metrics['Avg. Return/Trade'])}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2.5 text-white/50 font-medium text-left">Annual CAGR</td>
                    <td className={`py-1.5 px-2.5 font-mono font-semibold ${formatColor(metrics['Annual CAGR'])}`}>{formatPlus(metrics['Annual CAGR'])}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
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
        size: 1.25,
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
        size: 1.25,
      });
    }
  }

  return markers;
}

function buildOrderOverlay(
  order: ChartOrder,
  chart: IChartApi,
  candlestickSeries: ISeriesApi<'Candlestick'>,
  container: HTMLDivElement,
): OrderOverlay | null {
  const left = chart.timeScale().timeToCoordinate(order.entryDate as Time);
  const entryTop = candlestickSeries.priceToCoordinate(order.entryPrice);
  if (left === null || entryTop === null) return null;

  const targetTop = order.targetPrice === null ? null : candlestickSeries.priceToCoordinate(order.targetPrice);
  const stopTop = order.stopPrice === null ? null : candlestickSeries.priceToCoordinate(order.stopPrice);
  const clampedLeft = clampNumber(left, 8, Math.max(8, container.clientWidth - 120));
  const width = Math.max(96, container.clientWidth - clampedLeft - 76);
  const validTargetTop = targetTop !== null && targetTop < entryTop ? clampNumber(targetTop, 8, container.clientHeight - 8) : null;
  const validStopTop = stopTop !== null && stopTop > entryTop ? clampNumber(stopTop, 8, container.clientHeight - 8) : null;

  return {
    id: order.id,
    left: clampedLeft,
    width,
    entryTop: clampNumber(entryTop, 8, container.clientHeight - 8),
    targetTop: validTargetTop,
    stopTop: validStopTop,
    targetHeight: validTargetTop === null ? 0 : Math.max(6, entryTop - validTargetTop),
    stopHeight: validStopTop === null ? 0 : Math.max(6, validStopTop - entryTop),
    targetPrice: order.targetPrice,
    stopPrice: order.stopPrice,
    entryPrice: order.entryPrice,
    profitLossPct: order.profitLossPct,
  };
}

function arrangeSignalBadges(
  signals: StrategySignal[],
  visibleData: ChartData[],
  chart: IChartApi,
  candlestickSeries: ISeriesApi<'Candlestick'>,
  container: HTMLDivElement,
): SignalBadge[] {
  const reservedRects: Rect[] = [];
  if (container.clientWidth >= 560) {
    reservedRects.push({
      left: Math.max(0, container.clientWidth - 330),
      top: 8,
      right: container.clientWidth - 56,
      bottom: 300,
    });
  }

  const placedRects = [...reservedRects];
  const selected: SignalBadge[] = [];
  const candidates = signals.filter((signal) => signal.signal !== 'HOLD').slice().reverse();

  for (const signal of candidates) {
    const badge = buildSignalBadge(signal, visibleData, chart, candlestickSeries, container);
    if (!badge) continue;

    const rect = getSignalBadgeRect(badge);
    if (placedRects.some((placedRect) => rectsOverlap(rect, placedRect))) continue;

    selected.push(badge);
    placedRects.push(rect);

    if (selected.length >= MAX_VISIBLE_SIGNAL_BADGES) break;
  }

  return selected.sort((a, b) => a.left - b.left);
}

function buildSignalBadge(
  signal: StrategySignal,
  visibleData: ChartData[],
  chart: IChartApi,
  candlestickSeries: ISeriesApi<'Candlestick'>,
  container: HTMLDivElement,
): SignalBadge | null {
  if (signal.signal === 'HOLD') return null;

  const x = chart.timeScale().timeToCoordinate(signal.date as Time);
  const candle = visibleData.find((item) => item.time === signal.date);
  const signalPrice = Number(signal.price ?? candle?.close);
  if (x === null || !Number.isFinite(signalPrice)) return null;
  if (x < -80 || x > container.clientWidth + 80) return null;

  const priceTop = candlestickSeries.priceToCoordinate(signalPrice);
  if (priceTop === null) return null;

  const kind = signal.signal === 'BUY' ? 'buy' : 'sell';
  const width = kind === 'buy' ? 104 : 112;
  const height = 36;
  const y = kind === 'buy' ? priceTop + 18 : priceTop - 46;
  const priceDetail = signalPrice.toFixed(2);
  const reason = signal.entryReason ?? signal.exitReason;

  return {
    id: `${signal.date}-${signal.signal}`,
    left: clampNumber(x, width / 2 + 8, container.clientWidth - width / 2 - 8),
    top: clampNumber(y, 48, container.clientHeight - height - 8),
    width,
    height,
    label: formatSignalLabel(signal.signal),
    detail: reason ? `${reason} · ${priceDetail}` : priceDetail,
    kind,
  };
}

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function getSignalBadgeRect(badge: SignalBadge): Rect {
  return {
    left: badge.left - badge.width / 2 - 6,
    top: badge.top - 6,
    right: badge.left + badge.width / 2 + 6,
    bottom: badge.top + badge.height + 6,
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatSignalLabel(signal: string): string {
  if (signal === 'BUY') return 'BUY';
  if (signal === 'SELL_TP') return 'TP';
  if (signal === 'SELL_TRAIL') return 'TRAIL';
  if (signal === 'SELL_SL') return 'STOP';
  if (signal === 'SELL_STRUCT') return 'STRUCT';
  return 'EXIT';
}

function getExitMarker(signal: string): { text: string; color: string } {
  if (signal === 'SELL_TP') return { text: 'TP', color: '#3b82f6' };
  if (signal === 'SELL_TRAIL') return { text: 'TRAIL', color: '#f59e0b' };
  if (signal === 'SELL_SL') return { text: 'STOP', color: '#ef4444' };
  if (signal === 'SELL_STRUCT') return { text: 'STRUCT', color: '#ef4444' };
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
