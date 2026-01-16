import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Check,
  Infinity,
  Brain,
  Clock,
  Users,
  Download,
  Crown,
  Sparkles,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSubscriptionStore } from '@/lib/stores';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';

type BillingPeriod = 'monthly' | 'annual';

const FEATURES = [
  { icon: Infinity, title: 'Unlimited Scans', free: '10/month', pro: 'Unlimited' },
  { icon: Clock, title: 'Scan History', free: '30 days', pro: 'Forever' },
  { icon: Brain, title: 'AI Explanations', free: false, pro: true },
  { icon: Users, title: 'Custom Flags', free: '5', pro: 'Unlimited' },
  { icon: Download, title: 'Export Data', free: false, pro: true },
];

const PRICES = {
  monthly: { price: '$4.99', period: '/month', savings: '' },
  annual: { price: '$29.99', period: '/year', savings: 'Save 50%' },
};

export default function PaywallScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('annual');
  const [isLoading, setIsLoading] = useState(false);
  const setTier = useSubscriptionStore((s) => s.setTier);

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    // Note: This is where RevenueCat integration would go
    // For now, we'll show a message to set up RevenueCat
    setTimeout(() => {
      setIsLoading(false);
      // Show alert that RevenueCat needs to be set up
      alert('Please set up RevenueCat in the PAYMENTS tab to enable subscriptions.');
    }, 1000);
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      alert('Please set up RevenueCat in the PAYMENTS tab to restore purchases.');
    }, 1000);
  };

  return (
    <View className="flex-1 bg-neutral-bg-secondary">
      <LinearGradient
        colors={['#2D9D78', '#1A7D5C']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <X size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={handleRestore}>
            <Text className="text-white/80 font-medium">Restore</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <Animated.View entering={FadeInDown.delay(100).springify()} className="items-center px-8 mt-4">
            <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center mb-4">
              <Crown size={40} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-bold text-white text-center">
              Unlock Pro
            </Text>
            <Text className="text-white/80 text-center mt-2 text-lg">
              Get unlimited scans and AI-powered insights
            </Text>
          </Animated.View>

          {/* Billing Toggle */}
          <Animated.View entering={FadeInDown.delay(200).springify()} className="px-8 mt-8">
            <View className="flex-row bg-white/20 rounded-2xl p-1">
              <Pressable
                onPress={() => setSelectedPeriod('monthly')}
                className={cn(
                  'flex-1 py-3 rounded-xl',
                  selectedPeriod === 'monthly' && 'bg-white'
                )}
              >
                <Text
                  className={cn(
                    'text-center font-semibold',
                    selectedPeriod === 'monthly' ? 'text-brand-green' : 'text-white'
                  )}
                >
                  Monthly
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedPeriod('annual')}
                className={cn(
                  'flex-1 py-3 rounded-xl',
                  selectedPeriod === 'annual' && 'bg-white'
                )}
              >
                <View className="flex-row items-center justify-center">
                  <Text
                    className={cn(
                      'font-semibold',
                      selectedPeriod === 'annual' ? 'text-brand-green' : 'text-white'
                    )}
                  >
                    Annual
                  </Text>
                  {PRICES.annual.savings && (
                    <View className="bg-safe rounded-full px-2 py-0.5 ml-2">
                      <Text className="text-white text-xs font-medium">
                        {PRICES.annual.savings}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </View>
          </Animated.View>

          {/* Price */}
          <Animated.View entering={FadeInDown.delay(300).springify()} className="items-center mt-6">
            <View className="flex-row items-baseline">
              <Text className="text-4xl font-bold text-white">
                {PRICES[selectedPeriod].price}
              </Text>
              <Text className="text-white/80 text-lg ml-1">
                {PRICES[selectedPeriod].period}
              </Text>
            </View>
          </Animated.View>

          {/* Features Comparison */}
          <Animated.View entering={FadeInDown.delay(400).springify()} className="px-5 mt-8">
            <View className="bg-white rounded-2xl p-5 shadow-lg">
              <Text className="text-lg font-semibold text-neutral-primary mb-4">
                What you get
              </Text>

              {FEATURES.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <View
                    key={index}
                    className={cn(
                      'flex-row items-center py-3',
                      index < FEATURES.length - 1 && 'border-b border-neutral-divider'
                    )}
                  >
                    <IconComponent size={20} color={COLORS.brandGreen} />
                    <Text className="flex-1 ml-3 text-neutral-primary font-medium">
                      {feature.title}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-neutral-secondary text-sm mr-4">
                        {typeof feature.free === 'boolean'
                          ? feature.free
                            ? 'Yes'
                            : '—'
                          : feature.free}
                      </Text>
                      <View className="w-16 items-center">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? (
                            <Check size={18} color={COLORS.safeGreen} />
                          ) : (
                            <Text className="text-neutral-secondary">—</Text>
                          )
                        ) : (
                          <Text className="text-brand-green font-semibold text-sm">
                            {feature.pro}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}

              <View className="flex-row mt-4 pt-2">
                <View className="flex-1" />
                <Text className="text-neutral-secondary text-xs mr-4">Free</Text>
                <View className="w-16 items-center">
                  <Text className="text-brand-green text-xs font-semibold">Pro</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* CTA Button */}
          <Animated.View entering={FadeInDown.delay(500).springify()} className="px-5 mt-6 mb-8">
            <Pressable
              onPress={handleSubscribe}
              disabled={isLoading}
              className="bg-brand-green rounded-2xl py-4 flex-row items-center justify-center"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Sparkles size={20} color="#FFFFFF" />
                  <Text className="text-white font-semibold text-lg ml-2">
                    Start Pro - {PRICES[selectedPeriod].price}{PRICES[selectedPeriod].period}
                  </Text>
                </>
              )}
            </Pressable>

            <Text className="text-neutral-secondary text-center text-xs mt-3">
              Cancel anytime. Subscription auto-renews.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
