import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StrategyStudioAssistant, { StrategyAssistantMessage } from '../../src/components/platform/strategies/builder/StrategyStudioAssistant';
import { DEFAULT_BACKTEST_ASSUMPTIONS } from '../../src/components/platform/strategies/builder/strategy-backtest-assumptions';

describe('Strategy Studio assistant panel', () => {
  it('distinguishes an incoming ghost message from an outgoing user message', () => {
    const incoming = renderToStaticMarkup(<StrategyAssistantMessage locale="en" entry={{ role: 'assistant', text: 'Try RSI(14).', time: '09:41' }} />);
    const outgoing = renderToStaticMarkup(<StrategyAssistantMessage locale="en" entry={{ role: 'user', text: 'Add a buy rule.', time: '09:42' }} />);
    expect(incoming).toContain('aria-label="ticky message"');
    expect(incoming).toContain('<svg');
    expect(outgoing).toContain('aria-label="Your message"');
    expect(outgoing).toContain('Sent 09:42');
    expect(outgoing).not.toContain('<svg');
  });

  it('shows a session-only draft assistant with explicit canvas apply and no save or alert control', () => {
    const html = renderToStaticMarkup(<StrategyStudioAssistant
      locale="en"
      snapshot={{ revision: 0, mode: 'simple', draft: { id: 'custom-1', name: 'Draft', buyRules: [], sellRules: [] }, nodes: [], optionalStages: [] }}
      currentToken={{ strategyId: 'custom-1', revision: 0 }}
      canUndo={false}
      beforeProgram={null}
      symbol="COMI"
      period={{ startDate: '2025-01-01', endDate: '2026-10-20' }}
      assumptions={DEFAULT_BACKTEST_ASSUMPTIONS}
      onApply={() => true}
      onPreview={() => {}}
      onUndo={() => false}
      onClose={() => {}}
      onOpen={() => {}}
      open={true}
    />);
    expect(html).toContain('ticky');
    expect(html).toContain('OpenRouter pilot');
    expect(html).toContain('Describe the rules');
    expect(html).toContain('Nothing is saved or enabled automatically');
    expect(html).toContain('strategy-ticky-composer');
    expect(html).toContain('Hi, I’m ticky');
    expect(html).toContain('aria-label="AI settings"');
    expect(html).not.toContain('Enable alerts');
  });

  it('opens from a protected strategy without exposing its draft or enabling chat input', () => {
    const html = renderToStaticMarkup(<StrategyStudioAssistant
      locale="en"
      snapshot={{ revision: 0, mode: 'simple', draft: { id: 'typhon', name: 'Typhon Strategy', buyRules: [], sellRules: [] }, nodes: [], optionalStages: [] }}
      currentToken={{ strategyId: 'typhon', revision: 0 }}
      canUndo={false}
      beforeProgram={null}
      symbol="COMI"
      period={{ startDate: '2025-01-01', endDate: '2026-10-20' }}
      assumptions={DEFAULT_BACKTEST_ASSUMPTIONS}
      onApply={() => false}
      onPreview={() => {}}
      onUndo={() => false}
      onClose={() => {}}
      onOpen={() => {}}
      onCreateDraft={() => {}}
      readOnly
      open
    />);
    expect(html).toContain('Create a new strategy');
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('Typhon Strategy');
  });

  it('shows a floating ghost invitation while the chat is closed', () => {
    const html = renderToStaticMarkup(<StrategyStudioAssistant
      locale="en"
      snapshot={{ revision: 0, mode: 'simple', draft: { id: 'custom-1', name: 'Draft', buyRules: [], sellRules: [] }, nodes: [], optionalStages: [] }}
      currentToken={{ strategyId: 'custom-1', revision: 0 }}
      canUndo={false}
      beforeProgram={null}
      symbol="COMI"
      period={{ startDate: '2025-01-01', endDate: '2026-10-20' }}
      assumptions={DEFAULT_BACKTEST_ASSUMPTIONS}
      onApply={() => true}
      onPreview={() => {}}
      onUndo={() => false}
      onClose={() => {}}
      onOpen={() => {}}
      open={false}
    />);
    expect(html).toContain('Hi, I’m ticky');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('<svg');
    expect(html).toContain('cx="80"');
    expect(html).toContain('cy="120"');
    expect(html).not.toContain('Describe the rules');
  });
});
