import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { OrderStatus } from "../../features/orders/types";
import { statusMeta } from "./orderConstants";
import { 
  PendingIcon, 
  CheckIcon, 
  EditIcon, 
  TruckIcon, 
  PackageIcon, 
  CloseIcon, 
  RefreshIcon 
} from "../icons";

interface StatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
}

const statusIcons: Record<OrderStatus, React.FC<any>> = {
  pending: PendingIcon,
  confirmed: CheckIcon,
  processing: EditIcon,
  shipped: TruckIcon,
  delivered: PackageIcon,
  cancelled: CloseIcon,
  refunded: RefreshIcon,
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const meta = statusMeta[status];
  const isSmall = size === "sm";
  const Icon = statusIcons[status];

  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }, isSmall && styles.badgeSm]}>
      <View style={styles.content}>
        {Icon && <Icon size={isSmall ? 12 : 14} color={meta.color} />}
        <Text style={[styles.badgeText, { color: meta.color }, isSmall && styles.badgeTextSm]}>
          {meta.label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  badgeTextSm: {
    fontSize: 11,
  },
});
