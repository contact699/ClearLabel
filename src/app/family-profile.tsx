import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  AlertCircle,
  Leaf,
  Beaker,
  TreePine,
  Heart,
  Trash2,
  Plus,
  X,
  Check,
  Share2,
  Copy,
  Users,
  Link,
  UserPlus,
  ChevronRight,
  Edit3,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useFamilyProfilesStore, PROFILE_EMOJIS, RELATIONSHIP_EMOJIS } from '@/lib/stores';
import { COLORS } from '@/lib/constants';
import { PREDEFINED_FLAGS, PROFILE_COLORS, RELATIONSHIP_LABELS } from '@/lib/types';
import { cn } from '@/lib/cn';
import type { FlagType, IngredientFlag, ProfileColorId, ProfileRelationship, FamilyProfile } from '@/lib/types';

const FLAG_SECTIONS: { type: FlagType; title: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  { type: 'allergen', title: 'Allergens', icon: <AlertCircle size={18} color={COLORS.alertRed} />, color: COLORS.alertRed, bgColor: COLORS.alertRedLight },
  { type: 'additive', title: 'Additives', icon: <Beaker size={18} color={COLORS.warningOrange} />, color: COLORS.warningOrange, bgColor: COLORS.warningOrangeLight },
  { type: 'dietary', title: 'Dietary', icon: <Leaf size={18} color={COLORS.safeGreen} />, color: COLORS.safeGreen, bgColor: COLORS.safeGreenLight },
  { type: 'environmental', title: 'Environmental', icon: <TreePine size={18} color={COLORS.brandGreen} />, color: COLORS.brandGreen, bgColor: COLORS.brandGreenLight },
];

const RELATIONSHIPS: ProfileRelationship[] = ['self', 'spouse', 'partner', 'child', 'parent', 'sibling', 'other'];

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

