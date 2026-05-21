import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor(
    Object.fromEntries(
      Object.entries({ light: lightColor, dark: darkColor }).filter(([_, v]) => v !== undefined)
    ),
    'background'
  );

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
