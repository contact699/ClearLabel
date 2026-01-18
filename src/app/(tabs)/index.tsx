import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScanBarcode, TrendingUp, AlertTriangle, Lightbulb, ChevronRight, Sparkles, CheckCircle, XCircle, ShoppingCart, BarChart3 } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useUserStore, useHistoryStore, useShoppingListStore } from '@/lib/stores';
import { COLORS, DAILY_TIPS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { ScannedProduct, SafetyStatus } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.38;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getStatusIcon(status: SafetyStatus) {
  switch (status) {
    case 'good':
      return <CheckCircle size={14} color={COLORS.safeGreen} />;
    case 'caution':
      return <AlertTriangle size={14} color={COLORS.cautionYellow} />;
    case 'warning':
      return <XCircle size={14} color={COLORS.alertRed} />;
    default:
      return null;
  }
}

function getProductStatus(product: ScannedProduct): SafetyStatus {
  const flagCount = product.flagsTriggered.length;
  if (product.ingredients.length === 0) return 'unknown';
  if (flagCount === 0) return 'good';
  if (flagCount <= 2) return 'caution';
  return 'warning';
}

function getStatusColor(status: SafetyStatus): string {
  switch (status) {
    case 'good':
      return COLORS.safeGreen;
    case 'caution':
      return COLORS.cautionYellow;
    case 'warning':
      return COLORS.alertRed;
    default:
      return COLORS.textMuted;
  }
}

function PulsingDot() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withSpring(1.2, { damping: 10 }),
        withSpring(1, { damping: 10 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: COLORS.safeGreen,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const profileName = useUserStore((s) => s.profile?.name);
  const hasCompletedOnboarding = useUserStore((s) => s.profile?.hasCompletedOnboarding);
  const products = useHistoryStore((s) => s.products);
  const recentProducts = products.slice(0, 6);
  
  // Shopping list data
  const shoppingLists = useShoppingListStore((s) => s.lists);
  const activeListId = useShoppingListStore((s) => s.activeListId);
  const activeList = shoppingLists.find((l) => l.id === activeListId) || shoppingLists[0];
  const uncheckedCount = activeList ? useShoppingListStore.getState().getUncheckedCount(activeList.id) : 0;

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthProducts = products.filter((p: ScannedProduct) => {
      const scannedDate = new Date(p.scannedAt);
      return scannedDate >= startOfMonth;
    });
    const flaggedThisMonth = thisMonthProducts.filter(
      (p: ScannedProduct) => p.flagsTriggered.length > 0
    ).length;
    const safeProducts = products.filter(
      (p: ScannedProduct) => p.flagsTriggered.length === 0
    ).length;
    return { total: products.length, flaggedThisMonth, safeProducts };
  }, [products]);

  useEffect(() => {
    useUserStore.getState().initializeProfile();
  }, []);

  const dailyTip = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleScanPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/scan');
  };

  const handleProductPress = (productId: string) => {
    Haptics.selectionAsync();
    router.push(`/result?id=${productId}`);
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Background gradient */}
      <LinearGradient
        colors={['#F0FDFA', '#F8FAFC', '#FFFFFF']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(50).springify()}
            className="px-6 pt-4 pb-2"
          >
            <View className="flex-row items-center">
              <PulsingDot />
              <Text className="text-sm font-medium text-teal-600 ml-2">Active</Text>
            </View>
            <Text className="text-3xl font-bold text-slate-900 mt-2">
              {getGreeting()},
            </Text>
            <Text className="text-3xl font-bold text-teal-600">
              {profileName || 'there'}
            </Text>
          </Animated.View>

          {/* Main Scan CTA */}
          <Animated.View entering={FadeInDown.delay(100).springify()} className="px-6 mt-6">
            <AnimatedPressable
              onPress={handleScanPress}
              className="overflow-hidden rounded-3xl active:scale-[0.98]"
            >
              <LinearGradient
                colors={[COLORS.brandGreen, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 24, borderRadius: 24 }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center">
                        <ScanBarcode size={22} color="#FFFFFF" />
                      </View>
                      <View className="ml-3 bg-white/20 rounded-full px-3 py-1">
                        <Text className="text-white/90 text-xs font-medium">Quick Scan</Text>
                      </View>
                    </View>
                    <Text className="text-white text-2xl font-bold mt-3">
                      Scan a Product
                    </Text>
                    <Text className="text-white/80 text-base mt-1">
                      Barcode or ingredient list
                    </Text>
                  </View>
                  <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center">
                    <ChevronRight size={28} color="#FFFFFF" />
                  </View>
                </View>
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>

          {/* Stats Cards */}
          <Animated.View entering={FadeInDown.delay(150).springify()} className="px-6 mt-6">
            <View className="flex-row gap-3">
              <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <View className="flex-row items-center justify-between">
                  <View className="w-10 h-10 rounded-xl bg-teal-50 items-center justify-center">
                    <TrendingUp size={20} color={COLORS.brandGreen} />
                  </View>
                  <Text className="text-3xl font-bold text-slate-900">{stats.total}</Text>
                </View>
                <Text className="text-slate-500 text-sm mt-3">Total Scans</Text>
              </View>

              <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <View className="flex-row items-center justify-between">
                  <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
                    <CheckCircle size={20} color={COLORS.safeGreen} />
                  </View>
                  <Text className="text-3xl font-bold text-slate-900">{stats.safeProducts}</Text>
                </View>
                <Text className="text-slate-500 text-sm mt-3">Safe Products</Text>
              </View>

              <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <View className="flex-row items-center justify-between">
                  <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
                    <AlertTriangle size={20} color={COLORS.cautionYellow} />
                  </View>
                  <Text className="text-3xl font-bold text-slate-900">{stats.flaggedThisMonth}</Text>
                </View>
                <Text className="text-slate-500 text-sm mt-3">Flagged</Text>
              </View>
            </View>
          </Animated.View>

          {/* Quick Access Cards */}
          <Animated.View entering={FadeInDown.delay(175).springify()} className="px-6 mt-4 flex-row gap-3">
            {/* Shopping List */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/shopping-list');
              }}
              className="flex-1 bg-orange-50 rounded-2xl p-4 border border-orange-100 active:scale-[0.98]"
            >
              <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center">
                <ShoppingCart size={20} color="#EA580C" />
              </View>
              <Text className="text-slate-900 font-bold text-sm mt-3" numberOfLines={1}>
                {activeList?.name || 'Grocery List'}
              </Text>
              <Text className="text-slate-500 text-xs mt-0.5">
                {uncheckedCount > 0 ? `${uncheckedCount} items` : 'Your list'}
              </Text>
            </Pressable>

            {/* Insights */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/insights');
              }}
              className="flex-1 bg-purple-50 rounded-2xl p-4 border border-purple-100 active:scale-[0.98]"
            >
              <View className="w-10 h-10 rounded-xl bg-purple-100 items-center justify-center">
                <BarChart3 size={20} color="#7C3AED" />
              </View>
              <Text className="text-slate-900 font-bold text-sm mt-3">
                Insights
              </Text>
              <Text className="text-slate-500 text-xs mt-0.5">
                View trends
              </Text>
            </Pressable>
          </Animated.View>

          {/* Recent Scans */}
          {recentProducts.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).springify()} className="mt-8">
              <View className="px-6 flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-slate-900">Recent Scans</Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/history')}
                  className="flex-row items-center"
                >
                  <Text className="text-teal-600 font-semibold text-sm">See All</Text>
                  <ChevronRight size={18} color={COLORS.brandGreen} />
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
                style={{ flexGrow: 0 }}
              >
                {recentProducts.map((product, index) => {
                  const status = getProductStatus(product);
                  const statusColor = getStatusColor(status);
                  return (
                    <Animated.View
                      key={product.id}
                      entering={FadeInRight.delay(50 * index).springify()}
                    >
                      <Pressable
                        onPress={() => handleProductPress(product.id)}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 active:scale-[0.97]"
                        style={{ width: CARD_WIDTH }}
                      >
                        {product.imageURL ? (
                          <Image
                            source={{ uri: product.imageURL }}
                            style={{ width: '100%', height: 100 }}
                            contentFit="cover"
                          />
                        ) : (
                          <View className="w-full h-24 bg-slate-100 items-center justify-center">
                            <ScanBarcode size={24} color={COLORS.textMuted} />
                          </View>
                        )}
                        <View className="p-3">
                          <Text
                            className="text-sm font-semibold text-slate-900"
                            numberOfLines={1}
                          >
                            {product.name}
                          </Text>
                          <View className="flex-row items-center mt-2">
                            <View
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: statusColor }}
                            />
                            <Text className="text-xs text-slate-500">
                              {product.flagsTriggered.length === 0
                                ? 'All clear'
                                : `${product.flagsTriggered.length} flag${product.flagsTriggered.length > 1 ? 's' : ''}`}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            </Animated.View>
          )}

          {/* Daily Tip */}
          <Animated.View entering={FadeInDown.delay(250).springify()} className="px-6 mt-8">
            <View className="bg-gradient-to-br rounded-2xl overflow-hidden">
              <LinearGradient
                colors={['#FFF7ED', '#FFEDD5']}
                style={{ padding: 20, borderRadius: 16 }}
              >
                <View className="flex-row items-start">
                  <View className="w-10 h-10 rounded-xl bg-orange-400 items-center justify-center">
                    <Lightbulb size={20} color="#FFFFFF" />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="text-orange-600 font-bold text-xs uppercase tracking-wide">
                      Tip of the Day
                    </Text>
                    <Text className="text-slate-900 font-semibold text-base mt-1">
                      {dailyTip.title}
                    </Text>
                    <Text className="text-slate-600 text-sm mt-2 leading-5">
                      {dailyTip.description}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Onboarding prompt */}
          {!hasCompletedOnboarding && (
            <Animated.View entering={FadeInDown.delay(300).springify()} className="px-6 mt-6">
              <Pressable
                onPress={() => router.push('/onboarding')}
                className="bg-white rounded-2xl p-5 border-2 border-dashed border-teal-300 active:scale-[0.98]"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-xl bg-teal-50 items-center justify-center">
                    <Sparkles size={24} color={COLORS.brandGreen} />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="text-teal-700 font-bold text-base">
                      Personalize Your Experience
                    </Text>
                    <Text className="text-slate-500 text-sm mt-1">
                      Set up your dietary preferences and concerns
                    </Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.brandGreen} />
                </View>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
