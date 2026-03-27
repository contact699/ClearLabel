// Subscription Store - manages subscription state
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  initializePurchases, 
  checkProStatus, 
  getOfferings, 
  purchasePackage, 
  restorePurchases,
} from '../services/purchases';
import type { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { MONETIZATION_ENABLED } from '../monetization';

export type SubscriptionTier = 'free' | 'pro';

interface SubscriptionState {
  tier: SubscriptionTier;
  isLoading: boolean;
  scansThisMonth: number;
  lastScanReset: string | null; // ISO string
  offerings: PurchasesOffering | null;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>;
  setTier: (tier: SubscriptionTier) => void;
  incrementScans: () => void;
  resetMonthlyScans: () => void;
  canScan: () => boolean;
  getRemainingScans: () => number;
  isPro: () => boolean;
  purchase: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; isPro: boolean; error?: string }>;
  loadOfferings: () => Promise<void>;
}

const FREE_SCAN_LIMIT = 20;

function isNewMonth(lastReset: string | null): boolean {
  if (!lastReset) return true;
  const last = new Date(lastReset);
  const now = new Date();
  return last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear();
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      tier: 'free',
      isLoading: false,
      scansThisMonth: 0,
      lastScanReset: null,
      offerings: null,
      isInitialized: false,

      initialize: async () => {
        if (get().isInitialized) return;

        if (!MONETIZATION_ENABLED) {
          set({
            tier: 'free',
            isLoading: false,
            offerings: null,
            isInitialized: true,
          });
          return;
        }

        set({ isInitialized: true, isLoading: true });
        try {
          await initializePurchases();
          await get().refreshSubscriptionStatus();
          await get().loadOfferings();
        } catch (error) {
          console.error('Failed to initialize subscriptions:', error);
          set({ isInitialized: false });
        } finally {
          set({ isLoading: false });
        }
      },

      refreshSubscriptionStatus: async () => {
        if (!MONETIZATION_ENABLED) {
          set({ tier: 'free' });
          return;
        }

        try {
          const isPro = await checkProStatus();
          set({ tier: isPro ? 'pro' : 'free' });
        } catch (error) {
          console.error('Failed to refresh subscription status:', error);
        }
      },

      loadOfferings: async () => {
        if (!MONETIZATION_ENABLED) {
          set({ offerings: null });
          return;
        }

        try {
          const offerings = await getOfferings();
          set({ offerings });
        } catch (error) {
          console.error('Failed to load offerings:', error);
        }
      },

      purchase: async (pkg: PurchasesPackage) => {
        if (!MONETIZATION_ENABLED) {
          return { success: false, error: 'Purchases are disabled' };
        }

        set({ isLoading: true });
        try {
          const result = await purchasePackage(pkg);
          if (result.success) {
            set({ tier: 'pro' });
          }
          return { success: result.success, error: result.error };
        } finally {
          set({ isLoading: false });
        }
      },

      restore: async () => {
        if (!MONETIZATION_ENABLED) {
          return { success: false, isPro: false, error: 'Purchases are disabled' };
        }

        set({ isLoading: true });
        try {
          const result = await restorePurchases();
          if (result.isPro) {
            set({ tier: 'pro' });
          }
          return result;
        } finally {
          set({ isLoading: false });
        }
      },

      setTier: (tier) => {
        set({ tier });
      },

      incrementScans: () => {
        const state = get();

        if (isNewMonth(state.lastScanReset)) {
          set({
            scansThisMonth: 1,
            lastScanReset: new Date().toISOString(),
          });
        } else {
          set({ scansThisMonth: state.scansThisMonth + 1 });
        }
      },

      resetMonthlyScans: () => {
        set({ scansThisMonth: 0, lastScanReset: new Date().toISOString() });
      },

      canScan: () => {
        if (!MONETIZATION_ENABLED) return true;

        const state = get();
        if (state.tier === 'pro') return true;
        if (isNewMonth(state.lastScanReset)) return true;
        return state.scansThisMonth < FREE_SCAN_LIMIT;
      },

      getRemainingScans: () => {
        if (!MONETIZATION_ENABLED) return Infinity;

        const state = get();
        if (state.tier === 'pro') return Infinity;
        if (isNewMonth(state.lastScanReset)) return FREE_SCAN_LIMIT;
        return Math.max(0, FREE_SCAN_LIMIT - state.scansThisMonth);
      },

      isPro: () => {
        if (!MONETIZATION_ENABLED) return false;

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
