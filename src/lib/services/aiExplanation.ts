// AI Explanation Service - Generate comprehensive health analysis of products
import type { NutritionData, HealthRating } from '../types';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

export interface AIExplanationResult {
  success: boolean;
  explanation?: string;
  error?: string;
}

export interface ProductAnalysisInput {
  productName: string;
  ingredients: string[];
  flaggedIngredients: { name: string; reasons: string[] }[];
  userConcerns: string[];
  nutriscoreGrade?: string;
  novaScore?: number;
  allergens: string[];
  additives: string[];
  nutritionData?: NutritionData;
  healthRating?: HealthRating;
}

export async function generateIngredientExplanation(
  productName: string,
  ingredients: string[],
  flaggedIngredients: { name: string; reasons: string[] }[],
  userConcerns: string[],
  additionalData?: {
    nutriscoreGrade?: string;
    novaScore?: number;
    allergens?: string[];
    additives?: string[];
    nutritionData?: NutritionData;
    healthRating?: HealthRating;
  }
): Promise<AIExplanationResult> {
  if (!ANTHROPIC_API_KEY) {
    return {
      success: false,
      error: 'Anthropic API key not configured. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file.',
    };
  }

  try {
    // Build nutrition info section
    let nutritionInfo = '';
    if (additionalData?.nutriscoreGrade) {
      nutritionInfo += `Nutriscore: ${additionalData.nutriscoreGrade.toUpperCase()} (A is best, E is worst)\n`;
    }
    if (additionalData?.novaScore) {
      nutritionInfo += `NOVA Score: ${additionalData.novaScore} (1=unprocessed, 4=ultra-processed)\n`;
    }
    if (additionalData?.nutritionData) {
      const nd = additionalData.nutritionData;
      const parts: string[] = [];
      if (nd.sugars !== undefined) parts.push(`Sugars: ${nd.sugars.toFixed(1)}g/100g`);
      if (nd.fat !== undefined) parts.push(`Fat: ${nd.fat.toFixed(1)}g/100g`);
      if (nd.saturatedFat !== undefined) parts.push(`Saturated Fat: ${nd.saturatedFat.toFixed(1)}g/100g`);
      if (nd.salt !== undefined) parts.push(`Salt: ${nd.salt.toFixed(1)}g/100g`);
      if (nd.fiber !== undefined) parts.push(`Fiber: ${nd.fiber.toFixed(1)}g/100g`);
      if (nd.protein !== undefined) parts.push(`Protein: ${nd.protein.toFixed(1)}g/100g`);
      if (nd.calories !== undefined) parts.push(`Calories: ${Math.round(nd.calories)} kcal/100g`);
      if (parts.length > 0) {
        nutritionInfo += `Nutrition per 100g: ${parts.join(', ')}\n`;
      }
    }
    if (additionalData?.allergens && additionalData.allergens.length > 0) {
      nutritionInfo += `Contains allergens: ${additionalData.allergens.join(', ')}\n`;
    }
    if (additionalData?.additives && additionalData.additives.length > 0) {
      nutritionInfo += `Additives (${additionalData.additives.length}): ${additionalData.additives.slice(0, 5).join(', ')}${additionalData.additives.length > 5 ? '...' : ''}\n`;
    }

    const prompt = `You are a friendly nutritionist helping someone understand if a product is healthy and safe for them. Be honest but not alarmist.

Product: ${productName}

${nutritionInfo ? `NUTRITIONAL DATA:\n${nutritionInfo}` : ''}

INGREDIENTS (${ingredients.length} total):
${ingredients.slice(0, 20).join(', ')}${ingredients.length > 20 ? '...' : ''}

USER'S DIETARY CONCERNS/RESTRICTIONS:
${userConcerns.length > 0 ? userConcerns.join(', ') : 'None specified'}

${flaggedIngredients.length > 0 ? `INGREDIENTS MATCHING USER'S CONCERNS:\n${flaggedIngredients.map((f) => `- ${f.name} (matches: ${f.reasons.join(', ')})`).join('\n')}` : ''}

Please provide a comprehensive but concise analysis:

1. OVERALL VERDICT (1-2 sentences)
Start with whether this is a healthy choice overall, considering both nutrition AND the user's specific concerns.

2. HEALTH ANALYSIS (2-3 sentences)
Assess the nutritional quality based on Nutriscore, NOVA score, sugar/fat/salt content. Be specific about what makes it healthy or unhealthy.

3. ${flaggedIngredients.length > 0 ? 'INGREDIENT CONCERNS' : 'NOTABLE INGREDIENTS'} (bullet points)
${flaggedIngredients.length > 0
  ? 'For each flagged ingredient, explain:\n- What it is in simple terms\n- Why it matters for this user\n- Severity: minor, moderate, or significant concern'
  : 'List any ingredients that are generally considered unhealthy (high sugar, artificial additives, etc.) even if not in their flags'}

4. ${additionalData?.allergens && additionalData.allergens.length > 0 ? 'ALLERGEN WARNING\nList the allergens present and warn if relevant to user concerns.' : ''}

5. RECOMMENDATION (1 sentence)
Should they eat this? Offer a clear recommendation.

Guidelines:
- Be honest - if a product is unhealthy (like Pop Tarts), say so clearly
- Use simple language a non-scientist would understand
- Keep total response under 250 words
- Format with clear headings and line breaks`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', errorData);
      return {
        success: false,
        error: 'Failed to generate explanation. Please try again.',
      };
    }

    const data = await response.json();
    const outputText = data.content?.[0]?.text || '';

    if (!outputText) {
      return {
        success: false,
        error: 'No explanation generated. Please try again.',
      };
    }

    return {
      success: true,
      explanation: outputText.trim(),
    };
  } catch (error) {
    console.error('AI explanation error:', error);
    return {
      success: false,
      error: 'Failed to generate explanation. Please check your connection.',
    };
  }
}
