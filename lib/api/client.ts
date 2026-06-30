import { Platform } from "react-native";
import { sanitizeAuthErrorMessage } from "./apiErrors";
import {
    clearWorkingApiBaseUrl,
    ensureApiReachable,
    resolveApiBaseUrl,
} from "./config";
import { ensureAccessToken, ensureSellerId, touchSessionActivity } from "./sellerSession";
import { legacySellerApiPath } from "./sellerPaths";
import { refreshSessionIfActive, tryRefreshSession } from "./sessionRefresh";

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status?: number
    ) {
        super(message);
        this.name = "ApiError";
    }
}

function authHeaders(sellerId: number, accessToken: string, extra?: HeadersInit): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Seller-Id": String(sellerId),
        ...(extra as Record<string, string> | undefined),
    };
}

async function fetchAuthed(
    url: string,
    sellerId: number,
    accessToken: string,
    init?: RequestInit
): Promise<Response> {
    let res = await fetch(url, {
        ...init,
        headers: authHeaders(sellerId, accessToken, init?.headers),
    });

    if (res.status === 401) {
        const refreshed = await tryRefreshSession(true);
        const retryToken = ensureAccessToken();
        if (refreshed && retryToken) {
            res = await fetch(url, {
                ...init,
                headers: authHeaders(sellerId, retryToken, init?.headers),
            });
        }
    }

    return res;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const sellerId = ensureSellerId();
    const accessToken = ensureAccessToken();
    if (!sellerId || !accessToken) {
        throw new ApiError(sanitizeAuthErrorMessage("Seller not logged in.", 401), 401);
    }

    touchSessionActivity();

    await ensureApiReachable();
    const baseUrl = resolveApiBaseUrl();

    async function runRequest(requestPath: string): Promise<Response> {
        const url = `${baseUrl}${requestPath.startsWith("/") ? requestPath : `/${requestPath}`}`;
        try {
            return await fetchAuthed(url, sellerId!, accessToken!, init);
        } catch {
            clearWorkingApiBaseUrl();
            const emulatorHint =
                Platform.OS === "android"
                    ? "\n• Android emulator: set EXPO_PUBLIC_API_ANDROID_EMULATOR=true in .env"
                    : "";
            const phoneHint =
                Platform.OS !== "web"
                    ? "\n• Phone and PC must be on the same Wi‑Fi (API host is detected from Expo automatically)."
                    : "";
            throw new ApiError(
                `Cannot reach seller API at ${resolveApiBaseUrl()}.${phoneHint}${emulatorHint}\n• Check https://flintnthread.online/api/public/marketplace-stats on VPS.`
            );
        }
    }

    let res = await runRequest(path);
    if (res.status === 404) {
        const legacyPath = legacySellerApiPath(path);
        if (legacyPath) {
            res = await runRequest(legacyPath);
        }
    }

    if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
            const body = await res.json();
            if (body?.message) message = body.message;
        } catch {
            // ignore
        }
        if (res.status === 404 && path.startsWith("/api/seller/")) {
            message =
                "Seller API not found (404). On VPS: rebuild seller-service, restart port 8083, run apply-nginx-flintnthread-online.sh, reload nginx.";
        }
        throw new ApiError(sanitizeAuthErrorMessage(message, res.status), res.status);
    }

    if (res.status === 204) {
        void refreshSessionIfActive();
        return undefined as T;
    }

    void refreshSessionIfActive();
    return res.json() as Promise<T>;
}
