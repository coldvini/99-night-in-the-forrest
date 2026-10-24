import { AnimatePresence, motion } from 'motion/react';
import { Monitor, Moon, Search, Settings2, Sun, Sunrise, Sunset } from 'lucide-react';
import { cycleTheme } from '../actions';
import { isMac, useNow } from '../hooks';
import { dayKey, greetingFor, phaseFor } from '../lib/date';
import { useStore } from '../store';

const PHASES = {
  dawn: { icon: Sunrise, label: 'Morning' },
  day: { icon: Sun, label: 'Daytime' },
  dusk: { icon: Sunset, label: 'Evening' },
  night: { icon: Moon, label: 'Night' },
};

const THEMES = { auto: Monitor, light: Sun, dark: Moon };

export function Header({ onPalette, onSettings }: { onPalette: () => void; onSettings: () => void }) {
  const { tasks, settings } = useStore();
  const now = new Date(useNow(1000));
  const today = dayKey(now);
  const phase = PHASES[phaseFor(now.getHours())];
  const visible = tasks.filter((t) => !t.done || t.doneDay === today);
  const done = visible.filter((t) => t.done).length;
  const pct = visible.length ? done / visible.length : 0;
  const ThemeIcon = THEMES[settings.theme];

  return (
    <header className="top">
      <motion.div className="hello" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="phase-chip">
          <phase.icon size={14} />
          {phase.label}
        </div>
        <h1>{greetingFor(now.getHours())}</h1>
        <p className="muted">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </motion.div>

      <motion.div className="top-right" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}>
        <div className="clock" aria-label="Current time">
          {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </div>
        <div className="day-progress" title="Tasks done today">
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle className="mini-track" cx="18" cy="18" r="15" pathLength={1} />
            <circle className="mini-fill" cx="18" cy="18" r="15" pathLength={1} style={{ strokeDashoffset: 1 - pct }} />
          </svg>
          <div>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.strong key={`${done}/${visible.length}`} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}>
                {visible.length && done === visible.length ? 'All done' : `${done} of ${visible.length}`}
              </motion.strong>
            </AnimatePresence>
            <span className="muted">tasks today</span>
          </div>
        </div>
        <div className="toolbar">
          <button className="kbar" onClick={onPalette}>
            <Search size={16} />
            <span>Search or do anything…</span>
            <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <motion.button className="icon-btn" onClick={cycleTheme} whileTap={{ scale: 0.9 }} aria-label={`Theme: ${settings.theme}`} title={`Theme: ${settings.theme} (t)`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={settings.theme} className="icon-swap" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <ThemeIcon size={18} />
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <motion.button className="icon-btn" onClick={onSettings} whileTap={{ scale: 0.9 }} aria-label="Settings" title="Settings">
            <Settings2 size={18} />
          </motion.button>
        </div>
      </motion.div>
    </header>
  );
}
