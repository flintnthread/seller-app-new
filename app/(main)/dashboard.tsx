

import React, { useState, useRef, useEffect } from "react";
import {

    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    SafeAreaView,
    Image,
    Modal,
    FlatList,
    Clipboard,
    Alert,
    Animated,
    TouchableWithoutFeedback,
    Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
const TabShape = ({ isActive, width = 90, height = 80 }: { isActive: boolean, width?: number, height?: number }) => (
    <Svg width="100%" height="100%" viewBox="0 0 90 80" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0 }}>
        <Path 
            d="M 0 80 C 6 80, 8 78, 10 70 L 20 15 C 22 5, 27 1.5, 35 1.5 L 55 1.5 C 63 1.5, 68 5, 70 15 L 80 70 C 82 78, 84 80, 90 80"
            fill={isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.45)"}
            stroke={isActive ? "#0F3A85" : "rgba(15, 58, 133, 0.12)"}
            strokeWidth={isActive ? 2 : 1.5}
            vectorEffect="non-scaling-stroke"
        />
    </Svg>
);

import {
    useFonts,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { AppText } from "@/components/AppText";
import { Colors as DesignColors, palette } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontFamilies } from "@/constants/fonts";
import { useRouter } from "expo-router";
import {
    useSellerProfileSummary,
    type SellerProfileSummary,
} from "@/hooks/useSellerProfileSummary";
import { AccountStatusBanner } from "@/components/AccountStatusBanner";
import { clearSellerId } from "@/lib/api/sellerSession";
import type { TextProps } from 'react-native';
import {
    DesktopDashboard,
    type DesktopDashboardProps,
} from "@/components/web/DesktopDashboard";
import { useActiveHeader } from "@/components/web/HeaderContext";
import { AppHeader } from "@/components/common/AppHeader";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardCharts } from "@/hooks/useDashboardCharts";
import { useDashboardStatsByPeriod } from "@/hooks/useDashboardStatsByPeriod";
import { useSellerProducts } from "@/hooks/useSellerProducts";
import {
    EMPTY_ORDERS_CHART,
    EMPTY_PRODUCTS_CHART,
    EMPTY_SALES_CHART,
} from "@/lib/dashboard/chartDefaults";

// ─── Mini Line Chart ─────────────────────────────────────────
import Svg, { Path, Circle } from "react-native-svg";
// import { SafeAreaView } from 'react-native-safe-area-context';


const { width: SW } = Dimensions.get("window");
const DRAWER_WIDTH = SW * 0.78;
const PAD = 16;

// ─── Color Palette ───────────────────────────────────────────
const C = {
    navy: "#1E2B6B",
    navyDeep: "#151D4F",
    navyMid: "#1A2B5E",
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
    orangeLight: "#FB923C",
    pink: "#FF3F6C",
    teal: "#14B8A6",
    indigo: "#6366F1",
    cyan: "#06B6D4",

    white: "#FFFFFF",
    bg: "#F7F8FC",
    card: "#FFFFFF",
    border: "#E5E7EB",

    textDark: "#111827",
    textMid: "#374151",
    textLight: "#9CA3AF",
};

// ─── Types ───────────────────────────────────────────────────
type SalesPeriod = "Day" | "Week" | "Month" | "Year";

interface ChartPoint {
    value: number;
}

const PERIOD_OPTIONS: SalesPeriod[] = ["Day", "Week", "Month", "Year"];

const QUICK_ACTIONS = [
    { icon: "shopping-outline", label: "Products", sub: "Add & manage products", iconColor: C.purple, bgColor: C.purplePale },
    { icon: "clipboard-list-outline", label: "Orders", sub: "Manage orders & shipping", iconColor: C.blue, bgColor: "#EFF6FF" },
    { icon: "package-variant", label: "Inventory", sub: "Stock & inventory", iconColor: C.orange, bgColor: "#FFF7ED" },
    { icon: "wallet-outline", label: "Payouts", sub: "View payouts & balance", iconColor: C.green, bgColor: "#F0FDF4" },
    { icon: "currency-inr", label: "Earnings", sub: "View your total earnings", iconColor: C.green, bgColor: "#F0FDF4" },
    { icon: "chart-line", label: "Analytics", sub: "Track store performance", iconColor: C.indigo, bgColor: "#EEF2FF" },
    { icon: "bullhorn-outline", label: "Marketing", sub: "Promotions & ad campaigns", iconColor: C.pink, bgColor: "#FDF2F8" },
    { icon: "cog-outline", label: "Store Settings", sub: "Store info & preferences", iconColor: C.teal, bgColor: "#F0FDFA" },
    { icon: "star-outline", label: "Reviews", sub: "Customer reviews", iconColor: C.yellow, bgColor: "#FFFBEB" },
    { icon: "headset", label: "Support", sub: "Help & support tickets", iconColor: C.indigo, bgColor: "#EEF2FF" },
];

