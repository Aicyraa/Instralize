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
import { Inspector } from '../visualizations/Inspector';
import { Canvas } from '../../shared/Canvas';
import type { FlowEdge, FlowNode } from '../../shared/Canvas';
import { examples } from './examples';
import type { WorkerRequest, WorkerResponse } from './protocol';
const CodeEditor = lazy(() => import('./CodeEditor'));
const defaultInput = '42, 17, 63, 8, 35, 51, 24, 12';
const initialFrames = [initialFrame(parseArray(defaultInput))];
interface Diagnostic {
  message: string;
  line?: number;
  kind: string;
}
export default function CodeLab() {
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
  const inspector = (
    <Inspector
      frame={shownFrame}
      frames={state.frames}
      index={state.index}
      onSeek={(index) => dispatch({ type: 'seek', index })}
    />
  );
  const running = state.pending;
  const nodes: FlowNode[] = [
    {
      id: 'editor',
      title: 'Code editor',
      subtitle: 'JavaScript · function sort(arr)',
      icon: '{ }',
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
      icon: '▶',
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
              ▶ Run & play
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
              Stop
            </button>
            <button onClick={() => run(true)} disabled={state.pending}>
              Check examples
            </button>
            <button
              aria-label="Random input"
              onClick={() => {
                setInput(randomValues().join(', '));
                invalidate();
              }}
            >
              ↻
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
    {
      id: 'visualization',
      title: 'Visualization',
      subtitle: 'Your algorithm, in motion',
      icon: '▥',
      x: 1220,
      y: 0,
      width: 640,
      status: state.playing ? 'running' : 'idle',
      children: (
        <div className="visualization-panel lab-visualization">
          <ArrayView frame={shownFrame} speed={state.speed} />
          <div className="current-explanation">
            <span className="operation">{shownFrame.operation}</span>
            <p>{shownFrame.description}</p>
          </div>
          <PlaybackControls state={state} dispatch={dispatch} />
        </div>
      ),
    },
    {
      id: 'inspector',
      title: 'Execution inspector',
      subtitle: 'Understand the process',
      icon: '◎',
      x: 1980,
      y: 0,
      width: 340,
      children: inspector,
    },
  ];
  const edges: FlowEdge[] = [
    { id: 'e-r', from: 'editor', to: 'run' },
    {
      id: 'r-v',
      from: 'run',
      to: 'visualization',
      active: running || state.playing,
    },
    {
      id: 'v-i',
      from: 'visualization',
      to: 'inspector',
      active: state.playing,
    },
  ];
  return (
    <Canvas
      label="Code Lab workspace map"
      nodes={nodes}
      edges={edges}
      initialFocus="editor"
    />
  );
}
