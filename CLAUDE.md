# ClearLabel (Ingredient Decoder) - AI Assistant Guide

This document provides comprehensive guidance for AI assistants working on the ClearLabel/Ingredient Decoder app.

## Project Overview

**ClearLabel** (also called Ingredient Decoder) is a mobile app that helps users understand ingredients in food, cosmetics, cleaning products, and pet food by:
- Scanning barcodes to fetch product data from Open Food Facts APIs
- Taking photos of ingredient lists for OCR extraction when barcodes aren't available
- Analyzing ingredients against user-defined flags (allergens, additives, dietary restrictions)
- Providing AI-powered health analysis and recommendations
- Comparing products side-by-side to help users make informed choices
- Tracking scan history with search and filter capabilities

## Tech Stack

<stack>
  Expo SDK 53, React Native 0.76.7, bun (not npm).
  React Query for server/async state.
  NativeWind + Tailwind v3 for styling.
  react-native-reanimated v3 for animations (preferred over Animated from react-native).
  react-native-gesture-handler for gestures.
  lucide-react-native for icons.
  All packages are pre-installed. DO NOT install new packages unless they are @expo-google-font packages or pure JavaScript helpers like lodash, dayjs, etc.
</stack>

## Codebase Structure

<structure>
src/
├── app/                    # Expo Router file-based routes
│   ├── (tabs)/            # Tab navigation (home, scan, history, profile)
│   │   ├── _layout.tsx    # Tab bar with blur effect and lucide icons
│   │   ├── index.tsx      # Home: Dashboard with stats and recent scans
│   │   ├── scan.tsx       # Barcode & photo scanner with mode toggle
│   │   ├── history.tsx    # Scan history with search, filters, compare mode
│   │   └── profile.tsx    # User profile and flag management
│   ├── _layout.tsx        # Root layout with React Query, Gesture Handler, Keyboard Provider
│   ├── result.tsx         # Product analysis results (after scan)
│   ├── compare.tsx        # Side-by-side product comparison
│   ├── onboarding.tsx     # First-time user setup flow
│   ├── paywall.tsx        # Subscription plans (Free/Pro)
│   └── modal.tsx          # Generic modal screen
│
├── components/            # Reusable UI components
│   ├── NutriscoreBadge.tsx         # Grade display (A-E)
│   ├── IngredientDetailModal.tsx   # Educational modal for flagged ingredients
│   └── Themed.tsx                  # Theme-aware components
│
└── lib/
    ├── cn.ts              # className merge utility (clsx + tailwind-merge)
    ├── constants.ts       # Colors, API URLs, ingredient synonyms
    ├── types.ts           # TypeScript type definitions
    ├── useColorScheme.ts  # Theme hook
    ├── state/
    │   └── example-state.ts  # State pattern examples
    ├── stores/            # Zustand state management (all persisted to AsyncStorage)
    │   ├── userStore.ts          # User profile, flags, notifications
    │   ├── historyStore.ts       # Scanned products history
    │   ├── compareStore.ts       # Product comparison state
    │   └── subscriptionStore.ts  # Free/Pro tier state
    └── services/          # Business logic and API integrations
        ├── openFoodFacts.ts      # OFF API + health rating calculation
        ├── ingredientMatcher.ts  # Ingredient analysis against user flags
        ├── ocr.ts                # OpenAI Vision API for photo-to-text
        ├── aiExplanation.ts      # Claude API for comprehensive analysis
        └── index.ts              # Service exports
</structure>

## Key Architecture Patterns

### State Management with Zustand

All stores follow consistent patterns:
- **Persistence**: Uses zustand/middleware persist with AsyncStorage
- **Selectors**: Always use selectors to subscribe to specific state slices
  ```tsx
  // Good - subscribes only to profile name
  const name = useUserStore(s => s.profile?.name);

  // Bad - subscribes to entire store
  const store = useUserStore();
  ```
- **Actions**: Methods that mutate state are colocated with state
- **TypeScript**: Strict typing for all state and actions

#### User Store (src/lib/stores/userStore.ts)
Manages user profile and ingredient flags:
- `initializeProfile(name)` - Creates new user profile
- `addFlag(type, value, displayName)` - Adds ingredient to avoid
- `removeFlag(flagId)` - Removes ingredient flag
- `toggleFlag(flagId)` - Toggles flag active state
- `completeOnboarding()` - Marks onboarding as complete
- `getActiveFlags()` - Returns only active flags
- `updateNotificationPreferences(prefs)` - Updates notification settings

