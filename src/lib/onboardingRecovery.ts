import type { OnboardingBrandKit } from './onboardingState';

export interface OnboardingRecovery {
  phase: 'welcome' | 'interview' | 'success';
  messages: { role: 'user' | 'assistant'; content: string }[];
  inputValue: string;
  summary: { niche: string; audience: string; vibe: string } | null;
  pendingKit: OnboardingBrandKit | null;
  pendingReply: boolean;
}

// In-memory fallback survives an auth transition, but not a reload or closed tab.
const memory = new Map<string, string>();
const key = (uid: string) => `creatoros:onboarding:${JSON.stringify(uid)}`;

function valid(value: any): value is OnboardingRecovery {
  return value && ['welcome', 'interview', 'success'].includes(value.phase) &&
    Array.isArray(value.messages) && value.messages.length <= 100 &&
    value.messages.every((m: any) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string') &&
    typeof value.inputValue === 'string' && typeof value.pendingReply === 'boolean' &&
    (value.summary === null || (value.summary && ['niche', 'audience', 'vibe'].every(k => typeof value.summary[k] === 'string'))) &&
    (value.pendingKit === null || (typeof value.pendingKit === 'object' && !Array.isArray(value.pendingKit)));
}

export function loadOnboardingRecovery(uid: string): OnboardingRecovery | null {
  let raw = memory.get(uid);
  if (!raw) {
    try { raw = sessionStorage.getItem(key(uid)) ?? undefined; } catch { /* no durable storage */ }
  }
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    return record.uid === uid && valid(record.draft) ? record.draft : null;
  } catch { return null; }
}

export function saveOnboardingRecovery(uid: string, draft: OnboardingRecovery): boolean {
  const raw = JSON.stringify({ uid, draft });
  memory.set(uid, raw);
  try {
    sessionStorage.setItem(key(uid), raw);
    return sessionStorage.getItem(key(uid)) === raw;
  } catch { return false; }
}

export function clearOnboardingRecovery(uid: string): void {
  memory.delete(uid);
  try { sessionStorage.removeItem(key(uid)); } catch { /* best effort */ }
}
