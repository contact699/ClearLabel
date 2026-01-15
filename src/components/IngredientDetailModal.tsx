import React from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  AlertTriangle,
  Info,
  ShoppingBag,
  Users,
  Lightbulb,
  Shield,
  Leaf,
  Beaker,
  Globe,
  Utensils,
} from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, INGREDIENT_EDUCATION, INGREDIENT_SYNONYMS, type IngredientEducation } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface IngredientDetailModalProps {
  visible: boolean;
  onClose: () => void;
  ingredientName: string;
  flagReasons: string[];
}

function findEducationData(ingredientName: string, flagReasons: string[]): IngredientEducation | null {
  const lowerName = ingredientName.toLowerCase();

  // First try to match by flag reason (most accurate)
  for (const reason of flagReasons) {
    const reasonKey = reason.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
    if (INGREDIENT_EDUCATION[reasonKey]) {
      return INGREDIENT_EDUCATION[reasonKey];
    }

    // Try common variations
    const variations = ['dairy', 'gluten', 'nuts', 'peanuts', 'soy', 'eggs', 'shellfish', 'fish', 'sesame',
      'parabens', 'sulfates', 'phthalates', 'artificial_colors', 'artificial_sweeteners', 'msg',
      'nitrates', 'bha_bht', 'carrageenan', 'formaldehyde', 'palm_oil', 'microplastics', 'triclosan',
      'vegan', 'vegetarian'];

    for (const v of variations) {
      if (reason.toLowerCase().includes(v.replace('_', ' ')) || reason.toLowerCase().includes(v)) {
        if (INGREDIENT_EDUCATION[v]) {
          return INGREDIENT_EDUCATION[v];
        }
      }
    }
  }

  // Try to match ingredient name against synonyms
  for (const [key, synonyms] of Object.entries(INGREDIENT_SYNONYMS)) {
    if (synonyms.some(syn => lowerName.includes(syn.toLowerCase()))) {
      if (INGREDIENT_EDUCATION[key]) {
        return INGREDIENT_EDUCATION[key];
      }
    }
  }

  // Direct match on ingredient name
  for (const [key, education] of Object.entries(INGREDIENT_EDUCATION)) {
    if (lowerName.includes(key) || education.name.toLowerCase().includes(lowerName)) {
      return education;
    }
  }

  return null;
}

function getRiskColor(level: 'low' | 'moderate' | 'high') {
  switch (level) {
    case 'low':
      return { bg: COLORS.cautionYellowLight, text: COLORS.cautionYellow };
    case 'moderate':
      return { bg: COLORS.warningOrangeLight, text: COLORS.warningOrange };
    case 'high':
      return { bg: COLORS.alertRedLight, text: COLORS.alertRed };
  }
}

function getCategoryIcon(category: IngredientEducation['category']) {
  switch (category) {
    case 'allergen':
      return <Shield size={16} color="#FFFFFF" />;
    case 'additive':
      return <Beaker size={16} color="#FFFFFF" />;
    case 'dietary':
      return <Utensils size={16} color="#FFFFFF" />;
    case 'environmental':
      return <Globe size={16} color="#FFFFFF" />;
  }
}

function getCategoryGradient(category: IngredientEducation['category']): [string, string] {
  switch (category) {
    case 'allergen':
      return ['#EF4444', '#DC2626'];
    case 'additive':
      return ['#8B5CF6', '#7C3AED'];
    case 'dietary':
      return ['#10B981', '#059669'];
    case 'environmental':
      return ['#0D9488', '#0891B2'];
  }
}

function getCategoryLabel(category: IngredientEducation['category']) {
  switch (category) {
    case 'allergen':
      return 'Allergen';
    case 'additive':
      return 'Additive';
    case 'dietary':
      return 'Dietary';
    case 'environmental':
      return 'Environmental';
  }
}

