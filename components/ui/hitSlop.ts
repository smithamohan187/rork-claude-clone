/**
 * Shared hitSlop constants for small tap targets.
 *
 * Apple HIG recommends minimum 44x44pt touch areas. Use these on icon-sized
 * Pressables/TouchableOpacities (close buttons, eye toggles, like icons, etc.)
 * to enlarge the invisible tap zone without affecting layout.
 */
export const HIT_SLOP_SMALL = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const HIT_SLOP_MEDIUM = { top: 10, bottom: 10, left: 10, right: 10 } as const;
export const HIT_SLOP_LARGE = { top: 14, bottom: 14, left: 14, right: 14 } as const;

/** Default for any icon-only button under 44pt. */
export const HIT_SLOP = HIT_SLOP_MEDIUM;
