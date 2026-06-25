/** Display referral codes with the F&T brand prefix instead of legacy FT. */
export function formatReferralCodeDisplay(code: string | null | undefined): string {
    const trimmed = code?.trim();
    if (!trimmed) return "—";
    if (trimmed.startsWith("F&T")) return trimmed;
    if (trimmed.startsWith("FT")) return `F&T${trimmed.slice(2)}`;
    return trimmed;
}

/** Prefer seller_unique_id from API; fall back to legacy SEL prefix. */
export function formatSellerUniqueIdDisplay(
    sellerUniqueId: string | null | undefined,
    sellerId?: number | string | null
): string {
    const unique = sellerUniqueId?.trim();
    if (unique) return unique;
    if (sellerId != null && String(sellerId).trim()) return `SEL${sellerId}`;
    return "—";
}
