import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Platform,
    StatusBar,
    SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    useFonts,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { useResponsive } from "@/hooks/useResponsive";
import { AddCatalogModal } from "./AddCatalogModal";
import type { CatalogPageConfig, CatalogStatus, ColorRecord, SizeRecord } from "./catalogConfig";
import {
    ORANGE_BRAND,
    INITIAL_COLORS,
    INITIAL_SIZES,
} from "./catalogConfig";

type CatalogAttributeScreenProps = {
    config: CatalogPageConfig;
    initialColors?: ColorRecord[];
    initialSizes?: SizeRecord[];
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function CatalogAttributeScreen({
    config,
    initialColors = INITIAL_COLORS,
    initialSizes = INITIAL_SIZES,
}: CatalogAttributeScreenProps) {
    const router = useRouter();
    const { isWeb, isDesktop } = useResponsive();
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [colors, setColors] = useState<ColorRecord[]>(initialColors);
    const [sizes, setSizes] = useState<SizeRecord[]>(initialSizes);

    const [fontsLoaded] = useFonts({
        Outfit_400Regular,
        Outfit_500Medium,
        Outfit_600SemiBold,
        Outfit_700Bold,
    });

    const items = config.kind === "color" ? colors : sizes;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        if (config.kind === "color") {
            return (items as ColorRecord[]).filter(
                (c) => c.name.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q)
            );
        }
        return (items as SizeRecord[]).filter(
            (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
        );
    }, [items, search, config.kind]);

    const activeCount = items.filter((i) => i.status === "Active").length;

    const handleSaveColor = (payload: { name: string; hex: string; status: CatalogStatus }) => {
        setColors((prev) => [
            {
                id: genId(),
                name: payload.name,
                hex: payload.hex,
                status: payload.status,
                createdAt: new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                }),
            },
            ...prev,
        ]);
    };

    const handleSaveSize = (payload: { name: string; code: string; status: CatalogStatus }) => {
        setSizes((prev) => [
            {
                id: genId(),
                name: payload.name,
                code: payload.code,
                status: payload.status,
                createdAt: new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                }),
            },
            ...prev,
        ]);
    };

    if (!fontsLoaded) return null;

    const pageBody = (
        <View style={[pg.wrap, isWeb && pg.wrapWeb]}>
            <View style={pg.pageHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={pg.pageTitle}>{config.pageTitle}</Text>
                    <Text style={pg.pageSub}>{config.pageSubtitle}</Text>
                </View>
                <TouchableOpacity style={pg.addBtn} onPress={() => setModalOpen(true)} activeOpacity={0.85}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={pg.addBtnTxt}>Add New {config.kind === "color" ? "Color" : "Size"}</Text>
                </TouchableOpacity>
            </View>

            <View style={pg.statsRow}>
                <View style={pg.statCard}>
                    <Text style={pg.statVal}>{items.length}</Text>
                    <Text style={pg.statLbl}>Total {config.pageTitle}</Text>
                </View>
                <View style={pg.statCard}>
                    <Text style={[pg.statVal, { color: "#16A34A" }]}>{activeCount}</Text>
                    <Text style={pg.statLbl}>Active</Text>
                </View>
                <View style={pg.statCard}>
                    <Text style={[pg.statVal, { color: "#DC2626" }]}>{items.length - activeCount}</Text>
                    <Text style={pg.statLbl}>Inactive</Text>
                </View>
            </View>

            <View style={pg.searchRow}>
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                    style={pg.searchInput}
                    placeholder={`Search ${config.pageTitle.toLowerCase()}…`}
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <View style={pg.tableCard}>
                <View style={pg.tableHead}>
                    {config.kind === "color" ? (
                        <>
                            <Text style={[pg.th, pg.colColor]}>Color</Text>
                            <Text style={[pg.th, pg.colName]}>Name</Text>
                            <Text style={[pg.th, pg.colHex]}>Hex Code</Text>
                        </>
                    ) : (
                        <>
                            <Text style={[pg.th, pg.colName]}>Size Name</Text>
                            <Text style={[pg.th, pg.colCode]}>Code</Text>
                        </>
                    )}
                    <Text style={[pg.th, pg.colStatus]}>Status</Text>
                    <Text style={[pg.th, pg.colDate]}>Added</Text>
                </View>

                {filtered.length === 0 ? (
                    <View style={pg.empty}>
                        <MaterialCommunityIcons
                            name={config.kind === "color" ? "palette-outline" : "ruler-square"}
                            size={40}
                            color="#D1D5DB"
                        />
                        <Text style={pg.emptyTitle}>No {config.pageTitle.toLowerCase()} found</Text>
                        <Text style={pg.emptySub}>Add a new {config.entityLabel} to get started.</Text>
                    </View>
                ) : (
                    filtered.map((row, idx) => {
                        const isActive = row.status === "Active";
                        if (config.kind === "color") {
                            const c = row as ColorRecord;
                            return (
                                <View key={c.id} style={[pg.tr, idx % 2 === 1 && pg.trAlt]}>
                                    <View style={pg.colColor}>
                                        <View style={[pg.colorDot, { backgroundColor: c.hex }]} />
                                    </View>
                                    <Text style={[pg.td, pg.colName]} numberOfLines={1}>
                                        {c.name}
                                    </Text>
                                    <Text style={[pg.tdMono, pg.colHex]}>{c.hex}</Text>
                                    <View style={pg.colStatus}>
                                        <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff]}>
                                            <Text style={[pg.badgeTxt, isActive ? pg.badgeTxtOn : pg.badgeTxtOff]}>
                                                {c.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[pg.tdLight, pg.colDate]}>{c.createdAt}</Text>
                                </View>
                            );
                        }
                        const s = row as SizeRecord;
                        return (
                            <View key={s.id} style={[pg.tr, idx % 2 === 1 && pg.trAlt]}>
                                <Text style={[pg.td, pg.colName]} numberOfLines={1}>
                                    {s.name}
                                </Text>
                                <Text style={[pg.tdMono, pg.colCode]}>{s.code}</Text>
                                <View style={pg.colStatus}>
                                    <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff]}>
                                        <Text style={[pg.badgeTxt, isActive ? pg.badgeTxtOn : pg.badgeTxtOff]}>
                                            {s.status}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[pg.tdLight, pg.colDate]}>{s.createdAt}</Text>
                            </View>
                        );
                    })
                )}
            </View>

            <View style={pg.noteBox}>
                <MaterialCommunityIcons name="information-outline" size={18} color="#B45309" />
                <Text style={pg.noteTxt}>
                    {config.pageTitle} are permanent after creation. Plan names carefully before saving.
                </Text>
            </View>

            <AddCatalogModal
                visible={modalOpen}
                config={config}
                onClose={() => setModalOpen(false)}
                onSaveColor={handleSaveColor}
                onSaveSize={handleSaveSize}
            />
        </View>
    );

    if (isWeb) {
        return <ScrollView showsVerticalScrollIndicator={isDesktop}>{pageBody}</ScrollView>;
    }

    return (
        <View style={pg.mobileRoot}>
            <StatusBar barStyle="light-content" backgroundColor="#151D4F" />
            <SafeAreaView style={{ backgroundColor: "#151D4F", marginTop: 32 }}>
                <View style={pg.mobileHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={pg.headerLogoBtn} activeOpacity={0.8}>
                        <View style={pg.headerLogoCircle}>
                            <Image
                                source={require("../../assets/images/fav.png")}
                                style={{ width: 22, height: 22 }}
                                resizeMode="contain"
                            />
                        </View>
                    </TouchableOpacity>
                    <View style={pg.headerTitleBlock}>
                        <Text style={pg.mobileHeaderTitle} numberOfLines={1}>{config.pageTitle}</Text>
                        <Text style={pg.mobileHeaderSub} numberOfLines={1}>
                            {config.kind === "color" ? "Manage colour options" : "Manage size options"}
                        </Text>
                    </View>
                    <View style={pg.headerActions}>
                        <TouchableOpacity style={pg.headerIconBtn} onPress={() => router.push("/(main)/notifications")}>
                            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={pg.headerIconBtn} onPress={() => router.push("/(main)/settingsModule")}>
                            <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
            <ScrollView contentContainerStyle={pg.mobileScroll} showsVerticalScrollIndicator={false}>
                {pageBody}
            </ScrollView>
        </View>
    );
}

