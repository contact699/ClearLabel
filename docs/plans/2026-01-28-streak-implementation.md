# Streak System & Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add daily streak tracking with milestones and active push notifications to increase user retention.

**Architecture:** New Zustand store (`streakStore`) handles streak state with AsyncStorage persistence. Notifications service wraps `expo-notifications` for scheduling. Three new UI components display streak data on home and profile screens.

**Tech Stack:** Zustand, AsyncStorage, expo-notifications, react-native-reanimated, lucide-react-native

---

## Task 1: Create Streak Store

**Files:**
- Create: `src/lib/stores/streakStore.ts`

**Step 1: Create the streak store file**

```typescript
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
```

**Step 2: Verify file compiles**

Run: `cd /c/Users/computer/ClearLabel && npx tsc --noEmit src/lib/stores/streakStore.ts 2>&1 | head -20`
Expected: No errors or only unrelated errors

---

## Task 2: Export Streak Store

**Files:**
- Modify: `src/lib/stores/index.ts`

**Step 1: Add export for streakStore**

Add this line to the exports:

```typescript
export { useStreakStore, MILESTONES } from './streakStore';
export type { MilestoneProgress } from './streakStore';
```

---

## Task 3: Create Notifications Service

**Files:**
- Create: `src/lib/services/notifications.ts`

**Step 1: Create the notifications service**

```typescript
// src/lib/services/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const STREAK_REMINDER_ID = 'streak-reminder';
const WEEKLY_DIGEST_ID = 'weekly-digest';
const PERMISSION_ASKED_KEY = 'notification-permission-asked';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');

  return status === 'granted';
}

export async function hasAskedForPermissions(): Promise<boolean> {
  const asked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
  return asked === 'true';
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function scheduleStreakReminder(currentStreak: number): Promise<void> {
  // Cancel any existing reminder first
  await cancelStreakReminder();

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  // Schedule for 7 PM today
  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(19, 0, 0, 0);

  // If it's already past 7 PM, schedule for tomorrow
  if (now > reminderTime) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Don't lose your streak!",
      body: `🔥 Your ${currentStreak}-day streak is waiting! Scan something before midnight.`,
      data: { type: 'streak-reminder' },
    },
    trigger: {
      date: reminderTime,
    },
    identifier: STREAK_REMINDER_ID,
  });
}

export async function cancelStreakReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_REMINDER_ID);
}

export async function sendMilestoneNotification(milestoneName: string, streakDays: number): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New Achievement Unlocked!',
      body: `🏆 Amazing! You just hit a ${streakDays}-day streak and earned "${milestoneName}"!`,
      data: { type: 'milestone' },
    },
    trigger: null, // Immediate
  });
}

export async function sendStreakLostNotification(finalStreak: number): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Streak Ended',
      body: finalStreak > 0
        ? `Your ${finalStreak}-day streak ended. Start fresh today!`
        : 'Start a new streak today by scanning a product!',
      data: { type: 'streak-lost' },
    },
    trigger: null, // Immediate
  });
}

export async function sendFreezeUsedNotification(freezesRemaining: number): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Streak Saved!',
      body: `❄️ Your streak freeze kicked in! You have ${freezesRemaining} freeze${freezesRemaining !== 1 ? 's' : ''} left.`,
      data: { type: 'freeze-used' },
    },
    trigger: null, // Immediate
  });
}

export async function scheduleWeeklyDigest(
  scansThisWeek: number,
  safeProducts: number,
  currentStreak: number
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_DIGEST_ID);

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  // Schedule for Sunday 9 AM
  const now = new Date();
  const nextSunday = new Date();
  nextSunday.setDate(now.getDate() + (7 - now.getDay()));
  nextSunday.setHours(9, 0, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your Weekly Summary',
      body: `This week: ${scansThisWeek} scans, ${safeProducts} safe products. Streak: ${currentStreak} days 🔥`,
      data: { type: 'weekly-digest' },
    },
    trigger: {
      date: nextSunday,
    },
    identifier: WEEKLY_DIGEST_ID,
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
```

---

## Task 4: Create StreakCard Component

**Files:**
- Create: `src/components/StreakCard.tsx`

**Step 1: Create the StreakCard component**

