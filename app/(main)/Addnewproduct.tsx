import React, { useState, useRef, useCallback, useEffect, useSyncExternalStore } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Platform, StatusBar, SafeAreaView, Switch,
    Dimensions, Modal, Animated, Image, Alert, ActivityIndicator,
    type LayoutChangeEvent,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import {
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { AppText } from "@/components/AppText";
import { Checkbox } from "@/lib/seller/sellerComponents";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import {
    SizeCatalogInlineMenu,
    SizeCatalogPickerModal,
    formatSizeOptionLabel,
} from "@/components/product/SizeCatalogPickerModal";
import { useRouter, useFocusEffect } from "expo-router";
import { useResponsive } from "@/hooks/useResponsive";
import { ApiError } from "@/lib/api/client";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import { buildCreateProductPayload, buildUpdateProductPayload } from "@/lib/product/buildCreateProductPayload";
import { enrichVariantsWithCatalogIds } from "@/lib/product/enrichVariantCatalogIds";
import { mapProductDetailToEditForm } from "@/lib/product/mapProductDetailToEditForm";
import {
    findCategorySubForProductSub,
} from "@/lib/product/categoryPaths";
import {
    isSweetsCategory,
    variantDimensionLabels,
    SWEETS_DEFAULT_COLOR,
} from "@/lib/product/sweetsCategory";
import {
    newCustomBuyerField,
    validateCustomBuyerFields,
    CUSTOM_BUYER_FIELD_TYPES,
    type CustomBuyerField,
} from "@/lib/product/customProductFields";
import { calcDiscountPercent } from "@/lib/product/pricing";
import {
    calculateVariantPricingFromStrings,
    mapPricingPreviewToResult,
    resolveDeliveryCharges,
    resolveGstPercentFromCatalog,
    formatInr,
    type DeliveryChargeInfo,
    type VariantPricingResult,
} from "@/lib/product/variantPricing";
import { VariantPriceBreakdown } from "@/lib/product/VariantPriceBreakdown";
import { generateVariantSku } from "@/lib/product/generateVariantSku";
import { parseVariantValidationError, scrollToFieldTarget } from "@/lib/product/scrollToField";
import { scrollViewsToTop } from "@/lib/product/scrollToTop";
import {
    getWebDropActiveKey,
    setWebDropActiveKey,
    subscribeWebDrop,
} from "@/lib/ui/webDropCoordinator";
import { resolveWeightSlab } from "@/lib/product/weightSlab";
import { getHsnForMaterial } from "@/lib/product/materialHsn";
import {
    materialsForProductSubcategory,
    resolveGstForMaterial,
    resolveMaterialOption,
} from "@/lib/product/subcategoryMaterials";
import { uniquePickerOptions } from "@/lib/product/uniquePickerOptions";
import {
    buildCategoryPathOptions,
    buildLeafSubcategoryOptions,
    formatCategoryPath,
    resolveCategoryPathSelection,
    resolveLeafSubcategorySelection,
} from "@/lib/product/categoryPaths";
import {
    CATEGORY_TREE_FALLBACK,
} from "@/lib/product/categoryTreeFallback";
import {
    createProduct,
    updateProduct,
    fetchProductDetail,
    fetchDeliveryChargesForWeight,
    fetchVariantPricingPreview,
    fetchProductFormCatalog,
    type ProductFormCatalog,
} from "@/services/productApi";
import { createSize, fetchSizes } from "@/services/sizeApi";
import { createSizeChart, fetchSizeCharts } from "@/services/sizeChartApi";
import {
    buildSizeChartCache,
    mapFormRowsToApiRows,
    mergeChartIntoCache,
} from "@/lib/product/sizeChartForm";
import { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";
import { fetchSellerProfile, toUiBusinessCategory } from "@/services/sellerProfileApi";
import {
    ensureSellerSizesInCatalog,
} from "@/lib/product/ensureSellerSizesInCatalog";
import {
    applyDeliverySelection,
    applyReturnPolicySelection,
    DELIVERY_OPTIONS,
    RETURN_POLICY_OPTIONS,
} from "@/lib/products/policyPresets";

/** React 19 + RN Animated typing compatibility */
const AnimatedView = Animated.View as React.ComponentType<
    React.ComponentProps<typeof Animated.View>
>;

const { width: SW } = Dimensions.get("window");
const CONTENT_MAX = 1120;

const HIDE_SCROLLBAR_WEB =
    Platform.OS === "web"
        ? ({ scrollbarWidth: "none", msOverflowStyle: "none" } as object)
        : {};

if (Platform.OS === "web" && typeof document !== "undefined") {
    const styleId = "__anp_scrollbar_hide__";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            .anp-hide-scrollbar,
            .anp-hide-scrollbar * {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            .anp-hide-scrollbar::-webkit-scrollbar,
            .anp-hide-scrollbar *::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
            }
        `;
        document.head.appendChild(style);
    }
}

/** Set false before production to start with empty forms */
const PREFILL_WITH_DUMMY = false;

const DUMMY_PRIMARY_IMAGE_URI =
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80";

const getStepScrollContent = (isDesktop: boolean, compactBottom = false) =>
    isDesktop
        ? {
              flexGrow: 0,
              // WebLayout owns horizontal inset (aligns with DesktopHeader)
              paddingHorizontal: 0,
              paddingTop: 24,
              paddingBottom: compactBottom ? 0 : 80,
              width: "100%" as const,
              maxWidth: CONTENT_MAX,
              alignSelf: "center" as const,
              ...(Platform.OS === "web" ? ({ alignSelf: "center", marginHorizontal: "auto" } as object) : {}),
          }
        : { flexGrow: 0, paddingHorizontal: 14, paddingTop: 16, paddingBottom: compactBottom ? 0 : 48 };

function variantHasRequiredImages(variants: { color?: string; images?: string[] }[], variant: { color?: string; images?: string[] }, index: number): boolean {
    if ((variant.images?.length ?? 0) > 0) return true;
    const colorKey = variant.color?.trim().toLowerCase() ?? "";
    if (!colorKey) return false;
    const firstSameColorIdx = variants.findIndex(
        (pv) => pv.color?.trim() && pv.color.trim().toLowerCase() === colorKey,
    );
    if (firstSameColorIdx >= 0 && firstSameColorIdx !== index) {
        return (variants[firstSameColorIdx]?.images?.length ?? 0) > 0;
    }
    return false;
}

const PRODUCT_MANAGEMENT_ROUTE = "/(main)/productmanagement" as const;

// ─── Design Tokens ───────────────────────────────────────────
const C = {
    navy: "#1A2B6D",
    navyDeep: "#0F1A4A",
    navyMid: "#243380",
    navyLight: "#3D52A0",
    navyGhost: "#EEF1FA",
    navyBorder: "#C5CCEA",
    white: "#FFFFFF",
    bg: "#F4F6FB",
    cardBg: "#FFFFFF",
    border: "#E8EBF4",
    inputBg: "#F8F9FD",
    textDark: "#0D1340",
    textMid: "#4B5680",
    textLight: "#9AA3C2",
    textPlaceholder: "#B8BDD6",
    red: "#E53E3E",
    redPale: "#FFF5F5",
    green: "#2ECC71",
    greenPale: "#EAFAF2",
    greenText: "#1A9B52",
    accent1: "#7C3AED",
    accent2: "#0078A8",
    accent3: "#6C3FC5",
    accent4: "#C47D0E",
    accent5: "#1A8A5A",
    toastBg: "#1A2B6D",
    toastErr: "#C0392B",
    amber: "#D97706",
    amberPale: "#FEF3C7",
};

// ─── Data ────────────────────────────────────────────────────
const COLORS_LIST = ["Red", "Blue", "Green", "Black", "White", "Yellow", "Pink", "Purple", "Orange", "Gray"];
const SIZES_LIST = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "28", "30", "32", "34", "36", "38", "40"];

const STEPS = [
    { key: "basic", label: "Basic Info", icon: "information-outline", color: "#7C3AED" },
    { key: "variants", label: "Variants", icon: "tune-variant", color: "#0891B2" },
    { key: "images", label: "Images", icon: "image-multiple-outline", color: "#059669" },
    { key: "details", label: "Details", icon: "clipboard-text-outline", color: "#D97706" },
];

// ─────────────────────────────────────────────────────────────
// SWEET ALERT — Confirm + Success (two-stage)
// ─────────────────────────────────────────────────────────────
type SweetAlertStage = "confirm" | "success";

interface SweetAlertProps {
    visible: boolean;
    stage: SweetAlertStage;
    productName?: string;
    savedProductId?: string | null;
    isSaving?: boolean;
    successTitle?: string;
    successSubtitle?: string;
    doneLabel?: string;
    hideSuccessStats?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    onDone: () => void;
}

// Tiny floating dot for success confetti
const ConfettiDot = ({
    color,
    delay,
    startX,
    startY,
}: {
    color: string;
    delay: number;
    startX: number;
    startY: number;
}) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const anim = Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: startY, duration: 700, useNativeDriver: true }),
                Animated.timing(translateX, { toValue: startX, duration: 700, useNativeDriver: true }),
            ]),
            Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]);
        anim.start();
        return () => anim.stop();
    }, []);

    return (
        <AnimatedView
            style={{
                position: "absolute",
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
            }}
        />
    );
};

const CONFETTI_DOTS = [
    { color: "#F97316", dx: -48, dy: -52, delay: 0 },
    { color: "#7C3AED", dx: 52, dy: -44, delay: 60 },
    { color: "#0891B2", dx: -62, dy: -20, delay: 120 },
    { color: "#059669", dx: 64, dy: -28, delay: 90 },
    { color: "#F59E0B", dx: -32, dy: -70, delay: 30 },
    { color: "#EC4899", dx: 36, dy: -68, delay: 150 },
    { color: "#1A2B6D", dx: -70, dy: 10, delay: 180 },
    { color: "#10B981", dx: 72, dy: 14, delay: 200 },
];

const SweetAlert = ({
    visible,
    stage,
    productName,
    savedProductId,
    isSaving = false,
    successTitle,
    successSubtitle,
    doneLabel,
    hideSuccessStats = false,
    onConfirm,
    onCancel,
    onDone,
}: SweetAlertProps) => {
    // ── Overlay fade
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    // ── Card scale + fade
    const cardScale = useRef(new Animated.Value(0.85)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    // ── Icon ring pulse (confirm)
    const ringScale = useRef(new Animated.Value(0.7)).current;
    const ringOpacity = useRef(new Animated.Value(0)).current;
    // ── Checkmark draw (success)
    const checkScale = useRef(new Animated.Value(0)).current;
    const checkOpacity = useRef(new Animated.Value(0)).current;
    // ── Success icon bg pulse
    const iconBgScale = useRef(new Animated.Value(0.6)).current;
    // ── Text slide in (success)
    const textSlide = useRef(new Animated.Value(20)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    // ── Show confetti dots
    const [showConfetti, setShowConfetti] = useState(false);
    // ── Confetti key to remount on each show
    const [confettiKey, setConfettiKey] = useState(0);

    useEffect(() => {
        if (visible) {
            // Reset all
            overlayOpacity.setValue(0);
            cardScale.setValue(0.85);
            cardOpacity.setValue(0);
            ringScale.setValue(0.7);
            ringOpacity.setValue(0);
            checkScale.setValue(0);
            checkOpacity.setValue(0);
            iconBgScale.setValue(0.6);
            textSlide.setValue(20);
            textOpacity.setValue(0);
            setShowConfetti(false);

            // Animate in
            Animated.parallel([
                Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(cardScale, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true }),
                Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
            ]).start(() => {
                if (stage === "confirm") {
                    // Pulse the icon ring
                    Animated.parallel([
                        Animated.spring(ringScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
                        Animated.timing(ringOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
                    ]).start();
                } else {
                    // Success: icon bg + checkmark + text + confetti
                    Animated.spring(iconBgScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
                    Animated.sequence([
                        Animated.delay(100),
                        Animated.parallel([
                            Animated.spring(checkScale, { toValue: 1, tension: 70, friction: 6, useNativeDriver: true }),
                            Animated.timing(checkOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                        ]),
                    ]).start();
                    Animated.sequence([
                        Animated.delay(200),
                        Animated.parallel([
                            Animated.timing(textSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
                            Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                        ]),
                    ]).start();
                    setTimeout(() => {
                        setConfettiKey((k) => k + 1);
                        setShowConfetti(true);
                    }, 120);
                }
            });
        } else {
            setShowConfetti(false);
        }
    }, [visible, stage]);

    const animateOut = (cb: () => void) => {
        Animated.parallel([
            Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(cardOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(cardScale, { toValue: 0.9, duration: 180, useNativeDriver: true }),
        ]).start(cb);
    };

    if (!visible) return null;

    return (
        <Modal visible transparent animationType="none" onRequestClose={onCancel}>
            <AnimatedView style={[sa.overlay, { opacity: overlayOpacity }]}>
                <AnimatedView
                    style={[
                        sa.card,
                        {
                            opacity: cardOpacity,
                            transform: [{ scale: cardScale }],
                        },
                    ]}
                >
                    {stage === "confirm" ? (
                        /* ── CONFIRM STAGE ───────────────────────── */
                        <>
                            {/* Icon */}
                            <View style={sa.iconWrap}>
                                <AnimatedView
                                    style={[
                                        sa.iconRing,
                                        { transform: [{ scale: ringScale }], opacity: ringOpacity },
                                    ]}
                                />
                                <View style={sa.iconCircleConfirm}>
                                    <MaterialCommunityIcons
                                        name="content-save-check-outline"
                                        size={34}
                                        color="#fff"
                                    />
                                </View>
                            </View>

                            {/* Text */}
                            <AppText style={sa.title}>Save Product?</AppText>
                            <AppText style={sa.subtitle}>
                                {productName
                                    ? `"${productName}" will be submitted for review. Once approved, it goes live on the marketplace.`
                                    : "Your product will be submitted for review. Once approved, it goes live on the marketplace."}
                            </AppText>

                            {/* Info pill */}
                            <View style={sa.infoPill}>
                                <MaterialCommunityIcons name="clock-fast" size={14} color={C.accent4} />
                                <AppText style={sa.infoPillTxt}>
                                    Approval typically takes 24–48 hours
                                </AppText>
                            </View>

                            {/* Actions */}
                            <View style={sa.btnRow}>
                                <TouchableOpacity
                                    style={sa.cancelBtn}
                                    onPress={() => animateOut(onCancel)}
                                    activeOpacity={0.8}
                                    disabled={isSaving}
                                >
                                    <AppText style={sa.cancelTxt}>Cancel</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[sa.confirmBtn, isSaving && { opacity: 0.75 }]}
                                    onPress={onConfirm}
                                    activeOpacity={0.88}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <MaterialCommunityIcons name="check" size={18} color="#fff" />
                                    )}
                                    <AppText style={sa.confirmTxt}>
                                        {isSaving ? "Saving…" : "Yes, Save"}
                                    </AppText>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        /* ── SUCCESS STAGE ───────────────────────── */
                        <>
                            {/* Confetti dots */}
                            {showConfetti && (
                                <View style={sa.confettiAnchor} pointerEvents="none">
                                    {CONFETTI_DOTS.map((d, i) => (
                                        <ConfettiDot
                                            key={`${confettiKey}-${i}`}
                                            color={d.color}
                                            delay={d.delay}
                                            startX={d.dx}
                                            startY={d.dy}
                                        />
                                    ))}
                                </View>
                            )}

                            {/* Animated icon */}
                            <View style={sa.iconWrap}>
                                <AnimatedView
                                    style={[
                                        sa.iconCircleSuccess,
                                        { transform: [{ scale: iconBgScale }] },
                                    ]}
                                >
                                    <AnimatedView
                                        style={{
                                            opacity: checkOpacity,
                                            transform: [{ scale: checkScale }],
                                        }}
                                    >
                                        <MaterialCommunityIcons
                                            name="check-bold"
                                            size={38}
                                            color="#fff"
                                        />
                                    </AnimatedView>
                                </AnimatedView>
                            </View>

                            {/* Text */}
                            <AnimatedView
                                style={{
                                    opacity: textOpacity,
                                    transform: [{ translateY: textSlide }],
                                    alignItems: "center",
                                }}
                            >
                                <AppText style={sa.successTitle}>{successTitle ?? "Product Saved!"}</AppText>
                                <AppText style={sa.successSubtitle}>
                                    {successSubtitle ??
                                        (productName
                                            ? `"${productName}" has been submitted for review.`
                                            : "Your product has been submitted for review.") +
                                            (savedProductId ? `\nProduct ID: ${savedProductId}` : "") +
                                            "\nYou'll be notified once it goes live."}
                                </AppText>

                                {/* Stats row */}
                                {!hideSuccessStats ? (
                                <View style={sa.statsRow}>
                                    {[
                                        { icon: "clock-check-outline", label: "24–48 hr approval", color: C.accent4 },
                                        { icon: "storefront-outline", label: "Goes live after approval", color: C.accent5 },
                                    ].map((item) => (
                                        <View key={item.label} style={sa.statChip}>
                                            <MaterialCommunityIcons
                                                name={item.icon as any}
                                                size={14}
                                                color={item.color}
                                            />
                                            <AppText style={[sa.statChipTxt, { color: item.color }]}>
                                                {item.label}
                                            </AppText>
                                        </View>
                                    ))}
                                </View>
                                ) : null}
                            </AnimatedView>

                            {/* Done button */}
                            <AnimatedView style={{ opacity: textOpacity, width: "100%", marginTop: 24 }}>
                                <TouchableOpacity
                                    style={sa.doneBtn}
                                    onPress={() => animateOut(onDone)}
                                    activeOpacity={0.88}
                                >
                                    <AppText style={sa.doneTxt}>{doneLabel ?? "Go to Products"}</AppText>
                                    <Ionicons name="arrow-forward" size={17} color="#fff" />
                                </TouchableOpacity>
                            </AnimatedView>
                        </>
                    )}
                </AnimatedView>
            </AnimatedView>
        </Modal>
    );
};

const sa = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(10,20,60,0.55)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    card: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: C.white,
        borderRadius: 28,
        paddingHorizontal: 28,
        paddingTop: 36,
        paddingBottom: 28,
        alignItems: "center",
        shadowColor: "#0F1A4A",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.22,
        shadowRadius: 40,
        elevation: 28,
    },
    // ── Confirm icon ─────────────────────────────────────────
    iconWrap: {
        width: 90,
        height: 90,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 22,
    },
    iconRing: {
        position: "absolute",
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        borderColor: C.accent5 + "40",
        backgroundColor: C.accent5 + "12",
    },
    iconCircleConfirm: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: C.accent5,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: C.accent5,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.38,
        shadowRadius: 16,
        elevation: 10,
    },
    // ── Success icon ─────────────────────────────────────────
    iconCircleSuccess: {
        width: 82,
        height: 82,
        borderRadius: 41,
        backgroundColor: C.green,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: C.green,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.42,
        shadowRadius: 20,
        elevation: 12,
    },
    // ── Confetti anchor (centered on icon) ───────────────────
    confettiAnchor: {
        position: "absolute",
        top: 72,
        alignSelf: "center",
        width: 0,
        height: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    // ── Confirm text ─────────────────────────────────────────
    title: {
        fontFamily: fontFamilies.bold,
        fontSize: 22,
        color: C.textDark,
        textAlign: "center",
        marginBottom: 10,
        letterSpacing: 0.1,
    },
    subtitle: {
        fontFamily: fontFamilies.regular,
        fontSize: 14,
        color: C.textMid,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    infoPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: "#FEF3C7",
        borderRadius: 50,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "#FCD34D",
        marginBottom: 24,
    },
    infoPillTxt: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 12,
        color: C.accent4,
    },
    // ── Buttons ───────────────────────────────────────────────
    btnRow: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    cancelBtn: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: C.border,
        backgroundColor: C.bg,
    },
    cancelTxt: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 15,
        color: C.textMid,
    },
    confirmBtn: {
        flex: 1.6,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: C.accent5,
        shadowColor: C.accent5,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    confirmTxt: {
        fontFamily: fontFamilies.bold,
        fontSize: 15,
        color: C.white,
    },
    // ── Success text ─────────────────────────────────────────
    successTitle: {
        fontFamily: fontFamilies.bold,
        fontSize: 24,
        color: C.textDark,
        textAlign: "center",
        marginBottom: 10,
        letterSpacing: 0.1,
    },
    successSubtitle: {
        fontFamily: fontFamilies.regular,
        fontSize: 14,
        color: C.textMid,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 18,
        paddingHorizontal: 4,
    },
    statsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "center",
    },
    statChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: C.bg,
        borderRadius: 50,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: C.border,
    },
    statChipTxt: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 11.5,
    },
    doneBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 15,
        borderRadius: 14,
        backgroundColor: C.navy,
        width: "100%",
        shadowColor: C.navyDeep,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
        elevation: 8,
    },
    doneTxt: {
        fontFamily: fontFamilies.bold,
        fontSize: 15,
        color: C.white,
    },
});

// ─────────────────────────────────────────────────────────────
// TOAST SYSTEM (right → left slide in)
// ─────────────────────────────────────────────────────────────
type ToastItem = { id: number; message: string; type: "error" | "success" };

let toastIdCounter = 0;

const ToastContainer = ({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: number) => void }) => {
    const { isDesktop } = useResponsive();
    return (
        <View style={[ts.container, isDesktop && ts.containerDesktop]} pointerEvents="none">
            {toasts.map((t) => (
                <ToastBubble key={t.id} item={t} onRemove={onRemove} />
            ))}
        </View>
    );
};

const ToastBubble = ({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) => {
    const translateX = useRef(new Animated.Value(SW + 20)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(translateX, { toValue: SW + 20, duration: 280, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
            ]).start(() => onRemove(item.id));
        }, 2800);

        return () => clearTimeout(timer);
    }, []);

    const bg = item.type === "error" ? C.toastErr : C.accent5;

    return (
        <AnimatedView style={[ts.bubble, { backgroundColor: bg, transform: [{ translateX }], opacity }]}>
            <View style={ts.iconWrap}>
                <MaterialCommunityIcons
                    name={item.type === "error" ? "alert-circle-outline" : "check-circle-outline"}
                    size={18} color={C.white}
                />
            </View>
            <AppText style={ts.msg} numberOfLines={2}>{item.message}</AppText>
        </AnimatedView>
    );
};

const ts = StyleSheet.create({
    container: {
        position: "absolute", top: 90, right: 0, left: 0,
        zIndex: 9999, alignItems: "flex-end", paddingRight: 14, gap: 8,
    },
    containerDesktop: {
        top: 24,
        left: "auto",
        right: 0,
        paddingRight: 32,
        maxWidth: 420,
        alignSelf: "flex-end",
    },
    bubble: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 14, maxWidth: SW * 0.82,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22, shadowRadius: 12, elevation: 10,
        borderTopRightRadius: 4,
    },
    iconWrap: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center", justifyContent: "center",
    },
    msg: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.white, flex: 1, lineHeight: 18 },
});

// ─── useToast hook ────────────────────────────────────────────
function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: "error" | "success" = "error") => {
        const id = ++toastIdCounter;
        setToasts(p => [...p, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(p => p.filter(t => t.id !== id));
    }, []);

    const showErrors = useCallback((errors: string[]) => {
        errors.forEach((msg, i) => {
            setTimeout(() => showToast(msg, "error"), i * 150);
        });
    }, [showToast]);

    return { toasts, showToast, showErrors, removeToast };
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────
const validateBasicInfo = (data: any): string[] => {
    const e: string[] = [];
    if (!data.name?.trim()) e.push("Product Name is required");
    if (!data.category) e.push("Category is required");
    if (!data.categorySubName?.trim() && data.categorySubId == null) {
        e.push("Category (middle level) is required");
    }
    if (!data.subcategory) e.push("Subcategory is required");
    if (!data.materialType) e.push("Material Type is required");
    if (!data.hsnCode?.trim()) e.push("HSN Code is required");
    if (!data.shortDesc?.trim()) e.push("Short Description is required");
    if (!data.fullDesc?.trim()) e.push("Full Description is required");
    if (!data.length?.trim()) e.push("Length (cm) is required");
    if (!data.width?.trim()) e.push("Width (cm) is required");
    if (!data.height?.trim()) e.push("Height (cm) is required");
    if (!data.weight?.trim()) e.push("Weight (kg) is required");
    if (data.customized) {
        e.push(...validateCustomBuyerFields(data.custCustomFields ?? []));
    }
    return e;
};

const validateVariants = (variants: any[], opts?: { sweets?: boolean }): string[] => {
    const e: string[] = [];
    const sweets = opts?.sweets === true;
    const sizeWord = sweets ? "Weight" : "Size";
    variants.forEach((v, i) => {
        const n = i + 1;
        if (!sweets && !v.color) e.push(`Variant #${n}: Color is required`);
        if (!v.size) e.push(`Variant #${n}: ${sizeWord} is required`);
        if (!v.stock?.trim()) e.push(`Variant #${n}: Stock Qty is required`);
        if (!v.mrp?.trim()) e.push(`Variant #${n}: MRP is required`);
        if (!v.sellingPrice?.trim()) e.push(`Variant #${n}: Selling Price is required`);
        if (!variantHasRequiredImages(variants, v, i)) {
            e.push(`Variant #${n}: At least one image is required`);
        }
    });
    return e;
};

