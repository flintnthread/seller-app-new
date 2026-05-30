import { useCallback, useEffect, useState } from "react";
import {
    fetchSellerProfile,
    resolveDocumentDisplayUrl,
    type SellerProfileResponse,
} from "@/services/sellerProfileApi";

/** Flat profile shape for legacy dashboard/settings consumers. */
export type SellerProfile = {
    id: number;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    mobile?: string;
    businessName?: string;
    bankName?: string;
    profilePicUrl?: string;
    profilePic?: string;
    profileCompleted?: boolean;
};

function mapResponseToProfile(response: SellerProfileResponse): SellerProfile {
    const pic = response.personal?.profilePicUrl;
    const resolvedPic = pic ? resolveDocumentDisplayUrl(pic) ?? undefined : undefined;

    return {
        id: response.sellerId,
        firstName: response.firstName,
        lastName: response.lastName,
        fullName: response.fullName,
        email: response.email,
        mobile: response.mobile,
        businessName: response.business?.businessName ?? undefined,
        bankName: response.banking?.bankName ?? undefined,
        profilePicUrl: resolvedPic,
        profilePic: resolvedPic,
        profileCompleted: response.profileCompleted,
    };
}

export function useSellerProfile() {
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setProfile(mapResponseToProfile(await fetchSellerProfile()));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load profile.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return { profile, loading, error, reload };
}
