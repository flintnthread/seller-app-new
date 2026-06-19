import React, { useState } from "react";
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Pressable,
    ActivityIndicator,
    Platform,
} from "react-native";
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
    orangeDeep: "#EA580C",
    teal: "#14B8A6",
    tealDark: "#0D9488",
    tealPale: "#F0FDFA",
    tealBorder: "#99F6E4",
    red: "#DC2626",
    redPale: "#FEF2F2",
    redBorder: "#FECACA",
    amber: "#D97706",
    amberPale: "#FFFBEB",
    amberBorder: "#FDE68A",
    white: "#FFFFFF",
    border: "#E5E7EB",
    bg: "#F4F6FB",
    textDark: "#111827",
    textMid: "#6B7280",
    textLight: "#9CA3AF",
    brown: "#92400E",
    brownPale: "#FEF3C7",
};

type Props = {
    profile: SellerProfileSummary | null;
    loading?: boolean;
    onRefresh?: (() => void | Promise<void>) | undefined;
    embedded?: boolean;
};

export function SellerAccountReviewDashboard({ profile, loading, onRefresh, embedded = false }: Props) {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const accountStatus = profile?.accountStatus;
    const isRejected = accountStatus?.approvalState === "rejected";
    const isPending = accountStatus?.approvalState === "pending_review";

    if (!isRejected && !isPending) return null;

    const statusTitle = accountStatus?.title ?? (isRejected ? "Rejected" : "Pending");
    const reviewHours = accountStatus?.reviewEstimateHours ?? 24;
    const estimateLabel =
        reviewHours >= 48 ? "24-48 hours" : reviewHours >= 24 ? "24-48 hours" : `${reviewHours} hours`;

    const goToProfile = () => {
        router.push({
            pathname: "/(main)/sellerpersonalinfo",
            params: buildOnboardingParams({
                fullName: profile?.fullName,
                email: profile?.email,
                mobile: profile?.mobile,
            }),
        });
    };

    const goToSupport = () => router.push("/(main)/helpsupport");
    const goToViewProfile = () => router.push("/(main)/Profile");

    const handleRefresh = async () => {
        if (!onRefresh || refreshing) return;
        setRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <ScrollView
            style={[styles.scroll, embedded && styles.scrollEmbedded]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
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
                    </View>
                    <View style={styles.heroActions}>
                        <View
                            style={[
                                styles.statusBadge,
                                isRejected ? styles.statusBadgeRejected : styles.statusBadgePending,
                            ]}
                        >
                            <MaterialCommunityIcons
                                name={isRejected ? "close-circle-outline" : "clock-outline"}
                                size={14}
                                color={isRejected ? C.red : C.amber}
                            />
                            <AppText
                                style={[
                                    styles.statusBadgeText,
                                    isRejected ? styles.statusBadgeTextRejected : styles.statusBadgeTextPending,
                                ]}
                            >
                                {statusTitle}
                            </AppText>
                        </View>
                        <TouchableOpacity
                            style={styles.refreshBtn}
                            onPress={handleRefresh}
                            disabled={refreshing || loading}
                            activeOpacity={0.85}
                        >
                            {refreshing || loading ? (
                                <ActivityIndicator size="small" color={C.white} />
                            ) : (
                                <MaterialCommunityIcons name="refresh" size={16} color={C.white} />
                            )}
                            <AppText style={styles.refreshBtnText}>Refresh</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {isPending ? (
                <View style={styles.reviewBanner}>
                    <View style={[styles.reviewBannerIcon, { backgroundColor: "#CCFBF1" }]}>
                        <MaterialCommunityIcons name="clock-outline" size={28} color={C.tealDark} />
                    </View>
                    <View style={styles.reviewBannerContent}>
                        <AppText style={styles.reviewBannerTitle}>Profile Under Review</AppText>
                        <AppText style={styles.reviewBannerMessage}>
                            Your seller profile has been submitted and is currently under review. Our admin team
                            will verify your details and approve your account soon.
                        </AppText>
                        <View style={styles.progressTrack}>
                            <View style={styles.progressFill} />
                        </View>
                        <AppText style={styles.estimateText}>
                            Estimated approval time: {estimateLabel}
                        </AppText>
                    </View>
                </View>
            ) : (
                <View style={styles.rejectBanner}>
                    <View style={[styles.reviewBannerIcon, { backgroundColor: "#FEE2E2" }]}>
                        <MaterialCommunityIcons name="close-circle" size={30} color={C.red} />
                    </View>
                    <View style={styles.reviewBannerContent}>
                        <AppText style={styles.rejectBannerTitle}>Application Rejected</AppText>
                        <AppText style={styles.rejectBannerMessage}>
                            We regret to inform you that your seller application has been rejected. If you believe
                            this is a mistake or would like to reapply with updated information, you can update
                            your profile and E-KYC or contact our support team.
                        </AppText>
                        {accountStatus?.rejectionReason ? (
                            <AppText style={styles.rejectReason}>
                                Reason: {accountStatus.rejectionReason}
                            </AppText>
                        ) : null}
                        <View style={styles.rejectActions}>
                            <Pressable style={styles.rejectBtnOrange} onPress={goToProfile}>
                                <MaterialCommunityIcons name="pencil-outline" size={16} color={C.white} />
                                <AppText style={styles.rejectBtnText}>Complete Profile Again</AppText>
                            </Pressable>
                            <Pressable style={styles.rejectBtnTeal} onPress={goToProfile}>
                                <MaterialCommunityIcons name="video-outline" size={16} color={C.white} />
                                <AppText style={styles.rejectBtnText}>Redo E-KYC Verification</AppText>
                            </Pressable>
                            <Pressable style={styles.rejectBtnSalmon} onPress={goToSupport}>
                                <MaterialCommunityIcons name="headset" size={16} color={C.white} />
                                <AppText style={styles.rejectBtnText}>Contact Support</AppText>
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}

            <View style={styles.accountCard}>
                <View style={[styles.accountShield, isRejected ? styles.accountShieldRejected : styles.accountShieldPending]}>
                    <MaterialCommunityIcons
                        name="shield-outline"
                        size={26}
                        color={isRejected ? C.textMid : C.brown}
                    />
                </View>
                <View style={styles.accountContent}>
                    <AppText style={styles.accountHeading}>
                        Account Status:{" "}
                        <AppText style={[styles.accountStatusWord, isRejected ? styles.textRejected : styles.textPending]}>
                            {statusTitle}
                        </AppText>
                    </AppText>
                    <AppText style={styles.accountMessage}>
                        {isRejected
                            ? "Your account application was rejected. Please contact support for assistance."
                            : "Your account is under review. Our team is verifying your documents."}
                    </AppText>
                    <View style={styles.pillRow}>
                        <View style={styles.pill}>
                            <MaterialCommunityIcons name="account-outline" size={13} color={C.textMid} />
                            <AppText style={styles.pillText}>
                                Profile: {accountStatus?.profileLabel ?? "Complete"}
                            </AppText>
                        </View>
                        <View style={styles.pill}>
                            <MaterialCommunityIcons name="map-marker-outline" size={13} color={C.textMid} />
                            <AppText style={styles.pillText}>KYC: {accountStatus?.kycLabel ?? "Pending"}</AppText>
                        </View>
                    </View>
                </View>
                {isPending ? (
                    <View style={styles.underReviewBtn}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color={C.white} />
                        <AppText style={styles.underReviewBtnText}>Under Review</AppText>
                    </View>
                ) : (
                    <Pressable style={styles.viewProfileBtn} onPress={goToViewProfile}>
                        <AppText style={styles.viewProfileBtnText}>View Profile</AppText>
                    </Pressable>
                )}
            </View>

            {isRejected ? (
                <Pressable style={styles.floatingSupport} onPress={goToSupport}>
                    <MaterialCommunityIcons name="headset" size={18} color={C.white} />
                    <AppText style={styles.floatingSupportText}>Contact Support</AppText>
                </Pressable>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.bg },
    scrollEmbedded: { backgroundColor: C.white },
    scrollContent: { paddingBottom: 40 },
    heroWrap: { marginBottom: 16 },
    heroBanner: {
        height: 120,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        overflow: "hidden",
        position: "relative",
    },
    heroOrb1: {
        position: "absolute",
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: "rgba(255,255,255,0.08)",
        top: -40,
        right: -30,
    },
    heroOrb2: {
        position: "absolute",
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(255,255,255,0.06)",
        bottom: -20,
        left: 40,
    },
    heroCard: {
        marginHorizontal: 16,
        marginTop: -36,
        backgroundColor: C.white,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        flexWrap: "wrap",
    },
    heroIconBox: {
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: "#FFF7ED",
        borderWidth: 1,
        borderColor: "#FED7AA",
        alignItems: "center",
        justifyContent: "center",
    },
    heroTextCol: { flex: 1, minWidth: 160 },
    heroTitle: {
        fontFamily: fontFamilies.bold,
        fontSize: 22,
        color: C.navy,
        marginBottom: 4,
    },
    breadcrumbRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    breadcrumbText: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight },
    breadcrumbSep: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight },
    breadcrumbActive: { fontFamily: fontFamilies.medium, fontSize: 12, color: C.textMid },
    heroActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginLeft: "auto",
        flexWrap: "wrap",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusBadgePending: { backgroundColor: C.amberPale, borderColor: C.amberBorder },
    statusBadgeRejected: { backgroundColor: C.redPale, borderColor: C.redBorder },
    statusBadgeText: { fontFamily: fontFamilies.semiBold, fontSize: 12 },
    statusBadgeTextPending: { color: C.amber },
    statusBadgeTextRejected: { color: C.red },
    refreshBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: C.orange,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    refreshBtnText: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.white },
    reviewBanner: {
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: C.tealPale,
        borderWidth: 1,
        borderColor: C.tealBorder,
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        gap: 14,
        alignItems: "flex-start",
    },
    rejectBanner: {
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: C.redPale,
        borderWidth: 1,
        borderColor: C.redBorder,
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        gap: 14,
        alignItems: "flex-start",
    },
    reviewBannerIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    reviewBannerContent: { flex: 1, gap: 8, minWidth: 0 },
    reviewBannerTitle: {
        fontFamily: fontFamilies.bold,
        fontSize: 17,
        color: C.tealDark,
    },
    reviewBannerMessage: {
        fontFamily: fontFamilies.regular,
        fontSize: 14,
        color: C.textMid,
        lineHeight: 21,
    },
    progressTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: "#D1FAE5",
        overflow: "hidden",
        marginTop: 4,
    },
    progressFill: {
        width: "62%",
        height: "100%",
        borderRadius: 4,
        backgroundColor: C.teal,
    },
    estimateText: {
        fontFamily: fontFamilies.medium,
        fontSize: 13,
        color: C.tealDark,
        marginTop: 2,
    },
    rejectBannerTitle: {
        fontFamily: fontFamilies.bold,
        fontSize: 17,
        color: C.red,
    },
    rejectBannerMessage: {
        fontFamily: fontFamilies.regular,
        fontSize: 14,
        color: "#7F1D1D",
        lineHeight: 21,
    },
    rejectReason: {
        fontFamily: fontFamilies.medium,
        fontSize: 13,
        color: C.red,
        lineHeight: 19,
    },
    rejectActions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 4,
    },
    rejectBtnOrange: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: C.orange,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    rejectBtnTeal: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: C.teal,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    rejectBtnSalmon: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#F87171",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    rejectBtnText: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    accountCard: {
        marginHorizontal: 16,
        backgroundColor: C.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    accountShield: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    accountShieldPending: { backgroundColor: C.brownPale },
    accountShieldRejected: { backgroundColor: "#F3F4F6" },
    accountContent: { flex: 1, minWidth: 200, gap: 6 },
    accountHeading: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 16,
        color: C.textDark,
    },
    accountStatusWord: { fontFamily: fontFamilies.bold },
    textPending: { color: C.amber },
    textRejected: { color: C.red },
    accountMessage: {
        fontFamily: fontFamilies.regular,
        fontSize: 13,
        color: C.textMid,
        lineHeight: 19,
    },
    pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    pillText: { fontFamily: fontFamilies.medium, fontSize: 12, color: C.textMid },
    underReviewBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: C.teal,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        flexShrink: 0,
    },
    underReviewBtnText: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.white },
    viewProfileBtn: {
        backgroundColor: C.navy,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        flexShrink: 0,
    },
    viewProfileBtnText: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.white },
    floatingSupport: {
        position: Platform.OS === "web" ? ("fixed" as any) : "absolute",
        right: 20,
        bottom: 24,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#F87171",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 28,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
        ...(Platform.OS === "web" ? { zIndex: 50 } : {}),
    },
    floatingSupportText: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.white },
});
