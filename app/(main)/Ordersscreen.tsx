import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
} from "react-native";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import { useRouter } from "expo-router";
import { useResponsive } from "@/hooks/useResponsive";
import { DashboardCard } from "@/components/web/DashboardCard";
import { OrdersTable } from "@/components/web/OrdersTable";
import type { Column } from "@/components/web/OrdersTable";

// ─── Color Palette ───────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Returned";

interface Order {
  id: string;
  date: string;
  time: string;
  productName: string;
  variant: string;
  qty: number;
  price: number;
  status: OrderStatus;
  customer: string;
  extraInfo?: string;
  hasAWB?: boolean;
  awb?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const ORDERS: Order[] = [
  {
    id: "#ORD123456",
    date: "20 May 2024",
    time: "10:30 AM",
    productName: "Cotton Kurti",
    variant: "Pink • M",
    qty: 1,
    price: 1299,
    status: "Pending",
    customer: "Priya Sharma",
  },
  {
    id: "#ORD123455",
    date: "19 May 2024",
    time: "09:15 PM",
    productName: "Floral Maxi Dress",
    variant: "White • L",
    qty: 1,
    price: 2499,
    status: "Processing",
    customer: "Anjali Mehta",
  },
  {
    id: "#ORD123454",
    date: "18 May 2024",
    time: "02:40 PM",
    productName: "Handbag",
    variant: "Brown",
    qty: 1,
    price: 749,
    status: "Shipped",
    customer: "Neha Verma",
    hasAWB: true,
    awb: "1234567890",
  },
  {
    id: "#ORD123453",
    date: "18 May 2024",
    time: "10:20 AM",
    productName: "Women's Sandals",
    variant: "Tan • 38",
    qty: 1,
    price: 599,
    status: "Delivered",
    customer: "Rita Singh",
    extraInfo: "Delivered on 21 May 2024",
  },
  {
    id: "#ORD123452",
    date: "18 May 2024",
    time: "10:05 AM",
    productName: "Cotton Kurti",
    variant: "Blue • M",
    qty: 1,
    price: 1299,
    status: "Returned",
    customer: "Komal Patel",
    extraInfo: "Returned on 21 May 2024",
  },
];

const STATUS_TABS = [
  { label: "All Orders", count: 125 },
  { label: "Pending", count: 18 },
  { label: "Processing", count: 32 },
  { label: "Shipped", count: 45 },
  { label: "Delivered", count: 28 },
  { label: "Returns", count: 2 },
];

const OVERVIEW_STATS = [
  { label: "All Orders", value: 125, icon: "📋", color: C.navy },
  { label: "Pending", value: 18, icon: "⏳", color: C.orange },
  { label: "Processing", value: 32, icon: "🔄", color: C.purple },
  { label: "Shipped", value: 45, icon: "📦", color: C.blue },
  { label: "Delivered", value: 28, icon: "✅", color: C.green },
  { label: "Returns", value: 2, icon: "↩️", color: C.teal },
  { label: "Cancelled", value: 0, icon: "❌", color: C.red },
];

// ─── Status Config ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<OrderStatus, { bg: string; text: string; color: string }> = {
  Pending: { bg: C.yellowPale, text: "Pending", color: C.yellow },
  Processing: { bg: C.purplePale, text: "Processing", color: C.purple },
  Shipped: { bg: C.bluePale, text: "Shipped", color: C.blue },
  Delivered: { bg: C.greenPale, text: "Delivered", color: C.green },
  Returned: { bg: C.redPale, text: "Returned", color: C.red },
};

// ─── Product Placeholder Colors ──────────────────────────────────────────────
const PRODUCT_COLORS = [C.redPale, C.purplePale, C.orangePale, C.yellowPale, C.bluePale];

// ─── Header ──────────────────────────────────────────────────────────────────
const Header: React.FC = () => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.headerBack}>
      <AppText style={styles.headerBackIcon}>←</AppText>
    </TouchableOpacity>
    <AppText style={styles.headerTitle}>Orders</AppText>
    <View style={styles.headerActions}>
      <TouchableOpacity style={styles.headerBtn}>
        <AppText style={styles.headerBtnIcon}>🔍</AppText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerBtn}>
        <AppText style={styles.headerBtnIcon}>▼</AppText>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Overview Card ────────────────────────────────────────────────────────────
