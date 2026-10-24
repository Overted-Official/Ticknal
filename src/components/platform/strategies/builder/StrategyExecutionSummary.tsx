import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';

export default function StrategyExecutionSummary({ program, locale, feeBps = 10 }: {
  readonly program?: ExecutableStrategyProgram | null;
  readonly locale: 'en' | 'ar';
  readonly feeBps?: number;
}) {
  const isAr = locale === 'ar';
  const execution = program?.schemaVersion === 2 ? program.execution : undefined;
  const closeFill = execution?.fillPolicy === 'signal-close';
  const wholeShares = execution?.shareSizing === 'wholeShares';
  return <span data-testid="strategy-execution-assumptions">
    {closeFill ? (isAr ? 'تنفيذ عند إغلاق يوم الإشارة' : 'Signal-day close fills') : (isAr ? 'تنفيذ عند افتتاح الجلسة التالية' : 'Next-session open fills')}
    {' · '}
    {wholeShares ? (isAr ? 'أسهم كاملة فقط' : 'Whole shares only') : (isAr ? 'أسهم كسرية' : 'Fractional shares')}
    {' · '}{execution?.feeBps ?? feeBps}{isAr ? ' نقطة أساس عمولة لكل جانب' : ' bps commission per side'}
    {' · '}{execution?.slippageBps ?? 0}{isAr ? ' نقطة أساس انزلاق' : ' bps slippage'}
  </span>;
}