```typescript
// src/components/StreakCard.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Snowflake, Check, Zap } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useStreakStore, MILESTONES } from '@/lib/stores';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface StreakCardProps {
  onPress?: () => void;
}

export function StreakCard({ onPress }: StreakCardProps) {
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const longestStreak = useStreakStore((s) => s.longestStreak);
  const scannedToday = useStreakStore((s) => s.scannedToday);
  const streakFreezes = useStreakStore((s) => s.streakFreezes);
  const milestones = useStreakStore((s) => s.milestones);

  // Pulsing animation for "scan today" state
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (!scannedToday && currentStreak > 0) {
      pulseScale.value = withRepeat(
        withSequence(
          withSpring(1.02, { damping: 10 }),
          withSpring(1, { damping: 10 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
    }
  }, [scannedToday, currentStreak]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  // Determine visual state
  const isNewUser = currentStreak === 0 && longestStreak === 0;
  const hasActiveStreak = currentStreak > 0;

  // Get status message
  const getStatusMessage = () => {
    if (scannedToday) return "You're all set for today!";
    if (isNewUser) return 'Start your first streak!';
    if (hasActiveStreak) return 'Scan today to keep it going!';
    return 'Start a new streak today!';
  };

  // Calculate milestone progress
  const nextMilestone = MILESTONES.find((m) => currentStreak < m.daysRequired);
  const progressToNext = nextMilestone
    ? Math.min((currentStreak / nextMilestone.daysRequired) * 100, 100)
    : 100;

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()} style={animatedContainerStyle}>
      <Pressable onPress={handlePress}>
        <LinearGradient
          colors={scannedToday ? ['#10B981', '#059669'] : ['#F97316', '#EA580C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 20 }}
        >
          {/* Header Row */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
                <Flame size={24} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-white/80 text-sm font-medium">
                  {hasActiveStreak ? 'Current Streak' : 'Streak'}
                </Text>
                <Text className="text-white text-2xl font-bold">
                  {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
                </Text>
              </View>
            </View>

            {/* Scanned Today Indicator */}
            {scannedToday && (
              <View className="bg-white/20 rounded-full px-3 py-1.5 flex-row items-center">
                <Check size={16} color="#FFFFFF" />
                <Text className="text-white text-sm font-semibold ml-1">Done</Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          {nextMilestone && (
            <View className="mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-white/70 text-xs">
                  Next: {nextMilestone.icon} {nextMilestone.name}
                </Text>
                <Text className="text-white/70 text-xs">
                  {currentStreak}/{nextMilestone.daysRequired} days
                </Text>
              </View>
              <View className="h-2 bg-white/20 rounded-full overflow-hidden">
                <View
                  className="h-full bg-white rounded-full"
                  style={{ width: `${progressToNext}%` }}
                />
              </View>
            </View>
          )}

          {/* Milestone Icons */}
          <View className="flex-row items-center justify-between mb-3">
            {MILESTONES.slice(0, 6).map((milestone) => {
              const achieved = milestones.includes(milestone.id);
              return (
                <View
                  key={milestone.id}
                  className={cn(
                    'w-9 h-9 rounded-full items-center justify-center',
                    achieved ? 'bg-white/30' : 'bg-white/10'
                  )}
                >
                  <Text style={{ fontSize: achieved ? 18 : 14, opacity: achieved ? 1 : 0.5 }}>
                    {milestone.icon}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Bottom Row */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Snowflake size={14} color="rgba(255,255,255,0.7)" />
              <Text className="text-white/70 text-sm ml-1">
                {streakFreezes} freeze{streakFreezes !== 1 ? 's' : ''} available
              </Text>
            </View>
            <Text className="text-white/90 text-sm font-medium">
              {getStatusMessage()}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
```

---

## Task 5: Create MilestoneModal Component

**Files:**
- Create: `src/components/MilestoneModal.tsx`

**Step 1: Create the MilestoneModal component**

```typescript
// src/components/MilestoneModal.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Award } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useStreakStore, type MilestoneProgress } from '@/lib/stores';
import { COLORS } from '@/lib/constants';

export function MilestoneModal() {
  const pendingMilestone = useStreakStore((s) => s.pendingMilestone);
  const dismissMilestone = useStreakStore((s) => s.dismissMilestone);
  const currentStreak = useStreakStore((s) => s.currentStreak);

  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (pendingMilestone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
      rotation.value = withSequence(
        withDelay(200, withSpring(10, { damping: 8 })),
        withSpring(-10, { damping: 8 }),
        withSpring(0, { damping: 10 })
      );
    }
  }, [pendingMilestone]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismissMilestone();
  };

  if (!pendingMilestone) return null;

  return (
    <Modal
      visible={!!pendingMilestone}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable
        className="flex-1 bg-black/60 items-center justify-center px-6"
        onPress={handleDismiss}
      >
        <Animated.View
          entering={ZoomIn.springify()}
          className="w-full max-w-sm"
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={['#F97316', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 24, padding: 24 }}
            >
              {/* Close Button */}
              <Pressable
                onPress={handleDismiss}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 items-center justify-center"
              >
                <X size={18} color="#FFFFFF" />
              </Pressable>

              {/* Content */}
              <View className="items-center pt-4">
                {/* Badge Icon */}
                <Animated.View
                  style={[
                    {
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                    },
                    iconAnimatedStyle,
                  ]}
                >
                  <Text style={{ fontSize: 50 }}>{pendingMilestone.icon}</Text>
                </Animated.View>

                {/* Title */}
                <Text className="text-white/80 text-base font-medium mb-1">
                  Achievement Unlocked!
                </Text>
                <Text className="text-white text-2xl font-bold text-center mb-2">
                  {pendingMilestone.name}
                </Text>

                {/* Streak Count */}
                <View className="bg-white/20 rounded-full px-4 py-2 mb-6">
                  <Text className="text-white text-lg font-semibold">
                    🔥 {currentStreak} Day Streak
                  </Text>
                </View>

                {/* Dismiss Button */}
                <Pressable
                  onPress={handleDismiss}
                  className="bg-white rounded-xl px-8 py-3"
                >
                  <Text className="text-orange-600 font-bold text-base">
                    Awesome!
                  </Text>
                </Pressable>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
```

