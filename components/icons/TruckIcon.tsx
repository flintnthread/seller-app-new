import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { IconProps } from "./types";

const TruckIcon = ({ size = 20, color = "#6b4f3a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="1" y="3" width="15" height="13" />
    <Path d="M16 8l4 0l3 3l0 5l-7 0" />
    <Circle cx="5.5" cy="18.5" r="2.5" />
    <Circle cx="18.5" cy="18.5" r="2.5" />
  </Svg>
);

export default TruckIcon;
