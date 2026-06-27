import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

/** Seller API ports — 8083 when all 3 backends run locally; 8080 when seller runs alone (prod). */
const API_PORTS = [8083, 8080];

type ExpoExtra = {
    apiBaseUrl?: string;
    devSellerId?: string;
    androidEmulatorApi?: boolean;
};

let cachedWorkingBaseUrl: string | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000;

function getExtra(): ExpoExtra {
    return (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
}

function isAndroidEmulator(): boolean {
    if (Platform.OS !== "android") return false;
    if (getExtra().androidEmulatorApi) return true;
    return Device.isDevice === false;
}

function isIosSimulator(): boolean {
    return Platform.OS === "ios" && Device.isDevice === false;
}

function hostFromUri(uri: string | undefined | null): string | null {
    if (!uri || typeof uri !== "string") return null;
    const trimmed = uri.trim();
    if (!trimmed) return null;
    try {
        const withScheme = trimmed.includes("://") ? trimmed : `http://${trimmed}`;
        const host = new URL(withScheme).hostname?.trim();
        if (!host || host === "localhost" || host === "127.0.0.1") return null;
        return host;
    } catch {
        const host = trimmed.split(":")[0]?.trim();
        if (!host || host === "localhost" || host === "127.0.0.1" || host === "http" || host === "https") {
            return null;
        }
        return host;
    }
}

/** PC LAN IP from Expo Metro / Expo Go — updates automatically when Wi‑Fi changes. */
export function getExpoDevLanHost(): string | null {
    const uris: (string | undefined | null)[] = [
        Constants.expoConfig?.hostUri,
        (Constants.expoGoConfig as { hostUri?: string } | null)?.hostUri,
        (Constants.expoConfig as { debuggerHost?: string } | null)?.debuggerHost,
        Constants.manifest2?.extra?.expoGo?.debuggerHost,
        Constants.manifest2?.extra?.expoClient?.hostUri,
        Constants.linkingUri,
    ];

    for (const uri of uris) {
        const host = hostFromUri(uri);
        if (host) return host;
    }
    return null;
}

function getWebLanHost(): string | null {
    if (Platform.OS !== "web" || typeof window === "undefined") return null;
    const host = window.location.hostname?.trim();
    if (!host || host === "localhost" || host === "127.0.0.1") return null;
    return host;
}

function buildUrl(host: string, port: number): string {
    return `http://${host}:${port}`;
}

function uniqueHosts(hosts: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const host of hosts) {
        const normalized = host.trim();
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        out.push(normalized);
    }
    return out;
}

function uniqueUrls(urls: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const url of urls) {
        const normalized = url.trim().replace(/\/$/, "");
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        out.push(normalized);
    }
    return out;
}

function pushHostPorts(candidates: string[], hosts: string[]): void {
    for (const host of uniqueHosts(hosts)) {
        for (const port of API_PORTS) {
            candidates.push(buildUrl(host, port));
        }
    }
}

/**
 * Candidate seller API base URLs (most likely first).
 * No ipconfig / .env IP needed — uses Expo Metro host on physical devices.
 */
export function getApiBaseUrlCandidates(): string[] {
    const manualOverride =
        getExtra().apiBaseUrl?.trim().replace(/\/$/, "") ||
        process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
    const candidates: string[] = [];
    const hosts: string[] = [];

    if (Platform.OS === "web") {
        const webOverride = process.env.EXPO_PUBLIC_API_WEB_BASE_URL?.trim().replace(/\/$/, "");
        if (webOverride) candidates.push(webOverride);

        const webLan = getWebLanHost();
        if (webLan) hosts.push(webLan);
        hosts.push("localhost", "127.0.0.1");
        pushHostPorts(candidates, hosts);

        const devHost = getExpoDevLanHost();
        if (devHost) pushHostPorts(candidates, [devHost]);

        if (manualOverride) candidates.push(manualOverride);
        return uniqueUrls(candidates);
    }

    const devHost = getExpoDevLanHost();
    if (devHost) hosts.push(devHost);

    if (Platform.OS === "android" && isAndroidEmulator()) {
        hosts.push("10.0.2.2");
    }

    if (isIosSimulator()) {
        hosts.push("localhost", "127.0.0.1");
    }

    hosts.push("localhost", "127.0.0.1");
    if (Platform.OS === "android") {
        hosts.push("10.0.2.2");
    }

    pushHostPorts(candidates, hosts);

    if (manualOverride) candidates.push(manualOverride);

    return uniqueUrls(candidates);
}

export function resolveApiBaseUrl(): string {
    if (cachedWorkingBaseUrl && Date.now() < cacheExpiresAt) {
        return cachedWorkingBaseUrl;
    }
    return getApiBaseUrlCandidates()[0] ?? buildUrl("localhost", 8080);
}

export function setWorkingApiBaseUrl(url: string): void {
    cachedWorkingBaseUrl = url.replace(/\/$/, "");
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
}

export function clearWorkingApiBaseUrl(): void {
    cachedWorkingBaseUrl = null;
    cacheExpiresAt = 0;
}

/** Probe /api/public/marketplace-stats and cache the first reachable base URL. */
export async function ensureApiReachable(): Promise<string> {
    if (cachedWorkingBaseUrl && Date.now() < cacheExpiresAt) {
        return cachedWorkingBaseUrl;
    }

    const candidates = getApiBaseUrlCandidates();
    let lastError: unknown = null;

    for (const baseUrl of candidates) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(`${baseUrl}/api/public/marketplace-stats`, {
                method: "GET",
                headers: { Accept: "application/json" },
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!res.ok) continue;

            const contentType = res.headers.get("content-type") ?? "";
            const raw = await res.text();
            if (!contentType.includes("application/json") && raw.trimStart().startsWith("<")) {
                continue;
            }

            try {
                const body = JSON.parse(raw) as { sellersCount?: number };
                if (typeof body?.sellersCount === "number") {
                    setWorkingApiBaseUrl(baseUrl);
                    return baseUrl;
                }
            } catch {
                continue;
            }
        } catch (error) {
            lastError = error;
        }
    }

    clearWorkingApiBaseUrl();
    if (lastError instanceof Error) throw lastError;
    throw new Error(
        "Seller API not reachable. Start backend: cd flintnthread-platform/seller-service && ..\\mvnw.cmd spring-boot:run"
    );
}

export function getDevSellerId(): number {
    const raw = process.env.EXPO_PUBLIC_DEV_SELLER_ID ?? getExtra().devSellerId ?? "1";
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : 1;
}

export const SELLER_ID_STORAGE_KEY = "sellerId";
export const AUTH_TOKEN_STORAGE_KEY = "sellerAccessToken";
export const SESSION_EXPIRES_AT_KEY = "sellerSessionExpiresAt";
export const SESSION_LAST_ACTIVE_KEY = "sellerSessionLastActive";

export function getApiDebugInfo(): {
    baseUrl: string;
    candidates: string[];
    platform: string;
    isEmulator: boolean;
    devHost: string | null;
} {
    return {
        baseUrl: resolveApiBaseUrl(),
        candidates: getApiBaseUrlCandidates(),
        platform: Platform.OS,
        isEmulator: Platform.OS === "android" && isAndroidEmulator(),
        devHost: getExpoDevLanHost(),
    };
}
