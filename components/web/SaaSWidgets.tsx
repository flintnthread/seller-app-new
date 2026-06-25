import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Pressable, Platform, Image, Alert } from "react-native";
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
type WelcomeHeaderProps = {
  name?: string;
  totalOrders?: number;
  salesFormatted?: string;
  pendingOrders?: number;
  views?: number;
  referralCode?: string;
  referralGoal?: number;
  referralTotalReferred?: number;
};

export const SmartWelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  name = "Seller",
  totalOrders = 0,
  salesFormatted = "₹0",
  pendingOrders = 0,
  views = 0,
  referralCode = "",
  referralGoal = 6,
  referralTotalReferred = 0,
}) => {
  const router = useRouter();
  const [greeting, setGreeting] = useState("Good Morning");
  const [copied, setCopied] = useState(false);

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
    { label: "Create Coupon", icon: "tag-outline", action: "coupon", color: C.pink, bg: C.pinkPale, hidden: true },
    { label: "Upload Banner", icon: "image-outline", action: "banner", color: C.orange, bg: C.orangePale, hidden: true },
  ];

  const handlePress = (act: typeof actions[0]) => {
    if ((act as any).path) {
      router.push((act as any).path as any);
      return;
    }
    if (act.action === "coupon" || act.action === "banner") {
      Alert.alert(
        "Coming soon",
        `${act.label} will be available in a future release. Use product promotions from the dashboard for now.`,
      );
      return;
    }
    Alert.alert("Unavailable", `${act.label} is not available yet.`);
  };

  const handleCopy = () => {
    if (Platform.OS === "web") {
      // @ts-ignore
      if (referralCode) navigator?.clipboard?.writeText(referralCode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: "Join F&T Marketplace!",
      text: `Use my referral code ${referralCode || "—"} to sign up on F&T and we both earn +5% commission bonus! 🎁`,
      url: "https://fandt.app/register",
    };
    if (Platform.OS === "web" && typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share(shareData);
      } catch (_) { /* user cancelled */ }
    } else {
      // Fallback: copy the share text to clipboard
      const fallbackText = `${shareData.text}\n${shareData.url}`;
      if (Platform.OS === "web") {
        // @ts-ignore
        navigator?.clipboard?.writeText(fallbackText);
      }
      alert("Share text copied to clipboard!");
    }
  };

  const progressPct = referralGoal > 0 ? Math.min((referralTotalReferred / referralGoal) * 100, 100) : 0;

  return (
    <View style={welcomeStyles.container}>
      {/* ── LEFT: Greeting + Quick Actions ── */}
      <View style={welcomeStyles.leftCol}>
        <View style={welcomeStyles.heroText}>
          <AppText style={welcomeStyles.title}>
            {greeting},{" "}
            <AppText style={[welcomeStyles.title, { color: C.purple }]}>{name}</AppText> 👋
          </AppText>
          <AppText style={welcomeStyles.motivation}>
            ✨ {pendingOrders > 0 ? `${pendingOrders} orders need your attention.` : "All caught up — no pending orders."}
          </AppText>
        </View>

        <View style={welcomeStyles.actionsRow}>
          {actions.filter((act) => !act.hidden).map((act, i) => (
            <Pressable
              key={i}
              onPress={() => handlePress(act)}
              // @ts-ignore
              style={({ hovered }) => [
                welcomeStyles.actionCard,
                { backgroundColor: act.bg, borderColor: act.color + "30" },
                Platform.OS === "web" && { boxShadow: `0 4px 12px ${act.color}20` },
                hovered && { 
                  transform: [{ translateY: -3 }], 
                  boxShadow: `0 8px 16px -4px ${act.color}40`, 
                  borderColor: act.color,
                }
              ]}
            >
              <View style={[welcomeStyles.iconBox, { backgroundColor: C.white }]}>
                <MaterialCommunityIcons name={act.icon as any} size={20} color={act.color} />
              </View>
              <AppText style={welcomeStyles.actionLabel}>{act.label}</AppText>
            </Pressable>
          ))}
        </View>

        {/* ── Today's Live Overview Strip ── */}
        <View style={welcomeStyles.statsStrip}>
          <View style={welcomeStyles.statItem}>
            <View style={[welcomeStyles.statDot, { backgroundColor: C.orange }]} />
            <AppText style={welcomeStyles.statText}>
              Total Orders: <AppText style={welcomeStyles.statValue}>{totalOrders}</AppText>
            </AppText>
          </View>
          <View style={welcomeStyles.statDivider} />
          <View style={[welcomeStyles.statItem, welcomeStyles.statItemSales]}>
            <View style={[welcomeStyles.statDot, { backgroundColor: C.green }]} />
            <AppText style={welcomeStyles.statText}>
              Total Sales: <AppText style={welcomeStyles.statValue}>{salesFormatted}</AppText>
            </AppText>
          </View>
          <View style={welcomeStyles.statDivider} />
          <View style={[welcomeStyles.statItem, welcomeStyles.statItemPending]}>
            <View style={welcomeStyles.statMainRow}>
              <View style={[welcomeStyles.statDot, { backgroundColor: C.purple }]} />
              <AppText style={welcomeStyles.statText}>
                Pending: <AppText style={welcomeStyles.statValue}>{pendingOrders}</AppText>
              </AppText>
            </View>
            {pendingOrders > 0 ? (
              <View style={[welcomeStyles.statBadge, { backgroundColor: C.purplePale }]}>
                <AppText style={[welcomeStyles.statBadgeText, { color: C.purple }]}>Action</AppText>
              </View>
            ) : null}
          </View>
          <View style={welcomeStyles.statDivider} />
          <View style={welcomeStyles.statItem}>
            <View style={[welcomeStyles.statDot, { backgroundColor: C.blue }]} />
            <AppText style={welcomeStyles.statText}>
              Product Views: <AppText style={welcomeStyles.statValue}>{views.toLocaleString("en-IN")}</AppText>
            </AppText>
          </View>
        </View>
      </View>

      {/* ── DIVIDER ── */}
      <View style={welcomeStyles.divider} />

      {/* ── RIGHT: Referral Reward Program ── */}
      <View style={welcomeStyles.referralCol}>
        {/* Header */}
        <View style={welcomeStyles.refHeader}>
          <View style={welcomeStyles.refIconBox}>
            <MaterialCommunityIcons name="gift-outline" size={16} color={C.orange} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={welcomeStyles.refTitle}>Referral Rewards</AppText>
            <AppText style={welcomeStyles.refSubtitle}>Invite sellers • Earn +5% commission</AppText>
          </View>
          <View style={welcomeStyles.refBadge}>
            <AppText style={welcomeStyles.refBadgeText}>🎁 ACTIVE</AppText>
          </View>
        </View>

        {/* Progress tracker */}
        <View style={welcomeStyles.refProgressWrap}>
          <View style={welcomeStyles.refProgressRow}>
            <AppText style={welcomeStyles.refProgressLabel}>
              {referralTotalReferred} / {referralGoal} sellers invited
            </AppText>
            <AppText style={welcomeStyles.refProgressPct}>{Math.round(progressPct)}%</AppText>
          </View>
          <View style={welcomeStyles.refBarBg}>
            <View style={[welcomeStyles.refBarFill, { width: `${progressPct || 4}%` as any }]} />
          </View>
          <AppText style={welcomeStyles.refGoalNote}>
            🏆 Invite {Math.max(0, referralGoal - referralTotalReferred)} more sellers to unlock ₹2,500 bonus!
          </AppText>
        </View>

        {/* Code row */}
        <View style={welcomeStyles.refCodeWrap}>
          <AppText style={welcomeStyles.refCodeLabel}>YOUR REFERRAL CODE</AppText>
          <AppText style={welcomeStyles.refCode} numberOfLines={1} ellipsizeMode="middle">
            {referralCode || "—"}
          </AppText>
          <View style={welcomeStyles.refCodeActions}>
            <TouchableOpacity
              style={[
                welcomeStyles.refCopyBtn,
                copied && { backgroundColor: C.greenPale, borderColor: C.green },
              ]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={copied ? "check" : "content-copy"}
                size={13}
                color={copied ? C.green : C.textMid}
              />
              <AppText style={[welcomeStyles.refCopyText, copied && { color: C.green }]}>
                {copied ? "Copied!" : "Copy"}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={welcomeStyles.refShareBtn}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Feather name="share-2" size={13} color={C.white} />
              <AppText style={welcomeStyles.refShareText}>Share</AppText>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
    ...Platform.select({
      web: {
        backgroundColor: "#F8F7FF",
        boxShadow: "0 1px 4px 0 rgba(108, 99, 255, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)",
      },
    }),
  },
  // ── Left column ──
  leftCol: {
    flex: 1,
    paddingRight: 20,
    justifyContent: "space-between",
  },
  heroText: {
    marginBottom: 10,
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
    marginTop: 3,
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
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: C.tealPale,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 148,
    ...Platform.select({
      web: {
        transitionDuration: "200ms",
        transitionProperty: "all",
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
  statsStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
    rowGap: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  statItemSales: {
    flexShrink: 0,
  },
  statItemPending: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 4,
    flexShrink: 0,
  },
  statMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  statText: {
    flexShrink: 0,
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: C.textMid,
    ...Platform.select({
      web: { whiteSpace: "nowrap" },
    }),
  },
  statValue: {
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  statBadge: {
    flexShrink: 0,
    alignSelf: "flex-start",
    marginLeft: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statBadgeText: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    ...Platform.select({
      web: { whiteSpace: "nowrap" },
    }),
  },
  statDivider: {
    width: 1,
    alignSelf: "stretch",
    minHeight: 16,
    backgroundColor: C.border,
    flexShrink: 0,
  },
  // ── Divider ──
  divider: {
    width: 1,
    backgroundColor: C.border,
    marginVertical: -18,
    alignSelf: "stretch",
  },
  // ── Right column — Referral ──
  referralCol: {
    width: 300,
    minWidth: 280,
    flexShrink: 0,
    paddingLeft: 16,
    justifyContent: "space-between",
    ...Platform.select({
      web: {
        backgroundColor: "#FFF8F2",
        borderRadius: 12,
        padding: 18,
        marginLeft: 16,
        borderWidth: 1.5,
        borderColor: "#F97316",
        boxShadow: "0 8px 24px rgba(249, 115, 22, 0.12)",
      },
    }),
  },
  refHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  refIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: C.orangePale,
    alignItems: "center",
    justifyContent: "center",
  },
  refTitle: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
  },
  refSubtitle: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: C.textLight,
    marginTop: 1,
  },
  refBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  refBadgeText: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    color: C.orange,
  },
  refProgressWrap: {
    marginBottom: 6,
  },
  refProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  refProgressLabel: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: C.textMid,
  },
  refProgressPct: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    color: C.orange,
  },
  refBarBg: {
    height: 6,
    backgroundColor: "#FDE68A",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  refBarFill: {
    height: "100%",
    backgroundColor: C.orange,
    borderRadius: 3,
  },
  refGoalNote: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    color: C.textMid,
    lineHeight: 14,
  },
  refCodeWrap: {
    flexDirection: "column",
    alignItems: "stretch",
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(245, 158, 11, 0.08)",
      },
      default: {},
    }),
  },
  refCodeLabel: {
    fontSize: 9,
    fontFamily: "Poppins_700Bold",
    color: C.textLight,
    letterSpacing: 0.6,
    ...Platform.select({
      web: { whiteSpace: "nowrap" },
    }),
  },
  refCode: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    color: C.textDark,
    letterSpacing: 0.3,
    ...Platform.select({
      web: {
        whiteSpace: "nowrap",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      },
    }),
  },
  refCodeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  refCopyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 32,
  },
  refCopyText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: C.textMid,
  },
  refShareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: C.orange,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 32,
  },
  refShareText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: C.white,
  },
});

