// Healthier Alternatives Service - Find better product options
import type { OFFProduct, ProductCategory, HealthRating } from '../types';
import { getNutriscoreGrade, getDisplayName, calculateHealthRating, getCleanedAdditives } from './openFoodFacts';
import { fetchWithRetry } from '../utils/network';

const USER_AGENT = 'ClearLabel - React Native App';

export interface AlternativeProduct {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  nutriscoreGrade?: string;
  novaScore?: number;
  healthRating: HealthRating;
  healthScore: number; // 0-100 score for comparison
  improvementReason: string;
}

interface SearchResult {
  products?: OFFProduct[];
  count?: number;
}

// Calculate a numeric health score (0-100) for comparison
function calculateHealthScore(product: OFFProduct): number {
  let score = 50; // Base score

  // Nutriscore contribution (max +/-25 points)
  const nutriscore = getNutriscoreGrade(product);
  if (nutriscore) {
    switch (nutriscore.toLowerCase()) {
      case 'a': score += 25; break;
      case 'b': score += 15; break;
      case 'c': score += 0; break;
      case 'd': score -= 15; break;
      case 'e': score -= 25; break;
    }
  }

  // NOVA score contribution (max +/-20 points)
  if (product.nova_group) {
    switch (product.nova_group) {
      case 1: score += 20; break;
      case 2: score += 10; break;
      case 3: score -= 10; break;
      case 4: score -= 20; break;
    }
  }

  // Additives penalty (up to -15 points)
  const additives = getCleanedAdditives(product);
  score -= Math.min(additives.length * 3, 15);

  return Math.max(0, Math.min(100, score));
}

// Determine why this alternative is better
function getImprovementReason(
  alternative: OFFProduct,
  originalNutriscore?: string,
  originalNovaScore?: number
): string {
  const reasons: string[] = [];
  const altNutriscore = getNutriscoreGrade(alternative);
  
  // Compare Nutriscore
  if (altNutriscore && originalNutriscore) {
    const grades = ['a', 'b', 'c', 'd', 'e'];
    const originalIndex = grades.indexOf(originalNutriscore.toLowerCase());
    const altIndex = grades.indexOf(altNutriscore.toLowerCase());
    if (altIndex < originalIndex) {
      reasons.push(`Better Nutriscore (${altNutriscore.toUpperCase()} vs ${originalNutriscore.toUpperCase()})`);
    }
  } else if (altNutriscore && !originalNutriscore) {
    reasons.push(`Nutriscore ${altNutriscore.toUpperCase()}`);
  }

  // Compare NOVA score
  if (alternative.nova_group && originalNovaScore) {
    if (alternative.nova_group < originalNovaScore) {
      reasons.push(`Less processed (NOVA ${alternative.nova_group} vs ${originalNovaScore})`);
    }
  } else if (alternative.nova_group && alternative.nova_group <= 2) {
    reasons.push(`Minimally processed (NOVA ${alternative.nova_group})`);
  }

  // Additives
  const additives = getCleanedAdditives(alternative);
  if (additives.length === 0) {
    reasons.push('No additives');
  } else if (additives.length <= 2) {
    reasons.push('Fewer additives');
  }

  return reasons.length > 0 ? reasons.slice(0, 2).join(' • ') : 'Healthier option';
}

