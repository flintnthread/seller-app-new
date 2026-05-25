// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

type IconMapping = Partial<Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'bell.fill': 'notifications',
  'person.crop.circle': 'person',
  'bag.fill': 'shopping-bag',
  'wallet.pass.fill': 'account-balance-wallet',
  'cube.box.fill': 'inventory',
  'chart.line.uptrend.xyaxis': 'trending-up',
  'chart.bar.fill': 'bar-chart',
  'message.fill': 'message',
  'ellipsis': 'more-horiz',
  'cart.fill': 'shopping-cart',
  'tray.full.fill': 'inventory',
  'plus': 'add',
  'paintbrush.fill': 'palette',
  'ruler.fill': 'straighten',
  'square.grid.2x2.fill': 'category',
  'arrow.right.to.line': 'logout',
} satisfies IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
