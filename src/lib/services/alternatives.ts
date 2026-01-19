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
  const productTypes: { pattern: RegExp; searchTerm: string }[] = [
    // Bars
    { pattern: /granola\s*bar/i, searchTerm: 'granola bar' },
    { pattern: /protein\s*bar/i, searchTerm: 'protein bar' },
    { pattern: /energy\s*bar/i, searchTerm: 'energy bar' },
    { pattern: /cereal\s*bar/i, searchTerm: 'cereal bar' },
    { pattern: /snack\s*bar/i, searchTerm: 'snack bar' },
    { pattern: /nutrition\s*bar/i, searchTerm: 'nutrition bar' },
    { pattern: /oat\s*bar/i, searchTerm: 'oat bar' },
    // Cereals & Breakfast
    { pattern: /granola/i, searchTerm: 'granola' },
    { pattern: /muesli/i, searchTerm: 'muesli' },
    { pattern: /oatmeal|porridge/i, searchTerm: 'oatmeal' },
    { pattern: /cereal/i, searchTerm: 'breakfast cereal' },
    { pattern: /cornflakes/i, searchTerm: 'cornflakes' },
    // Snacks
    { pattern: /chips|crisps/i, searchTerm: 'chips' },
    { pattern: /popcorn/i, searchTerm: 'popcorn' },
    { pattern: /pretzel/i, searchTerm: 'pretzels' },
    { pattern: /crackers/i, searchTerm: 'crackers' },
    { pattern: /nuts|almonds|cashews|peanuts/i, searchTerm: 'nuts' },
    { pattern: /trail\s*mix/i, searchTerm: 'trail mix' },
    // Dairy
    { pattern: /yogurt|yoghurt/i, searchTerm: 'yogurt' },
    { pattern: /greek\s*yogurt/i, searchTerm: 'greek yogurt' },
    { pattern: /milk/i, searchTerm: 'milk' },
    { pattern: /cheese/i, searchTerm: 'cheese' },
    { pattern: /butter/i, searchTerm: 'butter' },
    { pattern: /cream/i, searchTerm: 'cream' },
    // Drinks
    { pattern: /juice/i, searchTerm: 'juice' },
    { pattern: /soda|cola|pop/i, searchTerm: 'soft drink' },
    { pattern: /smoothie/i, searchTerm: 'smoothie' },
    { pattern: /tea/i, searchTerm: 'tea' },
    { pattern: /coffee/i, searchTerm: 'coffee' },
    { pattern: /water/i, searchTerm: 'water' },
    { pattern: /energy\s*drink/i, searchTerm: 'energy drink' },
    { pattern: /sports\s*drink/i, searchTerm: 'sports drink' },
    // Sweet snacks
    { pattern: /cookie|biscuit/i, searchTerm: 'cookies' },
    { pattern: /chocolate/i, searchTerm: 'chocolate' },
    { pattern: /candy|sweets/i, searchTerm: 'candy' },
    { pattern: /ice\s*cream/i, searchTerm: 'ice cream' },
    { pattern: /cake/i, searchTerm: 'cake' },
    // Bread & Bakery
    { pattern: /bread/i, searchTerm: 'bread' },
    { pattern: /bagel/i, searchTerm: 'bagels' },
    { pattern: /muffin/i, searchTerm: 'muffins' },
    // Prepared foods
    { pattern: /pasta/i, searchTerm: 'pasta' },
    { pattern: /sauce/i, searchTerm: 'sauce' },
    { pattern: /soup/i, searchTerm: 'soup' },
    { pattern: /pizza/i, searchTerm: 'pizza' },
    { pattern: /frozen/i, searchTerm: 'frozen meal' },
    // Spreads
    { pattern: /peanut\s*butter/i, searchTerm: 'peanut butter' },
    { pattern: /jam|jelly/i, searchTerm: 'jam' },
    { pattern: /nutella|hazelnut\s*spread/i, searchTerm: 'hazelnut spread' },
  ];

  // Find matching product types from name
  for (const { pattern, searchTerm } of productTypes) {
    if (pattern.test(nameLower)) {
      terms.push(searchTerm);
    }
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
  
  return [...new Set(terms)].slice(0, 3);
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
  const searchTerms = getCategorySearchTerms(productName, productCategories);
  
  if (searchTerms.length === 0) {
    // Fallback: use first two words of product name
    const words = productName.split(' ').slice(0, 2);
    if (words.length > 0) {
      searchTerms.push(words.join(' '));
    }
  }
  
  console.log('[Alternatives] Search terms:', searchTerms);
  
  if (searchTerms.length === 0) {
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
  for (const term of searchTerms.slice(0, 2)) {
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
