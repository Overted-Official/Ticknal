import type { AdvancedExitPolicy, AdvancedProgramInput, AdvancedStrategyProgram, StrategyProgramPredicate } from '../../../../lib/strategies/strategy-program';
import type { AdvancedStrategyNode } from './advanced-strategy-model';
import type { IndicatorExecutionMetadata } from './compile-simple-strategy';

export type CompileAdvancedResult =
  | { readonly status: 'ready'; readonly program: AdvancedStrategyProgram; readonly diagnostics: readonly [] }
  | { readonly status: 'invalid'; readonly diagnostics: readonly { readonly nodeId?: string; readonly message: string }[] };

const comparisons = new Set(['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow']);
const operations = new Set(['add', 'subtract', 'multiply', 'divide']);
const transforms = new Set(['ema', 'sma', 'wma', 'normalize']);
const statistics = new Set(['minimum', 'maximum', 'mean', 'median']);

export function compileAdvancedStrategy(nodes: readonly AdvancedStrategyNode[], indicators: readonly IndicatorExecutionMetadata[]): CompileAdvancedResult {
  const diagnostics: { nodeId?: string; message: string }[] = [];
  const inputs: AdvancedProgramInput[] = [];
  const exitPolicies: AdvancedExitPolicy[] = [];
  const buy: StrategyProgramPredicate[][] = [];
  const sell: StrategyProgramPredicate[][] = [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const catalog = new Map(indicators.map((indicator) => [indicator.id, indicator]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const source = (node: AdvancedStrategyNode) => node.connections ?? [];
  const issue = (node: AdvancedStrategyNode, message: string) => diagnostics.push({ nodeId: node.id, message });
  const number = (node: AdvancedStrategyNode, key: string, fallback?: number): number | null => {
    const raw = node.parameters?.[key];
    const value = raw === undefined ? fallback : Number(raw);
    if (value === undefined || !Number.isFinite(value) || (raw !== undefined && raw.trim() === '')) { issue(node, `Enter a valid ${key}.`); return null; }
    return value;
  };
  const compileValue = (id: string): void => {
    if (visited.has(id)) return;
    const node = byId.get(id);
    if (!node) { diagnostics.push({ message: `Connected block ${id} is missing.` }); return; }
    if (visiting.has(id)) { issue(node, 'Connections cannot form a cycle.'); return; }
    visiting.add(id);
    for (const upstream of source(node)) compileValue(upstream);
    visiting.delete(id);
    visited.add(id);
    const template = node.templateId ?? (id === 'custom-market-data' ? 'market-input' : '');
    const dependencies = source(node);
    if (template === 'market-input') {
      if ((node.parameters?.series ?? 'ohlcv') !== 'ohlcv') issue(node, 'Only per-company OHLCV history can be backtested now.');
      const field = node.parameters?.field ?? 'close';
      if (!['open', 'high', 'low', 'close', 'volume'].includes(field)) issue(node, 'Choose an OHLCV field.');
      else inputs.push({ id, kind: 'market', field: field as 'open' | 'high' | 'low' | 'close' | 'volume' });
    } else if (template === 'parameter') {
      const value = number(node, 'value', 1);
      if (value !== null) inputs.push({ id, kind: 'constant', value });
    } else if (template === 'indicator') {
      if (dependencies.length !== 1 || !inputs.some((input) => input.id === dependencies[0] && input.kind === 'market')) { issue(node, 'Connect the indicator to one market-data block.'); return; }
      const indicator = catalog.get(node.parameters?.indicatorId ?? '');
      if (!indicator?.available || indicator.requiredCapabilities.length || indicator.repaintBehavior === 'confirmed-with-delay') { issue(node, 'Choose an executable indicator with available daily data.'); return; }
      const numeric = indicator.outputs.filter((output) => output.kind === 'number');
      const output = numeric.find((item) => item.key === node.parameters?.outputKey) ?? (numeric.length === 1 ? numeric[0] : undefined);
      if (!output) { issue(node, 'Choose a numeric indicator output.'); return; }
      const parameters = { ...indicator.defaultParameters };
      if (Object.hasOwn(parameters, 'period')) {
        const period = number(node, 'period', Number(parameters.period));
        if (period === null || !Number.isSafeInteger(period) || period < 1 || period > 1000) { issue(node, 'Indicator period must be 1–1000 bars.'); return; }
        parameters.period = period;
      }
      inputs.push({ id, kind: 'indicator', indicatorId: indicator.id, formulaVersion: indicator.formulaVersion, outputKey: output.key, unit: output.unit, parameters });
    } else if (template === 'weighted-composite' || template === 'transform' || template === 'rolling-statistic' || template === 'math-operation') {
      if (dependencies.length < (template === 'math-operation' || template === 'weighted-composite' ? 2 : 1)) { issue(node, 'Connect the required calculation inputs.'); return; }
      if (dependencies.some((dependency) => !inputs.some((input) => input.id === dependency && input.kind !== 'position-memory' && input.kind !== 'rolling-state'))) { issue(node, 'Calculations must connect to numeric data or calculations, not trade-state values.'); return; }
      const operation = template === 'weighted-composite' ? 'weighted' : template === 'math-operation' ? node.parameters?.operation ?? 'add' : template === 'transform' ? node.parameters?.method ?? 'ema' : node.parameters?.operation ?? 'mean';
      const valid = template === 'weighted-composite' || (template === 'math-operation' ? operations : template === 'transform' ? transforms : statistics).has(operation);
      if (!valid) { issue(node, 'Choose a supported calculation.'); return; }
      const period = template === 'transform' || template === 'rolling-statistic' ? number(node, 'period', template === 'transform' ? 3 : 20) : undefined;
      if (period === null || (period !== undefined && (!Number.isSafeInteger(period) || period < 1 || period > 1000))) { issue(node, 'Calculation period must be 1–1000 bars.'); return; }
      const weights = template === 'weighted-composite' ? dependencies.map((dependency) => number(node, `weight:${dependency}`, 1)) : undefined;
      if (weights?.some((weight) => weight === null) || (weights && weights.every((weight) => weight === 0))) { issue(node, 'Weights must be valid and not all zero.'); return; }
      const normalization = node.parameters?.normalization ?? 'zeroToHundred';
      if (template === 'weighted-composite' && !['zeroToHundred', 'zScore', 'minMax', 'none'].includes(normalization)) { issue(node, 'Choose a supported normalization.'); return; }
      inputs.push({ id, kind: 'calculation', operation: operation as Extract<AdvancedProgramInput, { kind: 'calculation' }>['operation'], sourceIds: dependencies, ...(period !== undefined ? { period } : {}), ...(weights ? { weights: weights as number[] } : {}), ...(template === 'weighted-composite' ? { normalization: normalization as 'zeroToHundred' | 'zScore' | 'minMax' | 'none' } : {}) });
    } else if (template === 'position-memory' || template === 'rolling-state') {
      const upstream = inputs.find((input) => input.id === dependencies[0]);
      if (dependencies.length !== 1 || !upstream || upstream.kind === 'position-memory' || upstream.kind === 'rolling-state') {
        issue(node, 'Connect this trade-state block to one market, indicator, or calculation value.'); return;
      }
      if (template === 'position-memory') {
        const capture = node.parameters?.capture ?? 'entry';
        const update = node.parameters?.update ?? 'never';
        if (!['entry', 'exit'].includes(capture) || !['eachBar', 'never'].includes(update)) { issue(node, 'Choose valid memory settings.'); return; }
        inputs.push({ id, kind: 'position-memory', sourceId: upstream.id, capture: capture as 'entry' | 'exit', update: update as 'eachBar' | 'never' });
      } else {
        const operation = node.parameters?.operation ?? 'maximum';
        if (!['minimum', 'maximum'].includes(operation)) { issue(node, 'Choose a maximum or minimum to track.'); return; }
        inputs.push({ id, kind: 'rolling-state', sourceId: upstream.id, operation: operation as 'minimum' | 'maximum' });
      }
    } else if (template === 'dynamic-target') {
      if (dependencies.length !== 1 || !inputs.some((input) => input.id === dependencies[0])) { issue(node, 'Connect one numeric price-distance source to the target.'); return; }
      const multiplier = number(node, 'multiplier', 1);
      if (multiplier === null || multiplier <= 0 || multiplier > 1000) { issue(node, 'Target multiplier must be greater than zero and at most 1000.'); return; }
      exitPolicies.push({ id, kind: 'profit-target', sourceId: dependencies[0], multiplier });
    } else if (template === 'trailing-exit') {
      const anchor = inputs.find((input) => input.id === dependencies[0]);
      if (dependencies.length !== 1 || anchor?.kind !== 'rolling-state' || anchor.operation !== 'maximum') { issue(node, 'Connect a maximum tracked-high block to the trailing exit.'); return; }
      const distance = number(node, 'distance', 2);
      const volatilityPeriod = number(node, 'volatilityPeriod', 14);
      if (distance === null || distance <= 0 || distance > 1000 || volatilityPeriod === null
        || !Number.isSafeInteger(volatilityPeriod) || volatilityPeriod < 1 || volatilityPeriod > 1000) {
        issue(node, 'Enter a positive ATR multiplier and a 1–1000 bar period.'); return;
      }
      exitPolicies.push({ id, kind: 'trailing-stop', anchorId: anchor.id, distance, volatilityPeriod });
    } else if (template === 'condition' || template === 'sell-condition' || template === 'priority-trigger') {
      let inputId = dependencies[0];
      if (node.parameters?.sourceRuleId) {
        const indicator = catalog.get(node.parameters.indicatorId ?? '');
        if (!indicator?.available || indicator.requiredCapabilities.length || indicator.repaintBehavior === 'confirmed-with-delay') { issue(node, 'Choose an executable indicator.'); return; }
        const numeric = indicator.outputs.filter((output) => output.kind === 'number');
        const output = numeric.find((item) => item.key === node.parameters?.outputKey) ?? (numeric.length === 1 ? numeric[0] : undefined);
        const period = number(node, 'period', Number(indicator.defaultParameters.period));
        if (!output || period === null || !Number.isSafeInteger(period) || period < 1 || period > 1000) { issue(node, 'Choose an indicator output and valid period.'); return; }
        inputId = `input:${id}`;
        inputs.push({ id: inputId, kind: 'indicator', indicatorId: indicator.id, formulaVersion: indicator.formulaVersion, outputKey: output.key, unit: output.unit, parameters: { ...indicator.defaultParameters, period } });
      }
      if (dependencies.length !== 1 || !inputs.some((input) => input.id === inputId)) { issue(node, 'Connect exactly one numeric source to this rule.'); return; }
      const side = template === 'sell-condition' ? sell : buy;
      if (template === 'priority-trigger') {
        const rawLevels = (node.parameters?.thresholds ?? '').split(',').map((value) => value.trim());
        const levels = rawLevels.map(Number);
        if (!levels.length || levels.length > 12 || rawLevels.some((value) => value === '') || levels.some((value) => !Number.isFinite(value))) { issue(node, 'Enter 1–12 valid priority levels.'); return; }
        for (const [index, threshold] of levels.entries()) side.push([{ id: `${id}:${index}`, inputId, operator: 'crossesAbove', threshold }]);
      } else {
        const threshold = number(node, 'compareValue', 0);
        const operator = node.parameters?.operator ?? 'crossesAbove';
        if (threshold === null || !comparisons.has(operator)) { issue(node, 'Choose a valid comparison and threshold.'); return; }
        const predicate: StrategyProgramPredicate = { id, inputId, operator: operator as StrategyProgramPredicate['operator'], threshold };
        if (node.parameters?.connector === 'and' && side.length > 0) side[side.length - 1].push(predicate);
        else side.push([predicate]);
      }
    } else {
      issue(node, 'This block does not have executable backtest semantics yet. Remove it before testing.');
    }
  };

  if (nodes.length > 48 || new Set(nodes.map((node) => node.id)).size !== nodes.length) return { status: 'invalid', diagnostics: [{ message: 'Workflow exceeds 48 unique blocks.' }] };
  for (const node of nodes) compileValue(node.id);
  if (buy.length === 0) diagnostics.push({ message: 'Add a connected buy rule.' });
  if (sell.length === 0 && exitPolicies.length === 0) diagnostics.push({ message: 'Add a connected sell rule or exit policy.' });
  if (inputs.length > 32 || buy.flat().length > 16 || sell.flat().length > 16 || exitPolicies.length > 16) diagnostics.push({ message: 'Workflow exceeds the execution limits.' });
  if (diagnostics.length) return { status: 'invalid', diagnostics };
  return { status: 'ready', diagnostics: [], program: { schemaVersion: 2, timeframe: 'D', inputs, buy, sell, ...(exitPolicies.length ? { exitPolicies } : {}) } };
}
