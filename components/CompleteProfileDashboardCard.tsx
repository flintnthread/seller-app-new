import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
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
    orangePale: "#FFF7ED",
    orangeBorder: "#FED7AA",
    amber: "#D97706",
    amberPale: "#FFFBEB",
    amberBorder: "#FDE68A",
    white: "#FFFFFF",
    textMid: "#6B7280",
    textDark: "#111827",
    textLight: "#9CA3AF",
    border: "#E5E7EB",
    bg: "#F4F6FB",
    stepLine: "#E5E7EB",
};

const PROFILE_STEPS = [
    { step: 1, label: "Personal information", desc: "Name, contact & profile photo", icon: "account-outline" as const },
    { step: 2, label: "Business details & GST", desc: "Store name, category & tax info", icon: "store-outline" as const },
    { step: 3, label: "Address information", desc: "Pickup & business address", icon: "map-marker-outline" as const },
    { step: 4, label: "Banking details", desc: "Account for payouts", icon: "bank-outline" as const },
    { step: 5, label: "Documents & submit", desc: "KYC uploads & final review", icon: "file-document-outline" as const },
];

type Props = {
    profile: SellerProfileSummary | null;
    loading?: boolean;
    /** When true, renders as an inline banner on the dashboard (not full-screen). */
    embedded?: boolean;
};

