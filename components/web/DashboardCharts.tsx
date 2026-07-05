import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, TextInput } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AppText } from "@/components/AppText";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, ClipPath, Rect } from "react-native-svg";
import type { SalesPeriod } from "./DashboardAnalytics";

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

export type { SalesPeriod };

interface DashboardChartsProps {
  salesPeriod: SalesPeriod;
  onSalesPeriodChange: (period: SalesPeriod) => void;
  customFrom: Date;
  customTo: Date;
  onCustomFromChange: (date: Date) => void;
  onCustomToChange: (date: Date) => void;
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

const PERIOD_OPTIONS: SalesPeriod[] = ["Day", "Week", "Month", "Custom"];

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function periodRevenueLabel(period: SalesPeriod): string {
  if (period === "Day") return "Today's Revenue";
  if (period === "Week") return "Week Revenue";
  if (period === "Month") return "Month Revenue";
  return "Custom Range Revenue";
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  salesPeriod,
  onSalesPeriodChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  salesData,
  allStatsData,
  reviewCount = 0,
}) => {
  const { width } = useWindowDimensions();
  const [chartWidth, setChartWidth] = useState(0);
  const [datePickerTarget, setDatePickerTarget] = useState<"from" | "to" | null>(null);
  const isDesktop = width >= 1024;

  const currentSales = salesData[salesPeriod];
  const currentStats = allStatsData[salesPeriod];

  // Dynamic layout calculations
  const totalPadding = isDesktop ? 324 : 64; // Sidebar (260) + Content Padding
  const availableWidth = width - totalPadding;
  const mainChartWidth = isDesktop ? availableWidth * 0.65 - 40 : availableWidth - 40;
  const mainChartHeight = 220;

  const renderSVGChart = () => {
    const W = Math.max(chartWidth || mainChartWidth, 1);
    const H = mainChartHeight;
    const padding = 24;
    const chartW = Math.max(W - padding * 2, 1);
    const chartH = Math.max(H - padding * 2, 1);

    if (W <= 0 || H <= 0) return null;

    const points = currentSales.points;
    if (points.length === 0) return null;
    if (points.length === 1) return null;

    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;

    const xs = points.map((_, i) => padding + (i / (points.length - 1)) * chartW);
    const ys = points.map((v) => padding + chartH - ((v - min) / range) * chartH);

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

    return (
      <View style={{ width: W, height: H, overflow: "hidden" }}>
        <Svg width={W} height={H}>
          <Defs>
            <SvgLinearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={C.purple} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={C.purple} stopOpacity={0.0} />
            </SvgLinearGradient>
            <ClipPath id="chartClip">
              <Rect x={0} y={0} width={W} height={H} />
            </ClipPath>
          </Defs>
          <Path d={fillPath} fill="url(#revenueGrad)" clipPath="url(#chartClip)" />
          <Path d={linePath} stroke={C.purple} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#chartClip)" />
          {xs.map((x, i) => (
            <Circle key={`rev-${i}`} cx={x} cy={ys[i]} r={3} fill={C.white} stroke={C.purple} strokeWidth={1.5} clipPath="url(#chartClip)" />
          ))}
        </Svg>
      </View>
    );
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
            {PERIOD_OPTIONS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => onSalesPeriodChange(p)}
                style={[styles.periodTab, salesPeriod === p && styles.periodTabActive]}
                activeOpacity={0.8}
              >
                <AppText style={[styles.periodTabText, salesPeriod === p && styles.periodTabTextActive]}>
                  {p === "Custom" ? "Custom Time" : p}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {salesPeriod === "Custom" ? (
          <View style={styles.customRangeRow}>
            <TouchableOpacity style={styles.customDateBtn} onPress={() => setDatePickerTarget("from")} activeOpacity={0.85}>
              <AppText style={styles.customDateLabel}>From</AppText>
              {Platform.OS === "web" ? (
                <input
                  type="date"
                  value={toIsoDate(customFrom)}
                  max={toIsoDate(customTo)}
                  onChange={(e) => {
                    const next = new Date(e.target.value);
                    if (!Number.isNaN(next.getTime())) onCustomFromChange(next);
                  }}
                  style={{ border: "none", background: "transparent", fontFamily: "Poppins, sans-serif", fontSize: 13, color: C.textDark, outline: "none" } as any}
                />
              ) : (
                <AppText style={styles.customDateValue}>{formatDisplayDate(customFrom)}</AppText>
              )}
            </TouchableOpacity>
            <AppText style={styles.customDateSep}>–</AppText>
            <TouchableOpacity style={styles.customDateBtn} onPress={() => setDatePickerTarget("to")} activeOpacity={0.85}>
              <AppText style={styles.customDateLabel}>To</AppText>
              {Platform.OS === "web" ? (
                <input
                  type="date"
                  value={toIsoDate(customTo)}
                  min={toIsoDate(customFrom)}
                  onChange={(e) => {
                    const next = new Date(e.target.value);
                    if (!Number.isNaN(next.getTime())) onCustomToChange(next);
                  }}
                  style={{ border: "none", background: "transparent", fontFamily: "Poppins, sans-serif", fontSize: 13, color: C.textDark, outline: "none" } as any}
                />
              ) : (
                <AppText style={styles.customDateValue}>{formatDisplayDate(customTo)}</AppText>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {datePickerTarget && Platform.OS !== "web" ? (
          <DateTimePicker
            value={datePickerTarget === "from" ? customFrom : customTo}
            mode="date"
            display="default"
            maximumDate={datePickerTarget === "from" ? customTo : new Date()}
            minimumDate={datePickerTarget === "to" ? customFrom : undefined}
            onChange={(_, selectedDate) => {
              setDatePickerTarget(null);
              if (!selectedDate) return;
              if (datePickerTarget === "from") onCustomFromChange(selectedDate);
              else onCustomToChange(selectedDate);
            }}
          />
        ) : null}

        <View style={styles.revenueTabRow}>
          <MaterialCommunityIcons name="cash-multiple" size={14} color={C.purple} />
          <AppText style={styles.revenueTabLabel}>Revenue Overview</AppText>
        </View>

        <View style={styles.chartDetailsRow}>
          <View style={styles.detailItem}>
            <AppText style={styles.detailLabel}>{periodRevenueLabel(salesPeriod)}</AppText>
            <View style={styles.detailValRow}>
              <AppText style={styles.detailValue}>{currentStats.sales || currentSales.totalSales}</AppText>
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
          <View style={styles.xAxisRow}>
            {currentSales.labels.map((label, idx) => (
              <AppText key={idx} style={styles.xAxisLabel}>
                {label}
              </AppText>
            ))}
          </View>
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
  customRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  customDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customDateLabel: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: C.textLight,
  },
  customDateValue: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: C.textDark,
  },
  customDateSep: {
    fontSize: 14,
    color: C.textLight,
  },
  revenueTabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  revenueTabLabel: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: C.purple,
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
