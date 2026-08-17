'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Search, Pause, Play, RotateCcw, SkipBack, SkipForward, StepBack, StepForward, X, ChevronDown, Eye, EyeOff, Sparkles, Loader2 } from '@/components/ui/icons';
import { BarChart2, Check } from 'lucide-react';
import AddOrderModal from '@/components/platform/AddOrderModal';
import EditOrderModal from '@/components/platform/EditOrderModal';
import CloseOrderModal from '@/components/platform/CloseOrderModal';
import { INDICATORS, getAvailableIndicators } from '@/indicators';
import { WatchlistItem } from '@/components/platform/RightSidebar';
import { useToast } from '@/context/ToastContext';

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
  order: ChartOrder;
  left: number;
  width: number;
  entryTop: number;
  targetTop: number | null;
  stopTop: number | null;
  currentTop: number | null;
  profitBoxTop: number | null;
  profitBoxHeight: number;
  stopBoxTop: number | null;
  stopBoxHeight: number;
  isProfit: boolean;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  marketValue: number;
  profitLoss: number;
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
  watchlist?: WatchlistItem[];
  showSignals?: boolean;
  onMetricsChange?: (metrics: Record<string, string> | null) => void;
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
  watchlist = [],
  initialReplayMode = false,
  onReplayStateChange,
  selectedStrategy = 'psi',
  strategyParams = {},
  strategyStartDate,
  strategyEndDate,
  setStrategyStartDate,
  setStrategyEndDate,
  activeIndicators = [],
  showSignals = true,
  onMetricsChange,
}: ChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markerApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const orderPriceLineRefs = useRef<Map<number, IPriceLine[]>>(new Map());

  const [metrics, setMetrics] = useState<Record<string, string> | null>(null);
  const [orders, setOrders] = useState<ChartOrder[]>([]);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderOverlays, setOrderOverlays] = useState<OrderOverlay[]>([]);
  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState<ChartOrder | null>(null);
  const [selectedOrderToClose, setSelectedOrderToClose] = useState<ChartOrder | null>(null);
  const [positionsRefreshKey, setPositionsRefreshKey] = useState(0);
  const [chartSignals, setChartSignals] = useState<StrategySignal[]>([]);
  const [replayMode, setReplayMode] = useState(initialReplayMode);
  const [replayIndex, setReplayIndex] = useState(() =>
    initialReplayMode ? getDefaultReplayIndex(data) : Math.max(0, data.length - 1),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(PLAYBACK_SPEEDS[0].delay);

  const [isPredicting, setIsPredicting] = useState(false);
  const predictionSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);

  // Clear previous predictions and trigger loading skeleton on symbol/data change
  useEffect(() => {
    if (predictionSeriesRef.current && chartRef.current) {
      try {
        chartRef.current.removeSeries(predictionSeriesRef.current);
      } catch {}
      predictionSeriesRef.current = null;
    }

    setIsChartLoading(true);
    const timer = setTimeout(() => {
      setIsChartLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [symbol, data]);

  const [predictPopoverOpen, setPredictPopoverOpen] = useState(false);
  const [predictDaysInput, setPredictDaysInput] = useState("10");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [indicatorsPopoverOpen, setIndicatorsPopoverOpen] = useState(false);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);

  // In-place Ticker Search State
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const displaySymbol = symbol.replace('.CA', '');
  const currentTickerItem = useMemo(() => {
    return watchlist.find(item => item.symbol === symbol) || {
      symbol,
      companyName: displaySymbol,
      logoUrl: null,
      website: null,
      price: data[data.length - 1]?.close ? Number(data[data.length - 1].close).toFixed(2) : '0.00',
      isUp: true,
      changePct: '0.00%',
      sector: 'EGX'
    };
  }, [watchlist, symbol, displaySymbol, data]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return watchlist.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return watchlist.filter(item => 
      item.symbol.toLowerCase().includes(q) ||
      item.companyName.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [searchQuery, watchlist]);

  // Focus search input on open
  useEffect(() => {
    if (isSearchDropdownOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isSearchDropdownOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    }
    if (isSearchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSearchDropdownOpen]);

  // Keyboard shortcut ⌘K / Ctrl+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchDropdownOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isSearchDropdownOpen) {
        setIsSearchDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchDropdownOpen]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();
  const availableIndicators = useMemo(() => getAvailableIndicators(), []);

  const toggleIndicator = useCallback((id: string) => {
    const current = new Set(activeIndicators);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (current.size > 0) {
      params.set('indicators', Array.from(current).join(','));
    } else {
      params.delete('indicators');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeIndicators, searchParams, pathname, router]);

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
      const newLastIndex = visibleData.length - 1;
      const currentYear = new Date().getFullYear();
      const startOfYearDate = `${currentYear}-01-01`;
      let startOfYearIndex = visibleData.findIndex((d) => d.time >= startOfYearDate);
      if (startOfYearIndex === -1) {
        startOfYearIndex = Math.max(0, newLastIndex - 60);
      }

      if (replayMode) {
        if (currentLogicalRange) {
          const barsVisible = currentLogicalRange.to - currentLogicalRange.from;
          const half = Math.floor(barsVisible / 2);
          timeScale.setVisibleLogicalRange({
            from: newLastIndex - half,
            to: newLastIndex + half,
          });
        } else {
          timeScale.setVisibleLogicalRange({
            from: startOfYearIndex,
            to: newLastIndex + 6,
          });
        }
      } else {
        // Default zoom: from start of current year to latest candle with right margin
        timeScale.setVisibleLogicalRange({
          from: startOfYearIndex,
          to: newLastIndex + 6,
        });
      }
    }
  }, [visibleData, replayMode]);

  useEffect(() => {
    const recenterChart = () => {
      chartRef.current?.priceScale('right').applyOptions({ autoScale: true });
      const lastIndex = visibleData.length - 1;
      if (lastIndex >= 0) {
        const currentYear = new Date().getFullYear();
        const startOfYearDate = `${currentYear}-01-01`;
        let startOfYearIndex = visibleData.findIndex((d) => d.time >= startOfYearDate);
        if (startOfYearIndex === -1) {
          startOfYearIndex = Math.max(0, lastIndex - 60);
        }
        chartRef.current?.timeScale().setVisibleLogicalRange({
          from: startOfYearIndex,
          to: lastIndex + 6,
        });
      }
    };

    window.addEventListener('quantegx:chart-recenter', recenterChart);
    return () => window.removeEventListener('quantegx:chart-recenter', recenterChart);
  }, [visibleData]);

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
  }, [symbol, positionsRefreshKey]);

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
        .map((order) => buildOrderOverlay(order, chart, candlestickSeries, container, visibleData))
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
          if (isActive && json.metrics) {
            setMetrics(json.metrics);
            onMetricsChange?.(json.metrics);
          }
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
      toast.error("Prediction Failed", "Check console for details.");
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

  const predictButtonUI = (
    <div className="relative">
      <button
        type="button"
        title="Predict Future"
        onClick={() => setPredictPopoverOpen(true)}
        disabled={isPredicting || data.length === 0}
        className="h-7.5 rounded-md border border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.18] px-3 text-xs font-medium text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 flex items-center"
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
        <div className="absolute bottom-full left-0 mb-2 w-60 rounded-md border border-white/[0.15] bg-black/85 backdrop-blur-2xl p-3.5 text-xs text-white shadow-2xl z-[60]">
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
                className="h-7 w-full rounded-md border border-white/[0.09] bg-white/[0.03] px-2.5 text-xs text-white outline-none transition-colors focus:border-plt-orange"
              />
            </div>
            
            <button
              type="button"
              onClick={handlePredict}
              className="h-8 w-full rounded-md bg-plt-orange text-xs font-medium text-white transition-all hover:bg-plt-orange-hover"
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

      {/* Top-Left In-Place Ticker Selector Pill & Search Dropdown */}
      <div className="absolute top-4 left-4 z-30" ref={searchDropdownRef}>
        {/* Interactive Trigger Pill */}
        <button
          type="button"
          onClick={() => setIsSearchDropdownOpen((prev) => !prev)}
          className="group flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-black/60 hover:bg-black/75 border border-white/[0.12] hover:border-white/[0.22] shadow-2xl backdrop-blur-xl transition-all text-left cursor-pointer select-none"
        >
          {/* Logo / Initials */}
          <div className="w-5 h-5 rounded-[4px] bg-white/[0.04] border border-white/[0.09] flex items-center justify-center overflow-hidden shrink-0">
            {currentTickerItem.logoUrl ? (
              <img src={currentTickerItem.logoUrl} alt={displaySymbol} className="w-full h-full object-contain bg-transparent" />
            ) : (
              <span className="text-[9px] font-bold text-white">{displaySymbol.substring(0, 2)}</span>
            )}
          </div>

          {/* Symbol & Name */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-white text-xs tracking-tight group-hover:text-plt-orange transition-colors">
              {displaySymbol}
            </span>
            <span className="text-[11px] text-white/40 font-normal hidden sm:inline truncate max-w-[140px]">
              {currentTickerItem.companyName}
            </span>
          </div>

          {/* Quick Search ⌘K Indicator */}
          <div className="flex items-center gap-1 text-white/40 group-hover:text-white/80 transition-colors pl-1 border-l border-white/[0.08]">
            <Search size={11} />
            <ChevronDown size={11} className={`transition-transform duration-150 ${isSearchDropdownOpen ? 'rotate-180 text-white' : ''}`} />
          </div>
        </button>

        {/* In-Place Dropdown Menu */}
        {isSearchDropdownOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-black/85 border border-white/[0.15] rounded-md shadow-2xl backdrop-blur-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input */}
            <div className="flex items-center px-3 py-2 border-b border-white/[0.09] bg-white/[0.02]">
              <Search size={13} className="text-white/40 mr-2 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search EGX tickers or names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder:text-white/30"
              />
              <div className="text-[9px] font-mono text-white/30 px-1 py-0.5 rounded bg-white/[0.05] border border-white/[0.08]">
                ESC
              </div>
            </div>

            {/* List of Tickers */}
            <div className="max-h-64 overflow-y-auto no-scrollbar p-1 space-y-0.5">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-white/40 text-xs">No tickers found</div>
              ) : (
                searchResults.map((item) => {
                  const isSelected = item.symbol === symbol;
                  const itemDisplay = item.symbol.replace('.CA', '');
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => {
                        setIsSearchDropdownOpen(false);
                        router.push(`?ticker=${item.symbol}`);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white/[0.08] text-white font-medium border border-white/[0.12]'
                          : 'hover:bg-white/[0.04] text-white/80 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-[4px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                          {item.logoUrl ? (
                            <img src={item.logoUrl} alt={item.symbol} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[8px] font-bold text-white">{itemDisplay.substring(0, 2)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white flex items-center gap-1.5">
                            <span className={isSelected ? 'text-plt-orange font-semibold' : ''}>{itemDisplay}</span>
                            <span className="text-[10px] text-white/40 font-normal truncate max-w-[120px]">{item.companyName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <div className="text-[11px] font-mono font-medium text-white">{item.price}</div>
                        {item.changePct && (
                          <div className={`text-[9px] font-mono ${item.isUp ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                            {item.changePct}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {orderOverlays.map((overlay) => (
        <div key={overlay.id} className="absolute inset-0 z-10 pointer-events-none">
          {/* Target / Profit Zone (Subtle green tint, NO blur so candlesticks are completely crisp) */}
          {overlay.profitBoxTop !== null && overlay.profitBoxHeight > 0 && (
            <div
              className="absolute border-t border-l border-r border-[#22c55e]/30 bg-[#22c55e]/[0.08] pointer-events-none rounded-t-sm"
              style={{
                left: overlay.left,
                width: overlay.width,
                top: overlay.profitBoxTop,
                height: overlay.profitBoxHeight,
              }}
            />
          )}

          {/* Stop / Loss Zone (Subtle red tint, NO blur) */}
          {overlay.stopBoxTop !== null && overlay.stopBoxHeight > 0 && (
            <div
              className="absolute border-b border-l border-r border-[#ef4444]/30 bg-[#ef4444]/[0.08] pointer-events-none rounded-b-sm"
              style={{
                left: overlay.left,
                width: overlay.width,
                top: overlay.stopBoxTop,
                height: overlay.stopBoxHeight,
              }}
            />
          )}

          {/* Center Entry Price Line */}
          <div
            className="absolute border-b border-white/20 pointer-events-none"
            style={{
              left: overlay.left,
              width: overlay.width,
              top: overlay.entryTop,
            }}
          />

          {/* Interactive Informative Position Card (Condensed Multi-line) */}
          <div
            onClick={() => setSelectedOrderToEdit(overlay.order)}
            className="group pointer-events-auto cursor-pointer absolute flex flex-col -translate-y-1/2 rounded-lg border border-white/[0.16] bg-black/90 hover:bg-black/95 hover:border-plt-orange/60 p-2 text-white shadow-2xl backdrop-blur-xl transition-all select-none z-30 min-w-[170px] max-w-[215px]"
            style={{ left: overlay.left, top: overlay.entryTop }}
            title="Click to Edit Position"
          >
            {/* Top Row: [LONG] Tag, Quantity, and Quick Close Button */}
            <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-white/[0.08]">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-plt-orange bg-plt-orange/15 px-1.5 py-0.5 rounded border border-plt-orange/30">
                  LONG
                </span>
                <span className="text-[10px] font-mono text-white/70 font-medium">
                  {overlay.quantity.toLocaleString()} <span className="text-[9px] text-white/40 font-sans">units</span>
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOrderToClose(overlay.order);
                }}
                className="px-1.5 py-0.5 text-[9px] rounded bg-[#ef4444]/15 hover:bg-[#ef4444] text-[#ef4444] hover:text-white border border-[#ef4444]/30 transition-all font-sans font-medium"
                title="Close Position"
              >
                Close
              </button>
            </div>

            {/* Bottom Row: Entry / Market Value and Real-Time P/L */}
            <div className="pt-1.5 flex items-center justify-between gap-2 text-[10px] font-mono">
              <div className="flex flex-col">
                <span className="text-[8.5px] text-white/40 font-sans leading-none">Entry / Val</span>
                <span className="text-white/85 text-[10.5px] mt-0.5 font-medium">
                  {overlay.entryPrice.toFixed(2)} <span className="text-white/30 text-[9px]">·</span> {overlay.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[8.5px] text-white/40 font-sans leading-none">Unrealized P/L</span>
                <span className={`font-semibold text-[10.5px] mt-0.5 flex items-center gap-0.5 ${overlay.isProfit ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  <span>{overlay.profitLoss >= 0 ? '+' : ''}{overlay.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                  <span className="text-[9.5px]">({overlay.profitLossPct >= 0 ? '+' : ''}{overlay.profitLossPct.toFixed(2)}%)</span>
                </span>
              </div>
            </div>
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
        <div className="absolute bottom-5 left-5 z-40 flex items-center gap-1.5 rounded-md border border-white/[0.12] bg-black/60 backdrop-blur-xl p-1 shadow-2xl">
          {/* 1. Bar Replay */}
          <button
            type="button"
            title="Bar Replay"
            aria-label="Bar Replay"
            disabled={!hasReplayRoom}
            onClick={enableReplay}
            className="h-7.5 rounded-md px-2.5 text-xs font-medium text-white/80 bg-white/[0.03] border border-white/[0.09] hover:bg-white/[0.06] hover:border-white/[0.18] hover:text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5 text-white/60" />
            <span>Replay</span>
          </button>

          {/* 2. Predict N Days */}
          {predictButtonUI}

          {/* 3. Indicators Popover */}
          <div className="relative">
            <button
              type="button"
              title="Technical Indicators"
              onClick={() => setIndicatorsPopoverOpen(!indicatorsPopoverOpen)}
              className={`h-7.5 rounded-md px-2.5 text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeIndicators.length > 0
                  ? 'bg-plt-orange/15 text-plt-orange border border-plt-orange/40 font-semibold'
                  : 'text-white/80 bg-white/[0.03] border border-white/[0.09] hover:bg-white/[0.06] hover:border-white/[0.18] hover:text-white'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Indicators</span>
              {activeIndicators.length > 0 && (
                <span className="ml-0.5 px-1 py-0.2 rounded text-[9px] bg-plt-orange text-black font-bold">
                  {activeIndicators.length}
                </span>
              )}
            </button>

            {indicatorsPopoverOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-64 rounded-md border border-white/[0.15] bg-black/85 backdrop-blur-2xl p-3 text-xs text-white shadow-2xl z-[60]">
                <div className="mb-2 flex items-center justify-between border-b border-white/[0.09] pb-2">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-plt-orange" /> Technical Overlays
                  </div>
                  <button
                    type="button"
                    onClick={() => setIndicatorsPopoverOpen(false)}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.08] hover:text-white transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-1.5 pt-1">
                  {availableIndicators.map((ind) => {
                    const isActive = activeIndicators.includes(ind.id);
                    return (
                      <div
                        key={ind.id}
                        onClick={() => toggleIndicator(ind.id)}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all border ${
                          isActive 
                            ? 'bg-plt-orange/10 border-plt-orange/30 text-white' 
                            : 'bg-white/[0.02] border-white/[0.06] text-white/70 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-xs text-white">{ind.name}</div>
                          <div className="text-[10px] text-white/40 leading-snug">{ind.description}</div>
                        </div>
                        <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                          isActive ? 'bg-plt-orange border-plt-orange text-black' : 'border-white/20 bg-transparent'
                        }`}>
                          {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. Add Position CTA */}
          <button
            type="button"
            onClick={() => setIsAddOrderOpen(true)}
            className="h-7.5 rounded-md bg-plt-orange hover:bg-plt-orange-hover text-white px-3 text-xs font-medium transition-colors flex items-center gap-1 shadow-sm"
            title="Add Position"
          >
            <span>+</span>
            <span>Add Position</span>
          </button>
        </div>
      ) : (
        <div className="absolute bottom-5 left-5 z-40 flex max-w-[calc(100vw-120px)] flex-wrap items-center gap-1.5 rounded-md border border-white/[0.12] bg-black/60 backdrop-blur-xl p-1.5 text-xs text-white shadow-2xl">
          <button
            type="button"
            title="Reset replay point"
            aria-label="Reset replay point"
            onClick={jumpToStart}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Step back"
            aria-label="Step back"
            disabled={replayIndex <= 0}
            onClick={() => stepReplay(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
          >
            <StepBack className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title={isPlaying ? 'Pause replay' : 'Play replay'}
            aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
            disabled={replayIndex >= data.length - 1}
            onClick={() => setIsPlaying((value) => !value)}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-plt-orange text-white transition-all hover:bg-plt-orange-hover disabled:opacity-30"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            title="Step forward"
            aria-label="Step forward"
            disabled={replayIndex >= data.length - 1}
            onClick={() => stepReplay(1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
          >
            <StepForward className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Jump to latest"
            aria-label="Jump to latest"
            onClick={jumpToLatest}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
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
            className="h-7 w-32 rounded-md border border-white/[0.09] bg-white/[0.03] px-2 text-[10px] text-white outline-none transition-colors focus:border-plt-orange"
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
            className="h-7 rounded-md border border-white/[0.09] bg-white/[0.03] px-1.5 text-[10px] text-white outline-none transition-colors focus:border-plt-orange"
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
            className="h-7 rounded-md px-2.5 text-xs font-medium text-white/70 bg-white/[0.03] border border-white/[0.09] hover:bg-white/[0.06] hover:text-white transition-colors"
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

      {/* Ticker-Switching Loading Skeleton Overlay */}
      <AnimatePresence>
        {isChartLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
          >
            {/* Grid Line Shimmer */}
            <div className="absolute inset-0 flex flex-col justify-between py-12 px-6 opacity-15">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-full h-px bg-white/25" />
              ))}
            </div>

            {/* Shimmering Candlestick Bars */}
            <div className="absolute bottom-12 left-10 right-10 h-3/5 flex items-end gap-1 px-4 opacity-20">
              {[45, 62, 55, 78, 50, 70, 60, 88, 45, 74, 82, 60, 72, 54, 86, 64, 48, 76, 62, 94, 55, 70, 46, 80, 60, 84, 50, 68, 76, 58].map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.15, 0.65, 0.15] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: (i % 6) * 0.1 }}
                  className="flex-1 bg-white rounded-[1px]"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            {/* Center Loading Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative z-10 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/80 border border-white/[0.12] backdrop-blur-md shadow-2xl"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-plt-orange animate-pulse" />
              <span className="text-xs font-mono font-medium text-white tracking-wide">
                Loading {displaySymbol}...
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddOrderModal
        isOpen={isAddOrderOpen}
        onClose={() => setIsAddOrderOpen(false)}
        initialData={{
          symbol,
          price: data[data.length - 1]?.close,
          date: data[data.length - 1]?.time,
        }}
      />

      <EditOrderModal
        isOpen={Boolean(selectedOrderToEdit)}
        onClose={() => setSelectedOrderToEdit(null)}
        onSuccess={() => {
          setSelectedOrderToEdit(null);
          setPositionsRefreshKey((k) => k + 1);
        }}
        order={selectedOrderToEdit}
      />

      <CloseOrderModal
        isOpen={Boolean(selectedOrderToClose)}
        onClose={() => setSelectedOrderToClose(null)}
        onSuccess={() => {
          setSelectedOrderToClose(null);
          setPositionsRefreshKey((k) => k + 1);
        }}
        order={selectedOrderToClose}
      />
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
  visibleData: ChartData[],
): OrderOverlay | null {
  const left = chart.timeScale().timeToCoordinate(order.entryDate as Time);
  const entryTop = candlestickSeries.priceToCoordinate(order.entryPrice);
  if (left === null || entryTop === null) return null;

  const lastCandle = visibleData[visibleData.length - 1];
  const lastCandleX = lastCandle
    ? chart.timeScale().timeToCoordinate(lastCandle.time as Time)
    : null;

  // The box stops precisely at the latest current candle!
  const rightX = lastCandleX !== null ? lastCandleX : left + 120;
  const width = Math.max(24, rightX - left);

  const effectiveCurrentPrice = order.currentPrice || (lastCandle ? Number(lastCandle.close) : order.entryPrice);
  const currentTop = candlestickSeries.priceToCoordinate(effectiveCurrentPrice);
  const targetTop = order.targetPrice !== null ? candlestickSeries.priceToCoordinate(order.targetPrice) : null;
  const stopTop = order.stopPrice !== null ? candlestickSeries.priceToCoordinate(order.stopPrice) : null;

  const isProfit = effectiveCurrentPrice >= order.entryPrice;

  // Determine upper green box (Target / Unrealized Profit zone)
  let profitBoxTop: number | null = null;
  let profitBoxHeight = 0;
  if (targetTop !== null && targetTop < entryTop) {
    profitBoxTop = targetTop;
    profitBoxHeight = entryTop - targetTop;
  } else if (isProfit && currentTop !== null && currentTop < entryTop) {
    profitBoxTop = currentTop;
    profitBoxHeight = entryTop - currentTop;
  }

  // Determine lower red box (Stop / Loss zone)
  let stopBoxTop: number | null = null;
  let stopBoxHeight = 0;
  if (stopTop !== null && stopTop > entryTop) {
    stopBoxTop = entryTop;
    stopBoxHeight = stopTop - entryTop;
  } else if (!isProfit && currentTop !== null && currentTop > entryTop) {
    stopBoxTop = entryTop;
    stopBoxHeight = currentTop - entryTop;
  }

  const marketValue = order.quantity * effectiveCurrentPrice;
  const pnl = order.quantity * (effectiveCurrentPrice - order.entryPrice);
  const pnlPct = order.entryPrice ? ((effectiveCurrentPrice - order.entryPrice) / order.entryPrice) * 100 : 0;

  return {
    id: order.id,
    order,
    left,
    width,
    entryTop: clampNumber(entryTop, 8, container.clientHeight - 8),
    profitBoxTop: profitBoxTop !== null ? clampNumber(profitBoxTop, 8, container.clientHeight - 8) : null,
    profitBoxHeight,
    stopBoxTop: stopBoxTop !== null ? clampNumber(stopBoxTop, 8, container.clientHeight - 8) : null,
    stopBoxHeight,
    targetTop: targetTop !== null ? clampNumber(targetTop, 8, container.clientHeight - 8) : null,
    stopTop: stopTop !== null ? clampNumber(stopTop, 8, container.clientHeight - 8) : null,
    currentTop: currentTop !== null ? clampNumber(currentTop, 8, container.clientHeight - 8) : null,
    isProfit,
    entryPrice: order.entryPrice,
    currentPrice: effectiveCurrentPrice,
    quantity: order.quantity,
    marketValue,
    profitLoss: pnl,
    profitLossPct: pnlPct,
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
