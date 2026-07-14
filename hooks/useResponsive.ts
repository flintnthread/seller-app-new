import { useWindowDimensions, Platform } from 'react-native';

export const WEB_WIDE_BREAKPOINT = 600;
export const WEB_TABLET_BREAKPOINT = 768;

export const useResponsive = () => {
  const { width } = useWindowDimensions();

  return {
    isDesktop: Platform.OS === 'web' && width >= 1024,
    isTablet: Platform.OS === 'web' && width >= WEB_TABLET_BREAKPOINT && width < 1024,
    isMobile: Platform.OS !== 'web' || width < WEB_TABLET_BREAKPOINT,
    isWeb: Platform.OS === 'web',
    isWebWide: Platform.OS === 'web' && width >= WEB_WIDE_BREAKPOINT,
    isNarrowWeb: Platform.OS === 'web' && width < WEB_TABLET_BREAKPOINT,
    isCompact: width < 480,
    width,
  };
};
