import React, { useState } from "react";
import { View, StyleSheet, Pressable, useWindowDimensions, Platform } from "react-native";
import { AppText } from "@/components/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { DashboardOrderSummary } from "@/services/dashboardApi";
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, ClipPath, Rect } from "react-native-svg";

const C = {
  navy: "#1E2B6B",
  navyDeep: "#151D4F",
  navyLight: "#2D3E8A",
  purple: "#6C63FF",
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
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#9CA3AF",
};

export type SalesPeriod = "Day" | "Week" | "Month" | "Year";

interface DashboardAnalyticsProps {
  period: SalesPeriod;
  orderSummary?: DashboardOrderSummary | null;
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
}

const Sparkline: React.FC<{ points: number[]; color: string; width?: number; height?: number }> = ({
  points,
  color,
  width = 80,
  height = 36,
}) => {
  if (!points || points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  // Generous padding ensures stroke + round linecap never bleed outside
  const padX = 3;
  const padY = 4;
  const drawW = width - padX * 2;
  const drawH = height - padY * 2;

  // Map values to pixel coordinates
  const coords = points.map((val, i) => ({
    x: padX + (i / (points.length - 1)) * drawW,
    y: padY + drawH - ((val - min) / range) * drawH,
  }));

  // Smooth cubic bezier path — uses midpoint control points
  let linePath = `M ${coords[0]!.x} ${coords[0]!.y}`;
  for (let i = 1; i < coords.length; i++) {
    const p0 = coords[i - 1]!;
    const p1 = coords[i]!;
    const cpX = (p0.x + p1.x) / 2;
    linePath += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  // Fill: close path to the bottom of the SVG
  const last = coords[coords.length - 1]!;
  const first = coords[0]!;
  const fillPath = `${linePath} L ${last.x} ${height} L ${first.x} ${height} Z`;

  // Unique IDs per color — prevent gradient/clip collision between cards
  const uid = color.replace(/[^a-z0-9]/gi, "");
  const gradId = `sg${uid}`;
  const clipId = `sc${uid}`;

  return (
    <View style={{ width, height, overflow: "hidden" }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </SvgLinearGradient>
          <ClipPath id={clipId}>
            <Rect x={0} y={0} width={width} height={height} />
          </ClipPath>
        </Defs>
        {/* Gradient fill area */}
        <Path d={fillPath} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />
        {/* Smooth bezier line */}
        <Path
          d={linePath}
          stroke={color}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${clipId})`}
        />
      </Svg>
    </View>
  );
};

// Self-measuring wrapper — gets actual rendered pixel width via onLayout
const SparklineRow: React.FC<{ points: number[]; color: string }> = ({ points, color }) => {
  const [w, setW] = useState(0);
  return (
    <View
      style={sparkRowStyle}
      onLayout={(e) => {
        const measured = e.nativeEvent.layout.width;
        if (measured > 0) setW(measured);
      }}
    >
      {w > 0 && <Sparkline points={points} color={color} width={w} height={36} />}
    </View>
  );
};

const sparkRowStyle = {
  width: "100%" as const,
  height: 36,
  overflow: "hidden" as const,
  marginTop: 8,
  marginBottom: 4,
};

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  period,
  allStatsData,
  orderSummary,
}) => {
  const { width } = useWindowDimensions();
  const data = allStatsData[period];

  let cardWidth = "33.33%";
  if (width >= 1440) {
    cardWidth = "16.66%";
  } else if (width >= 1024) {
    cardWidth = "33.33%";
  } else {
    cardWidth = "50%";
  }

  const revenueVal = data.sales;
  const ordersVal = data.orders;
  const ordersPending = orderSummary ? String(orderSummary.pending) : "—";
  const ordersShipped = orderSummary ? String(orderSummary.shipped) : "—";
  const ordersDelivered = orderSummary ? String(orderSummary.delivered) : "—";

  const viewsVal = data.views;
  const cartRate = "—";
  const checkoutRate = data.conversionRate;

  const custVal = data.newCustomers;
  const custRepeat = "—";
  const custTop = "—";

  const netVal = data.avgOrderValue;
  const grossText = data.sales;

  const visitorsVal = data.views;
  const clicksVal = "—";
  const bounceVal = "—";

  const kpis = [
    {
      title: "Revenue Analytics",
      value: revenueVal,
      change: data.salesChange,
      isPositive: true,
      icon: "currency-inr" as const,
      color: C.green,
      bgColor: "#F0FDF4",
      description: `Returns: ${data.returns}`,
      points: [10, 25, 18, 35, 30, 45, 40],
    },
    {
      title: "Orders Analytics",
      value: ordersVal,
      change: data.ordersChange,
      isPositive: true,
      icon: "shopping-outline" as const,
      color: C.purple,
      bgColor: C.purplePale,
      description: `Pend: ${ordersPending} • Ship: ${ordersShipped} • Deliv: ${ordersDelivered}`,
      points: [5, 15, 8, 20, 12, 28, 22],
    },
    {
      title: "Conversion Analytics",
      value: data.conversionRate,
      change: data.conversionRateChange,
      isPositive: true,
      icon: "percent" as const,
      color: C.pink,
      bgColor: "#FDF2F8",
      description: `Views: ${viewsVal} • Cart: ${cartRate} • Chk: ${checkoutRate}`,
      points: [40, 42, 38, 45, 43, 48, 44],
    },
    {
      title: "Customer Insights",
      value: custVal,
      change: data.newCustomersChange,
      isPositive: true,
      icon: "account-plus-outline" as const,
      color: C.blue,
      bgColor: "#EFF6FF",
      description: `Repeat: ${custRepeat} • Top: ${custTop}`,
      points: [12, 18, 15, 22, 20, 32, 28],
    },
    {
      title: "Profit Analytics",
      value: netVal,
      change: data.avgOrderValueChange,
      isPositive: true,
      icon: "wallet-outline" as const,
      color: C.teal,
      bgColor: "#F0FDFA",
      description: `Gross: ${grossText}`,
      points: [8, 20, 14, 28, 22, 38, 32],
    },
    {
      title: "Traffic Analytics",
      value: visitorsVal,
      change: data.viewsChange,
      isPositive: true,
      icon: "trending-up" as const,
      color: C.orange,
      bgColor: "#FFF7ED",
      description: `Clicks: ${clicksVal} • Bounce: ${bounceVal}`,
      points: [100, 120, 110, 140, 135, 160, 150],
    },
  ];

  return (
    <View style={styles.grid}>
      {kpis.map((kpi, index) => (
        <View key={index} style={[styles.col, { width: cardWidth as any }]}>
          <Pressable
            // @ts-ignore
            style={({ hovered }) => [
              styles.card,
              hovered && styles.cardHovered,
            ]}
          >
            <View style={styles.cardHeader}>
              <AppText style={styles.cardTitle}>{kpi.title}</AppText>
              <View style={[styles.iconBox, { backgroundColor: kpi.bgColor }]}>
                <MaterialCommunityIcons name={kpi.icon as any} size={18} color={kpi.color} />
              </View>
            </View>
            
            <View style={styles.cardBody}>
              {/* Value + Change badge row */}
              <View style={styles.valueRow}>
                <AppText style={styles.cardValue}>{kpi.value}</AppText>
                <View style={[styles.badge, { backgroundColor: kpi.isPositive ? "#e6f9ed" : "#feebee" }]}>
                  <MaterialCommunityIcons
                    name={kpi.isPositive ? "arrow-up" : "arrow-down"}
                    size={11}
                    color={kpi.isPositive ? C.green : C.red}
                  />
                  <AppText style={[styles.changeText, { color: kpi.isPositive ? C.green : C.red }]}>
                    {kpi.change}
                  </AppText>
                </View>
              </View>

              {/* Full-width sparkline below the value */}
              <SparklineRow points={kpi.points} color={kpi.color} />
              <View style={styles.changeRow}>
                <AppText style={styles.descText} numberOfLines={1}>{kpi.description}</AppText>
              </View>
            </View>
          </Pressable>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
    marginBottom: 8,
    paddingTop: 10,
  },
  col: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    minHeight: 128,
    justifyContent: "space-between",
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.02)",
        transitionDuration: "150ms",
        transitionProperty: "transform, box-shadow",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  cardHovered: {
    transform: [{ translateY: -3 }],
    ...Platform.select({
      web: {
        boxShadow: "0 8px 16px -4px rgba(21, 29, 79, 0.06), 0 4px 8px -2px rgba(21, 29, 79, 0.03)",
        borderColor: C.purple + "40",
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: C.textMid,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    marginTop: 8,
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sparklineWrap: {
    width: "100%",
    height: 36,
    marginVertical: 6,
    overflow: "hidden",
  },
  cardValue: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
    letterSpacing: -0.5,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  changeText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
  },
  descText: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
    flex: 1,
  },
});
