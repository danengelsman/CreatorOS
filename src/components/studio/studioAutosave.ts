// Debounced autosave scheduling for the Studio Canvas.
//
// The scheduler owns only the timing: it never writes anything itself. When
// the quiet period elapses it asks the host (ContentStudio) whether a save may
// start and, if so, invokes the same save routine the manual Save button uses.
// Every eligibility rule lives in the host's canSave callback and is evaluated
// at fire time, so a state change during the wait — a conflict appearing, an
// earlier save's outcome becoming unknown, the project becoming unavailable —
// always wins over a timer scheduled earlier.

export const STUDIO_AUTOSAVE_DELAY_MS = 2000;

export interface StudioAutosaveOptions {
  /** Quiet period after the last edit before a save is attempted. */
  delayMs?: number;
  /**
   * Whether a save may start right now. Must cover every reason the manual
   * flow would refuse or defer: no unsaved content changes, a known conflict,
   * an earlier save with an unknown outcome, an unavailable project, or a
   * caller that may not write.
   */
  canSave: () => boolean;
  /** True while any save is in flight; a firing timer defers instead of overlapping it. */
  isSaving: () => boolean;
  /** Starts the existing save routine. It must mark the save in flight synchronously. */
  save: () => void;
}

export interface StudioAutosave {
  /** (Re)start the quiet-period countdown, e.g. after every edit. */
  schedule: () => void;
  /** Drop a pending save attempt, e.g. when the draft no longer differs from the baseline. */
  cancel: () => void;
  /** Whether a save attempt is currently counting down. */
  pending: () => boolean;
  /** Cancel and ignore all future calls, e.g. on unmount. */
  dispose: () => void;
}

export function createStudioAutosave(options: StudioAutosaveOptions): StudioAutosave {
  const delayMs = options.delayMs ?? STUDIO_AUTOSAVE_DELAY_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  function schedule() {
    if (disposed) return;
    clear();
    timer = setTimeout(fire, delayMs);
  }

  function fire() {
    timer = null;
    if (disposed) return;
    if (options.isSaving()) {
      // A save is already running. Check again after another quiet period;
      // canSave is re-evaluated then, so a follow-up save only starts if the
      // draft actually changed during the in-flight save.
      schedule();
      return;
    }
    if (!options.canSave()) return;
    options.save();
  }

  return {
    schedule,
    cancel: clear,
    pending: () => timer !== null,
    dispose: () => {
      disposed = true;
      clear();
    },
  };
}
