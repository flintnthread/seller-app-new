import { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";
import { sanitizeAuthErrorMessage } from "@/lib/api/apiErrors";
import { apiRequest, ApiError } from "@/lib/api/client";
import { apiUpload, appendFileToFormData, buildUploadPart } from "@/lib/api/multipart";
import { resolveApiBaseUrl } from "@/lib/api/config";
import { ensureAccessToken, ensureSellerId } from "@/lib/api/sellerSession";
import {
    getCachedSellerProfile,
    invalidateSellerProfileCache,
    saveSellerProfileCache,
} from "@/lib/profile/profileCache";

export type SellerAccountStatus = {
    status: string;
    approvalState: string;
    title: string;
    message: string;
    profileLabel: string;
    kycLabel: string;
    canManageProducts: boolean;
    canReceiveOrders: boolean;
    reviewEstimateHours?: number | null;
    rejectionReason?: string | null;
};

export type SellerProfileResponse = {
    sellerId: number;
    sellerUniqueId?: string | null;
    email: string;
    mobile: string;
    firstName: string;
    lastName: string;
    fullName: string;
    profileCompleted: boolean;
    kycCompleted: boolean;
    kycSubmittedAt?: string | null;
    accountStatus?: SellerAccountStatus | null;
    personal: { profilePicUrl?: string | null };
    business: {
        businessCategory?: string | null;
        businessName?: string | null;
        businessType?: string | null;
        address?: string | null;
        hasGst: boolean;
        gstType?: string | null;
        gstNumber?: string | null;
        panNumber?: string | null;
        aadhaarNumber?: string | null;
        aadhaarOnFile?: boolean;
        companyPan?: string | null;
    };
    address: {
        streetAddress?: string | null;
        landmark?: string | null;
        city?: string | null;
        state?: string | null;
        area?: string | null;
        country?: string | null;
        pincode?: string | null;
        warehouseDifferent: boolean;
        warehouseAddress?: string | null;
        warehouseLandmark?: string | null;
        warehouseCity?: string | null;
        warehouseState?: string | null;
        warehouseArea?: string | null;
        warehouseCountry?: string | null;
        warehousePincode?: string | null;
    };
    banking: {
        ifscCode?: string | null;
        bankName?: string | null;
        branchName?: string | null;
        accountHolderName?: string | null;
        accountNumberPresent: boolean;
    };
    documents: {
        files: Record<string, string>;
        liveSelfieUrl?: string | null;
    };
    steps: {
        personal: boolean;
        business: boolean;
        address: boolean;
        banking: boolean;
        documents: boolean;
    };
};

export type DocumentUploadResponse = {
    documentType: string;
    fileName: string;
    url: string;
};

export type ProfileSubmitResponse = {
    submitted: boolean;
    profileCompleted: boolean;
    message: string;
    errors: string[];
    accountStatus?: SellerAccountStatus | null;
};

export type RegistrationPaymentOrderResponse = {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    receipt: string;
    paid: boolean;
};

export type RegistrationPaymentStatusResponse = {
    paid: boolean;
    orderId?: string | null;
    paymentId?: string | null;
    paidAt?: string | null;
    amount: number;
    currency: string;
};

export type GstVerifyResponse = {
    verified?: boolean;
    isVerified?: boolean;
    gstNumber: string;
    message: string;
    businessName?: string | null;
    tradeName?: string | null;
    businessType?: string | null;
    panNumber?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    status?: string | null;
    taxpayerType?: string | null;
    registrationDate?: string | null;
    cancellationDate?: string | null;
    stateJurisdiction?: string | null;
    centreJurisdiction?: string | null;
    principalPlaceType?: string | null;
};

export type IfscLookupResponse = {
    ifscCode: string;
    bankName: string;
    branchName: string;
    found: boolean;
};

export type BusinessProfilePayload = {
    businessCategory: string;
    businessName: string;
    businessType: string;
    address: string;
    hasGst?: boolean;
    gstType?: string;
    gstNumber?: string;
    gstVerified?: boolean;
    panNumber: string;
    aadhaarNumber: string;
};

export type AddressProfilePayload = {
    streetAddress: string;
    landmark: string;
    city: string;
    state: string;
    area: string;
    country: string;
    pincode: string;
    warehouseDifferent?: boolean;
    warehouseAddress?: string;
    warehouseLandmark?: string;
    warehouseCity?: string;
    warehouseState?: string;
    warehouseArea?: string;
    warehouseCountry?: string;
    warehousePincode?: string;
};

export type BankingProfilePayload = {
    ifscCode: string;
    bankName?: string;
    branchName?: string;
    accountHolderName: string;
    accountNumber: string;
};

/** Document type keys sent as `type` query param (matches backend). */
export const SELLER_DOCUMENT_TYPES = {
    aadharFront: "aadhar_front",
    aadharBack: "aadhar_back",
    panCard: "pan_card",
    businessProof: "business_proof",
    bankAccountProof: "bank_proof",
    cancelledCheque: "cancelled_cheque",
    liveSelfie: "live_selfie",
    companyPanDocument: "company_pan_doc",
    certificateOfIncorporation: "incorporation_certificate",
    partnershipDeed: "partnership_deed",
    msmeUdyamCertificate: "msme_certificate",
    iecCertificate: "iec_certificate",
} as const;

export type SellerDocumentField = keyof typeof SELLER_DOCUMENT_TYPES;

export function toApiBusinessCategory(ui: string): string {
    return ui.trim().toLowerCase();
}

export function toUiBusinessCategory(api?: string | null): string {
    if (!api) return "";
    return api.toUpperCase();
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
    if (error instanceof ApiError) {
        return sanitizeAuthErrorMessage(error.message, error.status);
    }
    if (error instanceof Error && error.message) {
        return sanitizeAuthErrorMessage(error.message);
    }
    return fallback;
}

export { invalidateSellerProfileCache } from "@/lib/profile/profileCache";

function saveProfileCache(profile: SellerProfileResponse): SellerProfileResponse {
    return saveSellerProfileCache(profile);
}

function assertProfileMatchesSession(profile: SellerProfileResponse, sellerId: number): void {
    if (profile.sellerId !== sellerId) {
        invalidateSellerProfileCache();
        throw new ApiError(sanitizeAuthErrorMessage("Profile data mismatch.", 403), 403);
    }
}

export async function fetchSellerProfile(force = false): Promise<SellerProfileResponse> {
    const sellerId = ensureSellerId();
    if (!sellerId) {
        throw new ApiError(sanitizeAuthErrorMessage("Seller not logged in.", 401), 401);
    }

    if (!force) {
        const cached = getCachedSellerProfile(sellerId);
        if (cached) return cached;
    }

    const profile = await apiRequest<SellerProfileResponse>("/api/seller/profile");
    assertProfileMatchesSession(profile, sellerId);
    return saveProfileCache(profile);
}

export async function uploadProfilePhoto(localUri: string): Promise<SellerProfileResponse> {
    const sellerId = ensureSellerId();
    if (!sellerId) {
        throw new ApiError(sanitizeAuthErrorMessage("Seller not logged in.", 401), 401);
    }
    const part = await buildUploadPart(localUri, { name: guessProfilePhotoName(localUri) });
    const formData = new FormData();
    appendFileToFormData(formData, "file", part);
    const updated = await apiUpload<SellerProfileResponse>("/api/seller/profile/personal/photo", formData);
    assertProfileMatchesSession(updated, sellerId);
    return saveProfileCache(updated);
}

function guessProfilePhotoName(uri: string): string {
    if (uri.includes(".png")) return "profile.png";
    if (uri.includes(".webp")) return "profile.webp";
    return "profile.jpg";
}

export async function updateBusinessProfile(payload: BusinessProfilePayload): Promise<SellerProfileResponse> {
    const sellerId = ensureSellerId();
    const updated = await apiRequest<SellerProfileResponse>("/api/seller/profile/business", {
        method: "PUT",
        body: JSON.stringify({
            ...payload,
            businessCategory: toApiBusinessCategory(payload.businessCategory),
        }),
    });
    if (sellerId) {
        assertProfileMatchesSession(updated, sellerId);
        return saveProfileCache(updated);
    }
    return updated;
}

export async function updateAddressProfile(payload: AddressProfilePayload): Promise<SellerProfileResponse> {
    const sellerId = ensureSellerId();
    const updated = await apiRequest<SellerProfileResponse>("/api/seller/profile/address", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    if (sellerId) {
        assertProfileMatchesSession(updated, sellerId);
        return saveProfileCache(updated);
    }
    return updated;
}

export async function updateBankingProfile(payload: BankingProfilePayload): Promise<SellerProfileResponse> {
    const sellerId = ensureSellerId();
    const updated = await apiRequest<SellerProfileResponse>("/api/seller/profile/banking", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    if (sellerId) {
        assertProfileMatchesSession(updated, sellerId);
        return saveProfileCache(updated);
    }
    return updated;
}

export async function updateCompanyPan(companyPanNumber: string): Promise<SellerProfileResponse> {
    const sellerId = ensureSellerId();
    const updated = await apiRequest<SellerProfileResponse>("/api/seller/profile/company-pan", {
        method: "PUT",
        body: JSON.stringify({ companyPanNumber }),
    });
    if (sellerId) {
        assertProfileMatchesSession(updated, sellerId);
        return saveProfileCache(updated);
    }
    return updated;
}

export async function uploadSellerDocument(
    documentField: SellerDocumentField,
    localUri: string,
    fileName?: string
): Promise<DocumentUploadResponse> {
    const part = await buildUploadPart(localUri, fileName ? { name: fileName } : {});
    const formData = new FormData();
    appendFileToFormData(formData, "file", part);
    return apiUpload<DocumentUploadResponse>("/api/seller/profile/documents", formData, {
        type: SELLER_DOCUMENT_TYPES[documentField],
    });
}

export async function verifyGstNumber(gstNumber: string): Promise<GstVerifyResponse> {
    return apiRequest<GstVerifyResponse>("/api/seller/profile/gst/verify", {
        method: "POST",
        body: JSON.stringify({ gstNumber: gstNumber.trim().toUpperCase() }),
    });
}

export function isGstVerifySuccessful(result: GstVerifyResponse): boolean {
    return result.verified === true || result.isVerified === true;
}

export async function lookupIfscCode(ifscCode: string): Promise<IfscLookupResponse> {
    const code = encodeURIComponent(ifscCode.trim().toUpperCase());
    return apiRequest<IfscLookupResponse>(`/api/seller/profile/ifsc/${code}`);
}

export async function submitSellerProfile(): Promise<ProfileSubmitResponse> {
    const sellerId = ensureSellerId();
    if (!sellerId) {
        throw new ApiError(sanitizeAuthErrorMessage("Seller not logged in.", 401), 401);
    }

    const baseUrl = resolveApiBaseUrl();
    const url = `${baseUrl}/api/seller/profile/submit`;

    const accessToken = ensureAccessToken();
    if (!accessToken) {
        throw new ApiError(sanitizeAuthErrorMessage("Seller not logged in.", 401), 401);
    }

    let res: Response;
    try {
        res = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                "X-Seller-Id": String(sellerId),
            },
        });
    } catch {
        throw new ApiError(`Cannot reach API at ${baseUrl}. Ensure the backend is running.`);
    }

    const body = (await res.json()) as ProfileSubmitResponse;
    if (res.ok) {
        invalidateSellerProfileCache();
        return body;
    }
    if (res.status === 400 && body && typeof body.submitted === "boolean") {
        return body;
    }
    throw new ApiError(body?.message ?? `Request failed (${res.status})`, res.status);
}

