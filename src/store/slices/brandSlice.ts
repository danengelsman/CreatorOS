import type { WorkspaceState } from '../ownedWorkspaceStore';

export type BrandSlice = Pick<WorkspaceState, 'brand' | 'setBrand'>;