export function IngredientDetailModal({ visible, onClose, ingredientName, flagReasons }: IngredientDetailModalProps) {
  const education = findEducationData(ingredientName, flagReasons);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!education) {
    // Fallback for ingredients without education data
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View className="flex-1 bg-slate-50">
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200">
              <Text className="text-xl font-bold text-slate-900">Ingredient Info</Text>
              <Pressable
                onPress={handleClose}
                className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <View className="flex-1 items-center justify-center px-8">
              <View className="w-16 h-16 rounded-2xl bg-amber-100 items-center justify-center mb-4">
                <AlertTriangle size={32} color={COLORS.cautionYellow} />
              </View>
              <Text className="text-xl font-bold text-slate-900 text-center">{ingredientName}</Text>
              <Text className="text-slate-500 text-center mt-2">Flagged for: {flagReasons.join(', ')}</Text>
              <Text className="text-slate-400 text-center mt-4 text-sm">
                Detailed information for this specific ingredient is not available yet.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  const riskColors = getRiskColor(education.riskLevel);
  const categoryGradient = getCategoryGradient(education.category);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-slate-50">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200">
            <View className="flex-1" />
            <Pressable
              onPress={handleClose}
              className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
            >
              <X size={20} color={COLORS.textSecondary} />
            </Pressable>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <Animated.View entering={FadeInDown.delay(100).springify()} className="px-5 pt-4">
              <View className="items-center">
                {/* Category Badge */}
                <View className="overflow-hidden rounded-full mb-4">
                  <LinearGradient
                    colors={categoryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 }}
                  >
                    {getCategoryIcon(education.category)}
                    <Text className="text-white text-sm font-semibold ml-2">
                      {getCategoryLabel(education.category)}
                    </Text>
                  </LinearGradient>
                </View>

                {/* Name */}
                <Text className="text-2xl font-bold text-slate-900 text-center">
                  {education.name}
                </Text>

                {/* Flagged ingredient name if different */}
                {education.name.toLowerCase() !== ingredientName.toLowerCase() && (
                  <Text className="text-slate-500 mt-1">
                    Found as: {ingredientName}
                  </Text>
                )}

                {/* Risk Level */}
                <View
                  className="flex-row items-center mt-4 px-4 py-2 rounded-full"
                  style={{ backgroundColor: riskColors.bg }}
                >
                  <AlertTriangle size={16} color={riskColors.text} />
                  <Text
                    className="text-sm font-semibold ml-2 capitalize"
                    style={{ color: riskColors.text }}
                  >
                    {education.riskLevel} Risk Level
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* What Is It */}
            <Animated.View entering={FadeInDown.delay(150).springify()} className="px-5 mt-6">
              <View className="bg-white rounded-2xl p-5 border border-slate-100">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center">
                    <Info size={20} color="#3B82F6" />
                  </View>
                  <Text className="text-lg font-bold text-slate-900 ml-3">What Is It?</Text>
                </View>
                <Text className="text-slate-600 leading-6">{education.whatIsIt}</Text>
              </View>
            </Animated.View>

            {/* Why Concerning */}
            <Animated.View entering={FadeInDown.delay(200).springify()} className="px-5 mt-4">
              <View className="bg-white rounded-2xl p-5 border border-slate-100">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center">
                    <AlertTriangle size={20} color={COLORS.cautionYellow} />
                  </View>
                  <Text className="text-lg font-bold text-slate-900 ml-3">Why It's Flagged</Text>
                </View>
                <Text className="text-slate-600 leading-6">{education.whyConcerning}</Text>
              </View>
            </Animated.View>

            {/* Who Should Avoid */}
            <Animated.View entering={FadeInDown.delay(250).springify()} className="px-5 mt-4">
              <View className="bg-white rounded-2xl p-5 border border-slate-100">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-xl bg-red-100 items-center justify-center">
                    <Users size={20} color={COLORS.alertRed} />
                  </View>
                  <Text className="text-lg font-bold text-slate-900 ml-3">Who Should Avoid</Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {education.whoShouldAvoid.map((who, index) => (
                    <View key={index} className="bg-red-50 px-3 py-1.5 rounded-full">
                      <Text className="text-red-700 text-sm">{who}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>

            {/* Commonly Found In */}
            <Animated.View entering={FadeInDown.delay(300).springify()} className="px-5 mt-4">
              <View className="bg-white rounded-2xl p-5 border border-slate-100">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-xl bg-purple-100 items-center justify-center">
                    <ShoppingBag size={20} color="#8B5CF6" />
                  </View>
                  <Text className="text-lg font-bold text-slate-900 ml-3">Commonly Found In</Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {education.commonlyFoundIn.map((item, index) => (
                    <View key={index} className="bg-slate-100 px-3 py-1.5 rounded-full">
                      <Text className="text-slate-700 text-sm">{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>

            {/* Alternatives */}
            {education.alternatives && education.alternatives.length > 0 && (
              <Animated.View entering={FadeInDown.delay(350).springify()} className="px-5 mt-4 mb-8">
                <View className="bg-white rounded-2xl p-5 border border-slate-100">
                  <View className="flex-row items-center mb-3">
                    <View className="w-10 h-10 rounded-xl bg-teal-100 items-center justify-center">
                      <Lightbulb size={20} color={COLORS.brandGreen} />
                    </View>
                    <Text className="text-lg font-bold text-slate-900 ml-3">Alternatives</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {education.alternatives.map((alt, index) => (
                      <View key={index} className="bg-teal-50 px-3 py-1.5 rounded-full">
                        <Text className="text-teal-700 text-sm">{alt}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            )}

            <View className="h-8" />
          </ScrollView>

          {/* Bottom Disclaimer */}
          <View className="px-5 py-4 border-t border-slate-200 bg-white">
            <Text className="text-slate-400 text-xs text-center leading-5">
              This information is for educational purposes only and should not replace medical advice.
              Consult a healthcare professional for personalized guidance.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
