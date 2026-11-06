import { useReducer, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { algorithms } from '../features/algorithms/registry';
import {
  parseArray,
  parseScalar,
  randomValues,
} from '../features/algorithms/input';
import { initialFrame } from '../features/algorithms/types';
import type { Algorithm, Category, Frame } from '../features/algorithms/types';
import {
  createPlayback,
  playbackGroupReducer,
} from '../features/playback/model';
import type { Action } from '../features/playback/model';
import { PlaybackControls } from '../features/playback/PlaybackControls';
import { PlaybackTicker } from '../features/playback/PlaybackTicker';
import { ArrayView } from '../features/visualizations/ArrayView';
import type { ElementStyle } from '../features/visualizations/ArrayView';
import { RecursionView } from '../features/visualizations/RecursionView';
import {
  InfoTooltip,
  Legend,
  VisualizationStage,
} from '../features/visualizations/Stage';
import {
  arrayLegend,
  recursionLegend,
} from '../features/visualizations/legends';
import { Inspector } from '../features/visualizations/Inspector';
import { Canvas } from '../shared/Canvas';
import type { FlowEdge, FlowNode } from '../shared/Canvas';
import { Icon } from '../shared/Icon';
import type { CanvasSettings, FocusRequest } from '../shared/canvasSettings';
import { AddNodes } from './AddNodes';
import { Disconnected, SourceSelect } from './NodeParts';
import { instanceTitle, nextInstance, nodeKinds } from './graph';
import type { GraphNode, NodeKind } from './graph';

interface InputState {
  text: string;
  target: string;
  error: string;
  frames: Frame[];
}

const first = algorithms[0];
const initialFrames = first.run(parseArray(first.example));
const DEFAULT_TARGET = '24';
const findAlgorithm = (id: string | undefined) =>
  algorithms.find((a) => a.id === id) ?? first;
const playable = (frames: Frame[] | undefined) =>
  frames?.length ? frames : [initialFrame()];

function trace(algorithm: Algorithm, text: string, targetText: string) {
  const values =
    algorithm.category === 'Recursion'
      ? [
          parseScalar(
            text,
            algorithm.id === 'hanoi' ? 1 : 0,
            algorithm.id === 'fibonacci'
              ? 8
              : algorithm.id === 'factorial'
                ? 10
                : 5,
          ),
        ]
      : parseArray(text);
  const target =
    algorithm.category === 'Searching'
      ? parseScalar(targetText, -999, 999)
      : undefined;
  return algorithm.run(values, target);
}

const initialGraph: GraphNode[] = [
  { id: 'algorithm-1', kind: 'algorithm', n: 1, source: null },
  { id: 'input-1', kind: 'input', n: 1, source: 'algorithm-1' },
  { id: 'visualization-1', kind: 'visualization', n: 1, source: 'input-1' },
  { id: 'inspector-1', kind: 'inspector', n: 1, source: 'visualization-1' },
];
const initialPositions: Record<string, { x: number; y: number }> = {
  'algorithm-1': { x: 0, y: 0 },
  'input-1': { x: 410, y: 0 },
  'visualization-1': { x: 850, y: 0 },
  'inspector-1': { x: 1730, y: 0 },
};

export function Explore({
  settings,
  panel,
}: {
  settings?: CanvasSettings;
  panel?: HTMLElement | null;
}) {
  const [graph, setGraph] = useState(initialGraph);
  const [algos, setAlgos] = useState<Record<string, string>>({
    'algorithm-1': first.id,
  });
  const [inputs, setInputs] = useState<Record<string, InputState>>({
    'input-1': {
      text: first.example,
      target: DEFAULT_TARGET,
      error: '',
      frames: initialFrames,
    },
  });
  const [styles, setStyles] = useState<Record<string, ElementStyle>>({});
  const [playbacks, dispatchGroup] = useReducer(
    playbackGroupReducer,
    undefined,
    () => ({ 'visualization-1': createPlayback(initialFrames) }),
  );
  const [leaving, setLeaving] = useState<string[]>([]);
  const [focus, setFocus] = useState<FocusRequest>();
  const seq = useRef(1);

  const live = graph.filter((node) => !leaving.includes(node.id));
  const nodeById = (id: string | null) =>
    id ? graph.find((node) => node.id === id) : undefined;
  const countOf = (kind: NodeKind) =>
    live.filter((node) => node.kind === kind).length;
  const consumers = (id: string) =>
    graph.filter((node) => node.source === id);
  const algorithmForInput = (inputId: string | null) => {
    const source = nodeById(inputId)?.source;
    return source && algos[source] ? findAlgorithm(algos[source]) : undefined;
  };
  const vizIdsFor = (inputId: string) =>
    consumers(inputId)
      .filter((node) => node.kind === 'visualization')
      .map((node) => node.id);
  const optionsFor = (kind: NodeKind) => {
    const parent = nodeKinds[kind].parent;
    return live
      .filter((node) => node.kind === parent)
      .map((node) => ({ id: node.id, label: instanceTitle(node.kind, node.n) }));
  };

  const apply = (
    inputId: string,
    algorithm: Algorithm,
    text: string,
    target: string,
  ) => {
    try {
      const frames = trace(algorithm, text, target);
      setInputs((s) => ({
        ...s,
        [inputId]: { text, target, error: '', frames },
      }));
      const ids = vizIdsFor(inputId);
      if (ids.length)
        dispatchGroup({ type: 'each', ids, action: { type: 'load', frames } });
    } catch (cause) {
      setInputs((s) => ({
        ...s,
        [inputId]: {
          frames: s[inputId]?.frames ?? [],
          text,
          target,
          error: cause instanceof Error ? cause.message : 'Invalid input.',
        },
      }));
    }
  };
  const editInput = (inputId: string, patch: Partial<InputState>) => {
    const ready = (frame: Frame): Frame => ({
      ...frame,
      operation: 'ready',
      description: 'Input changed. Choose “Apply input” to generate a new trace.',
      active: [],
      finalized: [],
    });
    setInputs((s) => ({
      ...s,
      [inputId]: {
        ...s[inputId],
        ...patch,
        error: '',
        frames: [ready(playable(s[inputId]?.frames)[0])],
      },
    }));
    for (const id of vizIdsFor(inputId)) {
      const p = playbacks[id];
      const frame = p?.frames[p.index];
      if (frame)
        dispatchGroup({
          type: 'to',
          id,
          action: { type: 'load', frames: [ready(frame)] },
        });
    }
  };
  const chooseAlgorithm = (algorithmNode: string, algorithm: Algorithm) => {
    setAlgos((s) => ({ ...s, [algorithmNode]: algorithm.id }));
    for (const node of consumers(algorithmNode))
      if (node.kind === 'input')
        apply(
          node.id,
          algorithm,
          algorithm.example,
          inputs[node.id]?.target ?? DEFAULT_TARGET,
        );
  };

  const spawn = (
    kind: NodeKind,
    source: string | null,
    pending: GraphNode[],
    context: { algorithm?: Algorithm; frames?: Frame[] },
  ): GraphNode => {
    const node: GraphNode = {
      id: `${kind}-${++seq.current}`,
      kind,
      n: nextInstance([...graph, ...pending], kind),
      source,
    };
    if (kind === 'algorithm') {
      const used = new Set(Object.values(algos));
      const algorithm =
        algorithms.find((a) => a.category === 'Sorting' && !used.has(a.id)) ??
        first;
      setAlgos((s) => ({ ...s, [node.id]: algorithm.id }));
      context.algorithm = algorithm;
    } else if (kind === 'input') {
      const algorithm =
        context.algorithm ?? (source ? findAlgorithm(algos[source]) : undefined);
      const frames = algorithm
        ? trace(algorithm, algorithm.example, DEFAULT_TARGET)
        : [];
      setInputs((s) => ({
        ...s,
        [node.id]: {
          text: algorithm?.example ?? '',
          target: DEFAULT_TARGET,
          error: '',
          frames,
        },
      }));
      context.frames = frames;
    } else if (kind === 'visualization') {
      dispatchGroup({
        type: 'add',
        id: node.id,
        frames: playable(
          context.frames ?? (source ? inputs[source]?.frames : undefined),
        ),
      });
    }
    return node;
  };
  const add = (kind: NodeKind) => {
    const parent = nodeKinds[kind].parent;
    const source = parent
      ? ([...live].reverse().find((node) => node.kind === parent)?.id ?? null)
      : null;
    const node = spawn(kind, source, [], {});
    setGraph((g) => [...g, node]);
    setFocus({ ids: [node.id], n: seq.current });
  };
  const addPipeline = () => {
    const pending: GraphNode[] = [];
    const context = {};
    let source: string | null = null;
    for (const kind of [
      'algorithm',
      'input',
      'visualization',
      'inspector',
    ] as NodeKind[]) {
      const node = spawn(kind, source, pending, context);
      pending.push(node);
      source = node.id;
    }
    setGraph((g) => [...g, ...pending]);
    setFocus({ ids: pending.map((node) => node.id), n: seq.current });
  };
  const remove = (id: string) => {
    const node = nodeById(id);
    if (!node || countOf(node.kind) <= 1) return;
    setLeaving((l) => [...l, id]);
    // Let the exit animation finish before unmounting.
    window.setTimeout(() => {
      setGraph((g) =>
        g
          .filter((n) => n.id !== id)
          .map((n) => (n.source === id ? { ...n, source: null } : n)),
      );
      setLeaving((l) => l.filter((x) => x !== id));
      if (node.kind === 'visualization') dispatchGroup({ type: 'remove', id });
    }, 200);
  };
  const reconnect = (node: GraphNode, source: string | null) => {
    setGraph((g) => g.map((n) => (n.id === node.id ? { ...n, source } : n)));
    if (node.kind === 'input' && source) {
      const algorithm = findAlgorithm(algos[source]);
      apply(
        node.id,
        algorithm,
        algorithm.example,
        inputs[node.id]?.target ?? DEFAULT_TARGET,
      );
    } else if (node.kind === 'visualization') {
      dispatchGroup({
        type: 'to',
        id: node.id,
        action: {
          type: 'load',
          frames: playable(source ? inputs[source]?.frames : undefined),
        },
      });
    }
  };

  const renderAlgorithm = (node: GraphNode, title: string) => {
    const selected = algos[node.id];
    return (
      <nav className="algorithm-browser" aria-label={title}>
        {(['Sorting', 'Searching', 'Recursion'] as Category[]).map(
          (category) => (
            <section key={category}>
              <h3>{category}</h3>
              {algorithms
                .filter((a) => a.category === category)
                .map((a) => (
                  <button
                    key={a.id}
                    aria-label={a.name}
                    onClick={() => chooseAlgorithm(node.id, a)}
                    aria-current={selected === a.id ? 'true' : undefined}
                  >
                    <span className="algo-radio" aria-hidden="true" />
                    <span className="algo-name">{a.name}</span>
                    <span className="algorithm-cost mono">{a.time}</span>
                  </button>
                ))}
            </section>
          ),
        )}
      </nav>
    );
  };

  const renderInput = (node: GraphNode, title: string) => {
    const state = inputs[node.id];
    const algorithm = algorithmForInput(node.id);
    const source = (
      <SourceSelect
        owner={title}
        label="Algorithm"
        value={node.source}
        options={optionsFor('input')}
        onChange={(id) => reconnect(node, id)}
      />
    );
    if (!algorithm || !state)
      return (
        <div className="input-section">
          {source}
          <Disconnected>
            Connect an Algorithms node to choose what these values feed.
          </Disconnected>
        </div>
      );
    const valuesId = `${node.id}-values`;
    const targetId = `${node.id}-target`;
    return (
      <div className="input-section">
        {source}
        <div className="field">
          <label htmlFor={valuesId}>
            {algorithm.category === 'Recursion' ? 'Input n' : 'Array values'}
          </label>
          <textarea
            id={valuesId}
            value={state.text}
            onChange={(e) => editInput(node.id, { text: e.target.value })}
            spellCheck={false}
            rows={3}
          />
          <p className="input-help">{algorithm.limits}</p>
        </div>
        {algorithm.category === 'Searching' && (
          <div className="field">
            <label htmlFor={targetId}>Search target</label>
            <input
              id={targetId}
              value={state.target}
              onChange={(e) => editInput(node.id, { target: e.target.value })}
            />
          </div>
        )}
        <div className="input-actions">
          <button
            className="primary"
            onClick={() => apply(node.id, algorithm, state.text, state.target)}
          >
            <Icon name="check" size={14} />
            Apply input
          </button>
          <button
            onClick={() => {
              const text =
                algorithm.category === 'Recursion'
                  ? algorithm.example
                  : (algorithm.id === 'binary'
                      ? randomValues().sort((a, b) => a - b)
                      : randomValues()
                    ).join(', ');
              apply(node.id, algorithm, text, state.target);
            }}
          >
            <Icon name="shuffle" size={14} />
            Random
          </button>
        </div>
        {algorithm.id === 'binary' && (
          <button
            className="text-button"
            onClick={() => {
              try {
                const text = parseArray(state.text)
                  .sort((a, b) => a - b)
                  .join(', ');
                apply(node.id, algorithm, text, state.target);
              } catch (cause) {
                setInputs((s) => ({
                  ...s,
                  [node.id]: { ...s[node.id], error: (cause as Error).message },
                }));
              }
            }}
          >
            Sort input ↑
          </button>
        )}
        {state.error && (
          <p className="error" role="alert">
            {state.error}
          </p>
        )}
      </div>
    );
  };

  const renderVisualization = (node: GraphNode, title: string) => {
    const algorithm = algorithmForInput(node.source);
    const p = playbacks[node.id];
    const frame = p?.frames[p.index];
    const source = (
      <SourceSelect
        owner={title}
        label="Input"
        value={node.source}
        options={optionsFor('visualization')}
        onChange={(id) => reconnect(node, id)}
      />
    );
    if (!algorithm || !p || !frame)
      return (
        <VisualizationStage source={source}>
          <Disconnected>Connect an Input node.</Disconnected>
        </VisualizationStage>
      );
    const style = styles[node.id] ?? 'array';
    const dispatch: Dispatch<Action> = (action) =>
      dispatchGroup({ type: 'to', id: node.id, action });
    const recursive = algorithm.category === 'Recursion';
    return (
      <VisualizationStage
        source={source}
        style={style}
        onStyleChange={
          recursive
            ? undefined
            : (next) => setStyles((s) => ({ ...s, [node.id]: next }))
        }
        playback={<PlaybackControls state={p} dispatch={dispatch} />}
      >
        {recursive ? (
          <RecursionView
            key={algorithm.id}
            frame={frame}
            previous={p.index > 0 ? p.frames[p.index - 1] : undefined}
          />
        ) : (
          <ArrayView frame={frame} style={style} speed={p.speed} />
        )}
      </VisualizationStage>
    );
  };
  const algorithmInfo = (algorithm: Algorithm) => (
    <>
      <strong>{algorithm.name}</strong>
      <span>{algorithm.summary}</span>
      <span className="mono tooltip-meta">
        time {algorithm.time} · space {algorithm.space}
      </span>
      <Legend
        items={
          algorithm.category === 'Recursion' ? recursionLegend : arrayLegend
        }
      />
    </>
  );

  const renderInspector = (node: GraphNode, title: string) => {
    const viz = nodeById(node.source);
    const p = viz ? playbacks[viz.id] : undefined;
    const frame = p?.frames[p.index];
    const source = (
      <SourceSelect
        owner={title}
        label="Visualization"
        value={node.source}
        options={optionsFor('inspector')}
        onChange={(id) => reconnect(node, id)}
      />
    );
    if (!viz || !p || !frame)
      return (
        <>
          {source}
          <Disconnected>
            Connect a Visualization node to follow its execution.
          </Disconnected>
        </>
      );
    return (
      <>
        {source}
        <Inspector
          frame={frame}
          frames={p.frames}
          index={p.index}
          onSeek={(index) =>
            dispatchGroup({
              type: 'to',
              id: viz.id,
              action: { type: 'seek', index },
            })
          }
        />
      </>
    );
  };

  const flowNodes: FlowNode[] = graph.map((node) => {
    const meta = nodeKinds[node.kind];
    const title = instanceTitle(node.kind, node.n);
    const base = {
      id: node.id,
      kind: node.kind,
      title,
      icon: <Icon name={meta.icon} />,
      width: meta.width,
      leaving: leaving.includes(node.id),
      onRemove:
        countOf(node.kind) > 1 && !leaving.includes(node.id)
          ? () => remove(node.id)
          : undefined,
      anchor: node.source ?? undefined,
      ...initialPositions[node.id],
    };
    if (node.kind === 'algorithm')
      return {
        ...base,
        input: false,
        subtitle: findAlgorithm(algos[node.id]).name,
        children: renderAlgorithm(node, title),
      };
    if (node.kind === 'input') {
      const algorithm = algorithmForInput(node.id);
      return {
        ...base,
        subtitle: algorithm
          ? algorithm.category === 'Recursion'
            ? 'Value n'
            : 'Array values'
          : 'Not connected',
        status: inputs[node.id]?.error ? 'error' : 'idle',
        children: renderInput(node, title),
      };
    }
    if (node.kind === 'visualization') {
      const p = playbacks[node.id];
      const algorithm = algorithmForInput(node.source);
      const input = nodeById(node.source);
      return {
        ...base,
        subtitle: input ? `from ${instanceTitle(input.kind, input.n)}` : 'Not connected',
        status: p?.playing
          ? 'running'
          : p && p.index > 0 && p.index === p.frames.length - 1
            ? 'success'
            : 'idle',
        actions: algorithm && (
          <InfoTooltip label={`About ${algorithm.name}`}>
            {algorithmInfo(algorithm)}
          </InfoTooltip>
        ),
        children: renderVisualization(node, title),
      };
    }
    const viz = nodeById(node.source);
    return {
      ...base,
      output: false,
      subtitle: viz
        ? `Following ${instanceTitle(viz.kind, viz.n)}`
        : 'Not connected',
      status: viz && playbacks[viz.id]?.playing ? 'running' : 'idle',
      children: renderInspector(node, title),
    };
  });

  const isPlaying = (vizId: string) => Boolean(playbacks[vizId]?.playing);
  const edges: FlowEdge[] = graph
    .filter((node) => node.source && nodeById(node.source))
    .map((node) => ({
      id: `${node.source}->${node.id}`,
      from: node.source!,
      to: node.id,
      active:
        node.kind === 'input'
          ? vizIdsFor(node.id).some(isPlaying)
          : node.kind === 'visualization'
            ? isPlaying(node.id)
            : node.kind === 'inspector'
              ? isPlaying(node.source!)
              : false,
    }));

  return (
    <>
      <Canvas
        label="Algorithm workspace map"
        nodes={flowNodes}
        edges={edges}
        initialFocus="visualization-1"
        settings={settings}
        focus={focus}
      />
      {Object.entries(playbacks).map(([id, state]) => (
        <PlaybackTicker
          key={id}
          id={id}
          state={state}
          dispatch={dispatchGroup}
        />
      ))}
      <AddNodes
        target={panel}
        items={(
          ['algorithm', 'input', 'visualization', 'inspector'] as NodeKind[]
        ).map((kind) => ({ kind, count: countOf(kind), onAdd: () => add(kind) }))}
        onPipeline={addPipeline}
      />
    </>
  );
}
