import { apiRequest } from "@/lib/api/client";

export type SellerSettings = {
    pushNotifications: boolean;
    orderUpdates: boolean;
    payoutAlerts: boolean;
    vacationMode: boolean;
    darkMode: boolean;
    language: string;
    biometricLogin: boolean;
};

const DEFAULT_SETTINGS: SellerSettings = {
    pushNotifications: true,
    orderUpdates: true,
    payoutAlerts: true,
    vacationMode: false,
    darkMode: false,
    language: "en-IN",
    biometricLogin: false,
};

function normalizeSettings(raw: Partial<SellerSettings> | null | undefined): SellerSettings {
    return {
        pushNotifications: raw?.pushNotifications ?? DEFAULT_SETTINGS.pushNotifications,
        orderUpdates: raw?.orderUpdates ?? DEFAULT_SETTINGS.orderUpdates,
        payoutAlerts: raw?.payoutAlerts ?? DEFAULT_SETTINGS.payoutAlerts,
        vacationMode: raw?.vacationMode ?? DEFAULT_SETTINGS.vacationMode,
        darkMode: raw?.darkMode ?? DEFAULT_SETTINGS.darkMode,
        language: raw?.language?.trim() || DEFAULT_SETTINGS.language,
        biometricLogin: raw?.biometricLogin ?? DEFAULT_SETTINGS.biometricLogin,
    };
}

export async function fetchSellerSettings(): Promise<SellerSettings> {
    const raw = await apiRequest<Partial<SellerSettings>>("/api/seller/settings");
    return normalizeSettings(raw);
}

export async function updateSellerSettings(
    patch: Partial<SellerSettings>
): Promise<SellerSettings> {
    const raw = await apiRequest<Partial<SellerSettings>>("/api/seller/settings", {
        method: "PUT",
        body: JSON.stringify(patch),
    });
    return normalizeSettings(raw);
}

export { DEFAULT_SETTINGS };

export async function deactivateSellerAccount(): Promise<{ message: string }> {
    return apiRequest<{ message: string }>("/api/seller/settings/account/deactivate", {
        method: "POST",
    });
}
