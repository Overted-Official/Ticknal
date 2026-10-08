import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import StrategyVisualizationPanel from '../../src/components/platform/strategies/builder/StrategyVisualizationPanel';

const model = { ticker: 'COMI', points: [{ date: '2025-01-01', close: 70, volume: 10 }, { date: '2025-01-02', close: 71, volume: 12 }], markers: [{ date: '2025-01-02', price: 71, side: 'buy' as const, label: 'Buy rule matched' }], panes: [{ id: 'rsi', name: 'RSI', presentation: 'line' as const, color: '#2962ff', values: [{ date: '2025-01-01', value: 30 }, { date: '2025-01-02', value: 35 }] }] };

describe('StrategyVisualizationPanel', () => {
  it('renders ticker and timeframe controls, charts, markers, panes and navigation', () => {
    const markup = renderToStaticMarkup(<StrategyVisualizationPanel model={model} ticker="COMI" focusedBlockId="rsi" locale="en" onTickerChange={vi.fn()} onFocusBlock={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} />);
    expect(markup).toContain('COMI');
    expect(markup).toContain('1Y');
    expect(markup).toContain('aria-label="COMI price chart"');
    expect(markup).toContain('Buy signal');
    expect(markup).toContain('Sell signal');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('Return to Build');
    expect(markup).toContain('Continue to Backtest');
  });

  it('renders bilingual empty guidance', () => {
    const en = renderToStaticMarkup(<StrategyVisualizationPanel model={null} ticker="COMI" focusedBlockId={null} locale="en" onTickerChange={vi.fn()} onFocusBlock={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} />);
    const ar = renderToStaticMarkup(<StrategyVisualizationPanel model={null} ticker="COMI" focusedBlockId={null} locale="ar" onTickerChange={vi.fn()} onFocusBlock={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} />);
    expect(en).toContain('Add at least one Buy rule and one Sell rule');
    expect(ar).toContain('أضف قاعدة شراء واحدة وقاعدة بيع واحدة');
  });
});
