'use client';

import type { ReactNode } from 'react';
import { SkipBack, SkipForward, StepBack, StepForward, Play, Pause } from '@/components/ui/icon-library';
import { PLAYBACK_SPEEDS, type ChartData } from './types';

interface ChartReplayControlsProps {
  data: ChartData[];
  replayIndex: number;
  replayDate: string | null;
  isPlaying: boolean;
  playbackSpeed: number;
  onJumpToStart: () => void;
  onStepReplay: (step: number) => void;
  onTogglePlay: () => void;
  onJumpToLatest: () => void;
  onDateChange: (date: string) => void;
  onSpeedChange: (speed: number) => void;
  onExitReplay: () => void;
  predictButtonUI: ReactNode;
}

export default function ChartReplayControls({
  data,
  replayIndex,
  replayDate,
  isPlaying,
  playbackSpeed,
  onJumpToStart,
  onStepReplay,
  onTogglePlay,
  onJumpToLatest,
  onDateChange,
  onSpeedChange,
  onExitReplay,
  predictButtonUI,
}: ChartReplayControlsProps) {
  return (
    <div className="absolute bottom-8 sm:bottom-10 left-2 sm:left-4 z-40 flex max-w-full sm:max-w-full flex-wrap items-center gap-2 rounded-full border border-plt-border-strong bg-plt-base/80 backdrop-blur-xl p-1.5 sm:p-2 text-xs text-plt-text shadow-2xl">
      <button
        type="button"
        title="Reset replay point"
        aria-label="Reset replay point"
        onClick={onJumpToStart}
        className="flex h-8 w-8 items-center justify-center rounded-full text-plt-subtle transition-colors hover:bg-plt-hover hover:text-plt-text"
      >
        <SkipBack className="h-4 w-4" />
      </button>

      <button
        type="button"
        title="Step back"
        aria-label="Step back"
        disabled={replayIndex <= 0}
        onClick={() => onStepReplay(-1)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-plt-subtle transition-colors hover:bg-plt-hover hover:text-plt-text disabled:opacity-30"
      >
        <StepBack className="h-4 w-4" />
      </button>

      <button
        type="button"
        title={isPlaying ? 'Pause replay' : 'Play replay'}
        aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
        disabled={replayIndex >= data.length - 1}
        onClick={onTogglePlay}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-all hover:bg-white/90 disabled:opacity-30"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <button
        type="button"
        title="Step forward"
        aria-label="Step forward"
        disabled={replayIndex >= data.length - 1}
        onClick={() => onStepReplay(1)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-plt-subtle transition-colors hover:bg-plt-hover hover:text-plt-text disabled:opacity-30"
      >
        <StepForward className="h-4 w-4" />
      </button>

      <button
        type="button"
        title="Jump to latest"
        aria-label="Jump to latest"
        onClick={onJumpToLatest}
        className="flex h-8 w-8 items-center justify-center rounded-full text-plt-subtle transition-colors hover:bg-plt-hover hover:text-plt-text"
      >
        <SkipForward className="h-4 w-4" />
      </button>

      <div className="mx-2 h-4 w-px bg-plt-hover" />

      <input
        type="date"
        title="Replay date"
        aria-label="Replay date"
        min={data[0] ? (typeof data[0].time === 'number' ? new Date(data[0].time * 1000).toISOString().split('T')[0] : String(data[0].time).split('T')[0]) : ''}
        max={data[data.length - 1] ? (typeof data[data.length - 1].time === 'number' ? new Date((data[data.length - 1].time as number) * 1000).toISOString().split('T')[0] : String(data[data.length - 1].time).split('T')[0]) : ''}
        value={replayDate ? (typeof replayDate === 'number' ? new Date(replayDate * 1000).toISOString().split('T')[0] : String(replayDate).split('T')[0]) : ''}
        onChange={(event) => onDateChange(event.target.value)}
        className="date-token w-32"
      />

      <input
        type="range"
        title="Replay position"
        aria-label="Replay position"
        min={0}
        max={Math.max(0, data.length - 1)}
        value={replayIndex}
        onChange={(event) => onDateChange(String(data[Number(event.target.value)]?.time ?? replayDate ?? ''))}
        className="h-8 w-28 accent-white cursor-pointer"
      />

      <select
        title="Replay speed"
        aria-label="Replay speed"
        value={playbackSpeed}
        onChange={(event) => onSpeedChange(Number(event.target.value))}
        className="select-token w-24"
      >
        {PLAYBACK_SPEEDS.map((speed) => (
          <option key={speed.label} value={speed.delay}>
            {speed.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onExitReplay}
        className="h-8 rounded-full px-3 text-xs font-medium text-plt-subtle bg-plt-hover border border-plt-border hover:bg-plt-hover hover:text-plt-text transition-colors"
      >
        Live
      </button>

      {predictButtonUI}
    </div>
  );
}