const validateImages = (data: any): string[] => {
    const e: string[] = [];
    if (!data.primaryImage) e.push("Primary product image is required");
    return e;
};

const validateDetails = (data: any): string[] => {
    const e: string[] = [];
    if (!data.returnPolicy) e.push("Return Policy is required");
    if (!data.deliveryOption) e.push("Delivery Option is required");
    if (!data.codEnabled && !data.onlinePayEnabled) e.push("Payment option is required");
    return e;
};

// ─────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────
const Card = ({ children, style, onLayout, zIndex, ...props }: any) => {
    const { isDesktop } = useResponsive();
    return <View onLayout={onLayout} style={[at.card, isDesktop && ds.card, style, Platform.OS === 'web' && zIndex !== undefined && { zIndex }]} {...props}>{children}</View>;
};

const SecHead = ({ icon, title, accent = C.accent1 }: { icon: string; title: string; accent?: string }) => (
    <View style={[at.secHead, { borderLeftColor: accent }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={accent} />
        <AppText style={[at.secHeadText, { color: accent }]}>{title}</AppText>
    </View>
);

const Lbl = ({ text, required, compact }: { text: string; required?: boolean; compact?: boolean }) => (
    <AppText style={[at.lbl, compact && { marginTop: 0 }]}>{text}{required && <AppText style={{ color: C.red }}> *</AppText>}</AppText>
);

const Field = ({ placeholder, value, onChangeText, keyboardType = "default", multiline = false, lines = 1, maxLength, prefix, suffix, hasError, editable = true }: any) => {
    const [focused, setFocused] = useState(false);
    const { isDesktop } = useResponsive();
    return (
        <View style={[at.fieldWrap, isDesktop && ds.fieldWrap, focused && at.fieldFocused, focused && isDesktop && ds.fieldFocused, multiline && { height: lines * (isDesktop ? 24 : 22) + (isDesktop ? 30 : 26), alignItems: "flex-start" }, hasError && at.fieldError, !editable && at.fieldReadOnly]}>
            {prefix && <AppText style={at.fieldPfx}>{prefix}</AppText>}
            <TextInput
                style={[at.fieldInput, multiline && { textAlignVertical: "top", paddingTop: 10 }, !editable && at.fieldInputReadOnly]}
                placeholder={placeholder}
                placeholderTextColor={C.textPlaceholder}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                multiline={multiline}
                maxLength={maxLength}
                editable={editable}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            {suffix && <AppText style={at.fieldSfx}>{suffix}</AppText>}
        </View>
    );
};

const Drop = ({ placeholder, value, onPress, hasError, options, onSelect, dropKey, disabled, renderMenu, onClear }: any) => {
    const [localOpen, setLocalOpen] = useState(false);
    const dropRootRef = useRef<View>(null);
    const { isDesktop } = useResponsive();
    const activeWebDropKey = useSyncExternalStore(subscribeWebDrop, getWebDropActiveKey, () => null);
    const hasOptions = Array.isArray(options) && options.length > 0;
    /** Prefer bottom-sheet onPress when provided; otherwise open inline menu on all breakpoints.
     *  Absolute inline menus overlap adjacent fields on mobile — use bottom sheet (onPress) there.
     *  Also support custom renderMenu (size catalog) on desktop / when no onPress. */
    const usesInlineMenu =
        (typeof renderMenu === "function" || hasOptions) &&
        (isDesktop || typeof onPress !== "function");
    const usesSharedWebDrop = Platform.OS === "web" && usesInlineMenu && !!dropKey;
    const open = usesSharedWebDrop ? activeWebDropKey === dropKey : localOpen;
    const menuMaxHeight = typeof renderMenu === "function" ? 360 : 280;
    const canClear = typeof onClear === "function" && !!String(value ?? "").trim() && !disabled;

    const closeDrop = () => {
        if (usesSharedWebDrop) setWebDropActiveKey(null);
        else setLocalOpen(false);
    };

    const toggleDrop = () => {
        if (disabled) return;
        if (usesSharedWebDrop) {
            setWebDropActiveKey(open ? null : dropKey);
        } else {
            setLocalOpen((prev) => !prev);
        }
    };

    const handlePress = () => {
        if (disabled) return;
        if (usesInlineMenu) {
            toggleDrop();
            return;
        }
        if (onPress) onPress();
    };

    useEffect(() => {
        if (Platform.OS !== "web" || !open || !usesSharedWebDrop) return;

        const handlePointerDown = (event: MouseEvent) => {
            const node = dropRootRef.current as unknown as HTMLElement | null;
            if (node?.contains(event.target as Node)) return;
            setWebDropActiveKey(null);
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [open, usesSharedWebDrop]);

    const menuItems = hasOptions ? options : [];
    const menuContent =
        typeof renderMenu === "function"
            ? renderMenu(closeDrop)
            : menuItems.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <AppText style={{ fontSize: 13, color: C.textLight, fontFamily: fontFamilies.medium }}>No options available</AppText>
        </View>
    ) : (
        menuItems.map((opt: string, idx: number) => (
            <TouchableOpacity
                key={idx}
                style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: value === opt ? C.navyGhost : "transparent" }}
                onPress={() => { if (onSelect) onSelect(opt); closeDrop(); }}
            >
                <AppText style={{ fontFamily: value === opt ? fontFamilies.semiBold : fontFamilies.medium, fontSize: 13.5, color: value === opt ? C.navy : C.textMid }}>{opt}</AppText>
            </TouchableOpacity>
        ))
    );

    return (
        <View ref={dropRootRef} style={{ zIndex: open ? 200 : 1, position: "relative" }}>
            <View style={[at.drop, hasError && at.fieldError, disabled && at.dropDisabled, open && { borderColor: C.navy }]}>
                <TouchableOpacity
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 }}
                    onPress={handlePress}
                    activeOpacity={disabled ? 1 : 0.85}
                    disabled={disabled}
                >
                    <AppText style={[at.dropText, !value && at.dropPh]} numberOfLines={1}>{value || placeholder}</AppText>
                </TouchableOpacity>
                {canClear ? (
                    <TouchableOpacity
                        onPress={() => {
                            closeDrop();
                            onClear();
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginRight: 2, padding: 2 }}
                        accessibilityLabel="Clear selection"
                    >
                        <Ionicons name="close-circle" size={18} color={C.textLight} />
                    </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={handlePress} disabled={disabled} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                    <Ionicons name={open ? "chevron-up" : "chevron-down"} size={15} color={C.textLight} />
                </TouchableOpacity>
            </View>
            {usesInlineMenu && open && !disabled && (
                <>
                    {Platform.OS === "web" && !usesSharedWebDrop ? (
                        <TouchableOpacity style={{ position: "fixed" as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} activeOpacity={1} onPress={closeDrop} />
                    ) : null}
                    <View
                        style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            marginTop: 4,
                            backgroundColor: C.white,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: C.border,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 12,
                            elevation: 8,
                            zIndex: 201,
                            maxHeight: menuMaxHeight,
                            overflow: "hidden",
                        }}
                        {...(Platform.OS === "web"
                            ? { className: "anp-hide-scrollbar" as any }
                            : {})}
                    >
                        <ScrollView
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                            style={[{ maxHeight: menuMaxHeight }, HIDE_SCROLLBAR_WEB]}
                            {...(Platform.OS === "web"
                                ? {
                                    className: "anp-hide-scrollbar" as any,
                                    onWheel: (e: { stopPropagation: () => void }) => e.stopPropagation(),
                                }
                                : {})}
                        >
                            {canClear ? (
                                <TouchableOpacity
                                    style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}
                                    onPress={() => { onClear(); closeDrop(); }}
                                >
                                    <AppText style={{ fontFamily: fontFamilies.semiBold, fontSize: 13.5, color: C.red }}>Clear selection</AppText>
                                </TouchableOpacity>
                            ) : null}
                            {menuContent}
                        </ScrollView>
                    </View>
                </>
            )}
        </View>
    );
};

const Divider = () => <View style={at.divider} />;
const Hint = ({ text }: { text: string }) => <AppText style={at.hint}>{text}</AppText>;
const CC = ({ cur, max }: { cur: number; max: number }) => <AppText style={at.cc}>{cur}/{max}</AppText>;

// ─── Picker Modal ─────────────────────────────────────────────
const PM = ({ visible, title, options, selected, onSelect, onClose, onClear }: any) => {
    const { isDesktop } = useResponsive();
    const items = uniquePickerOptions(options ?? []);
    const canClear = typeof onClear === "function" && !!String(selected ?? "").trim();
    return (
    <Modal visible={visible} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={onClose}>
        <View style={[pm.overlay, isDesktop && pm.overlayCenter]}>
            <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={[pm.sheet, isDesktop && pm.popup]}>
                {!isDesktop && <View style={pm.drag} />}
                <View style={pm.hdr}>
                    <AppText style={pm.title}>{title}</AppText>
                    <TouchableOpacity onPress={onClose} style={pm.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={18} color={C.textMid} />
                    </TouchableOpacity>
                </View>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    style={[isDesktop ? pm.listDesktop : undefined, HIDE_SCROLLBAR_WEB]}
                    {...(Platform.OS === "web" ? { className: "anp-hide-scrollbar" as any } : {})}
                >
                    {canClear ? (
                        <TouchableOpacity
                            style={[pm.item, isDesktop && pm.itemDesktop]}
                            onPress={() => { onClear(); onClose(); }}
                        >
                            <AppText style={[pm.itemTxt, { color: C.red, fontFamily: fontFamilies.semiBold }]}>Clear selection</AppText>
                        </TouchableOpacity>
                    ) : null}
                    {items.map((opt: string, index: number) => (
                        <TouchableOpacity key={`${title}-${index}-${opt}`} style={[pm.item, isDesktop && pm.itemDesktop, selected === opt && pm.itemOn]} onPress={() => { onSelect(opt); onClose(); }}>
                            <AppText style={[pm.itemTxt, selected === opt && pm.itemTxtOn]}>{opt}</AppText>
                            {selected === opt && <View style={pm.chk}><Ionicons name="checkmark" size={13} color={C.white} /></View>}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    </Modal>
    );
};

const pm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(30,40,90,0.22)" },
    overlayCenter: { justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(10,20,60,0.35)" },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: { position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "65%", backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 36, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 24 },
    popup: {
        position: "relative",
        bottom: undefined,
        left: undefined,
        right: undefined,
        width: "100%",
        maxWidth: 380,
        maxHeight: "75%",
        borderRadius: 20,
        paddingBottom: 16,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 32,
        elevation: 28,
        zIndex: 2,
        backgroundColor: C.white,
        overflow: "hidden",
    },
    listDesktop: {
        maxHeight: 280,
        ...HIDE_SCROLLBAR_WEB,
    },
    drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 6 },
    hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    title: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
    itemDesktop: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    itemOn: { backgroundColor: C.navyGhost },
    itemTxt: { fontFamily: fontFamilies.medium, fontSize: 14, color: C.textMid },
    itemTxtOn: { fontFamily: fontFamilies.semiBold, color: C.navy },
    chk: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
});

/** Inline picker for use inside FormPopupModal (avoids nested Modal issues on web) */
const InlinePicker = ({
    visible,
    title,
    options,
    selected,
    onSelect,
    onClose,
}: {
    visible: boolean;
    title: string;
    options: string[];
    selected: string;
    onSelect: (v: string) => void;
    onClose: () => void;
}) => {
    if (!visible) return null;
    const items = uniquePickerOptions(options ?? []);
    return (
        <View style={fp.inlinePickerWrap} pointerEvents="box-none">
            <TouchableOpacity style={fp.inlinePickerBackdrop} activeOpacity={1} onPress={onClose} />
            <View style={fp.inlinePickerSheet}>
                <View style={fp.inlinePickerHdr}>
                    <AppText style={fp.inlinePickerTitle}>{title}</AppText>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={18} color={C.textMid} />
                    </TouchableOpacity>
                </View>
                <ScrollView
                    style={[
                        fp.inlinePickerList,
                        HIDE_SCROLLBAR_WEB,
                    ]}
                    contentContainerStyle={fp.inlinePickerListContent}
                    bounces={false}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    {...(Platform.OS === "web"
                        ? {
                            className: "anp-hide-scrollbar" as any,
                            onWheel: (e: any) => e.stopPropagation(),
                        }
                        : {})}
                >
                    {items.map((opt, index) => (
                        <TouchableOpacity
                            key={`${title}-${index}-${opt}`}
                            style={[fp.inlinePickerItem, selected === opt && fp.inlinePickerItemOn]}
                            onPress={() => {
                                onSelect(opt);
                                onClose();
                            }}
                        >
                            <AppText style={[fp.inlinePickerItemTxt, selected === opt && fp.inlinePickerItemTxtOn]}>
                                {opt}
                            </AppText>
                            {selected === opt && (
                                <View style={pm.chk}>
                                    <Ionicons name="checkmark" size={13} color={C.white} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
};

// ─── Rich Text Editor ─────────────────────────────────────────
type Format = { bold: boolean; italic: boolean; underline: boolean; heading: "none" | "h1" | "h2" | "h3" };
const defaultFormat: Format = { bold: false, italic: false, underline: false, heading: "none" };

const RichEditor = ({ placeholder, value, onChangeText, maxLength, hasError }: any) => {
    const [fmt, setFmt] = useState<Format>(defaultFormat);
    const [focused, setFocused] = useState(false);

    const toggle = (key: keyof Format, val?: any) => {
        setFmt(f => {
            if (key === "heading") return { ...f, heading: f.heading === val ? "none" : val };
            return { ...f, [key]: !f[key] };
        });
    };

    const insertText = (insertion: string) => onChangeText(value + insertion);

    const textStyle: any = {
        fontFamily: fmt.bold ? "Outfit_700Bold" : "Outfit_400Regular",
        fontStyle: fmt.italic ? "italic" : "normal",
        textDecorationLine: fmt.underline ? "underline" : "none",
        fontSize: fmt.heading === "h1" ? 20 : fmt.heading === "h2" ? 16 : fmt.heading === "h3" ? 14 : 13,
        color: C.textDark,
    };

    const ToolBtn = ({ label, active, onPress, icon }: any) => (
        <TouchableOpacity style={[at.tbBtn, active && { backgroundColor: C.navy, borderRadius: 6 }]} onPress={onPress} activeOpacity={0.7}>
            {icon
                ? <MaterialCommunityIcons name={icon} size={14} color={active ? C.white : C.textMid} />
                : <AppText style={[at.tbTxt,
                label === "B" && { fontFamily: fontFamilies.bold },
                label === "I" && { fontStyle: "italic" },
                label === "U" && { textDecorationLine: "underline" },
                active && { color: C.white },
                ]}>{label}</AppText>
            }
        </TouchableOpacity>
    );

    return (
        <View style={[at.edCard, focused && { borderColor: C.navy }, hasError && { borderColor: C.red }]}>
            <View style={at.toolbar}>
                <ToolBtn label="B" active={fmt.bold} onPress={() => toggle("bold")} />
                <ToolBtn label="I" active={fmt.italic} onPress={() => toggle("italic")} />
                <ToolBtn label="U" active={fmt.underline} onPress={() => toggle("underline")} />
                <View style={at.tbSep} />
                <ToolBtn label="H1" active={fmt.heading === "h1"} onPress={() => toggle("heading", "h1")} />
                <ToolBtn label="H2" active={fmt.heading === "h2"} onPress={() => toggle("heading", "h2")} />
                <ToolBtn label="H3" active={fmt.heading === "h3"} onPress={() => toggle("heading", "h3")} />
                <View style={at.tbSep} />
                <ToolBtn icon="format-list-bulleted" active={false} onPress={() => insertText("\n• ")} />
                <ToolBtn icon="format-list-numbered" active={false} onPress={() => insertText("\n1. ")} />
                <ToolBtn icon="link" active={false} onPress={() => insertText("[link](url)")} />
            </View>
            <TextInput
                style={[at.edInput, textStyle, { minHeight: 72 }]}
                placeholder={placeholder}
                placeholderTextColor={C.textPlaceholder}
                value={value}
                onChangeText={onChangeText}
                multiline
                maxLength={maxLength}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            <View style={at.edFoot}><CC cur={(value || "").length} max={maxLength} /></View>
        </View>
    );
};

// ─────────────────────────────────────────────────────────────
// CUSTOMIZATION IMAGE PICKER
// ─────────────────────────────────────────────────────────────
const CustImagePicker = ({ uri, onPick, onRemove, hasError }: {
    uri: string | null;
    onPick: (uri: string) => void;
    onRemove: () => void;
    hasError?: boolean;
}) => {
    const [sourceModal, setSourceModal] = useState(false);

    const requestAndPick = async (source: "camera" | "gallery") => {
        setSourceModal(false);
        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed to take a photo."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) onPick(result.assets[0].uri);
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed to pick a photo."); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) onPick(result.assets[0].uri);
        }
    };

    return (
        <>
            {uri ? (
                <View style={cp.previewWrap}>
                    <Image source={{ uri }} style={cp.previewImg} resizeMode="cover" />
                    <View style={cp.previewOverlay}>
                        <TouchableOpacity style={cp.changeBtn} onPress={() => setSourceModal(true)}>
                            <MaterialCommunityIcons name="image-edit-outline" size={14} color={C.white} />
                            <AppText style={cp.changeTxt}>Change</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity style={cp.removeBtn} onPress={onRemove}>
                            <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
                            <AppText style={cp.removeTxt}>Remove</AppText>
                        </TouchableOpacity>
                    </View>
                    <View style={cp.checkBadge}>
                        <MaterialCommunityIcons name="check-circle" size={20} color={C.green} />
                    </View>
                </View>
            ) : (
                <TouchableOpacity
                    style={[cp.uploadBox, hasError && { borderColor: C.red, backgroundColor: "#FFF8F8" }]}
                    onPress={() => setSourceModal(true)}
                    activeOpacity={0.75}
                >
                    <View style={cp.uploadIconWrap}>
                        <MaterialCommunityIcons name="image-plus" size={28} color={C.navyLight} />
                    </View>
                    <AppText style={cp.uploadTitle}>Tap to upload reference image</AppText>
                    <AppText style={cp.uploadSub}>JPG · PNG · WebP · Max 5 MB</AppText>
                </TouchableOpacity>
            )}
            <ImageSourcePickerModal
                visible={sourceModal}
                onClose={() => setSourceModal(false)}
                title="Choose Image Source"
                onCamera={() => requestAndPick("camera")}
                onGallery={() => requestAndPick("gallery")}
            />
        </>
    );
};

const cp = StyleSheet.create({
    uploadBox: { marginTop: 10, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, gap: 6, backgroundColor: C.inputBg },
    uploadIconWrap: { width: 56, height: 56, borderRadius: 14, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    uploadTitle: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textMid, textAlign: "center" },
    uploadSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, textAlign: "center" },
    previewWrap: { marginTop: 10, borderRadius: 14, overflow: "hidden", height: 180, position: "relative" },
    previewImg: { width: "100%", height: "100%" },
    previewOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 8, padding: 10, backgroundColor: "rgba(10,20,60,0.55)" },
    changeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
    changeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    removeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(220,50,50,0.55)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,100,100,0.3)" },
    removeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    checkBadge: { position: "absolute", top: 10, right: 10, backgroundColor: C.white, borderRadius: 12 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(10,20,60,0.3)" },
    modalOverlayCenter: { justifyContent: "center", alignItems: "center", padding: 24 },
    modalBackdrop: { ...StyleSheet.absoluteFillObject },
    modalSheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: C.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 40,
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 24,
    },
    modalPopup: {
        position: "relative",
        bottom: undefined,
        left: undefined,
        right: undefined,
        width: "100%",
        maxWidth: 440,
        borderRadius: 20,
        paddingTop: 20,
        paddingBottom: 24,
        paddingHorizontal: 24,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
        elevation: 28,
        zIndex: 2,
    },
    modalDrag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 18 },
    modalHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    modalTitle: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.textDark, marginBottom: 16 },
    modalTitleDesktop: { fontSize: 18, marginBottom: 0, flex: 1 },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: C.bg,
        alignItems: "center",
        justifyContent: "center",
    },
    modalOption: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    modalOptionDesktop: {
        borderBottomWidth: 0,
        borderRadius: 14,
        paddingHorizontal: 14,
        marginBottom: 10,
        backgroundColor: C.inputBg,
        borderWidth: 1,
        borderColor: C.border,
    },
    modalIconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    modalOptTitle: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textDark },
    modalOptSub: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, marginTop: 2 },
    modalCancel: { marginTop: 18, alignItems: "center", paddingVertical: 14, borderWidth: 1.2, borderColor: C.border, borderRadius: 14 },
    modalCancelDesktop: { marginTop: 8 },
    modalCancelTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid },
});

const ImageSourcePickerModal = ({
    visible,
    onClose,
    title,
    onCamera,
    onGallery,
    galleryHint = "Pick from your photo library",
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    onCamera: () => void;
    onGallery: () => void;
    galleryHint?: string;
}) => {
    const { isDesktop } = useResponsive();

    return (
        <Modal
            visible={visible}
            transparent
            animationType={isDesktop ? "fade" : "slide"}
            onRequestClose={onClose}
        >
            <View style={[cp.modalOverlay, isDesktop && cp.modalOverlayCenter]}>
                <TouchableOpacity style={cp.modalBackdrop} activeOpacity={1} onPress={onClose} />
                <View style={[cp.modalSheet, isDesktop && cp.modalPopup]}>
                    {!isDesktop && <View style={cp.modalDrag} />}
                    {isDesktop ? (
                        <View style={cp.modalHeaderRow}>
                            <AppText style={[cp.modalTitle, cp.modalTitleDesktop]}>{title}</AppText>
                            <TouchableOpacity style={cp.modalCloseBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close" size={20} color={C.textMid} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <AppText style={cp.modalTitle}>{title}</AppText>
                    )}
                    <TouchableOpacity
                        style={[cp.modalOption, isDesktop && cp.modalOptionDesktop]}
                        onPress={onCamera}
                        activeOpacity={0.85}
                    >
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EEF1FA" }]}>
                            <MaterialCommunityIcons name="camera-outline" size={22} color={C.navy} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <AppText style={cp.modalOptTitle}>Take a Photo</AppText>
                            <AppText style={cp.modalOptSub}>Use your camera right now</AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[cp.modalOption, isDesktop && cp.modalOptionDesktop]}
                        onPress={onGallery}
                        activeOpacity={0.85}
                    >
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EDFAF4" }]}>
                            <MaterialCommunityIcons name="image-outline" size={22} color={C.accent5} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <AppText style={cp.modalOptTitle}>Choose from Gallery</AppText>
                            <AppText style={cp.modalOptSub}>{galleryHint}</AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[cp.modalCancel, isDesktop && cp.modalCancelDesktop]}
                        onPress={onClose}
                        activeOpacity={0.85}
                    >
                        <AppText style={cp.modalCancelTxt}>Cancel</AppText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ─── Responsive form popup (centered desktop · bottom sheet mobile) ───
const FormPopupModal = ({
    visible,
    onClose,
    title,
    children,
    overlay,
    wide = false,
    accentHeader = false,
    headerIcon = "ruler-square",
}: {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    overlay?: React.ReactNode;
    wide?: boolean;
    accentHeader?: boolean;
    headerIcon?: string;
}) => {
    const { isDesktop } = useResponsive();

    return (
        <Modal
            visible={visible}
            transparent
            animationType={isDesktop ? "fade" : "slide"}
            onRequestClose={onClose}
        >
            <View style={[fp.overlay, isDesktop && fp.overlayCenter]}>
                <TouchableOpacity style={fp.backdrop} activeOpacity={1} onPress={onClose} />
                <View
                    style={[
                        fp.sheet,
                        isDesktop && fp.popup,
                        isDesktop && wide && fp.popupWide,
                        fp.sheetOverflow,
                    ]}
                >
                    {!isDesktop && !accentHeader && <View style={fp.drag} />}
                    <View style={[fp.headerRow, accentHeader && fp.headerRowAccent]}>
                        {accentHeader && (
                            <MaterialCommunityIcons
                                name={headerIcon as any}
                                size={22}
                                color={C.white}
                            />
                        )}
                        <AppText
                            style={[
                                fp.title,
                                isDesktop && fp.titleDesktop,
                                accentHeader && fp.titleAccent,
                            ]}
                            numberOfLines={2}
                        >
                            {title}
                        </AppText>
                        <TouchableOpacity
                            style={[fp.closeBtn, accentHeader && fp.closeBtnAccent]}
                            onPress={onClose}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close" size={20} color={accentHeader ? C.white : C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={[
                            fp.bodyScroll,
                            Platform.OS === "web"
                                ? ({ scrollbarWidth: "none", msOverflowStyle: "none" } as object)
                                : null,
                        ]}
                        contentContainerStyle={fp.bodyContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >
                        {children}
                    </ScrollView>
                    {overlay}
                </View>
            </View>
        </Modal>
    );
};

