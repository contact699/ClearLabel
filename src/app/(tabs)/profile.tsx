import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, Alert, Linking, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  User,
  ChevronRight,
  Plus,
  X,
  AlertCircle,
  Leaf,
  Beaker,
  TreePine,
  Heart,
  Trash2,
  Bell,
  Palette,
  Download,
  HelpCircle,
  Star,
  FileText,
  Shield,
  Crown,
  Sparkles,
  RotateCcw,
  Clock,
  Settings,
  Check,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useUserStore, useSubscriptionStore, useHistoryStore } from '@/lib/stores';
import { COLORS } from '@/lib/constants';
import { PREDEFINED_FLAGS } from '@/lib/types';
import { cn } from '@/lib/cn';
import type { FlagType, IngredientFlag, NotificationPreferences } from '@/lib/types';

const FLAG_SECTIONS: { type: FlagType; title: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  { type: 'allergen', title: 'Allergens', icon: <AlertCircle size={18} color={COLORS.alertRed} />, color: COLORS.alertRed, bgColor: COLORS.alertRedLight },
  { type: 'additive', title: 'Additives', icon: <Beaker size={18} color={COLORS.warningOrange} />, color: COLORS.warningOrange, bgColor: COLORS.warningOrangeLight },
  { type: 'dietary', title: 'Dietary', icon: <Leaf size={18} color={COLORS.safeGreen} />, color: COLORS.safeGreen, bgColor: COLORS.safeGreenLight },
  { type: 'environmental', title: 'Environmental', icon: <TreePine size={18} color={COLORS.brandGreen} />, color: COLORS.brandGreen, bgColor: COLORS.brandGreenLight },
];

