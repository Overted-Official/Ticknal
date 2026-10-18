import { estimateAdvancedWorkPerBar, MAX_ADVANCED_PROGRAM_BYTES, MAX_ADVANCED_PROGRAM_INPUTS, MAX_ADVANCED_WORKFLOW_NODES, MAX_ADVANCED_WORK_UNITS_PER_BAR, type AdvancedExitPolicy, type AdvancedProgramInput, type AdvancedStrategyProgram, type StrategyProgramPredicate } from '../../../../lib/strategies/strategy-program';
import type { AdvancedStrategyNode } from './advanced-strategy-model';
import type { IndicatorExecutionMetadata } from './compile-simple-strategy';
import { normalizeLiveTicker } from '../../../../lib/indicators/server/types';
import { compileFormula, type FormulaRegister } from '../../../../lib/strategies/formula-engine';
import { validRbfModel } from '../../../../lib/strategies/rbf-model';
import { validExecutionPolicy } from '../../../../lib/strategies/strategy-program';

export type CompileAdvancedResult =
  | { readonly status: 'ready'; readonly program: AdvancedStrategyProgram; readonly diagnostics: readonly [] }
  | { readonly status: 'invalid'; readonly diagnostics: readonly { readonly nodeId?: string; readonly message: string }[] };

const comparisons = new Set(['crossesAbove', 'crossesBelow', 'isAbove', 'isBelow']);
const operations = new Set(['add', 'subtract', 'multiply', 'divide', 'min', 'max', 'coalesce', 'regimeStart', 'regimeMaximum', 'regimeMinimum']);
const transforms = new Set(['ema', 'rma', 'lag', 'absolute', 'atan', 'clamp', 'sma', 'wma', 'normalize']);
const statistics = new Set(['minimum', 'maximum', 'mean', 'median', 'stdDev', 'percentileRank']);

