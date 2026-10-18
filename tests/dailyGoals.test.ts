// F4.4 — Daily-goal rollover logic tests (src/services/dailyGoals.ts).
// Firestore (firebase/firestore + src/firebase) mocked at the module boundary;
// localStorage stubbed globally; the clock is faked so "today/yesterday" is
// deterministic. No real Firebase, no network.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type DailyGoalsState,
  fetchDailyGoalsFromCloud,
  getLocalDailyGoals,
  getTodayDateString,
  getYesterdayDateString,
  saveLocalDailyGoals,
  syncDailyGoalsToCloud,
} from '../src/services/dailyGoals';

const ff = vi.hoisted(() => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ff);

vi.mock('../src/firebase', () => ({
  db: {},
}));

// Fake "now": Saturday 2026-10-17, 10:00 local time.
const NOW = new Date(2026, 9, 17, 10, 0, 0);
const TODAY = '2026-10-17';
const YESTERDAY = '2026-10-16';
const TWO_DAYS_AGO = '2026-10-15';

function localStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

function goalsState(
  date: string,
  completedFlags: boolean[],
  streak = 0,
  lastCompletedDate?: string,
): DailyGoalsState {
  return {
    date,
    tasks: completedFlags.map((completed, i) => ({
      id: `task-${i + 1}`,
      text: `Task ${i + 1}`,
      completed,
      createdAt: '2026-10-01T00:00:00.000Z',
      ...(completed ? { completedAt: `${date}T20:00:00.000Z` } : {}),
    })),
    streak,
    ...(lastCompletedDate ? { lastCompletedDate } : {}),
  };
}

function storedRaw(): string | null {
  return localStorage.getItem('creator_os_daily_goals');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubGlobal('localStorage', localStorageStub());
  ff.getDoc.mockReset();
  ff.setDoc.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('date helpers', () => {
  it('formats today as local YYYY-MM-DD', () => {
    expect(getTodayDateString()).toBe(TODAY);
  });

  it('formats yesterday as local YYYY-MM-DD', () => {
    expect(getYesterdayDateString()).toBe(YESTERDAY);
  });
});

describe('getLocalDailyGoals — fresh state', () => {
  it('returns the 3 default tasks with streak 0 and persists them', () => {
    const state = getLocalDailyGoals();

    expect(state.date).toBe(TODAY);
    expect(state.streak).toBe(0);
    expect(state.tasks.map((t) => t.completed)).toEqual([false, false, false]);
    expect(storedRaw()).not.toBeNull();
    expect(JSON.parse(storedRaw() as string).tasks).toHaveLength(3);
  });
});

describe('getLocalDailyGoals — same-day read', () => {
  it("returns today's stored state untouched", () => {
    const stored = goalsState(TODAY, [true, false, true], 7);
    saveLocalDailyGoals(stored);

    const state = getLocalDailyGoals();

    expect(state).toEqual(stored);
    expect(state.streak).toBe(7);
  });
});

describe('getLocalDailyGoals — day rollover', () => {
  it('rolls over from yesterday with all tasks completed: streak preserved, tasks reset', () => {
    saveLocalDailyGoals(goalsState(YESTERDAY, [true, true, true], 4));

    const state = getLocalDailyGoals();

    expect(state.date).toBe(TODAY);
    expect(state.streak).toBe(4);
    expect(state.tasks.every((t) => !t.completed && t.completedAt === undefined)).toBe(true);
    expect(state.lastCompletedDate).toBeUndefined();
    // Rolled-over state is persisted.
    expect(JSON.parse(storedRaw() as string).date).toBe(TODAY);
  });

  it('rolls over from yesterday with unfinished tasks: streak resets to 0', () => {
    saveLocalDailyGoals(goalsState(YESTERDAY, [true, false, false], 4));

    const state = getLocalDailyGoals();

    expect(state.date).toBe(TODAY);
    expect(state.streak).toBe(0);
  });

  it('keeps the streak when lastCompletedDate is yesterday even with unfinished tasks', () => {
    saveLocalDailyGoals(goalsState(YESTERDAY, [false, false, false], 4, YESTERDAY));

    const state = getLocalDailyGoals();

    expect(state.streak).toBe(4);
  });

  it('breaks the streak when the stored day is older than yesterday', () => {
    saveLocalDailyGoals(goalsState(TWO_DAYS_AGO, [true, true, true], 4, TWO_DAYS_AGO));

    const state = getLocalDailyGoals();

    expect(state.date).toBe(TODAY);
    expect(state.streak).toBe(0);
  });
});

describe('fetchDailyGoalsFromCloud', () => {
  it('returns the cloud state unchanged when it is already today and caches it locally', async () => {
    const cloud = goalsState(TODAY, [true, false, true], 9);
    ff.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ dailyGoals: cloud }) });

    const state = await fetchDailyGoalsFromCloud('user-1');

    expect(state).toEqual(cloud);
    expect(JSON.parse(storedRaw() as string).streak).toBe(9);
    expect(ff.setDoc).not.toHaveBeenCalled();
  });

  it('rolls over an old cloud state and persists the rollover to Firestore', async () => {
    const cloud = goalsState(YESTERDAY, [true, true, true], 2);
    ff.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ dailyGoals: cloud }) });

    const state = await fetchDailyGoalsFromCloud('user-1');

    expect(state.date).toBe(TODAY);
    expect(state.streak).toBe(2);
    expect(state.tasks.every((t) => !t.completed)).toBe(true);
    expect(ff.setDoc).toHaveBeenCalledTimes(1);
    const [, written] = ff.setDoc.mock.calls[0];
    expect(written.dailyGoals.date).toBe(TODAY);
    expect(written.dailyGoals.streak).toBe(2);
  });

  it('falls back to the rolled local state when Firestore errors', async () => {
    saveLocalDailyGoals(goalsState(YESTERDAY, [true, true, true], 3));
    ff.getDoc.mockRejectedValue(new Error('offline'));

    const state = await fetchDailyGoalsFromCloud('user-1');

    expect(state.date).toBe(TODAY);
    expect(state.streak).toBe(3);
  });

  it('falls back to local when the cloud doc has no dailyGoals field', async () => {
    ff.getDoc.mockResolvedValue({ exists: () => true, data: () => ({}) });

    const state = await fetchDailyGoalsFromCloud('user-1');

    expect(state.date).toBe(TODAY);
    expect(state.tasks).toHaveLength(3);
    expect(ff.setDoc).not.toHaveBeenCalled();
  });
});

describe('syncDailyGoalsToCloud', () => {
  it('saves locally and skips Firestore when signed out', async () => {
    const state = goalsState(TODAY, [true], 1);

    await syncDailyGoalsToCloud(undefined, state);

    expect(JSON.parse(storedRaw() as string).streak).toBe(1);
    expect(ff.setDoc).not.toHaveBeenCalled();
  });

  it('saves locally and writes to Firestore when signed in', async () => {
    const state = goalsState(TODAY, [true, true], 5);

    await syncDailyGoalsToCloud('user-1', state);

    expect(JSON.parse(storedRaw() as string).streak).toBe(5);
    expect(ff.setDoc).toHaveBeenCalledWith({}, { dailyGoals: state }, { merge: true });
  });
});
