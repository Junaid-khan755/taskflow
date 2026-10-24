import { useSyncExternalStore } from 'react';

// A tiny global store for error messages. Any code (even outside React,
// like the query client) can call toast(); <Toaster /> renders them.

type Toast = { id: number; message: string };

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let nextId = 0;

export function toast(message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  emit();
  setTimeout(() => dismiss(id), 5000);
}

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useToasts = () => useSyncExternalStore(subscribe, () => toasts);
