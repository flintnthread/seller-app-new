import { resolveApiBaseUrl } from "@/lib/api/config";
import {
    ensureAccessToken,
    getSellerId,
    setSellerSession,
    touchSessionActivity,
} from "@/lib/api/sellerSession";
import { ApiError } from "@/lib/api/client";

let lastRefreshAt = 0;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Keeps JWT alive while the seller is actively using the app. */
export async function refreshSessionIfActive(): Promise<void> {
    touchSessionActivity();
    const token = ensureAccessToken();
    const sellerId = getSellerId();
    if (!token || !sellerId) return;

    const now = Date.now();
    if (now - lastRefreshAt < REFRESH_INTERVAL_MS) return;

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
        if (!res.ok) return;
        const body = (await res.json()) as { accessToken?: string; expiresIn?: number };
        if (body.accessToken?.trim()) {
            await setSellerSession(sellerId, body.accessToken.trim(), body.expiresIn);
            lastRefreshAt = now;
        }
    } catch {
        // ignore — next API call will surface auth errors
    }
}

export function handleAuthFailure(error: unknown): boolean {
    return error instanceof ApiError && error.status === 401;
}
