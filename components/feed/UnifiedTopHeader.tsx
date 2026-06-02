import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, TextInput, Keyboard } from 'react-native';
import { Search, Bell, X, ArrowLeft } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import ActiveProfileBadge from '@/components/ActiveProfileBadge';
import { useSideDrawer } from '@/contexts/SideDrawerContext';

interface UnifiedTopHeaderProps {
  unreadNotificationCount?: number;
  onSearchPress?: () => void;
  searchEnabled?: boolean;
  searchActive?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  onSearchOpen?: () => void;
  onSearchClose?: () => void;
}

const UnifiedTopHeader = React.memo(function UnifiedTopHeader({
  unreadNotificationCount = 0,
  onSearchPress,
  searchEnabled = false,
  searchActive = false,
  searchQuery = '',
  onSearchQueryChange,
  onSearchOpen,
  onSearchClose,
}: UnifiedTopHeaderProps) {
  const router = useRouter();
  const { open: openDrawer } = useSideDrawer();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (searchActive) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [searchActive]);

  const handleSearch = useCallback(() => {
    if (searchEnabled) {
      console.log('[UnifiedTopHeader] inline search open');
      onSearchOpen?.();
      return;
    }
    if (onSearchPress) {
      onSearchPress();
      return;
    }
    console.log('[UnifiedTopHeader] search pressed');
    router.push('/(tabs)/marketplace' as never);
  }, [onSearchPress, router, searchEnabled, onSearchOpen]);

  const handleCloseSearch = useCallback(() => {
    Keyboard.dismiss();
    onSearchQueryChange?.('');
    onSearchClose?.();
  }, [onSearchQueryChange, onSearchClose]);

  const handleClearText = useCallback(() => {
    onSearchQueryChange?.('');
    inputRef.current?.focus();
  }, [onSearchQueryChange]);

  const handleNotifications = useCallback(() => {
    console.log('[UnifiedTopHeader] notifications pressed');
    router.push('/(tabs)/feed/notifications' as never);
  }, [router]);

  if (searchEnabled && searchActive) {
    return (
      <View style={styles.wrap} testID="unified-top-header">
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.bar}>
            <Pressable
              onPress={handleCloseSearch}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              hitSlop={8}
              testID="header-search-back"
            >
              <ArrowLeft size={22} color={Colors.primary} />
            </Pressable>
            <View style={styles.searchField}>
              <Search size={16} color={Colors.primary} style={styles.searchFieldIcon} />
              <TextInput
                ref={inputRef}
                value={searchQuery}
                onChangeText={onSearchQueryChange}
                placeholder="Search posts, offers, events..."
                placeholderTextColor="#E8F5EE"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                testID="header-search-input"
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={handleClearText} hitSlop={8} testID="header-search-clear">
                  <X size={16} color={Colors.primary} />
                </Pressable>
              ) : null}
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID="unified-top-header">
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.bar}>
          <View style={styles.leftGroup}>
            <Pressable
              onPress={openDrawer}
              style={({ pressed }) => [styles.menuBtn, pressed && styles.iconBtnPressed]}
              hitSlop={8}
              testID="header-drawer-menu"
            >
              <MaterialCommunityIcons name="menu" size={28} color="#00B246" />
            </Pressable>
            <Text style={styles.brand} numberOfLines={1}>TouchPoint</Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={handleSearch}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              hitSlop={8}
              testID="header-search"
            >
              <Search size={20} color={Colors.primary} />
            </Pressable>
            <Pressable
              onPress={handleNotifications}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              hitSlop={8}
              testID="header-notifications"
            >
              <Bell size={20} color={Colors.primary} />
              {unreadNotificationCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadNotificationCount}</Text>
                </View>
              ) : null}
            </Pressable>

            <ActiveProfileBadge testID="header-active-profile" />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D2E',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  safe: {
    backgroundColor: Colors.surface,
  },
  bar: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: Colors.surfaceVariant,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#fff',
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 22,
    paddingHorizontal: 12,
    height: 40,
    marginLeft: 4,
    gap: 8,
  },
  searchFieldIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    color: '#1A5C35',
    fontSize: 14,
    paddingVertical: 0,
  },
});

export default UnifiedTopHeader;
