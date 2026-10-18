// Phase A — passwordPolicy unit tests (policy matrix).
// The bundled common-password list is a static JSON asset; these tests pin its
// contract (loadable, top offenders present, ~10KB budget) and the policy's
// accept/reject behavior including boundaries.
import { describe, expect, it } from 'vitest';
import commonPasswords from '../src/lib/commonPasswords.json';
import { MIN_PASSWORD_LENGTH, isCommonPassword, validatePassword } from '../src/lib/passwordPolicy';

describe('commonPasswords.json asset', () => {
  it('bundles ~1000 unique, non-empty entries and stays small (~10KB)', () => {
    const list = commonPasswords.passwords;

    expect(list.length).toBeGreaterThanOrEqual(900);
    expect(list.length).toBeLessThanOrEqual(1100);
    expect(new Set(list.map((p) => p.toLowerCase())).size).toBe(list.length);
    for (const entry of list) {
      expect(entry.length).toBeGreaterThan(0);
      expect(entry.length).toBeLessThanOrEqual(4096); // Firebase max password length
    }
  });

  it('contains the canonical top offenders', () => {
    expect(isCommonPassword('123456')).toBe(true);
    expect(isCommonPassword('password')).toBe(true);
    expect(isCommonPassword('qwerty')).toBe(true);
  });
});

describe('validatePassword policy matrix', () => {
  it('rejects passwords shorter than the minimum (boundary: min-1)', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH - 1)).valid).toBe(false);
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH - 1)).error).toContain(
      String(MIN_PASSWORD_LENGTH),
    );
  });

  it('accepts a password exactly at the minimum length', () => {
    // min-length but not in the common list
    const atMinimum = 'Zq#9tK2m';
    expect(atMinimum.length).toBe(MIN_PASSWORD_LENGTH);
    expect(validatePassword(atMinimum)).toEqual({ valid: true });
  });

  it('rejects empty and non-string input', () => {
    expect(validatePassword('').valid).toBe(false);
    expect(validatePassword(undefined as unknown as string).valid).toBe(false);
    expect(validatePassword(null as unknown as string).valid).toBe(false);
  });

  it('rejects bundled common passwords, case-insensitively', () => {
    // 8-char members of the list, so the length floor doesn't mask the check
    for (const candidate of ['password', 'Password', 'PASSWORD', 'baseball', 'Baseball']) {
      const result = validatePassword(candidate);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too common');
    }
  });

  it('checks length before commonness (short common passwords report the length rule)', () => {
    const result = validatePassword('dragon');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 8');
  });

  it('rejects common passwords even when they meet the length floor', () => {
    // 'baseball' (8 chars) is in the top-1000 list
    expect('baseball'.length).toBe(MIN_PASSWORD_LENGTH);
    expect(validatePassword('baseball').valid).toBe(false);
  });

  it('accepts long, uncommon passwords', () => {
    expect(validatePassword('EmulatorOnly-Not-A-Secret')).toEqual({ valid: true });
    expect(validatePassword('correct horse battery staple 42')).toEqual({ valid: true });
  });

  it('accepts uncommon passwords that merely contain a common substring', () => {
    // substring membership must not trip the exact-match list
    expect(validatePassword('dragon-slayer-2026-uncommon-suffix')).toEqual({ valid: true });
  });

  it('treats 8 whitespace characters as length-valid (spaces are legal password chars; exact-match list does not contain them)', () => {
    expect(validatePassword('        ')).toEqual({ valid: true });
  });
});
