import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { SELLER_ID_STORAGE_KEY } from "./config";

let memorySellerId: number | null = null;
let hydratePromise: Promise<void> | null = null;

async function hydrateFromStorage(): Promise<void> {
    if (Platform.OS === "web") {
        if (typeof window === "undefined") return;
        try {
            const raw = window.localStorage.getItem(SELLER_ID_STORAGE_KEY);
            if (!raw) return;
            const id = Number(raw);
            if (Number.isFinite(id) && id > 0) memorySellerId = id;
        } catch {
            // ignore
        }
        return;
    }

    try {
        const raw = await AsyncStorage.getItem(SELLER_ID_STORAGE_KEY);
        if (!raw) return;
        const id = Number(raw);
        if (Number.isFinite(id) && id > 0) memorySellerId = id;
    } catch {
        // ignore
    }
}

export function hydrateSellerSession(): Promise<void> {
    if (!hydratePromise) {
        hydratePromise = hydrateFromStorage();
    }
    return hydratePromise;
}

export function getSellerId(): number | null {
    return memorySellerId;
}

export async function setSellerId(id: number): Promise<void> {
    memorySellerId = id;
    const value = String(id);

    if (Platform.OS === "web" && typeof window !== "undefined") {
        try {
            window.localStorage.setItem(SELLER_ID_STORAGE_KEY, value);
        } catch {
            // ignore
        }
        return;
    }

    try {
        await AsyncStorage.setItem(SELLER_ID_STORAGE_KEY, value);
    } catch {
        // ignore
    }
}

export async function clearSellerId(): Promise<void> {
    memorySellerId = null;

    if (Platform.OS === "web" && typeof window !== "undefined") {
        try {
            window.localStorage.removeItem(SELLER_ID_STORAGE_KEY);
        } catch {
            // ignore
        }
        return;
    }

    try {
        await AsyncStorage.removeItem(SELLER_ID_STORAGE_KEY);
    } catch {
        // ignore
    }
}

/** Returns logged-in seller id, or null if not authenticated. */
export function ensureSellerId(): number | null {
    if (memorySellerId != null && memorySellerId > 0) {
        return memorySellerId;
    }
    return null;
}
