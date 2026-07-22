import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  itemLabel = "items",
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <View style={styles.paginationWrap}>
      <Text style={styles.paginationInfo}>
        Showing {startItem} - {endItem} of {totalItems} {itemLabel.toLowerCase()}
      </Text>
      
      <View style={styles.paginationControlsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            disabled={currentPage === 1}
            onPress={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? "#D1D5DB" : "#4B5563"} />
          </TouchableOpacity>

          {Array.from({ length: totalPages }).map((_, idx) => {
            const page = idx + 1;
            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
              return (
                <TouchableOpacity
                  key={page}
                  style={[styles.pageBtn, currentPage === page && styles.pageBtnActive]}
                  onPress={() => onPageChange(page)}
                >
                  <Text style={[styles.pageBtnTxt, currentPage === page && styles.pageBtnTxtActive]}>
                    {page}
                  </Text>
                </TouchableOpacity>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <Text key={`dot-${page}`} style={styles.dots}>
                  ...
                </Text>
              );
            }
            return null;
          })}

          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            disabled={currentPage === totalPages}
            onPress={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? "#D1D5DB" : "#4B5563"} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  paginationWrap: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: "center",
    overflow: "hidden",
  },
  paginationInfo: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
    textAlign: "center",
  },
  paginationControlsWrap: {
    width: "100%",
    overflow: "hidden",
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  pageBtn: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 8,
  },
  pageBtnActive: {
    backgroundColor: "#151D4F",
    borderColor: "#151D4F",
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnTxt: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: "#374151",
  },
  pageBtnTxtActive: {
    color: "#FFFFFF",
  },
  dots: {
    marginHorizontal: 4,
    color: "#9CA3AF",
  },
});
