import type { ReactNode } from 'react';
import { Icon } from '../shared/Icon';

/** Upstream connection picker shown at the top of dependent nodes. */
export function SourceSelect({
  owner,
  label,
  value,
  options,
  onChange,
}: {
  owner: string;
  label: string;
  value: string | null;
  options: { id: string; label: string }[];
  onChange: (id: string | null) => void;
}) {
  return (
    <label className={`source-select${value ? '' : ' disconnected'}`}>
      <Icon name="link" size={14} />
      <span>{label}</span>
      <select
        aria-label={`Source for ${owner}`}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Not connected</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Disconnected({ children }: { children: ReactNode }) {
  return (
    <div className="disconnected-state">
      <Icon name="link" size={20} />
      <p>{children}</p>
    </div>
  );
}
