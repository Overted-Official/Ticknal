'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, ExternalLink, Eye, EyeOff, KeyRound, RotateCcw, Settings, X } from '@/components/ui/icon-library';
import GhostMascot from '@/components/mascot/GhostMascot';
import type { AssistantTurnResult } from '../../../../lib/strategies/assistant/assistant-turn';
import type { StrategyWorkspaceSnapshot } from '../../../../lib/strategies/assistant/strategy-actions';
import { canApplyAssistantResponse, type AssistantRevisionToken } from '../../../../lib/strategies/assistant/assistant-revision';
import type { ExecutableStrategyProgram } from '../../../../lib/strategies/strategy-program';
import type { BacktestAssumptions } from '../../../../lib/strategies/run-simple-backtest';
import { compareAssistantBacktests, type AssistantBacktestComparison } from './compare-assistant-backtests';
import { isValidOpenRouterApiKey } from '../../../../lib/strategies/assistant/assistant-provider-key';

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
  readonly onPreview: (snapshot: StrategyWorkspaceSnapshot | null) => void;
  readonly onUndo: () => boolean;
  readonly onClose: () => void;
  readonly onOpen: () => void;
  readonly onCreateDraft?: () => void;
  readonly readOnly?: boolean;
  readonly open: boolean;
}

interface ConversationEntry { readonly role: 'user' | 'assistant'; readonly text: string; readonly time: string }
interface PendingProposal { readonly result: Extract<AssistantTurnResult, { status: 'ok' }>; readonly token: AssistantRevisionToken }

export function StrategyAssistantMessage({ locale, entry }: { readonly locale: 'en' | 'ar'; readonly entry: ConversationEntry }) {
  const fromUser = entry.role === 'user';
  return <div role="listitem" aria-label={fromUser ? (locale === 'ar' ? 'رسالتك' : 'Your message') : (locale === 'ar' ? 'رسالة تيكي' : 'ticky message')} className={`strategy-ticky-message-row ${fromUser ? 'strategy-ticky-message-row-user' : 'strategy-ticky-message-row-assistant'}`}>
    {!fromUser && <span className="strategy-ticky-message-avatar" aria-hidden="true"><GhostMascot width={20} height={25} /></span>}
    <div className="strategy-ticky-message-stack">
      <p className={`strategy-ticky-bubble ${fromUser ? 'strategy-ticky-bubble-user' : 'strategy-ticky-bubble-assistant'}`} dir="auto">{entry.text}</p>
      <span className="strategy-ticky-message-meta">{fromUser ? (locale === 'ar' ? 'أُرسلت' : 'Sent') : (locale === 'ar' ? 'تيكي' : 'ticky')} {entry.time}</span>
    </div>
  </div>;
}

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
    case 'disconnect': return `Disconnect ${action.sourceId} from ${action.targetId}`;
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

