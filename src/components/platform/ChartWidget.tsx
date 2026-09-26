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
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Briefcase, X, Plus } from '@/components/ui/icon-library';
import AddOrderModal, { type InitialOrderData } from '@/components/platform/AddOrderModal';
import EditOrderModal from '@/components/platform/EditOrderModal';
import CloseOrderModal from '@/components/platform/CloseOrderModal';
import TickerPositions, { type TickerOrder } from '@/components/platform/TickerPositions';
import { INDICATORS, type IndicatorLine } from '@/indicators';
import { useToast } from '@/context/ToastContext';

// Modular Chart Imports
import type {
  ChartData,
  ChartOrder,
  OrderOverlay,
  StrategySignal,
  ChartWidgetProps,
} from './chart/types';
import {
  cssTokenColor,
  resolveChartColor,
  clampNumber,
  buildMarkers,
  parseChartTime,
  sanitizeChartSeriesData,
  parseOptionalNumber,
} from './chart/utils';
import ChartTickerHeader from './chart/ChartTickerHeader';
import ChartTopBar from './chart/ChartTopBar';
import ChartIndicatorsPopover from './chart/ChartIndicatorsPopover';
import ChartPredictPopover from './chart/ChartPredictPopover';
import ChartOrderOverlays from './chart/ChartOrderOverlays';
import ChartLoadingSkeleton from './chart/ChartLoadingSkeleton';
import HydraIndexPanel from './chart/HydraIndexPanel';
import StrategyReportDrawer, { type StrategyReportTab } from './chart/StrategyReportDrawer';

// Re-export shared types for backward compatibility across the app
export type { ChartData };

