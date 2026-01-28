// src/lib/stores/streakStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Milestone definitions
export const MILESTONES = [
  { id: 'streak_3', name: 'Getting Started', icon: '🌱', daysRequired: 3 },
  { id: 'streak_7', name: 'One Week Strong', icon: '🔥', daysRequired: 7 },
  { id: 'streak_14', name: 'Two Week Warrior', icon: '⚡', daysRequired: 14 },
  { id: 'streak_30', name: 'Monthly Master', icon: '🏆', daysRequired: 30 },
  { id: 'streak_60', name: 'Dedicated Scanner', icon: '💎', daysRequired: 60 },
  { id: 'streak_100', name: 'Century Club', icon: '👑', daysRequired: 100 },
] as const;

export interface MilestoneProgress {
  id: string;
  name: string;
  icon: string;
  daysRequired: number;
  achieved: boolean;
  achievedDate?: string;
}

interface StreakState {
  // Data
  currentStreak: number;
  longestStreak: number;
  lastScanDate: string | null; // 'YYYY-MM-DD' format
  streakFreezes: number; // 0-2
  freezeUsedThisWeek: boolean;
  weekStartDate: string | null;
  milestones: string[]; // Array of achieved milestone IDs
  scannedToday: boolean;
  pendingMilestone: MilestoneProgress | null; // For showing celebration modal

  // Actions
  recordScan: () => MilestoneProgress | null; // Returns new milestone if achieved
  checkAndUpdateStreak: () => { freezeUsed: boolean; streakLost: boolean; previousStreak: number };
  dismissMilestone: () => void;
  getMilestoneProgress: () => MilestoneProgress[];
  reset: () => void;
}

// Helper to get today's date as YYYY-MM-DD in local timezone
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get yesterday's date string
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
}

// Helper to get start of current week (Sunday)
function getWeekStartDateString(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  return getLocalDateString(weekStart);
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastScanDate: null,
      streakFreezes: 1, // Start with 1 freeze
      freezeUsedThisWeek: false,
      weekStartDate: null,
      milestones: [],
      scannedToday: false,
      pendingMilestone: null,

      recordScan: () => {
        const state = get();
        const today = getLocalDateString();

        // If already scanned today, do nothing
        if (state.lastScanDate === today) {
          return null;
        }

        let newStreak = state.currentStreak;
        const yesterday = getYesterdayDateString();

        // Determine new streak value
        if (state.lastScanDate === null) {
          // First ever scan
          newStreak = 1;
        } else if (state.lastScanDate === yesterday) {
          // Scanned yesterday, continue streak
          newStreak = state.currentStreak + 1;
        } else if (state.lastScanDate === today) {
          // Already scanned today (shouldn't reach here, but safety check)
          return null;
        } else {
          // Missed day(s) - this case should be handled by checkAndUpdateStreak
          // but if we get here, start fresh
          newStreak = 1;
        }

        // Check for new milestone
        let newMilestone: MilestoneProgress | null = null;
        for (const milestone of MILESTONES) {
          if (newStreak >= milestone.daysRequired && !state.milestones.includes(milestone.id)) {
            newMilestone = {
              ...milestone,
              achieved: true,
              achievedDate: today,
            };
            break; // Only one milestone at a time
          }
        }

        const newLongest = Math.max(state.longestStreak, newStreak);

        set({
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastScanDate: today,
          scannedToday: true,
          milestones: newMilestone
            ? [...state.milestones, newMilestone.id]
            : state.milestones,
          pendingMilestone: newMilestone,
        });

        return newMilestone;
      },

      checkAndUpdateStreak: () => {
        const state = get();
        const today = getLocalDateString();
        const yesterday = getYesterdayDateString();
        const currentWeekStart = getWeekStartDateString();

        let freezeUsed = false;
        let streakLost = false;
        const previousStreak = state.currentStreak;

        // Check for week rollover - grant new freeze
        if (state.weekStartDate !== currentWeekStart) {
          const newFreezeCount = Math.min(state.streakFreezes + 1, 2);
          set({
            weekStartDate: currentWeekStart,
            freezeUsedThisWeek: false,
            streakFreezes: newFreezeCount,
          });
        }

        // Update scannedToday based on lastScanDate
        const scannedToday = state.lastScanDate === today;
        if (state.scannedToday !== scannedToday) {
          set({ scannedToday });
        }

        // If scanned today or yesterday, streak is fine
        if (state.lastScanDate === today || state.lastScanDate === yesterday) {
          return { freezeUsed: false, streakLost: false, previousStreak };
        }

        // If lastScanDate is older than yesterday and we have a streak
        if (state.lastScanDate !== null && state.currentStreak > 0) {
          // Try to use a freeze
          if (state.streakFreezes > 0 && !state.freezeUsedThisWeek) {
            set({
              streakFreezes: state.streakFreezes - 1,
              freezeUsedThisWeek: true,
              lastScanDate: yesterday, // Pretend we scanned yesterday
            });
            freezeUsed = true;
          } else {
            // No freeze available, lose streak
            set({
              currentStreak: 0,
              scannedToday: false,
            });
            streakLost = true;
          }
        }

        return { freezeUsed, streakLost, previousStreak };
      },

      dismissMilestone: () => {
        set({ pendingMilestone: null });
      },

      getMilestoneProgress: () => {
        const state = get();
        return MILESTONES.map((m) => ({
          ...m,
          achieved: state.milestones.includes(m.id),
          achievedDate: state.milestones.includes(m.id) ? undefined : undefined,
        }));
      },

      reset: () => {
        set({
          currentStreak: 0,
          longestStreak: 0,
          lastScanDate: null,
          streakFreezes: 1,
          freezeUsedThisWeek: false,
          weekStartDate: null,
          milestones: [],
          scannedToday: false,
          pendingMilestone: null,
        });
      },
    }),
    {
      name: 'clearlabel-streak',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastScanDate: state.lastScanDate,
        streakFreezes: state.streakFreezes,
        freezeUsedThisWeek: state.freezeUsedThisWeek,
        weekStartDate: state.weekStartDate,
        milestones: state.milestones,
      }),
    }
  )
);
