import { parse } from 'acorn';
import type { AnyNode, FunctionDeclaration, Pattern } from 'acorn';
import { initialFrame } from '../algorithms/types';
import type { Frame } from '../algorithms/types';

export const LIMITS = {
  source: 20_000,
  operations: 100_000,
  frames: 10_000,
  depth: 64,
  cells: 8_192,
  array: 256,
};
export type FailureKind = 'unsupported' | 'runtime' | 'limit';
export class CodeError extends Error {
  kind: FailureKind;
  line?: number;
  constructor(message: string, kind: FailureKind = 'runtime', line?: number) {
    super(message);
    this.kind = kind;
    this.line = line;
  }
}
type Fn = { declaration: FunctionDeclaration; environment: Environment };
type Value = number | boolean | number[] | Fn | undefined;
interface Binding {
  value: Value;
  constant: boolean;
}
class Environment {
  bindings = new Map<string, Binding>();
  parent?: Environment;
  constructor(parent?: Environment) {
    this.parent = parent;
  }
  define(name: string, value: Value, constant = false) {
    if (this.bindings.has(name))
      throw new CodeError(`“${name}” is already declared.`);
    this.bindings.set(name, { value, constant });
  }
  binding(name: string): Binding {
    const binding = this.bindings.get(name) ?? this.parent?.binding(name);
    if (!binding) throw new CodeError(`Unknown variable “${name}”.`);
    return binding;
  }
}
interface Flow {
  type: 'return' | 'break' | 'continue';
  value?: Value;
}
const syntax = new Set([
  'Program',
  'FunctionDeclaration',
  'Identifier',
  'BlockStatement',
  'VariableDeclaration',
  'VariableDeclarator',
  'Literal',
  'ArrayExpression',
  'ArrayPattern',
  'ExpressionStatement',
  'AssignmentExpression',
  'UpdateExpression',
  'BinaryExpression',
  'LogicalExpression',
  'UnaryExpression',
  'ConditionalExpression',
  'MemberExpression',
  'CallExpression',
  'IfStatement',
  'ForStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ReturnStatement',
  'BreakStatement',
  'ContinueStatement',
  'EmptyStatement',
]);
const operators = new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  '**',
  '<',
  '<=',
  '>',
  '>=',
  '===',
  '!==',
  '==',
  '!=',
  '&&',
  '||',
  '!',
  '++',
  '--',
  '=',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
]);
const properties = new Set([
  'length',
  'slice',
  'push',
  'pop',
  'floor',
  'min',
  'max',
]);
function validate(node: AnyNode) {
  const fail = (message: string): never => {
    throw new CodeError(message, 'unsupported', node.loc?.start.line);
  };
  if (!syntax.has(node.type))
    fail(`Unsupported syntax: ${node.type}. See supported syntax.`);
  if ('operator' in node && !operators.has(node.operator))
    fail(`Unsupported operator: ${node.operator}.`);
  if (
    node.type === 'Literal' &&
    typeof node.value !== 'number' &&
    typeof node.value !== 'boolean'
  )
    fail('Only numeric and boolean literals are supported.');
  if (
    node.type === 'FunctionDeclaration' &&
    (node.async ||
      node.generator ||
      node.params.some((p) => p.type !== 'Identifier'))
  )
    fail('Use named synchronous functions with plain parameters.');
  if (node.type === 'VariableDeclaration' && node.kind === 'var')
    fail('Use let or const for lexical variables.');
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    (node.property.type !== 'Identifier' || !properties.has(node.property.name))
  )
    fail(
      'Only array length/slice/push/pop and Math.floor/min/max are supported.',
    );
  if (
    (node.type === 'BreakStatement' || node.type === 'ContinueStatement') &&
    node.label
  )
    fail('Labeled control flow is unsupported.');
  for (const value of Object.values(node)) {
    if (Array.isArray(value))
      for (const child of value) {
        if (child && typeof child === 'object' && 'type' in child)
          validate(child as AnyNode);
      }
    else if (value && typeof value === 'object' && 'type' in value)
      validate(value as AnyNode);
  }
}
export interface RunResult {
  output: number[];
  correct: boolean;
  operations: number;
}
export interface RunOptions {
  emit?: (frame: Frame) => void;
  limits?: Partial<typeof LIMITS>;
}
export function runCode(
  source: string,
  input: number[],
  options: RunOptions = {},
): RunResult {
  const limits = { ...LIMITS, ...options.limits };
  if (source.length > limits.source)
    throw new CodeError('Source exceeds 20KB.', 'limit');
  if (input.length > 64 || input.some((n) => !Number.isFinite(n)))
    throw new CodeError('Input must contain at most 64 finite numbers.');
  let program;
  try {
    program = parse(source, { ecmaVersion: 2022, locations: true });
  } catch (cause) {
    const error = cause as SyntaxError & { loc?: { line: number } };
    throw new CodeError(error.message, 'unsupported', error.loc?.line);
  }
  validate(program);
  if (program.body.some((node) => node.type !== 'FunctionDeclaration'))
    throw new CodeError(
      'Only function declarations are allowed at the top level.',
      'unsupported',
    );
  const entry = program.body.find(
    (node) => node.type === 'FunctionDeclaration' && node.id?.name === 'sort',
  );
  if (
    !entry ||
    entry.type !== 'FunctionDeclaration' ||
    entry.params.length !== 1 ||
    entry.params[0].type !== 'Identifier' ||
    entry.params[0].name !== 'arr'
  )
    throw new CodeError(
      'Define function sort(arr) as the entry point.',
      'unsupported',
    );
  const root = new Environment();
  const arr = [...input];
  const state = initialFrame(input);
  let operations = 0,
    cells = input.length,
    frames = 0,
    touched = false;
  let workingArray: number[] | undefined;
  let current: AnyNode = entry;
  const stack: string[] = [];
  const count = (node: AnyNode) => {
    current = node;
    if (++operations > limits.operations)
      throw new CodeError(
        'Operation budget exceeded. Check loop conditions.',
        'limit',
        node.loc?.start.line,
      );
  };
  const number = (value: Value): number => {
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new CodeError('Expected a finite number.');
    return value;
  };
  const allocate = (values: number[]): number[] => {
    cells += values.length;
    if (values.length > limits.array || cells > limits.cells)
      throw new CodeError('Array allocation limit exceeded.', 'limit');
    return values;
  };
  const display = (value: Value): string =>
    Array.isArray(value)
      ? `[${value.slice(0, 16).join(', ')}${value.length > 16 ? ', …' : ''}]`
      : typeof value === 'object'
        ? '[function]'
        : String(value);
  const snapshot = (
    node: AnyNode,
    env: Environment,
    description: string,
    operation: Frame['operation'] = 'execute',
  ) => {
    if (++frames > limits.frames)
      throw new CodeError(
        'Trace frame limit exceeded.',
        'limit',
        node.loc?.start.line,
      );
    if (!options.emit) return;
    const variables: Record<string, string> = {};
    for (let scope: Environment | undefined = env; scope; scope = scope.parent)
      for (const [name, binding] of scope.bindings)
        if (
          !(name in variables) &&
          (typeof binding.value !== 'object' || Array.isArray(binding.value))
        )
          variables[name] = display(binding.value);
    if (workingArray && workingArray !== arr)
      state.buffer = {
        label: 'Working temporary array',
        values: [...workingArray],
      };
    else delete state.buffer;
    state.source = {
      line: node.loc?.start.line ?? 1,
      column: node.loc?.start.column ?? 0,
    };
    state.items = arr.map((value, i) => ({ id: `code-${i}`, value }));
    state.description = description;
    state.operation = operation;
    state.variables = variables;
    state.stack = [...stack];
    options.emit(structuredClone(state));
    state.active = [];
  };
  const property = (
    node: AnyNode,
    env: Environment,
  ): { array: number[]; index: number } => {
    if (node.type !== 'MemberExpression' || !node.computed)
      throw new CodeError('Only numeric array positions can be assigned.');
    const array = evaluate(node.object, env);
    if (!Array.isArray(array))
      throw new CodeError('Indexed access requires a numeric array.');
    const index = number(evaluate(node.property, env));
    if (!Number.isInteger(index) || index < 0 || index >= array.length)
      throw new CodeError(`Array index ${index} is out of bounds.`);
    if (array === arr) {
      touched = true;
      state.active.push(index);
    }
    return { array, index };
  };
  const assign = (node: AnyNode, value: Value, env: Environment) => {
    if (node.type === 'Identifier') {
      const binding = env.binding(node.name);
      if (binding.constant)
        throw new CodeError(`Cannot reassign const “${node.name}”.`);
      binding.value = value;
    } else if (node.type === 'ArrayPattern') {
      if (!Array.isArray(value) || value.length !== node.elements.length)
        throw new CodeError(
          'Swap destructuring requires matching numeric arrays.',
        );
      node.elements.forEach((element, i) => {
        if (!element)
          throw new CodeError('Empty destructuring positions are unsupported.');
        assign(element, value[i], env);
      });
    } else {
      const { array, index } = property(node, env);
      array[index] = number(value);
      workingArray = array;
      state.writes++;
    }
  };
  const binary = (operator: string, left: Value, right: Value): Value => {
    switch (operator) {
      case '===':
      case '==':
        return left === right;
      case '!==':
      case '!=':
        return left !== right;
      case '<':
        return number(left) < number(right);
      case '<=':
        return number(left) <= number(right);
      case '>':
        return number(left) > number(right);
      case '>=':
        return number(left) >= number(right);
      case '+':
        return number(left) + number(right);
      case '-':
        return number(left) - number(right);
      case '*':
        return number(left) * number(right);
      case '/':
        return number(left) / number(right);
      case '%':
        return number(left) % number(right);
      case '**':
        return number(left) ** number(right);
      default:
        throw new CodeError(`Unsupported operator ${operator}.`, 'unsupported');
    }
  };
  const call = (fn: Fn, args: Value[]): Value => {
    if (stack.length >= limits.depth)
      throw new CodeError('Call stack limit exceeded.', 'limit');
    if (args.length !== fn.declaration.params.length)
      throw new CodeError('Function argument count does not match parameters.');
    const env = new Environment(fn.environment);
    fn.declaration.params.forEach((param, i) => {
      env.define((param as { name: string }).name, args[i]);
    });
    stack.push(`${fn.declaration.id?.name}(${args.map(display).join(', ')})`);
    snapshot(fn.declaration, env, `Enter ${fn.declaration.id?.name}.`, 'call');
    const flow = execute(fn.declaration.body, env);
    snapshot(
      fn.declaration,
      env,
      `Return ${display(flow?.value)} from ${fn.declaration.id?.name}.`,
      'return',
    );
    stack.pop();
    return flow?.value;
  };
  const evaluate = (node: AnyNode, env: Environment): Value => {
    count(node);
    switch (node.type) {
      case 'Literal':
        return node.value as number | boolean;
      case 'Identifier':
        return node.name === 'undefined'
          ? undefined
          : env.binding(node.name).value;
      case 'ArrayExpression':
        return allocate(
          node.elements.map((element) => {
            if (!element) throw new CodeError('Array holes are unsupported.');
            return number(evaluate(element, env));
          }),
        );
      case 'MemberExpression': {
        if (node.computed) {
          const { array, index } = property(node, env);
          return array[index];
        }
        const array = evaluate(node.object, env);
        if (
          !Array.isArray(array) ||
          node.property.type !== 'Identifier' ||
          node.property.name !== 'length'
        )
          throw new CodeError(
            'Only array.length is readable as a named property.',
          );
        if (array === arr) touched = true;
        return array.length;
      }
      case 'BinaryExpression': {
        const value = binary(
          node.operator,
          evaluate(node.left, env),
          evaluate(node.right, env),
        );
        if (
          ['<', '<=', '>', '>=', '==', '===', '!=', '!=='].includes(
            node.operator,
          )
        )
          state.comparisons++;
        return value;
      }
      case 'LogicalExpression': {
        const left = evaluate(node.left, env);
        return node.operator === '&&'
          ? left
            ? evaluate(node.right, env)
            : left
          : left || evaluate(node.right, env);
      }
      case 'UnaryExpression': {
        const value = evaluate(node.argument, env);
        return node.operator === '!'
          ? !value
          : node.operator === '-'
            ? -number(value)
            : number(value);
      }
      case 'ConditionalExpression':
        return evaluate(
          evaluate(node.test, env) ? node.consequent : node.alternate,
          env,
        );
      case 'AssignmentExpression': {
        const right = evaluate(node.right, env);
        const value =
          node.operator === '='
            ? right
            : binary(
                node.operator.slice(0, -1),
                evaluate(node.left, env),
                right,
              );
        assign(node.left, value, env);
        return value;
      }
      case 'UpdateExpression': {
        const old = number(evaluate(node.argument, env));
        const value = old + (node.operator === '++' ? 1 : -1);
        assign(node.argument, value, env);
        return node.prefix ? value : old;
      }
      case 'CallExpression': {
        const args = node.arguments.map((arg) => evaluate(arg, env));
        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier'
        ) {
          const name = node.callee.property.name;
          if (
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'Math'
          ) {
            const numbers = args.map(number);
            if (name === 'floor' && numbers.length === 1)
              return Math.floor(numbers[0]);
            if (name === 'min' && numbers.length) return Math.min(...numbers);
            if (name === 'max' && numbers.length) return Math.max(...numbers);
            throw new CodeError(
              'Use Math.floor(value), Math.min(a, b), or Math.max(a, b).',
            );
          }
          const array = evaluate(node.callee.object, env);
          if (!Array.isArray(array))
            throw new CodeError('Array method requires a numeric array.');
          if (array === arr) touched = true;
          if (name === 'slice' && args.length <= 2)
            return allocate(array.slice(...args.map(number)));
          if (name === 'pop' && !args.length) {
            workingArray = array;
            state.writes++;
            return array.pop();
          }
          if (name === 'push') {
            const numbers = args.map(number);
            cells += numbers.length;
            if (
              array.length + numbers.length > limits.array ||
              cells > limits.cells
            )
              throw new CodeError('Array allocation limit exceeded.', 'limit');
            workingArray = array;
            state.writes += numbers.length;
            return array.push(...numbers);
          }
          throw new CodeError(
            `Unsupported array operation ${name}.`,
            'unsupported',
          );
        }
        const fn = evaluate(node.callee, env);
        if (!fn || typeof fn !== 'object' || Array.isArray(fn))
          throw new CodeError('Call a declared function.');
        return call(fn, args);
      }
      default:
        throw new CodeError(
          `Unsupported expression ${node.type}.`,
          'unsupported',
          node.loc?.start.line,
        );
    }
  };
  const declare = (
    pattern: Pattern,
    value: Value,
    constant: boolean,
    env: Environment,
  ) => {
    if (pattern.type !== 'Identifier')
      throw new CodeError(
        'Variable declarations require a plain name. Use destructuring only for swaps.',
        'unsupported',
      );
    env.define(pattern.name, value, constant);
  };
  const test = (node: AnyNode, env: Environment): boolean => {
    const value = Boolean(evaluate(node, env));
    snapshot(node, env, `Condition evaluates to ${value}.`, 'compare');
    return value;
  };
  const execute = (node: AnyNode, env: Environment): Flow | undefined => {
    count(node);
    switch (node.type) {
      case 'BlockStatement': {
        const block = new Environment(env);
        for (const child of node.body)
          if (child.type === 'FunctionDeclaration' && child.id)
            block.define(
              child.id.name,
              { declaration: child, environment: block },
              true,
            );
        for (const child of node.body) {
          const flow = execute(child, block);
          if (flow) return flow;
        }
        return;
      }
      case 'FunctionDeclaration':
      case 'EmptyStatement':
        return;
      case 'VariableDeclaration':
        for (const declaration of node.declarations)
          declare(
            declaration.id,
            declaration.init ? evaluate(declaration.init, env) : undefined,
            node.kind === 'const',
            env,
          );
        snapshot(node, env, 'Initialize local variables.');
        return;
      case 'ExpressionStatement': {
        const before = state.writes;
        evaluate(node.expression, env);
        snapshot(
          node,
          env,
          state.writes > before ? 'Write array values.' : 'Execute statement.',
          state.writes > before ? 'write' : 'execute',
        );
        return;
      }
      case 'IfStatement':
        return test(node.test, env)
          ? execute(node.consequent, env)
          : node.alternate
            ? execute(node.alternate, env)
            : undefined;
      case 'ForStatement': {
        const loop = new Environment(env);
        if (node.init) {
          if (node.init.type === 'VariableDeclaration')
            execute(node.init, loop);
          else evaluate(node.init, loop);
        }
        while (!node.test || test(node.test, loop)) {
          count(node);
          const flow = execute(node.body, loop);
          if (flow?.type === 'return') return flow;
          if (flow?.type === 'break') break;
          if (node.update) {
            evaluate(node.update, loop);
            snapshot(node.update, loop, 'Advance loop variables.');
          }
        }
        return;
      }
      case 'WhileStatement':
      case 'DoWhileStatement': {
        let first = node.type === 'DoWhileStatement';
        while (first || test(node.test, env)) {
          first = false;
          count(node);
          const flow = execute(node.body, env);
          if (flow?.type === 'return') return flow;
          if (flow?.type === 'break') break;
        }
        return;
      }
      case 'ReturnStatement': {
        const value = node.argument ? evaluate(node.argument, env) : undefined;
        snapshot(node, env, `Return ${display(value)}.`, 'return');
        return { type: 'return', value };
      }
      case 'BreakStatement':
        return { type: 'break' };
      case 'ContinueStatement':
        return { type: 'continue' };
      default:
        throw new CodeError(
          `Unsupported statement ${node.type}.`,
          'unsupported',
          node.loc?.start.line,
        );
    }
  };
  try {
    for (const fn of program.body)
      if (fn.type === 'FunctionDeclaration' && fn.id)
        root.define(fn.id.name, { declaration: fn, environment: root }, true);
    const returned = call(root.binding('sort').value as Fn, [arr]);
    if (!touched)
      throw new CodeError(
        'This program never inspects or modifies the input array.',
        'unsupported',
      );
    const output = returned === undefined ? arr : returned;
    if (
      !Array.isArray(output) ||
      output.some((n) => typeof n !== 'number' || !Number.isFinite(n))
    )
      throw new CodeError(
        'sort(arr) must return a numeric array, or mutate arr and return nothing.',
      );
    const expected = [...input].sort((a, b) => a - b);
    const correct =
      output.length === input.length &&
      output.every((value, i) => value === expected[i]);
    state.items = output.map((value, i) => ({ id: `result-${i}`, value }));
    state.active = [];
    state.finalized = correct ? output.map((_, i) => i) : [];
    state.operation = 'done';
    state.description = correct
      ? 'Sorted correctly for this input. Passing an example is not a proof.'
      : 'Incorrect result: output must be ascending and preserve every input value. Inspect the trace to debug.';
    if (options.emit) options.emit(structuredClone(state));
    return { output: [...output], correct, operations };
  } catch (cause) {
    if (cause instanceof CodeError) {
      cause.line ??= current.loc?.start.line;
      throw cause;
    }
    throw new CodeError(
      cause instanceof Error ? cause.message : 'Execution failed.',
      'runtime',
      current.loc?.start.line,
    );
  }
}
