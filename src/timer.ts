import { dayKey } from './lib/date';
import { getState, readStored, reload, update, type Mode, type State, type Timer } from './store';
import { setTaskDone } from './actions';
import { toast } from './toast';

export const durationFor = (s: State, mode: Mode) => (mode === 'focus' ? s.settings.focusMin : s.settings.breakMin) * 60;

export const remainingAt = (t: Timer, now: number) =>
  t.running ? Math.max(0, Math.ceil((t.endAt - now) / 1000)) : t.remaining;

function resetTo(s: State, mode: Mode) {
  Object.assign(s.timer, { mode, running: false, endAt: 0, remaining: durationFor(s, mode) });
}

export const setMode = (mode: Mode) => update((s) => resetTo(s, mode));
export const resetTimer = () => update((s) => resetTo(s, s.timer.mode));
export const skipTimer = () => update((s) => resetTo(s, s.timer.mode === 'focus' ? 'break' : 'focus'));
export const setTimerTask = (taskId: string | null) => update((s) => void (s.timer.taskId = taskId));

export function setDuration(key: 'focusMin' | 'breakMin', minutes: number) {
  update((s) => {
    s.settings[key] = minutes;
    const affectsCurrent = (key === 'focusMin') === (s.timer.mode === 'focus');
    if (!s.timer.running && affectsCurrent) resetTo(s, s.timer.mode);
  });
}

export function toggleTimer() {
  update((s) => {
    const t = s.timer;
    if (t.running) {
      t.remaining = remainingAt(t, Date.now());
      t.running = false;
    } else {
      t.endAt = Date.now() + t.remaining * 1000;
      t.running = true;
    }
  });
  if (getState().timer.running) {
    unlockAudio();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }
}

export function finishTimer() {
  // If another tab already finished this session, adopt its state instead of counting twice.
  const stored = readStored();
  const current = getState().timer;
  if (stored && (!stored.timer.running || stored.timer.endAt !== current.endAt)) {
    reload();
    return;
  }
  const was = current.mode;
  update((s) => {
    if (was === 'focus') s.focus[dayKey()] = (s.focus[dayKey()] ?? 0) + 1;
    resetTo(s, was === 'focus' ? 'break' : 'focus');
  });

  const message = was === 'focus' ? 'Focus session complete. Take a break ☕' : 'Break’s over. Ready when you are.';
  chime();
  notify(message);
  const task = was === 'focus' ? getState().tasks.find((t) => t.id === current.taskId && !t.done) : undefined;
  if (task) {
    toast({ message: `Nice session! Done with “${task.text}”?`, action: { label: 'Mark done', run: () => setTaskDone(task.id, true) }, duration: 12000 });
  } else {
    toast({ message });
  }
}

// ---------- sound & notifications ----------

let audio: AudioContext | undefined;

function unlockAudio() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    // No audio available.
  }
}

function chime() {
  if (!getState().settings.sound || !audio) return;
  const now = audio.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    const at = now + i * 0.14;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
    osc.connect(gain).connect(audio!.destination);
    osc.start(at);
    osc.stop(at + 0.75);
  });
}

function notify(body: string) {
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    new Notification('Daylight', { body, icon: 'icon.svg' });
  }
}
