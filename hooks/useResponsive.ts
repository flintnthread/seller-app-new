import { useWindowDimensions, Platform } from 'react-native';

export const useResponsive = () => {
  const { width } = useWindowDimensions();

  return {
    isDesktop: Platform.OS === 'web' && width >= 1024,
    isTablet: Platform.OS === 'web' && width >= 768 && width < 1024,
    isMobile: Platform.OS !== 'web' || width < 768,
    isWeb: Platform.OS === 'web',
    width,
  };
};
