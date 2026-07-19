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
import { useRouter, usePathname } from "expo-router";
import { shouldShowSellerTopNav } from "@/lib/navigation/sellerNavConfig";
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
import {
    SIZE_CATALOG_ALL,
    SIZE_CATALOG_GROUPS,
    classifySizeCatalog,
    countSizesByCatalogGroup,
    filterSizesByCatalogGroup,
    sizeCatalogGroupLabel,
    type SizeCatalogFilterId,
} from "@/lib/sizeCatalogGroups";

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
    const pathname = usePathname();
    const { isWeb, isDesktop, isMobile, width } = useResponsive();
    const showTopNav = shouldShowSellerTopNav(pathname);
    const hidePageHeader = !isWeb && showTopNav;
    const { showSuccess, showError, showInfo, confirmDelete, SweetAlertHost } = useSweetAlert();
    const useCatalogCards = !isWeb || isMobile;
    const tableMinWidth = Math.max(640, Math.min(900, width - 24));
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"All" | CatalogStatus>("All");
    const [sizeCatalogFilter, setSizeCatalogFilter] =
        useState<SizeCatalogFilterId>(SIZE_CATALOG_ALL);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSize, setEditingSize] = useState<SizeRecord | null>(null);
    const [editingColor, setEditingColor] = useState<ColorRecord | null>(null);
    const [colors, setColors] = useState<ColorRecord[]>(initialColors);
    const [sizes, setSizes] = useState<SizeRecord[]>(initialSizes);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [catalogSaving, setCatalogSaving] = useState(false);

    // Pagination & View state
    const [viewType, setViewType] = useState<"list" | "grid">("list");
    const [currentPage, setCurrentPage] = useState(1);
    const [showNotice, setShowNotice] = useState(true);
    const ITEMS_PER_PAGE = viewType === "grid" ? 15 : 20;

    useEffect(() => {
        setCurrentPage(1);
    }, [search, viewType, sizeCatalogFilter, statusFilter]);

    const loadCatalog = useCallback(async () => {
        await hydrateSellerSession();
        if (!ensureSellerId()) {
            setCatalogError(null);
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

    const sizeCatalogCounts = useMemo(
        () => (config.kind === "size" ? countSizesByCatalogGroup(sizes) : null),
        [config.kind, sizes]
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const byStatus = <T extends { status: string }>(list: T[]) => {
            if (statusFilter === "All") return list;
            return list.filter((item) => item.status === statusFilter);
        };

        if (config.kind === "color") {
            const list = byStatus(items as ColorRecord[]);
            if (!q) return list;
            return list.filter(
                (c) => c.name.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q)
            );
        }
        const byGroup = filterSizesByCatalogGroup(items as SizeRecord[], sizeCatalogFilter);
        const list = byStatus(byGroup);
        if (!q) return list;
        return list.filter(
            (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
        );
    }, [items, search, config.kind, sizeCatalogFilter, statusFilter]);

    const activeCount = items.filter((i) => i.status === "Active").length;
    const inactiveCount = items.length - activeCount;

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginatedItems = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleSaveColor = async (payload: { name: string; hex: string; status: CatalogStatus }) => {
        setCatalogSaving(true);
        try {
            const created = await createColor(payload);
            setSearch("");
            setStatusFilter("All");
            setCurrentPage(1);
            setColors((prev) => {
                const withoutDup = prev.filter((c) => c.id !== created.id);
                return [{ ...created, owned: true }, ...withoutDup];
            });
            // Ensure list reflects server-owned colors immediately after create.
            void loadCatalog();
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
            setSizeCatalogFilter(classifySizeCatalog(created.name, created.code));
            setSearch("");
            setCurrentPage(1);
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
            setSizeCatalogFilter(classifySizeCatalog(updated.name, updated.code));
            setCurrentPage(1);
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
            `Remove "${color.name}" (${color.hex})`
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
            `Remove "${size.name}" (${size.code})`
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
        <View style={[pg.wrap, isWeb && pg.wrapWeb, isWeb && isMobile && pg.wrapWebMobile, { zIndex: 1 }]}>
            {isWeb ? (
                <View style={[pg.pageHeaderWeb, isMobile && pg.pageHeaderWebMobile]}>
                    <View style={[pg.titleContainerWeb, isMobile && pg.titleContainerWebMobile]}>
                        <View style={pg.breadcrumbWeb}>
                            <TouchableOpacity onPress={() => router.push("/(main)/dashboard")}>
                                <Text style={pg.breadcrumbDimWeb}>Dashboard</Text>
                            </TouchableOpacity>
                            <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.6)" />
                            <Text style={pg.breadcrumbActiveWeb}>{config.pageTitle}</Text>
                        </View>
                        <Text style={[pg.pageTitleWeb, isMobile && pg.pageTitleWebMobile]}>{config.pageTitle}</Text>
                        {isMobile && (
                            <Text style={pg.pageSubWebMobile}>{config.pageSubtitle}</Text>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[pg.addBtnWeb, isMobile && pg.addBtnWebMobile]}
                        onPress={openAddModal}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add" size={18} color="#151D4F" />
                        <Text style={pg.addBtnTxtWeb}>Add New {config.kind === "color" ? "Color" : "Size"}</Text>
                    </TouchableOpacity>
                </View>
            ) : hidePageHeader ? (
                <View style={pg.mobileTopBlock}>
                    <Text style={pg.mobileIntro}>{config.pageSubtitle}</Text>
                    <TouchableOpacity style={[pg.addBtn, pg.addBtnNative]} onPress={openAddModal} activeOpacity={0.85}>
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                        <Text style={pg.addBtnTxt}>Add New {config.kind === "color" ? "Color" : "Size"}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={pg.pageHeader}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={pg.pageTitle}>{config.pageTitle}</Text>
                        <Text style={pg.pageSub}>{config.pageSubtitle}</Text>
                    </View>
                    <TouchableOpacity style={pg.addBtn} onPress={openAddModal} activeOpacity={0.85}>
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                        <Text style={pg.addBtnTxt}>Add New {config.kind === "color" ? "Color" : "Size"}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={[pg.statsRow, isWeb && isMobile && pg.statsRowMobile, !isWeb && pg.statsRowNative]}>
                <TouchableOpacity
                    style={[pg.statCard, !isWeb && pg.statCardNative, statusFilter === "All" && pg.statCardActive]}
                    onPress={() => setStatusFilter("All")}
                    activeOpacity={0.85}
                >
                    <Text style={[pg.statVal, !isWeb && pg.statValNative]}>{items.length}</Text>
                    <Text style={[pg.statLbl, !isWeb && pg.statLblNative]} numberOfLines={2}>
                        Total {config.pageTitle}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[pg.statCard, !isWeb && pg.statCardNative, statusFilter === "Active" && pg.statCardActive]}
                    onPress={() => setStatusFilter("Active")}
                    activeOpacity={0.85}
                >
                    <Text style={[pg.statVal, { color: "#16A34A" }, !isWeb && pg.statValNative]}>{activeCount}</Text>
                    <Text style={[pg.statLbl, !isWeb && pg.statLblNative]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[pg.statCard, !isWeb && pg.statCardNative, statusFilter === "Inactive" && pg.statCardActive]}
                    onPress={() => setStatusFilter("Inactive")}
                    activeOpacity={0.85}
                >
                    <Text style={[pg.statVal, { color: "#DC2626" }, !isWeb && pg.statValNative]}>{inactiveCount}</Text>
                    <Text style={[pg.statLbl, !isWeb && pg.statLblNative]}>Inactive</Text>
                </TouchableOpacity>
            </View>

            <View
                style={[
                    pg.searchRow,
                    isMobile && pg.searchRowMobile,
                    isWeb && { backgroundColor: "transparent", borderWidth: 0, paddingHorizontal: 0 },
                ]}
            >
                <View style={[pg.searchInputWrap, isMobile && pg.searchInputWrapMobile]}>
                    <Ionicons name="search" size={18} color="#9CA3AF" />
                    <TextInput
                        style={[pg.searchInput, isMobile && pg.searchInputMobile]}
                        placeholder={`Search ${config.pageTitle.toLowerCase()}…`}
                        placeholderTextColor="#9CA3AF"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 ? (
                        <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={[pg.searchToolsRow, isMobile && pg.searchToolsRowMobile]}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={pg.statusChipsRow}
                        style={pg.statusChipsScroll}
                    >
                        {(
                            [
                                { key: "All" as const, label: `All ${items.length}` },
                                { key: "Active" as const, label: `Active ${activeCount}` },
                                { key: "Inactive" as const, label: `Inactive ${inactiveCount}` },
                            ] as const
                        ).map((chip) => {
                            const active = statusFilter === chip.key;
                            return (
                                <TouchableOpacity
                                    key={chip.key}
                                    style={[pg.statusChip, active && pg.statusChipActive]}
                                    onPress={() => setStatusFilter(chip.key)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[pg.statusChipTxt, active && pg.statusChipTxtActive]}>
                                        {chip.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {isWeb ? (
                        <View style={pg.viewToggle}>
                            <TouchableOpacity
                                style={[pg.viewToggleBtn, viewType === "list" && pg.viewToggleBtnActive]}
                                onPress={() => setViewType("list")}
                                activeOpacity={0.75}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: viewType === "list" }}
                                accessibilityLabel="List view"
                            >
                                <Ionicons name="list" size={18} color={viewType === "list" ? "#151D4F" : "#9CA3AF"} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[pg.viewToggleBtn, viewType === "grid" && pg.viewToggleBtnActive]}
                                onPress={() => setViewType("grid")}
                                activeOpacity={0.75}
                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: viewType === "grid" }}
                                accessibilityLabel="Grid view"
                            >
                                <Ionicons name="grid" size={16} color={viewType === "grid" ? "#151D4F" : "#9CA3AF"} />
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>
            </View>

            {config.kind === "size" && sizeCatalogCounts ? (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={pg.catalogTabsRow}
                    style={pg.catalogTabsScroll}
                >
                    <TouchableOpacity
                        style={[
                            pg.catalogTab,
                            sizeCatalogFilter === SIZE_CATALOG_ALL && pg.catalogTabActive,
                        ]}
                        onPress={() => setSizeCatalogFilter(SIZE_CATALOG_ALL)}
                    >
                        <Text
                            style={[
                                pg.catalogTabTxt,
                                sizeCatalogFilter === SIZE_CATALOG_ALL && pg.catalogTabTxtActive,
                            ]}
                        >
                            All ({sizeCatalogCounts.all})
                        </Text>
                    </TouchableOpacity>
                    {SIZE_CATALOG_GROUPS.map((g) => {
                        const active = sizeCatalogFilter === g.id;
                        return (
                            <TouchableOpacity
                                key={g.id}
                                style={[pg.catalogTab, active && pg.catalogTabActive]}
                                onPress={() => setSizeCatalogFilter(g.id)}
                            >
                                <Text style={[pg.catalogTabTxt, active && pg.catalogTabTxtActive]}>
                                    {g.label} ({sizeCatalogCounts[g.id]})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            ) : null}

            {useCatalogCards && (
                <View
                    style={
                        viewType === "grid"
                            ? [pg.mobileList, pg.mobileGrid]
                            : pg.mobileList
                    }
                >
                    {catalogLoading ? (
                        <View style={[pg.empty, viewType === "grid" && pg.mobileGridFull]}>
                            <ActivityIndicator size="large" color={ORANGE_BRAND} />
                            <Text style={pg.emptySub}>Loading {config.pageTitle.toLowerCase()}…</Text>
                        </View>
                    ) : catalogError ? (
                        <View style={[pg.empty, viewType === "grid" && pg.mobileGridFull]}>
                            <Text style={pg.emptyTitle}>Could not load {config.pageTitle.toLowerCase()}</Text>
                            <Text style={pg.emptySub}>{catalogError}</Text>
                            <TouchableOpacity style={pg.retryBtn} onPress={loadCatalog}>
                                <Text style={pg.retryBtnTxt}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={[pg.empty, viewType === "grid" && pg.mobileGridFull]}>
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
                            const isGrid = viewType === "grid";
                            return (
                                <View
                                    key={c.id}
                                    style={[
                                        pg.sizeCard,
                                        !isWeb && pg.sizeCardNative,
                                        isGrid && pg.sizeCardGrid,
                                    ]}
                                >
                                    <View style={[pg.sizeCardTop, isGrid && pg.sizeCardTopGrid]}>
                                        <View style={[pg.colorDot, isGrid && pg.colorDotGrid, { backgroundColor: c.hex }]} />
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={[pg.sizeCardTitle, !isWeb && pg.sizeCardTitleNative]} numberOfLines={2}>
                                                {c.name}
                                            </Text>
                                            <Text style={[pg.sizeCardMeta, !isWeb && pg.sizeCardMetaNative]} numberOfLines={1}>
                                                {c.hex}
                                            </Text>
                                        </View>
                                        {!isGrid ? (
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
                                        ) : null}
                                    </View>
                                    {isGrid ? (
                                        <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff, { alignSelf: "flex-start", marginTop: 8 }]}>
                                            <Text
                                                style={[
                                                    pg.badgeTxt,
                                                    isActive ? pg.badgeTxtOn : pg.badgeTxtOff,
                                                ]}
                                            >
                                                {c.status}
                                            </Text>
                                        </View>
                                    ) : null}

                                    {isOwnedCatalogItem(c) ? (
                                        <View style={[pg.sizeCardActions, isGrid && pg.sizeCardActionsGrid]}>
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
                                                {!isGrid ? <Text style={pg.sizeActionTxt}>Edit</Text> : null}
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
                                                {!isGrid ? <Text style={pg.sizeActionTxt}>Delete</Text> : null}
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
                            const isGrid = viewType === "grid";
                            return (
                                <View
                                    key={s.id}
                                    style={[
                                        pg.sizeCard,
                                        !isWeb && pg.sizeCardNative,
                                        isGrid && pg.sizeCardGrid,
                                    ]}
                                >
                                    <View style={pg.sizeCardTop}>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={[pg.sizeCardTitle, !isWeb && pg.sizeCardTitleNative]} numberOfLines={2}>
                                                {s.name}
                                            </Text>
                                            <Text style={pg.sizeCatalogLabel} numberOfLines={1}>
                                                {sizeCatalogGroupLabel(classifySizeCatalog(s.name, s.code))}
                                            </Text>
                                        </View>
                                        {!isGrid ? (
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
                                        ) : null}
                                    </View>
                                    <Text style={[pg.sizeCardMeta, !isWeb && pg.sizeCardMetaNative]} numberOfLines={1}>
                                        Code: {s.code}
                                    </Text>
                                    {isGrid ? (
                                        <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff, { alignSelf: "flex-start", marginBottom: 4 }]}>
                                            <Text
                                                style={[
                                                    pg.badgeTxt,
                                                    isActive ? pg.badgeTxtOn : pg.badgeTxtOff,
                                                ]}
                                            >
                                                {s.status}
                                            </Text>
                                        </View>
                                    ) : null}

                                    {isOwnedCatalogItem(s) ? (
                                        <View style={[pg.sizeCardActions, isGrid && pg.sizeCardActionsGrid]}>
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
                                                {!isGrid ? <Text style={pg.sizeActionTxt}>Edit</Text> : null}
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
                                                {!isGrid ? <Text style={pg.sizeActionTxt}>Delete</Text> : null}
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
                <>
                    {showNotice && (
                        <View style={pg.noticeBanner}>
                            <View style={pg.noticeIconBox}>
                                <MaterialCommunityIcons name="exclamation-thick" size={20} color="#FFFFFF" />
                            </View>
                            <View style={pg.noticeContent}>
                                <Text style={pg.noticeTitle}>Important Notice!</Text>
                                <Text style={pg.noticeText}>
                                    ⚠️ <Text style={{ fontFamily: "Outfit_700Bold", color: "#6B7280" }}>WARNING:</Text> Once you add a {config.entityLabel.toLowerCase()}, you <Text style={{ fontFamily: "Outfit_700Bold", color: "#6B7280" }}>CANNOT edit or delete</Text> it. Please ensure your {config.entityLabel.toLowerCase()} name and code are correct before submitting.
                                </Text>
                                <Text style={pg.noticeText}>
                                    🚨 <Text style={{ fontFamily: "Outfit_700Bold", color: "#6B7280" }}>LEGAL WARNING:</Text> Creating inappropriate, unrelated, or offensive {config.entityLabel.toLowerCase()} names may result in <Text style={{ fontFamily: "Outfit_700Bold", color: "#6B7280" }}>legal action</Text> and account termination.
                                </Text>
                            </View>
                            <TouchableOpacity style={pg.noticeCloseBtn} onPress={() => setShowNotice(false)}>
                                <Ionicons name="close" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    )}
                    {viewType === "list" || !isWeb ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={isDesktop}
                            style={pg.tableScroll}
                            contentContainerStyle={[pg.tableScrollInner, isWeb && { width: "100%" }]}
                        >
                            <View style={[pg.tableCard, isWeb ? { width: "100%", flex: 1 } : { minWidth: tableMinWidth }]}>
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
                                            <Text style={[pg.th, pg.colCatalog]}>Catalog</Text>
                                        </>
                                    )}
                                    <Text style={[pg.th, pg.colStatus]}>Status</Text>

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
                                    paginatedItems.map((row, idx) => {
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
                                                <Text style={[pg.tdCatalog, pg.colCatalog]} numberOfLines={1}>
                                                    {sizeCatalogGroupLabel(classifySizeCatalog(s.name, s.code))}
                                                </Text>
                                                <View style={pg.colStatus}>
                                                    <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff]}>
                                                        <Text style={[pg.badgeTxt, isActive ? pg.badgeTxtOn : pg.badgeTxtOff]}>
                                                            {s.status}
                                                        </Text>
                                                    </View>
                                                </View>

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
                    ) : (
                        <View style={pg.gridContainer}>
                            {paginatedItems.map((row) => {
                                const isActive = row.status === "Active";
                                if (config.kind === "color") {
                                    const c = row as ColorRecord;
                                    return (
                                        <View key={c.id} style={pg.gridCard}>
                                            <View style={pg.gridCardTop}>
                                                <View style={[pg.colorDotBig, { backgroundColor: c.hex }]} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={pg.gridCardTitle} numberOfLines={1}>{c.name}</Text>
                                                    <Text style={pg.gridCardMeta}>{c.hex}</Text>
                                                </View>
                                                <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff]}>
                                                    <Text style={[pg.badgeTxt, isActive ? pg.badgeTxtOn : pg.badgeTxtOff]}>{c.status}</Text>
                                                </View>
                                            </View>

                                            {isOwnedCatalogItem(c) ? (
                                                <View style={pg.gridCardActions}>
                                                    <TouchableOpacity style={pg.gridActionBtn} onPress={() => openEditColorModal(c)}>
                                                        <MaterialCommunityIcons name="pencil-outline" size={16} color="#4B5563" />
                                                        <Text style={pg.gridActionTxt}>Edit</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={pg.gridActionBtn} onPress={() => handleDeleteColor(c)}>
                                                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                                                        <Text style={[pg.gridActionTxt, { color: "#DC2626" }]}>Delete</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <Text style={pg.sharedHint}>Shared catalog — view only</Text>
                                            )}
                                        </View>
                                    );
                                } else {
                                    const s = row as SizeRecord;
                                    return (
                                        <View key={s.id} style={pg.gridCard}>
                                            <View style={pg.gridCardTop}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={pg.gridCardTitle} numberOfLines={1}>{s.name}</Text>
                                                    <Text style={pg.gridCardMeta}>{s.code}</Text>
                                                    <Text style={pg.sizeCatalogLabel}>
                                                        {sizeCatalogGroupLabel(classifySizeCatalog(s.name, s.code))}
                                                    </Text>
                                                </View>
                                                <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff]}>
                                                    <Text style={[pg.badgeTxt, isActive ? pg.badgeTxtOn : pg.badgeTxtOff]}>{s.status}</Text>
                                                </View>
                                            </View>

                                            {isOwnedCatalogItem(s) ? (
                                                <View style={pg.gridCardActions}>
                                                    <TouchableOpacity style={pg.gridActionBtn} onPress={() => openEditSizeModal(s)}>
                                                        <MaterialCommunityIcons name="pencil-outline" size={16} color="#4B5563" />
                                                        <Text style={pg.gridActionTxt}>Edit</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={pg.gridActionBtn} onPress={() => handleDeleteSize(s)}>
                                                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                                                        <Text style={[pg.gridActionTxt, { color: "#DC2626" }]}>Delete</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <Text style={pg.sharedHint}>Shared catalog — view only</Text>
                                            )}
                                        </View>
                                    );
                                }
                            })}
                        </View>
                    )}

                    {filtered.length > 0 && !catalogLoading && !catalogError && (
                        <View style={pg.paginationWrap}>
                            <Text style={pg.paginationInfo}>
                                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} {config.pageTitle.toLowerCase()}
                            </Text>
                            <View style={pg.paginationControls}>
                                <TouchableOpacity
                                    style={[pg.pageBtn, currentPage === 1 && pg.pageBtnDisabled]}
                                    disabled={currentPage === 1}
                                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                                >
                                    <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? "#D1D5DB" : "#4B5563"} />
                                </TouchableOpacity>

                                {Array.from({ length: totalPages }).map((_, idx) => {
                                    const page = idx + 1;
                                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                        return (
                                            <TouchableOpacity
                                                key={page}
                                                style={[pg.pageBtn, currentPage === page && pg.pageBtnActive]}
                                                onPress={() => setCurrentPage(page)}
                                            >
                                                <Text style={[pg.pageBtnTxt, currentPage === page && pg.pageBtnTxtActive]}>{page}</Text>
                                            </TouchableOpacity>
                                        );
                                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                                        return <Text key={`dot-${page}`} style={{ marginHorizontal: 4, color: "#9CA3AF" }}>...</Text>;
                                    }
                                    return null;
                                })}

                                <TouchableOpacity
                                    style={[pg.pageBtn, currentPage === totalPages && pg.pageBtnDisabled]}
                                    disabled={currentPage === totalPages}
                                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                >
                                    <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? "#D1D5DB" : "#4B5563"} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </>
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
            {catalogSaving && (
                <View style={pg.savingOverlay} pointerEvents="none">
                    <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
            )}
        </View>
    );

    if (isWeb) {
        return (
            <View style={pg.webRoot}>
                {pageBody}
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }} pointerEvents="box-none">
                    <SweetAlertHost />
                </View>
            </View>
        );
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
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, elevation: 9999 }} pointerEvents="box-none">
                <SweetAlertHost />
            </View>
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
        paddingTop: 10,
        width: "100%",
        paddingBottom: 24,
    },
    wrapWebMobile: {
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 16,
    },
    webRoot: {
        width: "100%",
        minWidth: 0,
        backgroundColor: "#F4F5FA",
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
        fontSize: 22,
        color: "#111827",
        marginBottom: 6,
    },
    pageSub: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 20,
        flexShrink: 1,
    },
    mobileTopBlock: {
        gap: 12,
        marginBottom: 14,
    },
    mobileIntro: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 20,
    },
    pageHeaderWeb: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 0,
        backgroundColor: "#151D4F",
        paddingHorizontal: 32,
        paddingVertical: 28,
        paddingBottom: 68,
        borderRadius: 22,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderBottomLeftRadius: 22,
        borderBottomRightRadius: 22,
        marginHorizontal: 2,
        marginTop: 12,
        shadowColor: "#151D4F",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
    },
    titleContainerWeb: {
        paddingLeft: 0,
        marginVertical: 0,
    },
    breadcrumbWeb: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
    breadcrumbDimWeb: { fontFamily: "Outfit_500Medium", fontSize: 13, color: "rgba(255,255,255,0.75)" },
    breadcrumbActiveWeb: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#FFFFFF" },
    pageTitleWeb: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 26,
        color: "#FFFFFF",
        letterSpacing: -0.5,
    },
    addBtnWeb: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    addBtnTxtWeb: {
        fontFamily: "Outfit_700Bold",
        fontSize: 14,
        color: "#151D4F",
    },
    pageHeaderWebMobile: {
        flexDirection: "column",
        alignItems: "stretch",
        gap: 14,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 36,
        marginTop: 0,
        marginHorizontal: 0,
        borderRadius: 16,
    },
    titleContainerWebMobile: {
        width: "100%",
    },
    pageTitleWebMobile: {
        fontSize: 22,
        lineHeight: 28,
    },
    pageSubWebMobile: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.78)",
        lineHeight: 19,
        marginTop: 6,
    },
    addBtnWebMobile: {
        alignSelf: "stretch",
        justifyContent: "center",
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
    addBtnNative: {
        width: "100%",
        justifyContent: "center",
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
        marginTop: -42,
        marginHorizontal: 6,
        zIndex: 10,
        flexWrap: "wrap",
    },
    statsRowMobile: {
        marginTop: -24,
        marginHorizontal: 0,
        gap: 8,
    },
    statsRowNative: {
        marginTop: 0,
        marginHorizontal: 0,
        gap: 8,
        marginBottom: 14,
    },
    statCard: {
        flex: 1,
        minWidth: 0,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    statCardActive: {
        borderColor: "#F28520",
        backgroundColor: "#FFF7ED",
    },
    statCardNative: {
        padding: 12,
        minWidth: 0,
    },
    statVal: {
        fontFamily: "Outfit_700Bold",
        fontSize: 22,
        color: "#111827",
    },
    statValNative: {
        fontSize: 20,
        lineHeight: 24,
    },
    statLbl: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    statLblNative: {
        fontSize: 11,
        lineHeight: 15,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
        width: "100%",
        flexWrap: "nowrap",
    },
    searchRowMobile: {
        flexDirection: "column",
        alignItems: "stretch",
        gap: 10,
        width: "100%",
        marginBottom: 14,
    },
    searchToolsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
    },
    searchToolsRowMobile: {
        width: "100%",
        justifyContent: "space-between",
        flexShrink: 1,
        minWidth: 0,
    },
    statusChipsScroll: {
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
    },
    statusChipsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingRight: 4,
    },
    statusChip: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    statusChipActive: {
        borderColor: ORANGE_BRAND,
        backgroundColor: "#FFF7ED",
    },
    statusChipTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
        color: "#6B7280",
    },
    statusChipTxtActive: {
        color: ORANGE_BRAND,
    },
    catalogTabsScroll: {
        marginBottom: 14,
        marginTop: -4,
    },
    catalogTabsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 2,
        paddingRight: 8,
    },
    catalogTab: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    catalogTabActive: {
        backgroundColor: ORANGE_BRAND,
        borderColor: ORANGE_BRAND,
    },
    catalogTabTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
        color: "#6B7280",
    },
    catalogTabTxtActive: {
        color: "#FFFFFF",
    },
    sizeCatalogLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 11,
        color: ORANGE_BRAND,
        marginTop: 2,
    },
    tdCatalog: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: ORANGE_BRAND,
    },
    colCatalog: { flex: 1.1, paddingRight: 8 },
    searchInputWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
        minWidth: 0,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        paddingHorizontal: 14,
    },
    searchInputWrapMobile: {
        width: "100%",
        flexGrow: 1,
        flexShrink: 0,
        alignSelf: "stretch",
        minWidth: "100%" as unknown as number,
    },
    searchInput: {
        flex: 1,
        minWidth: 0,
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: "#111827",
        paddingVertical: 12,
        ...(Platform.OS === "web" ? ({ outlineWidth: 0, width: "100%" } as object) : null),
    },
    searchInputMobile: {
        fontSize: 15,
        paddingVertical: 13,
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
    colColor: { flex: 1 },
    colName: { flex: 1, paddingRight: 8 },
    colHex: { flex: 1 },
    colCode: { flex: 1 },
    colStatus: { flex: 1 },
    colDate: { width: 96 },
    colActionsHead: { flex: 1, textAlign: "right" as const },
    colActions: {
        flex: 1,
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
    colorDotGrid: {
        width: 40,
        height: 40,
        borderRadius: 10,
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
    noticeBanner: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderLeftWidth: 4,
        borderLeftColor: "#151D4F",
        padding: 16,
        marginBottom: 16,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    noticeIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#151D4F",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    noticeContent: {
        flex: 1,
        gap: 4,
    },
    noticeTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 15,
        color: "#111827",
        marginBottom: 2,
    },
    noticeText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 18,
    },
    noticeCloseBtn: {
        padding: 8,
        alignSelf: "flex-start",
    },
    mobileList: { gap: 12, marginBottom: 16 },
    mobileGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    mobileGridFull: {
        width: "100%",
        flexBasis: "100%",
    },
    sizeCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 14,
    },
    sizeCardNative: {
        padding: 12,
    },
    sizeCardGrid: {
        width: "48%",
        flexBasis: "47%",
        maxWidth: "48.5%",
        padding: 12,
    },
    sizeCardTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 8,
    },
    sizeCardTopGrid: {
        marginBottom: 4,
        gap: 8,
    },
    sizeCardActionsGrid: {
        marginTop: 10,
        gap: 8,
    },
    sizeCardTitle: {
        flex: 1,
        fontFamily: "Outfit_600SemiBold",
        fontSize: 16,
        color: "#111827",
    },
    sizeCardTitleNative: {
        fontSize: 15,
        lineHeight: 20,
    },
    sizeCardMeta: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 4,
    },
    sizeCardMetaNative: {
        fontSize: 12,
        lineHeight: 16,
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
    // View Toggle
    viewToggle: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 4,
    },
    viewToggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    viewToggleBtnActive: {
        backgroundColor: "#EEF2FF",
        borderWidth: 1,
        borderColor: "#C7D2FE",
    },
    // Grid View
    gridContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 16,
    },
    gridCard: {
        width: "calc(25% - 12px)" as any,
        minWidth: 220,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 16,
    },
    gridCardTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 12,
    },
    colorDotBig: {
        width: 40,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.1)",
    },
    gridCardTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 15,
        color: "#111827",
        marginBottom: 2,
    },
    gridCardMeta: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: "#6B7280",
    },
    gridCardMetaBottom: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#9CA3AF",
        marginBottom: 16,
    },
    gridCardActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    gridActionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    gridActionTxt: {
        fontFamily: "Outfit_500Medium",
        fontSize: 12,
        color: "#4B5563",
    },
    // Pagination
    paginationWrap: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        paddingHorizontal: 8,
        marginTop: 8,
    },
    paginationInfo: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: "#6B7280",
    },
    paginationControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    pageBtn: {
        minWidth: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    pageBtnActive: {
        backgroundColor: "#151D4F",
        borderColor: "#151D4F",
    },
    pageBtnDisabled: {
        opacity: 0.5,
    },
    pageBtnTxt: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: "#374151",
    },
    pageBtnTxtActive: {
        color: "#FFFFFF",
    },
});
