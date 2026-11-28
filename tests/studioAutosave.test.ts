import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStudioAutosave,
  STUDIO_AUTOSAVE_DELAY_MS,
  type StudioAutosave,
} from '../src/components/studio/studioAutosave';

describe('studio canvas autosave scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function harness(overrides: { canSave?: () => boolean; isSaving?: () => boolean } = {}) {
    const save = vi.fn();
    const scheduler = createStudioAutosave({
      delayMs: 2000,
      canSave: overrides.canSave ?? (() => true),
      isSaving: overrides.isSaving ?? (() => false),
      save,
    });
    return { save, scheduler };
  }

  it('uses a default quiet period inside the 1.5-2 second range', () => {
    expect(STUDIO_AUTOSAVE_DELAY_MS).toBeGreaterThanOrEqual(1500);
    expect(STUDIO_AUTOSAVE_DELAY_MS).toBeLessThanOrEqual(2000);
  });

  it('does not save immediately or before the quiet period ends', () => {
    const { save, scheduler } = harness();
    scheduler.schedule();
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1999);
    expect(save).not.toHaveBeenCalled();
  });

  it('saves once after the quiet period when saving is allowed', () => {
    const { save, scheduler } = harness();
    scheduler.schedule();
    vi.advanceTimersByTime(2000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(scheduler.pending()).toBe(false);
    vi.advanceTimersByTime(10000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('restarts the countdown on every edit, so continuous typing saves once', () => {
    const { save, scheduler } = harness();
    scheduler.schedule();
    vi.advanceTimersByTime(1500);
    scheduler.schedule();
    vi.advanceTimersByTime(1500);
    scheduler.schedule();
    vi.advanceTimersByTime(1999);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('does not save when the gate refuses at fire time (e.g. draft is clean)', () => {
    let allowed = true;
    const { save, scheduler } = harness({ canSave: () => allowed });
    scheduler.schedule();
    allowed = false;
    vi.advanceTimersByTime(2000);
    expect(save).not.toHaveBeenCalled();
  });

  it('cancel drops a pending save', () => {
    const { save, scheduler } = harness();
    scheduler.schedule();
    expect(scheduler.pending()).toBe(true);
    scheduler.cancel();
    expect(scheduler.pending()).toBe(false);
    vi.advanceTimersByTime(10000);
    expect(save).not.toHaveBeenCalled();
  });

  it('defers while a save is in flight instead of overlapping, then saves if still dirty', () => {
    let saving = true;
    const { save, scheduler } = harness({ isSaving: () => saving });
    scheduler.schedule();
    vi.advanceTimersByTime(2000);
    expect(save).not.toHaveBeenCalled();
    // The timer re-arms while the first save runs; once it finishes, the
    // follow-up save fires after another quiet period.
    saving = false;
    vi.advanceTimersByTime(1999);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('does not save after deferral if the draft became clean during the in-flight save', () => {
    let saving = true;
    let dirty = true;
    const { save, scheduler } = harness({
      isSaving: () => saving,
      canSave: () => dirty,
    });
    scheduler.schedule();
    vi.advanceTimersByTime(2000);
    expect(save).not.toHaveBeenCalled();
    saving = false;
    dirty = false;
    vi.advanceTimersByTime(10000);
    expect(save).not.toHaveBeenCalled();
  });

  it('dispose prevents a pending save and ignores later scheduling', () => {
    const { save, scheduler } = harness();
    scheduler.schedule();
    scheduler.dispose();
    vi.advanceTimersByTime(10000);
    expect(save).not.toHaveBeenCalled();
    scheduler.schedule();
    vi.advanceTimersByTime(10000);
    expect(save).not.toHaveBeenCalled();
  });

  it('honours a custom delay', () => {
    const save = vi.fn();
    const scheduler: StudioAutosave = createStudioAutosave({
      delayMs: 500,
      canSave: () => true,
      isSaving: () => false,
      save,
    });
    scheduler.schedule();
    vi.advanceTimersByTime(499);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
