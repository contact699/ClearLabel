import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  Mail,
  Star,
  FileText,
  Shield,
  ExternalLink,
  Smartphone,
  HelpCircle,
  Zap,
  Users,
  Scan,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Heart,
  Share2,
  Copy,
  CheckCircle,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    id: '1',
    category: 'Getting Started',
    question: 'How do I scan a product?',
    answer: 'Go to the Scan tab and either:\n\n1. Point your camera at a barcode to scan packaged products\n2. Use "Scan Ingredients" to take a photo of an ingredients list\n\nThe app will analyze the product and show you any ingredients that match your dietary flags.',
  },
  {
    id: '2',
    category: 'Getting Started',
    question: 'What are dietary flags?',
    answer: 'Dietary flags are ingredients or categories you want to avoid. For example, if you\'re allergic to peanuts, you can add "Peanuts" as a flag. When you scan a product, the app will warn you if it contains any flagged ingredients.\n\nYou can set flags for allergens, additives, dietary preferences (vegan, kosher), and environmental concerns (palm oil).',
  },
  {
    id: '3',
    category: 'Getting Started',
    question: 'How do I set up family profiles?',
    answer: 'Go to Profile → Family Profiles → Add. Create a profile for each family member with their specific dietary flags.\n\nFor example, Dad might avoid fish while your son avoids peanuts. Tap any profile to manage their specific flags.\n\nYou can also share profiles with family members using share codes so everyone stays synced.',
  },
  // Scanning Issues
  {
    id: '4',
    category: 'Scanning Issues',
    question: 'Why isn\'t the barcode scanning?',
    answer: 'Try these steps:\n\n• Ensure good lighting on the barcode\n• Hold your phone steady, about 6 inches away\n• Make sure the entire barcode is visible in the frame\n• Clean your camera lens\n• Try scanning in landscape mode for long barcodes\n\nIf the product still isn\'t found, it may not be in our database. You can use "Scan Ingredients" to analyze the label directly.',
  },
  {
    id: '5',
    category: 'Scanning Issues',
    question: 'Product not found - what can I do?',
    answer: 'If a barcode isn\'t in our database:\n\n1. Use "Scan Ingredients" to photograph the ingredients list\n2. Our AI will analyze the text and identify concerning ingredients\n\nWe use Open Food Facts, a community-driven database with millions of products. New products are added regularly.',
  },
  {
    id: '6',
    category: 'Scanning Issues',
    question: 'Why is the ingredients scan not working well?',
    answer: 'For best results with ingredient label scanning:\n\n• Ensure good, even lighting (no shadows)\n• Hold the camera parallel to the label\n• Make sure all text is in focus\n• Include only the ingredients section, not the whole package\n• Flatten curved labels if possible\n\nThe AI works best with clear, high-contrast text.',
  },
  // Subscription & Billing
  {
    id: '7',
    category: 'Subscription & Billing',
    question: 'How many free scans do I get?',
    answer: 'Free users get 20 scans per month. This resets on the 1st of each month.\n\nUpgrade to Pro for unlimited scans, AI health analysis, and more features.',
  },
  {
    id: '8',
    category: 'Subscription & Billing',
    question: 'How do I upgrade to Pro?',
    answer: 'Go to Profile and tap "Upgrade to Pro" or go to any paywall prompt.\n\nPro includes:\n• Unlimited scans\n• AI health analysis\n• Healthier alternatives\n• Priority support\n\nYou can choose monthly or annual billing.',
  },
  {
    id: '9',
    category: 'Subscription & Billing',
    question: 'How do I cancel my subscription?',
    answer: 'Subscriptions are managed through your app store:\n\n**iOS:** Settings → Your Name → Subscriptions → ClearLabel\n\n**Android:** Play Store → Menu → Subscriptions → ClearLabel\n\nYou\'ll retain Pro access until the end of your billing period.',
  },
  {
    id: '10',
    category: 'Subscription & Billing',
    question: 'Can I get a refund?',
    answer: 'Refunds are handled by Apple (iOS) or Google (Android):\n\n**iOS:** reportaproblem.apple.com\n**Android:** Play Store → Account → Order history\n\nRefunds are typically granted within 48 hours of purchase or for technical issues.',
  },
  // Features
  {
    id: '11',
    category: 'Features',
    question: 'What is the AI Health Analysis?',
    answer: 'AI Health Analysis (Pro feature) provides a detailed breakdown of a product\'s ingredients, including:\n\n• Health impact assessment\n• Potential concerns explained in plain language\n• Who should avoid this product\n• Overall healthiness rating\n\nPowered by advanced AI to help you make informed decisions.',
  },
  {
    id: '12',
    category: 'Features',
    question: 'How does Compare Products work?',
    answer: 'Compare up to 3 products side-by-side:\n\n1. Scan or select products from your history\n2. Go to Compare (from result screen or history)\n3. See nutrition, ingredients, and health ratings compared\n\nGreat for choosing between similar products!',
  },
  {
    id: '13',
    category: 'Features',
    question: 'What is the Nutri-Score?',
    answer: 'Nutri-Score is a nutrition label system that rates food from A (healthiest) to E (least healthy).\n\nIt considers:\n• Positive: Fiber, protein, fruits/vegetables\n• Negative: Calories, sugar, saturated fat, sodium\n\nNot all products have a Nutri-Score - it depends on the data available.',
  },
  {
    id: '14',
    category: 'Features',
    question: 'How do I share a shopping list?',
    answer: 'Go to History tab → Shopping List icon.\n\n1. Create or select a list\n2. Tap "Share" to generate a share code\n3. Send the code to family members\n4. They enter the code to join your list\n\nEveryone can add items and check them off in real-time!',
  },
  // Data & Privacy
  {
    id: '15',
    category: 'Data & Privacy',
    question: 'Where does product data come from?',
    answer: 'We use Open Food Facts, the world\'s largest open food database with over 3 million products.\n\nIt\'s community-driven and transparent. You can contribute by adding products at openfoodfacts.org.',
  },
  {
    id: '16',
    category: 'Data & Privacy',
    question: 'Is my data private?',
    answer: 'Yes! Your scan history and preferences are stored locally on your device.\n\n• We don\'t sell your data\n• Scans are processed securely\n• You can clear your history anytime in Profile → Clear History\n\nSee our Privacy Policy for full details.',
  },
  {
    id: '17',
    category: 'Data & Privacy',
    question: 'How do I delete my data?',
    answer: 'Go to Profile → Clear History to delete all scanned products.\n\nFor a complete reset including preferences and flags, use Profile → Reset App.\n\nTo delete your account entirely, contact support@clearlabel.app.',
  },
];

