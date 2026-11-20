/**
 * Backward-compatible shim. The store now lives in ./workspaceStore (composed
 * from src/store/slices/*). Keep this module so existing imports of
 * '../store/ownedWorkspaceStore' (e.g. src/lib/apiClient.ts) keep working.
 */
export * from './workspaceStore';
