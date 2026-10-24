import { useRef } from 'react';
import { motion } from 'motion/react';
import { Download, Minus, Monitor, Moon, Plus, Sun, Trash2, Upload } from 'lucide-react';
import { exportData } from '../actions';
import { isMac } from '../hooks';
import { defaults, normalize, replace, update, useStore, type Theme } from '../store';
import { setDuration } from '../timer';
import { toast } from '../toast';
import { Modal, ModalHeader, Segmented } from './ui';

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="stepper" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - (value > 5 ? 5 : 1)))} aria-label={`Less ${label}`}><Minus size={14} /></button>
      <span>{value}<small> min</small></span>
      <button type="button" onClick={() => onChange(Math.min(max, value + (value >= 5 ? 5 : 1)))} aria-label={`More ${label}`}><Plus size={14} /></button>
    </div>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings } = useStore();
  const file = useRef<HTMLInputElement>(null);

  const importFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.tasks)) throw new Error('that file isn’t a Daylight export');
      if (!confirm('Replace everything here with the imported data?')) return;
      replace(normalize(data));
      toast({ message: 'Data imported' });
    } catch (err) {
      toast({ message: `Couldn’t import: ${(err as Error).message}` });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <ModalHeader title="Settings" onClose={onClose} />

      <section className="settings-group">
        <h3>Timer</h3>
        <div className="setting">
          <span>Focus length</span>
          <Stepper label="focus minutes" value={settings.focusMin} min={1} max={180} onChange={(v) => setDuration('focusMin', v)} />
        </div>
        <div className="setting">
          <span>Break length</span>
          <Stepper label="break minutes" value={settings.breakMin} min={1} max={60} onChange={(v) => setDuration('breakMin', v)} />
        </div>
        <div className="setting">
          <span>Chime when a session ends</span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.sound}
            className={`switch ${settings.sound ? 'on' : ''}`}
            onClick={() => update((s) => void (s.settings.sound = !s.settings.sound))}
          >
            <motion.span layout transition={{ type: 'spring', bounce: 0.3, duration: 0.35 }} />
          </button>
        </div>
      </section>

      <section className="settings-group">
        <h3>Appearance</h3>
        <Segmented<Theme>
          label="Theme"
          value={settings.theme}
          onChange={(theme) => update((s) => void (s.settings.theme = theme))}
          options={[
            { value: 'auto', label: <><Monitor size={14} /> Auto</> },
            { value: 'light', label: <><Sun size={14} /> Light</> },
            { value: 'dark', label: <><Moon size={14} /> Dark</> },
          ]}
        />
      </section>

      <section className="settings-group">
        <h3>Your data</h3>
        <p className="muted small">Everything lives in this browser only. Export a backup or move it to another device.</p>
        <div className="btn-row">
          <button className="btn" onClick={exportData}><Download size={15} /> Export</button>
          <button className="btn" onClick={() => file.current?.click()}><Upload size={15} /> Import</button>
          <button
            className="btn danger"
            onClick={() => {
              if (!confirm('Erase all tasks, habits, notes and settings? This cannot be undone.')) return;
              replace(defaults());
              toast({ message: 'All data erased' });
            }}
          >
            <Trash2 size={15} /> Erase all
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void importFile(f);
          }} />
        </div>
      </section>
    </Modal>
  );
}

const KEYS: [string, string][] = [
  [`${isMac ? '⌘' : 'Ctrl'} K`, 'Command palette'],
  ['N', 'New task'],
  ['H', 'New habit'],
  ['W', 'Write notes'],
  ['F', 'Start / pause focus timer'],
  ['T', 'Cycle theme'],
  ['Esc', 'Leave a field or close'],
  ['?', 'This help'],
];

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <ModalHeader title="Keyboard shortcuts" onClose={onClose} />
      <dl className="keys">
        {KEYS.map(([k, v]) => (
          <div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>
        ))}
      </dl>
      <p className="muted small">Drag tasks by their handle to reorder. Double-click a task to edit it. Unfinished tasks roll over to tomorrow on their own.</p>
    </Modal>
  );
}
