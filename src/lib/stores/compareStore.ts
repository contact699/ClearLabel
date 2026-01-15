// Compare Store - manages product comparison state
import { create } from 'zustand';
import type { ScannedProduct } from '../types';

interface CompareState {
  productA: ScannedProduct | null;
  productB: ScannedProduct | null;

  // Actions
  setProductA: (product: ScannedProduct | null) => void;
  setProductB: (product: ScannedProduct | null) => void;
  addToCompare: (product: ScannedProduct) => boolean; // returns true if added
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  isInCompare: (productId: string) => boolean;
  canCompare: () => boolean;
  getCompareCount: () => number;
}

export const useCompareStore = create<CompareState>()((set, get) => ({
  productA: null,
  productB: null,

  setProductA: (product) => {
    set({ productA: product });
  },

  setProductB: (product) => {
    set({ productB: product });
  },

  addToCompare: (product) => {
    const state = get();

    // Check if already in compare
    if (state.productA?.id === product.id || state.productB?.id === product.id) {
      return false;
    }

    // Add to first empty slot
    if (!state.productA) {
      set({ productA: product });
      return true;
    }

    if (!state.productB) {
      set({ productB: product });
      return true;
    }

    // Both slots full - replace product B
    set({ productB: product });
    return true;
  },

  removeFromCompare: (productId) => {
    const state = get();
    if (state.productA?.id === productId) {
      set({ productA: null });
    } else if (state.productB?.id === productId) {
      set({ productB: null });
    }
  },

  clearCompare: () => {
    set({ productA: null, productB: null });
  },

  isInCompare: (productId) => {
    const state = get();
    return state.productA?.id === productId || state.productB?.id === productId;
  },

  canCompare: () => {
    const state = get();
    return state.productA !== null && state.productB !== null;
  },

  getCompareCount: () => {
    const state = get();
    let count = 0;
    if (state.productA) count++;
    if (state.productB) count++;
    return count;
  },
}));
