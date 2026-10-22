(() => {
  'use strict';

  const KEY = 'daylight:v1';
  const RING = 2 * Math.PI * 54;

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); };
  const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmtTime = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  const el = (tag, props = {}, ...children) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };

  // ---------- state ----------
  const defaults = () => ({
    tasks: [],   // { id, text, day, done, doneDay }
    habits: [],  // { id, name, log: { 'YYYY-MM-DD': true } }
    notes: {},   // { 'YYYY-MM-DD': text }
    focus: {},   // { 'YYYY-MM-DD': sessions }
    settings: { focusMin: 25, breakMin: 5, sound: true, theme: 'auto' },
    timer: { mode: 'focus', running: false, endAt: 0, remaining: 25 * 60 },
  });

  function normalize(raw) {
    const base = defaults();
    if (!raw || typeof raw !== 'object') return base;
    const obj = (v, fallback) => (v && typeof v === 'object' && !Array.isArray(v) ? v : fallback);
    return {
      tasks: Array.isArray(raw.tasks) ? raw.tasks.filter((t) => t && typeof t.text === 'string') : base.tasks,
      habits: Array.isArray(raw.habits) ? raw.habits.filter((h) => h && typeof h.name === 'string').map((h) => ({ ...h, log: obj(h.log, {}) })) : base.habits,
      notes: obj(raw.notes, base.notes),
      focus: obj(raw.focus, base.focus),
      settings: { ...base.settings, ...obj(raw.settings, {}) },
      timer: { ...base.timer, ...obj(raw.timer, {}) },
    };
  }

  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch { return defaults(); }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  }

  let state = load();
  let today = dayKey();
  let notesDay = today;

  // Done tasks older than 30 days are just clutter.
  const cutoff = addDays(today, -30);
  state.tasks = state.tasks.filter((t) => !t.done || !t.doneDay || t.doneDay >= cutoff);

  function commit() { save(); render(); }

  // ---------- header ----------
  function renderHeader() {
    const h = new Date().getHours();
    $('#greeting').textContent = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    $('#date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // ---------- tasks ----------
  const visibleTasks = () => state.tasks.filter((t) => !t.done || t.doneDay === today);

  function carriedLabel(day) {
    const n = daysBetween(day, today);
    return n === 1 ? 'from yesterday' : `from ${n} days ago`;
  }

  function editTask(task, span) {
    span.contentEditable = 'true';
    span.focus();
    getSelection().selectAllChildren(span);
    const finish = (keep) => {
      span.removeEventListener('blur', onBlur);
      span.removeEventListener('keydown', onKey);
      span.contentEditable = 'false';
      const text = span.textContent.trim();
      if (!keep) span.textContent = task.text;
      else if (!text) state.tasks = state.tasks.filter((t) => t !== task);
      else task.text = text.slice(0, 200);
      commit();
    };
    const onBlur = () => finish(true);
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    };
    span.addEventListener('blur', onBlur);
    span.addEventListener('keydown', onKey);
  }

  function renderTasks() {
    const tasks = visibleTasks();
    const sorted = [...tasks.filter((t) => !t.done), ...tasks.filter((t) => t.done)];
    const list = $('#task-list');
    list.replaceChildren(...sorted.map((t) => {
      const cb = el('input', { type: 'checkbox', checked: t.done, ariaLabel: 'Mark done' });
      cb.addEventListener('change', () => {
        t.done = cb.checked;
        t.doneDay = cb.checked ? today : null;
        commit();
      });
      const text = el('span', { className: 'task-text', textContent: t.text, title: 'Double-click to edit' });
      text.addEventListener('dblclick', () => editTask(t, text));
      const del = el('button', { className: 'icon-btn small del', textContent: '×', ariaLabel: 'Delete task', title: 'Delete' });
      del.addEventListener('click', () => { state.tasks = state.tasks.filter((x) => x !== t); commit(); });
      const li = el('li', { className: 'task' + (t.done ? ' done' : '') }, el('label', { className: 'check' }, cb), text);
      if (!t.done && t.day < today) li.append(el('span', { className: 'badge', textContent: carriedLabel(t.day) }));
      li.append(del);
      return li;
    }));
    $('#task-empty').hidden = tasks.length > 0;
    $('#clear-done').hidden = !tasks.some((t) => t.done);

    const done = tasks.filter((t) => t.done).length;
    $('#progress-text').textContent = tasks.length && done === tasks.length ? 'All done ✨' : `${done} / ${tasks.length} done`;
    $('#progress-bar').style.width = tasks.length ? `${(done / tasks.length) * 100}%` : '0';
  }

  $('#task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#task-input');
    const text = input.value.trim();
    if (!text) return;
    state.tasks.push({ id: uid(), text, day: today, done: false, doneDay: null });
    input.value = '';
    commit();
  });

  $('#clear-done').addEventListener('click', () => {
    state.tasks = state.tasks.filter((t) => !t.done);
    commit();
  });

  // ---------- habits ----------
  function streak(habit) {
    let k = habit.log[today] ? today : addDays(today, -1);
    let n = 0;
    while (habit.log[k]) { n++; k = addDays(k, -1); }
    return n;
  }

  function renderHabits() {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    const head = $('#habit-head');
    head.replaceChildren(
      el('span'),
      ...days.map((k) => el('span', {
        className: k === today ? 'today' : '',
        textContent: parseDay(k).toLocaleDateString(undefined, { weekday: 'narrow' }),
      })),
      el('span', { textContent: 'streak' }),
      el('span'),
    );
    head.hidden = state.habits.length === 0;
    $('#habit-empty').hidden = state.habits.length > 0;

    $('#habit-list').replaceChildren(...state.habits.map((h) => {
      const cells = days.map((k) => {
        const label = parseDay(k).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        const cell = el('button', {
          className: 'cell' + (h.log[k] ? ' on' : '') + (k === today ? ' today' : ''),
          title: label,
          ariaLabel: `${h.name}, ${label}`,
          ariaPressed: String(!!h.log[k]),
        });
        cell.addEventListener('click', () => {
          if (h.log[k]) delete h.log[k]; else h.log[k] = true;
          commit();
        });
        return cell;
      });
      const s = streak(h);
      const del = el('button', { className: 'icon-btn small del', textContent: '×', ariaLabel: `Delete habit ${h.name}`, title: 'Delete' });
      del.addEventListener('click', () => {
        if (!confirm(`Delete habit "${h.name}" and its history?`)) return;
        state.habits = state.habits.filter((x) => x !== h);
        commit();
      });
      return el('li', { className: 'habit-row' },
        el('span', { className: 'habit-name', textContent: h.name, title: h.name }),
        ...cells,
        el('span', { className: 'streak', textContent: s ? `🔥 ${s}` : '–' }),
        del,
      );
    }));
  }

  $('#habit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#habit-input');
    const name = input.value.trim();
    if (!name) return;
    state.habits.push({ id: uid(), name, log: {} });
    input.value = '';
    commit();
  });

  // ---------- notes ----------
  const notesEl = $('#notes');
  const notesDayEl = $('#notes-day');
  let notesTimer;

  function renderNotes() {
    const days = new Set(Object.keys(state.notes).filter((k) => state.notes[k].trim()));
    days.add(today);
    days.add(notesDay);
    notesDayEl.replaceChildren(...[...days].sort().reverse().map((k) => el('option', {
      value: k,
      textContent: k === today ? 'Today' : parseDay(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      selected: k === notesDay,
    })));
    // Never clobber what the user is typing.
    if (document.activeElement !== notesEl) notesEl.value = state.notes[notesDay] || '';
  }

  notesEl.addEventListener('input', () => {
    clearTimeout(notesTimer);
    notesTimer = setTimeout(() => {
      if (notesEl.value.trim()) state.notes[notesDay] = notesEl.value;
      else delete state.notes[notesDay];
      save();
    }, 300);
  });

  notesDayEl.addEventListener('change', () => {
    notesDay = notesDayEl.value;
    notesEl.value = state.notes[notesDay] || '';
    renderNotes();
  });

  // ---------- focus timer ----------
  const durationFor = (mode) => (mode === 'focus' ? state.settings.focusMin : state.settings.breakMin) * 60;
  const remaining = () => {
    const t = state.timer;
    return t.running ? Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000)) : t.remaining;
  };

  function renderTimer() {
    const t = state.timer;
    const left = remaining();
    const total = durationFor(t.mode) || 1;
    $('#timer-display').textContent = fmtTime(left);
    $('#timer-mode').textContent = t.mode === 'focus' ? 'Focus' : 'Break';
    $('#timer-toggle').textContent = t.running ? 'Pause' : left < total ? 'Resume' : 'Start';
    $('.focus').classList.toggle('on-break', t.mode === 'break');
    const ring = $('#ring-fill');
    ring.style.strokeDasharray = RING;
    ring.style.strokeDashoffset = RING * (1 - Math.min(1, left / total));
    const n = state.focus[today] || 0;
    $('#focus-count').textContent = n ? `${n} session${n === 1 ? '' : 's'} today` : '';
    document.title = t.running ? `${fmtTime(left)} · ${t.mode === 'focus' ? 'Focus' : 'Break'}` : 'Daylight';
  }

  function setMode(mode) {
    Object.assign(state.timer, { mode, running: false, endAt: 0, remaining: durationFor(mode) });
  }

  function toggleTimer() {
    const t = state.timer;
    if (t.running) {
      t.remaining = remaining();
      t.running = false;
    } else {
      t.endAt = Date.now() + t.remaining * 1000;
      t.running = true;
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
      unlockAudio();
    }
    save();
    renderTimer();
  }

  function finishTimer() {
    // Another tab may have already finished this same session.
    const fresh = load();
    if (!fresh.timer.running || fresh.timer.endAt !== state.timer.endAt) {
      state = fresh;
      render();
      return;
    }
    const was = state.timer.mode;
    if (was === 'focus') state.focus[today] = (state.focus[today] || 0) + 1;
    setMode(was === 'focus' ? 'break' : 'focus');
    save();
    renderTimer();
    announce(was === 'focus' ? 'Focus session done — take a break.' : 'Break over — ready to focus?');
  }

  let audioCtx;
  function unlockAudio() {
    try { audioCtx = audioCtx || new AudioContext(); audioCtx.resume(); } catch { /* no audio */ }
  }

  function chime() {
    if (!state.settings.sound || !audioCtx) return;
    const now = audioCtx.currentTime;
    [660, 880, 990].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.5);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.55);
    });
  }

  function announce(message) {
    chime();
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification('Daylight', { body: message, icon: 'icon.svg' });
    }
  }

  $('#timer-toggle').addEventListener('click', toggleTimer);
  $('#timer-reset').addEventListener('click', () => { setMode(state.timer.mode); save(); renderTimer(); });
  $('#timer-skip').addEventListener('click', () => { setMode(state.timer.mode === 'focus' ? 'break' : 'focus'); save(); renderTimer(); });

  setInterval(() => {
    if (state.timer.running) {
      if (remaining() <= 0) finishTimer();
      else renderTimer();
    }
    if (dayKey() !== today) {
      if (notesDay === today) notesDay = dayKey();
      today = dayKey();
      render();
    }
  }, 250);

  // ---------- theme ----------
  const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const THEME_ICONS = {
    auto: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
    light: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    dark: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  };

  function applyTheme() {
    const theme = state.settings.theme;
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    const btn = $('#theme-btn');
    btn.title = `Theme: ${theme} (t)`;
    btn.innerHTML = THEME_ICONS[theme];
  }

  function cycleTheme() {
    const order = ['auto', 'light', 'dark'];
    state.settings.theme = order[(order.indexOf(state.settings.theme) + 1) % order.length];
    commit();
  }

  $('#theme-btn').addEventListener('click', cycleTheme);

  // ---------- settings & data ----------
  const settingsDlg = $('#settings');
  const helpDlg = $('#help');

  $('#settings-btn').addEventListener('click', () => {
    $('#set-focus').value = state.settings.focusMin;
    $('#set-break').value = state.settings.breakMin;
    $('#set-sound').checked = state.settings.sound;
    settingsDlg.showModal();
  });

  function updateDuration(key, input, max) {
    const v = Math.round(Number(input.value));
    if (!(v >= 1 && v <= max)) return;
    state.settings[key] = v;
    if (!state.timer.running) setMode(state.timer.mode);
    commit();
  }
  $('#set-focus').addEventListener('change', (e) => updateDuration('focusMin', e.target, 180));
  $('#set-break').addEventListener('change', (e) => updateDuration('breakMin', e.target, 60));
  $('#set-sound').addEventListener('change', (e) => { state.settings.sound = e.target.checked; commit(); });

  $('#export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `daylight-${today}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('#import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.tasks)) throw new Error('not a Daylight export');
      if (!confirm('Replace everything here with the imported data?')) return;
      state = normalize(data);
      commit();
    } catch (err) {
      alert(`Could not import: ${err.message}`);
    }
  });

  $('#reset-btn').addEventListener('click', () => {
    if (!confirm('Erase all tasks, habits, notes and settings? This cannot be undone.')) return;
    state = defaults();
    notesDay = today;
    notesEl.value = '';
    commit();
  });

  $('#help-btn').addEventListener('click', () => helpDlg.showModal());

  // ---------- keyboard ----------
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable;
    if (typing) {
      if (e.key === 'Escape' && !t.isContentEditable) t.blur();
      return;
    }
    if (document.querySelector('dialog[open]')) return;
    const actions = {
      n: () => $('#task-input').focus(),
      h: () => $('#habit-input').focus(),
      w: () => notesEl.focus(),
      f: toggleTimer,
      t: cycleTheme,
      '?': () => helpDlg.showModal(),
    };
    if (actions[e.key]) { e.preventDefault(); actions[e.key](); }
  });

  // ---------- sync & boot ----------
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = load();
    render();
  });

  function render() {
    renderHeader();
    renderTasks();
    renderHabits();
    renderNotes();
    renderTimer();
    applyTheme();
  }

  save();
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
