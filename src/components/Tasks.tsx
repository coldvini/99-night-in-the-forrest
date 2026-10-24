import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { ChevronDown, GripVertical, ListChecks, Plus, Sparkles, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { addTask, clearDone, deleteTask, editTask, reorderOpen, setTaskDone } from '../actions';
import { useToday } from '../hooks';
import { daysBetween } from '../lib/date';
import { getState, useStore, type Task } from '../store';
import { Card, Check } from './ui';

const rowMotion = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2 } },
  transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] },
} as const;

function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#ff7a45', '#ff4d8d', '#ffd166', '#34d399', '#60a5fa'];
  confetti({ particleCount: 90, spread: 75, origin: { x: 0.3, y: 0.35 }, colors, scalar: 0.9 });
  setTimeout(() => confetti({ particleCount: 60, spread: 90, origin: { x: 0.5, y: 0.3 }, colors }), 160);
}

function complete(task: Task, today: string) {
  setTaskDone(task.id, !task.done);
  const visible = getState().tasks.filter((t) => !t.done || t.doneDay === today);
  if (!task.done && visible.length > 0 && visible.every((t) => t.done)) celebrate();
}

function TaskBody({ task, today, handle }: { task: Task; today: string; handle?: ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [checked, setChecked] = useState(task.done);
  const age = daysBetween(task.day, today);
  useEffect(() => setChecked(task.done), [task.done]);

  const toggle = () => {
    // Let the checkmark draw before the row moves to the other list.
    setChecked(!task.done);
    setTimeout(() => complete(task, today), 260);
  };

  const save = (value: string) => {
    setEditing(false);
    const text = value.trim();
    if (!text) deleteTask(task.id);
    else if (text !== task.text) editTask(task.id, text);
  };

  return (
    <div className={`task ${checked ? 'done' : ''}`}>
      {handle}
      <Check checked={checked} onToggle={toggle} label={`Mark “${task.text}” ${task.done ? 'not done' : 'done'}`} />
      {editing ? (
        <input
          className="task-edit"
          defaultValue={task.text}
          autoFocus
          maxLength={200}
          aria-label="Edit task"
          onBlur={(e) => save(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <span className="task-text" onDoubleClick={() => setEditing(true)} title="Double-click to edit">
          {task.text}
        </span>
      )}
      {!task.done && age > 0 && <span className="badge">{age === 1 ? 'from yesterday' : `${age} days old`}</span>}
      <button className="icon-btn ghost small row-action" onClick={() => deleteTask(task.id)} aria-label={`Delete “${task.text}”`} title="Delete">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function OpenTask({ task, today }: { task: Task; today: string }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={task.id} dragListener={false} dragControls={controls} className="task-li" {...rowMotion}
      whileDrag={{ scale: 1.02, boxShadow: '0 12px 32px -8px rgba(0,0,0,.25)', zIndex: 2, backgroundColor: 'var(--glass-strong)' }}>
      <TaskBody
        task={task}
        today={today}
        handle={
          <span className="grip" onPointerDown={(e) => controls.start(e)} aria-hidden="true" title="Drag to reorder">
            <GripVertical size={16} />
          </span>
        }
      />
    </Reorder.Item>
  );
}

export function Tasks() {
  const { tasks } = useStore();
  const today = useToday();
  const [text, setText] = useState('');
  const [showDone, setShowDone] = useState(true);
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done && t.doneDay === today);
  const total = open.length + done.length;

  return (
    <Card className="tasks" title="Today" icon={<ListChecks size={16} />} delay={0.05}
      extra={total > 0 && <span className="pill">{done.length}/{total}</span>}>
      <form
        className="add"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          addTask(text.trim());
          setText('');
        }}
      >
        <Plus size={18} className="add-icon" />
        <input id="task-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task and press Enter" maxLength={200} autoComplete="off" aria-label="New task" />
        <kbd>N</kbd>
      </form>

      <Reorder.Group axis="y" values={open.map((t) => t.id)} onReorder={reorderOpen} className="task-list">
        <AnimatePresence initial={false}>
          {open.map((t) => <OpenTask key={t.id} task={t} today={today} />)}
        </AnimatePresence>
      </Reorder.Group>

      <AnimatePresence>
        {total === 0 && (
          <motion.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Sparkles size={22} />
            <p>A fresh start. What’s one thing that would make today great?</p>
          </motion.div>
        )}
        {open.length === 0 && done.length > 0 && (
          <motion.div className="all-done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            🎉 Everything’s done. Enjoy the rest of your day.
          </motion.div>
        )}
      </AnimatePresence>

      {done.length > 0 && (
        <div className="done-section">
          <div className="done-head">
            <button className="link-btn" onClick={() => setShowDone(!showDone)} aria-expanded={showDone}>
              <motion.span animate={{ rotate: showDone ? 0 : -90 }} className="chev"><ChevronDown size={14} /></motion.span>
              Completed · {done.length}
            </button>
            <button className="link-btn" onClick={clearDone}>Clear</button>
          </div>
          <AnimatePresence initial={false}>
            {showDone && (
              <motion.ul className="task-list" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <AnimatePresence initial={false}>
                  {done.map((t) => (
                    <motion.li key={t.id} className="task-li" {...rowMotion}>
                      <TaskBody task={t} today={today} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
