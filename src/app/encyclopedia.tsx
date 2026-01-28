import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Search,
  X,
  BookOpen,
  Shield,
  Beaker,
  Utensils,
  Globe,
  AlertTriangle,
  ChevronRight,
  Info,
  Users,
  Leaf,
  ExternalLink,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, INGREDIENT_EDUCATION, type IngredientEducation } from '@/lib/constants';
import { cn } from '@/lib/cn';

type CategoryFilter = 'all' | 'allergen' | 'additive' | 'dietary' | 'environmental';

const CATEGORY_FILTERS: { key: CategoryFilter; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all', label: 'All', icon: <BookOpen size={16} color="#64748B" />, color: '#64748B' },
  { key: 'allergen', label: 'Allergens', icon: <Shield size={16} color="#EF4444" />, color: '#EF4444' },
  { key: 'additive', label: 'Additives', icon: <Beaker size={16} color="#8B5CF6" />, color: '#8B5CF6' },
  { key: 'dietary', label: 'Dietary', icon: <Utensils size={16} color="#F59E0B" />, color: '#F59E0B' },
  { key: 'environmental', label: 'Environmental', icon: <Globe size={16} color="#10B981" />, color: '#10B981' },
];

function getCategoryConfig(category: IngredientEducation['category']) {
  switch (category) {
    case 'allergen':
      return { 
        icon: <Shield size={18} color="#EF4444" />, 
        color: '#EF4444', 
        bgColor: '#FEE2E2',
        label: 'Allergen',
        gradient: ['#FEE2E2', '#FECACA'] as [string, string],
      };
    case 'additive':
      return { 
        icon: <Beaker size={18} color="#8B5CF6" />, 
        color: '#8B5CF6', 
        bgColor: '#EDE9FE',
        label: 'Additive',
        gradient: ['#EDE9FE', '#DDD6FE'] as [string, string],
      };
    case 'dietary':
      return { 
        icon: <Utensils size={18} color="#F59E0B" />, 
        color: '#F59E0B', 
        bgColor: '#FEF3C7',
        label: 'Dietary',
        gradient: ['#FEF3C7', '#FDE68A'] as [string, string],
      };
    case 'environmental':
      return { 
        icon: <Globe size={18} color="#10B981" />, 
        color: '#10B981', 
        bgColor: '#D1FAE5',
        label: 'Environmental',
        gradient: ['#D1FAE5', '#A7F3D0'] as [string, string],
      };
  }
}

function getRiskBadge(level: 'low' | 'moderate' | 'high') {
  switch (level) {
    case 'low':
      return { label: 'Low Risk', color: '#F59E0B', bgColor: '#FEF3C7' };
    case 'moderate':
      return { label: 'Moderate', color: '#F97316', bgColor: '#FFEDD5' };
    case 'high':
      return { label: 'High Risk', color: '#EF4444', bgColor: '#FEE2E2' };
  }
}

interface IngredientDetailProps {
  ingredient: IngredientEducation;
  ingredientKey: string;
  onClose: () => void;
}

