import React, { useState, useMemo, useEffect } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "@/components/AppText";
import { DashboardAnalytics } from "./DashboardAnalytics";
import type { SalesPeriod } from "./DashboardAnalytics";
import { DashboardCharts } from "./DashboardCharts";
import { DashboardTables } from "./DashboardTables";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SellerAccountReviewDashboard } from "@/components/SellerAccountReviewDashboard";
import { CompleteProfileDashboardCard } from "@/components/CompleteProfileDashboardCard";
import type { SellerProfileSummary } from "@/hooks/useSellerProfileSummary";
import { useResponsive } from "@/hooks/useResponsive";

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

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
  onProfileReload?: (() => void | Promise<void>) | undefined;
};

export function DesktopDashboard({
  profile,
  profileLoading,
  onProfileReload,
}: DesktopDashboardProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isMobile } = useResponsive();
  const isDesktop = width >= 1200;
  const {
    data,
    reviewCount,
    referral,
    loading: dashboardLoading,
    error: dashboardError,
    reload: reloadDashboard,
  } = useDashboardData();
  const widgets = useDashboardWidgets();

  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>("Week");
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d;
  });
  const [customTo, setCustomTo] = useState(() => new Date());

  const customRange = useMemo(
    () => ({
      from: toIsoDate(customFrom),
      to: toIsoDate(customTo),
    }),
    [customFrom, customTo],
  );

  const { salesChart, error: chartsError } = useDashboardCharts(
    salesPeriod,
    salesPeriod === "Custom" ? customRange : null,
  );
  const { allStatsData } = useDashboardStatsByPeriod(true);
  const welcomeName = profile?.fullName ?? (profileLoading ? "…" : "Seller");
  const loadError = dashboardError || chartsError || widgets.dashboard.error;

  const salesDataMerged = useMemo(() => {
    const empty = {
      Day: EMPTY_SALES_CHART,
      Week: EMPTY_SALES_CHART,
      Month: EMPTY_SALES_CHART,
      Custom: EMPTY_SALES_CHART,
    };
    if (!salesChart) return empty;
    const chart = salesChart;
    return {
      Day: chart,
      Week: chart,
      Month: chart,
      Custom: chart,
    };
  }, [salesChart]);

  const mergedAllStats = useMemo(() => {
    if (salesPeriod !== "Custom" || !salesChart) return allStatsData;
    return {
      ...allStatsData,
      Custom: {
        ...allStatsData.Custom,
        sales: salesChart.totalSales,
        orders: salesChart.totalOrders,
        salesChange: "—",
        ordersChange: "—",
      },
    };
  }, [allStatsData, salesPeriod, salesChart]);

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

  const profileIncomplete = !profileLoading && profile && !profile.profileCompleted;
  const approvalState = profile?.accountStatus?.approvalState;
  const showAccountReviewDashboard =
    !profileLoading &&
    profile?.profileCompleted &&
    (approvalState === "pending_review" || approvalState === "rejected");

    return (
        <View style={[styles.container, isMobile && styles.containerMobile]}>
            {loadError && !dashboardLoading ? (
              <View style={[styles.errorBanner, isMobile && styles.errorBannerMobile]}>
                <AppText style={styles.errorBannerText}>{loadError}</AppText>
                <TouchableOpacity onPress={() => void reloadDashboard()} style={styles.errorRetry}>
                  <AppText style={styles.errorRetryText}>Retry</AppText>
                </TouchableOpacity>
              </View>
            ) : null}
            {showAccountReviewDashboard ? (
              <SellerAccountReviewDashboard
                profile={profile}
                loading={profileLoading}
                embedded
                {...(onProfileReload ? { onRefresh: onProfileReload } : {})}
              />
            ) : null}

            {!showAccountReviewDashboard && !profileIncomplete ? (
              <SmartWelcomeHeader
                name={welcomeName}
                totalOrders={data?.overview?.orders ?? widgets.overview?.orders ?? 0}
                salesFormatted={data?.overview?.salesFormatted ?? widgets.overview?.salesFormatted ?? "₹0"}
                pendingOrders={data?.orderSummary?.pending ?? widgets.orderSummary?.pending ?? 0}
                views={data?.overview?.views ?? widgets.overview?.views ?? 0}
                referralCode={referral?.referralCode ?? ""}
                referralGoal={referral?.goal ?? 6}
                referralTotalReferred={referral?.totalReferred ?? 0}
              />
            ) : null}

            {!showAccountReviewDashboard && profileIncomplete ? (
              <CompleteProfileDashboardCard profile={profile} embedded />
            ) : null}

      {!profileIncomplete && !showAccountReviewDashboard ? (
      <>
      {/* ── 2. ENTERPRISE GRID SYSTEM ── */}
      <View style={[styles.gridRow, !isDesktop && styles.gridStacked]}>
        
        {/* LEFT COLUMN: Main analytical operations (70% width on large screens) */}
        <View style={[styles.leftCol, isDesktop ? { width: "70%" } : { width: "100%" }]}>
          
          {/* Advanced KPI Cards Row */}
          <DashboardAnalytics
            period={salesPeriod}
            allStatsData={mergedAllStats}
            orderSummary={data?.orderSummary ?? null}
          />

          <DashboardCharts
            salesPeriod={salesPeriod}
            onSalesPeriodChange={setSalesPeriod}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={(d) => {
              setCustomFrom(d);
              if (d > customTo) setCustomTo(d);
            }}
            onCustomToChange={(d) => {
              setCustomTo(d);
              if (d < customFrom) setCustomFrom(d);
            }}
            salesData={salesDataMerged}
            allStatsData={mergedAllStats}
            reviewCount={reviewCount}
          />

          {/* Sales Heatmap & Live Tracking */}
          <View style={[styles.flexRow, isMobile && styles.flexColMobile]}>
            <View style={[styles.flexChild, isMobile && styles.flexChildMobile]}>
              <SalesHeatmap points={widgets.weekSalesPoints} />
            </View>
            <View style={[styles.flexChild, isMobile && styles.flexChildMobile]}>
              <LiveOrderTrackingPanel order={activeTrackingOrder} />
            </View>
          </View>

          {/* Top Selling Products Performance Table */}
          <TopProductsPerformance items={widgets.topProducts} />

          {/* Marketing Center & Financial Reconciliation */}
          <View style={[styles.flexRow, isMobile && styles.flexColMobile]}>
            <View style={[styles.flexChild, isMobile && styles.flexChildMobile]}>
              <MarketingCenter />
            </View>
            <View style={[styles.flexChild, isMobile && styles.flexChildMobile]}>
              <FinancialCenter
                availableBalance={widgets.earningsBalance}
                bankName={widgets.bankName}
              />
            </View>
          </View>
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
            rating={data?.overview?.rating ?? widgets.overview?.rating ?? 0}
            views={data?.overview?.views ?? widgets.overview?.views ?? 0}
            orders={data?.overview?.orders ?? widgets.overview?.orders ?? 0}
            salesFormatted={data?.overview?.salesFormatted ?? widgets.overview?.salesFormatted ?? "₹0"}
          />


        </View>

      </View>

      {/* Recent Orders — full width below the dashboard grid */}
      <DashboardTables />
      </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
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
    color: "#DC2626",
    fontFamily: "Poppins_500Medium",
  },
  errorRetry: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.navy,
  },
  errorRetryText: {
    color: C.white,
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  container: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    alignSelf: "stretch",
  },
  containerMobile: {
    paddingBottom: 8,
    overflow: "hidden",
  },
  errorBannerMobile: {
    marginHorizontal: 0,
    marginTop: 8,
  },
  incompleteWelcome: {
    width: "100%",
    marginBottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 0,
  },
  incompleteGreeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Poppins_500Medium",
  },
  incompleteName: {
    fontSize: 26,
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    marginTop: 2,
  },
  gridRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 40,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },
  gridStacked: {
    flexDirection: "column",
    gap: 16,
    marginBottom: 24,
  },
  leftCol: {
    gap: 20,
    minWidth: 0,
    maxWidth: "100%",
  },
  rightCol: {
    gap: 16,
    minWidth: 0,
    maxWidth: "100%",
  },
  flexRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    width: "100%",
    minWidth: 0,
  },
  flexColMobile: {
    flexDirection: "column",
    flexWrap: "nowrap",
  },
  flexChild: {
    flex: 1,
    minWidth: 280,
  },
  flexChildMobile: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: "auto",
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
  },
});