// Extract category keywords from product for search
function getCategorySearchTerms(
  productName: string,
  categories?: string
): string[] {
  const terms: string[] = [];
  const nameLower = productName.toLowerCase();
  
  // Product type mapping - more specific to find similar products
  // Order matters - more specific patterns should come first
  const productTypes: { pattern: RegExp; searchTerm: string; categoryHint?: string }[] = [
    // Bars (specific first)
    { pattern: /granola\s*bar/i, searchTerm: 'granola bar', categoryHint: 'snacks' },
    { pattern: /protein\s*bar/i, searchTerm: 'protein bar', categoryHint: 'snacks' },
    { pattern: /energy\s*bar/i, searchTerm: 'energy bar', categoryHint: 'snacks' },
    { pattern: /cereal\s*bar/i, searchTerm: 'cereal bar', categoryHint: 'snacks' },
    { pattern: /snack\s*bar/i, searchTerm: 'snack bar', categoryHint: 'snacks' },
    { pattern: /nutrition\s*bar/i, searchTerm: 'nutrition bar', categoryHint: 'snacks' },
    { pattern: /oat\s*bar/i, searchTerm: 'oat bar', categoryHint: 'snacks' },
    { pattern: /fruit\s*bar/i, searchTerm: 'fruit bar', categoryHint: 'snacks' },
    
    // Beverages - specific patterns BEFORE generic water/juice
    { pattern: /enhanced\s*water|vitamin\s*water|nutrient\s*water/i, searchTerm: 'enhanced water', categoryHint: 'beverages' },
    { pattern: /flavou?red\s*water|infused\s*water/i, searchTerm: 'flavored water', categoryHint: 'beverages' },
    { pattern: /sparkling\s*water|carbonated\s*water|seltzer/i, searchTerm: 'sparkling water', categoryHint: 'beverages' },
    { pattern: /coconut\s*water/i, searchTerm: 'coconut water', categoryHint: 'beverages' },
    { pattern: /sports?\s*drink|electrolyte/i, searchTerm: 'sports drink', categoryHint: 'beverages' },
    { pattern: /energy\s*drink/i, searchTerm: 'energy drink', categoryHint: 'beverages' },
    { pattern: /protein\s*(shake|drink)/i, searchTerm: 'protein shake', categoryHint: 'beverages' },
    { pattern: /smoothie/i, searchTerm: 'smoothie', categoryHint: 'beverages' },
    { pattern: /lemonade/i, searchTerm: 'lemonade', categoryHint: 'beverages' },
    { pattern: /iced\s*tea|ice\s*tea/i, searchTerm: 'iced tea', categoryHint: 'beverages' },
    { pattern: /fruit\s*(punch|drink)|fruit\s*juice\s*drink/i, searchTerm: 'fruit drink', categoryHint: 'beverages' },
    { pattern: /orange\s*juice/i, searchTerm: 'orange juice', categoryHint: 'beverages' },
    { pattern: /apple\s*juice/i, searchTerm: 'apple juice', categoryHint: 'beverages' },
    { pattern: /grape\s*juice/i, searchTerm: 'grape juice', categoryHint: 'beverages' },
    { pattern: /cranberry/i, searchTerm: 'cranberry juice', categoryHint: 'beverages' },
    { pattern: /juice/i, searchTerm: 'fruit juice', categoryHint: 'beverages' },
    { pattern: /soda|cola|pop\b/i, searchTerm: 'soft drink', categoryHint: 'beverages' },
    { pattern: /tea\b/i, searchTerm: 'tea', categoryHint: 'beverages' },
    { pattern: /coffee/i, searchTerm: 'coffee', categoryHint: 'beverages' },
    // Generic water LAST and only if it seems like just water (not "in water")
    { pattern: /\bwater\b(?!\s+beverage|\s+drink)/i, searchTerm: 'bottled water', categoryHint: 'beverages' },
    
    // Cereals & Breakfast
    { pattern: /granola(?!\s*bar)/i, searchTerm: 'granola', categoryHint: 'breakfast' },
    { pattern: /muesli/i, searchTerm: 'muesli', categoryHint: 'breakfast' },
    { pattern: /oatmeal|porridge/i, searchTerm: 'oatmeal', categoryHint: 'breakfast' },
    { pattern: /cereal/i, searchTerm: 'breakfast cereal', categoryHint: 'breakfast' },
    { pattern: /cornflakes/i, searchTerm: 'cornflakes', categoryHint: 'breakfast' },
    
    // Snacks
    { pattern: /chips|crisps/i, searchTerm: 'chips', categoryHint: 'snacks' },
    { pattern: /popcorn/i, searchTerm: 'popcorn', categoryHint: 'snacks' },
    { pattern: /pretzel/i, searchTerm: 'pretzels', categoryHint: 'snacks' },
    { pattern: /crackers/i, searchTerm: 'crackers', categoryHint: 'snacks' },
    { pattern: /nuts|almonds|cashews|peanuts/i, searchTerm: 'nuts', categoryHint: 'snacks' },
    { pattern: /trail\s*mix/i, searchTerm: 'trail mix', categoryHint: 'snacks' },
    
    // Dairy
    { pattern: /greek\s*yogu?rt/i, searchTerm: 'greek yogurt', categoryHint: 'dairy' },
    { pattern: /yogu?rt/i, searchTerm: 'yogurt', categoryHint: 'dairy' },
    { pattern: /milk/i, searchTerm: 'milk', categoryHint: 'dairy' },
    { pattern: /cheese/i, searchTerm: 'cheese', categoryHint: 'dairy' },
    { pattern: /butter/i, searchTerm: 'butter', categoryHint: 'dairy' },
    { pattern: /cream/i, searchTerm: 'cream', categoryHint: 'dairy' },
    
    // Sweet snacks
    { pattern: /cookie|biscuit/i, searchTerm: 'cookies', categoryHint: 'snacks' },
    { pattern: /chocolate/i, searchTerm: 'chocolate', categoryHint: 'snacks' },
    { pattern: /candy|sweets|gummy|gummies/i, searchTerm: 'candy', categoryHint: 'snacks' },
    { pattern: /ice\s*cream/i, searchTerm: 'ice cream', categoryHint: 'frozen' },
    { pattern: /cake/i, searchTerm: 'cake', categoryHint: 'bakery' },
    
    // Bread & Bakery
    { pattern: /bread/i, searchTerm: 'bread', categoryHint: 'bakery' },
    { pattern: /bagel/i, searchTerm: 'bagels', categoryHint: 'bakery' },
    { pattern: /muffin/i, searchTerm: 'muffins', categoryHint: 'bakery' },
    
    // Prepared foods
    { pattern: /pasta/i, searchTerm: 'pasta', categoryHint: 'meals' },
    { pattern: /sauce/i, searchTerm: 'sauce', categoryHint: 'condiments' },
    { pattern: /soup/i, searchTerm: 'soup', categoryHint: 'meals' },
    { pattern: /pizza/i, searchTerm: 'pizza', categoryHint: 'meals' },
    { pattern: /frozen/i, searchTerm: 'frozen meal', categoryHint: 'frozen' },
    
    // Spreads
    { pattern: /peanut\s*butter/i, searchTerm: 'peanut butter', categoryHint: 'spreads' },
    { pattern: /almond\s*butter/i, searchTerm: 'almond butter', categoryHint: 'spreads' },
    { pattern: /jam|jelly\b/i, searchTerm: 'jam', categoryHint: 'spreads' },
    { pattern: /nutella|hazelnut\s*spread/i, searchTerm: 'hazelnut spread', categoryHint: 'spreads' },
    { pattern: /hummus/i, searchTerm: 'hummus', categoryHint: 'dips' },
    
    // Canned/preserved  
    { pattern: /canned\s*(beans|chickpeas|lentils)/i, searchTerm: 'canned legumes', categoryHint: 'canned' },
    { pattern: /beans/i, searchTerm: 'beans', categoryHint: 'canned' },
    { pattern: /chickpeas/i, searchTerm: 'chickpeas', categoryHint: 'canned' },
  ];

  let matchedCategoryHint: string | undefined;
  
  // Find matching product types from name
  for (const { pattern, searchTerm, categoryHint } of productTypes) {
    if (pattern.test(nameLower)) {
      terms.push(searchTerm);
      if (!matchedCategoryHint && categoryHint) {
        matchedCategoryHint = categoryHint;
      }
      break; // Take only the first (most specific) match
    }
  }
  
  // Special handling for "beverage" or "drink" in name - treat as flavored drink
  if (terms.length === 0 && /beverage|drink/i.test(nameLower)) {
    terms.push('flavored drink');
    matchedCategoryHint = 'beverages';
  }
  
  // Extract from categories if available and no direct matches
  if (terms.length === 0 && categories) {
    const categoryList = categories.split(',').map(c => c.trim().toLowerCase());
    
    const categoryKeywords = [
      'cereals', 'breakfast', 'snacks', 'beverages', 'drinks', 'dairy', 
      'yogurt', 'cheese', 'bread', 'cookies', 'biscuits', 'chocolate',
      'chips', 'crackers', 'juice', 'soda', 'water', 'tea', 'coffee',
      'pasta', 'rice', 'sauce', 'soup', 'frozen', 'ice cream', 'candy',
      'granola', 'bars', 'cereal', 'milk', 'butter', 'cream', 'bakery'
    ];
    
    for (const cat of categoryList) {
      for (const keyword of categoryKeywords) {
        if (cat.includes(keyword)) {
          terms.push(keyword);
        }
      }
    }
  }
  
  // If still no matches, use first significant words from product name
  if (terms.length === 0) {
    const words = nameLower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['with', 'from', 'made', 'flavor', 'flavour', 'original'].includes(w));
    if (words.length > 0) {
      terms.push(words.slice(0, 2).join(' '));
    }
  }
  
  return { 
    terms: [...new Set(terms)].slice(0, 3),
    categoryHint: matchedCategoryHint 
  };
}

