import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Share, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ChevronLeft,
  Share2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Leaf,
  Utensils,
  Sparkles,
  Droplets,
  PawPrint,
  Package,
  ChevronDown,
  ChevronUp,
  Brain,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Info,
  Zap,
  Scale,
  ChevronRight,
  ShoppingCart,
  Check,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useHistoryStore, useUserStore, useCompareStore, useShoppingListStore } from '@/lib/stores';
import { generateIngredientExplanation } from '@/lib/services/aiExplanation';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { NutriscoreBadge } from '@/components/NutriscoreBadge';
import { IngredientDetailModal } from '@/components/IngredientDetailModal';
import type { SafetyStatus, ProductCategory, ParsedIngredient, IngredientFlag, HealthRating } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getStatusDetails(
  flaggedCount: number,
  totalIngredients: number,
  healthRating?: HealthRating,
  nutriscoreGrade?: string,
  novaScore?: number
): {
  status: SafetyStatus;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  bgGradient: [string, string];
} {
  if (healthRating || nutriscoreGrade || novaScore) {
    let healthScore = 0;
    let factors = 0;

    if (healthRating === 'healthy') { healthScore += 3; factors++; }
    else if (healthRating === 'moderate') { healthScore += 2; factors++; }
    else if (healthRating === 'unhealthy') { healthScore += 1; factors++; }

    if (nutriscoreGrade) {
      factors++;
      const grade = nutriscoreGrade.toLowerCase();
      if (grade === 'a') healthScore += 3;
      else if (grade === 'b') healthScore += 2.5;
      else if (grade === 'c') healthScore += 2;
      else if (grade === 'd') healthScore += 1.5;
      else healthScore += 1;
    }

    if (novaScore) {
      factors++;
      if (novaScore === 1) healthScore += 3;
      else if (novaScore === 2) healthScore += 2.5;
      else if (novaScore === 3) healthScore += 1.5;
      else healthScore += 1;
    }

    const avgHealth = factors > 0 ? healthScore / factors : 2;
    const hasFlaggedConcerns = flaggedCount > 0;

    if (avgHealth >= 2.5 && !hasFlaggedConcerns) {
      return {
        status: 'good',
        icon: <ShieldCheck size={28} color="#FFFFFF" />,
        title: 'Great Choice',
        subtitle: 'This product looks good for you',
        color: COLORS.safeGreen,
        bgGradient: ['#10B981', '#059669'],
      };
    } else if (avgHealth >= 2 || (avgHealth >= 1.5 && !hasFlaggedConcerns)) {
      return {
        status: 'caution',
        icon: <AlertTriangle size={28} color="#FFFFFF" />,
        title: hasFlaggedConcerns ? 'Has Concerns' : 'Moderate Choice',
        subtitle: hasFlaggedConcerns
          ? `${flaggedCount} ingredient${flaggedCount > 1 ? 's' : ''} matched your flags`
          : 'Consider healthier alternatives',
        color: COLORS.cautionYellow,
        bgGradient: ['#F59E0B', '#D97706'],
      };
    } else {
      return {
        status: 'warning',
        icon: <ShieldAlert size={28} color="#FFFFFF" />,
        title: 'Not Recommended',
        subtitle: hasFlaggedConcerns
          ? `Poor nutrition + ${flaggedCount} flagged ingredients`
          : 'Poor nutritional quality',
        color: COLORS.alertRed,
        bgGradient: ['#EF4444', '#DC2626'],
      };
    }
  }

  if (totalIngredients === 0) {
    return {
      status: 'unknown',
      icon: <HelpCircle size={28} color="#FFFFFF" />,
      title: 'Limited Data',
      subtitle: 'Could not analyze nutritional quality',
      color: COLORS.textMuted,
      bgGradient: ['#64748B', '#475569'],
    };
  }
  if (flaggedCount === 0) {
    return {
      status: 'unknown',
      icon: <Info size={28} color="#FFFFFF" />,
      title: 'No Flags Matched',
      subtitle: 'No health data available',
      color: COLORS.textMuted,
      bgGradient: ['#64748B', '#475569'],
    };
  }
  if (flaggedCount <= 2) {
    return {
      status: 'caution',
      icon: <AlertTriangle size={28} color="#FFFFFF" />,
      title: 'Some Concerns',
      subtitle: `${flaggedCount} of ${totalIngredients} ingredients flagged`,
      color: COLORS.cautionYellow,
      bgGradient: ['#F59E0B', '#D97706'],
    };
  }
  return {
    status: 'warning',
    icon: <ShieldAlert size={28} color="#FFFFFF" />,
    title: 'Review Carefully',
    subtitle: `${flaggedCount} of ${totalIngredients} ingredients flagged`,
    color: COLORS.alertRed,
    bgGradient: ['#EF4444', '#DC2626'],
  };
}

