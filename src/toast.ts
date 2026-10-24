import { useSyncExternalStore } from 'react';
import { uid } from './lib/date';

export type Toast = {
  id: string;
  message: string;
  action?: { label: string; run: () => void };
  duration?: number;
};

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(t: Omit<Toast, 'id'>) {
  const item = { ...t, id: uid() };
  toasts = [...toasts.slice(-2), item];
  emit();
  setTimeout(() => dismiss(item.id), t.duration ?? 5000);
}

export function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useToasts = () => useSyncExternalStore(subscribe, () => toasts);
