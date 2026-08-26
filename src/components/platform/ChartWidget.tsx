'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';
import { Sparkles, Briefcase, X } from '@/components/ui/icon-library';
import AddOrderModal from '@/components/platform/AddOrderModal';
import EditOrderModal from '@/components/platform/EditOrderModal';
import CloseOrderModal from '@/components/platform/CloseOrderModal';
import TickerPositions, { type TickerOrder } from '@/components/platform/TickerPositions';
import { INDICATORS, type IndicatorLine } from '@/indicators';
import { useToast } from '@/context/ToastContext';

// Modular Chart Imports
import type {
  ChartData,
  ReplayState,
  ChartOrder,
  OrderDraft,
  OrderOverlay,
  StrategySignal,
  ChartWidgetProps,
} from './chart/types';
import {
  PLAYBACK_SPEEDS,
} from './chart/types';
import {
  cssTokenColor,
  resolveChartColor,
  clampNumber,
  buildMarkers,
  parseChartTime,
  sanitizeChartSeriesData,
  getDefaultReplayIndex,
  findIndexAtOrBefore,
  parseOptionalNumber,
} from './chart/utils';
import ChartTickerHeader from './chart/ChartTickerHeader';
import ChartFloatingControls from './chart/ChartFloatingControls';
import ChartReplayControls from './chart/ChartReplayControls';
import ChartIndicatorsPopover from './chart/ChartIndicatorsPopover';
import ChartPredictPopover from './chart/ChartPredictPopover';
import ChartOrderOverlays from './chart/ChartOrderOverlays';
import ChartOrderDraftPopover from './chart/ChartOrderDraftPopover';
import ChartLoadingSkeleton from './chart/ChartLoadingSkeleton';

// Re-export shared types for backward compatibility across the app
export type { ChartData, ReplayState };

