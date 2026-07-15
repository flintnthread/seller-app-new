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

/** Reject blank / placeholder strings that would render as empty image slots. */
export function isUsableMediaUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (
        lower === "null" ||
        lower === "undefined" ||
        lower === "none" ||
        lower === "n/a" ||
        lower === "-" ||
        lower === "—"
    ) {
        return false;
    }
    // Folder-only paths with no file name
    if (/\/uploads\/(products|size_charts)?\/?$/i.test(trimmed)) return false;
    const fileName = trimmed.split("?")[0]?.split("/").pop()?.trim().toLowerCase() ?? "";
    if (
        !fileName ||
        fileName === "null" ||
        fileName === "undefined" ||
        fileName === "none" ||
        fileName === "n/a"
    ) {
        return false;
    }
    return true;
}

/** Turn API / CDN image paths into URLs the app can load. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
    if (!isUsableMediaUrl(url)) return null;

    const trimmed = url!.trim();
    if (
        trimmed.startsWith("data:") ||
        trimmed.startsWith("file://") ||
        trimmed.startsWith("blob:")
    ) {
        return trimmed;
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        // Cloudinary secure_url — never rewrite onto local seller host
        if (/res\.cloudinary\.com|cloudinary\.com/i.test(trimmed)) {
            return trimmed;
        }
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
        .filter((u): u is string => isUsableMediaUrl(u));
}
