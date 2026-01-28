// src/lib/services/notifications.ts
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
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
      type: Notifications.SchedulableTriggerInputTypes.DATE,
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
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextSunday,
    },
    identifier: WEEKLY_DIGEST_ID,
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
