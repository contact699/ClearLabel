// Design Constants for Ingredient Decoder - Modern Premium Design

export const COLORS = {
  // Primary Brand - Rich teal with depth
  brandGreen: '#0D9488',
  brandGreenLight: '#CCFBF1',
  brandGreenDark: '#0F766E',

  // Accent - Warm coral for CTAs
  accent: '#F97316',
  accentLight: '#FFF7ED',

  // Status Colors - Refined palette
  safeGreen: '#10B981',
  safeGreenLight: '#D1FAE5',
  cautionYellow: '#F59E0B',
  cautionYellowLight: '#FEF3C7',
  warningOrange: '#F97316',
  warningOrangeLight: '#FFEDD5',
  alertRed: '#EF4444',
  alertRedLight: '#FEE2E2',

  // Neutrals - Sophisticated grays
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  backgroundPrimary: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  backgroundTertiary: '#F1F5F9',
  cardBackground: '#FFFFFF',
  divider: '#E2E8F0',

  // Glass effects
  glassBg: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',

  // Gradients
  gradientStart: '#0D9488',
  gradientEnd: '#0891B2',
  gradientWarm: '#F97316',
  gradientWarmEnd: '#FB923C',

  // Dark mode variants
  dark: {
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    backgroundPrimary: '#0F172A',
    backgroundSecondary: '#1E293B',
    cardBackground: '#1E293B',
    divider: '#334155',
    glassBg: 'rgba(30, 41, 59, 0.8)',
  }
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const CORNER_RADIUS = {
  small: 8,
  medium: 12,
  large: 16,
  xl: 20,
  card: 24,
  full: 9999,
} as const;

// Ingredient Synonyms for Better Matching
export const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  parabens: ['methylparaben', 'propylparaben', 'butylparaben', 'ethylparaben', 'isobutylparaben'],
  sulfates: ['sodium lauryl sulfate', 'sls', 'sodium laureth sulfate', 'sles', 'ammonium lauryl sulfate'],
  phthalates: ['diethyl phthalate', 'dep', 'dibutyl phthalate', 'dbp'],
  formaldehyde: ['formalin', 'formol', 'dmdm hydantoin', 'imidazolidinyl urea', 'diazolidinyl urea', 'quaternium-15'],
  gluten: ['wheat', 'barley', 'rye', 'oat', 'triticum', 'hordeum', 'secale'],
  dairy: ['milk', 'lactose', 'casein', 'whey', 'cream', 'butter', 'cheese', 'yogurt', 'lactalbumin'],
  nuts: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'macadamia', 'hazelnut', 'brazil nut', 'chestnut'],
  peanuts: ['peanut', 'arachis hypogaea', 'groundnut'],
  soy: ['soya', 'soybean', 'soja', 'glycine soja', 'glycine max'],
  eggs: ['egg', 'albumin', 'globulin', 'lysozyme', 'mayonnaise', 'meringue', 'ovalbumin', 'ovomucin'],
  shellfish: ['shrimp', 'crab', 'lobster', 'crayfish', 'prawn', 'crawfish', 'scampi'],
  fish: ['cod', 'salmon', 'tuna', 'anchovy', 'sardine', 'tilapia', 'fish oil', 'fish sauce'],
  sesame: ['sesame', 'sesamum indicum', 'tahini', 'halvah'],
  palm_oil: ['palm', 'palmitate', 'palmate', 'palmitic', 'elaeis guineensis', 'palmolein'],
  artificial_colors: ['fd&c', 'red 40', 'yellow 5', 'yellow 6', 'blue 1', 'red 3', 'tartrazine', 'e102', 'e110', 'e124', 'e129', 'e133'],
  artificial_sweeteners: ['aspartame', 'sucralose', 'saccharin', 'acesulfame', 'neotame', 'advantame', 'e951', 'e954', 'e955'],
  msg: ['monosodium glutamate', 'glutamic acid', 'glutamate', 'e621'],
  nitrates: ['sodium nitrate', 'sodium nitrite', 'potassium nitrate', 'e250', 'e251', 'e252'],
  bha_bht: ['butylated hydroxyanisole', 'butylated hydroxytoluene', 'e320', 'e321'],
  carrageenan: ['carrageenan', 'e407', 'irish moss'],
  triclosan: ['triclosan', 'irgasan', '5-chloro-2'],
  microplastics: ['polyethylene', 'polypropylene', 'nylon', 'pmma', 'polyethylene terephthalate'],
};

