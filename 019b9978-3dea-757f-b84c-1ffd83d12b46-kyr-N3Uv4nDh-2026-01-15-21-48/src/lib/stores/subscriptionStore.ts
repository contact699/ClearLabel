// Subscription Store - manages subscription state
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionTier = 'free' | 'pro';

interface SubscriptionState {
  tier: SubscriptionTier;
  isLoading: boolean;
  scansThisMonth: number;
  lastScanReset: Date | null;

  // Actions
  setTier: (tier: SubscriptionTier) => void;
  incrementScans: () => void;
  resetMonthlyScans: () => void;
  canScan: () => boolean;
  getRemainingScans: () => number;
  isPro: () => boolean;
}

const FREE_SCAN_LIMIT = 10;

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      tier: 'free',
      isLoading: false,
      scansThisMonth: 0,
      lastScanReset: null,

      setTier: (tier) => {
        set({ tier });
      },

      incrementScans: () => {
        const state = get();

        // Check if we need to reset monthly scans
        const now = new Date();
        const lastReset = state.lastScanReset ? new Date(state.lastScanReset) : null;

        if (!lastReset ||
            lastReset.getMonth() !== now.getMonth() ||
            lastReset.getFullYear() !== now.getFullYear()) {
          set({
            scansThisMonth: 1,
            lastScanReset: now
          });
        } else {
          set({ scansThisMonth: state.scansThisMonth + 1 });
        }
      },

      resetMonthlyScans: () => {
        set({ scansThisMonth: 0, lastScanReset: new Date() });
      },

      canScan: () => {
        const state = get();
        if (state.tier === 'pro') return true;

        // Check if we need to reset monthly scans
        const now = new Date();
        const lastReset = state.lastScanReset ? new Date(state.lastScanReset) : null;

        if (!lastReset ||
            lastReset.getMonth() !== now.getMonth() ||
            lastReset.getFullYear() !== now.getFullYear()) {
          return true; // New month, reset count
        }

        return state.scansThisMonth < FREE_SCAN_LIMIT;
      },

      getRemainingScans: () => {
        const state = get();
        if (state.tier === 'pro') return Infinity;

        // Check if we need to reset monthly scans
        const now = new Date();
        const lastReset = state.lastScanReset ? new Date(state.lastScanReset) : null;

        if (!lastReset ||
            lastReset.getMonth() !== now.getMonth() ||
            lastReset.getFullYear() !== now.getFullYear()) {
          return FREE_SCAN_LIMIT; // New month
        }

        return Math.max(0, FREE_SCAN_LIMIT - state.scansThisMonth);
      },

      isPro: () => {
        return get().tier === 'pro';
      },
    }),
    {
      name: 'ingredient-decoder-subscription',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tier: state.tier,
        scansThisMonth: state.scansThisMonth,
        lastScanReset: state.lastScanReset,
      }),
    }
  )
);
