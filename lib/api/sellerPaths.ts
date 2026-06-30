/** Legacy path for VPS still running pre-prefix seller JAR (migration fallback). */
export function legacySellerApiPath(path: string): string | null {
    if (!path.startsWith("/api/seller/")) {
        return null;
    }
    const suffix = path.slice("/api/seller/".length);
    // Already unique — no legacy alias on user service
    if (
        suffix.startsWith("profile") ||
        suffix.startsWith("settings") ||
        suffix.startsWith("support")
    ) {
        return null;
    }
    if (suffix.startsWith("gst/") || suffix.startsWith("gst?")) {
        return `/api/seller-gst/${suffix.slice(4)}`;
    }
    if (suffix === "gst" || suffix.startsWith("gst")) {
        return path.replace("/api/seller/gst", "/api/seller-gst");
    }
    return `/api/${suffix}`;
}
