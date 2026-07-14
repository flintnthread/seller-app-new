import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, StatusBar, SafeAreaView, Platform,
  Modal, Alert, ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  useFonts, Outfit_400Regular, Outfit_500Medium,
  Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    deleteProductVariant,
    fetchProductDetail,
    fetchProductFormCatalog,
    createProductVariant,
    updateProductVariant,
    type ProductDetail,
    type ProductDetailVariant,
    type ProductFormCatalog,
} from "@/services/productApi";
import { ApiError } from "@/lib/api/client";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import {
    buildVariantMutationPayload,
    createEmptyVariantFormState,
    ProductVariantFormCard,
    variantDetailToFormState,
    variantFormStateToPricing,
    type VariantFormContext,
    type VariantFormState,
} from "@/lib/product/ProductVariantFormCard";
import { calculateVariantPricing, calculateVariantPricingFromStrings, COMMISSION_PERCENT } from "@/lib/product/variantPricing";
import { formatBuyerInstructionsForDisplay } from "@/lib/product/customProductFields";
import { pickMinimumPriceVariant, resolveVariantMetroTotal } from "@/lib/product/pickDisplayVariant";
import { resolveMinQuantity } from "@/lib/product/resolveMinQuantity";
import { fetchSellerProfile, toUiBusinessCategory } from "@/services/sellerProfileApi";
import { useResponsive } from "@/hooks/useResponsive";

const { width: SW } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
/** Desktop product-detail chrome needs ~1024px for the side-by-side hero. */
const PRODUCT_DETAIL_DESKTOP_MIN = 1024;

function useProductDetailWebLayout(): boolean {
  const { width } = useResponsive();
  return isWeb && width >= PRODUCT_DETAIL_DESKTOP_MIN;
}

// ─── Color Palette ────────────────────────────────────────────
const C = {
  navy: "#1E2B6B", navyDeep: "#151D4F", navyMid: "#1A2B5E", navyLight: "#2D3E8A",
  purple: "#6C63FF", purpleLight: "#A89CFF", purplePale: "#F0EEFF",
  green: "#22C55E", greenLight: "#86EFAC", greenPale: "#F0FDF4",
  red: "#EF4444", redLight: "#FCA5A5", redPale: "#FEF2F2",
  yellow: "#F59E0B", yellowPale: "#FFFBEB",
  blue: "#3B82F6", bluePale: "#EFF6FF",
  orange: "#F97316", orangePale: "#FFF7ED",
  teal: "#14B8A6", cyan: "#06B6D4",
  white: "#FFFFFF", bg: "#F7F8FC", card: "#FFFFFF",
  border: "#E5E7EB", textDark: "#111827", textMid: "#374151", textLight: "#9CA3AF",
};

type TabId = "overview" | "variants" | "specifications" | "delivery" | "return" | "sizechart";
type VariantViewMode = "grid" | "list" | "table";

/** Fixed column widths for the variants table — total must match VARIANT_TABLE_WIDTH. */
const VARIANT_TABLE_COL_WIDTHS = [44, 80, 80, 110, 70, 70, 100, 100, 100, 100, 100, 120, 100, 100, 100, 100, 90] as const;
const VARIANT_TABLE_WIDTH = VARIANT_TABLE_COL_WIDTHS.reduce((sum, w) => sum + w, 0);

interface Spec { label: string; value: string; }
interface DeliveryCharge { zone: string; standard: string; express: string; }

type Variant = ProductDetailVariant;

interface SizeChartEntry {
  size: string;
  chest: string;
  waist: string;
  hip: string;
  length: string;
  sleeve?: string;
}

type Product = ProductDetail;

const TABS: { id: TabId; label: string; icon: string; compactLabel?: string }[] = [
  { id: "overview",        label: "Overview",       compactLabel: "Overview", icon: "information-outline"    },
  { id: "variants",        label: "Variants",       compactLabel: "Variants", icon: "tune-variant"           },
  { id: "specifications",  label: "Specifications", compactLabel: "Specs",    icon: "clipboard-list-outline" },
  { id: "delivery",        label: "Delivery",       compactLabel: "Delivery", icon: "truck-outline"          },
  { id: "return",          label: "Returns",        compactLabel: "Returns",  icon: "refresh"                },
  { id: "sizechart",       label: "Size Chart",     compactLabel: "Sizes",    icon: "ruler"                  },
];

function tabLabel(tab: (typeof TABS)[number], compact: boolean): string {
  if (compact && tab.compactLabel) return tab.compactLabel;
  return tab.label;
}

function getStatusStyle(status: string) {
  if (status === "Active")   return { bg: C.greenPale,  color: C.green  };
  if (status === "Pending")  return { bg: C.orangePale, color: C.orange };
  if (status === "Inactive") return { bg: C.yellowPale, color: C.yellow };
  return                            { bg: C.redPale,    color: C.red    };
}

function resolveDisplayStatus(p: Product): string {
  const raw = (p.rawStatus ?? "").trim().toLowerCase();
  if (raw === "pending") return "Pending";
  return p.status;
}

function resolveLeafSubcategory(p: Product): string {
  if (p.categorySub && p.subcategory && p.categorySub !== p.subcategory) {
    return p.subcategory;
  }
  return p.subcategory || p.categorySub || "—";
}

function resolveMiddleCategory(p: Product): string | null {
  if (p.categorySub && p.subcategory && p.categorySub !== p.subcategory) {
    return p.categorySub;
  }
  return null;
}

function hasAdminNotes(notes?: string): boolean {
  const trimmed = notes?.trim();
  return !!trimmed && trimmed !== "—";
}

