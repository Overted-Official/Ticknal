'use client';

import type { ComponentType, ReactNode } from 'react';

import { ChevronDown } from '@/components/ui/icon-library';

export type PipelineCardTheme = 'blue' | 'purple' | 'green' | 'gray' | 'red';

interface WorkflowPipelineCardProps {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly icon?: ComponentType<{ size?: number; className?: string }>;
  readonly theme: PipelineCardTheme;
  readonly itemCount: number;
  readonly statusText?: string;
  readonly hasTopPort?: boolean;
  readonly hasBottomPort?: boolean;
  readonly isCollapsed: boolean;
  readonly onToggleCollapse: () => void;
  readonly children: ReactNode;
  readonly className?: string;
  readonly ariaLabel?: string;
}

const THEME_STYLES: Readonly<Record<PipelineCardTheme, { badge: string; dot: string; border: string }>> = {
  blue: {
    badge: 'border-tv-blue-500/30 bg-tv-blue-500/10 text-tv-blue-400',
    dot: 'bg-tv-blue-400',
    border: 'hover:border-tv-blue-500/30',
  },
  purple: {
    badge: 'border-[var(--plt-violet)]/30 bg-[var(--plt-violet)]/10 text-[var(--plt-violet)]',
    dot: 'bg-[var(--plt-violet)]',
    border: 'hover:border-[var(--plt-violet)]/30',
  },
  green: {
    badge: 'border-plt-profit/30 bg-plt-profit/10 text-plt-profit',
    dot: 'bg-plt-profit',
    border: 'hover:border-plt-profit/30',
  },
  gray: {
    badge: 'border-white/15 bg-white/[0.04] text-white/70',
    dot: 'bg-white/40',
    border: 'hover:border-white/20',
  },
  red: {
    badge: 'border-plt-risk/30 bg-plt-risk/10 text-plt-risk',
    dot: 'bg-plt-risk',
    border: 'hover:border-plt-risk/30',
  },
};

export default function WorkflowPipelineCard({
  id,
  title,
  subtitle: _subtitle,
  icon: _icon,
  theme,
  itemCount,
  hasTopPort = false,
  hasBottomPort = false,
  isCollapsed,
  onToggleCollapse,
  children,
  className = '',
  ariaLabel,
}: WorkflowPipelineCardProps) {
  const themeStyle = THEME_STYLES[theme] ?? THEME_STYLES.gray;

  return (
    <article
      id={id}
      aria-label={ariaLabel || title}
      className={`group relative rounded-xl border border-white/10 bg-black shadow-2xl transition-all duration-150 ${themeStyle.border} ${className}`}
    >
      {/* Top Connection Port */}
      {hasTopPort && (
        <span
          aria-hidden="true"
          className="absolute -top-1 left-1/2 z-10 h-2 w-2 -translate-x-1/2 rounded-full border border-white/40 bg-white ring-2 ring-black"
        />
      )}

      {/* Card Header (Sleek, condensed node header — entire row clickable, NO icons or subtitles) */}
      <header
        onClick={onToggleCollapse}
        className="flex cursor-pointer select-none items-center justify-between gap-2 px-3.5 py-2 sm:py-2.5 transition-colors bg-white/[0.02] hover:bg-white/[0.04]"
      >
        <div className="flex min-w-0 items-center gap-2">
          <h4 className="font-sans text-xs font-bold tracking-tight text-white truncate">
            {title}
          </h4>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Condensed Status & Item Count Pill (semantic theme-colored) */}
          <div className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-sans text-[10px] ${themeStyle.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${themeStyle.dot}`} />
            <span className="tabular-nums font-semibold">{itemCount}</span>
          </div>

          {/* Collapse/Expand toggle icon */}
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/60 transition-colors group-hover:border-white/20 group-hover:text-white"
            aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
            />
          </div>
        </div>
      </header>

      {/* Expanded View Content Body */}
      {!isCollapsed && (
        <div id={`${id}-body`} className="border-t border-white/[0.08]">
          {children}
        </div>
      )}

      {/* Bottom Connection Port */}
      {hasBottomPort && (
        <span
          aria-hidden="true"
          className="absolute -bottom-1 left-1/2 z-10 h-2 w-2 -translate-x-1/2 rounded-full border border-white/40 bg-white ring-2 ring-black"
        />
      )}
    </article>
  );
}