// Check if a product name/category seems to match our expected category
function isRelevantProduct(
  product: OFFProduct,
  originalCategoryHint?: string,
  originalName?: string
): boolean {
  if (!originalCategoryHint) return true; // No hint, accept all
  
  const productName = (product.product_name || '').toLowerCase();
  const productCategories = (product.categories || '').toLowerCase();
  
  // Exclusion patterns - products that should NEVER match certain categories
  const exclusions: Record<string, RegExp[]> = {
    beverages: [
      /beans?\s*(in|with)/i,
      /chickpeas?\s*(in|with)/i,
      /lentils?\s*(in|with)/i,
      /peas?\s*(in|with)/i,
      /vegetables?\s*(in|with)/i,
      /tuna\s*(in|with)/i,
      /sardines?\s*(in|with)/i,
      /fish\s*(in|with)/i,
      /canned\s*(beans|vegetables|fish)/i,
    ],
    snacks: [
      /beans?\s*(in|with)/i,
      /canned/i,
    ],
  };
  
  // Check exclusions
  const categoryExclusions = exclusions[originalCategoryHint];
  if (categoryExclusions) {
    for (const pattern of categoryExclusions) {
      if (pattern.test(productName)) {
        return false;
      }
    }
  }
  
  // For beverages, make sure it's actually a drink
  if (originalCategoryHint === 'beverages') {
    const drinkPatterns = /beverage|drink|juice|water|soda|tea|coffee|smoothie|lemonade/i;
    const drinkCategories = /beverages|drinks|juices|waters|sodas|teas|coffees/i;
    
    if (!drinkPatterns.test(productName) && !drinkCategories.test(productCategories)) {
      return false;
    }
  }
  
  return true;
}

