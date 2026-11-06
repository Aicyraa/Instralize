import { useId } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../../shared/Icon';
import type { IconName } from '../../shared/Icon';
import type { ElementStyle } from './ArrayView';

const styleIcons: Record<ElementStyle, IconName> = {
  array: 'styleArray',
  bars: 'styleBars',
  circles: 'styleCircles',
  squares: 'styleSquares',
};

/** A visualization node body: values only, with compact corner controls. */
export function VisualizationStage({
  source,
  style,
  onStyleChange,
  children,
  playback,
}: {
  source?: ReactNode;
  style?: ElementStyle;
  onStyleChange?: (style: ElementStyle) => void;
  children: ReactNode;
  playback?: ReactNode;
}) {
  return (
    <div className="viz">
      <div className="viz-stage">
        {(source || onStyleChange) && (
          <div className="viz-overlay">
            {source}
            {onStyleChange && (
              <div
                className="style-toggle"
                role="group"
                aria-label="Visualization style"
              >
                {(Object.keys(styleIcons) as ElementStyle[]).map((name) => (
                  <button
                    key={name}
                    aria-label={`${name[0].toUpperCase()}${name.slice(1)} view`}
                    title={name}
                    aria-pressed={style === name}
                    onClick={() => onStyleChange(name)}
                  >
                    <Icon name={styleIcons[name]} size={15} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {children}
      </div>
      {playback}
    </div>
  );
}

export function InfoTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <span className="info-tip">
      <button
        className="flow-node-action"
        aria-label={label}
        aria-describedby={id}
      >
        <Icon name="info" size={15} />
      </button>
      <span role="tooltip" id={id} className="tooltip">
        {children}
      </span>
    </span>
  );
}

export function Legend({
  items,
}: {
  items: { label: string; tone: 'compare' | 'active' | 'complete' }[];
}) {
  return (
    <ul className="legend">
      {items.map((item) => (
        <li key={item.label}>
          <i className={`dot ${item.tone}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

