import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, Pressable, TextInput, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ScanBarcode,
  Trash2,
  Filter,
  Clock,
  Scale,
  BarChart3,
} from 'lucide-react-native';
import Animated, {
  FadeInRight,
  FadeOut,
  Layout,
  FadeInDown,
  SlideInRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { useHistoryStore, useCompareStore } from '@/lib/stores';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { ScannedProduct, ProductCategory, SafetyStatus } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_FILTERS: { key: ProductCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '' },
  { key: 'food', label: 'Food', emoji: '' },
  { key: 'cosmetics', label: 'Beauty', emoji: '' },
  { key: 'cleaning', label: 'Cleaning', emoji: '' },
  { key: 'petFood', label: 'Pet', emoji: '' },
];

type StatusFilter = 'all' | 'safe' | 'flagged';

function getProductStatus(product: ScannedProduct): SafetyStatus {
  const flagCount = product.flagsTriggered.length;
  if (product.ingredients.length === 0) return 'unknown';
  if (flagCount === 0) return 'good';
  if (flagCount <= 2) return 'caution';
  return 'warning';
}

function getStatusConfig(status: SafetyStatus) {
  switch (status) {
    case 'good':
      return {
        icon: <CheckCircle size={16} color={COLORS.safeGreen} />,
        color: COLORS.safeGreen,
        bgColor: COLORS.safeGreenLight,
        label: 'Safe',
      };
    case 'caution':
      return {
        icon: <AlertTriangle size={16} color={COLORS.cautionYellow} />,
        color: COLORS.cautionYellow,
        bgColor: COLORS.cautionYellowLight,
        label: 'Caution',
      };
    case 'warning':
      return {
        icon: <XCircle size={16} color={COLORS.alertRed} />,
        color: COLORS.alertRed,
        bgColor: COLORS.alertRedLight,
        label: 'Warning',
      };
    default:
      return {
        icon: null,
        color: COLORS.textMuted,
        bgColor: COLORS.backgroundTertiary,
        label: 'Unknown',
      };
  }
}

function getDateGroup(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date)) return 'This Week';
  if (isThisMonth(date)) return 'This Month';
  return format(date, 'MMMM yyyy');
}

interface GroupedProducts {
  title: string;
  data: ScannedProduct[];
}

