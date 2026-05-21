import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { OrdersFilter, OrderStatus, SortOption } from "../../features/orders/types";
import { filterStyles } from "../../styles/orderStyles";
import { CalendarIcon, CloseIcon } from "../icons";
import { C, statusMeta } from "../orders/orderConstants";

interface FilterModalProps {
  visible: boolean;
  filter: OrdersFilter;
  sort: SortOption;
  onApply: (filter: OrdersFilter, sort: SortOption) => void;
  onClose: () => void;
}

const ALL_STATUSES: (OrderStatus | "all")[] = [
  "all",
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: "latest", label: "Latest First", icon: "↓" },
  { value: "oldest", label: "Oldest First", icon: "↑" },
  { value: "status", label: "By Status", icon: "◈" },
  { value: "amount_desc", label: "Amount: High → Low", icon: "↓₹" },
  { value: "amount_asc", label: "Amount: Low → High", icon: "↑₹" },
];

type DateFilterOption =
  | "today"
  | "yesterday"
  | "7days"
  | "30days"
  | "thisMonth"
  | "lastMonth"
  | "custom"
  | null;

const QUICK_DATE_OPTIONS: { value: DateFilterOption; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
];


const getDateRangeForFilter = (filter: DateFilterOption, startDate: Date | null, endDate: Date | null) => {
  if (filter === "custom" && startDate && endDate) {
    const from = new Date(startDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(endDate);
    to.setHours(23, 59, 59, 999);
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
  }

  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (filter) {
    case "today":
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case "7days":
      start.setDate(start.getDate() - 6);
      break;
    case "30days":
      start.setDate(start.getDate() - 29);
      break;
    case "thisMonth":
      start.setDate(1);
      break;
    case "lastMonth": {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthEnd = new Date(firstOfMonth);
      lastMonthEnd.setDate(0);
      const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
      lastMonthStart.setHours(0, 0, 0, 0);
      lastMonthEnd.setHours(23, 59, 59, 999);
      return { dateFrom: lastMonthStart.toISOString(), dateTo: lastMonthEnd.toISOString() };
    }
    default:
      return { dateFrom: undefined, dateTo: undefined };
  }

  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
};

const formatDisplayDate = (date: Date | null) =>
  date
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

const normalizeDateFilter = (filter: OrdersFilter): DateFilterOption => {
  if (!filter.dateFrom || !filter.dateTo) return null;
  const from = new Date(filter.dateFrom);
  const to = new Date(filter.dateTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const sameRange = (start: Date, end: Date) => from.getTime() === start.getTime() && to.getTime() === end.getTime();

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  const last7Start = new Date(todayStart);
  last7Start.setDate(last7Start.getDate() - 6);
  const last30Start = new Date(todayStart);
  last30Start.setDate(last30Start.getDate() - 29);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const lastMonthEnd = new Date(thisMonthStart);
  lastMonthEnd.setDate(0);
  lastMonthEnd.setHours(23, 59, 59, 999);
  const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
  lastMonthStart.setHours(0, 0, 0, 0);

  if (sameRange(todayStart, todayEnd)) return "today";
  if (sameRange(yesterdayStart, yesterdayEnd)) return "yesterday";
  if (sameRange(last7Start, todayEnd)) return "7days";
  if (sameRange(last30Start, todayEnd)) return "30days";
  if (sameRange(thisMonthStart, todayEnd)) return "thisMonth";
  if (sameRange(lastMonthStart, lastMonthEnd)) return "lastMonth";
  return "custom";
};

export const FilterModal: React.FC<FilterModalProps> = ({ visible, filter, sort, onApply, onClose }) => {
  const [localFilter, setLocalFilter] = useState<OrdersFilter>(filter);
  const [localSort, setLocalSort] = useState<SortOption>(sort);
  const [localDateFilter, setLocalDateFilter] = useState<DateFilterOption>(normalizeDateFilter(filter));
  const [localStartDate, setLocalStartDate] = useState<Date | null>(filter.dateFrom ? new Date(filter.dateFrom) : null);
  const [localEndDate, setLocalEndDate] = useState<Date | null>(filter.dateTo ? new Date(filter.dateTo) : null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    setLocalFilter(filter);
    setLocalSort(sort);
    setLocalDateFilter(normalizeDateFilter(filter));
    setLocalStartDate(filter.dateFrom ? new Date(filter.dateFrom) : null);
    setLocalEndDate(filter.dateTo ? new Date(filter.dateTo) : null);
  }, [visible, filter, sort]);

  const hasCustomRange = localDateFilter === "custom" && localStartDate && localEndDate;
  const isDateFilterActive = localDateFilter !== null && (localDateFilter !== "custom" || hasCustomRange);

  const activeCount =
    (localFilter.status !== "all" ? 1 : 0) +
    (isDateFilterActive ? 1 : 0) +
    (localSort !== "latest" ? 1 : 0);

  const onStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date | undefined) => {
    setShowStartPicker(Platform.OS === "ios");
    if (event.type === "set" && selectedDate) {
      setLocalStartDate(selectedDate);
      setLocalEndDate(null);
      setLocalDateFilter("custom");
      setShowEndPicker(false);
    }
  };

  const onEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date | undefined) => {
    setShowEndPicker(Platform.OS === "ios");
    if (event.type === "set" && selectedDate && localStartDate) {
      if (selectedDate < localStartDate) return;
      setLocalEndDate(selectedDate);
      setLocalDateFilter("custom");
    }
  };

  const handleQuickFilterSelect = (value: DateFilterOption) => {
    setLocalDateFilter(value);
    setLocalStartDate(null);
    setLocalEndDate(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
  };


  if (!visible) return null;

  return (
    <View style={filterStyles.overlay}>
      <SafeAreaView style={filterStyles.screen} edges={["top", "left", "right", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

        <View style={filterStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={filterStyles.title}>Filters</Text>
            <Text style={filterStyles.subtitle}>
              {activeCount > 0 ? `${activeCount} filter${activeCount > 1 ? "s" : ""} active` : "Showing all orders"}
            </Text>
          </View>
          <TouchableOpacity style={filterStyles.dismissBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <CloseIcon size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <View style={filterStyles.divider} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={[filterStyles.section, { paddingHorizontal: 0 }]}>
            <Text style={[filterStyles.sectionLabel, { paddingHorizontal: 20 }]}>ORDER STATUS</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.tabsContainer}
              style={{ marginTop: 12 }}
            >
              {ALL_STATUSES.map((status) => {
                const active = localFilter.status === status;
                const label = status === "all" ? "All Orders" : statusMeta[status as OrderStatus]?.label || status;
                
                return (
                  <TouchableOpacity
                    key={status}
                    activeOpacity={0.8}
                    style={[
                      styles.tab,
                      active ? styles.tabActive : styles.tabInactive
                    ]}
                    onPress={() => setLocalFilter({ ...localFilter, status })}
                  >
                    <Text style={[
                      styles.tabText,
                      active ? styles.tabTextActive : styles.tabTextInactive
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionLabel}>QUICK FILTERS</Text>
            <View style={filterStyles.statusGrid}>
              {QUICK_DATE_OPTIONS.map((option) => {
                const active = localDateFilter === option.value;
                return (
                  <TouchableOpacity
                    key={option.value ?? "none"}
                    style={[
                      filterStyles.statusChip,
                      active && { backgroundColor: "rgba(239,123,26,0.10)", borderColor: "#ef7b1a" },
                    ]}
                    onPress={() => handleQuickFilterSelect(option.value)}
                  >
                    <Text style={[filterStyles.statusChipText, active && { color: "#ef7b1a", fontWeight: "700" }]}>
                      {option.label}
                    </Text>
                    {active && <Text style={{ color: "#ef7b1a", fontSize: 13, fontWeight: "700", marginLeft: 4 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>


          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionLabel}>CUSTOM RANGE</Text>
            <View style={filterStyles.dateRow}>
              <TouchableOpacity
                style={[
                  filterStyles.dateInput,
                  localDateFilter === "custom" && filterStyles.dateInputActive,
                ]}
                onPress={() => {
                  setShowStartPicker(true);
                  setShowEndPicker(false);
                  setLocalDateFilter("custom");
                }}
              >
                <Text style={filterStyles.dateInputLabel}>Start Date</Text>
                <View style={filterStyles.dateInputRow}>
                  <Text style={filterStyles.dateInputText} numberOfLines={1}>
                    {localStartDate ? formatDisplayDate(localStartDate) : "Select Start Date"}
                  </Text>
                  <CalendarIcon size={16} color="#64748b" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  filterStyles.dateInput,
                  localDateFilter === "custom" && filterStyles.dateInputActive,
                  !localStartDate && { opacity: 0.5 },
                ]}
                onPress={() => localStartDate && setShowEndPicker(true)}
                disabled={!localStartDate}
              >
                <Text style={filterStyles.dateInputLabel}>End Date</Text>
                <View style={filterStyles.dateInputRow}>
                  <Text style={filterStyles.dateInputText} numberOfLines={1}>
                    {localEndDate ? formatDisplayDate(localEndDate) : "Select End Date"}
                  </Text>
                  <CalendarIcon size={16} color="#64748b" />
                </View>
              </TouchableOpacity>
            </View>
            {showStartPicker && (
              <DateTimePicker
                value={localStartDate ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                onChange={onStartDateChange}
                maximumDate={new Date()}
              />
            )}
            {showEndPicker && localStartDate && (
              <DateTimePicker
                value={localEndDate ?? localStartDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                onChange={onEndDateChange}
                minimumDate={localStartDate}
                maximumDate={new Date()}
              />
            )}
          </View>

          <View style={filterStyles.section}>
            <Text style={filterStyles.sectionLabel}>SORT BY</Text>
            <View style={filterStyles.sortList}>
              {SORT_OPTIONS.map((option) => {
                const active = localSort === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[filterStyles.sortRow, active && filterStyles.sortRowActive]}
                    onPress={() => setLocalSort(option.value)}
                  >
                    <View style={[filterStyles.sortIconBox, active && { backgroundColor: "rgba(239,123,26,0.10)", borderColor: "#ef7b1a" }]}> 
                      <Text style={[filterStyles.sortIcon, active && { color: "#ef7b1a" }]}>{option.icon}</Text>
                    </View>
                    <Text style={[filterStyles.sortLabel, active && { color: "#ef7b1a", fontWeight: "700" }]}>
                      {option.label}
                    </Text>
                    {active && (
                      <View style={filterStyles.sortActivePill}>
                        <Text style={filterStyles.sortActivePillText}>Selected</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={filterStyles.footer}>
          <TouchableOpacity
            style={filterStyles.resetBtn}
            onPress={() => {
              setLocalFilter({ status: "all", search: "" });
              setLocalSort("latest");
              setLocalDateFilter(null);
              setLocalStartDate(null);
              setLocalEndDate(null);
              setShowStartPicker(false);
              setShowEndPicker(false);
            }}
          >
            <Text style={filterStyles.resetBtnText}>Reset All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={filterStyles.applyBtn}
            onPress={() => {
              const dateRange = getDateRangeForFilter(localDateFilter, localStartDate, localEndDate);
              onApply(
                Object.fromEntries(
                  Object.entries({
                    ...localFilter,
                    dateFrom: dateRange.dateFrom,
                    dateTo: dateRange.dateTo,
                  }).filter(([_, v]) => v !== undefined)
                ) as unknown as OrdersFilter,
                localSort
              );
            }}
          >
            <Text style={filterStyles.applyBtnText}>Apply{activeCount > 0 ? ` (${activeCount})` : ""}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 4,
  },
  tab: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  tabActive: {
    backgroundColor: "#ef7b1a",
    borderColor: "#ef7b1a",
    ...Platform.select({
      ios: {
        shadowColor: "#ef7b1a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tabInactive: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  tabTextInactive: {
    color: "#334155",
  },
});