export function compileAdvancedStrategy(nodes: readonly AdvancedStrategyNode[], indicators: readonly IndicatorExecutionMetadata[]): CompileAdvancedResult {
  const diagnostics: { nodeId?: string; message: string }[] = [];
  const inputs: AdvancedProgramInput[] = [];
  const exitPolicies: AdvancedExitPolicy[] = [];
  let execution: AdvancedStrategyProgram['execution'];
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
  const compileGate = (node: AdvancedStrategyNode): StrategyProgramPredicate | null | undefined => {
    if (node.parameters?.gateMode === 'always') return undefined;
    const inputId = node.parameters?.gateInputId;
    if (!inputId) {
      if (node.parameters?.gateMode === 'condition') { issue(node, 'Choose a value for the exit condition.'); return null; }
      return undefined;
    }
    const operator = node.parameters?.gateOperator ?? 'isAbove';
    const threshold = number(node, 'gateThreshold', 0);
    const compareInputId = node.parameters?.gateComparisonMode === 'series' ? node.parameters?.gateCompareInputId : undefined;
    if (node.parameters?.gateComparisonMode === 'series' && !compareInputId) { issue(node, 'Choose a reference value for the exit condition.'); return null; }
    if (!inputs.some((input) => input.id === inputId) || (compareInputId && !inputs.some((input) => input.id === compareInputId)) || !comparisons.has(operator) || threshold === null) {
      issue(node, 'Choose valid data, comparison, and threshold for the exit condition.');
      return null;
    }
    return { id: `${node.id}:gate`, inputId, operator: operator as StrategyProgramPredicate['operator'], threshold, ...(compareInputId ? { compareInputId } : {}) };
  };
  const compileValue = (id: string): void => {
    if (visited.has(id)) return;
    const node = byId.get(id);
    if (!node) { diagnostics.push({ message: `Connected block ${id} is missing.` }); return; }
    if (visiting.has(id)) { issue(node, 'Connections cannot form a cycle.'); return; }
    visiting.add(id);
    const template = node.templateId ?? (id === 'custom-market-data' ? 'market-input' : '');
    for (const upstream of source(node)) compileValue(upstream);
    // Dropdown-selected references are dependencies too, regardless of creation order.
    const references: string[] = [];
    if (['condition', 'sell-condition'].includes(template) && node.parameters?.compareMode === 'series' && node.parameters.compareInputId) references.push(node.parameters.compareInputId);
    if (template === 'dynamic-target' || template === 'trailing-exit') {
      if (node.parameters?.gateMode !== 'always' && node.parameters?.gateInputId) references.push(node.parameters.gateInputId);
      if (node.parameters?.gateMode !== 'always' && node.parameters?.gateComparisonMode === 'series' && node.parameters.gateCompareInputId) references.push(node.parameters.gateCompareInputId);
      if (template === 'trailing-exit' && node.parameters?.volatilitySourceId) references.push(node.parameters.volatilitySourceId);
    }
    for (const upstream of references) compileValue(upstream);
    visiting.delete(id);
    visited.add(id);
    const dependencies = source(node);
    if (template === 'formula') {
      if (dependencies.some((dependency) => !inputs.some((input) => input.id === dependency && input.kind !== 'position-memory' && input.kind !== 'rolling-state'))) { issue(node, 'Custom calculations need data or calculation inputs.'); return; }
      try {
        const aliases: string[] = JSON.parse(node.parameters?.aliases ?? '[]');
        const registers: FormulaRegister[] = JSON.parse(node.parameters?.registers ?? '[]');
        const input = { id, kind: 'formula' as const, sourceIds: dependencies, aliases, registers, outputKey: node.parameters?.outputKey ?? registers.at(-1)?.key ?? '' };
        compileFormula(input);
        inputs.push(input);
      } catch (error) { issue(node, error instanceof Error ? error.message : 'Check the custom calculation.'); }
    } else if (template === 'formula-output') {
      const parent = inputs.find((input) => input.id === dependencies[0]);
      const outputKey = node.parameters?.outputKey ?? '';
      if (dependencies.length !== 1 || parent?.kind !== 'formula' || !parent.registers.some((register) => register.key === outputKey)) { issue(node, 'Choose a custom calculation and one of its named outputs.'); return; }
      inputs.push({ id, kind: 'formula-output', sourceId: parent.id, outputKey });
    } else if (template === 'rbf-model') {
      try {
        const model: unknown = JSON.parse(node.parameters?.model ?? '');
        if (!validRbfModel(model, dependencies.length) || dependencies.some((dependency) => !inputs.some((input) => input.id === dependency && input.kind !== 'position-memory' && input.kind !== 'rolling-state'))) { issue(node, 'Use a valid model with one mean, scale, and vector dimension per connected feature.'); return; }
        inputs.push({ id, kind: 'rbf-model', sourceIds: dependencies, model });
      } catch { issue(node, 'Enter valid model weights as JSON.'); }
    } else if (template === 'market-input') {
      if ((node.parameters?.series ?? 'ohlcv') !== 'ohlcv') issue(node, 'Only per-company OHLCV history can be backtested now.');
      const field = node.parameters?.field ?? 'close';
      if (!['open', 'high', 'low', 'close', 'volume'].includes(field)) issue(node, 'Choose an OHLCV field.');
      else inputs.push({ id, kind: 'market', field: field as 'open' | 'high' | 'low' | 'close' | 'volume' });
    } else if (template === 'parameter') {
      const value = number(node, 'value', 1);
      if (value === null) return;
      const overrides: Record<string, number> = {};
      if (node.parameters?.symbolOverrides) {
        try {
          const raw: unknown = JSON.parse(node.parameters.symbolOverrides);
          if (!Array.isArray(raw) || raw.length > 400) throw new Error('Invalid company overrides.');
          for (const item of raw) {
            if (!item || typeof item !== 'object' || Array.isArray(item) || !('symbol' in item) || !('value' in item)
              || typeof item.symbol !== 'string' || typeof item.value !== 'number' && typeof item.value !== 'string') throw new Error('Invalid company override.');
            const symbol = normalizeLiveTicker(item.symbol);
            const override = typeof item.value === 'string' && item.value.trim() === '' ? NaN : Number(item.value);
            if (!symbol || Object.hasOwn(overrides, symbol) || !Number.isFinite(override) || Math.abs(override) > 1_000_000_000) throw new Error('Invalid company override.');
            overrides[symbol] = override;
          }
        } catch { issue(node, 'Each company override needs a unique valid ticker and finite value.'); return; }
      }
      inputs.push({ id, kind: 'constant', value, ...(Object.keys(overrides).length ? { overrides } : {}) });
    } else if (template === 'execution-policy') {
      if (execution) { issue(node, 'Use only one backtest execution card.'); return; }
      const fillPolicy = node.parameters?.fillPolicy ?? 'next-session-open';
      const shareSizing = node.parameters?.shareSizing ?? 'fractional';
      if (!['next-session-open', 'signal-close'].includes(fillPolicy) || !['fractional', 'wholeShares'].includes(shareSizing)) { issue(node, 'Choose valid fill timing and share sizing.'); return; }
      const feeBps = node.parameters?.feeBps?.trim() ? number(node, 'feeBps') : undefined;
      const slippageBps = node.parameters?.slippageBps?.trim() ? number(node, 'slippageBps') : undefined;
      const valuation = node.parameters?.valuation as NonNullable<AdvancedStrategyProgram['execution']>['valuation'];
      if (feeBps === null || slippageBps === null) return;
      const candidate = { fillPolicy: fillPolicy as 'next-session-open' | 'signal-close', shareSizing: shareSizing as 'fractional' | 'wholeShares', ...(feeBps !== undefined ? { feeBps } : {}), ...(slippageBps !== undefined ? { slippageBps } : {}), ...(valuation ? { valuation } : {}) };
      if (!validExecutionPolicy(candidate)) { issue(node, 'Use execution costs from 0–1000 basis points and a valid valuation method.'); return; }
      execution = candidate;
    } else if (template === 'indicator') {
      if (dependencies.length !== 1 || !inputs.some((input) => input.id === dependencies[0] && input.kind === 'market')) { issue(node, 'Connect the indicator to one market-data block.'); return; }
      const indicator = catalog.get(node.parameters?.indicatorId ?? '');
      if (!indicator?.available || indicator.requiredCapabilities.length || indicator.repaintBehavior === 'confirmed-with-delay') { issue(node, 'Choose an executable indicator with available daily data.'); return; }
      const numeric = indicator.outputs.filter((output) => output.kind === 'number');
      const output = numeric.find((item) => item.key === node.parameters?.outputKey) ?? (numeric.length === 1 ? numeric[0] : undefined);
      if (!output) { issue(node, 'Choose a numeric indicator output.'); return; }
      const parameters = { ...indicator.defaultParameters };
      for (const [key, defaultValue] of Object.entries(indicator.defaultParameters)) {
        const raw = node.parameters?.[key];
        if (raw === undefined) continue;
        if (typeof defaultValue === 'number') {
          const value = number(node, key, defaultValue);
          if (value === null || (Number.isInteger(defaultValue) && !Number.isSafeInteger(value)) || (/period|length|lookback|window/iu.test(key) && (value < 1 || value > 1000))) { issue(node, `Enter a valid ${key} for this indicator.`); return; }
          parameters[key] = value;
        } else if (typeof defaultValue === 'boolean') {
          if (raw !== 'true' && raw !== 'false') { issue(node, `Choose a valid ${key}.`); return; }
          parameters[key] = raw === 'true';
        } else if (typeof defaultValue === 'string') {
          if (raw.trim() === '') { issue(node, `Enter a valid ${key}.`); return; }
          parameters[key] = raw;
        }
      }
      inputs.push({ id, kind: 'indicator', indicatorId: indicator.id, formulaVersion: indicator.formulaVersion, outputKey: output.key, unit: output.unit, parameters });
    } else if (template === 'weighted-composite' || template === 'transform' || template === 'rolling-statistic' || template === 'math-operation') {
      if (dependencies.length < (template === 'math-operation' || template === 'weighted-composite' ? 2 : 1)) { issue(node, 'Connect the required calculation inputs.'); return; }
      if ((template === 'transform' || template === 'rolling-statistic') && dependencies.length !== 1) { issue(node, 'Connect exactly one numeric source to this calculation.'); return; }
      if (dependencies.some((dependency) => !inputs.some((input) => input.id === dependency && input.kind !== 'position-memory' && input.kind !== 'rolling-state'))) { issue(node, 'Calculations must connect to numeric data or calculations, not trade-state values.'); return; }
      const operation = template === 'weighted-composite' ? 'weighted' : template === 'math-operation' ? node.parameters?.operation ?? 'add' : template === 'transform' ? node.parameters?.method ?? 'ema' : node.parameters?.operation ?? 'mean';
      const valid = template === 'weighted-composite' || (template === 'math-operation' ? operations : template === 'transform' ? transforms : statistics).has(operation);
      if (!valid) { issue(node, 'Choose a supported calculation.'); return; }
      if (operation.startsWith('regime') && dependencies.length !== 2) { issue(node, 'Connect one value followed by one regime identifier.'); return; }
      const period = (template === 'transform' && !['absolute', 'atan', 'clamp', 'normalize'].includes(operation)) || template === 'rolling-statistic'
        ? number(node, 'period', template === 'transform' ? 3 : 20) : undefined;
      if (period === null || (period !== undefined && (!Number.isSafeInteger(period) || period < 1 || period > 1000))) { issue(node, 'Calculation period must be 1–1000 bars.'); return; }
      const minPeriod = operation === 'median' && node.parameters?.minPeriod ? number(node, 'minPeriod') : undefined;
      if (minPeriod === null || (minPeriod !== undefined && (!Number.isSafeInteger(minPeriod) || minPeriod < 1 || period === undefined || minPeriod > period))) { issue(node, 'Minimum history must be 1–period bars.'); return; }
      const lowerBound = operation === 'clamp' ? number(node, 'lowerBound', 0) : undefined;
      const upperBound = operation === 'clamp' ? number(node, 'upperBound', 100) : undefined;
      if (operation === 'clamp' && (lowerBound === null || upperBound === null || lowerBound === undefined || upperBound === undefined || lowerBound > upperBound || Math.abs(lowerBound) > 1_000_000_000 || Math.abs(upperBound) > 1_000_000_000)) { issue(node, 'Set finite lower and upper bounds in ascending order.'); return; }
      const weights = template === 'weighted-composite' ? dependencies.map((dependency) => number(node, `weight:${dependency}`, 1)) : undefined;
      if (weights?.some((weight) => weight === null) || (weights && weights.every((weight) => weight === 0))) { issue(node, 'Weights must be valid and not all zero.'); return; }
      const normalization = node.parameters?.normalization ?? 'zeroToHundred';
      if (template === 'weighted-composite' && !['zeroToHundred', 'zScore', 'minMax', 'none'].includes(normalization)) { issue(node, 'Choose a supported normalization.'); return; }
      inputs.push({ id, kind: 'calculation', operation: operation as Extract<AdvancedProgramInput, { kind: 'calculation' }>['operation'], sourceIds: dependencies, ...(period !== undefined ? { period } : {}), ...(minPeriod !== undefined ? { minPeriod } : {}), ...(weights ? { weights: weights as number[] } : {}), ...(template === 'weighted-composite' ? { normalization: normalization as 'zeroToHundred' | 'zScore' | 'minMax' | 'none' } : {}), ...(operation === 'clamp' ? { lowerBound: lowerBound as number, upperBound: upperBound as number } : {}) });
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
      const distanceMode = node.parameters?.distanceMode ?? 'absolute';
      const targetBase = node.parameters?.targetBase ?? 'entryPrice';
      const freezeAtEntry = node.parameters?.freezeAtEntry ?? 'false';
      const requireProfit = node.parameters?.requireProfit ?? 'false';
      if (!['true', 'false'].includes(requireProfit)) { issue(node, 'Choose whether this exit requires a profitable position.'); return; }
      if (!['absolute', 'percentOfEntry'].includes(distanceMode) || !['entryPrice', 'signalClose'].includes(targetBase) || !['true', 'false'].includes(freezeAtEntry)) { issue(node, 'Choose a valid target distance, reference price, and capture time.'); return; }
      if (freezeAtEntry === 'true' && inputs.some((input) => input.id === dependencies[0] && (input.kind === 'position-memory' || input.kind === 'rolling-state'))) { issue(node, 'A target captured at the buy signal needs market data, an indicator, or a calculation, not trade memory.'); return; }
      const gate = compileGate(node);
      if (gate === null) return;
      exitPolicies.push({ id, kind: 'profit-target', sourceId: dependencies[0], multiplier, ...(distanceMode !== 'absolute' ? { distanceMode: distanceMode as 'percentOfEntry' } : {}), ...(targetBase !== 'entryPrice' ? { targetBase: targetBase as 'signalClose' } : {}), ...(freezeAtEntry === 'true' ? { freezeAtEntry: true } : {}), ...(requireProfit === 'true' ? { requireProfit: true } : {}), ...(gate ? { gate } : {}) });
    } else if (template === 'trailing-exit') {
      const anchor = inputs.find((input) => input.id === dependencies[0]);
      if (dependencies.length !== 1 || anchor?.kind !== 'rolling-state' || anchor.operation !== 'maximum') { issue(node, 'Connect a maximum tracked-high block to the trailing exit.'); return; }
      const distance = number(node, 'distance', 2);
      const volatilityPeriod = number(node, 'volatilityPeriod', 14);
      if (distance === null || distance <= 0 || distance > 1000 || volatilityPeriod === null
        || !Number.isSafeInteger(volatilityPeriod) || volatilityPeriod < 1 || volatilityPeriod > 1000) {
        issue(node, 'Enter a positive ATR multiplier and a 1–1000 bar period.'); return;
      }
      const volatilitySourceId = node.parameters?.volatilitySourceId || undefined;
      if (volatilitySourceId && !inputs.some((input) => input.id === volatilitySourceId)) { issue(node, 'Choose a connected volatility value.'); return; }
      const requireProfit = node.parameters?.requireProfit ?? 'false';
      if (requireProfit !== 'true' && requireProfit !== 'false') { issue(node, 'Choose whether the stop requires a profitable position.'); return; }
      const gate = compileGate(node);
      if (gate === null) return;
      exitPolicies.push({ id, kind: 'trailing-stop', anchorId: anchor.id, distance, volatilityPeriod, ...(volatilitySourceId ? { volatilitySourceId } : {}), ...(requireProfit === 'true' ? { requireProfit: true } : {}), ...(gate ? { gate } : {}) });
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
        const compareInputId = node.parameters?.compareMode === 'series' ? node.parameters?.compareInputId : undefined;
        if (node.parameters?.compareMode === 'series' && (!compareInputId || !inputs.some((input) => input.id === compareInputId))) { issue(node, 'Choose a connected numeric comparison value.'); return; }
        const predicate: StrategyProgramPredicate = { id, inputId, operator: operator as StrategyProgramPredicate['operator'], threshold, ...(compareInputId ? { compareInputId } : {}) };
        if (node.parameters?.connector === 'and' && side.length > 0) side[side.length - 1].push(predicate);
        else side.push([predicate]);
      }
    } else {
      issue(node, 'This block does not have executable backtest semantics yet. Remove it before testing.');
    }
  };

  if (nodes.length > MAX_ADVANCED_WORKFLOW_NODES || new Set(nodes.map((node) => node.id)).size !== nodes.length) return { status: 'invalid', diagnostics: [{ message: `Workflow exceeds ${MAX_ADVANCED_WORKFLOW_NODES} unique blocks.` }] };
  for (const node of nodes) compileValue(node.id);
  if (buy.length === 0) diagnostics.push({ message: 'Add a connected buy rule.' });
  if (sell.length === 0 && exitPolicies.length === 0) diagnostics.push({ message: 'Add a connected sell rule or exit policy.' });
  if (inputs.length > MAX_ADVANCED_PROGRAM_INPUTS || buy.flat().length > 16 || sell.flat().length > 16 || exitPolicies.length > 16) diagnostics.push({ message: 'Workflow exceeds the execution limits.' });
  if (estimateAdvancedWorkPerBar(inputs) > MAX_ADVANCED_WORK_UNITS_PER_BAR) diagnostics.push({ message: 'Too many costly rolling calculations. Shorten some periods or remove a rolling block.' });
  if (diagnostics.length) return { status: 'invalid', diagnostics };
  const program: AdvancedStrategyProgram = { schemaVersion: 2, timeframe: 'D', inputs, buy, sell, ...(execution ? { execution } : {}), ...(exitPolicies.length ? { exitPolicies } : {}) };
  if (new TextEncoder().encode(JSON.stringify(program)).byteLength > MAX_ADVANCED_PROGRAM_BYTES) {
    return { status: 'invalid', diagnostics: [{ message: 'Workflow is too large to test or save. Shorten formulas or remove unused blocks.' }] };
  }
  return { status: 'ready', diagnostics: [], program };
}
