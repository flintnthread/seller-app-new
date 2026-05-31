import { resolveDocumentDisplayUrl, type SellerProfileResponse } from "@/services/sellerProfileApi";

/** Resolve seller profile photo from personal or documents map. */
export function resolveProfilePicUrl(profile: SellerProfileResponse | null | undefined): string | null {
    if (!profile) return null;
    const fromPersonal = profile.personal?.profilePicUrl;
    const fromDocs = profile.documents?.files?.profilePic;
    const raw = fromPersonal || fromDocs || null;
    return raw ? resolveDocumentDisplayUrl(raw) : null;
}