const fp = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(10,20,60,0.35)" },
    overlayCenter: { justifyContent: "center", alignItems: "center", padding: 24 },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: "88%",
        backgroundColor: C.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: Platform.OS === "ios" ? 28 : 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
        elevation: 24,
    },
    popup: {
        position: "relative",
        bottom: undefined,
        left: undefined,
        right: undefined,
        width: "100%",
        maxWidth: 480,
        maxHeight: "85%",
        borderRadius: 20,
        paddingBottom: 24,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 32,
        elevation: 28,
        zIndex: 2,
    },
    popupWide: { maxWidth: 720 },
    sheetOverflow: { overflow: "hidden" },
    inlinePickerWrap: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 20,
        justifyContent: "flex-end",
    },
    inlinePickerBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(10,20,60,0.35)",
    },
    inlinePickerSheet: {
        maxHeight: "55%",
        backgroundColor: C.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderTopWidth: 1,
        borderTopColor: C.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 16,
    },
    inlinePickerHdr: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    inlinePickerTitle: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark, flex: 1 },
    inlinePickerList: { maxHeight: 280, flexGrow: 0 },
    inlinePickerListContent: { paddingBottom: 8 },
    inlinePickerItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    inlinePickerItemOn: { backgroundColor: C.navyGhost },
    inlinePickerItemTxt: { fontFamily: fontFamilies.medium, fontSize: 14, color: C.textMid },
    inlinePickerItemTxtOn: { fontFamily: fontFamilies.semiBold, color: C.navy },
    headerRowAccent: {
        backgroundColor: C.accent4,
        borderBottomWidth: 0,
        paddingTop: 16,
        paddingBottom: 16,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    titleAccent: { color: C.white, flex: 1 },
    closeBtnAccent: {
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    drag: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.border,
        alignSelf: "center",
        marginTop: 12,
        marginBottom: 8,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        gap: 12,
    },
    title: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.textDark, flex: 1 },
    titleDesktop: { fontSize: 18 },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: C.bg,
        alignItems: "center",
        justifyContent: "center",
    },
    bodyScroll: { flexGrow: 0 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    footerRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: C.border,
    },
    footerRowDesktop: { justifyContent: "flex-end" },
    footerBtnSecondary: {
        flex: 1,
        maxWidth: 160,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.2,
        borderColor: C.border,
        backgroundColor: C.white,
    },
    footerBtnPrimary: {
        flex: 1,
        maxWidth: 180,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: C.navy,
    },
    footerBtnAccent: { backgroundColor: C.accent4 },
    footerBtnPrimaryFull: { maxWidth: undefined },
    footerBtnTxtSecondary: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid },
    footerBtnTxtPrimary: { fontFamily: fontFamilies.bold, fontSize: 14, color: C.white },
});

const DEFAULT_SIZE_CHART_OPTIONS: string[] = [];

const MEASUREMENT_UNIT_OPTIONS = ["Centimetres (cm)", "Inches (in)"] as const;
const DEFAULT_CHART_UNIT = MEASUREMENT_UNIT_OPTIONS[0];

type SizeChartRow = {
    id: string;
    size: string;
    chest: string;
    waist: string;
    hip: string;
    length: string;
    sleeve: string;
};

let sizeRowId = 0;
const newRowId = () => `sz-${++sizeRowId}-${Date.now()}`;

const emptySizeRow = (size = ""): SizeChartRow => ({
    id: newRowId(),
    size,
    chest: "",
    waist: "",
    hip: "",
    length: "",
    sleeve: "",
});

const SIZE_TABLE_COLS = [
    { key: "size" as const, label: "Size", width: 140, placeholder: "Select" },
    { key: "chest" as const, label: "Chest/Bust", width: 88, placeholder: "34-36" },
    { key: "waist" as const, label: "Waist", width: 80, placeholder: "28-30" },
    { key: "hip" as const, label: "Hip", width: 80, placeholder: "36-38" },
    { key: "length" as const, label: "Length", width: 72, placeholder: "28" },
    { key: "sleeve" as const, label: "Sleeve", width: 80, placeholder: "32-34" },
];

