import { Platform } from "react-native";
import { apiRequest, ApiError } from "@/lib/api/client";
import { apiUpload, appendFileToFormData, buildUploadPart } from "@/lib/api/multipart";
import { resolveApiBaseUrl } from "@/lib/api/config";
import { ensureSellerId, setSellerId } from "@/lib/api/sellerSession";

export type SellerProfileResponse = {
    sellerId: number;
    email: string;
    mobile: string;
    firstName: string;
    lastName: string;
    fullName: string;
    profileCompleted: boolean;
    kycCompleted: boolean;
    kycSubmittedAt?: string | null;
    personal: { profilePicUrl?: string | null };
    business: {
        businessCategory?: string | null;
        businessName?: string | null;
        businessType?: string | null;
        hasGst: boolean;
        gstType?: string | null;
        gstNumber?: string | null;
        panNumber?: string | null;
        aadhaarNumber?: string | null;
        companyPan?: string | null;
    };
    address: {
        streetAddress?: string | null;
        landmark?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
        pincode?: string | null;
        warehouseDifferent: boolean;
        warehouseAddress?: string | null;
        warehouseLandmark?: string | null;
        warehouseCity?: string | null;
        warehouseState?: string | null;
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
};

export type GstVerifyResponse = {
    verified: boolean;
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
    country: string;
    pincode: string;
    warehouseDifferent?: boolean;
    warehouseAddress?: string;
    warehouseLandmark?: string;
    warehouseCity?: string;
    warehouseState?: string;
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
    if (error instanceof ApiError) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

export async function fetchSellerProfile(): Promise<SellerProfileResponse> {
    await ensureSellerIdForProfileApi();
    return apiRequest<SellerProfileResponse>("/api/seller/profile");
}

export async function uploadProfilePhoto(localUri: string): Promise<SellerProfileResponse> {
    await ensureSellerIdForProfileApi();
    const part = await buildUploadPart(localUri, { name: guessProfilePhotoName(localUri) });
    const formData = new FormData();
    appendFileToFormData(formData, "file", part);
    return apiUpload<SellerProfileResponse>("/api/seller/profile/personal/photo", formData);
}

function guessProfilePhotoName(uri: string): string {
    if (uri.includes(".png")) return "profile.png";
    if (uri.includes(".webp")) return "profile.webp";
    return "profile.jpg";
}

export async function updateBusinessProfile(payload: BusinessProfilePayload): Promise<SellerProfileResponse> {
    await ensureSellerIdForProfileApi();
    return apiRequest<SellerProfileResponse>("/api/seller/profile/business", {
        method: "PUT",
        body: JSON.stringify({
            ...payload,
            businessCategory: toApiBusinessCategory(payload.businessCategory),
        }),
    });
}

export async function updateAddressProfile(payload: AddressProfilePayload): Promise<SellerProfileResponse> {
    await ensureSellerIdForProfileApi();
    return apiRequest<SellerProfileResponse>("/api/seller/profile/address", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export async function updateBankingProfile(payload: BankingProfilePayload): Promise<SellerProfileResponse> {
    await ensureSellerIdForProfileApi();
    return apiRequest<SellerProfileResponse>("/api/seller/profile/banking", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export async function updateCompanyPan(companyPanNumber: string): Promise<SellerProfileResponse> {
    await ensureSellerIdForProfileApi();
    return apiRequest<SellerProfileResponse>("/api/seller/profile/company-pan", {
        method: "PUT",
        body: JSON.stringify({ companyPanNumber }),
    });
}

export async function uploadSellerDocument(
    documentField: SellerDocumentField,
    localUri: string,
    fileName?: string
): Promise<DocumentUploadResponse> {
    await ensureSellerIdForProfileApi();
    const part = await buildUploadPart(localUri, { name: fileName });
    const formData = new FormData();
    appendFileToFormData(formData, "file", part);
    return apiUpload<DocumentUploadResponse>("/api/seller/profile/documents", formData, {
        type: SELLER_DOCUMENT_TYPES[documentField],
    });
}

export async function verifyGstNumber(gstNumber: string): Promise<GstVerifyResponse> {
    await ensureSellerIdForProfileApi();
    return apiRequest<GstVerifyResponse>("/api/seller/profile/gst/verify", {
        method: "POST",
        body: JSON.stringify({ gstNumber: gstNumber.trim().toUpperCase() }),
    });
}

export async function lookupIfscCode(ifscCode: string): Promise<IfscLookupResponse> {
    await ensureSellerIdForProfileApi();
    const code = encodeURIComponent(ifscCode.trim().toUpperCase());
    return apiRequest<IfscLookupResponse>(`/api/seller/profile/ifsc/${code}`);
}

export async function submitSellerProfile(): Promise<ProfileSubmitResponse> {
    await ensureSellerIdForProfileApi();
    const sellerId = ensureSellerId();
    if (!sellerId) {
        throw new ApiError("Seller not logged in. Please log in again.");
    }

    const baseUrl = resolveApiBaseUrl();
    const url = `${baseUrl}/api/seller/profile/submit`;

    let res: Response;
    try {
        res = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "X-Seller-Id": String(sellerId),
            },
        });
    } catch {
        throw new ApiError(`Cannot reach API at ${baseUrl}. Ensure the backend is running.`);
    }

    const body = (await res.json()) as ProfileSubmitResponse;
    if (res.ok) {
        return body;
    }
    if (res.status === 400 && body && typeof body.submitted === "boolean") {
        return body;
    }
    throw new ApiError(body?.message ?? `Request failed (${res.status})`, res.status);
}

/** Resolve display URL for uploaded assets (local file, data URI, or server URL). */
export function resolveDocumentDisplayUrl(value: string | null | undefined): string | null {
    if (!value) return null;
    if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("file://") ||
        value.startsWith("data:") ||
        value.startsWith("blob:")
    ) {
        return value;
    }
    if (value.startsWith("/")) {
        return `${resolveApiBaseUrl()}${value}`;
    }
    const base = resolveApiBaseUrl();
    if (Platform.OS === "web") {
        return `${base}/uploads/sellers/${value}`;
    }
    return `${base}/uploads/sellers/${value}`;
}

async function ensureSellerIdForProfileApi() {
    if (ensureSellerId()) return;

    const raw = process.env.EXPO_PUBLIC_DEV_SELLER_ID;
    if (!raw) return;

    const devId = Number(raw);
    if (Number.isFinite(devId) && devId > 0) {
        await setSellerId(devId);
    } else {
        // if env var exists but is invalid, do nothing and let apiRequest throw a clear error
    }
}
