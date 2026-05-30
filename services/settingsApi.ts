import { apiRequest } from "@/lib/api/client";

export type SellerSettings = {
    pushNotifications: boolean;
    orderUpdates: boolean;
    vacationMode: boolean;
    darkMode: boolean;
    biometricLogin: boolean;
};

export async function fetchSellerSettings(): Promise<SellerSettings> {
    return apiRequest<SellerSettings>("/api/seller/settings");
}

export async function updateSellerSettings(
    patch: Partial<SellerSettings>
): Promise<SellerSettings> {
    return apiRequest<SellerSettings>("/api/seller/settings", {
        method: "PUT",
        body: JSON.stringify(patch),
    });
}
