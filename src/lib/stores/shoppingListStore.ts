// Shopping List Store - manages grocery lists with sharing support
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { ensureDate } from '../utils/storage';
import type { ProductCategory } from '../types';

export interface ShoppingListItem {
  id: string;
  productId?: string; // Reference to scanned product (optional)
  name: string;
  brand?: string;
  quantity: number;
  unit?: string; // e.g., "pcs", "lbs", "oz"
  category?: ProductCategory;
  imageURL?: string;
  notes?: string;
  isChecked: boolean;
  addedBy: string; // Name of person who added it
  addedAt: Date;
  checkedAt?: Date;
  checkedBy?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  ownerName: string;
  sharedWith: SharedMember[];
  shareCode?: string; // For sharing via code
  isDefault: boolean;
}

export interface SharedMember {
  id: string;
  name: string;
  joinedAt: Date;
}

interface ShoppingListState {
  lists: ShoppingList[];
  activeListId: string | null;
  currentUserName: string;
  
  // List management
  createList: (name: string) => ShoppingList;
  deleteList: (listId: string) => void;
  renameList: (listId: string, name: string) => void;
  setActiveList: (listId: string) => void;
  getActiveList: () => ShoppingList | null;
  getDefaultList: () => ShoppingList;
  
  // Item management
  addItem: (listId: string, item: Omit<ShoppingListItem, 'id' | 'addedAt' | 'isChecked'>) => void;
  addProductToList: (listId: string, product: {
    productId: string;
    name: string;
    brand?: string;
    category?: ProductCategory;
    imageURL?: string;
  }) => void;
  removeItem: (listId: string, itemId: string) => void;
  updateItem: (listId: string, itemId: string, updates: Partial<ShoppingListItem>) => void;
  toggleItemChecked: (listId: string, itemId: string) => void;
  clearCheckedItems: (listId: string) => void;
  
  // Sharing
  generateShareCode: (listId: string) => string;
  joinListByCode: (shareCode: string, userName: string) => boolean;
  leaveSharedList: (listId: string, memberId: string) => void;
  setCurrentUserName: (name: string) => void;
  
  // Export
  getListAsText: (listId: string) => string;
  getUncheckedCount: (listId: string) => number;
  getTotalCount: (listId: string) => number;
}

