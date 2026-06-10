import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { hydrateSellerSession, getSellerId } from "@/lib/api/sellerSession";
import { fetchSellerProfile } from "@/services/sellerProfileApi";

let globalProfileCompleted = false;
let syncPromise: Promise<void> | null = null;

if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
        const saved = window.localStorage.getItem("isProfileCompleted");
        if (saved !== null) {
            globalProfileCompleted = saved === "true";
        }
    } catch {
        // ignore
    }
}

const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach((listener) => listener());
}

function persistProfileCompleted(val: boolean) {
    globalProfileCompleted = val;
    if (Platform.OS === "web" && typeof window !== "undefined") {
        try {
            window.localStorage.setItem("isProfileCompleted", String(val));
        } catch {
            // ignore
        }
    }
    notifyListeners();
}

export async function syncProfileStatusFromApi(): Promise<boolean | null> {
    await hydrateSellerSession();
    const sellerId = getSellerId();
    if (!sellerId) return null;

    try {
        const profile = await fetchSellerProfile();
        persistProfileCompleted(profile.profileCompleted);
        return profile.profileCompleted;
    } catch {
        return null;
    }
}

function ensureProfileSync(): Promise<void> {
    if (!syncPromise) {
        syncPromise = syncProfileStatusFromApi()
            .then(() => undefined)
            .finally(() => {
                syncPromise = null;
            });
    }
    return syncPromise;
}

/**
 * Centralized profile completion state synced from the seller profile API.
 */
export function useProfileStatus() {
    const [isProfileCompleted, setIsProfileCompletedState] = useState(globalProfileCompleted);
    const syncedRef = useRef(false);

    const setIsProfileCompleted = (val: boolean) => {
        persistProfileCompleted(val);
        setIsProfileCompletedState(val);
    };

    useEffect(() => {
        const handleUpdate = () => {
            setIsProfileCompletedState(globalProfileCompleted);
        };
        listeners.add(handleUpdate);
        return () => {
            listeners.delete(handleUpdate);
        };
    }, []);

    useEffect(() => {
        if (syncedRef.current) return;
        syncedRef.current = true;
        void ensureProfileSync();
    }, []);

    const refreshProfileStatus = async (): Promise<boolean | null> => {
        const result = await syncProfileStatusFromApi();
        if (result !== null) {
            setIsProfileCompletedState(result);
        }
        return result;
    };

    return {
        isProfileCompleted,
        setIsProfileCompleted,
        refreshProfileStatus,
    };
}
