import { ApiError } from "@/lib/api/client";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import { tryRefreshSession } from "@/lib/api/sessionRefresh";

/** Retry once after JWT refresh on 401. */
export async function withSellerAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
            const refreshed = await tryRefreshSession(true);
            await hydrateSellerSession(true);
            if (refreshed && ensureSellerId()) {
                return await fn();
            }
        }
        throw e;
    }
}

export function sellerApiErrorMessage(e: unknown, fallback: string): string {
    if (e instanceof ApiError) {
        if (e.status === 401) {
            return "Session expired. Please log in again.";
        }
        if (e.status === 403) {
            return "Dashboard/orders blocked on server (nginx 403). On VPS add: include snippets/flintnthread-api.conf; then sudo nginx -t && sudo systemctl reload nginx";
        }
        if (e.status === 404) {
            return "Seller API route not found. Rebuild and restart seller-service on VPS (port 8083), then reload nginx.";
        }
        if (e.status === 502) {
            return e.message;
        }
        return e.message || fallback;
    }
    return e instanceof Error ? e.message : fallback;
}