// ─── 3. REAL-TIME ACTIVITY FEED ───
type ActivityItem = { id: string; text: string; time: string; icon: string };

export const RealTimeActivityFeed: React.FC<{ activities?: ActivityItem[] }> = ({ activities = [] }) => {
  const iconColors: Record<string, { color: string; bg: string }> = {
    "cart-outline": { color: C.purple, bg: C.purplePale },
    "shopping": { color: C.purple, bg: C.purplePale },
    star: { color: C.yellow, bg: C.yellowPale },
    "alert-decagram": { color: C.red, bg: C.redPale },
  };
  const defaultStyle = { color: C.blue, bg: C.bluePale };

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
        {activities.length === 0 ? (
          <AppText style={panelStyles.itemTime}>No recent activity yet.</AppText>
        ) : (
          activities.map((act) => {
            const style = iconColors[act.icon] ?? defaultStyle;
            return (
              <View key={act.id} style={panelStyles.item}>
                <View style={[panelStyles.iconWrap, { backgroundColor: style.bg }]}>
                  <MaterialCommunityIcons name={act.icon as any} size={16} color={style.color} />
                </View>
                <View style={panelStyles.content}>
                  <AppText style={panelStyles.itemText}>{act.text}</AppText>
                  <AppText style={panelStyles.itemTime}>{act.time}</AppText>
                </View>
              </View>
            );
          })
        )}
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
    marginBottom: 0,
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
type InsightLowStock = { name: string; stock: number };
type InsightTopProduct = { name: string; sold: number };

export const AIBusinessInsights: React.FC<{
  lowStock?: InsightLowStock[];
  topProducts?: InsightTopProduct[];
}> = ({ lowStock = [], topProducts = [] }) => {
  const insights: { text: string; priority: string; color: string; bg: string }[] = [];
  if (lowStock.length > 0) {
    const item = lowStock[0]!;
    insights.push({
      text: `Low stock: "${item.name}" has only ${item.stock} unit(s) left. Consider restocking.`,
      priority: "INVENTORY",
      color: C.red,
      bg: C.redPale,
    });
  }
  if (topProducts.length > 0) {
    const top = topProducts[0]!;
    insights.push({
      text: `Top seller: "${top.name}" with ${top.sold} unit(s) sold. Promote similar listings.`,
      priority: "SALES",
      color: C.purple,
      bg: C.purplePale,
    });
  }
  if (insights.length === 0) {
    insights.push({
      text: "Add products and fulfill orders to unlock store insights.",
      priority: "INFO",
      color: C.teal,
      bg: C.tealPale,
    });
  }

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

// ─── 5. SALES HEATMAP (weekly trend bars) ───
export const SalesHeatmap: React.FC<{ points?: { label: string; value: number }[] }> = ({ points = [] }) => {
  const maxVal = Math.max(...points.map((p) => p.value), 1);
  const barH = 72;

  return (
    <View style={[panelStyles.card, { flex: 1, justifyContent: "space-between" }]}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>Weekly Sales Trend</AppText>
        <AppText style={panelStyles.liveText}>From dashboard API</AppText>
      </View>
      <View style={heatmapStyles.gridWrap}>
        {points.length === 0 ? (
          <AppText style={heatmapStyles.metaText}>No sales data for this period.</AppText>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: barH + 24, width: "100%", paddingHorizontal: 4 }}>
            {points.map((p, i) => {
              const h = Math.max(4, (p.value / maxVal) * barH);
              return (
                <View key={i} style={{ alignItems: "center", flex: 1 }}>
                  <View style={{ width: "70%", maxWidth: 28, height: h, backgroundColor: C.purple, borderRadius: 4, opacity: 0.85 }} />
                  <AppText style={{ fontSize: 9, fontFamily: "Poppins_500Medium", color: C.textLight, marginTop: 6 }} numberOfLines={1}>
                    {p.label}
                  </AppText>
                </View>
              );
            })}
          </View>
        )}
      </View>
      <View style={heatmapStyles.meta}>
        <AppText style={heatmapStyles.metaText}>
          Total units this week:{" "}
          <AppText style={heatmapStyles.bold}>{points.reduce((s, p) => s + p.value, 0)}</AppText>
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
type LowStockItem = { id: string; name: string; stock: number };

export const SmartInventoryMonitoring: React.FC<{
  lowStock?: LowStockItem[];
  totalProducts?: number;
}> = ({ lowStock = [], totalProducts = 0 }) => {
  const healthPct =
    totalProducts > 0
      ? Math.round(((totalProducts - lowStock.length) / totalProducts) * 100)
      : 100;
  const healthColor = healthPct >= 70 ? C.green : healthPct >= 40 ? C.orange : C.red;

  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>Smart Inventory Health</AppText>
        <AppText style={[panelStyles.liveText, { color: healthColor }]}>Health: {healthPct}%</AppText>
      </View>
      
      <View style={inventoryStyles.healthBarWrap}>
        <View style={inventoryStyles.barBg}>
          <View style={[inventoryStyles.barFill, { width: `${healthPct}%` as any, backgroundColor: healthColor }]} />
        </View>
      </View>

      <AppText style={inventoryStyles.sectionTitle}>Reorder Recommendations</AppText>
      <View style={inventoryStyles.alertList}>
        {lowStock.length === 0 ? (
          <AppText style={inventoryStyles.itemName}>No low-stock alerts.</AppText>
        ) : (
          lowStock.map((item) => {
            const color = item.stock <= 2 ? C.red : C.orange;
            return (
              <View key={item.id} style={inventoryStyles.alertRow}>
                <View style={inventoryStyles.alertLeft}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={14} color={color} />
                  <AppText style={inventoryStyles.itemName}>{item.name}</AppText>
                </View>
                <View style={[inventoryStyles.pill, { backgroundColor: color + "15" }]}>
                  <AppText style={[inventoryStyles.pillText, { color }]}>{item.stock} left</AppText>
                </View>
              </View>
            );
          })
        )}
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
type TrackingOrder = {
  id: string;
  status: string;
  customerName?: string;
  productName?: string;
  awb?: string;
  courier?: string;
  steps?: { label: string; status: "done" | "active" | "pending" }[];
};

export const LiveOrderTrackingPanel: React.FC<{ order?: TrackingOrder | null }> = ({ order }) => {
  if (!order) {
    return (
      <View style={[panelStyles.card, { flex: 1, justifyContent: "center", paddingVertical: 32 }]}>
        <AppText style={panelStyles.title}>Active Order Delivery Pipeline</AppText>
        <AppText style={[panelStyles.itemTime, { marginTop: 8 }]}>No active orders to track.</AppText>
      </View>
    );
  }

  const steps =
    order.steps ??
    ["Pending", "Processing", "Shipped", "Delivered"].map((label) => ({
      label,
      status: "pending" as const,
    }));

  const statusIndex = ["Pending", "Processing", "Shipped", "Delivered", "Returned"].indexOf(order.status);
  const normalizedSteps = steps.map((st, i) => {
    if (st.status !== "pending") return st;
    if (statusIndex < 0) return st;
    if (i < statusIndex) return { ...st, status: "done" as const };
    if (i === statusIndex) return { ...st, status: "active" as const };
    return st;
  });

  return (
    <View style={[panelStyles.card, { flex: 1, justifyContent: "space-between" }]}>
      <View>
        <View style={panelStyles.header}>
          <AppText style={panelStyles.title}>Active Order Delivery Pipeline</AppText>
          <AppText style={panelStyles.liveText}>{order.id}</AppText>
        </View>

        <View style={trackingStyles.timeline}>
          {normalizedSteps.map((st, i) => {
            const isDone = st.status === "done";
            const isCurrent = st.status === "active";
            return (
              <View key={i} style={trackingStyles.stepCol}>
                <View style={[trackingStyles.circle, (isDone || isCurrent) && { backgroundColor: C.green, borderColor: C.green }]}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={10} color={C.white} />
                  ) : isCurrent ? (
                    <View style={trackingStyles.pulseRing} />
                  ) : null}
                </View>
                <AppText style={[trackingStyles.label, isCurrent && { color: C.purple, fontFamily: "Poppins_700Bold" }]}>{st.label}</AppText>
              </View>
            );
          })}
        </View>
      </View>

      <View style={trackingStyles.detailsBox}>
        <View style={trackingStyles.detailItem}>
          <MaterialCommunityIcons name="account-outline" size={16} color={C.teal} />
          <View style={{ marginLeft: 6 }}>
            <AppText style={trackingStyles.detailTitle}>Customer</AppText>
            <AppText style={trackingStyles.detailValue}>{order.customerName ?? "—"}</AppText>
          </View>
        </View>
        <View style={trackingStyles.verticalDivider} />
        <View style={trackingStyles.detailItem}>
          <MaterialCommunityIcons name="package-variant" size={16} color={C.orange} />
          <View style={{ marginLeft: 6 }}>
            <AppText style={trackingStyles.detailTitle}>Product</AppText>
            <AppText style={trackingStyles.detailValue} numberOfLines={1}>{order.productName ?? "—"}</AppText>
          </View>
        </View>
      </View>

      <View style={trackingStyles.meta}>
        <AppText style={trackingStyles.metaText}>
          📍 <AppText style={trackingStyles.bold}>Status</AppText>: {order.status}
          {order.awb ? ` · AWB ${order.awb}` : ""}
          {order.courier ? ` · ${order.courier}` : ""}
        </AppText>
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
  detailsBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "space-between",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  detailTitle: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: C.textDark,
  },
  detailValue: {
    fontSize: 9,
    fontFamily: "Poppins_500Medium",
    color: C.textLight,
    marginTop: 1,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: C.border,
    marginHorizontal: 8,
  },
  meta: {
    marginTop: 8,
  },
  metaText: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: C.textMid,
  },
  bold: {
    fontFamily: "Poppins_700Bold",
  },
});