function getCategoryIcon(category: ProductCategory) {
  switch (category) {
    case 'food':
      return <Utensils size={14} color={COLORS.textMuted} />;
    case 'cosmetics':
      return <Sparkles size={14} color={COLORS.textMuted} />;
    case 'cleaning':
      return <Droplets size={14} color={COLORS.textMuted} />;
    case 'petFood':
      return <PawPrint size={14} color={COLORS.textMuted} />;
    default:
      return <Package size={14} color={COLORS.textMuted} />;
  }
}

function getCategoryLabel(category: ProductCategory): string {
  switch (category) {
    case 'food': return 'Food';
    case 'cosmetics': return 'Cosmetics';
    case 'cleaning': return 'Cleaning';
    case 'petFood': return 'Pet Food';
    default: return 'Other';
  }
}

export default function ResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const products = useHistoryStore((s) => s.products);
  const product = id ? products.find((p) => p.id === id) : undefined;
  const userFlags = useUserStore((s) => s.profile?.flags ?? []);
  const addToCompare = useCompareStore((s) => s.addToCompare);
  const isInCompare = useCompareStore((s) => s.isInCompare);
  const canCompare = useCompareStore((s) => s.canCompare);
  const compareCount = useCompareStore((s) => s.getCompareCount);

  const isProductInCompare = product ? isInCompare(product.id) : false;

  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [showAIExplanation, setShowAIExplanation] = useState(false);
  const [aiExplanation, setAIExplanation] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<ParsedIngredient | null>(null);
  const [addedToList, setAddedToList] = useState(false);

  // Handle add to shopping list
  const handleAddToList = () => {
    if (!product) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const defaultList = useShoppingListStore.getState().getDefaultList();
    useShoppingListStore.getState().addProductToList(defaultList.id, {
      productId: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      imageURL: product.imageURL,
    });
    
    setAddedToList(true);
    
    // Reset after 2 seconds
    setTimeout(() => setAddedToList(false), 2000);
  };

  const statusDetails = useMemo(() => {
    if (!product) return null;
    const flaggedCount = product.ingredients.filter((i: ParsedIngredient) => i.isFlagged).length;
    return getStatusDetails(
      flaggedCount,
      product.ingredients.length,
      product.healthRating,
      product.nutriscoreGrade,
      product.novaScore
    );
  }, [product]);

  const flaggedIngredients = useMemo(() => {
    if (!product) return [];
    return product.ingredients.filter((i: ParsedIngredient) => i.isFlagged);
  }, [product]);

  const handleShare = async () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `I scanned ${product.name}${product.brand ? ` by ${product.brand}` : ''} with Ingredient Decoder. ${flaggedIngredients.length === 0 ? 'It looks safe!' : `Found ${flaggedIngredients.length} flagged ingredients.`}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleAddToCompare = () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addToCompare(product);

    if (canCompare()) {
      router.push('/compare');
    }
  };

  const handleGenerateAIExplanation = async () => {
    if (!product) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAIExplanation(true);
    setIsLoadingAI(true);
    setAIError(null);

    try {
      const flaggedData = flaggedIngredients.map((ing: ParsedIngredient) => ({
        name: ing.name,
        reasons: ing.flagReasons,
      }));

      const userConcerns = userFlags
        .filter((f: IngredientFlag) => f.isActive)
        .map((f: IngredientFlag) => f.displayName);

      const result = await generateIngredientExplanation(
        product.name,
        product.ingredients.map((i: ParsedIngredient) => i.name),
        flaggedData,
        userConcerns,
        {
          nutriscoreGrade: product.nutriscoreGrade,
          novaScore: product.novaScore,
          allergens: product.allergens,
          additives: product.additives,
          nutritionData: product.nutritionData,
          healthRating: product.healthRating,
        }
      );

      if (result.success && result.explanation) {
        setAIExplanation(result.explanation);
      } else {
        setAIError(result.error || 'Failed to generate explanation');
      }
    } catch (error) {
      console.error('AI explanation error:', error);
      setAIError('Something went wrong. Please try again.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (!product || !statusDetails) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Product not found</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 bg-teal-600 rounded-xl px-6 py-3"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Section with Image */}
        <View className="relative">
          {product.imageURL ? (
            <Image
              source={{ uri: product.imageURL }}
              style={{ width: '100%', height: 280 }}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={['#F1F5F9', '#E2E8F0']}
              style={{ width: '100%', height: 200, alignItems: 'center', justifyContent: 'center' }}
            >
              {getCategoryIcon(product.category)}
              <Text className="text-slate-400 mt-2">No image</Text>
            </LinearGradient>
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
          />

          {/* Header overlay */}
          <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
            <View className="flex-row items-center justify-between px-5 py-4">
              <Pressable
                onPress={() => router.back()}
                className="w-11 h-11 rounded-full items-center justify-center overflow-hidden"
              >
                <BlurView intensity={60} tint="dark" style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={24} color="#FFFFFF" />
                </BlurView>
              </Pressable>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={handleAddToList}
                  className="w-11 h-11 rounded-full items-center justify-center overflow-hidden"
                >
                  <BlurView
                    intensity={60}
                    tint={addedToList ? 'light' : 'dark'}
                    style={{
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: addedToList ? 'rgba(234, 88, 12, 0.9)' : 'transparent'
                    }}
                  >
                    {addedToList ? (
                      <Check size={20} color="#FFFFFF" />
                    ) : (
                      <ShoppingCart size={20} color="#FFFFFF" />
                    )}
                  </BlurView>
                </Pressable>
                <Pressable
                  onPress={handleAddToCompare}
                  className="w-11 h-11 rounded-full items-center justify-center overflow-hidden"
                >
                  <BlurView
                    intensity={60}
                    tint={isProductInCompare ? 'light' : 'dark'}
                    style={{
                      width: '100%',
                      height: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isProductInCompare ? 'rgba(13, 148, 136, 0.9)' : 'transparent'
                    }}
                  >
                    <Scale size={20} color="#FFFFFF" />
                  </BlurView>
                </Pressable>
                <Pressable
                  onPress={handleShare}
                  className="w-11 h-11 rounded-full items-center justify-center overflow-hidden"
                >
                  <BlurView intensity={60} tint="dark" style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Share2 size={20} color="#FFFFFF" />
                  </BlurView>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>

          {/* Product info on image */}
          <View className="absolute bottom-4 left-5 right-5">
            <Text className="text-white text-2xl font-bold" numberOfLines={2}>
              {product.name}
            </Text>
            <View className="flex-row items-center mt-2">
              {product.brand && (
                <>
                  <Text className="text-white/80 text-sm">{product.brand}</Text>
                  <Text className="text-white/50 mx-2">·</Text>
                </>
              )}
              <View className="flex-row items-center">
                {getCategoryIcon(product.category)}
                <Text className="text-white/80 text-sm ml-1">{getCategoryLabel(product.category)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="px-5 -mt-6">
          <View className="rounded-3xl overflow-hidden">
            <LinearGradient
              colors={statusDetails.bgGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, borderRadius: 24 }}
            >
              <View className="flex-row items-center">
                <View className="w-14 h-14 rounded-2xl bg-white/20 items-center justify-center">
                  {statusDetails.icon}
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-white text-xl font-bold">
                    {statusDetails.title}
                  </Text>
                  <Text className="text-white/80 mt-1">
                    {statusDetails.subtitle}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.delay(150).springify()} className="px-5 mt-5">
          <View className="flex-row gap-3">
            {/* Vegan Status */}
            <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-100">
              <Leaf
                size={22}
                color={
                  product.veganStatus === 'vegan'
                    ? COLORS.safeGreen
                    : product.veganStatus === 'nonVegan'
                      ? COLORS.alertRed
                      : COLORS.textMuted
                }
              />
              <Text className="text-slate-900 font-semibold mt-2">
                {product.veganStatus === 'vegan'
                  ? 'Vegan'
                  : product.veganStatus === 'nonVegan'
                    ? 'Not Vegan'
                    : 'Unknown'}
              </Text>
            </View>

            {/* Nutriscore */}
            {product.nutriscoreGrade && (
              <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-100">
                <NutriscoreBadge grade={product.nutriscoreGrade} size="small" />
                <Text className="text-slate-900 font-semibold mt-2">Nutriscore</Text>
              </View>
            )}

            {/* NOVA Score */}
            {product.novaScore && (
              <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-100">
                <Text
                  className="text-2xl font-bold"
                  style={{
                    color:
                      product.novaScore === 1
                        ? COLORS.safeGreen
                        : product.novaScore === 4
                          ? COLORS.alertRed
                          : COLORS.cautionYellow,
                  }}
                >
                  {product.novaScore}
                </Text>
                <Text className="text-slate-900 font-semibold mt-2">NOVA</Text>
              </View>
            )}

            {/* Allergens */}
            <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-100">
              <Text
                className="text-2xl font-bold"
                style={{
                  color: product.allergens.length > 0 ? COLORS.cautionYellow : COLORS.safeGreen,
                }}
              >
                {product.allergens.length}
              </Text>
              <Text className="text-slate-900 font-semibold mt-2">Allergens</Text>
            </View>
          </View>
        </Animated.View>

        {/* AI Analysis CTA */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="px-5 mt-5">
          {!showAIExplanation ? (
            <Pressable
              onPress={handleGenerateAIExplanation}
              className="bg-white rounded-2xl p-5 border-2 border-dashed border-teal-400 active:scale-[0.98]"
            >
              <View className="flex-row items-center">
                <LinearGradient
                  colors={[COLORS.brandGreen, COLORS.gradientEnd]}
                  style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Brain size={24} color="#FFFFFF" />
                </LinearGradient>
                <View className="flex-1 ml-4">
                  <Text className="text-slate-900 font-bold text-base">Get AI Health Analysis</Text>
                  <Text className="text-slate-500 text-sm mt-1">
                    Detailed breakdown of nutrition & ingredients
                  </Text>
                </View>
                <Zap size={20} color={COLORS.brandGreen} />
              </View>
            </Pressable>
          ) : (
            <View className="bg-white rounded-2xl p-5 border border-slate-100">
              <View className="flex-row items-center mb-4">
                <Brain size={20} color={COLORS.brandGreen} />
                <Text className="text-teal-600 font-bold ml-2">AI Analysis</Text>
                {!isLoadingAI && aiExplanation && (
                  <Pressable onPress={handleGenerateAIExplanation} className="ml-auto p-2">
                    <RefreshCw size={16} color={COLORS.textMuted} />
                  </Pressable>
                )}
              </View>

              {isLoadingAI ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="small" color={COLORS.brandGreen} />
                  <Text className="text-slate-500 mt-3 text-sm">Analyzing ingredients...</Text>
                </View>
              ) : aiError ? (
                <View>
                  <Text className="text-red-500 text-sm">{aiError}</Text>
                  <Pressable
                    onPress={handleGenerateAIExplanation}
                    className="mt-4 bg-teal-600 rounded-xl py-3"
                  >
                    <Text className="text-white font-semibold text-center">Try Again</Text>
                  </Pressable>
                </View>
              ) : aiExplanation ? (
                <Text className="text-slate-700 text-sm leading-6">{aiExplanation}</Text>
              ) : null}
            </View>
          )}
        </Animated.View>

        {/* Flagged Ingredients */}
        {flaggedIngredients.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).springify()} className="px-5 mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-slate-900">
                Flagged Ingredients
              </Text>
              <Text className="text-xs text-slate-400">Tap to learn more</Text>
            </View>
            <View className="bg-white rounded-2xl overflow-hidden border border-slate-100">
              {flaggedIngredients.map((ingredient: ParsedIngredient, index: number) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedIngredient(ingredient);
                  }}
                  className={cn(
                    'p-4 flex-row items-center active:bg-slate-50',
                    index < flaggedIngredients.length - 1 && 'border-b border-slate-100'
                  )}
                >
                  <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
                    <AlertTriangle size={18} color={COLORS.cautionYellow} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-slate-900">
                      {ingredient.name}
                    </Text>
                    <Text className="text-sm text-slate-500 mt-0.5">
                      {ingredient.flagReasons.join(', ')}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={COLORS.textMuted} />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* All Ingredients */}
        <Animated.View entering={FadeInDown.delay(300).springify()} className="px-5 mt-6 mb-8">
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowAllIngredients(!showAllIngredients);
            }}
            className="flex-row items-center justify-between mb-3"
          >
            <Text className="text-lg font-bold text-slate-900">
              All Ingredients ({product.ingredients.length})
            </Text>
            {showAllIngredients ? (
              <ChevronUp size={22} color={COLORS.textMuted} />
            ) : (
              <ChevronDown size={22} color={COLORS.textMuted} />
            )}
          </Pressable>

          {showAllIngredients && (
            <Animated.View
              entering={FadeIn.duration(200)}
              className="bg-white rounded-2xl p-4 border border-slate-100"
            >
              <Text className="text-sm text-slate-700 leading-6">
                {product.rawIngredients || product.ingredients.map((i: ParsedIngredient) => i.name).join(', ')}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <SafeAreaView edges={['bottom']} className="bg-white border-t border-slate-100">
        <View className="px-5 py-4">
          <Pressable
            onPress={() => router.push('/(tabs)/scan')}
            className="overflow-hidden rounded-2xl active:scale-[0.98]"
          >
            <LinearGradient
              colors={[COLORS.brandGreen, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ padding: 18, borderRadius: 16, alignItems: 'center' }}
            >
              <Text className="text-white font-bold text-lg">Scan Another Product</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Ingredient Detail Modal */}
      <IngredientDetailModal
        visible={selectedIngredient !== null}
        onClose={() => setSelectedIngredient(null)}
        ingredientName={selectedIngredient?.name ?? ''}
        flagReasons={selectedIngredient?.flagReasons ?? []}
      />
    </View>
  );
}
