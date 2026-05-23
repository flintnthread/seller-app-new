import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Pressable, Platform, Image } from "react-native";
import { AppText } from "@/components/AppText";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Rect, Circle } from "react-native-svg";

const C = {
  navy: "#1E2B6B",
  navyDeep: "#151D4F",
  navyLight: "#2D3E8A",
  purple: "#6C63FF",
  purpleLight: "#A89CFF",
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
  teal: "#14B8A6",
  tealPale: "#F0FDFA",
  pink: "#FF3F6C",
  pinkPale: "#FDF2F8",
  white: "#FFFFFF",
  border: "#E5E7EB",
  bg: "#F7F8FC",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#9CA3AF",
};

// ─── 1. SMART WELCOME HEADER ───
export const SmartWelcomeHeader: React.FC<{ name?: string }> = ({ name = "Gopi" }) => {
  const router = useRouter();
  const [greeting, setGreeting] = useState("Good Morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const actions = [
    { label: "Add Product", icon: "plus-circle-outline", path: "/(main)/productmanagement", color: C.purple, bg: C.purplePale },
    { label: "View Orders", icon: "clipboard-text-outline", path: "/(main)/Ordersscreen", color: C.blue, bg: C.bluePale },
    { label: "Withdraw Money", icon: "wallet-outline", path: "/(main)/payoutrequest", color: C.green, bg: C.greenPale },
    { label: "Create Coupon", icon: "tag-outline", action: "coupon", color: C.pink, bg: C.pinkPale },
    { label: "Upload Banner", icon: "image-outline", action: "banner", color: C.orange, bg: C.orangePale },
  ];

  const handlePress = (act: typeof actions[0]) => {
    if (act.path) {
      router.push(act.path as any);
    } else {
      alert(`Action: ${act.label} initialized successfully!`);
    }
  };

  return (
    <View style={welcomeStyles.container}>
      <View style={welcomeStyles.heroText}>
        <AppText style={welcomeStyles.title}>{greeting}, {name} 👋</AppText>
        <AppText style={welcomeStyles.subtitle}>
          Your store sales increased by <AppText style={welcomeStyles.highlight}>18%</AppText> this week. You received <AppText style={welcomeStyles.highlight}>12 new orders</AppText> today.
        </AppText>
        <AppText style={welcomeStyles.motivation}>
          ✨ Keep it up! High customer traffic detected in Clothing categories.
        </AppText>
      </View>

      <View style={welcomeStyles.actionsRow}>
        {actions.map((act, i) => (
          <Pressable
            key={i}
            onPress={() => handlePress(act)}
            // @ts-ignore
            style={({ hovered }) => [
              welcomeStyles.actionCard,
              { borderColor: act.color + "20" },
              hovered && { transform: [{ translateY: -2 }], boxShadow: "0 6px 12px -2px rgba(21, 29, 79, 0.08)", borderColor: act.color + "50" }
            ]}
          >
            <View style={[welcomeStyles.iconBox, { backgroundColor: act.bg }]}>
              <MaterialCommunityIcons name={act.icon as any} size={20} color={act.color} />
            </View>
            <AppText style={welcomeStyles.actionLabel}>{act.label}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const welcomeStyles = StyleSheet.create({
  container: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    marginBottom: 20,
    ...Platform.select({
      web: {
        background: "linear-gradient(135deg, #FFFFFF 60%, #F0EEFF 100%)",
        boxShadow: "0 1px 4px 0 rgba(108, 99, 255, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)",
      },
    }),
  },
  heroText: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: C.textMid,
    marginTop: 5,
    lineHeight: 20,
  },
  highlight: {
    fontFamily: "Poppins_700Bold",
    color: C.purple,
  },
  motivation: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: C.teal,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: C.tealPale,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 148,
    ...Platform.select({
      web: {
        transitionDuration: "180ms",
        transitionProperty: "transform, box-shadow, border-color",
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)",
      },
    }),
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: C.textDark,
  },
});

// ─── 3. REAL-TIME ACTIVITY FEED ───
export const RealTimeActivityFeed: React.FC = () => {
  const activities = [
    { text: "New order #ORD123456 received from Priya Sharma", time: "5 mins ago", icon: "shopping", color: C.purple, bg: C.purplePale },
    { text: "Customer Anjali Mehta left a 5-star review on Cotton Kurti", time: "1 hour ago", icon: "star", color: C.yellow, bg: C.yellowPale },
    { text: "Product stock 'Silk Dupatta' is low (only 3 units left)", time: "2 hours ago", icon: "alert-decagram", color: C.red, bg: C.redPale },
    { text: "Payment payout of ₹12,450 credited to HDFC bank account", time: "1 day ago", icon: "cash-check", color: C.green, bg: C.greenPale },
    { text: "Product 'Women's Sandals' added to 14 wishlists today", time: "1 day ago", icon: "heart", color: C.pink, bg: C.pinkPale },
  ];

  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>Real-Time Activities</AppText>
        <View style={panelStyles.liveBadge}>
          <View style={panelStyles.pulseDot} />
          <AppText style={panelStyles.liveText}>LIVE</AppText>
        </View>
      </View>
      <View style={panelStyles.list}>
        {activities.map((act, i) => (
          <View key={i} style={panelStyles.item}>
            <View style={[panelStyles.iconWrap, { backgroundColor: act.bg }]}>
              <MaterialCommunityIcons name={act.icon as any} size={16} color={act.color} />
            </View>
            <View style={panelStyles.content}>
              <AppText style={panelStyles.itemText}>{act.text}</AppText>
              <AppText style={panelStyles.itemTime}>{act.time}</AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const panelStyles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.03)",
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.redPale,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.red,
  },
  liveText: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    color: C.red,
  },
  list: {
    gap: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  itemText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: C.textDark,
    lineHeight: 16,
  },
  itemTime: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
    marginTop: 2,
  },
});