---

## Task 6: Create AchievementsSection Component

**Files:**
- Create: `src/components/AchievementsSection.tsx`

**Step 1: Create the AchievementsSection component**

```typescript
// src/components/AchievementsSection.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Flame, Trophy, Snowflake } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useStreakStore, MILESTONES } from '@/lib/stores';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';

export function AchievementsSection() {
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const longestStreak = useStreakStore((s) => s.longestStreak);
  const streakFreezes = useStreakStore((s) => s.streakFreezes);
  const milestones = useStreakStore((s) => s.milestones);

  return (
    <Animated.View entering={FadeInDown.delay(200).springify()} className="px-5 mb-6">
      <Text className="text-lg font-bold text-slate-900 mb-4">Achievements</Text>

      {/* Stats Row */}
      <View className="flex-row mb-4">
        {/* Current Streak */}
        <View className="flex-1 bg-orange-50 rounded-2xl p-4 mr-2">
          <View className="flex-row items-center mb-2">
            <Flame size={20} color={COLORS.warningOrange} />
            <Text className="text-orange-600 text-sm font-medium ml-2">Current</Text>
          </View>
          <Text className="text-2xl font-bold text-orange-600">{currentStreak}</Text>
          <Text className="text-orange-400 text-xs">days</Text>
        </View>

        {/* Longest Streak */}
        <View className="flex-1 bg-amber-50 rounded-2xl p-4 mx-1">
          <View className="flex-row items-center mb-2">
            <Trophy size={20} color={COLORS.cautionYellow} />
            <Text className="text-amber-600 text-sm font-medium ml-2">Best</Text>
          </View>
          <Text className="text-2xl font-bold text-amber-600">{longestStreak}</Text>
          <Text className="text-amber-400 text-xs">days</Text>
        </View>

        {/* Freezes */}
        <View className="flex-1 bg-sky-50 rounded-2xl p-4 ml-2">
          <View className="flex-row items-center mb-2">
            <Snowflake size={20} color="#0EA5E9" />
            <Text className="text-sky-600 text-sm font-medium ml-2">Freezes</Text>
          </View>
          <Text className="text-2xl font-bold text-sky-600">{streakFreezes}</Text>
          <Text className="text-sky-400 text-xs">available</Text>
        </View>
      </View>

      {/* Milestone Badges */}
      <View className="bg-white rounded-2xl p-4 border border-slate-100">
        <Text className="text-sm font-semibold text-slate-700 mb-3">Milestones</Text>
        <View className="flex-row flex-wrap">
          {MILESTONES.map((milestone) => {
            const achieved = milestones.includes(milestone.id);
            return (
              <View
                key={milestone.id}
                className={cn(
                  'w-1/3 items-center py-3',
                )}
              >
                <View
                  className={cn(
                    'w-14 h-14 rounded-full items-center justify-center mb-2',
                    achieved ? 'bg-orange-100' : 'bg-slate-100'
                  )}
                >
                  <Text style={{ fontSize: 28, opacity: achieved ? 1 : 0.3 }}>
                    {milestone.icon}
                  </Text>
                </View>
                <Text
                  className={cn(
                    'text-xs text-center font-medium',
                    achieved ? 'text-slate-700' : 'text-slate-400'
                  )}
                  numberOfLines={1}
                >
                  {milestone.name}
                </Text>
                <Text
                  className={cn(
                    'text-xs',
                    achieved ? 'text-orange-500' : 'text-slate-300'
                  )}
                >
                  {milestone.daysRequired} days
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}
```

---

## Task 7: Integrate Streak into Home Screen

**Files:**
- Modify: `src/app/(tabs)/index.tsx`

**Step 1: Add imports**

Add to the existing imports at the top of the file:

```typescript
import { useStreakStore } from '@/lib/stores';
import { StreakCard } from '@/components/StreakCard';
import { MilestoneModal } from '@/components/MilestoneModal';
```

