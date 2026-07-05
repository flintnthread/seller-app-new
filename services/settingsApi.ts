import { apiRequest } from "@/lib/api/client";
import { ensureAccessToken, ensureSellerId } from "@/lib/api/sellerSession";
import { resolveApiBaseUrl } from "@/lib/api/config";

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

export type SellerRegistrationInvoice = {
    id: number;
    invoiceNumber: string;
    displayOrderNumber?: string | null;
    paymentId?: string | null;
    amount: number;
    registrationFee?: number;
    gstAmount?: number;
    totalAmount?: number;
    currency: string;
    paidAt?: string | null;
};

export async function fetchRegistrationInvoices(): Promise<SellerRegistrationInvoice[]> {
    return apiRequest<SellerRegistrationInvoice[]>("/api/seller/settings/invoices");
}

export async function downloadRegistrationInvoice(
    invoiceId: number,
    fileName: string
): Promise<void> {
    const sellerId = ensureSellerId();
    const accessToken = ensureAccessToken();
    if (!sellerId || !accessToken) {
        throw new Error("Seller not logged in.");
    }
    const url = `${resolveApiBaseUrl()}/api/seller/settings/invoices/${invoiceId}/download`;
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Seller-Id": String(sellerId),
            Accept: "application/pdf",
        },
    });
    if (!res.ok) {
        throw new Error("Could not download invoice.");
    }
    const blob = await res.blob();
    if (typeof window !== "undefined" && window.document) {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
        return;
    }
    throw new Error("Invoice download is supported on web.");
}
