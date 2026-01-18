// API Configuration utilities
import Constants from 'expo-constants';

/**
 * Get Anthropic API key from environment variables
 * EXPO_PUBLIC_ variables are inlined at build time by Expo
 */
export function getAnthropicApiKey(): string | undefined {
  const envKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY || 
                 process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  const extraKey = Constants.expoConfig?.extra?.anthropicApiKey;
  return envKey || extraKey;
}

/**
 * Get OpenAI API key from environment variables
 */
export function getOpenAIApiKey(): string | undefined {
  const envKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY || 
                 process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const extraKey = Constants.expoConfig?.extra?.openaiApiKey;
  return envKey || extraKey;
}

/**
 * Get Google API key from environment variables
 */
export function getGoogleApiKey(): string | undefined {
  const envKey = process.env.EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY || 
                 process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
  const extraKey = Constants.expoConfig?.extra?.googleApiKey;
  return envKey || extraKey;
}
