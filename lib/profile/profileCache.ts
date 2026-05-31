import type { SellerProfileResponse } from "@/services/sellerProfileApi";

let cachedSellerProfile: { sellerId: number; profile: SellerProfileResponse } | null = null;

export function invalidateSellerProfileCache(): void {
    cachedSellerProfile = null;
}

export function getCachedSellerProfile(sellerId: number): SellerProfileResponse | null {
    if (cachedSellerProfile?.sellerId === sellerId) {
        return cachedSellerProfile.profile;
    }
    return null;
}

export function saveSellerProfileCache(profile: SellerProfileResponse): SellerProfileResponse {
    cachedSellerProfile = { sellerId: profile.sellerId, profile };
    return profile;
}
