import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';

export type NodeStatus = 'idle' | 'running' | 'success' | 'error';
export interface FlowNode {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  status?: NodeStatus;
  children: ReactNode;
}
export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  active?: boolean;
}
interface View {
  x: number;
  y: number;
  z: number;
}
interface Size {
  w: number;
  h: number;
}
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const PORT_Y = 28;
const GRID = 24;
const FIT_PADDING = 56;
const INTERACTIVE =
  'input,textarea,select,button,a,summary,label,[contenteditable],.cm-editor,[role="slider"]';
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function canScrollNatively(start: HTMLElement, root: HTMLElement, dy: number) {
  for (let el: HTMLElement | null = start; el && el !== root;) {
    const overflow = getComputedStyle(el).overflowY;
    if (
      (overflow === 'auto' || overflow === 'scroll') &&
      el.scrollHeight > el.clientHeight
    ) {
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((dy < 0 && !atTop) || (dy > 0 && !atBottom)) return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function Canvas({
  label,
  nodes,
  edges,
  initialFocus,
}: {
  label: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  initialFocus?: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [view, setViewState] = useState<View | null>(null);
  const viewRef = useRef<View | null>(null);
  const [box, setBox] = useState<Size>({ w: 0, h: 0 });
  const boxRef = useRef<Size>({ w: 0, h: 0 });
  const [sizes, setSizes] = useState<Record<string, Size>>({});
  const sizesRef = useRef<Record<string, Size>>({});
  const [offsets, setOffsets] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const offsetsRef = useRef(offsets);
  const [order, setOrder] = useState<string[]>([]);
  const [panning, setPanning] = useState(false);
  const nodesRef = useRef(nodes);
  const initialFocusRef = useRef(initialFocus);
  const fitted = useRef(false);
  const gesture = useRef<
    | { kind: 'pan'; x: number; y: number }
    | { kind: 'node'; id: string; x: number; y: number }
    | null
  >(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number } | null>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  });
  const setView = useCallback((next: View) => {
    viewRef.current = next;
    setViewState(next);
  }, []);
  const position = useCallback((node: FlowNode) => {
    const offset = offsetsRef.current[node.id];
    return { x: offset?.x ?? node.x, y: offset?.y ?? node.y };
  }, []);
  const frameNodes = useCallback(
    (ids: string[], maxZoom = 1) => {
      const { w, h } = boxRef.current;
      if (!w || !h) return false;
      let x1 = Infinity;
      let y1 = Infinity;
      let x2 = -Infinity;
      let y2 = -Infinity;
      for (const node of nodesRef.current) {
        if (!ids.includes(node.id)) continue;
        const size = sizesRef.current[node.id];
        if (!size) return false;
        const p = position(node);
        x1 = Math.min(x1, p.x);
        y1 = Math.min(y1, p.y);
        x2 = Math.max(x2, p.x + size.w);
        y2 = Math.max(y2, p.y + size.h);
      }
      if (!Number.isFinite(x1)) return false;
      const pad = w < 600 ? 16 : FIT_PADDING;
      const z = clamp(
        Math.min((w - pad * 2) / (x2 - x1), (h - pad * 2) / (y2 - y1), maxZoom),
        w < 600 ? 0.3 : 0.45,
        maxZoom,
      );
      setView({
        z,
        x: (w - (x2 - x1) * z) / 2 - x1 * z,
        y: Math.max(pad / 2, (h - (y2 - y1) * z) / 2) - y1 * z,
      });
      return true;
    },
    [position, setView],
  );
  const fitAll = useCallback(
    () => frameNodes(nodesRef.current.map((n) => n.id)),
    [frameNodes],
  );
  const initialFit = useCallback(() => {
    if (fitted.current) return;
    const small = boxRef.current.w < 768;
    const focus = initialFocusRef.current;
    const done =
      small && focus
        ? frameNodes([focus])
        : frameNodes(nodesRef.current.map((n) => n.id));
    if (done) fitted.current = true;
  }, [frameNodes]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      boxRef.current = { w: el.clientWidth, h: el.clientHeight };
      setBox(boxRef.current);
      initialFit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [initialFit]);

  const reportSize = useCallback(
    (id: string, size: Size) => {
      const prev = sizesRef.current[id];
      if (prev && prev.w === size.w && prev.h === size.h) return;
      sizesRef.current = { ...sizesRef.current, [id]: size };
      setSizes(sizesRef.current);
      initialFit();
    },
    [initialFit],
  );

  const zoomAt = useCallback(
    (factor: number, px?: number, py?: number) => {
      const current = viewRef.current;
      if (!current) return;
      const cx = px ?? boxRef.current.w / 2;
      const cy = py ?? boxRef.current.h / 2;
      const z = clamp(current.z * factor, MIN_ZOOM, MAX_ZOOM);
      const ratio = z / current.z;
      setView({
        z,
        x: cx - (cx - current.x) * ratio,
        y: cy - (cy - current.y) * ratio,
      });
    },
    [setView],
  );
  const panBy = useCallback(
    (dx: number, dy: number) => {
      const current = viewRef.current;
      if (current)
        setView({ ...current, x: current.x + dx, y: current.y + dy });
    },
    [setView],
  );

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        zoomAt(
          Math.exp(-event.deltaY * 0.01),
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        canScrollNatively(event.target, el, event.deltaY)
      )
        return;
      event.preventDefault();
      panBy(-event.deltaX, -event.deltaY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [panBy, zoomAt]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const el = viewport.current;
    if (!el || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (target.closest('.flow-controls')) return;
    const inNode = target.closest('.flow-node') as HTMLElement | null;
    const handle = target.closest('[data-node-handle]');
    if (inNode) {
      const id = inNode.dataset.nodeId!;
      setOrder((o) => [...o.filter((n) => n !== id), id]);
    }
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
      gesture.current = null;
      setPanning(false);
      el.setPointerCapture(event.pointerId);
      return;
    }
    if (inNode && handle && !target.closest('button')) {
      gesture.current = {
        kind: 'node',
        id: inNode.dataset.nodeId!,
        x: event.clientX,
        y: event.clientY,
      };
    } else if (
      !inNode ||
      (event.pointerType === 'touch' && !target.closest(INTERACTIVE))
    ) {
      gesture.current = { kind: 'pan', x: event.clientX, y: event.clientY };
      setPanning(true);
      el.focus({ preventScroll: true });
    } else return;
    el.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(event.pointerId))
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = viewport.current!.getBoundingClientRect();
      zoomAt(
        dist / pinch.current.dist,
        (a.x + b.x) / 2 - rect.left,
        (a.y + b.y) / 2 - rect.top,
      );
      pinch.current = { dist };
      return;
    }
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    gesture.current = { ...g, x: event.clientX, y: event.clientY };
    if (g.kind === 'pan') panBy(dx, dy);
    else {
      const z = viewRef.current?.z ?? 1;
      const node = nodesRef.current.find((n) => n.id === g.id);
      if (!node) return;
      const p = position(node);
      offsetsRef.current = {
        ...offsetsRef.current,
        [g.id]: { x: p.x + dx / z, y: p.y + dy / z },
      };
      setOffsets(offsetsRef.current);
    }
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      gesture.current = null;
      setPanning(false);
    }
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const step = event.shiftKey ? 240 : 80;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (moves[event.key]) panBy(...moves[event.key]);
    else if (event.key === '+' || event.key === '=') zoomAt(1.2);
    else if (event.key === '-') zoomAt(1 / 1.2);
    else if (event.key === '0') fitAll();
    else return;
    event.preventDefault();
  };
  const resetLayout = () => {
    offsetsRef.current = {};
    setOffsets({});
    requestAnimationFrame(fitAll);
  };

  const placed = nodes.map((node) => ({
    node,
    x: offsets[node.id]?.x ?? node.x,
    y: offsets[node.id]?.y ?? node.y,
  }));
  const byId = new Map(placed.map((p) => [p.node.id, p]));
  const z = view?.z ?? 1;
  const mini = minimap(placed, sizes, view, box);
  return (
    <div
      ref={viewport}
      className={`flow-viewport${panning ? ' panning' : ''}`}
      role="group"
      aria-label={label}
      aria-roledescription="canvas"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      style={{
        backgroundSize: `${GRID * z}px ${GRID * z}px`,
        backgroundPosition: `${view?.x ?? 0}px ${view?.y ?? 0}px`,
      }}
    >
      <div
        className="flow-world"
        style={{
          transform: `translate(${view?.x ?? 0}px, ${view?.y ?? 0}px) scale(${z})`,
          opacity: view ? 1 : 0,
        }}
      >
        <svg className="flow-edges" aria-hidden="true">
          {edges.map((edge) => {
            const a = byId.get(edge.from);
            const b = byId.get(edge.to);
            const sa = sizes[edge.from];
            if (!a || !b || !sa) return null;
            const x1 = a.x + sa.w;
            const y1 = a.y + PORT_Y;
            const x2 = b.x;
            const y2 = b.y + PORT_Y;
            const c = Math.max(48, Math.abs(x2 - x1) * 0.5);
            return (
              <path
                key={edge.id}
                className={`flow-edge${edge.active ? ' active' : ''}`}
                d={`M${x1} ${y1} C${x1 + c} ${y1},${x2 - c} ${y2},${x2} ${y2}`}
              />
            );
          })}
        </svg>
        {placed.map(({ node, x, y }) => (
          <NodeView
            key={node.id}
            node={node}
            z={order.indexOf(node.id) + 1}
            x={x}
            y={y}
            onSize={reportSize}
            onFocus={() => frameNodes([node.id], 1.1)}
          />
        ))}
      </div>
      <div
        className="flow-controls"
        role="toolbar"
        aria-label="Canvas controls"
      >
        <button aria-label="Zoom in" onClick={() => zoomAt(1.25)}>
          +
        </button>
        <button aria-label="Zoom out" onClick={() => zoomAt(0.8)}>
          −
        </button>
        <button aria-label="Fit view" onClick={fitAll}>
          ⤢
        </button>
        <button aria-label="Reset layout" onClick={resetLayout}>
          ↺
        </button>
        <span className="flow-zoom mono" aria-live="off">
          {Math.round(z * 100)}%
        </span>
      </div>
      {mini && (
        <svg
          className="flow-minimap"
          viewBox={mini.viewBox}
          role="img"
          aria-label="Map overview. Click to move the view."
          onPointerDown={(event) => {
            event.stopPropagation();
            const svg = event.currentTarget;
            const rect = svg.getBoundingClientRect();
            const [vx, vy, vw, vh] = mini.bounds;
            const scale = Math.min(rect.width / vw, rect.height / vh);
            const wx =
              vx +
              (event.clientX - rect.left - (rect.width - vw * scale) / 2) /
                scale;
            const wy =
              vy +
              (event.clientY - rect.top - (rect.height - vh * scale) / 2) /
                scale;
            const current = viewRef.current;
            if (current)
              setView({
                ...current,
                x: boxRef.current.w / 2 - wx * current.z,
                y: boxRef.current.h / 2 - wy * current.z,
              });
          }}
        >
          {mini.rects.map((r) => (
            <rect key={r.id} {...r.attrs} rx="14" className="flow-mini-node" />
          ))}
          <rect {...mini.window} className="flow-mini-window" />
        </svg>
      )}
    </div>
  );
}

