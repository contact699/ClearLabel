# ClearLabel Feature Roadmap

A prioritized list of feature ideas for future development.

---

## ✅ Completed

- [x] **Healthier Alternatives Suggestions** - After scanning a product, show 2-3 healthier alternatives in the same category using OpenFoodFacts data.
- [x] **Category-Aware AI Analysis** - AI analysis adapts based on product type (food, cosmetics, cleaning, pet food).
- [x] **Product Comparison Tool** - Compare two products side-by-side with health scores.
- [x] **Request Timeouts & Retry Logic** - All API calls now have timeouts and automatic retry with exponential backoff.
- [x] **Shared API Config Utility** - Centralized API key management to avoid duplication.
- [x] **Barcode Validation** - Validate EAN-13, UPC-A barcodes with checksum verification before API calls.
- [x] **Date Serialization Fix** - Proper Date object rehydration from AsyncStorage JSON strings.
- [x] **ErrorBoundary Integration** - App wrapped with error boundary for crash recovery.

---

## 🔥 High-Impact Features

### 2. Favorites & Shopping List
- [ ] Save favorite products for quick reference
- [ ] Add products to a shopping list
- [ ] Share lists with family members
- [ ] Export list as text/image

### 3. Family Profiles
- [ ] Multiple dietary profiles (e.g., "Me", "Kids", "Spouse")
- [ ] Each profile has different flags/restrictions
- [ ] Quick switch between profiles when scanning
- [ ] Color-coded profile indicators

### 4. Product Recall Alerts
- [ ] Push notifications when a previously scanned product is recalled
- [ ] FDA/USDA recall API integration
- [ ] History scan to check for recalled products
- [ ] Link to recall details

### 5. Quick Scan Widget
- [ ] iOS home screen widget to launch directly into camera
- [ ] Android home screen widget
- [ ] Recent scans widget showing last 3 products

---

## 🎯 Medium-Priority Features

### 6. Scan History Insights/Analytics
- [ ] Weekly/monthly health score trends
- [ ] "You scanned 15 products this week, 80% were healthy"
- [ ] Most common flagged ingredients in your diet
- [ ] Charts and visualizations
- [ ] Improvement suggestions based on patterns

### 7. Offline Mode
- [ ] Cache recently scanned products
- [ ] Cache favorite products
- [ ] Queue scans for when back online
- [ ] Offline ingredient database for basic analysis

### 8. Better Social Sharing
- [ ] Generate shareable cards showing product analysis
- [ ] Instagram-style story format
- [ ] "I found a healthier alternative!" share template
- [ ] Share comparison results

### 9. Ingredient Encyclopedia
- [ ] Tap any ingredient to learn more
- [ ] What it is in simple terms
- [ ] Where it comes from
- [ ] Why it might be flagged
- [ ] Scientific sources and references
- [ ] Search/browse all ingredients

### 10. Voice Feedback
- [ ] "This product contains 3 ingredients you're avoiding"
- [ ] Accessibility feature for hands-free use
- [ ] Optional audio summary after scan
- [ ] Voice commands for scanning

---

## ✨ Nice-to-Have Features

### 11. Batch Scanning Mode
- [ ] Quickly scan multiple products (grocery haul)
- [ ] Review all scanned products at once
- [ ] Summary statistics for the batch
- [ ] "Grocery trip report" feature

### 12. Price Tracking
- [ ] Show where to buy a product for the best price
- [ ] Price comparison across stores
- [ ] Affiliate integration potential
- [ ] Price alerts for favorite products

### 13. Community Reviews
- [ ] User ratings and comments on products
- [ ] Upvote helpful reviews
- [ ] Filter by dietary preference
- [ ] Verified purchase badges

### 14. Meal/Recipe Scanner
- [ ] Scan a recipe and get aggregate nutrition analysis
- [ ] Photo of recipe card OCR
- [ ] URL import for online recipes
- [ ] Suggest healthier ingredient swaps

### 15. Daily Nutrition Tracking
- [ ] Log scanned products as "eaten"
- [ ] Track daily nutrition goals
- [ ] Calorie/macro counting
- [ ] Integration with Apple Health / Google Fit

---

## 🔧 Technical Improvements

### Infrastructure
- [ ] Cloud sync - Backup history across devices
- [ ] User accounts with authentication
- [ ] Better error handling with retry logic
- [ ] Caching layer to reduce API calls for repeated scans

### Platform Integrations
- [ ] Apple Watch companion app
- [ ] Quick glance at recent scans
- [ ] Scan from wrist (barcode only)

### Voice Assistants
- [ ] Siri Shortcuts integration
- [ ] "Hey Siri, is this product safe for me?"
- [ ] Google Assistant integration

### Performance
- [ ] Lazy loading for history
- [ ] Image optimization
- [ ] Reduce bundle size
- [ ] Background sync for alternatives

---

## 💰 Monetization Ideas

### Premium Features (Paywall Candidates)
- [ ] Unlimited AI analysis (vs 5/day free)
- [ ] Family profiles (free: 1, premium: unlimited)
- [ ] Detailed analytics and insights
- [ ] Cloud sync across devices
- [ ] Ad-free experience
- [ ] Priority API access (faster scans)

### Other Revenue
- [ ] Affiliate links for healthier alternatives
- [ ] Sponsored "healthy choice" placements
- [ ] Enterprise/B2B licensing for retailers

---

## 📝 Notes

- Priority should be given to features that increase daily active usage
- Consider user feedback from app store reviews
- Test new features with a small group before full rollout
- Each feature should have analytics to measure engagement

---

*Last updated: January 18, 2026*
