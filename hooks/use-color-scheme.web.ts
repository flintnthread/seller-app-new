import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { readStoredDarkMode } from '@/lib/settings/appPreferences';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [forcedDark, setForcedDark] = useState(false);

  useEffect(() => {
    setForcedDark(readStoredDarkMode());
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated && forcedDark) {
    return 'dark';
  }

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
