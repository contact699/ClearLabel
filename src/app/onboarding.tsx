import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ScanBarcode,
  Shield,
  Sparkles,
  AlertCircle,
  Leaf,
  Beaker,
  TreePine,
  ChevronRight,
  Check,
  Zap,
  Brain,
} from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '@/lib/stores';
import { COLORS } from '@/lib/constants';
import { PREDEFINED_FLAGS } from '@/lib/types';
import { cn } from '@/lib/cn';
import type { FlagType } from '@/lib/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const STEPS = ['welcome', 'allergens', 'dietary', 'additives', 'environmental', 'complete'] as const;
type Step = typeof STEPS[number];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedFlags, setSelectedFlags] = useState<Record<string, boolean>>({});

  const currentStep = STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === STEPS.length - 1;

  React.useEffect(() => {
    const profile = useUserStore.getState().profile;
    if (!profile) {
      useUserStore.getState().initializeProfile();
    }
  }, []);

  const toggleFlag = (flagType: FlagType, value: string) => {
    Haptics.selectionAsync();
    const key = `${flagType}:${value}`;
    setSelectedFlags((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isFlagSelected = (flagType: FlagType, value: string) => {
    return selectedFlags[`${flagType}:${value}`] ?? false;
  };

  const goToNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Object.entries(selectedFlags).forEach(([key, isSelected]) => {
      if (isSelected) {
        const [flagType, value] = key.split(':') as [FlagType, string];
        let flag: { value: string; display: string } | undefined;

        if (flagType === 'allergen') {
          flag = PREDEFINED_FLAGS.allergens.find((f) => f.value === value);
        } else if (flagType === 'dietary') {
          flag = PREDEFINED_FLAGS.dietary.find((f) => f.value === value);
        } else if (flagType === 'additive') {
          flag = PREDEFINED_FLAGS.additives.find((f) => f.value === value);
        } else if (flagType === 'environmental') {
          flag = PREDEFINED_FLAGS.environmental.find((f) => f.value === value);
        }

        if (flag) {
          useUserStore.getState().addFlag(flagType, value, flag.display);
        }
      }
    });

    useUserStore.getState().completeOnboarding();
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useUserStore.getState().completeOnboarding();
    router.replace('/(tabs)');
  };

  const selectedCount = Object.values(selectedFlags).filter(Boolean).length;

  const getStepConfig = (step: Step) => {
    switch (step) {
      case 'allergens':
        return {
          icon: <AlertCircle size={28} color="#FFFFFF" />,
          gradient: ['#EF4444', '#DC2626'] as [string, string],
          bgLight: '#FEE2E2',
        };
      case 'dietary':
        return {
          icon: <Leaf size={28} color="#FFFFFF" />,
          gradient: ['#10B981', '#059669'] as [string, string],
          bgLight: '#D1FAE5',
        };
      case 'additives':
        return {
          icon: <Beaker size={28} color="#FFFFFF" />,
          gradient: ['#F59E0B', '#D97706'] as [string, string],
          bgLight: '#FEF3C7',
        };
      case 'environmental':
        return {
          icon: <TreePine size={28} color="#FFFFFF" />,
          gradient: [COLORS.brandGreen, COLORS.gradientEnd] as [string, string],
          bgLight: COLORS.brandGreenLight,
        };
      default:
        return {
          icon: <Shield size={28} color="#FFFFFF" />,
          gradient: [COLORS.brandGreen, COLORS.gradientEnd] as [string, string],
          bgLight: COLORS.brandGreenLight,
        };
    }
  };

  const renderFlagSelector = (
    flagType: FlagType,
    title: string,
    subtitle: string,
    flags: readonly { readonly value: string; readonly display: string }[]
  ) => {
    const config = getStepConfig(currentStep);

    return (
      <Animated.View
        key={currentStep}
        entering={FadeIn.duration(400)}
        className="flex-1 px-6 pt-6"
      >
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          className="items-center mb-6"
        >
          <View className="w-20 h-20 rounded-3xl items-center justify-center mb-4 overflow-hidden">
            <LinearGradient
              colors={config.gradient}
              style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            >
              {config.icon}
            </LinearGradient>
          </View>
          <Text className="text-2xl font-bold text-slate-900 text-center">
            {title}
          </Text>
          <Text className="text-slate-500 text-center mt-2">
            {subtitle}
          </Text>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
        >
          <View className="flex-row flex-wrap justify-center">
            {flags.map((flag, flagIndex) => {
              const isSelected = isFlagSelected(flagType, flag.value);
              return (
                <Animated.View
                  key={flag.value}
                  entering={FadeInUp.delay(50 + 40 * flagIndex).springify()}
                >
                  <Pressable
                    onPress={() => toggleFlag(flagType, flag.value)}
                    className={cn(
                      'm-1.5 rounded-2xl border-2 active:scale-95',
                      isSelected
                        ? 'border-transparent'
                        : 'bg-white border-slate-200'
                    )}
                    style={isSelected ? { backgroundColor: config.bgLight, borderColor: config.gradient[0] } : {}}
                  >
                    <View className="px-5 py-3 flex-row items-center">
                      {isSelected && (
                        <View
                          className="w-5 h-5 rounded-full items-center justify-center mr-2"
                          style={{ backgroundColor: config.gradient[0] }}
                        >
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                      <Text
                        className={cn(
                          'font-semibold',
                          isSelected ? '' : 'text-slate-700'
                        )}
                        style={isSelected ? { color: config.gradient[0] } : {}}
                      >
                        {flag.display}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        <Text className="text-slate-400 text-center text-sm">
          You can change these anytime in Settings
        </Text>
      </Animated.View>
    );
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <Animated.View
            key="welcome"
            entering={FadeIn.duration(400)}
            className="flex-1 px-8 justify-center items-center"
          >
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              className="w-28 h-28 rounded-[32px] items-center justify-center mb-8 overflow-hidden"
            >
              <LinearGradient
                colors={[COLORS.brandGreen, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              >
                <ScanBarcode size={56} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(200).springify()}
              className="text-3xl font-bold text-slate-900 text-center leading-10"
            >
              Know What's In Your Products
            </Animated.Text>

            <Animated.Text
              entering={FadeInDown.delay(300).springify()}
              className="text-lg text-slate-500 text-center mt-4 leading-7"
            >
              Scan barcodes or ingredients to get instant health insights tailored to you.
            </Animated.Text>

            <Animated.View
              entering={FadeInUp.delay(400).springify()}
              className="flex-row mt-10 gap-5"
            >
              <View className="items-center">
                <View className="w-14 h-14 rounded-2xl bg-teal-50 items-center justify-center">
                  <Shield size={26} color={COLORS.brandGreen} />
                </View>
                <Text className="text-xs text-slate-500 mt-2 text-center font-medium">Custom{'\n'}Alerts</Text>
              </View>
              <View className="items-center">
                <View className="w-14 h-14 rounded-2xl bg-teal-50 items-center justify-center">
                  <Zap size={26} color={COLORS.brandGreen} />
                </View>
                <Text className="text-xs text-slate-500 mt-2 text-center font-medium">Instant{'\n'}Results</Text>
              </View>
              <View className="items-center">
                <View className="w-14 h-14 rounded-2xl bg-teal-50 items-center justify-center">
                  <Brain size={26} color={COLORS.brandGreen} />
                </View>
                <Text className="text-xs text-slate-500 mt-2 text-center font-medium">AI{'\n'}Analysis</Text>
              </View>
            </Animated.View>
          </Animated.View>
        );

      case 'allergens':
        return renderFlagSelector(
          'allergen',
          'Any Allergies?',
          'Select ingredients you need to avoid',
          PREDEFINED_FLAGS.allergens
        );

      case 'dietary':
        return renderFlagSelector(
          'dietary',
          'Dietary Preferences?',
          'Choose your lifestyle preferences',
          PREDEFINED_FLAGS.dietary
        );

      case 'additives':
        return renderFlagSelector(
          'additive',
          'Additives to Avoid?',
          'Flag common additives you want to know about',
          PREDEFINED_FLAGS.additives.slice(0, 6)
        );

      case 'environmental':
        return renderFlagSelector(
          'environmental',
          'Environmental Concerns?',
          'Flag ingredients with environmental impact',
          PREDEFINED_FLAGS.environmental
        );

      case 'complete':
        return (
          <Animated.View
            key="complete"
            entering={FadeIn.duration(400)}
            className="flex-1 px-8 justify-center items-center"
          >
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              className="w-24 h-24 rounded-[28px] items-center justify-center mb-8 overflow-hidden"
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              >
                <Check size={48} color="#FFFFFF" strokeWidth={3} />
              </LinearGradient>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(200).springify()}
              className="text-3xl font-bold text-slate-900 text-center"
            >
              You're All Set!
            </Animated.Text>

            <Animated.Text
              entering={FadeInDown.delay(300).springify()}
              className="text-lg text-slate-500 text-center mt-4 leading-7"
            >
              {selectedCount > 0
                ? `We'll flag ${selectedCount} ingredient type${selectedCount === 1 ? '' : 's'} for you.`
                : 'Start scanning products to see personalized ingredient alerts.'}
            </Animated.Text>

            {selectedCount > 0 && (
              <Animated.View
                entering={FadeInUp.delay(400).springify()}
                className="mt-8 bg-emerald-50 px-6 py-4 rounded-2xl"
              >
                <Text className="text-emerald-700 font-semibold text-center">
                  {selectedCount} preference{selectedCount !== 1 ? 's' : ''} saved
                </Text>
              </Animated.View>
            )}
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <LinearGradient
        colors={['#F0FDFA', '#F8FAFC', '#FFFFFF']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.5 }}
      />

      <SafeAreaView className="flex-1">
        {/* Skip button */}
        {!isLastStep && (
          <Animated.View
            entering={FadeIn.delay(200)}
            className="flex-row justify-end px-5 pt-2"
          >
            <Pressable
              onPress={handleSkip}
              className="py-2 px-4 bg-white/80 rounded-full"
            >
              <Text className="text-slate-500 font-medium">Skip</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Content */}
        {renderContent()}

        {/* Progress & Button */}
        <View className="px-6 pb-8">
          {/* Progress indicator */}
          <View className="flex-row justify-center items-center mb-6 gap-2">
            {STEPS.map((_, index) => (
              <View
                key={index}
                className={cn(
                  'rounded-full transition-all',
                  index === currentStepIndex
                    ? 'w-8 h-2 bg-teal-600'
                    : index < currentStepIndex
                      ? 'w-2 h-2 bg-teal-400'
                      : 'w-2 h-2 bg-slate-200'
                )}
              />
            ))}
          </View>

          {/* Action button */}
          <Pressable
            onPress={isLastStep ? handleComplete : goToNextStep}
            className="overflow-hidden rounded-2xl active:scale-[0.98]"
          >
            <LinearGradient
              colors={isLastStep ? ['#10B981', '#059669'] : [COLORS.brandGreen, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text className="text-white font-bold text-lg">
                {isLastStep ? 'Start Scanning' : 'Continue'}
              </Text>
              {!isLastStep && <ChevronRight size={22} color="#FFFFFF" style={{ marginLeft: 4 }} />}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