// ─────────────────────────────────────────────────────────────
// STEP 1 — Basic Info
// ─────────────────────────────────────────────────────────────
const StepBasicInfo = ({ data, onChange, errors, validationTrigger, catalog, isDesktop = false, scrollRef: externalScrollRef, editProductId }: any) => {
    const [catPick, setCatPick] = useState(false);
    const [matPick, setMatPick] = useState(false);

    const internalScrollRef = useRef<ScrollView>(null);
    const scrollRef = externalScrollRef ?? internalScrollRef;
    const cardLayouts = useRef<Record<string, number>>({});
    const fieldLayouts = useRef<Record<string, number>>({});
    const fieldRefs = useRef<Record<string, any>>({});

    useEffect(() => {
        if (validationTrigger <= 0 || !errors?.length) return;

        const getFieldKeyFromError = (error: string): string | null => {
            const err = error.toLowerCase();
            if (err.includes("product name") || err.includes("name is required")) return "name";
            if (err.includes("subcategory")) return "subcategory";
            if (err.includes("category")) return "category";
            if (err.includes("material")) return "materialType";
            if (err.includes("hsn")) return "hsnCode";
            if (err.includes("short description")) return "shortDesc";
            if (err.includes("full description")) return "fullDesc";
            if (err.includes("length")) return "length";
            if (err.includes("width")) return "width";
            if (err.includes("height")) return "height";
            if (err.includes("weight")) return "weight";
            if (err.includes("customization field") || err.includes("customer field")) return "custCustomFields";
            return null;
        };

        const timer = setTimeout(() => {
            const fieldKey = getFieldKeyFromError(errors[0]);
            if (!fieldKey) return;

            const targetRef = fieldRefs.current[fieldKey];
            const containerRef = scrollRef.current;
            if (targetRef) {
                scrollToFieldTarget(targetRef, containerRef, 15);
                return;
            }

            let cardKey = "";
            if (["name", "category", "subcategory", "materialType", "hsnCode"].includes(fieldKey)) {
                cardKey = "identity";
            } else if (["shortDesc", "fullDesc"].includes(fieldKey)) {
                cardKey = "desc";
            } else if (["length", "width", "height"].includes(fieldKey)) {
                cardKey = "dimensions";
            } else if (fieldKey === "weight") {
                cardKey = "weight";
            } else if (fieldKey === "custCustomFields") {
                cardKey = "custom";
            }

            const cardY = cardLayouts.current[cardKey] || 0;
            const fieldY = fieldLayouts.current[fieldKey] || 0;
            containerRef?.scrollTo({ y: Math.max(0, cardY + fieldY - 15), animated: true });
        }, 120);

        return () => clearTimeout(timer);
    }, [errors, validationTrigger]);

    const categoryPathOptions = buildCategoryPathOptions(catalog, CATEGORY_TREE_FALLBACK);
    const categoryDisplay = formatCategoryPath(data.category, data.categorySubName ?? "");
    const leafSubcategoryOptions = buildLeafSubcategoryOptions(
        catalog,
        data.category,
        data.categorySubName ?? "",
        CATEGORY_TREE_FALLBACK
    );
    const subcategoryEnabled = Boolean(data.category && data.categorySubName);
    const selectCategoryPath = (label: string) => {
        const resolved = resolveCategoryPathSelection(label, catalog);
        onChange("category", resolved.category);
        onChange("categoryId", resolved.categoryId);
        onChange("categorySubId", resolved.categorySubId);
        onChange("categorySubName", resolved.categorySubName);
        onChange("materialType", "");
        onChange("hsnCode", "");
        onChange("gstPercentage", "");
        const leaves = buildLeafSubcategoryOptions(
            catalog,
            resolved.category,
            resolved.categorySubName,
            CATEGORY_TREE_FALLBACK
        );
        if (leaves.length === 0) {
            onChange("subcategory", resolved.categorySubName);
            onChange("subcategoryId", resolved.categorySubId);
        } else {
            onChange("subcategory", "");
            onChange("subcategoryId", null);
        }
    };
    const selectSubcategory = (leafName: string) => {
        const resolved = resolveLeafSubcategorySelection(
            data.category,
            data.categorySubName ?? "",
            leafName,
            catalog
        );
        onChange("subcategory", resolved.subcategory);
        onChange("subcategoryId", resolved.subcategoryId);
        onChange("materialType", "");
        onChange("hsnCode", "");
        onChange("gstPercentage", "");
    };
    const materialCatalog = materialsForProductSubcategory(
        catalog,
        data.category,
        data.categorySubName ?? "",
        data.subcategory ?? "",
    );
    const materialOptions = materialCatalog.map((m) => m.material);
    const materialEnabled = materialOptions.length > 0;
    const applyMaterial = (materialName: string) => {
        onChange("materialType", materialName);
        const option = resolveMaterialOption(materialCatalog, materialName);
        if (option?.hsnCode) {
            onChange("hsnCode", option.hsnCode);
        } else {
            const hsn = getHsnForMaterial(materialName);
            if (hsn) onChange("hsnCode", hsn);
        }
        const gst = resolveGstForMaterial(materialCatalog, materialName);
        if (gst != null) onChange("gstPercentage", String(gst));
    };
    const hasErr = (field: string) => errors.some((e: string) => e.toLowerCase().includes(field.toLowerCase()));

    return (
        <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={isDesktop}
            style={isDesktop ? ds.stepScroll : undefined}
            contentContainerStyle={getStepScrollContent(isDesktop, true)}
        >
            <Card zIndex={100} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['identity'] = e.nativeEvent.layout.y; }}>
                {editProductId || data.id ? (
                    <View style={eb.idBadge}>
                        <AppText style={eb.idBadgeLbl}>Product ID</AppText>
                        <AppText style={eb.idBadgeVal}>{data.id || editProductId}</AppText>
                        <View style={eb.idBadgeDot} />
                        <AppText style={eb.idBadgeStatus}>Active</AppText>
                    </View>
                ) : null}
                <SecHead icon="tag-outline" title="Product Identity" accent={C.accent1} />
                <Divider />
                <View ref={el => { fieldRefs.current['name'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['name'] = e.nativeEvent.layout.y; }}>
                    <Lbl text="Product Name" required />
                    <Field
                        placeholder="Enter product name"
                        value={data.name}
                        onChangeText={(v: string) => onChange("name", v)}
                        hasError={hasErr("product name")}
                    />
                </View>
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 20 }]} onLayout={(e: LayoutChangeEvent) => {
                    const y = e.nativeEvent.layout.y;
                    fieldLayouts.current['category'] = y;
                    fieldLayouts.current['subcategory'] = y;
                }}>
                    <View ref={el => { fieldRefs.current['category'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="Main Category > Category" required />
                        <Drop placeholder="Select main category > category" value={categoryDisplay} onPress={() => setCatPick(true)} hasError={hasErr("category")} options={categoryPathOptions} onSelect={selectCategoryPath} />
                    </View>
                    <View ref={el => { fieldRefs.current['subcategory'] = el; }} style={{ flex: 1, ...(Platform.OS === 'web' ? { zIndex: 30 } : {}) }}>
                        <Lbl text="Subcategory" required />
                        <Drop
                            dropKey="basic-subcategory"
                            placeholder="Select subcategory"
                            value={data.subcategory}
                            disabled={!subcategoryEnabled}
                            hasError={hasErr("subcategory")}
                            options={leafSubcategoryOptions}
                            onSelect={selectSubcategory}
                        />
                    </View>
                </View>
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 10 }]} onLayout={(e: LayoutChangeEvent) => {
                    const y = e.nativeEvent.layout.y;
                    fieldLayouts.current['materialType'] = y;
                    fieldLayouts.current['hsnCode'] = y;
                }}>
                    <View ref={el => { fieldRefs.current['materialType'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="Material Type" required />
                        <Drop
                            placeholder={materialEnabled ? "Select material" : "Select subcategory first"}
                            value={data.materialType}
                            onPress={() => materialEnabled && setMatPick(true)}
                            disabled={!materialEnabled}
                            hasError={hasErr("material")}
                            options={materialOptions}
                            onSelect={applyMaterial}
                        />
                        <Hint text={materialEnabled ? "Materials available for the selected subcategory" : "Choose a subcategory to load materials from catalog"} />
                    </View>
                    <View ref={el => { fieldRefs.current['hsnCode'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="HSN Code" required />
                        <View style={[at.hsnWrap, hasErr("hsn") && at.fieldError]}>
                            <MaterialCommunityIcons name="barcode-scan" size={15} color={C.navyLight} style={{ marginRight: 6 }} />
                            <TextInput
                                style={at.hsnInput}
                                placeholder="e.g. 6109"
                                placeholderTextColor={C.textPlaceholder}
                                value={data.hsnCode}
                                onChangeText={(v: string) => onChange("hsnCode", v)}
                                keyboardType="numeric"
                                maxLength={8}
                            />
                        </View>
                        <Hint text="Auto-filled from material; edit if your product uses a different HSN" />
                    </View>
                </View>
            </Card>

            <Card zIndex={90} style={{ marginTop: 12 }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['desc'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="text-box-edit-outline" title="Descriptions" accent={C.accent2} />
                <Divider />
                <View ref={el => { fieldRefs.current['shortDesc'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['shortDesc'] = e.nativeEvent.layout.y; }}>
                    <Lbl text="Short Description" required />
                    <RichEditor
                        placeholder="Short, punchy summary of your product…"
                        value={data.shortDesc}
                        onChangeText={(v: string) => onChange("shortDesc", v)}
                        maxLength={250}
                        hasError={hasErr("short description")}
                    />
                </View>
                <View style={{ height: 14 }} />
                <View ref={el => { fieldRefs.current['fullDesc'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['fullDesc'] = e.nativeEvent.layout.y; }}>
                    <Lbl text="Full Description" required />
                    <RichEditor
                        placeholder="Full product description, features, highlights…"
                        value={data.fullDesc}
                        onChangeText={(v: string) => onChange("fullDesc", v)}
                        maxLength={2000}
                        hasError={hasErr("full description")}
                    />
                </View>
            </Card>

            <Card zIndex={80} style={{ marginTop: 12 }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['dimensions'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="cube-scan" title="Product Dimensions" accent={C.accent3} />
                <Divider />
                <AppText style={at.cardHint}>Enter gross dimensions (including packaging)</AppText>
                <View style={at.row3} onLayout={(e: LayoutChangeEvent) => {
                    const y = e.nativeEvent.layout.y;
                    fieldLayouts.current['length'] = y;
                    fieldLayouts.current['width'] = y;
                    fieldLayouts.current['height'] = y;
                }}>
                    {([["Length cm", "length", "30"], ["Width cm", "width", "20"], ["Height cm", "height", "10"]] as [string, string, string][]).map(([lbl, key, ph]) => (
                        <View key={key} ref={el => { fieldRefs.current[key] = el; }} style={{ flex: 1 }}>
                            <Lbl text={lbl} required />
                            <Field
                                placeholder={ph}
                                value={data[key]}
                                onChangeText={(v: string) => onChange(key, v)}
                                keyboardType="numeric"
                                hasError={hasErr(key)}
                            />
                        </View>
                    ))}
                </View>
            </Card>

            <Card zIndex={70} style={{ marginTop: 12 }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['weight'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="weight-kilogram" title="Weight & Delivery" accent={C.accent4} />
                <Divider />
                <AppText style={at.cardHint}>Enter gross weight (including packaging)</AppText>
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 10 }]} onLayout={(e: LayoutChangeEvent) => {
                    fieldLayouts.current['weight'] = e.nativeEvent.layout.y;
                }}>
                    <View ref={el => { fieldRefs.current['weight'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="Weight (kg)" required />
                        <Field
                            placeholder="e.g. 0.5"
                            value={data.weight}
                            onChangeText={(v: string) => onChange("weight", v)}
                            keyboardType="decimal-pad"
                            hasError={hasErr("weight")}
                        />
                        <Hint text="Auto-calculates delivery charges" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Weight Slab" />
                        <Drop placeholder="Auto-selected" value={data.weightSlab} onPress={() => { }} />
                        <Hint text="Based on entered weight" />
                    </View>
                </View>
                {data.customDeliveryCharge ? (
                    <Hint text="Custom delivery pricing applies for this weight slab." />
                ) : data.weightSlab ? (
                    <View style={[at.row2, { marginTop: 8 }]}>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Intra-city charge (₹)" />
                            <Field value={String(data.intraCityCharge ?? "")} editable={false} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Metro-metro charge (₹)" />
                            <Field value={String(data.metroMetroCharge ?? "")} editable={false} />
                        </View>
                    </View>
                ) : null}
                <Divider />
                <Lbl text="Fragile Item?" required />
                <View style={at.radioRow}>
                    {(["Yes", "No"] as const).map(opt => (
                        <TouchableOpacity key={opt} style={[at.radioPill, data.fragile === opt && at.radioPillOn]} onPress={() => onChange("fragile", opt)}>
                            <View style={[at.radioDot, data.fragile === opt && at.radioDotOn]} />
                            <AppText style={[at.radioPillTxt, data.fragile === opt && at.radioPillTxtOn]}>{opt}</AppText>
                        </TouchableOpacity>
                    ))}
                </View>
                <Hint text="Mark if special protective packaging is required" />
            </Card>

            <Card zIndex={60} style={{ marginTop: 12, marginBottom: 0, alignSelf: "flex-start", width: "100%", ...(isDesktop ? { paddingBottom: 14 } : { paddingBottom: 12 }) }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['custom'] = e.nativeEvent.layout.y; }}>
                <AppText style={at.custSectionTitle}>Customized Product</AppText>
                <View ref={el => { fieldRefs.current['custCustomFields'] = el; }}>
                    <Checkbox
                        checked={!!data.customized}
                        onToggle={() => {
                            const next = !data.customized;
                            onChange("customized", next);
                            if (next && !(data.custCustomFields?.length)) {
                                onChange("custCustomFields", [newCustomBuyerField()]);
                            }
                        }}
                        label="This is a customized product – customer will provide details (e.g. images, text) after placing the order"
                        accentColor={C.navy}
                    />
                </View>

                {data.customized && (
                    <View style={at.custFieldsBox}>
                        <AppText style={at.custFieldsHint}>
                            Add the fields you need from the customer (e.g. Reference Images, Size details, Text/Instructions). They will fill these after ordering.
                        </AppText>

                        {(data.custCustomFields ?? []).map((field: CustomBuyerField, index: number) => (
                            <View key={field.id} style={at.custFieldRow}>
                                <View style={at.custFieldNameWrap}>
                                    <Field
                                        placeholder="Field name (e.g. Reference Images)"
                                        value={field.name}
                                        onChangeText={(v: string) => {
                                            const next = (data.custCustomFields ?? []).map((f: CustomBuyerField) =>
                                                f.id === field.id ? { ...f, name: v } : f
                                            );
                                            onChange("custCustomFields", next);
                                        }}
                                        maxLength={120}
                                        hasError={hasErr(`customization field #${index + 1}`)}
                                    />
                                </View>
                                <View style={at.custFieldTypeWrap}>
                                    <Drop
                                        placeholder="Type"
                                        value={field.type}
                                        options={[...CUSTOM_BUYER_FIELD_TYPES]}
                                        dropKey={`cust-field-type-${field.id}`}
                                        onSelect={(v: string) => {
                                            const next = (data.custCustomFields ?? []).map((f: CustomBuyerField) =>
                                                f.id === field.id ? { ...f, type: v as CustomBuyerField["type"] } : f
                                            );
                                            onChange("custCustomFields", next);
                                        }}
                                    />
                                    {(field.type === "File" || field.type === "Image") && (
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                                            <Ionicons name="cloud-upload-outline" size={16} color={C.navy} />
                                            <AppText style={{ fontSize: 12, color: C.textMid, fontFamily: fontFamilies.medium }}>
                                                Buyer uploads a {field.type === "Image" ? "image" : "file"} after ordering
                                            </AppText>
                                        </View>
                                    )}
                                </View>
                                <View style={at.custFieldReqWrap}>
                                    <Checkbox
                                        checked={field.required}
                                        onToggle={() => {
                                            const next = (data.custCustomFields ?? []).map((f: CustomBuyerField) =>
                                                f.id === field.id ? { ...f, required: !f.required } : f
                                            );
                                            onChange("custCustomFields", next);
                                        }}
                                        label="Required"
                                        accentColor={C.navy}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={at.custFieldDeleteBtn}
                                    onPress={() => onChange("custCustomFields", (data.custCustomFields ?? []).filter((f: CustomBuyerField) => f.id !== field.id))}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="trash-2" size={16} color={C.red} />
                                </TouchableOpacity>
                            </View>
                        ))}

                        <TouchableOpacity
                            style={at.custAddFieldBtn}
                            onPress={() => onChange("custCustomFields", [...(data.custCustomFields ?? []), newCustomBuyerField()])}
                            activeOpacity={0.85}
                        >
                            <Feather name="plus" size={16} color={C.white} />
                            <AppText style={at.custAddFieldBtnTxt}>Add field</AppText>
                        </TouchableOpacity>
                    </View>
                )}
            </Card>

            <PM
                visible={catPick}
                title="Select Main Category > Category"
                options={categoryPathOptions}
                selected={categoryDisplay}
                onSelect={selectCategoryPath}
                onClose={() => setCatPick(false)}
            />
            <PM
                visible={matPick}
                title="Select Material"
                options={materialOptions}
                selected={data.materialType}
                onSelect={applyMaterial}
                onClose={() => setMatPick(false)}
            />
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// REUSABLE IMAGE PICKER GRID
// ─────────────────────────────────────────────────────────────
const MAX_IMAGES = 6;

function isLightHex(hex: string): boolean {
    const h = hex.replace("#", "").trim();
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return false;
    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}

const ColorSelectField = ({
    placeholder,
    value,
    hex,
    hasError,
    onPress,
}: {
    placeholder: string;
    value: string;
    hex?: string;
    hasError?: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        style={[at.drop, hasError && at.fieldError]}
        onPress={onPress}
        activeOpacity={0.85}
    >
        {value && hex ? (
            <View style={cpm.selectedRow}>
                <View style={[cpm.colorDot, { backgroundColor: hex }, isLightHex(hex) && cpm.colorDotBorder]} />
                <AppText style={at.dropText} numberOfLines={1}>{value}</AppText>
            </View>
        ) : (
            <AppText style={[at.dropText, at.dropPh]} numberOfLines={1}>{placeholder}</AppText>
        )}
        <Ionicons name="chevron-down" size={15} color={C.textLight} />
    </TouchableOpacity>
);

const ColorPickerModal = ({
    visible,
    colors,
    selected,
    onSelect,
    onClose,
}: {
    visible: boolean;
    colors: { id: number; name: string; hex: string }[];
    selected: string;
    onSelect: (color: { id: number; name: string; hex: string }) => void;
    onClose: () => void;
}) => {
    const { isDesktop } = useResponsive();
    return (
        <Modal visible={visible} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={onClose}>
            <View style={[cpm.overlay, isDesktop && cpm.overlayCenter]}>
                <TouchableOpacity style={cpm.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[cpm.sheet, isDesktop && cpm.popup]}>
                    {!isDesktop && <View style={cpm.drag} />}
                    <View style={cpm.hdr}>
                        <AppText style={cpm.title}>Select Color</AppText>
                        <TouchableOpacity onPress={onClose} style={cpm.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={18} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={cpm.scroll}
                        contentContainerStyle={cpm.grid}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        {...(Platform.OS === "web"
                            ? { onWheel: (e: { stopPropagation: () => void }) => e.stopPropagation() }
                            : {})}
                    >
                        {colors.map((color) => {
                            const isOn = selected === color.name;
                            return (
                                <TouchableOpacity
                                    key={color.id}
                                    style={[cpm.item, isOn && cpm.itemOn]}
                                    onPress={() => { onSelect(color); onClose(); }}
                                    activeOpacity={0.8}
                                >
                                    <View style={[cpm.circle, { backgroundColor: color.hex }, isLightHex(color.hex) && cpm.colorDotBorder, isOn && cpm.circleOn]}>
                                        {isOn ? <Ionicons name="checkmark" size={18} color={isLightHex(color.hex) ? C.textDark : C.white} /> : null}
                                    </View>
                                    <AppText style={[cpm.itemTxt, isOn && cpm.itemTxtOn]} numberOfLines={2}>{color.name}</AppText>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const cpm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(30,40,90,0.22)" },
    overlayCenter: { justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(10,20,60,0.35)" },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: { position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "70%", backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 24 },
    popup: { position: "relative", bottom: undefined, left: undefined, right: undefined, width: "100%", maxWidth: 360, maxHeight: "80%", borderRadius: 20, paddingBottom: 12, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 32, elevation: 28, zIndex: 2, backgroundColor: C.white, overflow: "hidden" },
    drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 6 },
    hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    title: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    scroll: Platform.OS === "web"
        ? ({ maxHeight: 360, overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" } as object)
        : { maxHeight: 360 },
    grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 },
    item: { width: "25%", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 2 },
    itemOn: {},
    circle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    circleOn: { borderWidth: 2.5, borderColor: C.navy },
    colorDot: { width: 18, height: 18, borderRadius: 9 },
    colorDotBorder: { borderWidth: 1, borderColor: C.border },
    selectedRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    itemTxt: { fontFamily: fontFamilies.medium, fontSize: 10, color: C.textMid, textAlign: "center" },
    itemTxtOn: { fontFamily: fontFamilies.semiBold, color: C.navy },
});

const ImagePickerGrid = ({
    images, onAdd, onRemove, maxCount = MAX_IMAGES, unlimited = false, hasError = false, label = "Add Photo",
}: {
    images: string[]; onAdd: (uris: string[]) => void; onRemove: (index: number) => void;
    maxCount?: number; unlimited?: boolean; hasError?: boolean; label?: string;
}) => {
    const [srcModal, setSrcModal] = useState(false);
    const effectiveLimit = unlimited ? null : maxCount;

    const pickImages = async (source: "camera" | "gallery") => {
        setSrcModal(false);
        if (!unlimited && effectiveLimit != null && images.length >= effectiveLimit) return;

        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed to take a photo."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) onAdd([result.assets[0].uri]);
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed to pick photos."); return; }
            const remaining = unlimited ? 0 : Math.max(0, (effectiveLimit ?? MAX_IMAGES) - images.length);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: unlimited || remaining > 1,
                selectionLimit: unlimited ? 0 : remaining,
                quality: 0.85,
            });
            if (!result.canceled && result.assets?.length) onAdd(result.assets.map((a: any) => a.uri));
        }
    };

    const canAdd = unlimited || images.length < (effectiveLimit ?? MAX_IMAGES);

    return (
        <>
            <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 6 }}
                style={{ marginTop: 10 }}
            >
                {canAdd && (
                    <TouchableOpacity
                        style={[ipg.addSlot, hasError && images.length === 0 && { borderColor: C.red, backgroundColor: "#FFF8F8" }]}
                        onPress={() => setSrcModal(true)} activeOpacity={0.75}
                    >
                        <View style={ipg.addIcon}>
                            <MaterialCommunityIcons name="camera-plus-outline" size={22} color={C.navyLight} />
                        </View>
                        <AppText style={ipg.addTxt}>{label}</AppText>
                    </TouchableOpacity>
                )}
                {images.map((uri, i) => (
                    <View key={uri + i} style={ipg.thumb}>
                        <Image source={{ uri }} style={ipg.thumbImg} resizeMode="cover" />
                        {i === 0 && (
                            <View style={ipg.primaryBadge}>
                                <AppText style={ipg.primaryTxt}>Primary</AppText>
                            </View>
                        )}
                        <TouchableOpacity style={ipg.removeBtn} onPress={() => onRemove(i)}>
                            <Ionicons name="close" size={11} color={C.white} />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
            {images.length > 0 && (
                <AppText style={ipg.hint}>First image is used as primary · tap × to remove</AppText>
            )}
            <ImageSourcePickerModal
                visible={srcModal}
                onClose={() => setSrcModal(false)}
                title="Add Image"
                onCamera={() => pickImages("camera")}
                onGallery={() => pickImages("gallery")}
                galleryHint={unlimited ? "Pick one or more photos" : `Pick up to ${(effectiveLimit ?? MAX_IMAGES) - images.length} photo${(effectiveLimit ?? MAX_IMAGES) - images.length !== 1 ? "s" : ""}`}
            />
        </>
    );
};

const ipg = StyleSheet.create({
    addSlot: { width: 90, height: 90, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: C.inputBg },
    addIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    addTxt: { fontFamily: fontFamilies.semiBold, fontSize: 10, color: C.navyLight, textAlign: "center" },
    addCount: { fontFamily: fontFamilies.regular, fontSize: 9, color: C.textLight },
    thumb: { width: 90, height: 90, borderRadius: 14, overflow: "hidden", position: "relative" },
    thumbImg: { width: "100%", height: "100%" },
    primaryBadge: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(26,43,109,0.72)", paddingVertical: 3, alignItems: "center" },
    primaryTxt: { fontFamily: fontFamilies.semiBold, fontSize: 9, color: C.white, letterSpacing: 0.4 },
    removeBtn: { position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(200,30,30,0.85)", alignItems: "center", justifyContent: "center" },
    hint: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 6 },
});

// ─────────────────────────────────────────────────────────────
// STEP 2 — Variants
// ─────────────────────────────────────────────────────────────
type Variant = {
    id: string;
    color: string;
    colorId?: number;
    size: string;
    sizeId?: number;
    sku: string;
    stock: string;
    minQuantity?: string;
    mrp: string;
    sellingPrice: string;
    discount: string;
    images: string[];
    videoUrl: string;
};

const StepVariants = ({ variants, setVariants, rmVariant, errors, catalog, productName = "", basicData, isDesktop = false, scrollRef, validationTrigger = 0, onValidationFail, isB2B = false }: any) => {
    const [clrPick, setClrPick] = useState<string | null>(null);
    const [szPick, setSzPick] = useState<string | null>(null);
    const variantCardRefs = useRef<Record<number, View | null>>({});
    const variantFieldRefs = useRef<Record<string, View | null>>({});
    const [variantPricingMap, setVariantPricingMap] = useState<Record<string, {
        pricing: VariantPricingResult;
        delivery: DeliveryChargeInfo;
        commissionPercent: number;
    }>>({});

    const weightKg = parseFloat(String(basicData?.weight ?? "").trim());
    const hasWeight = Number.isFinite(weightKg) && weightKg > 0;

    const catalogColors: { id: number; name: string; hex: string }[] = catalog?.colors ?? [];
    const catalogSizes: { id?: number; name: string; code: string }[] = catalog?.sizes ?? [];
    const sizeOptions = catalogSizes.map((s) => formatSizeOptionLabel(s.name, s.code));
    const sizeLabelForVariant = (v: Variant) => {
        const size = catalogSizes.find(
            (s) => (s.id != null && s.id === v.sizeId) || s.name === v.size || s.code === v.size
        );
        if (!size) return v.size || "";
        return formatSizeOptionLabel(size.name, size.code);
    };
    const sweetsProduct = isSweetsCategory(
        basicData?.category,
        basicData?.categorySubName,
        basicData?.subcategory
    );
    const dimLabels = variantDimensionLabels(sweetsProduct);
    const catalogReady = sweetsProduct
        ? catalogSizes.length > 0
        : catalogColors.length > 0 && catalogSizes.length > 0;

    const fallbackDelivery = resolveDeliveryCharges(
        {
            weight: basicData?.weight,
            intraCityCharge: basicData?.intraCityCharge,
            metroMetroCharge: basicData?.metroMetroCharge,
            customDeliveryCharge: basicData?.customDeliveryCharge,
        },
        catalog?.deliverySlabs,
    );
    const materialGst = parseFloat(String(basicData?.gstPercentage ?? "").trim());
    const productGstPercent = Number.isFinite(materialGst) && materialGst >= 0
        ? materialGst
        : resolveGstPercentFromCatalog(catalog, {
            categorySubId: basicData?.categorySubId,
            categorySubName: basicData?.categorySubName,
            subcategoryId: basicData?.subcategoryId,
            mainCategory: basicData?.category,
        });

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!hasWeight) {
                setVariantPricingMap({});
                return;
            }
            variants.forEach((v: Variant) => {
                const mrpExcl = parseFloat(v.mrp);
                const sellingExcl = parseFloat(v.sellingPrice);
                if (!Number.isFinite(mrpExcl) || !Number.isFinite(sellingExcl) || mrpExcl <= 0 || sellingExcl <= 0) {
                    setVariantPricingMap((prev) => {
                        if (!prev[v.id]) return prev;
                        const next = { ...prev };
                        delete next[v.id];
                        return next;
                    });
                    return;
                }
                fetchVariantPricingPreview({
                    mrpExcl,
                    sellingExcl,
                    weightKg,
                    categorySubId: basicData?.categorySubId ?? null,
                    subcategoryId: basicData?.subcategoryId ?? null,
                    discountOverride: parseFloat(v.discount) || null,
                    gstPercent: productGstPercent,
                })
                    .then((preview) => {
                        setVariantPricingMap((prev) => ({
                            ...prev,
                            [v.id]: {
                                pricing: mapPricingPreviewToResult(preview),
                                delivery: preview.deliveryCustom
                                    ? { intraCity: 0, metroMetro: 0, custom: true }
                                    : {
                                        intraCity: preview.intraCityCharge,
                                        metroMetro: preview.metroMetroCharge,
                                        custom: false,
                                    },
                                commissionPercent: preview.commissionPercent,
                            },
                        }));
                    })
                    .catch(() => {
                        setVariantPricingMap((prev) => {
                            const next = { ...prev };
                            delete next[v.id];
                            return next;
                        });
                    });
            });
        }, 280);
        return () => clearTimeout(timer);
    }, [variants, hasWeight, weightKg, basicData?.categorySubId, basicData?.subcategoryId, basicData?.gstPercentage, productGstPercent]);

    const openColorPicker = (variantId: string) => {
        setSzPick(null);
        setClrPick(variantId);
    };

    const openSizePicker = (variantId: string) => {
        setClrPick(null);
        setSzPick(variantId);
    };

    const hasErr = (id: string, field: string) =>
        errors.some((e: string) =>
            e.toLowerCase().includes(`variant #${variants.findIndex((v: Variant) => v.id === id) + 1}`) &&
            e.toLowerCase().includes(field.toLowerCase())
        );

    const addVariant = () => {
        const validationErrors = validateVariants(variants, { sweets: sweetsProduct });
        if (validationErrors.length > 0) {
            onValidationFail?.(validationErrors);
            return;
        }
        const id = Date.now().toString();
        setVariants((p: Variant[]) => [
            ...p,
            {
                id,
                color: sweetsProduct ? SWEETS_DEFAULT_COLOR : "",
                size: "",
                sku: "",
                stock: "",
                minQuantity: "",
                mrp: "",
                sellingPrice: "",
                discount: "0",
                images: [],
                videoUrl: "",
            },
        ]);
    };

    const addVariantImage = (id: string, uris: string[]) => {
        setVariants((p: Variant[]) => p.map((v: Variant) => {
            if (v.id !== id) return v;
            return { ...v, images: [...v.images, ...uris] };
        }));
    };

    const removeVariantImage = (id: string, index: number) => {
        setVariants((p: Variant[]) => p.map((v: Variant) => {
            if (v.id !== id) return v;
            return { ...v, images: v.images.filter((_, i) => i !== index) };
        }));
    };

    const setVariantFieldRef = (index: number, fieldKey: string) => (el: View | null) => {
        variantFieldRefs.current[`${index}-${fieldKey}`] = el;
    };

    useEffect(() => {
        if (validationTrigger <= 0 || !errors?.length) return;
        const parsed = parseVariantValidationError(errors[0]);
        const timer = setTimeout(() => {
            const container = scrollRef?.current;
            if (!parsed) {
                scrollViewsToTop(container);
                return;
            }

            const fieldTarget = variantFieldRefs.current[`${parsed.index}-${parsed.fieldKey}`];
            const cardTarget = variantCardRefs.current[parsed.index];
            scrollToFieldTarget(fieldTarget ?? cardTarget, container, 16);
        }, 120);
        return () => clearTimeout(timer);
    }, [errors, validationTrigger, scrollRef]);

    const resolveSizeFromLabel = (val: string) =>
        catalogSizes.find(
            (s) =>
                s.name === val ||
                s.code === val ||
                formatSizeOptionLabel(s.name, s.code) === val ||
                `${s.name} (${s.code})` === val
        );

    const resolveSizeCode = (variant: Variant) =>
        catalogSizes.find(
            (s) => s.id === variant.sizeId || s.name === variant.size
        )?.code;

    const withAutoFields = (variant: Variant, index: number): Variant => {
        let next = { ...variant };
        if (sweetsProduct && !String(next.color ?? "").trim()) {
            next.color = SWEETS_DEFAULT_COLOR;
        }
        if (next.color && next.size) {
            next.sku = generateVariantSku(
                productName,
                next.color,
                next.size,
                index + 1,
                resolveSizeCode(next),
            );
        }
        return next;
    };

    const upVariant = (id: string, field: string, value: string | number | undefined) => {
        setVariants((p: Variant[]) => p.map((v: Variant, idx: number) => {
            if (v.id !== id) return v;
            const u = { ...v, [field]: value };
            if (field === "mrp" || field === "sellingPrice") {
                const mrpRaw = field === "mrp" ? value : u.mrp;
                const spRaw = field === "sellingPrice" ? value : u.sellingPrice;
                u.discount = calcDiscountPercent(mrpRaw, spRaw);
            }
            if (field === "color" || field === "size" || field === "colorId" || field === "sizeId") {
                return withAutoFields(u, idx);
            }
            return u;
        }));
    };

    const patchVariant = (id: string, patch: Partial<Variant>) => {
        setVariants((p: Variant[]) => p.map((v: Variant, idx: number) => {
            if (v.id !== id) return v;
            return withAutoFields({ ...v, ...patch }, idx);
        }));
    };

    if (!catalogReady) {
        return (
            <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
                <AppText style={{ fontFamily: "Outfit_500Medium", color: C.textMid }}>
                    {catalog ? "No colors or sizes in your catalog. Add them from product settings first." : "Loading color and size catalog…"}
                </AppText>
            </View>
        );
    }

    return (
        <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={isDesktop}
            style={isDesktop ? ds.stepScroll : undefined}
            contentContainerStyle={getStepScrollContent(isDesktop, true)}
        >
            {variants.map((v: Variant, idx: number) => {
                const firstSameColorIdx = variants.findIndex(
                    (pv: Variant) => pv.color.trim() && pv.color === v.color
                );
                const reuseColorImages = firstSameColorIdx >= 0 && firstSameColorIdx < idx;
                return (
                <View key={v.id} ref={(el) => { variantCardRefs.current[idx] = el; }}>
                <Card zIndex={100 - idx} style={{ marginBottom: 12, alignSelf: "flex-start", width: "100%", ...(isDesktop ? { paddingBottom: 14 } : { paddingBottom: 12 }) }}>
                    <View style={vt.hdr}>
                        <View style={vt.badge}><AppText style={vt.badgeTxt}>#{idx + 1}</AppText></View>
                        <AppText style={vt.title}>Variant</AppText>
                        {variants.length > 1 && (
                            <TouchableOpacity onPress={() => rmVariant(v.id)} style={vt.rmBtn}>
                                <MaterialCommunityIcons name="trash-can-outline" size={15} color={C.red} />
                                <AppText style={vt.rmTxt}>Remove</AppText>
                            </TouchableOpacity>
                        )}
                    </View>
                    <Divider />
                    <View style={[at.row2, Platform.OS === 'web' && { zIndex: 20 }]}>
                        {dimLabels.showColor ? (
                            <View style={{ flex: 1 }} ref={setVariantFieldRef(idx, "color")}>
                                <Lbl text={dimLabels.colorLabel} required />
                                <ColorSelectField
                                    placeholder="Select color"
                                    value={v.color}
                                    {...(() => {
                                        const colorHex = catalogColors.find((c) => c.name === v.color)?.hex;
                                        return colorHex ? { hex: colorHex } : {};
                                    })()}
                                    hasError={hasErr(v.id, "color")}
                                    onPress={() => openColorPicker(v.id)}
                                />
                            </View>
                        ) : null}
                        <View style={{ flex: 1 }} ref={setVariantFieldRef(idx, "size")}>
                            <Lbl text={dimLabels.sizeLabel} required />
                            <Drop
                                dropKey={Platform.OS === "web" ? `variant-${v.id}-size` : undefined}
                                placeholder={dimLabels.sizePlaceholder}
                                value={sizeLabelForVariant(v)}
                                hasError={hasErr(v.id, "size") || hasErr(v.id, "weight")}
                                onPress={() => openSizePicker(v.id)}
                                {...(Platform.OS === "web"
                                    ? {
                                        renderMenu: (close: () => void) => (
                                            <SizeCatalogInlineMenu
                                                sizes={catalogSizes}
                                                selected={sizeLabelForVariant(v)}
                                                onSelect={(val: string) => {
                                                    const size = resolveSizeFromLabel(val);
                                                    patchVariant(v.id, {
                                                        size: size?.name ?? val,
                                                        color: sweetsProduct ? SWEETS_DEFAULT_COLOR : v.color,
                                                        ...(size?.id != null ? { sizeId: size.id } : {}),
                                                    });
                                                    close();
                                                }}
                                            />
                                        ),
                                    }
                                    : {})}
                            />
                        </View>
                    </View>
                    <View style={at.row2}>
                        <View style={{ flex: 1 }}>
                            <View style={vt.lblRow}>
                                <Lbl text="SKU" compact />
                                <View style={vt.auto}><AppText style={vt.autoTxt}>Auto</AppText></View>
                            </View>
                            <Field placeholder="Auto-generated" value={v.sku} editable={false} />
                        </View>
                        <View style={{ flex: 1 }} ref={setVariantFieldRef(idx, "stock")}>
                            <View style={vt.lblRow}>
                                <Lbl text="Stock Qty" required compact />
                            </View>
                            <Field placeholder="0" value={v.stock} onChangeText={(val: string) => upVariant(v.id, "stock", val)} keyboardType="numeric" hasError={hasErr(v.id, "stock")} />
                        </View>
                    </View>
                    {isB2B ? (
                        <View style={{ width: "50%", marginBottom: 8 }}>
                            <Lbl text="Minimun Order Quantity" compact />
                            <Field
                                placeholder="1"
                                value={v.minQuantity ?? ""}
                                onChangeText={(val: string) => upVariant(v.id, "minQuantity", val)}
                                keyboardType="numeric"
                                hasError={hasErr(v.id, "min quantity")}
                            />
                            
                        </View>
                    ) : null}
                    <View style={at.row2}>
                        <View style={{ flex: 1 }} ref={setVariantFieldRef(idx, "mrp")}>
                            <Lbl text="MRP (excl. GST)" required />
                            <Field placeholder="0.00" value={v.mrp} onChangeText={(val: string) => upVariant(v.id, "mrp", val)} keyboardType="decimal-pad" prefix="₹" hasError={hasErr(v.id, "mrp")} />
                            <Hint text="Maximum Retail Price" />
                        </View>
                        <View style={{ flex: 1 }} ref={setVariantFieldRef(idx, "sellingPrice")}>
                            <Lbl text="Selling Price" required />
                            <Field placeholder="0.00" value={v.sellingPrice} onChangeText={(val: string) => upVariant(v.id, "sellingPrice", val)} keyboardType="decimal-pad" prefix="₹" hasError={hasErr(v.id, "selling")} />
                            <Hint text="Your price excl. GST" />
                        </View>
                    </View>
                    <View style={{ width: "50%" }}>
                        <View style={vt.lblRow}>
                            <Lbl text="Discount %" compact />
                            <View style={vt.auto}><AppText style={vt.autoTxt}>Auto</AppText></View>
                        </View>
                        <Field placeholder="0" value={v.discount} keyboardType="numeric" editable={false} suffix="%" />
                        {v.mrp && v.sellingPrice && parseFloat(v.mrp) > parseFloat(v.sellingPrice) ? (
                            <AppText style={vt.saveHint}>
                                Save {formatInr(parseFloat(v.mrp) - parseFloat(v.sellingPrice))} on MRP
                            </AppText>
                        ) : null}
                    </View>

                    <VariantPriceBreakdown
                        pricing={
                            variantPricingMap[v.id]?.pricing ??
                            calculateVariantPricingFromStrings({
                                mrp: v.mrp,
                                sellingPrice: v.sellingPrice,
                                gstPercent: productGstPercent,
                                ...(fallbackDelivery.custom
                                    ? {}
                                    : {
                                        intraCityCharge: fallbackDelivery.intraCity,
                                        metroMetroCharge: fallbackDelivery.metroMetro,
                                    }),
                                discountOverride: parseFloat(v.discount) || null,
                            })
                        }
                        delivery={variantPricingMap[v.id]?.delivery ?? fallbackDelivery}
                        commissionPercent={variantPricingMap[v.id]?.commissionPercent}
                        hasWeight={hasWeight}
                    />

                    <Divider />
                    {!reuseColorImages ? (
                        <View ref={setVariantFieldRef(idx, "images")}>
                            <Lbl text="Variant Images" required />
                            <Hint text="Add as many images as you need · first image is used as primary" />
                            <ImagePickerGrid
                                images={v.images}
                                onAdd={(uris: string[]) => addVariantImage(v.id, uris)}
                                onRemove={(i: number) => removeVariantImage(v.id, i)}
                                unlimited
                                hasError={hasErr(v.id, "image")}
                                label="Add Photo"
                            />
                        </View>
                    ) : (
                        <View style={vt.reuseNote}>
                            <MaterialCommunityIcons name="image-multiple" size={16} color={C.navyLight} />
                            <AppText style={vt.reuseNoteTxt}>
                                Using images from variant #{firstSameColorIdx + 1} ({v.color}) — same colour, different size.
                            </AppText>
                        </View>
                    )}

                </Card>
                </View>
                );
            })}

            <TouchableOpacity style={vt.addBtn} onPress={addVariant}>
                <View style={vt.addIcon}><Ionicons name="add" size={18} color={C.navy} /></View>
                <AppText style={vt.addTxt}>Add Another Variant</AppText>
            </TouchableOpacity>

            <View style={vt.infoBox}>
                <MaterialCommunityIcons name="information-outline" size={16} color={C.navyLight} />
                <AppText style={vt.infoTxt}>Each variant needs color, size, pricing, stock, and at least one image before you can add another variant.</AppText>
            </View>

            <ColorPickerModal
                visible={dimLabels.showColor && !!clrPick}
                colors={catalogColors}
                selected={variants.find((v: Variant) => v.id === clrPick)?.color || ""}
                onSelect={(color) => {
                    if (!clrPick) return;
                    patchVariant(clrPick, { color: color.name, colorId: color.id });
                }}
                onClose={() => setClrPick(null)}
            />
            <SizeCatalogPickerModal
                visible={!!szPick}
                title={dimLabels.sizeSelectTitle}
                sizes={catalogSizes}
                options={sizeOptions}
                selected={(() => {
                    const picked = variants.find((v: Variant) => v.id === szPick);
                    return picked ? sizeLabelForVariant(picked) : "";
                })()}
                onSelect={(val: string) => {
                    if (!szPick) return;
                    const size = resolveSizeFromLabel(val);
                    patchVariant(szPick, {
                        size: size?.name ?? val,
                        color: sweetsProduct ? SWEETS_DEFAULT_COLOR : undefined,
                        ...(size?.id != null ? { sizeId: size.id } : {}),
                    });
                }}
                onClose={() => setSzPick(null)}
            />
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// STEP 3 — Images
// ─────────────────────────────────────────────────────────────
const StepImages = ({ data, onChange, errors, isDesktop = false, scrollRef, validationTrigger = 0 }: any) => {
    const hasErr = errors.some((e: string) => e.toLowerCase().includes("primary"));
    const [srcModal, setSrcModal] = useState(false);
    const primaryBlockRef = useRef<View>(null);

    useEffect(() => {
        if (validationTrigger <= 0 || !errors?.length) return;
        const timer = setTimeout(() => {
            scrollToFieldTarget(primaryBlockRef.current, scrollRef?.current, 16);
        }, 120);
        return () => clearTimeout(timer);
    }, [errors, validationTrigger, scrollRef]);

    const pickPrimaryImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Required", "Gallery access is needed to pick photos.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.85,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
            onChange("primaryImage", result.assets[0].uri);
        }
    };

    const pickVideo = async (source: "camera" | "gallery") => {
        setSrcModal(false);
        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed to record a video."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) {
                onChange("video", result.assets[0].uri);
            }
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed to pick a video."); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) {
                onChange("video", result.assets[0].uri);
            }
        }
    };

    return (
        <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={isDesktop}
            style={isDesktop ? ds.stepScroll : undefined}
            contentContainerStyle={getStepScrollContent(isDesktop, true)}
        >
            <Card style={{ marginBottom: 0, alignSelf: "flex-start", width: "100%", ...(isDesktop ? { paddingBottom: 14 } : { paddingBottom: 12 }) }}>
                <SecHead icon="image-multiple-outline" title="Product Images" accent={C.accent2} />
                <Divider />
                <View ref={primaryBlockRef}>
                <Lbl text="Primary Image" required />
                <Hint text="First image shown to buyers. JPG, PNG or WebP · max 5 MB." />
                {data.primaryImage ? (
                    <View style={ig.previewWrap}>
                        <Image source={{ uri: data.primaryImage }} style={ig.previewImg} resizeMode="cover" />
                        <View style={ig.previewOverlay}>
                            <TouchableOpacity style={ig.changeBtn} onPress={pickPrimaryImage}>
                                <MaterialCommunityIcons name="image-edit-outline" size={14} color={C.white} />
                                <AppText style={ig.changeTxt}>Change</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity style={ig.removeBtn} onPress={() => onChange("primaryImage", null)}>
                                <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
                                <AppText style={ig.removeTxt}>Remove</AppText>
                            </TouchableOpacity>
                        </View>
                        <View style={ig.checkBadge}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={C.green} />
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[ig.box, hasErr && { borderColor: C.red, backgroundColor: "#FFF8F8" }]}
                        onPress={pickPrimaryImage}
                        activeOpacity={0.75}
                    >
                        <View style={ig.iconWrap}>
                            <MaterialCommunityIcons name="image-plus" size={32} color={hasErr ? C.red : C.navyLight} />
                        </View>
                        <AppText style={[ig.title, hasErr && { color: C.red }]}>
                            {hasErr ? "Primary image is required" : "Tap to upload primary image"}
                        </AppText>
                        <AppText style={ig.sub}>JPG · PNG · WebP · Max 5 MB</AppText>
                    </TouchableOpacity>
                )}
                </View>
                <Lbl text="Product Video (Optional)" />
                <Hint text="Upload a video to show your product in action. Max 20 MB." />
                {data.video ? (
                    <View style={ig.previewWrap}>
                        <View style={ig.videoPreviewBg}>
                            <MaterialCommunityIcons name="play-circle" size={52} color="rgba(255,255,255,0.92)" />
                            <AppText style={ig.videoPreviewName} numberOfLines={1}>
                                {data.video.split("/").pop() || "product_video.mp4"}
                            </AppText>
                        </View>
                        <View style={ig.previewOverlay}>
                            <TouchableOpacity style={ig.changeBtn} onPress={() => setSrcModal(true)}>
                                <MaterialCommunityIcons name="pencil" size={14} color={C.white} />
                                <AppText style={ig.changeTxt}>Change</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity style={ig.removeBtn} onPress={() => onChange("video", null)}>
                                <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
                                <AppText style={ig.removeTxt}>Remove</AppText>
                            </TouchableOpacity>
                        </View>
                        <View style={ig.checkBadge}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={C.green} />
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={ig.box}
                        onPress={() => setSrcModal(true)}
                        activeOpacity={0.75}
                    >
                        <View style={ig.iconWrap}>
                            <MaterialCommunityIcons name="video-plus-outline" size={32} color={C.navyLight} />
                        </View>
                        <AppText style={ig.title}>Tap to upload product video</AppText>
                        <AppText style={ig.sub}>MP4 · MOV · WebM · Max 20 MB</AppText>
                    </TouchableOpacity>
                )}
                <ImageSourcePickerModal
                    visible={srcModal}
                    onClose={() => setSrcModal(false)}
                    title="Add Video"
                    onCamera={() => pickVideo("camera")}
                    onGallery={() => pickVideo("gallery")}
                    galleryHint="Pick a video from your library"
                />
            </Card>
        </ScrollView>
    );
};

const ig = StyleSheet.create({
    box: { marginTop: 12, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", paddingVertical: 20, gap: 6, backgroundColor: C.inputBg, maxWidth: 320, alignSelf: "center", width: "100%" },
    iconWrap: { width: 60, height: 60, borderRadius: 14, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    title: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textMid },
    sub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight },
    previewWrap: { marginTop: 12, borderRadius: 14, overflow: "hidden", height: 140, maxWidth: 320, alignSelf: "center", width: "100%", position: "relative" },
    previewImg: { width: "100%", height: "100%" },
    previewOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 8, padding: 10, backgroundColor: "rgba(10,20,60,0.55)" },
    changeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
    changeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    removeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(220,50,50,0.55)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,100,100,0.3)" },
    removeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    checkBadge: { position: "absolute", top: 10, right: 10, backgroundColor: C.white, borderRadius: 12 },
    videoPreviewBg: { width: "100%", height: "100%", backgroundColor: C.navyDeep, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
    videoPreviewName: { fontFamily: fontFamilies.medium, fontSize: 11, color: "rgba(255,255,255,0.85)", maxWidth: "90%", textAlign: "center" },
    slot: { width: 100, height: 100, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
    slotTxt: { fontFamily: fontFamilies.medium, fontSize: 11, color: C.navyLight },
    selectedWrap: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: C.greenPale, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    selectedTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.greenText },
});

// ─────────────────────────────────────────────────────────────
// STEP 4 — Details
// ─────────────────────────────────────────────────────────────
const StepDetails = ({ data, onChange, errors, validationTrigger = 0, isDesktop = false, catalog, scrollRef: externalScrollRef, reloadCatalog }: any) => {
    const internalScrollRef = useRef<ScrollView>(null);
    const scrollRef = externalScrollRef ?? internalScrollRef;
    const fieldRefs = useRef<Record<string, any>>({});

    useEffect(() => {
        if (validationTrigger <= 0 || !errors?.length) return;

        const getFieldKeyFromError = (error: string): string | null => {
            const err = error.toLowerCase();
            if (err.includes("return policy")) return "returnPolicy";
            if (err.includes("delivery option")) return "deliveryOption";
            if (err.includes("payment option")) return "paymentOption";
            return null;
        };

        const timer = setTimeout(() => {
            const fieldKey = getFieldKeyFromError(errors[0]);
            if (!fieldKey) return;
            scrollToFieldTarget(fieldRefs.current[fieldKey], scrollRef.current, 15);
        }, 120);

        return () => clearTimeout(timer);
    }, [errors, validationTrigger]);
    const [sizePick, setSizePick] = useState(false);
    const [retPick, setRetPick] = useState(false);
    const [delPick, setDelPick] = useState(false);
    const [createSizeOpen, setCreateSizeOpen] = useState(false);
    const [customPolicyOpen, setCustomPolicyOpen] = useState(false);
    const [sizeChartOptions, setSizeChartOptions] = useState<string[]>(DEFAULT_SIZE_CHART_OPTIONS);
    const [sellerSizeCharts, setSellerSizeCharts] = useState<Record<string, SizeChartRow[]>>({});
    const [sellerSizeChartMeta, setSellerSizeChartMeta] = useState<Record<string, NonNullable<typeof data.sizeChartMeta>>>({});
    const [chartIdByName, setChartIdByName] = useState<Record<string, number>>({});
    const chartFieldRefs = useRef<Record<string, any>>({});
    const [newChartName, setNewChartName] = useState("");
    const [chartCategory, setChartCategory] = useState("");
    const [chartCategoryId, setChartCategoryId] = useState<number | null>(null);
    const [chartCategorySubName, setChartCategorySubName] = useState("");
    const [chartCategorySubId, setChartCategorySubId] = useState<number | null>(null);
    const [chartSubcategory, setChartSubcategory] = useState("");
    const [chartSubcategoryId, setChartSubcategoryId] = useState<number | null>(null);
    const [chartImageUri, setChartImageUri] = useState<string | null>(null);
    const [chartRows, setChartRows] = useState<SizeChartRow[]>([]);
    const [chartUnit, setChartUnit] = useState<string>(DEFAULT_CHART_UNIT);
    const [chartNotes, setChartNotes] = useState("");
    const [chartErrors, setChartErrors] = useState<string[]>([]);
    const [chartUnitPick, setChartUnitPick] = useState(false);
    const [addChartSizeOpen, setAddChartSizeOpen] = useState(false);
    const [newChartSizeName, setNewChartSizeName] = useState("");
    const [newChartSizeCode, setNewChartSizeCode] = useState("");
    const [savingChartSize, setSavingChartSize] = useState(false);
    const [savingChart, setSavingChart] = useState(false);
    const [chartSizePickRowId, setChartSizePickRowId] = useState<string | null>(null);
    const [dbSizes, setDbSizes] = useState<{ id?: number; name: string; code: string }[]>([]);
    const [customPolicyDraft, setCustomPolicyDraft] = useState(data.returnPolicyText || "");
    const features = data.features?.length ? data.features : [""];
    const specs = data.specifications?.length ? data.specifications : [{ name: "", value: "" }];

    const hasErr = (field: string) => errors.some((e: string) => e.toLowerCase().includes(field.toLowerCase()));
    const chartHasErr = (field: string) => chartErrors.some((e: string) => e.toLowerCase().includes(field.toLowerCase()));

    useEffect(() => {
        fetchSizeCharts()
            .then((charts) => {
                const cache = buildSizeChartCache(charts);
                setSizeChartOptions(cache.options);
                setSellerSizeCharts(cache.rowsByName);
                setSellerSizeChartMeta(cache.metaByName);
                setChartIdByName(cache.idByName);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchSizes()
            .then((rows) => {
                setDbSizes(
                    rows.map((s) => ({ id: Number(s.id), name: s.name, code: s.code })),
                );
            })
            .catch(() => setDbSizes([]));
    }, [createSizeOpen, catalog?.sizes?.length]);

    useEffect(() => {
        if (!createSizeOpen || chartErrors.length === 0) return;
        const getFieldKeyFromError = (error: string): string | null => {
            const err = error.toLowerCase();
            if (err.includes("chart name")) return "chartName";
            if (err.includes("subcategory")) return "chartSubcategory";
            if (err.includes("category")) return "chartCategory";
            if (err.includes("size")) return "chartSizes";
            return null;
        };
        const fieldKey = getFieldKeyFromError(chartErrors[0] ?? "");
        if (!fieldKey) return;
        const targetRef = chartFieldRefs.current[fieldKey];
        if (Platform.OS === "web" && targetRef && typeof targetRef.scrollIntoView === "function") {
            try {
                targetRef.scrollIntoView({ behavior: "smooth", block: "center" });
            } catch {
                // ignore
            }
        }
    }, [chartErrors, createSizeOpen]);

    const applySizeChartSelection = (name: string) => {
        const rows = sellerSizeCharts[name] ?? [];
        onChange("sizeChart", name);
        onChange("sizeChartId", chartIdByName[name]);
        onChange("sizeChartRows", rows);
        onChange("sizeChartMeta", sellerSizeChartMeta[name]);
    };

    const clearSizeChartSelection = () => {
        onChange("sizeChart", "");
        onChange("sizeChartId", undefined);
        onChange("sizeChartRows", []);
        onChange("sizeChartMeta", undefined);
    };

    const categoryPathOptions = buildCategoryPathOptions(catalog, CATEGORY_TREE_FALLBACK);
    const chartCategoryDisplay = formatCategoryPath(chartCategory, chartCategorySubName);
    const chartLeafSubcategoryOptions = buildLeafSubcategoryOptions(
        catalog,
        chartCategory,
        chartCategorySubName,
        CATEGORY_TREE_FALLBACK,
    );
    const chartSubcategoryEnabled = Boolean(chartCategory && chartCategorySubName);

    const catalogSizes: { id?: number; name: string; code: string }[] = (() => {
        const fromCatalog: { id?: number; name: string; code: string }[] = catalog?.sizes ?? [];
        const byKey = new Map<string, { id?: number; name: string; code: string }>();
        for (const s of [...fromCatalog, ...dbSizes]) {
            const key = `${s.name}`.trim().toLowerCase();
            if (!key) continue;
            if (!byKey.has(key)) byKey.set(key, s);
        }
        return Array.from(byKey.values());
    })();

    const resolveChartSizeFromLabel = (val: string) =>
        catalogSizes.find(
            (s) =>
                s.name === val ||
                s.code === val ||
                formatSizeOptionLabel(s.name, s.code) === val ||
                `${s.name} (${s.code})` === val,
        );

    const selectChartCategoryPath = (label: string) => {
        const resolved = resolveCategoryPathSelection(label, catalog);
        setChartCategory(resolved.category);
        setChartCategoryId(resolved.categoryId);
        setChartCategorySubId(resolved.categorySubId);
        setChartCategorySubName(resolved.categorySubName);
        const leaves = buildLeafSubcategoryOptions(
            catalog,
            resolved.category,
            resolved.categorySubName,
            CATEGORY_TREE_FALLBACK,
        );
        if (leaves.length === 0) {
            setChartSubcategory(resolved.categorySubName);
            setChartSubcategoryId(resolved.categorySubId);
        } else {
            setChartSubcategory("");
            setChartSubcategoryId(null);
        }
        setChartErrors((prev) => prev.filter((e) => !e.toLowerCase().includes("category")));
    };

    const selectChartSubcategory = (leafName: string) => {
        const resolved = resolveLeafSubcategorySelection(
            chartCategory,
            chartCategorySubName,
            leafName,
            catalog,
        );
        setChartSubcategory(resolved.subcategory);
        setChartSubcategoryId(resolved.subcategoryId);
        setChartErrors((prev) => prev.filter((e) => !e.toLowerCase().includes("subcategory")));
    };

    const openCreateSizeChart = () => {
        setNewChartName("");
        setChartCategory("");
        setChartCategoryId(null);
        setChartCategorySubName("");
        setChartCategorySubId(null);
        setChartSubcategory("");
        setChartSubcategoryId(null);
        setChartImageUri(null);
        setChartUnit(DEFAULT_CHART_UNIT);
        setChartNotes("");
        setChartRows([emptySizeRow()]);
        setChartErrors([]);
        setChartUnitPick(false);
        setCreateSizeOpen(true);
    };

    const openCustomPolicy = () => {
        setCustomPolicyDraft(data.returnPolicyText || "");
        setCustomPolicyOpen(true);
    };

    const saveSizeChart = async () => {
        const validationErrors: string[] = [];
        if (!newChartName.trim()) validationErrors.push("Chart name is required");
        if (!chartCategory || !chartCategorySubName) validationErrors.push("Category is required");
        if (!chartSubcategory.trim()) validationErrors.push("Subcategory is required");
        const validRows = chartRows.filter((r) => r.size.trim());
        if (validRows.length === 0) validationErrors.push("At least one size is required");

        if (validationErrors.length > 0) {
            setChartErrors(validationErrors);
            Alert.alert("Cannot save chart", validationErrors[0]);
            return;
        }

        setChartErrors([]);
        const name = newChartName.trim();
        setSavingChart(true);
        try {
            const sizeNames = validRows.map((r) => r.size.trim());
            await ensureSellerSizesInCatalog(sizeNames, catalogSizes);
            await reloadCatalog?.();
            const saved = await createSizeChart({
                name,
                categoryId: chartCategoryId,
                subcategoryId: chartSubcategoryId,
                categoryName: chartCategory,
                categorySubName: chartCategorySubName,
                subcategoryName: chartSubcategory,
                unit: chartUnit,
                notes: chartNotes,
                imageUri: chartImageUri,
                rows: mapFormRowsToApiRows(validRows),
            });
            const cache = mergeChartIntoCache(
                {
                    options: sizeChartOptions,
                    rowsByName: sellerSizeCharts,
                    metaByName: sellerSizeChartMeta,
                    idByName: chartIdByName,
                },
                saved,
            );
            setSizeChartOptions(cache.options);
            setSellerSizeCharts(cache.rowsByName);
            setSellerSizeChartMeta(cache.metaByName);
            setChartIdByName(cache.idByName);
            const meta = cache.metaByName[name];
            onChange("sizeChart", name);
            onChange("sizeChartId", saved.id);
            onChange("sizeChartRows", cache.rowsByName[name] ?? validRows);
            onChange("sizeChartMeta", meta);
            setCreateSizeOpen(false);
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not save sizes to your catalog.");
        } finally {
            setSavingChart(false);
        }
    };

    const saveCustomPolicy = () => {
        const text = customPolicyDraft.trim();
        if (!text) {
            Alert.alert("Policy required", "Please write your custom return policy.");
            return;
        }
        onChange("returnPolicy", "Custom Policy");
        onChange("returnPolicyText", text);
        setCustomPolicyOpen(false);
    };

    const addChartSizeRow = () => {
        setChartRows((prev) => [...prev, emptySizeRow()]);
    };

    const removeChartRow = (id: string) => {
        setChartRows((prev) => prev.filter((r) => r.id !== id));
    };

    const updateChartRow = (id: string, field: keyof SizeChartRow, value: string) => {
        setChartRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );
    };

    const handleCreateChartSize = async () => {
        const name = newChartSizeName.trim();
        const code = newChartSizeCode.trim().toUpperCase();
        if (!name || !code) {
            Alert.alert("Required", "Size name and code are required.");
            return;
        }
        setSavingChartSize(true);
        try {
            const created = await createSize({ name, code, status: "Active" });
            await reloadCatalog?.();
            setDbSizes((prev) => {
                const next = { id: Number(created.id), name: created.name, code: created.code };
                if (prev.some((s) => s.name.toLowerCase() === created.name.toLowerCase())) return prev;
                return [next, ...prev];
            });
            const emptyRow = chartRows.find((r) => !r.size.trim());
            if (emptyRow) {
                updateChartRow(emptyRow.id, "size", created.name);
            } else {
                setChartRows((prev) => [...prev, emptySizeRow(created.name)]);
            }
            setAddChartSizeOpen(false);
            setNewChartSizeName("");
            setNewChartSizeCode("");
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not create size.");
        } finally {
            setSavingChartSize(false);
        }
    };

    const twoCol = isDesktop ? at.row2 : dt.responsiveCol;
    const fieldFlex = isDesktop ? { flex: 1 } : dt.responsiveField;

    return (
        <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={isDesktop}
            style={isDesktop ? ds.stepScroll : undefined}
            contentContainerStyle={getStepScrollContent(isDesktop, true)}
        >
            <Card zIndex={100}>
                <SecHead icon="ruler-square" title="Size Chart" accent={C.accent1} />
                <Divider />
                <Lbl text="Select Size Chart" />
                {sizeChartOptions.length === 0 ? (
                    <View style={dt.sizeEmptyHint}>
                        <AppText style={dt.sizeEmptyHintTxt}>
                            No size charts yet. Create one to attach measurements for this product.
                        </AppText>
                    </View>
                ) : null}
                <View style={[twoCol, Platform.OS === 'web' && { zIndex: 20 }, isDesktop && { alignItems: "flex-end" }]}>
                    <View style={fieldFlex}>
                        <Drop
                            dropKey="select-size-chart"
                            placeholder="Select size chart"
                            value={data.sizeChart}
                            onPress={() => sizeChartOptions.length > 0 && setSizePick(true)}
                            options={sizeChartOptions}
                            disabled={sizeChartOptions.length === 0}
                            onSelect={applySizeChartSelection}
                            onClear={clearSizeChartSelection}
                        />
                    </View>
                    <TouchableOpacity
                        style={[dt.outBtn, !isDesktop && dt.outBtnFull]}
                        onPress={openCreateSizeChart}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add" size={15} color={C.navy} />
                        <AppText style={dt.outBtnTxt}>Create New</AppText>
                    </TouchableOpacity>
                </View>
                {data.sizeChart && (sellerSizeCharts[data.sizeChart] ?? data.sizeChartRows ?? []).length > 0 ? (
                    <>
                        <Divider />
                        <Lbl text="Review Size Chart" />
                        <View style={dt.sizeChartReview}>
                            <View style={dt.reviewRow}>
                                <AppText style={dt.reviewLbl}>Chart Name</AppText>
                                <AppText style={dt.reviewVal}>{data.sizeChart}</AppText>
                            </View>
                            {data.sizeChartMeta?.categorySubName ? (
                                <View style={dt.reviewRow}>
                                    <AppText style={dt.reviewLbl}>Category</AppText>
                                    <AppText style={dt.reviewVal}>
                                        {formatCategoryPath(data.sizeChartMeta.category, data.sizeChartMeta.categorySubName)}
                                    </AppText>
                                </View>
                            ) : null}
                            {data.sizeChartMeta?.subcategory ? (
                                <View style={dt.reviewRow}>
                                    <AppText style={dt.reviewLbl}>Subcategory</AppText>
                                    <AppText style={dt.reviewVal}>{data.sizeChartMeta.subcategory}</AppText>
                                </View>
                            ) : null}
                            {(data.sizeChartMeta?.imageUrl || sellerSizeChartMeta[data.sizeChart]?.imageUrl) ? (
                                <View style={dt.reviewImageWrap}>
                                    <Image
                                        source={{
                                            uri: resolveMediaUrl(
                                                data.sizeChartMeta?.imageUrl
                                                    ?? sellerSizeChartMeta[data.sizeChart]?.imageUrl,
                                            ) ?? undefined,
                                        }}
                                        style={dt.reviewChartImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            ) : null}
                            <Lbl text="Sizes Added" compact />
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dt.sizeTableScroll}>
                                <View style={dt.sizeTableWrap}>
                                    <View style={dt.sizeTableHeader}>
                                        {SIZE_TABLE_COLS.map((col) => (
                                            <View key={col.key} style={[dt.sizeTableTh, { width: col.width, minWidth: col.width }]}>
                                                <AppText style={dt.sizeTableThTxt} numberOfLines={2}>{col.label}</AppText>
                                            </View>
                                        ))}
                                    </View>
                                    {(sellerSizeCharts[data.sizeChart] ?? data.sizeChartRows ?? [])
                                        .filter((r: SizeChartRow) => r.size.trim())
                                        .map((row: SizeChartRow, idx: number) => (
                                            <View key={row.id} style={[dt.sizeTableRow, idx % 2 === 1 && dt.sizeTableRowAlt]}>
                                                {SIZE_TABLE_COLS.map((col) => (
                                                    <View key={col.key} style={[dt.sizeTableTd, { width: col.width, minWidth: col.width }]}>
                                                        <AppText style={dt.reviewSizeCellTxt} numberOfLines={1}>
                                                            {row[col.key]?.trim()
                                                                ? `${row[col.key]}${col.key !== "size" && data.sizeChartMeta?.unit?.toLowerCase().includes("inch") ? " in" : col.key !== "size" ? " cm" : ""}`
                                                                : "—"}
                                                        </AppText>
                                                    </View>
                                                ))}
                                            </View>
                                        ))}
                                </View>
                            </ScrollView>
                        </View>
                    </>
                ) : null}
            </Card>

            <Card zIndex={90} style={{ marginTop: 12 }}>
                <SecHead icon="refresh" title="Return Policy" accent={C.accent3} />
                <Divider />
                <View style={[twoCol, Platform.OS === 'web' && { zIndex: 20 }]}>
                    <View style={fieldFlex} ref={el => { fieldRefs.current['returnPolicy'] = el; }}>
                        <Lbl text="Policy Template" required />
                        <Drop placeholder="Select template" value={data.returnPolicy} onPress={() => setRetPick(true)} hasError={hasErr("return policy")} options={RETURN_POLICY_OPTIONS} onSelect={(v: string) => applyReturnPolicySelection(v, onChange)} />
                    </View>
                    <View style={fieldFlex}>
                        <Lbl text="Custom Policy" />
                        <TouchableOpacity
                            style={[dt.outBtn, !isDesktop && dt.outBtnFull]}
                            onPress={openCustomPolicy}
                            activeOpacity={0.85}
                        >
                            <Feather name="edit-2" size={13} color={C.navy} />
                            <AppText style={dt.outBtnTxt}>Write Custom</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
                <Lbl text="Policy Details" />
                <Field placeholder="Describe your return policy…" value={data.returnPolicyText} onChangeText={(v: string) => onChange("returnPolicyText", v)} multiline lines={4} maxLength={1000} />
                <CC cur={(data.returnPolicyText || "").length} max={1000} />
            </Card>

            <Card zIndex={80} style={{ marginTop: 12 }}>
                <SecHead icon="truck-fast-outline" title="Delivery" accent={C.accent4} />
                <Divider />
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 20 }, { alignItems: "flex-end", marginBottom: 12 }]}>
                    <View style={{ flex: 2 }} ref={el => { fieldRefs.current['deliveryOption'] = el; }}>
                        <Lbl text="Delivery Option" required />
                        <Drop placeholder="Select option" value={data.deliveryOption} onPress={() => setDelPick(true)} hasError={hasErr("delivery option")} options={DELIVERY_OPTIONS} onSelect={(v: string) => applyDeliverySelection(v, onChange)} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Min Days" />
                        <Field placeholder="3" value={data.minDays} onChangeText={(v: string) => onChange("minDays", v)} keyboardType="numeric" editable={!data.deliveryOption} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Max Days" />
                        <Field placeholder="7" value={data.maxDays} onChangeText={(v: string) => onChange("maxDays", v)} keyboardType="numeric" editable={!data.deliveryOption} />
                    </View>
                </View>
                <Field placeholder="Extra delivery notes…" value={data.deliveryInfo} onChangeText={(v: string) => onChange("deliveryInfo", v)} multiline lines={3} maxLength={1000} />
            </Card>

            <View ref={el => { fieldRefs.current['paymentOption'] = el; }}>
            <Card zIndex={70} style={{ marginTop: 12 }}>
                <SecHead icon="credit-card-outline" title="Payment Options" accent={C.accent5} />
                <Divider />
                <Hint text="Select one or both payment methods. At least one option is required." />
                <View style={dt.payRow}>
                    {([
                        ["codEnabled", "Cash on Delivery (COD)", "cash-multiple"] as const,
                        ["onlinePayEnabled", "Online Payment", "credit-card-outline"] as const,
                    ]).map(([key, label, icon]) => {
                        const selected = Boolean((data as any)[key]);
                        const otherKey = key === "codEnabled" ? "onlinePayEnabled" : "codEnabled";
                        return (
                            <TouchableOpacity
                                key={key}
                                style={[dt.payOption, selected && dt.payOptionOn]}
                                onPress={() => {
                                    const otherSelected = Boolean((data as any)[otherKey]);
                                    if (selected && !otherSelected) return;
                                    onChange(key, !selected);
                                }}
                                activeOpacity={0.85}
                            >
                                <View style={[dt.payIconWrap, selected && dt.payIconWrapOn]}>
                                    <MaterialCommunityIcons
                                        name={icon}
                                        size={22}
                                        color={selected ? C.white : C.navy}
                                    />
                                </View>
                                <AppText style={[dt.payOptionLbl, selected && dt.payOptionLblOn]}>{label}</AppText>
                                {selected ? (
                                    <MaterialCommunityIcons name="check-circle" size={18} color={C.navy} />
                                ) : (
                                    <View style={dt.payOptionRing} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Card>
            </View>

            <Card zIndex={60} style={{ marginTop: 12 }}>
                <SecHead icon="shield-check-outline" title="Warranty & Care" accent={C.accent2} />
                <Divider />
                <View style={at.row2}>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Warranty" />
                        <Field placeholder="e.g. 1 year warranty" value={data.warranty} onChangeText={(v: string) => onChange("warranty", v)} multiline lines={3} maxLength={500} />
                        <CC cur={(data.warranty || "").length} max={500} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Care Instructions" />
                        <Field placeholder="Care & maintenance" value={data.careInstructions} onChangeText={(v: string) => onChange("careInstructions", v)} multiline lines={3} maxLength={500} />
                        <CC cur={(data.careInstructions || "").length} max={500} />
                    </View>
                </View>
            </Card>

            <Card zIndex={50} style={{ marginTop: 12, marginBottom: 0 }}>
                <SecHead icon="format-list-bulleted" title="Features & Specs" accent={C.accent1} />
                <Divider />
                <Lbl text="Product Features" />
                {features.map((f: string, i: number) => (
                    <View key={i} style={dt.specRow}>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Enter feature" value={f} onChangeText={(v: string) => { const arr = [...features]; arr[i] = v; onChange("features", arr); }} />
                        </View>
                        <TouchableOpacity style={dt.specDel} onPress={() => onChange("features", features.filter((_: string, idx: number) => idx !== i))}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.red} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={dt.addBtn} onPress={() => onChange("features", [...features, ""])}>
                    <Ionicons name="add" size={15} color={C.navy} />
                    <AppText style={dt.addBtnTxt}>Add Feature</AppText>
                </TouchableOpacity>
                <Divider />
                <Lbl text="Specifications" />
                {specs.map((sp: { name: string; value: string }, i: number) => (
                    <View key={i} style={dt.specRow}>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Name" value={sp.name} onChangeText={(v: string) => {
                                const arr = [...specs];
                                if (arr[i]) { arr[i].name = v; }
                                onChange("specifications", arr);
                            }} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Value" value={sp.value} onChangeText={(v: string) => {
                                const arr = [...specs];
                                if (arr[i]) { arr[i].value = v; }
                                onChange("specifications", arr);
                            }} />
                        </View>
                        <TouchableOpacity style={dt.specDel} onPress={() => onChange("specifications", specs.filter((_: { name: string; value: string }, idx: number) => idx !== i))}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.red} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={dt.addBtn} onPress={() => onChange("specifications", [...specs, { name: "", value: "" }])}>
                    <Ionicons name="add" size={15} color={C.navy} />
                    <AppText style={dt.addBtnTxt}>Add Specification</AppText>
                </TouchableOpacity>
            </Card>

            <PM
                visible={sizePick}
                title="Size Chart"
                options={sizeChartOptions}
                selected={data.sizeChart}
                onSelect={applySizeChartSelection}
                onClear={clearSizeChartSelection}
                onClose={() => setSizePick(false)}
            />
            <SizeCatalogPickerModal
                visible={!!chartSizePickRowId}
                title="Select Size"
                sizes={catalogSizes}
                selected={(() => {
                    const row = chartRows.find((r) => r.id === chartSizePickRowId);
                    if (!row?.size?.trim()) return "";
                    const match = catalogSizes.find(
                        (s) => s.name === row.size || s.code === row.size,
                    );
                    return match ? formatSizeOptionLabel(match.name, match.code) : row.size;
                })()}
                onSelect={(val: string) => {
                    if (!chartSizePickRowId) return;
                    const size = resolveChartSizeFromLabel(val);
                    updateChartRow(chartSizePickRowId, "size", size?.name ?? val);
                    setChartErrors((prev) => prev.filter((e) => !e.toLowerCase().includes("size")));
                    setChartSizePickRowId(null);
                }}
                onClose={() => setChartSizePickRowId(null)}
            />
            <PM visible={retPick} title="Return Policy" options={RETURN_POLICY_OPTIONS} selected={data.returnPolicy} onSelect={(v: string) => applyReturnPolicySelection(v, onChange)} onClose={() => setRetPick(false)} />
            <PM visible={delPick} title="Delivery Option" options={DELIVERY_OPTIONS} selected={data.deliveryOption} onSelect={(v: string) => applyDeliverySelection(v, onChange)} onClose={() => setDelPick(false)} />

            <FormPopupModal
                visible={createSizeOpen}
                onClose={() => {
                    setChartUnitPick(false);
                    setChartErrors([]);
                    setCreateSizeOpen(false);
                }}
                title="Create Size Chart"
                wide
                accentHeader
                headerIcon="ruler"
                overlay={
                    <>
                        <InlinePicker
                            visible={chartUnitPick}
                            title="Measurement Unit"
                            options={[...MEASUREMENT_UNIT_OPTIONS]}
                            selected={chartUnit}
                            onSelect={setChartUnit}
                            onClose={() => setChartUnitPick(false)}
                        />
                    </>
                }
            >
                {chartErrors.length > 0 ? (
                    <View style={dt.chartErrorBox}>
                        {chartErrors.map((err, i) => (
                            <AppText key={i} style={dt.chartErrorTxt}>{err}</AppText>
                        ))}
                    </View>
                ) : null}
                <View ref={(el) => { chartFieldRefs.current.chartName = el; }}>
                    <Lbl text="Chart Name" required />
                    <Field
                        placeholder="e.g. Men's Clothing Size Chart"
                        value={newChartName}
                        onChangeText={(v: string) => {
                            setNewChartName(v);
                            if (v.trim()) {
                                setChartErrors((prev) => prev.filter((e) => !e.toLowerCase().includes("chart name")));
                            }
                        }}
                        hasError={chartHasErr("chart name")}
                    />
                </View>
                <View
                    ref={(el) => { chartFieldRefs.current.chartCategory = el; }}
                    style={[twoCol, { marginTop: 0 }, Platform.OS === "web" && { zIndex: 30 }]}
                >
                    <View style={fieldFlex}>
                        <Lbl text="Main Category > Category" required />
                        <Drop
                            dropKey="chart-category-path"
                            placeholder="Select main category > category"
                            value={chartCategoryDisplay}
                            options={categoryPathOptions}
                            onSelect={selectChartCategoryPath}
                            hasError={chartHasErr("category")}
                        />
                    </View>
                    <View style={[fieldFlex, Platform.OS === "web" && { zIndex: 20 }]}>
                        <Lbl text="Subcategory" required />
                        <Drop
                            dropKey="chart-subcategory"
                            placeholder="Select subcategory"
                            value={chartSubcategory}
                            disabled={!chartSubcategoryEnabled}
                            options={chartLeafSubcategoryOptions}
                            onSelect={selectChartSubcategory}
                            hasError={chartHasErr("subcategory")}
                        />
                    </View>
                </View>
                <Lbl text="Size Chart Image (Optional)" />
                <Hint text="Upload an image of your size chart (JPG, PNG, GIF, WebP)" />
                <CustImagePicker uri={chartImageUri} onPick={setChartImageUri} onRemove={() => setChartImageUri(null)} />
                <View ref={(el) => { chartFieldRefs.current.chartSizes = el; }} style={dt.sizeDataHead}>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Size Chart Data" required />
                        <Hint text="Size Information — enter measurements for each size." />
                    </View>
                    <TouchableOpacity style={dt.addSizeOrangeBtn} onPress={addChartSizeRow} activeOpacity={0.85}>
                        <Ionicons name="add" size={16} color={C.white} />
                        <AppText style={dt.addSizeOrangeBtnTxt}>Add Size</AppText>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    onPress={() => setAddChartSizeOpen(true)}
                    style={vt.addSizeLink}
                    activeOpacity={0.7}
                >
                    <AppText style={vt.addSizeLinkTxt}>+ Add new size to your catalog (seller only)</AppText>
                </TouchableOpacity>
                {chartRows.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dt.sizeTableScroll}>
                        <View style={dt.sizeTableWrap}>
                            <View style={dt.sizeTableHeader}>
                                {SIZE_TABLE_COLS.map((col) => (
                                    <View key={col.key} style={[dt.sizeTableTh, { width: col.width, minWidth: col.width }]}>
                                        <AppText style={dt.sizeTableThTxt} numberOfLines={2}>{col.label}</AppText>
                                    </View>
                                ))}
                                <View style={dt.sizeTableThAction}><AppText style={dt.sizeTableThTxt}>Action</AppText></View>
                            </View>
                            {chartRows.map((row, idx) => (
                                <View key={row.id} style={[dt.sizeTableRow, idx % 2 === 1 && dt.sizeTableRowAlt]}>
                                    <View style={[dt.sizeTableTd, { width: SIZE_TABLE_COLS[0].width, minWidth: SIZE_TABLE_COLS[0].width }]}>
                                        <TouchableOpacity
                                            style={[
                                                dt.sizeTableInput,
                                                { justifyContent: "center" },
                                                chartHasErr("size") && !row.size.trim() && { borderColor: C.red },
                                            ]}
                                            onPress={() => setChartSizePickRowId(row.id)}
                                            activeOpacity={0.85}
                                        >
                                            <AppText
                                                style={{
                                                    fontFamily: fontFamilies.regular,
                                                    fontSize: 12,
                                                    color: row.size.trim() ? C.textDark : C.textPlaceholder,
                                                }}
                                                numberOfLines={1}
                                            >
                                                {row.size.trim()
                                                    ? (() => {
                                                        const match = catalogSizes.find(
                                                            (s) => s.name === row.size || s.code === row.size,
                                                        );
                                                        return match
                                                            ? formatSizeOptionLabel(match.name, match.code)
                                                            : row.size;
                                                    })()
                                                    : "Select size"}
                                            </AppText>
                                        </TouchableOpacity>
                                    </View>
                                    {SIZE_TABLE_COLS.slice(1).map((col) => (
                                        <View key={col.key} style={[dt.sizeTableTd, { width: col.width, minWidth: col.width }]}>
                                            <TextInput
                                                style={dt.sizeTableInput}
                                                placeholder={col.placeholder}
                                                placeholderTextColor={C.textPlaceholder}
                                                value={row[col.key]}
                                                onChangeText={(v: string) => updateChartRow(row.id, col.key, v)}
                                            />
                                        </View>
                                    ))}
                                    <View style={dt.sizeTableTdAction}>
                                        <TouchableOpacity
                                            style={dt.sizeTableDelBtn}
                                            onPress={() => removeChartRow(row.id)}
                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                        >
                                            <MaterialCommunityIcons name="trash-can-outline" size={18} color={C.red} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                ) : (
                    <View style={dt.sizeEmptyHint}>
                        <AppText style={dt.sizeEmptyHintTxt}>Use Add Size to add rows and enter measurements for each size.</AppText>
                    </View>
                )}
                {chartRows.some((r) => r.size.trim()) ? (
                    <>
                        <Lbl text="Preview" compact />
                        {chartImageUri ? (
                            <View style={dt.reviewImageWrap}>
                                <Image source={{ uri: chartImageUri }} style={dt.reviewChartImage} resizeMode="contain" />
                            </View>
                        ) : null}
                        <View style={dt.sizeChartReview}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dt.sizeTableScroll}>
                                <View style={dt.sizeTableWrap}>
                                    <View style={dt.sizeTableHeader}>
                                        {SIZE_TABLE_COLS.map((col) => (
                                            <View key={col.key} style={[dt.sizeTableTh, { width: col.width, minWidth: col.width }]}>
                                                <AppText style={dt.sizeTableThTxt} numberOfLines={2}>{col.label}</AppText>
                                            </View>
                                        ))}
                                    </View>
                                    {chartRows
                                        .filter((r) => r.size.trim())
                                        .map((row, idx) => (
                                            <View key={row.id} style={[dt.sizeTableRow, idx % 2 === 1 && dt.sizeTableRowAlt]}>
                                                {SIZE_TABLE_COLS.map((col) => (
                                                    <View key={col.key} style={[dt.sizeTableTd, { width: col.width, minWidth: col.width }]}>
                                                        <AppText style={dt.reviewSizeCellTxt} numberOfLines={1}>
                                                            {row[col.key]?.trim() || "—"}
                                                        </AppText>
                                                    </View>
                                                ))}
                                            </View>
                                        ))}
                                </View>
                            </ScrollView>
                        </View>
                    </>
                ) : null}
                <Lbl text="Measurement Unit" />
                <Drop
                    placeholder="Select unit"
                    value={chartUnit}
                    onPress={() => setChartUnitPick(true)}
                />
                <Lbl text="Additional Notes" />
                <Field placeholder="e.g. All measurements are approximate." value={chartNotes} onChangeText={setChartNotes} multiline lines={3} maxLength={500} />
                <CC cur={chartNotes.length} max={500} />
                <View style={[fp.footerRow, isDesktop && fp.footerRowDesktop]}>
                    <TouchableOpacity style={[fp.footerBtnSecondary, !isDesktop && fp.footerBtnPrimaryFull]} onPress={() => setCreateSizeOpen(false)}>
                        <AppText style={fp.footerBtnTxtSecondary}>Cancel</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[fp.footerBtnPrimary, fp.footerBtnAccent, !isDesktop && fp.footerBtnPrimaryFull, savingChart && { opacity: 0.6 }]}
                        onPress={saveSizeChart}
                        disabled={savingChart}
                    >
                        <AppText style={fp.footerBtnTxtPrimary}>{savingChart ? "Saving…" : "Save Chart"}</AppText>
                    </TouchableOpacity>
                </View>
            </FormPopupModal>

            <Modal visible={addChartSizeOpen} transparent animationType="fade" onRequestClose={() => setAddChartSizeOpen(false)}>
                <View style={vt.sizeModalOverlay}>
                    <View style={vt.sizeModalCard}>
                        <AppText style={vt.sizeModalTitle}>Add New Size</AppText>
                        <AppText style={vt.sizeModalSub}>Saved only for your seller account.</AppText>
                        <Lbl text="Size Name" required />
                        <Field placeholder="e.g. Extra Large" value={newChartSizeName} onChangeText={setNewChartSizeName} />
                        <Lbl text="Size Code" required />
                        <Field placeholder="e.g. XL" value={newChartSizeCode} onChangeText={setNewChartSizeCode} autoCapitalize="characters" />
                        <View style={vt.sizeModalActions}>
                            <TouchableOpacity style={vt.sizeModalCancel} onPress={() => setAddChartSizeOpen(false)} disabled={savingChartSize}>
                                <AppText style={vt.sizeModalCancelTxt}>Cancel</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[vt.sizeModalSave, savingChartSize && { opacity: 0.6 }]}
                                onPress={handleCreateChartSize}
                                disabled={savingChartSize}
                            >
                                <AppText style={vt.sizeModalSaveTxt}>{savingChartSize ? "Saving…" : "Save Size"}</AppText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <FormPopupModal
                visible={customPolicyOpen}
                onClose={() => setCustomPolicyOpen(false)}
                title="Write Custom Return Policy"
            >
                <Hint text="Describe your return rules clearly. This will appear to buyers on the product page." />
                <Lbl text="Custom Policy Details" required />
                <Field placeholder="e.g. Returns accepted within 7 days in original packaging…" value={customPolicyDraft} onChangeText={setCustomPolicyDraft} multiline lines={8} maxLength={1000} />
                <CC cur={customPolicyDraft.length} max={1000} />
                <View style={[fp.footerRow, isDesktop && fp.footerRowDesktop]}>
                    <TouchableOpacity style={[fp.footerBtnSecondary, !isDesktop && fp.footerBtnPrimaryFull]} onPress={() => setCustomPolicyOpen(false)}>
                        <AppText style={fp.footerBtnTxtSecondary}>Cancel</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[fp.footerBtnPrimary, !isDesktop && fp.footerBtnPrimaryFull]} onPress={saveCustomPolicy}>
                        <AppText style={fp.footerBtnTxtPrimary}>Save Policy</AppText>
                    </TouchableOpacity>
                </View>
            </FormPopupModal>
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// STEP PROGRESS BAR
// ─────────────────────────────────────────────────────────────
const ICON_D = 38;
const ICON_R = ICON_D / 2;
const LINE_H = 3;
const N_STEPS = STEPS.length;

const StepProgressBar = ({
    step,
    maxUnlocked,
    onTabPress,
    isDesktop = false,
}: {
    step: number;
    maxUnlocked: number;
    onTabPress: (i: number) => void;
    isDesktop?: boolean;
}) => {
    const [barW, setBarW] = useState(SW);
    const colW = barW / N_STEPS;

    return (
        <View
            style={[sp.wrapper, isDesktop && ds.hStepBar]}
            onLayout={(e: LayoutChangeEvent) => setBarW(e.nativeEvent.layout.width)}
        >
            {STEPS.map((_, i) => {
                if (i === 0) return null;
                const cx_prev = colW * (i - 1) + colW / 2;
                const cx_curr = colW * i + colW / 2;
                const lx = cx_prev + ICON_R;
                const lw = cx_curr - ICON_R - lx;
                const ly = 10 + ICON_R - LINE_H / 2;
                if (lw <= 0) return null;
                const filled = i <= maxUnlocked;
                return (
                    <View key={`seg-${i}`} pointerEvents="none"
                        style={[sp.seg, {
                            left: lx, top: ly, width: lw, backgroundColor: filled
                                ? STEPS[i - 1]!.color
                                : "rgba(255,255,255,0.22)"
                        }]}
                    />
                );
            })}
            {STEPS.map((s, i) => {
                const isActive = i === step;
                const isDone = i < maxUnlocked;
                const isReachable = i <= maxUnlocked;
                const iconBg = (isActive || isDone) ? s.color : s.color + "60";
                return (
                    <TouchableOpacity key={s.key} style={sp.col} onPress={() => isReachable && onTabPress(i)} activeOpacity={isReachable ? 0.75 : 1}>
                        <View style={[
                            sp.circle,
                            { backgroundColor: iconBg },
                            isActive && { shadowColor: s.color, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 7 },
                        ]}>
                            <MaterialCommunityIcons name={s.icon as any} size={18} color={C.white} />
                        </View>
                        <AppText style={[
                            sp.lbl,
                            isDesktop && sp.lblDesktop,
                            isActive && { color: s.color, fontFamily: fontFamilies.bold },
                            isDone && { color: s.color, fontFamily: fontFamilies.semiBold },
                            !isActive && !isDone && { color: "rgba(255,255,255,0.55)" },
                        ]}>
                            {s.label}
                        </AppText>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const sp = StyleSheet.create({
    wrapper: { flexDirection: "row", backgroundColor: C.navyDeep, borderBottomWidth: 0, paddingTop: 10, paddingBottom: 14, position: "relative" },
    seg: { position: "absolute", height: LINE_H, borderRadius: LINE_H / 2, zIndex: 0 },
    col: { flex: 1, alignItems: "center", gap: 6, zIndex: 1 },
    circle: { width: ICON_D, height: ICON_D, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    lbl: { fontFamily: fontFamilies.medium, fontSize: 10, color: "rgba(255,255,255,0.55)", textAlign: "center" },
    lblDesktop: { fontSize: 12 },
});

// ─────────────────────────────────────────────────────────────
// DISCARD MODAL (edit mode)
// ─────────────────────────────────────────────────────────────
const DiscardModal = ({ visible, onDiscard, onKeep }: { visible: boolean; onDiscard: () => void; onKeep: () => void }) => {
    const { width, isDesktop, isTablet } = useResponsive();
    const sheetMax = isDesktop ? 380 : isTablet ? 360 : Math.min(340, Math.max(280, width - 48));

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeep}>
            <View style={dm.overlay}>
                <View style={[dm.sheet, { maxWidth: sheetMax, width: "100%" as any }]}>
                    <View style={dm.iconWrap}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={isDesktop ? 28 : 32} color={C.amber} />
                    </View>
                    <AppText style={[dm.title, isDesktop && dm.titleDesktop]}>Discard Changes?</AppText>
                    <AppText style={[dm.body, isDesktop && dm.bodyDesktop]}>
                        You have unsaved edits. If you leave now, your changes will be lost.
                    </AppText>
                    <View style={[dm.actions, isDesktop && dm.actionsRow]}>
                        <TouchableOpacity
                            style={[dm.discardBtn, isDesktop && dm.actionBtnDesktop]}
                            onPress={onDiscard}
                            activeOpacity={0.85}
                        >
                            <AppText style={dm.discardTxt}>Yes, Discard</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[dm.keepBtn, isDesktop && dm.actionBtnDesktop]}
                            onPress={onKeep}
                            activeOpacity={0.85}
                        >
                            <AppText style={dm.keepTxt}>Keep Editing</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const dm = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(10,20,60,0.45)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    sheet: {
        backgroundColor: C.white,
        borderRadius: 18,
        paddingHorizontal: 22,
        paddingTop: 22,
        paddingBottom: 18,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
        elevation: 20,
        alignSelf: "center",
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: C.amberPale,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    title: {
        fontFamily: fontFamilies.bold,
        fontSize: 17,
        color: C.textDark,
        marginBottom: 8,
        textAlign: "center",
    },
    titleDesktop: { fontSize: 16 },
    body: {
        fontFamily: fontFamilies.regular,
        fontSize: 13,
        color: C.textMid,
        textAlign: "center",
        lineHeight: 19,
        marginBottom: 18,
    },
    bodyDesktop: { fontSize: 12.5, lineHeight: 18, marginBottom: 16 },
    actions: { width: "100%", gap: 8 },
    actionsRow: { flexDirection: "row-reverse", gap: 10 },
    discardBtn: {
        width: "100%",
        backgroundColor: C.red,
        borderRadius: 11,
        paddingVertical: 12,
        alignItems: "center",
    },
    keepBtn: {
        width: "100%",
        backgroundColor: C.navyGhost,
        borderRadius: 11,
        paddingVertical: 12,
        alignItems: "center",
    },
    actionBtnDesktop: { flex: 1, width: undefined as any, paddingVertical: 11 },
    discardTxt: { fontFamily: fontFamilies.bold, fontSize: 13.5, color: C.white },
    keepTxt: { fontFamily: fontFamilies.semiBold, fontSize: 13.5, color: C.navy },
});

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
const initBasicData = () => {
    if (!PREFILL_WITH_DUMMY) {
        return {
            id: "",
            name: "", category: "", categorySubName: "", subcategory: "",
            categoryId: undefined as number | undefined,
            categorySubId: undefined as number | undefined,
            subcategoryId: undefined as number | undefined,
            materialType: "", hsnCode: "", gstPercentage: "",
            shortDesc: "", fullDesc: "", length: "", width: "", height: "",
            weight: "", weightSlab: "", intraCityCharge: "", metroMetroCharge: "", customDeliveryCharge: false,             fragile: "No", customized: false,
            custCustomFields: [] as CustomBuyerField[],
        };
    }
    return {
        name: "Premium Cotton Crew Neck T-Shirt",
        category: "",
        categorySubName: "",
        subcategory: "",
        categoryId: undefined as number | undefined,
        categorySubId: undefined as number | undefined,
        subcategoryId: undefined as number | undefined,
        materialType: "Cotton",
        hsnCode: "61091000",
        shortDesc: "Soft, breathable cotton tee with a relaxed fit — ideal for everyday wear and easy styling.",
        fullDesc: "Crafted from 100% combed cotton with reinforced stitching at stress points. Pre-shrunk fabric, colour-fast dye, and comfortable round neck. Suitable for casual outings, work-from-home, and light outdoor activities. Machine wash cold, tumble dry low.",
        length: "30", width: "25", height: "5", weight: "0.35", weightSlab: "0-500 gms",
        intraCityCharge: "0", metroMetroCharge: "25", customDeliveryCharge: false,
        fragile: "No", customized: true,
        custCustomFields: [
            { id: "cf-1", name: "Reference image", type: "Image" as const, required: true },
            { id: "cf-2", name: "Name or message", type: "Text" as const, required: true },
        ],
    };
};

const initVariants = (): Variant[] => {
    if (!PREFILL_WITH_DUMMY) {
        return [{ id: "1", color: "", size: "", sku: "", stock: "", minQuantity: "", mrp: "", sellingPrice: "", discount: "0", images: [], videoUrl: "" }];
    }
    return [
        { id: "1", color: "Blue", colorId: 14, size: "Medium", sizeId: 4, sku: "FNT-TEE-BLU-M-001", stock: "120", mrp: "1299", sellingPrice: "899", discount: "31", images: [], videoUrl: "" },
        { id: "2", color: "Black", colorId: 11, size: "Large", sizeId: 5, sku: "FNT-TEE-BLK-L-002", stock: "85", mrp: "1299", sellingPrice: "949", discount: "27", images: [], videoUrl: "" },
    ];
};

const initDetailsData = () => {
    if (!PREFILL_WITH_DUMMY) {
        return {
            sizeChart: "", returnPolicy: "", returnPolicyText: "",
            deliveryOption: "", minDays: "3", maxDays: "7", deliveryInfo: "",
            codEnabled: true, onlinePayEnabled: true, warranty: "", careInstructions: "",
            sizeChartMeta: undefined as {
                category: string;
                categorySubName: string;
                subcategory: string;
                unit: string;
                notes?: string;
                imageUrl?: string;
            } | undefined,
            sizeChartId: undefined as number | undefined,
            sizeChartRows: [] as SizeChartRow[],
            selectedReviewSize: "",
            features: [""] as string[],
            specifications: [{ name: "", value: "" }] as { name: string; value: string }[],
        };
    }
    return {
        sizeChart: "",
        returnPolicy: "7 Days Return",
        returnPolicyText: "Items may be returned within 7 days if unused, with tags attached. Customised products are non-returnable once production starts.",
        deliveryOption: "Standard Delivery",
        minDays: "3", maxDays: "7",
        deliveryInfo: "Ships within 3–7 business days. Free shipping on orders above ₹999.",
        codEnabled: true, onlinePayEnabled: true,
        sizeChartMeta: undefined as {
            category: string;
            categorySubName: string;
            subcategory: string;
            unit: string;
            notes?: string;
        } | undefined,
        selectedReviewSize: "",
        warranty: "6-month manufacturing defect warranty",
        careInstructions: "Machine wash cold with similar colours. Do not bleach. Iron on low heat.",
    };
};

const initImagesData = () => ({
    primaryImage: PREFILL_WITH_DUMMY ? DUMMY_PRIMARY_IMAGE_URI : null,
    additionalImages: PREFILL_WITH_DUMMY
        ? [
              "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&q=80",
              "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80",
          ]
        : ([] as string[]),
    video: null as string | null,
});

const serializeEditFormState = (
    basic: ReturnType<typeof initBasicData>,
    variantList: Variant[],
    images: ReturnType<typeof initImagesData>,
    details: ReturnType<typeof initDetailsData>,
) => JSON.stringify({ basic, variants: variantList, images, details });

const ProductFormScreen: React.FC<{ editProductId?: string }> = ({ editProductId }) => {
    const router = useRouter();
    const { isDesktop } = useResponsive();
    const isEditMode = Boolean(editProductId);
    const [step, setStep] = useState(0);
    const [maxUnlocked, setMaxUnlocked] = useState(isEditMode ? STEPS.length - 1 : 0);
    const [basicErrors, setBasicErrors] = useState<string[]>([]);
    const [variantErrors, setVariantErrors] = useState<string[]>([]);
    const [imageErrors, setImageErrors] = useState<string[]>([]);
    const [detailErrors, setDetailErrors] = useState<string[]>([]);
    const [basicData, setBasicData] = useState(initBasicData);
    const [variants, setVariants] = useState<Variant[]>(initVariants);
    const [imagesData, setImagesData] = useState(initImagesData);
    const [detailsData, setDetailsData] = useState(initDetailsData);
    const [isDirty, setIsDirty] = useState(false);
    const [discardModal, setDiscardModal] = useState(false);
    const [loadingProduct, setLoadingProduct] = useState(isEditMode);
    const [savingUpdate, setSavingUpdate] = useState(false);
    const initialSnapshotRef = useRef<string | null>(null);
    const pendingHydrationRef = useRef(false);

    // ── Sweet Alert state ──────────────────────────────────────
    const [sweetAlertVisible, setSweetAlertVisible] = useState(false);
    const [sweetAlertStage, setSweetAlertStage] = useState<SweetAlertStage>("confirm");
    const [isSaving, setIsSaving] = useState(false);
    const savingRef = useRef(false);
    const [savedProductId, setSavedProductId] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<ProductFormCatalog | null>(null);
    const [isB2B, setIsB2B] = useState(false);
    const [validationTrigger, setValidationTrigger] = useState(0);
    const stepScrollRef = useRef<ScrollView>(null);

    const { toasts, showErrors, showToast, removeToast } = useToast();

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                await hydrateSellerSession();
                const profile = await fetchSellerProfile();
                if (!active) return;
                setIsB2B(toUiBusinessCategory(profile.business?.businessCategory) === "B2B");
            } catch {
                if (active) setIsB2B(false);
            }
        })();
        return () => { active = false; };
    }, []);

    const reloadCatalog = useCallback(() => {
        Promise.all([fetchProductFormCatalog(), fetchSizes().catch(() => [])])
            .then(([data, sizeRows]) => {
                const byKey = new Map<string, { id: number; name: string; code: string }>();
                for (const s of data.sizes ?? []) {
                    byKey.set(String(s.name).trim().toLowerCase(), s);
                }
                for (const s of sizeRows) {
                    const key = String(s.name).trim().toLowerCase();
                    if (!key || byKey.has(key)) continue;
                    byKey.set(key, { id: Number(s.id), name: s.name, code: s.code });
                }
                setCatalog({ ...data, sizes: Array.from(byKey.values()) });
                if (!PREFILL_WITH_DUMMY) return;
                setBasicData((prev) => {
                    if (prev.categoryId) return prev;
                    const cat =
                        data.categories.find((c) => c.subcategories.length > 0) ??
                        data.categories[0];
                    const sub = cat?.subcategories[0];
                    if (!cat || !sub) return prev;
                    return {
                        ...prev,
                        category: cat.name,
                        categoryId: cat.id,
                        categorySubName: sub.name,
                        categorySubId: sub.id,
                        subcategory: sub.children?.[0]?.name ?? sub.name,
                        subcategoryId: sub.id,
                    };
                });
            })
            .catch((err: unknown) => {
                const msg = err instanceof ApiError ? err.message : "Failed to load catalog.";
                showToast(msg, "error");
            });
    }, [showToast]);

    useEffect(() => {
        reloadCatalog();
    }, [reloadCatalog]);

    useEffect(() => {
        if (!catalog) return;
        const weightKg = parseFloat(String(basicData.weight ?? "").trim());
        if (!Number.isFinite(weightKg) || weightKg <= 0) return;
        fetchDeliveryChargesForWeight(weightKg)
            .then((slab) => {
                setBasicData((p) => ({
                    ...p,
                    weightSlab: slab.label,
                    customDeliveryCharge: !!slab.custom,
                    intraCityCharge: slab.custom ? "" : String(slab.intraCityCharge),
                    metroMetroCharge: slab.custom ? "" : String(slab.metroMetroCharge),
                }));
            })
            .catch(() => {
                const slab = resolveWeightSlab(String(basicData.weight), catalog.deliverySlabs);
                setBasicData((p) => ({
                    ...p,
                    weightSlab: slab.label,
                    customDeliveryCharge: !!slab.custom,
                    intraCityCharge: slab.custom ? "" : String(slab.intraCityCharge),
                    metroMetroCharge: slab.custom ? "" : String(slab.metroMetroCharge),
                }));
            });
    }, [catalog]);

    useFocusEffect(
        useCallback(() => {
            reloadCatalog();
        }, [reloadCatalog])
    );

    useEffect(() => {
        if (!isEditMode || !editProductId) return;
        let cancelled = false;

        (async () => {
            setLoadingProduct(true);
            try {
                await hydrateSellerSession();
                if (!ensureSellerId()) {
                    if (!cancelled) showToast("Please sign in to edit products.", "error");
                    return;
                }
                const detail = await fetchProductDetail(String(editProductId));
                if (cancelled) return;
                const mapped = mapProductDetailToEditForm(detail);
                pendingHydrationRef.current = true;
                initialSnapshotRef.current = null;
                setBasicData(mapped.basic);
                setVariants(mapped.variants.length > 0 ? mapped.variants : initVariants());
                setImagesData(mapped.images);
                setDetailsData(mapped.details);
                setIsDirty(false);
            } catch (err: unknown) {
                if (cancelled) return;
                const msg =
                    err instanceof ApiError
                        ? err.message
                        : err instanceof Error
                          ? err.message
                          : "Failed to load product.";
                showToast(msg, "error");
            } finally {
                if (!cancelled) setLoadingProduct(false);
            }
        })();

        return () => { cancelled = true; };
    }, [editProductId, isEditMode, showToast]);

    useEffect(() => {
        if (!isEditMode || loadingProduct || !pendingHydrationRef.current) return;
        if (!catalog) return;
        if (basicData.category && !basicData.categorySubName?.trim() && basicData.categorySubId == null) return;

        initialSnapshotRef.current = serializeEditFormState(
            basicData,
            variants,
            imagesData,
            detailsData,
        );
        pendingHydrationRef.current = false;
        setIsDirty(false);
    }, [isEditMode, loadingProduct, catalog, basicData.category, basicData.categorySubName]);

    useEffect(() => {
        if (!isEditMode || loadingProduct || initialSnapshotRef.current == null) return;
        const current = serializeEditFormState(basicData, variants, imagesData, detailsData);
        setIsDirty(current !== initialSnapshotRef.current);
    }, [basicData, variants, imagesData, detailsData, isEditMode, loadingProduct]);

    useEffect(() => {
        if (!isEditMode || !catalog || !basicData.category) return;
        const middle = findCategorySubForProductSub(
            catalog,
            basicData.category,
            basicData.subcategoryId,
            basicData.subcategory,
        );
        if (!middle.categorySubName) return;
        setBasicData((prev) => {
            const nextSubId = middle.categorySubId ?? undefined;
            if (prev.categorySubName === middle.categorySubName && prev.categorySubId === nextSubId) {
                return prev;
            }
            return {
                ...prev,
                categorySubName: middle.categorySubName,
                categorySubId: nextSubId,
            };
        });
    }, [catalog, basicData.category, basicData.subcategoryId, basicData.subcategory, isEditMode]);

    useFocusEffect(
        useCallback(() => {
            if (isEditMode) return;
            setStep(0);
            setMaxUnlocked(PREFILL_WITH_DUMMY ? STEPS.length - 1 : 0);
            setBasicErrors([]);
            setVariantErrors([]);
            setImageErrors([]);
            setDetailErrors([]);
            setBasicData(initBasicData());
            setVariants(initVariants());
            setImagesData(initImagesData());
            setDetailsData(initDetailsData());
            setIsDirty(false);
        }, [isEditMode])
    );

    const markDirty = () => { if (isEditMode) setIsDirty(true); };

    const patchDetails = (patch: Record<string, unknown>) => {
        setDetailsData((p) => ({ ...p, ...patch }));
        markDirty();
    };
    const upDetails = (k: string, v: any) => patchDetails({ [k]: v });
    const upBasic = (k: string, v: any) => {
        let cleanVal = v;
        if (["weight", "length", "width", "height"].includes(k)) {
            cleanVal = v.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
        }
        setBasicData((p) => {
            const next = { ...p, [k]: cleanVal };
            if (k === "weight") {
                const slab = resolveWeightSlab(cleanVal, catalog?.deliverySlabs);
                next.weightSlab = slab.label;
                next.customDeliveryCharge = !!slab.custom;
                if (slab.custom) {
                    next.intraCityCharge = "";
                    next.metroMetroCharge = "";
                } else {
                    next.intraCityCharge = String(slab.intraCityCharge);
                    next.metroMetroCharge = String(slab.metroMetroCharge);
                }
            }
            return next;
        });
        if (k === "weight") {
            const weightKg = parseFloat(cleanVal);
            if (Number.isFinite(weightKg) && weightKg > 0) {
                fetchDeliveryChargesForWeight(weightKg)
                    .then((slab) => {
                        setBasicData((p) => ({
                            ...p,
                            weightSlab: slab.label,
                            customDeliveryCharge: !!slab.custom,
                            intraCityCharge: slab.custom ? "" : String(slab.intraCityCharge),
                            metroMetroCharge: slab.custom ? "" : String(slab.metroMetroCharge),
                        }));
                    })
                    .catch(() => {
                        /* keep client slab from resolveWeightSlab */
                    });
            }
        }
        setBasicErrors(prev => prev.filter(e => !e.toLowerCase().includes(k.toLowerCase())));
        markDirty();
    };
    const rmVariant = (id: string) => { setVariants(p => p.filter(v => v.id !== id)); markDirty(); };

    const goToProductManagement = () => {
        router.replace(PRODUCT_MANAGEMENT_ROUTE);
    };

    const goBack = () => {
        if (Platform.OS === "web") {
            goToProductManagement();
        } else if (router.canGoBack()) {
            router.back();
        } else {
            goToProductManagement();
        }
    };

    const handleBackPress = () => {
        if (isEditMode && isDirty) {
            setDiscardModal(true);
        } else if (isEditMode) {
            goBack();
        } else {
            resetAndGoBack();
        }
    };

    const resetFormState = () => {
        setStep(0);
        setMaxUnlocked(PREFILL_WITH_DUMMY ? STEPS.length - 1 : 0);
        setBasicErrors([]);
        setVariantErrors([]);
        setImageErrors([]);
        setDetailErrors([]);
        setBasicData(initBasicData());
        setVariants(initVariants());
        setImagesData(initImagesData());
        setDetailsData(initDetailsData());
        setSweetAlertVisible(false);
        setSavedProductId(null);
        setIsDirty(false);
    };

    const resetAndGoBack = () => {
        resetFormState();
        goToProductManagement();
    };

    const handleTabPress = (i: number) => {
        if (isEditMode || i <= maxUnlocked) setStep(i);
    };

    useEffect(() => {
        const timer = setTimeout(() => scrollViewsToTop(stepScrollRef.current), 50);
        return () => clearTimeout(timer);
    }, [step]);

    const handleContinue = () => {
        if (step === 0) {
            const errors = validateBasicInfo(basicData);
            setBasicErrors(errors);
            if (errors.length > 0) {
                showErrors(errors);
                setValidationTrigger((prev) => prev + 1);
                return;
            }
            setBasicErrors([]);
        }
        if (step === 1) {
            const errors = validateVariants(variants, {
                sweets: isSweetsCategory(
                    basicData.category,
                    basicData.categorySubName,
                    basicData.subcategory
                ),
            });
            setVariantErrors(errors);
            if (errors.length > 0) {
                showErrors(errors);
                setValidationTrigger((prev) => prev + 1);
                return;
            }
            setVariantErrors([]);
        }
        if (step === 2) {
            const errors = validateImages(imagesData);
            setImageErrors(errors);
            if (errors.length > 0) {
                showErrors(errors);
                setValidationTrigger((prev) => prev + 1);
                return;
            }
            setImageErrors([]);
        }
        const next = step + 1;
        setMaxUnlocked(prev => Math.max(prev, next));
        setStep(next);
        setTimeout(() => scrollViewsToTop(stepScrollRef.current), 50);
    };

    // ── handleSave: validate first, then show SweetAlert confirm ──
    const handleSave = () => {
        const basicErrs = validateBasicInfo(basicData);
        const variantErrs = validateVariants(variants, {
            sweets: isSweetsCategory(
                basicData.category,
                basicData.categorySubName,
                basicData.subcategory
            ),
        });
        const imageErrs = validateImages(imagesData);
        const detailErrs = validateDetails(detailsData);
        const allErrors = [...basicErrs, ...variantErrs, ...imageErrs, ...detailErrs];

        setBasicErrors(basicErrs);
        setVariantErrors(variantErrs);
        setImageErrors(imageErrs);
        setDetailErrors(detailErrs);

        if (allErrors.length > 0) {
            showErrors(allErrors);
            const targetStep =
                basicErrs.length > 0 ? 0
                : variantErrs.length > 0 ? 1
                : imageErrs.length > 0 ? 2
                : 3;
            setStep(targetStep);
            setTimeout(() => setValidationTrigger((prev) => prev + 1), 80);
            return;
        }

        setSavedProductId(null);
        setSweetAlertStage("confirm");
        setSweetAlertVisible(true);
    };

    const handleSweetConfirm = async () => {
        if (isSaving || savingRef.current) return;
        savingRef.current = true;
        setIsSaving(true);
        try {
            const enrichedVariants = enrichVariantsWithCatalogIds(variants, catalog);
            const payload = await buildCreateProductPayload({
                basic: basicData,
                variants: enrichedVariants,
                images: imagesData,
                details: detailsData,
            });
            const result = await createProduct(payload);
            const id = String(result?.productId ?? "").trim();
            if (!/^\d+$/.test(id)) {
                throw new Error("Save failed: server did not return a valid product ID.");
            }
            setSavedProductId(id);
            setSweetAlertStage("success");
            setSweetAlertVisible(true);
            showToast(`Product saved (ID ${id})`, "success");
        } catch (err: unknown) {
            const msg =
                err instanceof ApiError
                    ? err.message
                    : err instanceof Error
                      ? err.message
                      : "Failed to save product.";
            showToast(msg, "error");
            setSweetAlertVisible(false);
        } finally {
            savingRef.current = false;
            setIsSaving(false);
        }
    };

    // ── User closes success stage → navigate away ──────────────
    const handleSweetDone = () => {
        setSweetAlertVisible(false);
        if (isEditMode) {
            goToProductManagement();
            return;
        }
        resetFormState();
        goToProductManagement();
    };

    // ── User cancels confirm stage ─────────────────────────────
    const handleSweetCancel = () => {
        setSweetAlertVisible(false);
    };

    const handleUpdate = async () => {
        if (!editProductId || !isDirty || savingUpdate) return;
        const basicErrs = validateBasicInfo(basicData);
        const variantErrs = validateVariants(variants, {
            sweets: isSweetsCategory(
                basicData.category,
                basicData.categorySubName,
                basicData.subcategory
            ),
        });
        const imageErrs = validateImages(imagesData);
        const detailErrs = validateDetails(detailsData);
        const allErrors = [...basicErrs, ...variantErrs, ...imageErrs, ...detailErrs];

        setBasicErrors(basicErrs);
        setVariantErrors(variantErrs);
        setImageErrors(imageErrs);
        setDetailErrors(detailErrs);

        if (allErrors.length > 0) {
            showErrors(allErrors);
            const targetStep =
                basicErrs.length > 0 ? 0
                : variantErrs.length > 0 ? 1
                : imageErrs.length > 0 ? 2
                : 3;
            setStep(targetStep);
            setTimeout(() => setValidationTrigger((prev) => prev + 1), 80);
            return;
        }

        setSavingUpdate(true);
        try {
            const enrichedVariants = enrichVariantsWithCatalogIds(
                variants.map((v) => ({ ...v, videoUrl: v.videoUrl ?? "" })),
                catalog,
            );
            const payload = await buildUpdateProductPayload({
                basic: basicData,
                variants: enrichedVariants,
                images: imagesData,
                details: detailsData,
            });
            await updateProduct(String(editProductId), payload);
            initialSnapshotRef.current = serializeEditFormState(
                basicData,
                variants,
                imagesData,
                detailsData,
            );
            setIsDirty(false);
            setSavedProductId(String(editProductId));
            setSweetAlertStage("success");
            setSweetAlertVisible(true);
            showToast("Product updated — submitted for admin re-approval.", "success");
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.message : "Failed to update product.";
            showToast(msg, "error");
        } finally {
            setSavingUpdate(false);
        }
    };

    const pageTitle = isEditMode ? "Edit Product" : "Add New Product";

    const leftAction =
        step === 0 ? (
            <TouchableOpacity style={isDesktop ? ds.cancelBtn : sc.cancelBtn} onPress={handleBackPress}>
                <AppText style={isDesktop ? ds.cancelTxt : sc.cancelTxt}>Cancel</AppText>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity style={isDesktop ? ds.prevBtn : sc.prevBtn} onPress={() => setStep((s) => s - 1)}>
                <Ionicons name="chevron-back" size={16} color={C.navy} />
                <AppText style={isDesktop ? ds.prevTxt : sc.prevTxt}>Back</AppText>
            </TouchableOpacity>
        );

    const rightAction = isEditMode ? (
        <TouchableOpacity
            style={[isDesktop ? ds.saveBtn : sc.saveBtn, !isDirty && sc.saveBtnDim]}
            onPress={handleUpdate}
            activeOpacity={isDirty && !savingUpdate ? 0.85 : 0.5}
            disabled={!isDirty || savingUpdate}
        >
            {savingUpdate ? (
                <ActivityIndicator color={C.white} size="small" />
            ) : (
                <MaterialCommunityIcons name="content-save-check-outline" size={18} color={C.white} />
            )}
            <AppText style={isDesktop ? ds.saveTxt : sc.saveTxt}>
                {savingUpdate ? "Saving…" : isDirty ? "Update Product" : "No Changes"}
            </AppText>
        </TouchableOpacity>
    ) : step === 3 ? (
        <TouchableOpacity style={isDesktop ? ds.saveBtn : sc.saveBtn} onPress={handleSave}>
            <MaterialCommunityIcons name="content-save-check-outline" size={18} color={C.white} />
            <AppText style={isDesktop ? ds.saveTxt : sc.saveTxt}>Save Product</AppText>
        </TouchableOpacity>
    ) : (
        <TouchableOpacity style={isDesktop ? ds.nextBtn : sc.nextBtn} onPress={handleContinue}>
            <AppText style={isDesktop ? ds.nextTxt : sc.nextTxt}>Continue</AppText>
            <Ionicons name="chevron-forward" size={16} color={C.white} />
        </TouchableOpacity>
    );

    const actionBar = (
        <View style={isDesktop ? ds.bar : sc.bar}>
            <View style={isDesktop ? ds.barLeft : sc.barLeft}>{leftAction}</View>
            <View style={isDesktop ? ds.barRight : sc.barRight}>{rightAction}</View>
        </View>
    );

    const stepContent = (
        <>
            {step === 0 && (
                <StepBasicInfo
                    data={basicData}
                    onChange={upBasic}
                    errors={basicErrors}
                    validationTrigger={validationTrigger}
                    catalog={catalog}
                    isDesktop={isDesktop}
                    scrollRef={stepScrollRef}
                    editProductId={editProductId}
                />
            )}
            {step === 1 && (
                <StepVariants
                    variants={variants}
                    setVariants={(fn: any) => { setVariants(fn); markDirty(); }}
                    rmVariant={rmVariant}
                    errors={variantErrors}
                    catalog={catalog}
                    productName={basicData.name ?? ""}
                    basicData={basicData}
                    isDesktop={isDesktop}
                    scrollRef={stepScrollRef}
                    validationTrigger={validationTrigger}
                    onValidationFail={(errors: string[]) => {
                        setVariantErrors(errors);
                        showErrors(errors);
                        setValidationTrigger((prev) => prev + 1);
                    }}
                    isB2B={isB2B}
                />
            )}
            {step === 2 && (
                <StepImages
                    data={imagesData}
                    onChange={(k: string, v: any) => { setImagesData((p) => ({ ...p, [k]: v })); markDirty(); }}
                    errors={imageErrors}
                    isDesktop={isDesktop}
                    scrollRef={stepScrollRef}
                    validationTrigger={validationTrigger}
                />
            )}
            {step === 3 && (
                <StepDetails
                    data={detailsData}
                    onChange={upDetails}
                    errors={detailErrors}
                    validationTrigger={validationTrigger}
                    isDesktop={isDesktop}
                    catalog={catalog}
                    scrollRef={stepScrollRef}
                    reloadCatalog={reloadCatalog}
                />
            )}
        </>
    );

    const sweetAlert = (
        <SweetAlert
            visible={sweetAlertVisible}
            stage={sweetAlertStage}
            productName={basicData.name ?? ""}
            savedProductId={savedProductId}
            isSaving={isSaving}
            successTitle={isEditMode && sweetAlertStage === "success" ? "Submitted for Approval!" : undefined}
            successSubtitle={
                isEditMode && sweetAlertStage === "success"
                    ? `"${basicData.name || "Product"}" was updated and sent for admin re-approval. It will stay hidden from customers until approved.${
                          editProductId ? `\nProduct ID: ${editProductId}` : ""
                      }`
                    : undefined
            }
            hideSuccessStats={isEditMode && sweetAlertStage === "success"}
            onConfirm={handleSweetConfirm}
            onCancel={handleSweetCancel}
            onDone={handleSweetDone}
        />
    );

    if (isEditMode && loadingProduct) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
                <ActivityIndicator size="large" color={C.navy} />
            </View>
        );
    }

    if (isDesktop) {
        return (
            <View style={ds.page}>
                <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />
                <View style={ds.headerBlock}>
                    <View style={ds.topBar}>
                        <TouchableOpacity onPress={handleBackPress} style={ds.topBtn}>
                            <Ionicons name="arrow-back" size={22} color={C.white} />
                        </TouchableOpacity>
                        <View style={ds.topCenter}>
                            <View style={ds.breadcrumb}>
                                <AppText style={ds.breadcrumbDim}>Dashboard</AppText>
                                <AppText style={ds.breadcrumbSep}>›</AppText>
                                <AppText style={ds.breadcrumbActive}>{pageTitle}</AppText>
                            </View>
                            <AppText style={ds.topTitle}>{pageTitle}</AppText>
                            <AppText style={ds.topSub}>{STEPS[step]?.label} · Step {step + 1} of {STEPS.length}</AppText>
                        </View>
                        <TouchableOpacity onPress={handleBackPress} style={ds.topBtn}>
                            {isEditMode && isDirty ? (
                                <View style={sc.dirtyDot} />
                            ) : (
                                <Ionicons name="close" size={22} color={C.white} />
                            )}
                        </TouchableOpacity>
                    </View>
                    <StepProgressBar step={step} maxUnlocked={maxUnlocked} onTabPress={handleTabPress} isDesktop />
                </View>
                {isEditMode && isDirty ? (
                    <View style={sc.unsavedBanner}>
                        <MaterialCommunityIcons name="pencil-circle-outline" size={14} color={C.amber} />
                        <AppText style={sc.unsavedTxt}>Unsaved changes · remember to update the product</AppText>
                    </View>
                ) : null}
                <View style={ds.mainColumn}>
                    <View style={ds.mainScroll} key={`step-${step}`}>{stepContent}</View>
                    <View style={ds.barWrap}>{actionBar}</View>
                </View>
                <DiscardModal
                    visible={discardModal}
                    onDiscard={() => { setDiscardModal(false); goBack(); }}
                    onKeep={() => setDiscardModal(false)}
                />
                <ToastContainer toasts={toasts} onRemove={removeToast} />
                {sweetAlert}
            </View>
        );
    }

    return (
        <SafeAreaView style={sc.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />
            <View style={sc.header}>
                <TouchableOpacity onPress={handleBackPress} style={sc.hBtn}>
                    <Ionicons name="chevron-back" size={22} color={C.white} />
                </TouchableOpacity>
                <View style={sc.hCenter}>
                    <AppText style={sc.hTitle}>{pageTitle}</AppText>
                    <AppText style={sc.hSub}>{STEPS[step]?.label} · Step {step + 1} of {STEPS.length}</AppText>
                </View>
                <TouchableOpacity onPress={handleBackPress} style={sc.hBtn}>
                    {isEditMode && isDirty ? (
                        <View style={sc.dirtyDot} />
                    ) : (
                        <Ionicons name="close" size={22} color={C.white} />
                    )}
                </TouchableOpacity>
            </View>
            {isEditMode && isDirty ? (
                <View style={sc.unsavedBanner}>
                    <MaterialCommunityIcons name="pencil-circle-outline" size={14} color={C.amber} />
                    <AppText style={sc.unsavedTxt}>Unsaved changes · remember to update the product</AppText>
                </View>
            ) : null}
            <StepProgressBar step={step} maxUnlocked={maxUnlocked} onTabPress={handleTabPress} />
            <View style={{ flex: 1, backgroundColor: C.bg }} key={`step-${step}`}>{stepContent}</View>
            {actionBar}
            <DiscardModal
                visible={discardModal}
                onDiscard={() => { setDiscardModal(false); goBack(); }}
                onKeep={() => setDiscardModal(false)}
            />
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            {sweetAlert}
        </SafeAreaView>
    );
};

const AddNewProduct: React.FC = () => <ProductFormScreen />;

export default AddNewProduct;
export { ProductFormScreen };

// ─────────────────────────────────────────────────────────────
// SHARED ATOM STYLES
// ─────────────────────────────────────────────────────────────
const at = StyleSheet.create({
    card: { backgroundColor: C.cardBg, borderRadius: 16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, borderWidth: 1, borderColor: C.border, shadowColor: "#0F1A4A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    secHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, paddingLeft: 10, borderLeftWidth: 3, borderRadius: 2 },
    secHeadText: { fontFamily: fontFamilies.bold, fontSize: 15, letterSpacing: 0.1 },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
    cardHint: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, marginBottom: 10, fontStyle: "italic" },
    lbl: { fontFamily: fontFamilies.semiBold, fontSize: 12.5, color: C.textMid, marginBottom: 6, marginTop: 12 },
    hint: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 4 },
    cc: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, textAlign: "right", marginTop: 3 },
    fieldWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
    fieldFocused: { borderColor: C.navy, backgroundColor: C.white },
    fieldError: { borderColor: C.red, backgroundColor: "#FFF8F8" },
    fieldPfx: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid, marginRight: 6 },
    fieldSfx: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid, marginLeft: 6 },
    fieldInput: { flex: 1, fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, paddingVertical: 10 },
    fieldReadOnly: { backgroundColor: "#F8FAFC" },
    fieldInputReadOnly: { color: C.textMid },
    drop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, minHeight: 44 },
    dropText: { fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, flex: 1 },
    dropPh: { color: C.textPlaceholder },
    dropDisabled: { opacity: 0.55, backgroundColor: "#F8FAFC" },
    hsnWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
    hsnInput: { flex: 1, fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, paddingVertical: 10 },
    row2: { flexDirection: "row", gap: 10 },
    row3: { flexDirection: "row", gap: 8 },
    edCard: { borderWidth: 1.2, borderColor: C.border, borderRadius: 10, overflow: "hidden" },
    toolbar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 2, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: "#F2F4FB", borderBottomWidth: 1, borderBottomColor: C.border },
    tbBtn: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6, minWidth: 28, alignItems: "center", justifyContent: "center" },
    tbTxt: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textMid },
    tbSep: { width: 1, height: 16, backgroundColor: C.border, marginHorizontal: 4 },
    edInput: { paddingHorizontal: 12, paddingVertical: 10, fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, minHeight: 56 },
    edFoot: { paddingHorizontal: 12, paddingBottom: 8, alignItems: "flex-end" },
    radioRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    radioPill: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
    radioPillOn: { borderColor: C.navy, backgroundColor: C.navyGhost },
    radioDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.border },
    radioDotOn: { borderColor: C.navy, backgroundColor: C.navy },
    radioPillTxt: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textMid },
    radioPillTxtOn: { color: C.navy, fontFamily: fontFamilies.semiBold },
    customRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    tog: { width: 44, height: 26, borderRadius: 13, backgroundColor: C.border, justifyContent: "center", paddingHorizontal: 2, marginTop: 2 },
    togOn: { backgroundColor: C.accent5 },
    togThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 2 },
    togThumbOn: { transform: [{ translateX: 18 }] },
    customTitle: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textDark },
    customSub: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, marginTop: 3, lineHeight: 17 },
    custExpandWrap: { marginTop: 4 },
    custTogRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
    custTogTitle: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textDark },
    custTogSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 2, lineHeight: 16 },
    custNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16, backgroundColor: "#EDFAF4", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#A3E9C8" },
    custNoteTxt: { fontFamily: fontFamilies.regular, fontSize: 11.5, color: C.accent5, flex: 1, lineHeight: 17 },
    custSubField: { flexDirection: "row", gap: 10, marginTop: 10, marginLeft: 8, paddingLeft: 4 },
    custSubFieldBar: { width: 2, borderRadius: 2, backgroundColor: C.accent5, alignSelf: "stretch", opacity: 0.5 },
    custSectionTitle: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.accent4, marginBottom: 12 },
    custFieldsBox: { marginTop: 14, borderWidth: 1.2, borderColor: C.border, borderRadius: 12, padding: 14, backgroundColor: C.inputBg },
    custFieldsHint: { fontFamily: fontFamilies.regular, fontSize: 12.5, color: C.textLight, lineHeight: 18, marginBottom: 14 },
    custFieldRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 12 },
    custFieldNameWrap: { flex: 1, minWidth: 160 },
    custFieldTypeWrap: { width: 110 },
    custFieldReqWrap: { minWidth: 100 },
    custFieldDeleteBtn: { width: 38, height: 38, borderRadius: 8, borderWidth: 1.2, borderColor: C.red, alignItems: "center", justifyContent: "center", backgroundColor: C.white },
    custAddFieldBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: C.accent4, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
    custAddFieldBtnTxt: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.white },
});

