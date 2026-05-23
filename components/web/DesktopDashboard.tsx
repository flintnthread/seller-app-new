import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
  Clipboard,
  Pressable,
} from "react-native";
import { AppText } from "@/components/AppText";
import { DashboardAnalytics } from "./DashboardAnalytics";
import type { SalesPeriod } from "./DashboardAnalytics";
import { DashboardCharts } from "./DashboardCharts";
import { DashboardTables } from "./DashboardTables";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  SmartWelcomeHeader,
  RealTimeActivityFeed,
  AIBusinessInsights,
  SalesHeatmap,
  SmartInventoryMonitoring,
  LiveOrderTrackingPanel,
  TopProductsPerformance,
  SellerPerformanceScore,
  CustomerAnalytics,
  MarketingCenter,
  FinancialCenter,
  SmartNotificationCenter,
} from "./SaaSWidgets";

const C = {
  navy: "#1E2B6B",
  navyDeep: "#151D4F",
  navyLight: "#2D3E8A",
  purple: "#6C63FF",
  purpleLight: "#A89CFF",
  purplePale: "#F0EEFF",
  green: "#22C55E",
  red: "#EF4444",
  yellow: "#F59E0B",
  blue: "#3B82F6",
  orange: "#F97316",
  orangeDeep: "#EA6000",
  pink: "#FF3F6C",
  teal: "#14B8A6",
  white: "#FFFFFF",
  border: "#E5E7EB",
  bg: "#F7F8FC",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#9CA3AF",
};

// ─── Import stats from shared logic ───
const SALES_DATA: Record<SalesPeriod, {
  points: number[];
  labels: string[];
  totalSales: string;
  totalOrders: string;
  salesChange: string;
  ordersChange: string;
}> = {
  "Day": {
    points: [20, 38, 30, 50, 42, 60, 48, 65, 55, 72, 60, 68, 58],
    labels: ["6am", "8am", "10am", "12pm", "2pm", "4pm", "6pm"],
    totalSales: "₹12,540", totalOrders: "28", salesChange: "8%", ordersChange: "5%",
  },
  "Week": {
    points: [18, 35, 25, 45, 30, 55, 40, 60, 45, 70, 50, 65, 55],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    totalSales: "₹86,540", totalOrders: "156", salesChange: "18%", ordersChange: "14%",
  },
  "Month": {
    points: [30, 42, 55, 38, 60, 70, 65, 80, 72, 90, 85, 78, 95],
    labels: ["1", "5", "10", "15", "20", "25", "30"],
    totalSales: "₹3,12,800", totalOrders: "589", salesChange: "24%", ordersChange: "19%",
  },
  "Year": {
    points: [45, 60, 55, 78, 65, 90, 80, 95, 85, 100, 92, 110],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    totalSales: "₹28,45,000", totalOrders: "5,430", salesChange: "36%", ordersChange: "31%",
  },
};

const ALL_STATS_DATA = {
  "Day": {
    orders: "28", ordersChange: "+12%",
    sales: "₹12,450", salesChange: "+8%",
    views: "1,245", viewsChange: "+15%",
    rating: "4.8", ratingChange: "+0.2",
    newCustomers: "14", newCustomersChange: "+5%",
    avgOrderValue: "₹444", avgOrderValueChange: "+3%",
    conversionRate: "2.2%", conversionRateChange: "+0.4%",
    returns: "1", returnsChange: "-1",
  },
  "Week": {
    orders: "156", ordersChange: "+14%",
    sales: "₹86,540", salesChange: "+18%",
    views: "7,820", viewsChange: "+22%",
    rating: "4.8", ratingChange: "+0.1",
    newCustomers: "68", newCustomersChange: "+9%",
    avgOrderValue: "₹555", avgOrderValueChange: "+4%",
    conversionRate: "2.0%", conversionRateChange: "+0.3%",
    returns: "4", returnsChange: "-2",
  },
  "Month": {
    orders: "589", ordersChange: "+19%",
    sales: "₹3,12,800", salesChange: "+24%",
    views: "29,400", viewsChange: "+31%",
    rating: "4.7", ratingChange: "+0.1",
    newCustomers: "210", newCustomersChange: "+16%",
    avgOrderValue: "₹531", avgOrderValueChange: "+5%",
    conversionRate: "2.0%", conversionRateChange: "+0.2%",
    returns: "18", returnsChange: "-5",
  },
  "Year": {
    orders: "5,430", ordersChange: "+31%",
    sales: "₹28,45,000", salesChange: "+36%",
    views: "3,12,000", viewsChange: "+40%",
    rating: "4.8", ratingChange: "+0.3",
    newCustomers: "1,850", newCustomersChange: "+28%",
    avgOrderValue: "₹524", avgOrderValueChange: "+6%",
    conversionRate: "1.7%", conversionRateChange: "+0.2%",
    returns: "142", returnsChange: "-18",
  },
};

