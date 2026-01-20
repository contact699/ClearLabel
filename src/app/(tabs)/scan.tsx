import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, TextInput, Modal, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { X, Zap, ZapOff, Keyboard, Camera, AlertCircle, ImageIcon, Check, Scan, ScanLine, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  runOnJS
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { v4 as uuidv4 } from 'uuid';
import { useUserStore, useHistoryStore, useFamilyProfilesStore, useSubscriptionStore } from '@/lib/stores';
import { fetchProductByBarcode, getDisplayName, getIngredientsText, getVeganStatus, getVegetarianStatus, getCleanedAllergens, getCleanedAdditives, getNutriscoreGrade, getNutritionData, calculateHealthRating } from '@/lib/services/openFoodFacts';
import { analyzeProduct } from '@/lib/services/ingredientMatcher';
import { extractIngredientsFromImage } from '@/lib/services/ocr';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { ProfileSwitcher } from '@/components/ProfileSwitcher';
import { validateBarcode } from '@/lib/utils/validation';
import type { ScannedProduct, ProductCategory, DataSource } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ScanMode = 'barcode' | 'photo';

// Animated scanning line component
function ScanningLine({ isActive }: { isActive: boolean }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      translateY.value = withRepeat(
        withTiming(140, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      translateY.value = 0;
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isActive) return null;

  return (
    <Animated.View
      style={[{ position: 'absolute', left: 8, right: 8, height: 2 }, animatedStyle]}
    >
      <LinearGradient
        colors={['transparent', COLORS.brandGreen, COLORS.gradientEnd, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1, borderRadius: 2 }}
      />
    </Animated.View>
  );
}

// Animated corner bracket component
function AnimatedCorner({ position, isScanning }: { position: 'tl' | 'tr' | 'bl' | 'br'; isScanning: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isScanning) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1);
      opacity.value = withTiming(1);
    }
  }, [isScanning]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const positionStyles = {
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
    br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 32,
          height: 32,
          borderColor: COLORS.brandGreen,
        },
        positionStyles[position],
        animatedStyle
      ]}
    />
  );
}

// Pulsing capture button
function CaptureButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const scale = useSharedValue(1);
  const innerScale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      false
    );
    innerScale.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      false
    );
  }, []);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="items-center justify-center"
    >
      <Animated.View
        style={[{
          width: 80,
          height: 80,
          borderRadius: 40,
          padding: 4,
          backgroundColor: 'rgba(13, 148, 136, 0.3)',
        }, outerStyle]}
      >
        <Animated.View style={[{ flex: 1, borderRadius: 36, overflow: 'hidden' }, innerStyle]}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Camera size={32} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// Success animation overlay
function SuccessOverlay({ visible, onComplete }: { visible: boolean; onComplete: () => void }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12 });
      opacity.value = withTiming(1, { duration: 200 });

      const timeout = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
        setTimeout(onComplete, 300);
      }, 800);

      return () => clearTimeout(timeout);
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
      }, animatedStyle]}
    >
      <View className="w-24 h-24 rounded-full bg-white items-center justify-center">
        <LinearGradient
          colors={[COLORS.safeGreen, '#059669']}
          style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Check size={48} color="#FFFFFF" strokeWidth={3} />
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

