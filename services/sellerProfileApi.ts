import { apiRequest } from "@/lib/api/client";

export type SellerProfile = {
    id: number;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    businessName?: string;
    businessType?: string;
    sellerCategory?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    area?: string;
    landmark?: string;
    gstNumber?: string;
    panNumber?: string;
    aadhaarNumber?: string;
    hasGst?: boolean;
    gstType?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolder?: string;
    branchName?: string;
    bankVerified?: boolean;
    profilePic?: string;
    profilePicUrl?: string;
    aadharFrontUrl?: string;
    aadharBackUrl?: string;
    panCardUrl?: string;
    businessProofUrl?: string;
    bankProofUrl?: string;
    cancelledChequeUrl?: string;
    profileCompleted?: boolean;
    kycCompleted?: boolean;
    kycVerified?: boolean;
    walletBalance?: number;
    warehouseAddress?: string;
    warehouseCity?: string;
    warehouseState?: string;
    warehouseCountry?: string;
    warehouseArea?: string;
    status?: string;
    referralCode?: string;
    referralTotalReferred?: number;
    referralQualifiedReferred?: number;
    referralGoal?: number;
};

export type UpdateSellerProfilePayload = Partial<
    Pick<
        SellerProfile,
        | "firstName"
        | "lastName"
        | "businessName"
        | "businessType"
        | "sellerCategory"
        | "address"
        | "city"
        | "state"
        | "pincode"
        | "country"
        | "area"
        | "landmark"
        | "gstNumber"
        | "panNumber"
        | "aadhaarNumber"
        | "hasGst"
        | "gstType"
        | "bankName"
        | "accountNumber"
        | "ifscCode"
        | "accountHolder"
        | "branchName"
        | "profilePic"
        | "warehouseAddress"
        | "warehouseCity"
        | "warehouseState"
        | "warehouseCountry"
        | "warehouseArea"
        | "profileCompleted"
        | "kycCompleted"
    >
> & {
    aadharFront?: string;
    aadharBack?: string;
    panCard?: string;
    businessProof?: string;
    bankProof?: string;
    cancelledCheque?: string;
};

export async function fetchSellerProfile(): Promise<SellerProfile> {
    return apiRequest<SellerProfile>("/api/seller/profile");
}

export async function updateSellerProfile(payload: UpdateSellerProfilePayload): Promise<SellerProfile> {
    return apiRequest<SellerProfile>("/api/seller/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}