function FlagToggle({
  flag,
  isActive,
  onToggle,
  accentColor,
}: {
  flag: { value: string; display: string };
  isActive: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onToggle();
      }}
      className={cn(
        'flex-row items-center justify-between py-3.5 px-4 rounded-xl mb-2 border',
        isActive ? 'border-transparent' : 'border-slate-100 bg-slate-50'
      )}
      style={isActive ? { backgroundColor: `${accentColor}15` } : {}}
    >
      <Text
        className={cn(
          'text-base font-medium',
          isActive ? '' : 'text-slate-700'
        )}
        style={isActive ? { color: accentColor } : {}}
      >
        {flag.display}
      </Text>
      <View
        className={cn(
          'w-6 h-6 rounded-full items-center justify-center',
          isActive ? '' : 'bg-slate-200'
        )}
        style={isActive ? { backgroundColor: accentColor } : {}}
      >
        {isActive && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const tier = useSubscriptionStore((s) => s.tier);
  const scansThisMonth = useSubscriptionStore((s) => s.scansThisMonth);
  const isPro = tier === 'pro';
  const FREE_SCAN_LIMIT = 10;
  const remainingScans = Math.max(0, FREE_SCAN_LIMIT - scansThisMonth);

  const [showNameModal, setShowNameModal] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [showCustomFlagModal, setShowCustomFlagModal] = useState(false);
  const [customFlagName, setCustomFlagName] = useState('');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<FlagType | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    enabled: false,
    dailyReminder: false,
    dailyReminderTime: '09:00',
    weeklyDigest: false,
  });

  useEffect(() => {
    if (!profile) {
      useUserStore.getState().initializeProfile();
    }
  }, [profile]);

  useEffect(() => {
    const prefs = useUserStore.getState().getNotificationPreferences();
    setNotificationPrefs(prefs);
  }, []);

  const isFlagActive = (type: FlagType, value: string) => {
    if (!profile?.flags) return false;
    return profile.flags.some(
      (f: IngredientFlag) => f.type === type && f.value === value
    );
  };

  const getActiveFlagCount = (type: FlagType) => {
    if (!profile?.flags) return 0;
    return profile.flags.filter((f: IngredientFlag) => f.type === type).length;
  };

  const toggleFlag = (type: FlagType, value: string, displayName: string) => {
    if (!profile) {
      useUserStore.getState().initializeProfile();
    }

    const currentProfile = useUserStore.getState().profile;
    const existingFlag = currentProfile?.flags.find(
      (f: IngredientFlag) => f.type === type && f.value === value
    );

    if (existingFlag) {
      useUserStore.getState().removeFlag(existingFlag.id);
    } else {
      useUserStore.getState().addFlag(type, value, displayName);
    }
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      if (!useUserStore.getState().profile) {
        useUserStore.getState().initializeProfile(editName.trim());
      } else {
        useUserStore.getState().updateProfileName(editName.trim());
      }
      setShowNameModal(false);
    }
  };

  const handleAddCustomFlag = () => {
    if (customFlagName.trim()) {
      if (!useUserStore.getState().profile) {
        useUserStore.getState().initializeProfile();
      }
      const value = customFlagName.trim().toLowerCase().replace(/\s+/g, '_');
      useUserStore.getState().addFlag('custom', value, customFlagName.trim());
      setCustomFlagName('');
      setShowCustomFlagModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Delete all scanned products? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            useHistoryStore.getState().clearHistory();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleNotifications = async () => {
    const prefs = useUserStore.getState().getNotificationPreferences();
    setNotificationPrefs(prefs);
    setShowNotificationModal(true);
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Enable notifications in Settings to receive reminders.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    return true;
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) return;
    }

    setNotificationPrefs((prev) => ({ ...prev, enabled }));
    useUserStore.getState().updateNotificationPreferences({ enabled });
    Haptics.selectionAsync();

    if (!enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const handleToggleDailyReminder = async (dailyReminder: boolean) => {
    if (dailyReminder && !notificationPrefs.enabled) {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) return;
      setNotificationPrefs((prev) => ({ ...prev, enabled: true }));
      useUserStore.getState().updateNotificationPreferences({ enabled: true });
    }

    setNotificationPrefs((prev) => ({ ...prev, dailyReminder }));
    useUserStore.getState().updateNotificationPreferences({ dailyReminder });
    Haptics.selectionAsync();

    if (dailyReminder) {
      await scheduleDailyReminder(notificationPrefs.dailyReminderTime);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const scheduleDailyReminder = async (time: string) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const [hours, minutes] = time.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to scan!',
        body: 'Check what\'s in your products today',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });
  };

  const handleTimeChange = (time: string) => {
    setNotificationPrefs((prev) => ({ ...prev, dailyReminderTime: time }));
    useUserStore.getState().updateNotificationPreferences({ dailyReminderTime: time });

    if (notificationPrefs.dailyReminder) {
      scheduleDailyReminder(time);
    }
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'This will delete all data and restart onboarding. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            useUserStore.getState().reset();
            useHistoryStore.getState().clearHistory();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const customFlags = profile?.flags.filter((f: IngredientFlag) => f.type === 'custom') || [];

  return (
    <View className="flex-1 bg-slate-50">
      <LinearGradient
        colors={['#F0FDFA', '#F8FAFC', '#FFFFFF']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(50).springify()} className="px-6 pt-4 pb-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-slate-900">Profile</Text>
              <View className="w-12 h-12 rounded-2xl bg-white items-center justify-center border border-slate-100">
                <Settings size={22} color={COLORS.brandGreen} />
              </View>
            </View>
          </Animated.View>

          {/* Profile Card */}
          <Animated.View entering={FadeInDown.delay(100).springify()} className="px-6 mt-4">
            <Pressable
              onPress={() => {
                setEditName(profile?.name || '');
                setShowNameModal(true);
              }}
              className="overflow-hidden rounded-3xl active:scale-[0.98]"
            >
              <LinearGradient
                colors={[COLORS.brandGreen, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20, borderRadius: 24 }}
              >
                <View className="flex-row items-center">
                  <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center">
                    <User size={32} color="#FFFFFF" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-white text-xl font-bold">
                      {profile?.name || 'User'}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      {isPro ? (
                        <View className="flex-row items-center bg-white/20 rounded-full px-3 py-1">
                          <Crown size={14} color="#FFFFFF" />
                          <Text className="text-white font-semibold ml-1 text-sm">Pro</Text>
                        </View>
                      ) : (
                        <Text className="text-white/80 text-sm">Free Plan</Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={24} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Upgrade Banner */}
          {!isPro && (
            <Animated.View entering={FadeInDown.delay(120).springify()} className="px-6 mt-4">
              <Pressable
                onPress={() => router.push('/paywall')}
                className="bg-white rounded-2xl p-4 flex-row items-center border border-slate-100 active:scale-[0.98]"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 }}
              >
                <LinearGradient
                  colors={['#FFF7ED', '#FFEDD5']}
                  style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Crown size={24} color={COLORS.warningOrange} />
                </LinearGradient>
                <View className="ml-4 flex-1">
                  <Text className="text-slate-900 font-bold text-base">Upgrade to Pro</Text>
                  <Text className="text-slate-500 text-sm mt-0.5">
                    {remainingScans} of {FREE_SCAN_LIMIT} scans left
                  </Text>
                </View>
                <Sparkles size={20} color={COLORS.warningOrange} />
              </Pressable>
            </Animated.View>
          )}

          {/* My Flags Section */}
          <View className="px-6 mt-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900">My Flags</Text>
              <Pressable
                onPress={() => setShowCustomFlagModal(true)}
                className="flex-row items-center bg-teal-50 rounded-xl px-3 py-2"
              >
                <Plus size={16} color={COLORS.brandGreen} />
                <Text className="text-teal-600 font-semibold ml-1 text-sm">Custom</Text>
              </Pressable>
            </View>

            {FLAG_SECTIONS.map((section, sectionIndex) => {
              const predefinedList =
                section.type === 'allergen'
                  ? PREDEFINED_FLAGS.allergens
                  : section.type === 'additive'
                    ? PREDEFINED_FLAGS.additives
                    : section.type === 'dietary'
                      ? PREDEFINED_FLAGS.dietary
                      : PREDEFINED_FLAGS.environmental;

              const activeCount = getActiveFlagCount(section.type);
              const isExpanded = expandedSection === section.type;

              return (
                <Animated.View
                  key={section.type}
                  entering={FadeInDown.delay(150 + sectionIndex * 30).springify()}
                  className="mb-3"
                >
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setExpandedSection(isExpanded ? null : section.type);
                    }}
                    className="bg-white rounded-2xl p-4 border border-slate-100 active:scale-[0.99]"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={{ backgroundColor: section.bgColor }}
                      >
                        {section.icon}
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className="text-base font-semibold text-slate-900">{section.title}</Text>
                        <Text className="text-sm text-slate-500 mt-0.5">
                          {activeCount} selected
                        </Text>
                      </View>
                      <ChevronRight
                        size={20}
                        color={COLORS.textMuted}
                        style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                      />
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      className="bg-white rounded-2xl p-3 mt-2 border border-slate-100"
                    >
                      {predefinedList.map((flag) => (
                        <FlagToggle
                          key={flag.value}
                          flag={flag}
                          isActive={isFlagActive(section.type, flag.value)}
                          onToggle={() => toggleFlag(section.type, flag.value, flag.display)}
                          accentColor={section.color}
                        />
                      ))}
                    </Animated.View>
                  )}
                </Animated.View>
              );
            })}

            {/* Custom Flags */}
            {customFlags.length > 0 && (
              <Animated.View entering={FadeInDown.delay(300).springify()} className="mb-3">
                <View className="bg-white rounded-2xl p-4 border border-slate-100">
                  <View className="flex-row items-center mb-3">
                    <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center">
                      <Heart size={18} color="#8B5CF6" />
                    </View>
                    <Text className="text-base font-semibold text-slate-900 ml-3">Custom Flags</Text>
                  </View>
                  {customFlags.map((flag: IngredientFlag) => (
                    <View
                      key={flag.id}
                      className="flex-row items-center justify-between py-3 px-4 rounded-xl mb-2 bg-purple-50"
                    >
                      <Text className="text-purple-700 font-medium">{flag.displayName}</Text>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          useUserStore.getState().removeFlag(flag.id);
                        }}
                        hitSlop={8}
                      >
                        <Trash2 size={18} color={COLORS.alertRed} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}
          </View>

          {/* Settings Section */}
          <View className="px-6 mt-6">
            <Text className="text-lg font-bold text-slate-900 mb-4">Settings</Text>
            <View className="bg-white rounded-2xl overflow-hidden border border-slate-100">
              <SettingsRow icon={<Bell size={20} color={COLORS.brandGreen} />} label="Notifications" onPress={handleNotifications} />
              <SettingsRow icon={<Download size={20} color={COLORS.brandGreen} />} label="Export Data" onPress={() => Alert.alert('Coming Soon', 'Data export will be available soon.')} />
              <SettingsRow icon={<Trash2 size={20} color={COLORS.alertRed} />} label="Clear History" isDestructive onPress={handleClearHistory} isLast={false} />
              <SettingsRow icon={<RotateCcw size={20} color={COLORS.alertRed} />} label="Reset App" isDestructive onPress={handleResetApp} isLast />
            </View>

            <Text className="text-lg font-bold text-slate-900 mb-4 mt-6">About</Text>
            <View className="bg-white rounded-2xl overflow-hidden border border-slate-100">
              <SettingsRow icon={<HelpCircle size={20} color={COLORS.brandGreen} />} label="Help & Support" onPress={() => Linking.openURL('mailto:support@ingredientdecoder.app')} />
              <SettingsRow icon={<Shield size={20} color={COLORS.brandGreen} />} label="Privacy Policy" onPress={() => Linking.openURL('https://openfoodfacts.org/privacy')} />
              <SettingsRow icon={<FileText size={20} color={COLORS.brandGreen} />} label="Terms of Service" onPress={() => Linking.openURL('https://openfoodfacts.org/terms-of-use')} isLast />
            </View>

            <Text className="text-center text-slate-400 text-sm mt-8">
              Version 1.0.0
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Edit Name Modal */}
      <Modal visible={showNameModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNameModal(false)}>
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-200">
            <Text className="text-lg font-bold text-slate-900">Edit Name</Text>
            <Pressable onPress={() => setShowNameModal(false)} className="p-2 bg-slate-100 rounded-full">
              <X size={20} color={COLORS.textSecondary} />
            </Pressable>
          </View>
          <View className="px-6 pt-6">
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              className="bg-white rounded-2xl px-4 py-4 text-lg text-slate-900 border border-slate-200"
            />
            <Pressable
              onPress={handleSaveName}
              disabled={!editName.trim()}
              className="mt-4 overflow-hidden rounded-2xl"
            >
              <LinearGradient
                colors={editName.trim() ? [COLORS.brandGreen, COLORS.gradientEnd] : ['#E2E8F0', '#E2E8F0']}
                style={{ padding: 16, borderRadius: 16, alignItems: 'center' }}
              >
                <Text className={editName.trim() ? 'text-white font-semibold text-lg' : 'text-slate-400 font-semibold text-lg'}>
                  Save
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Custom Flag Modal */}
      <Modal visible={showCustomFlagModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCustomFlagModal(false)}>
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-200">
            <Text className="text-lg font-bold text-slate-900">Add Custom Flag</Text>
            <Pressable onPress={() => setShowCustomFlagModal(false)} className="p-2 bg-slate-100 rounded-full">
              <X size={20} color={COLORS.textSecondary} />
            </Pressable>
          </View>
          <View className="px-6 pt-6">
            <Text className="text-slate-500 mb-3">Enter an ingredient to flag</Text>
            <TextInput
              value={customFlagName}
              onChangeText={setCustomFlagName}
              placeholder="e.g. High Fructose Corn Syrup"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              className="bg-white rounded-2xl px-4 py-4 text-lg text-slate-900 border border-slate-200"
            />
            <Pressable
              onPress={handleAddCustomFlag}
              disabled={!customFlagName.trim()}
              className="mt-4 overflow-hidden rounded-2xl"
            >
              <LinearGradient
                colors={customFlagName.trim() ? [COLORS.brandGreen, COLORS.gradientEnd] : ['#E2E8F0', '#E2E8F0']}
                style={{ padding: 16, borderRadius: 16, alignItems: 'center' }}
              >
                <Text className={customFlagName.trim() ? 'text-white font-semibold text-lg' : 'text-slate-400 font-semibold text-lg'}>
                  Add Flag
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal visible={showNotificationModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNotificationModal(false)}>
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-200">
            <Text className="text-lg font-bold text-slate-900">Notifications</Text>
            <Pressable onPress={() => setShowNotificationModal(false)} className="p-2 bg-slate-100 rounded-full">
              <X size={20} color={COLORS.textSecondary} />
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-6 pt-6">
            <View className="bg-white rounded-2xl p-4 mb-4 border border-slate-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-xl bg-teal-50 items-center justify-center">
                    <Bell size={22} color={COLORS.brandGreen} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-slate-900">Enable Notifications</Text>
                    <Text className="text-sm text-slate-500 mt-0.5">Get reminders to scan</Text>
                  </View>
                </View>
                <Switch
                  value={notificationPrefs.enabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: COLORS.divider, true: COLORS.brandGreen }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View className="bg-white rounded-2xl p-4 mb-4 border border-slate-100">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center">
                    <Clock size={22} color="#3B82F6" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-slate-900">Daily Reminder</Text>
                    <Text className="text-sm text-slate-500 mt-0.5">Remind me to scan</Text>
                  </View>
                </View>
                <Switch
                  value={notificationPrefs.dailyReminder}
                  onValueChange={handleToggleDailyReminder}
                  trackColor={{ false: COLORS.divider, true: COLORS.brandGreen }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {notificationPrefs.dailyReminder && (
                <View className="pt-4 border-t border-slate-100">
                  <Text className="text-sm text-slate-500 mb-3">Reminder Time</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {['08:00', '09:00', '12:00', '18:00', '20:00'].map((time) => (
                      <Pressable
                        key={time}
                        onPress={() => handleTimeChange(time)}
                        className={cn(
                          'px-4 py-2 rounded-xl',
                          notificationPrefs.dailyReminderTime === time ? 'bg-teal-600' : 'bg-slate-100'
                        )}
                      >
                        <Text className={notificationPrefs.dailyReminderTime === time ? 'text-white font-semibold' : 'text-slate-700'}>
                          {time.replace(':00', '')}:00 {parseInt(time) < 12 ? 'AM' : 'PM'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  isDestructive = false,
  onPress,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  isDestructive?: boolean;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      className={cn(
        'flex-row items-center px-4 py-4 active:bg-slate-50',
        !isLast && 'border-b border-slate-100'
      )}
    >
      {icon}
      <Text className={cn('flex-1 ml-3 text-base font-medium', isDestructive ? 'text-red-500' : 'text-slate-900')}>
        {label}
      </Text>
      <ChevronRight size={20} color={COLORS.textMuted} />
    </Pressable>
  );
}
