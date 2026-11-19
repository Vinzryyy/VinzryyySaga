import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MonthCalendar from '../MonthCalendar';

const events = [
  { kind: 'SHOW', code: 'A', title: 'Show Malam', date: '2026-11-20T19:00:00+07:00', start_time: '19:00', team: 'DREAM' },
  { kind: 'EXCLUSIVE', code: 'B', category: 'TWO_SHOT', title: '2Shot Sesi 1', date: '2026-11-20T13:00:00+07:00', start_time: '13:00' },
  { kind: 'SHOW', code: 'C', title: 'Show Desember', date: '2026-12-05T19:00:00+07:00', start_time: '19:00' },
];

const renderCal = () =>
  render(<MonthCalendar events={events} renderEvent={(e) => <span>{e.title}</span>} />);

describe('MonthCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-19T05:00:00Z')); // 19 Nov 2026, 12:00 WIB
  });
  afterEach(() => vi.useRealTimers());

  it('opens on the current month and auto-selects the next day with events', () => {
    renderCal();
    expect(screen.getByRole('heading', { level: 2 }).textContent.toLowerCase()).toContain('november 2026');
    // Day panel lists both 20 Nov events, sorted by start time.
    const titles = screen.getAllByText(/2Shot Sesi 1|Show Malam/).map((n) => n.textContent);
    expect(titles).toEqual(['2Shot Sesi 1', 'Show Malam']);
  });

  it('labels days with event counts and marks today', () => {
    renderCal();
    expect(screen.getByRole('button', { name: /20 November, 2 acara/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /19 November/i }).getAttribute('aria-current')).toBe('date');
  });

  it('navigates months within the event range only', () => {
    renderCal();
    const prev = screen.getByRole('button', { name: 'Bulan sebelumnya' });
    const next = screen.getByRole('button', { name: 'Bulan berikutnya' });
    expect(prev.disabled).toBe(true);
    fireEvent.click(next);
    expect(screen.getByRole('heading', { level: 2 }).textContent.toLowerCase()).toContain('desember 2026');
    expect(screen.getByText('Show Desember')).toBeTruthy();
    expect(next.disabled).toBe(true);
  });

  it('moves focus with arrow keys', () => {
    renderCal();
    const today = screen.getByRole('button', { name: /19 November/i });
    today.focus();
    fireEvent.keyDown(today, { key: 'ArrowRight' });
    expect(document.activeElement.getAttribute('data-day')).toBe('2026-11-20');
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' });
    expect(document.activeElement.getAttribute('data-day')).toBe('2026-11-27');
  });

  it('shows an empty state with no events', () => {
    render(<MonthCalendar events={[]} renderEvent={() => null} />);
    expect(screen.getByText('Belum ada jadwal bulan ini.')).toBeTruthy();
  });
});
