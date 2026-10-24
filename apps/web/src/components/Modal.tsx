import { useEffect, useRef, type ReactNode } from 'react';

// Uses the native <dialog> element, which gives us focus trapping,
// Escape-to-close and screen reader support for free.
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the dark backdrop (the dialog itself, not its content) closes it
      onClick={(e) => e.target === ref.current && ref.current.close()}
      className="m-auto w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-0 text-slate-100 backdrop:bg-black/60"
    >
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={() => ref.current?.close()}
            className="text-slate-400 hover:text-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
