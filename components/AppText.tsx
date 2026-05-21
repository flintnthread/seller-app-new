import React from 'react';
import { Text as RNText, StyleSheet, useColorScheme } from 'react-native';
import type { TextProps } from 'react-native';
import { Colors } from '@/constants/colors';
import { fontFamilies, Typography } from '@/constants/fonts';
import type { FontSize, FontWeight } from '@/constants/fonts';

interface AppTextProps extends TextProps {
  size?: FontSize;
  weight?: FontWeight;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const AppText: React.FC<AppTextProps> = ({
  children,
  size = 'md',
  weight = 'regular',
  color,
  align = 'left',
  style,
  ...props
}) => {
  const theme = useColorScheme() ?? 'light';
  const textColor = color || Colors[theme].text;

  const textStyle = [
    styles.base,
    Typography[size],
    {
      fontFamily: fontFamilies[weight],
      color: textColor,
      textAlign: align,
    },
    style,
  ];

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    // Add any base styles here if needed
  },
});
