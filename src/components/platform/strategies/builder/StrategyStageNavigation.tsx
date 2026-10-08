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
    <nav className="border-b border-white/10 bg-black" aria-label={isAr ? 'مراحل الاستراتيجية' : 'Strategy stages'}>
      <div className="custom-scrollbar overflow-x-auto">
        <div className="grid min-w-[660px] grid-cols-3" role="tablist" aria-label={isAr ? 'مراحل مساحة العمل' : 'Workspace stages'}>
          {STAGES.map((stage, index) => {
            const status = statuses[stage];
            const StatusIcon = STATUS_ICONS[status];
            const selected = activeStage === stage;
            return (
              <button
                key={stage}
                type="button"
                role="tab"
                id={`strategy-stage-${stage}`}
                aria-controls={`strategy-stage-panel-${stage}`}
                aria-selected={selected}
                onClick={() => onSelect(stage)}
                className={`group flex min-h-16 items-center justify-between gap-3 border-b-2 px-4 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2962ff] ${
                  selected ? 'border-[#2962ff] text-white' : 'border-transparent text-[#787b86] hover:border-white/20 hover:text-white'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.1em]">
                    {String(index + 1).padStart(2, '0')} {stageLabels[stage]}
                  </span>
                  <span className="mt-1 block text-[9px] text-[#787b86]">
                    {stage === 'build'
                      ? (isAr ? 'أنشئ القواعد' : 'Compose the rules')
                      : stage === 'visualize'
                        ? (isAr ? 'افهم السلوك' : 'Understand the behavior')
                        : (isAr ? 'قِس الأداء' : 'Measure performance')}
                  </span>
                </span>
                <span className={`inline-flex shrink-0 items-center gap-1 text-[9px] font-semibold ${
                  status === 'ready' ? 'text-[#089981]' : status === 'protected' ? 'text-white/55' : 'text-[#d6a316]'
                }`}>
                  <StatusIcon size={12} aria-hidden="true" />
                  {statusLabels[status]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
