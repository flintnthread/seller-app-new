import { COMMISSION_PERCENT } from "@/lib/product/variantPricing";

/** Shared helpers — pick the variant with the lowest metro-metro total for list/detail display. */

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export function resolveVariantMetroTotal(v: {
    finalPrice?: number;
    sellingPriceWithGst?: number;
    sellingPrice?: number;
    metroMetroDelivery?: number;
    metroMetroDeliveryCharge?: number;
    commissionAmount?: number;
    commissionPercent?: number;
    totalMetroMetro?: number;
    totalPriceMetroMetro?: number;
}): number {
    const finalPrice = num(v.finalPrice ?? v.sellingPriceWithGst ?? v.sellingPrice);
    const metro = num(v.metroMetroDelivery ?? v.metroMetroDeliveryCharge);
    const commissionPct = num(v.commissionPercent) > 0 ? num(v.commissionPercent) : COMMISSION_PERCENT;
    const commission =
        num(v.commissionAmount) > 0
            ? num(v.commissionAmount)
            : Math.round((finalPrice * commissionPct) / 100 * 100) / 100;
    const withCommission = Math.round((finalPrice + metro + commission) * 100) / 100;

    const precomputed = num(v.totalMetroMetro ?? v.totalPriceMetroMetro);
    if (precomputed > 0 && precomputed >= withCommission - 0.01) return precomputed;

    return withCommission;
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