#### History Store (src/lib/stores/historyStore.ts)
Tracks all scanned products:
- Stores full product data including ingredients, allergens, scores
- Provides search and filter capabilities
- Limits history to most recent products (performance)

#### Compare Store (src/lib/stores/compareStore.ts)
Manages product comparison:
- Allows selecting up to 2 products
- Calculates health scores based on Nutriscore, NOVA, flags, additives
- Determines winner and highlights better metrics

### Service Layer Architecture

#### Open Food Facts Integration (src/lib/services/openFoodFacts.ts)
- Fetches from 3 databases: Food, Beauty, Pet Food
- Falls through databases in order until product is found
- Calculates health rating from Nutriscore, NOVA score, and additives
- Helpers: `getDisplayName()`, `getIngredientsText()`, `getVeganStatus()`, etc.

#### Ingredient Matcher (src/lib/services/ingredientMatcher.ts)
- Parses ingredient lists from text
- Normalizes ingredient names
- Matches against user flags using comprehensive synonym database
- Returns flagged ingredients with reasons

#### OCR Service (src/lib/services/ocr.ts)
- Uses OpenAI Vision API (GPT-4 Vision)
- Extracts ingredient list text from photos
- Fallback when barcode scanning fails or product not in database

#### AI Explanation (src/lib/services/aiExplanation.ts)
- Uses Claude API for comprehensive health analysis
- Provides: health verdict, Nutriscore/NOVA assessment, flagged ingredients, allergen warnings, recommendations

### Data Flow

1. **Scan Flow**:
   - User scans barcode OR takes photo of ingredients
   - Barcode: `openFoodFacts.ts` fetches from API
   - Photo: `ocr.ts` extracts text via Vision API
   - `ingredientMatcher.ts` analyzes ingredients against user flags
   - `openFoodFacts.ts` calculates health rating
   - Result screen shows status, ingredients, scores, AI analysis
   - Product saved to `historyStore`

2. **Flag Management Flow**:
   - User sets up flags in onboarding or profile
   - Flags stored in `userStore` with persistence
   - Active flags used by `ingredientMatcher` for all scans
   - Flags can be toggled on/off without deletion

3. **Comparison Flow**:
   - User selects products from history (scale icon)
   - Products added to `compareStore` (max 2)
   - Compare screen calculates health scores
   - Shows side-by-side metrics with winner highlighting

## TypeScript Conventions

<typescript>
  Explicit type annotations for useState: `useState<Type[]>([])` not `useState([])`
  Null/undefined handling: use optional chaining `?.` and nullish coalescing `??`
  Include ALL required properties when creating objects — TypeScript strict mode is enabled.
  Import types from src/lib/types.ts

  Key Types:
  - FlagType: 'allergen' | 'additive' | 'dietary' | 'environmental' | 'custom'
  - ProductCategory: 'food' | 'cosmetics' | 'cleaning' | 'petFood' | 'other'
  - SafetyStatus: 'good' | 'caution' | 'warning' | 'unknown'
  - DataSource: 'openFoodFacts' | 'openBeautyFacts' | 'openPetFoodFacts' | 'manual'
  - HealthRating: 'healthy' | 'moderate' | 'unhealthy' | 'unknown'
</typescript>

## Environment & Development

<environment>
  Standard Expo React Native development environment.
  Use `bun start` or `npx expo start` to run the dev server.
  Logs appear in terminal and can be viewed in expo.log file.

  Environment Variables (from .env):
  - EXPO_PUBLIC_ANTHROPIC_API_KEY - Required for AI health analysis and OCR
  - EXPO_PUBLIC_OPENAI_API_KEY - Optional, for OpenAI-based OCR (not currently used)
  - These are accessed via process.env.EXPO_PUBLIC_*

  To set up:
  1. Copy .env.example to .env
  2. Add your Anthropic API key from https://console.anthropic.com/
  3. The app will display helpful error messages if keys are missing
</environment>

<forbidden_files>
  Do not edit: patches/, babel.config.js, metro.config.js, app.json, tsconfig.json, nativewind-env.d.ts
  Do not commit: .env files (contain API keys)
</forbidden_files>

## Routing with Expo Router

