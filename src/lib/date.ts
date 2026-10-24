export const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as YYYY-MM-DD. */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key: string, n: number) => {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

export const daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);

/** The last `n` days ending at `today`, oldest first. */
export const lastDays = (today: string, n: number) => Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));

export const fmtTime = (seconds: number) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Consecutive logged days ending today, or yesterday if today isn't logged yet. */
export function streak(log: Record<string, true>, today: string) {
  let k = log[today] ? today : addDays(today, -1);
  let n = 0;
  while (log[k]) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

export const phaseFor = (hour: number): Phase =>
  hour >= 5 && hour < 10 ? 'dawn' : hour >= 10 && hour < 17 ? 'day' : hour >= 17 && hour < 21 ? 'dusk' : 'night';

export const greetingFor = (hour: number) =>
  hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
