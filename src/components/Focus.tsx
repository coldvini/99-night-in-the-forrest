import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Coffee, Pause, Play, RotateCcw, SkipForward, Timer } from 'lucide-react';
import { useNow, useToday } from '../hooks';
import { fmtTime } from '../lib/date';
import { useStore, type Mode } from '../store';
import { durationFor, remainingAt, resetTimer, setDuration, setMode, setTimerTask, skipTimer, toggleTimer } from '../timer';
import { Card, Segmented } from './ui';

const PRESETS: Record<Mode, number[]> = { focus: [15, 25, 45, 60], break: [5, 10, 15] };

export function Focus() {
  const s = useStore();
  const t = s.timer;
  const today = useToday();
  const now = useNow(t.running ? 200 : null);
  const total = durationFor(s, t.mode) || 1;
  const left = remainingAt(t, now);
  const elapsed = Math.min(1, Math.max(0, 1 - left / total));
  const sessions = s.focus[today] ?? 0;
  const open = s.tasks.filter((x) => !x.done);
  const label = t.mode === 'focus' ? 'Focus' : 'Break';
  const current = t.mode === 'focus' ? s.settings.focusMin : s.settings.breakMin;

  useEffect(() => {
    document.title = t.running ? `${fmtTime(left)} · ${label} · Daylight` : 'Daylight';
  }, [t.running, left, label]);

  return (
    <Card
      className={`focus mode-${t.mode} ${t.running ? 'running' : ''}`}
      title="Focus"
      icon={<Timer size={16} />}
      delay={0.12}
      extra={
        <Segmented<Mode>
          label="Timer mode"
          value={t.mode}
          onChange={(m) => m !== t.mode && setMode(m)}
          options={[
            { value: 'focus', label: 'Focus' },
            { value: 'break', label: <><Coffee size={13} /> Break</> },
          ]}
        />
      }
    >
      <div className="ring-wrap">
        <svg viewBox="0 0 200 200" className="ring" aria-hidden="true">
          <defs>
            <linearGradient id="grad-focus" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent-1)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>
            <linearGradient id="grad-break" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--ok-1)" />
              <stop offset="100%" stopColor="var(--ok-2)" />
            </linearGradient>
          </defs>
          <circle className="ring-track" cx="100" cy="100" r="86" />
          <circle className="ring-glow" cx="100" cy="100" r="86" pathLength={1} stroke={`url(#grad-${t.mode})`} style={{ strokeDashoffset: elapsed }} />
          <circle className="ring-fill" cx="100" cy="100" r="86" pathLength={1} stroke={`url(#grad-${t.mode})`} style={{ strokeDashoffset: elapsed }} />
        </svg>
        <div className="ring-center">
          <div className="time" aria-live="off">{fmtTime(left)}</div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${t.mode}-${t.running}`} className="ring-label" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              {t.running ? (t.mode === 'focus' ? 'Stay with it' : 'Breathe') : left < total ? 'Paused' : label}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="timer-controls">
        <motion.button className="icon-btn round" onClick={resetTimer} whileTap={{ scale: 0.9 }} aria-label="Reset timer" title="Reset">
          <RotateCcw size={18} />
        </motion.button>
        <motion.button className="play" onClick={toggleTimer} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }} aria-label={t.running ? 'Pause' : 'Start'} title="Start / pause (F)">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={t.running ? 'pause' : 'play'} className="icon-swap" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.15 }}>
              {t.running ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" style={{ marginLeft: 3 }} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <motion.button className="icon-btn round" onClick={skipTimer} whileTap={{ scale: 0.9 }} aria-label={`Skip to ${t.mode === 'focus' ? 'break' : 'focus'}`} title="Skip">
          <SkipForward size={18} />
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {!t.running && (
          <motion.div className="presets" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {PRESETS[t.mode].map((m) => (
              <button key={m} className={`chip ${m === current ? 'active' : ''}`} onClick={() => setDuration(t.mode === 'focus' ? 'focusMin' : 'breakMin', m)}>
                {m} min
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="focus-foot">
        <label className="working-on">
          <span className="muted">Working on</span>
          <select value={t.taskId && open.some((x) => x.id === t.taskId) ? t.taskId : ''} onChange={(e) => setTimerTask(e.target.value || null)}>
            <option value="">Nothing specific</option>
            {open.map((x) => <option key={x.id} value={x.id}>{x.text}</option>)}
          </select>
        </label>
        <div className="sessions" title={`${sessions} focus session${sessions === 1 ? '' : 's'} today`}>
          {Array.from({ length: Math.min(sessions, 8) }, (_, i) => (
            <motion.span key={i} className="dot" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6 }} />
          ))}
          {sessions > 8 && <span className="muted">+{sessions - 8}</span>}
          <span className="muted">{sessions ? `${sessions} today` : 'No sessions yet'}</span>
        </div>
      </div>
    </Card>
  );
}
