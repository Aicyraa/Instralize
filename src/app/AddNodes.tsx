import { createPortal } from 'react-dom';
import { Icon } from '../shared/Icon';
import { nodeKinds } from './graph';
import type { NodeKind } from './graph';

export interface AddItem {
  kind: NodeKind;
  count: number;
  onAdd: () => void;
}

/** Workspace-specific actions rendered inside the floating studio panel. */
export function AddNodes({
  target,
  items,
  onPipeline,
  note,
}: {
  target?: HTMLElement | null;
  items: AddItem[];
  onPipeline?: () => void;
  note: string;
}) {
  if (!target) return null;
  return createPortal(
    <section className="panel-section" aria-labelledby="panel-add-heading">
      <div className="panel-section-head">
        <h3 className="panel-label" id="panel-add-heading">
          Add to canvas
        </h3>
        <span className="panel-meta mono">
          {items.reduce((total, item) => total + item.count, 0)} nodes
        </span>
      </div>
      <div className="add-grid">
        {items.map(({ kind, count, onAdd }) => (
          <button
            key={kind}
            className="add-tile"
            data-kind={kind}
            onClick={onAdd}
            aria-label={`Add ${nodeKinds[kind].title}`}
          >
            <span className="add-tile-icon">
              <Icon name={nodeKinds[kind].icon} />
            </span>
            <span className="add-tile-text">
              <strong>{nodeKinds[kind].title}</strong>
              <span>{nodeKinds[kind].hint}</span>
            </span>
            <span className="add-tile-count mono" aria-hidden="true">
              {count}
            </span>
          </button>
        ))}
      </div>
      {onPipeline && (
        <button className="add-pipeline" onClick={onPipeline}>
          <Icon name="pipeline" />
          New connected pipeline
        </button>
      )}
      <p className="panel-note">{note}</p>
    </section>,
    target,
  );
}
