/** e.g. 523 → "500+", 12500 → "12K+", 1500000 → "1M+" */
export function formatMarketplaceCount(count: number): string {
    if (!Number.isFinite(count) || count <= 0) return "0";
    if (count >= 1_000_000) {
        return `${Math.floor(count / 1_000_000)}M+`;
    }
    if (count >= 10_000) {
        return `${Math.floor(count / 1_000)}K+`;
    }
    if (count >= 1_000) {
        const thousands = count / 1_000;
        const formatted =
            thousands % 1 === 0
                ? String(thousands)
                : thousands.toFixed(1).replace(/\.0$/, "");
        return `${formatted}K+`;
    }
    if (count >= 100) {
        return `${Math.floor(count / 100) * 100}+`;
    }
    return `${count}+`;
}

export function formatApprovalHours(hours: number): string {
    if (!Number.isFinite(hours) || hours <= 0) return "48hr";
    return `${Math.round(hours)}hr`;
}