const eb = StyleSheet.create({
    idBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: C.navyGhost,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: C.navyBorder,
    },
    idBadgeLbl: { fontFamily: fontFamilies.medium, fontSize: 11, color: C.textMid },
    idBadgeVal: { fontFamily: fontFamilies.bold, fontSize: 13, color: C.navy },
    idBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green, marginLeft: 4 },
    idBadgeStatus: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: C.greenText },
});

const vt = StyleSheet.create({
    hdr: { flexDirection: "row", alignItems: "center", gap: 8 },
    badge: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    badgeTxt: { fontFamily: fontFamilies.bold, fontSize: 12, color: C.navy },
    title: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark, flex: 1 },
    rmBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    rmTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.red },
    lblRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 6 },
    auto: { backgroundColor: C.greenPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    autoTxt: { fontFamily: fontFamilies.semiBold, fontSize: 10, color: C.greenText },
    fileRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: C.inputBg },
    fileTxt: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, flex: 1 },
    browseBtn: { borderWidth: 1, borderColor: C.navyBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
    browseTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.navy },
    addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: C.navy, borderRadius: 14, paddingVertical: 13, marginBottom: 8 },
    addIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    addTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.navy },
    infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.navyGhost, borderRadius: 12, padding: 12, marginBottom: 0 },
    infoTxt: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textMid, flex: 1, lineHeight: 18 },
    reuseNote: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.navyGhost, borderRadius: 12, padding: 12, marginTop: 8 },
    reuseNoteTxt: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textMid, flex: 1, lineHeight: 18 },
    addSizeLink: { marginTop: 6, alignSelf: "flex-start" },
    addSizeLinkTxt: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: C.navy },
    saveHint: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: C.greenText, marginTop: 4 },
    sizeModalOverlay: { flex: 1, backgroundColor: "rgba(30,40,90,0.35)", justifyContent: "center", alignItems: "center", padding: 20 },
    sizeModalCard: { width: "100%", maxWidth: 400, backgroundColor: C.white, borderRadius: 16, padding: 20 },
    sizeModalTitle: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.textDark },
    sizeModalSub: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textMid, marginBottom: 12, marginTop: 4 },
    sizeModalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
    sizeModalCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border },
    sizeModalCancelTxt: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textMid },
    sizeModalSave: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: C.navy, minWidth: 100, alignItems: "center" },
    sizeModalSaveTxt: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.white },
});

