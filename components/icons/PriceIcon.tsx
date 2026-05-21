import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

const PriceIcon = ({ size = 20, color = "#6b4f3a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" fill={color} />
    <Path d="M7 15h2c.55 0 1-.45 1-1v-1.5c0-.55-.45-1-1-1H7v-1h2V9H7c-.55 0-1 .45-1 1v1.5c0 .55.45 1 1 1h2v1H7v1.5c0 .55.45 1 1 1z" fill={color} />
  </Svg>
);

export default PriceIcon;
