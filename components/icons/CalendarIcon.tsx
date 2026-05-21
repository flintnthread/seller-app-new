import Svg, { Path } from "react-native-svg";
import type { IconProps } from "./types";

const CalendarIcon = ({ size = 20, color = "#6b4f3a" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="none">
    <Path d="M19 4H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM19 20H5V10h14v10zM5 8V6h14v2H5z" fill={color} />
  </Svg>
);

export default CalendarIcon;