function formatMeasurement(value: string, unit = "cm"): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "—") return "—";
  if (/["']/.test(trimmed) || /\b(cm|in|inch)\b/i.test(trimmed)) return trimmed;
  return `${trimmed} ${unit}`;
}

function parseGstPercent(gst: string): number {
  const n = parseFloat(String(gst).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function pickDisplayVariant(variants: Variant[]): Variant | null {
  return pickMinimumPriceVariant(variants, resolveVariantMetroTotal);
}

function formatLowestVariantLabel(v: Variant | null): string | null {
  if (!v) return null;
  const parts = [v.color !== "—" ? v.color : null, v.size !== "—" ? v.size : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function resolveMrpInclGst(p: Product, variant: Variant | null): number {
  if (variant?.mrpInclGst && variant.mrpInclGst > 0) return variant.mrpInclGst;
  if (p.mrpInclGst > 0) return p.mrpInclGst;
  const mrpExcl = variant?.mrpExclGst ?? p.mrpExclGst;
  if (mrpExcl <= 0) return 0;
  const gstPct = variant?.gstPercent ?? parseGstPercent(p.gst);
  return Math.round(mrpExcl * (1 + gstPct / 100) * 100) / 100;
}

function resolveVariantDisplayPricing(p: Product, variant: Variant) {
  const pricing = calculateVariantPricingFromStrings({
    mrp: String(variant.mrpExclGst || variant.mrp || 0),
    sellingPrice: String(variant.sellingPriceExGst || variant.sellingPrice || 0),
    gstPercent: variant.gstPercent ?? parseGstPercent(p.gst),
    intraCityCharge: variant.intraCityDelivery ?? p.intraCityCharge,
    metroMetroCharge: variant.metroMetroDelivery ?? p.metroMetroCharge,
    discountOverride: variant.discount,
    ...(Number.isFinite(variant.commissionPercent) ? { commissionPercent: variant.commissionPercent } : {}),
  });
  if (pricing) return pricing;

  const mrpExcl = variant.mrpExclGst || variant.mrp || 0;
  const sellingExcl = variant.sellingPriceExGst || variant.sellingPrice || 0;
  if (mrpExcl > 0 && sellingExcl > 0) {
    return calculateVariantPricing({
      mrpExcl,
      sellingExcl,
      gstPercent: variant.gstPercent ?? parseGstPercent(p.gst),
      intraCityCharge: variant.intraCityDelivery ?? p.intraCityCharge,
      metroMetroCharge: variant.metroMetroDelivery ?? p.metroMetroCharge,
      discountOverride: variant.discountPercentage ?? variant.discount ?? null,
      commissionPercent: Number.isFinite(variant.commissionPercent)
        ? variant.commissionPercent
        : COMMISSION_PERCENT,
    });
  }

  return null;
}

function resolveTotalMetroPrice(p: Product, variant: Variant | null): number {
  if (!variant) return p.price > 0 ? p.price : 0;
  const pricing = resolveVariantDisplayPricing(p, variant);
  if (pricing) return pricing.totalMetroMetro;
  return resolveVariantMetroTotal({
    finalPrice: variant.sellingPriceWithGst || variant.finalPrice,
    metroMetroDelivery: variant.metroMetroDelivery ?? p.metroMetroCharge,
    commissionAmount: variant.commissionAmount,
    commissionPercent: variant.commissionPercent,
    totalMetroMetro: variant.totalMetroMetro ?? variant.totalPriceMetroMetro,
  });
}

function resolveDisplaySku(p: Product, variants: Variant[]): string {
  const display = pickDisplayVariant(variants);
  if (display?.sku && display.sku !== "—") return display.sku;
  return p.sku && p.sku !== "—" ? p.sku : "—";
}

function normalizeVariantsForDisplay(product: Product, items: Variant[]): Variant[] {
  return items.map((v) => {
    const pricing = resolveVariantDisplayPricing(product, v);
    if (!pricing) return v;
    return {
      ...v,
      commissionAmount: pricing.commissionAmount,
      commissionPercent: Number.isFinite(v.commissionPercent) ? v.commissionPercent : COMMISSION_PERCENT,
      totalIntraCity: pricing.totalIntraCity,
      totalMetroMetro: pricing.totalMetroMetro,
    };
  });
}

function prepareProductDetailView(detail: Product): { product: Product; variants: Variant[] } {
  const variants = normalizeVariantsForDisplay(detail, detail.variants);
  const { totalMetro, displayVariant } = getHeroPricing(detail, variants);
  return {
    product: {
      ...detail,
      sku: resolveDisplaySku(detail, detail.variants),
      price: totalMetro,
      color: displayVariant?.color ?? detail.color,
      size: displayVariant?.size ?? detail.size,
      minQuantity: resolveMinQuantity(detail.variants, displayVariant, detail.minQuantity) ?? undefined,
    },
    variants,
  };
}

function getHeroPricing(p: Product, variants: Variant[]) {
  const displayVariant = pickDisplayVariant(variants);
  const totalMetro = resolveTotalMetroPrice(p, displayVariant);
  const mrpInclGst = resolveMrpInclGst(p, displayVariant);
  return { totalMetro, mrpInclGst, displayVariant };
}

// ─── Sub components ───────────────────────────────────────────
const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <View style={sub.sectionHeader}>
    <View style={sub.sectionIconWrap}>
      <MaterialCommunityIcons name={icon as any} size={16} color={C.navyLight} />
    </View>
    <Text style={sub.sectionTitle}>{title}</Text>
  </View>
);

const InfoRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({ label, value, valueColor }) => (
  <View style={sub.infoRow}>
    <Text style={sub.infoLabel}>{label}</Text>
    <Text style={[sub.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
  </View>
);

const SectionCard: React.FC<{ children: React.ReactNode; last?: boolean; webStyle?: any }> = ({ children, last = false, webStyle }) => (
  <View style={[sub.card, last && { marginBottom: 0 }, isWeb && webStyle]}>{children}</View>
);

// ─── SWEET ALERT COMPONENT ────────────────────────────────────
const SweetAlert: React.FC<{
  visible: boolean;
  type?: "success" | "error" | "warning";
  title: string;
  subtitle: string;
}> = ({ visible, type = "success", title, subtitle }) => {
  const iconName =
    type === "success" ? "check-bold" :
    type === "error"   ? "close-thick" :
                         "alert-outline";

  const iconBg =
    type === "success" ? C.green :
    type === "error"   ? C.red   :
                         C.yellow;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={sa.overlay} pointerEvents="none">
        <View style={sa.box}>
          <View style={[sa.iconCircle, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={iconName as any} size={34} color={C.white} />
          </View>
          <Text style={sa.title}>{title}</Text>
          <Text style={sa.subtitle}>{subtitle}</Text>
          <View style={[sa.progressBar, { backgroundColor: iconBg + "22" }]}>
            <View style={[sa.progressFill, { backgroundColor: iconBg }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const sa = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    backgroundColor: C.white,
    borderRadius: 24,
    paddingVertical: 34,
    paddingHorizontal: 32,
    alignItems: "center",
    width: 268,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 24,
  },
  iconCircle: {
    width: 78, height: 78, borderRadius: 39,
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 20, color: C.textDark,
    marginBottom: 6, textAlign: "center",
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13, color: C.textLight,
    textAlign: "center", lineHeight: 20,
    marginBottom: 20,
  },
  progressBar: {
    width: "100%", height: 4, borderRadius: 2, overflow: "hidden",
  },
  progressFill: {
    height: "100%", borderRadius: 2,
    width: "100%",
  },
});

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────
const DeleteConfirmModal: React.FC<{
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}> = ({ visible, title, message, onCancel, onConfirm, confirming = false }) => (
  <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
    <View style={dc.overlay}>
      <TouchableOpacity style={dc.backdrop} activeOpacity={1} onPress={confirming ? undefined : onCancel} />
      <View style={dc.sheet}>
        <View style={dc.iconWrap}>
          <MaterialCommunityIcons name="trash-can-outline" size={32} color={C.red} />
        </View>
        <Text style={dc.title}>{title}</Text>
        <Text style={dc.body}>{message}</Text>
        <TouchableOpacity
          style={[dc.deleteBtn, confirming && { opacity: 0.75 }]}
          onPress={onConfirm}
          activeOpacity={0.85}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <Text style={dc.deleteTxt}>Yes, Remove</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={dc.cancelBtn} onPress={onCancel} activeOpacity={0.85} disabled={confirming}>
          <Text style={dc.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const dc = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,20,60,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    ...(isWeb ? { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 } : {}),
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
    zIndex: 2,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: C.redPale,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: C.textDark,
    marginBottom: 10,
    textAlign: "center",
  },
  body: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13.5,
    color: C.textMid,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteBtn: {
    width: "100%",
    backgroundColor: C.red,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
    minHeight: 48,
    justifyContent: "center",
  },
  deleteTxt: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.white },
  cancelBtn: {
    width: "100%",
    backgroundColor: C.bg,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid },
});

// ─── SIZE CHART MODAL ─────────────────────────────────────────
const SizeChartModal: React.FC<{ visible: boolean; onClose: () => void; chart: SizeChartEntry[] }> = ({ visible, onClose, chart }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={sc.root}>
      <TouchableOpacity style={sc.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[sc.sheet, isWeb && sc.sheetWeb]}>
        <View style={sc.drag} />
        <View style={sc.header}>
          <View style={sc.headerLeft}>
            <View style={sc.headerIconWrap}>
              <MaterialCommunityIcons name="ruler" size={18} color={C.white} />
            </View>
            <Text style={sc.headerTitle}>Size Chart</Text>
          </View>
          <TouchableOpacity style={sc.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color={C.textMid} />
          </TouchableOpacity>
        </View>
        <Text style={sc.subtitle}>All measurements are in inches</Text>
        <View style={sc.tableHead}>
          {["Size","Chest","Waist","Hip","Length"].map((h, i) => (
            <View key={i} style={sc.headCell}>
              <Text style={sc.headTxt}>{h}</Text>
            </View>
          ))}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {chart.map((row, idx) => (
            <View key={row.size} style={[sc.tableRow, { backgroundColor: idx % 2 === 0 ? C.white : "#F8F9FD" }]}>
              <View style={sc.cell}><View style={sc.sizePill}><Text style={sc.sizePillTxt}>{row.size}</Text></View></View>
              <View style={sc.cell}><Text style={sc.cellTxt}>{row.chest}</Text></View>
              <View style={sc.cell}><Text style={sc.cellTxt}>{row.waist}</Text></View>
              <View style={sc.cell}><Text style={sc.cellTxt}>{row.hip}</Text></View>
              <View style={sc.cell}><Text style={sc.cellTxt}>{row.length}</Text></View>
            </View>
          ))}
        </ScrollView>
        <View style={sc.tipBox}>
          <MaterialCommunityIcons name="information-outline" size={14} color={C.blue} />
          <Text style={sc.tipTxt}>Measure yourself and compare with the chart for the best fit.</Text>
        </View>
        <TouchableOpacity style={sc.closeAction} onPress={onClose}>
          <Text style={sc.closeActionTxt}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const sc = StyleSheet.create({
  root:    { flex: 1, justifyContent: "flex-end" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.15)" },
  sheet:   { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "85%", paddingHorizontal: 20, paddingBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 28 },
  sheetWeb:{ borderRadius: 20, maxHeight: "80%", maxWidth: 560, width: "100%", alignSelf: "center", marginTop: "auto", marginBottom: "auto" } as any,
  drag:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 8 },
  headerLeft:    { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconWrap:{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
  headerTitle:   { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textDark },
  closeBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  subtitle:      { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginBottom: 12 },
  tableHead:     { flexDirection: "row", backgroundColor: C.navyDeep, borderRadius: 10, paddingVertical: 10, marginBottom: 4 },
  headCell:      { flex: 1, alignItems: "center" },
  headTxt:       { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.white },
  tableRow:      { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cell:          { flex: 1, alignItems: "center", justifyContent: "center" },
  cellTxt:       { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textDark },
  sizePill:      { backgroundColor: C.purplePale, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
  sizePillTxt:   { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.purple },
  tipBox:        { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.bluePale, borderRadius: 10, padding: 12, marginTop: 14 },
  tipTxt:        { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textMid, flex: 1 },
  closeAction:   { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  closeActionTxt:{ fontFamily: "Outfit_700Bold", fontSize: 15, color: C.white },
});

// ─── EDIT VARIANT MODAL ───────────────────────────────────────
const EditVariantModal: React.FC<{
  visible: boolean;
  variant: Variant | null;
  product: Product;
  variantIndex: number;
  onClose: () => void;
  onSave: (form: VariantFormState) => Promise<void>;
  isB2B?: boolean;
}> = ({ visible, variant, product, variantIndex, onClose, onSave, isB2B = false }) => {
  const [form, setForm] = useState<VariantFormState>(createEmptyVariantFormState());
  const [catalog, setCatalog] = useState<ProductFormCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !variant) return;
    setForm(variantDetailToFormState(variant));
    setCatalogLoading(true);
    fetchProductFormCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(null))
      .finally(() => setCatalogLoading(false));
  }, [visible, variant]);

  const formContext: VariantFormContext = {
    productName: product.name,
    weight: product.weight,
    intraCityCharge: product.intraCityCharge,
    metroMetroCharge: product.metroMetroCharge,
    gstPercentage: parseGstPercent(product.gst),
    subcategoryId: product.subcategoryId,
    category: product.category,
    categorySubName: product.categorySub,
  };

  const handleSave = async () => {
    if (!form.color || !form.size || !form.stock || !form.mrp || !form.sellingPrice) {
      Alert.alert("Missing Fields", "Please fill color, size, stock, MRP, and selling price.");
      return;
    }
    if (!variantFormStateToPricing(form, formContext, catalog)) {
      Alert.alert("Invalid Pricing", "Please enter valid MRP and selling price.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to update variant.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={av.root}>
        <TouchableOpacity style={av.overlayTransparent} activeOpacity={1} onPress={onClose} />
        <View style={[av.sheet, isWeb && av.sheetWeb]}>
          <View style={av.drag} />
          <View style={av.header}>
            <View style={av.headerLeft}>
              <View style={[av.headerIconWrap, { backgroundColor: C.navy }]}>
                <MaterialCommunityIcons name="pencil-outline" size={18} color={C.white} />
              </View>
              <Text style={av.headerTitle}>Edit Variant</Text>
            </View>
            <TouchableOpacity style={av.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={C.textMid} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <ProductVariantFormCard
              index={variantIndex}
              state={form}
              onChange={setForm}
              catalog={catalog}
              catalogLoading={catalogLoading}
              context={formContext}
              showHeader
              isB2B={isB2B}
            />
          </ScrollView>

          <TouchableOpacity
            style={[av.addBtn, { backgroundColor: C.navy }, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <MaterialCommunityIcons name="content-save-outline" size={18} color={C.white} />
            )}
            <Text style={av.addBtnTxt}>{saving ? "Saving…" : "Save Changes"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── ADD VARIANT MODAL ────────────────────────────────────────
const AddVariantModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSubmit: (form: VariantFormState) => Promise<void>;
  product: Product;
  variantIndex: number;
  isB2B?: boolean;
}> = ({ visible, onClose, onSubmit, product, variantIndex, isB2B = false }) => {
  const [form, setForm] = useState<VariantFormState>(createEmptyVariantFormState());
  const [catalog, setCatalog] = useState<ProductFormCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setForm(createEmptyVariantFormState());
      return;
    }
    setCatalogLoading(true);
    fetchProductFormCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(null))
      .finally(() => setCatalogLoading(false));
  }, [visible]);

  const formContext: VariantFormContext = {
    productName: product.name,
    weight: product.weight,
    intraCityCharge: product.intraCityCharge,
    metroMetroCharge: product.metroMetroCharge,
    gstPercentage: parseGstPercent(product.gst),
    subcategoryId: product.subcategoryId,
    category: product.category,
    categorySubName: product.categorySub,
  };

  const handleAdd = async () => {
    if (!form.color || !form.size || !form.stock || !form.mrp || !form.sellingPrice) {
      Alert.alert("Missing Fields", "Please fill color, size, stock, MRP, and selling price.");
      return;
    }
    if (!variantFormStateToPricing(form, formContext, catalog)) {
      Alert.alert("Invalid Pricing", "Please enter valid MRP and selling price.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
      setForm(createEmptyVariantFormState());
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to add variant.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={av.root}>
        <TouchableOpacity style={av.overlayTransparent} activeOpacity={1} onPress={onClose} />
        <View style={[av.sheet, isWeb && av.sheetWeb]}>
          <View style={av.drag} />
          <View style={av.header}>
            <View style={av.headerLeft}>
              <View style={av.headerIconWrap}>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={C.white} />
              </View>
              <Text style={av.headerTitle}>Add New Variant</Text>
            </View>
            <TouchableOpacity style={av.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={C.textMid} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <ProductVariantFormCard
              index={variantIndex}
              state={form}
              onChange={setForm}
              catalog={catalog}
              catalogLoading={catalogLoading}
              context={formContext}
              showHeader
              isB2B={isB2B}
            />
          </ScrollView>

          <TouchableOpacity
            style={[av.addBtn, saving && { opacity: 0.7 }]}
            onPress={handleAdd}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color={C.white} />
            )}
            <Text style={av.addBtnTxt}>{saving ? "Adding…" : "Add Variant"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const av = StyleSheet.create({
  root:    { flex: 1, justifyContent: "flex-end" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,20,60,0.4)" },
  overlayTransparent: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "transparent" },
  sheet:   { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", paddingHorizontal: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 28 },
  sheetWeb:{ borderRadius: 20, maxHeight: "85%", maxWidth: 600, width: "100%", alignSelf: "center", marginTop: "auto", marginBottom: "auto" } as any,
  drag:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textDark },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  lbl:     { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textMid, marginBottom: 6, marginTop: 12 },
  row2:    { flexDirection: "row", gap: 10 },
  input:   { backgroundColor: "#F8F9FD", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark },
  dropBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F8F9FD", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  dropTxt: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark },
  inputPrefix: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FD", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12 },
  prefixTxt:   { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid, marginRight: 4 },
  suffixTxt:   { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid, marginLeft: 4 },
  prefixInput: { flex: 1, paddingVertical: 11, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark },
  colorDotSmall: { width: 12, height: 12, borderRadius: 6 },
  colorDot:  { width: 16, height: 16, borderRadius: 8 },
  mediaSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 4, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  mediaSectionTitle:  { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.navyLight },
  mediaPreview:       { marginTop: 10, borderRadius: 12, overflow: "hidden", position: "relative", height: 160, backgroundColor: C.bg },
  mediaPreviewImg:    { width: "100%", height: "100%" },
  mediaRemoveBtn:     { position: "absolute", top: 8, right: 8, backgroundColor: C.white, borderRadius: 12 },
  mediaPlaceholder:   { marginTop: 10, height: 100, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FAFBFF" },
  mediaPlaceholderTxt:{ fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight },
  videoChip:          { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.greenPale, borderRadius: 10, padding: 10, marginTop: 8 },
  videoChipTxt:       { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.green, flex: 1 },
  calcBox:   { marginTop: 16, backgroundColor: "#F8F9FD", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  calcTitle: { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.navyLight, marginBottom: 10 },
  calcGrid:  { gap: 6 },
  calcItem:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  calcLabel: { fontFamily: "Outfit_400Regular", fontSize: 11.5, color: C.textMid },
  calcValue: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textDark },
  addBtn:    { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, marginBottom: 16 },
  addBtnTxt: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.white },
  uploadBtn:  { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: C.navy, borderRadius: 12, backgroundColor: "#F8FAFF" },
  uploadBtnTxt:{ fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.navy },
  pickerRoot:    { flex: 1, justifyContent: "flex-end" },
  pickerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" },
  pickerSheet:   { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "55%", paddingBottom: 32 },
  pickerDrag:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  pickerItem:    { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  pickerItemTxt: { fontFamily: "Outfit_500Medium", fontSize: 14, color: C.textDark },
});

// ─── VARIANTS GRID VIEW ───────────────────────────────────────
const VariantsGrid: React.FC<{ variants: Variant[]; onDelete: (id: string, label: string) => void; onEdit: (v: Variant) => void }> = ({ variants, onDelete, onEdit }) => {
  const useWebLayout = useProductDetailWebLayout();
  return (
  <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: 10 }]}>
    {variants.map(v => (
      <View key={v.id} style={[vr.gridCard, useWebLayout && vr.gridCardWeb]}>
        {v.imageUri ? (
          <Image source={{ uri: v.imageUri }} style={vr.gridThumb} resizeMode="cover" />
        ) : null}
        <View style={vr.gridCardTop}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <View style={[vr.colorDot, { backgroundColor: v.colorHex, borderWidth: v.color === "White" ? 1 : 0, borderColor: C.border }]} />
            <Text style={vr.gridCardName}>{v.color}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {/* FIX: navy background for edit button */}
            <TouchableOpacity style={vr.gridEditBtn} onPress={() => onEdit(v)}>
              <MaterialCommunityIcons name="pencil-outline" size={13} color={C.navy} />
            </TouchableOpacity>
            <TouchableOpacity
              style={vr.gridDelBtn}
              onPress={() => onDelete(v.id, `${v.color} - ${v.size}`)}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={13} color={C.red} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={vr.gridSku}>{v.sku}</Text>
        {/* FIX: navy color for selling price */}
        <Text style={[vr.gridPrice, { color: C.navy }]}>₹{v.sellingPriceWithGst.toFixed(2)}</Text>
        <Text style={vr.gridMrp}>MRP Excl. GST ₹{v.mrpExclGst.toFixed(2)}</Text>
        <View style={vr.gridDivider} />
        <View style={vr.gridRow}><Text style={vr.gridRowLabel}>Stock</Text><Text style={vr.gridRowVal}>{v.stock} units</Text></View>
        {v.minQuantity != null && v.minQuantity > 0 ? (
          <View style={vr.gridRow}><Text style={vr.gridRowLabel}>Min Qty</Text><Text style={[vr.gridRowVal, { color: C.navy }]}>{v.minQuantity} units</Text></View>
        ) : null}
        <View style={vr.gridRow}><Text style={vr.gridRowLabel}>GST</Text><Text style={[vr.gridRowVal, { color: C.orange }]}>₹{v.gstAmount.toFixed(2)} ({v.gstPercent}%)</Text></View>
        {v.commissionAmount > 0 ? (
          <View style={vr.gridRow}><Text style={vr.gridRowLabel}>Commission</Text><Text style={[vr.gridRowVal, { color: C.red }]}>₹{v.commissionAmount.toFixed(2)}</Text></View>
        ) : null}
        <View style={vr.gridDivider} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
          <View style={vr.sizePill}><Text style={vr.sizePillTxt}>{v.size}</Text></View>
          <View style={vr.discountPill}><Text style={vr.discountPillTxt}>{v.discount}% OFF</Text></View>
          {v.imageUri ? <View style={[vr.sizePill, { backgroundColor: C.bluePale }]}><MaterialCommunityIcons name="image-outline" size={11} color={C.blue} /></View> : null}
          {v.videoUri ? <View style={[vr.sizePill, { backgroundColor: C.greenPale }]}><MaterialCommunityIcons name="video-outline" size={11} color={C.green} /></View> : null}
        </View>
        <View style={[vr.gridTotalRow, { backgroundColor: "#F0FDF4", marginTop: 6 }]}>
          <Text style={[vr.gridRowLabel, { fontSize: 10 }]}>Intra-City</Text>
          <Text style={[vr.gridRowVal, { color: C.green, fontFamily: "Outfit_700Bold" }]}>₹{v.totalIntraCity.toFixed(2)}</Text>
        </View>
        <View style={[vr.gridTotalRow, { backgroundColor: "#FFFBEB" }]}>
          <Text style={[vr.gridRowLabel, { fontSize: 10 }]}>Metro-Metro</Text>
          <Text style={[vr.gridRowVal, { color: C.yellow, fontFamily: "Outfit_700Bold" }]}>₹{v.totalMetroMetro.toFixed(2)}</Text>
        </View>
      </View>
    ))}
  </View>
  );
};

const VariantsList: React.FC<{ variants: Variant[]; onDelete: (id: string, label: string) => void; onEdit: (v: Variant) => void }> = ({ variants, onDelete, onEdit }) => (
  <View style={{ gap: 8 }}>
    {variants.map(v => (
      <View key={v.id} style={vr.listCard}>
        <View style={vr.listCardTop}>
          {v.imageUri ? (
            <Image source={{ uri: v.imageUri }} style={vr.listThumb} resizeMode="cover" />
          ) : (
            <View style={[vr.colorDot, {
              backgroundColor: v.colorHex,
              width: 22, height: 22, borderRadius: 11,
              borderWidth: v.color === "White" ? 1 : 0, borderColor: C.border,
            }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={vr.listCardName}>{v.color} · {v.size}</Text>
            <Text style={vr.listCardSku}>
              {v.sku} · {v.stock} units{v.minQuantity != null && v.minQuantity > 0 ? ` · Min ${v.minQuantity}` : ""}
            </Text>
          </View>
          <View style={vr.discountPill}><Text style={vr.discountPillTxt}>{v.discount}% OFF</Text></View>
          {/* FIX: navy background for edit button */}
          <TouchableOpacity
            style={[vr.deleteBtn, { backgroundColor: C.navy, width: 30, height: 30 }]}
            onPress={() => onEdit(v)}
          >
            <MaterialCommunityIcons name="pencil-outline" size={14} color={C.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[vr.deleteBtn, { width: 30, height: 30 }]}
            onPress={() => onDelete(v.id, `${v.color} - ${v.size}`)}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
          </TouchableOpacity>
        </View>
        <View style={vr.listPriceRow}>
          <View style={vr.listPriceTile}><Text style={vr.listPriceLabel}>MRP Excl. GST</Text><Text style={[vr.listPriceVal, { color: C.red }]}>₹{v.mrpExclGst.toFixed(2)}</Text></View>
          <View style={vr.listPriceTile}><Text style={vr.listPriceLabel}>Excl. GST</Text><Text style={vr.listPriceVal}>₹{v.sellingPriceExGst.toFixed(2)}</Text></View>
          <View style={vr.listPriceTile}><Text style={vr.listPriceLabel}>GST {v.gstPercent}%</Text><Text style={[vr.listPriceVal, { color: C.orange }]}>+₹{v.gstAmount.toFixed(2)}</Text></View>
          {/* FIX: navy instead of blue for selling price with GST */}
          <View style={vr.listPriceTile}><Text style={vr.listPriceLabel}>With GST</Text><Text style={[vr.listPriceVal, { color: C.navy, fontFamily: "Outfit_700Bold" }]}>₹{v.sellingPriceWithGst.toFixed(2)}</Text></View>
          <View style={[vr.listPriceTile, { backgroundColor: "#F0FDF4" }]}><Text style={vr.listPriceLabel}>Intra-City</Text><Text style={[vr.listPriceVal, { color: C.green, fontFamily: "Outfit_700Bold" }]}>₹{v.totalIntraCity.toFixed(2)}</Text></View>
          <View style={[vr.listPriceTile, { backgroundColor: "#FFFBEB" }]}><Text style={vr.listPriceLabel}>Metro</Text><Text style={[vr.listPriceVal, { color: C.yellow, fontFamily: "Outfit_700Bold" }]}>₹{v.totalMetroMetro.toFixed(2)}</Text></View>
        </View>
      </View>
    ))}
  </View>
);

// ─── VARIANTS TABLE VIEW ──────────────────────────────────────
const VARIANT_TABLE_HEADERS = [
  "", "Color", "Size", "SKU", "Stock", "Min\nQty", "MRP\n(Excl. GST)", "Discount\n(%)",
  "Selling Price\n(Excl. GST)", "GST\n(%)", "Selling Price\n(With GST)",
  "Commission\n(% of SP w/ GST)", "Intra-City\nDelivery", "Metro-Metro\nDelivery",
  "Total\n(Intra-City)", "Total\n(Metro-Metro)", "Actions",
] as const;

const colWidth = (index: number) => ({ width: VARIANT_TABLE_COL_WIDTHS[index] });

const VariantsTableBody: React.FC<{
  variants: Variant[];
  onDelete: (id: string, label: string) => void;
  onEdit: (v: Variant) => void;
}> = ({ variants, onDelete, onEdit }) => (
  <View style={{ width: VARIANT_TABLE_WIDTH, minWidth: VARIANT_TABLE_WIDTH }}>
    <View style={vr.tableHead}>
      {VARIANT_TABLE_HEADERS.map((col, i) => (
        <View key={i} style={[vr.headCell, colWidth(i)]}>
          <Text style={vr.headTxt}>{col}</Text>
        </View>
      ))}
    </View>
    {variants.map((v, idx) => (
      <View key={v.id} style={[vr.tableRow, { backgroundColor: idx % 2 === 0 ? C.white : "#FAFBFF" }]}>
        <View style={[vr.cell, colWidth(0), { justifyContent: "center", gap: 4 }]}>
          {v.imageUri
            ? <Image source={{ uri: v.imageUri }} style={vr.tableThumb} resizeMode="cover" />
            : null
          }
          {v.videoUri ? <MaterialCommunityIcons name="video-outline" size={11} color={C.green} style={{ alignSelf: "center" }} /> : null}
        </View>
        <View style={[vr.cell, colWidth(1)]}>
          <View style={[vr.colorDot, { backgroundColor: v.colorHex, borderWidth: v.color === "White" ? 1 : 0, borderColor: C.border }]} />
          <Text style={vr.cellTxt} numberOfLines={1}>{v.color}</Text>
        </View>
        <View style={[vr.cell, colWidth(2)]}><View style={vr.sizePill}><Text style={vr.sizePillTxt}>{v.size}</Text></View></View>
        <View style={[vr.cell, colWidth(3)]}><Text style={[vr.cellTxt, { fontSize: 10.5, color: C.textLight }]} numberOfLines={1}>{v.sku}</Text></View>
        <View style={[vr.cell, colWidth(4)]}><View style={vr.stockPill}><Text style={vr.stockPillTxt}>{v.stock} units</Text></View></View>
        <View style={[vr.cell, colWidth(5)]}><Text style={[vr.cellTxt, { color: C.navy }]}>{v.minQuantity != null && v.minQuantity > 0 ? v.minQuantity : "—"}</Text></View>
        <View style={[vr.cell, colWidth(6)]}><Text style={[vr.cellTxt, { color: C.red, fontFamily: "Outfit_700Bold" }]}>₹{v.mrpExclGst.toFixed(2)}</Text></View>
        <View style={[vr.cell, colWidth(7)]}><View style={vr.discountPill}><Text style={vr.discountPillTxt}>{v.discount.toFixed(2)}% OFF</Text></View></View>
        <View style={[vr.cell, colWidth(8)]}><Text style={vr.cellTxt}>₹{v.sellingPriceExGst.toFixed(2)}</Text></View>
        <View style={[vr.cell, colWidth(9)]}><Text style={[vr.cellTxt, { color: C.orange }]}>+ ₹{v.gstAmount.toFixed(2)}</Text><Text style={vr.cellSub}>({v.gstPercent}%)</Text></View>
        <View style={[vr.cell, colWidth(10)]}><Text style={[vr.cellTxt, { color: C.navy, fontFamily: "Outfit_700Bold" }]}>₹{v.sellingPriceWithGst.toFixed(2)}</Text></View>
        <View style={[vr.cell, colWidth(11)]}><Text style={[vr.cellTxt, { color: C.red }]}>+ ₹{v.commissionAmount.toFixed(2)}</Text><Text style={vr.cellSub}>({v.commissionPercent}%)</Text></View>
        <View style={[vr.cell, colWidth(12)]}><Text style={vr.cellTxt}>+ ₹{v.intraCityDelivery.toFixed(2)}</Text></View>
        <View style={[vr.cell, colWidth(13)]}><Text style={vr.cellTxt}>+ ₹{v.metroMetroDelivery.toFixed(2)}</Text></View>
        <View style={[vr.cell, colWidth(14), { backgroundColor: "#F0FDF4" }]}><Text style={[vr.cellTxt, { color: C.green, fontFamily: "Outfit_700Bold" }]}>₹{v.totalIntraCity.toFixed(2)}</Text></View>
        <View style={[vr.cell, colWidth(15), { backgroundColor: "#FFFBEB" }]}><Text style={[vr.cellTxt, { color: C.yellow, fontFamily: "Outfit_700Bold" }]}>₹{v.totalMetroMetro.toFixed(2)}</Text></View>
        <View style={[vr.cell, colWidth(16), { flexDirection: "row", justifyContent: "center", gap: 6 }]}>
          <TouchableOpacity style={[vr.deleteBtn, { backgroundColor: C.navy }]} onPress={() => onEdit(v)}>
            <MaterialCommunityIcons name="pencil-outline" size={14} color={C.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={vr.deleteBtn}
            onPress={() => onDelete(v.id, `${v.color} - ${v.size}`)}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </View>
);

const VariantsTable: React.FC<{ variants: Variant[]; onDelete: (id: string, label: string) => void; onEdit: (v: Variant) => void }> = ({ variants, onDelete, onEdit }) => {
  const useWebLayout = useProductDetailWebLayout();
  return (
  <View style={vr.tableWrap}>
    {useWebLayout ? (
      <View style={vr.tableScrollWeb}>
        <VariantsTableBody variants={variants} onDelete={onDelete} onEdit={onEdit} />
      </View>
    ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        style={[vr.tableScroll, { marginHorizontal: -14 }]}
        contentContainerStyle={{ width: VARIANT_TABLE_WIDTH }}
      >
        <VariantsTableBody variants={variants} onDelete={onDelete} onEdit={onEdit} />
      </ScrollView>
    )}
  </View>
  );
};

// ─── VARIANTS TAB ─────────────────────────────────────────────
const VariantsTab: React.FC<{
  variants: Variant[];
  onAdd: () => void;
  onDelete: (id: string, label: string) => void;
  onEdit: (v: Variant) => void;
}> = ({ variants, onAdd, onDelete, onEdit }) => {
  const [viewMode, setViewMode] = useState<VariantViewMode>("table");

  return (
    <>
      {variants.length > 0 && (
        <View style={vr.summary}>
          <View style={vr.summaryItem}>
            <Text style={vr.summaryLabel}>Total Variants</Text>
            <Text style={[vr.summaryValue, { color: C.navy }]}>{variants.length}</Text>
          </View>
          <View style={vr.summaryDivider} />
          <View style={vr.summaryItem}>
            <Text style={vr.summaryLabel}>Total Stock</Text>
            <Text style={[vr.summaryValue, { color: C.green }]}>{variants.reduce((a, v) => a + v.stock, 0)} units</Text>
          </View>
          <View style={vr.summaryDivider} />
          <View style={vr.summaryItem}>
            <Text style={vr.summaryLabel}>Avg. Selling Price</Text>
            {/* FIX: navy instead of blue for average selling price */}
            <Text style={[vr.summaryValue, { color: C.navy }]}>
              ₹{(variants.reduce((a, v) => a + v.sellingPriceWithGst, 0) / variants.length).toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      <View style={vr.headerRow}>
        <View style={vr.headerLeft}>
          <MaterialCommunityIcons name="menu" size={16} color={C.navyLight} />
          <Text style={vr.headerTitle}>Product Variants ({variants.length})</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={vr.viewToggle}>
            <TouchableOpacity
              style={[vr.toggleBtn, viewMode === "grid" && vr.toggleBtnActive]}
              onPress={() => setViewMode("grid")}
            >
              <MaterialCommunityIcons name="view-grid-outline" size={14} color={viewMode === "grid" ? C.white : C.textMid} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[vr.toggleBtn, viewMode === "list" && vr.toggleBtnActive]}
              onPress={() => setViewMode("list")}
            >
              <MaterialCommunityIcons name="view-list-outline" size={14} color={viewMode === "list" ? C.white : C.textMid} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[vr.toggleBtn, viewMode === "table" && vr.toggleBtnActive, { borderRightWidth: 0 }]}
              onPress={() => setViewMode("table")}
            >
              <MaterialCommunityIcons name="table" size={14} color={viewMode === "table" ? C.white : C.textMid} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={vr.addBtn} onPress={onAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={15} color={C.white} />
            <Text style={vr.addBtnTxt}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {variants.length === 0 ? (
        <View style={vr.emptyBox}>
          <MaterialCommunityIcons name="tune-variant" size={40} color={C.textLight} />
          <Text style={vr.emptyTitle}>No Variants Yet</Text>
          <Text style={vr.emptySub}>Tap "Add" to create the first variant</Text>
        </View>
      ) : viewMode === "grid" ? (
        <VariantsGrid variants={variants} onDelete={onDelete} onEdit={onEdit} />
      ) : viewMode === "list" ? (
        <VariantsList variants={variants} onDelete={onDelete} onEdit={onEdit} />
      ) : (
        <VariantsTable variants={variants} onDelete={onDelete} onEdit={onEdit} />
      )}
    </>
  );
};

const vr = StyleSheet.create({
  headerRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, marginTop: 0 },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.textDark },
  addBtn:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnTxt:   { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.white },
  viewToggle:      { flexDirection: "row", borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  toggleBtn:       { paddingVertical: 7, paddingHorizontal: 10, backgroundColor: C.white, borderRightWidth: 1, borderRightColor: C.border },
  toggleBtnActive: { backgroundColor: C.navy },
  emptyBox:   { alignItems: "center", paddingVertical: 40, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.border, gap: 8 },
  emptyTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.textMid },
  emptySub:   { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight },
  gridCard:     { width: (SW - 42) / 2, backgroundColor: C.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  gridCardWeb:  { width: "calc(25% - 8px)" } as any,
  gridThumb:    { width: "100%", height: 80, borderRadius: 8, marginBottom: 8 },
  gridCardTop:  { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  gridCardName: { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.textDark },
  gridSku:      { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.textLight, marginBottom: 8 },
  // FIX: base color removed (overridden inline with C.navy)
  gridPrice:    { fontFamily: "Outfit_800ExtraBold", fontSize: 16 },
  gridMrp:      { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, textDecorationLine: "line-through", marginBottom: 4 },
  gridDivider:  { borderTopWidth: 1, borderTopColor: "#F3F4F6", marginVertical: 6 },
  gridRow:      { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  gridRowLabel: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight },
  gridRowVal:   { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.textDark },
  gridTotalRow: { flexDirection: "row", justifyContent: "space-between", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, marginTop: 2 },
  gridDelBtn:   { width: 24, height: 24, borderRadius: 6, backgroundColor: C.redPale, alignItems: "center", justifyContent: "center" },
  // FIX: navy pale background for edit button in grid
  gridEditBtn:  { width: 24, height: 24, borderRadius: 6, backgroundColor: "#EEF1FF", alignItems: "center", justifyContent: "center" },
  listCard:      { backgroundColor: C.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  listCardTop:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  listThumb:     { width: 36, height: 36, borderRadius: 8 },
  listCardName:  { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.textDark },
  listCardSku:   { fontFamily: "Outfit_400Regular", fontSize: 10.5, color: C.textLight },
  listPriceRow:  { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  listPriceTile: { backgroundColor: C.bg, borderRadius: 8, padding: 7, minWidth: 80, flex: 1 },
  listPriceLabel:{ fontFamily: "Outfit_400Regular", fontSize: 10, color: C.textLight, marginBottom: 2 },
  listPriceVal:  { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textDark },
  tableWrap:     { backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, width: "100%", maxWidth: "100%", minWidth: 0, overflow: isWeb ? "visible" : "hidden" },
  tableScroll:   { width: "100%" },
  tableScrollWeb:{
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflowX: "auto",
    overflowY: "hidden",
    WebkitOverflowScrolling: "touch",
  } as any,
  tableHead:  { flexDirection: "row", backgroundColor: "#FFF7ED", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#FED7AA" },
  headCell:   { paddingHorizontal: 8, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  headTxt:    { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: C.textMid, lineHeight: 15, textAlign: "center" },
  tableRow:   { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingVertical: 12 },
  cell:       { paddingHorizontal: 8, justifyContent: "center", gap: 2, flexShrink: 0 },
  cellTxt:    { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textDark },
  cellSub:    { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.textLight },
  tableThumb: { width: 28, height: 28, borderRadius: 6, alignSelf: "center" },
  colorDot:        { width: 14, height: 14, borderRadius: 7 },
  sizePill:        { backgroundColor: "#EEF1FF", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  sizePillTxt:     { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.navy },
  stockPill:       { backgroundColor: C.greenPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  stockPillTxt:    { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.green },
  discountPill:    { backgroundColor: C.greenPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  discountPillTxt: { fontFamily: "Outfit_700Bold", fontSize: 10.5, color: "#16A34A" },
  deleteBtn:       { width: 32, height: 32, borderRadius: 8, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
  summary:         { flexDirection: "row", backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12, justifyContent: "space-around" },
  summaryItem:     { alignItems: "center", gap: 4 },
  summaryLabel:    { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight },
  summaryValue:    { fontFamily: "Outfit_800ExtraBold", fontSize: 16 },
  summaryDivider:  { width: 1, backgroundColor: C.border },
});

// ─── Overview Tab ─────────────────────────────────────────────
const OverviewTab: React.FC<{ p: Product }> = ({ p }) => {
  const useWebLayout = useProductDetailWebLayout();
  const displayStatus = resolveDisplayStatus(p);
  const statusStyle = getStatusStyle(displayStatus);
  const middleCategory = resolveMiddleCategory(p);
  const leafSubcategory = resolveLeafSubcategory(p);
  const buyerInstructions = formatBuyerInstructionsForDisplay(p.customInstructions);
  const adminNotesVisible = hasAdminNotes(p.adminNotes);

  if (useWebLayout) {
    return (
      <View style={wt.twoColGrid}>
        <View style={[wt.fullWidthCard]}>
          <SectionHeader icon="text-box-outline" title="Full Description" />
          <Text style={sub.descText}>{p.description}</Text>
        </View>
        <View style={wt.halfCard}>
          <SectionHeader icon="tag-multiple-outline" title="Classification" />
          <InfoRow label="Category"    value={p.category}    />
          {middleCategory ? <InfoRow label="Category Group" value={middleCategory} /> : null}
          <InfoRow label="Subcategory" value={leafSubcategory} />
          <InfoRow label="Color"       value={p.color}       />
          <InfoRow label="Size"        value={p.size}        />
          <InfoRow label="HSN Code"    value={p.hsnCode}     />
          <InfoRow label="GST"         value={p.gst} valueColor={C.orange} />
          <InfoRow label="Material"    value={p.material}    />
          {p.deliveryTimeMin != null && p.deliveryTimeMax != null ? (
            <InfoRow label="Delivery Window" value={`${p.deliveryTimeMin}–${p.deliveryTimeMax} days`} />
          ) : null}
          <InfoRow label="Intra-city Charge" value={`₹${p.intraCityCharge}`} valueColor={C.green} />
          <InfoRow label="Metro-metro Charge" value={`₹${p.metroMetroCharge}`} valueColor={C.blue} />
          {p.customized ? (
            <>
              <InfoRow label="Customized Product" value="Yes" valueColor={C.orange} />
              {p.customTitle ? <InfoRow label="Customization" value={p.customTitle} /> : null}
              {buyerInstructions ? (
                <View style={sub.infoRow}>
                  <Text style={sub.infoLabel}>Buyer Instructions</Text>
                  <Text style={[sub.infoValue, sub.multilineValue]}>{buyerInstructions}</Text>
                </View>
              ) : null}
              {p.customLeadDays ? <InfoRow label="Lead Time" value={`${p.customLeadDays} days`} /> : null}
              {p.customCharge ? <InfoRow label="Customization Charge" value={`₹${p.customCharge}`} /> : null}
            </>
          ) : null}
          <InfoRow label="Return"      value={p.returnPolicy} />
          <InfoRow label="Warranty"    value={p.warranty}    />
          {p.careInstructions !== "—" ? <InfoRow label="Care" value={p.careInstructions} /> : null}
        </View>
        <View style={wt.halfCard}>
          <SectionHeader icon="warehouse" title="Inventory" />
          <InfoRow label="Stock Quantity" value={`${p.stock} units`} valueColor={C.green} />
          <InfoRow label="Status"         value={displayStatus}      valueColor={statusStyle.color} />
          <InfoRow label="Last Updated"   value={p.updated}          />
          <InfoRow label="Created At"     value={p.createdAt}        />
          <InfoRow label="Approved At"    value={p.approvedAt}       />
        </View>
        {adminNotesVisible ? (
          <View style={wt.fullWidthCard}>
            <SectionHeader icon="bell-outline" title="Admin Notes" />
            <View style={sub.adminNoteBox}>
              <Text style={sub.adminNoteText}>{p.adminNotes}</Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <>
      <SectionCard><SectionHeader icon="text-box-outline" title="Full Description" /><Text style={sub.descText}>{p.description}</Text></SectionCard>
      <SectionCard><SectionHeader icon="tag-multiple-outline" title="Classification" /><InfoRow label="Category" value={p.category} />{middleCategory ? <InfoRow label="Category Group" value={middleCategory} /> : null}<InfoRow label="Subcategory" value={leafSubcategory} /><InfoRow label="Color" value={p.color} /><InfoRow label="Size" value={p.size} /><InfoRow label="HSN Code" value={p.hsnCode} /><InfoRow label="GST" value={p.gst} valueColor={C.orange} /></SectionCard>
      <SectionCard><SectionHeader icon="warehouse" title="Inventory" /><InfoRow label="Stock Quantity" value={`${p.stock} units`} valueColor={C.green} /><InfoRow label="Status" value={displayStatus} valueColor={statusStyle.color} /><InfoRow label="Last Updated" value={p.updated} /><InfoRow label="Created At" value={p.createdAt} /><InfoRow label="Approved At" value={p.approvedAt} /></SectionCard>
      {adminNotesVisible ? (
        <SectionCard last><SectionHeader icon="bell-outline" title="Admin Notes" /><View style={sub.adminNoteBox}><Text style={sub.adminNoteText}>{p.adminNotes}</Text></View></SectionCard>
      ) : null}
    </>
  );
};

// ─── Specs Tab ────────────────────────────────────────────────
const SpecsTab: React.FC<{ p: Product }> = ({ p }) => {
  const useWebLayout = useProductDetailWebLayout();
  if (useWebLayout) {
    return (
      <View style={wt.twoColGrid}>
        <View style={wt.halfCard}>
          <SectionHeader icon="clipboard-list-outline" title="Specifications" />
          {p.specifications.map((spec, i) => <InfoRow key={i} label={spec.label} value={spec.value} />)}
        </View>
        <View style={wt.halfCard}>
          <SectionHeader icon="lightning-bolt-outline" title="Key Features" />
          {p.features.map((feature, i) => (
            <View key={i} style={[sub.featureRow, i < p.features.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }]}>
              <View style={sub.featureCheck}><MaterialCommunityIcons name="check" size={13} color={C.green} /></View>
              <Text style={sub.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        <View style={wt.fullWidthCard}>
          <SectionHeader icon="package-variant-closed" title="Package Dimensions & Handling" />
          <View style={wt.threeColInner}>
            <View style={wt.thirdTile}><InfoRow label="Box Dimensions" value={p.packaging.boxDimensions} /><InfoRow label="Gross Weight" value={p.packaging.grossWeight} /></View>
            <View style={wt.thirdTile}><InfoRow label="Packaging Type" value={p.packaging.packagingType} /><InfoRow label="Fragile Item" value={p.packaging.fragile ? "Yes" : "No"} valueColor={p.packaging.fragile ? C.red : C.green} /></View>
            <View style={wt.thirdTile}><InfoRow label="Product Weight" value={p.weight} /><InfoRow label="Product Dimensions" value={p.dimensions} /></View>
          </View>
        </View>
      </View>
    );
  }
  return (
    <>
      <SectionCard><SectionHeader icon="clipboard-list-outline" title="Specifications" />{p.specifications.map((spec, i) => <InfoRow key={i} label={spec.label} value={spec.value} />)}</SectionCard>
      <SectionCard><SectionHeader icon="lightning-bolt-outline" title="Key Features" />{p.features.map((feature, i) => (<View key={i} style={[sub.featureRow, i < p.features.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }]}><View style={sub.featureCheck}><MaterialCommunityIcons name="check" size={13} color={C.green} /></View><Text style={sub.featureText}>{feature}</Text></View>))}</SectionCard>
      <SectionCard last><SectionHeader icon="package-variant-closed" title="Package Dimensions & Handling" /><InfoRow label="Box Dimensions" value={p.packaging.boxDimensions} /><InfoRow label="Gross Weight" value={p.packaging.grossWeight} /><InfoRow label="Packaging Type" value={p.packaging.packagingType} /><InfoRow label="Fragile Item" value={p.packaging.fragile ? "Yes" : "No"} valueColor={p.packaging.fragile ? C.red : C.green} /><InfoRow label="Product Weight" value={p.weight} /><InfoRow label="Product Dimensions" value={p.dimensions} /></SectionCard>
    </>
  );
};

// ─── Delivery Tab ─────────────────────────────────────────────
const DeliveryTab: React.FC<{ p: Product }> = ({ p }) => {
  const useWebLayout = useProductDetailWebLayout();
  const chargeRows: DeliveryCharge[] = p.deliveryCharges.length > 0
    ? p.deliveryCharges
    : [
        { zone: "Intra-city", standard: `₹${p.intraCityCharge}`, express: "—" },
        { zone: "Metro-metro", standard: `₹${p.metroMetroCharge}`, express: "—" },
      ];
  if (useWebLayout) {
    return (
      <View style={wt.twoColGrid}>
        <View style={wt.halfCard}>
          <SectionHeader icon="truck-outline" title="Delivery Information" />
          <View style={sub.deliveryHighlight}>
            <MaterialCommunityIcons name="calendar-clock" size={26} color={C.blue} />
            <View style={{ flex: 1 }}>
              <Text style={sub.deliveryHighlightTitle}>Estimated: {p.delivery.estimated}</Text>
              <Text style={sub.deliveryHighlightSub}>Available across {p.delivery.locations}</Text>
            </View>
          </View>
          <InfoRow label="Standard Delivery" value={`Free above ${p.delivery.freeAbove}`} valueColor={C.green} />
          <InfoRow label="Cash on Delivery"  value={p.delivery.cod ? `Available · ${p.delivery.codCharge}` : "Not available"} valueColor={p.delivery.cod ? C.green : C.red} />
          <InfoRow label="Coverage"          value={p.delivery.locations} />
        </View>
        <View style={wt.halfCard}>
          <SectionHeader icon="currency-inr" title="Weight & Delivery Charges" />
          <View style={sub.tableHeader}>
            <Text style={[sub.tableHeaderCell, { flex: 2, textAlign: "left" }]}>Zone</Text>
            <Text style={[sub.tableHeaderCell, { flex: 1 }]}>Standard</Text>
          </View>
          {chargeRows.map((row, i) => (
            <View key={i} style={[sub.tableRow, { backgroundColor: i % 2 === 0 ? C.white : C.bg }]}>
              <Text style={[sub.tableCell, { flex: 2, textAlign: "left", color: C.textDark }]}>{row.zone}</Text>
              <Text style={[sub.tableCell, { flex: 1, color: C.green }]}>{row.standard}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return (
    <>
      <SectionCard>
        <SectionHeader icon="truck-outline" title="Delivery Information" />
        <View style={sub.deliveryHighlight}><MaterialCommunityIcons name="calendar-clock" size={26} color={C.blue} /><View style={{ flex: 1 }}><Text style={sub.deliveryHighlightTitle}>Estimated: {p.delivery.estimated}</Text><Text style={sub.deliveryHighlightSub}>Available across {p.delivery.locations}</Text></View></View>
        <InfoRow label="Standard Delivery" value={`Free above ${p.delivery.freeAbove}`} valueColor={C.green} /><InfoRow label="Cash on Delivery" value={p.delivery.cod ? `Available · ${p.delivery.codCharge}` : "Not available"} valueColor={p.delivery.cod ? C.green : C.red} /><InfoRow label="Coverage" value={p.delivery.locations} />
      </SectionCard>
      <SectionCard last>
        <SectionHeader icon="currency-inr" title="Weight & Delivery Charges" />
        <View style={sub.tableHeader}><Text style={[sub.tableHeaderCell, { flex: 2, textAlign: "left" }]}>Zone</Text><Text style={[sub.tableHeaderCell, { flex: 1 }]}>Standard</Text></View>
        {chargeRows.map((row, i) => (<View key={i} style={[sub.tableRow, { backgroundColor: i % 2 === 0 ? C.white : C.bg }]}><Text style={[sub.tableCell, { flex: 2, textAlign: "left", color: C.textDark }]}>{row.zone}</Text><Text style={[sub.tableCell, { flex: 1, color: C.green }]}>{row.standard}</Text></View>))}
      </SectionCard>
    </>
  );
};

// ─── Return Tab ───────────────────────────────────────────────
const ReturnTab: React.FC<{ p: Product }> = ({ p }) => {
  const useWebLayout = useProductDetailWebLayout();
  if (useWebLayout) {
    return (
      <View style={wt.twoColGrid}>
        <View style={wt.fullWidthCard}>
          <SectionHeader icon="refresh" title="Return Policy" />
          <View style={sub.returnHighlight}>
            <MaterialCommunityIcons name="check-circle" size={26} color={C.green} />
            <View style={{ flex: 1 }}>
              <Text style={sub.returnHighlightTitle}>{p.returnDetails.window} Return Window</Text>
              <Text style={sub.returnHighlightSub}>Hassle-free returns accepted</Text>
            </View>
          </View>
          <InfoRow label="Return Window" value={p.returnDetails.window} valueColor={C.green} />
          <InfoRow label="Refund Mode"   value={p.returnDetails.refundMode} />
          <InfoRow label="Warranty"      value={p.warranty} valueColor={C.navy} />
        </View>
      </View>
    );
  }
  return (
    <SectionCard last>
      <SectionHeader icon="refresh" title="Return Policy" />
      <View style={sub.returnHighlight}>
        <MaterialCommunityIcons name="check-circle" size={26} color={C.green} />
        <View style={{ flex: 1 }}>
          <Text style={sub.returnHighlightTitle}>{p.returnDetails.window} Return Window</Text>
          <Text style={sub.returnHighlightSub}>Hassle-free returns accepted</Text>
        </View>
      </View>
      <InfoRow label="Return Window" value={p.returnDetails.window} valueColor={C.green} />
      <InfoRow label="Refund Mode" value={p.returnDetails.refundMode} />
      <InfoRow label="Warranty" value={p.warranty} valueColor={C.navy} />
    </SectionCard>
  );
};

// ─── Size Chart Tab ───────────────────────────────────────────
const SizeChartTab: React.FC<{
  chart: SizeChartEntry[];
  chartName?: string;
  chartImage?: string;
}> = ({ chart, chartName, chartImage }) => {
  const useWebLayout = useProductDetailWebLayout();
  const hasSleeve = chart.some((row) => row.sleeve && row.sleeve !== "—" && row.sleeve.trim().length > 0);
  const columns = hasSleeve
    ? ["Size", "Chest", "Waist", "Hip", "Length", "Sleeve"]
    : ["Size", "Chest", "Waist", "Hip", "Length"];

  const renderTable = () => {
    if (chart.length === 0) {
      return (
        <View style={sct.emptyBox}>
          <MaterialCommunityIcons name="ruler-square" size={28} color={C.textLight} />
          <Text style={sct.emptyTitle}>No size chart added</Text>
          <Text style={sct.emptySub}>Add a size chart while creating or editing this product to show measurements here.</Text>
        </View>
      );
    }

    return (
      <>
        <Text style={sct.unitNote}>All measurements are in centimetres (cm)</Text>
        <View style={sct.tableHead}>
          {columns.map((h) => (
            <View key={h} style={sct.headCell}>
              <Text style={sct.headTxt}>{h}</Text>
            </View>
          ))}
        </View>
        {chart.map((row, idx) => (
          <View key={`${row.size}-${idx}`} style={[sct.tableRow, { backgroundColor: idx % 2 === 0 ? C.white : "#F8F9FD" }]}>
            <View style={sct.cell}>
              <View style={sct.sizePill}>
                <Text style={sct.sizePillTxt}>{row.size}</Text>
              </View>
            </View>
            <View style={sct.cell}><Text style={sct.cellTxt}>{formatMeasurement(row.chest)}</Text></View>
            <View style={sct.cell}><Text style={sct.cellTxt}>{formatMeasurement(row.waist)}</Text></View>
            <View style={sct.cell}><Text style={sct.cellTxt}>{formatMeasurement(row.hip)}</Text></View>
            <View style={sct.cell}><Text style={sct.cellTxt}>{formatMeasurement(row.length)}</Text></View>
            {hasSleeve ? (
              <View style={sct.cell}><Text style={sct.cellTxt}>{formatMeasurement(row.sleeve ?? "—")}</Text></View>
            ) : null}
          </View>
        ))}
        <View style={sct.tipBox}>
          <MaterialCommunityIcons name="information-outline" size={14} color={C.blue} />
          <Text style={sct.tipTxt}>Measure yourself and compare with the chart above for the best fit.</Text>
        </View>
      </>
    );
  };

  const content = (
    <>
      {chartName ? <Text style={sct.chartName}>{chartName}</Text> : null}
      {chartImage ? (
        <Image source={{ uri: chartImage }} style={sct.chartImage} resizeMode="contain" />
      ) : null}
      {renderTable()}
    </>
  );

  return useWebLayout ? (
    <View style={wt.twoColGrid}>
      <View style={wt.fullWidthCard}>
        <SectionHeader icon="ruler" title="Size Chart" />
        {content}
      </View>
    </View>
  ) : (
    <View style={sub.card}>
      <SectionHeader icon="ruler" title="Size Chart" />
      {content}
    </View>
  );
};

const sct = StyleSheet.create({
  chartName: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textDark, marginBottom: 12 },
  chartImage: { width: "100%", height: 220, borderRadius: 12, marginBottom: 16, backgroundColor: C.bg },
  unitNote: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginBottom: 16 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 36, paddingHorizontal: 20, backgroundColor: C.bg, borderRadius: 12 },
  emptyTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textDark, marginTop: 12 },
  emptySub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textLight, textAlign: "center", marginTop: 6, lineHeight: 20 },
  tableHead: { flexDirection: 'row', backgroundColor: C.navyDeep, borderRadius: 10, paddingVertical: 12, marginBottom: 4 },
  headCell: { flex: 1, alignItems: 'center' },
  headTxt: { fontFamily: 'Outfit_700Bold', fontSize: 12, color: C.white },
  tableRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cellTxt: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: C.textDark },
  sizePill: { backgroundColor: C.purplePale, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 5 },
  sizePillTxt: { fontFamily: 'Outfit_700Bold', fontSize: 13, color: C.purple },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.bluePale, borderRadius: 10, padding: 14, marginTop: 16 },
  tipTxt: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: C.textMid, flex: 1 },
});

// ─── WEB: Hero section ────────────────────────────────────────
const WebHeroSection: React.FC<{
  p: Product;
  activeImg: number;
  setActiveImg: (i: number) => void;
  variants: Variant[];
}> = ({ p, activeImg, setActiveImg, variants }) => {
  const displayStatus = resolveDisplayStatus(p);
  const st = getStatusStyle(displayStatus);
  const leafSubcategory = resolveLeafSubcategory(p);
  const { totalMetro, mrpInclGst, displayVariant } = getHeroPricing(p, variants);
  const lowestVariantLabel = formatLowestVariantLabel(displayVariant);
  const minQuantity = resolveMinQuantity(variants, displayVariant, p.minQuantity);
  const displayDiscount = displayVariant?.discount ?? p.discount;
  const [variantImage, setVariantImage] = useState<string | null>(null);
  const uniqueColors = variants.filter((v, i, arr) => arr.findIndex(x => x.color === v.color) === i);
  const uniqueSizes = [...new Set(variants.map(v => v.size))];
  const galleryImages = p.images.filter(img => img && img.trim().length > 0);
  const heroImages = galleryImages.length > 0 ? galleryImages : [""];
  const safeActiveImg = Math.min(activeImg, heroImages.length - 1);
  const hasMultipleImages = heroImages.length > 1;

  const handlePrev = () => setActiveImg((safeActiveImg - 1 + heroImages.length) % heroImages.length);
  const handleNext = () => setActiveImg((safeActiveImg + 1) % heroImages.length);

  return (
    <View style={wh.container}>
      <View style={wh.imageSection}>
        <View style={wh.heroImageWrap}>
          <Image source={{ uri: variantImage ?? heroImages[safeActiveImg] }} style={wh.heroImage} resizeMode="cover" />
          <View style={s.discountBadge}><Text style={s.discountText}>{displayDiscount}% OFF</Text></View>
          <View style={s.stockChip}>
            <MaterialCommunityIcons name="check-circle-outline" size={12} color={C.green} />
            <Text style={s.stockChipText}>{p.stock} units</Text>
          </View>
        </View>
        <View style={wh.thumbNavRow}>
          {hasMultipleImages && (
            <TouchableOpacity style={wh.thumbNavBtn} onPress={handlePrev} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={18} color={C.navy} />
            </TouchableOpacity>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={wh.thumbScrollContent}
            style={wh.thumbScroller}
          >
            {heroImages.filter(Boolean).map((img, i) => (
              <TouchableOpacity key={i} onPress={() => { setVariantImage(null); setActiveImg(i); }} style={[wh.thumb, i === safeActiveImg && wh.thumbActive]}>
                <Image source={{ uri: img }} style={wh.thumbImg} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {hasMultipleImages && (
            <TouchableOpacity style={wh.thumbNavBtn} onPress={handleNext} activeOpacity={0.8}>
              <Ionicons name="chevron-forward" size={18} color={C.navy} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={wh.detailsSection}>
        <View style={wh.detailsInner}>
          <View style={wh.topRow}>
            <View style={s.catPill}><Text style={s.catPillText}>{p.category} · {leafSubcategory}</Text></View>
            <View style={[s.statusChip, { backgroundColor: st.bg }]}>
              <View style={[s.statusDot, { backgroundColor: st.color }]} />
              <Text style={[s.statusChipText, { color: st.color }]}>{displayStatus}</Text>
            </View>
          </View>

          <Text style={wh.productName}>{p.name}</Text>
          <Text style={wh.skuText}>SKU: {displayVariant?.sku && displayVariant.sku !== "—" ? displayVariant.sku : p.sku}</Text>
          {lowestVariantLabel ? (
            <Text style={wh.variantMeta}>Lowest price: {lowestVariantLabel}</Text>
          ) : null}

          <View style={wh.priceRow}>
            <Text style={wh.price}>₹{totalMetro.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
            {mrpInclGst > totalMetro ? (
              <Text style={wh.mrp}>₹{mrpInclGst.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
            ) : null}
            {displayDiscount > 0 ? (
              <View style={s.saveBadge}><Text style={s.saveText}>Save {displayDiscount}%</Text></View>
            ) : null}
          </View>
          <Text style={wh.priceNote}>Total (Metro-Metro) · lowest price variant</Text>
          {minQuantity != null ? (
            <View style={wh.minQtyRow}>
              <MaterialCommunityIcons name="package-variant-closed" size={14} color={C.navy} />
              <Text style={wh.minQtyText}>Minimum order quantity: <Text style={wh.minQtyVal}>{minQuantity} units</Text></Text>
            </View>
          ) : null}

          <View style={wh.divider} />

          <View style={wh.detailCard}>
            <View style={wh.detailLine}>
              <View style={wh.detailCellInline}><Text style={wh.detailLabel}>Color</Text><Text style={wh.detailValue}>{displayVariant?.color ?? p.color}</Text></View>
              <View style={wh.detailCellInline}><Text style={wh.detailLabel}>Size</Text><Text style={wh.detailValue}>{displayVariant?.size ?? p.size}</Text></View>
              <View style={wh.detailCellInline}><Text style={wh.detailLabel}>Material</Text><Text style={wh.detailValue}>{p.material}</Text></View>
              <View style={wh.detailCellInline}><Text style={wh.detailLabel}>Weight</Text><Text style={wh.detailValue}>{p.weight}</Text></View>
              <View style={wh.detailCellInline}><Text style={wh.detailLabel}>HSN Code</Text><Text style={wh.detailValue}>{p.hsnCode}</Text></View>
              <View style={wh.detailCellInline}><Text style={wh.detailLabel}>Warranty</Text><Text style={[wh.detailValue, { color: C.navy }]}>{p.warranty}</Text></View>
              {minQuantity != null ? (
                <View style={wh.detailCellInline}><Text style={wh.detailLabel}>Min Order Qty</Text><Text style={[wh.detailValue, { color: C.navy }]}>{minQuantity} units</Text></View>
              ) : null}
            </View>
          </View>

          <View style={wh.returnPolicyCard}>
            <Text style={wh.detailLabel}>Return Policy</Text>
            <Text style={[wh.detailValue, { color: C.green }]}>{p.returnPolicy}</Text>
          </View>

          <View style={wh.divider} />

          {uniqueColors.length > 0 && (
            <View style={wh.colorsSection}>
              <Text style={wh.colorsLabel}>Available Colors</Text>
              <View style={wh.colorSwatches}>
                {uniqueColors.map(v => (
                  <TouchableOpacity key={v.id} style={wh.swatchWrap} onPress={() => {
                    if (v.imageUri) {
                      // if variant image exists in product gallery, switch to its index, otherwise show variant image directly
                      const idx = heroImages.findIndex(h => h === v.imageUri);
                      if (idx >= 0) { setVariantImage(null); setActiveImg(idx); }
                      else { setVariantImage(v.imageUri || null); }
                    } else {
                      setVariantImage(null);
                    }
                  }} activeOpacity={0.8}>
                    <View style={[wh.swatch, { backgroundColor: v.colorHex }, v.color === "White" && { borderWidth: 1.5, borderColor: C.border }]} />
                    <Text style={wh.swatchLabel}>{v.color}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {uniqueSizes.length > 0 && (
            <View style={wh.sizesSection}>
              <Text style={wh.sizesLabel}>Available Sizes</Text>
              <View style={wh.sizePills}>
                {uniqueSizes.map((size, idx) => (
                  <View key={idx} style={wh.sizeChip}>
                    <Text style={wh.sizeChipTxt}>{size}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={wh.divider} />

          <View style={wh.attrRow}>
            {([
              { label: "Size", value: p.size },
              { label: "Delivery", value: p.delivery.estimated },
              { label: "Stock", value: `${p.stock} units` },
            ]).map(a => (
              <View key={a.label} style={s.attrChip}>
                <Text style={s.attrLabel}>{a.label}: </Text>
                <Text style={s.attrValue}>{a.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────
const ProductDetailScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isCompact, isNarrowWeb } = useResponsive();
  const useDesktopWebLayout = useProductDetailWebLayout();
  const compact = isCompact || isNarrowWeb;

  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImg,      setActiveImg]      = useState(0);
  const [activeTab,      setActiveTab]      = useState<TabId>("overview");
  const [variants,       setVariants]       = useState<Variant[]>([]);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [showSizeChart,  setShowSizeChart]  = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleteAlertSubtitle, setDeleteAlertSubtitle] = useState("");
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [addAlertTitle, setAddAlertTitle] = useState("Variant Added");
  const [addAlertSubtitle, setAddAlertSubtitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; label: string } | null>(null);
  const [deletingVariant, setDeletingVariant] = useState(false);
  const [isB2B, setIsB2B] = useState(false);

  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold });

  const goToProductManagement = () => {
    router.push("/(main)/productmanagement" as any);
  };

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setError("Product id is missing.");
        setLoading(false);
        return;
      }
      await hydrateSellerSession();
      if (!ensureSellerId()) {
        if (!cancelled) {
          setError(null);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchProductDetail(String(id));
        if (!cancelled) {
          const view = prepareProductDetailView(detail);
          setP(view.product);
          setVariants(view.variants);
          setActiveImg(0);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load product details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleAddVariant = useCallback(async (form: VariantFormState) => {
    if (!id) return;
    const payload = await buildVariantMutationPayload(form);
    await createProductVariant(String(id), payload);
    const detail = await fetchProductDetail(String(id));
    const view = prepareProductDetailView(detail);
    setP(view.product);
    setVariants(view.variants);
    setAddAlertTitle("Variant Added");
    setAddAlertSubtitle(`${form.color} · Size ${form.size} variant added successfully.`);
    setShowAddAlert(true);
    setTimeout(() => setShowAddAlert(false), 1700);
  }, [id]);

  const requestDeleteVariant = useCallback((variantId: string, label: string) => {
    setDeleteConfirm({ id: variantId, label });
  }, []);

  const handleDeleteVariant = useCallback(async (variantId: string) => {
    if (!id) return;
    if (!/^\d+$/.test(variantId)) {
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      return;
    }
    try {
      await deleteProductVariant(String(id), variantId);
      const detail = await fetchProductDetail(String(id));
      const view = prepareProductDetailView(detail);
      setP(view.product);
      setVariants(view.variants);
      setDeleteAlertSubtitle("Variant removed successfully.");
      setShowDeleteAlert(true);
      setTimeout(() => setShowDeleteAlert(false), 1700);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to delete variant.";
      Alert.alert("Error", msg);
    }
  }, [id]);

  const confirmDeleteVariant = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeletingVariant(true);
    try {
      await handleDeleteVariant(deleteConfirm.id);
      setDeleteConfirm(null);
    } finally {
      setDeletingVariant(false);
    }
  }, [deleteConfirm, handleDeleteVariant]);

  const handleEditVariant = useCallback((v: Variant) => {
    setEditingVariant(v);
  }, []);

  const handleSaveVariant = useCallback(async (form: VariantFormState) => {
    if (!id || !editingVariant) return;
    const payload = await buildVariantMutationPayload(form);
    await updateProductVariant(String(id), editingVariant.id, payload);
    const detail = await fetchProductDetail(String(id));
    const view = prepareProductDetailView(detail);
    setP(view.product);
    setVariants(view.variants);
    setAddAlertTitle("Variant Updated");
    setAddAlertSubtitle(`${form.color} · Size ${form.size} variant updated successfully.`);
    setShowAddAlert(true);
    setTimeout(() => setShowAddAlert(false), 1700);
  }, [id, editingVariant]);

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.navy} />
        <Text style={{ marginTop: 12, fontFamily: "Outfit_500Medium", color: C.textMid }}>Loading product…</Text>
      </View>
    );
  }

  if (error || !p) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, padding: 24 }}>
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={C.red} />
        <Text style={{ marginTop: 12, fontFamily: "Outfit_600SemiBold", color: C.textDark, textAlign: "center" }}>{error ?? "Product not found"}</Text>
        <TouchableOpacity onPress={goToProductManagement} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.navy, borderRadius: 8 }}>
          <Text style={{ fontFamily: "Outfit_600SemiBold", color: C.white }}>Back to Products</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayImages = p.images.filter(img => img && img.trim().length > 0);
  const heroImages = displayImages.length > 0 ? displayImages : [""];

  const displayStatus = resolveDisplayStatus(p);
  const st = getStatusStyle(displayStatus);
  const leafSubcategory = resolveLeafSubcategory(p);
  const { totalMetro, mrpInclGst, displayVariant } = getHeroPricing(p, variants);
  const lowestVariantLabel = formatLowestVariantLabel(displayVariant);
  const minQuantity = resolveMinQuantity(variants, displayVariant, p.minQuantity);
  const displayDiscount = displayVariant?.discount ?? p.discount;

  const uniqueColors = variants.filter((v, i, arr) => arr.findIndex(x => x.color === v.color) === i);
  const uniqueSizes = [...new Set(variants.map(v => v.size))];

  // ─── WEB LAYOUT (wide screens only) ───────────────────────
  if (useDesktopWebLayout) {
    return (
      <View style={sw.root}>
        <View style={sw.header}>
          <View style={sw.headerInner}>
            <TouchableOpacity onPress={goToProductManagement} style={sw.backBtn}>
              <Ionicons name="arrow-back" size={18} color={C.white} />
              <Text style={sw.backBtnText}>Back</Text>
            </TouchableOpacity>
            <View style={sw.headerContent}>
              <Text style={sw.headerTitle}>Product Details</Text>
              <Text style={sw.headerSub}>SKU: {p.sku} · Last updated: {p.updated}</Text>
            </View>
            <View style={sw.headerActions}>
              <TouchableOpacity style={sw.addVariantBtn} onPress={() => { setActiveTab("variants"); setShowAddVariant(true); }} activeOpacity={0.85}>
                <MaterialCommunityIcons name="plus-circle-outline" size={15} color={C.white} />
                <Text style={sw.addVariantBtnText}>Add Variant</Text>
              </TouchableOpacity>
              <TouchableOpacity style={sw.editBtn} onPress={() => router.push({ pathname: "/(main)/Editproduct", params: { id: p.id } } as any)} activeOpacity={0.85}>
                <MaterialCommunityIcons name="pencil-outline" size={15} color={C.white} />
                <Text style={sw.editBtnText}>Edit Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView style={sw.scrollView} showsVerticalScrollIndicator={false}>
          <View style={sw.contentWrap}>
            <WebHeroSection p={p} activeImg={activeImg} setActiveImg={setActiveImg} variants={variants} />

            <View style={sw.tabBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={sw.tabScrollContent}
              >
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={[sw.tabBtn, isActive && sw.tabBtnActive, { flexShrink: 0 }]}
                      onPress={() => setActiveTab(tab.id)}
                      activeOpacity={0.75}
                    >
                      <MaterialCommunityIcons name={tab.icon as any} size={14} color={isActive ? C.white : C.textMid} />
                      <Text style={[sw.tabBtnText, isActive && sw.tabBtnTextActive]}>{tab.label}</Text>
                      {tab.id === "variants" && (
                        <View style={[sw.tabBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#FFF7ED" }]}>
                          <Text style={[sw.tabBadgeTxt, { color: isActive ? C.white : C.orange }]}>{variants.length}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={sw.tabContent}>
              {activeTab === "overview"       && <OverviewTab p={p} />}
              {activeTab === "variants"       && (
                <VariantsTab
                  variants={variants}
                  onAdd={() => setShowAddVariant(true)}
                  onDelete={requestDeleteVariant}
                  onEdit={handleEditVariant}
                />
              )}
              {activeTab === "specifications" && <SpecsTab    p={p} />}
              {activeTab === "delivery"       && <DeliveryTab p={p} />}
              {activeTab === "return"         && <ReturnTab   p={p} />}
              {activeTab === "sizechart"      && (
                <SizeChartTab
                  chart={p.sizeChart}
                  chartName={p.sizeChartName}
                  chartImage={p.sizeChartImage}
                />
              )}
            </View>
          </View>
        </ScrollView>

        <AddVariantModal
          visible={showAddVariant}
          onClose={() => setShowAddVariant(false)}
          onSubmit={handleAddVariant}
          product={p}
          variantIndex={variants.length + 1}
          isB2B={isB2B}
        />
        <EditVariantModal
          visible={!!editingVariant}
          variant={editingVariant}
          product={p}
          variantIndex={Math.max(1, variants.findIndex((v) => v.id === editingVariant?.id) + 1)}
          onClose={() => setEditingVariant(null)}
          onSave={handleSaveVariant}
          isB2B={isB2B}
        />
        <SizeChartModal visible={showSizeChart} onClose={() => setShowSizeChart(false)} chart={p.sizeChart} />
        <DeleteConfirmModal
          visible={!!deleteConfirm}
          title={deleteConfirm ? `Remove ${deleteConfirm.label}?` : "Remove Variant?"}
          message="This action cannot be undone."
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={confirmDeleteVariant}
          confirming={deletingVariant}
        />
        <SweetAlert
          visible={showDeleteAlert}
          type="success"
          title="Variant Deleted"
          subtitle={deleteAlertSubtitle}
        />
        <SweetAlert
          visible={showAddAlert}
          type="success"
          title={addAlertTitle}
          subtitle={addAlertSubtitle}
        />
      </View>
    );
  }

  // ─── MOBILE / NARROW WEB LAYOUT ───────────────────────────
  const Shell = isWeb ? View : SafeAreaView;

  return (
    <Shell style={[s.root, isWeb && s.rootWeb]}>
      {!isWeb ? <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} /> : null}

      <View style={[s.header, compact && s.headerCompact]}>
        <TouchableOpacity onPress={goToProductManagement} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Text style={s.headerTitle} numberOfLines={1}>Product Details</Text>
          <Text style={s.headerSub} numberOfLines={1}>SKU: {displayVariant?.sku && displayVariant.sku !== "—" ? displayVariant.sku : p.sku}</Text>
        </View>
        <View style={[s.statusChip, { backgroundColor: st.bg }, compact && s.statusChipCompact]}>
          <View style={[s.statusDot, { backgroundColor: st.color }]} />
          <Text style={[s.statusChipText, { color: st.color }]} numberOfLines={1}>{displayStatus}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, compact && s.scrollContentCompact]}
      >
        <View style={s.galleryContainer}>
          <Image source={{ uri: heroImages[Math.min(activeImg, heroImages.length - 1)] }} style={s.heroImage} resizeMode="cover" />
          <View style={s.discountBadge}><Text style={s.discountText}>{displayDiscount}% OFF</Text></View>
          <View style={s.stockChip}>
            <MaterialCommunityIcons name="check-circle-outline" size={12} color={C.green} />
            <Text style={s.stockChipText}>{p.stock} units</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={s.thumbScrollContent}
          style={s.thumbRow}
        >
          {heroImages.filter(Boolean).map((img, i) => (
            <TouchableOpacity key={i} onPress={() => setActiveImg(i)} style={[s.thumb, i === activeImg && s.thumbActive]}>
              <Image source={{ uri: img }} style={s.thumbImg} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[s.heroCard, compact && s.heroCardCompact]}>
          <View style={s.catPill}><Text style={s.catPillText}>{p.category} · {leafSubcategory}</Text></View>
          <Text style={s.productName}>{p.name}</Text>
          <Text style={s.skuText}>SKU: {displayVariant?.sku && displayVariant.sku !== "—" ? displayVariant.sku : p.sku}</Text>
          {lowestVariantLabel ? (
            <Text style={s.variantMeta}>Lowest price: {lowestVariantLabel}</Text>
          ) : null}
          <View style={s.priceRow}>
            <Text style={s.price}>₹{totalMetro.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
            {mrpInclGst > totalMetro ? (
              <Text style={s.mrp}>₹{mrpInclGst.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
            ) : null}
            {displayDiscount > 0 ? (
              <View style={s.saveBadge}><Text style={s.saveText}>Save {displayDiscount}%</Text></View>
            ) : null}
          </View>
          <Text style={s.priceNote}>Total (Metro-Metro) · lowest price variant</Text>
          {minQuantity != null ? (
            <View style={s.minQtyRow}>
              <MaterialCommunityIcons name="package-variant-closed" size={14} color={C.navy} />
              <Text style={s.minQtyText}>Minimum order quantity: <Text style={s.minQtyVal}>{minQuantity} units</Text></Text>
            </View>
          ) : null}

          {uniqueColors.length > 0 && (
            <View style={s.colorsSection}>
              <Text style={s.colorsLabel}>Available Colors</Text>
              <View style={s.colorSwatches}>
                {uniqueColors.map(v => (
                  <View key={v.id} style={s.swatchWrap}>
                    <View style={[s.swatch, { backgroundColor: v.colorHex }, v.color === "White" && { borderWidth: 1.5, borderColor: C.border }]} />
                    <Text style={s.swatchLabel}>{v.color}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {uniqueSizes.length > 0 && (
            <View style={s.sizesSection}>
              <Text style={s.sizesLabel}>Available Sizes</Text>
              <View style={s.sizePills}>
                {uniqueSizes.map((size, idx) => (
                  <View key={idx} style={s.sizeChipHero}>
                    <Text style={s.sizeChipHeroTxt}>{size}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={s.attrRow}>
            {([
              { label: "Color",    value: displayVariant?.color ?? p.color },
              { label: "Size",     value: displayVariant?.size ?? p.size },
              { label: "Material", value: p.material },
              { label: "Weight",   value: p.weight   },
              ...(minQuantity != null ? [{ label: "Min Order", value: `${minQuantity} units` }] : []),
            ]).map(a => (
              <View key={a.label} style={s.attrChip}>
                <Text style={s.attrLabel}>{a.label}: </Text>
                <Text style={s.attrValue}>{a.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.tabBarRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={compact}
            nestedScrollEnabled
            contentContainerStyle={[s.tabScrollContent, compact && s.tabScrollContentCompact]}
            style={s.tabScrollWrapper}
          >
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity key={tab.id} style={[s.tabBtn, isActive && s.tabBtnActive, { flexShrink: 0 }]} onPress={() => setActiveTab(tab.id)} activeOpacity={0.75}>
                  <MaterialCommunityIcons name={tab.icon as any} size={13} color={isActive ? C.white : C.textMid} />
                  <Text style={[s.tabBtnText, isActive && s.tabBtnTextActive]} numberOfLines={1}>{tabLabel(tab, compact)}</Text>
                  {tab.id === "variants" && (
                    <View style={[s.tabBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "#FFF7ED" }]}>
                      <Text style={[s.tabBadgeTxt, { color: isActive ? C.white : C.orange }]}>{variants.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[s.tabContent, compact && s.tabContentCompact]}>
          {activeTab === "overview"       && <OverviewTab p={p} />}
          {activeTab === "variants"       && (
            <VariantsTab
              variants={variants}
              onAdd={() => setShowAddVariant(true)}
              onDelete={requestDeleteVariant}
              onEdit={handleEditVariant}
            />
          )}
          {activeTab === "specifications" && <SpecsTab    p={p} />}
          {activeTab === "delivery"       && <DeliveryTab p={p} />}
          {activeTab === "return"         && <ReturnTab   p={p} />}
          {activeTab === "sizechart"      && (
            <SizeChartTab
              chart={p.sizeChart}
              chartName={p.sizeChartName}
              chartImage={p.sizeChartImage}
            />
          )}
        </View>
      </ScrollView>

      <View style={[s.bottomBar, compact && s.bottomBarCompact, isWeb && s.bottomBarWeb]}>
        <TouchableOpacity style={[s.backAction, compact && s.bottomBtnCompact]} onPress={() => router.push("/(main)/productmanagement" as any)} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={17} color={C.navy} />
          {!compact ? <Text style={s.backActionText}>Back</Text> : null}
        </TouchableOpacity>
        <TouchableOpacity style={[s.variantAction, compact && s.bottomBtnCompact]} onPress={() => { setActiveTab("variants"); setShowAddVariant(true); }} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus-circle-outline" size={17} color={C.white} />
          <Text style={[s.variantActionText, compact && s.bottomBtnTextCompact]} numberOfLines={1}>Add Variant</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.editAction, compact && s.bottomBtnCompact]} onPress={() => router.push({ pathname: "/(main)/Editproduct", params: { id: p.id } } as any)} activeOpacity={0.85}>
          <MaterialCommunityIcons name="pencil-outline" size={17} color={C.white} />
          <Text style={[s.editActionText, compact && s.bottomBtnTextCompact]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <AddVariantModal
        visible={showAddVariant}
        onClose={() => setShowAddVariant(false)}
        onSubmit={handleAddVariant}
        product={p}
        variantIndex={variants.length + 1}
        isB2B={isB2B}
      />
      <EditVariantModal
        visible={!!editingVariant}
        variant={editingVariant}
        product={p}
        variantIndex={Math.max(1, variants.findIndex((v) => v.id === editingVariant?.id) + 1)}
        onClose={() => setEditingVariant(null)}
        onSave={handleSaveVariant}
        isB2B={isB2B}
      />
      <SizeChartModal visible={showSizeChart} onClose={() => setShowSizeChart(false)} chart={p.sizeChart} />
      <DeleteConfirmModal
        visible={!!deleteConfirm}
        title={deleteConfirm ? `Remove ${deleteConfirm.label}?` : "Remove Variant?"}
        message="This action cannot be undone."
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDeleteVariant}
        confirming={deletingVariant}
      />
      <SweetAlert
        visible={showDeleteAlert}
        type="success"
        title="Variant Deleted"
        subtitle={deleteAlertSubtitle}
      />
      <SweetAlert
        visible={showAddAlert}
        type="success"
        title={addAlertTitle}
        subtitle={addAlertSubtitle}
      />
    </Shell>
  );
};

// ─── Sub-Component Styles ─────────────────────────────────────
const sub = StyleSheet.create({
  sectionHeader:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionIconWrap: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#EEF1FF", alignItems: "center", justifyContent: "center" },
  sectionTitle:    { fontFamily: "Outfit_700Bold", fontSize: 13.5, color: C.navyLight },
  card:            { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  infoRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  infoLabel:       { fontFamily: "Outfit_500Medium", fontSize: 12.5, color: C.textLight, flex: 1 },
  infoValue:       { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: C.textDark, textAlign: "right", maxWidth: "58%" },
  multilineValue:  { textAlign: "right", lineHeight: 20 },
  descText:        { fontFamily: "Outfit_400Regular", fontSize: 13.5, color: C.textMid, lineHeight: 22 },
  adminNoteBox:    { backgroundColor: C.orangePale, borderLeftWidth: 3, borderLeftColor: C.orange, borderRadius: 10, padding: 12 },
  adminNoteText:   { fontFamily: "Outfit_400Regular", fontSize: 12.5, color: C.textMid, lineHeight: 21 },
  featureRow:      { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  featureCheck:    { width: 22, height: 22, borderRadius: 11, backgroundColor: C.greenPale, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  featureText:     { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid, flex: 1, lineHeight: 20 },
  deliveryHighlight:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.bluePale, borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 12, padding: 14, marginBottom: 14 },
  deliveryHighlightTitle: { fontFamily: "Outfit_700Bold",    fontSize: 14, color: C.navy    },
  deliveryHighlightSub:   { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textMid, marginTop: 2 },
  tableHeader:     { flexDirection: "row", backgroundColor: C.bg, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 2 },
  tableHeaderCell: { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.textMid, textAlign: "center" },
  tableRow:        { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  tableCell:       { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, textAlign: "center" },
  returnHighlight:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.greenPale, borderWidth: 1, borderColor: C.greenLight, borderRadius: 12, padding: 14, marginBottom: 14 },
  returnHighlightTitle: { fontFamily: "Outfit_700Bold",    fontSize: 14, color: C.green   },
  returnHighlightSub:   { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textMid, marginTop: 2 },
  conditionRow:       { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  conditionIndex:     { width: 22, height: 22, borderRadius: 11, backgroundColor: C.navyDeep, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  conditionIndexText: { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.white },
  conditionText:      { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid, flex: 1, lineHeight: 20 },
  processBox:  { backgroundColor: C.purplePale, borderRadius: 12, padding: 14 },
  processText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.purple, lineHeight: 22 },
});

// ─── Mobile Screen Styles ─────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  rootWeb: { width: "100%", minWidth: 0, alignSelf: "stretch" },
  scroll: { flex: 1, width: "100%", minWidth: 0 },
  scrollContent: { paddingBottom: 110 },
  scrollContentCompact: { paddingBottom: 96 },
  header: { backgroundColor: C.navyDeep, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 12 : 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 },
  headerCompact: { gap: 8, paddingHorizontal: 10, paddingVertical: 10 },
  backBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerContent: { flex: 1, minWidth: 0 },
  headerTitle:   { fontFamily: "Outfit_700Bold",    fontSize: 17, color: C.white, lineHeight: 22 },
  headerSub:     { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.55)" },
  statusChip:    { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, flexShrink: 0 },
  statusChipCompact: { paddingHorizontal: 8 },
  statusDot:     { width: 7, height: 7, borderRadius: 3.5 },
  statusChipText:{ fontFamily: "Outfit_700Bold", fontSize: 11 },
  galleryContainer: { backgroundColor: "#F3F4F8", position: "relative" },
  heroImage:     { width: "100%", height: 300 },
  discountBadge: { position: "absolute", top: 14, left: 14, backgroundColor: C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  discountText:  { fontFamily: "Outfit_800ExtraBold", fontSize: 12, color: C.white },
  stockChip:     { position: "absolute", top: 14, right: 14, backgroundColor: "rgba(240,253,244,0.92)", borderWidth: 1, borderColor: C.green, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  stockChipText: { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.green },
  thumbRow:      { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.white, width: "100%" },
  thumbScrollContent: { flexDirection: "row", gap: 8 },
  thumb:         { width: 60, height: 60, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: C.border },
  thumbActive:   { borderColor: C.navy, borderWidth: 2.5 },
  thumbImg:      { width: "100%", height: "100%" },
  heroCard:      { backgroundColor: C.white, marginHorizontal: 14, marginTop: 4, marginBottom: 12, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  heroCardCompact: { marginHorizontal: 0, borderRadius: 14, padding: 12 },
  catPill:       { alignSelf: "flex-start", backgroundColor: C.purplePale, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  catPillText:   { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.purple },
  productName:   { fontFamily: "Outfit_800ExtraBold", fontSize: 20, color: C.textDark, lineHeight: 26, marginBottom: 4 },
  skuText:       { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginBottom: 12 },
  variantMeta:   { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.navy, marginBottom: 8 },
  priceRow:      { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 4 },
  price:         { fontFamily: "Outfit_800ExtraBold", fontSize: 26, color: C.orange },
  mrp:           { fontFamily: "Outfit_500Medium", fontSize: 14, color: C.textLight, textDecorationLine: "line-through" },
  saveBadge:     { backgroundColor: C.greenPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  saveText:      { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.green },
  priceNote:     { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginBottom: 4 },
  minQtyRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, backgroundColor: C.purplePale, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#E0DBFF" },
  minQtyText:    { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.textMid, flex: 1 },
  minQtyVal:     { fontFamily: "Outfit_700Bold", color: C.navy },
  colorsSection: { marginTop: 12, marginBottom: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  colorsLabel:   { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  colorSwatches: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  swatchWrap:    { alignItems: "center", gap: 5 },
  swatch:        { width: 30, height: 30, borderRadius: 15 },
  swatchLabel:   { fontFamily: "Outfit_500Medium", fontSize: 10, color: C.textMid },
  sizesSection:  { marginTop: 10, marginBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  sizesLabel:    { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  sizePills:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeChipHero:  { backgroundColor: C.purplePale, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: C.purpleLight },
  sizeChipHeroTxt: { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.navy },
  attrRow:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  attrChip:  { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  attrLabel: { fontFamily: "Outfit_500Medium", fontSize: 11, color: C.textLight },
  attrValue: { fontFamily: "Outfit_700Bold",   fontSize: 11, color: C.navy     },
  tabBarRow:        { flexDirection: "row", alignItems: "center", marginBottom: 8, width: "100%" },
  tabScrollWrapper: { flex: 1, minWidth: 0 },
  tabScrollContent: { paddingHorizontal: 14, gap: 8, paddingVertical: 4, paddingRight: 24 },
  tabScrollContentCompact: { paddingHorizontal: 0, paddingRight: 20 },
  tabBtn:          { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, flexShrink: 0 },
  tabBtnActive:    { backgroundColor: C.navy, borderColor: C.navy },
  tabBtnText:      { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textMid },
  tabBtnTextActive:{ color: C.white },
  tabBadge:        { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeTxt:     { fontFamily: "Outfit_700Bold", fontSize: 10 },
  tabContent:      { paddingHorizontal: 14 },
  tabContentCompact: { paddingHorizontal: 0 },
  bottomBar:         { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, flexDirection: "row", gap: 6, padding: 10, paddingBottom: Platform.OS === "ios" ? 28 : 12, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 12 },
  bottomBarCompact: { gap: 4, paddingHorizontal: 8, paddingVertical: 8, paddingBottom: Platform.OS === "ios" ? 24 : 8 },
  bottomBarWeb: { position: "relative" as const, marginTop: 8 },
  bottomBtnCompact: { paddingVertical: 10, gap: 4 },
  bottomBtnTextCompact: { fontSize: 11 },
  backAction:        { flex: 0.8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1.5, borderColor: C.navy, borderRadius: 13, paddingVertical: 11 },
  backActionText:    { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.navy },
  variantAction:     { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: C.orange, borderRadius: 13, paddingVertical: 11 },
  variantActionText: { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.white },
  editAction:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: C.navy, borderRadius: 13, paddingVertical: 11 },
  editActionText:    { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.white },
});

// ─── WEB: Hero section styles ─────────────────────────────────
const wh = StyleSheet.create({
  container:      { flexDirection: "row", gap: 28, backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 24, marginBottom: 20, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  imageSection:   { width: 420, flexShrink: 0 },
  heroImageWrap:  { borderRadius: 16, overflow: "hidden", position: "relative", backgroundColor: "#F3F4F8" },
  heroImage:      { width: "100%", height: 380 },
  thumbRow:       { marginTop: 10 },
  thumbNavRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  thumbScroller:  { flex: 1 },
  thumbScrollContent: { flexDirection: "row", gap: 8 },
  thumb:          { width: 72, height: 72, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: C.border },
  thumbActive:    { borderColor: C.navy, borderWidth: 2.5 },
  thumbImg:       { width: "100%", height: "100%" },
  thumbNavBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.96)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 6 },
  detailsSection: { flex: 1, minWidth: 0 },
  detailsInner:   { flex: 1 },
  topRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  productName:    { fontFamily: "Outfit_800ExtraBold", fontSize: 26, color: C.textDark, lineHeight: 34, marginBottom: 4 },
  skuText:        { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginBottom: 14 },
  variantMeta:    { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.navy, marginBottom: 10 },
  priceRow:       { flexDirection: "row", alignItems: "baseline", gap: 12, marginBottom: 4 },
  price:          { fontFamily: "Outfit_800ExtraBold", fontSize: 32, color: C.orange },
  mrp:            { fontFamily: "Outfit_500Medium", fontSize: 16, color: C.textLight, textDecorationLine: "line-through" },
  priceNote:      { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight },
  minQtyRow:      { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, backgroundColor: C.purplePale, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#E0DBFF" },
  minQtyText:     { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.textMid, flex: 1 },
  minQtyVal:      { fontFamily: "Outfit_700Bold", color: C.navy },
  divider:            { borderTopWidth: 1, borderTopColor: "#F3F4F6", marginVertical: 14 },
  detailCard:         { backgroundColor: C.bg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  detailLine:         { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  detailCellInline:   { flex: 1, minWidth: 120, backgroundColor: C.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  detailLabel:        { fontFamily: "Outfit_400Regular", fontSize: 10.5, color: C.textLight, marginBottom: 4 },
  detailValue:        { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.textDark },
  returnPolicyCard:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.bg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  colorsSection:      {},
  colorsLabel:    { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  colorSwatches:  { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  swatchWrap:     { alignItems: "center", gap: 5 },
  swatch:         { width: 34, height: 34, borderRadius: 17 },
  swatchLabel:    { fontFamily: "Outfit_500Medium", fontSize: 10.5, color: C.textMid },
  sizesSection:   { marginTop: 12 },
  sizesLabel:     { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  sizePills:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeChip:       { backgroundColor: C.purplePale, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: C.purpleLight },
  sizeChipTxt:    { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.navy },
  navBtnLeft:     { position: "absolute", left: 14, top: "50%", transform: [{ translateY: -20 }], width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
  navBtnRight:    { position: "absolute", right: 14, top: "50%", transform: [{ translateY: -20 }], width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
  thumbCounter:   { position: "absolute", bottom: 12, left: "50%", transform: [{ translateX: -30 }], paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: C.border },
  thumbCounterTxt:{ fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.navy },
  attrRow:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  descLabel:      { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.textMid, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  descText:       { fontFamily: "Outfit_400Regular", fontSize: 13.5, color: C.textMid, lineHeight: 22 },
});

// ─── WEB: Tab content grid ────────────────────────────────────
const wt = StyleSheet.create({
  twoColGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  halfCard:     { flex: 1, minWidth: 300, backgroundColor: C.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  fullWidthCard:{ width: "100%", backgroundColor: C.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  threeColInner:{ flexDirection: "row", gap: 12, flexWrap: "wrap" },
  thirdTile:    { flex: 1, minWidth: 160 },
});

// ─── WEB: Main layout styles ──────────────────────────────────
const sw = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  header:      { backgroundColor: C.navyDeep, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 },
  headerInner: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 32, paddingVertical: 16, maxWidth: 1400, alignSelf: "center", width: "100%" } as any,
  backBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  backBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.white },
  headerContent:{ flex: 1 },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: C.white, lineHeight: 24 },
  headerSub:   { fontFamily: "Outfit_400Regular", fontSize: 11.5, color: "rgba(255,255,255,0.55)" },
  headerActions:{ flexDirection: "row", gap: 10, alignItems: "center" },
  addVariantBtn:{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.orange, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  addVariantBtnText:{ fontFamily: "Outfit_700Bold", fontSize: 13, color: C.white },
  editBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  editBtnText: { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.white },
  scrollView:  { flex: 1, minWidth: 0 },
  contentWrap: { maxWidth: 1400, alignSelf: "center", width: "100%", minWidth: 0, paddingHorizontal: 32, paddingTop: 24, paddingBottom: 48 } as any,
  tabBar:      { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 8, marginBottom: 16, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tabBarInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  tabScrollContent:{ gap: 6, paddingVertical: 2, paddingRight: 16 },
  tabBtn:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: "transparent", backgroundColor: "transparent", flexShrink: 0 },
  tabBtnActive:{ backgroundColor: C.navy, borderColor: C.navy },
  tabBtnText:  { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textMid },
  tabBtnTextActive:{ color: C.white },
  tabBadge:    { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeTxt: { fontFamily: "Outfit_700Bold", fontSize: 11 },
  tabContent:  { paddingTop: 0, width: "100%", minWidth: 0 },
});

export default ProductDetailScreen;