export default function StrategyStudioAssistant({ locale, snapshot, currentToken, canUndo, beforeProgram, symbol, period, assumptions, onApply, onPreview, onUndo, onClose, onOpen, onCreateDraft, readOnly = false, open }: Props) {
  const isAr = locale === 'ar';
  const [hasOpened, setHasOpened] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState<readonly ConversationEntry[]>([]);
  const [proposal, setProposal] = useState<PendingProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [comparison, setComparison] = useState<AssistantBacktestComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [personalKey, setPersonalKey] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const tokenRef = useRef(currentToken);
  const activeRequest = useRef<AbortController | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  tokenRef.current = currentToken;

  const messageTime = () => new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date());

  useEffect(() => { setPortalHost(document.body); }, []);
  useEffect(() => () => activeRequest.current?.abort(), []);
  useEffect(() => {
    if (!open) {
      activeRequest.current?.abort();
      setProposal(null);
      setSettingsOpen(false);
      setDraftKey('');
      setShowKey(false);
      setSettingsError(null);
    }
  }, [open]);
  useEffect(() => {
    if (open && threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [open, conversation, busy, error, proposal, comparison]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = prompt.trim();
    if (readOnly || busy || message.length < 2 || message.length > 2000) return;
    const token = { ...currentToken };
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setError(null);
    setProposal(null);
    onPreview(null);
    setComparison(null);
    setPrompt('');
    setConversation((rows) => [...rows, { role: 'user', text: message, time: messageTime() }]);
    try {
      const response = await fetch('/api/strategies/assistant', {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshot, message, ...(personalKey ? { providerKey: personalKey } : {}) }),
      });
      const result = await response.json() as AssistantTurnResult;
      if (controller.signal.aborted) return;
      if (!canApplyAssistantResponse(token, tokenRef.current)) {
        setError(isAr ? 'تغيّرت المسودة أثناء عمل المساعد. أعد إرسال الطلب على النسخة الحالية.' : 'The draft changed while the assistant was working. Ask again on the current version.');
      } else if (result.status !== 'ok') {
        setError(result.error || (isAr ? 'تعذر إعداد التعديل.' : 'Could not prepare this edit.'));
      } else {
        setConversation((rows) => [...rows, { role: 'assistant', text: result.message, time: messageTime() }]);
        setProposal(result.actions.length > 0 ? { result, token } : null);
        onPreview(result.actions.length > 0 ? result.snapshot : null);
      }
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error && caught.message ? caught.message : 'The assistant is unavailable.');
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setBusy(false);
      }
    }
  };

  const resetConversation = () => {
    activeRequest.current?.abort();
    setBusy(false);
    setConversation([]);
    setProposal(null);
    setComparison(null);
    setError(null);
    setPrompt('');
    onPreview(null);
  };

  const apply = () => {
    if (!proposal) return;
    if (!canApplyAssistantResponse(proposal.token, tokenRef.current) || !onApply(proposal.result.snapshot, proposal.token)) {
      setError(isAr ? 'تغيّرت المسودة. أعد إرسال الطلب.' : 'The draft changed. Ask again before applying.');
      setProposal(null);
      onPreview(null);
      return;
    }
    setProposal(null);
    onPreview(null);
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

  const savePersonalKey = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const key = draftKey.trim();
    if (!isValidOpenRouterApiKey(key)) {
      setSettingsError(isAr ? 'أدخل مفتاح OpenRouter صالحاً يبدأ بـ sk-or-.' : 'Enter an OpenRouter key beginning with sk-or-.');
      return;
    }
    setPersonalKey(key);
    setDraftKey('');
    setShowKey(false);
    setSettingsError(null);
  };

  if (!open) return <div className="strategy-ticky-launcher">
    {!hasOpened && <p className="strategy-ticky-greeting">{isAr ? 'مرحباً، أنا تيكي. نبني استراتيجيتك معاً؟' : 'Hi, I’m ticky. Want to build a strategy together?'}</p>}
    <button type="button" className="strategy-ticky-trigger" aria-label={isAr ? 'افتح محادثة تيكي' : 'Open ticky AI assistant'} aria-expanded="false" onClick={() => { setHasOpened(true); onOpen(); }}>
      <GhostMascot width={40} height={50} />
    </button>
  </div>;

  const panel = <aside id="strategy-assistant-panel" role="dialog" aria-label={isAr ? 'تيكي، مساعد الاستراتيجيات' : 'ticky AI assistant'} className="strategy-ticky-panel">
    <header className="strategy-ticky-header">
      <div className="flex min-w-0 items-center gap-3"><span className="strategy-ticky-header-avatar" aria-hidden="true"><GhostMascot width={28} height={35} /></span><div className="min-w-0"><h2 className="text-sm font-semibold leading-5">{isAr ? 'تيكي' : 'ticky'}</h2><p className="text-[11px] leading-4 text-white/50">{isAr ? 'مساعد استوديو الاستراتيجيات' : 'Strategy Studio assistant'}</p></div></div>
      <div className="flex shrink-0 items-center gap-1">
        {!readOnly && <button type="button" onClick={resetConversation} disabled={conversation.length === 0 && !proposal && !error} aria-label={isAr ? 'محادثة جديدة' : 'New chat'} className="strategy-ticky-header-action"><RotateCcw size={15} /></button>}
        <button type="button" onClick={() => { setSettingsOpen((value) => !value); setDraftKey(''); setShowKey(false); setSettingsError(null); }} disabled={busy} aria-label={isAr ? 'إعدادات الذكاء الاصطناعي' : 'AI settings'} aria-expanded={settingsOpen} aria-controls="strategy-ticky-settings" className="strategy-ticky-header-action"><Settings size={17} /></button>
        <button type="button" onClick={() => { activeRequest.current?.abort(); onPreview(null); onClose(); }} aria-label={isAr ? 'إغلاق تيكي' : 'Close ticky'} className="strategy-ticky-header-action"><X size={17} /></button>
      </div>
    </header>
    {settingsOpen ? <section id="strategy-ticky-settings" aria-label={isAr ? 'إعدادات الذكاء الاصطناعي' : 'AI settings'} className="strategy-ticky-settings custom-scrollbar min-h-0 flex-1 overflow-y-auto">
      <div className="strategy-ticky-settings-heading"><KeyRound size={19} /><div><h3>{isAr ? 'اتصال الذكاء الاصطناعي' : 'AI connection'}</h3><p>{isAr ? 'اختر المفتاح الذي يستخدمه تيكي للردود.' : 'Choose which key ticky uses for replies.'}</p></div></div>
      <div className="strategy-ticky-settings-source" role="status"><span>{isAr ? 'المصدر الحالي' : 'Current source'}</span><strong>{personalKey ? (isAr ? 'مفتاح OpenRouter الخاص بك' : 'Your OpenRouter key') : (isAr ? 'نسخة تيكنال التجريبية' : 'Ticknal pilot')}</strong><p>{personalKey ? (isAr ? 'سيستخدم تيكي مفتاحك بدءاً من الرسالة التالية. لم يتم التحقق منه بعد.' : 'Used from your next message. The key has not been verified yet.') : (isAr ? 'تيكي يستخدم مفتاح المنصة حالياً.' : 'Ticky currently uses the platform key.')}</p></div>
      <form onSubmit={savePersonalKey} className="strategy-ticky-key-form">
        <label htmlFor="strategy-ticky-provider-key">{isAr ? 'مفتاح OpenRouter API' : 'OpenRouter API key'}</label>
        <div className="strategy-ticky-key-field"><KeyRound size={16} aria-hidden="true" /><input id="strategy-ticky-provider-key" type={showKey ? 'text' : 'password'} value={draftKey} onChange={(event) => { setDraftKey(event.target.value); setSettingsError(null); }} placeholder="sk-or-…" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={512} aria-invalid={Boolean(settingsError)} aria-describedby="strategy-ticky-key-help" /><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? (isAr ? 'إخفاء المفتاح' : 'Hide key') : (isAr ? 'إظهار المفتاح' : 'Show key')} aria-pressed={showKey}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
        <p id="strategy-ticky-key-help">{isAr ? 'يبقى المفتاح في ذاكرة علامة التبويب فقط حتى تحديث الصفحة أو إغلاقها. يُرسل إلى خادم تيكنال مع طلبك ثم إلى OpenRouter؛ لا يُحفظ في حسابك أو تخزين المتصفح. قد تُفرض رسوم على حسابك في OpenRouter لاستخدام النموذج الذي حددته المنصة.' : 'Kept only in this tab until refresh or close. Sent to Ticknal with each request, then to OpenRouter. Never saved to your account or browser storage. The platform-selected model may incur charges on your OpenRouter account.'}</p>
        {settingsError && <p role="alert" className="strategy-ticky-key-error">{settingsError}</p>}
        <div className="strategy-ticky-key-actions"><button type="submit" disabled={!draftKey.trim()} className="strategy-ticky-key-save">{personalKey ? (isAr ? 'استبدال المفتاح' : 'Replace key') : (isAr ? 'استخدام مفتاحي' : 'Use my key')}</button>{personalKey && <button type="button" onClick={() => { setPersonalKey(''); setDraftKey(''); setSettingsError(null); }} className="strategy-ticky-key-remove">{isAr ? 'إزالة مفتاحي' : 'Remove my key'}</button>}</div>
      </form>
      <a className="strategy-ticky-key-link" href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer">{isAr ? 'الحصول على مفتاح OpenRouter' : 'Get an OpenRouter key'} <ExternalLink size={14} /></a>
    </section> : <>
    <div ref={threadRef} className="strategy-ticky-thread custom-scrollbar min-h-0 flex-1 overflow-y-auto" aria-live="polite">
      {readOnly ? <div className="strategy-ticky-empty">
        <span className="strategy-ticky-empty-avatar" aria-hidden="true"><GhostMascot width={46} height={58} /></span>
        <h3>{isAr ? 'لنبدأ باستراتيجيتك الخاصة' : 'Let’s build your own strategy.'}</h3>
        <p>{isAr ? 'هذه الاستراتيجية محمية وللعرض فقط. افتح مسودة جديدة لتبنيها مع تيكي.' : 'This strategy is protected and view-only. Start a new draft to build with ticky.'}</p>
        {onCreateDraft && <button type="button" onClick={onCreateDraft} className="strategy-ticky-start-button">{isAr ? 'إنشاء استراتيجية جديدة' : 'Create a new strategy'}</button>}
      </div> : conversation.length === 0 ? <div className="strategy-ticky-empty">
        <span className="strategy-ticky-empty-avatar" aria-hidden="true"><GhostMascot width={46} height={58} /></span>
        <h3>{isAr ? 'مرحباً، أنا تيكي' : 'Hi, I’m ticky'}</h3>
        <p>{isAr ? 'ما الاستراتيجية التي تريد بناءها؟ صف فكرتك ببساطة، وسأعرض التغييرات على اللوحة قبل تطبيقها.' : 'What are we building today? Describe your idea and I’ll preview each change on the canvas before you apply it.'}</p>
        <small>{isAr ? 'تُرسل رسالتك ومسودتك الحالية إلى OpenRouter.' : 'Your message and current draft are sent to OpenRouter.'}</small>
      </div> : <div role="list" aria-label={isAr ? 'المحادثة' : 'Conversation'} className="strategy-ticky-conversation">{conversation.map((entry, index) => <StrategyAssistantMessage key={`${entry.role}-${index}`} locale={locale} entry={entry} />)}</div>}
      {!readOnly && busy && <div className="strategy-ticky-message-row strategy-ticky-message-row-assistant" role="status"><span className="strategy-ticky-message-avatar" aria-hidden="true"><GhostMascot width={20} height={25} /></span><p className="strategy-ticky-bubble strategy-ticky-bubble-assistant">{isAr ? 'أفكر في المسودة وأتحقق منها…' : 'Thinking through your draft…'}</p></div>}
      {!readOnly && error && <p role="alert" className="strategy-ticky-error">{error}</p>}
      {!readOnly && proposal && <section aria-label={isAr ? 'التغييرات المقترحة' : 'Proposed changes'} className="strategy-ticky-proposal border border-white/15 bg-black p-3">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold"><span>{isAr ? 'التغييرات المقترحة' : 'Proposed changes'}</span><span className="tabular-nums text-white/45">{proposal.result.actions.length}</span></div>
        {proposal.result.actions.length > 0 && <p className="mt-2 text-[11px] leading-4 text-[#9eb7ff]">{isAr ? 'معاينة على اللوحة · لم يتم تطبيق التغييرات بعد' : 'Previewing on the canvas · changes are not applied yet'}</p>}
        {proposal.result.actions.length > 0 ? <ol className="mt-3 space-y-2 border-t border-white/10 pt-3">{proposal.result.actions.map((action, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-white/70"><span className="tabular-nums text-white/35">{String(index + 1).padStart(2, '0')}</span><span>{actionLabel(action)}</span></li>)}</ol> : <p className="mt-2 text-xs text-white/55">{isAr ? 'لا توجد تغييرات لتطبيقها.' : 'No edits to apply.'}</p>}
        {proposal.result.compilation.status === 'invalid' && <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-[#ffa726]">{isAr ? 'سير العمل غير مكتمل بعد: ' : 'Workflow still needs work: '}{firstDiagnostic(proposal.result)}</p>}
        {proposal.result.compilation.status === 'ready' && <button type="button" onClick={() => { void testProposal(); }} disabled={testing} className="mt-3 w-full border border-white/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.04] disabled:opacity-40">{testing ? (isAr ? 'يجري الاختبار…' : 'Testing…') : (isAr ? `اختبار ${symbol}` : `Test ${symbol}`)}</button>}
        {comparison?.status === 'ready' && <div role="status" className="mt-3 border-t border-white/10 pt-3 text-xs leading-6 text-white/70"><p className="font-semibold text-white">{isAr ? `نتائج ${symbol}` : `${symbol} backtest`}</p><p>{isAr ? 'العائد المقترح' : 'Proposed return'} <span className="tabular-nums text-white">{comparison.afterReturnPct.toFixed(1)}%</span></p><p>{isAr ? 'العائد السابق' : 'Previous return'} <span className="tabular-nums text-white">{comparison.beforeReturnPct === null ? (isAr ? 'غير متاح' : 'Unavailable') : `${comparison.beforeReturnPct.toFixed(1)}%`}</span></p><p>{isAr ? 'أقصى تراجع مقترح' : 'Proposed max drawdown'} <span className="tabular-nums text-white">{comparison.afterDrawdownPct.toFixed(1)}%</span></p><p className="text-[11px] text-white/45">{isAr ? 'نفس المدة والافتراضات ومراجعة بيانات السوق.' : 'Same period, assumptions and market-data revision.'}</p></div>}
        {comparison?.status === 'unavailable' && <p role="status" className="mt-3 text-xs leading-5 text-[#ffa726]">{comparison.reason}</p>}
        {proposal.result.actions.length > 0 && <button type="button" onClick={apply} className="mt-4 w-full border border-[#2962FF] bg-[#2962FF] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#1e53e5] focus-visible:outline-2 focus-visible:outline-white">{isAr ? 'تطبيق على اللوحة' : 'Apply to canvas'}</button>}
      </section>}
    </div>
    {!readOnly && <footer className="strategy-ticky-footer shrink-0 border-t border-white/10 px-4 py-4">
      {canUndo && <button type="button" onClick={() => { if (onUndo()) { onPreview(null); setProposal(null); setError(null); } }} className="mb-3 flex items-center gap-2 text-xs text-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2962FF]"><RotateCcw size={13} />{isAr ? 'تراجع عن آخر تعديل' : 'Undo last AI edit'}</button>}
      <form onSubmit={submit} className="strategy-ticky-composer"><label htmlFor="strategy-assistant-prompt" className="sr-only">{isAr ? 'صف قواعد الاستراتيجية' : 'Describe the rules'}</label><textarea id="strategy-assistant-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={isAr ? 'اسأل تيكي عن استراتيجيتك…' : 'Ask ticky about your strategy…'} rows={2} maxLength={2000} className="strategy-ticky-composer-input" /><div className="strategy-ticky-composer-bottom"><p>{isAr ? 'راجع التغييرات قبل تطبيقها' : 'Review changes before applying'}</p><button type="submit" disabled={busy || prompt.trim().length < 2} className="strategy-ticky-send" aria-label={isAr ? 'إرسال الطلب' : 'Send request'}><ArrowUp size={18} strokeWidth={2} /></button></div></form>
      <p className="strategy-ticky-footer-note">{personalKey ? (isAr ? 'باستخدام مفتاح OpenRouter الخاص بك · لن تُحفظ الاستراتيجية أو تُفعّل التنبيهات تلقائياً.' : 'Using your OpenRouter key · Nothing is saved or enabled automatically.') : (isAr ? 'نسخة تجريبية عبر OpenRouter · لن تُحفظ الاستراتيجية أو تُفعّل التنبيهات تلقائياً.' : 'OpenRouter pilot · Nothing is saved or enabled automatically.')}</p>
    </footer>}
    </>}
  </aside>;
  return portalHost ? createPortal(panel, portalHost) : panel;
}