<routing>
  Expo Router for file-based routing. Every file in src/app/ becomes a route.
  Never delete or refactor RootLayoutNav from src/app/_layout.tsx.

  <tabs_router>
    Tabs are defined in src/app/(tabs)/_layout.tsx with bottom-tabs from @bottom-tabs/react-navigation
    Uses blur effect for tab bar (expo-blur)
    Icons from lucide-react-native
    Current tabs: Home, Scan, History, Profile
    At least 2 tabs required — single tab looks bad
  </tabs_router>

  <stack_screens>
    Root stack in src/app/_layout.tsx:
    - (tabs) - Tab navigator (headerShown: false)
    - result - Product analysis (presentation: 'card')
    - compare - Product comparison (presentation: 'card')
    - onboarding - First-time setup (presentation: 'fullScreenModal')
    - paywall - Subscription (presentation: 'modal')
  </stack_screens>

  <navigation>
    Use router from expo-router for navigation:
    ```tsx
    import { router } from 'expo-router';
    router.push('/result');
    router.push({ pathname: '/result', params: { productId: '123' } });
    ```

    Use useLocalSearchParams() for reading params:
    ```tsx
    import { useLocalSearchParams } from 'expo-router';
    const { productId } = useLocalSearchParams();
    ```
  </navigation>
</routing>

## State Management

<state>
  React Query for server/async state. Always use object API: `useQuery({ queryKey, queryFn })`.
  Never wrap RootLayoutNav directly.
  React Query provider must be outermost; nest other providers inside it.

  Use `useMutation` for async operations — no manual `setIsLoading` patterns.
  Wrap third-party lib calls (API calls, camera operations, etc.) in useQuery/useMutation for consistent loading states.
  Reuse query keys across components to share cached data — don't create duplicate providers.

  For local state, use Zustand. However, most state is server state, so use React Query for that.
  Always use a selector with Zustand to subscribe only to the specific slice of state you need (e.g., useStore(s => s.foo)) rather than the whole store to prevent unnecessary re-renders. Make sure that the value returned by the selector is a primitive. Do not execute store methods in selectors; select data/functions, then compute outside the selector.

  For persistence: Zustand stores use zustand/middleware persist with AsyncStorage. Only persist necessary data.
  Split ephemeral from persisted state to avoid hydration bugs.
</state>

## Design System

<design>
  App uses modern, premium mobile-first design aesthetic.

  <color_palette>
    Brand Teal: #0D9488 (primary) to #0891B2 (gradient)
    Status Colors:
    - Good/Healthy: #10B981 (green)
    - Caution: #F59E0B (yellow)
    - Warning/Unhealthy: #EF4444 (red)
    Neutrals: Slate palette (slate-50 to slate-900)
    Defined in src/lib/constants.ts
  </color_palette>

  <typography>
    System fonts with semibold/bold weights
    NativeWind classes: text-sm, text-base, text-lg, text-xl, text-2xl
    Font weights: font-medium, font-semibold, font-bold
  </typography>

  <spacing>
    Consistent scale: 4-8-16-24-32-48
    NativeWind: p-4, p-6, p-8, gap-4, space-y-4, etc.
  </spacing>

  <radius>
    Modern rounded corners: rounded-lg (12px), rounded-xl (16px), rounded-2xl (24px)
    Pills: rounded-full
  </radius>

  <animations>
    react-native-reanimated v3 for all animations
    Spring-based entrances with useAnimatedStyle
    Breathing animations for scanner UI
    Haptic feedback with expo-haptics
  </animations>

  <effects>
    Blur overlays: expo-blur for tab bar and overlays
    Gradients: expo-linear-gradient for CTAs, status cards, backgrounds
    Glass effect: Background blur + opacity + border
  </effects>

  <inspiration>
    iOS, Instagram, Airbnb, Coinbase, polished habit trackers
    Mobile-first: design for touch, thumb zones, glanceability
  </inspiration>

  <avoid>
    Purple gradients on white, generic centered layouts, predictable patterns
    Web-like designs on mobile
    Overused fonts (Space Grotesk, Inter) - use system fonts
    Flat solids - prefer gradients and depth
  </avoid>
</design>

## Styling Best Practices

<styling>
  Use NativeWind for styling. Use cn() helper from src/lib/cn.ts to merge classNames when conditionally applying classNames or passing classNames via props.

  Components that DON'T support className (use style prop):
  - CameraView (expo-camera)
  - LinearGradient (expo-linear-gradient)
  - Animated components (react-native-reanimated)

  Horizontal ScrollViews will expand vertically to fill flex containers. Add `style={{ flexGrow: 0 }}` to constrain height to content.

  Use Pressable over TouchableOpacity for better control and animations.
</styling>

## Common Pitfalls & Solutions

