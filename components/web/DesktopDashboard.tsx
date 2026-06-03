import React, { useState, useMemo } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardCharts } from "@/hooks/useDashboardCharts";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { EMPTY_SALES_CHART } from "@/lib/dashboard/chartDefaults";
import { useDashboardStatsByPeriod } from "@/hooks/useDashboardStatsByPeriod";
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
import { AccountStatusBanner } from "@/components/AccountStatusBanner";
import type { SellerProfileSummary } from "@/hooks/useSellerProfileSummary";

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

export type DesktopDashboardProps = {
  profile: SellerProfileSummary | null;
  profileLoading: boolean;
};

export function DesktopDashboard({
  profile,
  profileLoading,
}: DesktopDashboardProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1200;
  const { data, reviewCount } = useDashboardData();
  const widgets = useDashboardWidgets();

  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>("Week");
  const { salesChart } = useDashboardCharts(salesPeriod);
  const welcomeName = profile?.fullName ?? (profileLoading ? "…" : "Seller");

  const salesDataMerged = useMemo(() => {
    const chart = salesChart ?? EMPTY_SALES_CHART;
    return {
      Day: chart,
      Week: chart,
      Month: chart,
      Year: chart,
    };
  }, [salesChart]);

  const { allStatsData } = useDashboardStatsByPeriod(true);

  const activeTrackingOrder = useMemo(() => {
    const o = widgets.recentOrders[0];
    if (!o) return null;
    return {
      id: o.id,
      status: o.status,
      customerName: o.customer?.name,
      productName: o.items[0]?.productName,
      awb: o.shiprocket?.awb,
      courier: o.shiprocket?.courier,
      steps: o.steps.map((s) => ({
        label: s.label,
        status: s.status === "done" ? "done" as const : s.status === "active" ? "active" as const : "pending" as const,
      })),
    };
  }, [widgets.recentOrders]);

    return (
        <View style={styles.container}>
            {/* ── 1. SMART WELCOME HEADER ── */}
            <SmartWelcomeHeader
        name={welcomeName}
        totalOrders={widgets.overview?.orders ?? 0}
        salesFormatted={widgets.overview?.salesFormatted ?? "₹0"}
        pendingOrders={widgets.orderSummary?.pending ?? 0}
        views={widgets.overview?.views ?? 0}
        referralCode=""
        referralGoal={6}
        referralTotalReferred={0}
      />

      <View style={{ marginBottom: 12 }}>
        <AccountStatusBanner
          accountStatus={profile?.accountStatus}
          loading={profileLoading}
          compact
        />
      </View>

      {/* ── 2. ENTERPRISE GRID SYSTEM ── */}
      <View style={[styles.gridRow, !isDesktop && styles.gridStacked]}>
        
        {/* LEFT COLUMN: Main analytical operations (70% width on large screens) */}
        <View style={[styles.leftCol, isDesktop ? { width: "70%" } : { width: "100%" }]}>
          
          {/* Advanced KPI Cards Row */}
          <DashboardAnalytics
            period={salesPeriod}
            allStatsData={allStatsData}
            orderSummary={data?.orderSummary ?? null}
          />

          {/* Interactive Multi-Chart Visuals */}
          <DashboardCharts
            salesPeriod={salesPeriod}
            onSalesPeriodChange={setSalesPeriod}
            salesData={salesDataMerged}
            allStatsData={allStatsData}
            reviewCount={reviewCount}
          />

          {/* Sales Heatmap & Live Tracking */}
          <View style={styles.flexRow}>
            <View style={{ flex: 1, minWidth: 280 }}>
              <SalesHeatmap points={widgets.weekSalesPoints} />
            </View>
            <View style={{ flex: 1, minWidth: 280 }}>
              <LiveOrderTrackingPanel order={activeTrackingOrder} />
            </View>
          </View>

          {/* Top Selling Products Performance Table */}
          <TopProductsPerformance items={widgets.topProducts} />

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
          <SellerPerformanceScore
            rating={widgets.overview?.rating ?? 0}
            orders={widgets.overview?.orders ?? 0}
            returns={widgets.orderSummary?.returns ?? 0}
            views={widgets.overview?.views ?? 0}
          />

          <SmartNotificationCenter alerts={widgets.alertNotifications} />

          <RealTimeActivityFeed activities={widgets.activities} />

          <AIBusinessInsights
            lowStock={widgets.lowStock}
            topProducts={widgets.topProducts}
          />

          <SmartInventoryMonitoring
            lowStock={widgets.lowStock}
            totalProducts={widgets.totalProducts}
          />

          <CustomerAnalytics
            rating={widgets.overview?.rating ?? 0}
            views={widgets.overview?.views ?? 0}
            orders={widgets.overview?.orders ?? 0}
            salesFormatted={widgets.overview?.salesFormatted ?? "₹0"}
          />


        </View>

      </View>
    </View>
  );
}

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

});
