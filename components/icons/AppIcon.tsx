import React from "react";
import type { IconProps } from "./types";

interface AppIconProps extends IconProps {
  Icon: React.FC<IconProps> | React.ComponentType<IconProps>;
}

export const AppIcon: React.FC<AppIconProps> = ({ Icon, size, color }) => (
  <Icon size={size ?? 20} color={color ?? "#6b4f3a"} />
);
