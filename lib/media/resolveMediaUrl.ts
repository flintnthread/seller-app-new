import { resolveApiBaseUrl, resolvePublicMediaBaseUrl } from "@/lib/api/config";

/** Normalize DB path to /uploads/... */
function normalizeMediaPath(value: string): string {
    const p = value.replace(/\\/g, "/").trim();
    if (!p) return "";
    if (p.startsWith("http://") || p.startsWith("https://")) {
        try {
            return new URL(p).pathname || "";
        } catch {
            return "";
        }
    }
    if (p.startsWith("/uploads/")) return p;
    if (p.startsWith("uploads/")) return `/${p}`;
    if (!p.includes("/")) return `/uploads/products/${p}`;
    return p.startsWith("/") ? p : `/${p}`;
}

/** Turn API / CDN image paths into URLs the app can load. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
    if (!url || !url.trim()) return null;

    const trimmed = url.trim();
    if (
        trimmed.startsWith("data:") ||
        trimmed.startsWith("file://") ||
        trimmed.startsWith("blob:")
    ) {
        return trimmed;
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        try {
            const parsed = new URL(trimmed);
            if (parsed.pathname.includes("/uploads/")) {
                return `${resolvePublicMediaBaseUrl()}${parsed.pathname}`;
            }
        } catch {
            return trimmed;
        }
        return trimmed;
    }

    const path = normalizeMediaPath(trimmed);
    if (!path) return null;

    // Relative uploads → CDN (flintnthread.in); API domain as fallback for support uploads
    if (path.includes("/uploads/support/")) {
        return `${resolveApiBaseUrl()}${path}`;
    }
    return `${resolvePublicMediaBaseUrl()}${path}`;
}

export function resolveMediaUrls(urls: string[] | null | undefined): string[] {
    if (!urls?.length) return [];
    return urls
        .map((u) => resolveMediaUrl(u))
        .filter((u): u is string => Boolean(u && u.trim()));
}
