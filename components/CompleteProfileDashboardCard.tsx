import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";
import { buildOnboardingParams } from "@/lib/auth/postLoginRoute";
import type { SellerProfileSummary } from "@/hooks/useSellerProfileSummary";

const C = {
    navy: "#1E2B6B",
    navyDeep: "#151D4F",
    orange: "#F97316",
    orangeLight: "#FB923C",
    white: "#FFFFFF",
    textMid: "#6B7280",
    textDark: "#1F2937",
    border: "#E5E7EB",
    stepBg: "#F3F4F6",
};

const PROFILE_STEPS = [
    { step: 1, label: "Personal information", icon: "account-outline" as const },
    { step: 2, label: "Business details & GST", icon: "store-outline" as const },
    { step: 3, label: "Address information", icon: "map-marker-outline" as const },
    { step: 4, label: "Banking details", icon: "bank-outline" as const },
    { step: 5, label: "Documents & submit", icon: "file-document-outline" as const },
];

const PROFILE_STEP_ROWS = [
    PROFILE_STEPS.slice(0, 2),
    PROFILE_STEPS.slice(2, 4),
    PROFILE_STEPS.slice(4, 5),
];

type Props = {
    profile: SellerProfileSummary | null;
    loading?: boolean;
    /** When true, renders as an inline banner on the dashboard (not full-screen). */
    embedded?: boolean;
};

export function CompleteProfileDashboardCard({ profile, loading, embedded = false }: Props) {
    const router = useRouter();

    const message =
        profile?.accountStatus?.approvalState === "profile_incomplete"
            ? profile.accountStatus.message
            : "Complete your seller profile and submit your documents to begin the verification process.";

    const handleComplete = () => {
        router.push({
            pathname: "/(main)/sellerpersonalinfo",
            params: buildOnboardingParams({
                ...(profile?.fullName ? { fullName: profile.fullName } : {}),
                ...(profile?.email ? { email: profile.email } : {}),
                ...(profile?.mobile ? { mobile: profile.mobile } : {}),
            }),
        });
    };

    if (loading) {
        return (
            <View style={embedded ? styles.wrapEmbedded : styles.wrap}>
                <View style={styles.loadingCard}>
                    <ActivityIndicator color={C.orange} />
                    <AppText style={styles.loadingText}>Loading your account…</AppText>
                </View>
            </View>
        );
    }

    const cardContent = (
        <>
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="account-edit" size={36} color={C.orange} />
            </View>
            <AppText style={styles.title}>Complete Your Seller Profile</AppText>
            <AppText style={styles.message}>{message}</AppText>

            <View style={styles.stepsWrap}>
                <AppText style={styles.stepsHeading}>Steps to complete</AppText>
                <View style={styles.stepsGrid}>
                    {PROFILE_STEP_ROWS.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.stepsRow}>
                            {row.map((item) => (
                                <View
                                    key={item.step}
                                    style={[styles.stepCell, row.length === 1 && styles.stepCellSingle]}
                                >
                                    <View style={styles.stepBadge}>
                                        <AppText style={styles.stepBadgeText}>{item.step}</AppText>
                                    </View>
                                    <MaterialCommunityIcons name={item.icon} size={16} color={C.navy} />
                                    <AppText style={styles.stepLabel} numberOfLines={2}>
                                        {item.label}
                                    </AppText>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </View>

            <Pressable
                style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
                onPress={handleComplete}
            >
                <LinearGradient
                    colors={[C.orange, C.orangeLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaGrad}
                >
                    <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#fff" />
                    <AppText style={styles.ctaText}>Start / Continue Profile</AppText>
                </LinearGradient>
            </Pressable>
        </>
    );

    if (embedded) {
        return (
            <View style={styles.wrapEmbedded}>
                <View style={styles.cardEmbedded}>{cardContent}</View>
            </View>
        );
    }

    return (
        <View style={styles.wrap}>
            <LinearGradient
                colors={[C.navyDeep, C.navy]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardFull}
            >
                {cardContent}
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
        minHeight: 360,
    },
    wrapEmbedded: {
        width: "100%",
        paddingBottom: 12,
    },
    loadingCard: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        gap: 12,
    },
    loadingText: {
        fontFamily: fontFamilies.medium,
        fontSize: 14,
        color: C.textMid,
    },
    cardEmbedded: {
        width: "100%",
        paddingHorizontal: 16,
        paddingVertical: 24,
        backgroundColor: C.white,
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: C.border,
    },
    cardFull: {
        borderRadius: 20,
        padding: 28,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#FFF7ED",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    title: {
        fontFamily: fontFamilies.bold,
        fontSize: 22,
        color: C.textDark,
        textAlign: "center",
        marginBottom: 10,
    },
    message: {
        fontFamily: fontFamilies.regular,
        fontSize: 15,
        color: C.textMid,
        textAlign: "center",
        lineHeight: 23,
        marginBottom: 20,
        maxWidth: 520,
    },
    stepsWrap: {
        width: "100%",
        marginBottom: 24,
    },
    stepsHeading: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 12,
        color: C.textMid,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 10,
    },
    stepsGrid: {
        width: "100%",
        gap: 10,
    },
    stepsRow: {
        flexDirection: "row",
        gap: 10,
        width: "100%",
    },
    stepCell: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        backgroundColor: C.stepBg,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        minHeight: 48,
    },
    stepCellSingle: {
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: "48%",
        maxWidth: "48%",
    },
    stepBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: C.orange,
        alignItems: "center",
        justifyContent: "center",
    },
    stepBadgeText: {
        fontFamily: fontFamilies.bold,
        fontSize: 11,
        color: C.white,
    },
    stepLabel: {
        flex: 1,
        flexShrink: 1,
        minWidth: 0,
        fontFamily: fontFamilies.medium,
        fontSize: 12,
        color: C.textDark,
        lineHeight: 16,
    },
    cta: {
        borderRadius: 50,
        overflow: "hidden",
        width: "100%",
        maxWidth: 360,
    },
    ctaGrad: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    ctaText: {
        fontFamily: fontFamilies.bold,
        fontSize: 16,
        color: C.white,
    },
});