export default function ChartWidget({
  data,
  symbol,
  timeframe = 'D',
  watchlist = [],
  selectedStrategy = 'psi',
  setSelectedStrategy,
  strategyParams = {},
  strategyStartDate,
  strategyEndDate,
  setStrategyStartDate,
  setStrategyEndDate,
  activeIndicators = [],
  onToggleIndicator,
  onUpdateStrategyParam,
  bulkUpdateStrategyParams,
  showSignals = true,
  onMetricsChange,
  metrics,
  companyName,
  logoUrl,
  tickerPositions = [],
  currentPrice,
  brokerageAccounts = [],
}: ChartWidgetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [positionsDrawerOpen, setPositionsDrawerOpen] = useState(false);
  const [positionsImgError, setPositionsImgError] = useState(false);
  const [isStrategyReportOpen, setIsStrategyReportOpen] = useState(false);
  const [strategyReportTab, setStrategyReportTab] = useState<StrategyReportTab>('performance');

  const [orders, setOrders] = useState<any[]>(tickerPositions);

  useEffect(() => {
    if (tickerPositions && tickerPositions.length > 0) {
      setOrders(tickerPositions);
    }
  }, [tickerPositions]);

  const openPositionsCount = (orders.length > 0 ? orders : tickerPositions).filter((o) => o.status === 'OPEN').length;
  const isHydraPanelOpen = activeIndicators.includes('hydraIndex');
  const hydraOptionsState = useMemo(() => {
    return {
      showMarkers: Boolean(strategyParams['hydraIndex_showMarkers'] ?? true),
    };
  }, [strategyParams]);

  const isFund = useMemo(() => {
    return ['CI_QUANT', 'OSOUL', 'COF'].includes(symbol.toUpperCase());
  }, [symbol]);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markerApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const orderPriceLineRefs = useRef<Map<number, IPriceLine[]>>(new Map());

  const [seriesReadyKey, setSeriesReadyKey] = useState(0);
  const [indicatorMarkers, setIndicatorMarkers] = useState<SeriesMarker<Time>[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    price: number;
    date: string;
  } | null>(null);
  const [addOrderInitialData, setAddOrderInitialData] = useState<InitialOrderData | undefined>(undefined);
  const [orderOverlays, setOrderOverlays] = useState<OrderOverlay[]>([]);
  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState<ChartOrder | null>(null);
  const [selectedOrderToClose, setSelectedOrderToClose] = useState<ChartOrder | null>(null);
  const [positionsRefreshKey, setPositionsRefreshKey] = useState(0);
  const [chartSignals, setChartSignals] = useState<StrategySignal[]>([]);

  const [isPredicting, setIsPredicting] = useState(false);
  const predictionSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);

  const [predictPopoverOpen, setPredictPopoverOpen] = useState(false);
  const [predictDaysInput, setPredictDaysInput] = useState('10');
  const [indicatorsPopoverOpen, setIndicatorsPopoverOpen] = useState(false);
  const [expandedIndicators, setExpandedIndicators] = useState<Record<string, boolean>>({ supportResistance: true });
  const indicatorLineSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const liveBrokerageAccounts = useMemo(
    () => brokerageAccounts.filter((account) => !account.isArchived && account.currency === 'EGP' && ['BROKERAGE', 'BROKER_CASH'].includes(account.accountType)),
    [brokerageAccounts],
  );

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

  // Global listener for ticknal:open-strategy-report
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: string }>;
      const requested = customEvent.detail?.tab;
      if (requested === 'trades') {
        setStrategyReportTab('trades');
      } else {
        setStrategyReportTab('performance');
      }
      setIsStrategyReportOpen(true);
    };
    window.addEventListener('ticknal:open-strategy-report', handleOpen);
    return () => window.removeEventListener('ticknal:open-strategy-report', handleOpen);
  }, []);

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
    if (onToggleIndicator) {
      onToggleIndicator(id);
      return;
    }
    const next = activeIndicators.includes(id)
      ? activeIndicators.filter((i) => i !== id)
      : [...activeIndicators, id];
    const params = new URLSearchParams(window.location.search);
    if (next.length > 0) {
      params.set('indicators', next.join(','));
    } else {
      params.delete('indicators');
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  };

  const handleUpdateStrategyParam = (key: string, val: any) => {
    if (onUpdateStrategyParam) {
      onUpdateStrategyParam(key, val);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set(key, String(val));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  };

  const visibleData = data;
  const activeCandle = hoveredCandle ?? (data.length > 0 ? data[data.length - 1] : null);

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
        background: { type: ColorType.Solid, color: cssTokenColor('--plt-bg-chart', '#121212') },
        textColor: cssTokenColor('--plt-text-muted', 'rgba(255, 255, 255, 0.45)'),
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: cssTokenColor('--palette-chart-grid', '#202020') },
        horzLines: { color: cssTokenColor('--palette-chart-grid', '#202020') },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: cssTokenColor('--border-subtle', 'rgba(255, 255, 255, 0.06)'),
        minimumWidth: 55,
      },
      timeScale: {
        borderColor: cssTokenColor('--border-subtle', 'rgba(255, 255, 255, 0.06)'),
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
        lineColor: cssTokenColor('--plt-text-primary', 'rgb(255, 255, 255)'),
        lineWidth: 2,
      });
    } else {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: cssTokenColor('--plt-profit', 'rgb(8, 153, 129)'),
        downColor: cssTokenColor('--plt-risk', 'rgb(242, 54, 69)'),
        borderUpColor: cssTokenColor('--plt-profit', 'rgb(8, 153, 129)'),
        borderDownColor: cssTokenColor('--plt-risk', 'rgb(242, 54, 69)'),
        wickUpColor: cssTokenColor('--plt-profit', 'rgb(8, 153, 129)'),
        wickDownColor: cssTokenColor('--plt-risk', 'rgb(242, 54, 69)'),
      });
    }
    candlestickSeriesRef.current = mainSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: cssTokenColor('--border-subtle', 'rgba(255, 255, 255, 0.08)'),
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;
    setSeriesReadyKey((k) => k + 1);

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

    // Chart Click Handler: click on chart dismisses context menu
    chart.subscribeClick(() => {
      setContextMenu(null);
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

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (chartRef.current && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            chartRef.current.applyOptions({
              width: entry.contentRect.width,
              height: entry.contentRect.height,
            });
          }
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      markerApiRef.current = null;
      predictionSeriesRef.current = null;
      indicatorLineSeriesRef.current.clear();
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

  // Combined Signal & Indicator Markers
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;

    const strategyMarkers = showSignals ? buildMarkers(chartSignals) : [];
    const allMarkers = sanitizeChartSeriesData([...strategyMarkers, ...indicatorMarkers]);

    if (allMarkers.length === 0) {
      if (markerApiRef.current) {
        try {
          markerApiRef.current.setMarkers([]);
        } catch {}
      }
      return;
    }

    try {
      if (!markerApiRef.current) {
        markerApiRef.current = createSeriesMarkers(candlestickSeriesRef.current, allMarkers);
      } else {
        markerApiRef.current.setMarkers(allMarkers);
      }
    } catch (err) {
      console.warn('Failed to update series markers, re-creating marker API:', err);
      try {
        markerApiRef.current = createSeriesMarkers(candlestickSeriesRef.current, allMarkers);
      } catch {}
    }
  }, [chartSignals, showSignals, indicatorMarkers, seriesReadyKey]);

  // Dynamic Indicators Rendering (lines and markers)
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

    const gatheredMarkers: SeriesMarker<Time>[] = [];

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

        if (result.markers && result.markers.length > 0) {
          result.markers.forEach((m) => {
            gatheredMarkers.push({
              ...(m as any),
              time: parseChartTime(m.time),
              position: m.position,
              color: resolveChartColor(m.color),
              shape: m.shape,
              size: m.size ?? 1,
              text: m.text,
            } as SeriesMarker<Time>);
          });
        }
      } catch (err) {
        console.error(`Error calculating indicator ${indId}:`, err);
      }
    });

    setIndicatorMarkers(gatheredMarkers);
  }, [activeIndicators, strategyParams, visibleData, seriesReadyKey]);

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

    const lastBar = visibleData && visibleData.length > 0 ? visibleData[visibleData.length - 1] : null;
    let lastBarX: number | null = null;
    if (lastBar) {
      lastBarX = timeScale.timeToCoordinate(parseChartTime(lastBar.time));
    }

    orders
      .filter((o) => o.status === 'OPEN')
      .forEach((order) => {
        const entryCoordinate = series.priceToCoordinate(order.entryPrice);
        if (entryCoordinate === null) return;

        const livePrice = Number(order.currentPrice ?? (lastBar ? lastBar.close : currentPrice) ?? order.entryPrice ?? 0);
        const currentCoordinate = series.priceToCoordinate(livePrice);
        const targetCoordinate = order.targetPrice !== null && order.targetPrice !== undefined ? series.priceToCoordinate(order.targetPrice) : null;
        const stopCoordinate = order.stopPrice !== null && order.stopPrice !== undefined ? series.priceToCoordinate(order.stopPrice) : null;
        const entryPrice = Number(order.entryPrice ?? 0);
        const quantity = Number(order.quantity ?? 0);
        const profitLoss = typeof order.profitLoss === 'number' && !isNaN(order.profitLoss)
          ? order.profitLoss
          : (livePrice - entryPrice) * quantity;
        const profitLossPct = typeof order.profitLossPct === 'number' && !isNaN(order.profitLossPct)
          ? order.profitLossPct
          : (entryPrice > 0 ? ((livePrice - entryPrice) / entryPrice) * 100 : 0);
        const isProfit = profitLoss >= 0;

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
        // End the corridor exactly at the last candle x-coordinate instead of extending to infinity
        const rightEdge = lastBarX !== null ? lastBarX : Math.min(width - 55, left + 100);
        const boxWidth = Math.max(16, rightEdge - left);

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
          isProfit,
          entryPrice,
          currentPrice: livePrice,
          quantity,
          marketValue: quantity * livePrice,
          profitLoss,
          profitLossPct,
        });
      });

    setOrderOverlays(overlays);
  }, [orders, data, visibleData, seriesReadyKey]);

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
  }, [updateOrderOverlays, visibleData, seriesReadyKey]);

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

  // Handle Right-Click on Chart Container for Context Menu
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!chartContainerRef.current || !candlestickSeriesRef.current || !chartRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const price = candlestickSeriesRef.current.coordinateToPrice(y);
    if (!price || price <= 0) return;

    const time = chartRef.current.timeScale().coordinateToTime(x);
    let dateStr = new Date().toISOString().split('T')[0];
    if (time) {
      if (typeof time === 'string') {
        dateStr = time;
      } else if (typeof time === 'object' && 'year' in (time as any)) {
        dateStr = `${(time as any).year}-${String((time as any).month).padStart(2, '0')}-${String((time as any).day).padStart(2, '0')}`;
      }
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      price: Number(price.toFixed(2)),
      date: dateStr,
    });
  }, []);

  // Dismiss context menu on click or ESC
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative w-full flex-1 min-h-0 bg-plt-chart overflow-hidden select-none flex flex-col">
      {/* Framed Chart Top Bar (h-[45px] matching right SidebarNav width) */}
      <ChartTopBar
        symbol={symbol}
        watchlist={watchlist}
        timeframe={timeframe}
        companyName={companyName}
        logoUrl={logoUrl}
        isPredicting={isPredicting}
        isPredictPopoverOpen={predictPopoverOpen}
        onTogglePredict={() => setPredictPopoverOpen((prev) => !prev)}
        activeIndicatorsCount={activeIndicators.length}
        isIndicatorsPopoverOpen={indicatorsPopoverOpen}
        onToggleIndicators={() => setIndicatorsPopoverOpen((prev) => !prev)}
        onOpenStrategyReport={() => {
          setStrategyReportTab('performance');
          setIsStrategyReportOpen(true);
        }}
        openPositionsCount={openPositionsCount}
        onOpenPositionsDrawer={() => setPositionsDrawerOpen(true)}
        onOpenAddOrder={() => {
          setAddOrderInitialData({
            symbol,
            price: currentPrice ?? data[data.length - 1]?.close,
          });
          setIsAddOrderOpen(true);
        }}
      />

      {/* 1. Main Candlestick Price Stage */}
      <div className="relative w-full flex-1 min-h-0 bg-plt-chart overflow-hidden">
        {/* Top-Left Live Ticker Name & OHLCV Legend directly on chart canvas */}
        <ChartTickerHeader
          symbol={symbol}
          companyName={companyName}
          logoUrl={logoUrl}
          timeframe={timeframe}
          watchlist={watchlist}
          activeCandle={activeCandle}
        />

        {/* Main Lightweight-Charts Container Canvas */}
        <div
          ref={chartContainerRef}
          className="w-full h-full bg-plt-chart"
          onContextMenu={handleContextMenu}
        />

        {/* Position Visual Overlays on Canvas */}
        <ChartOrderOverlays
          overlays={orderOverlays}
          onSelectOrderToEdit={setSelectedOrderToEdit}
          onSelectOrderToClose={setSelectedOrderToClose}
        />

        {/* Chart Right-Click Context Menu */}
        {contextMenu && typeof document !== 'undefined' && createPortal(
          <div
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className="fixed z-[120] py-1.5 px-1 rounded-xl bg-black border border-border-subtle shadow-2xl text-xs text-text-secondary select-none animate-in fade-in zoom-in-95 duration-100 min-w-56"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2.5 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider border-b border-border-subtle mb-1">
              Chart Actions • {symbol.replace('.CA', '')}
            </div>
            <button
              type="button"
              onClick={() => {
                setAddOrderInitialData({
                  symbol,
                  price: contextMenu.price,
                  date: contextMenu.date,
                });
                setIsAddOrderOpen(true);
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-white hover:bg-surface-raised transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Plus size={14} className="text-brand-blue" />
                <span>Add Position</span>
              </div>
              <span className="font-semibold text-brand-blue tabular-nums">
                {contextMenu.price.toFixed(2)} EGP
              </span>
            </button>
          </div>,
          document.body
        )}

        {/* Technical Indicators Selection Popover */}
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

        {/* AI Predict Popover */}
        <ChartPredictPopover
          isOpen={predictPopoverOpen}
          onClose={() => setPredictPopoverOpen(false)}
          predictDaysInput={predictDaysInput}
          onChangePredictDays={setPredictDaysInput}
          onRunPrediction={handleRunPrediction}
          isPredicting={isPredicting}
        />

        {/* Loading Shimmer Overlay */}
        <ChartLoadingSkeleton isLoading={isChartLoading} displaySymbol={displaySymbol} />
      </div>

      {/* 2. Separate HYDRA Index Dedicated Sub-Panel (Opens below chart when toggled) */}
      {isHydraPanelOpen && (
        <HydraIndexPanel
          data={visibleData}
          mainChart={chartRef.current}
          onClose={() => handleToggleIndicator('hydraIndex')}
          optionsState={hydraOptionsState}
        />
      )}

      {/* 10. Positions & Orders Slide-over Drawer (Portaled to document.body to overlay entire screen and right sidebar) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {positionsDrawerOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-end overflow-hidden">
              {/* Backdrop (Tapping closes drawer) */}
              <motion.div
                key="positions-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer z-0"
                onClick={() => setPositionsDrawerOpen(false)}
                aria-label="Close drawer overlay"
              />

              {/* Drawer Sheet: slides smoothly from right on BOTH desktop and mobile */}
              <motion.div
                key="positions-sheet"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{
                  type: 'spring',
                  damping: 32,
                  stiffness: 340,
                  mass: 0.8,
                }}
                className="relative w-full md:w-1/2 lg:w-1/2 max-w-full h-full bg-black text-text-primary rounded-none border-l border-white/10 flex flex-col shadow-2xl z-10 overflow-hidden"
              >
                {/* Replicated Strategy Report Header */}
                <div className="min-h-14 sm:min-h-16 px-4 sm:px-6 py-2.5 sm:py-0 flex items-center justify-between border-b border-white/10 shrink-0 bg-black">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 overflow-hidden flex items-center justify-center shrink-0">
                      {logoUrl && !positionsImgError ? (
                        <img
                          src={logoUrl}
                          alt={symbol}
                          className="w-full h-full object-cover"
                          onError={() => setPositionsImgError(true)}
                        />
                      ) : (
                        <span className="text-xs font-bold text-white uppercase font-sans">
                          {displaySymbol.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 overflow-hidden leading-tight">
                      <span
                        className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-[340px]"
                        title={companyName || displaySymbol}
                      >
                        {companyName || displaySymbol}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <span className="font-semibold text-white/90 tabular-nums">
                          {displaySymbol}
                        </span>
                        <span>•</span>
                        <span className="text-[11px] text-white/50">Positions &amp; Orders</span>
                      </div>
                    </div>
                  </div>

                  {/* Close Button matching Strategy Report Drawer */}
                  <button
                    type="button"
                    onClick={() => setPositionsDrawerOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0 ml-3"
                    title="Close (Esc)"
                    aria-label="Close Positions Drawer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 safe-area-bottom custom-scrollbar bg-black">
                  <TickerPositions
                    symbol={symbol}
                    companyName={companyName}
                    logoUrl={logoUrl}
                    orders={orders.length > 0 ? orders : tickerPositions}
                    currentPrice={currentPrice ?? data[data.length - 1]?.close ?? 0}
                    chartData={data}
                    onOrdersChange={() => setPositionsRefreshKey((k) => k + 1)}
                    onEditOrder={(order) => setSelectedOrderToEdit(order as any)}
                    onCloseOrder={(order) => setSelectedOrderToClose(order as any)}
                    onAddNew={() => {
                      setAddOrderInitialData({
                        symbol,
                        price: currentPrice ?? data[data.length - 1]?.close,
                      });
                      setIsAddOrderOpen(true);
                    }}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Modals */}
      <AddOrderModal
        isOpen={isAddOrderOpen}
        onClose={() => {
          setIsAddOrderOpen(false);
          setAddOrderInitialData(undefined);
        }}
        onSuccess={() => setPositionsRefreshKey((k) => k + 1)}
        initialData={addOrderInitialData || {
          symbol,
          price: data[data.length - 1]?.close,
        }}
        mode="live"
        brokerageAccounts={brokerageAccounts}
        entrySource="CHART"
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

      {/* Strategy Report Slide-Over Drawer (75% desktop width, full screen mobile, pure black) */}
      <StrategyReportDrawer
        isOpen={isStrategyReportOpen}
        onClose={() => setIsStrategyReportOpen(false)}
        symbol={symbol}
        timeframe={timeframe}
        selectedStrategy={selectedStrategy}
        setSelectedStrategy={setSelectedStrategy}
        strategyParams={strategyParams}
        updateStrategyParam={onUpdateStrategyParam}
        bulkUpdateStrategyParams={bulkUpdateStrategyParams}
        chartData={data}
        strategyStartDate={strategyStartDate}
        strategyEndDate={strategyEndDate}
        setStrategyStartDate={setStrategyStartDate}
        setStrategyEndDate={setStrategyEndDate}
        metrics={metrics}
        companyName={companyName || watchlist.find((w) => w.symbol.toUpperCase() === symbol.toUpperCase())?.companyName}
        logoUrl={logoUrl || watchlist.find((w) => w.symbol.toUpperCase() === symbol.toUpperCase())?.logoUrl}
        initialTab={strategyReportTab}
      />
    </div>
  );
}
