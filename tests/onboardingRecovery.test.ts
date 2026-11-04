import { describe, expect, it, vi, afterEach } from 'vitest';
import { loadOnboardingRecovery, saveOnboardingRecovery } from '../src/lib/onboardingRecovery';

afterEach(() => vi.unstubAllGlobals());

describe('onboarding recovery', () => {
  it('restores only the owning account and preserves the latest snapshot', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    const snapshot = {
      phase: 'interview' as const,
      messages: [{ role: 'user' as const, content: 'private answer' }],
      inputValue: 'next answer',
      summary: null,
      pendingKit: null,
      pendingReply: false,
    };
    expect(saveOnboardingRecovery('account-A', snapshot)).toBe(true);
    expect(loadOnboardingRecovery('account-A')).toEqual(snapshot);
    expect(loadOnboardingRecovery('account-B')).toBeNull();
  });
  it('signals storage failure but retains same-tab in-memory recovery', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw Error('blocked');
      },
      setItem: () => {
        throw Error('blocked');
      },
    });
    const snapshot = {
      phase: 'interview' as const,
      messages: [{ role: 'user' as const, content: 'unsaved' }],
      inputValue: '',
      summary: null,
      pendingKit: null,
      pendingReply: false,
    };
    expect(saveOnboardingRecovery('blocked-owner', snapshot)).toBe(false);
    expect(loadOnboardingRecovery('blocked-owner')).toEqual(snapshot);
    expect(loadOnboardingRecovery('other-owner')).toBeNull();
  });
});
