import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { invalidateSellerProfileCache } from "@/lib/profile/profileCache";
import {
    AUTH_TOKEN_STORAGE_KEY,
    SESSION_EXPIRES_AT_KEY,
    SESSION_LAST_ACTIVE_KEY,
    SELLER_ID_STORAGE_KEY,
} from "./config";

let memorySellerId: number | null = null;
let memoryAccessToken: string | null = null;
let memoryExpiresAt: number | null = null;
let memoryLastActiveAt: number | null = null;
let hydratePromise: Promise<void> | null = null;

async function readStorage(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
        if (typeof window === "undefined") return null;
        try {
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    }
    try {
        return await AsyncStorage.getItem(key);
    } catch {
        return null;
    }
}

async function writeStorage(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(key, value);
        } catch {
            // ignore
        }
        return;
    }
    try {
        await AsyncStorage.setItem(key, value);
    } catch {
        // ignore
    }
}

async function removeStorage(key: string): Promise<void> {
    if (Platform.OS === "web") {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.removeItem(key);
        } catch {
            // ignore
        }
        return;
    }
    try {
        await AsyncStorage.removeItem(key);
    } catch {
        // ignore
    }
}

async function hydrateFromStorage(): Promise<void> {
    const rawId = await readStorage(SELLER_ID_STORAGE_KEY);
    if (rawId) {
        const id = Number(rawId);
        if (Number.isFinite(id) && id > 0) memorySellerId = id;
    }

    const rawToken = await readStorage(AUTH_TOKEN_STORAGE_KEY);
    if (rawToken?.trim()) {
        memoryAccessToken = rawToken.trim();
    }

    const rawExpires = await readStorage(SESSION_EXPIRES_AT_KEY);
    if (rawExpires) {
        const exp = Number(rawExpires);
        if (Number.isFinite(exp)) memoryExpiresAt = exp;
    }

    const rawActive = await readStorage(SESSION_LAST_ACTIVE_KEY);
    if (rawActive) {
        const active = Number(rawActive);
        if (Number.isFinite(active)) memoryLastActiveAt = active;
    } else {
        memoryLastActiveAt = Date.now();
    }
}

/** Clears the in-memory hydration cache so the next call re-reads storage (web client boot). */
export function invalidateSellerSessionHydration(): void {
    hydratePromise = null;
}

export function hydrateSellerSession(force = false): Promise<void> {
    // Expo web SSR has no window/localStorage — never cache an empty hydration from the server.
    if (Platform.OS === "web" && typeof window === "undefined") {
        return Promise.resolve();
    }
    if (force) {
        hydratePromise = null;
    }
    if (!hydratePromise) {
        hydratePromise = hydrateFromStorage();
    }
    return hydratePromise;
}

export function getSellerId(): number | null {
    return memorySellerId;
}

export function getAccessToken(): string | null {
    return memoryAccessToken;
}

export function touchSessionActivity(): void {
    memoryLastActiveAt = Date.now();
    void writeStorage(SESSION_LAST_ACTIVE_KEY, String(memoryLastActiveAt));
}

export async function setSellerSession(
    id: number,
    accessToken: string,
    expiresInSeconds?: number
): Promise<void> {
    invalidateSellerProfileCache();
    hydratePromise = null;
    memorySellerId = id;
    memoryAccessToken = accessToken.trim();
    const now = Date.now();
    memoryLastActiveAt = now;
    memoryExpiresAt =
        expiresInSeconds && expiresInSeconds > 0
            ? now + expiresInSeconds * 1000
            : now + 7 * 24 * 60 * 60 * 1000;

    await writeStorage(SELLER_ID_STORAGE_KEY, String(id));
    await writeStorage(AUTH_TOKEN_STORAGE_KEY, memoryAccessToken);
    await writeStorage(SESSION_EXPIRES_AT_KEY, String(memoryExpiresAt));
    await writeStorage(SESSION_LAST_ACTIVE_KEY, String(now));
}

/** @deprecated Use setSellerSession after login. */
export async function setSellerId(id: number): Promise<void> {
    memorySellerId = id;
    await writeStorage(SELLER_ID_STORAGE_KEY, String(id));
}

export async function clearSellerId(): Promise<void> {
    invalidateSellerProfileCache();
    hydratePromise = null;
    memorySellerId = null;
    memoryAccessToken = null;
    memoryExpiresAt = null;
    memoryLastActiveAt = null;
    hydratePromise = null;
    await removeStorage(SELLER_ID_STORAGE_KEY);
    await removeStorage(AUTH_TOKEN_STORAGE_KEY);
    await removeStorage(SESSION_EXPIRES_AT_KEY);
    await removeStorage(SESSION_LAST_ACTIVE_KEY);
}

export function ensureSellerId(): number | null {
    if (memorySellerId != null && memorySellerId > 0 && memoryAccessToken) {
        return memorySellerId;
    }
    return null;
}

export function ensureAccessToken(): string | null {
    if (memoryAccessToken?.trim()) {
        return memoryAccessToken.trim();
    }
    return null;
}
