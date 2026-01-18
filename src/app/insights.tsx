import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3,
  PieChart,
  Zap,
  Target,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useHistoryStore } from '@/lib/stores';
import { COLORS } from '@/lib/constants';
import type { ScannedProduct, SafetyStatus } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeRange = 'week' | 'month' | 'all';

function getProductStatus(product: ScannedProduct): SafetyStatus {
  const flagCount = product.flagsTriggered.length;
  if (product.ingredients.length === 0) return 'unknown';
  if (flagCount === 0) return 'good';
  if (flagCount <= 2) return 'caution';
  return 'warning';
}

function getHealthScore(product: ScannedProduct): number {
  // Calculate a health score 0-100 based on various factors
  let score = 100;
  
  // Deduct for flags triggered
  score -= product.flagsTriggered.length * 10;
  
  // Deduct based on nova score (ultra-processed foods)
  if (product.novaScore) {
    score -= (product.novaScore - 1) * 8; // Nova 4 = -24 points
  }
  
  // Add points for good nutriscore
  if (product.nutriscoreGrade) {
    const nutriscoreBonus: Record<string, number> = {
      'a': 15, 'b': 10, 'c': 0, 'd': -10, 'e': -20
    };
    score += nutriscoreBonus[product.nutriscoreGrade.toLowerCase()] || 0;
  }
  
  // Deduct for additives
  score -= product.additives.length * 3;
  
  return Math.max(0, Math.min(100, score));
}

interface BarChartProps {
  data: { label: string; value: number; color: string }[];
  maxValue?: number;
  height?: number;
}