export function CompleteProfileDashboardCard({ profile, loading, embedded = false }: Props) {
    const router = useRouter();
    const [greeting, setGreeting] = useState("Hello");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good Morning");
        else if (hour < 18) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");
    }, []);

    const displayName = profile?.fullName?.trim() || "Seller";
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

    const content = (
        <>
            <View style={styles.heroWrap}>
                <LinearGradient
                    colors={["#F97316", "#C2410C", "#7C2D12"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroBanner}
                >
                    <View style={styles.heroOrb1} />
                    <View style={styles.heroOrb2} />
                </LinearGradient>

                <View style={styles.heroCard}>
                    <View style={styles.heroIconBox}>
                        <MaterialCommunityIcons name="chart-line" size={28} color={C.orange} />
                    </View>
                    <View style={styles.heroTextCol}>
                        <AppText style={styles.heroTitle}>Seller Dashboard</AppText>
                        <View style={styles.breadcrumbRow}>
                            <Ionicons name="home-outline" size={13} color={C.textLight} />
                            <AppText style={styles.breadcrumbText}>Home</AppText>
                            <AppText style={styles.breadcrumbSep}>›</AppText>
                            <AppText style={styles.breadcrumbActive}>Dashboard</AppText>
                        </View>
                        <AppText style={styles.heroGreeting}>
                            {greeting}, <AppText style={styles.heroName}>{displayName}</AppText>
                        </AppText>
                    </View>
                    <View style={styles.incompleteBadge}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={14} color={C.amber} />
                        <AppText style={styles.incompleteBadgeText}>Incomplete</AppText>
                    </View>
                </View>
            </View>

            <View style={styles.alertBanner}>
                <View style={styles.alertTopRow}>
                    <View style={styles.alertIcon}>
                        <MaterialCommunityIcons name="account-edit" size={28} color={C.orange} />
                    </View>
                    <View style={styles.alertContent}>
                        <AppText style={styles.alertTitle}>Complete Your Seller Profile</AppText>
                        <AppText style={styles.alertMessage}>{message}</AppText>
                        <View style={styles.progressTrack}>
                            <View style={styles.progressFill} />
                        </View>
                        <View style={styles.progressFooter}>
                            <AppText style={styles.progressLabel}>0 of 5 steps completed</AppText>
                            <Pressable
                                style={({ pressed }) => [styles.ctaWrap, pressed && { opacity: 0.92 }]}
                                onPress={handleComplete}
                            >
                                <LinearGradient
                                    colors={[C.orange, C.orangeLight]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.cta}
                                >
                                    <MaterialCommunityIcons name="clipboard-check-outline" size={16} color="#fff" />
                                    <AppText style={styles.ctaText}>Start/Continue Profile</AppText>
                                </LinearGradient>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.stepsCard}>
                <AppText style={styles.stepsHeading}>What you need to complete</AppText>
                {PROFILE_STEPS.map((item, index) => (
                    <View key={item.step} style={styles.stepRow}>
                        <View style={styles.stepRail}>
                            <View style={styles.stepDot}>
                                <AppText style={styles.stepDotText}>{item.step}</AppText>
                            </View>
                            {index < PROFILE_STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
                        </View>
                        <View style={[styles.stepBody, index === PROFILE_STEPS.length - 1 && styles.stepBodyLast]}>
                            <View style={styles.stepIconWrap}>
                                <MaterialCommunityIcons name={item.icon} size={18} color={C.navy} />
                            </View>
                            <View style={styles.stepTextCol}>
                                <AppText style={styles.stepLabel}>{item.label}</AppText>
                                <AppText style={styles.stepDesc}>{item.desc}</AppText>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={C.textLight} />
                        </View>
                    </View>
                ))}
            </View>

            <Pressable style={styles.helpRow} onPress={() => router.push("/(main)/helpsupport")}>
                <MaterialCommunityIcons name="headset" size={18} color={C.navy} />
                <AppText style={styles.helpText}>Need help? Contact support</AppText>
                <MaterialCommunityIcons name="arrow-right" size={16} color={C.textLight} />
            </Pressable>
        </>
    );

    if (embedded) {
        return <View style={styles.wrapEmbedded}>{content}</View>;
    }

    return (
        <View style={styles.wrap}>
            <LinearGradient
                colors={[C.navyDeep, C.navy]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardFull}
            >
                {content}
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
        backgroundColor: C.bg,
        paddingBottom: 24,
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
    cardFull: {
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
    },
    heroWrap: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        overflow: "hidden",
    },
    heroBanner: {
        height: 100,
        overflow: "hidden",
        position: "relative",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    heroOrb1: {
        position: "absolute",
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: "rgba(255,255,255,0.08)",
        top: -50,
        right: -20,
    },
    heroOrb2: {
        position: "absolute",
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: "rgba(255,255,255,0.06)",
        bottom: -30,
        left: 30,
    },
    heroCard: {
        marginHorizontal: 12,
        marginTop: -28,
        marginBottom: 12,
        backgroundColor: C.white,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    heroIconBox: {
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: C.orangePale,
        borderWidth: 1,
        borderColor: C.orangeBorder,
        alignItems: "center",
        justifyContent: "center",
    },
    heroTextCol: { flex: 1, minWidth: 180, gap: 4 },
    heroTitle: {
        fontFamily: fontFamilies.bold,
        fontSize: 22,
        color: C.navy,
    },
    breadcrumbRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    breadcrumbText: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight },
    breadcrumbSep: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight },
    breadcrumbActive: { fontFamily: fontFamilies.medium, fontSize: 12, color: C.textMid },
    heroGreeting: {
        fontFamily: fontFamilies.regular,
        fontSize: 13,
        color: C.textMid,
        marginTop: 2,
    },
    heroName: {
        fontFamily: fontFamilies.semiBold,
        color: C.textDark,
    },
    incompleteBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: C.amberPale,
        borderWidth: 1,
        borderColor: C.amberBorder,
        marginLeft: "auto",
    },
    incompleteBadgeText: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 12,
        color: C.amber,
    },
    alertBanner: {
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: C.orangePale,
        borderWidth: 1,
        borderColor: C.orangeBorder,
        borderRadius: 14,
        padding: 16,
        gap: 14,
    },
    alertTopRow: {
        flexDirection: "row",
        gap: 14,
        alignItems: "flex-start",
    },
    alertIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: C.white,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    alertContent: { flex: 1, gap: 8, minWidth: 0 },
    alertTitle: {
        fontFamily: fontFamilies.bold,
        fontSize: 17,
        color: C.navy,
    },
    alertMessage: {
        fontFamily: fontFamilies.regular,
        fontSize: 14,
        color: C.textMid,
        lineHeight: 21,
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FFEDD5",
        overflow: "hidden",
        marginTop: 2,
    },
    progressFill: {
        width: "4%",
        height: "100%",
        borderRadius: 4,
        backgroundColor: C.orange,
    },
    progressLabel: {
        flex: 1,
        fontFamily: fontFamilies.medium,
        fontSize: 12,
        color: C.amber,
        marginRight: 8,
    },
    progressFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginTop: 2,
    },
    stepsCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: C.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    stepsHeading: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 15,
        color: C.textDark,
        marginBottom: 14,
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "stretch",
    },
    stepRail: {
        width: 32,
        alignItems: "center",
        marginRight: 10,
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: C.orange,
        alignItems: "center",
        justifyContent: "center",
    },
    stepDotText: {
        fontFamily: fontFamilies.bold,
        fontSize: 12,
        color: C.white,
    },
    stepLine: {
        flex: 1,
        width: 2,
        backgroundColor: C.stepLine,
        marginVertical: 4,
        minHeight: 20,
    },
    stepBody: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingBottom: 18,
        minWidth: 0,
    },
    stepBodyLast: { paddingBottom: 0 },
    stepIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    stepTextCol: { flex: 1, minWidth: 0 },
    stepLabel: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 14,
        color: C.textDark,
        marginBottom: 2,
    },
    stepDesc: {
        fontFamily: fontFamilies.regular,
        fontSize: 12,
        color: C.textMid,
        lineHeight: 17,
    },
    ctaWrap: {
        borderRadius: 8,
        overflow: "hidden",
        flexShrink: 0,
    },
    cta: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    ctaText: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 13,
        color: C.white,
    },
    helpRow: {
        marginHorizontal: 16,
        marginTop: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: C.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.border,
    },
    helpText: {
        flex: 1,
        fontFamily: fontFamilies.medium,
        fontSize: 13,
        color: C.navy,
    },
});
