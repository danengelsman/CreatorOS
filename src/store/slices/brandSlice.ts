import type { StateCreator } from 'zustand';
import type { WorkspaceState } from '../workspaceStore';
import { guardedWrite, type WorkspaceToken } from './sessionSlice';

export const brandSlice: StateCreator<WorkspaceState, [], [], Partial<WorkspaceState>> = (set) => {
  const write = guardedWrite(set);
  return {
    brand: null,
    setBrand: (token: WorkspaceToken | null, value: any) => write('brand', token, value),
  };
};

export type BrandSlice = Pick<WorkspaceState, 'brand' | 'setBrand'>;
