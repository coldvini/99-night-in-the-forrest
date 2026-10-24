import { describe, expect, it } from 'vitest';
import { defaults, normalize } from './store';

describe('normalize', () => {
  it('returns defaults for junk', () => {
    expect(normalize(null)).toEqual(defaults());
    expect(normalize('nope')).toEqual(defaults());
  });

  it('reads Daylight 1.x data unchanged', () => {
    const v1 = {
      tasks: [{ id: 'a', text: 'Ship it', day: '2026-10-22', done: false, doneDay: null }],
      habits: [{ id: 'h', name: 'Walk', log: { '2026-10-22': true } }],
      notes: { '2026-10-22': 'hi' },
      focus: { '2026-10-22': 3 },
      settings: { focusMin: 50, breakMin: 10, sound: false, theme: 'dark' },
      timer: { mode: 'break', running: false, endAt: 0, remaining: 600 },
    };
    const s = normalize(v1);
    expect(s.tasks).toEqual(v1.tasks);
    expect(s.habits).toEqual(v1.habits);
    expect(s.settings).toEqual(v1.settings);
    expect(s.timer).toEqual({ ...v1.timer, taskId: null });
  });

  it('drops malformed items and fills missing fields', () => {
    const s = normalize({ tasks: [{ text: 'ok' }, { nope: 1 }, 'x'], habits: [{ name: 'Read', log: 'bad' }] });
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0]).toMatchObject({ text: 'ok', done: false, doneDay: null });
    expect(typeof s.tasks[0].id).toBe('string');
    expect(s.habits[0].log).toEqual({});
  });
});
