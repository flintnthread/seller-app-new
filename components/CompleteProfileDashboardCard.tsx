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

};



const PROFILE_STEPS = [

    { step: 1, label: "Personal information", icon: "account-outline" as const },

    { step: 2, label: "Business details & GST", icon: "store-outline" as const },

    { step: 3, label: "Address information", icon: "map-marker-outline" as const },

    { step: 4, label: "Banking details", icon: "bank-outline" as const },

    { step: 5, label: "Documents & submit", icon: "file-document-outline" as const },

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

            : "Complete these steps to submit your seller profile for verification.";



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



    return (

        <View style={embedded ? styles.wrapEmbedded : styles.wrap}>

            <LinearGradient

                colors={[C.navyDeep, C.navy]}

                start={{ x: 0, y: 0 }}

                end={{ x: 1, y: 1 }}

                style={styles.card}

            >

                <View style={styles.iconCircle}>

                    <MaterialCommunityIcons name="account-edit" size={36} color={C.orange} />

                </View>

                <AppText style={styles.title}>Complete Your Seller Profile</AppText>

                <AppText style={styles.message}>{message}</AppText>



                <View style={styles.stepsWrap}>

                    <AppText style={styles.stepsHeading}>Steps to complete</AppText>

                    {PROFILE_STEPS.map((item) => (

                        <View key={item.step} style={styles.stepRow}>

                            <View style={styles.stepBadge}>

                                <AppText style={styles.stepBadgeText}>{item.step}</AppText>

                            </View>

                            <MaterialCommunityIcons

                                name={item.icon}

                                size={18}

                                color="rgba(255,255,255,0.85)"

                            />

                            <AppText style={styles.stepLabel}>{item.label}</AppText>

                        </View>

                    ))}

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

        paddingHorizontal: 16,

        paddingTop: 4,

        paddingBottom: 8,

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

    card: {

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

        backgroundColor: "rgba(255,255,255,0.12)",

        alignItems: "center",

        justifyContent: "center",

        marginBottom: 20,

    },

    title: {

        fontFamily: fontFamilies.bold,

        fontSize: 22,

        color: C.white,

        textAlign: "center",

        marginBottom: 12,

    },

    message: {

        fontFamily: fontFamilies.regular,

        fontSize: 15,

        color: "rgba(255,255,255,0.78)",

        textAlign: "center",

        lineHeight: 23,

        marginBottom: 20,

        maxWidth: 420,

    },

    stepsWrap: {

        width: "100%",

        maxWidth: 420,

        marginBottom: 24,

        gap: 10,

    },

    stepsHeading: {

        fontFamily: fontFamilies.semiBold,

        fontSize: 12,

        color: "rgba(255,255,255,0.55)",

        textTransform: "uppercase",

        letterSpacing: 1,

        marginBottom: 4,

    },

    stepRow: {

        flexDirection: "row",

        alignItems: "center",

        gap: 10,

        backgroundColor: "rgba(255,255,255,0.08)",

        borderRadius: 10,

        paddingVertical: 10,

        paddingHorizontal: 12,

    },

    stepBadge: {

        width: 24,

        height: 24,

        borderRadius: 12,

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

        fontFamily: fontFamilies.medium,

        fontSize: 14,

        color: "rgba(255,255,255,0.92)",

    },

    cta: {

        borderRadius: 50,

        overflow: "hidden",

        width: "100%",

        maxWidth: 320,

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


