import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from "react-native";
import { AppText } from "@/components/AppText";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect, Defs, LinearGradient as SvgLinearGradient, Stop, ClipPath } from "react-native-svg";

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
  teal: "#14B8A6",
  pink: "#FF3F6C",
  white: "#FFFFFF",
  border: "#E5E7EB",
  bg: "#F7F8FC",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#9CA3AF",
};

export type SalesPeriod = "Day" | "Week" | "Month" | "Year";
export type ChartMetric =
  | "Revenue"
  | "Expenses"
  | "OrdersReturns"
  | "ProductPerf"
  | "Geographic";

interface DashboardChartsProps {
  salesPeriod: SalesPeriod;
  onSalesPeriodChange: (period: SalesPeriod) => void;
  salesData: Record<SalesPeriod, {
    points: number[];
    labels: string[];
    totalSales: string;
    totalOrders: string;
    salesChange: string;
    ordersChange: string;
  }>;
  allStatsData: Record<SalesPeriod, {
    orders: string; ordersChange: string;
    sales: string; salesChange: string;
    views: string; viewsChange: string;
    rating: string; ratingChange: string;
    newCustomers: string; newCustomersChange: string;
    avgOrderValue: string; avgOrderValueChange: string;
    conversionRate: string; conversionRateChange: string;
    returns: string; returnsChange: string;
  }>;
  reviewCount?: number;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  salesPeriod,
  onSalesPeriodChange,
  salesData,
  allStatsData,
  reviewCount = 0,
}) => {
  const { width } = useWindowDimensions();
  const [chartWidth, setChartWidth] = useState(0);
  const isDesktop = width >= 1024;

  const [activeMetric, setActiveMetric] = useState<ChartMetric>("Revenue");

  const currentSales = salesData[salesPeriod];
  const currentStats = allStatsData[salesPeriod];

  // Dynamic layout calculations
  const totalPadding = isDesktop ? 324 : 64; // Sidebar (260) + Content Padding
  const availableWidth = width - totalPadding;
  const mainChartWidth = isDesktop ? availableWidth * 0.65 - 40 : availableWidth - 40;
  const mainChartHeight = 220;

  // Chart options configuration
  const chartOptions: { key: ChartMetric; label: string; icon: string }[] = [
    { key: "Revenue", label: "Revenue Overview", icon: "cash-multiple" },
    { key: "Expenses", label: "Revenue vs Expenses", icon: "arrow-decision" },
    { key: "OrdersReturns", label: "Orders vs Returns", icon: "swap-horizontal" },
    { key: "ProductPerf", label: "Product Category Perf.", icon: "chart-bar" },
    { key: "Geographic", label: "Geographic Sales", icon: "map-marker-radius" },
  ];

  // Render SVG Area Chart
  const renderSVGChart = () => {
    const W = chartWidth || mainChartWidth;
    const H = mainChartHeight;
    // Enough padding so 2.5px stroke + round linecap never bleeds outside
    const padding = 24;
    const chartW = W - padding * 2;
    const chartH = H - padding * 2;

    if (activeMetric === "Revenue" || activeMetric === "Expenses") {
      const points = currentSales.points;
      const expensePoints = points.map((p) => Math.round(p * 0.45 + 10));
      if (points.length === 0) return null;

      const max = Math.max(...points, ...expensePoints);
      const min = Math.min(...points, ...expensePoints);
      const range = max - min || 1;

      const xs = points.map((_, i) => padding + (i / (points.length - 1)) * chartW);
      const ys = points.map((v) => padding + chartH - ((v - min) / range) * chartH);
      const eys = expensePoints.map((v) => padding + chartH - ((v - min) / range) * chartH);

      // Smooth bezier curve paths for Revenue
      let linePath = `M ${xs[0]} ${ys[0]}`;
      for (let i = 1; i < points.length; i++) {
        const prevX = xs[i - 1] ?? 0;
        const prevY = ys[i - 1] ?? 0;
        const x = xs[i] ?? 0;
        const y = ys[i] ?? 0;
        const cx = (prevX + x) / 2;
        linePath += ` Q ${cx} ${prevY}, ${x} ${y}`;
      }
      const fillPath = `${linePath} L ${xs[xs.length - 1]} ${H - padding} L ${xs[0]} ${H - padding} Z`;

      // Smooth bezier curve paths for Expenses
      let expLinePath = `M ${xs[0]} ${eys[0]}`;
      for (let i = 1; i < expensePoints.length; i++) {
        const prevX = xs[i - 1] ?? 0;
        const prevY = eys[i - 1] ?? 0;
        const x = xs[i] ?? 0;
        const y = eys[i] ?? 0;
        const cx = (prevX + x) / 2;
        expLinePath += ` Q ${cx} ${prevY}, ${x} ${y}`;
      }

      return (
        <View style={{ width: W, height: H, overflow: "hidden" }}>
          <Svg width={W} height={H}>
            <Defs>
              <SvgLinearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={C.purple} stopOpacity={0.25} />
                <Stop offset="100%" stopColor={C.purple} stopOpacity={0.0} />
              </SvgLinearGradient>
              <SvgLinearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={C.orange} stopOpacity={0.15} />
                <Stop offset="100%" stopColor={C.orange} stopOpacity={0.0} />
              </SvgLinearGradient>
              <ClipPath id="chartClip">
                <Rect x={0} y={0} width={W} height={H} />
              </ClipPath>
            </Defs>

            {/* Revenue Area Fill */}
            <Path d={fillPath} fill="url(#revenueGrad)" clipPath="url(#chartClip)" />

            {/* Revenue Line */}
            <Path d={linePath} stroke={C.purple} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#chartClip)" />

            {/* Revenue Dots */}
            {xs.map((x, i) => (
              <Circle key={`rev-${i}`} cx={x} cy={ys[i]} r={3} fill={C.white} stroke={C.purple} strokeWidth={1.5} clipPath="url(#chartClip)" />
            ))}

            {/* Expenses Line */}
            {activeMetric === "Expenses" && (
              <>
                <Path d={expLinePath} stroke={C.orange} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#chartClip)" />
                {xs.map((x, i) => (
                  <Circle key={`exp-${i}`} cx={x} cy={eys[i]} r={3} fill={C.white} stroke={C.orange} strokeWidth={1.5} clipPath="url(#chartClip)" />
                ))}
              </>
            )}
          </Svg>
        </View>
      );
    }

    if (activeMetric === "OrdersReturns") {
      // Double Bar Chart for Orders vs Returns
      const orders = [25, 42, 30, 56, 45, 68, 55];
      const returns = [2, 5, 4, 8, 3, 7, 5];
      const max = 75;

      const barW = Math.round(chartW / 14);
      const gap = Math.round(chartW / 7);

      return (
        <View style={{ width: W, height: H }}>
          <Svg width={W} height={H}>
            {orders.map((val, idx) => {
              const xOrders = padding + idx * gap + barW;
              const xReturns = xOrders + barW + 2;
              const hOrders = (val / max) * chartH;
              const hReturns = (returns[idx]! / max) * chartH;

              return (
                <React.Fragment key={idx}>
                  {/* Orders Bar */}
                  <Rect
                    x={xOrders}
                    y={padding + chartH - hOrders}
                    width={barW}
                    height={hOrders}
                    fill={C.purple}
                    rx={4}
                  />
                  {/* Returns Bar */}
                  <Rect
                    x={xReturns}
                    y={padding + chartH - hReturns}
                    width={barW}
                    height={hReturns}
                    fill={C.pink}
                    rx={2}
                  />
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      );
    }

    if (activeMetric === "ProductPerf") {
      // Product Performance Category Bar Chart
      const cats = ["Clothing", "Accessories", "Footwear", "Jewelry", "Other"];
      const vals = [75, 52, 38, 28, 12];
      const barH = Math.round(chartH / 6);
      const max = 100;

      return (
        <View style={{ width: W, height: H, paddingHorizontal: padding }}>
          {cats.map((cat, idx) => {
            const widthPct = `${(vals[idx]! / max) * 75}%`;
            return (
              <View key={idx} style={styles.catBarRow}>
                <AppText style={styles.catLabel} numberOfLines={1}>{cat}</AppText>
                <View style={styles.catBarBg}>
                  <View style={[styles.catBarFill, { width: widthPct as any, backgroundColor: C.purple }]} />
                </View>
                <AppText style={styles.catValText}>{vals[idx]}%</AppText>
              </View>
            );
          })}
        </View>
      );
    }

    if (activeMetric === "Geographic") {
      return (
        <View style={[styles.emptyChartState, { width: W, height: H }]}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={28} color={C.textLight} />
          <AppText style={styles.emptyChartTitle}>Geographic breakdown</AppText>
          <AppText style={styles.emptyChartSub}>City-level sales will appear here once regional analytics are available from the backend.</AppText>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, !isDesktop && styles.containerStacked]}>
      {/* ── LEFT: REVENUE CHART CARD ── */}
      <View style={[styles.mainCard, isDesktop ? { width: "65%" } : { width: "100%" }]}>
        <View style={styles.cardHeader}>
          <View>
            <AppText style={styles.cardTitle}>Store Intelligence Charts</AppText>
            <AppText style={styles.cardSubtitle}>Enterprise multi-dimensional analytics matrix</AppText>
          </View>
          
          {/* Segmented Period Selector */}
          <View style={styles.periodTabs}>
            {(["Day", "Week", "Month", "Year"] as SalesPeriod[]).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => onSalesPeriodChange(p)}
                style={[styles.periodTab, salesPeriod === p && styles.periodTabActive]}
                activeOpacity={0.8}
              >
                <AppText style={[styles.periodTabText, salesPeriod === p && styles.periodTabTextActive]}>
                  {p}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dynamic Metric Selection Tab list */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsSelector}>
          {chartOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.metricTabBtn, activeMetric === opt.key && styles.metricTabBtnActive]}
              onPress={() => setActiveMetric(opt.key)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={opt.icon as any}
                size={14}
                color={activeMetric === opt.key ? C.purple : C.textLight}
                style={{ marginRight: 6 }}
              />
              <AppText style={[styles.metricTabLabel, activeMetric === opt.key && styles.metricTabLabelActive]}>
                {opt.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.chartDetailsRow}>
          <View style={styles.detailItem}>
            <AppText style={styles.detailLabel}>Total Revenue</AppText>
            <View style={styles.detailValRow}>
              <AppText style={styles.detailValue}>{currentSales.totalSales}</AppText>
              <View style={styles.changeBadge}>
                <Ionicons name="caret-up" size={12} color={C.green} />
                <AppText style={styles.changeText}>{currentSales.salesChange}</AppText>
              </View>
            </View>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <AppText style={styles.detailLabel}>Total Orders</AppText>
            <View style={styles.detailValRow}>
              <AppText style={styles.detailValue}>{currentSales.totalOrders}</AppText>
              <View style={styles.changeBadge}>
                <Ionicons name="caret-up" size={12} color={C.green} />
                <AppText style={styles.changeText}>{currentSales.ordersChange}</AppText>
              </View>
            </View>
          </View>
        </View>

        <View 
          style={styles.chartArea}
          onLayout={(e) => {
            const { width } = e.nativeEvent.layout;
            if (width > 0) {
              setChartWidth(width);
            }
          }}
        >
          {renderSVGChart()}
          {activeMetric !== "ProductPerf" && activeMetric !== "Geographic" && (
            <View style={styles.xAxisRow}>
              {currentSales.labels.map((label, idx) => (
                <AppText key={idx} style={styles.xAxisLabel}>
                  {label}
                </AppText>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ── RIGHT: SALES ANALYTICS CARD ── */}
      <View style={[styles.sideCard, isDesktop ? { width: "35%" } : { width: "100%" }]}>
        <View style={styles.sideCardHeader}>
          <AppText style={styles.sideCardTitle}>Conversion Funnel</AppText>
          <AppText style={styles.sideCardSubtitle}>Key conversion & satisfaction metrics</AppText>
        </View>

        <View style={styles.analyticsList}>
          {/* Rating */}
          <View style={styles.analyticsItem}>
            <View style={styles.analyticsIconBox}>
              <Ionicons name="star" size={18} color={C.yellow} />
            </View>
            <View style={styles.analyticsContent}>
              <AppText style={styles.analyticsLabel}>Average Rating</AppText>
              <AppText style={styles.analyticsValue}>
                {currentStats.rating}{" "}
                <AppText style={styles.analyticsSub}>
                  / 5.0 ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
                </AppText>
              </AppText>
            </View>
            {Number(currentStats.rating) > 0 ? (
              <View style={styles.ratingBadge}>
                <AppText style={styles.ratingBadgeText}>
                  {Number(currentStats.rating) >= 4.5
                    ? "Excellent"
                    : Number(currentStats.rating) >= 4
                      ? "Great"
                      : Number(currentStats.rating) >= 3
                        ? "Good"
                        : "Fair"}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Average Order Value */}
          <View style={styles.analyticsItem}>
            <View style={[styles.analyticsIconBox, { backgroundColor: "#EFF6FF" }]}>
              <MaterialCommunityIcons name="receipt" size={18} color={C.blue} />
            </View>
            <View style={styles.analyticsContent}>
              <AppText style={styles.analyticsLabel}>Avg. Order Value</AppText>
              <AppText style={styles.analyticsValue}>{currentStats.avgOrderValue}</AppText>
            </View>
            <AppText style={styles.trendText}>{currentStats.avgOrderValueChange}</AppText>
          </View>

          {/* Views */}
          <View style={styles.analyticsItem}>
            <View style={[styles.analyticsIconBox, { backgroundColor: "#FDF2F8" }]}>
              <MaterialCommunityIcons name="eye-outline" size={18} color={C.pink} />
            </View>
            <View style={styles.analyticsContent}>
              <AppText style={styles.analyticsLabel}>Store Views</AppText>
              <AppText style={styles.analyticsValue}>{currentStats.views}</AppText>
            </View>
            <AppText style={styles.trendText}>{currentStats.viewsChange}</AppText>
          </View>
        </View>

        {/* Monthly sales snapshot (from live dashboard stats) */}
        <View style={styles.targetSection}>
          <View style={styles.targetHeader}>
            <AppText style={styles.targetLabel}>Monthly Sales</AppText>
            <AppText style={styles.targetVal}>{currentStats.sales}</AppText>
          </View>
          <AppText style={styles.targetSub}>
            {currentStats.salesChange !== "—"
              ? `${currentStats.salesChange} vs previous period`
              : "Period comparison unavailable"}
          </AppText>
        </View>
      </View>
    </View>
  );
};

// Standard React Native ScrollView to fix typing
const ScrollView = require("react-native").ScrollView;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  containerStacked: {
    flexDirection: "column",
  },
  mainCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.02)",
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
    marginTop: 1,
  },
  periodTabs: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  periodTab: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  periodTabActive: {
    backgroundColor: C.white,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      },
    }),
  },
  periodTabText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: C.textMid,
  },
  periodTabTextActive: {
    color: C.purple,
    fontFamily: "Poppins_600SemiBold",
  },
  metricsSelector: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  metricTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  metricTabBtnActive: {
    borderColor: C.purple,
    backgroundColor: C.purplePale,
  },
  metricTabLabel: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: C.textMid,
  },
  metricTabLabelActive: {
    color: C.purple,
    fontFamily: "Poppins_600SemiBold",
  },
  chartDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: C.textLight,
    marginBottom: 2,
  },
  detailValRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailValue: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  changeText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: C.green,
  },
  detailDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },
  chartArea: {
    marginTop: 8,
  },
  xAxisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginTop: 6,
  },
  xAxisLabel: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
  },
  sideCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    justifyContent: "space-between",
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.02)",
      },
    }),
  },
  sideCardHeader: {
    marginBottom: 16,
  },
  sideCardTitle: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  sideCardSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
    marginTop: 1,
  },
  analyticsList: {
    gap: 12,
    marginBottom: 16,
  },
  analyticsItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 10,
  },
  analyticsIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  analyticsContent: {
    flex: 1,
  },
  analyticsLabel: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    color: C.textLight,
    marginBottom: 1,
  },
  analyticsValue: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  analyticsSub: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
  },
  ratingBadge: {
    backgroundColor: "#e6f9ed",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ratingBadgeText: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: C.green,
  },
  trendText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: C.green,
  },
  targetSection: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
  },
  targetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  targetLabel: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: C.textMid,
  },
  targetVal: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    color: C.purple,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: C.bg,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: C.purple,
    borderRadius: 3,
  },
  targetSub: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
  },
  emptyChartState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyChartTitle: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: C.textMid,
    textAlign: "center",
  },
  emptyChartSub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
    textAlign: "center",
    lineHeight: 18,
  },
  catBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  catLabel: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: C.textMid,
    width: 80,
  },
  catBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: C.bg,
    borderRadius: 4,
    overflow: "hidden",
  },
  catBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  catValText: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
    width: 48,
    textAlign: "right",
  },
});
