import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";

export type SellerAccountStatus = {
    status: string;
    approvalState: string;
    title: string;
    message: string;
    profileLabel: string;
    kycLabel: string;
    canManageProducts: boolean;
    canReceiveOrders: boolean;
    reviewEstimateHours?: number | null;
    rejectionReason?: string | null;
};

type Theme = {
    iconBg: string;
    iconColor: string;
    titleColor: string;
    borderColor: string;
    bg: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

function themeFor(state: string): Theme {
    switch (state) {
        case "approved":
            return {
                iconBg: "#DCFCE7",
                iconColor: "#16A34A",
                titleColor: "#16A34A",
                borderColor: "#BBF7D0",
                bg: "#F0FDF4",
                icon: "shield-check",
            };
        case "rejected":
            return {
                iconBg: "#FEE2E2",
                iconColor: "#DC2626",
                titleColor: "#DC2626",
                borderColor: "#FECACA",
                bg: "#FEF2F2",
                icon: "shield-alert",
            };
        case "pending_review":
            return {
                iconBg: "#FEF3C7",
                iconColor: "#D97706",
                titleColor: "#D97706",
                borderColor: "#FDE68A",
                bg: "#FFFBEB",
                icon: "shield-clock",
            };
        case "profile_incomplete":
            return {
                iconBg: "#E0E7FF",
                iconColor: "#4338CA",
                titleColor: "#4338CA",
                borderColor: "#C7D2FE",
                bg: "#EEF2FF",
                icon: "account-edit",
            };
        default:
            return {
                iconBg: "#FEF3C7",
                iconColor: "#D97706",
                titleColor: "#D97706",
                borderColor: "#FDE68A",
                bg: "#FFFBEB",
                icon: "shield-clock",
            };
    }
}

type Props = {
    accountStatus: SellerAccountStatus | null | undefined;
    loading?: boolean;
    /** Compact inline strip for below profile on dashboard */
    compact?: boolean;
};

export function AccountStatusBanner({ accountStatus, loading, compact = false }: Props) {
    const router = useRouter();

    if (loading) {
        if (compact) {
            return (
                <View style={[styles.compactCard, styles.compactLoading]}>
                    <AppText style={styles.compactLoadingText}>Checking account status…</AppText>
                </View>
            );
        }
        return (
            <View style={[styles.card, styles.loadingCard]}>
                <AppText style={styles.loadingText}>Loading account status…</AppText>
            </View>
        );
    }

    if (!accountStatus || accountStatus.approvalState === "approved") {
        return null;
    }

    const theme = themeFor(accountStatus.approvalState);

    if (compact) {
        return (
            <Pressable
                style={[styles.compactCard, { backgroundColor: theme.bg, borderColor: theme.borderColor }]}
                onPress={() => router.push("/(main)/Profile")}
            >
                <View style={[styles.compactIcon, { backgroundColor: theme.iconBg }]}>
                    <MaterialCommunityIcons name={theme.icon} size={18} color={theme.iconColor} />
                </View>
                <View style={styles.compactContent}>
                    <AppText style={styles.compactTitle} numberOfLines={1}>
                        Account: <AppText style={{ color: theme.titleColor }}>{accountStatus.title}</AppText>
                    </AppText>
                    <AppText style={styles.compactMessage} numberOfLines={2}>
                        {accountStatus.message}
                    </AppText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.titleColor} />
            </Pressable>
        );
    }

    return (
        <View style={[styles.card, { borderColor: theme.borderColor }]}>
            <View style={[styles.iconCircle, { backgroundColor: theme.iconBg }]}>
                <MaterialCommunityIcons name={theme.icon} size={28} color={theme.iconColor} />
            </View>

            <View style={styles.content}>
                <AppText style={styles.heading}>
                    Account Status:{" "}
                    <AppText style={[styles.statusTitle, { color: theme.titleColor }]}>
                        {accountStatus.title}
                    </AppText>
                </AppText>
                <AppText style={styles.message}>{accountStatus.message}</AppText>

                {accountStatus.rejectionReason ? (
                    <AppText style={styles.reason}>Reason: {accountStatus.rejectionReason}</AppText>
                ) : null}
            </View>

            <Pressable
                style={({ hovered }) => [styles.actionBtn, hovered && styles.actionBtnHover]}
                onPress={() => router.push("/(main)/Profile")}
            >
                <MaterialCommunityIcons name="account-circle-outline" size={18} color="#FFFFFF" />
                <AppText style={styles.actionBtnText}>View Profile</AppText>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 20,
        marginBottom: 20,
        gap: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        flexWrap: "wrap",
    },
    compactCard: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
        marginTop: 10,
    },
    compactLoading: {
        backgroundColor: "#F9FAFB",
        borderColor: "#E5E7EB",
        justifyContent: "center",
    },
    compactLoadingText: {
        fontFamily: fontFamilies.medium,
        fontSize: 12,
        color: "#6B7280",
        flex: 1,
        textAlign: "center",
    },
    compactIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
    },
    compactContent: { flex: 1, gap: 2 },
    compactTitle: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 13,
        color: "#111827",
    },
    compactMessage: {
        fontFamily: fontFamilies.regular,
        fontSize: 12,
        color: "#6B7280",
        lineHeight: 17,
    },
    loadingCard: {
        justifyContent: "center",
        minHeight: 88,
    },
    loadingText: {
        fontFamily: fontFamilies.medium,
        fontSize: 14,
        color: "#6B7280",
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    content: {
        flex: 1,
        minWidth: 220,
        gap: 6,
    },
    heading: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 16,
        color: "#111827",
    },
    statusTitle: {
        fontFamily: fontFamilies.bold,
    },
    message: {
        fontFamily: fontFamilies.regular,
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 21,
    },
    reason: {
        fontFamily: fontFamilies.medium,
        fontSize: 13,
        color: "#DC2626",
        lineHeight: 19,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#92400E",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        flexShrink: 0,
    },
    actionBtnHover: {
        opacity: 0.92,
    },
    actionBtnText: {
        fontFamily: fontFamilies.bold,
        fontSize: 14,
        color: "#FFFFFF",
    },
});
