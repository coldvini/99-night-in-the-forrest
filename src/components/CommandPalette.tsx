import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Coffee, Download, Keyboard, NotebookPen, Palette, Play, Plus, Repeat, Search, Settings2 } from 'lucide-react';
import { addHabit, addTask, cycleTheme, exportData, setTaskDone } from '../actions';
import { useStore } from '../store';
import { setMode, toggleTimer } from '../timer';
import { Modal } from './ui';

type Command = { id: string; label: string; hint?: string; icon: ReactNode; run: () => void };

type Props = { onClose: () => void; onSettings: () => void; onHelp: () => void };

export function CommandPalette({ open, ...props }: Props & { open: boolean }) {
  return (
    <Modal open={open} onClose={props.onClose} title="Command palette" className="palette">
      <PaletteBody {...props} />
    </Modal>
  );
}

// Mounted only while open, so every open starts with a fresh query.
function PaletteBody({ onClose, onSettings, onHelp }: Props) {
  const { tasks, timer } = useStore();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const q = query.trim();
    const focusOn = (id: string) => () => setTimeout(() => document.getElementById(id)?.focus(), 50);
    const base: Command[] = [
      { id: 'timer', label: timer.running ? 'Pause timer' : 'Start focus timer', hint: 'F', icon: <Play size={16} />, run: toggleTimer },
      { id: 'break', label: 'Take a break', icon: <Coffee size={16} />, run: () => { setMode('break'); toggleTimer(); } },
      { id: 'notes', label: 'Write a note', hint: 'W', icon: <NotebookPen size={16} />, run: focusOn('notes-input') },
      { id: 'theme', label: 'Switch theme', hint: 'T', icon: <Palette size={16} />, run: cycleTheme },
      { id: 'settings', label: 'Open settings', icon: <Settings2 size={16} />, run: onSettings },
      { id: 'export', label: 'Export my data', icon: <Download size={16} />, run: exportData },
      { id: 'help', label: 'Keyboard shortcuts', hint: '?', icon: <Keyboard size={16} />, run: onHelp },
      ...tasks.filter((t) => !t.done).map((t) => ({
        id: `done-${t.id}`, label: `Complete: ${t.text}`, icon: <Circle size={16} />, run: () => setTaskDone(t.id, true),
      })),
    ];
    const matches = base.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));
    if (!q) return matches.slice(0, 9);
    return [
      { id: 'add-task', label: `Add task “${q}”`, hint: '↵', icon: <Plus size={16} />, run: () => addTask(q) },
      ...matches,
      { id: 'add-habit', label: `Add habit “${q}”`, icon: <Repeat size={16} />, run: () => addHabit(q) },
    ].slice(0, 10);
  }, [query, tasks, timer.running, onSettings, onHelp]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };

  return (
    <>
      <div className="palette-input">
        <Search size={18} />
        <input
          autoFocus
          value={query}
          placeholder="Type a task, a habit, or a command…"
          aria-label="Command"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, commands.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === 'Enter') { e.preventDefault(); run(commands[active]); }
          }}
        />
        <kbd>Esc</kbd>
      </div>
      <ul className="palette-list" role="listbox">
        {commands.map((c, i) => (
          <li key={c.id} role="option" aria-selected={i === active} onMouseMove={() => setActive(i)} onClick={() => run(c)}>
            {i === active && <motion.span layoutId="palette-hl" className="palette-hl" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} />}
            <span className="palette-icon">{c.icon}</span>
            <span className="palette-label">{c.label}</span>
            {c.hint && <kbd>{c.hint}</kbd>}
          </li>
        ))}
        {commands.length === 0 && (
          <li className="palette-empty"><CheckCircle2 size={16} /> Nothing matches.</li>
        )}
      </ul>
    </>
  );
}
