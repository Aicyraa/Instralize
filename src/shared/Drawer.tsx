import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
export function Drawer({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open) dialog?.showModal();
    else dialog?.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} aria-label={title} className="drawer">
      <header>
        <h2>{title}</h2>
        <button onClick={onClose} aria-label={`Close ${title}`}>
          Close ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
