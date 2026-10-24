import { useState } from 'react';

/** A one-field form: Enter submits, Escape cancels. */
export function InlineForm({
  initial = '',
  placeholder,
  submitLabel = 'Add',
  onSubmit,
  onCancel,
}: {
  initial?: string;
  placeholder: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
        setValue('');
      }}
      className="flex flex-col gap-2"
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input"
      />
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

/** A "+ Add ..." button that turns into an InlineForm when clicked. */
export function AddInline({
  label,
  placeholder,
  onAdd,
  closeOnSubmit = false,
}: {
  label: string;
  placeholder: string;
  onAdd: (value: string) => void;
  closeOnSubmit?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full text-left">
        {label}
      </button>
    );
  }
  return (
    <InlineForm
      placeholder={placeholder}
      onSubmit={(value) => {
        onAdd(value);
        if (closeOnSubmit) setOpen(false);
      }}
      onCancel={() => setOpen(false)}
    />
  );
}
