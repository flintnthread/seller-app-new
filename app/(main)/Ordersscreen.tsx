/**
 * OrdersScreen.tsx  (v5 — responsive web: desktop / laptop / big screens)
 *
 * MOBILE  (<1024 px)  → 100% identical to v4, zero changes
 * DESKTOP (≥1024 px)  → blue header + floating overview card hidden,
 *                        dedicated desktop top-bar shown,
 *                        sort / filter open as centred modal dialogs,
 *                        order cards 3-per-row grid
 */

import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import type { Order, OrderStatus } from "./_ordersData";
import {
  getLiveOrder,
  getLiveOrders,
  subscribeToOrderChanges,
} from "./_ordersStore";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  navy: "#1E2B6B",
  navyDeep: "#151D4F",
  navyMid: "#1A2B5E",
  navyLight: "#2D3E8A",
  purple: "#6C63FF",
  purpleLight: "#A89CFF",
  purplePale: "#F0EEFF",
  green: "#22C55E",
  greenLight: "#86EFAC",
  greenPale: "#F0FDF4",
  red: "#EF4444",
  redLight: "#FCA5A5",
  redPale: "#FEF2F2",
  yellow: "#F59E0B",
  yellowPale: "#FFFBEB",
  blue: "#3B82F6",
  bluePale: "#EFF6FF",
  orange: "#F97316",
  orangePale: "#FFF7ED",
  teal: "#14B8A6",
  cyan: "#06B6D4",
  white: "#FFFFFF",
  bg: "#F7F8FC",
  card: "#FFFFFF",
  border: "#E5E7EB",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#9CA3AF",
};

const DESKTOP_BREAKPOINT = 1024;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type TabKey =
  | "All Orders"
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Returns"
  | "Cancelled";
type SortOption =
  | "newest"
  | "oldest"
  | "valueHighToLow"
  | "valueLowToHigh"
  | "statusPriority";
type PaymentFilterStatus = "All" | "Paid" | "Pending" | "COD" | "Refunded";
type OrderValueFilter =
  | "All"
  | "below500"
  | "500to1000"
  | "1000to2000"
  | "above2000";

interface FilterState {
  paymentStatus: PaymentFilterStatus;
  orderValue: OrderValueFilter;
  dateRange: "All" | "today" | "last7" | "last30" | "custom";
  customDateFrom: Date | null;
  customDateTo: Date | null;
}

