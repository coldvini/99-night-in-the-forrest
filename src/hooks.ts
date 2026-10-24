import { useEffect, useState } from 'react';
import { dayKey } from './lib/date';

/** Current time, refreshed every `interval` ms (or frozen when null). */
export function useNow(interval: number | null) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (interval == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

/** Today's key; flips over at midnight. */
export const useToday = () => dayKey(new Date(useNow(15_000)));

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
