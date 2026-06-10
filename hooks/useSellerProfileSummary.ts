import { useEffect, useState } from "react";

import { useProfileStatus } from "@/hooks/useProfileStatus";
import { getSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import { resolveProfilePicUrl } from "@/lib/profile/resolveProfilePicUrl";
import {
    fetchSellerProfile,
    type SellerAccountStatus,
    type SellerProfileResponse,
} from "@/services/sellerProfileApi";

export type SellerProfileSummary = {
    sellerId: string;
    fullName: string;
    firstName: string;
    businessName: string;
    storeLabel: string;
    mobile: string;
    mobileDisplay: string;
    email: string;
    profilePicUrl: string | null;
    profileCompleted: boolean;
    kycCompleted: boolean;
    accountStatus: SellerAccountStatus | null;
};

function formatMobileDisplay(mobile: string): string {
    const digits = mobile.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) return mobile || "—";
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function profileToSummary(profile: SellerProfileResponse): SellerProfileSummary {
    const fullName =
        profile.fullName?.trim() ||
        [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
        "Seller";
    const businessName = profile.business?.businessName?.trim() || "";
    const mobile = profile.mobile?.replace(/\D/g, "").slice(-10) || "";
    const pic = resolveProfilePicUrl(profile);

    return {
        sellerId: String(profile.sellerId),
        fullName,
        firstName: profile.firstName?.trim() || fullName.split(" ")[0] || "Seller",
        businessName,
        storeLabel: businessName || `${fullName}'s Store`,
        mobile,
        mobileDisplay: formatMobileDisplay(mobile),
        email: profile.email || "",
        profilePicUrl: pic,
        profileCompleted: profile.profileCompleted,
        kycCompleted: profile.kycCompleted,
        accountStatus: profile.accountStatus ?? null,
    };
}

/**
 * Loads seller profile for dashboard/header UI (no forced logout on auth errors).
 */
export function useSellerProfileSummary() {
    const { isProfileCompleted, setIsProfileCompleted } = useProfileStatus();
    const [summary, setSummary] = useState<SellerProfileSummary | null>(null);
    const [loading, setLoading] = useState(true);

    const loadSummary = async (active: { current: boolean }) => {
        await hydrateSellerSession();
        const sellerId = getSellerId();

        if (!sellerId) {
            if (active.current) setLoading(false);
            return;
        }

        try {
            const profile = await fetchSellerProfile();
            if (!active.current) return;
            setSummary(profileToSummary(profile));
            setIsProfileCompleted(profile.profileCompleted);
        } catch {
            // Keep dashboard usable; profile card falls back to generic labels.
        } finally {
            if (active.current) setLoading(false);
        }
    };

    useEffect(() => {
        const active = { current: true };
        void loadSummary(active);
        return () => {
            active.current = false;
        };
    }, [setIsProfileCompleted]);

    // Re-fetch when profile is marked complete (e.g. after submit) so sidebar/header stay in sync.
    useEffect(() => {
        if (!isProfileCompleted || summary?.profileCompleted) return;
        const active = { current: true };
        void loadSummary(active);
        return () => {
            active.current = false;
        };
    }, [isProfileCompleted, summary?.profileCompleted]);

    return {
        summary,
        loading,
        reload: () => {
            const active = { current: true };
            setLoading(true);
            return loadSummary(active);
        },
    };
}
