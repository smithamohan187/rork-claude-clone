import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { THEME } from './tokens';

const fontConfig = {
  displayLarge: THEME.type.displayLarge,
  displayMedium: THEME.type.displayMedium,
  displaySmall: THEME.type.headlineLarge,
  headlineLarge: THEME.type.headlineLarge,
  headlineMedium: THEME.type.headlineMedium,
  headlineSmall: THEME.type.titleLarge,
  titleLarge: THEME.type.titleLarge,
  titleMedium: THEME.type.titleMedium,
  titleSmall: THEME.type.labelLarge,
  bodyLarge: THEME.type.bodyLarge,
  bodyMedium: THEME.type.bodyMedium,
  bodySmall: THEME.type.bodySmall,
  labelLarge: THEME.type.labelLarge,
  labelMedium: THEME.type.labelMedium,
  labelSmall: THEME.type.labelSmall,
} as const;

export const paperTheme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: THEME.colors.primary,
    onPrimary: THEME.colors.textOnPrimary,
    primaryContainer: THEME.colors.primaryLight,
    onPrimaryContainer: THEME.colors.primaryDark,
    secondary: THEME.colors.accent,
    onSecondary: THEME.colors.textOnPrimary,
    secondaryContainer: THEME.colors.accentLight,
    onSecondaryContainer: THEME.colors.primaryDark,
    tertiary: THEME.colors.info,
    background: THEME.colors.background,
    onBackground: THEME.colors.textPrimary,
    surface: THEME.colors.surface,
    onSurface: THEME.colors.textPrimary,
    surfaceVariant: THEME.colors.surfaceVariant,
    onSurfaceVariant: THEME.colors.textSecondary,
    outline: THEME.colors.border,
    outlineVariant: THEME.colors.divider,
    error: THEME.colors.error,
    onError: '#FFFFFF',
    backdrop: THEME.colors.overlay,
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: 'transparent',
      level1: THEME.colors.surface,
      level2: THEME.colors.surface,
      level3: THEME.colors.surface,
      level4: THEME.colors.surface,
      level5: THEME.colors.surface,
    },
  },
  fonts: configureFonts({ config: fontConfig }),
};

export type PaperThemeType = typeof paperTheme;