const dt = StyleSheet.create({
    responsiveCol: { flexDirection: "column", gap: 10 },
    responsiveField: { width: "100%", minWidth: 0 },
    outBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1.2, borderColor: C.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, backgroundColor: C.white },
    outBtnFull: { width: "100%", alignSelf: "stretch" },
    outBtnTxt: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.navy },
    sizeDataHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: 4 },
    addSizeOrangeBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.accent4, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
    addSizeOrangeBtnTxt: { fontFamily: fontFamilies.bold, fontSize: 13, color: C.white },
    sizeTableScroll: { marginTop: 8, marginBottom: 4 },
    sizeTableWrap: { borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: "hidden", backgroundColor: C.white },
    sizeTableHeader: { flexDirection: "row", backgroundColor: C.navyGhost, borderBottomWidth: 1, borderBottomColor: C.border },
    sizeTableTh: { paddingVertical: 10, paddingHorizontal: 6, justifyContent: "center", borderRightWidth: 1, borderRightColor: C.border },
    sizeTableThAction: { width: 56, minWidth: 56, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
    sizeTableThTxt: { fontFamily: fontFamilies.semiBold, fontSize: 10, color: C.textMid, textAlign: "center" },
    sizeTableRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white },
    sizeTableRowAlt: { backgroundColor: "#FAFBFE" },
    sizeTableTd: { padding: 5, borderRightWidth: 1, borderRightColor: C.border, justifyContent: "center" },
    sizeTableTdAction: { width: 56, minWidth: 56, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
    sizeTableInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 7, fontFamily: fontFamilies.regular, fontSize: 12, color: C.textDark, minHeight: 34 },
    sizeTableDelBtn: { padding: 6, borderRadius: 8, backgroundColor: C.redPale },
    sizeEmptyHint: { marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: C.navyGhost, borderWidth: 1, borderColor: C.navyBorder },
    sizeEmptyHintTxt: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textMid, textAlign: "center", lineHeight: 18 },
    togRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
    payRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 },
    payOption: {
        flex: 1,
        minWidth: 200,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: C.inputBg,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: C.border,
    },
    payOptionOn: { borderColor: C.navy, backgroundColor: C.navyGhost },
    payIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: C.white,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: C.border,
    },
    payIconWrapOn: { backgroundColor: C.navy, borderColor: C.navy },
    payOptionLbl: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textMid, flex: 1 },
    payOptionLblOn: { fontFamily: fontFamilies.semiBold, color: C.navy },
    payOptionRing: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: C.border },
    chartErrorBox: {
        backgroundColor: C.redPale,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#FECACA",
        gap: 4,
    },
    chartErrorTxt: { fontFamily: fontFamilies.medium, fontSize: 12, color: C.red },
    sizeChartReview: {
        marginTop: 8,
        padding: 14,
        borderRadius: 12,
        backgroundColor: C.navyGhost,
        borderWidth: 1,
        borderColor: C.navyBorder,
        gap: 8,
    },
    reviewRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
    reviewLbl: { fontFamily: fontFamilies.medium, fontSize: 12, color: C.textMid, flex: 1 },
    reviewVal: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.textDark, flex: 1, textAlign: "right" },
    reviewMeasurements: { marginTop: 4, padding: 10, borderRadius: 10, backgroundColor: C.white, gap: 4 },
    reviewMeasureGrid: { gap: 4 },
    reviewMeasureTxt: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textMid },
    reviewSizeCellTxt: { fontFamily: fontFamilies.medium, fontSize: 12, color: C.textDark },
    reviewImageWrap: {
        marginTop: 8,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.white,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 120,
    },
    reviewChartImage: { width: "100%", height: 180 },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
    addBtnTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12.5, color: C.navy },
    specRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    specDel: { width: 36, height: 36, backgroundColor: C.redPale, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});

