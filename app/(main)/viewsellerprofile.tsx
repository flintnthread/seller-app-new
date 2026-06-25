import React from "react";
import { ScrollView, View } from "react-native";
import { SellerProfileCardsContent } from "@/components/profile/SellerProfileCardsContent";
import { useSellerProfileView } from "@/hooks/useSellerProfileView";
import type { SellerProfileResponse } from "@/services/sellerProfileApi";

const DESKTOP_BREAKPOINT = 1024;

export default function ViewSellerProfileScreen() {
    const { profile, loading, isDesktop, setProfile, refreshProfile } = useSellerProfileView(DESKTOP_BREAKPOINT);

    const handleProfileUpdated = (updated: SellerProfileResponse) => {
        setProfile(updated);
        refreshProfile().catch(() => undefined);
    };

    if (isDesktop) {
        return (
            <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <SellerProfileCardsContent
                        profile={profile}
                        loading={loading}
                        isDesktop
                        onProfileUpdated={handleProfileUpdated}
                    />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <SellerProfileCardsContent
                    profile={profile}
                    loading={loading}
                    isDesktop={false}
                    onProfileUpdated={handleProfileUpdated}
                />
            </ScrollView>
        </View>
    );
}
