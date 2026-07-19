import {
    resolveApiBaseUrl,
    resolvePublicMediaBaseUrl,
    resolveSellerMediaBaseUrl,
    PRODUCTION_API_URL_IN,
} from "@/lib/api/config";

/** Seller profile + KYC docs — ONLY on flintnthread.com */
export const SELLER_MEDIA_CDN = "https://flintnthread.com";

/** Product images — ONLY on flintnthread.com */
export const PRODUCT_MEDIA_CDN = "https://flintnthread.com";

/** Matches CDN layout: https://flintnthread.com/uploads/seller_documents/12_aadhar_front_....png */
const SELLER_DOCUMENT_FILE =
    /^\d+_(profile_pic|aadhar_front|aadhar_back|pan_card|business_proof|bank_proof|cancelled_cheque|live_selfie|company_pan_doc|incorporation_certificate|partnership_deed|msme_certificate|iec_certificate)(_|\.)/i;

function isSellerDocumentFileName(fileName: string): boolean {
    const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
    return SELLER_DOCUMENT_FILE.test(base);
}

function sellerDocumentPath(fileName: string): string {
    const base = fileName.replace(/\\/g, "/").trim().split("/").pop() ?? "";
    return `/uploads/seller_documents/${base}`;
}

function isSellerUploadPath(path: string): boolean {
    return (
        path.includes("/uploads/sellers/") ||
        path.includes("/uploads/seller_documents/") ||
        path.includes("/uploads/kyc_images/")
    );
}

/** Normalize DB path to /uploads/... (seller docs → seller_documents). */
function normalizeMediaPath(value: string): string {
    const p = value.replace(/\\/g, "/").trim();
    if (!p) return "";
    if (p.startsWith("http://") || p.startsWith("https://")) {
        try {
            return normalizeMediaPath(new URL(p).pathname || "");
        } catch {
            return "";
        }
    }
    if (p.startsWith("/uploads/seller_documents/")) return p;
    if (p.startsWith("uploads/seller_documents/")) return `/${p}`;
    if (p.startsWith("/uploads/sellers/")) {
        const fileName = p.slice("/uploads/sellers/".length);
        if (isSellerDocumentFileName(fileName)) return sellerDocumentPath(fileName);
        return p;
    }
    if (p.startsWith("uploads/sellers/")) {
        const fileName = p.slice("uploads/sellers/".length);
        if (isSellerDocumentFileName(fileName)) return sellerDocumentPath(fileName);
        return `/${p}`;
    }
    if (p.startsWith("/uploads/")) return p;
    if (p.startsWith("uploads/")) return `/${p}`;
    // Seller KYC / profile: {sellerId}_{docType}_{timestamp}.ext
    if (!p.includes("/") && isSellerDocumentFileName(p)) {
        return sellerDocumentPath(p);
    }
    if (!p.includes("/") && /^\d+_/.test(p)) {
        return `/uploads/seller_documents/${p}`;
    }
    if (!p.includes("/")) return `/uploads/products/${p}`;
    return p.startsWith("/") ? p : `/${p}`;
}

function toSellerCdnUrl(path: string): string {
    const normalized = normalizeMediaPath(path);
    return `${SELLER_MEDIA_CDN}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
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

/** Cloudinary thumbnails for faster seller product lists. */
export function optimizeProductImageUrl(url: string, width = 420): string {
    const trimmed = String(url ?? "").trim();
    if (!trimmed || !/res\.cloudinary\.com/i.test(trimmed)) return trimmed;

    const match = trimmed.match(
        /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(.*)$/i
    );
    if (!match) return trimmed;

    const [, prefix, rest] = match;
    if (/^(w_|c_|q_|f_|h_|ar_|g_)/i.test(rest)) return trimmed;

    const transform = `w_${width},q_auto,f_auto`;
    return `${prefix}${transform}/${rest}`;
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
        if (/res\.cloudinary\.com/i.test(trimmed)) {
            return optimizeProductImageUrl(trimmed);
        }
        try {
            const parsed = new URL(trimmed);
            if (parsed.pathname.includes("/uploads/products/")) {
                // Product images live on flintnthread.com — never keep .in/.online upload hosts.
                return `${PRODUCT_MEDIA_CDN}${normalizeMediaPath(parsed.pathname)}`;
            }
            if (isSellerUploadPath(parsed.pathname) || parsed.pathname.includes("/uploads/seller_documents/") || parsed.pathname.includes("/uploads/")) {
                // Profile / KYC docs ONLY on flintnthread.com
                // e.g. https://flintnthread.com/uploads/seller_documents/1_aadhar_front_….jpg
                return toSellerCdnUrl(parsed.pathname);
            }
        } catch {
            return trimmed;
        }
        return trimmed;
    }

    const path = normalizeMediaPath(trimmed);
    if (!path) return null;

    if (path.includes("/uploads/products/")) {
        return `${PRODUCT_MEDIA_CDN}${path}`;
    }

    if (isSellerUploadPath(path)) {
        return toSellerCdnUrl(path);
    }

    // Local size-chart files may still be on seller-service in local-only mode
    if (path.includes("/uploads/size_charts/")) {
        try {
            const host = new URL(resolveSellerMediaBaseUrl()).hostname.toLowerCase();
            if (host === "localhost" || host === "127.0.0.1") {
                return `${resolveSellerMediaBaseUrl()}${path}`;
            }
        } catch {
            /* use CDN */
        }
        return `${SELLER_MEDIA_CDN}${path}`;
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
