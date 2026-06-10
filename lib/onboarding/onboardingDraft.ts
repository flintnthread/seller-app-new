import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const BUSINESS_DRAFT_KEY = "onboarding_business_draft";

export type BusinessOnboardingDraft = {
    businessCategory?: string;
    businessName?: string;
    businessType?: string;
    hasGST?: boolean;
    gstType?: string;
    gstNumber?: string;
    gstVerified?: boolean;
    panNumber?: string;
    aadhaarNumber?: string;
};

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

export async function loadBusinessOnboardingDraft(): Promise<BusinessOnboardingDraft | null> {
    const raw = await readStorage(BUSINESS_DRAFT_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as BusinessOnboardingDraft;
    } catch {
        return null;
    }
}

export async function saveBusinessOnboardingDraft(draft: BusinessOnboardingDraft): Promise<void> {
    await writeStorage(BUSINESS_DRAFT_KEY, JSON.stringify(draft));
}

export async function clearBusinessOnboardingDraft(): Promise<void> {
    await removeStorage(BUSINESS_DRAFT_KEY);
}
