// User Store - manages user profile and ingredient flags
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { UserProfile, IngredientFlag, FlagType, NotificationPreferences } from '../types';

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  dailyReminder: false,
  dailyReminderTime: '09:00',
  weeklyDigest: false,
};

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;

  // Actions
  initializeProfile: (name?: string) => void;
  updateProfileName: (name: string) => void;
  addFlag: (type: FlagType, value: string, displayName: string) => void;
  removeFlag: (flagId: string) => void;
  toggleFlag: (flagId: string) => void;
  setFlagActive: (flagId: string, isActive: boolean) => void;
  completeOnboarding: () => void;
  getActiveFlags: () => IngredientFlag[];
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
  getNotificationPreferences: () => NotificationPreferences;
  reset: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      isLoading: false,

      initializeProfile: (name = 'User') => {
        const existingProfile = get().profile;
        if (existingProfile) return;

        const newProfile: UserProfile = {
          id: uuidv4(),
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
          flags: [],
          hasCompletedOnboarding: false,
        };
        set({ profile: newProfile });
      },

      updateProfileName: (name) => {
        const profile = get().profile;
        if (!profile) return;
        set({
          profile: {
            ...profile,
            name,
            updatedAt: new Date(),
          },
        });
      },

      addFlag: (type, value, displayName) => {
        const profile = get().profile;
        if (!profile) return;

        // Check if flag already exists
        const exists = profile.flags.some(
          (f: IngredientFlag) => f.type === type && f.value === value
        );
        if (exists) return;

        const newFlag: IngredientFlag = {
          id: uuidv4(),
          type,
          value,
          displayName,
          isActive: true,
        };

        set({
          profile: {
            ...profile,
            flags: [...profile.flags, newFlag],
            updatedAt: new Date(),
          },
        });
      },

      removeFlag: (flagId) => {
        const profile = get().profile;
        if (!profile) return;

        set({
          profile: {
            ...profile,
            flags: profile.flags.filter((f: IngredientFlag) => f.id !== flagId),
            updatedAt: new Date(),
          },
        });
      },

      toggleFlag: (flagId) => {
        const profile = get().profile;
        if (!profile) return;

        set({
          profile: {
            ...profile,
            flags: profile.flags.map((f: IngredientFlag) =>
              f.id === flagId ? { ...f, isActive: !f.isActive } : f
            ),
            updatedAt: new Date(),
          },
        });
      },

      setFlagActive: (flagId, isActive) => {
        const profile = get().profile;
        if (!profile) return;

        set({
          profile: {
            ...profile,
            flags: profile.flags.map((f: IngredientFlag) =>
              f.id === flagId ? { ...f, isActive } : f
            ),
            updatedAt: new Date(),
          },
        });
      },

      completeOnboarding: () => {
        const profile = get().profile;
        if (!profile) return;

        set({
          profile: {
            ...profile,
            hasCompletedOnboarding: true,
            updatedAt: new Date(),
          },
        });
      },

      getActiveFlags: () => {
        const profile = get().profile;
        if (!profile) return [];
        return profile.flags.filter((f: IngredientFlag) => f.isActive);
      },

      updateNotificationPreferences: (prefs) => {
        const profile = get().profile;
        if (!profile) return;

        const currentPrefs = profile.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;
        set({
          profile: {
            ...profile,
            notificationPreferences: { ...currentPrefs, ...prefs },
            updatedAt: new Date(),
          },
        });
      },

      getNotificationPreferences: () => {
        const profile = get().profile;
        return profile?.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;
      },

      reset: () => {
        set({ profile: null, isLoading: false });
      },
    }),
    {
      name: 'ingredient-decoder-user',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ profile: state.profile }),
    }
  )
);