// Search OpenFoodFacts for similar products
async function searchProducts(
  searchTerm: string,
  category: ProductCategory
): Promise<OFFProduct[]> {
  try {
    // Build search URL with filters for healthier products
    // Note: Search API uses different base URL than the product API
    const baseUrl = category === 'petFood' 
      ? 'https://world.openpetfoodfacts.org' 
      : 'https://world.openfoodfacts.org';
    
    // Search for products with good nutriscore (A or B)
    const searchUrl = `${baseUrl}/cgi/search.pl?` + new URLSearchParams({
      search_terms: searchTerm,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '20',
      // Sort by nutriscore
      sort_by: 'nutriscore_score',
    }).toString();

    const response = await fetchWithRetry(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000,
      retries: 1,
    });

    if (!response.ok) {
      console.log('[Alternatives] Search request failed:', response.status);
      return [];
    }

    const data: SearchResult = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('[Alternatives] Search error:', error);
    return [];
  }
}

export async function findHealthierAlternatives(
  productName: string,
  productCategories: string | undefined,
  currentBarcode: string,
  currentNutriscore: string | undefined,
  currentNovaScore: number | undefined,
  category: ProductCategory,
  maxResults: number = 3
): Promise<AlternativeProduct[]> {
  console.log('[Alternatives] Finding alternatives for:', productName);
  
  // Get search terms from product
  const { terms: searchTerms, categoryHint } = getCategorySearchTerms(productName, productCategories);
  
  let finalSearchTerms = searchTerms;
  if (finalSearchTerms.length === 0) {
    // Fallback: use first two words of product name
    const words = productName.split(' ').slice(0, 2);
    if (words.length > 0) {
      finalSearchTerms = [words.join(' ')];
    }
  }
  
  console.log('[Alternatives] Search terms:', finalSearchTerms, 'Category hint:', categoryHint);
  
  if (finalSearchTerms.length === 0) {
    return [];
  }

  // Calculate current product's health score for comparison
  const currentHealthScore = (() => {
    let score = 50;
    if (currentNutriscore) {
      switch (currentNutriscore.toLowerCase()) {
        case 'a': score += 25; break;
        case 'b': score += 15; break;
        case 'c': score += 0; break;
        case 'd': score -= 15; break;
        case 'e': score -= 25; break;
      }
    }
    if (currentNovaScore) {
      switch (currentNovaScore) {
        case 1: score += 20; break;
        case 2: score += 10; break;
        case 3: score -= 10; break;
        case 4: score -= 20; break;
      }
    }
    return score;
  })();

  // Search for products with each term
  const allProducts: OFFProduct[] = [];
  for (const term of finalSearchTerms.slice(0, 2)) {
    const products = await searchProducts(term, category);
    allProducts.push(...products);
  }

  // Filter and score products
  const alternatives: AlternativeProduct[] = [];
  const seenBarcodes = new Set<string>([currentBarcode]);

  for (const product of allProducts) {
    const barcode = product.code;
    if (!barcode || seenBarcodes.has(barcode)) continue;
    seenBarcodes.add(barcode);

    const name = getDisplayName(product);
    if (!name || name === 'Unknown Product') continue;
    
    // Check if product is actually relevant (same category)
    if (!isRelevantProduct(product, categoryHint, productName)) {
      console.log('[Alternatives] Skipping irrelevant product:', name);
      continue;
    }

    const healthScore = calculateHealthScore(product);
    
    // Only include if it's healthier than the current product
    if (healthScore <= currentHealthScore) continue;

    const nutriscore = getNutriscoreGrade(product);
    const novaScore = product.nova_group;
    const additives = getCleanedAdditives(product);

    alternatives.push({
      barcode,
      name,
      brand: product.brands,
      imageUrl: product.image_front_url || product.image_url,
      nutriscoreGrade: nutriscore,
      novaScore,
      healthRating: calculateHealthRating(nutriscore, novaScore, additives.length),
      healthScore,
      improvementReason: getImprovementReason(product, currentNutriscore, currentNovaScore),
    });
  }

  // Sort by health score and return top results
  alternatives.sort((a, b) => b.healthScore - a.healthScore);
  
  console.log('[Alternatives] Found', alternatives.length, 'healthier options');
  return alternatives.slice(0, maxResults);
}