const REFERRAL_CODE = "F&T-THEL-0023611";

export const DesktopDashboard: React.FC = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1200;

  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>("Week");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(REFERRAL_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      {/* ── 1. SMART WELCOME HEADER ── */}
      <SmartWelcomeHeader name="Gopi" />

      {/* ── 2. ENTERPRISE GRID SYSTEM ── */}
      <View style={[styles.gridRow, !isDesktop && styles.gridStacked]}>
        
        {/* LEFT COLUMN: Main analytical operations (70% width on large screens) */}
        <View style={[styles.leftCol, isDesktop ? { width: "70%" } : { width: "100%" }]}>
          
          {/* Advanced KPI Cards Row */}
          <DashboardAnalytics period={salesPeriod} allStatsData={ALL_STATS_DATA} />

          {/* Interactive Multi-Chart Visuals */}
          <DashboardCharts
            salesPeriod={salesPeriod}
            onSalesPeriodChange={setSalesPeriod}
            salesData={SALES_DATA}
            allStatsData={ALL_STATS_DATA}
          />

          {/* Sales Heatmap & Live Tracking */}
          <View style={styles.flexRow}>
            <View style={{ flex: 1, minWidth: 280 }}>
              <SalesHeatmap />
            </View>
            <View style={{ flex: 1, minWidth: 280 }}>
              <LiveOrderTrackingPanel />
            </View>
          </View>

          {/* Top Selling Products Performance Table */}
          <TopProductsPerformance />

          {/* Marketing Center & Financial Reconciliation */}
          <View style={styles.flexRow}>
            <View style={{ flex: 1, minWidth: 280 }}>
              <MarketingCenter />
            </View>
            <View style={{ flex: 1, minWidth: 280 }}>
              <FinancialCenter />
            </View>
          </View>

          {/* Recent Orders Data Table */}
          <DashboardTables />
        </View>

        {/* RIGHT COLUMN: Performance indicators, live alerts, logs (30% width) */}
        <View style={[styles.rightCol, isDesktop ? { width: "30%" } : { width: "100%" }]}>
          
          {/* Seller Performance Score Dial */}
          <SellerPerformanceScore />

          {/* Smart Notification Center */}
          <SmartNotificationCenter />

          {/* Real-time Event activity log */}
          <RealTimeActivityFeed />

          {/* AI Store recommendation matrix */}
          <AIBusinessInsights />

          {/* Smart inventory monitor (Health & recommendations) */}
          <SmartInventoryMonitoring />

          {/* Repeat Cohort customer LTV metric */}
          <CustomerAnalytics />

          {/* Referral Reward Banner */}
          <View style={styles.referralCard}>
            <View style={styles.referralHeader}>
              <View style={styles.referralIconBox}>
                <MaterialCommunityIcons name="gift-outline" size={18} color={C.orange} />
              </View>
              <View>
                <AppText style={styles.referralTitle}>Referral Rewards Program</AppText>
                <AppText style={styles.referralSubtitle}>Invite other sellers & earn +5% commission</AppText>
              </View>
            </View>
            <View style={styles.referralCodeWrap}>
              <AppText style={styles.referralCodeLabel}>YOUR CODE</AppText>
              <View style={styles.codePill}>
                <AppText style={styles.codeText}>{REFERRAL_CODE}</AppText>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
                  <MaterialCommunityIcons
                    name={copied ? "check" : "content-copy"}
                    size={13}
                    color={copied ? C.green : C.textMid}
                  />
                  <AppText style={[styles.copyBtnText, copied && { color: C.green }]}>
                    {copied ? "Copied!" : "Copy"}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 40,
  },
  gridStacked: {
    flexDirection: "column",
  },
  leftCol: {
    gap: 20,
  },
  rightCol: {
    gap: 16,
  },
  flexRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  referralCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 20,
    ...Platform.select({
      web: {
        background: "linear-gradient(135deg, #FFFBEB 0%, #FFF7ED 100%)",
        boxShadow: "0 2px 8px 0 rgba(245, 158, 11, 0.10)",
      },
    }),
  },
  referralHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  referralIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  referralTitle: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  referralSubtitle: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
    marginTop: 1,
  },
  referralCodeWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 10,
    backgroundColor: C.bg,
    gap: 6,
  },
  referralCodeLabel: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    color: C.textLight,
    letterSpacing: 0.8,
  },
  codePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeText: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  copyBtnText: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: C.textMid,
  },
});
