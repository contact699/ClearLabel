import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useUserStore } from '@/lib/stores';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  const router = useRouter();
  const segments = useSegments();
  const profile = useUserStore((s) => s.profile);
  const hasCompletedOnboarding = profile?.hasCompletedOnboarding ?? false;

  useEffect(() => {
    // Initialize profile if it doesn't exist
    if (!profile) {
      useUserStore.getState().initializeProfile();
    }

    // Only redirect after splash screen is hidden and profile is loaded
    if (profile !== null) {
      const inOnboarding = segments[0] === 'onboarding';

      // Redirect to onboarding if not completed and not already there
      if (!hasCompletedOnboarding && !inOnboarding) {
        router.replace('/onboarding');
      }

      // Redirect to tabs if onboarding is completed and still on onboarding screen
      if (hasCompletedOnboarding && inOnboarding) {
        router.replace('/(tabs)');
      }
    }
  }, [profile, hasCompletedOnboarding, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="result" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="compare" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}



export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <RootLayoutNav colorScheme={colorScheme} />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}