function IngredientDetail({ ingredient, ingredientKey, onClose }: IngredientDetailProps) {
  const categoryConfig = getCategoryConfig(ingredient.category);
  const riskBadge = getRiskBadge(ingredient.riskLevel);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-slate-50">
        {/* Header */}
        <LinearGradient
          colors={categoryConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="pt-4 pb-6"
        >
          <SafeAreaView edges={['top']}>
            <View className="flex-row items-center justify-between px-6 pt-2">
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  onClose();
                }}
                className="w-10 h-10 rounded-full bg-white/80 items-center justify-center"
              >
                <X size={22} color={categoryConfig.color} />
              </Pressable>
              <View 
                className="px-3 py-1.5 rounded-full"
                style={{ backgroundColor: categoryConfig.bgColor }}
              >
                <Text style={{ color: categoryConfig.color }} className="font-semibold text-sm">
                  {categoryConfig.label}
                </Text>
              </View>
            </View>
            
            <View className="px-6 mt-4">
              <View className="flex-row items-center">
                <View 
                  className="w-14 h-14 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: 'white' }}
                >
                  {categoryConfig.icon}
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-2xl font-bold text-slate-900">{ingredient.name}</Text>
                  <View 
                    className="self-start px-2 py-0.5 rounded-full mt-1"
                    style={{ backgroundColor: riskBadge.bgColor }}
                  >
                    <Text style={{ color: riskBadge.color }} className="text-xs font-semibold">
                      {riskBadge.label}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* What Is It */}
          <Animated.View entering={FadeInDown.delay(50).springify()} className="px-6 mt-4">
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center">
                  <Info size={18} color="#3B82F6" />
                </View>
                <Text className="text-lg font-bold text-slate-900 ml-3">What Is It?</Text>
              </View>
              <Text className="text-slate-700 leading-6">{ingredient.whatIsIt}</Text>
            </View>
          </Animated.View>

          {/* Why Concerning */}
          <Animated.View entering={FadeInDown.delay(100).springify()} className="px-6 mt-4">
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-lg bg-amber-50 items-center justify-center">
                  <AlertTriangle size={18} color="#F59E0B" />
                </View>
                <Text className="text-lg font-bold text-slate-900 ml-3">Why It's Flagged</Text>
              </View>
              <Text className="text-slate-700 leading-6">{ingredient.whyConcerning}</Text>
            </View>
          </Animated.View>

          {/* Commonly Found In */}
          <Animated.View entering={FadeInDown.delay(150).springify()} className="px-6 mt-4">
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-lg bg-purple-50 items-center justify-center">
                  <BookOpen size={18} color="#8B5CF6" />
                </View>
                <Text className="text-lg font-bold text-slate-900 ml-3">Commonly Found In</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {ingredient.commonlyFoundIn.map((item, index) => (
                  <View key={index} className="bg-slate-100 px-3 py-1.5 rounded-full">
                    <Text className="text-slate-700 text-sm">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Who Should Avoid */}
          <Animated.View entering={FadeInDown.delay(200).springify()} className="px-6 mt-4">
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-lg bg-red-50 items-center justify-center">
                  <Users size={18} color="#EF4444" />
                </View>
                <Text className="text-lg font-bold text-slate-900 ml-3">Who Should Avoid</Text>
              </View>
              {ingredient.whoShouldAvoid.map((item, index) => (
                <View key={index} className="flex-row items-start mb-2 last:mb-0">
                  <View className="w-2 h-2 rounded-full bg-red-400 mt-2 mr-3" />
                  <Text className="text-slate-700 flex-1">{item}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Alternatives */}
          {ingredient.alternatives && ingredient.alternatives.length > 0 && (
            <Animated.View entering={FadeInDown.delay(250).springify()} className="px-6 mt-4">
              <View className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 rounded-lg bg-emerald-100 items-center justify-center">
                    <Leaf size={18} color="#10B981" />
                  </View>
                  <Text className="text-lg font-bold text-slate-900 ml-3">Alternatives</Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {ingredient.alternatives.map((item, index) => (
                    <View key={index} className="bg-white px-3 py-1.5 rounded-full border border-emerald-200">
                      <Text className="text-emerald-700 text-sm">{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Disclaimer */}
          <Animated.View entering={FadeInDown.delay(300).springify()} className="px-6 mt-6">
            <View className="bg-slate-100 rounded-xl p-4">
              <Text className="text-slate-500 text-xs text-center leading-5">
                This information is for educational purposes only and is not medical advice. 
                Always consult with a healthcare professional for personalized guidance.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function EncyclopediaScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedIngredient, setSelectedIngredient] = useState<{ key: string; data: IngredientEducation } | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Convert ingredient education to array and filter
  const ingredients = useMemo(() => {
    const entries = Object.entries(INGREDIENT_EDUCATION).map(([key, data]) => ({
      key,
      data,
    }));

    return entries
      .filter((item) => {
        // Category filter
        if (selectedCategory !== 'all' && item.data.category !== selectedCategory) {
          return false;
        }
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            item.data.name.toLowerCase().includes(query) ||
            item.data.whatIsIt.toLowerCase().includes(query) ||
            item.data.commonlyFoundIn.some(f => f.toLowerCase().includes(query))
          );
        }
        return true;
      })
      .sort((a, b) => a.data.name.localeCompare(b.data.name));
  }, [searchQuery, selectedCategory]);

  // Group by category for display
  const groupedIngredients = useMemo(() => {
    if (selectedCategory !== 'all') {
      return [{ category: selectedCategory, items: ingredients }];
    }
    
    const groups: Record<string, typeof ingredients> = {};
    ingredients.forEach((item) => {
      if (!groups[item.data.category]) {
        groups[item.data.category] = [];
      }
      groups[item.data.category].push(item);
    });
    
    const order: CategoryFilter[] = ['allergen', 'additive', 'dietary', 'environmental'];
    return order
      .filter(cat => groups[cat]?.length > 0)
      .map(cat => ({ category: cat, items: groups[cat] }));
  }, [ingredients, selectedCategory]);

  const handleIngredientPress = useCallback((key: string, data: IngredientEducation) => {
    Haptics.selectionAsync();
    setSelectedIngredient({ key, data });
  }, []);

  const renderIngredientCard = useCallback(({ item, index }: { item: { key: string; data: IngredientEducation }; index: number }) => {
    const categoryConfig = getCategoryConfig(item.data.category);
    const riskBadge = getRiskBadge(item.data.riskLevel);

    return (
      <Animated.View
        entering={FadeInDown.delay(30 * Math.min(index, 15)).springify()}
        layout={Layout.springify()}
      >
        <Pressable
          onPress={() => handleIngredientPress(item.key, item.data)}
          className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 active:scale-[0.98]"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
          }}
        >
          <View className="flex-row items-center">
            <View 
              className="w-12 h-12 rounded-xl items-center justify-center"
              style={{ backgroundColor: categoryConfig.bgColor }}
            >
              {categoryConfig.icon}
            </View>
            
            <View className="flex-1 ml-3">
              <Text className="text-base font-bold text-slate-900">{item.data.name}</Text>
              <Text className="text-slate-500 text-sm mt-0.5" numberOfLines={1}>
                {item.data.whatIsIt.split('.')[0]}
              </Text>
            </View>

            <View className="items-end">
              <View 
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: riskBadge.bgColor }}
              >
                <Text style={{ color: riskBadge.color }} className="text-xs font-semibold">
                  {riskBadge.label}
                </Text>
              </View>
              <ChevronRight size={18} color="#94A3B8" className="mt-1" />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }, [handleIngredientPress]);

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <LinearGradient
        colors={['#0D9488', '#0F766E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-12 pb-4"
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
            <Text className="text-white text-xl font-bold">Ingredient Encyclopedia</Text>
            <View className="w-10" />
          </View>

          {/* Search */}
          <View className="px-6 mt-4">
            <View
              className={cn(
                'bg-white/20 rounded-xl flex-row items-center px-4 border-2 transition-colors',
                isSearchFocused ? 'border-white/50 bg-white/30' : 'border-transparent'
              )}
            >
              <Search size={20} color={isSearchFocused ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search ingredients..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="flex-1 py-3 px-3 text-base text-white"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  className="p-1 bg-white/30 rounded-full"
                >
                  <X size={16} color="#FFFFFF" />
                </Pressable>
              )}
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Category Filters */}
      <Animated.View entering={FadeInDown.delay(50).springify()} className="pt-4 pb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {CATEGORY_FILTERS.map((filter) => (
            <Pressable
              key={filter.key}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedCategory(filter.key);
              }}
              className={cn(
                'flex-row items-center px-4 py-2.5 rounded-xl border',
                selectedCategory === filter.key
                  ? 'bg-teal-600 border-teal-600'
                  : 'bg-white border-slate-200'
              )}
            >
              {filter.key !== 'all' && (
                <View className="mr-2">
                  {selectedCategory === filter.key
                    ? React.cloneElement(filter.icon as React.ReactElement<{ color?: string }>, { color: '#FFFFFF' })
                    : filter.icon
                  }
                </View>
              )}
              <Text
                className={cn(
                  'font-semibold',
                  selectedCategory === filter.key ? 'text-white' : 'text-slate-700'
                )}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Results Count */}
      <View className="px-6 py-2">
        <Text className="text-slate-500 text-sm">
          {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Ingredient List */}
      {ingredients.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
            <Search size={32} color="#94A3B8" />
          </View>
          <Text className="text-lg font-bold text-slate-900 text-center">No Results</Text>
          <Text className="text-slate-500 text-center mt-2">
            Try a different search term or category
          </Text>
        </View>
      ) : (
        <FlatList
          data={ingredients}
          keyExtractor={(item) => item.key}
          renderItem={renderIngredientCard}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Ingredient Detail Modal */}
      {selectedIngredient && (
        <IngredientDetail
          ingredient={selectedIngredient.data}
          ingredientKey={selectedIngredient.key}
          onClose={() => setSelectedIngredient(null)}
        />
      )}
    </View>
  );
}
