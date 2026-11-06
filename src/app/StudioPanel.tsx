import { useEffect, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Icon } from '../shared/Icon';
import { Logo } from '../shared/Logo';
import type { CanvasSettings } from '../shared/canvasSettings';

export type Workspace = 'explore' | 'code';
const STORAGE_KEY = 'instralize-panel-v1';
const MARGIN = 12;
const DEFAULT_POSITION = { x: 16, y: 16 };

interface Stored {
  x: number;
  y: number;
  open: boolean;
}
function readStored(): Stored {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (
      value &&
      Number.isFinite(value.x) &&
      Number.isFinite(value.y) &&
      typeof value.open === 'boolean'
    )
      return value;
  } catch {
    /* Storage may be unavailable; fall back to defaults. */
  }
  return { ...DEFAULT_POSITION, open: false };
}

const settingRows: { key: keyof CanvasSettings; label: string }[] = [
  { key: 'minimap', label: 'Minimap' },
  { key: 'grid', label: 'Dot grid' },
  { key: 'snap', label: 'Snap to grid' },
  { key: 'animateEdges', label: 'Animate running links' },
];

export function StudioPanel({
  workspace,
  onWorkspaceChange,
  settings,
  onSettingsChange,
  slotRef,
}: {
  workspace: Workspace;
  onWorkspaceChange: (workspace: Workspace) => void;
  settings: CanvasSettings;
  onSettingsChange: (settings: CanvasSettings) => void;
  slotRef: (element: HTMLDivElement | null) => void;
}) {
  const [stored] = useState(readStored);
  const [pos, setPos] = useState({ x: stored.x, y: stored.y });
  const [open, setOpen] = useState(stored.open);
  const [dragging, setDragging] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...pos, open }));
    } catch {
      /* Position persistence is optional. */
    }
  }, [pos, open]);

  const clampPosition = (x: number, y: number) => {
    const el = panel.current;
    const w = el?.offsetWidth ?? 320;
    return {
      x: Math.round(
        Math.min(Math.max(MARGIN, x), window.innerWidth - w - MARGIN),
      ),
      y: Math.round(
        Math.min(Math.max(MARGIN, y), window.innerHeight - 64 - MARGIN),
      ),
    };
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = panel.current!.getBoundingClientRect();
    drag.current = {
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
    }
    setPos(clampPosition(event.clientX - d.dx, event.clientY - d.dy));
  };
  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
  };
  const onHandleKey = (event: ReactKeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? 64 : 16;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setPos((p) => clampPosition(p.x + move[0], p.y + move[1]));
  };

  return (
    <aside
      ref={panel}
      className={`studio-panel${open ? ' open' : ''}${dragging ? ' dragging' : ''}`}
      aria-label="Studio"
      style={{
        left: `clamp(${MARGIN}px, ${pos.x}px, calc(100vw - var(--panel-width) - ${MARGIN}px))`,
        top: `clamp(${MARGIN}px, ${pos.y}px, calc(100dvh - 76px))`,
      }}
    >
      <div className="studio-bar">
        <button
          className="studio-handle"
          aria-label="Move studio panel"
          title="Drag to move · double-click to reset"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onHandleKey}
          onDoubleClick={() => setPos(DEFAULT_POSITION)}
        >
          <Logo size={28} />
          <span className="studio-wordmark">Instralize</span>
        </button>
        <div className="mode-switch" role="group" aria-label="Workspace">
          {(
            [
              ['explore', 'Explore'],
              ['code', 'Code Lab'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={workspace === id}
              onClick={() => onWorkspaceChange(id)}
            >
              {workspace === id && (
                <motion.span
                  layoutId="mode-pill"
                  className="mode-pill"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
                  }
                />
              )}
              <span className="mode-label">{label}</span>
            </button>
          ))}
        </div>
        <button
          className={`icon-button studio-toggle${open ? ' active' : ''}`}
          aria-label="Workspace settings"
          aria-expanded={open}
          aria-controls="studio-settings"
          title={open ? 'Hide settings' : 'Show settings'}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name="settings" />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="studio-settings"
            className="studio-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reduced ? 0 : 0.24,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <div className="studio-scroll">
              <div ref={slotRef} className="studio-slot" />
              <section
                className="panel-section"
                aria-labelledby="panel-canvas-heading"
              >
                <h3 className="panel-label" id="panel-canvas-heading">
                  Canvas
                </h3>
                <div className="settings-list">
                  {settingRows.map(({ key, label }) => (
                    <button
                      key={key}
                      role="switch"
                      aria-checked={settings[key]}
                      className="setting-row"
                      onClick={() =>
                        onSettingsChange({ ...settings, [key]: !settings[key] })
                      }
                    >
                      <span className="setting-text">{label}</span>
                      <span className="switch" aria-hidden="true">
                        <span />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
