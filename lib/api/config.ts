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

/** Metro / Expo dev server host (e.g. 192.168.0.29:8081 → 192.168.0.29). */
function getMetroHost(): string | null {
    const raw =
        Constants.expoConfig?.hostUri ??
        Constants.expoGoConfig?.debuggerHost ??
        (Constants.manifest2 as { extra?: { expoClient?: { hostUri?: string } } } | null)?.extra
            ?.expoClient?.hostUri;

    if (!raw) return null;
    const host = raw.split(":")[0]?.trim();
    return host || null;
}

function isAndroidEmulator(): boolean {
    if (Platform.OS !== "android") return false;
    if (getExtra().androidEmulatorApi) return true;
    return Device.isDevice === false;
}

/**
 * API base URL (no trailing slash).
 * Priority: EXPO_PUBLIC_API_BASE_URL → platform defaults → Metro host.
 */
export function resolveApiBaseUrl(): string {
    const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
    const fromExtra = getExtra().apiBaseUrl?.trim().replace(/\/$/, "");
    const configured = fromEnv || fromExtra;

    // Web browser on the same PC must hit localhost — .env LAN IP is for phones only.
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

    const metroHost = getMetroHost();
    if (metroHost && metroHost !== "localhost" && metroHost !== "127.0.0.1") {
        return `http://${metroHost}:${API_PORT}`;
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

export function getApiDebugInfo(): { baseUrl: string; platform: string; isEmulator: boolean } {
    return {
        baseUrl: resolveApiBaseUrl(),
        platform: Platform.OS,
        isEmulator: Platform.OS === "android" && isAndroidEmulator(),
    };
}
