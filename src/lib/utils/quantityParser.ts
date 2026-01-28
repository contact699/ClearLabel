// Quantity Parser Utility - Parse product quantity strings into standardized values

export type QuantityUnit = 'g' | 'ml' | 'oz' | 'lb' | 'count';

export interface ParsedQuantity {
  value: number;
  unit: QuantityUnit;
  normalized: number; // Always in grams (for weight) or ml (for volume)
  display: string; // Formatted display string like "500g" or "1.5L"
  isVolume: boolean;
}

// Conversion factors to normalize units
const WEIGHT_TO_GRAMS: Record<string, number> = {
  'g': 1,
  'gram': 1,
  'grams': 1,
  'kg': 1000,
  'kilogram': 1000,
  'kilograms': 1000,
  'mg': 0.001,
  'milligram': 0.001,
  'milligrams': 0.001,
  'oz': 28.3495,
  'ounce': 28.3495,
  'ounces': 28.3495,
  'lb': 453.592,
  'lbs': 453.592,
  'pound': 453.592,
  'pounds': 453.592,
};

const VOLUME_TO_ML: Record<string, number> = {
  'ml': 1,
  'milliliter': 1,
  'milliliters': 1,
  'millilitre': 1,
  'millilitres': 1,
  'l': 1000,
  'liter': 1000,
  'liters': 1000,
  'litre': 1000,
  'litres': 1000,
  'cl': 10,
  'centiliter': 10,
  'centiliters': 10,
  'centilitre': 10,
  'centilitres': 10,
  'dl': 100,
  'deciliter': 100,
  'deciliters': 100,
  'decilitre': 100,
  'decilitres': 100,
  'fl oz': 29.5735,
  'fl. oz': 29.5735,
  'fl.oz': 29.5735,
  'fluid oz': 29.5735,
  'fluid ounce': 29.5735,
  'fluid ounces': 29.5735,
  'gal': 3785.41,
  'gallon': 3785.41,
  'gallons': 3785.41,
  'pt': 473.176,
  'pint': 473.176,
  'pints': 473.176,
  'qt': 946.353,
  'quart': 946.353,
  'quarts': 946.353,
};

// Count patterns
const COUNT_PATTERNS = [
  /(\d+)\s*(pack|pk|count|ct|pcs?|pieces?|servings?|bars?|bags?|bottles?|cans?|boxes?|units?|tablets?|capsules?|sachets?)\b/i,
  /(\d+)\s*x\s*[\d.]+/i, // "12 x 100g" style
];

/**
 * Parse a quantity string into structured data
 * Handles formats like: "500g", "1.5L", "12 oz", "6-pack", "500 ml", etc.
 */
export function parseQuantity(quantity: string | undefined): ParsedQuantity | null {
  if (!quantity || typeof quantity !== 'string') {
    return null;
  }

  const cleaned = quantity.trim().toLowerCase();

  // Try to parse count patterns first (e.g., "12 pack", "6 count")
  for (const pattern of COUNT_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      const count = parseInt(match[1], 10);
      if (!isNaN(count) && count > 0) {
        return {
          value: count,
          unit: 'count',
          normalized: count,
          display: `${count} ct`,
          isVolume: false,
        };
      }
    }
  }

  // Try to extract number and unit
  // Match patterns like "500g", "1.5 L", "12 oz", "500 ml"
  const quantityRegex = /^[\s]*(\d+(?:[.,]\d+)?)\s*([a-zA-Z.\s]+)[\s]*$/;
  const match = cleaned.match(quantityRegex);

  if (!match) {
    // Try alternate pattern: just number (assume grams)
    const numberOnly = cleaned.match(/^[\s]*(\d+(?:[.,]\d+)?)[\s]*$/);
    if (numberOnly) {
      const value = parseFloat(numberOnly[1].replace(',', '.'));
      if (!isNaN(value) && value > 0) {
        return {
          value,
          unit: 'g',
          normalized: value,
          display: `${value}g`,
          isVolume: false,
        };
      }
    }
    return null;
  }

  const value = parseFloat(match[1].replace(',', '.'));
  const unitStr = match[2].trim().toLowerCase();

  if (isNaN(value) || value <= 0) {
    return null;
  }

  // Check if it's a weight unit
  if (WEIGHT_TO_GRAMS[unitStr] !== undefined) {
    const factor = WEIGHT_TO_GRAMS[unitStr];
    const normalizedGrams = value * factor;

    return {
      value,
      unit: getStandardWeightUnit(unitStr),
      normalized: normalizedGrams,
      display: formatWeightDisplay(normalizedGrams),
      isVolume: false,
    };
  }

  // Check if it's a volume unit
  if (VOLUME_TO_ML[unitStr] !== undefined) {
    const factor = VOLUME_TO_ML[unitStr];
    const normalizedMl = value * factor;

    return {
      value,
      unit: 'ml',
      normalized: normalizedMl,
      display: formatVolumeDisplay(normalizedMl),
      isVolume: true,
    };
  }

  return null;
}

