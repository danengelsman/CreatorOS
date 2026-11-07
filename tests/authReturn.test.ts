import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthReturn,
  clearAuthReturnIfReached,
  pendingAuthReturn,
  rememberAuthReturn,
  safeAuthReturn,
} from '../src/lib/authReturn';

describe('safe auth return', () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([
    'https://evil.test/path',
    '//evil.test/path',
    '/\\evil.test',
    '/login',
    '/path\nheader',
    null,
    42,
  ])('rejects unsafe destination %s', (value) => {
    expect(safeAuthReturn(value)).toBeNull();
  });
  it('preserves the first route, query and hash until the exact destination is reached', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    rememberAuthReturn('/studio/project-1?inspector=planner#section');
    rememberAuthReturn('/dashboard');
    expect(pendingAuthReturn()).toBe('/studio/project-1?inspector=planner#section');
    clearAuthReturnIfReached('/dashboard');
    expect(pendingAuthReturn()).not.toBeNull();
    clearAuthReturnIfReached('/studio/project-1?inspector=planner#section');
    expect(pendingAuthReturn()).toBeNull();
  });
  it('falls back safely if session storage is inaccessible', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => rememberAuthReturn('/studio')).not.toThrow();
    expect(pendingAuthReturn()).toBeNull();
  });
  it('clears pending auth return explicitly', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    rememberAuthReturn('/studio/project-1');
    expect(pendingAuthReturn()).toBe('/studio/project-1');
    clearAuthReturn();
    expect(pendingAuthReturn()).toBeNull();
  });
  it('allows a specific deep link to update the return path', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    rememberAuthReturn('/studio');
    rememberAuthReturn('/studio/project-1?inspector=planner');
    expect(pendingAuthReturn()).toBe('/studio/project-1?inspector=planner');
  });
});