// ─── 4. AI BUSINESS INSIGHTS SECTION ───
export const AIBusinessInsights: React.FC = () => {
  const insights = [
    { text: "Suggested Discount: Apply 15% off on Cotton Kurtis to lift checkout conversions by 4.2%.", priority: "HIGH PRIORITY", color: C.pink, bg: C.pinkPale },
    { text: "Trending Categories: Clothing accessories are rising 30% MoM in your local geographic area.", priority: "MARKET TREND", color: C.purple, bg: C.purplePale },
    { text: "Smart Pricing: Lower Ethnic Saree to ₹1,999 to potentially secure 2x listing views.", priority: "STABLE ADVICE", color: C.teal, bg: C.tealPale },
  ];

  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>AI Store Insights</AppText>
        <MaterialCommunityIcons name="brain" size={18} color={C.purple} />
      </View>
      <View style={panelStyles.list}>
        {insights.map((ins, i) => (
          <View key={i} style={[aiStyles.card, { borderColor: ins.color + "20" }]}>
            <View style={[aiStyles.badge, { backgroundColor: ins.bg }]}>
              <AppText style={[aiStyles.badgeText, { color: ins.color }]}>{ins.priority}</AppText>
            </View>
            <AppText style={aiStyles.text}>{ins.text}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
};

const aiStyles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
  },
  text: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: C.textMid,
    lineHeight: 16,
  },
});

