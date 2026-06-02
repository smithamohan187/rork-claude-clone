import { Platform, ViewStyle } from 'react-native';

/**
 * Cross-platform shadow helper.
 *
 * Emits iOS shadow props AND Android elevation together so cards/modals
 * render with consistent depth on both platforms.
 *
 * `level`:
 *   - `card`   small lift used on list cards and pills
 *   - `raised` medium lift used on prominent CTAs / sticky bars
 *   - `modal`  large lift used on sheets and dialogs
 *   - `fab`    floating action button glow
 */
export type ShadowLevel = 'card' | 'raised' | 'modal' | 'fab';

interface ShadowOpts {
  color?: string;
  tint?: 'dark' | 'brand';
}

const PRESETS: Record<ShadowLevel, { offsetY: number; opacity: number; radius: number; elevation: number }> = {
  card: { offsetY: 2, opacity: 0.08, radius: 8, elevation: 2 },
  raised: { offsetY: 4, opacity: 0.12, radius: 12, elevation: 4 },
  modal: { offsetY: 6, opacity: 0.14, radius: 18, elevation: 8 },
  fab: { offsetY: 4, opacity: 0.28, radius: 12, elevation: 6 },
};

/** Returns a style object you can spread into any View/Pressable style. */
export function shadow(level: ShadowLevel = 'card', opts?: ShadowOpts): ViewStyle {
  const preset = PRESETS[level];
  const color = opts?.color ?? (opts?.tint === 'brand' ? '#00B246' : '#000000');
  if (Platform.OS === 'android') {
    return { elevation: preset.elevation };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: preset.offsetY },
    shadowOpacity: preset.opacity,
    shadowRadius: preset.radius,
  };
}