const DEFAULT_FILTERS: FilterState = {
  paymentStatus: "All",
  orderValue: "All",
  dateRange: "All",
  customDateFrom: null,
  customDateTo: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Status / tab / sort config
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  { bg: string; text: string; color: string }
> = {
  Pending: { bg: C.bluePale, text: "Pending", color: C.blue },
  Processing: { bg: C.orangePale, text: "Processing", color: C.orange },
  Shipped: { bg: C.purplePale, text: "Shipped", color: C.purple },
  Delivered: { bg: C.greenPale, text: "Delivered", color: C.green },
  Returned: { bg: C.redPale, text: "Returned", color: C.red },
  Cancelled: { bg: C.bg, text: "Cancelled", color: C.textLight },
};

type IconLib = "Ionicons" | "MCIcons";
interface StatIconCfg {
  lib: IconLib;
  name: string;
  color: string;
  bg: string;
}

const STAT_ICONS: Partial<Record<string, StatIconCfg>> = {
  "All Orders": {
    lib: "MCIcons",
    name: "shopping-outline",
    color: C.navy,
    bg: "#E8EAF6",
  },
  Pending: {
    lib: "MCIcons",
    name: "clock-outline",
    color: C.orange,
    bg: C.orangePale,
  },
  Processing: {
    lib: "MCIcons",
    name: "package-variant",
    color: C.purple,
    bg: C.purplePale,
  },
  Shipped: {
    lib: "MCIcons",
    name: "truck-outline",
    color: C.blue,
    bg: C.bluePale,
  },
  Delivered: {
    lib: "Ionicons",
    name: "checkmark-circle-outline",
    color: C.green,
    bg: C.greenPale,
  },
  Returns: {
    lib: "MCIcons",
    name: "arrow-u-left-top",
    color: C.red,
    bg: C.redPale,
  },
  Cancelled: {
    lib: "Ionicons",
    name: "close-circle-outline",
    color: C.textLight,
    bg: C.bg,
  },
};

const TABS: { label: TabKey }[] = [
  { label: "All Orders" },
  { label: "Pending" },
  { label: "Processing" },
  { label: "Shipped" },
  { label: "Delivered" },
  { label: "Returns" },
  { label: "Cancelled" },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
  { label: "Order Value: High to Low", value: "valueHighToLow" },
  { label: "Order Value: Low to High", value: "valueLowToHigh" },
  { label: "Status Priority", value: "statusPriority" },
];

const STATUS_PRIORITY: Record<OrderStatus, number> = {
  Pending: 1,
  Processing: 2,
  Shipped: 3,
  Delivered: 4,
  Returned: 5,
  Cancelled: 6,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────────────────
const StatIcon: React.FC<{ cfg: StatIconCfg; size?: number }> = ({
  cfg,
  size = 22,
}) =>
  cfg.lib === "Ionicons" ? (
    <Ionicons name={cfg.name as any} size={size} color={cfg.color} />
  ) : (
    <MaterialCommunityIcons
      name={cfg.name as any}
      size={size}
      color={cfg.color}
    />
  );

// ─────────────────────────────────────────────────────────────────────────────
// Data helpers
// ─────────────────────────────────────────────────────────────────────────────
function deriveFlatOrders(): Order[] {
  return getLiveOrders().flatMap((d) => {
    const item = d.items[0];
    if (!item) return [];
    return [
      {
        id: d.id,
        date: d.date,
        product: item.name,
        variant: item.variant,
        qty: item.qty,
        price: item.price,
        status: d.status,
        customer: d.customer.name,
        image: item.image,
        ...(d.extraNote !== undefined ? { extra: d.extraNote } : {}),
      } as Order,
    ];
  });
}

function computeStats(orders: Order[]) {
  const counts = {
    "All Orders": orders.length,
    Pending: orders.filter((o) => o.status === "Pending").length,
    Processing: orders.filter((o) => o.status === "Processing").length,
    Shipped: orders.filter((o) => o.status === "Shipped").length,
    Delivered: orders.filter((o) => o.status === "Delivered").length,
    Returns: orders.filter((o) => o.status === "Returned").length,
    Cancelled: orders.filter((o) => o.status === "Cancelled").length,
  };
  return Object.entries(counts).map(([label, count]) => ({ label, count }));
}

const parsePrice = (price: string) => Number(price.replace(/[₹,]/g, ""));

function parseOrderDate(dateStr: string): Date {
  return new Date(dateStr.replace(",", ""));
}


// ─────────────────────────────────────────────────────────────────────────────
// DesktopListRow — table-style row for web list view only
// ─────────────────────────────────────────────────────────────────────────────
const DesktopListRow: React.FC<{ order: Order; isLast: boolean }> = ({ order, isLast }) => {
  const statusCfg = STATUS_CONFIG[order.status];
  const fullOrder = getLiveOrder(order.id);
  const payMethod = fullOrder?.payment.method ?? "—";
  const awb       = fullOrder ? getMockAWB(order.id, order.status) : null;
  if (!statusCfg) return null;

  return (
    <View style={[listRow.row, !isLast && listRow.rowBorder]}>
      {/* ORDER # */}
      <TouchableOpacity
        style={listRow.colOrderId}
        onPress={() => router.push({ pathname: "/(main)/orderDetails", params: { orderId: order.id } })}
        activeOpacity={0.75}
      >
        <Text style={listRow.orderIdText}>{order.id}</Text>
        <Text style={listRow.orderDateText}>{order.date}</Text>
      </TouchableOpacity>

      {/* CUSTOMER */}
      {/* CUSTOMER */}
      <View style={listRow.colCustomer}>
        <Text style={listRow.customerName}>{order.customer}</Text>
        <Text style={listRow.customerSub} numberOfLines={1}>
          {getLiveOrder(order.id)?.customer.address.split("\n").slice(-1)[0]?.trim() ?? order.variant}
        </Text>
      </View>

      {/* ITEMS */}
      <View style={listRow.colItems}>
        <View style={listRow.itemsPill}>
          <MaterialCommunityIcons name="package-variant-closed" size={12} color={C.textMid} style={{ marginRight: 4 }} />
          <Text style={listRow.itemsPillText}>{order.qty} item{order.qty > 1 ? "s" : ""}</Text>
        </View>
      </View>

      {/* AMOUNT */}
      <View style={listRow.colAmount}>
        <Text style={listRow.amountText}>{order.price}</Text>
      </View>

      {/* PAYMENT */}
      <View style={listRow.colPayment}>
        <View style={listRow.paymentPill}>
          <MaterialCommunityIcons name="credit-card-outline" size={11} color={C.textMid} style={{ marginRight: 4 }} />
          <Text style={listRow.paymentPillText}>{payMethod.includes("Cash") || payMethod.includes("COD") ? "COD" : payMethod.split(" ")[0]}</Text>
        </View>
      </View>

      {/* STATUS */}
      <View style={listRow.colStatus}>
        <View style={[listRow.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <MaterialCommunityIcons name="clock-outline" size={11} color={statusCfg.color} style={{ marginRight: 4 }} />
          <Text style={[listRow.statusText, { color: statusCfg.color }]}>{statusCfg.text}</Text>
        </View>
      </View>

      {/* TRACKING */}
      <View style={listRow.colTracking}>
        {awb ? (
          <>
            <Text style={listRow.awbText}>{awb.awb}</Text>
            <Text style={listRow.courierText}>{awb.courier}</Text>
          </>
        ) : (
          <Text style={listRow.awbMuted}>Awaiting AWB</Text>
        )}
      </View>

      {/* ACTIONS */}
      <View style={listRow.colActions}>
        {/* Eye — view order details */}
        <TouchableOpacity
          style={[listRow.actionBtn, { backgroundColor: "#4B3F2F" }]}
          onPress={() => router.push({ pathname: "/(main)/orderDetails", params: { orderId: order.id } })}
          activeOpacity={0.8}
        >
          <Ionicons name="eye-outline" size={15} color={C.white} />
        </TouchableOpacity>
        {/* Download — shipping label */}
        <TouchableOpacity
          style={[listRow.actionBtn, { backgroundColor: C.orange }]}
          onPress={() => router.push({ pathname: "/(main)/orderDetails", params: { orderId: order.id, openLabel: "1" } })}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={15} color={C.white} />
        </TouchableOpacity>
        {/* Sync — shiprocket tracking */}
        <TouchableOpacity
          style={[listRow.actionBtn, { backgroundColor: "#6B7280" }]}
          onPress={() => router.push({ pathname: "/(main)/orderDetails", params: { orderId: order.id } })}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="sync" size={15} color={C.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Helper to get mock AWB for list view (mirrors getMockShiprocketData logic)
function getMockAWB(orderId: string, status: string): { awb: string; courier: string } | null {
  if (status === "Pending" || status === "Cancelled") return null;
  return { awb: "80050999781", courier: "Blue Dart Air" };
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderCard — unchanged layout for mobile; slightly wider on desktop
// ─────────────────────────────────────────────────────────────────────────────
const OrderCard: React.FC<{ order: Order }> = ({ order }) => {
  const statusCfg = STATUS_CONFIG[order.status];
  if (!statusCfg) return null;
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardTopRow}>
        <View style={styles.orderCardLeft}>
          <Text style={styles.orderId}>{order.id}</Text>
          <Text style={styles.orderDate}>{order.date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {statusCfg.text}
          </Text>
        </View>
      </View>
      <View style={styles.productRow}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/(main)/orderDetails",
              params: { orderId: order.id },
            })
          }
          activeOpacity={0.85}
        >
          <Image source={{ uri: order.image }} style={styles.productImage} />
        </TouchableOpacity>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{order.product}</Text>
          <Text style={styles.productVariant}>{order.variant}</Text>
          <Text style={styles.productQty}>Qty: {order.qty}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.priceText}>{order.price}</Text>
          <Text
            style={styles.shippingLabelText}
            onPress={() =>
              router.push({
                pathname: "/(main)/orderDetails",
                params: { orderId: order.id, openLabel: "1" },
              })
            }
          >
            Shipping Label
          </Text>
        </View>
      </View>
      <View style={styles.orderCardBottom}>
        <Text style={styles.customerLabel}>
          <Text style={styles.customerKey}>Customer: </Text>
          {order.customer}
        </Text>
        <TouchableOpacity
          style={styles.viewDetailsBtn}
          onPress={() =>
            router.push({
              pathname: "/(main)/orderDetails",
              params: { orderId: order.id },
            })
          }
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons
            name="chevron-forward"
            size={13}
            color={C.navy}
            style={{ marginLeft: 2 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sheet heights (mobile bottom-sheets)
// ─────────────────────────────────────────────────────────────────────────────
const SHEET_HEIGHT = 420;
const FILTER_SHEET_HEIGHT = 600;

// ─────────────────────────────────────────────────────────────────────────────
// Desktop Modal: Sort
// ─────────────────────────────────────────────────────────────────────────────
const DesktopSortModal: React.FC<{
  visible: boolean;
  tempSortOption: SortOption;
  onChangeTempSort: (v: SortOption) => void;
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
}> = ({
  visible,
  tempSortOption,
  onChangeTempSort,
  onReset,
  onCancel,
  onApply,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <TouchableOpacity
      style={deskStyles.modalBackdrop}
      activeOpacity={1}
      onPress={onCancel}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={deskStyles.modalBox}
        onPress={() => {}}
      >
        <View style={deskStyles.modalHeader}>
          <Text style={deskStyles.modalTitle}>Sort Orders</Text>
          <TouchableOpacity onPress={onReset}>
            <Text style={deskStyles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
        {SORT_OPTIONS.map((option, index) => {
          const selected = tempSortOption === option.value;
          return (
            <React.Fragment key={option.value}>
              <TouchableOpacity
                style={styles.sheetOption}
                activeOpacity={0.75}
                onPress={() => onChangeTempSort(option.value)}
              >
                <Text
                  style={[
                    styles.sheetOptionText,
                    selected && styles.sheetOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                <View
                  style={[
                    styles.radioOuter,
                    selected && styles.radioOuterActive,
                  ]}
                >
                  {selected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
              {index !== SORT_OPTIONS.length - 1 && (
                <View style={styles.optionDivider} />
              )}
            </React.Fragment>
          );
        })}
        <View style={styles.sheetFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={onApply}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

// ─────────────────────────────────────────────────────────────────────────────
// Desktop Modal: Filter
// ─────────────────────────────────────────────────────────────────────────────
const DesktopFilterModal: React.FC<{
  visible: boolean;
  tempFilters: FilterState;
  activeFilterCount: number;
  onChangeTempFilters: (f: FilterState) => void;
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
}> = ({
  visible,
  tempFilters,
  activeFilterCount,
  onChangeTempFilters,
  onReset,
  onCancel,
  onApply,
}) => {
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={deskStyles.modalBackdrop}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[deskStyles.modalBox, deskStyles.filterModalBox]}
          onPress={() => {}}
        >
          <View style={deskStyles.modalHeader}>
            <Text style={deskStyles.modalTitle}>Filter Orders</Text>
            <TouchableOpacity onPress={onReset}>
              <Text style={deskStyles.resetText}>Reset All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Payment Status */}
            <Text style={styles.filterSectionLabel}>Payment Status</Text>
            <View style={styles.chipRow}>
              {(
                ["All", "Paid", "Pending", "COD", "Refunded"] as PaymentFilterStatus[]
              ).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.chip,
                    tempFilters.paymentStatus === opt && styles.chipActive,
                  ]}
                  onPress={() =>
                    onChangeTempFilters({ ...tempFilters, paymentStatus: opt })
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      tempFilters.paymentStatus === opt &&
                        styles.chipTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Order Value */}
            <Text style={[styles.filterSectionLabel, { marginTop: 20 }]}>
              Order Value
            </Text>
            <View style={styles.chipRow}>
              {(
                [
                  { label: "All", value: "All" },
                  { label: "< ₹500", value: "below500" },
                  { label: "₹500–1K", value: "500to1000" },
                  { label: "₹1K–2K", value: "1000to2000" },
                  { label: "> ₹2K", value: "above2000" },
                ] as { label: string; value: OrderValueFilter }[]
              ).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    tempFilters.orderValue === opt.value && styles.chipActive,
                  ]}
                  onPress={() =>
                    onChangeTempFilters({
                      ...tempFilters,
                      orderValue: opt.value,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      tempFilters.orderValue === opt.value &&
                        styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date Range */}
            <Text style={[styles.filterSectionLabel, { marginTop: 20 }]}>
              Date Range
            </Text>
            <View style={styles.chipRow}>
              {(
                [
                  { label: "All", value: "All" },
                  { label: "Today", value: "today" },
                  { label: "Last 7d", value: "last7" },
                  { label: "Last 30d", value: "last30" },
                  { label: "Custom", value: "custom" },
                ] as { label: string; value: FilterState["dateRange"] }[]
              ).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    tempFilters.dateRange === opt.value && styles.chipActive,
                  ]}
                  onPress={() =>
                    onChangeTempFilters({
                      ...tempFilters,
                      dateRange: opt.value,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      tempFilters.dateRange === opt.value &&
                        styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom date pickers */}
            {tempFilters.dateRange === "custom" && (
              <View style={styles.customDateRow}>
                <TouchableOpacity
                  style={styles.customDateBtn}
                  onPress={() => setShowFromPicker(true)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={C.navy}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.customDateText}>
                    {tempFilters.customDateFrom
                      ? tempFilters.customDateFrom.toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "From Date"}
                  </Text>
                </TouchableOpacity>
                <Text style={{ color: C.textLight, fontWeight: "600" }}>→</Text>
                <TouchableOpacity
                  style={styles.customDateBtn}
                  onPress={() => setShowToPicker(true)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={C.navy}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.customDateText}>
                    {tempFilters.customDateTo
                      ? tempFilters.customDateTo.toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "To Date"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {showFromPicker && (
              <DateTimePicker
                value={tempFilters.customDateFrom ?? new Date()}
                mode="date"
                display="default"
                {...(tempFilters.customDateTo
                  ? { maximumDate: tempFilters.customDateTo }
                  : {})}
                onChange={(_, date) => {
                  setShowFromPicker(false);
                  if (date)
                    onChangeTempFilters({
                      ...tempFilters,
                      customDateFrom: date,
                    });
                }}
              />
            )}

            {showToPicker && (
              <DateTimePicker
                value={tempFilters.customDateTo ?? new Date()}
                mode="date"
                display="default"
                {...(tempFilters.customDateFrom
                  ? { minimumDate: tempFilters.customDateFrom }
                  : {})}
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowToPicker(false);
                  if (date)
                    onChangeTempFilters({
                      ...tempFilters,
                      customDateTo: date,
                    });
                }}
              />
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={onApply}>
              <Text style={styles.applyBtnText}>
                Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [activeTab, setActiveTab] = useState<TabKey>("All Orders");
  const [search, setSearch] = useState("");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [tempSortOption, setTempSortOption] = useState<SortOption>("newest");

  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [tempFilters, setTempFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [liveOrders, setLiveOrders] = useState<Order[]>(deriveFlatOrders);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const onRefresh = () => {
    setRefreshing(true);
    setLiveOrders(deriveFlatOrders());
    setTimeout(() => setRefreshing(false), 800);
  };

  useEffect(() => {
    const unsub = subscribeToOrderChanges(() =>
      setLiveOrders(deriveFlatOrders()),
    );
    return unsub;
  }, []);

  const stats = computeStats(liveOrders);

  // ── Sort sheet animation (mobile only) ────────────────────────────────────
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const openSortSheet = () => {
    setTempSortOption(sortOption);
    if (isDesktop) {
      setSheetVisible(true);
      return;
    }
    setSheetVisible(true);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSortSheet = (discard = true) => {
    if (isDesktop) {
      if (discard) setTempSortOption(sortOption);
      setSheetVisible(false);
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (discard) setTempSortOption(sortOption);
      setSheetVisible(false);
    });
  };

  // ── Filter sheet animation (mobile only) ──────────────────────────────────
  const filterTranslateY = useRef(
    new Animated.Value(FILTER_SHEET_HEIGHT),
  ).current;
  const filterOverlayOpacity = useRef(new Animated.Value(0)).current;

  const openFilterSheet = () => {
    setTempFilters(filters);
    if (isDesktop) {
      setFilterVisible(true);
      return;
    }
    setFilterVisible(true);
    Animated.parallel([
      Animated.timing(filterTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(filterOverlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeFilterSheet = (discard = true) => {
    if (isDesktop) {
      if (discard) setTempFilters(filters);
      setFilterVisible(false);
      return;
    }
    Animated.parallel([
      Animated.timing(filterTranslateY, {
        toValue: FILTER_SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(filterOverlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (discard) setTempFilters(filters);
      setFilterVisible(false);
    });
  };

  const activeFilterCount = [
    filters.paymentStatus !== "All",
    filters.orderValue !== "All",
    filters.dateRange !== "All",
  ].filter(Boolean).length;

  // ── Sort sheet PanResponder (mobile only) ─────────────────────────────────
  const sortPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 5 && Math.abs(gs.dx) < Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
          overlayOpacity.setValue(1 - Math.min(gs.dy / SHEET_HEIGHT, 1));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: SHEET_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => setSheetVisible(false));
        } else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }),
            Animated.timing(overlayOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  // ── Filter sheet PanResponder (mobile only) ───────────────────────────────
  const filterPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 5 && Math.abs(gs.dx) < Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          filterTranslateY.setValue(gs.dy);
          filterOverlayOpacity.setValue(
            1 - Math.min(gs.dy / FILTER_SHEET_HEIGHT, 1),
          );
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          Animated.parallel([
            Animated.timing(filterTranslateY, {
              toValue: FILTER_SHEET_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(filterOverlayOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => setFilterVisible(false));
        } else {
          Animated.parallel([
            Animated.spring(filterTranslateY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }),
            Animated.timing(filterOverlayOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  // ── Filter + Search + Tab ─────────────────────────────────────────────────
  const filteredOrders = liveOrders.filter((order) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      order.id.toLowerCase().includes(query) ||
      order.customer.toLowerCase().includes(query) ||
      order.product.toLowerCase().includes(query) ||
      order.status.toLowerCase().includes(query);

    const matchesTab =
      activeTab === "All Orders" ||
      (activeTab === "Returns" && order.status === "Returned") ||
      order.status === activeTab;

    const fullOrder = getLiveOrder(order.id);
    const payMethod = fullOrder?.payment.method.toLowerCase() ?? "";
    const payStatus = fullOrder?.payment.status ?? "";
    const matchesPayment =
      filters.paymentStatus === "All" ||
      (filters.paymentStatus === "Paid" && payStatus === "Paid") ||
      (filters.paymentStatus === "Pending" && payStatus === "Pending") ||
      (filters.paymentStatus === "Refunded" && payStatus === "Refunded") ||
      (filters.paymentStatus === "COD" && payMethod.includes("cash"));

    const numericPrice = parsePrice(order.price);
    const matchesValue =
      filters.orderValue === "All" ||
      (filters.orderValue === "below500" && numericPrice < 500) ||
      (filters.orderValue === "500to1000" &&
        numericPrice >= 500 &&
        numericPrice <= 1000) ||
      (filters.orderValue === "1000to2000" &&
        numericPrice > 1000 &&
        numericPrice <= 2000) ||
      (filters.orderValue === "above2000" && numericPrice > 2000);

    const orderDate = parseOrderDate(order.date);
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const matchesDate =
      filters.dateRange === "All" ||
      (filters.dateRange === "today" && orderDate >= startOfToday) ||
      (filters.dateRange === "last7" &&
        orderDate >= new Date(now.getTime() - 7 * 86400000)) ||
      (filters.dateRange === "last30" &&
        orderDate >= new Date(now.getTime() - 30 * 86400000)) ||
      (filters.dateRange === "custom" &&
        (!filters.customDateFrom || orderDate >= filters.customDateFrom) &&
        (!filters.customDateTo || orderDate <= filters.customDateTo));

    return (
      matchesSearch &&
      matchesTab &&
      matchesPayment &&
      matchesValue &&
      matchesDate
    );
  });

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortOption) {
      case "oldest":
        return a.id.localeCompare(b.id);
      case "valueHighToLow":
        return parsePrice(b.price) - parsePrice(a.price);
      case "valueLowToHigh":
        return parsePrice(a.price) - parsePrice(b.price);
      case "statusPriority":
        return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      default:
        return b.id.localeCompare(a.id);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Shared toolbar content (tabs + search/sort/filter + pills + totals)
  // ─────────────────────────────────────────────────────────────────────────
  const renderToolbar = () => (
    <>
      {/* Tabs */}
      {isDesktop ? (
        <View style={deskStyles.desktopTabsContainer}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tab, activeTab === tab.label && styles.tabActive, deskStyles.desktopTab]}
              onPress={() => setActiveTab(tab.label)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.label && styles.tabTextActive,
                  deskStyles.desktopTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tab, activeTab === tab.label && styles.tabActive]}
              onPress={() => setActiveTab(tab.label)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.label && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Search + Sort + Filter Row  (+ inline totals on desktop) */}
      {isDesktop ? (
        /* ── DESKTOP: single full-width bar ── */
        <View style={deskStyles.desktopToolRow}>
          {/* Search */}
          <View style={deskStyles.desktopSearchBox}>
            <Ionicons
              name="search-outline"
              size={16}
              color={C.textLight}
              style={{ marginRight: 6 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Order ID / Customer"
              placeholderTextColor={C.textLight}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Sort */}
          <TouchableOpacity style={styles.sortBtn} onPress={openSortSheet}>
            <Ionicons name="swap-vertical-outline" size={16} color={C.textMid} />
            <Text style={styles.sortText}> Sort</Text>
          </TouchableOpacity>

          {/* Filter */}
          <TouchableOpacity
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={openFilterSheet}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={activeFilterCount > 0 ? C.white : C.textMid}
            />
            <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: C.white }]}>
              {" "}Filter
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* View Mode Toggle */}
          <View style={deskStyles.viewToggleWrap}>
            <TouchableOpacity
              style={[deskStyles.viewToggleBtn, viewMode === "grid" && deskStyles.viewToggleBtnActive]}
              onPress={() => setViewMode("grid")}
            >
              <MaterialCommunityIcons name="view-grid-outline" size={16} color={viewMode === "grid" ? C.white : C.textMid} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[deskStyles.viewToggleBtn, viewMode === "list" && deskStyles.viewToggleBtnActive]}
              onPress={() => setViewMode("list")}
            >
              <MaterialCommunityIcons name="view-list-outline" size={16} color={viewMode === "list" ? C.white : C.textMid} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={deskStyles.toolRowDivider} />

          {/* Total Orders mini-card */}
          <View style={deskStyles.inlineStat}>
            <View style={[deskStyles.inlineStatIcon, { backgroundColor: "#EEF0FA" }]}>
              <MaterialCommunityIcons name="clipboard-list-outline" size={18} color={C.navy} />
            </View>
            <View>
              <Text style={deskStyles.inlineStatLabel}>Total Orders</Text>
              <Text style={deskStyles.inlineStatValue}>{liveOrders.length}</Text>
            </View>
          </View>

          {/* Total Sale mini-card */}
          <View style={deskStyles.inlineStat}>
            <View style={[deskStyles.inlineStatIcon, { backgroundColor: "#EEF0FA" }]}>
              <MaterialCommunityIcons name="wallet-outline" size={18} color={C.navy} />
            </View>
            <View>
              <Text style={deskStyles.inlineStatLabel}>Total Sale</Text>
              <Text style={[deskStyles.inlineStatValue, { color: C.navy }]}>
                ₹{liveOrders.reduce((sum, o) => sum + parsePrice(o.price), 0).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        /* ── MOBILE: original separate rows ── */
        <>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={16}
                color={C.textLight}
                style={{ marginRight: 6 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Order ID / Customer"
                placeholderTextColor={C.textLight}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity style={styles.sortBtn} onPress={openSortSheet}>
              <Ionicons name="swap-vertical-outline" size={16} color={C.textMid} />
              <Text style={styles.sortText}> Sort</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
              onPress={openFilterSheet}
            >
              <Ionicons
                name="options-outline"
                size={16}
                color={activeFilterCount > 0 ? C.white : C.textMid}
              />
              <Text style={[styles.filterBtnText, activeFilterCount > 0 && { color: C.white }]}>
                {" "}Filter
              </Text>
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.totalsRow}>
            <View style={styles.totalCard}>
              <View style={[styles.totalIconWrap, { backgroundColor: "#EEF0FA" }]}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={22} color={C.navy} />
              </View>
              <View style={styles.totalCardText}>
                <Text style={styles.totalCardLabel}>Total Orders</Text>
                <Text style={styles.totalCardValue}>{liveOrders.length}</Text>
              </View>
            </View>
            <View style={styles.totalVerticalDivider} />
            <View style={styles.totalCard}>
              <View style={[styles.totalIconWrap, { backgroundColor: "#EEF0FA" }]}>
                <MaterialCommunityIcons name="wallet-outline" size={22} color={C.navy} />
              </View>
              <View style={styles.totalCardText}>
                <Text style={styles.totalCardLabel}>Total Sale</Text>
                <Text style={[styles.totalCardValue, { color: C.navy }]}>
                  ₹{liveOrders.reduce((sum, o) => sum + parsePrice(o.price), 0).toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <View
          style={[
            styles.activePillsRow,
            isDesktop && deskStyles.desktopPillsRow,
          ]}
        >
          {filters.paymentStatus !== "All" && (
            <View style={styles.activePill}>
              <MaterialCommunityIcons
                name="credit-card-outline"
                size={12}
                color={C.navy}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.activePillText}>
                {filters.paymentStatus}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setFilters((f) => ({ ...f, paymentStatus: "All" }))
                }
              >
                <Ionicons
                  name="close"
                  size={12}
                  color={C.navy}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>
          )}
          {filters.orderValue !== "All" && (
            <View style={styles.activePill}>
              <MaterialCommunityIcons
                name="currency-inr"
                size={12}
                color={C.navy}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.activePillText}>
                {filters.orderValue === "below500"
                  ? "< ₹500"
                  : filters.orderValue === "500to1000"
                  ? "₹500–1K"
                  : filters.orderValue === "1000to2000"
                  ? "₹1K–2K"
                  : "> ₹2K"}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setFilters((f) => ({ ...f, orderValue: "All" }))
                }
              >
                <Ionicons
                  name="close"
                  size={12}
                  color={C.navy}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>
          )}
          {filters.dateRange !== "All" && (
            <View style={styles.activePill}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={C.navy}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.activePillText}>
                {filters.dateRange === "today"
                  ? "Today"
                  : filters.dateRange === "last7"
                  ? "Last 7d"
                  : filters.dateRange === "last30"
                  ? "Last 30d"
                  : "Custom"}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setFilters((f) => ({
                    ...f,
                    dateRange: "All",
                    customDateFrom: null,
                    customDateTo: null,
                  }))
                }
              >
                <Ionicons
                  name="close"
                  size={12}
                  color={C.navy}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={() => setFilters(DEFAULT_FILTERS)}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <SafeAreaView style={deskStyles.safeArea}>
        {/* Main content area */}
        <ScrollView
          style={deskStyles.desktopScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.orange]}
              tintColor={C.orange}
            />
          }
        >
          {renderToolbar()}

          {/* Orders Grid or List — desktop only */}
          {sortedOrders.length > 0 ? (
            viewMode === "grid" ? (
              <View style={deskStyles.desktopGrid}>
                {sortedOrders.map((order) => (
                  <View key={order.id} style={deskStyles.desktopGridItem}>
                    <OrderCard order={order} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={deskStyles.desktopList}>
                {/* Table header */}
                <View style={listRow.headerRow}>
                  <View style={listRow.colOrderId}><Text style={listRow.headerCell}>ORDER #</Text></View>
                  <View style={listRow.colCustomer}><Text style={listRow.headerCell}>CUSTOMER</Text></View>
                  <View style={listRow.colItems}><Text style={[listRow.headerCell, { textAlign:"center" }]}>ITEMS</Text></View>
                  <View style={listRow.colAmount}><Text style={[listRow.headerCell, { textAlign:"right" }]}>AMOUNT</Text></View>
                  <View style={listRow.colPayment}><Text style={[listRow.headerCell, { textAlign:"center" }]}>PAYMENT</Text></View>
                  <View style={listRow.colStatus}><Text style={[listRow.headerCell, { textAlign:"center" }]}>STATUS</Text></View>
                  <View style={listRow.colTracking}><Text style={listRow.headerCell}>TRACKING</Text></View>
                  <View style={listRow.colActions}><Text style={[listRow.headerCell, { textAlign:"right" }]}>ACTION</Text></View>
                </View>
                {/* Table rows */}
                {sortedOrders.map((order, idx) => (
                  <DesktopListRow
                    key={order.id}
                    order={order}
                    isLast={idx === sortedOrders.length - 1}
                  />
                ))}
              </View>
            )
          ) : (
            <View style={deskStyles.desktopGrid}>
              <View style={[styles.emptyState, deskStyles.desktopEmptyState]}>
                <Ionicons name="search-outline" size={40} color={C.textLight} />
                <Text style={styles.emptyStateTitle}>No Orders Found</Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity
                    style={styles.emptyResetBtn}
                    onPress={() => setFilters(DEFAULT_FILTERS)}
                  >
                    <Text style={styles.emptyResetText}>Clear Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Desktop Sort Modal */}
        <DesktopSortModal
          visible={sheetVisible}
          tempSortOption={tempSortOption}
          onChangeTempSort={setTempSortOption}
          onReset={() => setTempSortOption("newest")}
          onCancel={() => closeSortSheet(true)}
          onApply={() => {
            setSortOption(tempSortOption);
            closeSortSheet(false);
          }}
        />

        {/* Desktop Filter Modal */}
        <DesktopFilterModal
          visible={filterVisible}
          tempFilters={tempFilters}
          activeFilterCount={activeFilterCount}
          onChangeTempFilters={setTempFilters}
          onReset={() => setTempFilters(DEFAULT_FILTERS)}
          onCancel={() => closeFilterSheet(true)}
          onApply={() => {
            setFilters(tempFilters);
            closeFilterSheet(false);
          }}
        />
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE LAYOUT — 100% identical to v4
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={styles.blueSection}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Orders</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => router.push("/(main)/notifications")}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={C.white}
              />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.overviewCard}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text style={styles.overviewTitle}>Orders Overview</Text>
            <TouchableOpacity>
              <Text
                style={{
                  color: C.navy,
                  fontSize: 12,
                  fontWeight: "700",
                  marginBottom: 8,
                }}
              >
                View Analytics
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScrollContent}
          >
            {stats.map((stat, index) => {
              const iconCfg = STAT_ICONS[stat.label];
              if (!iconCfg) return null;
              return (
                <React.Fragment key={stat.label}>
                  {index > 0 && <View style={styles.statDivider} />}
                  <View style={styles.statItem}>
                    <View
                      style={[
                        styles.iconWrapper,
                        { backgroundColor: iconCfg.bg },
                      ]}
                    >
                      <StatIcon cfg={iconCfg} />
                    </View>
                    <Text style={styles.statCount}>{stat.count}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.orange]}
            tintColor={C.orange}
          />
        }
      >
        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.label}
              style={[
                styles.tab,
                activeTab === tab.label && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.label)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.label && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search + Sort + Filter Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={16}
              color={C.textLight}
              style={{ marginRight: 6 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Order ID / Customer"
              placeholderTextColor={C.textLight}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.sortBtn} onPress={openSortSheet}>
            <Ionicons
              name="swap-vertical-outline"
              size={16}
              color={C.textMid}
            />
            <Text style={styles.sortText}> Sort</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              activeFilterCount > 0 && styles.filterBtnActive,
            ]}
            onPress={openFilterSheet}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={activeFilterCount > 0 ? C.white : C.textMid}
            />
            <Text
              style={[
                styles.filterBtnText,
                activeFilterCount > 0 && { color: C.white },
              ]}
            >
              {" "}
              Filter
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Totals Row */}
        <View style={styles.totalsRow}>
          <View style={styles.totalCard}>
            <View
              style={[styles.totalIconWrap, { backgroundColor: "#EEF0FA" }]}
            >
              <MaterialCommunityIcons
                name="clipboard-list-outline"
                size={22}
                color={C.navy}
              />
            </View>
            <View style={styles.totalCardText}>
              <Text style={styles.totalCardLabel}>Total Orders</Text>
              <Text style={styles.totalCardValue}>{liveOrders.length}</Text>
            </View>
          </View>
          <View style={styles.totalVerticalDivider} />
          <View style={styles.totalCard}>
            <View
              style={[styles.totalIconWrap, { backgroundColor: "#EEF0FA" }]}
            >
              <MaterialCommunityIcons
                name="wallet-outline"
                size={22}
                color={C.navy}
              />
            </View>
            <View style={styles.totalCardText}>
              <Text style={styles.totalCardLabel}>Total Sale</Text>
              <Text style={[styles.totalCardValue, { color: C.navy }]}>
                ₹
                {liveOrders
                  .reduce((sum, o) => sum + parsePrice(o.price), 0)
                  .toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <View style={styles.activePillsRow}>
            {filters.paymentStatus !== "All" && (
              <View style={styles.activePill}>
                <MaterialCommunityIcons
                  name="credit-card-outline"
                  size={12}
                  color={C.navy}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.activePillText}>
                  {filters.paymentStatus}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setFilters((f) => ({ ...f, paymentStatus: "All" }))
                  }
                >
                  <Ionicons
                    name="close"
                    size={12}
                    color={C.navy}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </View>
            )}
            {filters.orderValue !== "All" && (
              <View style={styles.activePill}>
                <MaterialCommunityIcons
                  name="currency-inr"
                  size={12}
                  color={C.navy}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.activePillText}>
                  {filters.orderValue === "below500"
                    ? "< ₹500"
                    : filters.orderValue === "500to1000"
                    ? "₹500–1K"
                    : filters.orderValue === "1000to2000"
                    ? "₹1K–2K"
                    : "> ₹2K"}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setFilters((f) => ({ ...f, orderValue: "All" }))
                  }
                >
                  <Ionicons
                    name="close"
                    size={12}
                    color={C.navy}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </View>
            )}
            {filters.dateRange !== "All" && (
              <View style={styles.activePill}>
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={C.navy}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.activePillText}>
                  {filters.dateRange === "today"
                    ? "Today"
                    : filters.dateRange === "last7"
                    ? "Last 7d"
                    : filters.dateRange === "last30"
                    ? "Last 30d"
                    : "Custom"}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setFilters((f) => ({
                      ...f,
                      dateRange: "All",
                      customDateFrom: null,
                      customDateTo: null,
                    }))
                  }
                >
                  <Ionicons
                    name="close"
                    size={12}
                    color={C.navy}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={() => setFilters(DEFAULT_FILTERS)}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Orders List */}
        <View style={styles.ordersListContainer}>
          {sortedOrders.length > 0 ? (
            sortedOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={C.textLight} />
              <Text style={styles.emptyStateTitle}>No Orders Found</Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={() => setFilters(DEFAULT_FILTERS)}
                >
                  <Text style={styles.emptyResetText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── BOTTOM TAB BAR ── */}
      {Platform.OS !== 'web' && (
        <View style={styles.bottomTabBar}>
          {[
            { icon: "home-outline", iconActive: "home", label: "Home", active: false, color: "#2563EB", colorMuted: "#60A5FA", route: "/(main)/dashboard" },
            { icon: "shopping-outline", iconActive: "shopping", label: "Products", active: false, color: "#7C3AED", colorMuted: "#A78BFA", route: "/(main)/productmanagement" },
            { icon: "clipboard-list-outline", iconActive: "clipboard-list", label: "Orders", active: true, color: "#EA6000", colorMuted: "#FB923C", route: "/(main)/Ordersscreen", badge: 12 },
            { icon: "account-outline", iconActive: "account", label: "Profile", active: false, color: "#10B981", colorMuted: "#34D399", route: "/(main)/Profile" },
          ].map((tab, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.tabItem} 
              activeOpacity={0.7} 
              onPress={() => {
                if (!tab.active) router.push(tab.route as any);
              }}
            >
              <View style={{ position: "relative" }}>
                <MaterialCommunityIcons 
                  name={(tab.active ? tab.iconActive : tab.icon) as any} 
                  size={24} 
                  color={tab.active ? tab.color : tab.colorMuted} 
                />
                {tab.badge && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, { color: tab.active ? tab.color : tab.colorMuted }, tab.active && { fontWeight: "600" }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Sort Overlay ── */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={sheetVisible ? "auto" : "none"}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => closeSortSheet(true)}
        />
      </Animated.View>

      {/* ── Sort Bottom Sheet ── */}
      <Animated.View
        style={[styles.sortBottomSheet, { transform: [{ translateY }] }]}
        pointerEvents={sheetVisible ? "auto" : "none"}
      >
        <View style={styles.handleArea} {...sortPanResponder.panHandlers}>
          <View style={styles.dragHandle} />
        </View>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Sort Orders</Text>
          <TouchableOpacity
            onPress={() => setTempSortOption("newest")}
            activeOpacity={0.7}
          >
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
        {SORT_OPTIONS.map((option, index) => {
          const selected = tempSortOption === option.value;
          return (
            <React.Fragment key={option.value}>
              <TouchableOpacity
                style={styles.sheetOption}
                activeOpacity={0.75}
                onPress={() => setTempSortOption(option.value)}
              >
                <Text
                  style={[
                    styles.sheetOptionText,
                    selected && styles.sheetOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                <View
                  style={[
                    styles.radioOuter,
                    selected && styles.radioOuterActive,
                  ]}
                >
                  {selected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
              {index !== SORT_OPTIONS.length - 1 && (
                <View style={styles.optionDivider} />
              )}
            </React.Fragment>
          );
        })}
        <View style={styles.sheetFooter}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => closeSortSheet(true)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => {
              setSortOption(tempSortOption);
              closeSortSheet(false);
            }}
          >
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Filter Overlay ── */}
      <Animated.View
        style={[styles.overlay, { opacity: filterOverlayOpacity }]}
        pointerEvents={filterVisible ? "auto" : "none"}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => closeFilterSheet(true)}
        />
      </Animated.View>

      {/* ── Filter Bottom Sheet ── */}
      <Animated.View
        style={[
          styles.filterBottomSheet,
          { transform: [{ translateY: filterTranslateY }] },
        ]}
        pointerEvents={filterVisible ? "auto" : "none"}
      >
        <View style={styles.handleArea} {...filterPanResponder.panHandlers}>
          <View style={styles.dragHandle} />
        </View>

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Filter Orders</Text>
          <TouchableOpacity
            onPress={() => setTempFilters(DEFAULT_FILTERS)}
            activeOpacity={0.7}
          >
            <Text style={styles.resetText}>Reset All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <Text style={styles.filterSectionLabel}>Payment Status</Text>
          <View style={styles.chipRow}>
            {(
              ["All", "Paid", "Pending", "COD", "Refunded"] as PaymentFilterStatus[]
            ).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  tempFilters.paymentStatus === opt && styles.chipActive,
                ]}
                onPress={() =>
                  setTempFilters((p) => ({ ...p, paymentStatus: opt }))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    tempFilters.paymentStatus === opt && styles.chipTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterSectionLabel, { marginTop: 20 }]}>
            Order Value
          </Text>
          <View style={styles.chipRow}>
            {(
              [
                { label: "All", value: "All" },
                { label: "< ₹500", value: "below500" },
                { label: "₹500–1K", value: "500to1000" },
                { label: "₹1K–2K", value: "1000to2000" },
                { label: "> ₹2K", value: "above2000" },
              ] as { label: string; value: OrderValueFilter }[]
            ).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  tempFilters.orderValue === opt.value && styles.chipActive,
                ]}
                onPress={() =>
                  setTempFilters((p) => ({ ...p, orderValue: opt.value }))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    tempFilters.orderValue === opt.value &&
                      styles.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterSectionLabel, { marginTop: 20 }]}>
            Date Range
          </Text>
          <View style={styles.chipRow}>
            {(
              [
                { label: "All", value: "All" },
                { label: "Today", value: "today" },
                { label: "Last 7d", value: "last7" },
                { label: "Last 30d", value: "last30" },
                { label: "Custom", value: "custom" },
              ] as { label: string; value: FilterState["dateRange"] }[]
            ).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  tempFilters.dateRange === opt.value && styles.chipActive,
                ]}
                onPress={() =>
                  setTempFilters((p) => ({ ...p, dateRange: opt.value }))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    tempFilters.dateRange === opt.value &&
                      styles.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tempFilters.dateRange === "custom" && (
            <View style={styles.customDateRow}>
              <TouchableOpacity
                style={styles.customDateBtn}
                onPress={() => setShowFromPicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={C.navy}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.customDateText}>
                  {tempFilters.customDateFrom
                    ? tempFilters.customDateFrom.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "From Date"}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: C.textLight, fontWeight: "600" }}>→</Text>
              <TouchableOpacity
                style={styles.customDateBtn}
                onPress={() => setShowToPicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={C.navy}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.customDateText}>
                  {tempFilters.customDateTo
                    ? tempFilters.customDateTo.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "To Date"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {showFromPicker && (
            <DateTimePicker
              value={tempFilters.customDateFrom ?? new Date()}
              mode="date"
              display="default"
              {...(tempFilters.customDateTo
                ? { maximumDate: tempFilters.customDateTo }
                : {})}
              onChange={(_, date) => {
                setShowFromPicker(false);
                if (date)
                  setTempFilters((p) => ({ ...p, customDateFrom: date }));
              }}
            />
          )}

          {showToPicker && (
            <DateTimePicker
              value={tempFilters.customDateTo ?? new Date()}
              mode="date"
              display="default"
              {...(tempFilters.customDateFrom
                ? { minimumDate: tempFilters.customDateFrom }
                : {})}
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowToPicker(false);
                if (date) setTempFilters((p) => ({ ...p, customDateTo: date }));
              }}
            />
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        <View style={styles.sheetFooter}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => closeFilterSheet(true)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => {
              setFilters(tempFilters);
              closeFilterSheet(false);
            }}
          >
            <Text style={styles.applyBtnText}>
              Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile StyleSheet — 100% unchanged from v4
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg, position: "relative" },
  blueSection: { backgroundColor: C.navy, paddingBottom: 55, borderRadius: 15 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 28,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTitle: { flex: 1, color: C.white, fontSize: 23, fontWeight: "800" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  scrollView: { flex: 1, backgroundColor: C.bg, marginTop: 75 },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: C.navy,
  },
  notificationBadgeText: {
    color: C.white,
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 11,
  },
  overviewCard: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: -65,
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 10,
    elevation: 8,
  },
  overviewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 8,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statsScrollContent: { paddingBottom: 2, alignItems: "center" },
  statItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  statDivider: {
    width: 1,
    height: 68,
    backgroundColor: C.border,
    alignSelf: "center",
  },
  statCount: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
    color: C.textDark,
  },
  statLabel: {
    fontSize: 9,
    color: C.textDark,
    marginTop: 1,
    textAlign: "center",
  },
  tabsContainer: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tabsContent: { paddingHorizontal: 12 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginRight: 4,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: C.orange },
  tabText: { fontSize: 13, color: C.textMid, fontWeight: "500" },
  tabTextActive: { color: C.orange, fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 11, color: C.textDark, padding: 0, outlineWidth: 0 },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  sortText: { fontSize: 11, color: C.textMid, fontWeight: "600" },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    position: "relative",
  },
  filterBtnActive: { backgroundColor: C.navy, borderColor: C.navy },
  filterBtnText: { fontSize: 11, color: C.textMid, fontWeight: "600" },
  filterBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { color: C.white, fontSize: 9, fontWeight: "800" },
  activePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
    alignItems: "center",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF0FA",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.navy + "30",
  },
  activePillText: { fontSize: 11, color: C.navy, fontWeight: "600" },
  clearAllText: {
    fontSize: 11,
    color: C.red,
    fontWeight: "700",
    marginLeft: 4,
  },
  totalsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 1,
  },
  totalCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  totalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  totalVerticalDivider: {
    width: 1,
    height: 44,
    backgroundColor: C.border,
    marginHorizontal: 12,
  },
  totalCardText: { gap: 3 },
  totalCardLabel: { fontSize: 12, color: C.textMid, fontWeight: "500" },
  totalCardValue: { fontSize: 22, fontWeight: "800", color: C.navy },
  ordersListContainer: { paddingHorizontal: 14, gap: 12 },
  orderCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    elevation: 2,
  },
  orderCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderCardLeft: { flex: 1 },
  orderId: { fontSize: 14, fontWeight: "700", color: C.textDark },
  orderDate: { fontSize: 11, color: C.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "700" },
  productRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: C.border,
    marginRight: 12,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: "700", color: C.textDark },
  productVariant: { fontSize: 12, color: C.textLight, marginTop: 3 },
  productQty: { fontSize: 12, color: C.textLight, marginTop: 2 },
  priceCol: { alignItems: "flex-end" },
  priceText: { fontSize: 14, fontWeight: "800", color: C.textDark },
  orderCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  customerLabel: { fontSize: 13, color: C.textMid },
  customerKey: { fontWeight: "700", color: C.textDark },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.navy,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewDetailsText: { fontSize: 12, fontWeight: "700", color: C.navy },
  shippingLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.navy,
    textDecorationLine: "underline",
    marginTop: 35,
  },
  emptyState: {
    backgroundColor: C.white,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textDark,
    marginTop: 12,
  },
  emptyResetBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: C.navy,
    borderRadius: 20,
  },
  emptyResetText: { color: C.white, fontSize: 13, fontWeight: "700" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 999,
  },
  handleArea: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: C.textDark },
  resetText: { fontSize: 14, fontWeight: "700", color: "#EF4444" },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  sheetOptionText: { flex: 1, fontSize: 12, color: C.textMid, fontWeight: "500" },
  sheetOptionTextActive: { color: C.textDark, fontWeight: "700" },
  optionDivider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 12 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: C.orange },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange },
  sheetFooter: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    backgroundColor: "#F8FAFC",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: C.textMid },
  applyBtn: {
    flex: 1,
    backgroundColor: C.orange,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    shadowColor: C.orange,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 4,
  },
  applyBtnText: { color: C.white, fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  sortBottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 20,
    elevation: 30,
  },
  filterBottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 1000,
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 20,
    elevation: 30,
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textDark,
    marginBottom: 10,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  chipActive: { backgroundColor: C.navy, borderColor: C.navy },
  chipText: { fontSize: 12, color: C.textMid, fontWeight: "600" },
  chipTextActive: { color: C.white, fontWeight: "700" },
  customDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  customDateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.bg,
  },
  customDateText: { fontSize: 12, color: C.textMid, fontWeight: "600" },
  bottomTabBar: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    height: Platform.OS === "ios" ? 84 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    justifyContent: "space-around",
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 3,
  },
  tabBadge: {
    position: "absolute",
    top: -4,
    right: -9,
    backgroundColor: C.orange,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
    lineHeight: 12,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Desktop-only StyleSheet (additive — never touches mobile styles)
// ─────────────────────────────────────────────────────────────────────────────
const deskStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

  /* ── Top bar ── */
  desktopTopBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.navy,
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 6,
  },
  desktopTopBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 120,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  desktopPageTitle: {
    color: C.white,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  desktopStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 0,
  },
  desktopStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  desktopStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  desktopIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  desktopStatTexts: { gap: 1 },
  desktopStatCount: {
    color: C.white,
    fontSize: 14,
    fontWeight: "800",
  },
  desktopStatLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    fontWeight: "500",
  },
  desktopTopBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 160,
    justifyContent: "flex-end",
  },
  notificationBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  analyticsBtn: {
    backgroundColor: C.orange,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  analyticsBtnText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "700",
  },

  /* ── Main scroll ── */
  desktopScrollView: {
    flex: 1,
    backgroundColor: C.bg,
  },

  /* ── Toolbar overrides for desktop ── */
  desktopTabsContainer: {
    flexDirection: "row",
    backgroundColor: C.navy,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 4,
    borderBottomLeftRadius: 22,      
  borderBottomRightRadius: 22,
  },
  desktopTab: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  desktopTabText: {
    fontSize: 14,
    color: C.white,
    fontWeight: "600",
  },
  desktopToolRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 24,
    marginTop: 14,
    marginBottom: 20,
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  desktopSearchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    outlineWidth: 0,
  },
  toolRowDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.border,
    marginHorizontal: 4,
  },
  inlineStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  inlineStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineStatLabel: {
    fontSize: 10,
    color: C.textLight,
    fontWeight: "500",
  },
  inlineStatValue: {
    fontSize: 15,
    fontWeight: "800",
    color: C.textDark,
  },
  desktopTotalsRow: {
    marginHorizontal: 24,
    maxWidth: 500,
  },
  desktopPillsRow: {
    paddingHorizontal: 24,
  },

  /* ── 3-column grid ── */
  desktopGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 18,
    gap: 16,
    marginTop: 4,
  },
  desktopGridItem: {
    // Each item is exactly 1/3 of the container minus gaps
    // We use flexBasis with calc-style approximation via percentage
    flexBasis: "31.5%",
    flexGrow: 1,
    maxWidth: "33.33%",
    minWidth: 280,
  },
  desktopEmptyState: {
    flex: 1,
    width: "100%",
    marginHorizontal: 6,
  },

  /* ── View mode toggle ── */
  viewToggleWrap: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  viewToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleBtnActive: {
    backgroundColor: C.navy,
  },

  /* ── List view ── */
  desktopList: {
    flexDirection: "column",
    marginHorizontal: 24,
    marginTop: 4,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  desktopListItem: {
    width: "100%",
  },

  /* ── Centred modal dialogs ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.50)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 28,
    width: 420,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 20,
  },
  filterModalBox: {
    maxHeight: "80%",
    width: 500,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.textDark,
  },
  resetText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.red,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// List-view table styles — desktop only
// ─────────────────────────────────────────────────────────────────────────────
const listRow = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8F3",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textLight,
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  // ── Column widths — IDENTICAL in both header and row ──
  colOrderId:  { width: 155 },
  colCustomer: { flex: 1.2, paddingRight: 8 },
  colItems:    { width: 100, alignItems: "center" },
  colAmount:   { width: 90,  alignItems: "flex-end" },
  colPayment:  { width: 110, alignItems: "center" },
  colStatus:   { width: 120, alignItems: "center" },
  colTracking: { flex: 1,    paddingHorizontal: 12 },
  colActions:  { width: 110, flexDirection: "row", gap: 6, justifyContent: "flex-end" },

  // Order ID cell
  orderIdText:   { fontSize: 13, fontWeight: "700", color: C.navy, textDecorationLine: "underline" },
  orderDateText: { fontSize: 10, color: C.textLight, marginTop: 2 },

  // Customer cell
  customerName: { fontSize: 13, fontWeight: "700", color: C.textDark },
  customerSub:  { fontSize: 11, color: C.textLight, marginTop: 2 },

  // Items pill
  itemsPill:     { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
  itemsPillText: { fontSize: 11, color: C.textMid, fontWeight: "600" },

  // Amount
  amountText: { fontSize: 13, fontWeight: "800", color: C.textDark },

  // Payment pill
  paymentPill:     { flexDirection: "row", alignItems: "center", backgroundColor: C.orangePale, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  paymentPillText: { fontSize: 11, color: C.orange, fontWeight: "700" },

  // Status badge
  statusBadge: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusText:  { fontSize: 11, fontWeight: "700" },

  // Tracking
  awbText:    { fontSize: 12, fontWeight: "700", color: C.textDark },
  courierText:{ fontSize: 10, color: C.textLight, marginTop: 2 },
  awbMuted:   { fontSize: 12, color: C.textLight, fontStyle: "italic" },

  // Action buttons
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});