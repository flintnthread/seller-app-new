import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, TouchableOpacity, TextInput, Platform, ActivityIndicator, useWindowDimensions, Image, ScrollView } from "react-native";
import { AppText } from "@/components/AppText";
import { Pagination } from "@/components/common/Pagination";
import { OrdersTable } from "./OrdersTable";
import type { Column } from "./OrdersTable";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  getLiveOrders,
  getOrdersLoadError,
  loadOrdersFromApi,
  subscribeToOrderChanges,
} from "@/lib/orders/ordersStore";
import type { OrderStatus } from "@/lib/orders/ordersData";
import { resolveLineItemAmount } from "@/lib/orders/orderLineAmount";

const C = {
  navy: "#1E2B6B",
  navyDeep: "#151D4F",
  purple: "#6C63FF",
  purplePale: "#F0EEFF",
  green: "#22C55E",
  greenPale: "#F0FDF4",
  red: "#EF4444",
  redPale: "#FEF2F2",
  yellow: "#F59E0B",
  yellowPale: "#FFFBEB",
  blue: "#3B82F6",
  bluePale: "#EFF6FF",
  orange: "#F97316",
  orangePale: "#FFF7ED",
  white: "#FFFFFF",
  border: "#E5E7EB",
  bg: "#F7F8FC",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#9CA3AF",
};

interface OrderRow {
  id: string;
  date: string;
  time: string;
  productName: string;
  variant: string;
  qty: number;
  price: number;
  status: OrderStatus;
  customer: string;
}

const STATUS_CONFIG: Record<OrderStatus, { bg: string; text: string; color: string }> = {
  Pending: { bg: C.yellowPale, text: "Pending", color: C.yellow },
  Processing: { bg: C.purplePale, text: "Processing", color: C.purple },
  Shipped: { bg: C.bluePale, text: "Shipped", color: C.blue },
  Delivered: { bg: C.greenPale, text: "Delivered", color: C.green },
  Returned: { bg: C.redPale, text: "Returned", color: C.red },
  Cancelled: { bg: C.redPale, text: "Cancelled", color: C.red },
};

function mapOrdersToRows(): OrderRow[] {
  const rows: OrderRow[] = [];
  getLiveOrders().forEach((o) => {
    const lineItems = o.items.length ? o.items : [undefined];
    lineItems.forEach((item) => {
      const variantParts = [item?.color, item?.size].filter(Boolean);
      const dateParts = (o.date || "").split(" ");
      rows.push({
        id: o.id,
        date: dateParts.slice(0, 3).join(" ") || o.date || "—",
        time: dateParts.slice(3).join(" ") || "—",
        productName: item?.name?.trim() || "—",
        variant: variantParts.length ? variantParts.join(" • ") : item?.variant?.trim() || "—",
        qty: item?.qty ?? 1,
        price: resolveLineItemAmount(item),
        status: o.status,
        customer: o.customer?.name ?? "—",
      });
    });
  });
  return rows.slice(0, 20);
}

