import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppHeader } from "@/components/common/AppHeader";
import { fetchPayoutSummary, fetchMyPayoutRequests, type SellerPayoutRequestRow } from "@/services/payoutApi";
import { fetchAnalyticsSales } from "@/services/earningsApi";

const EarningsScreen = () => {
  const router = useRouter();
  const [filter, setFilter] = useState<"today" | "month">("month");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<SellerPayoutRequestRow[]>([]);

  const [data, setData] = useState({
    totalRevenue: 0,
    currentRevenue: 0,
    pendingPayout: 0,
    completedPayout: 0,
    available: 0,
  });

  const load = useCallback(async () => {
    try {
      const [summary, payoutRequests, sales] = await Promise.all([
        fetchPayoutSummary(),
        fetchMyPayoutRequests(),
        fetchAnalyticsSales(filter === "today" ? "day" : "month").catch(() => null),
      ]);

      const now = new Date();
      const inRange = (iso?: string) => {
        if (!iso) return false;
        const d = new Date(iso);
        if (filter === "today") {
          return (
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        }
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      };

      const filtered = payoutRequests.filter((row) => inRange(row.requestedAt));
      const pendingPayout = payoutRequests
        .filter((row) => row.status === "pending" || row.status === "approved")
        .reduce((sum, row) => sum + Number(row.requestedAmount ?? 0), 0);
      const completedPayout = payoutRequests
        .filter((row) => row.status === "paid")
        .reduce((sum, row) => sum + Number(row.requestedAmount ?? 0), 0);

      setTransactions(filtered);
      setData({
        totalRevenue: Number(summary.lifetimeEarnings ?? 0),
        currentRevenue: Number(sales?.totalSales ?? summary.thisMonthEarnings ?? 0),
        pendingPayout,
        completedPayout,
        available: Number(summary.pendingAmount ?? 0),
      });
    } catch {
      setTransactions([]);
      setData({
        totalRevenue: 0,
        currentRevenue: 0,
        pendingPayout: 0,
        completedPayout: 0,
        available: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const formatCurrency = (num: number) => `₹${num.toLocaleString("en-IN")}`;

  const statusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === "paid") return "#22c55e";
    if (s === "pending" || s === "approved") return "#eab308";
    if (s === "rejected" || s === "cancelled") return "#ef4444";
    return "#6b7280";
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f4f6fb", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f6fb" }}>
      <AppHeader title="Transaction History" subtitle="Payout requests & settlements" showBackButton />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.filterRow}>
          {(["today", "month"] as const).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.filterBtn, filter === item && styles.filterActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
                {item === "today" ? "Today" : "This Month"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Available Balance</Text>
          <Text style={styles.amount}>{formatCurrency(data.available)}</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.smallCard, { marginRight: 8 }]}>
            <Ionicons name="trending-up" size={22} color="#22c55e" />
            <Text style={styles.smallLabel}>Revenue ({filter === "today" ? "Today" : "Month"})</Text>
            <Text style={styles.smallValue}>{formatCurrency(data.currentRevenue)}</Text>
          </View>
          <View style={styles.smallCard}>
            <Ionicons name="wallet" size={22} color="#f97316" />
            <Text style={styles.smallLabel}>Lifetime Earnings</Text>
            <Text style={styles.smallValue}>{formatCurrency(data.totalRevenue)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.smallCard, { marginRight: 8 }]}>
            <Ionicons name="time" size={22} color="#eab308" />
            <Text style={styles.smallLabel}>Pending Payout</Text>
            <Text style={styles.smallValue}>{formatCurrency(data.pendingPayout)}</Text>
          </View>
          <View style={styles.smallCard}>
            <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />
            <Text style={styles.smallLabel}>Completed Payout</Text>
            <Text style={styles.smallValue}>{formatCurrency(data.completedPayout)}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push("/(main)/earning")}>
            <Text style={styles.linkText}>Earnings Overview</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={28} color="#9ca3af" />
            <Text style={styles.emptyText}>No transactions in this period.</Text>
          </View>
        ) : (
          transactions.map((row) => (
            <View key={String(row.id)} style={styles.txnRow}>
              <View>
                <Text style={styles.txnTitle}>ORD{row.orderId}</Text>
                <Text style={styles.txnDate}>
                  {row.requestedAt ? new Date(row.requestedAt).toLocaleDateString("en-IN") : "—"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.txnAmount}>{formatCurrency(Number(row.requestedAmount ?? 0))}</Text>
                <Text style={[styles.txnStatus, { color: statusColor(row.status) }]}>
                  {row.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === "web"
      ? { paddingVertical: 16, paddingHorizontal: 0 }
      : { padding: 16 }),
  },
  filterRow: { flexDirection: "row", marginBottom: 16, gap: 8 },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterActive: { backgroundColor: "#f97316", borderColor: "#f97316" },
  filterText: { fontWeight: "600", color: "#6b7280" },
  filterTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  label: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  amount: { fontSize: 28, fontWeight: "700", color: "#111827" },
  row: { flexDirection: "row", marginBottom: 12 },
  smallCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    elevation: 1,
  },
  smallLabel: { fontSize: 12, color: "#6b7280", marginTop: 6 },
  smallValue: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 2 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  linkText: { fontSize: 13, fontWeight: "600", color: "#f97316" },
  txnRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  txnTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  txnDate: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: "700", color: "#111827" },
  txnStatus: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  emptyBox: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyText: { color: "#6b7280", fontSize: 14 },
});

export default EarningsScreen;
