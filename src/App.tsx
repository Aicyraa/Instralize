import { lazy, Suspense, useState } from 'react';
import { Explore } from './app/Explore';
const CodeLab = lazy(() => import('./features/code-lab/CodeLab'));
export default function App() {
  const [tab, setTab] = useState<'explore' | 'code'>('explore');
  return (
    <>
      <header className="app-header">
        <a
          className="brand flex items-center gap-2.5"
          href="./"
          aria-label="Instralize home"
        >
          <span className="brand-symbol">ııı</span>Instralize
          <span className="brand-tag">Algorithm studio</span>
        </a>
        <nav aria-label="Workspace">
          <button
            className={tab === 'explore' ? 'active' : ''}
            aria-current={tab === 'explore' ? 'page' : undefined}
            onClick={() => setTab('explore')}
          >
            Explore
          </button>
          <button
            className={tab === 'code' ? 'active' : ''}
            aria-current={tab === 'code' ? 'page' : undefined}
            onClick={() => setTab('code')}
          >
            Code Lab
          </button>
        </nav>
        <span className="header-note">Interactive algorithm visualizer</span>
      </header>
      {tab === 'explore' ? (
        <Explore />
      ) : (
        <Suspense fallback={<p className="empty-hint">Loading Code Lab…</p>}>
          <CodeLab />
        </Suspense>
      )}
    </>
  );
}
