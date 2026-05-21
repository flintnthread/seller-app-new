import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 🔥 Mock Transactions (replace with API later)
const transactions = [
  { id: 1, amount: 1200, status: "completed", date: "2026-05-04" },
  { id: 2, amount: 800, status: "pending", date: "2026-05-04" },
  { id: 3, amount: 2000, status: "completed", date: "2026-05-02" },
  { id: 4, amount: 1500, status: "completed", date: "2026-04-25" },
];

const EarningsScreen = () => {
  const [filter, setFilter] = useState<"today" | "month">("month");
  const [refreshing, setRefreshing] = useState(false);

  const [data, setData] = useState({
    totalRevenue: 0,
    currentRevenue: 0,
    pendingPayout: 0,
    completedPayout: 0,
    available: 0,
  });

  // 🔥 Helper functions
  const isToday = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const isThisMonth = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  // 🔥 Core Logic
  const calculateEarnings = () => {
    let filtered = transactions;

    if (filter === "today") {
      filtered = transactions.filter((t) => isToday(t.date));
    } else {
      filtered = transactions.filter((t) => isThisMonth(t.date));
    }

    const totalRevenue = transactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    const currentRevenue = filtered.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    const pendingPayout = transactions
      .filter((t) => t.status === "pending")
      .reduce((sum, t) => sum + t.amount, 0);

    const completedPayout = transactions
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    const available = completedPayout - pendingPayout;

    setData({
      totalRevenue,
      currentRevenue,
      pendingPayout,
      completedPayout,
      available,
    });
  };

  useEffect(() => {
    calculateEarnings();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      calculateEarnings();
      setRefreshing(false);
    }, 800);
  };

  const formatCurrency = (num: number) =>
    `₹${num.toLocaleString("en-IN")}`;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
        <Text style={styles.subtitle}>
          Track your sales performance 💰
        </Text>
      </View>

      {/* 🔥 Filter */}
      <View style={styles.filterRow}>
        {["today", "month"].map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.filterBtn,
              filter === item && styles.activeFilter,
            ]}
            onPress={() => setFilter(item as any)}
          >
            <Text
              style={[
                styles.filterText,
                filter === item && styles.activeFilterText,
              ]}
            >
              {item === "today" ? "Today" : "This Month"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 🔥 Total Revenue */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Revenue</Text>
        <Text style={styles.totalAmount}>
          {formatCurrency(data.totalRevenue)}
        </Text>

        <View style={styles.row}>
          <Ionicons name="trending-up" size={16} color="#22c55e" />
          <Text style={styles.growth}>+12% from last month</Text>
        </View>
      </View>

      {/* 🔥 Stats Grid */}
      <View style={styles.grid}>
        <StatCard
          label={filter === "today" ? "Today" : "This Month"}
          value={formatCurrency(data.currentRevenue)}
          icon="calendar"
          color="#ff7a00"
        />

        <StatCard
          label="Pending"
          value={formatCurrency(data.pendingPayout)}
          icon="time"
          color="#f59e0b"
        />

        <StatCard
          label="Completed"
          value={formatCurrency(data.completedPayout)}
          icon="checkmark-done"
          color="#22c55e"
        />

        <StatCard
          label="Available"
          value={formatCurrency(data.available)}
          icon="wallet"
          color="#3b82f6"
        />
      </View>
    </ScrollView>
  );
};

const StatCard = ({ label, value, icon, color }: any) => (
  <View style={styles.card}>
    <View style={[styles.iconBox, { backgroundColor: color }]}>
      <Ionicons name={icon} size={18} color="#fff" />
    </View>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.amount}>{value}</Text>
  </View>
);

export default EarningsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    paddingHorizontal: 16,
  },

  header: {
    marginTop: 60,
    marginBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#666",
  },

  filterRow: {
    flexDirection: "row",
    marginBottom: 15,
  },

  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#eee",
    borderRadius: 20,
    marginRight: 10,
  },

  activeFilter: {
    backgroundColor: "#ff7a00",
  },

  filterText: {
    color: "#555",
  },

  activeFilterText: {
    color: "#fff",
    fontWeight: "600",
  },

  totalCard: {
    backgroundColor: "#1f3b64",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },

  totalLabel: {
    color: "#cbd5e1",
  },

  totalAmount: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginVertical: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  growth: {
    color: "#22c55e",
    marginLeft: 6,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
    elevation: 4,
  },

  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  label: {
    color: "#666",
  },

  amount: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 5,
  },
});
