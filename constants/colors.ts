export const Colors = {
  // Brand
  primary: '#00B246',
  primaryLight: '#E6F7EC',
  primaryDark: '#1A5C35',
  accent: '#1A5C35',
  accentLight: '#E6F7EC',
  accentDark: '#0E3F23',

  // Surfaces
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F2F2',
  surfaceVariant: '#F2F2F2',

  // Legacy navy aliases (kept so older screens compile; mapped to new neutrals)
  navyDark: '#1A1A1A',
  navyMid: '#2A2A2A',
  navyLight: '#6B6B6B',

  // Text
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9E9E9E',
  textDisabled: '#9E9E9E',
  textOnDark: '#FFFFFF',
  textOnAccent: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  // Banner
  banner: '#1A5C35',
  bannerText: '#FFFFFF',

  // Lines
  border: '#F0F0F0',
  borderLight: '#F5F5F5',
  divider: '#F0F0F0',

  // Semantic (slightly desaturated)
  success: '#00B246',
  warning: '#E0A52E',
  error: '#D14343',
  info: '#3B82F6',

  // Accents
  gold: '#E0A52E',
  goldLight: '#FCE7A8',
  messageBubble: '#1A5C35',
  messageBubbleOther: '#F2F2F2',
  online: '#00B246',
  shadow: 'rgba(0,0,0,0.08)',
  overlay: 'rgba(0,0,0,0.25)',
  coral: '#FF7043',
  teal: '#1A5C35',
  lavender: '#E6F7EC',
};

export default {
  light: {
    text: Colors.text,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.textTertiary,
    tabIconSelected: Colors.primary,
  },
};
