'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { RotateCcw, Send, Sparkles, X } from '@/components/ui/icon-library';
import type { AssistantTurnResult } from '../../../../lib/strategies/assistant/assistant-turn';
import type { StrategyWorkspaceSnapshot } from '../../../../lib/strategies/assistant/strategy-actions';
import { canApplyAssistantResponse, type AssistantRevisionToken } from '../../../../lib/strategies/assistant/assistant-revision';
import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';
import type { BacktestAssumptions } from '../../../../lib/strategies/run-simple-backtest';
import { compareAssistantBacktests, type AssistantBacktestComparison } from './compare-assistant-backtests';

interface Props {
  readonly locale: 'en' | 'ar';
  readonly snapshot: StrategyWorkspaceSnapshot;
  readonly currentToken: AssistantRevisionToken;
  readonly canUndo: boolean;
  readonly beforeProgram: ExecutableStrategyProgram | null;
  readonly symbol: string;
  readonly period: { readonly startDate: string; readonly endDate: string };
  readonly assumptions: BacktestAssumptions;
  readonly onApply: (snapshot: StrategyWorkspaceSnapshot, token: AssistantRevisionToken) => boolean;
  readonly onUndo: () => boolean;
  readonly onClose: () => void;
}

interface ConversationEntry { readonly role: 'user' | 'assistant'; readonly text: string }
interface PendingProposal { readonly result: Extract<AssistantTurnResult, { status: 'ok' }>; readonly token: AssistantRevisionToken }

function actionLabel(action: PendingProposal['result']['actions'][number]): string {
  switch (action.type) {
    case 'rename_strategy': return `Rename strategy · ${action.name}`;
    case 'add_simple_rule': return `Add ${action.indicatorId} to ${action.side} conditions`;
    case 'update_simple_rule': return `Update ${action.side} rule · ${action.ruleId}`;
    case 'remove_simple_rule': return `Remove ${action.side} rule · ${action.ruleId}`;
    case 'set_mode': return 'Switch to advanced workflow';
    case 'add_indicator': return `Add indicator · ${action.indicatorId}`;
    case 'add_node': return `Add card · ${action.templateId}`;
    case 'add_market_bundle': return `Add market data · ${action.fields.join(', ')}`;
    case 'connect': return `Connect ${action.sourceId} → ${action.targetId}`;
    case 'set_parameter': return `Set ${action.key} on ${action.nodeId}`;
    case 'rename_node': return `Rename card · ${action.name}`;
    case 'set_output_name': return `Name output · ${action.name}`;
    case 'group_nodes': return `Group ${action.nodeIds.length} cards · ${action.name}`;
    case 'remove_node': return `Remove card · ${action.nodeId}`;
  }
}

function firstDiagnostic(result: PendingProposal['result']): string {
  if (result.compilation.status !== 'invalid') return '';
  const diagnostic = result.compilation.diagnostics[0];
  if (!diagnostic) return 'Add the remaining buy and sell rules.';
  return 'message' in diagnostic ? diagnostic.message : diagnostic.code;
}

