import { useSellerProfileSummary } from "@/hooks/useSellerProfileSummary";

/**
 * Redirects to login when unauthenticated. Syncs profile completion status
 * but does not force onboarding — sellers can complete profile later from Profile.
 */
export function useRequireCompleteProfile() {
    useSellerProfileSummary();
}