// Daily Tips
export const DAILY_TIPS = [
  {
    title: '"Fragrance" can hide ingredients',
    description: 'The term "fragrance" or "parfum" can contain dozens of undisclosed chemicals. If you\'re sensitive, look for "fragrance-free" products.',
  },
  {
    title: 'NOVA scores explained',
    description: 'NOVA 1 = unprocessed foods, NOVA 4 = ultra-processed. Lower is generally better for your health.',
  },
  {
    title: 'Read labels from the end',
    description: 'Ingredients are listed by quantity. The last few items are present in tiny amounts and may be less concerning.',
  },
  {
    title: '"Natural" doesn\'t mean safe',
    description: 'Many natural ingredients can cause allergies or irritation. Always check ingredients even on "natural" products.',
  },
  {
    title: 'Watch for hidden sugars',
    description: 'Sugar has 50+ names including dextrose, maltose, and anything ending in "-ose". They all add up.',
  },
  {
    title: 'Sulfates aren\'t always bad',
    description: 'SLS/SLES clean effectively but can irritate sensitive skin. They\'re safe for most people in rinse-off products.',
  },
  {
    title: 'Check cosmetics expiration',
    description: 'The open jar symbol (e.g., "12M") shows how long a product is good after opening.',
  },
];

// API URLs
export const API_URLS = {
  openFoodFacts: 'https://world.openfoodfacts.org/api/v2',
  openBeautyFacts: 'https://world.openbeautyfacts.org/api/v2',
  openPetFoodFacts: 'https://world.openpetfoodfacts.org/api/v2',
  openProductsFacts: 'https://world.openproductsfacts.org/api/v2',
} as const;

// Ingredient Education Data
export interface IngredientEducation {
  name: string;
  category: 'allergen' | 'additive' | 'dietary' | 'environmental';
  whatIsIt: string;
  whyConcerning: string;
  commonlyFoundIn: string[];
  riskLevel: 'low' | 'moderate' | 'high';
  whoShouldAvoid: string[];
  alternatives?: string[];
}

