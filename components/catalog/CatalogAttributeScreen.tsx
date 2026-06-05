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

// ── Pagination constants ──
const PAGE_SIZE_WEB_GRID = 20;
const PAGE_SIZE_WEB_LIST = 15;
const PAGE_SIZE_MOBILE = 10;

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

    // ── View-mode toggle (list / grid) ──
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    // ── Pagination ──
    const [currentPage, setCurrentPage] = useState(1);

    // ── Hover state for lock overlay / row highlight (web only) ──
    // hoveredGridId   → grid card hovered (shows overlay + tooltip)
    // hoveredRowId    → table list row hovered (shows row highlight)
    const [hoveredGridId, setHoveredGridId] = useState<string | null>(null);
    const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

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
                setCatalogError(
                    `${msg}\n\n[dev] API: ${baseUrl} (${platform}${isEmulator ? ", emulator" : ""})`
                );
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

    // Reset to page 1 whenever search or view mode changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, viewMode]);

    // Determine page size based on context
    const pageSize = useMemo(() => {
        if (useCatalogCards) return PAGE_SIZE_MOBILE;
        if (!useCatalogCards && viewMode === "grid") return PAGE_SIZE_WEB_GRID;
        return PAGE_SIZE_WEB_LIST;
    }, [useCatalogCards, viewMode]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    // Clamp currentPage if filtered results shrink
    const safePage = Math.min(currentPage, totalPages);

    const paginated = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, safePage, pageSize]);

    const activeCount = items.filter((i) => i.status === "Active").length;

    // ─────────────────────────────────────────────────────────────────────────
    // Backend handlers — NO changes below this line
    // ─────────────────────────────────────────────────────────────────────────

    const handleSaveColor = async (payload: {
        name: string;
        hex: string;
        status: CatalogStatus;
    }) => {
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

    const handleSaveSize = async (payload: {
        name: string;
        code: string;
        status: CatalogStatus;
    }) => {
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

    // ─────────────────────────────────────────────────────────────────────────
    // Render helpers
    // ─────────────────────────────────────────────────────────────────────────

    // ── Pagination controls ──
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const buildPages = (): (number | "...")[] => {
            if (totalPages <= 7) {
                return Array.from({ length: totalPages }, (_, i) => i + 1);
            }
            const pages: (number | "...")[] = [];
            pages.push(1);
            if (safePage > 3) pages.push("...");
            const start = Math.max(2, safePage - 1);
            const end = Math.min(totalPages - 1, safePage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (safePage < totalPages - 2) pages.push("...");
            pages.push(totalPages);
            return pages;
        };

        const pages = buildPages();

        return (
            <View style={pg.paginationRow}>
                <Text style={pg.paginationInfo}>
                    {(safePage - 1) * pageSize + 1}–
                    {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                </Text>

                <View style={pg.paginationControls}>
                    <TouchableOpacity
                        style={[pg.pageBtn, safePage === 1 && pg.pageBtnDisabled]}
                        onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="chevron-left"
                            size={18}
                            color={safePage === 1 ? "#D1D5DB" : "#374151"}
                        />
                    </TouchableOpacity>

                    {pages.map((p, idx) =>
                        p === "..." ? (
                            <View key={`ellipsis-${idx}`} style={pg.pageEllipsis}>
                                <Text style={pg.pageEllipsisTxt}>…</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                key={p}
                                style={[pg.pageBtn, p === safePage && pg.pageBtnActive]}
                                onPress={() => setCurrentPage(p as number)}
                                activeOpacity={0.7}
                            >
                                <Text style={[pg.pageBtnTxt, p === safePage && pg.pageBtnTxtActive]}>
                                    {p}
                                </Text>
                            </TouchableOpacity>
                        )
                    )}

                    <TouchableOpacity
                        style={[pg.pageBtn, safePage === totalPages && pg.pageBtnDisabled]}
                        onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={18}
                            color={safePage === totalPages ? "#D1D5DB" : "#374151"}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Ownership helper — reusable action block for grid cards
    //
    // LOGIC:
    //   • isOwned = true  (Seller A viewing their own color)
    //       → Show Edit + Delete icon buttons
    //   • isOwned = false (Seller B viewing Seller A's color)
    //       → Show only a static lock icon; NO edit/delete
    //       → On web: hovering the swatch shows a dark overlay + tooltip
    //       → On mobile: a subtle lock badge sits on the swatch corner always
    // ─────────────────────────────────────────────────────────────────────────

    // ── Grid card renderer — used for both mobile grid and web grid ──
    const renderColorGrid = (colorList: ColorRecord[], isWebGrid = false) => (
        <>
            <View style={isWebGrid ? pg.webColorGrid : pg.colorGrid}>
                {colorList.map((c) => {
                    const isActive = c.status === "Active";
                    const isOwned = isOwnedCatalogItem(c);
                    const isHovered = hoveredGridId === c.id;

                    // Web grid: percentage-based width per column count
                    const cols = isWebGrid ? (width >= 1280 ? 5 : 4) : undefined;
                    const pct = cols ? (`${(100 / cols).toFixed(4)}%` as any) : undefined;

                    const cardStyle = isWebGrid
                        ? [pg.webColorGridCard, { width: pct }]
                        : pg.colorGridCard;

                    const swatchHeight = isWebGrid ? pg.webColorGridSwatch : pg.colorGridSwatch;

                    // ── Action buttons bottom-right of card ──
                    const actionBlock = isOwned ? (
                        <View style={{ flexDirection: "row", gap: 6 }}>
                            <TouchableOpacity
                                style={pg.gridIconBtn}
                                onPress={() => openEditColorModal(c)}
                                activeOpacity={0.85}
                            >
                                <MaterialCommunityIcons name="pencil-outline" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[pg.gridIconBtn, pg.gridIconBtnDelete]}
                                onPress={() => handleDeleteColor(c)}
                                activeOpacity={0.85}
                            >
                                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Not owned → static small lock icon in footer
                        <View style={pg.cardLockBadge}>
                            <MaterialCommunityIcons name="lock-outline" size={13} color="#6B7280" />
                            <Text style={pg.cardLockBadgeTxt}>Other seller</Text>
                        </View>
                    );

                    const cardBody = (
                        <View style={pg.colorGridBody}>
                            <Text style={pg.colorGridName} numberOfLines={1}>{c.name}</Text>
                            <Text style={pg.colorGridHex}>{c.hex}</Text>
                            <View style={pg.colorGridFooter}>
                                <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff]}>
                                    <Text style={[pg.badgeTxt, isActive ? pg.badgeTxtOn : pg.badgeTxtOff]}>
                                        {c.status}
                                    </Text>
                                </View>
                                {actionBlock}
                            </View>
                        </View>
                    );

                    // Swatch: web shows hover overlay+tooltip; mobile shows corner badge always
                    const swatchBlock = (
                        <View style={{ position: "relative" }}>
                            <View style={[swatchHeight, { backgroundColor: c.hex }]} />

                            {/* Web: dark overlay + tooltip on hover for non-owned */}
                            {!isOwned && isWeb && isHovered && (
                                <View style={pg.swatchLockOverlay}>
                                    <View style={pg.lockTooltip}>
                                        <MaterialCommunityIcons
                                            name="lock-outline"
                                            size={13}
                                            color="rgba(255,255,255,0.85)"
                                        />
                                        <Text style={pg.lockTooltipTxt}>
                                            This color belongs to{"\n"}another seller
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="lock-outline" size={30} color="#FFFFFF" />
                                </View>
                            )}

                            {/* Mobile: permanent small lock badge top-right corner */}
                            {!isOwned && !isWeb && (
                                <View style={pg.swatchCornerBadge}>
                                    <MaterialCommunityIcons name="lock-outline" size={12} color="#FFFFFF" />
                                </View>
                            )}
                        </View>
                    );

                    const inner = isWebGrid ? (
                        <View style={pg.webColorGridInner}>
                            {swatchBlock}
                            {cardBody}
                        </View>
                    ) : (
                        <>
                            {swatchBlock}
                            {cardBody}
                        </>
                    );

                    return (
                        <View
                            key={c.id}
                            style={cardStyle}
                            // @ts-ignore — web-only mouse events
                            onMouseEnter={isWeb ? () => setHoveredGridId(c.id) : undefined}
                            onMouseLeave={isWeb ? () => setHoveredGridId(null) : undefined}
                        >
                            {inner}
                        </View>
                    );
                })}
            </View>
            {renderPagination()}
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Mobile list card renderer — colors
    //
    // LOGIC (same ownership rule):
    //   • isOwned → Edit + Delete buttons
    //   • !isOwned → Lock icon + "Shared catalog — view only" text, no buttons
    // ─────────────────────────────────────────────────────────────────────────
    const renderColorList = (colorList: ColorRecord[]) => (
        <>
            <View style={pg.mobileList}>
                {colorList.map((c) => {
                    const isActive = c.status === "Active";
                    const isOwned = isOwnedCatalogItem(c);
                    return (
                        <View key={c.id} style={pg.sizeCard}>
                            <View style={pg.sizeCardTop}>
                                <View style={[pg.colorDot, { backgroundColor: c.hex }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={pg.sizeCardTitle} numberOfLines={2}>{c.name}</Text>
                                    <Text style={pg.sizeCardMeta}>{c.hex}</Text>
                                </View>
                                <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff]}>
                                    <Text style={[pg.badgeTxt, isActive ? pg.badgeTxtOn : pg.badgeTxtOff]}>
                                        {c.status}
                                    </Text>
                                </View>
                            </View>
                            <Text style={pg.sizeCardMeta}>Added: {c.createdAt}</Text>
                            {isOwned ? (
                                <View style={pg.sizeCardActions}>
                                    <TouchableOpacity
                                        style={pg.sizeEditBtn}
                                        onPress={() => openEditColorModal(c)}
                                        activeOpacity={0.85}
                                    >
                                        <MaterialCommunityIcons name="pencil-outline" size={18} color="#FFFFFF" />
                                        <Text style={pg.sizeActionTxt}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={pg.sizeDeleteBtn}
                                        onPress={() => handleDeleteColor(c)}
                                        activeOpacity={0.85}
                                    >
                                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />
                                        <Text style={pg.sizeActionTxt}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={pg.mobileLockedRow}>
                                    <MaterialCommunityIcons name="lock-outline" size={15} color="#9CA3AF" />
                                    <Text style={pg.sharedHint}>Shared catalog — view only</Text>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
            {renderPagination()}
        </>
    );

    // ── Grid card renderer — sizes (mobile + web grid) ──
    const renderSizeGrid = (sizeList: SizeRecord[], isWebGrid = false) => (
        <>
            <View style={isWebGrid ? pg.webColorGrid : pg.colorGrid}>
                {sizeList.map((s) => {
                    const isActive = s.status === "Active";
                    const isOwned = isOwnedCatalogItem(s);
                    const isHovered = hoveredGridId === s.id;

                    const cols = isWebGrid ? (width >= 1280 ? 5 : 4) : undefined;
                    const pct = cols ? (`${(100 / cols).toFixed(4)}%` as any) : undefined;

                    const cardStyle = isWebGrid
                        ? [pg.webColorGridCard, { width: pct }]
                        : pg.colorGridCard;

                    const headerStyle = isWebGrid ? pg.webSizeGridHeader : pg.sizeGridHeader;

                    const actionBlock = isOwned ? (
                        <View style={{ flexDirection: "row", gap: 6 }}>
                            <TouchableOpacity
                                style={pg.gridIconBtn}
                                onPress={() => openEditSizeModal(s)}
                                activeOpacity={0.85}
                            >
                                <MaterialCommunityIcons name="pencil-outline" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[pg.gridIconBtn, pg.gridIconBtnDelete]}
                                onPress={() => handleDeleteSize(s)}
                                activeOpacity={0.85}
                            >
                                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={pg.cardLockBadge}>
                            <MaterialCommunityIcons name="lock-outline" size={13} color="#6B7280" />
                            <Text style={pg.cardLockBadgeTxt}>Other seller</Text>
                        </View>
                    );

                    const cardBody = (
                        <View style={pg.colorGridBody}>
                            <Text style={pg.colorGridName} numberOfLines={1}>{s.name}</Text>
                            <Text style={pg.colorGridHex}>Code: {s.code}</Text>
                            <View style={pg.colorGridFooter}>
                                <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff]}>
                                    <Text style={[pg.badgeTxt, isActive ? pg.badgeTxtOn : pg.badgeTxtOff]}>
                                        {s.status}
                                    </Text>
                                </View>
                                {actionBlock}
                            </View>
                        </View>
                    );

                    const headerBlock = (
                        <View style={{ position: "relative" }}>
                            <View style={headerStyle}>
                                <MaterialCommunityIcons
                                    name="ruler-square"
                                    size={isWebGrid ? 28 : 24}
                                    color="rgba(255,255,255,0.85)"
                                />
                                <Text style={pg.sizeGridCode} numberOfLines={1}>{s.code}</Text>
                            </View>

                            {!isOwned && isWeb && isHovered && (
                                <View style={pg.swatchLockOverlay}>
                                    <View style={pg.lockTooltip}>
                                        <MaterialCommunityIcons
                                            name="lock-outline"
                                            size={13}
                                            color="rgba(255,255,255,0.85)"
                                        />
                                        <Text style={pg.lockTooltipTxt}>
                                            This size belongs to{"\n"}another seller
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="lock-outline" size={30} color="#FFFFFF" />
                                </View>
                            )}

                            {!isOwned && !isWeb && (
                                <View style={pg.swatchCornerBadge}>
                                    <MaterialCommunityIcons name="lock-outline" size={12} color="#FFFFFF" />
                                </View>
                            )}
                        </View>
                    );

                    const inner = isWebGrid ? (
                        <View style={pg.webColorGridInner}>
                            {headerBlock}
                            {cardBody}
                        </View>
                    ) : (
                        <>
                            {headerBlock}
                            {cardBody}
                        </>
                    );

                    return (
                        <View
                            key={s.id}
                            style={cardStyle}
                            // @ts-ignore — web-only mouse events
                            onMouseEnter={isWeb ? () => setHoveredGridId(s.id) : undefined}
                            onMouseLeave={isWeb ? () => setHoveredGridId(null) : undefined}
                        >
                            {inner}
                        </View>
                    );
                })}
            </View>
            {renderPagination()}
        </>
    );

    // ── Mobile list card renderer — sizes ──
    const renderSizeList = (sizeList: SizeRecord[]) => (
        <>
            <View style={pg.mobileList}>
                {sizeList.map((s) => {
                    const isActive = s.status === "Active";
                    const isOwned = isOwnedCatalogItem(s);
                    return (
                        <View key={s.id} style={pg.sizeCard}>
                            <View style={pg.sizeCardTop}>
                                <Text style={pg.sizeCardTitle} numberOfLines={2}>
                                    {s.name}
                                </Text>
                                <View style={[pg.badge, isActive ? pg.badgeOn : pg.badgeOff]}>
                                    <Text style={[pg.badgeTxt, isActive ? pg.badgeTxtOn : pg.badgeTxtOff]}>
                                        {s.status}
                                    </Text>
                                </View>
                            </View>
                            <Text style={pg.sizeCardMeta}>Code: {s.code}</Text>
                            <Text style={pg.sizeCardMeta}>Added: {s.createdAt}</Text>
                            {isOwned ? (
                                <View style={pg.sizeCardActions}>
                                    <TouchableOpacity
                                        style={pg.sizeEditBtn}
                                        onPress={() => openEditSizeModal(s)}
                                        activeOpacity={0.85}
                                    >
                                        <MaterialCommunityIcons name="pencil-outline" size={18} color="#FFFFFF" />
                                        <Text style={pg.sizeActionTxt}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={pg.sizeDeleteBtn}
                                        onPress={() => handleDeleteSize(s)}
                                        activeOpacity={0.85}
                                    >
                                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />
                                        <Text style={pg.sizeActionTxt}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={pg.mobileLockedRow}>
                                    <MaterialCommunityIcons name="lock-outline" size={15} color="#9CA3AF" />
                                    <Text style={pg.sharedHint}>Shared catalog — view only</Text>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
            {renderPagination()}
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Page body
    // ─────────────────────────────────────────────────────────────────────────
    const pageBody = (
        <View style={[pg.wrap, isWeb && pg.wrapWeb]}>

            {/* ── Header banner ── */}
            <View style={pg.pageHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={pg.pageTitle}>{config.pageTitle}</Text>
                    <Text style={pg.pageSub}>{config.pageSubtitle}</Text>
                </View>
                <TouchableOpacity style={pg.addBtn} onPress={openAddModal} activeOpacity={0.85}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={pg.addBtnTxt}>
                        Add New {config.kind === "color" ? "Color" : "Size"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Stats row ── */}
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
                    <Text style={[pg.statVal, { color: "#DC2626" }]}>
                        {items.length - activeCount}
                    </Text>
                    <Text style={pg.statLbl}>Inactive</Text>
                </View>
            </View>

            {/* ── WARNING NOTE — sizes only ── */}
            {config.kind === "size" && (
                <View style={pg.warningBox}>
                    <View style={pg.warningHeader}>
                        <MaterialCommunityIcons name="alert-circle" size={20} color="#92400E" />
                        <Text style={pg.warningTitle}>Important Notice!</Text>
                    </View>
                    <Text style={pg.warningLine}>
                        <Text style={pg.warningBold}>⚠️ WARNING:</Text>
                        {" "}Once you add a size, you{" "}
                        <Text style={pg.warningBold}>CANNOT edit or delete it.</Text>
                        {" "}Please ensure your size name and code are correct before submitting.
                    </Text>
                    <Text style={pg.warningLine}>
                        <Text style={pg.warningBold}>🚨 LEGAL WARNING:</Text>
                        {" "}Creating inappropriate, unrelated, or offensive size names may result in{" "}
                        <Text style={pg.warningBold}>legal action and account termination.</Text>
                    </Text>
                </View>
            )}

            {/* ── WARNING NOTE — colors only ── */}
            {config.kind === "color" && (
                <View style={pg.warningBox}>
                    <View style={pg.warningHeader}>
                        <MaterialCommunityIcons name="alert-circle" size={20} color="#92400E" />
                        <Text style={pg.warningTitle}>Important Notice!</Text>
                    </View>
                    <Text style={pg.warningLine}>
                        <Text style={pg.warningBold}>⚠️ WARNING:</Text>
                        {" "}Once you add a color, you{" "}
                        <Text style={pg.warningBold}>CANNOT edit or delete it.</Text>
                        {" "}Please ensure your color name and code are correct before submitting.
                    </Text>
                    <Text style={pg.warningLine}>
                        <Text style={pg.warningBold}>🚨 LEGAL WARNING:</Text>
                        {" "}Creating inappropriate, unrelated, or offensive color names may result in{" "}
                        <Text style={pg.warningBold}>legal action and account termination.</Text>
                    </Text>
                </View>
            )}

            {/* ── Search + view-toggle row ── */}
            <View style={pg.searchRow}>
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                    style={pg.searchInput}
                    placeholder={`Search ${config.pageTitle.toLowerCase()}…`}
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={setSearch}
                />
                <View style={pg.viewToggle}>
                        <TouchableOpacity
                            style={[
                                pg.viewToggleBtn,
                                viewMode === "list" && pg.viewToggleBtnActive,
                            ]}
                            onPress={() => setViewMode("list")}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons
                                name="view-list-outline"
                                size={18}
                                color={viewMode === "list" ? "#FFFFFF" : "#9CA3AF"}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                pg.viewToggleBtn,
                                viewMode === "grid" && pg.viewToggleBtnActive,
                            ]}
                            onPress={() => setViewMode("grid")}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons
                                name="view-grid-outline"
                                size={18}
                                color={viewMode === "grid" ? "#FFFFFF" : "#9CA3AF"}
                            />
                        </TouchableOpacity>
                    </View>
            </View>

            {/* ═══════════════════════════════════════════════════════════════
                MOBILE / CARD VIEW
            ═══════════════════════════════════════════════════════════════ */}
            {useCatalogCards && (
                <>
                    {catalogLoading ? (
                        <View style={pg.empty}>
                            <ActivityIndicator size="large" color={ORANGE_BRAND} />
                            <Text style={pg.emptySub}>
                                Loading {config.pageTitle.toLowerCase()}…
                            </Text>
                        </View>
                    ) : catalogError ? (
                        <View style={pg.empty}>
                            <Text style={pg.emptyTitle}>
                                Could not load {config.pageTitle.toLowerCase()}
                            </Text>
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
                            <Text style={pg.emptyTitle}>
                                No {config.pageTitle.toLowerCase()} found
                            </Text>
                            <Text style={pg.emptySub}>
                                Add a new {config.entityLabel} to get started.
                            </Text>
                        </View>
                    ) : config.kind === "color" ? (
                        viewMode === "grid"
                            ? renderColorGrid(paginated as ColorRecord[], false)
                            : renderColorList(paginated as ColorRecord[])
                    ) : viewMode === "grid" ? (
                        renderSizeGrid(paginated as SizeRecord[], false)
                    ) : (
                        renderSizeList(paginated as SizeRecord[])
                    )}
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                WEB VIEW
            ═══════════════════════════════════════════════════════════════ */}
            {!useCatalogCards && (
                viewMode === "grid" ? (
                    // ── Web grid (colors + sizes) ──
                    <View style={pg.webGridWrap}>
                        {catalogLoading ? (
                            <View style={pg.empty}>
                                <ActivityIndicator size="large" color={ORANGE_BRAND} />
                                <Text style={pg.emptySub}>
                                    Loading {config.pageTitle.toLowerCase()}…
                                </Text>
                            </View>
                        ) : catalogError ? (
                            <View style={pg.empty}>
                                <Text style={pg.emptyTitle}>
                                    Could not load {config.pageTitle.toLowerCase()}
                                </Text>
                                <Text style={pg.emptySub}>{catalogError}</Text>
                                <TouchableOpacity style={pg.retryBtn} onPress={loadCatalog}>
                                    <Text style={pg.retryBtnTxt}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        ) : filtered.length === 0 ? (
                            <View style={pg.empty}>
                                <MaterialCommunityIcons
                                    name={
                                        config.kind === "color"
                                            ? "palette-outline"
                                            : "ruler-square"
                                    }
                                    size={40}
                                    color="#D1D5DB"
                                />
                                <Text style={pg.emptyTitle}>
                                    No {config.pageTitle.toLowerCase()} found
                                </Text>
                                <Text style={pg.emptySub}>
                                    Add a new {config.entityLabel} to get started.
                                </Text>
                            </View>
                        ) : config.kind === "color" ? (
                            renderColorGrid(paginated as ColorRecord[], true)
                        ) : (
                            renderSizeGrid(paginated as SizeRecord[], true)
                        )}
                    </View>
                ) : (
                    // ── Web table (colors list-view + sizes) ──
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={isDesktop}
                        style={pg.tableScroll}
                        contentContainerStyle={pg.tableScrollInner}
                    >
                        <View style={[pg.tableCard, { minWidth: tableMinWidth }]}>

                            {/* Table head */}
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

                            {/* Table body */}
                            {catalogLoading ? (
                                <View style={pg.empty}>
                                    <ActivityIndicator size="large" color={ORANGE_BRAND} />
                                    <Text style={pg.emptySub}>
                                        Loading {config.pageTitle.toLowerCase()}…
                                    </Text>
                                </View>
                            ) : catalogError ? (
                                <View style={pg.empty}>
                                    <Text style={pg.emptyTitle}>
                                        Could not load {config.pageTitle.toLowerCase()}
                                    </Text>
                                    <Text style={pg.emptySub}>{catalogError}</Text>
                                    <TouchableOpacity style={pg.retryBtn} onPress={loadCatalog}>
                                        <Text style={pg.retryBtnTxt}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : filtered.length === 0 ? (
                                <View style={pg.empty}>
                                    <MaterialCommunityIcons
                                        name={
                                            config.kind === "color"
                                                ? "palette-outline"
                                                : "ruler-square"
                                        }
                                        size={40}
                                        color="#D1D5DB"
                                    />
                                    <Text style={pg.emptyTitle}>
                                        No {config.pageTitle.toLowerCase()} found
                                    </Text>
                                    <Text style={pg.emptySub}>
                                        Add a new {config.entityLabel} to get started.
                                    </Text>
                                </View>
                            ) : (
                                (paginated as (ColorRecord | SizeRecord)[]).map((row, idx) => {
                                    const isActive = row.status === "Active";
                                    const isOwned = isOwnedCatalogItem(row);
                                    const isRowHovered = hoveredRowId === row.id;

                                    // ─────────────────────────────────────────
                                    // Actions cell
                                    //
                                    //   Owned (Seller A seeing own item):
                                    //     → Edit + Delete buttons
                                    //
                                    //   Not owned (Seller B seeing Seller A's item):
                                    //     → Lock icon only
                                    //     → When row is hovered (web), a tooltip appears
                                    //       beside the lock explaining why it's locked
                                    // ─────────────────────────────────────────
                                    const actionsCell = isOwned ? (
                                        <>
                                            <TouchableOpacity
                                                onPress={() =>
                                                    config.kind === "color"
                                                        ? openEditColorModal(row as ColorRecord)
                                                        : openEditSizeModal(row as SizeRecord)
                                                }
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
                                                onPress={() =>
                                                    config.kind === "color"
                                                        ? handleDeleteColor(row as ColorRecord)
                                                        : handleDeleteSize(row as SizeRecord)
                                                }
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
                                        // ── Not owned: lock icon + hover tooltip ──
                                        <View style={pg.tableLockCell}>
                                            <MaterialCommunityIcons
                                                name="lock-outline"
                                                size={18}
                                                color="#9CA3AF"
                                            />
                                            {/* Tooltip appears only when this row is hovered */}
                                            {isRowHovered && (
                                                <View style={pg.tableLockTooltip}>
                                                    <Text style={pg.tableLockTooltipTxt}>
                                                        Added by another seller
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    );

                                    if (config.kind === "color") {
                                        const c = row as ColorRecord;
                                        return (
                                            <View
                                                key={c.id}
                                                style={[
                                                    pg.tr,
                                                    idx % 2 === 1 && pg.trAlt,
                                                    isRowHovered && pg.trHovered,
                                                ]}
                                                // @ts-ignore — web only
                                                onMouseEnter={
                                                    isWeb
                                                        ? () => setHoveredRowId(c.id)
                                                        : undefined
                                                }
                                                onMouseLeave={
                                                    isWeb
                                                        ? () => setHoveredRowId(null)
                                                        : undefined
                                                }
                                            >
                                                <View style={pg.colColor}>
                                                    <View
                                                        style={[
                                                            pg.colorDot,
                                                            { backgroundColor: c.hex },
                                                        ]}
                                                    />
                                                </View>
                                                <Text
                                                    style={[pg.td, pg.colName]}
                                                    numberOfLines={1}
                                                >
                                                    {c.name}
                                                </Text>
                                                <Text style={[pg.tdMono, pg.colHex]}>
                                                    {c.hex}
                                                </Text>
                                                <View style={pg.colStatus}>
                                                    <View
                                                        style={[
                                                            pg.badge,
                                                            isActive ? pg.badgeOn : pg.badgeOff,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                pg.badgeTxt,
                                                                isActive
                                                                    ? pg.badgeTxtOn
                                                                    : pg.badgeTxtOff,
                                                            ]}
                                                        >
                                                            {c.status}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={[pg.tdLight, pg.colDate]}>
                                                    {c.createdAt}
                                                </Text>
                                                <View style={pg.colActions}>{actionsCell}</View>
                                            </View>
                                        );
                                    }

                                    const s = row as SizeRecord;
                                    return (
                                        <View
                                            key={s.id}
                                            style={[
                                                pg.tr,
                                                idx % 2 === 1 && pg.trAlt,
                                                isRowHovered && pg.trHovered,
                                            ]}
                                            // @ts-ignore — web only
                                            onMouseEnter={
                                                isWeb
                                                    ? () => setHoveredRowId(s.id)
                                                    : undefined
                                            }
                                            onMouseLeave={
                                                isWeb
                                                    ? () => setHoveredRowId(null)
                                                    : undefined
                                            }
                                        >
                                            <Text
                                                style={[pg.td, pg.colName]}
                                                numberOfLines={1}
                                            >
                                                {s.name}
                                            </Text>
                                            <Text style={[pg.tdMono, pg.colCode]}>
                                                {s.code}
                                            </Text>
                                            <View style={pg.colStatus}>
                                                <View
                                                    style={[
                                                        pg.badge,
                                                        isActive ? pg.badgeOn : pg.badgeOff,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            pg.badgeTxt,
                                                            isActive
                                                                ? pg.badgeTxtOn
                                                                : pg.badgeTxtOff,
                                                        ]}
                                                    >
                                                        {s.status}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[pg.tdLight, pg.colDate]}>
                                                {s.createdAt}
                                            </Text>
                                            <View style={pg.colActions}>{actionsCell}</View>
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </ScrollView>
                )
            )}

            {/* Pagination — web table/list view (rendered outside the horizontal ScrollView) */}
            {!useCatalogCards &&
                viewMode !== "grid" &&
                !catalogLoading &&
                !catalogError &&
                filtered.length > 0 &&
                renderPagination()}

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
        return (
            <ScrollView showsVerticalScrollIndicator={isDesktop}>{pageBody}</ScrollView>
        );
    }

    return (
        <SafeAreaView style={pg.mobileRoot}>
            <StatusBar barStyle="light-content" backgroundColor="#151D4F" />
            <AppHeader
                title={config.pageTitle}
                subtitle={
                    config.kind === "color" ? "Manage colour options" : "Manage size options"
                }
                showBackButton
            />
            <ScrollView
                contentContainerStyle={pg.mobileScroll}
                showsVerticalScrollIndicator={false}
            >
                {pageBody}
            </ScrollView>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
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
    headerTitleBlock: { flex: 1, marginHorizontal: 12 },
    mobileHeaderTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#FFFFFF" },
    mobileHeaderSub: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "rgba(255,255,255,0.7)",
    },
    headerActions: { flexDirection: "row", gap: 4 },
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

    wrap: {
        flex: 1,
        width: "100%",
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 24,
    },
    wrapWeb: {
        flex: 1,
        width: "100%",
        minHeight: "100%",
        paddingHorizontal: 16,
        paddingTop: 0,
        paddingBottom: 24,
    },

    pageHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap",
        backgroundColor: "#151D4F",
        paddingVertical: 24,
        paddingHorizontal: 24,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 5,
    },
    pageTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 26,
        color: "#FFFFFF",
        marginBottom: 6,
    },
    pageSub: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "rgba(255,255,255,0.75)",
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
    addBtnTxt: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#FFFFFF" },

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
    statVal: { fontFamily: "Outfit_700Bold", fontSize: 22, color: "#111827" },
    statLbl: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#6B7280", marginTop: 2 },

    // ── Warning box ──
    warningBox: {
        backgroundColor: "#fdfdfd",
        borderWidth: 1,
        borderColor: "#F59E0B",
        borderLeftWidth: 4,
        borderLeftColor: "#D97706",
        borderRadius: 10,
        padding: 14,
        marginBottom: 14,
        gap: 8,
    },
    warningHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    warningTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#92400E" },
    warningLine: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#78350F",
        lineHeight: 20,
    },
    warningBold: { fontFamily: "Outfit_700Bold", color: "#92400E" },

    // ── Search row ──
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

    // ── View toggle ──
    viewToggle: {
        flexDirection: "row",
        borderLeftWidth: 1,
        borderLeftColor: "#E5E7EB",
        paddingLeft: 10,
        gap: 4,
    },
    viewToggleBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    viewToggleBtnActive: { backgroundColor: "#151D4F" },

    // ── Pagination ──
    paginationRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 4,
        marginTop: 8,
        flexWrap: "wrap",
        gap: 8,
    },
    paginationInfo: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#6B7280" },
    paginationControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        flexWrap: "wrap",
    },
    pageBtn: {
        minWidth: 36,
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    pageBtnActive: { backgroundColor: "#151D4F", borderColor: "#151D4F" },
    pageBtnDisabled: { backgroundColor: "#F9FAFB", borderColor: "#F3F4F6" },
    pageBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#374151" },
    pageBtnTxtActive: { color: "#FFFFFF" },
    pageEllipsis: { width: 28, height: 36, alignItems: "center", justifyContent: "center" },
    pageEllipsisTxt: { fontFamily: "Outfit_400Regular", fontSize: 14, color: "#9CA3AF" },

    // ── Color grid (mobile) ──
    colorGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 4,
    },
    colorGridCard: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
    },
    colorGridSwatch: { width: "100%", height: 72 },
    colorGridBody: { padding: 10 },
    colorGridName: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: "#111827",
        marginBottom: 2,
    },
    colorGridHex: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: "#6B7280",
        marginBottom: 8,
    },
    colorGridFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    // ── Grid card action buttons ──
    gridIconBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: "#376197",
        alignItems: "center",
        justifyContent: "center",
    },
    gridIconBtnDelete: { backgroundColor: "#DC2626" },

    // ── "Other seller" badge in card footer (non-owned) ──
    cardLockBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#F3F4F6",
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 4,
    },
    cardLockBadgeTxt: {
        fontFamily: "Outfit_500Medium",
        fontSize: 10,
        color: "#6B7280",
    },

    // ── Swatch overlay (web hover, non-owned) ──
    // Dark semi-transparent overlay covering the swatch with tooltip + lock icon
    swatchLockOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        alignItems: "center",
        justifyContent: "center",
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    lockTooltip: {
        position: "absolute",
        top: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(15,23,42,0.92)",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        maxWidth: 170,
    },
    lockTooltipTxt: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: "#F1F5F9",
        lineHeight: 15,
        flexShrink: 1,
    },

    // ── Corner lock badge (mobile, non-owned) — always visible ──
    swatchCornerBadge: {
        position: "absolute",
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "rgba(0,0,0,0.50)",
        alignItems: "center",
        justifyContent: "center",
    },

    // ── Web color grid ──
    webGridWrap: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 12,
        marginBottom: 4,
    },
    webColorGrid: { flexDirection: "row", flexWrap: "wrap" },
    webColorGridCard: {
        backgroundColor: "transparent",
        overflow: "hidden",
        padding: 6,
    },
    webColorGridInner: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
        flex: 1,
    },
    webColorGridSwatch: { width: "100%", height: 90 },

    // ── Size grid header (replaces color swatch) ──
    sizeGridHeader: {
        width: "100%",
        height: 72,
        backgroundColor: "#151D4F",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    webSizeGridHeader: {
        width: "100%",
        height: 90,
        backgroundColor: "#151D4F",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    sizeGridCode: {
        fontFamily: "Outfit_700Bold",
        fontSize: 22,
        color: "#FFFFFF",
        letterSpacing: 1,
        maxWidth: "90%",
        textAlign: "center",
    },

    // ── Table ──
    tableScroll: { marginBottom: 4 },
    tableScrollInner: { flexGrow: 1 },
    tableCard: {
        width: "100%",
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
    th: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#6B7280" },
    tr: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    trAlt: { backgroundColor: "#FAFBFC" },
    trHovered: { backgroundColor: "#F0F4FF" },
    td: { fontFamily: "Outfit_500Medium", fontSize: 14, color: "#111827" },
    tdMono: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#374151" },
    tdLight: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#9CA3AF" },

    // Column widths — tightened colDate so Actions sits closer
    colColor: { width: 56 },
    colName: { flex: 2, minWidth: 100, paddingRight: 8 },
    colHex: { width: 90 },
    colCode: { width: 72 },
    colStatus: { width: 88 },
    colDate: { width: 110 },                    // reduced from 96 (text fits) — closes gap
    colActionsHead: { width: 140, textAlign: "right" as const },
    colActions: {
        width: 140,                              // reduced from 160 — matches colActionsHead
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
    },

    // ── Table action buttons (owned row) ──
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
    webActionTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#FFFFFF" },

    // ── Table lock cell (non-owned row) ──
    // Relative container so the tooltip can be positioned absolutely
    tableLockCell: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        flex: 1,
        position: "relative",
    },
    // Tooltip that appears to the left of the lock icon when the row is hovered
    tableLockTooltip: {
        position: "absolute",
        right: 26,                              // sits just left of the lock icon
        backgroundColor: "rgba(15,23,42,0.90)",
        borderRadius: 7,
        paddingHorizontal: 9,
        paddingVertical: 5,
        zIndex: 20,
        // prevent wrapping on most widths
        minWidth: 150,
    },
    tableLockTooltipTxt: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: "#F1F5F9",
        whiteSpace: "nowrap",
    } as any,

    // ── Mobile locked row ──
    mobileLockedRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 10,
    },
    sharedHint: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
    },
    viewOnlyTxt: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
    },

    retryBtn: {
        marginTop: 12,
        backgroundColor: ORANGE_BRAND,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    retryBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#FFFFFF" },
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

    mobileList: { gap: 12, marginBottom: 4 },
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
    sizeCardActions: { flexDirection: "row", gap: 10, marginTop: 12 },
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
    sizeActionTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#FFFFFF" },
});