// Family Profiles Store - manages multiple dietary profiles for family members
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { FamilyProfile, IngredientFlag, FlagType, ProfileColorId, ProfileRelationship, SharedFamilyMember } from '../types';
import { PROFILE_COLORS } from '../types';
import { ensureDate } from '../utils/storage';

const MAX_PROFILES = 8; // Increased limit for family profiles

// Generate a unique device ID (stored locally)
const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem('clearlabel-device-id');
    if (!deviceId) {
      deviceId = uuidv4();
      await AsyncStorage.setItem('clearlabel-device-id', deviceId);
    }
    return deviceId;
  } catch {
    return uuidv4();
  }
};

// Generate a simple 6-character share code
function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface FamilyProfilesState {
  profiles: FamilyProfile[];
  activeProfileId: string | null;
  deviceId: string | null;
  isLoading: boolean;

  // Actions
  initializeDeviceId: () => Promise<void>;
  createProfile: (name: string, colorId: ProfileColorId, emoji?: string, relationship?: ProfileRelationship) => FamilyProfile | null;
  updateProfile: (profileId: string, updates: Partial<Pick<FamilyProfile, 'name' | 'colorId' | 'emoji' | 'relationship'>>) => void;
  deleteProfile: (profileId: string) => void;
  setActiveProfile: (profileId: string) => void;
  
  // Flag management for profiles
  addFlagToProfile: (profileId: string, type: FlagType, value: string, displayName: string) => void;
  removeFlagFromProfile: (profileId: string, flagId: string) => void;
  toggleFlagInProfile: (profileId: string, flagId: string) => void;
  setFlagActiveInProfile: (profileId: string, flagId: string, isActive: boolean) => void;
  copyFlagsFromProfile: (sourceProfileId: string, targetProfileId: string) => void;
  addCustomFlagToProfile: (profileId: string, displayName: string) => void;
  
  // Sharing
  generateShareCodeForProfile: (profileId: string) => string | null;
  joinProfileByCode: (shareCode: string, userName: string) => { success: boolean; profileId?: string; error?: string };
  removeSharedMember: (profileId: string, memberId: string) => void;
  leaveSharedProfile: (profileId: string) => void;
  
  // Getters
  getActiveProfile: () => FamilyProfile | null;
  getProfileById: (profileId: string) => FamilyProfile | undefined;
  getActiveFlags: () => IngredientFlag[];
  getAllFlagsFromAllProfiles: () => IngredientFlag[];
  getProfileColor: (profileId: string) => { color: string; lightColor: string };
  canCreateMore: () => boolean;
  getProfilesByRelationship: (relationship: ProfileRelationship) => FamilyProfile[];
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
      deviceId: null,
      isLoading: false,

      initializeDeviceId: async () => {
        const id = await getDeviceId();
        set({ deviceId: id });
      },

      createProfile: (name, colorId, emoji, relationship) => {
        const state = get();
        if (state.profiles.length >= MAX_PROFILES) {
          return null;
        }

        const newProfile: FamilyProfile = {
          id: uuidv4(),
          name,
          colorId,
          emoji,
          relationship,
          flags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          ownerDeviceId: state.deviceId || undefined,
          sharedWith: [],
          isShared: false,
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

      setFlagActiveInProfile: (profileId, flagId, isActive) => {
        set((state) => ({
          profiles: state.profiles.map((p) => {
            if (p.id !== profileId) return p;
            return {
              ...p,
              flags: p.flags.map((f) =>
                f.id === flagId ? { ...f, isActive } : f
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

      addCustomFlagToProfile: (profileId, displayName) => {
        const value = displayName.trim().toLowerCase().replace(/\s+/g, '_');
        get().addFlagToProfile(profileId, 'custom', value, displayName.trim());
      },

      // Sharing functionality
      generateShareCodeForProfile: (profileId) => {
        const profile = get().profiles.find((p) => p.id === profileId);
        if (!profile) return null;

        const code = generateShareCode();
        
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId 
              ? { ...p, shareCode: code, isShared: true, updatedAt: new Date() } 
              : p
          ),
        }));
        
        return code;
      },

      joinProfileByCode: (shareCode, userName) => {
        const state = get();
        const profile = state.profiles.find(
          (p) => p.shareCode?.toUpperCase() === shareCode.toUpperCase()
        );
        
        if (!profile) {
          return { success: false, error: 'Invalid share code' };
        }
        
        // Check if already a member
        const isAlreadyMember = profile.sharedWith.some(
          (m) => m.deviceId === state.deviceId
        );
        
        if (isAlreadyMember || profile.ownerDeviceId === state.deviceId) {
          return { success: true, profileId: profile.id };
        }
        
        const newMember: SharedFamilyMember = {
          id: uuidv4(),
          name: userName,
          deviceId: state.deviceId || uuidv4(),
          joinedAt: new Date(),
        };
        
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === profile.id
              ? {
                  ...p,
                  sharedWith: [...p.sharedWith, newMember],
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
        
        return { success: true, profileId: profile.id };
      },

      removeSharedMember: (profileId, memberId) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId
              ? {
                  ...p,
                  sharedWith: p.sharedWith.filter((m) => m.id !== memberId),
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
      },

      leaveSharedProfile: (profileId) => {
        const state = get();
        const profile = state.profiles.find((p) => p.id === profileId);
        
        if (!profile) return;
        
        // If we're the owner, we can't leave - we'd have to delete
        if (profile.ownerDeviceId === state.deviceId) return;
        
        // Remove ourselves from sharedWith
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === profileId
              ? {
                  ...p,
                  sharedWith: p.sharedWith.filter((m) => m.deviceId !== s.deviceId),
                  updatedAt: new Date(),
                }
              : p
          ),
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

      getAllFlagsFromAllProfiles: () => {
        const allFlags: IngredientFlag[] = [];
        const seenValues = new Set<string>();
        
        get().profiles.forEach((profile) => {
          profile.flags.forEach((flag) => {
            if (flag.isActive && !seenValues.has(`${flag.type}-${flag.value}`)) {
              seenValues.add(`${flag.type}-${flag.value}`);
              allFlags.push(flag);
            }
          });
        });
        
        return allFlags;
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

      getProfilesByRelationship: (relationship) => {
        return get().profiles.filter((p) => p.relationship === relationship);
      },
    }),
    {
      name: 'clearlabel-family-profiles',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        deviceId: state.deviceId,
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
          sharedWith: (p.sharedWith || []).map((m) => ({
            ...m,
            joinedAt: ensureDate(m.joinedAt) || new Date(),
          })),
        }));
        return {
          ...currentState,
          profiles: rehydratedProfiles,
          activeProfileId: state.activeProfileId || null,
          deviceId: state.deviceId || null,
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

// Relationship emoji mapping
export const RELATIONSHIP_EMOJIS: Record<ProfileRelationship, string> = {
  self: '👤',
  spouse: '💑',
  partner: '❤️',
  child: '👧',
  parent: '👨‍👩‍👧',
  sibling: '👫',
  other: '👥',
};
