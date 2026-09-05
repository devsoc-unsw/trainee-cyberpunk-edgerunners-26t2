import { TextStyle } from 'react-native';

export const colors = {
  background: '#0B0D10',
  surface: '#15191F',
  text: '#F5F6F7',
  muted: '#9AA2AE',
  border: '#292F38',
  accent: '#FFD43B',
  accentText: '#171300',
  inputText: '#F5F6F7',
  inputPlaceholder: '#8E96A3',
  yes: '#42C98B',
  no: '#FF7272',
} as const;

/**
 * Home and Search intentionally use the discovery palette from the product
 * mocks. Keep it separate so the rest of the app retains the yellow brand
 * accent above.
 */
export const discoveryColors = {
  background: colors.background,
  surface: colors.surface,
  elevatedSurface: '#20252D',
  thumbnail: '#252B34',
  text: colors.text,
  muted: colors.muted,
  subtle: '#737C88',
  border: colors.border,
  accent: colors.accent,
  accentSoft: '#3A3218',
  accentText: colors.accentText,
  yes: colors.yes,
  no: colors.no,
} as const;

export const discoveryLayout = {
  screenEdge: 20,
  headerGap: 12,
  filterHeight: 36,
  tabClearance: 76,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 40, fontWeight: '700', color: colors.text },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: colors.text },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400', color: colors.text },
  subhead: { fontSize: 14, lineHeight: 20, fontWeight: '400', color: colors.muted },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: colors.muted },
} as const satisfies Record<string, TextStyle>;

export const motion = {
  press: 100,
  transition: 250,
} as const;
