// Family Profiles Store - manages multiple dietary profiles for family members
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { FamilyProfile, IngredientFlag, FlagType, ProfileColorId } from '../types';
import { PROFILE_COLORS } from '../types';
import { ensureDate } from '../utils/storage';

const MAX_PROFILES = 6; // Reasonable limit for family profiles

interface FamilyProfilesState {
  profiles: FamilyProfile[];
  activeProfileId: string | null;
  isLoading: boolean;

  // Actions
  createProfile: (name: string, colorId: ProfileColorId, emoji?: string) => FamilyProfile | null;
  updateProfile: (profileId: string, updates: Partial<Pick<FamilyProfile, 'name' | 'colorId' | 'emoji'>>) => void;
  deleteProfile: (profileId: string) => void;
  setActiveProfile: (profileId: string) => void;
  
  // Flag management for profiles
  addFlagToProfile: (profileId: string, type: FlagType, value: string, displayName: string) => void;
  removeFlagFromProfile: (profileId: string, flagId: string) => void;
  toggleFlagInProfile: (profileId: string, flagId: string) => void;
  copyFlagsFromProfile: (sourceProfileId: string, targetProfileId: string) => void;
  
  // Getters
  getActiveProfile: () => FamilyProfile | null;
  getProfileById: (profileId: string) => FamilyProfile | undefined;
  getActiveFlags: () => IngredientFlag[];
  getProfileColor: (profileId: string) => { color: string; lightColor: string };
  canCreateMore: () => boolean;
}

// Get a default color that hasn't been used yet
function getAvailableColor(usedColorIds: ProfileColorId[]): ProfileColorId {
  const available = PROFILE_COLORS.find(c => !usedColorIds.includes(c.id));
  return available?.id || 'blue';
}

export const useFamilyProfilesStore = create<FamilyProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      isLoading: false,

      createProfile: (name, colorId, emoji) => {
        const state = get();
        if (state.profiles.length >= MAX_PROFILES) {
          return null;
        }

        const newProfile: FamilyProfile = {
          id: uuidv4(),
          name,
          colorId,
          emoji,
          flags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((s) => {
          const newProfiles = [...s.profiles, newProfile];
          return {
            profiles: newProfiles,
            // If this is the first profile, make it active
            activeProfileId: s.activeProfileId || newProfile.id,
          };
        });

        return newProfile;
      },

      updateProfile: (profileId, updates) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId
              ? { ...p, ...updates, updatedAt: new Date() }
              : p
          ),
        }));
      },

      deleteProfile: (profileId) => {
        set((state) => {
          const newProfiles = state.profiles.filter((p) => p.id !== profileId);
          let newActiveId = state.activeProfileId;

          // If we deleted the active profile, switch to first remaining or null
          if (state.activeProfileId === profileId) {
            newActiveId = newProfiles.length > 0 ? newProfiles[0].id : null;
          }

          return {
            profiles: newProfiles,
            activeProfileId: newActiveId,
          };
        });
      },

      setActiveProfile: (profileId) => {
        const profile = get().profiles.find((p) => p.id === profileId);
        if (profile) {
          set({ activeProfileId: profileId });
        }
      },

      addFlagToProfile: (profileId, type, value, displayName) => {
        set((state) => ({
          profiles: state.profiles.map((p) => {
            if (p.id !== profileId) return p;

            // Check if flag already exists
            const exists = p.flags.some(
              (f) => f.type === type && f.value === value
            );
            if (exists) return p;

            const newFlag: IngredientFlag = {
              id: uuidv4(),
              type,
              value,
              displayName,
              isActive: true,
            };

            return {
              ...p,
              flags: [...p.flags, newFlag],
              updatedAt: new Date(),
            };
          }),
        }));
      },

      removeFlagFromProfile: (profileId, flagId) => {
        set((state) => ({
          profiles: state.profiles.map((p) => {
            if (p.id !== profileId) return p;
            return {
              ...p,
              flags: p.flags.filter((f) => f.id !== flagId),
              updatedAt: new Date(),
            };
          }),
        }));
      },

      toggleFlagInProfile: (profileId, flagId) => {
        set((state) => ({
          profiles: state.profiles.map((p) => {
            if (p.id !== profileId) return p;
            return {
              ...p,
              flags: p.flags.map((f) =>
                f.id === flagId ? { ...f, isActive: !f.isActive } : f
              ),
              updatedAt: new Date(),
            };
          }),
        }));
      },

      copyFlagsFromProfile: (sourceProfileId, targetProfileId) => {
        const sourceProfile = get().profiles.find((p) => p.id === sourceProfileId);
        if (!sourceProfile) return;

        set((state) => ({
          profiles: state.profiles.map((p) => {
            if (p.id !== targetProfileId) return p;
            
            // Copy flags with new IDs
            const copiedFlags = sourceProfile.flags.map((f) => ({
              ...f,
              id: uuidv4(),
            }));

            return {
              ...p,
              flags: copiedFlags,
              updatedAt: new Date(),
            };
          }),
        }));
      },

      getActiveProfile: () => {
        const state = get();
        if (!state.activeProfileId) return null;
        return state.profiles.find((p) => p.id === state.activeProfileId) || null;
      },

      getProfileById: (profileId) => {
        return get().profiles.find((p) => p.id === profileId);
      },

      getActiveFlags: () => {
        const activeProfile = get().getActiveProfile();
        if (!activeProfile) return [];
        return activeProfile.flags.filter((f) => f.isActive);
      },

      getProfileColor: (profileId) => {
        const profile = get().profiles.find((p) => p.id === profileId);
        const colorDef = PROFILE_COLORS.find((c) => c.id === profile?.colorId);
        return {
          color: colorDef?.color || '#3B82F6',
          lightColor: colorDef?.lightColor || '#DBEAFE',
        };
      },

      canCreateMore: () => {
        return get().profiles.length < MAX_PROFILES;
      },
    }),
    {
      name: 'clearlabel-family-profiles',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
      }),
      // Properly rehydrate dates from JSON strings
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<FamilyProfilesState> | undefined;
        if (!state || !state.profiles) {
          return currentState;
        }
        // Convert date strings back to Date objects
        const rehydratedProfiles = state.profiles.map((p) => ({
          ...p,
          createdAt: ensureDate(p.createdAt) || new Date(),
          updatedAt: ensureDate(p.updatedAt) || new Date(),
        }));
        return {
          ...currentState,
          profiles: rehydratedProfiles,
          activeProfileId: state.activeProfileId || null,
        };
      },
    }
  )
);

// Helper to get suggested color for new profile
export function getSuggestedProfileColor(existingProfiles: FamilyProfile[]): ProfileColorId {
  const usedColors = existingProfiles.map((p) => p.colorId);
  return getAvailableColor(usedColors);
}

// Common emoji options for profile avatars
export const PROFILE_EMOJIS = [
  '👤', '👩', '👨', '👧', '👦', '👶',
  '👵', '👴', '🐕', '🐈', '❤️', '⭐',
];