**Step 2: Add StreakCard to the home screen**

Find the section after the greeting/welcome section and before the quick-scan button. Add the StreakCard:

```typescript
{/* Add after greeting section, before the scan button */}
<View className="px-5 mb-4">
  <StreakCard />
</View>
```

**Step 3: Add MilestoneModal**

Add the MilestoneModal at the end of the component, just before the closing SafeAreaView:

```typescript
<MilestoneModal />
```

---

## Task 8: Integrate Streak Recording into Scan Flow

**Files:**
- Modify: `src/app/(tabs)/scan.tsx`

**Step 1: Add imports**

Add to the existing imports:

```typescript
import { useStreakStore } from '@/lib/stores';
import { cancelStreakReminder, sendMilestoneNotification } from '@/lib/services/notifications';
```

**Step 2: Call recordScan after successful scan**

Find the line where `useHistoryStore.getState().addProduct(scannedProduct)` is called (around line 349) and add streak recording right after:

```typescript
useHistoryStore.getState().addProduct(scannedProduct);

// Record scan for streak
const milestone = useStreakStore.getState().recordScan();
if (milestone) {
  sendMilestoneNotification(milestone.name, useStreakStore.getState().currentStreak);
}
cancelStreakReminder(); // Cancel today's reminder since they scanned
```

Do the same for the OCR scan success path (around line 473):

```typescript
useHistoryStore.getState().addProduct(scannedProduct);

// Record scan for streak
const milestone = useStreakStore.getState().recordScan();
if (milestone) {
  sendMilestoneNotification(milestone.name, useStreakStore.getState().currentStreak);
}
cancelStreakReminder();
```

---

## Task 9: Integrate Streak Check on App Launch

**Files:**
- Modify: `src/app/_layout.tsx`

**Step 1: Add imports**

Add to the existing imports:

```typescript
import { useStreakStore } from '@/lib/stores';
import {
  scheduleStreakReminder,
  sendStreakLostNotification,
  sendFreezeUsedNotification
} from '@/lib/services/notifications';
```

**Step 2: Add streak check in RootLayoutNav useEffect**

Modify the useEffect in RootLayoutNav to also check streak:

```typescript
useEffect(() => {
  // Initialize RevenueCat and check streak
  const init = async () => {
    await initialize();

    // Check and update streak status
    const { freezeUsed, streakLost, previousStreak } = useStreakStore.getState().checkAndUpdateStreak();

    if (freezeUsed) {
      sendFreezeUsedNotification(useStreakStore.getState().streakFreezes);
    } else if (streakLost && previousStreak > 0) {
      sendStreakLostNotification(previousStreak);
    }

    // Schedule streak reminder if they have an active streak and haven't scanned today
    const { currentStreak, scannedToday } = useStreakStore.getState();
    if (currentStreak > 0 && !scannedToday) {
      scheduleStreakReminder(currentStreak);
    }

    SplashScreen.hideAsync();
  };

  init();
}, []);
```

---

## Task 10: Add Achievements to Profile Screen

**Files:**
- Modify: `src/app/(tabs)/profile.tsx`

**Step 1: Add import**

Add to the existing imports:

```typescript
import { AchievementsSection } from '@/components/AchievementsSection';
```

**Step 2: Add AchievementsSection to the profile**

Find a suitable location in the profile screen (after the user profile section, before the flags sections). Add:

```typescript
{/* Achievements Section */}
<AchievementsSection />
```

---

## Task 11: TypeScript Verification

**Step 1: Run TypeScript check**

Run: `cd /c/Users/computer/ClearLabel && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

---

## Task 12: Final Testing Checklist

**Manual Testing:**

1. [ ] Open app - streak check runs without errors
2. [ ] Scan a product - streak increments, card updates
3. [ ] Scan same day again - streak doesn't double-increment
4. [ ] Check profile - achievements section shows correctly
5. [ ] Verify milestone at 3 days shows celebration modal
6. [ ] Check notification permission prompt works
7. [ ] Verify streak card shows correct state (scanned vs not scanned)

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `src/lib/stores/streakStore.ts` | CREATE |
| `src/lib/stores/index.ts` | MODIFY - add export |
| `src/lib/services/notifications.ts` | CREATE |
| `src/components/StreakCard.tsx` | CREATE |
| `src/components/MilestoneModal.tsx` | CREATE |
| `src/components/AchievementsSection.tsx` | CREATE |
| `src/app/(tabs)/index.tsx` | MODIFY - add StreakCard + MilestoneModal |
| `src/app/(tabs)/scan.tsx` | MODIFY - call recordScan |
| `src/app/_layout.tsx` | MODIFY - streak check on launch |
| `src/app/(tabs)/profile.tsx` | MODIFY - add AchievementsSection |
