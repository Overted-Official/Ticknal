'use client';

import CompactStrategyBlockRow, { type StrategyBlockTone } from './CompactStrategyBlockRow';
import { localize, type AdvancedStrategyNode } from './advanced-strategy-model';

export interface CompactAdvancedNodeCardProps {
  readonly node: AdvancedStrategyNode;
  readonly locale: 'en' | 'ar';
  readonly readOnly: boolean;
  readonly selected: boolean;
  readonly onInspect: () => void;
  readonly onConfigure: () => void;
  readonly onRemove?: () => void;
}

export function getNodeTone(node: AdvancedStrategyNode): StrategyBlockTone {
  if (node.kind === 'input') return 'input';
  if (node.kind === 'calculation') return 'calculation';
  if (node.kind === 'decision' || node.kind === 'output') {
    const isSell = node.parameters?.actionSide === 'sell'
      || node.outputName?.startsWith('SELL')
      || node.id.includes('sell');
    return isSell ? 'sell' : 'buy';
  }
  if (node.kind === 'exit') return 'sell';
  if (node.kind === 'state') return 'state';
  return 'neutral';
}

export default function CompactAdvancedNodeCard({
  node,
  locale,
  readOnly,
  selected,
  onInspect,
  onConfigure,
  onRemove,
}: CompactAdvancedNodeCardProps) {
  const tone = getNodeTone(node);
  const isDisconnected = !readOnly
    && !node.protected
    && node.kind !== 'input'
    && (!node.connections || node.connections.length === 0);

  const validationMessage = isDisconnected
    ? (locale === 'ar' ? 'اربط مدخلاً لهذه الكتلة' : 'Connect an input to this block')
    : undefined;

  return (
    <CompactStrategyBlockRow
      id={node.id}
      name={node.customName || localize(node.title, locale)}
      summary={localize(node.summary, locale)}
      tone={tone}
      readOnly={readOnly || Boolean(node.protected)}
      selected={selected}
      validationMessage={validationMessage}
      onInspect={onInspect}
      onConfigure={onConfigure}
      onRemove={onRemove}
    />
  );
}