<mistakes>
  <camera>
    Use CameraView from expo-camera, NOT the deprecated Camera import.
    import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
    Use style={{ flex: 1 }}, not className.
    Overlay UI must be absolute positioned inside CameraView.
  </camera>

  <react_native>
    No Node.js buffer in React Native — don't import from 'buffer'.
    Use expo-file-system for file operations.
    Use expo-secure-store for sensitive data storage.
  </react_native>

  <ux>
    Use Pressable over TouchableOpacity.
    Use custom modals, not Alert.alert().
    Ensure keyboard is dismissable and doesn't obscure inputs. Use react-native-keyboard-controller (already installed and configured).
  </ux>

  <safe_area>
    Import from react-native-safe-area-context, NOT from react-native.
    Skip SafeAreaView inside tab stacks with navigation headers.
    Skip when using native headers from Stack/Tab navigator.
    Add when using custom/hidden headers.
    For games or full-screen: use useSafeAreaInsets hook instead.
  </safe_area>

  <outdated_knowledge>
    Your react-native-reanimated and react-native-gesture-handler training may be outdated. Look up current docs before implementing.
  </outdated_knowledge>
</mistakes>

## Data & API Integration

<data>
  <open_food_facts>
    Three APIs accessed via src/lib/services/openFoodFacts.ts:
    - Open Food Facts: https://world.openfoodfacts.org (4M+ food products)
    - Open Beauty Facts: https://world.openbeautyfacts.org (cosmetics)
    - Open Pet Food Facts: https://world.openPetFoodFacts.org (pet food)

    Barcode lookup tries all three databases in order.
    Returns: product name, brand, ingredients, allergens, additives, Nutriscore, NOVA score, vegan status

    Health rating calculation considers:
    - Nutriscore (A-E): nutritional quality
    - NOVA score (1-4): processing level
    - Additives count: E-numbers and preservatives
  </open_food_facts>

  <ai_services>
    OCR (OpenAI Vision): Extract ingredient text from photos
    - Used when barcode not found or user prefers photo mode
    - Prompt asks for clean ingredient list extraction

    AI Analysis (Claude): Comprehensive health analysis
    - Overall health verdict
    - Nutriscore/NOVA assessment
    - Flagged ingredients explanation
    - Allergen warnings
    - Recommendations
  </ai_services>

  <mock_data>
    Create realistic mock data when lacking real data for testing.
    For image analysis: actually send to LLM, don't mock.
  </mock_data>
</data>

## Feature-Specific Notes

<scanner>
  Scan screen (src/app/(tabs)/scan.tsx) has two modes:
  1. Barcode mode: Uses expo-camera to scan barcodes
  2. Ingredients mode: Camera capture for OCR extraction

  UI includes:
  - Frosted glass mode toggle pill
  - Animated scanning frame with teal corner brackets
  - Breathing pulse animation
  - Gradient scanning line that animates up/down
  - Pulsing capture button with gradient
  - Success feedback with green checkmark
  - Error states with recovery options
  - Haptic feedback throughout
</scanner>

<flags>
  Four flag categories (defined in src/lib/types.ts PREDEFINED_FLAGS):
  1. Allergens: Gluten, Dairy, Nuts, Peanuts, Soy, Eggs, Shellfish, Fish, Sesame
  2. Additives: Parabens, Sulfates, Phthalates, Artificial Colors/Sweeteners, MSG, Nitrates, BHA/BHT, Carrageenan
  3. Dietary: Vegan, Vegetarian, Halal, Kosher
  4. Environmental: Palm Oil, Microplastics, Triclosan

  Flags can be:
  - Added in onboarding or profile screen
  - Toggled active/inactive without deletion
  - Used by ingredient matcher with synonym database

  Ingredient matcher uses comprehensive synonyms:
  - Example: "milk" matches "dairy", "whey", "casein", "lactose", etc.
  - Defined in src/lib/constants.ts
</flags>

<comparison>
  Product comparison (src/app/compare.tsx):
  - Select up to 2 products from history
  - Calculates health score (0-100) based on:
    * Nutriscore (40%)
    * NOVA score (30%)
    * Flagged ingredients (20%)
    * Additives (10%)
  - Shows winner with trophy icon
  - Highlights better metric in each row with teal
  - Metrics compared: Nutriscore, NOVA, flags, additives, allergens, vegan
</comparison>

<subscriptions>
  Two tiers managed by src/lib/stores/subscriptionStore.ts:
  - Free: 10 scans/month
  - Pro: Unlimited scans, priority AI

  Scan tracking:
  - Increments on each successful scan
  - Resets monthly (stored as lastResetDate)
  - Shows paywall when limit reached
