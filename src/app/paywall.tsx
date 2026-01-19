import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
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
  ShoppingCart,
  Zap,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSubscriptionStore } from '@/lib/stores';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { PACKAGE_TYPE } from 'react-native-purchases';

const FEATURES = [
  { icon: Infinity, title: 'Unlimited Scans', free: '20/month', pro: 'Unlimited' },
  { icon: Brain, title: 'AI Explanations', free: false, pro: true },
  { icon: Clock, title: 'Scan History', free: '30 days', pro: 'Forever' },
  { icon: Users, title: 'Family Profiles', free: '2', pro: 'Unlimited' },
  { icon: ShoppingCart, title: 'Shared Lists', free: '1', pro: 'Unlimited' },
  { icon: Download, title: 'Export Data', free: false, pro: true },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>('annual');
  
  const isLoading = useSubscriptionStore((s) => s.isLoading);
  const offerings = useSubscriptionStore((s) => s.offerings);
  const purchase = useSubscriptionStore((s) => s.purchase);
  const restore = useSubscriptionStore((s) => s.restore);
  const loadOfferings = useSubscriptionStore((s) => s.loadOfferings);

  // Load offerings on mount
  useEffect(() => {
    loadOfferings();
  }, []);

  // Get available packages
  const packages = useMemo(() => {
    if (!offerings?.availablePackages) return [];
    return offerings.availablePackages;
  }, [offerings]);

  // Select annual by default, or first package
  useEffect(() => {
    if (packages.length > 0 && selectedPackageId === 'annual') {
      const annual = packages.find(p => p.packageType === PACKAGE_TYPE.ANNUAL);
      if (annual) {
        setSelectedPackageId(annual.identifier);
      } else if (packages[0]) {
        setSelectedPackageId(packages[0].identifier);
      }
    }
  }, [packages]);

  const selectedPackage = packages.find(p => p.identifier === selectedPackageId);

  // Calculate savings for annual
  const annualSavings = useMemo(() => {
    const monthly = packages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY);
    const annual = packages.find(p => p.packageType === PACKAGE_TYPE.ANNUAL);
    
    if (!monthly || !annual) return 'Save 50%'; // Default
    
    const monthlyAnnualCost = monthly.product.price * 12;
    const savings = Math.round((1 - annual.product.price / monthlyAnnualCost) * 100);
    return savings > 0 ? `Save ${savings}%` : null;
  }, [packages]);

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If no real packages, show setup message
    if (!selectedPackage) {
      Alert.alert(
        'Setup Required',
        'To enable purchases:\n\n1. Create a RevenueCat account\n2. Add your API keys to .env\n3. Create products in App Store Connect\n4. Configure offerings in RevenueCat',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await purchase(selectedPackage);
    
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else if (result.error && result.error !== 'cancelled') {
      Alert.alert('Purchase Failed', result.error);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await restore();
    
    if (result.success) {
      if (result.isPro) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Restored!', 'Your Pro subscription has been restored.');
        router.back();
      } else {
        Alert.alert('No Subscription Found', 'No active subscription found for this account.');
      }
    } else if (result.error) {
      Alert.alert('Restore Failed', result.error);
    }
  };

  // Display prices
  const monthlyPrice = packages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY)?.product.priceString || '$4.99';
  const annualPrice = packages.find(p => p.packageType === PACKAGE_TYPE.ANNUAL)?.product.priceString || '$29.99';

  return (
    <View className="flex-1 bg-slate-50">
      <LinearGradient
        colors={['#0D9488', '#0F766E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
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
          <Pressable onPress={handleRestore} disabled={isLoading}>
            <Text className="text-white/80 font-medium">Restore</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <Animated.View entering={FadeInDown.delay(100).springify()} className="items-center px-8 mt-2">
            <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center mb-4">
              <Crown size={40} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-bold text-white text-center">
              Unlock Pro
            </Text>
            <Text className="text-white/80 text-center mt-2 text-lg">
              Get unlimited scans and premium features
            </Text>
          </Animated.View>

          {/* Package Selection */}
          <Animated.View entering={FadeInDown.delay(200).springify()} className="px-6 mt-6">
            <View className="flex-row gap-3">
              {/* Monthly Option */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  const pkg = packages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY);
                  setSelectedPackageId(pkg?.identifier || 'monthly');
                }}
                className={cn(
                  'flex-1 rounded-2xl p-4 border-2',
                  (selectedPackageId === 'monthly' || selectedPackage?.packageType === PACKAGE_TYPE.MONTHLY)
                    ? 'bg-white border-teal-500' 
                    : 'bg-white/90 border-transparent'
                )}
              >
                <Text className="font-semibold text-center text-slate-600">Monthly</Text>
                <Text className="text-xl font-bold text-center mt-1 text-slate-900">
                  {monthlyPrice}
                </Text>
                <Text className="text-slate-500 text-xs text-center">per month</Text>
              </Pressable>

              {/* Annual Option */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  const pkg = packages.find(p => p.packageType === PACKAGE_TYPE.ANNUAL);
                  setSelectedPackageId(pkg?.identifier || 'annual');
                }}
                className={cn(
                  'flex-1 rounded-2xl p-4 border-2',
                  (selectedPackageId === 'annual' || selectedPackage?.packageType === PACKAGE_TYPE.ANNUAL)
                    ? 'bg-white border-teal-500' 
                    : 'bg-white/90 border-transparent'
                )}
              >
                {annualSavings && (
                  <View className="absolute -top-2 -right-2 bg-amber-500 rounded-full px-2 py-0.5">
                    <Text className="text-white text-xs font-bold">{annualSavings}</Text>
                  </View>
                )}
                <Text className="font-semibold text-center text-slate-600">Annual</Text>
                <Text className="text-xl font-bold text-center mt-1 text-slate-900">
                  {annualPrice}
                </Text>
                <Text className="text-slate-500 text-xs text-center">per year</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Features Comparison */}
          <Animated.View entering={FadeInDown.delay(300).springify()} className="px-5 mt-6">
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <Text className="text-lg font-bold text-slate-900 mb-4">
                What's included
              </Text>

              {FEATURES.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <View
                    key={index}
                    className={cn(
                      'flex-row items-center py-3',
                      index < FEATURES.length - 1 && 'border-b border-slate-100'
                    )}
                  >
                    <View className="w-8 h-8 rounded-lg bg-teal-50 items-center justify-center">
                      <IconComponent size={18} color={COLORS.brandGreen} />
                    </View>
                    <Text className="flex-1 ml-3 text-slate-900 font-medium">
                      {feature.title}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-slate-400 text-sm w-16 text-center">
                        {typeof feature.free === 'boolean'
                          ? feature.free ? '✓' : '—'
                          : feature.free}
                      </Text>
                      <View className="w-16 items-center">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? (
                            <Check size={18} color={COLORS.safeGreen} />
                          ) : (
                            <Text className="text-slate-400">—</Text>
                          )
                        ) : (
                          <Text className="text-teal-600 font-semibold text-sm">
                            {feature.pro}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}

              <View className="flex-row mt-2 pt-2 border-t border-slate-100">
                <View className="flex-1" />
                <Text className="text-slate-400 text-xs w-16 text-center">Free</Text>
                <Text className="text-teal-600 text-xs font-semibold w-16 text-center">Pro</Text>
              </View>
            </View>
          </Animated.View>

          {/* CTA Button */}
          <Animated.View entering={FadeInDown.delay(400).springify()} className="px-5 mt-6 mb-8">
            <Pressable
              onPress={handleSubscribe}
              disabled={isLoading}
              className="bg-teal-600 rounded-2xl py-4 flex-row items-center justify-center active:bg-teal-700"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Zap size={20} color="#FFFFFF" />
                  <Text className="text-white font-bold text-lg ml-2">
                    Start Pro — {selectedPackage?.product.priceString || (selectedPackageId === 'annual' ? annualPrice : monthlyPrice)}
                  </Text>
                </>
              )}
            </Pressable>

            <Text className="text-slate-400 text-center text-xs mt-3">
              Cancel anytime • Subscription auto-renews
            </Text>

            <Text className="text-slate-400 text-center text-xs mt-2">
              By subscribing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
