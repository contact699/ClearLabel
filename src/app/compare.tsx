import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  X,
  Trophy,
  Scale,
  Leaf,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Minus,
  Check,
  Utensils,
  Sparkles,
  Crown,
  Package,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCompareStore } from '@/lib/stores';
import { NutriscoreBadge } from '@/components/NutriscoreBadge';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { ScannedProduct, HealthRating, ParsedIngredient } from '@/lib/types';
import { parseQuantity, compareQuantities, type ParsedQuantity } from '@/lib/utils/quantityParser';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 56) / 2;

type ComparisonResult = 'better' | 'worse' | 'equal' | 'unknown';

interface ComparisonScores {
  productA: number;
  productB: number;
  winner: 'A' | 'B' | 'tie' | 'unknown';
}

function calculateHealthScore(product: ScannedProduct): number {
  let score = 50; // Base score

  // Nutriscore contribution (max +/-25 points)
  if (product.nutriscoreGrade) {
    const grade = product.nutriscoreGrade.toLowerCase();
    if (grade === 'a') score += 25;
    else if (grade === 'b') score += 15;
    else if (grade === 'c') score += 0;
    else if (grade === 'd') score -= 15;
    else if (grade === 'e') score -= 25;
  }

  // NOVA score contribution (max +/-20 points)
  if (product.novaScore) {
    if (product.novaScore === 1) score += 20;
    else if (product.novaScore === 2) score += 10;
    else if (product.novaScore === 3) score -= 10;
    else if (product.novaScore === 4) score -= 20;
  }

  // Flagged ingredients penalty (up to -30 points)
  const flaggedCount = product.ingredients.filter(i => i.isFlagged).length;
  score -= Math.min(flaggedCount * 10, 30);

  // Additives penalty (up to -15 points)
  score -= Math.min(product.additives.length * 3, 15);

  // Health rating bonus/penalty
  if (product.healthRating === 'healthy') score += 10;
  else if (product.healthRating === 'unhealthy') score -= 10;

  return Math.max(0, Math.min(100, score));
}

function compareScores(scoreA: number, scoreB: number): ComparisonResult {
  const diff = scoreA - scoreB;
  if (Math.abs(diff) < 5) return 'equal';
  return diff > 0 ? 'better' : 'worse';
}

