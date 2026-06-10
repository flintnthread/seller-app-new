import { resolveApiBaseUrl } from "@/lib/api/config";
import {
    ensureAccessToken,
    getSellerId,
    setSellerSession,
    touchSessionActivity,
} from "@/lib/api/sellerSession";

let lastRefreshAt = 0;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Refresh JWT; returns true when a new token was stored. */
export async function tryRefreshSession(force = false): Promise<boolean> {
    touchSessionActivity();
    const token = ensureAccessToken();
    const sellerId = getSellerId();
    if (!token || !sellerId) return false;

    const now = Date.now();
    if (!force && now - lastRefreshAt < REFRESH_INTERVAL_MS) return false;

    const baseUrl = resolveApiBaseUrl();
    try {
        const res = await fetch(`${baseUrl}/api/auth/refresh`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                "X-Seller-Id": String(sellerId),
            },
        });
        if (!res.ok) return false;
        const body = (await res.json()) as { accessToken?: string; expiresIn?: number };
        if (!body.accessToken?.trim()) return false;
        await setSellerSession(sellerId, body.accessToken.trim(), body.expiresIn);
        lastRefreshAt = now;
        return true;
    } catch {
        return false;
    }
}

/** Keeps JWT alive while the seller is actively using the app. */
export async function refreshSessionIfActive(): Promise<void> {
    await tryRefreshSession(false);
}