function getStandardWeightUnit(unit: string): QuantityUnit {
  if (['oz', 'ounce', 'ounces'].includes(unit)) return 'oz';
  if (['lb', 'lbs', 'pound', 'pounds'].includes(unit)) return 'lb';
  return 'g';
}

function formatWeightDisplay(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return kg % 1 === 0 ? `${kg}kg` : `${kg.toFixed(1)}kg`;
  }
  return grams % 1 === 0 ? `${grams}g` : `${grams.toFixed(0)}g`;
}

function formatVolumeDisplay(ml: number): string {
  if (ml >= 1000) {
    const liters = ml / 1000;
    return liters % 1 === 0 ? `${liters}L` : `${liters.toFixed(1)}L`;
  }
  return ml % 1 === 0 ? `${ml}ml` : `${ml.toFixed(0)}ml`;
}

/**
 * Compare quantities and calculate percentage difference
 * Returns positive if newQty is larger, negative if smaller
 */
export function compareQuantities(
  original: ParsedQuantity | null,
  alternative: ParsedQuantity | null
): { diff: number; description: string } | null {
  if (!original || !alternative) {
    return null;
  }

  // Can't compare weight with volume or count
  if (original.isVolume !== alternative.isVolume) {
    return null;
  }
  if (original.unit === 'count' || alternative.unit === 'count') {
    if (original.unit !== alternative.unit) {
      return null;
    }
  }

  const diff = ((alternative.normalized - original.normalized) / original.normalized) * 100;

  let description: string;
  if (Math.abs(diff) < 5) {
    description = 'Same size';
  } else if (diff > 0) {
    description = `${Math.round(diff)}% more`;
  } else {
    description = `${Math.abs(Math.round(diff))}% less`;
  }

  return { diff: Math.round(diff), description };
}

/**
 * Extract quantity from product data
 * OpenFoodFacts stores quantity in the 'quantity' field
 */
export function extractQuantityFromProduct(product: {
  quantity?: string;
  product_quantity?: number;
  product_quantity_unit?: string;
}): ParsedQuantity | null {
  // Try the quantity string first
  if (product.quantity) {
    const parsed = parseQuantity(product.quantity);
    if (parsed) return parsed;
  }

  // Fall back to structured quantity data
  if (product.product_quantity && product.product_quantity > 0) {
    const unit = product.product_quantity_unit?.toLowerCase() || 'g';
    const value = product.product_quantity;

    if (WEIGHT_TO_GRAMS[unit]) {
      return {
        value,
        unit: getStandardWeightUnit(unit),
        normalized: value * WEIGHT_TO_GRAMS[unit],
        display: formatWeightDisplay(value * WEIGHT_TO_GRAMS[unit]),
        isVolume: false,
      };
    }

    if (VOLUME_TO_ML[unit]) {
      return {
        value,
        unit: 'ml',
        normalized: value * VOLUME_TO_ML[unit],
        display: formatVolumeDisplay(value * VOLUME_TO_ML[unit]),
        isVolume: true,
      };
    }
  }

  return null;
}

/**
 * Determine value badge for an alternative product
 */
export type ValueBadge = 'better-value' | 'best-quality' | 'budget-pick' | null;

export function getValueBadge(
  alternativeHealthScore: number,
  originalHealthScore: number,
  quantityComparison: { diff: number } | null,
  isTopHealthScore: boolean
): ValueBadge {
  // Best Quality - highest health score among alternatives
  if (isTopHealthScore && alternativeHealthScore >= originalHealthScore + 10) {
    return 'best-quality';
  }

  // Better Value - significantly more quantity with same/better health
  if (
    quantityComparison &&
    quantityComparison.diff >= 20 &&
    alternativeHealthScore >= originalHealthScore - 5
  ) {
    return 'better-value';
  }

  // Budget Pick - decent health, more quantity
  if (
    quantityComparison &&
    quantityComparison.diff >= 30 &&
    alternativeHealthScore >= originalHealthScore - 15
  ) {
    return 'budget-pick';
  }

  return null;
}
