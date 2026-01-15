// OCR Service - Extract ingredients from photos using AI
import * as FileSystem from 'expo-file-system';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

export interface OCRResult {
  success: boolean;
  ingredients?: string;
  productName?: string;
  error?: string;
}

export async function extractIngredientsFromImage(imageUri: string): Promise<OCRResult> {
  if (!ANTHROPIC_API_KEY) {
    return {
      success: false,
      error: 'Anthropic API key not configured. Please add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file.',
    };
  }

  try {
    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determine mime type
    const mimeType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    // Send to Claude Vision API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `Analyze this product ingredient list image. Extract and return:
1. The product name (if visible)
2. The complete list of ingredients exactly as written

Format your response as JSON:
{
  "productName": "Product Name Here or null if not visible",
  "ingredients": "Complete ingredient list as a single string, comma-separated"
}

If you cannot read the ingredients clearly, return:
{
  "error": "Could not read ingredients from image"
}

Only return the JSON, no other text.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', errorData);
      return {
        success: false,
        error: 'Failed to analyze image. Please try again.',
      };
    }

    const data = await response.json();

    // Extract the text response from Claude's format
    const outputText = data.content?.[0]?.text || '';

    // Parse the JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      let jsonStr = outputText.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonStr);

      if (parsed.error) {
        return {
          success: false,
          error: parsed.error,
        };
      }

      return {
        success: true,
        productName: parsed.productName || undefined,
        ingredients: parsed.ingredients,
      };
    } catch (parseError) {
      console.error('Failed to parse OCR response:', outputText);
      return {
        success: false,
        error: 'Could not parse ingredient list. Please try a clearer photo.',
      };
    }
  } catch (error) {
    console.error('OCR error:', error);
    return {
      success: false,
      error: 'Failed to process image. Please check your connection and try again.',
    };
  }
}
