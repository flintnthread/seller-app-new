import type { TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  title: 32,
};

export const lineHeights = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 36,
  title: 40,
};

export type FontSize = keyof typeof fontSizes;
export type FontWeight = keyof typeof fontFamilies;

export const Typography: Record<FontSize, TextStyle> = {
  xs: {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
  },
  sm: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
  },
  md: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
  },
  lg: {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
  },
  xl: {
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
  },
  xxl: {
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
  },
  title: {
    fontSize: fontSizes.title,
    lineHeight: lineHeights.title,
  },
};
