import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

const ease = [0.2, 0.8, 0.2, 1] as const;

export function Card({ title, icon, extra, className = '', delay = 0, children }: {
  title: string;
  icon: ReactNode;
  extra?: ReactNode;
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <motion.section
      className={`card ${className}`}
      aria-label={title}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease }}
    >
      <header className="card-head">
        <h2>
          <span className="card-icon">{icon}</span>
          {title}
        </h2>
        {extra}
      </header>
      {children}
    </motion.section>
  );
}

export function Check({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`check ${checked ? 'on' : ''}`}
      onClick={onToggle}
      whileTap={{ scale: 0.8 }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <motion.path
          d="M5.5 12.5l4 4L18.5 7.5"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </svg>
    </motion.button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.value === value && <motion.span layoutId={`seg-${label}`} className="seg-pill" transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }} />}
          <span className="seg-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, className = '' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} transition={{ duration: 0.15 }}>
          <motion.div
            className={`modal ${className}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="modal-head">
      <h2>{title}</h2>
      <button className="icon-btn ghost" onClick={onClose} aria-label="Close"><X size={18} /></button>
    </div>
  );
}
