import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, fmtTime, lastDays, phaseFor, streak } from './date';

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('counts days between, including across DST changes', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });

  it('lists the last n days oldest first', () => {
    expect(lastDays('2026-03-02', 3)).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
  });

  it('formats timer seconds', () => {
    expect(fmtTime(25 * 60)).toBe('25:00');
    expect(fmtTime(61)).toBe('01:01');
  });

  it('maps hours to phases', () => {
    expect([3, 7, 13, 19, 23].map(phaseFor)).toEqual(['night', 'dawn', 'day', 'dusk', 'night']);
  });
});

describe('streak', () => {
  const today = '2026-10-24';

  it('counts back from today when today is logged', () => {
    expect(streak({ '2026-10-24': true, '2026-10-23': true, '2026-10-21': true }, today)).toBe(2);
  });

  it('still counts yesterday’s streak before today is logged', () => {
    expect(streak({ '2026-10-23': true, '2026-10-22': true }, today)).toBe(2);
  });

  it('is zero after a missed day', () => {
    expect(streak({ '2026-10-22': true }, today)).toBe(0);
  });
});