export default function ScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('barcode');
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [ocrProductName, setOcrProductName] = useState('');
  const [ocrCategory, setOcrCategory] = useState<ProductCategory>('food');
  const [extractedIngredients, setExtractedIngredients] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const lastScannedRef = useRef<string | null>(null);

  const processBarcode = useCallback(async (barcode: string) => {
    if (isLoading || barcode === lastScannedRef.current) return;

    lastScannedRef.current = barcode;
    setIsScanning(false);
    setShowSuccess(true);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Delay to show success animation
    setTimeout(async () => {
      setIsLoading(true);
      setLoadingMessage('Looking up product...');
      setError(null);

      try {
        const result = await fetchProductByBarcode(barcode);

        if (!result || !result.product) {
          setError('This barcode isn\'t in our database. Try scanning a photo of the ingredient list instead!');
          setIsLoading(false);
          return;
        }

        const { product: offProduct, source } = result;
        // Use family profile flags if available, otherwise fall back to user flags
        const familyFlags = useFamilyProfilesStore.getState().getActiveFlags();
        const userFlags = useUserStore.getState().getActiveFlags();
        const activeFlags = familyFlags.length > 0 ? familyFlags : userFlags;

        const ingredientsText = getIngredientsText(offProduct) || '';
        const veganStatus = getVeganStatus(offProduct);
        const vegetarianStatus = getVegetarianStatus(offProduct);
        const allergens = getCleanedAllergens(offProduct);
        const additives = getCleanedAdditives(offProduct);
        const nutriscoreGrade = getNutriscoreGrade(offProduct);
        const nutritionData = getNutritionData(offProduct);
        const healthRating = calculateHealthRating(nutriscoreGrade, offProduct.nova_group, additives.length);

        const analysisResult = analyzeProduct(
          ingredientsText,
          allergens,
          additives,
          veganStatus,
          vegetarianStatus,
          activeFlags
        );

        let category: ProductCategory = 'food';
        if (source === 'openBeautyFacts') category = 'cosmetics';
        else if (source === 'openPetFoodFacts') category = 'petFood';
        else if (source === 'openProductsFacts') category = 'cleaning';

        const scannedProduct: ScannedProduct = {
          id: uuidv4(),
          barcode,
          name: getDisplayName(offProduct),
          brand: offProduct.brands || undefined,
          category,
          ingredients: analysisResult.parsedIngredients,
          rawIngredients: ingredientsText,
          additives,
          allergens,
          novaScore: offProduct.nova_group,
          nutriscoreGrade,
          veganStatus,
          vegetarianStatus,
          imageURL: offProduct.image_front_url || offProduct.image_url,
          source: source as DataSource,
          scannedAt: new Date(),
          flagsTriggered: analysisResult.parsedIngredients
            .filter((i) => i.isFlagged)
            .flatMap((i) => i.flagReasons),
          quantity: offProduct.quantity,
          nutritionData,
          healthRating,
        };

        useHistoryStore.getState().addProduct(scannedProduct);
        // Increment scan count for free tier limits
        useSubscriptionStore.getState().incrementScans();
        router.push(`/result?id=${scannedProduct.id}`);
      } catch (err) {
        console.error('Error processing barcode:', err);
        setError('Something went wrong. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }, [isLoading, router]);

  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (!isScanning || isLoading || scanMode !== 'barcode') return;
    processBarcode(result.data);
  }, [isScanning, isLoading, scanMode, processBarcode]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsLoading(true);
    setLoadingMessage('Taking photo...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
        setLoadingMessage('Analyzing ingredients...');

        const ocrResult = await extractIngredientsFromImage(photo.uri);

        if (ocrResult.success && ocrResult.ingredients) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setExtractedIngredients(ocrResult.ingredients);
          setOcrProductName(ocrResult.productName || '');
          setShowOCRModal(true);
        } else {
          setError(ocrResult.error || 'Could not read ingredients. Please try a clearer photo.');
        }
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      setError('Failed to capture photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const imageUri = result.assets[0].uri;
    setCapturedImage(imageUri);
    setIsLoading(true);
    setLoadingMessage('Analyzing ingredients...');

    try {
      const ocrResult = await extractIngredientsFromImage(imageUri);

      if (ocrResult.success && ocrResult.ingredients) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setExtractedIngredients(ocrResult.ingredients);
        setOcrProductName(ocrResult.productName || '');
        setShowOCRModal(true);
      } else {
        setError(ocrResult.error || 'Could not read ingredients. Please try a clearer photo.');
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Failed to analyze image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOCR = () => {
    if (!extractedIngredients.trim() || !ocrProductName.trim()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Use family profile flags if available, otherwise fall back to user flags
    const familyFlags = useFamilyProfilesStore.getState().getActiveFlags();
    const userFlags = useUserStore.getState().getActiveFlags();
    const activeFlags = familyFlags.length > 0 ? familyFlags : userFlags;
    const analysisResult = analyzeProduct(
      extractedIngredients,
      [],
      [],
      'unknown',
      'unknown',
      activeFlags
    );

    const scannedProduct: ScannedProduct = {
      id: uuidv4(),
      name: ocrProductName.trim(),
      category: ocrCategory,
      ingredients: analysisResult.parsedIngredients,
      rawIngredients: extractedIngredients,
      additives: [],
      allergens: [],
      veganStatus: 'unknown',
      vegetarianStatus: 'unknown',
      imageURL: capturedImage || undefined,
      source: 'manual',
      scannedAt: new Date(),
      flagsTriggered: analysisResult.parsedIngredients
        .filter((i) => i.isFlagged)
        .flatMap((i) => i.flagReasons),
    };

    useHistoryStore.getState().addProduct(scannedProduct);
    // Increment scan count for free tier limits
    useSubscriptionStore.getState().incrementScans();
    setShowOCRModal(false);
    router.push(`/result?id=${scannedProduct.id}`);
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim().length > 0) {
      setShowManualEntry(false);
      processBarcode(manualBarcode.trim());
    }
  };

  const resetScanner = () => {
    setIsScanning(true);
    setError(null);
    setCapturedImage(null);
    setShowSuccess(false);
    lastScannedRef.current = null;
  };

  const toggleScanMode = () => {
    Haptics.selectionAsync();
    setScanMode(scanMode === 'barcode' ? 'photo' : 'barcode');
    resetScanner();
  };

  // Permission loading state
  if (!permission) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}
        >
          <Scan size={32} color="#FFFFFF" />
        </LinearGradient>
        <Text className="text-white/60 mt-4">Initializing camera...</Text>
      </View>
    );
  }

  // Permission request state
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-slate-900">
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          style={{ flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' }}
        >
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              style={{ width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' }}
            >
              <Camera size={48} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(200).springify()}
            className="text-2xl font-bold text-white mt-8 text-center"
          >
            Camera Access Required
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(300).springify()}
            className="text-base text-slate-400 mt-4 text-center leading-6"
          >
            We need camera access to scan product barcodes and read ingredient lists
          </Animated.Text>

          <Animated.View entering={FadeInUp.delay(400).springify()} className="mt-8 w-full">
            <Pressable
              onPress={requestPermission}
              className="overflow-hidden rounded-2xl"
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 18, alignItems: 'center' }}
              >
                <Text className="text-white font-semibold text-lg">Enable Camera</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={scanMode === 'barcode' ? {
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'qr'],
        } : undefined}
        onBarcodeScanned={scanMode === 'barcode' ? handleBarcodeScanned : undefined}
      >
        {/* Gradient overlay at top */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150 }}
          pointerEvents="none"
        />

        {/* Gradient overlay at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}
          pointerEvents="none"
        />

        {/* Header */}
        <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0" pointerEvents="box-none">
          <View className="flex-row items-center justify-between px-5 py-4" pointerEvents="box-none">
            <Pressable
              onPress={() => router.back()}
              className="w-12 h-12 rounded-full overflow-hidden"
            >
              <BlurView intensity={40} tint="dark" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <X size={24} color="#FFFFFF" />
              </BlurView>
            </Pressable>

            {/* Profile Switcher - only show if profiles exist */}
            <ProfileSwitcher compact onProfileChange={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }} />

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTorch(!torch);
              }}
              className="w-12 h-12 rounded-full overflow-hidden"
            >
              <BlurView intensity={40} tint="dark" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                {torch ? (
                  <Zap size={24} color="#FFD60A" />
                ) : (
                  <ZapOff size={24} color="#FFFFFF" />
                )}
              </BlurView>
            </Pressable>
          </View>
        </SafeAreaView>

        {/* Mode Toggle */}
        <View className="absolute top-28 left-0 right-0 items-center">
          <View className="overflow-hidden rounded-full">
            <BlurView intensity={60} tint="dark" style={{ flexDirection: 'row', padding: 4 }}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setScanMode('barcode');
                  resetScanner();
                }}
                className="overflow-hidden rounded-full"
              >
                {scanMode === 'barcode' ? (
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <ScanLine size={16} color="#FFFFFF" />
                    <Text className="text-white font-semibold ml-2">Barcode</Text>
                  </LinearGradient>
                ) : (
                  <View className="px-5 py-2.5 flex-row items-center">
                    <ScanLine size={16} color="rgba(255,255,255,0.6)" />
                    <Text className="text-white/60 ml-2">Barcode</Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setScanMode('photo');
                  resetScanner();
                }}
                className="overflow-hidden rounded-full"
              >
                {scanMode === 'photo' ? (
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Camera size={16} color="#FFFFFF" />
                    <Text className="text-white font-semibold ml-2">Ingredients</Text>
                  </LinearGradient>
                ) : (
                  <View className="px-5 py-2.5 flex-row items-center">
                    <Camera size={16} color="rgba(255,255,255,0.6)" />
                    <Text className="text-white/60 ml-2">Ingredients</Text>
                  </View>
                )}
              </Pressable>
            </BlurView>
          </View>

          {scanMode === 'photo' && (
            <Animated.Text
              entering={FadeIn}
              className="text-white/50 text-xs mt-3 text-center px-8"
            >
              Position the ingredient list within the frame
            </Animated.Text>
          )}
        </View>

        {/* Scan Frame */}
        <View className="flex-1 items-center justify-center">
          {scanMode === 'barcode' ? (
            <View className="w-72 h-44 relative">
              <AnimatedCorner position="tl" isScanning={isScanning && !isLoading} />
              <AnimatedCorner position="tr" isScanning={isScanning && !isLoading} />
              <AnimatedCorner position="bl" isScanning={isScanning && !isLoading} />
              <AnimatedCorner position="br" isScanning={isScanning && !isLoading} />
              <ScanningLine isActive={isScanning && !isLoading} />
            </View>
          ) : (
            <View className="w-72 h-96 relative">
              <AnimatedCorner position="tl" isScanning={!isLoading} />
              <AnimatedCorner position="tr" isScanning={!isLoading} />
              <AnimatedCorner position="bl" isScanning={!isLoading} />
              <AnimatedCorner position="br" isScanning={!isLoading} />
            </View>
          )}

          <View className="mt-8 items-center">
            {isLoading ? (
              <Animated.View entering={FadeIn} className="items-center">
                <View className="flex-row items-center bg-black/40 rounded-full px-5 py-3">
                  <ActivityIndicator size="small" color={COLORS.brandGreen} />
                  <Text className="text-white font-medium ml-3">{loadingMessage}</Text>
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn} className="items-center">
                <View className="flex-row items-center">
                  <Sparkles size={16} color={COLORS.brandGreen} />
                  <Text className="text-white text-base font-medium ml-2">
                    {scanMode === 'barcode' ? 'Point camera at barcode' : 'Capture ingredient list'}
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Error state */}
        {error && (
          <Animated.View
            entering={FadeInUp.springify()}
            exiting={FadeOut}
            className="absolute bottom-52 left-4 right-4"
          >
            <BlurView intensity={80} tint="light" style={{ borderRadius: 20, overflow: 'hidden' }}>
              <View className="p-5">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center">
                    <AlertCircle size={20} color={COLORS.alertRed} />
                  </View>
                  <Text className="text-slate-900 font-semibold text-lg ml-3">
                    {scanMode === 'barcode' ? 'Product Not Found' : 'Could Not Read'}
                  </Text>
                </View>
                <Text className="text-slate-600 leading-5">{error}</Text>
                <View className="flex-row mt-4">
                  <Pressable
                    onPress={resetScanner}
                    className="flex-1 bg-slate-200 rounded-xl py-3.5 mr-2"
                  >
                    <Text className="text-slate-900 font-semibold text-center">Try Again</Text>
                  </Pressable>
                  {scanMode === 'barcode' && (
                    <Pressable
                      onPress={toggleScanMode}
                      className="flex-1 overflow-hidden rounded-xl ml-2"
                    >
                      <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ paddingVertical: 14, alignItems: 'center' }}
                      >
                        <Text className="text-white font-semibold">Scan Ingredients</Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>
              </View>
            </BlurView>
          </Animated.View>
        )}

        {/* Bottom actions */}
        <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0">
          <View className="px-5 pb-4">
            {scanMode === 'photo' ? (
              <View className="items-center">
                <CaptureButton onPress={handleTakePhoto} disabled={isLoading} />
                <View className="flex-row mt-5">
                  <Pressable
                    onPress={handlePickImage}
                    disabled={isLoading}
                    className="overflow-hidden rounded-full"
                  >
                    <BlurView intensity={40} tint="dark" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
                      <ImageIcon size={18} color="#FFFFFF" />
                      <Text className="text-white font-medium ml-2">Choose from Gallery</Text>
                    </BlurView>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowManualEntry(true);
                }}
                className="overflow-hidden rounded-2xl"
              >
                <BlurView intensity={40} tint="dark" style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Keyboard size={20} color="#FFFFFF" />
                  <Text className="text-white font-medium ml-2">Enter Barcode Manually</Text>
                </BlurView>
              </Pressable>
            )}
          </View>
        </SafeAreaView>

        {/* Success Overlay */}
        <SuccessOverlay visible={showSuccess} onComplete={() => setShowSuccess(false)} />
      </CameraView>

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntry}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowManualEntry(false)}
      >
        <View className="flex-1 bg-slate-50">
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200">
              <Text className="text-xl font-bold text-slate-900">Enter Barcode</Text>
              <Pressable
                onPress={() => setShowManualEntry(false)}
                className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <View className="px-5 pt-8">
              <View className="items-center mb-6">
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}
                >
                  <ScanLine size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>

              <Text className="text-slate-500 text-center mb-6">
                Type the barcode number from the product packaging
              </Text>

              <TextInput
                value={manualBarcode}
                onChangeText={setManualBarcode}
                placeholder="e.g. 0123456789012"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                autoFocus
                className="bg-white rounded-2xl px-5 py-4 text-lg text-slate-900 border-2 border-slate-200 text-center tracking-widest"
              />

              <Pressable
                onPress={handleManualSubmit}
                disabled={manualBarcode.trim().length === 0}
                className="overflow-hidden rounded-2xl mt-6"
              >
                <LinearGradient
                  colors={manualBarcode.trim().length > 0
                    ? [COLORS.gradientStart, COLORS.gradientEnd]
                    : ['#CBD5E1', '#CBD5E1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 18, alignItems: 'center' }}
                >
                  <Text className={cn(
                    'font-semibold text-lg',
                    manualBarcode.trim().length > 0 ? 'text-white' : 'text-slate-400'
                  )}>
                    Look Up Product
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* OCR Confirmation Modal */}
      <Modal
        visible={showOCRModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOCRModal(false)}
      >
        <View className="flex-1 bg-slate-50">
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200">
              <Text className="text-xl font-bold text-slate-900">Confirm Details</Text>
              <Pressable
                onPress={() => setShowOCRModal(false)}
                className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <ScrollView className="flex-1 px-5 pt-6">
              {capturedImage && (
                <View className="rounded-2xl overflow-hidden mb-6 shadow-sm">
                  <Image
                    source={{ uri: capturedImage }}
                    style={{ width: '100%', height: 150 }}
                    contentFit="cover"
                  />
                </View>
              )}

              <Text className="text-slate-500 text-sm mb-2 font-medium">PRODUCT NAME</Text>
              <TextInput
                value={ocrProductName}
                onChangeText={setOcrProductName}
                placeholder="Enter product name"
                placeholderTextColor={COLORS.textMuted}
                className="bg-white rounded-2xl px-5 py-4 text-lg text-slate-900 border-2 border-slate-200 mb-6"
              />

              <Text className="text-slate-500 text-sm mb-3 font-medium">CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} className="mb-6">
                {(['food', 'cosmetics', 'cleaning', 'petFood', 'other'] as ProductCategory[]).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setOcrCategory(cat);
                    }}
                    className="mr-2 overflow-hidden rounded-full"
                  >
                    {ocrCategory === cat ? (
                      <LinearGradient
                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ paddingHorizontal: 18, paddingVertical: 10 }}
                      >
                        <Text className="text-white font-medium">
                          {cat === 'petFood' ? 'Pet Food' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View className="bg-white border-2 border-slate-200 px-4 py-2.5 rounded-full">
                        <Text className="text-slate-600">
                          {cat === 'petFood' ? 'Pet Food' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>

              <Text className="text-slate-500 text-sm mb-2 font-medium">EXTRACTED INGREDIENTS</Text>
              <TextInput
                value={extractedIngredients}
                onChangeText={setExtractedIngredients}
                placeholder="Ingredients will appear here..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                className="bg-white rounded-2xl px-5 py-4 text-base text-slate-900 border-2 border-slate-200 min-h-[140px]"
              />

              <Text className="text-slate-400 text-sm mt-3 mb-8 text-center">
                You can edit the ingredients if they weren't read correctly
              </Text>
            </ScrollView>

            <View className="px-5 pb-6 border-t border-slate-200 pt-4">
              <Pressable
                onPress={handleConfirmOCR}
                disabled={!extractedIngredients.trim() || !ocrProductName.trim()}
                className="overflow-hidden rounded-2xl"
              >
                <LinearGradient
                  colors={extractedIngredients.trim() && ocrProductName.trim()
                    ? [COLORS.gradientStart, COLORS.gradientEnd]
                    : ['#CBD5E1', '#CBD5E1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Sparkles size={20} color="#FFFFFF" />
                  <Text className="text-white font-semibold text-lg ml-2">Analyze Ingredients</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