export default function FamilyProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ profileId: string }>();
  const profileId = params.profileId;

  const profile = useFamilyProfilesStore((s) => s.getProfileById(profileId || ''));
  const getProfileColor = useFamilyProfilesStore((s) => s.getProfileColor);
  
  const [expandedSection, setExpandedSection] = useState<FlagType | null>(null);
  const [showCustomFlagModal, setShowCustomFlagModal] = useState(false);
  const [customFlagName, setCustomFlagName] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColorId, setEditColorId] = useState<ProfileColorId>('blue');
  const [editEmoji, setEditEmoji] = useState<string | undefined>(undefined);
  const [editRelationship, setEditRelationship] = useState<ProfileRelationship | undefined>(undefined);

  useEffect(() => {
    // Initialize device ID on mount
    useFamilyProfilesStore.getState().initializeDeviceId();
  }, []);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name);
      setEditColorId(profile.colorId);
      setEditEmoji(profile.emoji);
      setEditRelationship(profile.relationship);
    }
  }, [profile]);

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Profile not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-teal-600 font-semibold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const colors = getProfileColor(profile.id);
  const customFlags = profile.flags.filter((f: IngredientFlag) => f.type === 'custom');

  const isFlagActive = (type: FlagType, value: string) => {
    return profile.flags.some(
      (f: IngredientFlag) => f.type === type && f.value === value
    );
  };

  const getActiveFlagCount = (type: FlagType) => {
    return profile.flags.filter((f: IngredientFlag) => f.type === type).length;
  };

  const toggleFlag = (type: FlagType, value: string, displayName: string) => {
    const existingFlag = profile.flags.find(
      (f: IngredientFlag) => f.type === type && f.value === value
    );

    if (existingFlag) {
      useFamilyProfilesStore.getState().removeFlagFromProfile(profile.id, existingFlag.id);
    } else {
      useFamilyProfilesStore.getState().addFlagToProfile(profile.id, type, value, displayName);
    }
    Haptics.selectionAsync();
  };

  const handleAddCustomFlag = () => {
    if (customFlagName.trim()) {
      useFamilyProfilesStore.getState().addCustomFlagToProfile(profile.id, customFlagName.trim());
      setCustomFlagName('');
      setShowCustomFlagModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleGenerateShareCode = () => {
    const code = useFamilyProfilesStore.getState().generateShareCodeForProfile(profile.id);
    if (code) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCopyShareCode = async () => {
    if (profile.shareCode) {
      await Clipboard.setStringAsync(profile.shareCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Share code copied to clipboard');
    }
  };

  const handleShareCode = async () => {
    if (profile.shareCode) {
      try {
        await Share.share({
          message: `Join my family profile "${profile.name}" on ClearLabel! Use code: ${profile.shareCode}`,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const handleSaveProfile = () => {
    if (editName.trim()) {
      useFamilyProfilesStore.getState().updateProfile(profile.id, {
        name: editName.trim(),
        colorId: editColorId,
        emoji: editEmoji,
        relationship: editRelationship,
      });
      setShowEditModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      'Delete Profile',
      `Delete "${profile.name}"? All their dietary preferences will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            useFamilyProfilesStore.getState().deleteProfile(profile.id);
            router.back();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <LinearGradient
        colors={[colors.lightColor, '#F8FAFC', '#FFFFFF']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
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
            <Text className="text-lg font-bold text-slate-900">Family Profile</Text>
            <Pressable
              onPress={() => setShowEditModal(true)}
              className="w-10 h-10 rounded-full bg-white/80 items-center justify-center"
            >
              <Edit3 size={18} color={COLORS.brandGreen} />
            </Pressable>
          </View>
        </Animated.View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Profile Header Card */}
          <Animated.View entering={FadeInDown.delay(100).springify()} className="px-6 mt-4">
            <View
              className="rounded-3xl p-6 items-center"
              style={{ backgroundColor: colors.lightColor, borderWidth: 2, borderColor: colors.color }}
            >
              {profile.emoji ? (
                <Text className="text-5xl mb-3">{profile.emoji}</Text>
              ) : (
                <View
                  className="w-20 h-20 rounded-full mb-3 items-center justify-center"
                  style={{ backgroundColor: colors.color }}
                >
                  <Text className="text-white text-3xl font-bold">
                    {profile.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text className="text-2xl font-bold text-slate-900">{profile.name}</Text>
              {profile.relationship && (
                <View
                  className="flex-row items-center mt-2 px-3 py-1 rounded-full"
                  style={{ backgroundColor: `${colors.color}20` }}
                >
                  <Text className="text-sm" style={{ color: colors.color }}>
                    {RELATIONSHIP_LABELS[profile.relationship]}
                  </Text>
                </View>
              )}
              <Text className="text-slate-500 text-sm mt-2">
                {profile.flags.length} dietary {profile.flags.length === 1 ? 'flag' : 'flags'}
              </Text>
            </View>
          </Animated.View>

          {/* Share Section */}
          <Animated.View entering={FadeInDown.delay(120).springify()} className="px-6 mt-6">
            <View className="flex-row items-center mb-3">
              <Users size={18} color={COLORS.brandGreen} />
              <Text className="text-base font-semibold text-slate-900 ml-2">Family Sharing</Text>
            </View>
            <View className="bg-white rounded-2xl p-4 border border-slate-100">
              {profile.shareCode ? (
                <>
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-slate-500 text-sm">Share Code</Text>
                    <View className="flex-row">
                      <Pressable
                        onPress={handleCopyShareCode}
                        className="p-2 rounded-lg bg-slate-100 mr-2"
                      >
                        <Copy size={16} color={COLORS.textSecondary} />
                      </Pressable>
                      <Pressable
                        onPress={handleShareCode}
                        className="p-2 rounded-lg bg-teal-50"
                      >
                        <Share2 size={16} color={COLORS.brandGreen} />
                      </Pressable>
                    </View>
                  </View>
                  <View className="bg-slate-50 rounded-xl p-4 items-center">
                    <Text className="text-2xl font-bold tracking-[8px] text-slate-900">
                      {profile.shareCode}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-400 text-center mt-3">
                    Share this code with family members so they can see this profile's flags
                  </Text>
                  
                  {/* Shared Members */}
                  {profile.sharedWith.length > 0 && (
                    <View className="mt-4 pt-4 border-t border-slate-100">
                      <Text className="text-sm font-medium text-slate-700 mb-2">
                        Shared with ({profile.sharedWith.length})
                      </Text>
                      {profile.sharedWith.map((member) => (
                        <View
                          key={member.id}
                          className="flex-row items-center justify-between py-2"
                        >
                          <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                              <Text className="text-sm font-semibold text-slate-600">
                                {member.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <Text className="text-slate-700 ml-2">{member.name}</Text>
                          </View>
                          <Pressable
                            onPress={() => {
                              Alert.alert(
                                'Remove Member',
                                `Remove ${member.name} from this shared profile?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Remove',
                                    style: 'destructive',
                                    onPress: () => {
                                      useFamilyProfilesStore.getState().removeSharedMember(profile.id, member.id);
                                    },
                                  },
                                ]
                              );
                            }}
                            className="p-1"
                          >
                            <X size={16} color={COLORS.alertRed} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <Pressable
                  onPress={handleGenerateShareCode}
                  className="flex-row items-center justify-center py-4"
                >
                  <Link size={18} color={COLORS.brandGreen} />
                  <Text className="text-teal-600 font-semibold ml-2">
                    Generate Share Code
                  </Text>
                </Pressable>
              )}
            </View>
          </Animated.View>

          {/* Flags Section */}
          <View className="px-6 mt-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900">
                {profile.name}'s Flags
              </Text>
              <Pressable
                onPress={() => setShowCustomFlagModal(true)}
                className="flex-row items-center bg-teal-50 rounded-xl px-3 py-2"
              >
                <Plus size={16} color={COLORS.brandGreen} />
                <Text className="text-teal-600 font-semibold ml-1 text-sm">Custom</Text>
              </Pressable>
            </View>

            <Text className="text-sm text-slate-500 mb-4">
              Select ingredients that {profile.name} needs to avoid
            </Text>

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
                          useFamilyProfilesStore.getState().removeFlagFromProfile(profile.id, flag.id);
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

          {/* Delete Button */}
          <View className="px-6 mt-8">
            <Pressable
              onPress={handleDeleteProfile}
              className="flex-row items-center justify-center py-4 bg-red-50 rounded-2xl"
            >
              <Trash2 size={18} color={COLORS.alertRed} />
              <Text className="text-red-500 font-semibold ml-2">Delete Profile</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Custom Flag Modal */}
      {showCustomFlagModal && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900">Add Custom Flag</Text>
              <Pressable onPress={() => setShowCustomFlagModal(false)} className="p-2">
                <X size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            <Text className="text-slate-500 mb-3">
              Enter an ingredient for {profile.name} to avoid
            </Text>
            <TextInput
              value={customFlagName}
              onChangeText={setCustomFlagName}
              placeholder="e.g. High Fructose Corn Syrup"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              className="bg-slate-50 rounded-xl px-4 py-4 text-base text-slate-900 border border-slate-200 mb-4"
            />
            <Pressable
              onPress={handleAddCustomFlag}
              disabled={!customFlagName.trim()}
              className="overflow-hidden rounded-xl"
            >
              <LinearGradient
                colors={customFlagName.trim() ? [COLORS.brandGreen, COLORS.gradientEnd] : ['#E2E8F0', '#E2E8F0']}
                style={{ padding: 14, borderRadius: 12, alignItems: 'center' }}
              >
                <Text className={customFlagName.trim() ? 'text-white font-semibold' : 'text-slate-400 font-semibold'}>
                  Add Flag
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-h-[80%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-slate-900">Edit Profile</Text>
              <Pressable onPress={() => setShowEditModal(false)} className="p-2">
                <X size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name Input */}
              <Text className="text-sm font-medium text-slate-700 mb-2">Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Kids, Spouse, Me"
                placeholderTextColor={COLORS.textMuted}
                className="bg-slate-50 rounded-xl px-4 py-4 text-base text-slate-900 border border-slate-200 mb-4"
              />

              {/* Relationship Picker */}
              <Text className="text-sm font-medium text-slate-700 mb-2">Relationship</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {RELATIONSHIPS.map((rel) => (
                  <Pressable
                    key={rel}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEditRelationship(rel);
                    }}
                    className={cn(
                      'px-4 py-2 rounded-xl mr-2',
                      editRelationship === rel ? 'bg-teal-100 border-2 border-teal-500' : 'bg-slate-100'
                    )}
                  >
                    <Text className={editRelationship === rel ? 'text-teal-700 font-semibold' : 'text-slate-600'}>
                      {RELATIONSHIP_LABELS[rel]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Emoji Picker */}
              <Text className="text-sm font-medium text-slate-700 mb-2">Avatar (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <Pressable
                  onPress={() => setEditEmoji(undefined)}
                  className={cn(
                    'w-12 h-12 rounded-xl items-center justify-center mr-2',
                    !editEmoji ? 'bg-teal-100 border-2 border-teal-500' : 'bg-slate-100'
                  )}
                >
                  <Text className="text-lg">🅰️</Text>
                </Pressable>
                {PROFILE_EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEditEmoji(emoji);
                    }}
                    className={cn(
                      'w-12 h-12 rounded-xl items-center justify-center mr-2',
                      editEmoji === emoji ? 'bg-teal-100 border-2 border-teal-500' : 'bg-slate-100'
                    )}
                  >
                    <Text className="text-2xl">{emoji}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Color Picker */}
              <Text className="text-sm font-medium text-slate-700 mb-2">Color</Text>
              <View className="flex-row flex-wrap mb-4">
                {PROFILE_COLORS.map((colorOption) => (
                  <Pressable
                    key={colorOption.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setEditColorId(colorOption.id);
                    }}
                    className="mr-3 mb-3"
                  >
                    <View
                      className={cn(
                        'w-10 h-10 rounded-full items-center justify-center',
                        editColorId === colorOption.id ? 'border-2' : ''
                      )}
                      style={{
                        backgroundColor: colorOption.color,
                        borderColor: editColorId === colorOption.id ? '#1E293B' : 'transparent',
                      }}
                    >
                      {editColorId === colorOption.id && (
                        <Check size={16} color="#FFFFFF" strokeWidth={3} />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Pressable
              onPress={handleSaveProfile}
              disabled={!editName.trim()}
              className="overflow-hidden rounded-xl mt-4"
            >
              <LinearGradient
                colors={editName.trim() ? [COLORS.brandGreen, COLORS.gradientEnd] : ['#E2E8F0', '#E2E8F0']}
                style={{ padding: 14, borderRadius: 12, alignItems: 'center' }}
              >
                <Text className={editName.trim() ? 'text-white font-semibold' : 'text-slate-400 font-semibold'}>
                  Save Changes
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
