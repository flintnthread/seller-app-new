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
    totalMetroMetro?: number;
    totalPriceMetroMetro?: number;
}): number {
    const precomputed = num(v.totalMetroMetro ?? v.totalPriceMetroMetro);
    if (precomputed > 0) return precomputed;

    const finalPrice = num(v.finalPrice ?? v.sellingPriceWithGst ?? v.sellingPrice);
    const metro = num(v.metroMetroDelivery ?? v.metroMetroDeliveryCharge);
    return Math.round((finalPrice + metro) * 100) / 100;
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
