import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

const PackageIcon = ({ size = 20, color = "#6b4f3a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L4 6v12l8 4 8-4V6l-8-4zM12 22l-7-3.5V7.5L12 11l7-3.5v11L12 22zM12 13.5L4.5 9.75M19.5 9.75L12 13.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default PackageIcon;
