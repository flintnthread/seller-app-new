import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SellerProfileCardsContent } from "@/components/profile/SellerProfileCardsContent";
import { useSellerProfileView } from "@/hooks/useSellerProfileView";
import type { SellerProfileResponse } from "@/services/sellerProfileApi";

const DESKTOP_BREAKPOINT = 1024;

export default function ViewSellerProfileScreen() {
    const { profile, loading, isDesktop, setProfile, refreshProfile } = useSellerProfileView(DESKTOP_BREAKPOINT);
    const approvalState = profile?.accountStatus?.approvalState ?? profile?.approvalState;
    const readOnly = approvalState === "pending_review" || approvalState === "rejected";

    const handleProfileUpdated = (updated: SellerProfileResponse) => {
        setProfile(updated);
        refreshProfile().catch(() => undefined);
    };

    const header = readOnly ? (
        <View style={styles.reviewBanner}>
            <Text style={styles.reviewBannerTitle}>Submitted Profile</Text>
            <Text style={styles.reviewBannerText}>
                {approvalState === "rejected"
                    ? "Your submitted details are shown below. Contact support if you need to update anything."
                    : "Your profile is under review. The details below are read-only until approval."}
            </Text>
        </View>
    ) : null;

    if (isDesktop) {
        return (
            <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {header}
                    <SellerProfileCardsContent
                        profile={profile}
                        loading={loading}
                        isDesktop
                        readOnly={readOnly}
                        onProfileUpdated={handleProfileUpdated}
                    />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {header}
                <SellerProfileCardsContent
                    profile={profile}
                    loading={loading}
                    isDesktop={false}
                    readOnly={readOnly}
                    onProfileUpdated={handleProfileUpdated}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    reviewBanner: {
        backgroundColor: "#F0FDFA",
        borderWidth: 1,
        borderColor: "#99F6E4",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    reviewBannerTitle: {
        fontSize: 16,
        fontFamily: "Poppins_600SemiBold",
        color: "#0F766E",
        marginBottom: 4,
    },
    reviewBannerText: {
        fontSize: 13,
        fontFamily: "Poppins_400Regular",
        color: "#115E59",
        lineHeight: 20,
    },
});
