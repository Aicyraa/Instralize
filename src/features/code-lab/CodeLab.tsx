import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { initialFrame } from '../algorithms/types';
import { parseArray, randomValues } from '../algorithms/input';
import { usePlayback } from '../playback/usePlayback';
import { PlaybackControls } from '../playback/PlaybackControls';
import { ArrayView } from '../visualizations/ArrayView';
import type { ElementStyle } from '../visualizations/ArrayView';
import { Inspector } from '../visualizations/Inspector';
import { Canvas } from '../../shared/Canvas';
import type { FlowEdge, FlowNode } from '../../shared/Canvas';
import { Icon } from '../../shared/Icon';
import type {
  CanvasSettings,
  FocusRequest,
} from '../../shared/canvasSettings';
import { AddNodes } from '../../app/AddNodes';
import { Disconnected, SourceSelect } from '../../app/NodeParts';
import { instanceTitle, nextInstance } from '../../app/graph';
import { examples } from './examples';
import type { WorkerRequest, WorkerResponse } from './protocol';
const CodeEditor = lazy(() => import('./CodeEditor'));
const defaultInput = '42, 17, 63, 8, 35, 51, 24, 12';
const initialFrames = [initialFrame(parseArray(defaultInput))];
interface ViewInstance {
  id: string;
  n: number;
  style: ElementStyle;
}
interface MapInstance {
  id: string;
  n: number;
  source: string | null;
}
interface Diagnostic {
  message: string;
  line?: number;
  kind: string;
}
export default function CodeLab({
  settings,
  panel,
}: {
  settings?: CanvasSettings;
  panel?: HTMLElement | null;
}) {
  // Extra views and maps mirror the single run with their own presentation.
  const [views, setViews] = useState<ViewInstance[]>([
    { id: 'visualization-1', n: 1, style: 'bars' },
  ]);
  const [maps, setMaps] = useState<MapInstance[]>([
    { id: 'inspector-1', n: 1, source: 'visualization-1' },
  ]);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [focus, setFocus] = useState<FocusRequest>();
  const seq = useRef(1);
  const [source, setSource] = useState(() => {
    try {
      return localStorage.getItem('instralize-code-v1') ?? examples.bubble.code;
    } catch {
      return examples.bubble.code;
    }
  });
  const [input, setInput] = useState(defaultInput);
  const [example, setExample] = useState<keyof typeof examples>('bubble');
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const worker = useRef<Worker | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const runId = useRef(0);
  const { state, dispatch, frame } = usePlayback(initialFrames);
  const stopWorker = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
    clearTimeout(watchdog.current);
    runId.current++;
  }, []);
  useEffect(() => stopWorker, [stopWorker]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('instralize-code-v1', source);
      } catch {
        /* Storage may be unavailable. The editor remains usable. */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [source]);
  const invalidate = useCallback(() => {
    stopWorker();
    dispatch({ type: 'load', frames: [] });
    setDiagnostic(null);
  }, [dispatch, stopWorker]);
  const changeSource = useCallback(
    (text: string) => {
      setSource(text);
      invalidate();
    },
    [invalidate],
  );
  const run = (check = false) => {
    stopWorker();
    let values: number[];
    try {
      values = parseArray(input);
    } catch (cause) {
      setDiagnostic({ message: (cause as Error).message, kind: 'input' });
      return;
    }
    setDiagnostic(null);
    dispatch({ type: 'load', frames: [initialFrame(values)], pending: true });
    const id = runId.current;
    const fail = (message: string, kind = 'runtime', line?: number) => {
      stopWorker();
      dispatch({ type: 'complete' });
      dispatch({ type: 'pause' });
      setDiagnostic({ message, kind, line });
    };
    try {
      const activeWorker = new Worker(
        new URL('./runner.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker.current = activeWorker;
      activeWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        if (response.id !== runId.current) return;
        if (response.type === 'frames')
          dispatch({ type: 'append', frames: response.frames });
        else if (response.type === 'error')
          fail(response.message, response.kind, response.line);
        else {
          stopWorker();
          dispatch({ type: 'complete' });
          setDiagnostic({
            kind: response.correct ? 'success' : 'incorrect',
            message: response.checked
              ? response.correct
                ? 'All 7 example checks passed. This is not a proof of correctness.'
                : `Failed input [${response.failedInput?.join(', ')}]. Output: [${response.output.join(', ')}].`
              : response.correct
                ? 'Correct for this input. Play or seek through the recorded execution.'
                : 'Incorrect result. Playback is available so you can debug the attempt.',
          });
        }
      };
      activeWorker.onerror = (event) => {
        event.preventDefault();
        if (id === runId.current)
          fail('The execution worker could not run. Try again.');
      };
      watchdog.current = setTimeout(() => {
        if (id === runId.current)
          fail(
            'Execution stopped after 3 seconds. Reduce the input or check your loops.',
            'limit',
          );
      }, 3000);
      activeWorker.postMessage({
        id,
        source,
        input: values,
        check,
      } satisfies WorkerRequest);
      if (!check) dispatch({ type: 'play' });
    } catch {
      fail('Web Workers are unavailable in this browser.');
    }
  };
  const shownFrame = frame ?? initialFrame();
  const liveViews = views.filter((v) => !leaving.includes(v.id));
  const liveMaps = maps.filter((m) => !leaving.includes(m.id));
  const addView = () => {
    const view: ViewInstance = {
      id: `visualization-${++seq.current}`,
      n: nextInstance(
        views.map((v) => ({ ...v, kind: 'visualization' })),
        'visualization',
      ),
      style: 'circles',
    };
    setViews((v) => [...v, view]);
    setFocus({ ids: [view.id], n: seq.current });
  };
  const addMap = () => {
    const map: MapInstance = {
      id: `inspector-${++seq.current}`,
      n: nextInstance(maps.map((m) => ({ ...m, kind: 'inspector' })), 'inspector'),
      source: liveViews[liveViews.length - 1]?.id ?? null,
    };
    setMaps((m) => [...m, map]);
    setFocus({ ids: [map.id], n: seq.current });
  };
  const remove = (id: string) => {
    setLeaving((l) => [...l, id]);
    // Let the exit animation finish before unmounting.
    window.setTimeout(() => {
      setViews((v) => v.filter((view) => view.id !== id));
      setMaps((m) =>
        m
          .filter((map) => map.id !== id)
          .map((map) => (map.source === id ? { ...map, source: null } : map)),
      );
      setLeaving((l) => l.filter((x) => x !== id));
    }, 200);
  };
  const running = state.pending;
  const nodes: FlowNode[] = [
    {
      id: 'editor',
      title: 'Code editor',
      subtitle: 'JavaScript · function sort(arr)',
      kind: 'code',
      icon: <Icon name="code" />,
      x: 0,
      y: 0,
      width: 640,
      status:
        diagnostic?.kind === 'success'
          ? 'success'
          : diagnostic &&
              diagnostic.kind !== 'incorrect' &&
              diagnostic.kind !== 'stopped'
            ? 'error'
            : 'idle',
      children: (
        <div className="editor-panel">
          <header className="editor-toolbar">
            <label>
              Example
              <select
                aria-label="Code example"
                value={example}
                onChange={(e) => {
                  const key = e.target.value as keyof typeof examples;
                  setExample(key);
                  changeSource(examples[key].code);
                }}
              >
                {Object.entries(examples).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => changeSource(examples[example].code)}>
              Reset example
            </button>
          </header>
          <Suspense fallback={<p className="empty-hint">Loading editor…</p>}>
            <CodeEditor
              source={source}
              onChange={changeSource}
              line={shownFrame.source?.line}
              errorLine={diagnostic?.line}
            />
          </Suspense>
          <details className="syntax-guide" id="syntax-help">
            <summary>Supported JavaScript & limits</summary>
            <p>
              Entry: <code>function sort(arr)</code>. Mutate arr or return a
              numeric array. Use let/const, named helper functions, recursion,
              numeric/boolean expressions, if/else, for/while/do loops,
              break/continue, indexed reads/writes, and array-swap
              destructuring.
            </p>
            <p>
              Arrays: length, slice, push, pop. Math: floor, min, max. Imports,
              objects, classes, async, browser APIs, and .sort() are
              unsupported.
            </p>
            <p>
              Limits: 20KB source · 100,000 operations · 10,000 frames · 64
              calls · 256 cells per array · 8,192 cumulative allocated cells · 3
              seconds. Tab indents; Escape then Tab leaves the editor.
            </p>
            <p>
              Supported but incorrect attempts remain playable. Unrelated code
              that never inspects or modifies the input is rejected. Passing
              examples does not prove correctness.
            </p>
          </details>
        </div>
      ),
    },
    {
      id: 'run',
      title: 'Run',
      subtitle: 'Input & execution',
      kind: 'input',
      icon: <Icon name="run" />,
      x: 760,
      y: 0,
      width: 340,
      status: running ? 'running' : 'idle',
      children: (
        <div className="lab-input">
          <label htmlFor="lab-values">Input array</label>
          <textarea
            id="lab-values"
            rows={2}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              invalidate();
            }}
          />
          <div className="input-actions flex gap-2">
            <button
              className="primary"
              onClick={() => run()}
              disabled={state.pending}
            >
              <Icon name="run" size={14} />
              Run & play
            </button>
            <button
              onClick={() => {
                stopWorker();
                dispatch({ type: 'complete' });
                dispatch({ type: 'pause' });
                setDiagnostic({
                  kind: 'stopped',
                  message: 'Stopped. Recorded steps remain available.',
                });
              }}
              disabled={!state.pending}
            >
              <Icon name="stop" size={14} />
              Stop
            </button>
            <button onClick={() => run(true)} disabled={state.pending}>
              <Icon name="check" size={14} />
              Check examples
            </button>
            <button
              className="icon-button"
              aria-label="Random input"
              title="Random input"
              onClick={() => {
                setInput(randomValues().join(', '));
                invalidate();
              }}
            >
              <Icon name="shuffle" />
            </button>
          </div>
          {diagnostic && (
            <p
              className={`diagnostic ${diagnostic.kind === 'success' ? 'success' : diagnostic.kind === 'incorrect' || diagnostic.kind === 'stopped' ? 'notice' : 'error'}`}
              role="status"
            >
              <strong>
                {diagnostic.kind}
                {diagnostic.line ? ` · line ${diagnostic.line}` : ''}
              </strong>{' '}
              {diagnostic.message}
            </p>
          )}
        </div>
      ),
    },
    ...views.map((view): FlowNode => {
      const title = instanceTitle('visualization', view.n);
      return {
        id: view.id,
        kind: 'visualization',
        title,
        subtitle:
          view.n === 1 ? 'Your algorithm, in motion' : `Mirrors the run · ${view.style}`,
        icon: <Icon name="visualization" />,
        ...(view.id === 'visualization-1' ? { x: 1220, y: 0 } : {}),
        anchor: 'run',
        width: 640,
        status: state.playing ? 'running' : 'idle',
        leaving: leaving.includes(view.id),
        onRemove:
          liveViews.length > 1 && !leaving.includes(view.id)
            ? () => remove(view.id)
            : undefined,
        children: (
          <div className="visualization-panel lab-visualization">
            <div className="visualization-toolbar">
              <span
                className={`status ${state.pending ? 'running' : state.playing ? 'running' : ''}`}
              >
                {state.pending ? 'Tracing' : state.playing ? 'Running' : 'Ready'}
              </span>
              <label className="view-select">
                View
                <select
                  aria-label="Visualization style"
                  value={view.style}
                  onChange={(e) =>
                    setViews((v) =>
                      v.map((item) =>
                        item.id === view.id
                          ? { ...item, style: e.target.value as ElementStyle }
                          : item,
                      ),
                    )
                  }
                >
                  {['bars', 'circles', 'squares', 'array'].map((s) => (
                    <option value={s} key={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <span className="mono muted step-count">
                Step {state.index} / {Math.max(0, state.frames.length - 1)}
              </span>
            </div>
            <ArrayView frame={shownFrame} style={view.style} speed={state.speed} />
            <div className="current-explanation">
              <span className={`operation ${shownFrame.operation}`}>
                {shownFrame.operation}
              </span>
              <p key={state.index}>{shownFrame.description}</p>
            </div>
            <PlaybackControls state={state} dispatch={dispatch} />
          </div>
        ),
      };
    }),
    ...maps.map((map): FlowNode => {
      const title = instanceTitle('inspector', map.n);
      const source = views.find((v) => v.id === map.source);
      return {
        id: map.id,
        kind: 'inspector',
        title,
        subtitle: source
          ? `Following ${instanceTitle('visualization', source.n)}`
          : 'Not connected',
        icon: <Icon name="map" />,
        ...(map.id === 'inspector-1' ? { x: 1980, y: 0 } : {}),
        anchor: map.source ?? undefined,
        width: 340,
        status: source && state.playing ? 'running' : 'idle',
        leaving: leaving.includes(map.id),
        onRemove:
          liveMaps.length > 1 && !leaving.includes(map.id)
            ? () => remove(map.id)
            : undefined,
        children: (
          <>
            <SourceSelect
              owner={title}
              label="Visualization"
              value={map.source}
              options={liveViews.map((v) => ({
                id: v.id,
                label: instanceTitle('visualization', v.n),
              }))}
              onChange={(id) =>
                setMaps((m) =>
                  m.map((item) =>
                    item.id === map.id ? { ...item, source: id } : item,
                  ),
                )
              }
            />
            {source ? (
              <Inspector
                frame={shownFrame}
                frames={state.frames}
                index={state.index}
                onSeek={(index) => dispatch({ type: 'seek', index })}
              />
            ) : (
              <Disconnected>
                Connect a Visualization node to follow the run.
              </Disconnected>
            )}
          </>
        ),
      };
    }),
  ];
  const edges: FlowEdge[] = [
    { id: 'e-r', from: 'editor', to: 'run' },
    ...views.map((view) => ({
      id: `run->${view.id}`,
      from: 'run',
      to: view.id,
      active: running || state.playing,
    })),
    ...maps
      .filter((map) => map.source && views.some((v) => v.id === map.source))
      .map((map) => ({
        id: `${map.source}->${map.id}`,
        from: map.source!,
        to: map.id,
        active: state.playing,
      })),
  ];
  return (
    <>
      <Canvas
        label="Code Lab workspace map"
        nodes={nodes}
        edges={edges}
        initialFocus="editor"
        settings={settings}
        focus={focus}
      />
      <AddNodes
        target={panel}
        items={[
          {
            kind: 'visualization',
            count: liveViews.length,
            onAdd: addView,
          },
          { kind: 'inspector', count: liveMaps.length, onAdd: addMap },
        ]}
        note="Code Lab has one editor and run. Extra views mirror that run, so you can compare styles side by side."
      />
    </>
  );
}
