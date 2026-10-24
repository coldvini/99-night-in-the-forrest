import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Flame, Plus, Repeat, Trash2 } from 'lucide-react';
import { addHabit, deleteHabit, toggleHabit } from '../actions';
import { useToday } from '../hooks';
import { lastDays, parseDay, streak } from '../lib/date';
import { useStore } from '../store';
import { Card } from './ui';

export function Habits() {
  const { habits } = useStore();
  const today = useToday();
  const days = lastDays(today, 7);
  const [name, setName] = useState('');

  return (
    <Card className="habits" title="Habits" icon={<Repeat size={16} />} delay={0.18}>
      {habits.length > 0 && (
        <div className="habit-row habit-head" aria-hidden="true">
          <span />
          {days.map((k) => (
            <span key={k} className={k === today ? 'today' : ''}>
              {parseDay(k).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
          ))}
          <span />
          <span />
        </div>
      )}

      <ul className="habit-list">
        <AnimatePresence initial={false}>
          {habits.map((h) => {
            const n = streak(h.log, today);
            return (
              <motion.li key={h.id} className="habit-row" layout
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8, transition: { duration: 0.15 } }}>
                <span className="habit-name" title={h.name}>{h.name}</span>
                {days.map((k) => {
                  const on = !!h.log[k];
                  const label = parseDay(k).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
                  return (
                    <motion.button
                      key={k}
                      className={`cell ${on ? 'on' : ''} ${k === today ? 'today' : ''}`}
                      aria-pressed={on}
                      aria-label={`${h.name}, ${label}`}
                      title={label}
                      onClick={() => toggleHabit(h.id, k)}
                      whileTap={{ scale: 0.75 }}
                      animate={on ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  );
                })}
                <span className={`streak ${n ? 'hot' : ''}`} title={`${n}-day streak`}>
                  <Flame size={14} />
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={n} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 6, opacity: 0 }}>{n}</motion.span>
                  </AnimatePresence>
                </span>
                <button className="icon-btn ghost small row-action" onClick={() => deleteHabit(h.id)} aria-label={`Delete habit ${h.name}`} title="Delete">
                  <Trash2 size={14} />
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {habits.length === 0 && <p className="hint">Track something small, like water, reading or a walk.</p>}

      <form
        className="add subtle"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addHabit(name.trim());
          setName('');
        }}
      >
        <Plus size={16} className="add-icon" />
        <input id="habit-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New habit" maxLength={60} autoComplete="off" aria-label="New habit" />
        <kbd>H</kbd>
      </form>
    </Card>
  );
}