const OverviewCard: React.FC = () => (
  <View style={styles.overviewCard}>
    <View style={styles.overviewHeader}>
      <AppText style={styles.overviewTitle}>Orders Overview</AppText>
      <TouchableOpacity>
        <AppText style={styles.viewAllStats}>View All Stats &gt;</AppText>
      </TouchableOpacity>
    </View>
    <View style={styles.overviewGrid}>
      {OVERVIEW_STATS.map((stat, i) => (
        <View key={i} style={styles.overviewItem}>
          <AppText style={styles.overviewIcon}>{stat.icon}</AppText>
          <AppText style={[styles.overviewValue, { color: stat.color }]}>{stat.value}</AppText>
          <AppText style={styles.overviewLabel}>{stat.label}</AppText>
        </View>
      ))}
    </View>
  </View>
);

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
interface TabBarProps {
  activeTab: number;
  onTabPress: (index: number) => void;
}
const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabPress }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.tabBar}
    contentContainerStyle={styles.tabBarContent}
  >
    {STATUS_TABS.map((tab, i) => (
      <TouchableOpacity
        key={i}
        style={[styles.tab, activeTab === i && styles.tabActive]}
        onPress={() => onTabPress(i)}
      >
        <AppText style={[styles.tabText, activeTab === i && styles.tabTextActive]}>
          {tab.label} ({tab.count})
        </AppText>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

// ─── Search Bar ──────────────────────────────────────────────────────────────
const SearchBar: React.FC = () => (
  <View style={styles.searchRow}>
    <View style={styles.searchBox}>
      <AppText style={styles.searchIcon}>🔍</AppText>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by Order ID / Customer"
        placeholderTextColor={C.textLight}
      />
    </View>
    <TouchableOpacity style={styles.sortBtn}>
      <AppText style={styles.sortBtnText}>⇅ Sort</AppText>
    </TouchableOpacity>
    <TouchableOpacity style={styles.calendarBtn}>
      <AppText style={styles.calendarBtnText}>📅</AppText>
    </TouchableOpacity>
  </View>
);

// ─── Summary Strip ────────────────────────────────────────────────────────────
const SummaryStrip: React.FC = () => (
  <View style={styles.summaryStrip}>
    <View style={styles.summaryItem}>
      <AppText style={styles.summaryIcon}>📋</AppText>
      <View>
        <AppText style={styles.summaryLabel}>Total Orders</AppText>
        <AppText style={styles.summaryValue}>125</AppText>
      </View>
    </View>
    <View style={styles.summaryDivider} />
    <View style={styles.summaryItem}>
      <AppText style={styles.summaryIcon}>💰</AppText>
      <View>
        <AppText style={styles.summaryLabel}>Total Sale</AppText>
        <AppText style={styles.summaryValue}>₹1,25,450.00</AppText>
      </View>
    </View>
  </View>
);

// ─── Order Card ───────────────────────────────────────────────────────────────
interface OrderCardProps {
  order: Order;
  index: number;
}
const OrderCard: React.FC<OrderCardProps> = ({ order, index }) => {
  const sc = STATUS_CONFIG[order.status];
  const bgColor = PRODUCT_COLORS[index % PRODUCT_COLORS.length];

  return (
    <View style={styles.orderCard}>
      {/* Card Header */}
      <View style={styles.orderCardHeader}>
        <View>
          <AppText style={styles.orderId}>{order.id}</AppText>
          <AppText style={styles.orderDate}>
            {order.date}, {order.time}
          </AppText>
        </View>
        <View style={styles.orderCardHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <AppText style={[styles.statusText, { color: sc.color }]}>{sc.text}</AppText>
          </View>
          <TouchableOpacity style={styles.moreBtn}>
            <AppText style={styles.moreBtnText}>⋮</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Row */}
      <View style={styles.productRow}>
        {/* Product Image Placeholder */}
        <View style={[styles.productImg, { backgroundColor: bgColor }]}>
          <AppText style={styles.productImgEmoji}>
            {order.productName.includes("Kurti")
              ? "👗"
              : order.productName.includes("Dress")
              ? "👗"
              : order.productName.includes("Handbag")
              ? "👜"
              : order.productName.includes("Sandals")
              ? "👡"
              : "🛍️"}
          </AppText>
        </View>

        {/* Product Details */}
        <View style={styles.productDetails}>
          <AppText style={styles.productName}>{order.productName}</AppText>
          <AppText style={styles.productVariant}>{order.variant}</AppText>
          <AppText style={styles.productQty}>Qty: {order.qty}</AppText>
        </View>

        {/* Price */}
        <View style={styles.priceCol}>
          <AppText style={styles.price}>₹{order.price.toLocaleString("en-IN")}</AppText>
          <AppText style={styles.itemCount}>1 Item</AppText>
        </View>
      </View>

      {/* AWB if Shipped */}
      {order.hasAWB && (
        <View style={styles.awbRow}>
          <AppText style={styles.awbText}>AWB: {order.awb}</AppText>
        </View>
      )}

      {/* Extra Info */}
      {order.extraInfo && (
        <View style={styles.extraInfoRow}>
          <AppText style={styles.extraInfoText}>{order.extraInfo}</AppText>
        </View>
      )}

      {/* Footer */}
      <View style={styles.orderCardFooter}>
        <AppText style={styles.customerLabel}>
          Customer: <AppText style={styles.customerName}>{order.customer}</AppText>
        </AppText>
        <TouchableOpacity style={styles.viewDetailsBtn}>
          <AppText style={styles.viewDetailsBtnText}>View Details &gt;</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const OrdersScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { isDesktop } = useResponsive();

  if (Platform.OS === "web" && isDesktop) {
    const columns: Column<Order>[] = [
      { key: "id", title: "Order ID" },
      { key: "date", title: "Date" },
      { key: "customer", title: "Customer" },
      { key: "productName", title: "Product" },
      { key: "qty", title: "Qty" },
      {
        key: "price",
        title: "Amount",
        render: (item) => <AppText style={styles.price}>₹{item.price.toLocaleString("en-IN")}</AppText>,
      },
      {
        key: "status",
        title: "Status",
        render: (item) => {
          const sc = STATUS_CONFIG[item.status];
          return (
            <View style={[styles.statusBadge, { backgroundColor: sc.bg, alignSelf: "flex-start" }]}>
              <AppText style={[styles.statusText, { color: sc.color }]}>{sc.text}</AppText>
            </View>
          );
        },
      },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: "#F9FAFB", padding: 24 }}>
        <DashboardCard title="All Orders">
          <OrdersTable data={ORDERS} columns={columns} />
        </DashboardCard>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      {Platform.OS !== 'web' && <Header />}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <OverviewCard />
        <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
        <SearchBar />
        <SummaryStrip />
        <View style={styles.orderList}>
          {ORDERS.map((order, i) => (
            <OrderCard key={order.id} order={order} index={i} />
          ))}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrdersScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.navy,
  },
  scrollView: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.navy,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBack: {
    marginRight: 12,
  },
  headerBackIcon: {
    color: C.white,
    fontSize: 20,
    fontWeight: "600",
  },
  headerTitle: {
    flex: 1,
    color: C.white,
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerBtn: {
    padding: 4,
  },
  headerBtnIcon: {
    fontSize: 18,
    color: C.white,
  },

  // Overview Card
  overviewCard: {
    backgroundColor: C.white,
    marginHorizontal: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  overviewTitle: {
    fontSize: 13,
    fontFamily: fontFamilies.semiBold,
    color: C.textDark,
  },
  viewAllStats: {
    fontSize: 12,
    color: C.navy,
    fontFamily: fontFamilies.semiBold,
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
  },
  overviewItem: {
    width: "14.28%",
    alignItems: "center",
    paddingVertical: 4,
  },
  overviewIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
  },
  overviewLabel: {
    fontSize: 9,
    color: C.textLight,
    textAlign: "center",
    fontFamily: fontFamilies.regular,
    marginTop: 2,
  },

  // Tab Bar
  tabBar: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 0,
    flexDirection: "row",
    gap: 0,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: C.navy,
  },
  tabText: {
    fontSize: 12,
    color: C.textLight,
    fontFamily: fontFamilies.medium,
  },
  tabTextActive: {
    color: C.navy,
    fontFamily: fontFamilies.bold,
  },

  // Search Bar
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.white,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 6,
    color: C.textLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: C.textDark,
    fontFamily: fontFamilies.regular,
    padding: 0,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: C.white,
  },
  sortBtnText: {
    fontSize: 12,
    color: C.textMid,
    fontFamily: fontFamilies.medium,
  },
  calendarBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: C.white,
  },
  calendarBtnText: {
    fontSize: 14,
  },

  // Summary Strip
  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryIcon: {
    fontSize: 22,
  },
  summaryLabel: {
    fontSize: 11,
    color: C.textLight,
    fontFamily: fontFamilies.regular,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    color: C.textDark,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.border,
    marginHorizontal: 12,
  },

  // Order List
  orderList: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 10,
  },

  // Order Card
  orderCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 2,
  },
  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderId: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
    color: C.textDark,
  },
  orderDate: {
    fontSize: 11,
    color: C.textLight,
    fontFamily: fontFamilies.regular,
    marginTop: 2,
  },
  orderCardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fontFamilies.semiBold,
  },
  moreBtn: {
    padding: 2,
  },
  moreBtnText: {
    fontSize: 18,
    color: C.textLight,
  },

  // Product Row
  productRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  productImg: {
    width: 60,
    height: 70,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  productImgEmoji: {
    fontSize: 28,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontFamily: fontFamilies.semiBold,
    color: C.textDark,
    marginBottom: 3,
  },
  productVariant: {
    fontSize: 12,
    color: C.textLight,
    fontFamily: fontFamilies.regular,
    marginBottom: 3,
  },
  productQty: {
    fontSize: 12,
    color: C.textLight,
    fontFamily: fontFamilies.regular,
  },
  priceCol: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
    color: C.textDark,
  },
  itemCount: {
    fontSize: 11,
    color: C.textLight,
    fontFamily: fontFamilies.regular,
    marginTop: 3,
  },

  // AWB
  awbRow: {
    backgroundColor: C.bg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  awbText: {
    fontSize: 11,
    color: C.textMid,
    fontFamily: fontFamilies.medium,
  },

  // Extra Info
  extraInfoRow: {
    marginBottom: 6,
  },
  extraInfoText: {
    fontSize: 11,
    color: C.green,
    fontFamily: fontFamilies.medium,
  },

  // Card Footer
  orderCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    marginTop: 4,
  },
  customerLabel: {
    fontSize: 12,
    color: C.textLight,
    fontFamily: fontFamilies.regular,
  },
  customerName: {
    color: C.textMid,
    fontFamily: fontFamilies.semiBold,
  },
  viewDetailsBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewDetailsBtnText: {
    fontSize: 12,
    color: C.navy,
    fontFamily: fontFamilies.semiBold,
  },
});
