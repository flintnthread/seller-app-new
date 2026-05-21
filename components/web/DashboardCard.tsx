import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { AppText } from "@/components/AppText";

interface DashboardCardProps {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  headerRight?: React.ReactNode;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  children,
  style,
  contentStyle,
  headerRight,
}) => {
  return (
    <View style={[styles.card, style]}>
      {(title || headerRight) && (
        <View style={styles.header}>
          {title ? <AppText style={styles.title}>{title}</AppText> : <View />}
          {headerRight && <View>{headerRight}</View>}
        </View>
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  title: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    color: "#111827",
  },
  content: {
    padding: 20,
  },
});
