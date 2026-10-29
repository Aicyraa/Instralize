import { useState } from 'react';
import { algorithms } from '../features/algorithms/registry';
import { parseArray, parseScalar, randomValues } from '../features/algorithms/input';
import { usePlayback } from '../features/playback/usePlayback';
import { PlaybackControls } from '../features/playback/PlaybackControls';
import { ArrayView } from '../features/visualizations/ArrayView';
import type { ElementStyle } from '../features/visualizations/ArrayView';
import { RecursionView } from '../features/visualizations/RecursionView';
import { Inspector } from '../features/visualizations/Inspector';
import { Drawer } from '../shared/Drawer';
import type { Algorithm, Category } from '../features/algorithms/types';
const first = algorithms[0];
const initialFrames = first.run(parseArray(first.example));
export function Explore() {
  const [algorithm, setAlgorithm] = useState(first);
  const [input, setInput] = useState(first.example);
  const [target, setTarget] = useState('24');
  const [style, setStyle] = useState<ElementStyle>('bars');
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState<'configure' | 'inspect' | null>(null);
  const { state, dispatch, frame } = usePlayback(initialFrames);
  const load = (next: Algorithm, text: string, targetText = target) => {
    try {
      const values = next.category === 'Recursion' ? [parseScalar(text, next.id === 'hanoi' ? 1 : 0, next.id === 'fibonacci' ? 8 : next.id === 'factorial' ? 10 : 5)] : parseArray(text);
      const value = next.category === 'Searching' ? parseScalar(targetText, -999, 999) : undefined;
      dispatch({ type: 'load', frames: next.run(values, value) }); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invalid input.'); }
  };
  const choose = (next: Algorithm) => { setAlgorithm(next); setInput(next.example); load(next, next.example); };
  const invalidate = () => { dispatch({ type: 'load', frames: [{ ...frame, operation: 'ready', description: 'Input changed. Choose “Apply input” to generate a new trace.', active: [], finalized: [] }] }); setError(''); };
  const configuration = <><div className="section-heading"><span className="eyebrow">Explore algorithms</span><h2>Choose your path</h2></div><nav className="algorithm-browser" aria-label="Algorithms">{(['Sorting', 'Searching', 'Recursion'] as Category[]).map(category => <section key={category}><h3>{category}</h3>{algorithms.filter(a => a.category === category).map(a => <button key={a.id} aria-label={a.name} onClick={() => { choose(a); setDrawer(null); }} aria-current={algorithm.id === a.id ? 'true' : undefined}><span>{a.name}</span>{['heap', 'shell', 'counting', 'linear', 'binary'].includes(a.id) && <span className="new-label">NEW</span>}</button>)}</section>)}</nav><div className="input-section"><label htmlFor="algorithm-input">{algorithm.category === 'Recursion' ? 'Input n' : 'Array values'}</label><textarea id="algorithm-input" value={input} onChange={e => { setInput(e.target.value); invalidate(); }} spellCheck={false} rows={3} /><p className="input-help">{algorithm.limits}</p>{algorithm.category === 'Searching' && <><label htmlFor="target">Search target</label><input id="target" value={target} onChange={e => { setTarget(e.target.value); invalidate(); }} /></>}<div className="input-actions"><button className="primary" onClick={() => load(algorithm, input)}>Apply input</button><button onClick={() => { const text = algorithm.category === 'Recursion' ? algorithm.example : (algorithm.id === 'binary' ? randomValues().sort((a, b) => a - b) : randomValues()).join(', '); setInput(text); load(algorithm, text); }}>Random</button></div>{algorithm.id === 'binary' && <button className="text-button" onClick={() => { try { const text = parseArray(input).sort((a, b) => a - b).join(', '); setInput(text); load(algorithm, text); } catch (cause) { setError((cause as Error).message); } }}>Sort input ↑</button>}{error && <p className="error" role="alert">{error}</p>}</div></>;
  const inspector = <Inspector frame={frame} frames={state.frames} index={state.index} algorithm={algorithm} onSeek={index => dispatch({ type: 'seek', index })} />;
  return <div className="workspace"><aside className="sidebar-docked">{drawer !== 'configure' && configuration}</aside><main className="main-workspace"><header className="workspace-heading"><div><span className="eyebrow">{algorithm.category} / Visual exploration</span><h1>{algorithm.name}</h1><p>{algorithm.summary}</p></div><div className="mobile-actions"><button className="configure-toggle" onClick={() => setDrawer('configure')}>Algorithms & input</button><button className="inspect-toggle" onClick={() => setDrawer('inspect')}>Inspector</button></div></header><section className="visualization-panel"><div className="visualization-toolbar"><span className={`status ${state.playing ? 'running' : ''}`}>{state.playing ? 'Running' : state.index === state.frames.length - 1 && state.index > 0 ? 'Complete' : state.index > 0 ? 'Paused' : 'Ready'}</span>{algorithm.category !== 'Recursion' && <label>View<select aria-label="Visualization style" value={style} onChange={e => setStyle(e.target.value as ElementStyle)}>{['bars', 'circles', 'squares', 'array'].map(s => <option value={s} key={s}>{s}</option>)}</select></label>}<span className="mono muted">Step {state.index}</span></div>{algorithm.category === 'Recursion' ? <RecursionView key={algorithm.id} frame={frame} /> : <ArrayView frame={frame} style={style} speed={state.speed} />}<div className="current-explanation" aria-live="polite"><span className="operation">{frame.operation}</span><p>{frame.description}</p></div><PlaybackControls state={state} dispatch={dispatch} /></section><footer className="workspace-footer"><span>Observe. Question. Understand.</span><span>Instralize / Interactive algorithms</span></footer></main><aside className="inspector-docked">{drawer !== 'inspect' && inspector}</aside><Drawer title={drawer === 'configure' ? 'Algorithms & input' : 'Execution inspector'} open={drawer !== null} onClose={() => setDrawer(null)}>{drawer === 'configure' ? configuration : drawer === 'inspect' ? inspector : null}</Drawer></div>;
}
