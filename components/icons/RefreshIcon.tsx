import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

const RefreshIcon = ({ size = 20, color = "#6b4f3a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 4v6h-6" />
    <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </Svg>
);

export default RefreshIcon;