export default function HistoryScreen() {
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: StatusFilter }>();
  const products = useHistoryStore((s) => s.products);
  const removeProduct = useHistoryStore((s) => s.removeProduct);
  const searchProducts = useHistoryStore((s) => s.searchProducts);
  const addToCompare = useCompareStore((s) => s.addToCompare);
  const isInCompare = useCompareStore((s) => s.isInCompare);
  const canCompare = useCompareStore((s) => s.canCompare);
  const compareCount = useCompareStore((s) => s.getCompareCount);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Apply filter from URL params
  useEffect(() => {
    if (filter === 'safe' || filter === 'flagged') {
      setStatusFilter(filter);
    }
  }, [filter]);

  const filteredProducts = useMemo(() => {
    let result = searchQuery.trim() ? searchProducts(searchQuery) : products;

    if (selectedCategory !== 'all') {
      result = result.filter((p: ScannedProduct) => p.category === selectedCategory);
    }

    // Apply status filter
    if (statusFilter === 'safe') {
      result = result.filter((p: ScannedProduct) => p.flagsTriggered.length === 0);
    } else if (statusFilter === 'flagged') {
      result = result.filter((p: ScannedProduct) => p.flagsTriggered.length > 0);
    }

    return result;
  }, [products, searchQuery, selectedCategory, statusFilter, searchProducts]);

  const groupedProducts = useMemo(() => {
    const groups: Record<string, ScannedProduct[]> = {};

    filteredProducts.forEach((product: ScannedProduct) => {
      const date = new Date(product.scannedAt);
      const groupTitle = getDateGroup(date);

      if (!groups[groupTitle]) {
        groups[groupTitle] = [];
      }
      groups[groupTitle].push(product);
    });

    const sortedGroups: GroupedProducts[] = [];
    const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month'];

    groupOrder.forEach((title) => {
      if (groups[title]) {
        sortedGroups.push({ title, data: groups[title] });
        delete groups[title];
      }
    });

    Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach((title) => {
        sortedGroups.push({ title, data: groups[title] });
      });

    return sortedGroups;
  }, [filteredProducts]);

  const handleProductPress = useCallback((productId: string) => {
    Haptics.selectionAsync();
    router.push(`/result?id=${productId}`);
  }, [router]);

  const handleDeleteProduct = useCallback((productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeProduct(productId);
  }, [removeProduct]);

  const handleAddToCompare = useCallback((product: ScannedProduct) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addToCompare(product);

    if (canCompare()) {
      router.push('/compare');
    }
  }, [addToCompare, canCompare, router]);

  const renderProduct = useCallback(({ item, index }: { item: ScannedProduct; index: number }) => {
    const status = getProductStatus(item);
    const statusConfig = getStatusConfig(status);
    const inCompare = isInCompare(item.id);

    return (
      <Animated.View
        entering={SlideInRight.delay(30 * Math.min(index, 10)).springify().damping(18)}
        exiting={FadeOut.duration(200)}
        layout={Layout.springify().damping(18)}
      >
        <Pressable
          onPress={() => handleProductPress(item.id)}
          className="bg-white rounded-2xl mb-3 overflow-hidden border border-slate-100 active:scale-[0.98]"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
          }}
        >
          <View className="flex-row">
            {item.imageURL ? (
              <Image
                source={{ uri: item.imageURL }}
                style={{ width: 80, height: 80, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}
                contentFit="cover"
              />
            ) : (
              <View className="w-20 h-20 bg-slate-100 items-center justify-center">
                <ScanBarcode size={24} color={COLORS.textMuted} />
              </View>
            )}
            <View className="flex-1 p-3 justify-center">
              <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
                {item.name}
              </Text>
              <View className="flex-row items-center mt-2">
                <View
                  className="flex-row items-center px-2 py-1 rounded-full"
                  style={{ backgroundColor: statusConfig.bgColor }}
                >
                  {statusConfig.icon}
                  <Text
                    className="text-xs font-medium ml-1"
                    style={{ color: statusConfig.color }}
                  >
                    {item.flagsTriggered.length === 0
                      ? 'All clear'
                      : `${item.flagsTriggered.length} flag${item.flagsTriggered.length > 1 ? 's' : ''}`}
                  </Text>
                </View>
                <Text className="text-xs text-slate-400 ml-2">
                  {format(new Date(item.scannedAt), 'h:mm a')}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Pressable
                onPress={() => handleAddToCompare(item)}
                hitSlop={8}
                className={cn(
                  'w-9 h-9 rounded-xl items-center justify-center',
                  inCompare ? 'bg-teal-500' : 'bg-slate-100'
                )}
              >
                <Scale size={16} color={inCompare ? '#FFFFFF' : COLORS.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => handleDeleteProduct(item.id)}
                hitSlop={12}
                className="p-3"
              >
                <Trash2 size={18} color={COLORS.textMuted} />
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }, [handleProductPress, handleDeleteProduct, handleAddToCompare, isInCompare]);

  const renderSectionHeader = useCallback((title: string, count: number) => (
    <View className="flex-row items-center justify-between mb-3 mt-6">
      <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider">
        {title}
      </Text>
      <View className="bg-slate-100 px-2 py-0.5 rounded-full">
        <Text className="text-xs font-semibold text-slate-500">{count}</Text>
      </View>
    </View>
  ), []);

  return (
    <View className="flex-1 bg-slate-50">
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9', '#F8FAFC']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(50).springify()}
          className="px-6 pt-4 pb-2"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-slate-900">History</Text>
              <Text className="text-slate-500 text-sm mt-1">
                {products.length} product{products.length !== 1 ? 's' : ''} scanned
              </Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/insights');
              }}
              className="w-12 h-12 rounded-2xl bg-purple-50 items-center justify-center border border-purple-100 active:scale-95"
            >
              <BarChart3 size={22} color="#7C3AED" />
            </Pressable>
          </View>
        </Animated.View>

        {/* Search */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          className="px-6 mt-4"
        >
          <View
            className={cn(
              'bg-white rounded-2xl flex-row items-center px-4 border-2 transition-colors',
              isSearchFocused ? 'border-teal-500' : 'border-transparent'
            )}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
            }}
          >
            <Search size={20} color={isSearchFocused ? COLORS.brandGreen : COLORS.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search products..."
              placeholderTextColor={COLORS.textMuted}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="flex-1 py-4 px-3 text-base text-slate-900"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                className="p-1 bg-slate-100 rounded-full"
              >
                <X size={16} color={COLORS.textSecondary} />
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Category Filters */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          className="mt-4"
        >
          <FlatList
            data={CATEGORY_FILTERS}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
            style={{ flexGrow: 0 }}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedCategory(item.key);
                }}
                className={cn(
                  'px-4 py-2.5 rounded-xl',
                  selectedCategory === item.key
                    ? 'bg-teal-600'
                    : 'bg-white border border-slate-200'
                )}
              >
                <Text
                  className={cn(
                    'font-semibold text-sm',
                    selectedCategory === item.key
                      ? 'text-white'
                      : 'text-slate-600'
                  )}
                >
                  {item.label}
                </Text>
              </Pressable>
            )}
          />
        </Animated.View>

        {/* Status Filters */}
        <Animated.View
          entering={FadeInDown.delay(175).springify()}
          className="mt-3 px-6"
        >
          <View className="flex-row gap-2">
            {[
              { key: 'all' as StatusFilter, label: 'All', icon: null, color: COLORS.brandGreen },
              { key: 'safe' as StatusFilter, label: 'Safe', icon: <CheckCircle size={14} color={statusFilter === 'safe' ? '#fff' : COLORS.safeGreen} />, color: COLORS.safeGreen },
              { key: 'flagged' as StatusFilter, label: 'Flagged', icon: <AlertTriangle size={14} color={statusFilter === 'flagged' ? '#fff' : COLORS.alertRed} />, color: COLORS.alertRed },
            ].map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter(item.key);
                }}
                className={cn(
                  'flex-row items-center gap-1.5 px-3 py-2 rounded-lg',
                  statusFilter === item.key
                    ? ''
                    : 'bg-slate-100'
                )}
                style={statusFilter === item.key ? { backgroundColor: item.color } : undefined}
              >
                {item.icon}
                <Text
                  className={cn(
                    'font-medium text-sm',
                    statusFilter === item.key
                      ? 'text-white'
                      : 'text-slate-600'
                  )}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="flex-1 items-center justify-center px-8"
          >
            <View className="w-20 h-20 rounded-3xl bg-slate-100 items-center justify-center mb-6">
              <ScanBarcode size={36} color={COLORS.textMuted} />
            </View>
            <Text className="text-xl font-bold text-slate-900 text-center">
              {searchQuery ? 'No results found' : 'No scans yet'}
            </Text>
            <Text className="text-slate-500 text-center mt-2 leading-6">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Start scanning products to build your history'}
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={() => router.push('/(tabs)/scan')}
                className="mt-6 overflow-hidden rounded-xl"
              >
                <LinearGradient
                  colors={[COLORS.brandGreen, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 }}
                >
                  <Text className="text-white font-semibold">Scan Your First Product</Text>
                </LinearGradient>
              </Pressable>
            )}
          </Animated.View>
        ) : (
          <FlatList
            data={groupedProducts}
            keyExtractor={(item) => item.title}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: group }) => (
              <View>
                {renderSectionHeader(group.title, group.data.length)}
                {group.data.map((product, index) => (
                  <View key={product.id}>
                    {renderProduct({ item: product, index })}
                  </View>
                ))}
              </View>
            )}
          />
        )}

        {/* Floating Compare Button */}
        {compareCount() > 0 && (
          <Animated.View
            entering={FadeInDown.springify()}
            className="absolute bottom-6 left-6 right-6"
          >
            <Pressable
              onPress={() => router.push('/compare')}
              className="overflow-hidden rounded-2xl"
              style={{
                shadowColor: COLORS.brandGreen,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <LinearGradient
                colors={[COLORS.brandGreen, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              >
                <Scale size={20} color="#FFFFFF" />
                <Text className="text-white font-bold text-base ml-2">
                  Compare {compareCount()} Product{compareCount() > 1 ? 's' : ''}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}
