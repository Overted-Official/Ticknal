'use client';

import React, { isValidElement } from 'react';

export interface IndexPillProps {
  id: string;
  badge?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  iconClass?: string;
  logoUrl?: string | null;
  badgeBgClass?: string;
  title: string;
  tag?: string;
  tagColorClass?: string;
  value: string;
  unit?: string;
  change?: string;
  changeColorClass?: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function IndexPill({
  id,
  badge,
  icon,
  iconClass,
  logoUrl,
  badgeBgClass,
  title,
  tag,
  tagColorClass,
  value,
  unit,
  change,
  changeColorClass,
  isSelected = false,
  onClick,
  className = '',
}: IndexPillProps) {
  const IconComponent = icon;

  return (
    <button
      key={id}
      type="button"
      onClick={onClick}
      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-full transition-all w-[210px] sm:w-[220px] shrink-0 text-start border select-none cursor-pointer ${
        isSelected
          ? 'bg-surface-active border-white/20 shadow-lg'
          : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
      } ${className}`}
    >
      {/* Left Circular Badge / Icon / Logo */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors overflow-hidden ${
          badgeBgClass ||
          (isSelected
            ? 'bg-surface-raised text-white border border-neutral-600'
            : 'bg-neutral-900 text-neutral-300 border border-neutral-700/80')
        }`}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-4 h-4 rounded-full object-contain" />
        ) : IconComponent ? (
          <IconComponent className={iconClass || 'w-3.5 h-3.5 text-neutral-300'} size={14} />
        ) : typeof badge === 'string' ? (
          <span className="leading-none">{badge}</span>
        ) : (
          badge
        )}
      </div>

      {/* Right Index Info Block */}
      <div className="flex flex-col justify-center min-w-0 flex-1 overflow-hidden">
        {/* Top Line: Name + optional Tag (with dash only if tag is present) */}
        <div className="flex items-center gap-1 leading-none w-full min-w-0">
          <span
            className={`text-xs font-semibold tracking-tight truncate ${
              isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'
            }`}
          >
            {title}
          </span>
          {tag && (
            <>
              <span className="text-neutral-500 text-xs shrink-0">-</span>
              <span
                className={`text-[10px] font-bold ${
                  tagColorClass || 'text-amber-500'
                } shrink-0`}
              >
                {tag}
              </span>
            </>
          )}
        </div>

        {/* Bottom Line: Numeric Value + Unit + Daily Change / Status % */}
        <div className="flex items-center gap-1 mt-1 leading-none w-full min-w-0">
          <span className="text-xs font-bold text-white tabular-nums whitespace-nowrap shrink-0">
            {value}
          </span>
          {unit && (
            <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-tight shrink-0">
              {unit}
            </span>
          )}
          {change && (
            <span
              className={`text-xs font-bold tabular-nums ml-1 whitespace-nowrap shrink-0 ${
                changeColorClass || 'text-neutral-400'
              }`}
            >
              {change}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
