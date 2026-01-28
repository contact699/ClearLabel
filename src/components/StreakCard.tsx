// src/components/StreakCard.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Snowflake, Check } from 'lucide-react-native';
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
