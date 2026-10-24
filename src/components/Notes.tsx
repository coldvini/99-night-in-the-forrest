import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, NotebookPen } from 'lucide-react';
import { setNote } from '../actions';
import { useToday } from '../hooks';
import { addDays, parseDay } from '../lib/date';
import { useStore } from '../store';
import { Card } from './ui';

export function Notes() {
  const { notes } = useStore();
  const today = useToday();
  const [day, setDay] = useState(today);
  const [text, setText] = useState(notes[day] ?? '');
  const [saved, setSaved] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow midnight if we were looking at "today".
  const prevToday = useRef(today);
  useEffect(() => {
    if (day === prevToday.current) setDay(today);
    prevToday.current = today;
  }, [today, day]);

  // Pick up changes from other tabs, but never while typing.
  useEffect(() => {
    if (document.activeElement !== area.current) setText(notes[day] ?? '');
  }, [notes, day]);

  const days = [...new Set([today, day, ...Object.keys(notes).filter((k) => notes[k].trim())])].sort().reverse();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const label = (k: string) =>
    k === today ? 'Today' : k === addDays(today, -1) ? 'Yesterday' : parseDay(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <Card className="notes" title="Notes" icon={<NotebookPen size={16} />} delay={0.24}
      extra={
        <select className="pill-select" value={day} aria-label="Notes day" onChange={(e) => {
          clearTimeout(timer.current);
          if (text !== (notes[day] ?? '')) setNote(day, text);
          setDay(e.target.value);
          setText(notes[e.target.value] ?? '');
        }}>
          {days.map((k) => <option key={k} value={k}>{label(k)}</option>)}
        </select>
      }>
      <textarea
        id="notes-input"
        ref={area}
        value={text}
        placeholder="Thoughts, links, a gratitude list, tomorrow’s plan…"
        aria-label="Notes"
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          setSaved(false);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            setNote(day, value);
            setSaved(true);
          }, 400);
        }}
      />
      <div className="notes-foot muted">
        <span>{words} word{words === 1 ? '' : 's'}</span>
        <AnimatePresence>
          {saved && (
            <motion.span className="saved" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Check size={13} /> Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
