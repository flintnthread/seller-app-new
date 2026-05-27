import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    StatusBar,
    SafeAreaView,
    ActivityIndicator,
} from "react-native";
import { useSweetAlert } from "@/components/common/SweetAlert";
import { AppHeader } from "@/components/common/AppHeader";
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
    isOwnedCatalogItem,
} from "./catalogConfig";
import {
    createColor,
    deleteColor,
    fetchColors,
    updateColor,
} from "@/services/colorApi";
import {
    createSize,
    deleteSize,
    fetchSizes,
    updateSize,
} from "@/services/sizeApi";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import { getApiDebugInfo } from "@/lib/api/config";

type CatalogAttributeScreenProps = {
    config: CatalogPageConfig;
    initialColors?: ColorRecord[];
    initialSizes?: SizeRecord[];
};

export function CatalogAttributeScreen({
    config,
    initialColors = INITIAL_COLORS,
    initialSizes = INITIAL_SIZES,
}: CatalogAttributeScreenProps) {
    const router = useRouter();
    const { isWeb, isDesktop, isMobile, width } = useResponsive();
    const { showSuccess, showError, showInfo, confirmDelete, SweetAlertHost } = useSweetAlert();
    const useCatalogCards = !isWeb || isMobile;
    const tableMinWidth = Math.max(640, Math.min(900, width - 24));
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSize, setEditingSize] = useState<SizeRecord | null>(null);
    const [editingColor, setEditingColor] = useState<ColorRecord | null>(null);
    const [colors, setColors] = useState<ColorRecord[]>(initialColors);
    const [sizes, setSizes] = useState<SizeRecord[]>(initialSizes);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [catalogSaving, setCatalogSaving] = useState(false);

    const loadCatalog = useCallback(async () => {
        await hydrateSellerSession();
        if (!ensureSellerId()) {
            setCatalogError("Seller not logged in. Please log in again.");
            setCatalogLoading(false);
            return;
        }
        setCatalogLoading(true);
        setCatalogError(null);
        try {
            if (config.kind === "size") {
                setSizes(await fetchSizes());
            } else {
                setColors(await fetchColors());
            }
        } catch (e) {
            const label = config.kind === "size" ? "sizes" : "colors";
            const msg = e instanceof Error ? e.message : `Failed to load ${label}.`;
            if (__DEV__) {
                const { baseUrl, platform, isEmulator } = getApiDebugInfo();
                setCatalogError(`${msg}\n\n[dev] API: ${baseUrl} (${platform}${isEmulator ? ", emulator" : ""})`);
            } else {
                setCatalogError(msg);
            }
        } finally {
            setCatalogLoading(false);
        }
    }, [config.kind]);

    useEffect(() => {
        loadCatalog();
    }, [loadCatalog]);

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

    const handleSaveColor = async (payload: { name: string; hex: string; status: CatalogStatus }) => {
        setCatalogSaving(true);
        try {
            const created = await createColor(payload);
            setColors((prev) => [created, ...prev]);
            return true;
        } catch (e) {
            showError(e instanceof Error ? e.message : "Could not save color.");
            return false;
        } finally {
            setCatalogSaving(false);
        }
    };

    const handleUpdateColor = async (
        id: string,
        payload: { name: string; hex: string; status: CatalogStatus }
    ) => {
        setCatalogSaving(true);
        try {
            const updated = await updateColor(id, payload);
            setColors((prev) => prev.map((c) => (c.id === id ? updated : c)));
            return true;
        } catch (e) {
            showError(e instanceof Error ? e.message : "Could not update color.");
            return false;
        } finally {
            setCatalogSaving(false);
        }
    };

    const openAddModal = () => {
        setEditingSize(null);
        setEditingColor(null);
        setModalOpen(true);
    };

    const openEditSizeModal = (size: SizeRecord) => {
        if (!isOwnedCatalogItem(size)) {
            void showInfo(
                "View only",
                "This size is from the shared catalog. You can only edit sizes you added."
            );
            return;
        }
        setEditingColor(null);
        setEditingSize(size);
        setModalOpen(true);
    };

    const openEditColorModal = (color: ColorRecord) => {
        if (!isOwnedCatalogItem(color)) {
            void showInfo(
                "View only",
                "This color is from the shared catalog. You can only edit colors you added."
            );
            return;
        }
        setEditingSize(null);
        setEditingColor(color);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingSize(null);
        setEditingColor(null);
    };

    const handleSaveSize = async (payload: { name: string; code: string; status: CatalogStatus }) => {
        setCatalogSaving(true);
        try {
            const created = await createSize(payload);
            setSizes((prev) => [created, ...prev]);
            return true;
        } catch (e) {
            showError(e instanceof Error ? e.message : "Could not save size.");
            return false;
        } finally {
            setCatalogSaving(false);
        }
    };

    const handleUpdateSize = async (
        id: string,
        payload: { name: string; code: string; status: CatalogStatus }
    ) => {
        setCatalogSaving(true);
        try {
            const updated = await updateSize(id, payload);
            setSizes((prev) => prev.map((s) => (s.id === id ? updated : s)));
            return true;
        } catch (e) {
            showError(e instanceof Error ? e.message : "Could not update size.");
            return false;
        } finally {
            setCatalogSaving(false);
        }
    };

    const handleDeleteColor = async (color: ColorRecord) => {
        if (!isOwnedCatalogItem(color)) {
            void showInfo(
                "View only",
                "This color is from the shared catalog. You can only delete colors you added."
            );
            return;
        }

        const confirmed = await confirmDelete(
            "Delete color?",
            `Remove "${color.name}" (${color.hex})? This cannot be undone.`
        );
        if (!confirmed) return;

        setCatalogSaving(true);
        try {
            await deleteColor(color.id);
            setColors((prev) => prev.filter((c) => c.id !== color.id));
            showSuccess("Your color has been deleted successfully.");
        } catch (e) {
            showError(e instanceof Error ? e.message : "Could not delete color.");
        } finally {
            setCatalogSaving(false);
        }
    };

    const handleDeleteSize = async (size: SizeRecord) => {
        if (!isOwnedCatalogItem(size)) {
            void showInfo(
                "View only",
                "This size is from the shared catalog. You can only delete sizes you added."
            );
            return;
        }

        const confirmed = await confirmDelete(
            "Delete size?",
            `Remove "${size.name}" (${size.code})? This cannot be undone.`
        );
        if (!confirmed) return;

        setCatalogSaving(true);
        try {
            await deleteSize(size.id);
            setSizes((prev) => prev.filter((s) => s.id !== size.id));
            showSuccess("Your size has been deleted successfully.");
        } catch (e) {
            showError(e instanceof Error ? e.message : "Could not delete size.");
        } finally {
            setCatalogSaving(false);
        }
    };

    if (!fontsLoaded) return null;

    const pageBody = (
        <View style={[pg.wrap, isWeb && pg.wrapWeb]}>
            <View style={pg.pageHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={pg.pageTitle}>{config.pageTitle}</Text>
                    <Text style={pg.pageSub}>{config.pageSubtitle}</Text>
                </View>
                <TouchableOpacity style={pg.addBtn} onPress={openAddModal} activeOpacity={0.85}>
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

            {useCatalogCards && (
                <View style={pg.mobileList}>
                    {catalogLoading ? (
                        <View style={pg.empty}>
                            <ActivityIndicator size="large" color={ORANGE_BRAND} />
                            <Text style={pg.emptySub}>Loading {config.pageTitle.toLowerCase()}…</Text>
                        </View>
                    ) : catalogError ? (
                        <View style={pg.empty}>
                            <Text style={pg.emptyTitle}>Could not load {config.pageTitle.toLowerCase()}</Text>
                            <Text style={pg.emptySub}>{catalogError}</Text>
                            <TouchableOpacity style={pg.retryBtn} onPress={loadCatalog}>
                                <Text style={pg.retryBtnTxt}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={pg.empty}>
                            <MaterialCommunityIcons
                                name={config.kind === "color" ? "palette-outline" : "ruler-square"}
                                size={40}
                                color="#D1D5DB"
                            />
                            <Text style={pg.emptyTitle}>No {config.pageTitle.toLowerCase()} found</Text>
                            <Text style={pg.emptySub}>Add a new {config.entityLabel} to get started.</Text>
                        </View>
                    ) : config.kind === "color" ? (
                        (filtered as ColorRecord[]).map((c) => {
                            const isActive = c.status === "Active";
                            return (
                                <View key={c.id} style={pg.sizeCard}>
                                    <View style={pg.sizeCardTop}>
                                        <View style={[pg.colorDot, { backgroundColor: c.hex }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={pg.sizeCardTitle} numberOfLines={2}>
                                                {c.name}
                                            </Text>
                                            <Text style={pg.sizeCardMeta}>{c.hex}</Text>
                                        </View>
                                        <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff]}>
                                            <Text
                                                style={[
                                                    pg.badgeTxt,
                                                    isActive ? pg.badgeTxtOn : pg.badgeTxtOff,
                                                ]}
                                            >
                                                {c.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={pg.sizeCardMeta}>Added: {c.createdAt}</Text>
                                    {isOwnedCatalogItem(c) ? (
                                        <View style={pg.sizeCardActions}>
                                            <TouchableOpacity
                                                style={pg.sizeEditBtn}
                                                onPress={() => openEditColorModal(c)}
                                                activeOpacity={0.85}
                                            >
                                                <MaterialCommunityIcons
                                                    name="pencil-outline"
                                                    size={18}
                                                    color="#FFFFFF"
                                                />
                                                <Text style={pg.sizeActionTxt}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={pg.sizeDeleteBtn}
                                                onPress={() => handleDeleteColor(c)}
                                                activeOpacity={0.85}
                                            >
                                                <MaterialCommunityIcons
                                                    name="trash-can-outline"
                                                    size={18}
                                                    color="#FFFFFF"
                                                />
                                                <Text style={pg.sizeActionTxt}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <Text style={pg.sharedHint}>Shared catalog — view only</Text>
                                    )}
                                </View>
                            );
                        })
                    ) : (
                        (filtered as SizeRecord[]).map((s) => {
                            const isActive = s.status === "Active";
                            return (
                                <View key={s.id} style={pg.sizeCard}>
                                    <View style={pg.sizeCardTop}>
                                        <Text style={pg.sizeCardTitle} numberOfLines={2}>
                                            {s.name}
                                        </Text>
                                        <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff]}>
                                            <Text
                                                style={[
                                                    pg.badgeTxt,
                                                    isActive ? pg.badgeTxtOn : pg.badgeTxtOff,
                                                ]}
                                            >
                                                {s.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={pg.sizeCardMeta}>Code: {s.code}</Text>
                                    <Text style={pg.sizeCardMeta}>Added: {s.createdAt}</Text>
                                    {isOwnedCatalogItem(s) ? (
                                        <View style={pg.sizeCardActions}>
                                            <TouchableOpacity
                                                style={pg.sizeEditBtn}
                                                onPress={() => openEditSizeModal(s)}
                                                activeOpacity={0.85}
                                            >
                                                <MaterialCommunityIcons
                                                    name="pencil-outline"
                                                    size={18}
                                                    color="#FFFFFF"
                                                />
                                                <Text style={pg.sizeActionTxt}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={pg.sizeDeleteBtn}
                                                onPress={() => handleDeleteSize(s)}
                                                activeOpacity={0.85}
                                            >
                                                <MaterialCommunityIcons
                                                    name="trash-can-outline"
                                                    size={18}
                                                    color="#FFFFFF"
                                                />
                                                <Text style={pg.sizeActionTxt}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <Text style={pg.sharedHint}>Shared catalog — view only</Text>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>
            )}

            {!useCatalogCards && (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={isDesktop}
                style={pg.tableScroll}
                contentContainerStyle={pg.tableScrollInner}
            >
            <View style={[pg.tableCard, { minWidth: tableMinWidth }]}>
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
                    <Text style={[pg.th, pg.colActionsHead]}>Actions</Text>
                </View>

                {catalogLoading ? (
                    <View style={pg.empty}>
                        <ActivityIndicator size="large" color={ORANGE_BRAND} />
                        <Text style={pg.emptySub}>Loading {config.pageTitle.toLowerCase()}…</Text>
                    </View>
                ) : catalogError ? (
                    <View style={pg.empty}>
                        <Text style={pg.emptyTitle}>Could not load {config.pageTitle.toLowerCase()}</Text>
                        <Text style={pg.emptySub}>{catalogError}</Text>
                        <TouchableOpacity style={pg.retryBtn} onPress={loadCatalog}>
                            <Text style={pg.retryBtnTxt}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : filtered.length === 0 ? (
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
                                    <View style={pg.colActions}>
                                        {isOwnedCatalogItem(c) ? (
                                            <>
                                                <TouchableOpacity
                                                    onPress={() => openEditColorModal(c)}
                                                    style={pg.webActionEdit}
                                                    activeOpacity={0.85}
                                                >
                                                    <MaterialCommunityIcons
                                                        name="pencil-outline"
                                                        size={16}
                                                        color="#FFFFFF"
                                                    />
                                                    <Text style={pg.webActionTxt}>Edit</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteColor(c)}
                                                    style={pg.webActionDelete}
                                                    activeOpacity={0.85}
                                                >
                                                    <MaterialCommunityIcons
                                                        name="trash-can-outline"
                                                        size={16}
                                                        color="#FFFFFF"
                                                    />
                                                    <Text style={pg.webActionTxt}>Delete</Text>
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <Text style={pg.viewOnlyTxt}>View only</Text>
                                        )}
                                    </View>
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
                                <View style={pg.colActions}>
                                    {isOwnedCatalogItem(s) ? (
                                        <>
                                            <TouchableOpacity
                                                onPress={() => openEditSizeModal(s)}
                                                style={pg.webActionEdit}
                                                activeOpacity={0.85}
                                            >
                                                <MaterialCommunityIcons
                                                    name="pencil-outline"
                                                    size={16}
                                                    color="#FFFFFF"
                                                />
                                                <Text style={pg.webActionTxt}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteSize(s)}
                                                style={pg.webActionDelete}
                                                activeOpacity={0.85}
                                            >
                                                <MaterialCommunityIcons
                                                    name="trash-can-outline"
                                                    size={16}
                                                    color="#FFFFFF"
                                                />
                                                <Text style={pg.webActionTxt}>Delete</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <Text style={pg.viewOnlyTxt}>View only</Text>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
            </ScrollView>
            )}

            <AddCatalogModal
                visible={modalOpen}
                config={config}
                onClose={closeModal}
                onSaveColor={handleSaveColor}
                onSaveSize={handleSaveSize}
                editingSize={editingSize}
                editingColor={editingColor}
                onUpdateSize={handleUpdateSize}
                onUpdateColor={handleUpdateColor}
                onNotifySuccess={showSuccess}
                onNotifyError={showError}
            />
            <SweetAlertHost />
            {catalogSaving && (
                <View style={pg.savingOverlay} pointerEvents="none">
                    <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
            )}
        </View>
    );

    if (isWeb) {
        return <ScrollView showsVerticalScrollIndicator={isDesktop}>{pageBody}</ScrollView>;
    }

    return (
        <SafeAreaView style={pg.mobileRoot}>
            <StatusBar barStyle="light-content" backgroundColor="#151D4F" />
            <AppHeader
                title={config.pageTitle}
                subtitle={config.kind === "color" ? "Manage colour options" : "Manage size options"}
                showBackButton
            />
            <ScrollView contentContainerStyle={pg.mobileScroll} showsVerticalScrollIndicator={false}>
                {pageBody}
            </ScrollView>
        </SafeAreaView>
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
    wrapWeb: {
        paddingHorizontal: 0,
        paddingTop: 0,
        maxWidth: 1100,
        width: "100%",
        alignSelf: "center",
        paddingBottom: 24,
    },
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
        flexShrink: 1,
    },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: ORANGE_BRAND,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        flexShrink: 0,
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
    tableScroll: { marginBottom: 16 },
    tableScrollInner: { flexGrow: 1 },
    tableCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
    },
    tableCardSizes: { minWidth: 720 },
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
    colDate: { width: 96 },
    colActionsHead: { width: 160, textAlign: "right" as const },
    colActions: {
        width: 160,
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
    },
    webActionEdit: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#376197",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        cursor: "pointer",
    } as const,
    webActionDelete: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#DC2626",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        cursor: "pointer",
    } as const,
    webActionTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
        color: "#FFFFFF",
    },
    viewOnlyTxt: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
    },
    sharedHint: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
        marginTop: 10,
    },
    retryBtn: {
        marginTop: 12,
        backgroundColor: ORANGE_BRAND,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    retryBtnTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: "#FFFFFF",
    },
    savingOverlay: {
        position: "absolute",
        bottom: 24,
        right: 24,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 20,
        padding: 10,
    },
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
    mobileList: { gap: 12, marginBottom: 16 },
    sizeCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 14,
    },
    sizeCardTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 8,
    },
    sizeCardTitle: {
        flex: 1,
        fontFamily: "Outfit_600SemiBold",
        fontSize: 16,
        color: "#111827",
    },
    sizeCardMeta: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 4,
    },
    sizeCardActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 12,
    },
    sizeEditBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#376197",
        paddingVertical: 12,
        borderRadius: 10,
        minHeight: 44,
    },
    sizeDeleteBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#DC2626",
        paddingVertical: 12,
        borderRadius: 10,
        minHeight: 44,
    },
    sizeActionTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: "#FFFFFF",
    },
});