// ─── 5. SALES HEATMAP ───
export const SalesHeatmap: React.FC = () => {
  // Render GitHub-style activity matrix grid
  const cols = 15;
  const rows = 7;
  const opacityMatrix = [
    [0.1, 0.4, 0.8, 0.2, 0.5, 0.9, 0.1, 0.3, 0.7, 0.2, 0.4, 0.8, 0.1, 0.5, 0.9],
    [0.3, 0.1, 0.5, 0.8, 0.2, 0.4, 0.7, 0.1, 0.3, 0.6, 0.9, 0.1, 0.4, 0.8, 0.2],
    [0.6, 0.9, 0.1, 0.3, 0.6, 0.8, 0.2, 0.4, 0.9, 0.1, 0.5, 0.7, 0.2, 0.3, 0.6],
    [0.2, 0.4, 0.7, 0.1, 0.5, 0.9, 0.1, 0.3, 0.6, 0.8, 0.2, 0.4, 0.7, 0.1, 0.5],
    [0.5, 0.8, 0.2, 0.4, 0.7, 0.1, 0.4, 0.8, 0.2, 0.5, 0.9, 0.1, 0.3, 0.6, 0.8],
    [0.9, 0.1, 0.3, 0.6, 0.8, 0.2, 0.5, 0.9, 0.1, 0.4, 0.7, 0.2, 0.5, 0.9, 0.1],
    [0.1, 0.5, 0.9, 0.1, 0.3, 0.7, 0.2, 0.4, 0.8, 0.1, 0.3, 0.6, 0.8, 0.2, 0.4],
  ];

  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>Hourly Sales Heatmap</AppText>
        <AppText style={panelStyles.liveText}>Past 30 Days Activity</AppText>
      </View>
      <View style={heatmapStyles.gridWrap}>
        <Svg width="100%" height={100} viewBox="0 0 320 100">
          {Array.from({ length: cols }).map((_, c) =>
            Array.from({ length: rows }).map((_, r) => {
              const opVal = opacityMatrix[r]?.[c] ?? 0.1;
              return (
                <Rect
                  key={`${c}-${r}`}
                  x={c * 20 + 10}
                  y={r * 12 + 6}
                  width={16}
                  height={9}
                  rx={2}
                  fill={C.purple}
                  opacity={opVal}
                />
              );
            })
          )}
        </Svg>
      </View>
      <View style={heatmapStyles.meta}>
        <AppText style={heatmapStyles.metaText}>
          🔥 <AppText style={heatmapStyles.bold}>Peak orders</AppText> are typically placed between <AppText style={heatmapStyles.bold}>4 PM - 7 PM</AppText> on Saturdays.
        </AppText>
      </View>
    </View>
  );
};

const heatmapStyles = StyleSheet.create({
  gridWrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    borderRadius: 8,
    padding: 8,
  },
  meta: {
    marginTop: 10,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: C.textMid,
  },
  bold: {
    fontFamily: "Poppins_700Bold",
  },
});

