import { apiRequest } from "@/lib/api/client";

export type IfscLookup = {
    ifsc: string;
    bank: string;
    branch: string;
    city: string;
    state: string;
    found: boolean;
};

export type GstVerifyResult = {
    valid: boolean;
    verified: boolean;
    message: string;
};

export async function lookupIfsc(code: string): Promise<IfscLookup> {
    return apiRequest<IfscLookup>(`/api/util/ifsc/${encodeURIComponent(code.trim().toUpperCase())}`);
}

export async function verifyGstNumber(gstNumber: string): Promise<GstVerifyResult> {
    return apiRequest<GstVerifyResult>(
        `/api/util/verify-gst?gstNumber=${encodeURIComponent(gstNumber.trim().toUpperCase())}`
    );
}
