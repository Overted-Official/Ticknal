'use client';

import { AlertCircle, CheckCircle2, Lock, type LucideIcon } from '@/components/ui/icon-library';

import type { StrategyStageStatus, StrategyWorkspaceStage } from './strategy-workspace-model';

interface StrategyStageNavigationProps {
  readonly activeStage: StrategyWorkspaceStage;
  readonly statuses: Readonly<Record<StrategyWorkspaceStage, StrategyStageStatus>>;
  readonly locale: 'en' | 'ar';
  readonly onSelect: (stage: StrategyWorkspaceStage) => void;
}

const STAGES: readonly StrategyWorkspaceStage[] = ['build', 'visualize', 'backtest'];

const STATUS_ICONS: Readonly<Record<StrategyStageStatus, LucideIcon>> = {
  incomplete: AlertCircle,
  ready: CheckCircle2,
  protected: Lock,
};

export default function StrategyStageNavigation({
  activeStage,
  statuses,
  locale,
  onSelect,
}: StrategyStageNavigationProps) {
  const isAr = locale === 'ar';
  const stageLabels: Readonly<Record<StrategyWorkspaceStage, string>> = {
    build: isAr ? 'البناء' : 'Build',
    visualize: isAr ? 'التصور' : 'Visualize',
    backtest: isAr ? 'الاختبار الخلفي' : 'Backtest',
  };
  const statusLabels: Readonly<Record<StrategyStageStatus, string>> = {
    incomplete: isAr ? 'غير مكتمل' : 'Incomplete',
    ready: isAr ? 'جاهز' : 'Ready',
    protected: isAr ? 'محمي' : 'Protected',
  };

  return (
    <nav
      aria-label={isAr ? 'مراحل الاستراتيجية' : 'Strategy stages'}
      className="flex w-full select-none items-center justify-center py-1 font-sans"
    >
      <div className="flex w-full min-w-0 max-w-full items-center justify-center">
        {/* TradingView Floating Pill Container */}
        <div
          data-name="round-tabs-anchors"
          className="relative flex max-w-[calc(100vw-24px)] items-center justify-center rounded-full border border-white/15 bg-black/90 p-1 shadow-lg backdrop-blur-xl sm:max-w-full sm:p-1.5"
        >
          <div
            id="strategy-navigation-tabs"
            role="tablist"
            aria-orientation="horizontal"
            className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto sm:gap-1.5"
          >
            {STAGES.map((stage, index) => {
              const status = statuses[stage];
              const StatusIcon = STATUS_ICONS[status];
              const selected = activeStage === stage;
              return (
                <button
                  key={stage}
                  id={`strategy-stage-${stage}`}
                  role="tab"
                  tabIndex={selected ? 0 : -1}
                  aria-selected={selected}
                  aria-controls={`strategy-stage-panel-${stage}`}
                  type="button"
                  onClick={() => onSelect(stage)}
                  className={`relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium outline-none transition-all duration-150 sm:px-4 sm:py-2 sm:text-[13px] ${
                    selected
                      ? 'bg-white/15 font-semibold text-white shadow-xs'
                      : 'bg-transparent text-plt-muted hover:bg-white/[0.06] hover:text-white active:bg-white/10'
                  }`}
                >
                  <span className="text-[10px] font-semibold tabular-nums opacity-60 sm:text-[11px]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="leading-none">{stageLabels[stage]}</span>
                  <span className="sr-only">{String(index + 1).padStart(2, '0')} {stageLabels[stage]}</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                      status === 'ready'
                        ? 'text-plt-profit'
                        : status === 'protected'
                        ? 'text-white/60'
                        : 'text-plt-warning'
                    }`}
                  >
                    <StatusIcon size={12} aria-hidden="true" />
                    <span className="hidden md:inline">{statusLabels[status]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
