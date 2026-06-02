import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface AppHeaderProps {
  compact?: boolean;
}

const LOGO_URL = 'https://r2-pub.rork.com/generated-images/de5b7891-f946-4e79-9164-416c4c9266a2.png';

const LogoIcon = React.memo(function LogoIcon({ size = 28 }: { size?: number }) {
  return (
    <Image
      source={{ uri: LOGO_URL }}
      style={{ width: size, height: size, borderRadius: size * 0.15 }}
      resizeMode="contain"
    />
  );
});

const AppHeader = React.memo(function AppHeader({ compact = false }: AppHeaderProps) {
  if (compact) {
    return (
      <View style={headerStyles.compactContainer}>
        <LogoIcon size={18} />
        <Text style={headerStyles.compactTitle}>TouchPoint</Text>
      </View>
    );
  }

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.logoRow}>
        <LogoIcon size={26} />
        <Text style={headerStyles.title}>TouchPoint</Text>
      </View>
      <Text style={headerStyles.slogan}>
        All your business All in one place
      </Text>
    </View>
  );
});

const headerStyles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center' as const,
    backgroundColor: Colors.primary,
  },
  logoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 7,
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '200' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  slogan: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center' as const,
    letterSpacing: 0.4,
    fontWeight: '300' as const,
    color: '#F59E0B',
  },
  compactContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingVertical: 4,
    backgroundColor: Colors.primary,
  },
  compactTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '200' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default AppHeader;
