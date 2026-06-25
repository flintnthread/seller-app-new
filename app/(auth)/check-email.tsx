import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";
import { resendEmailVerificationOtp } from "@/services/authApi";
import { ApiError } from "@/lib/api/client";

export default function CheckEmailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email?: string }>();
    const [resending, setResending] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusIsError, setStatusIsError] = useState(false);
    const email =
        typeof params.email === "string" && params.email.trim()
            ? params.email.trim().toLowerCase()
            : "your email";

    const handleResend = async () => {
        if (!email || email === "your email") return;
        setResending(true);
        setStatusMessage("");
        setStatusIsError(false);
        try {
            const message = await resendEmailVerificationOtp(email);
            setStatusMessage(message);
            setStatusIsError(false);
        } catch (err) {
            setStatusMessage(
                err instanceof ApiError
                    ? err.message
                    : "Verification email could not be sent. Please try again later."
            );
            setStatusIsError(true);
        } finally {
            setResending(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.iconCircle}>
                    <AppText style={styles.iconText}>✉</AppText>
                </View>
                <AppText style={styles.title}>Check your email</AppText>
                <AppText style={styles.message}>
                    We sent a verification link to
                </AppText>
                <AppText style={styles.email}>{email}</AppText>
                <AppText style={styles.hint}>
                    Open your email and click &quot;Verify my email&quot;. You will receive a 6-digit code after
                    clicking the link. After verification, log in with your registered email and password.
                </AppText>
                <AppText style={styles.subHint}>
                    Did not receive it? Check spam folder or tap Resend link below.
                </AppText>
                {statusMessage ? (
                    <AppText
                        style={[
                            styles.statusMessage,
                            statusIsError ? styles.statusMessageError : styles.statusMessageSuccess,
                        ]}
                    >
                        {statusMessage}
                    </AppText>
                ) : null}
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.replace("/(auth)/login")}
                >
                    <AppText style={styles.secondaryButtonText}>Go to login</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleResend}
                    disabled={resending || email === "your email"}
                >
                    {resending ? (
                        <ActivityIndicator color="#376197" />
                    ) : (
                        <AppText style={styles.secondaryButtonText}>Resend verification link</AppText>
                    )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.replace("/(auth)/signup")}>
                    <AppText style={styles.link}>Back to signup</AppText>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1E3A6E",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    card: {
        width: "100%",
        maxWidth: 440,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 28,
        alignItems: "center",
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "rgba(249, 115, 22, 0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    iconText: {
        fontSize: 36,
    },
    title: {
        fontSize: 24,
        fontFamily: fontFamilies.bold,
        color: "#1E3A6E",
        marginBottom: 12,
        textAlign: "center",
    },
    message: {
        fontSize: 15,
        color: "#64748b",
        textAlign: "center",
        lineHeight: 22,
    },
    email: {
        fontSize: 16,
        fontFamily: fontFamilies.bold,
        color: "#F97316",
        marginTop: 6,
        marginBottom: 16,
        textAlign: "center",
    },
    hint: {
        fontSize: 14,
        color: "#374151",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 12,
    },
    bold: {
        fontFamily: fontFamilies.bold,
        color: "#1E3A6E",
    },
    subHint: {
        fontSize: 12,
        color: "#94a3b8",
        textAlign: "center",
        lineHeight: 18,
        marginBottom: 20,
    },
    statusMessage: {
        fontSize: 13,
        textAlign: "center",
        marginBottom: 12,
        fontFamily: fontFamilies.semiBold,
    },
    statusMessageSuccess: {
        color: "#3D9E5A",
    },
    statusMessageError: {
        color: "#DC2626",
    },
    secondaryButton: {
        marginTop: 12,
        paddingVertical: 10,
    },
    secondaryButtonText: {
        color: "#376197",
        fontSize: 14,
        fontFamily: fontFamilies.semiBold,
    },
    button: {
        backgroundColor: "#F97316",
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 10,
        width: "100%",
        alignItems: "center",
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontFamily: fontFamilies.bold,
    },
    link: {
        marginTop: 16,
        color: "#376197",
        fontSize: 14,
        fontFamily: fontFamilies.semiBold,
    },
});
