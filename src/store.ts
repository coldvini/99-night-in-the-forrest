import { useSyncExternalStore } from 'react';
import { addDays, dayKey, uid } from './lib/date';

export type Task = { id: string; text: string; day: string; done: boolean; doneDay: string | null };
export type Habit = { id: string; name: string; log: Record<string, true> };
export type Mode = 'focus' | 'break';
export type Theme = 'auto' | 'light' | 'dark';
export type Settings = { focusMin: number; breakMin: number; sound: boolean; theme: Theme };
export type Timer = { mode: Mode; running: boolean; endAt: number; remaining: number; taskId: string | null };

export type State = {
  tasks: Task[];
  habits: Habit[];
  notes: Record<string, string>;
  focus: Record<string, number>;
  settings: Settings;
  timer: Timer;
};

// Same key and shape as Daylight 1.x, so existing data carries over.
export const KEY = 'daylight:v1';

export const defaults = (): State => ({
  tasks: [],
  habits: [],
  notes: {},
  focus: {},
  settings: { focusMin: 25, breakMin: 5, sound: true, theme: 'auto' },
  timer: { mode: 'focus', running: false, endAt: 0, remaining: 25 * 60, taskId: null },
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const list = (v: unknown) => (Array.isArray(v) ? v.filter(isObj) : []);

/** Turns anything (old versions, imports, garbage) into a valid State. */
export function normalize(raw: unknown): State {
  const base = defaults();
  if (!isObj(raw)) return base;
  const today = dayKey();
  return {
    tasks: list(raw.tasks)
      .filter((t) => typeof t.text === 'string')
      .map((t) => ({
        id: typeof t.id === 'string' ? t.id : uid(),
        text: t.text as string,
        day: typeof t.day === 'string' ? t.day : today,
        done: !!t.done,
        doneDay: typeof t.doneDay === 'string' ? t.doneDay : null,
      })),
    habits: list(raw.habits)
      .filter((h) => typeof h.name === 'string')
      .map((h) => ({
        id: typeof h.id === 'string' ? h.id : uid(),
        name: h.name as string,
        log: isObj(h.log) ? (h.log as Record<string, true>) : {},
      })),
    notes: isObj(raw.notes) ? (raw.notes as Record<string, string>) : {},
    focus: isObj(raw.focus) ? (raw.focus as Record<string, number>) : {},
    settings: { ...base.settings, ...(isObj(raw.settings) ? raw.settings : {}) } as Settings,
    timer: { ...base.timer, ...(isObj(raw.timer) ? raw.timer : {}) } as Timer,
  };
}

/** What is saved right now, or null if storage is empty or unavailable. */
export function readStored(): State | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function load(): State {
  const s = readStored() ?? defaults();
  // Completed tasks older than a month are just clutter.
  const cutoff = addDays(dayKey(), -30);
  s.tasks = s.tasks.filter((t) => !t.done || !t.doneDay || t.doneDay >= cutoff);
  return s;
}

let state = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: keep working in memory.
  }
}

export const getState = () => state;

/** Apply a change to a copy of the state, save it, and re-render subscribers. */
export function update(fn: (draft: State) => void) {
  const next = structuredClone(state);
  fn(next);
  state = next;
  persist();
  emit();
}

export function replace(next: State) {
  state = next;
  persist();
  emit();
}

export function reload() {
  state = load();
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useStore = () => useSyncExternalStore(subscribe, getState);

if (typeof window !== 'undefined') {
  // Keep every open tab in sync.
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) reload();
  });
}
