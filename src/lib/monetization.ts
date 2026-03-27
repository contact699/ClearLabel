// Purchases stay opt-in so review builds do not expose unfinished IAP flows.
const monetizationFlag = (process.env.EXPO_PUBLIC_ENABLE_PURCHASES ?? '').trim().toLowerCase();

export const MONETIZATION_ENABLED =
  monetizationFlag === '1' ||
  monetizationFlag === 'true' ||
  monetizationFlag === 'yes';
