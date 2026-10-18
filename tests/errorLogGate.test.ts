// F4.7 — Unit tests for the client error-log budget (src/lib/errorLogGate.ts).
// Pure logic: no Firebase, no DOM, deterministic via the injected random source.
import { describe, expect, it } from 'vitest';
import {
  createErrorLogGate,
  DEFAULT_ERROR_LOG_SAMPLE_RATE,
  DEFAULT_MAX_ERROR_LOGS_PER_SESSION,
} from '../src/lib/errorLogGate';

describe('createErrorLogGate', () => {
  it('admits the first occurrence and dedupes identical fingerprints', () => {
    const gate = createErrorLogGate({ random: () => 0 });

    expect(gate.shouldLog('boom')).toBe(true);
    expect(gate.shouldLog('boom')).toBe(false);
    expect(gate.written).toBe(1);
  });

  it('stops admitting once the session cap is reached', () => {
    const gate = createErrorLogGate({ maxPerSession: 3, random: () => 0 });

    expect(['a', 'b', 'c'].map((f) => gate.shouldLog(f))).toEqual([true, true, true]);
    expect(gate.shouldLog('d')).toBe(false);
    expect(gate.shouldLog('d')).toBe(false); // duplicates after the cap stay silent
    expect(gate.written).toBe(3);
  });

  it('defaults the cap to 10 per session', () => {
    expect(DEFAULT_MAX_ERROR_LOGS_PER_SESSION).toBe(10);

    const gate = createErrorLogGate({ random: () => 0 });
    for (let i = 0; i < DEFAULT_MAX_ERROR_LOGS_PER_SESSION; i++) {
      expect(gate.shouldLog(`error-${i}`)).toBe(true);
    }
    expect(gate.shouldLog('one-too-many')).toBe(false);
    expect(gate.written).toBe(DEFAULT_MAX_ERROR_LOGS_PER_SESSION);
  });

  it('drops everything at sample rate 0 without consuming the budget', () => {
    const gate = createErrorLogGate({ sampleRate: 0, random: () => 0 });

    expect(gate.shouldLog('sampled-out')).toBe(false);
    expect(gate.written).toBe(0);
  });

  it('always admits new errors at sample rate 1', () => {
    expect(DEFAULT_ERROR_LOG_SAMPLE_RATE).toBe(1);

    const gate = createErrorLogGate({ random: () => 0.999999 });
    expect(gate.shouldLog('a')).toBe(true);
    expect(gate.shouldLog('b')).toBe(true);
  });

  it('honors the injected random source when sampling', () => {
    const gate = createErrorLogGate({ sampleRate: 0.5, random: () => 0.6 });

    expect(gate.shouldLog('above-rate')).toBe(false);
    expect(gate.written).toBe(0);
  });

  it('does not remember rejected samples as duplicates', () => {
    const rolls = [0.9, 0.1]; // first roll rejected, second admitted at rate 0.5
    const gate = createErrorLogGate({ sampleRate: 0.5, random: () => rolls.shift() ?? 0 });

    expect(gate.shouldLog('flaky')).toBe(false);
    expect(gate.shouldLog('flaky')).toBe(true);
    expect(gate.written).toBe(1);
  });

  it('falls back to defaults for invalid options', () => {
    // maxPerSession invalid -> default 10; sampleRate 7 clamps to 1.
    const gate = createErrorLogGate({ maxPerSession: -5, sampleRate: 7, random: () => 0 });

    for (let i = 0; i < DEFAULT_MAX_ERROR_LOGS_PER_SESSION; i++) {
      expect(gate.shouldLog(`e-${i}`)).toBe(true);
    }
    expect(gate.shouldLog('e-final')).toBe(false);
  });
});