// Generate a simple 6-character share code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set, get) => ({
      lists: [],
      activeListId: null,
      currentUserName: 'Me',

      createList: (name) => {
        const newList: ShoppingList = {
          id: uuidv4(),
          name,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          ownerId: 'local-user',
          ownerName: get().currentUserName,
          sharedWith: [],
          isDefault: get().lists.length === 0, // First list is default
        };

        set((state) => ({
          lists: [...state.lists, newList],
          activeListId: state.activeListId || newList.id,
        }));

        return newList;
      },

      deleteList: (listId) => {
        set((state) => {
          const newLists = state.lists.filter((l) => l.id !== listId);
          let newActiveId = state.activeListId;
          
          if (state.activeListId === listId) {
            newActiveId = newLists.length > 0 ? newLists[0].id : null;
          }
          
          return { lists: newLists, activeListId: newActiveId };
        });
      },

      renameList: (listId, name) => {
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId ? { ...l, name, updatedAt: new Date() } : l
          ),
        }));
      },

      setActiveList: (listId) => {
        if (get().lists.find((l) => l.id === listId)) {
          set({ activeListId: listId });
        }
      },

      getActiveList: () => {
        const state = get();
        if (!state.activeListId) return null;
        return state.lists.find((l) => l.id === state.activeListId) || null;
      },

      getDefaultList: () => {
        const state = get();
        let defaultList = state.lists.find((l) => l.isDefault);
        
        if (!defaultList) {
          // Create a default list if none exists
          defaultList = get().createList('My Grocery List');
        }
        
        return defaultList;
      },

      addItem: (listId, item) => {
        const newItem: ShoppingListItem = {
          ...item,
          id: uuidv4(),
          addedAt: new Date(),
          isChecked: false,
        };

        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId
              ? { ...l, items: [...l.items, newItem], updatedAt: new Date() }
              : l
          ),
        }));
      },

      addProductToList: (listId, product) => {
        const state = get();
        const list = state.lists.find((l) => l.id === listId);
        
        // Check if product already in list
        if (list?.items.some((i) => i.productId === product.productId)) {
          // Update quantity instead
          const existingItem = list.items.find((i) => i.productId === product.productId);
          if (existingItem) {
            get().updateItem(listId, existingItem.id, {
              quantity: existingItem.quantity + 1,
            });
          }
          return;
        }

        get().addItem(listId, {
          productId: product.productId,
          name: product.name,
          brand: product.brand,
          category: product.category,
          imageURL: product.imageURL,
          quantity: 1,
          addedBy: state.currentUserName,
        });
      },

      removeItem: (listId, itemId) => {
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.filter((i) => i.id !== itemId),
                  updatedAt: new Date(),
                }
              : l
          ),
        }));
      },

      updateItem: (listId, itemId, updates) => {
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.map((i) =>
                    i.id === itemId ? { ...i, ...updates } : i
                  ),
                  updatedAt: new Date(),
                }
              : l
          ),
        }));
      },

      toggleItemChecked: (listId, itemId) => {
        const state = get();
        const list = state.lists.find((l) => l.id === listId);
        const item = list?.items.find((i) => i.id === itemId);
        
        if (item) {
          get().updateItem(listId, itemId, {
            isChecked: !item.isChecked,
            checkedAt: !item.isChecked ? new Date() : undefined,
            checkedBy: !item.isChecked ? state.currentUserName : undefined,
          });
        }
      },

      clearCheckedItems: (listId) => {
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.filter((i) => !i.isChecked),
                  updatedAt: new Date(),
                }
              : l
          ),
        }));
      },

      generateShareCode: (listId) => {
        const code = generateCode();
        
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId ? { ...l, shareCode: code, updatedAt: new Date() } : l
          ),
        }));
        
        return code;
      },

      joinListByCode: (shareCode, userName) => {
        const state = get();
        const list = state.lists.find(
          (l) => l.shareCode?.toUpperCase() === shareCode.toUpperCase()
        );
        
        if (!list) return false;
        
        // Check if already a member
        if (list.sharedWith.some((m) => m.name === userName)) {
          return true; // Already joined
        }
        
        const newMember: SharedMember = {
          id: uuidv4(),
          name: userName,
          joinedAt: new Date(),
        };
        
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === list.id
              ? {
                  ...l,
                  sharedWith: [...l.sharedWith, newMember],
                  updatedAt: new Date(),
                }
              : l
          ),
        }));
        
        return true;
      },

      leaveSharedList: (listId, memberId) => {
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  sharedWith: l.sharedWith.filter((m) => m.id !== memberId),
                  updatedAt: new Date(),
                }
              : l
          ),
        }));
      },

      setCurrentUserName: (name) => {
        set({ currentUserName: name });
      },

      getListAsText: (listId) => {
        const list = get().lists.find((l) => l.id === listId);
        if (!list) return '';
        
        const uncheckedItems = list.items.filter((i) => !i.isChecked);
        const checkedItems = list.items.filter((i) => i.isChecked);
        
        let text = `📋 ${list.name}\n`;
        text += `━━━━━━━━━━━━━━━━━━\n\n`;
        
        if (uncheckedItems.length > 0) {
          text += `To Buy:\n`;
          uncheckedItems.forEach((item) => {
            const qty = item.quantity > 1 ? ` (×${item.quantity})` : '';
            const brand = item.brand ? ` - ${item.brand}` : '';
            text += `☐ ${item.name}${brand}${qty}\n`;
          });
        }
        
        if (checkedItems.length > 0) {
          text += `\n✓ Already Got:\n`;
          checkedItems.forEach((item) => {
            const qty = item.quantity > 1 ? ` (×${item.quantity})` : '';
            const brand = item.brand ? ` - ${item.brand}` : '';
            text += `☑ ${item.name}${brand}${qty}\n`;
          });
        }
        
        if (list.items.length === 0) {
          text += `(Empty list)\n`;
        }
        
        text += `\n━━━━━━━━━━━━━━━━━━\n`;
        text += `Shared via ClearLabel`;
        
        return text;
      },

      getUncheckedCount: (listId) => {
        const list = get().lists.find((l) => l.id === listId);
        return list?.items.filter((i) => !i.isChecked).length || 0;
      },

      getTotalCount: (listId) => {
        const list = get().lists.find((l) => l.id === listId);
        return list?.items.length || 0;
      },
    }),
    {
      name: 'clearlabel-shopping-lists',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lists: state.lists,
        activeListId: state.activeListId,
        currentUserName: state.currentUserName,
      }),
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<ShoppingListState> | undefined;
        if (!state || !state.lists) {
          return currentState;
        }
        
        // Rehydrate dates
        const rehydratedLists = state.lists.map((list) => ({
          ...list,
          createdAt: ensureDate(list.createdAt) || new Date(),
          updatedAt: ensureDate(list.updatedAt) || new Date(),
          items: list.items.map((item) => ({
            ...item,
            addedAt: ensureDate(item.addedAt) || new Date(),
            checkedAt: item.checkedAt ? ensureDate(item.checkedAt) : undefined,
          })),
          sharedWith: list.sharedWith.map((member) => ({
            ...member,
            joinedAt: ensureDate(member.joinedAt) || new Date(),
          })),
        }));
        
        return {
          ...currentState,
          lists: rehydratedLists,
          activeListId: state.activeListId || null,
          currentUserName: state.currentUserName || 'Me',
        };
      },
    }
  )
);