function buildLinePath(pts: ChartPoint[], w: number, h: number): string {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${PAD} ${h - PAD}`;

    const vals  = pts.map(p => p.value);
    const maxV  = Math.max(...vals);
    const minV  = Math.min(...vals);
    const range = maxV - minV || 1;
    const cw    = w - PAD * 2;
    const ch    = h - PAD * 2;
    const first = pts[0];
    const firstX = PAD;
    const firstY = PAD + ch - (((first?.value ?? minV) - minV) / range) * ch;
    let d = `M ${firstX} ${firstY}`;
    for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const prevX = PAD + ((i - 1) / (pts.length - 1)) * cw;
        const currX = PAD + (i / (pts.length - 1)) * cw;
        const prevY = PAD + ch - ((((prev?.value ?? minV) - minV) / range) * ch);
        const currY = PAD + ch - ((((curr?.value ?? minV) - minV) / range) * ch);
        const cpx = (prevX + currX) / 2;
        d += ` C ${cpx} ${prevY}, ${cpx} ${currY}, ${currX} ${currY}`;
    }
    return d;
}

function buildFillPath(pts: ChartPoint[], w: number, h: number): string {
    if (pts.length === 0) return '';
    const line  = buildLinePath(pts, w, h);
    const lastX = PAD + (w - PAD * 2);
    return `${line} L ${lastX} ${h} L ${PAD} ${h} Z`;
}

function getLastPoint(pts: ChartPoint[], w: number, h: number) {
    if (pts.length === 0) {
        return { x: PAD, y: h - PAD };
    }

    const vals  = pts.map(p => p.value);
    const maxV  = Math.max(...vals);
    const minV  = Math.min(...vals);
    const range = maxV - minV || 1;
    const cw    = w - PAD * 2;
    const ch    = h - PAD * 2;
    const lastX = PAD + cw;
    const lastPoint = pts[pts.length - 1];
    const lastY = PAD + ch - (((lastPoint?.value ?? minV) - minV) / range) * ch;
    return { x: lastX, y: lastY };
}

const MENU_CARDS = [
    { id: "dashboard", label: "Dashboard", icon: "view-dashboard-outline", color: C.purple },
    { id: "products", label: "Products", icon: "shopping-outline", color: C.blue },
    { id: "orders", label: "Orders", icon: "clipboard-list-outline", color: C.orange },
    { id: "categories", label: "Categories", icon: "shape-outline", color: C.pink },
    { id: "colors", label: "Colors", icon: "palette-outline", color: C.teal },
    { id: "sizes", label: "Sizes", icon: "format-size", color: C.indigo },
    { id: "support", label: "Support", icon: "headset", color: C.indigo },
    { id: "logout", label: "Logout", icon: "logout", color: C.red },
];


// ─── All Stats Modal ─────────────────────────────────────────
const AllStatsModal: React.FC<{
    visible: boolean;
    onClose: () => void;
}> = ({ visible, onClose }) => {
    const [period, setPeriod] = useState<SalesPeriod>("Day");
    const { allStatsData, loading: statsLoading, reload } = useDashboardStatsByPeriod(visible);
    const data = allStatsData[period];

    useEffect(() => {
        if (visible) reload();
    }, [visible, reload]);

    const STAT_CARDS = [
        { icon: "clipboard-list-outline", label: "Orders", value: data.orders, change: data.ordersChange, color: C.purple, bg: C.purplePale },
        { icon: "currency-inr", label: "Total Sales", value: data.sales, change: data.salesChange, color: C.green, bg: "#F0FDF4" },
        { icon: "eye-outline", label: "Store Views", value: data.views, change: data.viewsChange, color: C.blue, bg: "#EFF6FF" },
        { icon: "star-outline", label: "Avg Rating", value: data.rating, change: data.ratingChange, color: C.yellow, bg: "#FFFBEB" },
        { icon: "account-plus-outline", label: "New Customers", value: data.newCustomers, change: data.newCustomersChange, color: C.indigo, bg: "#EEF2FF" },
        { icon: "receipt", label: "Avg Order Value", value: data.avgOrderValue, change: data.avgOrderValueChange, color: C.teal, bg: "#F0FDFA" },
        { icon: "percent-outline", label: "Conversion Rate", value: data.conversionRate, change: data.conversionRateChange, color: C.pink, bg: "#FDF2F8" },
        { icon: "swap-horizontal", label: "Returns", value: data.returns, change: data.returnsChange, color: C.red, bg: "#FEF2F2" },
    ];

    const isNegativeChange = (ch: string) => ch.startsWith("-");

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
                <View style={stm.header}>
                    <TouchableOpacity onPress={onClose} style={stm.closeBtn}>
                        <Ionicons name="arrow-back" size={20} color={C.textDark} />
                    </TouchableOpacity>
                    <AppText style={stm.headerTitle}>All Stats</AppText>
                    <View style={{ width: 38 }} />
                </View>
                <View style={stm.tabsWrap}>
                    {(["Day", "Week", "Month", "Year"] as SalesPeriod[]).map(p => (
                        <TouchableOpacity
                            key={p}
                            style={[stm.tab, period === p && stm.tabActive]}
                            onPress={() => setPeriod(p)}
                            activeOpacity={0.8}
                        >
                            <AppText style={[stm.tabText, period === p && stm.tabTextActive]}>{p}</AppText>
                        </TouchableOpacity>
                    ))}
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    <View style={stm.heroBanner}>
                        <LinearGradient
                            colors={[C.navyDeep, "#2A3A8A"]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={stm.heroGrad}
                        >
                            <View style={stm.heroLeft}>
                                <AppText style={stm.heroLabel}>
                                    {period === "Day" ? "Today's" : period === "Week" ? "This Week's" : period === "Month" ? "This Month's" : "This Year's"} Revenue
                                </AppText>
                                <AppText style={stm.heroValue}>{data.sales}</AppText>
                                <View style={stm.heroChange}>
                                    <Ionicons name="caret-up" size={13} color={C.green} />
                                    <AppText style={stm.heroChangeText}>{data.salesChange} vs last {period.toLowerCase()}</AppText>
                                </View>
                            </View>
                            <View style={stm.heroDivider} />
                            <View style={stm.heroRight}>
                                <View style={stm.heroMini}>
                                    <AppText style={stm.heroMiniVal}>{data.orders}</AppText>
                                    <AppText style={stm.heroMiniLabel}>Orders</AppText>
                                </View>
                                <View style={stm.heroMini}>
                                    <AppText style={stm.heroMiniVal}>{data.views}</AppText>
                                    <AppText style={stm.heroMiniLabel}>Views</AppText>
                                </View>
                                <View style={stm.heroMini}>
                                    <AppText style={stm.heroMiniVal}>{data.newCustomers}</AppText>
                                    <AppText style={stm.heroMiniLabel}>Customers</AppText>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>
                    <AppText style={stm.sectionLabel}>Key Metrics</AppText>
                    <View style={stm.grid}>
                        {STAT_CARDS.map((st, i) => (
                            <View key={i} style={stm.statCard}>
                                <View style={[stm.statIconBox, { backgroundColor: st.bg }]}>
                                    <MaterialCommunityIcons name={st.icon as any} size={22} color={st.color} />
                                </View>
                                <AppText style={stm.statLabel}>{st.label}</AppText>
                                <AppText style={[stm.statValue, { color: st.color }]}>{st.value}</AppText>
                                <View style={stm.changeRow}>
                                    <Ionicons
                                        name={isNegativeChange(st.change) ? "caret-down" : "caret-up"}
                                        size={11}
                                        color={isNegativeChange(st.change) ? (st.label === "Returns" ? C.green : C.red) : C.green}
                                    />
                                    <AppText style={[
                                        stm.changeText,
                                        { color: isNegativeChange(st.change) ? (st.label === "Returns" ? C.green : C.red) : C.green }
                                    ]}>
                                        {st.change}
                                    </AppText>
                                    <AppText style={stm.changeVs}>vs last {period.toLowerCase()}</AppText>
                                </View>
                            </View>
                        ))}
                    </View>
                    <AppText style={stm.sectionLabel}>Period Comparison</AppText>
                    <View style={stm.tableCard}>
                        <View style={[stm.tableRow, stm.tableHeader]}>
                            <AppText style={[stm.tableCell, stm.tableCellHeader, { flex: 1.4 }]}>Metric</AppText>
                            {(["Day", "Week", "Month", "Year"] as SalesPeriod[]).map(p => (
                                <AppText key={p} style={[stm.tableCell, stm.tableCellHeader, p === period && stm.tableCellHighlight]}>{p}</AppText>
                            ))}
                        </View>
                        {[
                            { label: "Sales", values: (["Day", "Week", "Month", "Year"] as SalesPeriod[]).map((p) => allStatsData[p].sales) },
                            { label: "Orders", values: (["Day", "Week", "Month", "Year"] as SalesPeriod[]).map((p) => allStatsData[p].orders) },
                            { label: "Views", values: (["Day", "Week", "Month", "Year"] as SalesPeriod[]).map((p) => allStatsData[p].views) },
                            { label: "Rating", values: (["Day", "Week", "Month", "Year"] as SalesPeriod[]).map((p) => allStatsData[p].rating) },
                        ].map((row, ri) => (
                            <View key={ri} style={[stm.tableRow, ri % 2 === 0 && stm.tableRowAlt]}>
                                <AppText style={[stm.tableCell, stm.tableCellLabel, { flex: 1.4 }]}>{row.label}</AppText>
                                {row.values.map((v, vi) => (
                                    <AppText
                                        key={vi}
                                        style={[
                                            stm.tableCell,
                                            stm.tableCellVal,
                                            (["Day", "Week", "Month", "Year"] as SalesPeriod[])[vi] === period && stm.tableCellHighlight,
                                        ]}
                                    >
                                        {v}
                                    </AppText>
                                ))}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const stm = StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white },
    headerTitle: { fontFamily: fontFamilies.bold, fontSize: 18, color: C.textDark },
    closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    tabsWrap: { flexDirection: "row", backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 50, backgroundColor: C.bg, alignItems: "center", borderWidth: 1, borderColor: C.border },
    tabActive: { backgroundColor: C.purple, borderColor: C.purple },
    tabText: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textMid },
    tabTextActive: { color: C.white },
    heroBanner: { marginHorizontal: 16, marginTop: 16, marginBottom: 4, borderRadius: 16, overflow: "hidden" },
    heroGrad: { flexDirection: "row", padding: 18, borderRadius: 16, alignItems: "center" },
    heroLeft: { flex: 1.3 },
    heroLabel: { fontFamily: fontFamilies.regular, fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 4 },
    heroValue: { fontFamily: fontFamilies.bold, fontSize: 24, color: C.white, marginBottom: 5 },
    heroChange: { flexDirection: "row", alignItems: "center", gap: 3 },
    heroChangeText: { fontFamily: fontFamilies.medium, fontSize: 12, color: C.green },
    heroDivider: { width: 1, height: 60, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 14 },
    heroRight: { flex: 1, gap: 10 },
    heroMini: {},
    heroMiniVal: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.white },
    heroMiniLabel: { fontFamily: fontFamilies.regular, fontSize: 11, color: "rgba(255,255,255,0.6)" },
    sectionLabel: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark, marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16 },
    statCard: { width: (SW - 42) / 2, backgroundColor: C.white, borderRadius: 14, padding: 13, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    statIconBox: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    statLabel: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginBottom: 2 },
    statValue: { fontFamily: fontFamilies.bold, fontSize: 19, marginBottom: 4 },
    changeRow: { flexDirection: "row", alignItems: "center", gap: 2 },
    changeText: { fontFamily: fontFamilies.semiBold, fontSize: 11 },
    changeVs: { fontFamily: fontFamilies.regular, fontSize: 10, color: C.textLight, marginLeft: 2 },
    tableCard: { marginHorizontal: 16, backgroundColor: C.white, borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    tableRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border },
    tableHeader: { backgroundColor: C.navyDeep },
    tableRowAlt: { backgroundColor: "#FAFAFA" },
    tableCell: { flex: 1, paddingHorizontal: 6, paddingVertical: 11, textAlign: "center" },
    tableCellHeader: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: "rgba(255,255,255,0.85)", textAlign: "center" },
    tableCellLabel: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.textDark, textAlign: "left", paddingLeft: 12 },
    tableCellVal: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textMid },
    tableCellHighlight: { color: C.purple, fontFamily: fontFamilies.bold },
});

const MiniChart: React.FC<{
    points: number[];
    color?: string;
}> = ({ points, color = C.purple }) => {
    const W = SW - 96;
    const H = 70;

    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;

    const xs = points.map(
        (_, i) => (i / (points.length - 1)) * W
    );

    const ys = points.map(
        (v) => H - ((v - min) / range) * (H - 10) - 5
    );

    // Create smooth SVG path
    const path = xs
        .map((x, i) => {
            const y = ys[i] ?? 0;

            if (i === 0) {
                return `M ${x} ${y}`;
            }

            const prevX = xs[i - 1] ?? 0;
            const prevY = ys[i - 1] ?? 0;

            const cx = (prevX + x) / 2;

            return `Q ${cx} ${prevY}, ${x} ${y}`;
        })
        .join(" ");

    return (
        <View style={{ width: W, height: H }}>
            <Svg width={W} height={H}>
                <Path
                    d={path}
                    stroke={color}
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {xs.map((x, i) => (
                    <Circle
                        key={i}
                        cx={x}
                        cy={ys[i]}
                        r={3}
                        fill={color}
                    />
                ))}
            </Svg>
        </View>
    );
};

// ─── Bar Chart ───────────────────────────────────────────────
const BarChart: React.FC<{ points: number[]; labels: string[]; color: string }> = ({ points, labels, color }) => {
    const W = SW - 96;
    const H = 70;
    const max = Math.max(...points) || 1;
    const barW = Math.max(4, (W / points.length) - 4);
    const labelStep = Math.ceil(labels.length / 7);

    return (
        <View style={{ width: W }}>
            <View style={{ height: H, flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
                {points.map((v, i) => (
                    <View key={i} style={{ flex: 1, alignItems: "center" }}>
                        <View style={{
                            width: barW,
                            height: Math.max(4, (v / max) * (H - 8)),
                            backgroundColor: color,
                            borderRadius: 3,
                            opacity: 0.85,
                        }} />
                    </View>
                ))}
            </View>
            <View style={{ flexDirection: "row", marginTop: 4 }}>
                {labels.map((l, i) => (
                    <AppText key={i} size="xs" align="center" color={C.textLight} style={{ flex: 1 }}>
                        {i % labelStep === 0 ? l : ""}
                    </AppText>
                ))}
            </View>
        </View>
    );
};

// ─── Period Dropdown ─────────────────────────────────────────
const PeriodDropdown: React.FC<{ selected: SalesPeriod; onSelect: (p: SalesPeriod) => void }> = ({ selected, onSelect }) => {
    const [open, setOpen] = useState(false);
    return (
        <View style={{ position: "relative", zIndex: 100 }}>
            <TouchableOpacity style={dd.trigger} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
                <AppText style={dd.triggerText}>{selected}</AppText>
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={13} color={C.purple} />
            </TouchableOpacity>
            {open && (
                <View style={dd.menu}>
                    {PERIOD_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt}
                            style={[dd.menuItem, opt === selected && dd.menuItemActive]}
                            onPress={() => { onSelect(opt); setOpen(false); }}
                            activeOpacity={0.75}
                        >
                            <AppText style={[dd.menuItemText, opt === selected && dd.menuItemTextActive]}>{opt}</AppText>
                            {opt === selected && <Ionicons name="checkmark" size={13} color={C.purple} />}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const dd = StyleSheet.create({
    trigger: {
        flexDirection: "row", alignItems: "center", gap: 5,
        backgroundColor: C.purplePale, paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 50, borderWidth: 1, borderColor: C.purple + "40",
    },
    triggerText: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.purple },
    menu: {
        position: "absolute", top: 36, right: 0,
        backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border,
        minWidth: 110, overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 20,
        zIndex: 200,
    },
    menuItem: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 14, paddingVertical: 11,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    menuItemActive: { backgroundColor: C.purplePale },
    menuItemText: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textMid },
    menuItemTextActive: { color: C.purple, fontFamily: fontFamilies.semiBold },
});

// ─── All Products Modal ──────────────────────────────────────
const AllProductsModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
    const router = useRouter();
    const { products, loading, reload } = useSellerProducts();
    const [selectedCategory, setSelectedCategory] = useState("All");

    useEffect(() => {
        if (visible) reload();
    }, [visible, reload]);

    const catalog = products.map((p) => ({
        id: String(p.id),
        name: p.name,
        price: p.price,
        sold: 0,
        image: p.image || "",
        category: p.category || "—",
    }));
    const categories = ["All", ...Array.from(new Set(catalog.map((p) => p.category).filter(Boolean)))];
    const filtered =
        selectedCategory === "All"
            ? catalog
            : catalog.filter((p) => p.category === selectedCategory);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
                <View style={ms.header}>
                    <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
                        <Ionicons name="arrow-back" size={20} color={C.textDark} />
                    </TouchableOpacity>
                    <AppText style={ms.headerTitle}>All Products</AppText>
                    <TouchableOpacity style={ms.addBtn}>
                        <Ionicons name="add" size={20} color={C.white} />
                        <AppText style={ms.addBtnText}>Add</AppText>
                    </TouchableOpacity>
                </View>
                <View style={{ backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ms.catScroll}>
                        {categories.map(cat => (
                            <TouchableOpacity key={cat} onPress={() => setSelectedCategory(cat)}
                                style={[ms.catChip, selectedCategory === cat && ms.catChipActive]}>
                                <AppText style={[ms.catChipText, selectedCategory === cat && ms.catChipTextActive]}>{cat}</AppText>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <AppText style={ms.resultCount}>
                    {loading ? "Loading products…" : `${filtered.length} products found`}
                </AppText>
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={ms.productCard}>
                            <View style={ms.productTopRow}>
                                <Image source={{ uri: item.image }} style={ms.productImg} resizeMode="cover" />
                                <View style={ms.productInfo}>
                                    <AppText style={ms.productName} numberOfLines={1}>{item.name}</AppText>
                                    <View style={ms.productMetaRow}>
                                        <View style={ms.catTag}><AppText style={ms.catTagText}>{item.category}</AppText></View>
                                        <View style={ms.soldBadge}>
                                            <MaterialCommunityIcons name="trending-up" size={12} color={C.green} />
                                            <AppText style={ms.soldText}>{item.sold} sold</AppText>
                                        </View>
                                    </View>
                                    <AppText style={ms.productPrice}>{item.price}</AppText>
                                </View>
                            </View>
                            <View style={ms.cardDivider} />
                            <View style={ms.actionRow}>
                                <TouchableOpacity
                                    style={ms.actionBtnEdit}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        onClose();
                                        router.push({ pathname: "/(main)/Editproduct", params: { id: item.id } } as any);
                                    }}
                                >
                                    <Feather name="edit-2" size={14} color={C.purple} />
                                    <AppText weight="semiBold" size="sm" color={C.purple}>Edit</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity style={ms.actionBtnStock} activeOpacity={0.8} onPress={() => console.log('Update stock:', item.name)}>
                                    <MaterialCommunityIcons name="package-variant" size={14} color={C.blue} />
                                    <AppText weight="semiBold" size="sm" color={C.blue}>Stock</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity style={ms.actionBtnDelete} activeOpacity={0.8} onPress={() => console.log('Delete product:', item.name)}>
                                    <Feather name="trash-2" size={14} color={C.red} />
                                    <AppText weight="semiBold" size="sm" color={C.red}>Delete</AppText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            </SafeAreaView>
        </Modal>
    );
};

const ms = StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white },
    headerTitle: { fontFamily: fontFamilies.bold, fontSize: 18, color: C.textDark },
    closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.purple, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50 },
    addBtnText: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.white },
    catScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    catChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
    catChipActive: { backgroundColor: C.purple, borderColor: C.purple },
    catChipText: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textMid },
    catChipTextActive: { color: C.white },
    resultCount: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textLight, marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
    productCard: { backgroundColor: C.white, borderRadius: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, overflow: "hidden" },
    productTopRow: { flexDirection: "row", alignItems: "center", padding: 14 },
    productImg: { width: 70, height: 70, borderRadius: 12, backgroundColor: C.purplePale },
    productInfo: { flex: 1, marginLeft: 12 },
    productName: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark, marginBottom: 6 },
    productMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
    catTag: { backgroundColor: C.purplePale, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 50 },
    catTagText: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: C.purple },
    soldBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50 },
    soldText: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: C.green },
    productPrice: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.textDark },
    cardDivider: { height: 1, backgroundColor: C.border },
    actionRow: { flexDirection: "row" },
    actionBtnEdit: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, backgroundColor: C.purplePale, borderRightWidth: 1, borderRightColor: C.border },
    actionBtnEditText: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.purple },
    actionBtnStock: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, backgroundColor: "#EFF6FF", borderRightWidth: 1, borderRightColor: C.border },
    actionBtnStockText: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.blue },
    actionBtnDelete: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, backgroundColor: "#FEF2F2" },
    actionBtnDeleteText: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.red },
});

// ─── Orders Summary Modal ─────────────────────────────────────
const OrdersSummaryModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    totalProducts: number;
    totalOrders: number;
    orderSummary: { label: string; count: number; icon: string; color: string }[];
}> = ({ visible, onClose, totalProducts, totalOrders, orderSummary }) => {
    const ORDER_STATUS_DETAILS = [
        { icon: "clipboard-list-outline", color: C.purple, bgColor: C.purplePale, label: "Pending", count: orderSummary.find((o) => o.label === "Pending")?.count ?? 0, desc: "Awaiting confirmation" },
        { icon: "progress-clock", color: C.yellow, bgColor: "#FFFBEB", label: "Processing", count: orderSummary.find((o) => o.label === "Processing")?.count ?? 0, desc: "Being prepared" },
        { icon: "truck-delivery-outline", color: C.blue, bgColor: "#EFF6FF", label: "Shipped", count: orderSummary.find((o) => o.label === "Shipped")?.count ?? 0, desc: "Out for delivery" },
        { icon: "check-circle-outline", color: C.green, bgColor: "#F0FDF4", label: "Delivered", count: orderSummary.find((o) => o.label === "Delivered")?.count ?? 0, desc: "Successfully delivered" },
        { icon: "swap-horizontal", color: C.orange, bgColor: "#FFF7ED", label: "Returns", count: orderSummary.find((o) => o.label === "Returns")?.count ?? 0, desc: "Return requested" },
    ];
    const TOTAL_ORDERS_COUNT = totalOrders;

    return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <View style={om.header}>
                <AppText style={om.headerTitle}>Orders Summary</AppText>
                <TouchableOpacity onPress={onClose} style={om.closeBtn}>
                    <Ionicons name="close" size={22} color={C.textDark} />
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={om.totalsRow}>
                    <View style={om.totalCard}>
                        <LinearGradient colors={[C.navyDeep, C.navyLight]} style={om.totalGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <MaterialCommunityIcons name="shopping-outline" size={28} color="rgba(255,255,255,0.7)" />
                            <AppText style={om.totalNum}>{totalProducts}</AppText>
                            <AppText style={om.totalLabel}>Total Products</AppText>
                        </LinearGradient>
                    </View>
                    <View style={om.totalCard}>
                        <LinearGradient colors={[C.purple, C.purpleLight]} style={om.totalGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <MaterialCommunityIcons name="clipboard-list-outline" size={28} color="rgba(255,255,255,0.7)" />
                            <AppText style={om.totalNum}>{TOTAL_ORDERS_COUNT}</AppText>
                            <AppText style={om.totalLabel}>Total Orders</AppText>
                        </LinearGradient>
                    </View>
                </View>
                <AppText style={om.sectionLabel}>Order Status Breakdown</AppText>
                <View style={om.statusGrid}>
                    {ORDER_STATUS_DETAILS.map((o, i) => {
                        const pct = TOTAL_ORDERS_COUNT > 0 ? Math.round((o.count / TOTAL_ORDERS_COUNT) * 100) : 0;
                        return (
                        <View key={i} style={om.statusCard}>
                            <View style={[om.statusIconBox, { backgroundColor: o.bgColor }]}>
                                <MaterialCommunityIcons name={o.icon as any} size={26} color={o.color} />
                            </View>
                            <AppText style={[om.statusCount, { color: o.color }]}>{o.count}</AppText>
                            <AppText style={om.statusLabel}>{o.label}</AppText>
                            <AppText style={om.statusDesc}>{o.desc}</AppText>
                            <View style={om.progressBg}>
                                <View style={[om.progressFill, { width: `${pct}%` as any, backgroundColor: o.color }]} />
                            </View>
                            <AppText style={[om.progressPct, { color: o.color }]}>{pct}%</AppText>
                        </View>
                        );
                    })}
                </View>
                <View style={om.summaryBarWrap}>
                    <AppText style={om.sectionLabel}>Distribution</AppText>
                    <View style={om.summaryBar}>
                        {ORDER_STATUS_DETAILS.map((o, i) => (
                            <View key={i} style={{ flex: o.count, height: 12, backgroundColor: o.color, borderRadius: i === 0 ? 6 : i === ORDER_STATUS_DETAILS.length - 1 ? 6 : 0, marginHorizontal: 1 }} />
                        ))}
                    </View>
                    <View style={om.legendRow}>
                        {ORDER_STATUS_DETAILS.map((o, i) => (
                            <View key={i} style={om.legendItem}>
                                <View style={[om.legendDot, { backgroundColor: o.color }]} />
                                <AppText style={om.legendText}>{o.label}</AppText>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    </Modal>
    );
};

const om = StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white },
    headerTitle: { fontFamily: fontFamilies.bold, fontSize: 20, color: C.textDark },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    totalsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
    totalCard: { flex: 1, borderRadius: 16, overflow: "hidden" },
    totalGrad: { padding: 18, alignItems: "center", gap: 6, borderRadius: 16 },
    totalNum: { fontFamily: fontFamilies.bold, fontSize: 32, color: C.white },
    totalLabel: { fontFamily: fontFamilies.medium, fontSize: 13, color: "rgba(255,255,255,0.75)" },
    sectionLabel: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark, marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
    statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16 },
    statusCard: { width: (SW - 42) / 2, backgroundColor: C.white, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    statusIconBox: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    statusCount: { fontFamily: fontFamilies.bold, fontSize: 26 },
    statusLabel: { fontFamily: fontFamilies.bold, fontSize: 13, color: C.textDark, marginTop: 2 },
    statusDesc: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 2, marginBottom: 10 },
    progressBg: { height: 5, backgroundColor: C.border, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: 5, borderRadius: 3 },
    progressPct: { fontFamily: fontFamilies.semiBold, fontSize: 11, marginTop: 4 },
    summaryBarWrap: { paddingHorizontal: 16, marginTop: 8 },
    summaryBar: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 12 },
    legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: fontFamilies.medium, fontSize: 12, color: C.textMid },
});

// ─── Referral Section ─────────────────────────────────────────
const ReferralSection: React.FC<{
    referralCode: string;
    goal: number;
    totalReferred: number;
    qualified: number;
}> = ({ referralCode, goal, totalReferred, qualified }) => {
    const [copied, setCopied] = useState(false);
    const progressPercent = goal > 0 ? Math.min((totalReferred / goal) * 100, 100) : 0;

    const handleCopy = () => {
        if (!referralCode) return;
        Clipboard.setString(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <View style={rf.wrapper}>
            <View style={rf.outer}>
                <View style={rf.header}>
                    <View style={rf.headerIcon}>
                        <MaterialCommunityIcons name="gift-outline" size={18} color={C.orangeDeep} />
                    </View>
                    <AppText style={rf.headerTitle}>Share your F&T Seller Referral Code</AppText>
                </View>
                <AppText style={rf.desc}>
                    Invite friends, family, or followers to become sellers on Flint & Thread. When they complete their profile, get approved, and list at least one product, they count as your referred seller.
                </AppText>
                <View style={rf.codeRow}>
                    <AppText style={rf.codeLabel}>YOUR CODE</AppText>
                    <View style={rf.codePill}>
                        <MaterialCommunityIcons name="gift-outline" size={15} color={C.orangeDeep} />
                        <AppText style={rf.codeText}>{referralCode || "—"}</AppText>
                        <TouchableOpacity style={rf.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
                            <MaterialCommunityIcons
                                name={copied ? "check" : "content-copy"}
                                size={13}
                                color={copied ? C.green : C.textMid}
                            />
                            <AppText style={[rf.copyBtnText, copied && { color: C.green }]}>
                                {copied ? "Copied!" : "Copy"}
                            </AppText>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={rf.statsGrid}>
                    {[
                        { icon: "account-multiple-outline", color: C.blue, value: String(totalReferred), label: "Total referred" },
                        { icon: "check-circle-outline", color: C.green, value: String(qualified), label: "Qualified sellers" },
                        { icon: "medal-outline", color: C.orangeDeep, value: "+5%", label: "Commission earn" },
                    ].map((st, i) => (
                        <View key={i} style={rf.statCard}>
                            <MaterialCommunityIcons name={st.icon as any} size={20} color={st.color} style={{ marginBottom: 3 }} />
                            <AppText style={rf.statNum}>{st.value}</AppText>
                            <AppText style={rf.statLabel}>{st.label}</AppText>
                        </View>
                    ))}
                </View>
                <View style={rf.progressBox}>
                    <View style={rf.progressTop}>
                        <AppText style={rf.progressTitle}>Invite {goal} sellers to unlock reward</AppText>
                        <AppText style={rf.progressCount}>{totalReferred} / {goal}</AppText>
                    </View>
                    <View style={rf.progBg}>
                        <View style={[rf.progFill, { width: `${progressPercent}%` as any }]} />
                    </View>
                    <View style={rf.stepsRow}>
                        {["Invite 6 sellers", "Get 10 orders"].map((step, i) => (
                            <View key={i} style={rf.stepItem}>
                                <View style={rf.stepNum}>
                                    <AppText style={rf.stepNumText}>{i + 1}</AppText>
                                </View>
                                <AppText style={rf.stepText}>{step}</AppText>
                            </View>
                        ))}
                    </View>
                </View>
                <TouchableOpacity style={rf.earnBtn} activeOpacity={0.85}>
                    <MaterialCommunityIcons name="gift-outline" size={17} color={C.orangeDeep} />
                    <AppText style={rf.earnBtnText}>Earn +5% commission on every referral</AppText>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={C.orangeDeep} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const rf = StyleSheet.create({
    wrapper: { marginHorizontal: 16, marginBottom: 10 },
    outer: { backgroundColor: C.orangeDeep, borderRadius: 16, overflow: "hidden", padding: 16, paddingBottom: 0 },
    header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
    headerIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontFamily: fontFamilies.bold, fontSize: 14, color: "#fff", lineHeight: 20 },
    desc: { fontFamily: fontFamilies.regular, fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 18, marginBottom: 14 },
    codeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
    codeLabel: { fontFamily: fontFamilies.bold, fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: 0.8 },
    codePill: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 50, paddingHorizontal: 12, paddingVertical: 8 },
    codeText: { flex: 1, fontFamily: fontFamilies.bold, fontSize: 12, color: C.textDark, letterSpacing: 0.3 },
    copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 50 },
    copyBtnText: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: C.textMid },
    statsGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
    statCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 10, padding: 10, alignItems: "center" },
    statNum: { fontFamily: fontFamilies.bold, fontSize: 20, color: C.textDark },
    statLabel: { fontFamily: fontFamilies.regular, fontSize: 10, color: C.textLight, marginTop: 1, textAlign: "center" },
    progressBox: { backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 10, padding: 12, marginBottom: 14 },
    progressTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 7 },
    progressTitle: { fontFamily: fontFamilies.medium, fontSize: 12, color: C.textDark, flex: 1, marginRight: 8 },
    progressCount: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.orangeDeep },
    progBg: { height: 7, backgroundColor: C.border, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
    progFill: { height: 7, backgroundColor: C.orangeDeep, borderRadius: 4 },
    stepsRow: { flexDirection: "row", gap: 8 },
    stepItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
    stepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.orangeDeep, alignItems: "center", justifyContent: "center" },
    stepNumText: { fontFamily: fontFamilies.bold, fontSize: 11, color: "#fff" },
    stepText: { fontFamily: fontFamilies.medium, fontSize: 11, color: C.textMid },
    earnBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
        backgroundColor: "rgba(255,255,255,0.96)",
        marginHorizontal: -16, paddingVertical: 13,
        borderTopWidth: 1.5, borderTopColor: "rgba(255,255,255,0.25)",
    },
    earnBtnText: { fontFamily: fontFamilies.bold, fontSize: 13, color: C.orangeDeep },
});

// ─── Side Drawer Menu ─────────────────────────────────────────
const MENU_MAIN_ITEMS = (pendingOrders: number) => [
    { icon: "view-dashboard-outline", label: "Dashboard", badge: null as string | null, active: true },
    { icon: "shopping-outline", label: "Products", badge: null, active: false },
    { icon: "clipboard-list-outline", label: "Orders", badge: pendingOrders > 0 ? String(pendingOrders) : null, active: false },
    { icon: "shape-outline", label: "Categories", badge: null, active: false },
    { icon: "tag-plus-outline", label: "Request Category", badge: null, active: false },
];

const SideDrawer: React.FC<{
    visible: boolean;
    onClose: () => void;
    profile: SellerProfileSummary | null;
    rating: string;
    pendingOrders: number;
}> = ({ visible, onClose, profile, rating, pendingOrders }) => {
    const router = useRouter();
    const displayName = profile?.fullName ?? "Seller";
    const storeLabel = profile?.storeLabel ?? "Your store";
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;
    const [activeItem, setActiveItem] = useState("Dashboard");

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 70,
                    friction: 12,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;
    return (
        <View style={dr.container} pointerEvents={visible ? "auto" : "none"}>
            {/* Dimmed overlay */}
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[dr.overlay, { opacity: overlayAnim }]} />
            </TouchableWithoutFeedback>

            {/* Drawer panel */}
            <Animated.View style={[dr.drawer, { transform: [{ translateX: slideAnim }] }]}>
                <LinearGradient
                    colors={[C.navyDeep, "#1E2B7A"]}
                    style={dr.drawerGrad}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                >
                    {/* ── Drawer Header / Profile ── */}
                    <SafeAreaView style={{ backgroundColor: "transparent" }}>
                        <View style={dr.drawerHeader}>
                            <View style={dr.drawerHeaderTop}>
                                <View style={dr.drawerAvatar}>
                                    {profile?.profilePicUrl ? (
                                        <Image
                                            source={{ uri: profile.profilePicUrl }}
                                            style={dr.drawerAvatarImage}
                                        />
                                    ) : (
                                        <MaterialCommunityIcons name="account" size={36} color={C.purpleLight} />
                                    )}
                                </View>
                                <TouchableOpacity onPress={onClose} style={dr.drawerCloseBtn}>
                                    <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
                                </TouchableOpacity>
                            </View>
                            <AppText style={dr.drawerName}>{displayName}</AppText>
                            <AppText style={dr.drawerStore}>{storeLabel}</AppText>
                            <View style={dr.drawerBadgeRow}>
                                <View style={dr.platBadge}>
                                    <MaterialCommunityIcons name="check-decagram" size={11} color="#fff" />
                                    <AppText style={dr.platText}>Platinum Seller</AppText>
                                </View>
                                <View style={dr.ratingPill}>
                                    <Ionicons name="star" size={11} color={C.yellow} />
                                    <AppText style={dr.ratingPillText}>{rating}</AppText>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>

                    {/* ── Divider ── */}
                    <View style={dr.divider} />

                    {/* ── Main Menu Items ── */}
                    <ScrollView style={dr.menuScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                        <AppText style={dr.menuSectionLabel}>MAIN MENU</AppText>
                        {MENU_MAIN_ITEMS(pendingOrders).map((item, i) => {
                            const isActive = activeItem === item.label;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[dr.menuItem, isActive && dr.menuItemActive]}
                                    onPress={() => { 
                                        setActiveItem(item.label); 
                                        onClose(); 
                                        if (item.label === "Dashboard") router.push("/(main)/dashboard");
                                        else if (item.label === "Products") router.push("/(main)/productmanagement");
                                        else if (item.label === "Orders") router.push("/(main)/Ordersscreen");
                                        else if (item.label === "Category Request") router.push("/(main)/categoryrequest");
                                    }}
                                    activeOpacity={0.75}
                                >
                                    {isActive && (
                                        <View style={dr.activeIndicator} />
                                    )}
                                    <View style={[dr.menuIconBox, isActive && dr.menuIconBoxActive]}>
                                        <MaterialCommunityIcons
                                            name={item.icon as any}
                                            size={20}
                                            color={isActive ? C.purple : "rgba(255,255,255,0.6)"}
                                        />
                                    </View>
                                    <AppText style={[dr.menuLabel, isActive && dr.menuLabelActive]}>{item.label}</AppText>
                                    <View style={{ flex: 1 }} />
                                    {item.badge && (
                                        <View style={dr.menuBadge}>
                                            <AppText style={dr.menuBadgeText}>{item.badge}</AppText>
                                        </View>
                                    )}
                                    <Ionicons
                                        name="chevron-forward"
                                        size={15}
                                        color={isActive ? C.purple : "rgba(255,255,255,0.25)"}
                                        style={{ marginLeft: 4 }}
                                    />
                                </TouchableOpacity>
                            );
                        })}

                        {/* ── Support Section ── */}
                        <View style={dr.divider} />
                        <AppText style={dr.menuSectionLabel}>SUPPORT</AppText>
                        <TouchableOpacity style={dr.menuItem} activeOpacity={0.75} onPress={() => { onClose(); router.push("/(main)/helpsupport"); }}>
                            <View style={dr.menuIconBox}>
                                <MaterialCommunityIcons name="headset" size={20} color="rgba(255,255,255,0.6)" />
                            </View>
                            <AppText style={dr.menuLabel}>Help & Support</AppText>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.25)" />
                        </TouchableOpacity>
                    </ScrollView>

                    {/* ── Bottom: Profile & Logout ── */}
                    <View style={dr.drawerBottom}>
                        <View style={dr.bottomDivider} />
                        {/* <TouchableOpacity style={dr.bottomItem} activeOpacity={0.75} onPress={onClose}>
                            <View style={[dr.menuIconBox, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                                <MaterialCommunityIcons name="account-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
                            </View>
                            <AppText style={dr.menuLabel}>My Profile</AppText>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.25)" />
                        </TouchableOpacity> */}
                        <TouchableOpacity
                            style={[dr.bottomItem, dr.logoutItem]}
                            activeOpacity={0.75}
                            onPress={() => {
                                onClose();
                                Alert.alert("Logout", "Are you sure you want to logout?", [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Logout", style: "destructive", onPress: () => router.replace("/(auth)/login") },
                                ]);
                            }}
                        >
                            <View style={[dr.menuIconBox, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                                <MaterialCommunityIcons name="logout" size={20} color={C.red} />
                            </View>
                            <AppText style={dr.logoutLabel}>Logout</AppText>
                            <View style={{ flex: 1 }} />
                            <Ionicons name="chevron-forward" size={15} color={C.red + "60"} />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </Animated.View>
        </View>
    );
};

const dr = StyleSheet.create({
    container: {
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
    },
    overlay: {
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(187, 181, 181, 0.55)",
    },
    drawer: {
        position: "absolute", top: 0, left: 0, bottom: 0,
        width: DRAWER_WIDTH,
        shadowColor: "#100f0f", shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 30,
    },
    drawerGrad: {
        flex: 1,
        backgroundColor: "#192235", // change any color
    },

    // Header
    drawerHeader: { paddingHorizontal: 20, paddingTop: 55, paddingBottom: 10, },
    drawerHeaderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 },
    drawerAvatar: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: "rgba(244, 241, 241, 0.1)",
        borderWidth: 2, borderColor: "rgba(255,255,255,0.2)",
        alignItems: "center", justifyContent: "center",
        overflow: "hidden",
    },
    drawerAvatarImage: { width: 64, height: 64, borderRadius: 32 },
    drawerCloseBtn: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center", justifyContent: "center",
    },
    drawerName: { fontFamily: fontFamilies.bold, fontSize: 18, color: C.white, marginBottom: 3 },
    drawerStore: { fontFamily: fontFamilies.regular, fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 10 },
    drawerBadgeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    platBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: C.purple, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50,
    },
    platText: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: C.white },
    ratingPill: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 50, borderWidth: 1, borderColor: "rgba(245,158,11,0.3)",
    },
    ratingPillText: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: C.yellow },

    divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 4, marginHorizontal: 20 },

    // Menu
    menuScroll: { flex: 1, paddingHorizontal: 12 },
    menuSectionLabel: {
        fontFamily: fontFamilies.semiBold, fontSize: 10,
        color: "rgba(255,255,255,0.35)", letterSpacing: 1.2,
        paddingHorizontal: 10, paddingTop: 16, paddingBottom: 6,
    },
    menuItem: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 10, paddingVertical: 12,
        borderRadius: 12, marginBottom: 2,
        position: "relative", overflow: "hidden",
    },
    menuItemActive: { backgroundColor: "rgba(108,99,255,0.12)" },
    activeIndicator: {
        position: "absolute", left: 0, top: 8, bottom: 8,
        width: 3, borderRadius: 2, backgroundColor: C.purple,
    },
    menuIconBox: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.06)",
        alignItems: "center", justifyContent: "center",
        marginRight: 12,
    },
    menuIconBoxActive: { backgroundColor: C.purplePale },
    menuLabel: { fontFamily: fontFamilies.medium, fontSize: 14, color: "rgba(255,255,255)" },
    menuLabelActive: { color: C.white, fontFamily: fontFamilies.semiBold },
    menuBadge: {
        backgroundColor: C.orange, minWidth: 22, height: 22,
        borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
    },
    menuBadgeText: { fontFamily: fontFamilies.bold, fontSize: 11, color: C.white },

    // Bottom
    drawerBottom: { paddingHorizontal: 12, paddingBottom: 28 },
    bottomDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 8, marginHorizontal: 8 },
    bottomItem: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 10, paddingVertical: 11,
        borderRadius: 12, marginBottom: 2,
    },
    logoutItem: { marginTop: 2 },
    logoutLabel: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.red },
});

// ─── Main Dashboard ──────────────────────────────────────────
const MobileDashboard: React.FC<{
    profile: SellerProfileSummary | null;
    profileLoading: boolean;
}> = ({ profile, profileLoading }) => {
    const router = useRouter();
    const {
        data,
        loading: dashboardLoading,
        overviewStats,
        orderSummary,
        topProducts,
        totalProducts,
        totalOrders,
        averageRating,
        reviewCount,
    } = useDashboardData();
    const displayName = profile?.fullName ?? (profileLoading ? "Loading…" : "Seller");
    const storeLabel = profile?.storeLabel ?? "Your store";
    const mobileDisplay = profile?.mobileDisplay ?? "—";
    const emailDisplay = profile?.email ?? "—";
    const profileRating =
        averageRating > 0 ? String(averageRating) : "—";
    const profileReviewCount = reviewCount;
    const ratingLabel =
        averageRating >= 4.5
            ? "Excellent"
            : averageRating >= 4
              ? "Great"
              : averageRating >= 3
                ? "Good"
                : averageRating > 0
                  ? "Fair"
                  : "No reviews";
    const overviewStatsView = overviewStats;
    const orderSummaryView = orderSummary;
    const topProductsView = topProducts;
    const totalProductsCount = totalProducts;
    const pendingOrdersCount =
        orderSummaryView?.find((o) => o.label === "Pending")?.count ?? 0;
    const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>("Week");
    const [ordersPeriod, setOrdersPeriod] = useState<SalesPeriod>("Week");
    const [productsPeriod, setProductsPeriod] = useState<SalesPeriod>("Week");
    const salesCharts = useDashboardCharts(salesPeriod);
    const ordersCharts = useDashboardCharts(ordersPeriod);
    const productsCharts = useDashboardCharts(productsPeriod);
    const [showAllProducts, setShowAllProducts] = useState(false);
    const [showOrdersSummary, setShowOrdersSummary] = useState(false);
    const [showAllStats, setShowAllStats] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [activeMenuCard, setActiveMenuCard] = useState<string>("dashboard");
    const { setActiveLabel } = (() => {
        try {
            // dynamic import hook usage only works when provider wraps this component
            // if provider missing, avoid throwing.
            return useActiveHeader();
        } catch (e) {
            return { setActiveLabel: (l: string) => {} } as const;
        }
    })();

    const handleCardPress = (id: string) => {
        setActiveMenuCard(id);
        const label = MENU_CARDS.find(c => c.id === id)?.label ?? "Dashboard";
        setActiveLabel(label);
        if (id === "products") {
            router.push("/(main)/productmanagement");
        } else if (id === "orders") {
            router.push("/(main)/Ordersscreen");
        } else if (id === "categories") {
            router.push("/(main)/categoryrequest");
        } else if (id === "colors") {
            router.push("/(main)/colors");
        } else if (id === "sizes") {
            router.push("/(main)/sizes");
        } else if (id === "support") {
            router.push("/(main)/helpsupport");
        } else if (id === "logout") {
            Alert.alert("Logout", "Are you sure you want to logout?", [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: () => {
                        void (async () => {
                            await clearSellerId();
                            router.replace("/(auth)/login");
                        })();
                    },
                },
            ]);
        }
    };

    const salesData = salesCharts.salesChart ?? EMPTY_SALES_CHART;
    const ordersData = ordersCharts.ordersChart ?? EMPTY_ORDERS_CHART;
    const productsData = productsCharts.productsChart ?? EMPTY_PRODUCTS_CHART;

    const [greeting, setGreeting] = useState("Hello");
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good Morning");
        else if (hour < 18) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");
    }, []);

    const [fontsLoaded] = useFonts({
        Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
        Poppins_700Bold,
    });

    if (!fontsLoaded) return null;

    const activeLabel = MENU_CARDS.find(c => c.id === activeMenuCard)?.label ?? "Dashboard";
    const activeCardColor = MENU_CARDS.find(c => c.id === activeMenuCard)?.color ?? C.purple;

    const CARD_SUBTITLES: Record<string, string> = {
        dashboard: `${greeting}, ${displayName}`,
        products: "Manage your products",
        orders: "Track & manage orders",
        categories: "Browse product categories",
        colors: "Manage colour options",
        sizes: "Manage size options",
        support: "Help & support centre",
        logout: "See you soon!",
    };
    const activeSubtitle = CARD_SUBTITLES[activeMenuCard] ?? `${greeting}, ${displayName}`;

    return (
        <View style={s.root}>
            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} bounces={false}
                contentContainerStyle={{ paddingBottom: 100 }}>
                {/* ── PROFILE ── */}
                <View style={s.section}>
                    <View style={s.profileCard}>
                        <LinearGradient
                            colors={[C.navyDeep, "#2a3a8ae4"]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={s.profileGrad}
                        >
                            <View style={s.profileTop}>
                                <View style={s.avatarWrap}>
                                    <View style={s.avatarCircle}>
                                        {profile?.profilePicUrl ? (
                                            <Image
                                                source={{ uri: profile.profilePicUrl }}
                                                style={s.avatarImage}
                                            />
                                        ) : (
                                            <MaterialCommunityIcons name="account" size={44} color={C.purpleLight} />
                                        )}
                                    </View>
                                    <View style={s.avatarBadge}>
                                        <MaterialCommunityIcons name="store" size={12} color="#fff" />
                                    </View>
                                </View>
                                <View style={s.profileInfo}>
                                    <View style={s.profileNameRow}>
                                        <AppText style={s.profileName}>{displayName}</AppText>
                                        <View style={s.platinumBadge}>
                                            <MaterialCommunityIcons
                                                name={
                                                    profile?.accountStatus?.approvalState === "approved"
                                                        ? "check-decagram"
                                                        : profile?.accountStatus?.approvalState === "rejected"
                                                          ? "close-circle"
                                                          : "clock-outline"
                                                }
                                                size={12}
                                                color="#fff"
                                            />
                                            <AppText style={s.platinumText}>
                                                {profile?.accountStatus?.title ??
                                                    (profile?.profileCompleted ? "Verified" : "Pending")}
                                            </AppText>
                                        </View>
                                    </View>
                                    <View style={s.profileDetailRow}>
                                        <MaterialCommunityIcons name="store-outline" size={14} color="rgba(255,255,255,0.6)" />
                                        <AppText style={s.profileDetailText}>{storeLabel}</AppText>
                                    </View>
                                    <View style={s.profileDetailRow}>
                                        <MaterialCommunityIcons name="phone-outline" size={14} color="rgba(255,255,255,0.6)" />
                                        <AppText style={s.profileDetailText}>{mobileDisplay}</AppText>
                                    </View>
                                    <View style={s.profileDetailRow}>
                                        <MaterialCommunityIcons name="email-outline" size={14} color="rgba(255,255,255,0.6)" />
                                        <AppText style={s.profileDetailText}>{emailDisplay}</AppText>
                                    </View>
                                </View>
                                <View style={s.ratingBox}>
                                    <AppText style={s.ratingLabel}>Rating</AppText>
                                    <View style={s.ratingRow}>
                                        <AppText style={s.ratingVal}>{profileRating}</AppText>
                                        <Ionicons name="star" size={16} color={C.yellow} style={{ marginLeft: 3 }} />
                                    </View>
                                    <AppText style={s.ratingReviews}>
                                        ({profileReviewCount} {profileReviewCount === 1 ? "review" : "reviews"})
                                    </AppText>
                                    {averageRating > 0 ? (
                                        <View style={s.excellentBadge}>
                                            <AppText style={s.excellentText}>{ratingLabel}</AppText>
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                            <TouchableOpacity style={s.editProfileBtn} onPress={() => router.push("/(main)/Profile")}>
                                <Feather name="edit-2" size={14} color="#fff" />
                                <AppText style={s.editProfileText}>Edit Seller Profile</AppText>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                    <View style={s.accountStatusWrap}>
                        <AccountStatusBanner
                            accountStatus={profile?.accountStatus}
                            loading={profileLoading}
                            compact
                        />
                    </View>
                </View>

                 

                {/* ── REFERRAL ── */}
                <ReferralSection
                    referralCode=""
                    goal={6}
                    totalReferred={0}
                    qualified={0}
                />

                {/* ── TODAY'S OVERVIEW ── */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <AppText style={s.sectionTitle}>Today&apos;s Overview</AppText>
                        <TouchableOpacity style={s.viewAllBtn} onPress={() => setShowAllStats(true)}>
                            <AppText style={s.viewAllText}>View All Stats</AppText>
                            <Ionicons name="chevron-forward" size={15} color={C.purple} />
                        </TouchableOpacity>
                    </View>
                    <View style={s.overviewGrid}>
                        {overviewStatsView.map((st, i) => (
                            <View key={i} style={s.overviewCard}>
                                <View style={[s.overviewIconBox, { backgroundColor: st.color + "18" }]}>
                                    {st.iconLib === "mci"
                                        ? <MaterialCommunityIcons name={st.icon as any} size={26} color={st.color} />
                                        : <Feather name={st.icon as any} size={24} color={st.color} />}
                                </View>
                                <View style={s.overviewContent}>
                                    <AppText style={s.overviewVal}>{st.value}</AppText>
                                    <AppText style={s.overviewLabel}>{st.label}</AppText>
                                    <View style={s.overviewChange}>
                                        <Ionicons name="caret-up" size={12} color={C.green} />
                                        <AppText style={s.overviewChangeText}>{st.change}</AppText>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── ORDERS SUMMARY ── */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <AppText style={s.sectionTitle}>Orders Summary</AppText>
                        <TouchableOpacity style={s.viewAllBtn} onPress={() => setShowOrdersSummary(true)}>
                            <AppText style={s.viewAllText}>View All</AppText>
                            <Ionicons name="chevron-forward" size={15} color={C.purple} />
                        </TouchableOpacity>
                    </View>
                    <View style={s.orderRow}>
                        {orderSummaryView.map((o, i) => (
                            <View key={i} style={s.orderItem}>
                                <View style={[s.orderIconBox, { backgroundColor: o.color + "18" }]}>
                                    <MaterialCommunityIcons name={o.icon as any} size={23} color={o.color} />
                                </View>
                                <AppText style={[s.orderCount, { color: o.color }]}>{o.count}</AppText>
                                <AppText style={s.orderLabel}>{o.label}</AppText>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── QUICK ACTIONS ── */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <AppText style={s.sectionTitle}>Quick Actions</AppText>
                        {/* <View style={s.viewAllBtn}>
                            <AppText style={s.viewAllText}>View All</AppText>
                            <Ionicons name="chevron-forward" size={15} color={C.purple} />
                        </View> */}
                    </View>
                    <View style={s.qaGrid}>
                        {Array.from({ length: Math.ceil(QUICK_ACTIONS.length / 3) }).map((_, rowIndex) => (
                            <View key={rowIndex} style={s.qaRow}>
                                {QUICK_ACTIONS.slice(rowIndex * 3, rowIndex * 3 + 3).map((qa, colIndex) => (
                                    <TouchableOpacity 
                                        key={`${rowIndex}-${colIndex}`} 
                                        style={s.qaCard} 
                                        activeOpacity={0.75}
                                        onPress={() => {
                                            if (qa.label === "Products") router.push("/(main)/productmanagement");
                                            if (qa.label === "Payouts") router.push("/(main)/payoutrequest");
                                            if (qa.label === "Earnings") router.push("/(main)/earning");
                                            if (qa.label === "Reviews") router.push("/(main)/reviewsScreen");
                                            if (qa.label === "Orders") router.push("/(main)/Ordersscreen");
                                            if (qa.label === "Store Settings") router.push("/(main)/settingsModule");
                                            if (qa.label === "Support") router.push("/(main)/helpsupport");
                                        }}
                                    >
                                        <View style={[s.qaIconBox, { backgroundColor: qa.bgColor }]}>
                                            <MaterialCommunityIcons name={qa.icon as any} size={26} color={qa.iconColor} />
                                        </View>
                                        <AppText style={s.qaLabel}>{qa.label}</AppText>
                                        <AppText style={s.qaSub}>{qa.sub}</AppText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── SALES PERFORMANCE ── */}
                <View style={[s.section, { zIndex: 10 }]}>
                    <View style={s.fullCard}>
                        <View style={[s.halfCardHeader, { zIndex: 10 }]}>
                            <AppText style={s.halfCardTitle}>Sales Performance</AppText>
                            <PeriodDropdown selected={salesPeriod} onSelect={setSalesPeriod} />
                        </View>
                        <View style={s.salesMetaRow}>
                            <View style={s.salesMetaItem}>
                                <View style={s.salesMetaIconBox}><MaterialCommunityIcons name="shopping-outline" size={14} color={C.purple} /></View>
                                <AppText style={s.salesMetaLabel}>Total Sales</AppText>
                            </View>
                            <View style={s.salesMetaItem}>
                                <View style={s.salesMetaIconBox}><MaterialCommunityIcons name="clipboard-list-outline" size={14} color={C.purple} /></View>
                                <AppText style={s.salesMetaLabel}>Total Orders</AppText>
                            </View>
                        </View>
                        <View style={s.salesValRow}>
                            <View>
                                <AppText style={s.salesBigVal}>{salesData.totalSales}</AppText>
                                <View style={s.salesChange}>
                                    <Ionicons name="caret-up" size={12} color={C.green} />
                                    <AppText style={s.salesChangeText}>{salesData.salesChange}</AppText>
                                </View>
                            </View>
                            <View>
                                <AppText style={s.salesBigVal}>{salesData.totalOrders}</AppText>
                                <View style={s.salesChange}>
                                    <Ionicons name="caret-up" size={12} color={C.green} />
                                    <AppText style={s.salesChangeText}>{salesData.ordersChange}</AppText>
                                </View>
                            </View>
                        </View>
                        <View style={s.chartArea}>
                            <View style={s.chartYAxis}>
                                {["100K", "50K", "0"].map(l => <AppText key={l} style={s.chartAxisLabel}>{l}</AppText>)}
                            </View>
                            <View style={{ flex: 1 }}>
                                <MiniChart points={salesData.points} color={C.purple} />
                                <View style={s.chartXAxis}>
                                    {salesData.labels.map((l, i) => (
                                        <AppText key={`sales-x-${i}-${l}`} style={s.chartXLabel}>{l}</AppText>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── ORDERS GRAPH ── */}
                <View style={[s.section, { zIndex: 9 }]}>
                    <View style={s.fullCard}>
                        <View style={[s.halfCardHeader, { zIndex: 9 }]}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <View style={[s.graphTitleIcon, { backgroundColor: "#EFF6FF" }]}>
                                    <MaterialCommunityIcons name="clipboard-list-outline" size={16} color={C.blue} />
                                </View>
                                <AppText style={s.halfCardTitle}>Orders Graph</AppText>
                            </View>
                            <PeriodDropdown selected={ordersPeriod} onSelect={setOrdersPeriod} />
                        </View>
                        <View style={s.graphSummaryRow}>
                            <View style={s.graphSummaryItem}>
                                <AppText style={[s.graphSummaryVal, { color: C.blue }]}>{ordersData.total.toLocaleString()}</AppText>
                                <AppText style={s.graphSummaryLabel}>Total Orders</AppText>
                            </View>
                            <View style={s.graphDivider} />
                            <View style={s.graphSummaryItem}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                                    <Ionicons name="caret-up" size={13} color={C.green} />
                                    <AppText style={[s.graphSummaryVal, { color: C.green }]}>{ordersData.change}</AppText>
                                </View>
                                <AppText style={s.graphSummaryLabel}>vs last period</AppText>
                            </View>
                        </View>
                        <View style={s.chartArea}>
                            <View style={s.chartYAxis}>
                                {["Max", "Mid", "0"].map(l => <AppText key={l} style={s.chartAxisLabel}>{l}</AppText>)}
                            </View>
                            <View style={{ flex: 1 }}>
                                <BarChart points={ordersData.points} labels={ordersData.labels} color={C.blue} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── PRODUCTS LISTING GRAPH ── */}
                <View style={[s.section, { zIndex: 8 }]}>
                    <View style={s.fullCard}>
                        <View style={[s.halfCardHeader, { zIndex: 8 }]}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <View style={[s.graphTitleIcon, { backgroundColor: "#F0FDF4" }]}>
                                    <MaterialCommunityIcons name="shopping-outline" size={16} color={C.green} />
                                </View>
                                <AppText style={s.halfCardTitle}>Product Listings</AppText>
                            </View>
                            <PeriodDropdown selected={productsPeriod} onSelect={setProductsPeriod} />
                        </View>
                        <View style={s.graphSummaryRow}>
                            <View style={s.graphSummaryItem}>
                                <AppText style={[s.graphSummaryVal, { color: C.green }]}>{productsData.total.toLocaleString()}</AppText>
                                <AppText style={s.graphSummaryLabel}>Products Listed</AppText>
                            </View>
                            <View style={s.graphDivider} />
                            <View style={s.graphSummaryItem}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                                    <Ionicons name="caret-up" size={13} color={C.green} />
                                    <AppText style={[s.graphSummaryVal, { color: C.green }]}>{productsData.change}</AppText>
                                </View>
                                <AppText style={s.graphSummaryLabel}>new this period</AppText>
                            </View>
                        </View>
                        <View style={s.chartArea}>
                            <View style={s.chartYAxis}>
                                {["Max", "Mid", "0"].map(l => <AppText key={l} style={s.chartAxisLabel}>{l}</AppText>)}
                            </View>
                            <View style={{ flex: 1 }}>
                                <MiniChart points={productsData.points} color={C.green} />
                                <View style={s.chartXAxis}>
                                    {productsData.labels.map((l, i) => (
                                        <AppText key={`products-x-${i}-${l}`} style={s.chartXLabel}>{l}</AppText>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── TOP SELLING PRODUCTS ── */}
                <View style={s.section}>
                    <View style={s.fullCard}>
                        <View style={s.halfCardHeader}>
                            <AppText style={s.halfCardTitle}>Top Selling Products</AppText>
                            <TouchableOpacity onPress={() => setShowAllProducts(true)} style={s.viewAllBtn}>
                                <AppText style={s.viewAllText}>View All</AppText>
                                <Ionicons name="chevron-forward" size={15} color={C.purple} />
                            </TouchableOpacity>
                        </View>
                        {topProductsView.map((p, i) => (
                            <View key={i} style={s.topProductRow}>
                                <Image source={{ uri: p.image }} style={s.topProductThumb} resizeMode="cover" />
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <AppText style={s.topProductName} numberOfLines={1}>{p.name}</AppText>
                                    <AppText style={s.topProductCat}>{p.category}</AppText>
                                    <AppText style={s.topProductPrice}>{p.price}</AppText>
                                </View>
                                <View style={{ alignItems: "flex-end" }}>
                                    <AppText style={s.topProductSold}>{p.sold}</AppText>
                                    <AppText style={s.topProductSoldLabel}>Sold</AppText>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── SUPPORT ── */}
                <View style={s.section}>
                    <LinearGradient
                        colors={[C.navyDeep, "#1E2B6B"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={s.supportCard}
                    >
                        <View style={s.supportLeft}>
                            <View style={s.supportIconWrap}>
                                <MaterialCommunityIcons name="headset" size={28} color={C.purple} />
                            </View>
                            <View>
                                <AppText style={s.supportTitle}>Need Help?</AppText>
                                <AppText style={s.supportSub}>Our support team is here to assist you.</AppText>
                            </View>
                        </View>
                        <TouchableOpacity style={s.supportBtn} onPress={() => router.push("/(main)/helpsupport")}>
                            <AppText style={s.supportBtnText}>Contact</AppText>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>

            </ScrollView>

            {/* ── BOTTOM TAB BAR ── */}
            {Platform.OS !== 'web' && (
                <View style={s.tabBar}>
                    {[
                        { icon: "home-outline", iconActive: "home", label: "Home", active: true, color: "#2563EB", colorMuted: "#60A5FA", route: "/(main)/dashboard" },
                        { icon: "shopping-outline", iconActive: "shopping", label: "Products", active: false, color: "#7C3AED", colorMuted: "#A78BFA", route: "/(main)/productmanagement" },
                        { icon: "clipboard-list-outline", iconActive: "clipboard-list", label: "Orders", active: false, color: "#EA6000", colorMuted: "#FB923C", route: "/(main)/Ordersscreen", badge: (orderSummaryView?.find((o) => o.label === "Pending")?.count ?? 0) || undefined },
                        { icon: "account-outline", iconActive: "account", label: "Profile", active: false, color: "#10B981", colorMuted: "#34D399", route: "/(main)/Profile" },
                    ].map((tab, i) => (
                        <TouchableOpacity 
                            key={i} 
                            style={s.tabItem} 
                            activeOpacity={0.7}
                            onPress={() => {
                                if (!tab.active) router.push(tab.route as any);
                            }}
                        >
                            <View style={{ position: "relative" }}>
                                <MaterialCommunityIcons
                                    name={(tab.active ? tab.iconActive : tab.icon) as any}
                                    size={24}
                                    color={tab.active ? tab.color : tab.colorMuted}
                                />
                                {tab.badge && (
                                    <View style={s.tabBadge}>
                                        <AppText style={s.tabBadgeText}>{tab.badge}</AppText>
                                    </View>
                                )}
                            </View>
                            <AppText style={[s.tabLabel, { color: tab.active ? tab.color : tab.colorMuted }, tab.active && { fontFamily: fontFamilies.semiBold }]}>{tab.label}</AppText>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* ── SIDE DRAWER (rendered last so it overlays everything) ── */}
            <SideDrawer
                visible={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                profile={profile}
                rating={profileRating}
                pendingOrders={pendingOrdersCount}
            />

            <AllProductsModal visible={showAllProducts} onClose={() => setShowAllProducts(false)} />
            <OrdersSummaryModal
                visible={showOrdersSummary}
                onClose={() => setShowOrdersSummary(false)}
                totalProducts={totalProductsCount}
                totalOrders={totalOrders}
                orderSummary={orderSummaryView}
            />
            <AllStatsModal visible={showAllStats} onClose={() => setShowAllStats(false)} />
        </View>
    );
};

// ─── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    headerSticky: { zIndex: 20, elevation: 20 },
    accountStatusWrap: {
        paddingHorizontal: 0,
        paddingTop: 0,
    },
    navSafe: { backgroundColor: C.navyDeep, marginTop: 32 },
    navBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, height: 60, minHeight: 60 },
    navTitleContainer: { flex: 1, marginHorizontal: 12 },
    navGreeting: { fontFamily: fontFamilies.regular, fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: -2 },
    navName: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.white },
    navRight: { flexDirection: "row", gap: 4 },
    navIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", position: "relative" },
    notifBadge: { position: "absolute", top: 4, right: 4, backgroundColor: C.red, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: C.navyDeep, zIndex: 10, paddingHorizontal: 2 },
    notifBadgeText: { fontFamily: fontFamilies.bold, fontSize: 10, color: "#fff", lineHeight: 12 },
    scroll: { flex: 1 },
    bannerWrap: { marginHorizontal: 16, marginTop: 16, marginBottom: 14, borderRadius: 18, overflow: "hidden" },
    bannerGrad: { flexDirection: "row", minHeight: 180, borderRadius: 18, overflow: "hidden" },
    bannerOrb: { position: "absolute", borderRadius: 999, backgroundColor: C.purple },
    bannerTagWrap: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.13)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", borderRadius: 50, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
    bannerTagText: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: "rgba(255,255,255,0.9)" },
    bannerHeadline: { fontFamily: fontFamilies.bold, fontSize: 20, color: C.white, lineHeight: 27, marginBottom: 7 },
    bannerSub: { fontFamily: fontFamilies.regular, fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 14, lineHeight: 17 },
    bannerBtn: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50 },
    bannerBtnText: { fontFamily: fontFamilies.bold, fontSize: 13, color: C.navy },
    bannerIllus: { alignItems: "center", justifyContent: "center", paddingRight: 18 },
    section: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 0, marginBottom: 10 },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    sectionTitle: { fontFamily: fontFamilies.bold, fontSize: 17, color: C.textDark },
    viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
    viewAllText: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.purple },
    profileCard: { borderRadius: 16, overflow: "hidden" },
    profileGrad: { padding: 16 },
    profileTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
    avatarWrap: { position: "relative", marginRight: 12 },
    avatarCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", overflow: "hidden" },
    avatarImage: { width: 70, height: 70, borderRadius: 35 },
    avatarBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: C.purple, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.navyDeep },
    profileInfo: { flex: 1 },
    profileNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 6 },
    profileName: { fontFamily: fontFamilies.bold, fontSize: 17, color: "#fff" },
    platinumBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.purple, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50 },
    platinumText: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: "#fff" },
    profileDetailRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
    profileDetailText: { fontFamily: fontFamilies.regular, fontSize: 13, color: "rgba(255,255,255,0.75)" },
    ratingBox: { alignItems: "flex-end", minWidth: 72 },
    ratingLabel: { fontFamily: fontFamilies.regular, fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 },
    ratingRow: { flexDirection: "row", alignItems: "center" },
    ratingVal: { fontFamily: fontFamilies.bold, fontSize: 26, color: "#fff" },
    ratingReviews: { fontFamily: fontFamilies.regular, fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
    excellentBadge: { marginTop: 4, backgroundColor: C.green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50 },
    excellentText: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: "#fff" },
    editProfileBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingVertical: 10, gap: 8 },
    editProfileText: { fontFamily: fontFamilies.semiBold, fontSize: 15, color: "#fff" },
    overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    overviewCard: { width: (SW - 42) / 2, flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 14, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    overviewIconBox: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 10 },
    overviewContent: { flex: 1 },
    overviewVal: { fontFamily: fontFamilies.bold, fontSize: 17, color: C.textDark },
    overviewLabel: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, marginTop: 1 },
    overviewChange: { flexDirection: "row", alignItems: "center", marginTop: 3 },
    overviewChangeText: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.green, marginLeft: 2 },
    orderRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: C.card, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    orderItem: { alignItems: "center", flex: 1 },
    orderIconBox: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 5 },
    orderCount: { fontFamily: fontFamilies.bold, fontSize: 19 },
    orderLabel: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 2, textAlign: "center" },
    qaGrid: { flexDirection: "column", gap: 10 },
    qaRow: { flexDirection: "row", gap: 10 },
    qaCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 11, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    qaIconBox: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 7 },
    qaLabel: { fontFamily: fontFamilies.bold, fontSize: 12, color: C.textDark, marginBottom: 2 },
    qaSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, lineHeight: 14 },
    fullCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    halfCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    halfCardTitle: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark },
    graphTitleIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    graphSummaryRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderRadius: 10, padding: 10, marginBottom: 12 },
    graphSummaryItem: { flex: 1, alignItems: "center" },
    graphSummaryVal: { fontFamily: fontFamilies.bold, fontSize: 20 },
    graphSummaryLabel: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 2 },
    graphDivider: { width: 1, height: 32, backgroundColor: C.border, marginHorizontal: 8 },
    salesMetaRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
    salesMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    salesMetaIconBox: { width: 22, height: 22, borderRadius: 6, backgroundColor: C.purplePale, alignItems: "center", justifyContent: "center" },
    salesMetaLabel: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight },
    salesValRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
    salesBigVal: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.textDark },
    salesChange: { flexDirection: "row", alignItems: "center" },
    salesChangeText: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.green, marginLeft: 2 },
    chartArea: { flexDirection: "row", height: 85 },
    chartYAxis: { justifyContent: "space-between", marginRight: 5, paddingVertical: 2 },
    chartAxisLabel: { fontFamily: fontFamilies.regular, fontSize: 9, color: C.textLight },
    chartXAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
    chartXLabel: { fontFamily: fontFamilies.regular, fontSize: 8, color: C.textLight },
    topProductRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    topProductThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: C.purplePale },
    topProductName: { fontFamily: fontFamilies.bold, fontSize: 14, color: C.textDark },
    topProductCat: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 1 },
    topProductPrice: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.purple, marginTop: 2 },
    topProductSold: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.textDark },
    topProductSoldLabel: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight },
    taskRow: { flexDirection: "row", alignItems: "center", marginBottom: 13 },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, marginRight: 9, alignItems: "center", justifyContent: "center" },
    checkboxChecked: { backgroundColor: C.purple, borderColor: C.purple },
    taskLabel: { flex: 1, fontFamily: fontFamilies.regular, fontSize: 13, color: C.textMid, lineHeight: 17 },
    taskLabelDone: { textDecorationLine: "line-through", color: C.textLight },
    taskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50, borderWidth: 1, marginLeft: 5 },
    taskBadgeText: { fontFamily: fontFamilies.bold, fontSize: 12 },
    announcementCard: { marginTop: 8 },
    announcementIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: C.purplePale, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    announcementTitle: { fontFamily: fontFamilies.bold, fontSize: 14, color: C.textDark, marginBottom: 5, lineHeight: 18 },
    announcementDesc: { fontFamily: fontFamilies.regular, fontSize: 13, color: C.textLight, lineHeight: 17, marginBottom: 7 },
    announcementDate: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginBottom: 10 },
    annDots: { flexDirection: "row", gap: 5 },
    annDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.border },
    annDotActive: { backgroundColor: C.purple, width: 18 },
    supportCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, padding: 16, overflow: "hidden" },
    supportLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    supportIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(108,99,255,0.15)", alignItems: "center", justifyContent: "center" },
    supportTitle: { fontFamily: fontFamilies.bold, fontSize: 15, color: "#fff" },
    supportSub: { fontFamily: fontFamilies.regular, fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2, maxWidth: 130 },
    supportBtn: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: C.purpleLight, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50 },
    supportBtnText: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.purpleLight },
    tabBar: {
        flexDirection: "row",
        backgroundColor: C.white,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        height: Platform.OS === "ios" ? 84 : 64,
        paddingTop: 8,
        paddingBottom: Platform.OS === "ios" ? 24 : 8,
        justifyContent: "space-around",
        alignItems: "center",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    tabItem: { flex: 1, alignItems: "center", gap: 3 },
    tabLabel: { fontFamily: fontFamilies.medium, fontSize: 11, color: C.textLight },
    tabBadge: { position: "absolute", top: -4, right: -9, backgroundColor: C.orange, minWidth: 17, height: 17, borderRadius: 8.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
    tabBadgeText: { fontFamily: fontFamilies.bold, fontSize: 10, color: "#fff", lineHeight: 12 },

    menuCardsContainer: { 
        backgroundColor: "#E2EDF8", 
        paddingTop: 12, 
        paddingBottom: 0, 
        position: "relative", 
        height: 88,
        overflow: "visible",
    },
    menuCardsScroll: { 
        paddingHorizontal: 16, 
        alignItems: "flex-end", 
        paddingBottom: 2,
        overflow: "visible",
    },
    menuCardTab: { 
        width: 95, 
        alignItems: "center", 
        justifyContent: "center", 
        position: "relative",
        backgroundColor: "transparent",
    },
    menuCardTabActive: { 
        height: 72, 
        zIndex: 10, 
        marginBottom: -2,
    },
    menuCardTabInactive: { 
        height: 72, 
        zIndex: 1,
    },
    tabIconContainer: { 
        width: 32, 
        height: 32, 
        borderRadius: 16, 
        justifyContent: "center", 
        alignItems: "center", 
        marginBottom: 2,
        marginTop: 4,
    },
    tabBorderBottomLine: { 
        position: "absolute", 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: 2, 
        backgroundColor: "#0F3A85", 
        zIndex: 0, 
    },
    menuCardBadge: { 
        position: "absolute", 
        top: 4, 
        right: 4, 
        backgroundColor: C.orange, 
        minWidth: 16, 
        height: 16, 
        borderRadius: 8, 
        alignItems: "center", 
        justifyContent: "center", 
        borderWidth: 1, 
        borderColor: C.white, 
        zIndex: 15,
        paddingHorizontal: 2,
    },
    menuCardBadgeText: { 
        fontFamily: fontFamilies.bold, 
        fontSize: 8, 
        color: "#fff",
        lineHeight: 10,
    },
    menuCardLabel: { 
        fontFamily: fontFamilies.medium, 
        fontSize: 10, 
        color: "#4E6C99", 
        textAlign: "center",
        marginBottom: 0,
        paddingHorizontal: 2,
    },
    menuCardLabelActive: { 
        color: "#0F3A85", 
        fontFamily: fontFamilies.bold,
        marginBottom: 0,
    },
});

const SellerDashboard: React.FC = () => {
  const { summary, loading } = useSellerProfileSummary();

  const desktopProps: DesktopDashboardProps = {
    profile: summary,
    profileLoading: loading,
  };

  if (Platform.OS === "web") {
    return <DesktopDashboard {...desktopProps} />;
  }
  return <MobileDashboard profile={summary} profileLoading={loading} />;
};

export default SellerDashboard;