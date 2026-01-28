// src/components/AchievementsSection.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Flame, Trophy, Snowflake, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useStreakStore, MILESTONES } from '@/lib/stores';
import { cn } from '@/lib/cn';

interface AchievementsSectionProps {
  onViewAll?: () => void;
}

export function AchievementsSection({ onViewAll }: AchievementsSectionProps) {
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const longestStreak = useStreakStore((s) => s.longestStreak);
  const streakFreezes = useStreakStore((s) => s.streakFreezes);
  const milestones = useStreakStore((s) => s.milestones);

  const achievedCount = milestones.length;
  const totalMilestones = MILESTONES.length;

  const handleViewAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewAll?.();
  };

  return (
    <Animated.View entering={FadeInDown.delay(200).springify()}>
      {/* Section Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-zinc-900 dark:text-white">
          Achievements
        </Text>
        {onViewAll && (
          <Pressable
            onPress={handleViewAll}
            className="flex-row items-center"
          >
            <Text className="text-orange-600 font-medium mr-1">View All</Text>
            <ChevronRight size={16} color="#EA580C" />
          </Pressable>
        )}
      </View>

      {/* Stats Row */}
      <View className="flex-row mb-4">
        {/* Current Streak */}
        <View className="flex-1 bg-orange-50 dark:bg-orange-950/30 rounded-2xl p-4 mr-2">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-orange-500 items-center justify-center mr-2">
              <Flame size={18} color="#FFFFFF" />
            </View>
            <Text className="text-orange-600 dark:text-orange-400 font-medium text-sm">
              Current
            </Text>
          </View>
          <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
            {currentStreak}
          </Text>
          <Text className="text-zinc-500 dark:text-zinc-400 text-xs">
            {currentStreak === 1 ? 'day' : 'days'}
          </Text>
        </View>

        {/* Longest Streak */}
        <View className="flex-1 bg-purple-50 dark:bg-purple-950/30 rounded-2xl p-4 mx-1">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-purple-500 items-center justify-center mr-2">
              <Trophy size={18} color="#FFFFFF" />
            </View>
            <Text className="text-purple-600 dark:text-purple-400 font-medium text-sm">
              Best
            </Text>
          </View>
          <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
            {longestStreak}
          </Text>
          <Text className="text-zinc-500 dark:text-zinc-400 text-xs">
            {longestStreak === 1 ? 'day' : 'days'}
          </Text>
        </View>

        {/* Streak Freezes */}
        <View className="flex-1 bg-cyan-50 dark:bg-cyan-950/30 rounded-2xl p-4 ml-2">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-cyan-500 items-center justify-center mr-2">
              <Snowflake size={18} color="#FFFFFF" />
            </View>
            <Text className="text-cyan-600 dark:text-cyan-400 font-medium text-sm">
              Freezes
            </Text>
          </View>
          <Text className="text-2xl font-bold text-zinc-900 dark:text-white">
            {streakFreezes}
          </Text>
          <Text className="text-zinc-500 dark:text-zinc-400 text-xs">
            available
          </Text>
        </View>
      </View>

      {/* Milestones Grid */}
      <View className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-zinc-700 dark:text-zinc-300 font-semibold">
            Milestones
          </Text>
          <Text className="text-zinc-500 dark:text-zinc-400 text-sm">
            {achievedCount}/{totalMilestones}
          </Text>
        </View>

        <View className="flex-row flex-wrap">
          {MILESTONES.map((milestone, index) => {
            const achieved = milestones.includes(milestone.id);
            return (
              <View
                key={milestone.id}
                className={cn(
                  'w-1/3 items-center py-3',
                  index < 3 && 'border-b border-zinc-200 dark:border-zinc-700'
                )}
              >
                <View
                  className={cn(
                    'w-12 h-12 rounded-full items-center justify-center mb-2',
                    achieved
                      ? 'bg-orange-500'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  )}
                >
                  <Text style={{ fontSize: achieved ? 24 : 20, opacity: achieved ? 1 : 0.5 }}>
                    {milestone.icon}
                  </Text>
                </View>
                <Text
                  className={cn(
                    'text-xs text-center font-medium',
                    achieved
                      ? 'text-zinc-900 dark:text-white'
                      : 'text-zinc-400 dark:text-zinc-500'
                  )}
                  numberOfLines={1}
                >
                  {milestone.name}
                </Text>
                <Text
                  className={cn(
                    'text-xs',
                    achieved
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-zinc-400 dark:text-zinc-500'
                  )}
                >
                  {milestone.daysRequired}d
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}
