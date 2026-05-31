import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

const API_PORT = 8080;

type ExpoExtra = {
    apiBaseUrl?: string;
    devSellerId?: string;
    androidEmulatorApi?: boolean;
};

function getExtra(): ExpoExtra {
    return (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
}

function isAndroidEmulator(): boolean {
    if (Platform.OS !== "android") return false;
    if (getExtra().androidEmulatorApi) return true;
    return Device.isDevice === false;
}

/**
 * API base URL (no trailing slash).
 * Physical device: always use .env value from app.config extra (never guess from Metro).
 */
export function resolveApiBaseUrl(): string {
    const fromExtra = getExtra().apiBaseUrl?.trim().replace(/\/$/, "");
    const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
    const configured = fromExtra || fromEnv;

    if (Platform.OS === "web") {
        const webOverride = process.env.EXPO_PUBLIC_API_WEB_BASE_URL?.trim().replace(/\/$/, "");
        if (webOverride) return webOverride;
        return "http://localhost:8080";
    }

    if (Platform.OS === "android" && isAndroidEmulator()) {
        return "http://10.0.2.2:8080";
    }

    if (configured) {
        return configured;
    }

    if (Platform.OS === "android") {
        return "http://10.0.2.2:8080";
    }

    return `http://localhost:${API_PORT}`;
}

export function getDevSellerId(): number {
    const raw =
        process.env.EXPO_PUBLIC_DEV_SELLER_ID ?? getExtra().devSellerId ?? "1";
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : 1;
}

export const SELLER_ID_STORAGE_KEY = "sellerId";
export const AUTH_TOKEN_STORAGE_KEY = "sellerAccessToken";
export const SESSION_EXPIRES_AT_KEY = "sellerSessionExpiresAt";
export const SESSION_LAST_ACTIVE_KEY = "sellerSessionLastActive";

export function getApiDebugInfo(): { baseUrl: string; platform: string; isEmulator: boolean } {
    return {
        baseUrl: resolveApiBaseUrl(),
        platform: Platform.OS,
        isEmulator: Platform.OS === "android" && isAndroidEmulator(),
    };
}