const ds = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: C.bg,
        ...(Platform.OS === "web" ? ({ minHeight: "100vh" } as object) : {}),
    },
    headerBlock: {
        backgroundColor: C.navyDeep,
        marginHorizontal: 12,
        marginTop: 12,
        borderRadius: 22,
        overflow: "hidden",
        shadowColor: C.navyDeep,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
    },
    topBar: { flexDirection: "row", alignItems: "center", backgroundColor: "transparent", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
    topBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
    topCenter: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
    breadcrumb: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    breadcrumbDim: { fontFamily: fontFamilies.medium, fontSize: 12, color: "rgba(255,255,255,0.75)" },
    breadcrumbSep: { fontFamily: fontFamilies.medium, fontSize: 12, color: "rgba(255,255,255,0.45)" },
    breadcrumbActive: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    topTitle: { fontFamily: fontFamilies.bold, fontSize: 22, color: C.white, letterSpacing: -0.3 },
    topSub: { fontFamily: fontFamilies.regular, fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
    hStepBar: { paddingTop: 8, paddingBottom: 16, maxWidth: CONTENT_MAX + 64, width: "100%", alignSelf: "center", backgroundColor: "transparent" },
    mainColumn: { flex: 1, minWidth: 0, width: "100%", backgroundColor: C.bg },
    mainScroll: { flex: 1 },
    stepScroll: { flex: 1 },
    barWrap: { backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 32, paddingVertical: 16, width: "100%" },
    bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center" },
    barLeft: { alignItems: "flex-start" },
    barRight: { alignItems: "flex-end" },
    cancelBtn: { minWidth: 140, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", borderWidth: 1.2, borderColor: C.border, borderRadius: 12, paddingVertical: 14, backgroundColor: C.white },
    cancelTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid },
    prevBtn: { minWidth: 140, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 12, paddingVertical: 14, backgroundColor: C.white },
    prevTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.navy },
    nextBtn: { minWidth: 180, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 14, shadowColor: C.navyDeep, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
    nextTxt: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.white },
    saveBtn: { minWidth: 200, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent5, borderRadius: 12, paddingVertical: 14, shadowColor: C.accent5, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    saveTxt: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.white },
    card: { borderRadius: 20, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 22, marginBottom: 0, shadowOpacity: 0.08, shadowRadius: 16 },
    fieldWrap: { minHeight: 48, borderRadius: 12, paddingHorizontal: 14 },
    fieldFocused: { borderWidth: 2 },
});

const sc = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { backgroundColor: C.navyDeep, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 10, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 10 : 10 },
    hBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
    hCenter: { flex: 1, alignItems: "center" },
    hTitle: { fontFamily: fontFamilies.bold, fontSize: 17, color: C.white },
    hSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },
    bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10 },
    barLeft: { alignItems: "flex-start" },
    barRight: { alignItems: "flex-end" },
    cancelBtn: { minWidth: 120, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", borderWidth: 1.2, borderColor: C.border, borderRadius: 12, paddingVertical: 13 },
    cancelTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid },
    prevBtn: { minWidth: 110, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 12, paddingVertical: 13 },
    prevTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.navy },
    nextBtn: { minWidth: 150, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 13 },
    nextTxt: { fontFamily: fontFamilies.bold, fontSize: 14, color: C.white },
    saveBtn: { minWidth: 160, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 13 },
    saveBtnDim: { opacity: 0.45 },
    saveTxt: { fontFamily: fontFamilies.bold, fontSize: 14, color: C.white },
    dirtyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.amber },
    unsavedBanner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.amberPale, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#FDE68A" },
    unsavedTxt: { fontFamily: fontFamilies.medium, fontSize: 12, color: C.amber, flex: 1 },
});
