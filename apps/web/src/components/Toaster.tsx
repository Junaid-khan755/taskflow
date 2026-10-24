import { dismiss, useToasts } from '../lib/toast';

export function Toaster() {
  const toasts = useToasts();
  return (
    // aria-live makes screen readers announce new errors
    <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className="flex max-w-sm items-start gap-3 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200 shadow-lg"
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-red-400 hover:text-red-200"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
