export interface FormulaRegister { readonly key: string; readonly expression: string }
export interface FormulaDefinition {
  readonly sourceIds: readonly string[];
  readonly aliases: readonly string[];
  readonly registers: readonly FormulaRegister[];
  readonly outputKey: string;
}
type Value = number | null;
type Node = { kind: 'number'; value: number } | { kind: 'name'; name: string }
  | { kind: 'unary'; operator: string; value: Node }
  | { kind: 'binary'; operator: string; left: Node; right: Node }
  | { kind: 'conditional'; condition: Node; yes: Node; no: Node }
  | { kind: 'call'; name: string; args: Node[] };
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const WINDOWS = new Set(['sma', 'sum', 'highest', 'lowest', 'stdev', 'median', 'rank']);
const FUNCTIONS: Readonly<Record<string, readonly [number, number]>> = {
  abs: [1, 1], sqrt: [1, 1], log: [1, 1], exp: [1, 1], sin: [1, 1], cos: [1, 1], tanh: [1, 1], atan: [1, 1],
  floor: [1, 1], ceil: [1, 1], pow: [2, 2], min: [2, 16], max: [2, 16], clamp: [3, 3], round: [1, 2],
  coalesce: [2, 16], isValid: [1, 1], if: [3, 3], prev: [1, 2], lag: [2, 2],
  sma: [2, 3], sum: [2, 3], highest: [2, 3], lowest: [2, 3], stdev: [2, 3], median: [2, 3], rank: [2, 3],
};
const PRECEDENCE: Readonly<Record<string, number>> = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6, '**': 7 };

function parse(expression: string): Node {
  if (!expression.trim() || expression.length > 2048) throw new Error('Use a formula of 1–2048 characters.');
  const tokens: string[] = [];
  let position = 0;
  while (position < expression.length) {
    const rest = expression.slice(position);
    const match = /^(\s+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z][A-Za-z0-9_]*|\*\*|&&|\|\||==|!=|<=|>=|[+\-*/%<>()!?:,])/u.exec(rest);
    if (!match) throw new Error(`Unsupported symbol at character ${position + 1}.`);
    position += match[0].length;
    if (!/^\s/u.test(match[0])) tokens.push(match[0]);
  }
  let cursor = 0;
  let count = 0;
  let depth = 0;
  const node = <T extends Node>(value: T): T => { if (++count > 512) throw new Error('Formula is too complex.'); return value; };
  const take = (expected: string) => { if (tokens[cursor++] !== expected) throw new Error(`Expected ${expected}.`); };
  const expressionAt = (minimum = 0): Node => {
    if (++depth > 40) throw new Error('Formula nesting is too deep.');
    let left: Node;
    const token = tokens[cursor++];
    if (!token) throw new Error('Formula is incomplete.');
    if (token === '(') { left = expressionAt(); take(')'); }
    else if (['-', '+', '!'].includes(token)) left = node({ kind: 'unary', operator: token, value: expressionAt(8) });
    else if (/^(?:\d|\.)/u.test(token)) {
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error('Use finite numbers.');
      left = node({ kind: 'number', value });
    } else if (IDENTIFIER.test(token)) {
      if (token === 'null') left = node({ kind: 'name', name: 'null' });
      else if (tokens[cursor] === '(') {
        cursor += 1;
        const args: Node[] = [];
        if (tokens[cursor] !== ')') {
          do { args.push(expressionAt()); if (tokens[cursor] !== ',') break; cursor += 1; } while (true);
        }
        take(')');
        left = node({ kind: 'call', name: token, args });
      } else left = node({ kind: 'name', name: token });
    } else throw new Error('Expected a number, input, or function.');
    while (cursor < tokens.length) {
      const operator = tokens[cursor];
      const precedence = Object.hasOwn(PRECEDENCE, operator) ? PRECEDENCE[operator] : undefined;
      if (precedence === undefined || precedence < minimum) break;
      cursor += 1;
      const right = expressionAt(precedence + (operator === '**' ? 0 : 1));
      left = node({ kind: 'binary', operator, left, right });
    }
    if (minimum === 0 && tokens[cursor] === '?') {
      cursor += 1;
      const yes = expressionAt(); take(':');
      left = node({ kind: 'conditional', condition: left, yes, no: expressionAt() });
    }
    depth -= 1;
    return left;
  };
  const root = expressionAt();
  if (cursor !== tokens.length) throw new Error(`Unexpected ${tokens[cursor]}.`);
  return root;
}