// ─── 9. TOP PRODUCTS PERFORMANCE ───
type TopProductRow = { id: string; name: string; sold: number; price: string };

export const TopProductsPerformance: React.FC<{ items?: TopProductRow[] }> = ({ items = [] }) => {
  return (
    <View style={panelStyles.card}>
      <AppText style={[panelStyles.title, { marginBottom: 12 }]}>Top Selling Products Performance</AppText>
      
      <View style={tableStyles.headerRow}>
        <AppText style={[tableStyles.headerText, { flex: 2 }]}>Product</AppText>
        <AppText style={tableStyles.headerText}>Sold</AppText>
        <AppText style={tableStyles.headerText}>Price</AppText>
      </View>

      {items.length === 0 ? (
        <AppText style={[tableStyles.cell, { padding: 12 }]}>No sales data yet.</AppText>
      ) : (
        items.map((it) => (
          <View key={it.id} style={tableStyles.row}>
            <AppText style={[tableStyles.cell, { flex: 2, fontFamily: "Poppins_700Bold" }]} numberOfLines={1}>{it.name}</AppText>
            <AppText style={tableStyles.cell}>{it.sold}</AppText>
            <AppText style={tableStyles.cell}>{it.price}</AppText>
          </View>
        ))
      )}
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
export const SellerPerformanceScore: React.FC<{
  rating?: number;
  orders?: number;
  returns?: number;
  views?: number;
}> = ({ rating = 0, orders = 0, returns = 0, views = 0 }) => {
  const score = Math.min(100, Math.round((rating / 5) * 100));
  const maxScore = 100;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / maxScore) * circumference;
  const returnRate = orders > 0 ? `${((returns / orders) * 100).toFixed(1)}%` : "—";

  const metrics = [
    { label: "Total Orders", val: String(orders), color: C.purple },
    { label: "Product Views", val: views.toLocaleString("en-IN"), color: C.blue },
    { label: "Return Rate", val: returnRate, color: C.orange },
    { label: "Returns Count", val: String(returns), color: C.red },
    { label: "Customer Rating", val: rating > 0 ? `${rating.toFixed(1)} ★` : "—", color: C.yellow },
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
export const CustomerAnalytics: React.FC<{
  rating?: number;
  views?: number;
  orders?: number;
  salesFormatted?: string;
}> = ({ rating = 0, views = 0, orders = 0, salesFormatted = "₹0" }) => {
  const satisfaction = rating > 0 ? `${Math.round((rating / 5) * 100)}%` : "—";
  const cohortMetrics = [
    { label: "Total Orders", val: String(orders), color: C.purple, bg: C.purplePale, icon: "cart-outline" },
    { label: "Total Sales", val: salesFormatted, color: C.green, bg: C.greenPale, icon: "currency-inr" },
    { label: "Satisfaction (rating)", val: satisfaction, color: C.blue, bg: C.bluePale, icon: "emoticon-happy-outline" },
    { label: "Product Views", val: views.toLocaleString("en-IN"), color: C.orange, bg: C.orangePale, icon: "eye-outline" },
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
  const router = useRouter();
  const tools = [
    { name: "Manage Products", desc: "Update listings and inventory", icon: "package-variant-closed", color: C.purple, bg: C.purplePale, path: "/(main)/productmanagement" },
    { name: "Total Sales", desc: "View sales analytics", icon: "chart-line", color: C.blue, bg: C.bluePale, path: "/(main)/totalsales" },
    { name: "Help & Support", desc: "Open support tickets", icon: "lifebuoy", color: C.green, bg: C.greenPale, path: "/(main)/helpsupport" },
  ];

  return (
    <View style={[panelStyles.card, { flex: 1, justifyContent: "space-between" }]}>
      <AppText style={[panelStyles.title, { marginBottom: 12 }]}>Seller Growth Marketing Hub</AppText>
      <View style={mktStyles.grid}>
        {tools.map((t, i) => (
          <TouchableOpacity key={i} style={mktStyles.card} activeOpacity={0.8} onPress={() => router.push(t.path as any)}>
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
export const FinancialCenter: React.FC<{
  availableBalance?: number;
  bankName?: string;
}> = ({ availableBalance = 0, bankName }) => {
  const router = useRouter();
  const balanceText = `₹${Math.round(availableBalance).toLocaleString("en-IN")}`;

  const handleExportCsv = async () => {
    try {
      const { exportPayoutTransactionsCsv } = await import("@/services/payoutApi");
      const csv = await exportPayoutTransactionsCsv();
      if (!csv.trim()) {
        Alert.alert("No data", "No payout transactions available to export.");
        return;
      }
      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `financial_reconciliation_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert("Export", "CSV export is available on web. Open earnings on desktop to download.");
      }
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Could not export data.");
    }
  };

  return (
    <View style={[panelStyles.card, { flex: 1, justifyContent: "space-between" }]}>
      <View>
        <View style={panelStyles.header}>
          <AppText style={panelStyles.title}>Financial Reconciliation Center</AppText>
          <MaterialCommunityIcons name="finance" size={18} color={C.green} />
        </View>

        <View style={finStyles.statsGrid}>
          <View style={finStyles.finItem}>
            <AppText style={finStyles.label}>Available Balance</AppText>
            <AppText style={finStyles.val}>{balanceText}</AppText>
          </View>
          <View style={finStyles.finItem}>
            <AppText style={finStyles.label}>Settlement Bank</AppText>
            <AppText style={finStyles.val}>{bankName?.trim() || "—"}</AppText>
          </View>
        </View>

        <View style={finStyles.exportRow}>
          <TouchableOpacity style={finStyles.btn} onPress={() => void handleExportCsv()}>
            <Feather name="download" size={12} color={C.textMid} />
            <AppText style={finStyles.btnText}>Export Payout CSV</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={finStyles.btn}
            onPress={() => router.push("/(main)/earning")}
          >
            <Feather name="file-text" size={12} color={C.textMid} />
            <AppText style={finStyles.btnText}>Earnings Overview</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scheduled Auto-Payout info strip ── */}
      <TouchableOpacity
        style={finStyles.payoutBox}
        onPress={() => router.push("/(main)/payoutrequest")}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="bank-transfer-in" size={16} color={C.green} />
        <View style={{ marginLeft: 6, flex: 1 }}>
          <AppText style={finStyles.payoutTitle}>Withdrawable Balance</AppText>
          <AppText style={finStyles.payoutValue}>{balanceText} available for payout</AppText>
        </View>
      </TouchableOpacity>

      <View style={finStyles.meta}>
        <AppText style={finStyles.metaText}>
          🏦 Request payouts from the earnings screen when your balance is ready.
        </AppText>
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
  payoutBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  payoutTitle: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    color: C.textDark,
  },
  payoutValue: {
    fontSize: 9,
    fontFamily: "Poppins_500Medium",
    color: C.textLight,
    marginTop: 1,
  },
  payoutBadge: {
    backgroundColor: C.greenPale,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.green + "40",
  },
  payoutBadgeText: {
    fontSize: 8,
    fontFamily: "Poppins_700Bold",
    color: C.green,
  },
  meta: {
    marginTop: 8,
  },
  metaText: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: C.textMid,
  },
  bold: {
    fontFamily: "Poppins_700Bold",
  },
});

// ─── 14. SMART NOTIFICATION CENTER ───
type AlertItem = { id: string; title: string; message: string; time?: string; read?: boolean };

export const SmartNotificationCenter: React.FC<{ alerts?: AlertItem[] }> = ({ alerts = [] }) => {
  const unread = alerts.filter((a) => !a.read).length;

  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.header}>
        <AppText style={panelStyles.title}>Priority Store Notifications</AppText>
        {unread > 0 ? (
          <View style={notifStyles.badge}>
            <AppText style={notifStyles.badgeText}>{unread} New</AppText>
          </View>
        ) : null}
      </View>

      <View style={notifStyles.list}>
        {alerts.length === 0 ? (
          <AppText style={notifStyles.alertBody}>No notifications.</AppText>
        ) : (
          alerts.map((al) => (
            <View key={al.id} style={notifStyles.item}>
              <View style={[notifStyles.indicator, { backgroundColor: al.read ? C.textLight : C.purple }]} />
              <View>
                <AppText style={notifStyles.alertTitle}>{al.title}</AppText>
                <AppText style={notifStyles.alertBody}>{al.message}</AppText>
                {al.time ? <AppText style={panelStyles.itemTime}>{al.time}</AppText> : null}
              </View>
            </View>
          ))
        )}
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