</subscriptions>

<notifications>
  Managed via userStore notification preferences:
  - Daily reminder: Prompt to scan products
  - Weekly digest: Summary of scans and insights
  - Time configurable (HH:mm format)
  - Uses expo-notifications (already installed)
</notifications>

## Testing & Debugging

<testing>
  Test barcode: "3017620422003" (Nutella - good test product)
  Test categories: Food, Cosmetics, Pet Food

  Use expo.log file to check logs and errors.
  Add console.log statements for debugging - they appear in expo.log.

  For OCR testing: Use clear, well-lit photos of ingredient lists.
  For AI testing: Ensure EXPO_PUBLIC_ANTHROPIC_API_KEY is set in your .env file.
</testing>

## App Store / Submission

<appstore>
  Use Expo Application Services (EAS) for building and submitting:

  **Setup EAS:**
  ```bash
  npm install -g eas-cli
  eas login
  eas build:configure
  ```

  **Build for iOS:**
  ```bash
  eas build --platform ios
  ```

  **Build Android APK (for testing):**
  ```bash
  eas build --platform android --profile preview
  ```

  **Build for App Stores:**
  ```bash
  eas build --platform all --profile production
  eas submit --platform ios
  eas submit --platform android
  ```

  See: https://docs.expo.dev/build/introduction/
</appstore>

## Available Skills

<skills>
You have access to skills in the `.claude/skills` folder:
- ai-apis-like-chatgpt: Use when user asks to make an app requiring AI APIs
- expo-docs: Use when user asks about Expo SDK modules or packages
- frontend-app-design: Use when user asks to design frontend components or screens
</skills>

## Development Workflow

When working on features:

1. **Understand the request**: Read existing code first. Never propose changes to code you haven't read.

2. **Check relevant stores**: Determine which Zustand stores are involved (user, history, compare, subscription).

3. **Identify services**: Determine which services are needed (openFoodFacts, ingredientMatcher, ocr, aiExplanation).

4. **Maintain consistency**:
   - Follow existing naming conventions
   - Use existing color constants from src/lib/constants.ts
   - Reuse existing components where possible
   - Keep TypeScript strict

5. **Test thoroughly**:
   - Check expo.log for errors
   - Test with real barcodes
   - Verify state persistence works
   - Ensure animations are smooth

6. **Avoid over-engineering**:
   - Don't add features beyond what was asked
   - Don't refactor unrelated code
   - Keep solutions simple and focused
   - Only add comments where logic isn't self-evident

7. **Security**:
   - Never commit .env files
   - Validate user input
   - Handle API errors gracefully
   - Don't expose API keys in client code

## Quick Reference

**Key Files to Check First**:
- `src/lib/types.ts` - All TypeScript types
- `src/lib/constants.ts` - Colors, API URLs, synonyms
- `src/lib/stores/*.ts` - State management
- `src/lib/services/*.ts` - Business logic
- `src/app/_layout.tsx` - Navigation structure

**Common Tasks**:
- Add new flag type → Update PREDEFINED_FLAGS in types.ts, add synonyms to constants.ts
- Add new product category → Update ProductCategory type and CATEGORY_ICONS/LABELS
- Modify health calculation → Edit calculateHealthRating in openFoodFacts.ts
- Change scanner UI → Edit src/app/(tabs)/scan.tsx
- Update comparison logic → Edit src/lib/stores/compareStore.ts

**Color Usage**:
- Primary action: COLORS.primary (#0D9488)
- Good status: COLORS.success (#10B981)
- Caution: COLORS.caution (#F59E0B)
- Warning: COLORS.warning (#EF4444)

**Navigation Patterns**:
```tsx
// Navigate to result with product data
router.push({ pathname: '/result', params: { productId } });

// Go back
router.back();

// Replace (no back button)
router.replace('/onboarding');
```

**Store Access Patterns**:
```tsx
// User flags
const activeFlags = useUserStore(s => s.getActiveFlags());
const addFlag = useUserStore(s => s.addFlag);

// History
const products = useHistoryStore(s => s.products);
const addProduct = useHistoryStore(s => s.addProduct);

// Compare
const selectedProducts = useCompareStore(s => s.selectedProducts);
const toggleProduct = useCompareStore(s => s.toggleProduct);
```

This guide should help you understand and work effectively with the ClearLabel codebase. When in doubt, read the existing code patterns and follow them consistently.
