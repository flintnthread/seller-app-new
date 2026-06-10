import React, { useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import {
    NAV_SUBTITLES,
    SELLER_NAV_ITEMS,
    resolveActiveNavId,
} from "@/lib/navigation/sellerNavConfig";
import { useSellerProfileSummary } from "@/hooks/useSellerProfileSummary";

const C = {
    navyDeep: "#151D4F",
    white: "#FFFFFF",
    border: "#E5E7EB",
};

function TabShape({ isActive }: { isActive: boolean }) {
    return (
        <Svg
            width="100%"
            height="100%"
            viewBox="0 0 90 80"
            preserveAspectRatio="none"
            style={StyleSheet.absoluteFillObject}
        >
            <Path
                d="M 0 80 C 6 80, 8 78, 10 70 L 20 15 C 22 5, 27 1.5, 35 1.5 L 55 1.5 C 63 1.5, 68 5, 70 15 L 80 70 C 82 78, 84 80, 90 80"
                fill={isActive ? C.white : "rgba(255, 255, 255, 0.45)"}
                stroke={isActive ? "#0F3A85" : "rgba(15, 58, 133, 0.12)"}
                strokeWidth={isActive ? 2 : 1.5}
                vectorEffect="non-scaling-stroke"
            />
        </Svg>
    );
}

type Props = {
    /** Compact mode for web — nav tabs only, no title bar. */
    compact?: boolean;
};

export function SellerTopNav({ compact = false }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const activeId = resolveActiveNavId(pathname);
    const activeItem = SELLER_NAV_ITEMS.find((i) => i.id === activeId) ?? SELLER_NAV_ITEMS[0];
    const { summary, loading: profileLoading } = useSellerProfileSummary();

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    }, []);

    const subtitle = useMemo(() => {
        if (activeId === "dashboard") {
            const name =
                summary?.firstName ||
                summary?.fullName?.split(" ")[0] ||
                (profileLoading ? "…" : "Seller");
            return `${greeting}, ${name}`;
        }
        return NAV_SUBTITLES[activeId] ?? greeting;
    }, [activeId, greeting, summary, profileLoading]);

    const navTabs = (
        <View style={s.menuCardsContainer}>
            <View style={s.tabBorderBottomLine} />
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.menuCardsScroll}
                style={{ overflow: "visible", zIndex: 1 }}
            >
                {SELLER_NAV_ITEMS.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={[s.menuCardTab, isActive ? s.menuCardTabActive : s.menuCardTabInactive]}
                            onPress={() => router.push(item.route as any)}
                            activeOpacity={isActive ? 0.9 : 0.85}
                        >
                            <TabShape isActive={isActive} />
                            <View
                                style={[
                                    s.tabIconContainer,
                                    { backgroundColor: isActive ? item.color + "1A" : "rgba(255,255,255,0.7)" },
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={item.icon as any}
                                    size={isActive ? 18 : 16}
                                    color={isActive ? item.color : item.color + "CC"}
                                />
                            </View>
                            <Text
                                style={[s.menuCardLabel, isActive && s.menuCardLabelActive]}
                                numberOfLines={1}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );

    if (compact) {
        return <View style={s.compactWrap}>{navTabs}</View>;
    }

    return (
        <View style={s.wrap}>
            <SafeAreaView style={s.navSafe} edges={["top"]}>
                <View style={s.navBar}>
                    <View style={[s.navIconBtn, s.logoCircle]}>
                        <Image
                            source={require("../../assets/images/fav.png")}
                            style={s.logoImg}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={s.navTitleContainer}>
                        <Text style={s.navName} numberOfLines={1}>
                            {activeItem?.label ?? "Dashboard"}
                        </Text>
                        <Text style={s.navGreeting} numberOfLines={1}>
                            {subtitle}
                        </Text>
                    </View>
                    <View style={s.navRight}>
                        <TouchableOpacity
                            style={s.navIconBtn}
                            onPress={() => router.push("/(main)/notifications")}
                        >
                            <Ionicons name="notifications-outline" size={22} color={C.white} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={s.navIconBtn}
                            onPress={() => router.push("/(main)/settingsModule")}
                        >
                            <Ionicons name="settings-outline" size={22} color={C.white} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
            {navTabs}
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { zIndex: 20, elevation: 20, backgroundColor: C.navyDeep },
    compactWrap: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
    navSafe: {
        backgroundColor: C.navyDeep,
        ...Platform.select({ android: { paddingTop: 4 }, default: {} }),
    },
    navBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 64,
    },
    navIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.12)",
        alignItems: "center",
        justifyContent: "center",
    },
    logoCircle: { backgroundColor: C.white, width: 36, height: 36, borderRadius: 18 },
    logoImg: { width: 24, height: 24 },
    navTitleContainer: { flex: 1, marginHorizontal: 12 },
    navName: { fontFamily: "Poppins_700Bold", fontSize: 16, color: C.white },
    navGreeting: { fontFamily: "Poppins_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)" },
    navRight: { flexDirection: "row", gap: 8 },
    menuCardsContainer: { backgroundColor: "#F7F8FC", paddingTop: 4, position: "relative" },
    tabBorderBottomLine: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: C.border,
        zIndex: 0,
    },
    menuCardsScroll: { paddingHorizontal: 10, paddingBottom: 6, gap: 4, alignItems: "flex-end" },
    menuCardTab: {
        width: 82,
        height: 72,
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 6,
        marginHorizontal: 2,
        position: "relative",
    },
    menuCardTabActive: { zIndex: 2 },
    menuCardTabInactive: { zIndex: 1, opacity: 0.92 },
    tabIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
        zIndex: 1,
    },
    menuCardLabel: {
        fontFamily: "Poppins_500Medium",
        fontSize: 9.5,
        color: "#64748b",
        zIndex: 1,
        textAlign: "center",
    },
    menuCardLabelActive: { fontFamily: "Poppins_700Bold", color: "#0F3A85" },
});