function ProductCard({ product, isWinner, onRemove }: { product: ScannedProduct; isWinner: boolean; onRemove: () => void }) {
  const flaggedCount = product.ingredients.filter((i: ParsedIngredient) => i.isFlagged).length;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={{ width: CARD_WIDTH }}
    >
      <View className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
        {/* Winner Badge */}
        {isWinner && (
          <LinearGradient
            colors={[COLORS.brandGreen, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
          >
            <Crown size={14} color="#FFFFFF" />
            <Text className="text-white text-xs font-bold ml-1">BETTER CHOICE</Text>
          </LinearGradient>
        )}

        {/* Product Image */}
        <View className="relative">
          {product.imageURL ? (
            <Image
              source={{ uri: product.imageURL }}
              style={{ width: '100%', height: 120 }}
              contentFit="cover"
            />
          ) : (
            <View className="w-full h-28 bg-slate-100 items-center justify-center">
              <Utensils size={24} color={COLORS.textMuted} />
            </View>
          )}

          {/* Remove button */}
          <Pressable
            onPress={onRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 items-center justify-center"
          >
            <X size={14} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Product Info */}
        <View className="p-3">
          <Text className="text-slate-900 font-bold text-sm" numberOfLines={2}>
            {product.name}
          </Text>
          {product.brand && (
            <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>
              {product.brand}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

interface ComparisonRowProps {
  label: string;
  valueA: string | number | undefined;
  valueB: string | number | undefined;
  comparison: ComparisonResult;
  delay?: number;
  renderValue?: (value: string | number | undefined, isWinner: boolean) => React.ReactNode;
}

function ComparisonRow({ label, valueA, valueB, comparison, delay = 0, renderValue }: ComparisonRowProps) {
  const aWins = comparison === 'better';
  const bWins = comparison === 'worse';

  const defaultRenderValue = (value: string | number | undefined, isWinner: boolean) => (
    <Text className={cn(
      'text-base font-semibold',
      isWinner ? 'text-teal-600' : 'text-slate-700'
    )}>
      {value ?? '-'}
    </Text>
  );

  const renderer = renderValue || defaultRenderValue;

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).springify()}
      className="flex-row items-center py-4 border-b border-slate-100"
    >
      {/* Product A Value */}
      <View className="flex-1 items-center">
        <View className={cn(
          'rounded-xl px-3 py-2',
          aWins && 'bg-teal-50'
        )}>
          {renderer(valueA, aWins)}
        </View>
      </View>

      {/* Label */}
      <View className="w-24 items-center">
        <Text className="text-slate-500 text-xs font-medium text-center">{label}</Text>
      </View>

      {/* Product B Value */}
      <View className="flex-1 items-center">
        <View className={cn(
          'rounded-xl px-3 py-2',
          bWins && 'bg-teal-50'
        )}>
          {renderer(valueB, bWins)}
        </View>
      </View>
    </Animated.View>
  );
}

export default function CompareScreen() {
  const router = useRouter();
  const productA = useCompareStore((s) => s.productA);
  const productB = useCompareStore((s) => s.productB);
  const removeFromCompare = useCompareStore((s) => s.removeFromCompare);
  const clearCompare = useCompareStore((s) => s.clearCompare);

  const comparison = useMemo<ComparisonScores>(() => {
    if (!productA || !productB) {
      return { productA: 0, productB: 0, winner: 'unknown' };
    }

    const scoreA = calculateHealthScore(productA);
    const scoreB = calculateHealthScore(productB);

    let winner: 'A' | 'B' | 'tie' | 'unknown' = 'tie';
    if (Math.abs(scoreA - scoreB) >= 5) {
      winner = scoreA > scoreB ? 'A' : 'B';
    }

    return { productA: scoreA, productB: scoreB, winner };
  }, [productA, productB]);

  const handleRemoveA = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (productA) removeFromCompare(productA.id);
  };

  const handleRemoveB = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (productB) removeFromCompare(productB.id);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearCompare();
    router.back();
  };

  const getNutriscoreComparison = (): ComparisonResult => {
    if (!productA?.nutriscoreGrade || !productB?.nutriscoreGrade) return 'unknown';
    const gradeOrder = ['a', 'b', 'c', 'd', 'e'];
    const indexA = gradeOrder.indexOf(productA.nutriscoreGrade.toLowerCase());
    const indexB = gradeOrder.indexOf(productB.nutriscoreGrade.toLowerCase());
    if (indexA === indexB) return 'equal';
    return indexA < indexB ? 'better' : 'worse';
  };

  const getNovaComparison = (): ComparisonResult => {
    if (!productA?.novaScore || !productB?.novaScore) return 'unknown';
    if (productA.novaScore === productB.novaScore) return 'equal';
    return productA.novaScore < productB.novaScore ? 'better' : 'worse';
  };

  const getFlaggedComparison = (): ComparisonResult => {
    const flaggedA = productA?.ingredients.filter(i => i.isFlagged).length ?? 0;
    const flaggedB = productB?.ingredients.filter(i => i.isFlagged).length ?? 0;
    if (flaggedA === flaggedB) return 'equal';
    return flaggedA < flaggedB ? 'better' : 'worse';
  };

  const getAdditivesComparison = (): ComparisonResult => {
    const additivesA = productA?.additives.length ?? 0;
    const additivesB = productB?.additives.length ?? 0;
    if (additivesA === additivesB) return 'equal';
    return additivesA < additivesB ? 'better' : 'worse';
  };

  const getAllergensComparison = (): ComparisonResult => {
    const allergensA = productA?.allergens.length ?? 0;
    const allergensB = productB?.allergens.length ?? 0;
    if (allergensA === allergensB) return 'equal';
    return allergensA < allergensB ? 'better' : 'worse';
  };

  // Quantity comparison
  const quantityA = useMemo(() => {
    if (!productA?.quantity) return null;
    return parseQuantity(productA.quantity);
  }, [productA?.quantity]);

  const quantityB = useMemo(() => {
    if (!productB?.quantity) return null;
    return parseQuantity(productB.quantity);
  }, [productB?.quantity]);

  const quantityComparison = useMemo(() => {
    if (!quantityA || !quantityB) return null;
    return compareQuantities(quantityA, quantityB);
  }, [quantityA, quantityB]);

  const getQuantityComparison = (): ComparisonResult => {
    if (!quantityComparison) return 'unknown';
    if (Math.abs(quantityComparison.diff) < 5) return 'equal';
    // More quantity is better (lower is "better" in original comparison, but for quantity, more is better)
    // So we flip the logic - positive diff means B has more, so A is "worse"
    return quantityComparison.diff > 0 ? 'worse' : 'better';
  };

  if (!productA && !productB) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-8">
        <Scale size={48} color={COLORS.textMuted} />
        <Text className="text-xl font-bold text-slate-900 mt-4 text-center">No Products to Compare</Text>
        <Text className="text-slate-500 mt-2 text-center">
          Add products from the scan results to compare them
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 bg-teal-600 rounded-xl px-8 py-4"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-white border-b border-slate-100">
        <View className="flex-row items-center justify-between px-5 py-4">
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
          >
            <ChevronLeft size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text className="text-lg font-bold text-slate-900">Compare Products</Text>
          <View className="w-10" />
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Product Cards */}
        <Animated.View entering={FadeIn.delay(100)} className="px-5 pt-5">
          <View className="flex-row justify-between">
            {productA ? (
              <ProductCard
                product={productA}
                isWinner={comparison.winner === 'A'}
                onRemove={handleRemoveA}
              />
            ) : (
              <View style={{ width: CARD_WIDTH }} className="bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 h-52 items-center justify-center">
                <Scale size={24} color={COLORS.textMuted} />
                <Text className="text-slate-400 text-sm mt-2">Add product</Text>
              </View>
            )}

            <View className="w-3" />

            {productB ? (
              <ProductCard
                product={productB}
                isWinner={comparison.winner === 'B'}
                onRemove={handleRemoveB}
              />
            ) : (
              <View style={{ width: CARD_WIDTH }} className="bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 h-52 items-center justify-center">
                <Scale size={24} color={COLORS.textMuted} />
                <Text className="text-slate-400 text-sm mt-2">Add product</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Verdict Card */}
        {productA && productB && (
          <Animated.View entering={FadeInDown.delay(200).springify()} className="px-5 mt-5">
            <View className="overflow-hidden rounded-2xl">
              <LinearGradient
                colors={
                  comparison.winner === 'tie'
                    ? ['#64748B', '#475569']
                    : [COLORS.brandGreen, COLORS.gradientEnd]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20 }}
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                    {comparison.winner === 'tie' ? (
                      <Minus size={24} color="#FFFFFF" />
                    ) : (
                      <Trophy size={24} color="#FFFFFF" />
                    )}
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-white/80 text-sm">Verdict</Text>
                    <Text className="text-white text-xl font-bold mt-0.5">
                      {comparison.winner === 'tie'
                        ? 'Both are similar'
                        : comparison.winner === 'A'
                          ? `${productA.name} is healthier`
                          : `${productB.name} is healthier`}
                    </Text>
                  </View>
                </View>

                {/* Score bars */}
                <View className="mt-5">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-white/80 text-xs" numberOfLines={1} style={{ maxWidth: '40%' }}>
                      {productA.name}
                    </Text>
                    <Text className="text-white font-bold">{comparison.productA}</Text>
                  </View>
                  <View className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-white rounded-full"
                      style={{ width: `${comparison.productA}%` }}
                    />
                  </View>

                  <View className="flex-row items-center justify-between mt-4 mb-2">
                    <Text className="text-white/80 text-xs" numberOfLines={1} style={{ maxWidth: '40%' }}>
                      {productB.name}
                    </Text>
                    <Text className="text-white font-bold">{comparison.productB}</Text>
                  </View>
                  <View className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-white rounded-full"
                      style={{ width: `${comparison.productB}%` }}
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        )}

        {/* Comparison Details */}
        {productA && productB && (
          <View className="px-5 mt-5 mb-8">
            <Text className="text-lg font-bold text-slate-900 mb-3">Detailed Comparison</Text>
            <View className="bg-white rounded-2xl px-4 border border-slate-100">
              <ComparisonRow
                label="Nutriscore"
                valueA={productA.nutriscoreGrade?.toUpperCase()}
                valueB={productB.nutriscoreGrade?.toUpperCase()}
                comparison={getNutriscoreComparison()}
                delay={300}
                renderValue={(value, isWinner) => (
                  value ? (
                    <NutriscoreBadge grade={value as string} size="small" />
                  ) : (
                    <Text className="text-slate-400">-</Text>
                  )
                )}
              />

              <ComparisonRow
                label="NOVA Score"
                valueA={productA.novaScore}
                valueB={productB.novaScore}
                comparison={getNovaComparison()}
                delay={350}
                renderValue={(value, isWinner) => (
                  <Text className={cn(
                    'text-lg font-bold',
                    isWinner ? 'text-teal-600' : 'text-slate-700'
                  )}>
                    {value ?? '-'}
                  </Text>
                )}
              />

              <ComparisonRow
                label="Flagged"
                valueA={productA.ingredients.filter(i => i.isFlagged).length}
                valueB={productB.ingredients.filter(i => i.isFlagged).length}
                comparison={getFlaggedComparison()}
                delay={400}
                renderValue={(value, isWinner) => (
                  <View className="flex-row items-center">
                    <AlertTriangle size={14} color={isWinner ? COLORS.brandGreen : COLORS.cautionYellow} />
                    <Text className={cn(
                      'text-base font-semibold ml-1',
                      isWinner ? 'text-teal-600' : 'text-slate-700'
                    )}>
                      {value}
                    </Text>
                  </View>
                )}
              />

              <ComparisonRow
                label="Additives"
                valueA={productA.additives.length}
                valueB={productB.additives.length}
                comparison={getAdditivesComparison()}
                delay={450}
              />

              <ComparisonRow
                label="Allergens"
                valueA={productA.allergens.length}
                valueB={productB.allergens.length}
                comparison={getAllergensComparison()}
                delay={500}
              />

              {/* Quantity Comparison */}
              {(quantityA || quantityB) && (
                <ComparisonRow
                  label="Quantity"
                  valueA={quantityA?.display}
                  valueB={quantityB?.display}
                  comparison={getQuantityComparison()}
                  delay={525}
                  renderValue={(value, isWinner) => (
                    <View className="flex-row items-center">
                      <Package size={14} color={isWinner ? COLORS.brandGreen : COLORS.textMuted} />
                      <Text className={cn(
                        'text-sm font-semibold ml-1',
                        isWinner ? 'text-teal-600' : 'text-slate-700'
                      )}>
                        {value ?? '-'}
                      </Text>
                    </View>
                  )}
                />
              )}

              {/* Vegan Status */}
              <Animated.View
                entering={FadeInUp.delay(550).springify()}
                className="flex-row items-center py-4"
              >
                <View className="flex-1 items-center">
                  <View className={cn(
                    'rounded-xl px-3 py-2',
                    productA.veganStatus === 'vegan' && 'bg-green-50'
                  )}>
                    <View className="flex-row items-center">
                      <Leaf
                        size={14}
                        color={productA.veganStatus === 'vegan' ? COLORS.safeGreen : COLORS.textMuted}
                      />
                      <Text className={cn(
                        'text-sm font-medium ml-1',
                        productA.veganStatus === 'vegan' ? 'text-green-600' : 'text-slate-500'
                      )}>
                        {productA.veganStatus === 'vegan' ? 'Vegan' : productA.veganStatus === 'nonVegan' ? 'Not Vegan' : 'Unknown'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="w-24 items-center">
                  <Text className="text-slate-500 text-xs font-medium">Vegan</Text>
                </View>
                <View className="flex-1 items-center">
                  <View className={cn(
                    'rounded-xl px-3 py-2',
                    productB.veganStatus === 'vegan' && 'bg-green-50'
                  )}>
                    <View className="flex-row items-center">
                      <Leaf
                        size={14}
                        color={productB.veganStatus === 'vegan' ? COLORS.safeGreen : COLORS.textMuted}
                      />
                      <Text className={cn(
                        'text-sm font-medium ml-1',
                        productB.veganStatus === 'vegan' ? 'text-green-600' : 'text-slate-500'
                      )}>
                        {productB.veganStatus === 'vegan' ? 'Vegan' : productB.veganStatus === 'nonVegan' ? 'Not Vegan' : 'Unknown'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            </View>
          </View>
        )}

        {/* Empty state for incomplete comparison */}
        {(!productA || !productB) && (
          <Animated.View entering={FadeIn.delay(300)} className="px-5 mt-8 items-center">
            <Text className="text-slate-500 text-center">
              Add another product from your scan history to compare
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/history')}
              className="mt-4 overflow-hidden rounded-xl"
            >
              <LinearGradient
                colors={[COLORS.brandGreen, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 14, paddingHorizontal: 24 }}
              >
                <Text className="text-white font-semibold">Browse History</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <SafeAreaView edges={['bottom']} className="bg-white border-t border-slate-100">
        <View className="px-5 py-4">
          <Pressable
            onPress={() => router.push('/(tabs)/scan')}
            className="overflow-hidden rounded-2xl"
          >
            <LinearGradient
              colors={[COLORS.brandGreen, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ padding: 18, alignItems: 'center' }}
            >
              <Text className="text-white font-bold text-lg">Scan Another Product</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
