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
  getWeeklyInsights: () => WeeklyInsights;
}

export interface WeeklyInsights {
  scansThisWeek: number;
  mostCommonCategory: ProductCategory | null;
  safePercentage: number;
  cautionPercentage: number;
  warningPercentage: number;
  topFlaggedIngredients: Array<{ name: string; count: number }>;
  improvementFromLastWeek: number; // Percentage change in safe products
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

      getWeeklyInsights: () => {
        const products = get().products;
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfWeek.getDate() - 7);

        // Filter products from this week and last week
        const thisWeekProducts = products.filter((p: ScannedProduct) => {
          const scannedDate = new Date(p.scannedAt);
          return scannedDate >= startOfWeek;
        });

        const lastWeekProducts = products.filter((p: ScannedProduct) => {
          const scannedDate = new Date(p.scannedAt);
          return scannedDate >= startOfLastWeek && scannedDate < startOfWeek;
        });

        // Calculate category counts for this week
        const categoryCounts: Record<ProductCategory, number> = {
          food: 0,
          cosmetics: 0,
          cleaning: 0,
          petFood: 0,
          other: 0,
        };

        thisWeekProducts.forEach((p: ScannedProduct) => {
          categoryCounts[p.category]++;
        });

        const mostCommonCategory =
          thisWeekProducts.length > 0
            ? (Object.keys(categoryCounts).reduce((a, b) =>
                categoryCounts[a as ProductCategory] > categoryCounts[b as ProductCategory] ? a : b
              ) as ProductCategory)
            : null;

        // Calculate status percentages
        const calculateStatus = (product: ScannedProduct): SafetyStatus => {
          const flagCount = product.flagsTriggered.length;
          if (product.ingredients.length === 0) return 'unknown';
          if (flagCount === 0) return 'good';
          if (flagCount <= 2) return 'caution';
          return 'warning';
        };

        const statusCounts = {
          good: 0,
          caution: 0,
          warning: 0,
        };

        thisWeekProducts.forEach((p: ScannedProduct) => {
          const status = calculateStatus(p);
          if (status !== 'unknown') {
            statusCounts[status]++;
          }
        });

        const totalWithStatus = statusCounts.good + statusCounts.caution + statusCounts.warning;
        const safePercentage = totalWithStatus > 0 ? (statusCounts.good / totalWithStatus) * 100 : 0;
        const cautionPercentage = totalWithStatus > 0 ? (statusCounts.caution / totalWithStatus) * 100 : 0;
        const warningPercentage = totalWithStatus > 0 ? (statusCounts.warning / totalWithStatus) * 100 : 0;

        // Calculate top flagged ingredients
        const ingredientCounts: Record<string, number> = {};
        thisWeekProducts.forEach((p: ScannedProduct) => {
          p.flagsTriggered.forEach((flag: string) => {
            ingredientCounts[flag] = (ingredientCounts[flag] || 0) + 1;
          });
        });

        const topFlaggedIngredients = Object.entries(ingredientCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Calculate improvement from last week
        const lastWeekSafeCount = lastWeekProducts.filter(
          (p: ScannedProduct) => calculateStatus(p) === 'good'
        ).length;
        const lastWeekTotal = lastWeekProducts.filter(
          (p: ScannedProduct) => calculateStatus(p) !== 'unknown'
        ).length;
        const lastWeekSafePercentage = lastWeekTotal > 0 ? (lastWeekSafeCount / lastWeekTotal) * 100 : 0;
        const improvementFromLastWeek = safePercentage - lastWeekSafePercentage;

        return {
          scansThisWeek: thisWeekProducts.length,
          mostCommonCategory,
          safePercentage,
          cautionPercentage,
          warningPercentage,
          topFlaggedIngredients,
          improvementFromLastWeek,
        };
      },
    }),
    {
      name: 'ingredient-decoder-history',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ products: state.products }),
    }
  )
);
