// Affiliate Links Service - Generate monetized shopping links
import * as Localization from 'expo-localization';

// Affiliate tags - add your actual tags once approved
// Leave empty string to use non-affiliate links until approved
const AFFILIATE_CONFIG = {
  amazon: {
    // Amazon Associates tags per country
    // Apply at: https://affiliate-program.amazon.com/
    tags: {
      US: '', // e.g., 'clearlabel-20'
      UK: '', // e.g., 'clearlabel-21'
      CA: '', // e.g., 'clearlabel-20'
      DE: '', // e.g., 'clearlabel-21'
      FR: '', // e.g., 'clearlabel-21'
      ES: '', // e.g., 'clearlabel-21'
      IT: '', // e.g., 'clearlabel-21'
      JP: '', // e.g., 'clearlabel-22'
      AU: '', // e.g., 'clearlabel-22'
    } as Record<string, string>,
    domains: {
      US: 'amazon.com',
      UK: 'amazon.co.uk',
      CA: 'amazon.ca',
      DE: 'amazon.de',
      FR: 'amazon.fr',
      ES: 'amazon.es',
      IT: 'amazon.it',
      JP: 'amazon.co.jp',
      AU: 'amazon.com.au',
    } as Record<string, string>,
  },
  iherb: {
    // iHerb affiliate code - works globally
    // Apply at: https://www.iherb.com/info/affiliate
    code: '', // e.g., 'CLEARLABEL'
  },
  thriveMarket: {
    // Thrive Market affiliate link (US only)
    // Apply at: https://thrivemarket.com/affiliate
    affiliateUrl: '', // e.g., 'https://thrivemarket.com/?ref=clearlabel'
  },
};

export type ShopOption = 'amazon' | 'iherb' | 'thriveMarket';

export interface ShopLink {
  provider: ShopOption;
  label: string;
  url: string;
  icon: 'shopping-cart' | 'leaf' | 'heart';
  available: boolean;
}

// Detect user's country from locale
function getUserCountry(): string {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const region = locales[0].regionCode;
      if (region) return region.toUpperCase();
    }
  } catch (e) {
    console.warn('[Affiliate] Could not detect locale:', e);
  }
  return 'US'; // Default to US
}

// Check if user is in the US (for Thrive Market)
export function isUSUser(): boolean {
  return getUserCountry() === 'US';
}

// Generate Amazon search URL with affiliate tag
export function getAmazonSearchUrl(productName: string, brand?: string): string {
  const country = getUserCountry();
  const domain = AFFILIATE_CONFIG.amazon.domains[country] || AFFILIATE_CONFIG.amazon.domains.US;
  const tag = AFFILIATE_CONFIG.amazon.tags[country] || AFFILIATE_CONFIG.amazon.tags.US;
  
  // Build search query - include brand for better results
  const searchQuery = brand ? `${brand} ${productName}` : productName;
  const encodedQuery = encodeURIComponent(searchQuery);
  
  let url = `https://www.${domain}/s?k=${encodedQuery}`;
  
  // Add affiliate tag if configured
  if (tag) {
    url += `&tag=${tag}`;
  }
  
  return url;
}

// Generate iHerb search URL with affiliate code
export function getIHerbSearchUrl(productName: string): string {
  const encodedQuery = encodeURIComponent(productName);
  let url = `https://www.iherb.com/search?kw=${encodedQuery}`;
  
  // Add affiliate code if configured
  if (AFFILIATE_CONFIG.iherb.code) {
    url += `&rcode=${AFFILIATE_CONFIG.iherb.code}`;
  }
  
  return url;
}

// Generate Thrive Market search URL
export function getThriveMarketSearchUrl(productName: string): string {
  const encodedQuery = encodeURIComponent(productName);
  
  // If affiliate URL is configured, use it with search
  if (AFFILIATE_CONFIG.thriveMarket.affiliateUrl) {
    return `${AFFILIATE_CONFIG.thriveMarket.affiliateUrl}&search=${encodedQuery}`;
  }
  
  return `https://thrivemarket.com/search?search=${encodedQuery}`;
}

// Determine if a product is likely a supplement/vitamin (better for iHerb)
function isSupplementCategory(productName: string, category?: string): boolean {
  const supplementKeywords = [
    'vitamin', 'supplement', 'probiotic', 'omega', 'fish oil', 'protein powder',
    'collagen', 'magnesium', 'zinc', 'iron', 'calcium', 'multivitamin',
    'antioxidant', 'herbal', 'extract', 'capsule', 'tablet',
  ];
  
  const lowerName = productName.toLowerCase();
  const lowerCategory = category?.toLowerCase() || '';
  
  return supplementKeywords.some(kw => lowerName.includes(kw) || lowerCategory.includes(kw));
}

// Determine if a product is organic/health-focused (good for Thrive Market)
function isOrganicHealthProduct(productName: string, brand?: string): boolean {
  const healthKeywords = [
    'organic', 'non-gmo', 'gluten-free', 'vegan', 'plant-based',
    'natural', 'whole food', 'raw', 'superfood', 'keto', 'paleo',
  ];
  
  const healthBrands = [
    'annie\'s', 'amy\'s', 'nature\'s path', 'bob\'s red mill', 'garden of life',
    'rxbar', 'larabar', 'kind', 'simple mills', 'primal kitchen',
  ];
  
  const lowerName = productName.toLowerCase();
  const lowerBrand = brand?.toLowerCase() || '';
  
  const hasHealthKeyword = healthKeywords.some(kw => lowerName.includes(kw));
  const isHealthBrand = healthBrands.some(b => lowerBrand.includes(b));
  
  return hasHealthKeyword || isHealthBrand;
}

/**
 * Get all available shopping links for a product
 * Returns links sorted by relevance for the product type
 */
export function getShoppingLinks(
  productName: string,
  brand?: string,
  category?: string
): ShopLink[] {
  const links: ShopLink[] = [];
  const isUS = isUSUser();
  const isSupplement = isSupplementCategory(productName, category);
  const isHealthy = isOrganicHealthProduct(productName, brand);
  
  // Amazon - always available, works globally
  links.push({
    provider: 'amazon',
    label: 'Shop on Amazon',
    url: getAmazonSearchUrl(productName, brand),
    icon: 'shopping-cart',
    available: true,
  });
  
  // iHerb - prioritize for supplements, available globally
  if (isSupplement) {
    // Insert at beginning for supplements
    links.unshift({
      provider: 'iherb',
      label: 'Shop on iHerb',
      url: getIHerbSearchUrl(productName),
      icon: 'leaf',
      available: true,
    });
  } else {
    links.push({
      provider: 'iherb',
      label: 'Shop on iHerb',
      url: getIHerbSearchUrl(productName),
      icon: 'leaf',
      available: true,
    });
  }
  
  // Thrive Market - US only, prioritize for organic/health products
  if (isUS) {
    const thriveLink: ShopLink = {
      provider: 'thriveMarket',
      label: 'Shop on Thrive Market',
      url: getThriveMarketSearchUrl(productName),
      icon: 'heart',
      available: true,
    };
    
    if (isHealthy) {
      // Insert at beginning for health products
      links.unshift(thriveLink);
    } else {
      links.push(thriveLink);
    }
  }
  
  return links;
}

/**
 * Get the primary shopping link (best match for product)
 */
export function getPrimaryShoppingLink(
  productName: string,
  brand?: string,
  category?: string
): ShopLink {
  const links = getShoppingLinks(productName, brand, category);
  return links[0]; // First link is the most relevant
}
