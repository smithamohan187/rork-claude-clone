import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { THEME } from '@/theme/tokens';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  testID?: string;
}

const AppHeader = React.memo(function AppHeader({
  title,
  subtitle,
  showBack = true,
  rightAction,
  onBack,
  testID,
}: AppHeaderProps) {
  const router = useRouter();

  const handleBack = React.useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    try {
      if (typeof router.canGoBack === 'function' && router.canGoBack()) {
        router.back();
      }
    } catch (e) {
      console.log('[AppHeader] canGoBack error', e);
    }
  }, [onBack, router]);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            testID="app-header-back"
          >
            <ChevronLeft size={24} color={THEME.colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.side, styles.sideRight]}>{rightAction}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
  },
  side: {
    width: 56,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.radius.full,
  },
  pressed: {
    backgroundColor: THEME.colors.surfaceVariant,
  },
  title: {
    ...THEME.type.titleLarge,
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    ...THEME.type.bodySmall,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
});

export default AppHeader;