export const INGREDIENT_EDUCATION: Record<string, IngredientEducation> = {
  // Allergens
  gluten: {
    name: 'Gluten',
    category: 'allergen',
    whatIsIt: 'A protein found in wheat, barley, rye, and their derivatives. It gives bread its chewy texture.',
    whyConcerning: 'Can trigger severe immune reactions in people with celiac disease and may cause digestive issues in those with gluten sensitivity.',
    commonlyFoundIn: ['Bread', 'Pasta', 'Cereals', 'Beer', 'Soy sauce', 'Processed foods'],
    riskLevel: 'high',
    whoShouldAvoid: ['People with celiac disease', 'Those with gluten sensitivity', 'Some people with IBS'],
    alternatives: ['Rice', 'Quinoa', 'Corn', 'Buckwheat', 'Certified gluten-free products'],
  },
  dairy: {
    name: 'Dairy',
    category: 'allergen',
    whatIsIt: 'Products derived from animal milk, including milk proteins (casein, whey) and milk sugar (lactose).',
    whyConcerning: 'Milk allergies can cause severe reactions. Lactose intolerance causes digestive discomfort in ~65% of adults worldwide.',
    commonlyFoundIn: ['Milk', 'Cheese', 'Yogurt', 'Ice cream', 'Butter', 'Many baked goods'],
    riskLevel: 'moderate',
    whoShouldAvoid: ['People with milk allergy', 'Those with lactose intolerance', 'Vegans'],
    alternatives: ['Oat milk', 'Almond milk', 'Coconut yogurt', 'Vegan cheese'],
  },
  nuts: {
    name: 'Tree Nuts',
    category: 'allergen',
    whatIsIt: 'Nuts that grow on trees including almonds, walnuts, cashews, pecans, and hazelnuts.',
    whyConcerning: 'One of the most common causes of fatal food allergies. Reactions can be severe and unpredictable.',
    commonlyFoundIn: ['Nut butters', 'Granola', 'Chocolate', 'Baked goods', 'Asian cuisine', 'Pesto'],
    riskLevel: 'high',
    whoShouldAvoid: ['Anyone with a tree nut allergy', 'Those advised by doctors due to cross-reactivity'],
    alternatives: ['Sunflower seeds', 'Pumpkin seeds', 'Coconut (usually safe)'],
  },
  peanuts: {
    name: 'Peanuts',
    category: 'allergen',
    whatIsIt: 'A legume (not a tree nut) that grows underground. One of the most common food allergens.',
    whyConcerning: 'Peanut allergy is one of the most dangerous food allergies. Even trace amounts can trigger life-threatening anaphylaxis.',
    commonlyFoundIn: ['Peanut butter', 'Candy bars', 'Asian dishes', 'Baked goods', 'Some ice creams'],
    riskLevel: 'high',
    whoShouldAvoid: ['Anyone with peanut allergy', 'Those with legume allergies (consult doctor)'],
    alternatives: ['Sunflower seed butter', 'Soy nut butter', 'Tahini'],
  },
  soy: {
    name: 'Soy',
    category: 'allergen',
    whatIsIt: 'A legume used extensively in food products. Contains proteins that can trigger allergic reactions.',
    whyConcerning: 'Soy allergy is common in children. Soy is hidden in many processed foods under various names.',
    commonlyFoundIn: ['Tofu', 'Soy sauce', 'Edamame', 'Many processed foods', 'Vegetable oil', 'Protein bars'],
    riskLevel: 'moderate',
    whoShouldAvoid: ['People with soy allergy', 'Some people with thyroid conditions'],
    alternatives: ['Coconut aminos (for soy sauce)', 'Other legumes if tolerated'],
  },
  eggs: {
    name: 'Eggs',
    category: 'allergen',
    whatIsIt: 'Chicken eggs and their derivatives. The proteins in egg whites are the main allergens.',
    whyConcerning: 'Common childhood allergy. Eggs are hidden in many foods and can be hard to avoid.',
    commonlyFoundIn: ['Baked goods', 'Mayonnaise', 'Pasta', 'Some vaccines', 'Meringue', 'Custards'],
    riskLevel: 'moderate',
    whoShouldAvoid: ['People with egg allergy', 'Check vaccine ingredients if severely allergic'],
    alternatives: ['Flax eggs', 'Chia eggs', 'Commercial egg replacers', 'Aquafaba'],
  },
  shellfish: {
    name: 'Shellfish',
    category: 'allergen',
    whatIsIt: 'Crustaceans (shrimp, crab, lobster) and mollusks (clams, oysters, mussels).',
    whyConcerning: 'Shellfish allergy often develops in adulthood and is usually lifelong. Can cause severe anaphylaxis.',
    commonlyFoundIn: ['Seafood dishes', 'Fish sauce', 'Caesar dressing', 'Worcestershire sauce', 'Some Asian dishes'],
    riskLevel: 'high',
    whoShouldAvoid: ['Anyone with shellfish allergy', 'Be cautious with fish if cross-contamination is possible'],
  },
  fish: {
    name: 'Fish',
    category: 'allergen',
    whatIsIt: 'Finned fish including salmon, tuna, cod, and others. Different from shellfish allergy.',
    whyConcerning: 'Fish allergy is often lifelong and can cause severe reactions including anaphylaxis.',
    commonlyFoundIn: ['Fish dishes', 'Fish sauce', 'Caesar salad', 'Worcestershire sauce', 'Some omega supplements'],
    riskLevel: 'high',
    whoShouldAvoid: ['People with fish allergy', 'May need to avoid some supplements'],
    alternatives: ['Algae-based omega-3 supplements'],
  },
  sesame: {
    name: 'Sesame',
    category: 'allergen',
    whatIsIt: 'Seeds from the sesame plant, used in oils, tahini, and as toppings.',
    whyConcerning: 'Recently recognized as a major allergen. Can cause severe reactions and is often unlabeled.',
    commonlyFoundIn: ['Hummus', 'Tahini', 'Bread products', 'Asian cuisine', 'Middle Eastern food', 'Sesame oil'],
    riskLevel: 'high',
    whoShouldAvoid: ['Anyone with sesame allergy'],
    alternatives: ['Sunflower seed butter', 'Other oils for cooking'],
  },

  // Additives
  parabens: {
    name: 'Parabens',
    category: 'additive',
    whatIsIt: 'Synthetic preservatives (methylparaben, propylparaben, etc.) used to prevent bacterial growth in cosmetics.',
    whyConcerning: 'Some studies suggest parabens may mimic estrogen and potentially disrupt hormones. Research is ongoing.',
    commonlyFoundIn: ['Shampoo', 'Lotion', 'Makeup', 'Deodorant', 'Shaving cream'],
    riskLevel: 'low',
    whoShouldAvoid: ['Those concerned about hormone disruption', 'People with sensitive skin'],
    alternatives: ['Products labeled "paraben-free"', 'Natural preservatives like vitamin E'],
  },
  sulfates: {
    name: 'Sulfates (SLS/SLES)',
    category: 'additive',
    whatIsIt: 'Surfactants that create lather and foam. Sodium Lauryl Sulfate (SLS) and Sodium Laureth Sulfate (SLES) are most common.',
    whyConcerning: 'Can strip natural oils and irritate sensitive skin, scalp, or eyes. Generally safe for most people.',
    commonlyFoundIn: ['Shampoo', 'Body wash', 'Toothpaste', 'Dish soap', 'Laundry detergent'],
    riskLevel: 'low',
    whoShouldAvoid: ['People with eczema or sensitive skin', 'Those with color-treated hair'],
    alternatives: ['Sulfate-free shampoos', 'Gentle cleansers with cocamidopropyl betaine'],
  },
  phthalates: {
    name: 'Phthalates',
    category: 'additive',
    whatIsIt: 'Chemicals used to make plastics flexible and to help fragrances last longer.',
    whyConcerning: 'Linked to potential hormone disruption. Often hidden under "fragrance" on labels.',
    commonlyFoundIn: ['Fragranced products', 'Nail polish', 'Hair spray', 'Plastic packaging'],
    riskLevel: 'moderate',
    whoShouldAvoid: ['Pregnant women', 'Those concerned about hormone health', 'Children'],
    alternatives: ['Fragrance-free products', 'Products listing specific fragrance ingredients'],
  },
  artificial_colors: {
    name: 'Artificial Colors',
    category: 'additive',
    whatIsIt: 'Synthetic dyes (Red 40, Yellow 5, Blue 1, etc.) used to make food and products more visually appealing.',
    whyConcerning: 'Some studies link artificial colors to hyperactivity in children. Some people may have sensitivities.',
    commonlyFoundIn: ['Candy', 'Soft drinks', 'Cereals', 'Baked goods', 'Some medications'],
    riskLevel: 'low',
    whoShouldAvoid: ['Children with ADHD', 'Those with dye sensitivities', 'People preferring natural products'],
    alternatives: ['Products colored with fruit/vegetable extracts', 'Naturally colored foods'],
  },
  artificial_sweeteners: {
    name: 'Artificial Sweeteners',
    category: 'additive',
    whatIsIt: 'Zero or low-calorie sugar substitutes including aspartame, sucralose, saccharin, and acesulfame-K.',
    whyConcerning: 'Some studies suggest they may affect gut bacteria or increase sweet cravings. Generally recognized as safe.',
    commonlyFoundIn: ['Diet sodas', 'Sugar-free candy', 'Low-calorie yogurt', 'Protein powders'],
    riskLevel: 'low',
    whoShouldAvoid: ['People with phenylketonuria (PKU) should avoid aspartame', 'Those who experience digestive issues'],
    alternatives: ['Stevia', 'Monk fruit', 'Small amounts of real sugar', 'Honey'],
  },
  msg: {
    name: 'MSG (Monosodium Glutamate)',
    category: 'additive',
    whatIsIt: 'A flavor enhancer that adds umami (savory) taste to food. Naturally occurs in some foods.',
    whyConcerning: 'Some people report headaches or other symptoms, though scientific evidence is mixed. FDA considers it safe.',
    commonlyFoundIn: ['Chinese food', 'Chips', 'Canned soups', 'Processed meats', 'Fast food'],
    riskLevel: 'low',
    whoShouldAvoid: ['Those who experience "Chinese restaurant syndrome"', 'People sensitive to glutamates'],
    alternatives: ['Natural umami from mushrooms, tomatoes, parmesan'],
  },
  nitrates: {
    name: 'Nitrates/Nitrites',
    category: 'additive',
    whatIsIt: 'Preservatives used to cure meat, prevent bacterial growth, and maintain pink color.',
    whyConcerning: 'Can form nitrosamines when cooked at high heat, which are potential carcinogens. Natural nitrates in vegetables are less concerning.',
    commonlyFoundIn: ['Bacon', 'Hot dogs', 'Deli meats', 'Ham', 'Sausages'],
    riskLevel: 'moderate',
    whoShouldAvoid: ['Those limiting processed meat', 'People concerned about cancer risk'],
    alternatives: ['"Uncured" meats (though may still contain natural nitrates)', 'Fresh unprocessed meats'],
  },
  bha_bht: {
    name: 'BHA/BHT',
    category: 'additive',
    whatIsIt: 'Synthetic antioxidants used to prevent fats from going rancid and extend shelf life.',
    whyConcerning: 'Some animal studies suggest potential cancer risk. More research needed in humans.',
    commonlyFoundIn: ['Cereals', 'Chips', 'Butter', 'Chewing gum', 'Cosmetics'],
    riskLevel: 'low',
    whoShouldAvoid: ['Those preferring natural preservatives', 'People limiting synthetic additives'],
    alternatives: ['Products with vitamin E (tocopherols) as preservative'],
  },
  carrageenan: {
    name: 'Carrageenan',
    category: 'additive',
    whatIsIt: 'A seaweed-derived thickener and stabilizer used in many foods and beverages.',
    whyConcerning: 'Some research suggests it may cause digestive inflammation, though food-grade carrageenan is generally considered safe.',
    commonlyFoundIn: ['Plant milks', 'Ice cream', 'Yogurt', 'Deli meats', 'Infant formula'],
    riskLevel: 'low',
    whoShouldAvoid: ['People with digestive issues', 'Those with IBD or IBS'],
    alternatives: ['Products thickened with guar gum or locust bean gum'],
  },
  formaldehyde: {
    name: 'Formaldehyde Releasers',
    category: 'additive',
    whatIsIt: 'Preservatives that slowly release formaldehyde to prevent bacterial growth. Includes DMDM hydantoin, imidazolidinyl urea.',
    whyConcerning: 'Formaldehyde is a known carcinogen. Can cause skin irritation and allergic reactions.',
    commonlyFoundIn: ['Shampoo', 'Body wash', 'Nail polish', 'Hair straightening treatments'],
    riskLevel: 'moderate',
    whoShouldAvoid: ['People with sensitive skin', 'Those with formaldehyde allergy', 'Anyone concerned about carcinogens'],
    alternatives: ['Formaldehyde-free products', 'Products with alternative preservatives'],
  },

  // Environmental
  palm_oil: {
    name: 'Palm Oil',
    category: 'environmental',
    whatIsIt: 'An edible vegetable oil from the fruit of oil palm trees. The most widely used vegetable oil globally.',
    whyConcerning: 'Palm oil production is a major driver of deforestation, habitat destruction, and climate change.',
    commonlyFoundIn: ['Chocolate', 'Cookies', 'Margarine', 'Soap', 'Cosmetics', 'Biofuel'],
    riskLevel: 'moderate',
    whoShouldAvoid: ['Environmentally conscious consumers'],
    alternatives: ['Products with RSPO-certified sustainable palm oil', 'Palm oil-free alternatives'],
  },
  microplastics: {
    name: 'Microplastics',
    category: 'environmental',
    whatIsIt: 'Tiny plastic particles (polyethylene, polypropylene) used as exfoliants or texturizers in cosmetics.',
    whyConcerning: 'Microplastics pollute oceans, harm marine life, and enter the food chain. Now found in human blood and organs.',
    commonlyFoundIn: ['Exfoliating scrubs', 'Toothpaste', 'Some cosmetics', 'Glitter products'],
    riskLevel: 'moderate',
    whoShouldAvoid: ['Everyone (banned in many countries)'],
    alternatives: ['Products with natural exfoliants like sugar, salt, or ground seeds'],
  },
  triclosan: {
    name: 'Triclosan',
    category: 'environmental',
    whatIsIt: 'An antibacterial and antifungal agent. Banned from hand soaps in the US but still found in some products.',
    whyConcerning: 'May contribute to antibiotic resistance, hormone disruption, and environmental contamination.',
    commonlyFoundIn: ['Some toothpastes', 'Hand sanitizers', 'Deodorants', 'Cutting boards'],
    riskLevel: 'moderate',
    whoShouldAvoid: ['Most people (regular soap is equally effective)', 'Pregnant women'],
    alternatives: ['Regular soap and water', 'Alcohol-based sanitizers'],
  },

  // Dietary
  vegan: {
    name: 'Non-Vegan Ingredients',
    category: 'dietary',
    whatIsIt: 'Ingredients derived from animals including meat, dairy, eggs, honey, and animal-derived additives.',
    whyConcerning: 'Conflicts with vegan lifestyle choices, which may be ethical, environmental, or health-related.',
    commonlyFoundIn: ['Many processed foods', 'Cosmetics with beeswax/lanolin', 'Wine (isinglass)', 'Some candies (gelatin)'],
    riskLevel: 'low',
    whoShouldAvoid: ['Vegans', 'Those reducing animal product consumption'],
    alternatives: ['Certified vegan products', 'Plant-based alternatives'],
  },
  vegetarian: {
    name: 'Non-Vegetarian Ingredients',
    category: 'dietary',
    whatIsIt: 'Ingredients from animal flesh including meat, poultry, fish, and byproducts like gelatin.',
    whyConcerning: 'Conflicts with vegetarian dietary choices.',
    commonlyFoundIn: ['Soups', 'Candy (gelatin)', 'Some cheeses (rennet)', 'Some wines'],
    riskLevel: 'low',
    whoShouldAvoid: ['Vegetarians'],
    alternatives: ['Vegetarian-certified products', 'Plant-based alternatives'],
  },
};
