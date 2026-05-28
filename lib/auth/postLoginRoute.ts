import type { Href } from "expo-router";

import type { LoginResult } from "@/services/authApi";
import type { SellerProfileResponse } from "@/services/sellerProfileApi";

type OnboardingParamsInput = {
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    mobile?: string | null;
};

export function buildOnboardingParams(input: OnboardingParamsInput): Record<string, string> {
    const fullName =
        input.fullName?.trim() ||
        [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
    const mobile = input.mobile?.replace(/\D/g, "").slice(-10);

    const params: Record<string, string> = {};
    if (fullName) params.fullName = fullName;
    if (input.email?.trim()) params.email = input.email.trim();
    if (mobile) params.mobile = mobile;
    return params;
}

/** After login, always open the dashboard. Profile steps are optional from Profile. */
export function getPostLoginRoute(_result?: LoginResult): Href {
    return "/(main)/dashboard";
}

/** Voluntary navigation when the seller chooses to complete their profile. */
export function getOnboardingRouteFromProfile(profile: SellerProfileResponse): Href {
    return {
        pathname: "/(main)/sellerpersonalinfo",
        params: buildOnboardingParams({
            fullName: profile.fullName,
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            mobile: profile.mobile,
        }),
    };
}
