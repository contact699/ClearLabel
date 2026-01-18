// ProfileSwitcher - Quick profile switching component for scan screen
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Users, Check, ChevronDown, X } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useFamilyProfilesStore } from '@/lib/stores';
import { PROFILE_COLORS } from '@/lib/types';
import type { FamilyProfile } from '@/lib/types';

interface ProfileSwitcherProps {
  compact?: boolean; // Compact mode for scan screen header
  onProfileChange?: (profile: FamilyProfile) => void;
}

export function ProfileSwitcher({ compact = false, onProfileChange }: ProfileSwitcherProps) {
  const [showModal, setShowModal] = useState(false);
  
  const profiles = useFamilyProfilesStore((s) => s.profiles);
  const activeProfileId = useFamilyProfilesStore((s) => s.activeProfileId);
  const setActiveProfile = useFamilyProfilesStore((s) => s.setActiveProfile);
  const getProfileColor = useFamilyProfilesStore((s) => s.getProfileColor);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  // Don't render if no profiles exist
  if (profiles.length === 0) {
    return null;
  }

  const handleProfileSelect = (profile: FamilyProfile) => {
    Haptics.selectionAsync();
    setActiveProfile(profile.id);
    setShowModal(false);
    onProfileChange?.(profile);
  };

  const activeColors = activeProfile ? getProfileColor(activeProfile.id) : { color: '#3B82F6', lightColor: '#DBEAFE' };

  // Compact version for scan screen header
  if (compact) {
    return (
      <>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setShowModal(true);
          }}
          className="flex-row items-center px-3 py-1.5 rounded-full"
          style={{ backgroundColor: activeColors.lightColor }}
        >
          {activeProfile?.emoji ? (
            <Text className="text-base mr-1.5">{activeProfile.emoji}</Text>
          ) : (
            <View
              className="w-5 h-5 rounded-full mr-1.5 items-center justify-center"
              style={{ backgroundColor: activeColors.color }}
            >
              <Text className="text-white text-xs font-bold">
                {activeProfile?.name.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text
            className="text-sm font-medium mr-1"
            style={{ color: activeColors.color }}
          >
            {activeProfile?.name || 'Select Profile'}
          </Text>
          <ChevronDown size={14} color={activeColors.color} />
        </Pressable>

        <ProfileSelectionModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelect={handleProfileSelect}
          getProfileColor={getProfileColor}
        />
      </>
    );
  }

  // Full version for profile management
  return (
    <>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setShowModal(true);
        }}
        className="flex-row items-center justify-between p-4 bg-white rounded-2xl border border-slate-100"
      >
        <View className="flex-row items-center flex-1">
          {activeProfile?.emoji ? (
            <Text className="text-2xl mr-3">{activeProfile.emoji}</Text>
          ) : (
            <View
              className="w-10 h-10 rounded-full mr-3 items-center justify-center"
              style={{ backgroundColor: activeColors.color }}
            >
              <Text className="text-white text-lg font-bold">
                {activeProfile?.name.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-900">
              {activeProfile?.name || 'No Profile Selected'}
            </Text>
            <Text className="text-sm text-slate-500">
              {activeProfile ? `${activeProfile.flags.length} dietary preferences` : 'Tap to select'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <Users size={18} color="#64748B" />
          <ChevronDown size={18} color="#64748B" className="ml-1" />
        </View>
      </Pressable>

      <ProfileSelectionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelect={handleProfileSelect}
        getProfileColor={getProfileColor}
      />
    </>
  );
}

// Modal for selecting profiles
function ProfileSelectionModal({
  visible,
  onClose,
  profiles,
  activeProfileId,
  onSelect,
  getProfileColor,
}: {
  visible: boolean;
  onClose: () => void;
  profiles: FamilyProfile[];
  activeProfileId: string | null;
  onSelect: (profile: FamilyProfile) => void;
  getProfileColor: (id: string) => { color: string; lightColor: string };
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
        <Pressable
          className="flex-1 justify-end"
          onPress={onClose}
        >
          <Animated.View
            entering={SlideInDown.springify().damping(20)}
            className="bg-white rounded-t-3xl"
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Handle */}
              <View className="items-center pt-3 pb-2">
                <View className="w-10 h-1 bg-slate-300 rounded-full" />
              </View>

              {/* Header */}
              <View className="flex-row items-center justify-between px-5 pb-4">
                <Text className="text-xl font-bold text-slate-900">
                  Switch Profile
                </Text>
                <Pressable
                  onPress={onClose}
                  className="w-8 h-8 items-center justify-center rounded-full bg-slate-100"
                >
                  <X size={18} color="#64748B" />
                </Pressable>
              </View>

              {/* Profile List */}
              <ScrollView
                className="max-h-80"
                showsVerticalScrollIndicator={false}
              >
                <View className="px-5 pb-8">
                  {profiles.map((profile, index) => {
                    const colors = getProfileColor(profile.id);
                    const isActive = profile.id === activeProfileId;

                    return (
                      <Animated.View
                        key={profile.id}
                        entering={FadeIn.delay(index * 50)}
                      >
                        <Pressable
                          onPress={() => onSelect(profile)}
                          className="flex-row items-center p-4 rounded-2xl mb-2"
                          style={{
                            backgroundColor: isActive ? colors.lightColor : '#F8FAFC',
                            borderWidth: isActive ? 2 : 0,
                            borderColor: colors.color,
                          }}
                        >
                          {profile.emoji ? (
                            <Text className="text-2xl mr-3">{profile.emoji}</Text>
                          ) : (
                            <View
                              className="w-10 h-10 rounded-full mr-3 items-center justify-center"
                              style={{ backgroundColor: colors.color }}
                            >
                              <Text className="text-white text-lg font-bold">
                                {profile.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          
                          <View className="flex-1">
                            <Text
                              className="text-base font-semibold"
                              style={{ color: isActive ? colors.color : '#1E293B' }}
                            >
                              {profile.name}
                            </Text>
                            <Text className="text-sm text-slate-500">
                              {profile.flags.length} preferences
                            </Text>
                          </View>

                          {isActive && (
                            <View
                              className="w-6 h-6 rounded-full items-center justify-center"
                              style={{ backgroundColor: colors.color }}
                            >
                              <Check size={14} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          )}
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

export default ProfileSwitcher;
