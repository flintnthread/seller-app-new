export type DeliveryWeightSlab = {
    id?: number;
    label: string;
    minWeightKg: number;
    maxWeightKg: number;
    intraCityCharge: number;
    metroMetroCharge: number;
    custom?: boolean;
};

const FALLBACK_SLABS: DeliveryWeightSlab[] = [
    { label: "0-500 gms", minWeightKg: 0, maxWeightKg: 0.5, intraCityCharge: 0, metroMetroCharge: 25 },
    { label: "1-2 kg", minWeightKg: 1, maxWeightKg: 2, intraCityCharge: 80, metroMetroCharge: 95 },
    { label: "2-5 kg", minWeightKg: 2, maxWeightKg: 5, intraCityCharge: 175, metroMetroCharge: 205 },
    { label: "Above 5 kg", minWeightKg: 5, maxWeightKg: 999.999, intraCityCharge: 0, metroMetroCharge: 0, custom: true },
];

export function weightToSlabLabel(weightRaw: string | number | undefined | null): string {
    return resolveWeightSlab(weightRaw).label;
}

export function resolveWeightSlab(
    weightRaw: string | number | undefined | null,
    slabs: DeliveryWeightSlab[] = FALLBACK_SLABS
): DeliveryWeightSlab {
    const w = parseFloat(String(weightRaw ?? "").trim());
    if (!Number.isFinite(w) || w <= 0) {
        return { label: "", minWeightKg: 0, maxWeightKg: 0, intraCityCharge: 0, metroMetroCharge: 25 };
    }
    const list = slabs.length > 0 ? slabs : FALLBACK_SLABS;

    for (const slab of list) {
        if (w >= slab.minWeightKg && w <= slab.maxWeightKg) {
            return slab;
        }
    }

    const nextHigher = list
        .filter((slab) => w < slab.minWeightKg)
        .sort((a, b) => a.minWeightKg - b.minWeightKg)[0];
    if (nextHigher) {
        return nextHigher;
    }

    return list[list.length - 1] ?? FALLBACK_SLABS[FALLBACK_SLABS.length - 1];
}
