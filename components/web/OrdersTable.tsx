import React from "react";
import { View, StyleSheet, Platform, TouchableOpacity, ScrollView } from "react-native";
import { AppText } from "@/components/AppText";

export interface Column<T> {
  key: string;
  title: string;
  render?: (item: T) => React.ReactNode;
  width?: number | string;
  align?: "left" | "center" | "right";
  nowrap?: boolean;
}

interface OrdersTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowPress?: (item: T) => void;
}

export function OrdersTable<T>({ data, columns, onRowPress }: OrdersTableProps<T>) {
  if (Platform.OS !== "web") return null;

  return (
    <View style={styles.tableContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            {columns.map((col) => (
              <View
                key={col.key}
                style={[
                  styles.headerCell,
                  col.width ? { width: col.width as any } : { flex: 1 },
                  col.nowrap && styles.cellNoWrap,
                  col.align === "right" && { alignItems: "flex-end" },
                  col.align === "center" && { alignItems: "center" },
                ]}
              >
                <AppText style={styles.headerText}>{col.title}</AppText>
              </View>
            ))}
          </View>

          {/* Table Body */}
          {data.map((item, index) => {
            const isLast = index === data.length - 1;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.row, !isLast && styles.rowBorder]}
                onPress={() => onRowPress && onRowPress(item)}
                disabled={!onRowPress}
                activeOpacity={0.7}
              >
                {columns.map((col) => (
                  <View
                    key={col.key}
                    style={[
                      styles.cell,
                      col.width ? { width: col.width as any } : { flex: 1 },
                      col.nowrap && styles.cellNoWrap,
                      col.align === "right" && { alignItems: "flex-end" },
                      col.align === "center" && { alignItems: "center" },
                    ]}
                  >
                    {col.render ? (
                      col.render(item)
                    ) : (
                      <AppText style={styles.cellText}>{String((item as any)[col.key] || "")}</AppText>
                    )}
                  </View>
                ))}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tableContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    width: "100%",
    maxWidth: "100%",
  },
  scrollContent: {
    minWidth: "100%",
  },
  table: {
    minWidth: 900,
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerCell: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  headerText: {
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cell: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: "center",
    overflow: "hidden",
  },
  cellNoWrap: {
    flexShrink: 0,
    ...Platform.select({
      web: {
        whiteSpace: "nowrap" as any,
        overflow: "visible" as any,
      },
    }),
  },
  cellText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: "#111827",
  },
});