const pg = StyleSheet.create({
    mobileRoot: { flex: 1, backgroundColor: "#F7F8FC" },
    mobileHeader: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#151D4F",
        paddingHorizontal: 12,
        paddingVertical: 10,
        height: 60,
    },
    headerLogoBtn: {},
    headerLogoCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitleBlock: {
        flex: 1,
        marginHorizontal: 12,
    },
    mobileHeaderTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 16,
        color: "#FFFFFF",
    },
    mobileHeaderSub: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "rgba(255,255,255,0.7)",
    },
    headerActions: {
        flexDirection: "row",
        gap: 4,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.12)",
        alignItems: "center",
        justifyContent: "center",
    },
    backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    mobileScroll: { paddingBottom: 32 },
    wrap: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 24 },
    wrapWeb: { paddingHorizontal: 0, paddingTop: 0, maxWidth: 1100, width: "100%", alignSelf: "center" },
    pageHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap",
    },
    pageTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 26,
        color: "#111827",
        marginBottom: 6,
    },
    pageSub: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 19,
        maxWidth: 520,
    },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: ORANGE_BRAND,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
    },
    addBtnTxt: {
        fontFamily: "Outfit_700Bold",
        fontSize: 14,
        color: "#FFFFFF",
    },
    statsRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
        flexWrap: "wrap",
    },
    statCard: {
        flex: 1,
        minWidth: 120,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    statVal: {
        fontFamily: "Outfit_700Bold",
        fontSize: 22,
        color: "#111827",
    },
    statLbl: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: "#111827",
        paddingVertical: 12,
    },
    tableCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
        marginBottom: 16,
    },
    tableHead: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    th: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
        color: "#6B7280",
    },
    tr: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    trAlt: { backgroundColor: "#FAFBFC" },
    td: {
        fontFamily: "Outfit_500Medium",
        fontSize: 14,
        color: "#111827",
    },
    tdMono: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: "#374151",
    },
    tdLight: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#9CA3AF",
    },
    colColor: { width: 56 },
    colName: { flex: 2, minWidth: 100, paddingRight: 8 },
    colHex: { width: 90 },
    colCode: { width: 72 },
    colStatus: { width: 88 },
    colDate: { width: 100, textAlign: "right" as const },
    colorDot: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.1)",
    },
    badge: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeOn: { backgroundColor: "#DCFCE7" },
    badgeOff: { backgroundColor: "#FEE2E2" },
    badgeTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
    badgeTxtOn: { color: "#16A34A" },
    badgeTxtOff: { color: "#DC2626" },
    empty: {
        alignItems: "center",
        paddingVertical: 40,
        paddingHorizontal: 20,
        gap: 6,
    },
    emptyTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 15,
        color: "#374151",
        marginTop: 8,
    },
    emptySub: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#9CA3AF",
        textAlign: "center",
    },
    noteBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: "#FFFBEB",
        borderWidth: 1,
        borderColor: "#FDE68A",
        borderRadius: 10,
        padding: 14,
    },
    noteTxt: {
        flex: 1,
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#92400E",
        lineHeight: 18,
    },
});
