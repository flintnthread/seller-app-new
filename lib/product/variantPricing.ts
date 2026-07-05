import type { ProductFormCatalog } from "@/services/productApi";
import { resolveWeightSlab, type DeliveryWeightSlab } from "@/lib/product/weightSlab";

export const DEFAULT_GST_PERCENT = 5;
export const COMMISSION_PERCENT = 0;
export const DEFAULT_INTRA_CITY = 175;
export const DEFAULT_METRO_METRO = 205;

export type VariantPricingResult = {
    mrpExcl: number;
    sellingExcl: number;
    gstPercent: number;
    discountPercentage: number;
    discountAmount: number;
    taxAmount: number;
    finalPrice: number;
    mrpInclGst: number;
    commissionAmount: number;
    intraCityCharge: number;
    metroMetroCharge: number;
    totalIntraCity: number;
    totalMetroMetro: number;
};

export type DeliveryChargeInfo = {
    intraCity: number;
    metroMetro: number;
    custom: boolean;
};

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

function parsePositive(value: string | number | undefined | null): number {
    const n = typeof value === "number" ? value : parseFloat(String(value ?? "").trim());
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/** GST % from middle subcategory row (subcategories table) in product-form catalog. */
export function resolveGstPercentFromCatalog(
    catalog: ProductFormCatalog | null | undefined,
    opts: {
        categorySubId?: number | null;
        categorySubName?: string;
        subcategoryId?: number | null;
        mainCategory?: string;
    } = {},
): number {
    if (!catalog?.categories?.length) return DEFAULT_GST_PERCENT;

    const { categorySubId, categorySubName, subcategoryId, mainCategory } = opts;

    const gstForSub = (sub: { gstPercentage?: number }) => sub.gstPercentage ?? DEFAULT_GST_PERCENT;

    for (const cat of catalog.categories) {
        if (mainCategory?.trim() && cat.name !== mainCategory.trim()) continue;
        for (const sub of cat.subcategories ?? []) {
            if (categorySubId != null && sub.id === categorySubId) return gstForSub(sub);
            if (categorySubName?.trim() && sub.name === categorySubName.trim()) return gstForSub(sub);
            if (subcategoryId != null && sub.id === subcategoryId) return gstForSub(sub);
            if (subcategoryId != null && sub.children?.some((c) => c.id === subcategoryId)) {
                return gstForSub(sub);
            }
        }
    }

    for (const cat of catalog.categories) {
        for (const sub of cat.subcategories ?? []) {
            if (categorySubId != null && sub.id === categorySubId) return gstForSub(sub);
            if (categorySubName?.trim() && sub.name === categorySubName.trim()) return gstForSub(sub);
            if (subcategoryId != null && sub.id === subcategoryId) return gstForSub(sub);
            if (subcategoryId != null && sub.children?.some((c) => c.id === subcategoryId)) {
                return gstForSub(sub);
            }
        }
    }

    return DEFAULT_GST_PERCENT;
}

/** Delivery charges from backend weight slabs (delivery_charges / delivery_weight_slabs). */
export function resolveDeliveryCharges(
    basic: {
        weight?: string;
        intraCityCharge?: string;
        metroMetroCharge?: string;
        customDeliveryCharge?: boolean;
    },
    catalogSlabs?: DeliveryWeightSlab[],
): DeliveryChargeInfo {
    const weightRaw = String(basic.weight ?? "").trim();
    const weightKg = parseFloat(weightRaw);
    const hasWeight = Number.isFinite(weightKg) && weightKg > 0;

    if (hasWeight) {
        const slab = resolveWeightSlab(weightRaw, catalogSlabs);
        if (slab.custom) {
            return { intraCity: 0, metroMetro: 0, custom: true };
        }
        return {
            intraCity: slab.intraCityCharge,
            metroMetro: slab.metroMetroCharge,
            custom: false,
        };
    }

    if (basic.customDeliveryCharge) {
        return { intraCity: 0, metroMetro: 0, custom: true };
    }

    if (basic.intraCityCharge !== "" && basic.metroMetroCharge !== "") {
        const intra = parseFloat(String(basic.intraCityCharge));
        const metro = parseFloat(String(basic.metroMetroCharge));
        if (Number.isFinite(intra) && Number.isFinite(metro)) {
            return { intraCity: intra, metroMetro: metro, custom: false };
        }
    }

    return {
        intraCity: DEFAULT_INTRA_CITY,
        metroMetro: DEFAULT_METRO_METRO,
        custom: false,
    };
}

export function deliveryInfoFromSlab(slab: {
    intraCityCharge: number;
    metroMetroCharge: number;
    custom?: boolean;
}): DeliveryChargeInfo {
    if (slab.custom) {
        return { intraCity: 0, metroMetro: 0, custom: true };
    }
    return {
        intraCity: slab.intraCityCharge,
        metroMetro: slab.metroMetroCharge,
        custom: false,
    };
}

/**
 * Mirrors backend ProductVariantPricingCalculator — commission on selling price with GST.
 */
export function calculateVariantPricing(input: {
    mrpExcl: number;
    sellingExcl: number;
    gstPercent?: number;
    intraCityCharge?: number;
    metroMetroCharge?: number;
    discountOverride?: number | null;
    commissionPercent?: number;
}): VariantPricingResult | null {
    const mrpExcl = input.mrpExcl;
    const sellingExcl = input.sellingExcl;
    if (mrpExcl <= 0 || sellingExcl <= 0) return null;

    const gst = input.gstPercent ?? DEFAULT_GST_PERCENT;
    const intra = input.intraCityCharge ?? DEFAULT_INTRA_CITY;
    const metro = input.metroMetroCharge ?? DEFAULT_METRO_METRO;
    const commissionPct = input.commissionPercent ?? COMMISSION_PERCENT;

    const discountAmount = round2(Math.max(0, mrpExcl - sellingExcl));
    let discountPercentage = input.discountOverride ?? null;
    if (discountPercentage == null && mrpExcl > 0) {
        discountPercentage = round2((discountAmount * 100) / mrpExcl);
    }
    if (discountPercentage == null) discountPercentage = 0;

    const taxAmount = round2((sellingExcl * gst) / 100);
    const finalPrice = round2(sellingExcl + taxAmount);
    const gstFactor = 1 + gst / 100;
    const mrpInclGst = round2(mrpExcl * gstFactor);
    const commissionAmount = round2((finalPrice * commissionPct) / 100);
    const totalIntraCity = round2(finalPrice + intra + commissionAmount);
    const totalMetroMetro = round2(finalPrice + metro + commissionAmount);

    return {
        mrpExcl,
        sellingExcl,
        gstPercent: gst,
        discountPercentage,
        discountAmount,
        taxAmount,
        finalPrice,
        mrpInclGst,
        commissionAmount,
        intraCityCharge: intra,
        metroMetroCharge: metro,
        totalIntraCity,
        totalMetroMetro,
    };
}

export function calculateVariantPricingFromStrings(input: {
    mrp: string;
    sellingPrice: string;
    gstPercent?: number;
    intraCityCharge?: number;
    metroMetroCharge?: number;
    discountOverride?: number | null;
    commissionPercent?: number;
}): VariantPricingResult | null {
    const mrpExcl = parsePositive(input.mrp);
    const sellingExcl = parsePositive(input.sellingPrice);
    if (!mrpExcl || !sellingExcl) return null;
    return calculateVariantPricing({
        mrpExcl,
        sellingExcl,
        ...(input.gstPercent != null ? { gstPercent: input.gstPercent } : {}),
        ...(input.intraCityCharge != null ? { intraCityCharge: input.intraCityCharge } : {}),
        ...(input.metroMetroCharge != null ? { metroMetroCharge: input.metroMetroCharge } : {}),
        ...(input.discountOverride != null ? { discountOverride: input.discountOverride } : {}),
        commissionPercent: 0,
    });
}

export function normalizePricingWithoutCommission(pricing: VariantPricingResult): VariantPricingResult {
    const totalIntraCity = round2(pricing.finalPrice + pricing.intraCityCharge);
    const totalMetroMetro = round2(pricing.finalPrice + pricing.metroMetroCharge);
    return {
        ...pricing,
        commissionAmount: 0,
        totalIntraCity,
        totalMetroMetro,
    };
}

export function mapPricingPreviewToResult(preview: {
    mrpExcl: number;
    sellingExcl: number;
    gstPercent: number;
    discountPercentage: number;
    discountAmount: number;
    taxAmount: number;
    finalPrice: number;
    mrpInclGst: number;
    commissionAmount: number;
    intraCityCharge: number;
    metroMetroCharge: number;
    totalIntraCity: number;
    totalMetroMetro: number;
}): VariantPricingResult {
    return normalizePricingWithoutCommission({
        mrpExcl: preview.mrpExcl,
        sellingExcl: preview.sellingExcl,
        gstPercent: preview.gstPercent,
        discountPercentage: preview.discountPercentage,
        discountAmount: preview.discountAmount,
        taxAmount: preview.taxAmount,
        finalPrice: preview.finalPrice,
        mrpInclGst: preview.mrpInclGst,
        commissionAmount: preview.commissionAmount,
        intraCityCharge: preview.intraCityCharge,
        metroMetroCharge: preview.metroMetroCharge,
        totalIntraCity: preview.totalIntraCity,
        totalMetroMetro: preview.totalMetroMetro,
    });
}

export function formatInr(amount: number): string {
    return `₹${amount.toFixed(2)}`;
}
