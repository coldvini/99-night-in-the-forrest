import { dayKey, uid } from './lib/date';
import { getState, update, type Task } from './store';
import { toast } from './toast';

// ---------- tasks ----------

export const addTask = (text: string) =>
  update((s) => {
    s.tasks.push({ id: uid(), text: text.slice(0, 200), day: dayKey(), done: false, doneDay: null });
  });

export const setTaskDone = (id: string, done: boolean) =>
  update((s) => {
    const t = s.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = done;
    t.doneDay = done ? dayKey() : null;
    if (done && s.timer.taskId === id) s.timer.taskId = null;
  });

export const editTask = (id: string, text: string) =>
  update((s) => {
    const t = s.tasks.find((x) => x.id === id);
    if (t) t.text = text.slice(0, 200);
  });

export function deleteTask(id: string) {
  const index = getState().tasks.findIndex((t) => t.id === id);
  if (index < 0) return;
  const task: Task = getState().tasks[index];
  update((s) => {
    s.tasks.splice(index, 1);
  });
  toast({
    message: 'Task deleted',
    action: { label: 'Undo', run: () => update((s) => void s.tasks.splice(Math.min(index, s.tasks.length), 0, task)) },
  });
}

/** Reorder the open tasks; done tasks keep their place after them. */
export const reorderOpen = (ids: string[]) =>
  update((s) => {
    const byId = new Map(s.tasks.map((t) => [t.id, t]));
    const open = ids.map((id) => byId.get(id)).filter((t): t is Task => !!t);
    const moved = new Set(ids);
    s.tasks = [...open, ...s.tasks.filter((t) => !moved.has(t.id))];
  });

export const clearDone = () =>
  update((s) => {
    s.tasks = s.tasks.filter((t) => !t.done);
  });

// ---------- habits ----------

export const addHabit = (name: string) =>
  update((s) => {
    s.habits.push({ id: uid(), name: name.slice(0, 60), log: {} });
  });

export const toggleHabit = (id: string, day: string) =>
  update((s) => {
    const h = s.habits.find((x) => x.id === id);
    if (!h) return;
    if (h.log[day]) delete h.log[day];
    else h.log[day] = true;
  });

export function deleteHabit(id: string) {
  const index = getState().habits.findIndex((h) => h.id === id);
  if (index < 0) return;
  const habit = getState().habits[index];
  update((s) => {
    s.habits.splice(index, 1);
  });
  toast({
    message: `Removed “${habit.name}”`,
    action: { label: 'Undo', run: () => update((s) => void s.habits.splice(Math.min(index, s.habits.length), 0, habit)) },
  });
}

// ---------- notes & settings ----------

export const setNote = (day: string, text: string) =>
  update((s) => {
    if (text.trim()) s.notes[day] = text;
    else delete s.notes[day];
  });

export const cycleTheme = () =>
  update((s) => {
    const order = ['auto', 'light', 'dark'] as const;
    s.settings.theme = order[(order.indexOf(s.settings.theme) + 1) % order.length];
  });

export function exportData() {
  const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `daylight-${dayKey()}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
