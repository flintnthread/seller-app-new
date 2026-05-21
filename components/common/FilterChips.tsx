import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { OrdersFilter, SortOption } from "../../features/orders/types";
import { statusMeta } from "../orders/orderConstants";

interface FilterChipsProps {
  filter: OrdersFilter;
  sort: SortOption;
  onRemoveStatus: () => void;
  onRemoveSort: () => void;
}

const sortLabels: Record<SortOption, string> = {
  latest: "Latest First",
  oldest: "Oldest First",
  status: "By Status",
  amount_desc: "High → Low",
  amount_asc: "Low → High",
};

export const FilterChips: React.FC<FilterChipsProps> = ({ filter, sort, onRemoveStatus, onRemoveSort }) => {
  if (filter.status === "all" && sort === "latest") {
    return null;
  }

  return (
    <View style={styles.container}>
      {filter.status !== "all" && (
        <View style={styles.chip}>
          <Text style={styles.text}>{statusMeta[filter.status].label}</Text>
          <TouchableOpacity onPress={onRemoveStatus} style={styles.remove}>
            <Text style={styles.removeText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      {sort !== "latest" && (
        <View style={styles.chip}>
          <Text style={styles.text}>{sortLabels[sort]}</Text>
          <TouchableOpacity onPress={onRemoveSort} style={styles.remove}>
            <Text style={styles.removeText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
    maxHeight: 38,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(184,147,90,0.10)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#B8935A",
  },
  text: {
    fontSize: 12,
    color: "#B8935A",
    fontWeight: "600",
  },
  remove: {
    marginLeft: 6,
  },
  removeText: {
    fontSize: 11,
    color: "#B8935A",
  },
});
