import { StateCreator } from 'zustand';

export interface BrandSlice {
  brand: any | null;
  setBrand: (brand: any) => void;
}

export const createBrandSlice: StateCreator<BrandSlice, [], [], BrandSlice> = (set) => ({
  brand: null,
  setBrand: (brand) => set({ brand }),
});
