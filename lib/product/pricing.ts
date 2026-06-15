export function calcDiscountPercent(
    mrpRaw: string | number | undefined | null,
    sellingPriceRaw: string | number | undefined | null,
): string {
    const mrp = parseFloat(String(mrpRaw ?? "")) || 0;
    const sellingPrice = parseFloat(String(sellingPriceRaw ?? "")) || 0;

    if (mrp <= 0 || sellingPrice <= 0) return "0";
    if (sellingPrice > mrp) return "0";

    return String(Math.round(((mrp - sellingPrice) / mrp) * 100));
}
