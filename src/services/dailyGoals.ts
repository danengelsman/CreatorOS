import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface DailyGoalTask {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface DailyGoalsState {
  date: string; // YYYY-MM-DD
  tasks: DailyGoalTask[];
  streak: number;
  lastCompletedDate?: string; // YYYY-MM-DD when all tasks were 100% finished
}

export const DEFAULT_GOAL_SUGGESTIONS = [
  'Read industry news',
  'Comment on 5 posts',
  'Draft 3 hook variations',
  'Analyze 1 competitor video',
  'Engage with 3 creators in your niche'
];

export const INITIAL_DEFAULT_TASKS: DailyGoalTask[] = [
  {
    id: 'task-1',
    text: 'Read industry news',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-2',
    text: 'Comment on 5 posts',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-3',
    text: 'Draft 3 hook variations',
    completed: false,
    createdAt: new Date().toISOString()
  }
];

const LOCAL_STORAGE_KEY = 'creator_os_daily_goals';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDailyGoals(): DailyGoalsState {
  const today = getTodayDateString();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed: DailyGoalsState = JSON.parse(raw);
      // If recorded on a previous day, rollover the checklist
      if (parsed.date !== today) {
        const wasYesterday = parsed.date === getYesterdayDateString();
        const allCompletedYesterday = parsed.tasks.length > 0 && parsed.tasks.every(t => t.completed);
        const streak = (wasYesterday && allCompletedYesterday) ? (parsed.streak || 0) : (parsed.lastCompletedDate === getYesterdayDateString() ? parsed.streak : 0);
        
        const rolledOver: DailyGoalsState = {
          date: today,
          tasks: parsed.tasks.map(t => ({ ...t, completed: false, completedAt: undefined })),
          streak,
          lastCompletedDate: parsed.lastCompletedDate
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rolledOver));
        return rolledOver;
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse local daily goals:', e);
  }

  const initial: DailyGoalsState = {
    date: today,
    tasks: INITIAL_DEFAULTTasksCopy(),
    streak: 0
  };
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

function INITIAL_DEFAULTTasksCopy(): DailyGoalTask[] {
  return INITIAL_DEFAULT_TASKS.map(t => ({ ...t, id: 'task-' + Math.random().toString(36).substring(2, 9) }));
}

export function saveLocalDailyGoals(state: DailyGoalsState): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save daily goals locally:', e);
  }
}

export async function fetchDailyGoalsFromCloud(userId: string): Promise<DailyGoalsState> {
  const today = getTodayDateString();
  const local = getLocalDailyGoals();

  try {
    const prefRef = doc(db, 'preferences', userId);
    const prefSnap = await getDoc(prefRef);
    if (prefSnap.exists()) {
      const data = prefSnap.data();
      if (data?.dailyGoals) {
        const cloudState = data.dailyGoals as DailyGoalsState;
        if (cloudState.date !== today) {
          // Rollover day logic
          const wasYesterday = cloudState.date === getYesterdayDateString();
          const allCompletedYesterday = cloudState.tasks.length > 0 && cloudState.tasks.every(t => t.completed);
          const streak = (wasYesterday && allCompletedYesterday) ? (cloudState.streak || 0) : (cloudState.lastCompletedDate === getYesterdayDateString() ? cloudState.streak : 0);
          
          const rolledOver: DailyGoalsState = {
            date: today,
            tasks: (cloudState.tasks || []).map(t => ({ ...t, completed: false, completedAt: undefined })),
            streak,
            lastCompletedDate: cloudState.lastCompletedDate
          };
          saveLocalDailyGoals(rolledOver);
          // Persist rollover
          await setDoc(prefRef, { dailyGoals: rolledOver }, { merge: true });
          return rolledOver;
        }

        saveLocalDailyGoals(cloudState);
        return cloudState;
      }
    }
  } catch (err) {
    console.warn('Firestore load daily goals fallback to local:', err);
  }

  return local;
}

export async function syncDailyGoalsToCloud(userId: string | undefined, state: DailyGoalsState): Promise<void> {
  saveLocalDailyGoals(state);
  if (!userId) return;

  try {
    const prefRef = doc(db, 'preferences', userId);
    await setDoc(prefRef, { dailyGoals: state }, { merge: true });
  } catch (err) {
    console.warn('Failed syncing daily goals to Firestore:', err);
  }
}
