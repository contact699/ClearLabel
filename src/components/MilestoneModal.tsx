// src/components/MilestoneModal.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useStreakStore } from '@/lib/stores';

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
