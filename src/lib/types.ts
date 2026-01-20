// Types for Ingredient Decoder App

export type FlagType = 'allergen' | 'additive' | 'dietary' | 'environmental' | 'custom';

export interface IngredientFlag {
  id: string;
  type: FlagType;
  value: string;
  displayName: string;
  isActive: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string; // HH:mm format
  weeklyDigest: boolean;
}

// Profile colors for family members
export const PROFILE_COLORS = [
  { id: 'blue', name: 'Blue', color: '#3B82F6', lightColor: '#DBEAFE' },
  { id: 'purple', name: 'Purple', color: '#8B5CF6', lightColor: '#EDE9FE' },
  { id: 'pink', name: 'Pink', color: '#EC4899', lightColor: '#FCE7F3' },
  { id: 'green', name: 'Green', color: '#10B981', lightColor: '#D1FAE5' },
  { id: 'orange', name: 'Orange', color: '#F59E0B', lightColor: '#FEF3C7' },
  { id: 'red', name: 'Red', color: '#EF4444', lightColor: '#FEE2E2' },
  { id: 'teal', name: 'Teal', color: '#14B8A6', lightColor: '#CCFBF1' },
  { id: 'indigo', name: 'Indigo', color: '#6366F1', lightColor: '#E0E7FF' },
] as const;

export type ProfileColorId = typeof PROFILE_COLORS[number]['id'];

// Relationship types for family profiles
export type ProfileRelationship = 'self' | 'spouse' | 'partner' | 'child' | 'parent' | 'sibling' | 'other';

export interface SharedFamilyMember {
  id: string;
  name: string;
  deviceId: string; // Device that shared/joined
  joinedAt: Date;
}

export interface FamilyProfile {
  id: string;
  name: string;
  colorId: ProfileColorId;
  emoji?: string; // Optional emoji avatar
  relationship?: ProfileRelationship; // Relationship to primary user
  flags: IngredientFlag[];
  createdAt: Date;
  updatedAt: Date;
  // Sharing support
  ownerDeviceId?: string; // Device that created this profile
  shareCode?: string; // Code for sharing with family members
  sharedWith: SharedFamilyMember[]; // Family members who have synced access
  isShared?: boolean; // Whether this profile is shared across devices
}

export const RELATIONSHIP_LABELS: Record<ProfileRelationship, string> = {
  self: 'Me',
  spouse: 'Spouse',
  partner: 'Partner',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Sibling',
  other: 'Other',
};

export interface UserProfile {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  flags: IngredientFlag[];
  hasCompletedOnboarding: boolean;
  notificationPreferences?: NotificationPreferences;
}

export type ProductCategory = 'food' | 'cosmetics' | 'cleaning' | 'petFood' | 'other';

export type VeganStatus = 'vegan' | 'nonVegan' | 'maybeVegan' | 'unknown';
export type VegetarianStatus = 'vegetarian' | 'nonVegetarian' | 'maybeVegetarian' | 'unknown';

export type DataSource = 'openFoodFacts' | 'openBeautyFacts' | 'openPetFoodFacts' | 'openProductsFacts' | 'manual';

export interface ParsedIngredient {
  name: string;
  normalizedName?: string;
  percent?: number;
  isFlagged: boolean;
  flagReasons: string[];
}

export interface ScannedProduct {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  category: ProductCategory;
  ingredients: ParsedIngredient[];
  rawIngredients?: string;
  additives: string[];
  allergens: string[];
  novaScore?: number;
  nutriscoreGrade?: string;
  veganStatus: VeganStatus;
  vegetarianStatus: VegetarianStatus;
  imageURL?: string;
  source: DataSource;
  scannedAt: Date;
  aiSummary?: string;
  flagsTriggered: string[];
  quantity?: string;
  nutritionData?: NutritionData;
  healthRating?: HealthRating;
}

export type SafetyStatus = 'good' | 'caution' | 'warning' | 'unknown';

export interface ScanResult {
  product: ScannedProduct;
  overallStatus: SafetyStatus;
  flaggedCount: number;
  totalIngredients: number;
}

// API Response Types
export interface OFFResponse {
  status: number;
  status_verbose?: string;
  product?: OFFProduct;
}

export interface OFFProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  allergens?: string;
  allergens_from_ingredients?: string;
  additives_tags?: string[];
  nova_group?: number;
  nutriscore_grade?: string;
  nutriscore_score?: number;
  nutrition_grades?: string;
  ingredients_analysis_tags?: string[];
  image_url?: string;
  image_front_url?: string;
  image_front_small_url?: string;
  image_front_thumb_url?: string;
  image_small_url?: string;
  image_thumb_url?: string;
  selected_images?: {
    front?: {
      display?: { [key: string]: string };
      small?: { [key: string]: string };
      thumb?: { [key: string]: string };
    };
  };
  categories?: string;
  quantity?: string;
  nutriments?: {
    sugars_100g?: number;
    fat_100g?: number;
    'saturated-fat_100g'?: number;
    salt_100g?: number;
    sodium_100g?: number;
    fiber_100g?: number;
    proteins_100g?: number;
    energy_100g?: number;
    'energy-kcal_100g'?: number;
  };
}

export interface NutritionData {
  sugars?: number;
  fat?: number;
  saturatedFat?: number;
  salt?: number;
  fiber?: number;
  protein?: number;
  calories?: number;
}

export type HealthRating = 'healthy' | 'moderate' | 'unhealthy' | 'unknown';

// Predefined Flags Data
export const PREDEFINED_FLAGS = {
  allergens: [
    { value: 'gluten', display: 'Gluten' },
    { value: 'dairy', display: 'Dairy' },
    { value: 'nuts', display: 'Tree Nuts' },
    { value: 'peanuts', display: 'Peanuts' },
    { value: 'soy', display: 'Soy' },
    { value: 'eggs', display: 'Eggs' },
    { value: 'shellfish', display: 'Shellfish' },
    { value: 'fish', display: 'Fish' },
    { value: 'sesame', display: 'Sesame' },
  ],
  additives: [
    { value: 'parabens', display: 'Parabens' },
    { value: 'sulfates', display: 'Sulfates (SLS/SLES)' },
    { value: 'phthalates', display: 'Phthalates' },
    { value: 'formaldehyde', display: 'Formaldehyde' },
    { value: 'artificial_colors', display: 'Artificial Colors' },
    { value: 'artificial_sweeteners', display: 'Artificial Sweeteners' },
    { value: 'msg', display: 'MSG' },
    { value: 'nitrates', display: 'Nitrates/Nitrites' },
    { value: 'bha_bht', display: 'BHA/BHT' },
    { value: 'carrageenan', display: 'Carrageenan' },
  ],
  dietary: [
    { value: 'vegan', display: 'Not Vegan' },
    { value: 'vegetarian', display: 'Not Vegetarian' },
    { value: 'halal', display: 'Not Halal' },
    { value: 'kosher', display: 'Not Kosher' },
  ],
  environmental: [
    { value: 'palm_oil', display: 'Palm Oil' },
    { value: 'microplastics', display: 'Microplastics' },
    { value: 'triclosan', display: 'Triclosan' },
  ],
} as const;

// Category Icons
export const CATEGORY_ICONS: Record<ProductCategory, string> = {
  food: 'Utensils',
  cosmetics: 'Sparkles',
  cleaning: 'Droplets',
  petFood: 'PawPrint',
  other: 'Package',
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  food: 'Food',
  cosmetics: 'Cosmetics',
  cleaning: 'Cleaning',
  petFood: 'Pet Food',
  other: 'Other',
};
