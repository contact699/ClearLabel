// History Store - manages scanned products history
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScannedProduct, ProductCategory, SafetyStatus } from '../types';

// Maximum number of products to keep in history (prevents performance degradation)
const MAX_HISTORY_SIZE = 100;

interface HistoryState {
  products: ScannedProduct[];
  isLoading: boolean;

  // Actions
  addProduct: (product: ScannedProduct) => void;
  removeProduct: (productId: string) => void;
  clearHistory: () => void;
  getProductById: (productId: string) => ScannedProduct | undefined;
  getProductByBarcode: (barcode: string) => ScannedProduct | undefined;
  getRecentProducts: (limit?: number) => ScannedProduct[];
  getProductsByCategory: (category: ProductCategory) => ScannedProduct[];
  getProductsByStatus: (status: SafetyStatus) => ScannedProduct[];
  searchProducts: (query: string) => ScannedProduct[];
  getStats: () => { total: number; flaggedThisMonth: number };
  getHistorySize: () => number;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      products: [],
      isLoading: false,

      addProduct: (product) => {
        set((state) => {
          // Add new product to the beginning
          const newProducts = [product, ...state.products];

          // Trim to MAX_HISTORY_SIZE if needed (remove oldest products)
          if (newProducts.length > MAX_HISTORY_SIZE) {
            return {
              products: newProducts.slice(0, MAX_HISTORY_SIZE),
            };
          }

          return { products: newProducts };
        });
      },

      removeProduct: (productId) => {
        set((state) => ({
          products: state.products.filter((p: ScannedProduct) => p.id !== productId),
        }));
      },

      clearHistory: () => {
        set({ products: [] });
      },

      getProductById: (productId) => {
        return get().products.find((p: ScannedProduct) => p.id === productId);
      },

      getProductByBarcode: (barcode) => {
        return get().products.find((p: ScannedProduct) => p.barcode === barcode);
      },

      getRecentProducts: (limit = 5) => {
        return get().products.slice(0, limit);
      },

      getProductsByCategory: (category) => {
        return get().products.filter((p: ScannedProduct) => p.category === category);
      },

      getProductsByStatus: (status) => {
        // Note: This requires calculating status from flaggedCount
        // For now, we filter based on flagsTriggered length
        return get().products.filter((p: ScannedProduct) => {
          const flagCount = p.flagsTriggered.length;
          if (status === 'good') return flagCount === 0;
          if (status === 'caution') return flagCount >= 1 && flagCount <= 2;
          if (status === 'warning') return flagCount > 2;
          return p.ingredients.length === 0; // unknown
        });
      },

      searchProducts: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().products.filter((p: ScannedProduct) => {
          return (
            p.name.toLowerCase().includes(lowerQuery) ||
            p.brand?.toLowerCase().includes(lowerQuery) ||
            p.ingredients.some((i) => i.name.toLowerCase().includes(lowerQuery))
          );
        });
      },

      getStats: () => {
        const products = get().products;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const thisMonthProducts = products.filter((p: ScannedProduct) => {
          const scannedDate = new Date(p.scannedAt);
          return scannedDate >= startOfMonth;
        });

        const flaggedThisMonth = thisMonthProducts.filter(
          (p: ScannedProduct) => p.flagsTriggered.length > 0
        ).length;

        return {
          total: products.length,
          flaggedThisMonth,
        };
      },

      getHistorySize: () => {
        return get().products.length;
      },
    }),
    {
      name: 'ingredient-decoder-history',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ products: state.products }),
    }
  )
);
