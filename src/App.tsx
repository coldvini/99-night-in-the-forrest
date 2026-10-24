import { useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { cycleTheme } from './actions';
import { Background } from './components/Background';
import { CommandPalette } from './components/CommandPalette';
import { Focus } from './components/Focus';
import { Habits } from './components/Habits';
import { Header } from './components/Header';
import { Notes } from './components/Notes';
import { HelpModal, SettingsModal } from './components/Settings';
import { Tasks } from './components/Tasks';
import { Toaster } from './components/Toaster';
import { useNow } from './hooks';
import { phaseFor } from './lib/date';
import { getState, useStore } from './store';
import { finishTimer, toggleTimer } from './timer';

type Panel = 'palette' | 'settings' | 'help' | null;

export default function App() {
  const { settings } = useStore();
  const [panel, setPanel] = useState<Panel>(null);
  const close = useCallback(() => setPanel(null), []);
  const openSettings = useCallback(() => setPanel('settings'), []);
  const openHelp = useCallback(() => setPanel('help'), []);
  const minute = useNow(60_000);

  // Theme and time-of-day palette live on <html> so CSS can react to them.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.dataset.phase = phaseFor(new Date(minute).getHours());
  }, [minute]);

  // The timer finishes even when its card isn't re-rendering.
  useEffect(() => {
    const id = setInterval(() => {
      const t = getState().timer;
      if (t.running && t.endAt <= Date.now()) finishTimer();
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPanel((p) => (p === 'palette' ? null : 'palette'));
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || panel) return;
      const el = e.target as HTMLElement;
      if (el.matches('input, textarea, select, [contenteditable="true"]')) {
        if (e.key === 'Escape') el.blur();
        return;
      }
      const focus = (id: string) => () => document.getElementById(id)?.focus();
      const actions: Record<string, () => void> = {
        n: focus('task-input'),
        h: focus('habit-input'),
        w: focus('notes-input'),
        f: toggleTimer,
        t: cycleTheme,
        '/': () => setPanel('palette'),
        '?': () => setPanel('help'),
      };
      const action = actions[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        action();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  return (
    <MotionConfig reducedMotion="user">
      <Background />
      <div className="shell">
        <Header onPalette={() => setPanel('palette')} onSettings={openSettings} />
        <main className="grid">
          <Tasks />
          <Focus />
          <Habits />
          <Notes />
        </main>
        <footer className="foot muted">
          <span>Private by design. Everything stays in this browser.</span>
          <button className="link-btn" onClick={openHelp}>Keyboard shortcuts</button>
        </footer>
      </div>
      <CommandPalette open={panel === 'palette'} onClose={close} onSettings={openSettings} onHelp={openHelp} />
      <SettingsModal open={panel === 'settings'} onClose={close} />
      <HelpModal open={panel === 'help'} onClose={close} />
      <Toaster />
    </MotionConfig>
  );
}
