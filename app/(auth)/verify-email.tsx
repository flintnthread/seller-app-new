import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";
import {
    confirmEmailVerificationLink,
    resendEmailVerificationOtp,
    verifyEmailOtp,
} from "@/services/authApi";
import { ApiError } from "@/lib/api/client";

const REDIRECT_SECONDS = 3;

export default function VerifyEmailScreen() {
    const params = useLocalSearchParams<{ email?: string; token?: string }>();
    const router = useRouter();

    const token = useMemo(() => {
        const raw = params.token;
        return typeof raw === "string" ? raw.trim() : "";
    }, [params.token]);

    const [email, setEmail] = useState(() => {
        const raw = params.email;
        if (typeof raw !== "string" || !raw.trim()) return "";
        try {
            return decodeURIComponent(raw).trim().toLowerCase();
        } catch {
            return raw.trim().toLowerCase();
        }
    });

    const [otp, setOtp] = useState("");
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [resending, setResending] = useState(false);
    const [linkLoading, setLinkLoading] = useState(!!token);
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

    const goToLogin = useCallback(() => {
        router.replace({
            pathname: "/(auth)/login",
            params: {
                verified: "1",
                ...(email ? { email } : {}),
            },
        });
    }, [router, email]);

    useEffect(() => {
        if (!token) {
            setLinkLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            setLinkLoading(true);
            setMessage("");
            try {
                const result = await confirmEmailVerificationLink(token);
                if (cancelled) return;
                if (result.email) {
                    setEmail(result.email);
                }
                if (result.alreadyVerified) {
                    setSuccess(true);
                    setMessage(result.message);
                    return;
                }
                if (result.otpSent) {
                    setOtpSent(true);
                    setMessage(result.message);
                } else {
                    setMessage(result.message);
                }
            } catch (err) {
                if (!cancelled) {
                    setMessage(
                        err instanceof ApiError
                            ? err.message
                            : "Could not verify your email link."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLinkLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token]);

    useEffect(() => {
        if (!success) return;
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    goToLogin();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [success, goToLogin]);

    const handleVerify = async () => {
        if (!email) {
            setMessage("Missing email. Open the verification link from your email again.");
            return;
        }
        if (!otpSent && token) {
            setMessage("Please wait while we send your verification code…");
            return;
        }
        if (!otpSent && !token) {
            setMessage("Open the verification link in your signup email first.");
            return;
        }
        if (otp.trim().length < 6) {
            setMessage("Enter the 6-digit code from your email.");
            return;
        }
        setVerifying(true);
        setMessage("");
        try {
            const result = await verifyEmailOtp(email, otp.trim());
            setSuccess(result.verified);
            setMessage(result.message);
            if (result.verified) {
                setSuccess(true);
            }
        } catch (err) {
            setMessage(err instanceof ApiError ? err.message : "Verification failed.");
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!email) return;
        setResending(true);
        setMessage("");
        try {
            const result = await resendEmailVerificationOtp(email);
            setMessage(result);
            if (result.toLowerCase().includes("code has been sent")) {
                setOtpSent(true);
            }
        } catch (err) {
            setMessage(err instanceof ApiError ? err.message : "Could not resend.");
        } finally {
            setResending(false);
        }
    };

    if (!email && !token) {
        return (
            <View style={styles.container}>
                <AppText style={styles.title}>Invalid link</AppText>
                <AppText style={styles.message}>
                    Open the verification link from your email, or sign up again.
                </AppText>
                <TouchableOpacity style={styles.button} onPress={() => router.replace("/(auth)/signup")}>
                    <AppText style={styles.buttonText}>Go to signup</AppText>
                </TouchableOpacity>
            </View>
        );
    }

    if (linkLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <ActivityIndicator size="large" color="#F97316" />
                    <AppText style={[styles.subtitle, { marginTop: 16 }]}>
                        Verifying your email link…
                    </AppText>
                    <AppText style={styles.subtitle}>A 6-digit code will be sent to your inbox.</AppText>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <AppText style={styles.title}>Verify your email</AppText>
                {email ? (
                    <>
                        <AppText style={styles.subtitle}>
                            {otpSent
                                ? "Enter the 6-digit code sent to"
                                : "Complete verification for"}
                        </AppText>
                        <AppText style={styles.email}>{email}</AppText>
                    </>
                ) : null}

                {!success && otpSent ? (
                    <TextInput
                        style={styles.otpInput}
                        value={otp}
                        onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        keyboardType="number-pad"
                        maxLength={6}
                    />
                ) : null}

                {!success ? (
                    otpSent ? (
                        <TouchableOpacity
                            style={[styles.button, verifying && styles.buttonDisabled]}
                            onPress={handleVerify}
                            disabled={verifying || otp.length < 6}
                        >
                            {verifying ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <AppText style={styles.buttonText}>Verify email</AppText>
                            )}
                        </TouchableOpacity>
                    ) : null
                ) : (
                    <View style={styles.successBox}>
                        <AppText style={styles.successText}>{message}</AppText>
                        <AppText style={styles.redirectHint}>
                            {`Redirecting to login in ${countdown}s…`}
                        </AppText>
                        <TouchableOpacity style={styles.button} onPress={goToLogin}>
                            <AppText style={styles.buttonText}>Go to login now</AppText>
                        </TouchableOpacity>
                    </View>
                )}

                {message && !success ? (
                    <AppText style={styles.errorText}>{message}</AppText>
                ) : null}

                {!success && email ? (
                    <TouchableOpacity onPress={handleResend} disabled={resending}>
                        <AppText style={styles.link}>
                            {resending
                                ? "Sending…"
                                : otpSent
                                  ? "Resend verification code"
                                  : "Resend verification link"}
                        </AppText>
                    </TouchableOpacity>
                ) : null}
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
    title: {
        fontSize: 24,
        fontFamily: fontFamilies.bold,
        color: "#1E3A6E",
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 14,
        color: "#64748b",
        textAlign: "center",
    },
    email: {
        fontSize: 16,
        fontFamily: fontFamilies.bold,
        color: "#F97316",
        marginBottom: 20,
        textAlign: "center",
    },
    otpInput: {
        width: "100%",
        borderWidth: 2,
        borderColor: "#e2e8f0",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 22,
        letterSpacing: 8,
        textAlign: "center",
        fontFamily: fontFamilies.bold,
        marginBottom: 16,
    },
    button: {
        backgroundColor: "#F97316",
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 10,
        width: "100%",
        alignItems: "center",
        minHeight: 48,
        justifyContent: "center",
    },
    buttonDisabled: {
        opacity: 0.7,
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
    message: {
        fontSize: 15,
        color: "#374151",
        textAlign: "center",
        marginBottom: 16,
    },
    errorText: {
        marginTop: 12,
        color: "#E05A3A",
        fontSize: 13,
        textAlign: "center",
    },
    successBox: {
        width: "100%",
        alignItems: "center",
    },
    successText: {
        color: "#3D9E5A",
        fontSize: 15,
        textAlign: "center",
        fontFamily: fontFamilies.semiBold,
        marginBottom: 8,
    },
    redirectHint: {
        fontSize: 13,
        color: "#64748b",
        marginBottom: 16,
        textAlign: "center",
    },
});
