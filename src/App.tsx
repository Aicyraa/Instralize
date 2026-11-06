import { lazy, Suspense, useEffect, useState } from 'react';
import { Explore } from './app/Explore';
import { StudioPanel } from './app/StudioPanel';
import type { Workspace } from './app/StudioPanel';
import { defaultCanvasSettings } from './shared/canvasSettings';
import type { CanvasSettings } from './shared/canvasSettings';
const CodeLab = lazy(() => import('./features/code-lab/CodeLab'));
const SETTINGS_KEY = 'instralize-canvas-v1';

function readSettings(): CanvasSettings {
  try {
    return {
      ...defaultCanvasSettings,
      ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}'),
    };
  } catch {
    return defaultCanvasSettings;
  }
}

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>('explore');
  // Code Lab stays mounted after its first visit so its canvas survives switching.
  const [codeVisited, setCodeVisited] = useState(false);
  const [settings, setSettings] = useState(readSettings);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* Settings persistence is optional. */
    }
  }, [settings]);
  return (
    <div className="app-shell">
      <main className="workspaces">
        <div className="workspace" hidden={workspace !== 'explore'}>
          <Explore
            settings={settings}
            panel={workspace === 'explore' ? slot : null}
          />
        </div>
        {codeVisited && (
          <div className="workspace" hidden={workspace !== 'code'}>
            <Suspense
              fallback={
                <p className="empty-hint" role="status">
                  Loading Code Lab…
                </p>
              }
            >
              <CodeLab
                settings={settings}
                panel={workspace === 'code' ? slot : null}
              />
            </Suspense>
          </div>
        )}
      </main>
      <StudioPanel
        workspace={workspace}
        onWorkspaceChange={(next) => {
          if (next === 'code') setCodeVisited(true);
          setWorkspace(next);
        }}
        settings={settings}
        onSettingsChange={setSettings}
        slotRef={setSlot}
      />
    </div>
  );
}
