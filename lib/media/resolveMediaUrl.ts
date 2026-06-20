import { resolveApiBaseUrl } from "@/lib/api/config";

/** Turn API / CDN image paths into URLs the app can load (dev + prod). */
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

    const apiBase = resolveApiBaseUrl().replace(/\/$/, "");

    if (trimmed.startsWith("/")) {
        return `${apiBase}${trimmed}`;
    }
    if (trimmed.startsWith("uploads/")) {
        return `${apiBase}/${trimmed}`;
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        try {
            const parsed = new URL(trimmed);
            if (
                parsed.pathname.includes("/uploads/products/") ||
                parsed.pathname.includes("/uploads/sellers/") ||
                parsed.pathname.includes("/uploads/size_charts/")
            ) {
                return `${apiBase}${parsed.pathname}`;
            }
        } catch {
            return trimmed;
        }
        return trimmed;
    }

    return `${apiBase}/uploads/products/${trimmed}`;
}

export function resolveMediaUrls(urls: string[] | null | undefined): string[] {
    if (!urls?.length) return [];
    return urls
        .map((u) => resolveMediaUrl(u))
        .filter((u): u is string => Boolean(u && u.trim()));
}
