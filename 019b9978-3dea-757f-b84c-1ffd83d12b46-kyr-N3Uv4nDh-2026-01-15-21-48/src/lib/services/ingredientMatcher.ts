// Ingredient Matching Logic
import { INGREDIENT_SYNONYMS } from '../constants';
import type { IngredientFlag, ParsedIngredient, SafetyStatus, VeganStatus, VegetarianStatus } from '../types';

interface AnalysisResult {
  parsedIngredients: ParsedIngredient[];
  overallStatus: SafetyStatus;
  flaggedCount: number;
}

// Parse ingredient string into individual items
function parseIngredientString(ingredients: string): string[] {
  if (!ingredients) return [];

  const cleaned = ingredients
    .replace(/\n/g, ', ')
    .replace(/•/g, ',')
    .replace(/\*/g, '');

  // Split by comma but preserve parenthetical content
  const result: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const char of cleaned) {
    if (char === '(') {
      parenDepth++;
      current += char;
    } else if (char === ')') {
      parenDepth--;
      current += char;
    } else if (char === ',' && parenDepth === 0) {
      const trimmed = current.trim();
      if (trimmed) result.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }

  const trimmed = current.trim();
  if (trimmed) result.push(trimmed);

  return result;
}

// Normalize ingredient name for matching
function normalizeIngredientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim();
}

// Check if ingredient matches a flag
function matchesFlag(ingredient: string, flag: IngredientFlag): boolean {
  const ingredientLower = ingredient.toLowerCase();
  const flagValue = flag.value.toLowerCase();

  // Direct match
  if (ingredientLower.includes(flagValue)) return true;

  // Check against known synonyms
  const synonyms = INGREDIENT_SYNONYMS[flagValue] || [];
  for (const synonym of synonyms) {
    if (ingredientLower.includes(synonym.toLowerCase())) return true;
  }

  return false;
}

// Main analysis function
export function analyzeProduct(
  ingredientsText: string,
  allergens: string[],
  additives: string[],
  veganStatus: VeganStatus,
  vegetarianStatus: VegetarianStatus,
  userFlags: IngredientFlag[]
): AnalysisResult {
  const parsedIngredients: ParsedIngredient[] = [];
  let flaggedCount = 0;

  // Parse ingredient string into individual items
  const ingredientList = parseIngredientString(ingredientsText);

  // Check each ingredient against user flags
  for (const ingredientName of ingredientList) {
    const flagReasons: string[] = [];

    for (const flag of userFlags) {
      if (flag.isActive && matchesFlag(ingredientName, flag)) {
        flagReasons.push(flag.displayName);
      }
    }

    const isFlagged = flagReasons.length > 0;
    if (isFlagged) flaggedCount++;

    parsedIngredients.push({
      name: ingredientName,
      normalizedName: normalizeIngredientName(ingredientName),
      isFlagged,
      flagReasons,
    });
  }

  // Check allergens from API against user flags
  for (const allergen of allergens) {
    const allergenLower = allergen.toLowerCase();
    for (const flag of userFlags) {
      if (flag.type === 'allergen' && flag.isActive) {
        if (allergenLower.includes(flag.value.toLowerCase())) {
          // Mark any matching ingredient
          for (let i = 0; i < parsedIngredients.length; i++) {
            if (parsedIngredients[i].name.toLowerCase().includes(allergenLower)) {
              if (!parsedIngredients[i].flagReasons.includes(flag.displayName)) {
                parsedIngredients[i].flagReasons.push(flag.displayName);
                if (!parsedIngredients[i].isFlagged) {
                  parsedIngredients[i].isFlagged = true;
                  flaggedCount++;
                }
              }
            }
          }
        }
      }
    }
  }

  // Check vegan/vegetarian dietary flags
  const veganFlag = userFlags.find((f) => f.value === 'vegan' && f.isActive);
  const vegetarianFlag = userFlags.find((f) => f.value === 'vegetarian' && f.isActive);

  if (veganFlag && (veganStatus === 'nonVegan' || veganStatus === 'maybeVegan')) {
    flaggedCount++;
  }

  if (vegetarianFlag && (vegetarianStatus === 'nonVegetarian' || vegetarianStatus === 'maybeVegetarian')) {
    flaggedCount++;
  }

  // Determine overall status
  let overallStatus: SafetyStatus;
  if (parsedIngredients.length === 0) {
    overallStatus = 'unknown';
  } else if (flaggedCount === 0) {
    overallStatus = 'good';
  } else if (flaggedCount <= 2) {
    overallStatus = 'caution';
  } else {
    overallStatus = 'warning';
  }

  return {
    parsedIngredients,
    overallStatus,
    flaggedCount,
  };
}

// Get status color
export function getStatusColor(status: SafetyStatus): string {
  switch (status) {
    case 'good':
      return '#34C759';
    case 'caution':
      return '#FFD60A';
    case 'warning':
      return '#FF3B30';
    default:
      return '#8E8E93';
  }
}

// Get status icon name (for lucide-react-native)
export function getStatusIcon(status: SafetyStatus): string {
  switch (status) {
    case 'good':
      return 'CheckCircle';
    case 'caution':
      return 'AlertTriangle';
    case 'warning':
      return 'XCircle';
    default:
      return 'HelpCircle';
  }
}

// Get status title
export function getStatusTitle(status: SafetyStatus): string {
  switch (status) {
    case 'good':
      return 'Looks Good!';
    case 'caution':
      return 'Some Concerns';
    case 'warning':
      return 'Review Carefully';
    default:
      return 'Limited Data';
  }
}
