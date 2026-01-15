// Open Food Facts API Service
import { API_URLS } from '../constants';
import type { OFFResponse, OFFProduct, DataSource, NutritionData, HealthRating } from '../types';

const USER_AGENT = 'IngredientDecoder - React Native App';

// In-memory cache for offline support (stores last 50 products)
const productCache = new Map<string, { product: OFFProduct; source: DataSource; timestamp: number }>();
const MAX_CACHE_SIZE = 50;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface FetchResult {
  product: OFFProduct | null;
  source: DataSource;
  fromCache?: boolean;
}

export async function fetchProductByBarcode(barcode: string): Promise<FetchResult | null> {
  // Check cache first (offline support)
  const cached = productCache.get(barcode);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_EXPIRY_MS) {
      console.log(`[OpenFoodFacts] Cache hit for barcode: ${barcode}`);
      return {
        product: cached.product,
        source: cached.source,
        fromCache: true,
      };
    } else {
      // Remove expired cache entry
      productCache.delete(barcode);
    }
  }

  // Try food database first
  const foodResult = await fetchFromDatabase(barcode, API_URLS.openFoodFacts, 'openFoodFacts');
  if (foodResult) {
    cacheProduct(barcode, foodResult.product, foodResult.source);
    return { ...foodResult, fromCache: false };
  }

  // Try beauty database
  const beautyResult = await fetchFromDatabase(barcode, API_URLS.openBeautyFacts, 'openBeautyFacts');
  if (beautyResult) {
    cacheProduct(barcode, beautyResult.product, beautyResult.source);
    return { ...beautyResult, fromCache: false };
  }

  // Try pet food database
  const petFoodResult = await fetchFromDatabase(barcode, API_URLS.openPetFoodFacts, 'openPetFoodFacts');
  if (petFoodResult) {
    cacheProduct(barcode, petFoodResult.product, petFoodResult.source);
    return { ...petFoodResult, fromCache: false };
  }

  return null;
}

function cacheProduct(barcode: string, product: OFFProduct | null, source: DataSource) {
  if (!product) return;

  // Maintain cache size limit (LRU - remove oldest)
  if (productCache.size >= MAX_CACHE_SIZE) {
    const firstKey = productCache.keys().next().value;
    if (firstKey) {
      productCache.delete(firstKey);
    }
  }

  productCache.set(barcode, {
    product,
    source,
    timestamp: Date.now(),
  });
}

async function fetchFromDatabase(
  barcode: string,
  baseURL: string,
  source: DataSource
): Promise<FetchResult | null> {
  try {
    const url = `${baseURL}/product/${barcode}.json`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data: OFFResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    return {
      product: data.product,
      source,
    };
  } catch (error) {
    console.error(`Error fetching from ${source}:`, error);
    return null;
  }
}

// Helper to get display name from OFF product
export function getDisplayName(product: OFFProduct): string {
  return product.product_name_en || product.product_name || 'Unknown Product';
}

// Helper to get ingredients text from OFF product
export function getIngredientsText(product: OFFProduct): string | undefined {
  return product.ingredients_text_en || product.ingredients_text;
}

// Helper to get vegan status from OFF product
export function getVeganStatus(product: OFFProduct): 'vegan' | 'nonVegan' | 'maybeVegan' | 'unknown' {
  const tags = product.ingredients_analysis_tags;
  if (!tags) return 'unknown';

  if (tags.includes('en:vegan')) return 'vegan';
  if (tags.includes('en:non-vegan')) return 'nonVegan';
  if (tags.includes('en:maybe-vegan')) return 'maybeVegan';
  return 'unknown';
}

// Helper to get vegetarian status from OFF product
export function getVegetarianStatus(product: OFFProduct): 'vegetarian' | 'nonVegetarian' | 'maybeVegetarian' | 'unknown' {
  const tags = product.ingredients_analysis_tags;
  if (!tags) return 'unknown';

  if (tags.includes('en:vegetarian')) return 'vegetarian';
  if (tags.includes('en:non-vegetarian')) return 'nonVegetarian';
  if (tags.includes('en:maybe-vegetarian')) return 'maybeVegetarian';
  return 'unknown';
}

// Helper to clean allergens from OFF product
export function getCleanedAllergens(product: OFFProduct): string[] {
  const allergenString = product.allergens_from_ingredients || product.allergens || '';
  return allergenString
    .split(',')
    .map((a: string) => a.trim())
    .map((a: string) => a.replace(/^en:/, ''))
    .filter((a: string) => a.length > 0);
}

// Helper to clean additives from OFF product
export function getCleanedAdditives(product: OFFProduct): string[] {
  if (!product.additives_tags) return [];
  return product.additives_tags.map((a: string) => a.replace(/^en:/, ''));
}

// Helper to get nutriscore grade - try multiple fields
export function getNutriscoreGrade(product: OFFProduct): string | undefined {
  // Try the standard field first
  if (product.nutriscore_grade) {
    const grade = product.nutriscore_grade.toLowerCase();
    if (['a', 'b', 'c', 'd', 'e'].includes(grade)) {
      return grade;
    }
  }
  // Fallback to nutrition_grades field
  if (product.nutrition_grades) {
    const grade = product.nutrition_grades.toLowerCase();
    if (['a', 'b', 'c', 'd', 'e'].includes(grade)) {
      return grade;
    }
  }
  return undefined;
}

// Helper to extract nutrition data
export function getNutritionData(product: OFFProduct): NutritionData | undefined {
  const nutriments = product.nutriments;
  if (!nutriments) return undefined;

  return {
    sugars: nutriments.sugars_100g,
    fat: nutriments.fat_100g,
    saturatedFat: nutriments['saturated-fat_100g'],
    salt: nutriments.salt_100g ?? (nutriments.sodium_100g ? nutriments.sodium_100g * 2.5 : undefined),
    fiber: nutriments.fiber_100g,
    protein: nutriments.proteins_100g,
    calories: nutriments['energy-kcal_100g'] ?? (nutriments.energy_100g ? nutriments.energy_100g / 4.184 : undefined),
  };
}

// Calculate health rating based on nutriscore, nova, and additives
export function calculateHealthRating(
  nutriscoreGrade?: string,
  novaScore?: number,
  additivesCount?: number
): HealthRating {
  let score = 0;
  let factors = 0;

  // Nutriscore contributes significantly
  if (nutriscoreGrade) {
    factors++;
    switch (nutriscoreGrade.toLowerCase()) {
      case 'a': score += 5; break;
      case 'b': score += 4; break;
      case 'c': score += 3; break;
      case 'd': score += 2; break;
      case 'e': score += 1; break;
    }
  }

  // NOVA score
  if (novaScore) {
    factors++;
    switch (novaScore) {
      case 1: score += 5; break;
      case 2: score += 4; break;
      case 3: score += 2; break;
      case 4: score += 1; break;
    }
  }

  // Additives count
  if (additivesCount !== undefined) {
    factors++;
    if (additivesCount === 0) score += 5;
    else if (additivesCount <= 2) score += 4;
    else if (additivesCount <= 5) score += 3;
    else if (additivesCount <= 10) score += 2;
    else score += 1;
  }

  if (factors === 0) return 'unknown';

  const average = score / factors;
  if (average >= 4) return 'healthy';
  if (average >= 2.5) return 'moderate';
  return 'unhealthy';
}
