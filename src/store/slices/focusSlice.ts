import type { StateCreator } from 'zustand';
import type { WorkspaceState } from '../workspaceStore';

/**
 * Zen Master "Focus Mode" / "One Lever" UI state.
 *
 * UI-only state: not account-scoped, so it carries no token guards and is not
 * reset by changeAccount() — it outlives account switches within a session.
 */
export const focusSlice: StateCreator<WorkspaceState, [], [], Partial<WorkspaceState>> = (set) => ({
  activeSignal: null,
  focusMode: false,
  oneLever: null,
  momentumBar: 0,

  setActiveSignal: (signal: string | null) => set({ activeSignal: signal }),
  setFocusMode: (focusMode: boolean) => set({ focusMode }),
  setOneLever: (oneLever: string | null) => set({ oneLever }),
  setMomentumBar: (value: number) => set({ momentumBar: Math.min(100, Math.max(0, value)) }),
});