export default function StrategyStudioAssistant({ locale, snapshot, currentToken, canUndo, beforeProgram, symbol, period, assumptions, onApply, onUndo, onClose }: Props) {
  const isAr = locale === 'ar';
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState<readonly ConversationEntry[]>([]);
  const [proposal, setProposal] = useState<PendingProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [comparison, setComparison] = useState<AssistantBacktestComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef(currentToken);
  const activeRequest = useRef<AbortController | null>(null);
  tokenRef.current = currentToken;

  useEffect(() => () => activeRequest.current?.abort(), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = prompt.trim();
    if (busy || message.length < 2 || message.length > 2000) return;
    const token = { ...currentToken };
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setError(null);
    setProposal(null);
    setComparison(null);
    setPrompt('');
    setConversation((rows) => [...rows, { role: 'user', text: message }]);
    try {
      const response = await fetch('/api/strategies/assistant', {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshot, message }),
      });
      const result = await response.json() as AssistantTurnResult;
      if (!canApplyAssistantResponse(token, tokenRef.current)) {
        setError(isAr ? 'تغيّرت المسودة أثناء عمل المساعد. أعد إرسال الطلب على النسخة الحالية.' : 'The draft changed while the assistant was working. Ask again on the current version.');
      } else if (result.status !== 'ok') {
        setError(result.error || (isAr ? 'تعذر إعداد التعديل.' : 'Could not prepare this edit.'));
      } else {
        setConversation((rows) => [...rows, { role: 'assistant', text: result.message }]);
        setProposal({ result, token });
      }
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error && caught.message ? caught.message : 'The assistant is unavailable.');
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      setBusy(false);
    }
  };

  const apply = () => {
    if (!proposal) return;
    if (!canApplyAssistantResponse(proposal.token, tokenRef.current) || !onApply(proposal.result.snapshot, proposal.token)) {
      setError(isAr ? 'تغيّرت المسودة. أعد إرسال الطلب.' : 'The draft changed. Ask again before applying.');
      setProposal(null);
      return;
    }
    setProposal(null);
    setError(null);
  };

  const testProposal = async () => {
    if (!proposal || proposal.result.compilation.status !== 'ready' || testing) return;
    if (!canApplyAssistantResponse(proposal.token, tokenRef.current)) {
      setError(isAr ? 'تغيّرت المسودة. أعد إرسال الطلب.' : 'The draft changed. Ask again before testing.');
      return;
    }
    setTesting(true);
    setComparison(null);
    const requestedToken = proposal.token;
    const result = await compareAssistantBacktests({ before: beforeProgram, after: proposal.result.compilation.program, symbol, period, assumptions });
    if (canApplyAssistantResponse(requestedToken, tokenRef.current)) setComparison(result);
    else setError(isAr ? 'تغيّرت المسودة أثناء الاختبار.' : 'The draft changed during the test.');
    setTesting(false);
  };

  return <aside aria-label={isAr ? 'مساعد الاستراتيجيات' : 'Strategy assistant'} className="absolute inset-y-0 end-0 z-50 flex w-[min(430px,calc(100vw-56px))] flex-col border-s border-white/15 bg-black text-white md:relative md:z-20 md:shrink-0">
    <div className="h-[2px] shrink-0 bg-gradient-to-r from-[#00BCE6] via-[#2962FF] to-[#D500F9]" />
    <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
      <div className="min-w-0"><h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-[#2962FF]" />{isAr ? 'مساعد الاستراتيجيات' : 'Strategy assistant'}</h2><p className="mt-1 text-xs leading-5 text-white/50">{isAr ? 'يساعدك على تعديل المسودة الحالية فقط.' : 'Edits your current draft only.'}</p></div>
      <button type="button" onClick={onClose} aria-label={isAr ? 'إغلاق المساعد' : 'Close assistant'} className="flex size-8 shrink-0 items-center justify-center border border-white/15 text-white/65 hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-[#2962FF]"><X size={15} /></button>
    </div>
    <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
      {conversation.length === 0 && <div className="border-s-2 border-[#2962FF] ps-3 text-xs leading-6 text-white/65">{isAr ? 'صف استراتيجية الشراء والبيع أو اطلب إضافة مؤشرات وحسابات. ستراجع التغييرات قبل تطبيقها.' : 'Describe the rules you want, or ask for indicators and calculations. You review proposed changes before applying them.'}</div>}
      {conversation.map((entry, index) => <div key={`${entry.role}-${index}`} className={`border-s-2 ps-3 text-xs leading-6 ${entry.role === 'user' ? 'border-white/35 text-white' : 'border-[#2962FF] text-white/75'}`}><span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/40">{entry.role === 'user' ? (isAr ? 'أنت' : 'You') : (isAr ? 'المساعد' : 'Assistant')}</span>{entry.text}</div>)}
      {busy && <p className="text-xs text-white/55" role="status">{isAr ? 'يجري فحص التعديل…' : 'Preparing and validating the edit…'}</p>}
      {error && <p role="alert" className="border-s-2 border-[#f7525f] ps-3 text-xs leading-5 text-[#f7525f]">{error}</p>}
      {proposal && <section aria-label={isAr ? 'التغييرات المقترحة' : 'Proposed changes'} className="border border-white/15 bg-black p-3">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold"><span>{isAr ? 'التغييرات المقترحة' : 'Proposed changes'}</span><span className="tabular-nums text-white/45">{proposal.result.actions.length}</span></div>
        {proposal.result.actions.length > 0 ? <ol className="mt-3 space-y-2 border-t border-white/10 pt-3">{proposal.result.actions.map((action, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-white/70"><span className="tabular-nums text-white/35">{String(index + 1).padStart(2, '0')}</span><span>{actionLabel(action)}</span></li>)}</ol> : <p className="mt-2 text-xs text-white/55">{isAr ? 'لا توجد تغييرات لتطبيقها.' : 'No edits to apply.'}</p>}
        {proposal.result.compilation.status === 'invalid' && <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-[#ffa726]">{isAr ? 'سير العمل غير مكتمل بعد: ' : 'Workflow still needs work: '}{firstDiagnostic(proposal.result)}</p>}
        {proposal.result.compilation.status === 'ready' && <button type="button" onClick={() => { void testProposal(); }} disabled={testing} className="mt-3 w-full border border-white/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.04] disabled:opacity-40">{testing ? (isAr ? 'يجري الاختبار…' : 'Testing…') : (isAr ? `اختبار ${symbol}` : `Test ${symbol}`)}</button>}
        {comparison?.status === 'ready' && <div role="status" className="mt-3 border-t border-white/10 pt-3 text-xs leading-6 text-white/70"><p className="font-semibold text-white">{isAr ? `نتائج ${symbol}` : `${symbol} backtest`}</p><p>{isAr ? 'العائد المقترح' : 'Proposed return'} <span className="tabular-nums text-white">{comparison.afterReturnPct.toFixed(1)}%</span></p><p>{isAr ? 'العائد السابق' : 'Previous return'} <span className="tabular-nums text-white">{comparison.beforeReturnPct === null ? (isAr ? 'غير متاح' : 'Unavailable') : `${comparison.beforeReturnPct.toFixed(1)}%`}</span></p><p>{isAr ? 'أقصى تراجع مقترح' : 'Proposed max drawdown'} <span className="tabular-nums text-white">{comparison.afterDrawdownPct.toFixed(1)}%</span></p><p className="text-[11px] text-white/45">{isAr ? 'نفس المدة والافتراضات ومراجعة بيانات السوق.' : 'Same period, assumptions and market-data revision.'}</p></div>}
        {comparison?.status === 'unavailable' && <p role="status" className="mt-3 text-xs leading-5 text-[#ffa726]">{comparison.reason}</p>}
        {proposal.result.actions.length > 0 && <button type="button" onClick={apply} className="mt-4 w-full border border-[#2962FF] bg-[#2962FF] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#1e53e5] focus-visible:outline-2 focus-visible:outline-white">{isAr ? 'تطبيق على اللوحة' : 'Apply to canvas'}</button>}
      </section>}
    </div>
    <div className="shrink-0 border-t border-white/10 px-5 py-4">
      {canUndo && <button type="button" onClick={() => { if (onUndo()) { setProposal(null); setError(null); } }} className="mb-3 flex items-center gap-2 text-xs text-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2962FF]"><RotateCcw size={13} />{isAr ? 'تراجع عن آخر تعديل' : 'Undo last AI edit'}</button>}
      <form onSubmit={submit}><label htmlFor="strategy-assistant-prompt" className="sr-only">{isAr ? 'صف قواعد الاستراتيجية' : 'Describe the rules'}</label><textarea id="strategy-assistant-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={isAr ? 'صف قواعد الاستراتيجية…' : 'Describe the rules you want…'} rows={3} maxLength={2000} className="w-full resize-none border border-white/20 bg-black px-3 py-2.5 text-xs leading-5 text-white outline-none placeholder:text-white/35 focus:border-[#2962FF]" /><div className="mt-2 flex items-center justify-between gap-3"><p className="text-[11px] leading-4 text-white/45">{isAr ? 'لن يتم حفظ أي شيء أو تفعيل التنبيهات تلقائياً.' : 'Nothing is saved or enabled automatically.'}</p><button type="submit" disabled={busy || prompt.trim().length < 2} className="flex size-9 shrink-0 items-center justify-center bg-[#2962FF] text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label={isAr ? 'إرسال الطلب' : 'Send request'}><Send size={15} /></button></div></form>
    </div>
  </aside>;
}
