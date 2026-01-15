# ClearLabel (Ingredient Decoder)

A beautifully designed mobile app that helps users understand what's in their food, cosmetics, and household products by scanning barcodes and highlighting ingredients that match their personal health concerns.

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Expo CLI (`npm install -g expo-cli`)
- Anthropic API key (required for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/contact699/ClearLabel.git
   cd ClearLabel
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:
   ```
   EXPO_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key_here
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here  # Optional
   ```

   Get your Anthropic API key at: https://console.anthropic.com/

4. **Start the development server**
   ```bash
   bun start
   # or npx expo start
   ```

5. **Run on device**
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or press `i` for iOS simulator
   - Or press `a` for Android emulator

### Building for Production

**iOS**
```bash
eas build --platform ios
```

**Android APK**
```bash
eas build --platform android --profile preview
```

**Android App Bundle (for Play Store)**
```bash
eas build --platform android --profile production
```

## Features

- **Barcode Scanning**: Instantly scan product barcodes using your camera
- **Ingredient Photo Scanning**: Take a photo of ingredient lists when barcode isn't found - works as a reliable fallback
- **Personalized Flags**: Set up allergens, dietary restrictions, and ingredients to avoid
- **Smart Analysis**: AI-powered ingredient matching with comprehensive synonym database
- **Product Comparison**: Compare two products side-by-side to see which is healthier for your needs
- **Comprehensive Health Analysis**: AI provides full analysis including:
  - Overall health verdict based on nutrition
  - Nutriscore and NOVA score assessment
  - Flagged ingredients that match user's concerns
  - Unhealthy ingredients (high sugar, additives, etc.)
  - Allergen warnings
  - Clear recommendation
- **Accurate Health Ratings**: Status card now considers Nutriscore, NOVA score, and additives - not just user flags
- **Nutriscore Display**: View product Nutriscore grades (A-E) for nutritional quality at a glance
- **Product History**: Track all scanned products with search and filters
- **Multi-Category Support**: Works with food, cosmetics, cleaning products, and pet food
- **Notifications**: Daily scan reminders and weekly summary digests
- **Subscription Plans**: Free tier with limited scans, Pro tier for unlimited access

## Design System

The app uses a modern, premium design aesthetic with:

- **Color Palette**:
  - Brand Teal: `#0D9488` (primary) to `#0891B2` (gradient)
  - Status Colors: Green (#10B981), Yellow (#F59E0B), Orange (#F97316), Red (#EF4444)
  - Neutral grays from Slate palette
- **Typography**: System fonts with semibold/bold weights
- **Spacing**: Consistent 4-8-16-24-32-48 scale
- **Radius**: Modern rounded corners (12-16-24px)
- **Animations**: Spring-based entrances with react-native-reanimated
- **Glass effects**: Blur overlays for tab bar and navigation
- **Gradients**: Smooth color transitions for CTAs and status cards

## App Structure

```
src/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── _layout.tsx    # Tab bar with blur effect
│   │   ├── index.tsx      # Home screen with dashboard
│   │   ├── scan.tsx       # Barcode & photo scanner
│   │   ├── history.tsx    # Scan history with search
│   │   └── profile.tsx    # Profile & flag management
│   ├── result.tsx         # Product analysis results
│   ├── compare.tsx        # Side-by-side product comparison
│   ├── onboarding.tsx     # First-time user setup
│   └── paywall.tsx        # Subscription plans
├── components/            # Reusable UI components
│   └── NutriscoreBadge.tsx # Nutriscore grade display
└── lib/
    ├── constants.ts       # App colors, ingredient synonyms
    ├── types.ts           # TypeScript type definitions
    ├── stores/            # Zustand state management
    │   ├── userStore.ts   # User profile & flags
    │   ├── historyStore.ts # Scanned products
    │   ├── compareStore.ts # Product comparison state
    │   └── subscriptionStore.ts # Subscription state
    └── services/
        ├── openFoodFacts.ts    # Open Food Facts API + health rating calc
        ├── ingredientMatcher.ts # Ingredient analysis
        ├── ocr.ts              # Photo-to-text extraction
        └── aiExplanation.ts    # Comprehensive AI health analysis
```

## Data Sources

- **Open Food Facts** - Food products (4M+ products)
- **Open Beauty Facts** - Cosmetics and beauty products
- **Open Pet Food Facts** - Pet food products

## Key Technologies

- Expo SDK 53 with React Native
- Expo Camera for barcode scanning
- OpenAI Vision API for OCR ingredient extraction
- Claude API for AI explanations
- Zustand for state management
- NativeWind (TailwindCSS) for styling
- React Native Reanimated for animations
- Expo Blur for glass effects
- Expo Linear Gradient for gradients
- Expo Haptics for touch feedback

## Scanner Features

The scan screen includes a modern, polished UI with:

- **Mode Toggle**: Frosted glass pill selector to switch between Barcode and Ingredients modes
- **Animated Scanning Frame**: Teal corner brackets with breathing pulse animation
- **Scanning Line**: Gradient-colored line that smoothly animates up/down when scanning
- **Pulsing Capture Button**: Large gradient capture button with breathing animation
- **Success Feedback**: Green checkmark overlay with spring animation when barcode is detected
- **Error States**: Frosted glass cards with helpful recovery options
- **Haptic Feedback**: Touch feedback throughout the scanning experience
- **Permission Screens**: Beautiful gradient screens for camera permission requests

## Product Comparison

The comparison feature lets users make informed choices between two products:

- **Side-by-Side View**: See both products with images, names, and brands
- **Health Score**: Calculated score (0-100) based on Nutriscore, NOVA, flags, and additives
- **Visual Verdict**: Clear winner banner with trophy icon and score bars
- **Detailed Metrics**: Compare Nutriscore, NOVA score, flagged ingredients, additives, allergens, and vegan status
- **Winner Highlighting**: Teal highlight on the winning metric in each row
- **Easy Access**: Add products to compare from History (scale icon) or Result screen (header button)
- **Floating CTA**: Compare button appears in History when products are selected

## Ingredient Education

Tap on any flagged ingredient to learn more about it:

- **What Is It**: Clear explanation of what the ingredient is
- **Why It's Flagged**: Science-based information on potential concerns
- **Risk Level**: Color-coded indicators (low/moderate/high)
- **Who Should Avoid**: Specific groups who should be cautious
- **Commonly Found In**: List of products that typically contain this ingredient
- **Alternatives**: Suggestions for avoiding this ingredient

Education data covers 20+ ingredients across allergens, additives, dietary concerns, and environmental impacts.

## Flag Categories

1. **Allergens**: Gluten, Dairy, Nuts, Peanuts, Soy, Eggs, Shellfish, Fish, Sesame
2. **Additives**: Parabens, Sulfates, Phthalates, Artificial Colors/Sweeteners, MSG
3. **Dietary**: Vegan, Vegetarian, Halal, Kosher
4. **Environmental**: Palm Oil, Microplastics, Triclosan

## How It Works

1. User sets up their profile with ingredients they want to avoid
2. Scans a product barcode OR takes a photo of the ingredient list
3. App fetches product data from Open Food Facts APIs or extracts text via OCR
4. App calculates health rating from Nutriscore, NOVA score, and additives
5. Ingredient matcher analyzes ingredients against user's flags
6. Results show health status based on BOTH nutritional quality AND user concerns
7. Users can get comprehensive AI health analysis including nutrition, ingredients, allergens, and recommendations

## Subscription Plans

- **Free**: 10 scans per month
- **Pro**: Unlimited scans, priority AI explanations

## Attribution

Data sourced from [Open Food Facts](https://openfoodfacts.org), the free and open database of food products.