// ─── 7. SMART INVENTORY MONITORING ───
export const SmartInventoryMonitoring: React.FC = () => {
  const lowStocks = [
    { name: "Nike Running Shoes", stock: "2 left", color: C.red },
    { name: "Floral Summer Hoodie", stock: "5 left", color: C.orange },
  ];

  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>Smart Inventory Health</AppText>
        <AppText style={[panelStyles.liveText, { color: C.green }]}>Health: 82%</AppText>
      </View>
      
      <View style={inventoryStyles.healthBarWrap}>
        <View style={inventoryStyles.barBg}>
          <View style={[inventoryStyles.barFill, { width: "82%", backgroundColor: C.green }]} />
        </View>
      </View>

      <AppText style={inventoryStyles.sectionTitle}>Reorder Recommendations</AppText>
      <View style={inventoryStyles.alertList}>
        {lowStocks.map((item, i) => (
          <View key={i} style={inventoryStyles.alertRow}>
            <View style={inventoryStyles.alertLeft}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color={item.color} />
              <AppText style={inventoryStyles.itemName}>{item.name}</AppText>
            </View>
            <View style={[inventoryStyles.pill, { backgroundColor: item.color + "15" }]}>
              <AppText style={[inventoryStyles.pillText, { color: item.color }]}>{item.stock}</AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const inventoryStyles = StyleSheet.create({
  healthBarWrap: {
    marginBottom: 12,
  },
  barBg: {
    height: 8,
    backgroundColor: C.bg,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
    marginBottom: 8,
    marginTop: 4,
  },
  alertList: {
    gap: 8,
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.bg,
    padding: 8,
    borderRadius: 6,
  },
  alertLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemName: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: C.textDark,
  },
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
  },
});

// ─── 8. LIVE ORDER TRACKING PANEL ───
export const LiveOrderTrackingPanel: React.FC = () => {
  const steps = [
    { label: "Processing", done: true },
    { label: "Packed", done: true },
    { label: "Shipped", current: true },
    { label: "Out for Deliv.", done: false },
    { label: "Delivered", done: false },
  ];

  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>Active Order Delivery Pipeline</AppText>
        <AppText style={panelStyles.liveText}>ORD#123455</AppText>
      </View>

      <View style={trackingStyles.timeline}>
        {steps.map((st, i) => {
          const isDone = st.done || st.current;
          return (
            <View key={i} style={trackingStyles.stepCol}>
              <View style={[trackingStyles.circle, isDone && { backgroundColor: C.green, borderColor: C.green }]}>
                {st.done ? (
                  <Ionicons name="checkmark" size={10} color={C.white} />
                ) : st.current ? (
                  <View style={trackingStyles.pulseRing} />
                ) : null}
              </View>
              <AppText style={[trackingStyles.label, st.current && { color: C.purple, fontFamily: "Poppins_700Bold" }]}>{st.label}</AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const trackingStyles = StyleSheet.create({
  timeline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  stepCol: {
    alignItems: "center",
    flex: 1,
  },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  pulseRing: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.white,
  },
  label: {
    fontSize: 9,
    fontFamily: "Poppins_500Medium",
    color: C.textLight,
    textAlign: "center",
  },
});

// ─── 9. TOP PRODUCTS PERFORMANCE ───
export const TopProductsPerformance: React.FC = () => {
  const items = [
    { name: "Cotton Designer Kurti", sold: 120, revenue: "₹1,07,880", conv: "3.4%", ret: "0.8%", profit: "₹240" },
    { name: "Floral Elegant Maxi Dress", sold: 98, revenue: "₹1,27,302", conv: "2.8%", ret: "1.2%", profit: "₹450" },
    { name: "Leather Sling Handbag", sold: 76, revenue: "₹56,924", conv: "2.1%", ret: "2.4%", profit: "₹180" },
  ];

  return (
    <View style={panelStyles.card}>
      <AppText style={[panelStyles.title, { marginBottom: 12 }]}>Top Selling Products Performance</AppText>
      
      {/* Table Headers */}
      <View style={tableStyles.headerRow}>
        <AppText style={[tableStyles.headerText, { flex: 2 }]}>Product</AppText>
        <AppText style={tableStyles.headerText}>Sold</AppText>
        <AppText style={tableStyles.headerText}>Revenue</AppText>
        <AppText style={tableStyles.headerText}>Conv.</AppText>
        <AppText style={tableStyles.headerText}>Returns</AppText>
        <AppText style={tableStyles.headerText}>Net Profit/u</AppText>
      </View>

      {/* Table Rows */}
      {items.map((it, i) => (
        <View key={i} style={tableStyles.row}>
          <AppText style={[tableStyles.cell, { flex: 2, fontFamily: "Poppins_700Bold" }]} numberOfLines={1}>{it.name}</AppText>
          <AppText style={tableStyles.cell}>{it.sold}</AppText>
          <AppText style={tableStyles.cell}>{it.revenue}</AppText>
          <AppText style={tableStyles.cell}>{it.conv}</AppText>
          <AppText style={[tableStyles.cell, { color: C.red }]}>{it.ret}</AppText>
          <AppText style={[tableStyles.cell, { color: C.green }]}>{it.profit}</AppText>
        </View>
      ))}
    </View>
  );
};

const tableStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    backgroundColor: C.bg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  headerText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
    color: C.textLight,
    flex: 1,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cell: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: C.textDark,
    flex: 1,
  },
});

// ─── 10. SELLER PERFORMANCE SCORE ───
export const SellerPerformanceScore: React.FC = () => {
  // Score: 92/100 → stroke calculation for 120px SVG circle
  // circumference = 2 * π * r = 2 * π * 48 ≈ 301.6
  const score = 92;
  const maxScore = 100;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / maxScore) * circumference;

  const metrics = [
    { label: "Delivery Speed", val: "96%", color: C.green },
    { label: "Response Time", val: "5 mins", color: C.blue },
    { label: "Return Rate", val: "1.2%", color: C.green },
    { label: "Cancellation Rate", val: "0.5%", color: C.green },
    { label: "Customer Rating", val: "4.8 ★", color: C.yellow },
  ];

  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>Marketplace Seller Score</AppText>
        <View style={sellerStyles.gradeBadge}>
          <AppText style={sellerStyles.gradeText}>PLATINUM</AppText>
        </View>
      </View>

      {/* Large Circle Gauge */}
      <View style={sellerStyles.dialContainer}>
        <Svg width={120} height={120}>
          {/* Background track */}
          <Circle
            cx={60} cy={60} r={radius}
            stroke="#F3F4F6" strokeWidth={10} fill="none"
          />
          {/* Score arc */}
          <Circle
            cx={60} cy={60} r={radius}
            stroke={C.purple} strokeWidth={10} fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin="60, 60"
          />
        </Svg>
        <View style={sellerStyles.dialLabelWrap}>
          <AppText style={sellerStyles.dialVal}>{score}</AppText>
          <AppText style={sellerStyles.dialSub}>/ 100</AppText>
        </View>
      </View>

      <View style={sellerStyles.metrics}>
        {metrics.map((m, i) => (
          <View key={i} style={sellerStyles.metricRow}>
            <AppText style={sellerStyles.label}>{m.label}</AppText>
            <AppText style={[sellerStyles.val, { color: m.color }]}>{m.val}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
};

const sellerStyles = StyleSheet.create({
  gradeBadge: {
    backgroundColor: "#F0EEFF",
    borderWidth: 1,
    borderColor: C.purple + "30",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    color: C.purple,
    letterSpacing: 0.8,
  },
  dialContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: 124,
    marginVertical: 8,
  },
  dialLabelWrap: {
    position: "absolute",
    alignItems: "center",
  },
  dialVal: {
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
    lineHeight: 30,
  },
  dialSub: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    color: C.textLight,
    textAlign: "center",
  },
  metrics: {
    gap: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: C.textLight,
  },
  val: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
});

// ─── 11. CUSTOMER ANALYTICS ───
export const CustomerAnalytics: React.FC = () => {
  const cohortMetrics = [
    { label: "Repeat Purchase Rate", val: "32.4%", color: C.purple, bg: C.purplePale, icon: "account-multiple-outline" },
    { label: "Avg. Lifetime Value", val: "₹4,820", color: C.green, bg: C.greenPale, icon: "currency-inr" },
    { label: "Satisfaction Score", val: "94%", color: C.blue, bg: C.bluePale, icon: "emoticon-happy-outline" },
    { label: "Churn Rate", val: "3.2%", color: C.orange, bg: C.orangePale, icon: "account-minus-outline" },
  ];

  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>Customer Cohort Analytics</AppText>
        <MaterialCommunityIcons name="account-group-outline" size={18} color={C.blue} />
      </View>
      <View style={custStyles.grid}>
        {cohortMetrics.map((m, i) => (
          <View key={i} style={custStyles.metricBox}>
            <View style={[custStyles.iconWrap, { backgroundColor: m.bg }]}>
              <MaterialCommunityIcons name={m.icon as any} size={16} color={m.color} />
            </View>
            <AppText style={custStyles.label}>{m.label}</AppText>
            <AppText style={[custStyles.val, { color: m.color }]}>{m.val}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
};

const custStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: C.textLight,
  },
  val: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
});

// ─── 12. MARKETING CENTER ───
export const MarketingCenter: React.FC = () => {
  const tools = [
    { name: "Coupons Scheduler", desc: "Interactive discounts generator", icon: "ticket-percent-outline", color: C.pink, bg: C.pinkPale },
    { name: "Email Broadcasts", desc: "Dispatch email campaigns", icon: "email-newsletter", color: C.purple, bg: C.purplePale },
    { name: "WhatsApp Portal", desc: "Direct consumer ping tools", icon: "whatsapp", color: C.green, bg: C.greenPale },
  ];

  return (
    <View style={panelStyles.card}>
      <AppText style={[panelStyles.title, { marginBottom: 12 }]}>Seller Growth Marketing Hub</AppText>
      <View style={mktStyles.grid}>
        {tools.map((t, i) => (
          <TouchableOpacity key={i} style={mktStyles.card} activeOpacity={0.8} onPress={() => alert(`Starting: ${t.name}`)}>
            <View style={[mktStyles.icon, { backgroundColor: t.bg }]}>
              <MaterialCommunityIcons name={t.icon as any} size={18} color={t.color} />
            </View>
            <View>
              <AppText style={mktStyles.name}>{t.name}</AppText>
              <AppText style={mktStyles.desc}>{t.desc}</AppText>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const mktStyles = StyleSheet.create({
  grid: {
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    padding: 10,
    borderRadius: 8,
    gap: 12,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  desc: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
  },
});

// ─── 13. FINANCIAL CENTER ───
export const FinancialCenter: React.FC = () => {
  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>Financial Reconciliation Center</AppText>
        <MaterialCommunityIcons name="finance" size={18} color={C.green} />
      </View>

      <View style={finStyles.statsGrid}>
        <View style={finStyles.finItem}>
          <AppText style={finStyles.label}>GST Calculation (18%)</AppText>
          <AppText style={finStyles.val}>₹2,241</AppText>
        </View>
        <View style={finStyles.finItem}>
          <AppText style={finStyles.label}>Pending Transfer Balance</AppText>
          <AppText style={finStyles.val}>₹24,500</AppText>
        </View>
      </View>

      <View style={finStyles.exportRow}>
        <TouchableOpacity style={finStyles.btn} onPress={() => alert("Downloading PDF Invoice...")}>
          <Feather name="download" size={12} color={C.textMid} />
          <AppText style={finStyles.btnText}>Export Invoice PDF</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={finStyles.btn} onPress={() => alert("Downloading Excel Report...")}>
          <Feather name="file-text" size={12} color={C.textMid} />
          <AppText style={finStyles.btnText}>Export GST Excel</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const finStyles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  finItem: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 10,
    borderRadius: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: C.textLight,
    marginBottom: 4,
  },
  val: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  exportRow: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingVertical: 8,
    gap: 6,
  },
  btnText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: C.textMid,
  },
});

// ─── 14. SMART NOTIFICATION CENTER ───
export const SmartNotificationCenter: React.FC = () => {
  const alerts = [
    { title: "Review Alert", body: "Anjali left a 5-star review.", cat: "Reviews", color: C.yellow },
    { title: "Payout Processed", body: "₹12,450 cleared successfully.", cat: "Payments", color: C.green },
    { title: "Inventory Critical", body: "Nike running shoes are out of stock.", cat: "Stock", color: C.red },
  ];

  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>Priority Store Notifications</AppText>
        <View style={notifStyles.badge}>
          <AppText style={notifStyles.badgeText}>3 New</AppText>
        </View>
      </View>

      <View style={notifStyles.list}>
        {alerts.map((al, i) => (
          <View key={i} style={notifStyles.item}>
            <View style={[notifStyles.indicator, { backgroundColor: al.color }]} />
            <View>
              <AppText style={notifStyles.alertTitle}>{al.title} • <AppText style={{ color: al.color, fontFamily: "Poppins_700Bold" }}>{al.cat}</AppText></AppText>
              <AppText style={notifStyles.alertBody}>{al.body}</AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const notifStyles = StyleSheet.create({
  badge: {
    backgroundColor: C.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    color: C.white,
  },
  list: {
    gap: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    padding: 8,
    borderRadius: 6,
    gap: 8,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertTitle: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  alertBody: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: C.textMid,
    marginTop: 1,
  },
});
