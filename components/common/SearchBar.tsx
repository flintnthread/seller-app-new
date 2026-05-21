import React from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";

import { SearchIcon, CloseIcon } from "../icons";
import { C } from "../orders/orderConstants";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  placeholder = "Search by order ID or customer…",
}) => {
  return (
    <View style={styles.container}>
      <SearchIcon size={18} color={C.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        style={styles.input}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <CloseIcon size={16} color={C.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 50,
    ...Platform.select({
      ios: {
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    paddingVertical: 0,
    marginLeft: 10,
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
  },
});
