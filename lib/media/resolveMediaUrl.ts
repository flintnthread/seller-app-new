import {
    resolveApiBaseUrl,
    resolvePublicMediaBaseUrl,
    resolveSellerMediaBaseUrl,
} from "@/lib/api/config";

function isSellerUploadPath(path: string): boolean {
    return (
        path.includes("/uploads/sellers/") ||
        path.includes("/uploads/seller_documents/") ||
        path.includes("/uploads/kyc_images/")
    );
}

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
    // Seller files: {sellerId}_{docType}_{timestamp}.ext
    if (!p.includes("/") && /^\d+_/.test(p)) {
        return `/uploads/sellers/${p}`;
    }
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
                if (
                    isSellerUploadPath(parsed.pathname) ||
                    parsed.pathname.includes("/uploads/products/") ||
                    parsed.pathname.includes("/uploads/size_charts/")
                ) {
                    return `${resolveSellerMediaBaseUrl()}${parsed.pathname}`;
                }
                return `${resolvePublicMediaBaseUrl()}${parsed.pathname}`;
            }
        } catch {
            return trimmed;
        }
        return trimmed;
    }

    const path = normalizeMediaPath(trimmed);
    if (!path) return null;

    if (isSellerUploadPath(path)) {
        return `${resolveSellerMediaBaseUrl()}${path}`;
    }

    // Product / size-chart images live on seller-service disk
    if (path.includes("/uploads/products/") || path.includes("/uploads/size_charts/")) {
        return `${resolveSellerMediaBaseUrl()}${path}`;
    }

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
