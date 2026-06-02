import React, { useMemo, useCallback } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Compass, MessageCircle, User, Gift, LayoutDashboard, PenSquare, Users, BarChart3, Settings } from 'lucide-react-native';
import { THEME } from '@/theme/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { useReferralChat } from '@/contexts/ReferralChatContext';

const BUSINESS_CHAT_UNREAD = 2;

const TAB_BAR_BASE_STYLE = {
  backgroundColor: THEME.colors.surface,
  borderTopWidth: 0,
  elevation: Platform.OS === 'android' ? 8 : 0,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  paddingTop: 6,
} as const;

const TAB_BAR_LABEL_STYLE = {
  fontSize: 10,
  fontWeight: '600' as const,
  marginTop: 2,
  letterSpacing: 0.2,
} as const;



function ActiveIndicator({ focused }: { focused: boolean }) {
  const width = React.useRef(new Animated.Value(focused ? 24 : 0)).current;
  React.useEffect(() => {
    Animated.timing(width, {
      toValue: focused ? 24 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused, width]);
  return (
    <Animated.View
      style={{
        width,
        height: 3,
        borderRadius: 2,
        backgroundColor: THEME.colors.primary,
        marginBottom: 4,
      }}
    />
  );
}

function TabIcon({
  focused,
  color,
  Icon,
  badgeDot,
}: {
  focused: boolean;
  color: string;
  Icon: React.ComponentType<{ size: number; color: string; fill?: string }>;
  badgeDot?: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <ActiveIndicator focused={focused} />
      <View>
        <Icon size={22} color={color} />
        {badgeDot ? <View style={styles.dot} /> : null}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { accountType } = useAuth();
  const isBusiness = accountType === 'business';
  const insets = useSafeAreaInsets();

  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarActiveTintColor: THEME.colors.primary,
    tabBarInactiveTintColor: '#9E9E9E',
    tabBarStyle: {
      ...TAB_BAR_BASE_STYLE,
      paddingBottom: insets.bottom + 6,
      height: 64 + insets.bottom,
    },
    tabBarShowLabel: true,
    tabBarLabelStyle: TAB_BAR_LABEL_STYLE,
  }), [insets.bottom]);
  const { totalUnread: friendUnread } = useReferralChat();
  const combinedUnread = BUSINESS_CHAT_UNREAD + friendUnread;

  const feedOptions = useMemo(() => ({
    title: isBusiness ? 'Dashboard' : 'Home',
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <TabIcon focused={focused} color={color} Icon={isBusiness ? LayoutDashboard : Home} />
    ),
  }), [isBusiness]);

  const marketplaceOptions = useMemo(() => ({
    title: isBusiness ? 'Members' : 'Explore',
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <TabIcon focused={focused} color={color} Icon={isBusiness ? Users : Compass} />
    ),
  }), [isBusiness]);

  const rewardsOptions = useMemo(() => ({
    title: isBusiness ? 'Analytics' : 'Rewards',
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <TabIcon focused={focused} color={color} Icon={isBusiness ? BarChart3 : Gift} />
    ),
  }), [isBusiness]);

  const router = useRouter();

  const handlePostTabPress = useCallback((e: { preventDefault: () => void }) => {
    if (isBusiness) {
      e.preventDefault();
      router.push('/create-offer');
    }
  }, [isBusiness, router]);

  const handleRewardsTabPress = useCallback((e: { preventDefault: () => void }) => {
    if (isBusiness) {
      e.preventDefault();
      router.push('/business-analytics' as any);
    }
  }, [isBusiness, router]);

  const messagesOptions = useMemo(() => ({
    title: isBusiness ? 'Post' : 'Chat',
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <TabIcon focused={focused} color={color} Icon={isBusiness ? PenSquare : MessageCircle} />
    ),
    tabBarBadge: !isBusiness && combinedUnread > 0 ? combinedUnread : undefined,
    tabBarBadgeStyle: !isBusiness
      ? { backgroundColor: '#EF4444', color: '#FFFFFF', fontSize: 10, fontWeight: '600' as const }
      : undefined,
  }), [isBusiness, combinedUnread]);

  const savedCount = 3;
  const showSavedDot = !isBusiness && savedCount > 0;

  const profileOptions = useMemo(() => ({
    title: isBusiness ? 'Settings' : 'Profile',
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <TabIcon focused={focused} color={color} Icon={isBusiness ? Settings : User} badgeDot={showSavedDot} />
    ),
  }), [isBusiness, showSavedDot]);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="feed" options={feedOptions} />
      <Tabs.Screen name="marketplace" options={marketplaceOptions} />
      <Tabs.Screen
        name="rewards"
        options={rewardsOptions}
        listeners={{ tabPress: handleRewardsTabPress }}
      />
      <Tabs.Screen
        name="messages"
        options={messagesOptions}
        listeners={{ tabPress: handlePostTabPress }}
      />
      <Tabs.Screen name="profile" options={profileOptions} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: THEME.colors.accent,
    borderWidth: 1,
    borderColor: THEME.colors.surface,
  },
});
