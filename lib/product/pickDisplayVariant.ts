import { COMMISSION_PERCENT } from "@/lib/product/variantPricing";

/** Shared helpers — pick the variant with the lowest metro-metro total for list/detail display. */

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function hasFiniteNumber(v: unknown): boolean {
    return v != null && v !== "" && Number.isFinite(Number(v));
}

/**
 * Metro-metro customer total for a variant.
 * Matches product-detail behavior: commissionPercent/Amount of 0 is real (no default %),
 * and a stored total from the API is preferred when present.
 */
export function resolveVariantMetroTotal(v: {
    finalPrice?: number;
    sellingPriceWithGst?: number;
    sellingPrice?: number;
    metroMetroDelivery?: number;
    metroMetroDeliveryCharge?: number;
    commissionAmount?: number;
    commissionPercent?: number;
    commissionPercentage?: number;
    totalMetroMetro?: number;
    totalPriceMetroMetro?: number;
}): number {
    const finalPrice = num(v.finalPrice ?? v.sellingPriceWithGst ?? v.sellingPrice);
    const metro = num(v.metroMetroDelivery ?? v.metroMetroDeliveryCharge);

    const precomputed = num(v.totalMetroMetro ?? v.totalPriceMetroMetro);
    if (precomputed > 0) return precomputed;

    const pctRaw = v.commissionPercent ?? v.commissionPercentage;
    // Explicit 0 is valid — only fall back to default % when percent is omitted.
    const commissionPct = hasFiniteNumber(pctRaw) ? num(pctRaw) : COMMISSION_PERCENT;

    const commission = hasFiniteNumber(v.commissionAmount)
        ? num(v.commissionAmount)
        : Math.round(((finalPrice * commissionPct) / 100) * 100) / 100;

    return Math.round((finalPrice + metro + commission) * 100) / 100;
}

export function pickMinimumPriceVariant<T extends { id?: string | number }>(
    variants: T[],
    getMetroTotal: (v: T) => number,
): T | null {
    if (!variants.length) return null;
    return variants.reduce((best, v) => {
        const vTotal = getMetroTotal(v);
        const bestTotal = getMetroTotal(best);
        if (vTotal < bestTotal) return v;
        if (vTotal === bestTotal && String(v.id ?? "") < String(best.id ?? "")) return v;
        return best;
    }, variants[0]);
}