export interface CompiledFormula { readonly registers: readonly { key: string; tree: Node }[]; readonly cost: number }
export function compileFormula(definition: FormulaDefinition): CompiledFormula {
  if (!Array.isArray(definition.sourceIds) || !Array.isArray(definition.aliases) || definition.sourceIds.length !== definition.aliases.length
    || definition.aliases.length > 16 || new Set(definition.aliases).size !== definition.aliases.length
    || !definition.sourceIds.every((id) => typeof id === 'string' && id.length > 0)
    || new Set(definition.sourceIds).size !== definition.sourceIds.length
    || !definition.aliases.every((alias) => typeof alias === 'string' && IDENTIFIER.test(alias) && !['bar', 'null'].includes(alias))
    || !Array.isArray(definition.registers) || definition.registers.length < 1 || definition.registers.length > 24
    || !definition.registers.every((register) => register && typeof register.key === 'string' && IDENTIFIER.test(register.key) && typeof register.expression === 'string')
    || new Set(definition.registers.map((register) => register.key)).size !== definition.registers.length
    || !definition.registers.some((register) => register.key === definition.outputKey)) throw new Error('Choose unique inputs, calculation names, and a valid output.');
  const names = new Set([...definition.aliases, 'bar', 'null']);
  const all = new Set([...names, ...definition.registers.map((register) => register.key)]);
  if (all.size !== names.size + definition.registers.length) throw new Error('Calculation names must differ from input names.');
  let cost = 0;
  const validate = (tree: Node): void => {
    cost += 1;
    if (cost > 12_000) throw new Error('Calculation exceeds the per-bar work limit.');
    if (tree.kind === 'number') return;
    if (tree.kind === 'name') { if (!names.has(tree.name)) throw new Error(`Unknown or forward reference: ${tree.name}.`); return; }
    if (tree.kind === 'unary') { validate(tree.value); return; }
    if (tree.kind === 'binary') { validate(tree.left); validate(tree.right); return; }
    if (tree.kind === 'conditional') { validate(tree.condition); validate(tree.yes); validate(tree.no); return; }
    const arity = Object.hasOwn(FUNCTIONS, tree.name) ? FUNCTIONS[tree.name] : undefined;
    if (!arity || tree.args.length < arity[0] || tree.args.length > arity[1]) throw new Error(`Invalid function or argument count: ${tree.name}.`);
    if (tree.name === 'prev' || tree.name === 'lag' || WINDOWS.has(tree.name)) {
      const source = tree.args[0];
      if (source.kind !== 'name' || !all.has(source.name) || ['null', 'bar'].includes(source.name)) throw new Error('History functions need an input or calculation name.');
      if (tree.name === 'prev') { if (tree.args[1]) validate(tree.args[1]); return; }
      const period = tree.args[1];
      if (period.kind !== 'number' || !Number.isSafeInteger(period.value) || period.value < (tree.name === 'lag' ? 0 : 1) || period.value > 1000) throw new Error('History length must be a fixed 0–1000 bars. Future offsets are unavailable.');
      if (!(tree.name === 'lag' && period.value > 0) && !names.has(source.name)) throw new Error('Rolling windows need an earlier calculation or input.');
      const minimum = tree.args[2];
      if (minimum && (minimum.kind !== 'number' || !Number.isSafeInteger(minimum.value) || minimum.value < 1 || minimum.value > period.value)) throw new Error('Minimum history must be within the window length.');
      if (WINDOWS.has(tree.name)) cost += period.value * (tree.name === 'median' ? Math.ceil(Math.log2(period.value + 1)) : 1);
      return;
    }
    tree.args.forEach(validate);
  };
  const registers = definition.registers.map((register) => {
    const tree = parse(register.expression);
    validate(tree);
    names.add(register.key);
    return { key: register.key, tree };
  });
  if (cost > 12_000) throw new Error('Calculation exceeds the per-bar work limit.');
  return { registers, cost };
}