export async function getRegistrationPaymentStatus(): Promise<RegistrationPaymentStatusResponse> {
    const sellerId = ensureSellerId();
    if (!sellerId) {
        throw new ApiError(sanitizeAuthErrorMessage("Seller not logged in.", 401), 401);
    }
    return apiRequest<RegistrationPaymentStatusResponse>("/api/seller/profile/registration-payment/status");
}

export async function createRegistrationPaymentOrder(): Promise<RegistrationPaymentOrderResponse> {
    const sellerId = ensureSellerId();
    if (!sellerId) {
        throw new ApiError(sanitizeAuthErrorMessage("Seller not logged in.", 401), 401);
    }
    return apiRequest<RegistrationPaymentOrderResponse>("/api/seller/profile/registration-payment/order", {
        method: "POST",
        body: JSON.stringify({}),
    });
}

export async function verifyRegistrationPayment(payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}): Promise<RegistrationPaymentStatusResponse> {
    const sellerId = ensureSellerId();
    if (!sellerId) {
        throw new ApiError(sanitizeAuthErrorMessage("Seller not logged in.", 401), 401);
    }
    return apiRequest<RegistrationPaymentStatusResponse>("/api/seller/profile/registration-payment/verify", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

/** Resolve display URL for uploaded assets (CDN https://flintnthread.in or API domain). */
export function resolveDocumentDisplayUrl(value: string | null | undefined): string | null {
    if (!value) return null;
    if (
        value.startsWith("file://") ||
        value.startsWith("data:") ||
        value.startsWith("blob:")
    ) {
        return value;
    }
    return resolveMediaUrl(value);
}
