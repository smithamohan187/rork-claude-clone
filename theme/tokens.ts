import { Platform, TextStyle } from 'react-native';

const INTER_FALLBACK = Platform.select({
  ios: 'System',
  android: 'Roboto',
  web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}) as string;

/**
 * Inter font family names. Loaded via @expo-google-fonts/inter in app/_layout.tsx.
 * If a font isn't loaded yet, RN falls back to the platform default automatically.
 */
const FONT = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const FONT_FAMILY = FONT;

export const THEME = {
  colors: {
    // Brand
    primary: '#00B246',
    primaryDark: '#1A5C35',
    primaryLight: '#E6F7EC',
    accent: '#1A5C35',
    accentLight: '#E6F7EC',

    // Surfaces
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceVariant: '#F2F2F2',
    inputFill: '#F2F2F2',

    // Text
    textPrimary: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textDisabled: '#9E9E9E',
    textOnPrimary: '#FFFFFF',

    // Semantic (slightly desaturated)
    success: '#00B246',
    warning: '#E0A52E',
    error: '#D14343',
    info: '#3B82F6',

    // Lines & overlays
    border: '#F0F0F0',
    divider: '#F0F0F0',
    overlay: 'rgba(0,0,0,0.25)',
    rippleTint: 'rgba(0,178,70,0.12)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  fontFamily: INTER_FALLBACK,
  font: FONT,
  type: {
    displayLarge: { fontFamily: FONT.bold, fontSize: 30, fontWeight: '700', letterSpacing: -0.3 } as TextStyle,
    displayMedium: { fontFamily: FONT.bold, fontSize: 26, fontWeight: '700', letterSpacing: -0.3 } as TextStyle,
    headlineLarge: { fontFamily: FONT.bold, fontSize: 22, fontWeight: '700', letterSpacing: -0.2 } as TextStyle,
    headlineMedium: { fontFamily: FONT.semibold, fontSize: 20, fontWeight: '600', letterSpacing: -0.2 } as TextStyle,
    titleLarge: { fontFamily: FONT.semibold, fontSize: 18, fontWeight: '600', letterSpacing: 0 } as TextStyle,
    titleMedium: { fontFamily: FONT.semibold, fontSize: 17, fontWeight: '600', letterSpacing: 0 } as TextStyle,
    bodyLarge: { fontFamily: FONT.regular, fontSize: 15, fontWeight: '400', letterSpacing: 0 } as TextStyle,
    bodyMedium: { fontFamily: FONT.regular, fontSize: 14, fontWeight: '400', letterSpacing: 0 } as TextStyle,
    bodySmall: { fontFamily: FONT.regular, fontSize: 13, fontWeight: '400', letterSpacing: 0 } as TextStyle,
    labelLarge: { fontFamily: FONT.semibold, fontSize: 16, fontWeight: '600', letterSpacing: 0 } as TextStyle,
    labelMedium: { fontFamily: FONT.semibold, fontSize: 13, fontWeight: '600', letterSpacing: 0 } as TextStyle,
    labelSmall: { fontFamily: FONT.medium, fontSize: 11, fontWeight: '500', letterSpacing: 0.2 } as TextStyle,
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    modal: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 18,
      elevation: 8,
    },
    fab: {
      shadowColor: '#00B246',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 6,
    },
    tabBar: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 8,
    },
  },
} as const;

export type ThemeType = typeof THEME;
