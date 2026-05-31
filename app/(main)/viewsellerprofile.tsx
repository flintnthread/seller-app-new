import React from "react";
import { ScrollView, View } from "react-native";
import { SellerProfileCardsContent } from "@/components/profile/SellerProfileCardsContent";
import { useSellerProfileView } from "@/hooks/useSellerProfileView";

const DESKTOP_BREAKPOINT = 1024;

export default function ViewSellerProfileScreen() {
    const { profile, loading, isDesktop } = useSellerProfileView(DESKTOP_BREAKPOINT);

    if (isDesktop) {
        return (
            <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <SellerProfileCardsContent profile={profile} loading={loading} isDesktop />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <SellerProfileCardsContent profile={profile} loading={loading} isDesktop={false} />
            </ScrollView>
        </View>
    );
}
