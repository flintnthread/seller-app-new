import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { useProfileStatus } from "@/hooks/useProfileStatus";
import { clearSellerId, getSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import {
    fetchSellerProfile,
    resolveDocumentDisplayUrl,
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
    const pic = profile.personal?.profilePicUrl;

    return {
        sellerId: String(profile.sellerId),
        fullName,
        firstName: profile.firstName?.trim() || fullName.split(" ")[0] || "Seller",
        businessName,
        storeLabel: businessName || `${fullName}'s Store`,
        mobile,
        mobileDisplay: formatMobileDisplay(mobile),
        email: profile.email || "",
        profilePicUrl: pic ? resolveDocumentDisplayUrl(pic) : null,
        profileCompleted: profile.profileCompleted,
        kycCompleted: profile.kycCompleted,
    };
}

/**
 * Loads seller profile for dashboard/header UI and enforces login when session is missing.
 */
export function useSellerProfileSummary() {
    const router = useRouter();
    const { setIsProfileCompleted } = useProfileStatus();
    const [summary, setSummary] = useState<SellerProfileSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        (async () => {
            await hydrateSellerSession();
            const sellerId = getSellerId();

            if (!sellerId) {
                router.replace("/(auth)/login");
                return;
            }

            try {
                const profile = await fetchSellerProfile();
                if (!active) return;
                setSummary(profileToSummary(profile));
                setIsProfileCompleted(profile.profileCompleted);
            } catch {
                if (!active) return;
                await clearSellerId();
                router.replace("/(auth)/login");
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => {
            active = false;
        };
    }, [router, setIsProfileCompleted]);

    return { summary, loading };
}
