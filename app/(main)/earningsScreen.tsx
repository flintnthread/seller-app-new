import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "@/components/common/AppHeader";
import { fetchEarnings } from "@/services/earningsApi";

const EarningsScreen = () => {
  const [filter, setFilter] = useState<"today" | "month">("month");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState({
    totalRevenue: 0,
    currentRevenue: 0,
    pendingPayout: 0,
    completedPayout: 0,
    available: 0,
  });

  const load = useCallback(async () => {
    try {
      const earnings = await fetchEarnings();
      const credits = Number(earnings.totalCredits ?? 0);
      const debits = Number(earnings.totalDebits ?? 0);
      const available = Number(earnings.availableBalance ?? 0);

      const now = new Date();
      const isToday = (dateStr: string) => {
        const d = new Date(dateStr);
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      };
      const isThisMonth = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      };

      const filtered = earnings.transactions.filter((t) => {
        if (filter === "today") return isToday(t.date);
        return isThisMonth(t.date);
      });

      const currentRevenue = filtered
        .filter((t) => t.type === "credit")
        .reduce((sum, t) => sum + Math.abs(Number(String(t.amount).replace(/[^\d.]/g, "")) || 0), 0);

      const pendingPayout = earnings.transactions
        .filter((t) => t.type === "debit" && t.status.toLowerCase() === "pending")
        .reduce((sum, t) => sum + Math.abs(Number(String(t.amount).replace(/[^\d.]/g, "")) || 0), 0);

      setData({
        totalRevenue: credits,
        currentRevenue,
        pendingPayout,
        completedPayout: debits,
        available,
      });
    } catch {
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f4f6fb", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f6fb" }}>
      <AppHeader title="Earnings" subtitle="Track your sales performance 💰" showBackButton />
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
            <Text style={styles.smallLabel}>Total Credits</Text>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
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
});

export default EarningsScreen;