function SimpleBarChart({ data, maxValue, height = 120 }: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  
  return (
    <View className="flex-row items-end justify-between" style={{ height }}>
      {data.map((item, index) => (
        <View key={index} className="items-center flex-1 mx-1">
          <Text className="text-xs text-slate-500 mb-1">{item.value}</Text>
          <View
            className="w-full rounded-t-lg"
            style={{
              height: Math.max(4, (item.value / max) * (height - 30)),
              backgroundColor: item.color,
              minHeight: 4,
            }}
          />
          <Text className="text-xs text-slate-600 mt-2 font-medium">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor?: string;
}

function ProgressRing({ percentage, size = 80, strokeWidth = 8, color, bgColor = '#E2E8F0' }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <View style={{ width: size, height: size }}>
      {/* Background circle */}
      <View
        className="absolute rounded-full"
        style={{
          width: size - strokeWidth,
          height: size - strokeWidth,
          borderWidth: strokeWidth,
          borderColor: bgColor,
          top: strokeWidth / 2,
          left: strokeWidth / 2,
        }}
      />
      {/* Progress arc - simplified with a colored border */}
      <View
        className="absolute rounded-full"
        style={{
          width: size - strokeWidth,
          height: size - strokeWidth,
          borderWidth: strokeWidth,
          borderColor: color,
          borderRightColor: percentage > 25 ? color : 'transparent',
          borderBottomColor: percentage > 50 ? color : 'transparent',
          borderLeftColor: percentage > 75 ? color : 'transparent',
          top: strokeWidth / 2,
          left: strokeWidth / 2,
          transform: [{ rotate: '-90deg' }],
        }}
      />
      {/* Center text */}
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-lg font-bold text-slate-900">{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const products = useHistoryStore((s) => s.products);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Filter products by time range
  const filteredProducts = useMemo(() => {
    const now = new Date();
    return products.filter((p) => {
      const scannedDate = new Date(p.scannedAt);
      if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return scannedDate >= weekAgo;
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return scannedDate >= monthAgo;
      }
      return true; // 'all'
    });
  }, [products, timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredProducts.length === 0) {
      return {
        totalScans: 0,
        healthyPercent: 0,
        cautionPercent: 0,
        warningPercent: 0,
        avgHealthScore: 0,
        topFlaggedIngredients: [] as { name: string; count: number }[],
        scansByDay: [] as { label: string; value: number; color: string }[],
        categoryBreakdown: [] as { name: string; count: number; color: string }[],
        trend: 'neutral' as 'up' | 'down' | 'neutral',
        trendValue: 0,
        suggestions: [] as string[],
      };
    }

    // Status breakdown
    const statusCounts = { good: 0, caution: 0, warning: 0, unknown: 0 };
    filteredProducts.forEach((p) => {
      statusCounts[getProductStatus(p)]++;
    });
    
    const total = filteredProducts.length;
    const healthyPercent = (statusCounts.good / total) * 100;
    const cautionPercent = (statusCounts.caution / total) * 100;
    const warningPercent = (statusCounts.warning / total) * 100;

    // Average health score
    const avgHealthScore = filteredProducts.reduce((sum, p) => sum + getHealthScore(p), 0) / total;

    // Top flagged ingredients
    const ingredientCounts: Record<string, number> = {};
    filteredProducts.forEach((p) => {
      p.ingredients.filter(i => i.isFlagged).forEach((i) => {
        const name = i.name.toLowerCase();
        ingredientCounts[name] = (ingredientCounts[name] || 0) + 1;
      });
      // Also count from flagsTriggered
      p.flagsTriggered.forEach((flag) => {
        ingredientCounts[flag.toLowerCase()] = (ingredientCounts[flag.toLowerCase()] || 0) + 1;
      });
    });
    const topFlaggedIngredients = Object.entries(ingredientCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Scans by day (last 7 days)
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayColors = [
      COLORS.brandGreen, '#3B82F6', '#8B5CF6', '#EC4899', 
      '#F59E0B', '#10B981', '#6366F1'
    ];
    const now = new Date();
    const scansByDay = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = products.filter((p) => {
        const scannedDate = new Date(p.scannedAt);
        return scannedDate >= dayStart && scannedDate < dayEnd;
      }).length;
      return {
        label: dayLabels[date.getDay()],
        value: count,
        color: dayColors[i % dayColors.length],
      };
    });

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    filteredProducts.forEach((p) => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });
    const categoryColors: Record<string, string> = {
      food: COLORS.brandGreen,
      cosmetics: '#EC4899',
      cleaning: '#3B82F6',
      petFood: '#F59E0B',
      other: '#6B7280',
    };
    const categoryLabels: Record<string, string> = {
      food: 'Food',
      cosmetics: 'Cosmetics',
      cleaning: 'Cleaning',
      petFood: 'Pet Food',
      other: 'Other',
    };
    const categoryBreakdown = Object.entries(categoryCounts)
      .map(([name, count]) => ({
        name: categoryLabels[name] || name,
        count,
        color: categoryColors[name] || '#6B7280',
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate trend (compare this period to last period)
    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    let trendValue = 0;
    
    if (timeRange !== 'all') {
      const periodLength = timeRange === 'week' ? 7 : 30;
      const periodMs = periodLength * 24 * 60 * 60 * 1000;
      const previousPeriodStart = new Date(now.getTime() - 2 * periodMs);
      const previousPeriodEnd = new Date(now.getTime() - periodMs);
      
      const previousProducts = products.filter((p) => {
        const date = new Date(p.scannedAt);
        return date >= previousPeriodStart && date < previousPeriodEnd;
      });
      
      const currentHealthy = statusCounts.good;
      const previousHealthy = previousProducts.filter(p => getProductStatus(p) === 'good').length;
      
      if (previousProducts.length > 0 && filteredProducts.length > 0) {
        const currentHealthyPct = (currentHealthy / filteredProducts.length) * 100;
        const previousHealthyPct = (previousHealthy / previousProducts.length) * 100;
        trendValue = Math.round(currentHealthyPct - previousHealthyPct);
        trend = trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'neutral';
      }
    }

    // Generate personalized suggestions
    const suggestions: string[] = [];
    
    if (healthyPercent < 50) {
      suggestions.push('Try scanning products before buying - aim for 70% healthy choices');
    }
    if (topFlaggedIngredients.length > 0) {
      suggestions.push(`Watch out for "${topFlaggedIngredients[0].name}" - it appeared in ${topFlaggedIngredients[0].count} products`);
    }
    if (avgHealthScore < 60) {
      suggestions.push('Look for products with Nutri-Score A or B for healthier options');
    }
    if (warningPercent > 20) {
      suggestions.push('Consider trying alternatives for products with multiple flags');
    }
    if (filteredProducts.some(p => p.novaScore === 4)) {
      suggestions.push('Reduce ultra-processed foods (NOVA 4) for better health outcomes');
    }
    if (suggestions.length === 0) {
      suggestions.push("Great job! You're making mostly healthy choices 🎉");
    }

    return {
      totalScans: total,
      healthyPercent,
      cautionPercent,
      warningPercent,
      avgHealthScore,
      topFlaggedIngredients,
      scansByDay,
      categoryBreakdown,
      trend,
      trendValue,
      suggestions: suggestions.slice(0, 3),
    };
  }, [filteredProducts, products, timeRange]);

  const timeRangeLabel = {
    week: 'This Week',
    month: 'This Month',
    all: 'All Time',
  }[timeRange];

  return (
    <View className="flex-1 bg-slate-50">
      <LinearGradient
        colors={['#0D9488', '#0F766E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-12 pb-6"
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center justify-between px-6 pt-2">
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.back();
              }}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <ArrowLeft size={22} color="#FFFFFF" />
            </Pressable>
            <Text className="text-white text-xl font-bold">Insights</Text>
            <View className="w-10" />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Time Range Selector */}
        <Animated.View entering={FadeInDown.delay(50).springify()} className="px-6 mt-4">
          <View className="flex-row bg-white rounded-xl p-1 shadow-sm border border-slate-100">
            {(['week', 'month', 'all'] as TimeRange[]).map((range) => (
              <Pressable
                key={range}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTimeRange(range);
                }}
                className={`flex-1 py-2 rounded-lg ${timeRange === range ? 'bg-teal-600' : ''}`}
              >
                <Text className={`text-center font-semibold ${timeRange === range ? 'text-white' : 'text-slate-600'}`}>
                  {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'All'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {filteredProducts.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(100).springify()} className="px-6 mt-8">
            <View className="bg-white rounded-2xl p-8 items-center border border-slate-100">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
                <BarChart3 size={32} color="#94A3B8" />
              </View>
              <Text className="text-lg font-bold text-slate-900 text-center">No Data Yet</Text>
              <Text className="text-slate-500 text-center mt-2">
                Scan some products to see your insights and health trends
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/scan')}
                className="mt-4 bg-teal-600 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Start Scanning</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <>
            {/* Summary Card */}
            <Animated.View entering={FadeInDown.delay(100).springify()} className="px-6 mt-4">
              <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 rounded-xl bg-teal-50 items-center justify-center">
                    <BarChart3 size={22} color={COLORS.brandGreen} />
                  </View>
                  <Text className="text-lg font-bold text-slate-900 ml-3">{timeRangeLabel} Summary</Text>
                </View>
                
                <View className="flex-row items-center justify-between">
                  <View className="items-center">
                    <Text className="text-4xl font-bold text-slate-900">{stats.totalScans}</Text>
                    <Text className="text-slate-500 text-sm mt-1">Products Scanned</Text>
                  </View>
                  
                  <View className="h-16 w-px bg-slate-200" />
                  
                  <View className="items-center">
                    <View className="flex-row items-center">
                      <Text className="text-4xl font-bold text-slate-900">{Math.round(stats.avgHealthScore)}</Text>
                      <Text className="text-slate-500 ml-1">/100</Text>
                    </View>
                    <Text className="text-slate-500 text-sm mt-1">Avg Health Score</Text>
                  </View>
                  
                  <View className="h-16 w-px bg-slate-200" />
                  
                  <View className="items-center">
                    {stats.trend === 'up' ? (
                      <View className="flex-row items-center">
                        <TrendingUp size={20} color={COLORS.safeGreen} />
                        <Text className="text-2xl font-bold text-emerald-600 ml-1">+{stats.trendValue}%</Text>
                      </View>
                    ) : stats.trend === 'down' ? (
                      <View className="flex-row items-center">
                        <TrendingDown size={20} color={COLORS.alertRed} />
                        <Text className="text-2xl font-bold text-red-600 ml-1">{stats.trendValue}%</Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center">
                        <Minus size={20} color="#64748B" />
                        <Text className="text-2xl font-bold text-slate-600 ml-1">0%</Text>
                      </View>
                    )}
                    <Text className="text-slate-500 text-sm mt-1">Trend</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Health Breakdown */}
            <Animated.View entering={FadeInDown.delay(150).springify()} className="px-6 mt-4">
              <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
                    <PieChart size={22} color={COLORS.safeGreen} />
                  </View>
                  <Text className="text-lg font-bold text-slate-900 ml-3">Health Breakdown</Text>
                </View>
                
                <View className="flex-row items-center justify-around">
                  {/* Healthy */}
                  <View className="items-center">
                    <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-2">
                      <CheckCircle size={28} color={COLORS.safeGreen} />
                    </View>
                    <Text className="text-2xl font-bold text-emerald-600">{Math.round(stats.healthyPercent)}%</Text>
                    <Text className="text-slate-500 text-sm">Healthy</Text>
                  </View>
                  
                  {/* Caution */}
                  <View className="items-center">
                    <View className="w-16 h-16 rounded-full bg-amber-50 items-center justify-center mb-2">
                      <AlertTriangle size={28} color={COLORS.cautionYellow} />
                    </View>
                    <Text className="text-2xl font-bold text-amber-600">{Math.round(stats.cautionPercent)}%</Text>
                    <Text className="text-slate-500 text-sm">Caution</Text>
                  </View>
                  
                  {/* Warning */}
                  <View className="items-center">
                    <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-2">
                      <XCircle size={28} color={COLORS.alertRed} />
                    </View>
                    <Text className="text-2xl font-bold text-red-600">{Math.round(stats.warningPercent)}%</Text>
                    <Text className="text-slate-500 text-sm">Avoid</Text>
                  </View>
                </View>
                
                {/* Progress bar */}
                <View className="mt-4 h-3 bg-slate-100 rounded-full overflow-hidden flex-row">
                  <View 
                    className="h-full bg-emerald-500" 
                    style={{ width: `${stats.healthyPercent}%` }} 
                  />
                  <View 
                    className="h-full bg-amber-400" 
                    style={{ width: `${stats.cautionPercent}%` }} 
                  />
                  <View 
                    className="h-full bg-red-500" 
                    style={{ width: `${stats.warningPercent}%` }} 
                  />
                </View>
              </View>
            </Animated.View>

            {/* Scans by Day Chart */}
            <Animated.View entering={FadeInDown.delay(200).springify()} className="px-6 mt-4">
              <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                    <Calendar size={22} color="#3B82F6" />
                  </View>
                  <Text className="text-lg font-bold text-slate-900 ml-3">Last 7 Days</Text>
                </View>
                
                <SimpleBarChart data={stats.scansByDay} height={120} />
              </View>
            </Animated.View>

            {/* Top Flagged Ingredients */}
            {stats.topFlaggedIngredients.length > 0 && (
              <Animated.View entering={FadeInDown.delay(250).springify()} className="px-6 mt-4">
                <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
                      <AlertTriangle size={22} color={COLORS.alertRed} />
                    </View>
                    <Text className="text-lg font-bold text-slate-900 ml-3">Most Flagged</Text>
                  </View>
                  
                  {stats.topFlaggedIngredients.map((ingredient, index) => (
                    <View 
                      key={ingredient.name} 
                      className={`flex-row items-center justify-between py-3 ${index < stats.topFlaggedIngredients.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                      <View className="flex-row items-center flex-1">
                        <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center">
                          <Text className="text-red-600 font-bold text-sm">{index + 1}</Text>
                        </View>
                        <Text className="text-slate-900 font-medium ml-3 capitalize flex-1" numberOfLines={1}>
                          {ingredient.name}
                        </Text>
                      </View>
                      <View className="bg-red-50 px-3 py-1 rounded-full">
                        <Text className="text-red-600 font-semibold text-sm">
                          {ingredient.count}x
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Category Breakdown */}
            {stats.categoryBreakdown.length > 0 && (
              <Animated.View entering={FadeInDown.delay(300).springify()} className="px-6 mt-4">
                <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center">
                      <Target size={22} color="#8B5CF6" />
                    </View>
                    <Text className="text-lg font-bold text-slate-900 ml-3">Categories</Text>
                  </View>
                  
                  {stats.categoryBreakdown.map((category, index) => {
                    const percentage = (category.count / stats.totalScans) * 100;
                    return (
                      <View key={category.name} className="mb-3">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-slate-700 font-medium">{category.name}</Text>
                          <Text className="text-slate-500 text-sm">{category.count} ({Math.round(percentage)}%)</Text>
                        </View>
                        <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <View 
                            className="h-full rounded-full" 
                            style={{ width: `${percentage}%`, backgroundColor: category.color }} 
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* Personalized Suggestions */}
            <Animated.View entering={FadeInDown.delay(350).springify()} className="px-6 mt-4">
              <View className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-5 border border-teal-100">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 rounded-xl bg-teal-100 items-center justify-center">
                    <Sparkles size={22} color={COLORS.brandGreen} />
                  </View>
                  <Text className="text-lg font-bold text-slate-900 ml-3">Tips for You</Text>
                </View>
                
                {stats.suggestions.map((suggestion, index) => (
                  <View key={index} className="flex-row items-start mb-3 last:mb-0">
                    <View className="w-6 h-6 rounded-full bg-teal-100 items-center justify-center mt-0.5">
                      <Zap size={14} color={COLORS.brandGreen} />
                    </View>
                    <Text className="text-slate-700 ml-3 flex-1 leading-5">{suggestion}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* View Full History CTA */}
            <Animated.View entering={FadeInDown.delay(400).springify()} className="px-6 mt-4 mb-4">
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/(tabs)/history');
                }}
                className="bg-white rounded-2xl p-4 flex-row items-center justify-between border border-slate-100 active:scale-[0.98]"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
                    <Calendar size={20} color="#64748B" />
                  </View>
                  <Text className="text-slate-900 font-semibold ml-3">View Full History</Text>
                </View>
                <ChevronRight size={20} color="#64748B" />
              </Pressable>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
