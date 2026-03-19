# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun start              # Start Expo dev server
bun run ios            # Run on iOS
bun run android        # Run on Android
bun run web            # Run on web (with dark mode class support)
bun run lint           # ESLint (expo lint)
bun run typecheck      # TypeScript check (tsc --noEmit)
```

Use `bun`, not `npm`. All packages are pre-installed — do NOT install new packages unless they are `@expo-google-fonts/*` or pure JS helpers (lodash, dayjs, etc.).

## Architecture

**ClearLabel** is an ingredient-scanning mobile app (Expo SDK 53, React Native 0.79.6). Users scan barcodes or photograph ingredient labels to check products against personal dietary flags/allergens.

### Data Flow

1. User scans barcode → `openFoodFacts.ts` queries 4 databases (Food, Beauty, Pet Food, Products)
2. If barcode not found → `ocr.ts` sends photo to OpenAI Vision API for text extraction
3. `ingredientMatcher.ts` analyzes ingredients against user's flags (word-boundary regex + synonym DB)
4. `aiExplanation.ts` calls Claude API for health verdict, flagged ingredients, allergen warnings
5. Product saved to `historyStore`, streak updated in `streakStore`, scan count decremented in `subscriptionStore`

### State Management

- **Server/async state**: React Query (`useQuery`/`useMutation` with object API). Provider is outermost in `_layout.tsx`.
- **Local persistent state**: Zustand stores in `src/lib/stores/` with AsyncStorage persistence:
  - `userStore` — profile, ingredient flags, onboarding status
  - `subscriptionStore` — RevenueCat tier, scan limits (free: 20/month, pro: unlimited)
  - `historyStore` — scanned products collection
  - `streakStore` — daily streak, freezes (0-2), milestones at 3/7/14/30/60/100 days
  - `compareStore` — two products for side-by-side comparison
  - `familyProfilesStore` — multiple user profiles with independent flags
  - `shoppingListStore` — shopping lists with checked/unchecked items

**Zustand selector rule**: Always use `useStore(s => s.field)` with primitive return values. Never subscribe to the whole store.

### Navigation (Expo Router)

- Root: `src/app/_layout.tsx` — Stack navigator wrapped in QueryClientProvider → GestureHandlerRootView → KeyboardProvider
- 4 tabs in `src/app/(tabs)/`: Home, Scan, History, Profile
- Modal/card routes at `src/app/` level: result, compare, shopping-list, insights, encyclopedia, family-profile, onboarding (fullScreenModal), paywall (modal)
- Never delete or refactor `RootLayoutNav` from the root layout.

### Services (`src/lib/services/`)

- `openFoodFacts.ts` — product lookup across 4 Open*Facts databases with retry/timeout
- `ingredientMatcher.ts` — flag matching with synonym expansion
- `ocr.ts` — OpenAI Vision API for ingredient photo extraction
- `aiExplanation.ts` — Claude API for product health analysis
- `purchases.ts` — RevenueCat subscription wrapper
- `alternatives.ts` — healthier product suggestions from OpenFoodFacts
- `notifications.ts` — streak and push notifications

### Design System (`src/lib/constants.ts`)

Brand green `#0D9488`. Status colors: green (safe), yellow (caution), orange (warning), red (alert). Custom spacing scale and corner radii. `INGREDIENT_SYNONYMS` maps allergens to aliases. `INGREDIENT_EDUCATION` has 20+ ingredient entries.

## Key Rules

### Forbidden Files
Do not edit: `patches/`, `babel.config.js`, `metro.config.js`, `app.json`, `tsconfig.json`, `nativewind-env.d.ts`

### TypeScript
- Explicit type annotations for useState: `useState<Type[]>([])` not `useState([])`
- Use `?.` and `??` for null/undefined handling
- Strict mode is on — include ALL required properties when creating objects

### Styling (NativeWind)
- Use `cn()` from `src/lib/cn.ts` to merge conditional classNames
- `CameraView`, `LinearGradient`, and `Animated` components do NOT support `className` — use inline `style` prop
- Horizontal ScrollViews: add `style={{ flexGrow: 0 }}` to constrain height

### Routing
- Only files registered in `src/app/(tabs)/_layout.tsx` become tabs
- Only ONE route can map to `/` — can't have both `src/app/index.tsx` and `src/app/(tabs)/index.tsx`
- Modals outside tabs: create route in `src/app/`, add `<Stack.Screen name="page" options={{ presentation: "modal" }} />` in root layout
- Dynamic params: `const { id } = useLocalSearchParams()` from expo-router

### React Native Pitfalls
- Use `CameraView` from `expo-camera`, NOT deprecated `Camera` import
- Use `Pressable` over `TouchableOpacity`
- No Node.js `buffer` in React Native
- `react-native-reanimated` and `react-native-gesture-handler` docs may be newer than training data — look up current docs
- SafeAreaView: import from `react-native-safe-area-context`, skip when using native navigation headers, add when using custom/hidden headers

### State
- React Query provider must be outermost; nest other providers inside
- Use `useMutation` for async ops — no manual `setIsLoading` patterns
- Wrap third-party lib calls in `useQuery`/`useMutation` for consistent loading states