export default function ChartWidget({
  data,
  symbol,
  timeframe = 'D',
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
  tickerPositions = [],
  currentPrice,
}: ChartWidgetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [positionsDrawerOpen, setPositionsDrawerOpen] = useState(false);
  const openPositionsCount = tickerPositions.filter((o) => o.status === 'OPEN').length;

  const isFund = useMemo(() => {
    return ['CI_QUANT', 'OSOUL', 'COF'].includes(symbol.toUpperCase());
  }, [symbol]);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markerApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const orderPriceLineRefs = useRef<Map<number, IPriceLine[]>>(new Map());

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
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(PLAYBACK_SPEEDS[0].delay);

  const [isPredicting, setIsPredicting] = useState(false);
  const predictionSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);

  const [predictPopoverOpen, setPredictPopoverOpen] = useState(false);
  const [predictDaysInput, setPredictDaysInput] = useState('10');
  const [indicatorsPopoverOpen, setIndicatorsPopoverOpen] = useState(false);
  const [expandedIndicators, setExpandedIndicators] = useState<Record<string, boolean>>({ supportResistance: true });
  const indicatorLineSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);

  // Active hovered candle for live OHLCV legend
  const [hoveredCandle, setHoveredCandle] = useState<ChartData | null>(null);

  // Close positions drawer on ESC key
  useEffect(() => {
    if (!positionsDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPositionsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [positionsDrawerOpen]);

  const displaySymbol = symbol.replace('.CA', '');

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

  const toggleIndicatorExpanded = useCallback((id: string) => {
    setExpandedIndicators((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleToggleIndicator = (id: string) => {
    const next = activeIndicators.includes(id)
      ? activeIndicators.filter((i) => i !== id)
      : [...activeIndicators, id];
    const params = new URLSearchParams(window.location.search);
    if (next.length > 0) {
      params.set('indicators', next.join(','));
    } else {
      params.delete('indicators');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleUpdateStrategyParam = (key: string, val: any) => {
    const params = new URLSearchParams(window.location.search);
    params.set(key, String(val));
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Replay slice
  const visibleData = useMemo(() => {
    if (!replayMode) return data;
    const clampedIndex = clampNumber(replayIndex, 0, Math.max(0, data.length - 1));
    return data.slice(0, clampedIndex + 1);
  }, [data, replayIndex, replayMode]);

  const replayDate = replayMode ? visibleData[visibleData.length - 1]?.time ?? null : null;
  const activeCandle = hoveredCandle ?? visibleData[visibleData.length - 1] ?? null;

  // Sync replay state upward
  useEffect(() => {
    onReplayStateChange?.({
      active: replayMode,
      startDate: replayMode && visibleData[0] ? String(visibleData[0].time) : null,
      endDate: replayDate !== null ? String(replayDate) : null,
    });
  }, [onReplayStateChange, replayDate, replayMode, visibleData]);

  // Fetch signals
  useEffect(() => {
    if (!showSignals) {
      setChartSignals([]);
      return;
    }

    let active = true;
    const fetchSignals = async () => {
      try {
        const queryParams = new URLSearchParams({
          symbol,
          strategy: selectedStrategy,
          timeframe,
          ...Object.fromEntries(
            Object.entries(strategyParams).map(([k, v]) => [k, String(v)])
          ),
        });

        if (strategyStartDate) queryParams.set('startDate', strategyStartDate);
        if (strategyEndDate) queryParams.set('endDate', strategyEndDate);

        const res = await fetch(`/api/signals?${queryParams.toString()}`);
        if (!res.ok) throw new Error('Signals fetch failed');
        const json = await res.json();
        if (active) {
          setChartSignals(Array.isArray(json.signals) ? json.signals : []);
          onMetricsChange?.(
            json.formattedMetrics && typeof json.formattedMetrics === 'object'
              ? json.formattedMetrics
              : null,
          );
        }
      } catch (err) {
        console.error('Signals loading error:', err);
      }
    };

    fetchSignals();
    return () => {
      active = false;
    };
  }, [onMetricsChange, selectedStrategy, showSignals, strategyEndDate, strategyParams, strategyStartDate, symbol, timeframe]);

  // Fetch active orders for overlays
  useEffect(() => {
    let active = true;
    const fetchOrders = async () => {
      try {
        const res = await fetch(`/api/positions?symbol=${encodeURIComponent(symbol)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (active && Array.isArray(json.orders)) {
          setOrders(json.orders);
        }
      } catch (err) {
        console.error('Failed to fetch orders for chart overlay', err);
      }
    };
    fetchOrders();
    return () => {
      active = false;
    };
  }, [symbol, positionsRefreshKey]);

  // Core Chart Canvas Lifecycle
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    container.innerHTML = '';

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: cssTokenColor('--palette-chart', '#141B28') },
        textColor: cssTokenColor('--plt-muted', '#737373'),
        fontSize: 11,
      },
      grid: {
        vertLines: { color: cssTokenColor('--palette-chart-grid', '#1D2431') },
        horzLines: { color: cssTokenColor('--palette-chart-grid', '#1D2431') },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: cssTokenColor('--palette-chart-grid', '#1D2431'),
      },
      timeScale: {
        borderColor: cssTokenColor('--palette-chart-grid', '#1D2431'),
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    let mainSeries: ISeriesApi<'Candlestick'> | ISeriesApi<'Area'>;
    if (isFund) {
      mainSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(255, 255, 255, 0.14)',
        bottomColor: 'rgba(255, 255, 255, 0.02)',
        lineColor: cssTokenColor('--plt-text-primary', '#ffffff'),
        lineWidth: 2,
      });
    } else {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: cssTokenColor('--plt-profit', '#089981'),
        downColor: cssTokenColor('--plt-risk', '#f23645'),
        borderUpColor: cssTokenColor('--plt-profit', '#089981'),
        borderDownColor: cssTokenColor('--plt-risk', '#f23645'),
        wickUpColor: cssTokenColor('--plt-profit', '#089981'),
        wickDownColor: cssTokenColor('--plt-risk', '#f23645'),
      });
    }
    candlestickSeriesRef.current = mainSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: cssTokenColor('--palette-chart-grid', '#1D2431'),
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Crosshair movement tracking for live OHLCV legend
    chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
      if (
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > container.clientHeight
      ) {
        setHoveredCandle(null);
      } else {
        const timeStr = typeof param.time === 'string' ? param.time : String(param.time);
        const candle = (data || []).find((d) => d.time === timeStr);
        if (candle) {
          setHoveredCandle(candle);
        }
      }
    });

    // Chart Click Handler: click on any candle to draft an open position
    chart.subscribeClick((param: MouseEventParams<Time>) => {
      if (!param.point || !param.time || !candlestickSeriesRef.current) {
        return;
      }
      const timeStr = typeof param.time === 'string'
        ? param.time
        : (param.time as any).year
        ? `${(param.time as any).year}-${String((param.time as any).month).padStart(2, '0')}-${String((param.time as any).day).padStart(2, '0')}`
        : String(param.time);

      const allData = data && data.length > 0 ? data : [];
      const bar = allData.find((d) => d.time === timeStr);
      const clickPrice = bar ? bar.close : (candlestickSeriesRef.current.coordinateToPrice(param.point.y) ?? 0);
      if (!clickPrice || clickPrice <= 0) return;

      const chartWidth = container.clientWidth;
      const chartHeight = container.clientHeight;

      const popoverX = Math.min(Math.max(16, param.point.x - 140), chartWidth - 300);
      const popoverY = Math.min(Math.max(16, param.point.y - 120), chartHeight - 340);

      const estimatedStop = (clickPrice * 0.95).toFixed(2);
      const estimatedTarget = (clickPrice * 1.08).toFixed(2);

      setOrderDraft({
        x: popoverX,
        y: popoverY,
        date: timeStr,
        entryPrice: clickPrice.toFixed(2),
        quantity: '10',
        targetPrice: estimatedTarget,
        stopPrice: estimatedStop,
        targetLabel: '+8% Target',
        stopLabel: '-5% Stop',
        loadingLevels: false,
      });
    });

    // Resize Observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data, isFund]);

  // Sync data to series
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return;

    if (isFund) {
      const areaData = sanitizeChartSeriesData(
        visibleData.map((d) => ({ time: parseChartTime(d.time), value: d.close }))
      );
      (candlestickSeriesRef.current as ISeriesApi<'Area'>).setData(areaData);
    } else {
      const candleData = sanitizeChartSeriesData(
        visibleData.map((d) => ({
          time: parseChartTime(d.time),
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );
      (candlestickSeriesRef.current as ISeriesApi<'Candlestick'>).setData(candleData);
    }

    const volumeData = sanitizeChartSeriesData(
      visibleData.map((d) => ({
        time: parseChartTime(d.time),
        value: d.volume,
        color: d.close >= d.open ? 'rgba(8, 153, 129, 0.4)' : 'rgba(242, 54, 69, 0.4)',
      }))
    );
    volumeSeriesRef.current.setData(volumeData);
  }, [isFund, visibleData]);

  // Signal Markers
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;

    if (!showSignals || chartSignals.length === 0) {
      if (markerApiRef.current) {
        markerApiRef.current.setMarkers([]);
      }
      return;
    }

    const markers = buildMarkers(chartSignals);
    if (!markerApiRef.current) {
      markerApiRef.current = createSeriesMarkers(candlestickSeriesRef.current, markers);
    } else {
      markerApiRef.current.setMarkers(markers);
    }
  }, [chartSignals, showSignals]);

  // Dynamic Indicators Rendering
  useEffect(() => {
    if (!chartRef.current || visibleData.length === 0) return;

    const chart = chartRef.current;
    const currentLines = indicatorLineSeriesRef.current;

    // Clear stale indicator series
    currentLines.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch {}
    });
    currentLines.clear();

    activeIndicators.forEach((indId) => {
      const config = INDICATORS[indId];
      if (!config) return;

      try {
        const optionsState = Object.fromEntries(
          (config.options || []).map((opt) => [
            opt.id,
            Boolean(strategyParams[`${indId}_${opt.id}`] ?? opt.defaultActive),
          ])
        );

        const result = config.compute(visibleData, optionsState);

        if (result.lines) {
          result.lines.forEach((line: IndicatorLine) => {
            const series = chart.addSeries(LineSeries, {
              color: resolveChartColor(line.color),
              lineWidth: (line.lineWidth as any) || 1,
              lineStyle: line.lineStyle ?? 0,
              title: line.name,
            });
            const lineData = sanitizeChartSeriesData(
              line.data.map((d) => ({ time: parseChartTime(d.time), value: d.value }))
            );
            series.setData(lineData);
            currentLines.set(`${indId}_${line.id || line.name}`, series);
          });
        }
      } catch (err) {
        console.error(`Error calculating indicator ${indId}:`, err);
      }
    });
  }, [activeIndicators, strategyParams, visibleData]);

  // Calculate position overlays coordinates
  const updateOrderOverlays = useCallback(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !chartContainerRef.current) {
      setOrderOverlays([]);
      return;
    }

    const chart = chartRef.current;
    const series = candlestickSeriesRef.current;
    const timeScale = chart.timeScale();
    const width = chartContainerRef.current.clientWidth;

    const overlays: OrderOverlay[] = [];

    orders
      .filter((o) => o.status === 'OPEN')
      .forEach((order) => {
        const entryCoordinate = series.priceToCoordinate(order.entryPrice);
        if (entryCoordinate === null) return;

        const targetCoordinate = order.targetPrice !== null ? series.priceToCoordinate(order.targetPrice) : null;
        const stopCoordinate = order.stopPrice !== null ? series.priceToCoordinate(order.stopPrice) : null;
        const currentCoordinate = series.priceToCoordinate(order.currentPrice);

        const entryDateClean = (order.entryDate || '').split('T')[0].split(' ')[0];
        let xCoordinate = timeScale.timeToCoordinate(parseChartTime(entryDateClean));

        if (xCoordinate === null && data && data.length > 0) {
          const targetTime = new Date(entryDateClean).getTime();
          let closestBar = data[0];
          const firstBarMs = typeof data[0].time === 'number' ? data[0].time * 1000 : new Date(data[0].time).getTime();
          let minDiff = Math.abs(firstBarMs - targetTime);
          for (let i = 1; i < data.length; i++) {
            const barMs = typeof data[i].time === 'number' ? (data[i].time as number) * 1000 : new Date(data[i].time).getTime();
            const diff = Math.abs(barMs - targetTime);
            if (diff < minDiff) {
              minDiff = diff;
              closestBar = data[i];
            }
          }
          xCoordinate = timeScale.timeToCoordinate(parseChartTime(closestBar.time));
        }

        const left = xCoordinate !== null ? xCoordinate : 10;
        const boxWidth = Math.max(100, width - left - 55);

        let profitBoxTop: number | null = null;
        let profitBoxHeight = 0;
        if (targetCoordinate !== null) {
          profitBoxTop = Math.min(entryCoordinate, targetCoordinate);
          profitBoxHeight = Math.abs(entryCoordinate - targetCoordinate);
        }

        let stopBoxTop: number | null = null;
        let stopBoxHeight = 0;
        if (stopCoordinate !== null) {
          stopBoxTop = Math.min(entryCoordinate, stopCoordinate);
          stopBoxHeight = Math.abs(entryCoordinate - stopCoordinate);
        }

        overlays.push({
          id: order.id,
          order,
          left,
          width: boxWidth,
          entryTop: entryCoordinate,
          targetTop: targetCoordinate,
          stopTop: stopCoordinate,
          currentTop: currentCoordinate,
          profitBoxTop,
          profitBoxHeight,
          stopBoxTop,
          stopBoxHeight,
          isProfit: order.profitLoss >= 0,
          entryPrice: order.entryPrice,
          currentPrice: order.currentPrice,
          quantity: order.quantity,
          marketValue: order.quantity * order.currentPrice,
          profitLoss: order.profitLoss,
          profitLossPct: order.profitLossPct,
        });
      });

    setOrderOverlays(overlays);
  }, [orders, data]);

  // Subscribe to time scale changes (pan, zoom) so overlays stay locked to candles
  useEffect(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const handleRangeChange = () => {
      updateOrderOverlays();
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);
    timeScale.subscribeVisibleTimeRangeChange(handleRangeChange);

    updateOrderOverlays();

    return () => {
      try {
        timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
        timeScale.unsubscribeVisibleTimeRangeChange(handleRangeChange);
      } catch {}
    };
  }, [updateOrderOverlays, visibleData]);

  // Replay playback timer
  useEffect(() => {
    if (!replayMode || !isPlaying) return;

    const timer = setInterval(() => {
      setReplayIndex((current) => {
        if (current >= data.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [data.length, isPlaying, playbackSpeed, replayMode]);

  // AI Prediction Handler
  const handleRunPrediction = async (days: number) => {
    if (isPredicting || !symbol || !data || data.length === 0) return;
    setIsPredicting(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: visibleData.slice(-60),
          predictDays: days,
        }),
      });
      if (!res.ok) throw new Error('Prediction request failed');
      const json = await res.json();
      if (!json.predictions || !Array.isArray(json.predictions) || json.predictions.length === 0) {
        toast.info('No forecast data returned');
        return;
      }
      if (!chartRef.current) return;
      if (predictionSeriesRef.current) {
        try {
          chartRef.current.removeSeries(predictionSeriesRef.current);
        } catch {}
        predictionSeriesRef.current = null;
      }
      const predSeries = chartRef.current.addSeries(CandlestickSeries, {
        upColor: cssTokenColor('--plt-info', 'rgba(59, 130, 246, 0.7)'),
        downColor: cssTokenColor('--plt-purple', 'rgba(168, 85, 247, 0.7)'),
        borderUpColor: cssTokenColor('--plt-info', 'rgba(59, 130, 246, 1)'),
        borderDownColor: cssTokenColor('--plt-purple', 'rgba(168, 85, 247, 1)'),
        wickUpColor: cssTokenColor('--plt-info', 'rgba(59, 130, 246, 1)'),
        wickDownColor: cssTokenColor('--plt-purple', 'rgba(168, 85, 247, 1)'),
      });
      const formattedPredictions = json.predictions
        .map((p: any) => ({
          time: parseChartTime(p.time || p.date),
          open: Number(p.open),
          high: Number(p.high),
          low: Number(p.low),
          close: Number(p.close),
        }))
        .filter((p: any) => Boolean(p.time) && !isNaN(p.open) && !isNaN(p.close))
        .sort((a: any, b: any) => (a.time > b.time ? 1 : -1));

      predSeries.setData(formattedPredictions);
      predictionSeriesRef.current = predSeries;
      toast.success(`Forecasted next ${formattedPredictions.length} trading days`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate prediction');
    } finally {
      setIsPredicting(false);
    }
  };

  // Save Order Draft Handler
  const handleSaveOrderDraft = async () => {
    if (!orderDraft) return;
    const entryPrice = parseOptionalNumber(orderDraft.entryPrice);
    const quantity = parseOptionalNumber(orderDraft.quantity);
    const targetPrice = parseOptionalNumber(orderDraft.targetPrice);
    const stopPrice = parseOptionalNumber(orderDraft.stopPrice);

    if (entryPrice === null || entryPrice <= 0) {
      setOrderError('Enter a valid entry price');
      return;
    }
    if (quantity === null || quantity <= 0) {
      setOrderError('Enter a valid quantity');
      return;
    }

    setSavingOrder(true);
    setOrderError(null);

    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickerSymbol: symbol,
          entryDate: orderDraft.date,
          entryPrice,
          quantity,
          targetPrice,
          stopPrice,
          status: 'OPEN',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to save position');
      }

      setOrderDraft(null);
      setPositionsRefreshKey((k) => k + 1);
      toast.success('Position opened successfully');
    } catch (err: any) {
      setOrderError(err.message || 'Failed to save position');
    } finally {
      setSavingOrder(false);
    }
  };

  // Predict button UI element
  const predictButtonUI = (
    <div className="relative">
      <button
        type="button"
        title="AI Forecast"
        aria-label="AI Forecast"
        disabled={isPredicting || !data || data.length === 0}
        onClick={() => setPredictPopoverOpen((prev) => !prev)}
        className={`h-8 rounded-full px-2.5 sm:px-3 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
          predictionSeriesRef.current
            ? 'bg-plt-info/15 text-plt-info border border-plt-info/30 font-semibold'
            : 'text-plt-muted hover:text-plt-text bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08]'
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Sparkles size={13} className={isPredicting ? 'animate-spin text-plt-text' : 'text-plt-muted'} />
        <span className="hidden sm:inline">Predict</span>
      </button>
    </div>
  );

  return (
    <div className="relative w-full h-full bg-plt-card overflow-hidden select-none">
      {/* 1. Top-Left In-Place Ticker & Live OHLCV Legend (No background, directly on chart) */}
      <ChartTickerHeader
        symbol={symbol}
        watchlist={watchlist}
        activeCandle={activeCandle}
        timeframe="1D"
      />

      {/* 2. Main Lightweight-Charts Container Canvas */}
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* 3. Position Visual Overlays on Canvas */}
      <ChartOrderOverlays
        overlays={orderOverlays}
        onSelectOrderToEdit={setSelectedOrderToEdit}
        onSelectOrderToClose={setSelectedOrderToClose}
      />

      {/* 4. Order Drafting Popover */}
      <ChartOrderDraftPopover
        orderDraft={orderDraft}
        symbol={symbol}
        savingOrder={savingOrder}
        orderError={orderError}
        onUpdateDraft={setOrderDraft}
        onClose={() => setOrderDraft(null)}
        onSave={handleSaveOrderDraft}
      />

      {/* 5. Bottom Floating Controls (When NOT in replay mode) */}
      {!replayMode && (
        <ChartFloatingControls
          hasReplayRoom={data.length > 1}
          onEnableReplay={() => {
            setReplayMode(true);
            setReplayIndex(getDefaultReplayIndex(data));
          }}
          predictButtonUI={predictButtonUI}
          activeIndicatorsCount={activeIndicators.length}
          onToggleIndicators={() => setIndicatorsPopoverOpen((prev) => !prev)}
          openPositionsCount={openPositionsCount}
          onOpenPositionsDrawer={() => setPositionsDrawerOpen(true)}
          onOpenAddOrder={() => setIsAddOrderOpen(true)}
        />
      )}

      {/* 6. Bottom Replay Controls Toolbar (When in replay mode) */}
      {replayMode && (
        <ChartReplayControls
          data={data}
          replayIndex={replayIndex}
          replayDate={replayDate ? String(replayDate) : null}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onJumpToStart={() => setReplayIndex(0)}
          onStepReplay={(step) => setReplayIndex((curr) => clampNumber(curr + step, 0, data.length - 1))}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onJumpToLatest={() => setReplayIndex(Math.max(0, data.length - 1))}
          onDateChange={(d) => setReplayIndex(findIndexAtOrBefore(data, d))}
          onSpeedChange={setPlaybackSpeed}
          onExitReplay={() => {
            setReplayMode(false);
            setIsPlaying(false);
            setReplayIndex(Math.max(0, data.length - 1));
          }}
          predictButtonUI={predictButtonUI}
        />
      )}

      {/* 7. Technical Indicators Selection Popover */}
      <ChartIndicatorsPopover
        isOpen={indicatorsPopoverOpen}
        onClose={() => setIndicatorsPopoverOpen(false)}
        activeIndicators={activeIndicators}
        onToggleIndicator={handleToggleIndicator}
        expandedIndicators={expandedIndicators}
        onToggleExpanded={toggleIndicatorExpanded}
        strategyParams={strategyParams}
        onUpdateStrategyParam={handleUpdateStrategyParam}
      />

      {/* 8. AI Predict Popover */}
      <ChartPredictPopover
        isOpen={predictPopoverOpen}
        onClose={() => setPredictPopoverOpen(false)}
        predictDaysInput={predictDaysInput}
        onChangePredictDays={setPredictDaysInput}
        onRunPrediction={handleRunPrediction}
        isPredicting={isPredicting}
      />

      {/* 9. Loading Shimmer Overlay */}
      <ChartLoadingSkeleton isLoading={isChartLoading} displaySymbol={displaySymbol} />

      {/* 10. Positions & Orders Slide-over Drawer (Responsive Sheet on Mobile, 50% Screen on Desktop) */}
      {positionsDrawerOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-end overflow-hidden">
          {/* Backdrop (Tapping closes drawer) */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-150 animate-in fade-in cursor-pointer"
            onClick={() => setPositionsDrawerOpen(false)}
            aria-label="Close drawer overlay"
          />

          {/* Drawer Sheet */}
          <div className="relative w-full lg:w-1/2 max-w-none h-[88vh] md:h-full bg-plt-base text-plt-text rounded-t-2xl md:rounded-none border-t md:border-t-0 md:border-l border-plt-border flex flex-col shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-200 z-10 overflow-hidden">
            {/* Mobile Sheet Drag / Swipe Indicator */}
            <div
              className="md:hidden w-full flex items-center justify-center pt-2.5 pb-1 shrink-0 bg-plt-raised cursor-pointer"
              onClick={() => setPositionsDrawerOpen(false)}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors" />
            </div>

            {/* Header */}
            <div className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-plt-border shrink-0 bg-plt-raised">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-xs font-bold text-plt-text">
                  {displaySymbol.slice(0, 2)}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-sm text-plt-text">{displaySymbol}</span>
                  <span className="text-xs text-plt-muted font-normal">Positions & Orders</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPositionsDrawerOpen(false)}
                className="w-10 h-10 -mr-2 rounded-xl text-plt-muted hover:text-plt-text hover:bg-white/[0.08] active:bg-white/[0.15] transition cursor-pointer flex items-center justify-center"
                title="Close (Esc)"
                aria-label="Close Positions Drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 safe-area-bottom">
              <TickerPositions
                symbol={symbol}
                orders={tickerPositions}
                currentPrice={currentPrice ?? data[data.length - 1]?.close ?? 0}
                chartData={data}
                onEditOrder={(order) => setSelectedOrderToEdit(order as any)}
                onCloseOrder={(order) => setSelectedOrderToClose(order as any)}
                onAddNew={() => setIsAddOrderOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddOrderModal
        isOpen={isAddOrderOpen}
        onClose={() => setIsAddOrderOpen(false)}
        onSuccess={() => setPositionsRefreshKey((k) => k + 1)}
        initialData={{
          symbol,
          price: data[data.length - 1]?.close,
        }}
      />

      {selectedOrderToEdit && (
        <EditOrderModal
          isOpen={!!selectedOrderToEdit}
          order={selectedOrderToEdit as any}
          onClose={() => setSelectedOrderToEdit(null)}
          onSuccess={() => {
            setSelectedOrderToEdit(null);
            setPositionsRefreshKey((k) => k + 1);
          }}
        />
      )}

      {selectedOrderToClose && (
        <CloseOrderModal
          isOpen={!!selectedOrderToClose}
          order={selectedOrderToClose as any}
          onClose={() => setSelectedOrderToClose(null)}
          onSuccess={() => {
            setSelectedOrderToClose(null);
            setPositionsRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
