import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import {
  ShoppingCart,
  Plus,
  X,
  Check,
  Trash2,
  Share2,
  Users,
  Copy,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit3,
  UserPlus,
  Link,
  Package,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useShoppingListStore, type ShoppingListItem, type ShoppingList } from '@/lib/stores/shoppingListStore';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';

export default function ShoppingListScreen() {
  const router = useRouter();
  
  const lists = useShoppingListStore((s) => s.lists);
  const activeListId = useShoppingListStore((s) => s.activeListId);
  const currentUserName = useShoppingListStore((s) => s.currentUserName);
  
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showListOptionsModal, setShowListOptionsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newListName, setNewListName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showChecked, setShowChecked] = useState(true);

  // Get or create default list
  const activeList = lists.find((l) => l.id === activeListId) || 
    (lists.length > 0 ? lists[0] : null);

  const uncheckedItems = activeList?.items.filter((i) => !i.isChecked) || [];
  const checkedItems = activeList?.items.filter((i) => i.isChecked) || [];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh - in future this would sync with cloud
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleAddItem = () => {
    if (!newItemName.trim() || !activeList) return;
    
    useShoppingListStore.getState().addItem(activeList.id, {
      name: newItemName.trim(),
      quantity: parseInt(newItemQuantity) || 1,
      addedBy: currentUserName,
    });
    
    setNewItemName('');
    setNewItemQuantity('1');
    setShowAddItemModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleToggleItem = (itemId: string) => {
    if (!activeList) return;
    Haptics.selectionAsync();
    useShoppingListStore.getState().toggleItemChecked(activeList.id, itemId);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!activeList) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useShoppingListStore.getState().removeItem(activeList.id, itemId);
  };

  const handleClearChecked = () => {
    if (!activeList) return;
    Alert.alert(
      'Clear Checked Items',
      `Remove ${checkedItems.length} checked items from the list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            useShoppingListStore.getState().clearCheckedItems(activeList.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!activeList) return;
    
    const text = useShoppingListStore.getState().getListAsText(activeList.id);
    
    try {
      await Share.share({
        message: text,
        title: activeList.name,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleGenerateShareCode = async () => {
    if (!activeList) return;
    
    const code = useShoppingListStore.getState().generateShareCode(activeList.id);
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Share Code Created!',
      `Code: ${code}\n\nShare this code with family members so they can join your list. The code has been copied to your clipboard.`,
      [{ text: 'OK' }]
    );
  };

  const handleJoinList = () => {
    if (!joinCode.trim()) return;
    
    const success = useShoppingListStore.getState().joinListByCode(
      joinCode.trim(),
      currentUserName
    );
    
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowJoinModal(false);
      setJoinCode('');
    } else {
      Alert.alert('Invalid Code', 'Could not find a list with that code.');
    }
  };

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    
    const newList = useShoppingListStore.getState().createList(newListName.trim());
    useShoppingListStore.getState().setActiveList(newList.id);
    setNewListName('');
    setShowNewListModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteList = () => {
    if (!activeList) return;
    
    Alert.alert(
      'Delete List',
      `Delete "${activeList.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            useShoppingListStore.getState().deleteList(activeList.id);
            setShowListOptionsModal(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  // Initialize default list if none exists
  React.useEffect(() => {
    if (lists.length === 0) {
      useShoppingListStore.getState().getDefaultList();
    }
  }, [lists.length]);

  return (
    <View className="flex-1 bg-slate-50">
      <LinearGradient
        colors={['#FEF3C7', '#FFF7ED', '#FFFFFF']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} className="px-6 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <ShoppingCart size={28} color={COLORS.warningOrange} />
              <Text className="text-2xl font-bold text-slate-900 ml-2">Grocery List</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setShowJoinModal(true)}
                className="w-10 h-10 rounded-xl bg-white items-center justify-center border border-slate-100"
              >
                <UserPlus size={20} color={COLORS.brandGreen} />
              </Pressable>
              <Pressable
                onPress={() => setShowListOptionsModal(true)}
                className="w-10 h-10 rounded-xl bg-white items-center justify-center border border-slate-100"
              >
                <MoreHorizontal size={20} color="#64748B" />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* List Selector */}
        {lists.length > 1 && (
          <Animated.View entering={FadeInDown.delay(80).springify()} className="px-6 mt-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {lists.map((list) => (
                <Pressable
                  key={list.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    useShoppingListStore.getState().setActiveList(list.id);
                  }}
                  className={cn(
                    'mr-2 px-4 py-2 rounded-full',
                    list.id === activeListId
                      ? 'bg-orange-500'
                      : 'bg-white border border-slate-200'
                  )}
                >
                  <Text
                    className={cn(
                      'font-medium',
                      list.id === activeListId ? 'text-white' : 'text-slate-700'
                    )}
                  >
                    {list.name}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setShowNewListModal(true)}
                className="px-4 py-2 rounded-full bg-slate-100"
              >
                <Plus size={18} color="#64748B" />
              </Pressable>
            </ScrollView>
          </Animated.View>
        )}

        {/* Shared With Badge */}
        {activeList && activeList.sharedWith.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()} className="px-6 mt-3">
            <View className="flex-row items-center bg-teal-50 rounded-xl px-4 py-2">
              <Users size={16} color={COLORS.brandGreen} />
              <Text className="text-teal-700 text-sm ml-2">
                Shared with {activeList.sharedWith.map((m) => m.name).join(', ')}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Items List */}
        <ScrollView
          className="flex-1 px-6 mt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Unchecked Items */}
          {uncheckedItems.length > 0 ? (
            <View className="mb-4">
              <Text className="text-lg font-bold text-slate-900 mb-3">
                To Buy ({uncheckedItems.length})
              </Text>
              {uncheckedItems.map((item, index) => (
                <ShoppingListItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  onToggle={() => handleToggleItem(item.id)}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))}
            </View>
          ) : (
            <Animated.View entering={FadeIn} className="items-center py-12">
              <View className="w-20 h-20 rounded-full bg-orange-50 items-center justify-center mb-4">
                <ShoppingCart size={36} color={COLORS.warningOrange} />
              </View>
              <Text className="text-lg font-semibold text-slate-900">List is empty</Text>
              <Text className="text-slate-500 text-center mt-1">
                Add items or scan products to add them here
              </Text>
            </Animated.View>
          )}

          {/* Checked Items */}
          {checkedItems.length > 0 && (
            <View className="mt-4">
              <Pressable
                onPress={() => setShowChecked(!showChecked)}
                className="flex-row items-center justify-between mb-3"
              >
                <Text className="text-base font-semibold text-slate-500">
                  ✓ Already Got ({checkedItems.length})
                </Text>
                <View className="flex-row items-center">
                  <Pressable
                    onPress={handleClearChecked}
                    className="mr-3 px-3 py-1 bg-slate-100 rounded-lg"
                  >
                    <Text className="text-slate-600 text-sm">Clear</Text>
                  </Pressable>
                  <ChevronDown
                    size={20}
                    color="#64748B"
                    style={{ transform: [{ rotate: showChecked ? '0deg' : '-90deg' }] }}
                  />
                </View>
              </Pressable>
              
              {showChecked && (
                <View className="opacity-60">
                  {checkedItems.map((item, index) => (
                    <ShoppingListItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      onToggle={() => handleToggleItem(item.id)}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Floating Action Buttons */}
        <View className="absolute bottom-8 right-6 flex-row gap-3">
          <Pressable
            onPress={handleShare}
            className="w-14 h-14 rounded-full bg-white items-center justify-center shadow-lg"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 }}
          >
            <Share2 size={24} color={COLORS.brandGreen} />
          </Pressable>
          <Pressable
            onPress={() => setShowAddItemModal(true)}
            className="overflow-hidden rounded-full shadow-lg"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }}
          >
            <LinearGradient
              colors={[COLORS.warningOrange, '#EA580C']}
              style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={28} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddItemModal(false)}
      >
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-200">
            <Text className="text-lg font-bold text-slate-900">Add Item</Text>
            <Pressable
              onPress={() => setShowAddItemModal(false)}
              className="p-2 bg-slate-100 rounded-full"
            >
              <X size={20} color="#64748B" />
            </Pressable>
          </View>
          <View className="px-6 pt-6">
            <Text className="text-sm font-medium text-slate-700 mb-2">Item Name</Text>
            <TextInput
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="e.g. Organic Milk"
              placeholderTextColor="#94A3B8"
              autoFocus
              className="bg-white rounded-2xl px-4 py-4 text-lg text-slate-900 border border-slate-200 mb-4"
            />
            
            <Text className="text-sm font-medium text-slate-700 mb-2">Quantity</Text>
            <TextInput
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              placeholder="1"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              className="bg-white rounded-2xl px-4 py-4 text-lg text-slate-900 border border-slate-200 mb-6"
            />
            
            <Pressable
              onPress={handleAddItem}
              disabled={!newItemName.trim()}
              className="overflow-hidden rounded-2xl"
            >
              <LinearGradient
                colors={newItemName.trim() ? [COLORS.warningOrange, '#EA580C'] : ['#E2E8F0', '#E2E8F0']}
                style={{ padding: 16, borderRadius: 16, alignItems: 'center' }}
              >
                <Text className={newItemName.trim() ? 'text-white font-semibold text-lg' : 'text-slate-400 font-semibold text-lg'}>
                  Add to List
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* List Options Modal */}
      <Modal
        visible={showListOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowListOptionsModal(false)}
      >
        <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
          <Pressable className="flex-1 justify-end" onPress={() => setShowListOptionsModal(false)}>
            <Animated.View entering={FadeInDown.springify()} className="bg-white rounded-t-3xl">
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View className="items-center pt-3 pb-2">
                  <View className="w-10 h-1 bg-slate-300 rounded-full" />
                </View>
                <View className="px-5 pb-8">
                  <Text className="text-xl font-bold text-slate-900 mb-4">List Options</Text>
                  
                  <OptionButton
                    icon={<Link size={20} color={COLORS.brandGreen} />}
                    label="Generate Share Code"
                    subtitle="Let family members join this list"
                    onPress={handleGenerateShareCode}
                  />
                  
                  <OptionButton
                    icon={<Share2 size={20} color={COLORS.brandGreen} />}
                    label="Share List as Text"
                    onPress={() => {
                      setShowListOptionsModal(false);
                      handleShare();
                    }}
                  />
                  
                  <OptionButton
                    icon={<Plus size={20} color={COLORS.brandGreen} />}
                    label="Create New List"
                    onPress={() => {
                      setShowListOptionsModal(false);
                      setShowNewListModal(true);
                    }}
                  />
                  
                  {lists.length > 1 && (
                    <OptionButton
                      icon={<Trash2 size={20} color={COLORS.alertRed} />}
                      label="Delete This List"
                      isDestructive
                      onPress={handleDeleteList}
                    />
                  )}
                </View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </BlurView>
      </Modal>

      {/* New List Modal */}
      <Modal
        visible={showNewListModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewListModal(false)}
      >
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-200">
            <Text className="text-lg font-bold text-slate-900">New List</Text>
            <Pressable
              onPress={() => setShowNewListModal(false)}
              className="p-2 bg-slate-100 rounded-full"
            >
              <X size={20} color="#64748B" />
            </Pressable>
          </View>
          <View className="px-6 pt-6">
            <TextInput
              value={newListName}
              onChangeText={setNewListName}
              placeholder="e.g. Weekly Groceries"
              placeholderTextColor="#94A3B8"
              autoFocus
              className="bg-white rounded-2xl px-4 py-4 text-lg text-slate-900 border border-slate-200 mb-6"
            />
            <Pressable
              onPress={handleCreateList}
              disabled={!newListName.trim()}
              className="overflow-hidden rounded-2xl"
            >
              <LinearGradient
                colors={newListName.trim() ? [COLORS.brandGreen, COLORS.gradientEnd] : ['#E2E8F0', '#E2E8F0']}
                style={{ padding: 16, borderRadius: 16, alignItems: 'center' }}
              >
                <Text className={newListName.trim() ? 'text-white font-semibold text-lg' : 'text-slate-400 font-semibold text-lg'}>
                  Create List
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Join List Modal */}
      <Modal
        visible={showJoinModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-200">
            <Text className="text-lg font-bold text-slate-900">Join a List</Text>
            <Pressable
              onPress={() => setShowJoinModal(false)}
              className="p-2 bg-slate-100 rounded-full"
            >
              <X size={20} color="#64748B" />
            </Pressable>
          </View>
          <View className="px-6 pt-6">
            <Text className="text-slate-500 mb-4">
              Enter the 6-character code shared by a family member to join their grocery list.
            </Text>
            <TextInput
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              maxLength={6}
              autoFocus
              className="bg-white rounded-2xl px-4 py-4 text-2xl text-center text-slate-900 border border-slate-200 mb-6 font-mono tracking-widest"
            />
            <Pressable
              onPress={handleJoinList}
              disabled={joinCode.length !== 6}
              className="overflow-hidden rounded-2xl"
            >
              <LinearGradient
                colors={joinCode.length === 6 ? [COLORS.brandGreen, COLORS.gradientEnd] : ['#E2E8F0', '#E2E8F0']}
                style={{ padding: 16, borderRadius: 16, alignItems: 'center' }}
              >
                <Text className={joinCode.length === 6 ? 'text-white font-semibold text-lg' : 'text-slate-400 font-semibold text-lg'}>
                  Join List
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// Item Card Component
function ShoppingListItemCard({
  item,
  index,
  onToggle,
  onDelete,
}: {
  item: ShoppingListItem;
  index: number;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).springify()}
      layout={Layout.springify()}
      className="mb-2"
    >
      <Pressable
        onPress={onToggle}
        onLongPress={onDelete}
        className={cn(
          'flex-row items-center p-4 rounded-2xl bg-white border',
          item.isChecked ? 'border-slate-100' : 'border-slate-200'
        )}
      >
        {/* Checkbox */}
        <View
          className={cn(
            'w-7 h-7 rounded-full items-center justify-center mr-3',
            item.isChecked ? 'bg-green-500' : 'border-2 border-slate-300'
          )}
        >
          {item.isChecked && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
        </View>

        {/* Product Image or Icon */}
        {item.imageURL ? (
          <Image
            source={{ uri: item.imageURL }}
            style={{ width: 44, height: 44, borderRadius: 10 }}
            contentFit="cover"
          />
        ) : (
          <View className="w-11 h-11 rounded-xl bg-orange-50 items-center justify-center">
            <Package size={20} color={COLORS.warningOrange} />
          </View>
        )}

        {/* Item Info */}
        <View className="flex-1 ml-3">
          <Text
            className={cn(
              'text-base font-medium',
              item.isChecked ? 'text-slate-400 line-through' : 'text-slate-900'
            )}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.brand && (
            <Text className="text-sm text-slate-500" numberOfLines={1}>
              {item.brand}
            </Text>
          )}
        </View>

        {/* Quantity */}
        {item.quantity > 1 && (
          <View className="bg-slate-100 px-2.5 py-1 rounded-lg mr-2">
            <Text className="text-slate-600 font-semibold">×{item.quantity}</Text>
          </View>
        )}

        {/* Added By */}
        <Text className="text-xs text-slate-400">{item.addedBy}</Text>
      </Pressable>
    </Animated.View>
  );
}

// Option Button Component
function OptionButton({
  icon,
  label,
  subtitle,
  isDestructive,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  isDestructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      className="flex-row items-center py-4 border-b border-slate-100"
    >
      <View className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center">
        {icon}
      </View>
      <View className="flex-1 ml-3">
        <Text className={cn('text-base font-medium', isDestructive ? 'text-red-500' : 'text-slate-900')}>
          {label}
        </Text>
        {subtitle && <Text className="text-sm text-slate-500">{subtitle}</Text>}
      </View>
      <ChevronRight size={20} color="#CBD5E1" />
    </Pressable>
  );
}