export const DashboardTables: React.FC = () => {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<string>("All");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      if (mounted) {
        setOrders(mapOrdersToRows());
        setLoadError(getOrdersLoadError());
        setLoading(false);
      }
    };
    setLoading(true);
    loadOrdersFromApi(true).finally(refresh);
    const unsub = subscribeToOrderChanges(refresh);
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const tabs = ["All", "Pending", "Processing", "Shipped", "Delivered", "Returned"];

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchText.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchText.toLowerCase()) ||
        order.productName.toLowerCase().includes(searchText.toLowerCase());
      const matchesTab = activeTab === "All" || order.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [orders, searchText, activeTab]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const columns: Column<OrderRow>[] = [
    {
      key: "id",
      title: "Order ID",
      width: "18%",
      nowrap: true,
      render: (item) => (
        <AppText style={styles.orderIdText}>
          {item.id}
        </AppText>
      ),
    },
    {
      key: "customer",
      title: "Customer",
      width: "16%",
      render: (item) => (
        <View style={styles.customerCol}>
          <View style={styles.avatarCircle}>
            <AppText style={styles.avatarText}>
              {item.customer.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AppText>
          </View>
          <AppText style={styles.customerName} numberOfLines={1}>{item.customer}</AppText>
        </View>
      ),
    },
    {
      key: "productName",
      title: "Product",
      width: "28%",
      render: (item) => (
        <View style={styles.productCol}>
          <AppText style={styles.productNameText} numberOfLines={2}>{item.productName}</AppText>
          <AppText style={styles.productVariantText} numberOfLines={1}>{item.variant}</AppText>
        </View>
      ),
    },
    {
      key: "qty",
      title: "Qty",
      width: "5%",
      align: "center",
      render: (item) => (
        <AppText style={styles.qtyText}>{item.qty}</AppText>
      ),
    },
    {
      key: "price",
      title: "Amount",
      width: "11%",
      align: "right",
      render: (item) => (
        <AppText style={styles.priceText}>₹{item.price.toLocaleString("en-IN")}</AppText>
      ),
    },
    {
      key: "status",
      title: "Status",
      width: "12%",
      render: (item) => {
        const sc = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.Pending;
        return (
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: sc.color }]} />
            <AppText style={[styles.statusText, { color: sc.color }]}>{sc.text}</AppText>
          </View>
        );
      },
    },
    {
      key: "actions",
      title: "Actions",
      width: "10%",
      align: "center",
      render: (item) => (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: "/(main)/orderDetails", params: { orderId: item.id } })}
          activeOpacity={0.7}
        >
          <AppText style={styles.actionBtnText}>Manage</AppText>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <AppText style={styles.cardTitle}>Recent Orders</AppText>
          <AppText style={styles.cardSubtitle}>List of latest customer transactions</AppText>
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color={C.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Order ID, Customer..."
            placeholderTextColor={C.textLight}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScrollWrap} contentContainerStyle={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            activeOpacity={0.8}
          >
            <AppText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loadError ? (
        <View style={styles.errorBanner}>
          <AppText style={styles.errorBannerText}>{loadError}</AppText>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              setLoadError(null);
              loadOrdersFromApi(true).finally(() => {
                setOrders(mapOrdersToRows());
                setLoadError(getOrdersLoadError());
                setLoading(false);
              });
            }}
          >
            <AppText style={styles.retryBtnText}>Retry</AppText>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.tableWrap}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={C.purple} />
            <AppText style={styles.emptyStateText}>Loading orders…</AppText>
          </View>
        ) : isMobile ? (
          <View style={styles.mobileListWrap}>
            {filteredOrders.length === 0 && !loadError ? (
              <View style={styles.emptyState}>
                <AppText style={styles.emptyStateText}>No orders match the filters</AppText>
              </View>
            ) : (
              paginatedOrders.map((item) => {
                const sc = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.Pending;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.mobileCard}
                    onPress={() => router.push({ pathname: "/(main)/orderDetails", params: { orderId: item.id } })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.mobileCardTop}>
                      <View>
                        <AppText style={styles.mobileOrderId} numberOfLines={1}>{item.id}</AppText>
                        <AppText style={styles.mobileCustomerName} numberOfLines={1}>{item.customer}</AppText>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: sc.bg, alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 8 }]}>
                        <View style={[styles.statusDot, { backgroundColor: sc.color, width: 4, height: 4 }]} />
                        <AppText style={[styles.statusText, { color: sc.color, fontSize: 10 }]}>{sc.text}</AppText>
                      </View>
                    </View>
                    <View style={styles.mobileCardMid}>
                      <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                        <AppText style={styles.mobileProductName} numberOfLines={1}>{item.productName}</AppText>
                        <AppText style={styles.mobileProductVariant} numberOfLines={1}>{item.variant}  •  Qty: {item.qty}</AppText>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <AppText style={styles.mobilePriceText}>₹{item.price.toLocaleString("en-IN")}</AppText>
                        <AppText style={styles.mobileDateText}>{item.date}</AppText>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          <>
        <OrdersTable data={paginatedOrders} columns={columns} />
        {paginatedOrders.length === 0 && !loadError && (
          <View style={styles.emptyState}>
            <AppText style={styles.emptyStateText}>No orders match the filters</AppText>
          </View>
        )}
          </>
        )}
      </View>

      {!loading && filteredOrders.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)}
          onPageChange={setCurrentPage}
          totalItems={filteredOrders.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemLabel="orders"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 24,
    marginBottom: 24,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    alignSelf: "stretch",
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 38,
    width: "100%",
    maxWidth: 280,
    flexShrink: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.textDark,
    fontFamily: "Poppins_400Regular",
    outlineStyle: "none" as any,
    padding: 0,
  },
  tabsScrollWrap: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: C.purple,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: C.textLight,
  },
  tabTextActive: {
    color: C.purple,
    fontFamily: "Poppins_600SemiBold",
  },
  tableWrap: {
    paddingHorizontal: 24,
  },
  orderIdText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: C.textDark,
    flexShrink: 0,
    ...Platform.select({
      web: {
        whiteSpace: "nowrap" as any,
      },
    }),
  },
  customerCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.purplePale,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: C.purple,
  },
  customerName: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: C.textDark,
    flex: 1,
    minWidth: 0,
  },
  productCol: {
    flex: 1,
    minWidth: 0,
  },
  productNameText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: C.textDark,
  },
  productVariantText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
    marginTop: 2,
  },
  qtyText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: C.textMid,
  },
  priceText: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.white,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: C.textMid,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 10,
  },
  errorBanner: {
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: C.red,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.navy,
  },
  retryBtnText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: C.textMid,
  },
  mobileListWrap: {
    paddingVertical: 12,
    gap: 12,
  },
  mobileCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  mobileCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 10,
  },
  mobileOrderId: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: C.textDark,
  },
  mobileCustomerName: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: C.textMid,
    marginTop: 2,
  },
  mobileCardMid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  mobileProductName: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: C.textDark,
    marginBottom: 2,
  },
  mobileProductVariant: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
  },
  mobilePriceText: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
    marginBottom: 2,
  },
  mobileDateText: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
  },
});