const CATEGORIES = ['Getting Started', 'Scanning Issues', 'Subscription & Billing', 'Features', 'Data & Privacy'];

export default function HelpScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const appVersion = Application.nativeApplicationVersion || '1.0.0';
  const buildVersion = Application.nativeBuildVersion || '1';

  const filteredFAQs = selectedCategory
    ? FAQ_DATA.filter((faq) => faq.category === selectedCategory)
    : FAQ_DATA;

  const handleContactSupport = () => {
    const subject = encodeURIComponent('ClearLabel Support Request');
    const body = encodeURIComponent(`\n\n---\nApp Version: ${appVersion} (${buildVersion})\nDevice: ${Application.applicationName || 'Unknown'}`);
    Linking.openURL(`mailto:support@clearlabel.app?subject=${subject}&body=${body}`);
  };

  const handleRateApp = () => {
    // iOS App Store or Google Play Store link
    const storeUrl = 'https://apps.apple.com/app/id6757980969'; // Update with actual ID
    Linking.openURL(storeUrl).catch(() => {
      Alert.alert('Unable to Open', 'Please search for ClearLabel in your app store.');
    });
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out ClearLabel - it helps you understand what\'s in your food! Download it here: https://apps.apple.com/app/id6757980969',
      });
    } catch {
      // User cancelled
    }
  };

  const handleCopyDiagnostics = async () => {
    const diagnostics = `ClearLabel Diagnostics
Version: ${appVersion} (${buildVersion})
Date: ${new Date().toISOString()}`;
    
    await Clipboard.setStringAsync(diagnostics);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Diagnostic info copied to clipboard');
  };

  return (
    <View className="flex-1 bg-slate-50">
      <LinearGradient
        colors={['#F0FDFA', '#F8FAFC', '#FFFFFF']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} className="px-6 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/80 items-center justify-center"
            >
              <ArrowLeft size={20} color={COLORS.textPrimary} />
            </Pressable>
            <Text className="text-lg font-bold text-slate-900">Help & Support</Text>
            <View className="w-10" />
          </View>
        </Animated.View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Quick Actions */}
          <Animated.View entering={FadeInDown.delay(100).springify()} className="px-6 mt-4">
            <View className="flex-row space-x-3">
              <Pressable
                onPress={handleContactSupport}
                className="flex-1 bg-white rounded-2xl p-4 items-center border border-slate-100"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 }}
              >
                <View className="w-12 h-12 rounded-full bg-teal-50 items-center justify-center mb-2">
                  <Mail size={22} color={COLORS.brandGreen} />
                </View>
                <Text className="text-sm font-semibold text-slate-900">Email Us</Text>
              </Pressable>

              <Pressable
                onPress={handleRateApp}
                className="flex-1 bg-white rounded-2xl p-4 items-center border border-slate-100 mx-3"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 }}
              >
                <View className="w-12 h-12 rounded-full bg-amber-50 items-center justify-center mb-2">
                  <Star size={22} color="#F59E0B" />
                </View>
                <Text className="text-sm font-semibold text-slate-900">Rate App</Text>
              </Pressable>

              <Pressable
                onPress={handleShareApp}
                className="flex-1 bg-white rounded-2xl p-4 items-center border border-slate-100"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 }}
              >
                <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
                  <Share2 size={22} color="#3B82F6" />
                </View>
                <Text className="text-sm font-semibold text-slate-900">Share</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Category Filter */}
          <Animated.View entering={FadeInDown.delay(120).springify()} className="mt-6">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24 }}
            >
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedCategory(null);
                }}
                className={cn(
                  'px-4 py-2 rounded-full mr-2',
                  !selectedCategory ? 'bg-teal-600' : 'bg-white border border-slate-200'
                )}
              >
                <Text className={!selectedCategory ? 'text-white font-semibold' : 'text-slate-700'}>
                  All
                </Text>
              </Pressable>
              {CATEGORIES.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedCategory(category);
                  }}
                  className={cn(
                    'px-4 py-2 rounded-full mr-2',
                    selectedCategory === category ? 'bg-teal-600' : 'bg-white border border-slate-200'
                  )}
                >
                  <Text className={selectedCategory === category ? 'text-white font-semibold' : 'text-slate-700'}>
                    {category}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          {/* FAQ Section */}
          <View className="px-6 mt-6">
            <View className="flex-row items-center mb-4">
              <HelpCircle size={20} color={COLORS.brandGreen} />
              <Text className="text-lg font-bold text-slate-900 ml-2">
                Frequently Asked Questions
              </Text>
            </View>

            {filteredFAQs.map((faq, index) => (
              <Animated.View
                key={faq.id}
                entering={FadeInDown.delay(150 + index * 20).springify()}
                className="mb-3"
              >
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setExpandedId(expandedId === faq.id ? null : faq.id);
                  }}
                  className="bg-white rounded-2xl p-4 border border-slate-100"
                  style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }}
                >
                  <View className="flex-row items-start">
                    <View className="flex-1">
                      <Text className="text-xs text-teal-600 font-medium mb-1">
                        {faq.category}
                      </Text>
                      <Text className="text-base font-semibold text-slate-900">
                        {faq.question}
                      </Text>
                    </View>
                    <View className="ml-3 mt-1">
                      {expandedId === faq.id ? (
                        <ChevronDown size={20} color={COLORS.textMuted} />
                      ) : (
                        <ChevronRight size={20} color={COLORS.textMuted} />
                      )}
                    </View>
                  </View>
                  {expandedId === faq.id && (
                    <Text className="text-slate-600 mt-3 leading-6">
                      {faq.answer}
                    </Text>
                  )}
                </Pressable>
              </Animated.View>
            ))}
          </View>

          {/* Useful Links */}
          <View className="px-6 mt-8">
            <Text className="text-lg font-bold text-slate-900 mb-4">Useful Links</Text>
            <View className="bg-white rounded-2xl overflow-hidden border border-slate-100">
              <LinkRow
                icon={<Shield size={20} color={COLORS.brandGreen} />}
                label="Privacy Policy"
                onPress={() => Linking.openURL('https://clearlabel.app/privacy')}
              />
              <LinkRow
                icon={<FileText size={20} color={COLORS.brandGreen} />}
                label="Terms of Service"
                onPress={() => Linking.openURL('https://clearlabel.app/terms')}
              />
              <LinkRow
                icon={<ExternalLink size={20} color={COLORS.brandGreen} />}
                label="Open Food Facts"
                subtitle="Our data source"
                onPress={() => Linking.openURL('https://openfoodfacts.org')}
              />
              <LinkRow
                icon={<MessageCircle size={20} color={COLORS.brandGreen} />}
                label="Send Feedback"
                onPress={handleContactSupport}
                isLast
              />
            </View>
          </View>

          {/* Troubleshooting */}
          <View className="px-6 mt-8">
            <Text className="text-lg font-bold text-slate-900 mb-4">Troubleshooting</Text>
            <View className="bg-white rounded-2xl overflow-hidden border border-slate-100">
              <LinkRow
                icon={<RefreshCw size={20} color={COLORS.warningOrange} />}
                label="App Not Working?"
                subtitle="Try closing and reopening the app"
                onPress={() => Alert.alert(
                  'Restart App',
                  'If the app isn\'t working properly:\n\n1. Close the app completely\n2. Wait a few seconds\n3. Reopen the app\n\nIf issues persist, try reinstalling or contact support.',
                  [{ text: 'OK' }]
                )}
              />
              <LinkRow
                icon={<Scan size={20} color={COLORS.warningOrange} />}
                label="Camera Not Working?"
                subtitle="Check camera permissions"
                onPress={() => Alert.alert(
                  'Camera Permissions',
                  'ClearLabel needs camera access to scan barcodes and ingredients.\n\nGo to Settings → ClearLabel → Camera → Enable',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() },
                  ]
                )}
              />
              <LinkRow
                icon={<Copy size={20} color={COLORS.textSecondary} />}
                label="Copy Diagnostic Info"
                subtitle="For support requests"
                onPress={handleCopyDiagnostics}
                isLast
              />
            </View>
          </View>

          {/* App Info */}
          <View className="px-6 mt-8 mb-4">
            <View className="bg-slate-100 rounded-2xl p-4 items-center">
              <View className="w-16 h-16 rounded-2xl bg-teal-600 items-center justify-center mb-3">
                <Scan size={32} color="#FFFFFF" />
              </View>
              <Text className="text-lg font-bold text-slate-900">ClearLabel</Text>
              <Text className="text-sm text-slate-500 mt-1">
                Version {appVersion} ({buildVersion})
              </Text>
              <Text className="text-xs text-slate-400 mt-2 text-center">
                Made with ❤️ for healthier choices
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  subtitle,
  onPress,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      className={cn(
        'flex-row items-center px-4 py-4 active:bg-slate-50',
        !isLast && 'border-b border-slate-100'
      )}
    >
      {icon}
      <View className="flex-1 ml-3">
        <Text className="text-base font-medium text-slate-900">{label}</Text>
        {subtitle && (
          <Text className="text-sm text-slate-500 mt-0.5">{subtitle}</Text>
        )}
      </View>
      <ChevronRight size={20} color={COLORS.textMuted} />
    </Pressable>
  );
}