const finite = (value: number): Value => Number.isFinite(value) ? value : null;
const truth = (value: Value) => value !== null && value !== 0;
export function evaluateFormula(definition: FormulaDefinition, compiled: CompiledFormula, sources: readonly (readonly Value[])[], length: number): ReadonlyMap<string, Value[]> {
  const series = new Map<string, readonly Value[]>(definition.aliases.map((alias, index) => [alias, sources[index]]));
  const output = new Map<string, Value[]>(definition.registers.map((register) => [register.key, []]));
  output.forEach((values, key) => series.set(key, values));
  const evaluate = (tree: Node, index: number): Value => {
    if (tree.kind === 'number') return tree.value;
    if (tree.kind === 'name') return tree.name === 'bar' ? index : tree.name === 'null' ? null : series.get(tree.name)?.[index] ?? null;
    if (tree.kind === 'conditional') return evaluate(truth(evaluate(tree.condition, index)) ? tree.yes : tree.no, index);
    if (tree.kind === 'unary') { const value = evaluate(tree.value, index); return tree.operator === '!' ? Number(!truth(value)) : value === null ? null : tree.operator === '-' ? -value : value; }
    if (tree.kind === 'binary') {
      const left = evaluate(tree.left, index);
      if (tree.operator === '&&') return Number(truth(left) && truth(evaluate(tree.right, index)));
      if (tree.operator === '||') return Number(truth(left) || truth(evaluate(tree.right, index)));
      const right = evaluate(tree.right, index);
      if (left === null || right === null) return ['==', '!=', '<', '<=', '>', '>='].includes(tree.operator) ? 0 : null;
      switch (tree.operator) {
        case '+': return finite(left + right); case '-': return finite(left - right); case '*': return finite(left * right);
        case '/': return right === 0 ? null : finite(left / right); case '%': return right === 0 ? null : finite(left % right); case '**': return finite(left ** right);
        case '==': return Number(left === right); case '!=': return Number(left !== right); case '<': return Number(left < right); case '<=': return Number(left <= right); case '>': return Number(left > right); case '>=': return Number(left >= right);
      }
      return null;
    }
    const { name, args } = tree;
    if (name === 'if') return evaluate(truth(evaluate(args[0], index)) ? args[1] : args[2], index);
    if (name === 'coalesce') { for (const arg of args) { const value = evaluate(arg, index); if (value !== null) return value; } return null; }
    if (name === 'isValid') return Number(evaluate(args[0], index) !== null);
    if (name === 'prev' || name === 'lag' || WINDOWS.has(name)) {
      const values = series.get((args[0] as Extract<Node, { kind: 'name' }>).name)!;
      if (name === 'prev') return values[index - 1] ?? (args[1] ? evaluate(args[1], index) : null);
      const period = (args[1] as Extract<Node, { kind: 'number' }>).value;
      if (name === 'lag') return values[index - period] ?? null;
      const minimum = args[2] ? (args[2] as Extract<Node, { kind: 'number' }>).value : period;
      const samples = values.slice(Math.max(0, index - period + 1), index + 1).filter((value): value is number => value !== null && Number.isFinite(value));
      if (samples.length < minimum) return null;
      if (name === 'highest') return Math.max(...samples);
      if (name === 'lowest') return Math.min(...samples);
      if (name === 'sum') return finite(samples.reduce((total, value) => total + value, 0));
      const mean = samples.reduce((total, value) => total + value, 0) / samples.length;
      if (name === 'sma') return finite(mean);
      if (name === 'stdev') return finite(Math.sqrt(samples.reduce((total, value) => total + (value - mean) ** 2, 0) / samples.length));
      if (name === 'rank') { const value = values[index]; return value === null || value === undefined ? null : (samples.filter((item) => item < value).length + samples.filter((item) => item === value).length / 2) / samples.length * 100; }
      const sorted = samples.sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    }
    const values = args.map((arg) => evaluate(arg, index));
    if (values.some((value) => value === null)) return null;
    const numbers = values as number[];
    switch (name) {
      case 'abs': return Math.abs(numbers[0]); case 'sqrt': return finite(Math.sqrt(numbers[0])); case 'log': return finite(Math.log(numbers[0]));
      case 'exp': return finite(Math.exp(numbers[0])); case 'sin': return Math.sin(numbers[0]); case 'cos': return Math.cos(numbers[0]); case 'tanh': return Math.tanh(numbers[0]); case 'atan': return Math.atan(numbers[0]);
      case 'floor': return Math.floor(numbers[0]); case 'ceil': return Math.ceil(numbers[0]); case 'pow': return finite(numbers[0] ** numbers[1]);
      case 'min': return Math.min(...numbers); case 'max': return Math.max(...numbers); case 'clamp': return Math.min(numbers[2], Math.max(numbers[1], numbers[0]));
      case 'round': { const digits = numbers[1] ?? 0; return Number.isSafeInteger(digits) && digits >= 0 && digits <= 8 ? Number(numbers[0].toFixed(digits)) : null; }
    }
    return null;
  };
  for (let index = 0; index < length; index += 1) for (const register of compiled.registers) output.get(register.key)!.push(evaluate(register.tree, index));
  return output;
}