function minimap(
  placed: { node: FlowNode; x: number; y: number }[],
  sizes: Record<string, Size>,
  view: View | null,
  box: Size,
) {
  if (!view || !box.w || placed.some((p) => !sizes[p.node.id])) return null;
  const win = {
    x: -view.x / view.z,
    y: -view.y / view.z,
    width: box.w / view.z,
    height: box.h / view.z,
  };
  let x1 = win.x;
  let y1 = win.y;
  let x2 = win.x + win.width;
  let y2 = win.y + win.height;
  for (const p of placed) {
    const s = sizes[p.node.id];
    x1 = Math.min(x1, p.x);
    y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x + s.w);
    y2 = Math.max(y2, p.y + s.h);
  }
  const pad = 80;
  const bounds = [
    x1 - pad,
    y1 - pad,
    x2 - x1 + pad * 2,
    y2 - y1 + pad * 2,
  ] as const;
  return {
    bounds,
    viewBox: bounds.join(' '),
    window: win,
    rects: placed.map((p) => ({
      id: p.node.id,
      attrs: {
        x: p.x,
        y: p.y,
        width: sizes[p.node.id].w,
        height: sizes[p.node.id].h,
      },
    })),
  };
}

function NodeView({
  node,
  x,
  y,
  z,
  onSize,
  onFocus,
}: {
  node: FlowNode;
  z: number;
  x: number;
  y: number;
  onSize: (id: string, size: Size) => void;
  onFocus: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const { id } = node;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      onSize(id, { w: el.offsetWidth, h: el.offsetHeight }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [id, onSize]);
  return (
    <section
      ref={ref}
      className={`flow-node status-${node.status ?? 'idle'}`}
      data-node-id={node.id}
      aria-labelledby={`node-title-${node.id}`}
      style={{
        width: node.width,
        transform: `translate(${x}px, ${y}px)`,
        zIndex: z,
      }}
    >
      <header
        className="flow-node-header"
        data-node-handle
        onDoubleClick={(event) => {
          if (!(event.target as HTMLElement).closest('button')) onFocus();
        }}
      >
        <span className="flow-node-icon" aria-hidden="true">
          {node.icon}
        </span>
        <div>
          <h2 id={`node-title-${node.id}`}>{node.title}</h2>
          {node.subtitle && <span className="muted">{node.subtitle}</span>}
        </div>
        <span className="flow-node-status" aria-hidden="true" />
        <button
          className="flow-node-focus"
          aria-label={`Focus ${node.title}`}
          onClick={onFocus}
        >
          ⌖
        </button>
      </header>
      <span className="flow-port in" aria-hidden="true" />
      <span className="flow-port out" aria-hidden="true" />
      <div className="flow-node-body">{node.children}</div>
    </section>
  );
}
