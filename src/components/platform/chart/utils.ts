import type { SeriesMarker, Time } from 'lightweight-charts';
import type { ChartData, StrategySignal } from './types';

export const toChartCompatibleColor = (value: string): string => {
  const match = value.trim().match(/^color\(srgb\s+(.+)\)$/i);
  if (!match) return value;

  const [channelSource, alphaSource = '1'] = match[1].split(/\s*\/\s*/);
  const channels = channelSource.trim().split(/\s+/);
  if (channels.length !== 3) return value;

  const toByte = (channel: string) => {
    const numeric = channel.endsWith('%')
      ? Number.parseFloat(channel) / 100
      : Number.parseFloat(channel);
    return Math.round(Math.min(1, Math.max(0, numeric)) * 255);
  };
  const alpha = alphaSource.endsWith('%')
    ? Number.parseFloat(alphaSource) / 100
    : Number.parseFloat(alphaSource);

  if (channels.some((channel) => !Number.isFinite(Number.parseFloat(channel))) || !Number.isFinite(alpha)) {
    return value;
  }

  const [red, green, blue] = channels.map(toByte);
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, Math.max(0, alpha))})`;
};

export const resolveCssColor = (value: string, fallback: string): string => {
  if (typeof document === 'undefined') return fallback;
  const probe = document.createElement('span');
  probe.style.color = value;
  if (!probe.style.color) return fallback;
  document.documentElement.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return toChartCompatibleColor(resolved || fallback);
};

export const cssTokenColor = (name: string, fallback: string): string => {
  return resolveCssColor(`var(${name})`, fallback);
};

export const resolveChartColor = (color: string): string => {
  return resolveCssColor(color, color);
};

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatSignalLabel(signal: string): string {
  if (signal === 'BUY') return 'Buy';
  if (signal === 'SELL_TP') return 'TP';
  if (signal === 'SELL_TRAIL') return 'Trail';
  if (signal === 'SELL_SL') return 'Stop';
  if (signal === 'SELL_STRUCT') return 'Structure';
  return 'Exit';
}

export function getExitMarker(signal: string): { text: string; color: string } {
  if (signal === 'SELL_TP') return { text: 'TP', color: cssTokenColor('--plt-info', 'var(--plt-info)') };
  if (signal === 'SELL_TRAIL') return { text: 'Trail', color: cssTokenColor('--plt-warning', 'var(--plt-warning)') };
  if (signal === 'SELL_SL') return { text: 'Stop', color: cssTokenColor('--plt-risk', 'var(--plt-risk)') };
  if (signal === 'SELL_STRUCT') return { text: 'Structure', color: cssTokenColor('--plt-risk', 'var(--plt-risk)') };
  return { text: 'Exit', color: cssTokenColor('--plt-risk', 'var(--plt-risk)') };
}

export function parseChartTime(timeInput: string | number | Time): Time {
  if (typeof timeInput === 'number') {
    return timeInput as unknown as Time;
  }
  if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed as unknown as Time;
    }
    const ms = new Date(trimmed).getTime();
    if (!isNaN(ms)) {
      return Math.floor(ms / 1000) as unknown as Time;
    }
  }
  return timeInput as unknown as Time;
}

export function buildMarkers(signals: StrategySignal[]): SeriesMarker<Time>[] {
  const markers: SeriesMarker<Time>[] = [];
  let currentPosition: 'NONE' | 'LONG' = 'NONE';

  for (const signal of signals) {
    const markerTime = parseChartTime(signal.date);
    if (signal.signal === 'BUY' && currentPosition === 'NONE') {
      currentPosition = 'LONG';
      markers.push({
        time: markerTime,
        position: 'belowBar',
        color: cssTokenColor('--plt-profit', 'var(--plt-profit)'),
        shape: 'arrowUp',
        text: 'Buy',
        size: 1.25,
      });
    } else if (currentPosition === 'LONG' && signal.signal.startsWith('SELL')) {
      currentPosition = 'NONE';
      const marker = getExitMarker(signal.signal);
      markers.push({
        time: markerTime,
        position: 'aboveBar',
        color: marker.color,
        shape: 'arrowDown',
        text: marker.text,
        size: 1.25,
      });
    }
  }

  return markers;
}

export function getDefaultReplayIndex(data: ChartData[]): number {
  if (data.length === 0) return 0;
  return Math.max(0, Math.floor(data.length * 0.7));
}

export function findIndexAtOrBefore(data: ChartData[], date: string | number | Time): number {
  if (data.length === 0) return 0;
  const targetTime = parseChartTime(date);
  let low = 0;
  let high = data.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const currTime = data[mid].time;
    if (currTime <= targetTime) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result >= 0 ? result : 0;
}

export function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function formatVolume(volume: number): string {
  if (!Number.isFinite(volume) || volume <= 0) return '0';
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
