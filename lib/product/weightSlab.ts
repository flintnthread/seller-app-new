const WEIGHT_SLABS = [
    { max: 1, label: "0–1 kg" },
    { max: 2, label: "1–2 kg" },
    { max: 5, label: "2–5 kg" },
    { max: 10, label: "5–10 kg" },
    { max: Number.POSITIVE_INFINITY, label: "10+ kg" },
] as const;

export function weightToSlabLabel(weightRaw: string | number | undefined | null): string {
    const w = parseFloat(String(weightRaw ?? "").trim());
    if (!Number.isFinite(w) || w <= 0) return "";

    for (const slab of WEIGHT_SLABS) {
        if (w <= slab.max) return slab.label;
    }
    return WEIGHT_SLABS[WEIGHT_SLABS.length - 1].label;
}
