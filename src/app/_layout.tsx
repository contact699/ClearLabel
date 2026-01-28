import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useSubscriptionStore, useStreakStore } from '@/lib/stores';
import { scheduleStreakReminder, sendStreakLostNotification, sendFreezeUsedNotification, requestNotificationPermissions } from '@/lib/services/notifications';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  const initialize = useSubscriptionStore((s) => s.initialize);
  const checkAndUpdateStreak = useStreakStore((s) => s.checkAndUpdateStreak);
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const scannedToday = useStreakStore((s) => s.scannedToday);

  useEffect(() => {
    // Initialize RevenueCat and hide splash screen
    initialize().finally(() => {
      SplashScreen.hideAsync();
    });

    // Check streak status on app launch
    const checkStreak = async () => {
      const { freezeUsed, streakLost, previousStreak } = checkAndUpdateStreak();

      // Request notification permissions if not already granted
      await requestNotificationPermissions();

      // Send notifications based on streak status
      if (freezeUsed) {
        const freezesRemaining = useStreakStore.getState().streakFreezes;
        sendFreezeUsedNotification(freezesRemaining);
      } else if (streakLost && previousStreak > 0) {
        sendStreakLostNotification(previousStreak);
      }

      // Schedule reminder if user hasn't scanned today and has an active streak
      const state = useStreakStore.getState();
      if (!state.scannedToday && state.currentStreak > 0) {
        scheduleStreakReminder(state.currentStreak);
      }
    };

    checkStreak();
  }, []);
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="result" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="compare" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="shopping-list" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="insights" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="encyclopedia" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}



export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <RootLayoutNav colorScheme={colorScheme} />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}