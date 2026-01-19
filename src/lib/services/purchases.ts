// RevenueCat Purchases Service
import Purchases, { 
  CustomerInfo, 
  PurchasesPackage,
  LOG_LEVEL,
  PurchasesOffering,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API Keys - Replace with your actual keys from RevenueCat dashboard
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '';
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '';

// Entitlement identifier from RevenueCat
const PRO_ENTITLEMENT_ID = 'pro';

// Product identifiers (must match App Store Connect / Google Play Console)
export const PRODUCT_IDS = {
  monthlyPro: 'clearlabel_pro_monthly',
  annualPro: 'clearlabel_pro_annual',
} as const;

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 */
export async function initializePurchases(): Promise<void> {
  if (isInitialized) return;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY;

  if (!apiKey) {
    console.warn('RevenueCat API key not configured. Purchases will not work.');
    return;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    await Purchases.configure({ apiKey });
    isInitialized = true;
    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
  }
}

/**
 * Get current customer info including active subscriptions
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isInitialized) {
    console.warn('RevenueCat not initialized');
    return null;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

/**
 * Check if user has active Pro subscription
 */
export async function checkProStatus(): Promise<boolean> {
  const customerInfo = await getCustomerInfo();
  if (!customerInfo) return false;

  const entitlements = customerInfo.entitlements.active;
  return PRO_ENTITLEMENT_ID in entitlements;
}

/**
 * Get available offerings (subscription packages)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isInitialized) {
    console.warn('RevenueCat not initialized');
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  if (!isInitialized) {
    return { success: false, error: 'RevenueCat not initialized' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = PRO_ENTITLEMENT_ID in customerInfo.entitlements.active;
    
    return { 
      success: isPro, 
      customerInfo,
      error: isPro ? undefined : 'Purchase completed but Pro not activated'
    };
  } catch (error: any) {
    // User cancelled
    if (error.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    
    console.error('Purchase failed:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPro: boolean;
  error?: string;
}> {
  if (!isInitialized) {
    return { success: false, isPro: false, error: 'RevenueCat not initialized' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = PRO_ENTITLEMENT_ID in customerInfo.entitlements.active;
    
    return { success: true, isPro };
  } catch (error: any) {
    console.error('Restore failed:', error);
    return { success: false, isPro: false, error: error.message || 'Restore failed' };
  }
}

/**
 * Set user identifier for RevenueCat (optional but recommended)
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!isInitialized) return;

  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

/**
 * Log out user from RevenueCat
 */
export async function logoutUser(): Promise<void> {
  if (!isInitialized) return;

  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('Failed to logout user:', error);
  }
}

/**
 * Get formatted price string for a package
 */
export function getPackagePrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

/**
 * Check if purchases are configured and ready
 */
export function isPurchasesReady(): boolean {
  return isInitialized;
}
