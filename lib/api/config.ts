import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

/** Production seller API — nginx on either domain routes seller paths → 8083 */
export const PRODUCTION_API_URL = "https://flintnthread.online";
export const PRODUCTION_API_URL_IN = "https://flintnthread.in";
export const PRODUCTION_API_URLS = [PRODUCTION_API_URL, PRODUCTION_API_URL_IN] as const;

/** Seller API ports — local dev only */
const API_PORTS = [8083, 8080];

type ExpoExtra = {
    apiBaseUrl?: string;
    mediaBaseUrl?: string;
    devSellerId?: string;
    androidEmulatorApi?: boolean;
};

/** CDN for /uploads/... (production: https://flintnthread.in) */
export const PRODUCTION_MEDIA_URL = "https://flintnthread.in";

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

/** Prefer the production domain that matches the browser host (.in vs .online). */
function preferProductionUrlForHost(urls: string[]): string[] {
    if (Platform.OS !== "web" || typeof window === "undefined") return urls;
    const host = window.location.hostname?.toLowerCase() ?? "";
    if (!host) return urls;
    const preferIn = host === "flintnthread.in" || host.endsWith(".flintnthread.in");
    const preferOnline =
        host === "flintnthread.online" || host.endsWith(".flintnthread.online");
    if (!preferIn && !preferOnline) return urls;
    return [...urls].sort((a, b) => {
        const aIn = a.includes("flintnthread.in");
        const bIn = b.includes("flintnthread.in");
        if (preferIn) return Number(bIn) - Number(aIn);
        return Number(!bIn) - Number(!aIn);
    });
}

function getConfiguredProductionApiUrl(): string | null {
    const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
    const fromExtra = getExtra().apiBaseUrl?.trim().replace(/\/$/, "");
    return fromEnv || fromExtra || null;
}

function getProductionApiUrl(): string {
    return getConfiguredProductionApiUrl() || getProductionApiUrlCandidates()[0] || PRODUCTION_API_URL;
}

/** Ordered production API bases: preferred host first, then the other domain. */
export function getProductionApiUrlCandidates(): string[] {
    const configured = getConfiguredProductionApiUrl();
    const defaults = preferProductionUrlForHost([...PRODUCTION_API_URLS]);
    if (!configured) return uniqueUrls(defaults);
    // Explicit env/extra stays first; still keep the other production domain as fallback.
    return uniqueUrls([configured, ...defaults]);
}

export function resolvePublicMediaBaseUrl(): string {
    const fromEnv = process.env.EXPO_PUBLIC_MEDIA_BASE_URL?.trim().replace(/\/$/, "");
    const fromExtra = getExtra().mediaBaseUrl?.trim().replace(/\/$/, "");
    return fromEnv || fromExtra || PRODUCTION_MEDIA_URL;
}

function useLocalApiFallbacks(): boolean {
    return process.env.EXPO_PUBLIC_API_USE_LOCAL === "true";
}

/** Web app opened at localhost / 127.0.0.1 (Expo web dev). */
export function isLocalWebDev(): boolean {
    return (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    );
}

/** Local seller-service URL for web dev (port 8083). */
export function resolveLocalSellerApiUrl(): string {
    const webOverride = process.env.EXPO_PUBLIC_API_WEB_BASE_URL?.trim().replace(/\/$/, "");
    if (webOverride) return webOverride;
    const host =
        typeof window !== "undefined" && window.location.hostname
            ? window.location.hostname
            : "localhost";
    return `http://${host}:8083`;
}

/**
 * Base URL for seller KYC / profile images.
 * - Legacy uploads: app.media.public-base-url + /uploads/seller_documents/...
 * - Local API dev: same host as seller-service (:8083)
 * - Cloudinary URLs: returned as-is by resolveMediaUrl
 */
export function resolveSellerMediaBaseUrl(): string {
    const publicMedia = resolvePublicMediaBaseUrl();

    if (useLocalApiFallbacks()) {
        if (cachedWorkingBaseUrl && Date.now() < cacheExpiresAt) {
            return cachedWorkingBaseUrl;
        }
        return resolveLocalSellerApiUrl();
    }

    if (isLocalWebDev()) {
        const apiBase = resolveApiBaseUrl().replace(/\/$/, "");
        try {
            const host = new URL(apiBase).hostname.toLowerCase();
            const isLocalApi =
                host === "localhost" ||
                host === "127.0.0.1" ||
                host.startsWith("192.168.") ||
                host.startsWith("10.");
            if (isLocalApi) {
                return apiBase;
            }
        } catch {
            /* fall through to CDN */
        }
        // Expo web on localhost but production API — legacy photos live on CDN (flintnthread.in).
        return publicMedia;
    }

    return publicMedia;
}

/**
 * Candidate seller API base URLs (most likely first).
 * On localhost web, local seller-service (:8083) is tried before production.
 */
export function getApiBaseUrlCandidates(): string[] {
    const productionUrls = getProductionApiUrlCandidates();
    const candidates: string[] = [];

    if (useLocalApiFallbacks() || isLocalWebDev()) {
        const manualOverride =
            getExtra().apiBaseUrl?.trim().replace(/\/$/, "") ||
            process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
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
        } else {
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
        }

        if (manualOverride && !isLocalWebDev()) {
            candidates.push(manualOverride);
        }
        candidates.push(...productionUrls);
        return uniqueUrls(candidates);
    }

    // Production web on flintnthread.* (including seller/admin subdomains) → same-origin API first.
    if (Platform.OS === "web" && typeof window !== "undefined") {
        const host = window.location.hostname?.toLowerCase() ?? "";
        if (
            host === "flintnthread.online" ||
            host.endsWith(".flintnthread.online") ||
            host === "flintnthread.in" ||
            host.endsWith(".flintnthread.in")
        ) {
            candidates.push(window.location.origin.replace(/\/$/, ""));
        }
    }

    candidates.push(...productionUrls);
    return uniqueUrls(candidates);
}

export function resolveApiBaseUrl(): string {
    if (cachedWorkingBaseUrl && Date.now() < cacheExpiresAt) {
        return cachedWorkingBaseUrl;
    }
    return getApiBaseUrlCandidates()[0] ?? PRODUCTION_API_URL;
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
                    // On seller/admin subdomains, keep same-origin once it works.
                    if (
                        Platform.OS === "web" &&
                        typeof window !== "undefined" &&
                        baseUrl === window.location.origin.replace(/\/$/, "")
                    ) {
                        setWorkingApiBaseUrl(baseUrl);
                        cacheExpiresAt = Date.now() + 30 * 60_000;
                        return baseUrl;
                    }
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
        `Seller API not reachable at ${PRODUCTION_API_URLS.join(" or ")}. Check VPS nginx seller routes and flint-seller service.`
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
    productionUrl: string;
    localFallbacks: boolean;
} {
    return {
        baseUrl: resolveApiBaseUrl(),
        candidates: getApiBaseUrlCandidates(),
        platform: Platform.OS,
        isEmulator: Platform.OS === "android" && isAndroidEmulator(),
        devHost: getExpoDevLanHost(),
        productionUrl: getProductionApiUrl(),
        localFallbacks: useLocalApiFallbacks(),
    };
}
