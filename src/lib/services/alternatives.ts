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
  
  // Extract from categories if available
  if (categories) {
    const categoryList = categories.split(',').map(c => c.trim().toLowerCase());
    
    // Look for specific category keywords
    const foodKeywords = [
      'cereals', 'breakfast', 'snacks', 'beverages', 'drinks', 'dairy', 
      'yogurt', 'cheese', 'bread', 'cookies', 'biscuits', 'chocolate',
      'chips', 'crackers', 'juice', 'soda', 'water', 'tea', 'coffee',
      'pasta', 'rice', 'sauce', 'soup', 'frozen', 'ice cream', 'candy',
      'granola', 'bars', 'cereal', 'milk', 'butter', 'cream'
    ];
    
    for (const cat of categoryList) {
      for (const keyword of foodKeywords) {
        if (cat.includes(keyword)) {
          terms.push(keyword);
        }
      }
    }
  }
  
  // Extract from product name
  const nameLower = productName.toLowerCase();
  const nameKeywords = [
    'cereal', 'granola', 'oatmeal', 'yogurt', 'milk', 'juice', 'soda',
    'chips', 'crackers', 'cookies', 'bread', 'pasta', 'sauce', 'soup',
    'bar', 'snack', 'drink', 'water', 'tea', 'coffee', 'chocolate',
    'candy', 'ice cream', 'cheese', 'butter'
  ];
  
  for (const keyword of nameKeywords) {
    if (nameLower.includes(keyword)) {
      terms.push(keyword);
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
