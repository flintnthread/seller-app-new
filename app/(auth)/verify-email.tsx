import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";
import { useResponsive } from "@/hooks/useResponsive";
import {
    confirmEmailVerificationLink,
    resendEmailVerificationOtp,
    verifyEmailOtp,
} from "@/services/authApi";
import { ApiError } from "@/lib/api/client";
import { useSweetAlert } from "@/components/common/SweetAlert";

const OTP_EXPIRY_MINUTES = 10;
const SUPPORT_EMAIL = "support@flintnthread.in";
const SUPPORT_PHONE = "+91 9063499092";

const C = {
    navy: "#1E3A6E",
    navyDeep: "#152D5A",
    orange: "#F97316",
    orangeDark: "#B45309",
};

function deriveDisplayName(email: string): string {
    if (!email.trim()) return "Seller";
    const local = email.split("@")[0] ?? "Seller";
    const first = local.split(/[._-]/)[0] ?? local;
    if (!first) return "Seller";
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function Highlight({ children }: { children: string }) {
    return <AppText style={styles.highlight}>{children}</AppText>;
}

function NeedHelpBox() {
    return (
        <View style={styles.helpBox}>
            {/* <AppText style={styles.helpTitle}>Need Help?</AppText>
            <AppText style={styles.helpText}>
                If you have any questions or need assistance, please contact our support team:
            </AppText>
            <AppText style={styles.helpLine}>
                <AppText style={styles.helpLabel}>Email: </AppText>
                <AppText style={styles.helpLink}>{SUPPORT_EMAIL}</AppText>
            </AppText>
            <AppText style={styles.helpLine}>
                <AppText style={styles.helpLabel}>Phone: </AppText>
                <AppText style={styles.helpText}>{SUPPORT_PHONE}</AppText>
            </AppText> */}
        </View>
    );
}

function EmailFooter() {
    const year = new Date().getFullYear();
    return (
        <View style={styles.footer}>
            {/* <AppText style={styles.footerText}>© {year} Flint & Thread. All rights reserved.</AppText>
            <AppText style={styles.footerMuted}>
                This is an automated message. Please do not reply to this email.
            </AppText> */}
        </View>
    );
}

export default function VerifyEmailScreen() {
    const params = useLocalSearchParams<{
        email?: string;
        token?: string;
        otpSent?: string;
        verified?: string;
        error?: string;
    }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDesktop } = useResponsive();
    const { showSuccess, showError, SweetAlertHost } = useSweetAlert();

    const token = useMemo(() => {
        const raw = params.token;
        return typeof raw === "string" ? raw.trim() : "";
    }, [params.token]);

    const initialOtpSent = useMemo(() => {
        const raw = params.otpSent;
        return raw === "1" || raw === "true";
    }, [params.otpSent]);

    const initialVerified = useMemo(() => {
        const raw = params.verified;
        return raw === "1" || raw === "true";
    }, [params.verified]);

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
    const [message, setMessage] = useState(() => {
        const raw = params.error;
        if (typeof raw !== "string" || !raw.trim()) return "";
        try {
            return decodeURIComponent(raw).trim();
        } catch {
            return raw.trim();
        }
    });
    const [success, setSuccess] = useState(initialVerified);
    const [verifying, setVerifying] = useState(false);
    const [resending, setResending] = useState(false);
    const [linkLoading, setLinkLoading] = useState(!!token);
    const [otpSent, setOtpSent] = useState(initialOtpSent);

    const displayName = useMemo(() => deriveDisplayName(email), [email]);

    const goToLogin = useCallback(() => {
        router.replace({
            pathname: "/(auth)/login",
            params: {
                verified: "1",
                ...(email ? { email } : {}),
            },
        });
    }, [router, email]);

    const completeVerification = useCallback(
        (resultMessage: string) => {
            setSuccess(true);
            setMessage(resultMessage);
            showSuccess(
                "You can now log in with your registered email and password.",
                "Email verified successfully"
            );
            setTimeout(() => {
                goToLogin();
            }, 2500);
        },
        [goToLogin, showSuccess]
    );

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
                    completeVerification(result.message);
                    return;
                }
                if (result.otpSent) {
                    setOtpSent(true);
                    setMessage("");
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
    }, [token, completeVerification]);

    useEffect(() => {
        if (initialVerified && email) {
            completeVerification("Your email is already verified. You can log in now.");
        }
    }, [initialVerified, email, completeVerification]);

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
            if (result.verified) {
                completeVerification(result.message);
            } else {
                setMessage(result.message);
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
            if (result.toLowerCase().includes("code has been sent") || result.toLowerCase().includes("sent")) {
                setOtpSent(true);
                setMessage("");
                showSuccess(result || "A new verification code has been sent to your email.", "OTP resent");
            } else {
                setMessage(result);
                showSuccess(result, "OTP resent");
            }
        } catch (err) {
            const msg =
                err instanceof ApiError
                    ? err.message
                    : "Verification email could not be sent. Please try again later.";
            setMessage(msg);
            showError(msg);
        } finally {
            setResending(false);
        }
    };

    const renderCard = (children: React.ReactNode) => (
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>{children}</View>
    );

    if (!email && !token) {
        return (
            <View style={styles.screen}>
                {renderCard(
                    <>
                        <AppText style={styles.greeting}>Hello,</AppText>
                        <AppText style={styles.bodyText}>
                            Open the verification link from your signup email, or register again to receive a
                            new one.
                        </AppText>
                        <TouchableOpacity style={styles.buttonWrap} onPress={() => router.replace("/(auth)/signup")}>
                            <LinearGradient
                                colors={[C.orange, C.orangeDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.button}
                            >
                                <AppText style={styles.buttonText}>Go to signup</AppText>
                            </LinearGradient>
                        </TouchableOpacity>
                        <NeedHelpBox />
                        <EmailFooter />
                    </>
                )}
            </View>
        );
    }

    if (linkLoading) {
        return (
            <View style={styles.screen}>
                {renderCard(
                    <>
                        <ActivityIndicator size="large" color={C.orange} />
                        <AppText style={[styles.greeting, { marginTop: 16 }]}>
                            Hello{displayName !== "Seller" ? ` ${displayName}` : ""},
                        </AppText>
                        <AppText style={styles.bodyText}>
                            We are verifying your email link and sending a 6-digit code to your inbox…
                        </AppText>
                    </>
                )}
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: Math.max(insets.top, 16),
                        paddingBottom: Math.max(insets.bottom, 24),
                    },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.logoWrap}>
                    <LinearGradient colors={[C.orange, C.navy]} style={styles.logoRing}>
                        <Image
                            source={require("../../assets/images/fav.png")}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </LinearGradient>
                </View>

                {renderCard(
                    <>
                        

                        {!success ? (
                            <>
                                <AppText style={styles.instruction}>
                                    Enter the 6-digit code we sent to your email:
                                </AppText>

                                {email ? (
                                    <AppText style={styles.emailHighlight}>{email}</AppText>
                                ) : null}

                                <TextInput
                                    style={[styles.otpInput, otp.length > 0 && styles.otpInputFilled]}
                                    value={otp}
                                    onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="Enter 6-digit code"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />

                                <TouchableOpacity
                                    style={styles.buttonWrap}
                                    onPress={handleVerify}
                                    disabled={verifying || otp.length < 6 || !otpSent}
                                >
                                    <LinearGradient
                                        colors={[C.orange, C.orangeDark]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[
                                            styles.button,
                                            (verifying || otp.length < 6 || !otpSent) && styles.buttonDisabled,
                                        ]}
                                    >
                                        {verifying ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <AppText style={styles.buttonText}>Verify Email Address</AppText>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                <AppText style={styles.importantText}>
                                    <AppText style={styles.importantLabel}>Important: </AppText>
                                    {`This verification code will expire in ${OTP_EXPIRY_MINUTES} minutes for security reasons.`}
                                </AppText>

                                {message ? <AppText style={styles.errorText}>{message}</AppText> : null}

                                {email ? (
                                    <TouchableOpacity onPress={handleResend} disabled={resending}>
                                        <AppText style={styles.resendLink}>
                                            {resending ? "Sending…" : "Resend verification code"}
                                        </AppText>
                                    </TouchableOpacity>
                                ) : null}
                            </>
                        ) : (
                            <View style={styles.successBox}>
                                <ActivityIndicator size="small" color={C.orange} />
                                <AppText style={styles.successText}>
                                    Email verified. Redirecting to login…
                                </AppText>
                            </View>
                        )}

                        <NeedHelpBox />
                        <EmailFooter />
                    </>
                )}
            </ScrollView>
            <SweetAlertHost />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#f3f4f6",
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        justifyContent: "center",
    },
    logoWrap: {
        alignItems: "center",
        marginBottom: 16,
    },
    logoRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        padding: 3,
    },
    logoImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#fff",
    },
    card: {
        width: "100%",
        maxWidth: 560,
        alignSelf: "center",
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 28,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        ...(Platform.OS === "web"
            ? ({ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" } as object)
            : {
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
              }),
    },
    cardDesktop: {
        padding: 32,
    },
    greeting: {
        fontSize: 22,
        fontFamily: fontFamilies.bold,
        color: "#111827",
        marginBottom: 14,
    },
    bodyText: {
        fontSize: 15,
        color: "#374151",
        lineHeight: 24,
        marginBottom: 16,
    },
    highlight: {
        backgroundColor: "#fef9c3",
        color: "#374151",
        fontSize: 15,
        lineHeight: 24,
    },
    instruction: {
        fontSize: 15,
        color: "#374151",
        lineHeight: 22,
        marginBottom: 12,
    },
    emailHighlight: {
        fontSize: 15,
        fontFamily: fontFamilies.bold,
        color: C.orange,
        marginBottom: 16,
        textAlign: "center",
    },
    otpInput: {
        width: "100%",
        borderWidth: 2,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 22,
        textAlign: "center",
        fontFamily: fontFamilies.bold,
        marginBottom: 20,
        color: "#111827",
        backgroundColor: "#f8fafc",
    },
    otpInputFilled: {
        letterSpacing: 8,
    },
    buttonWrap: {
        width: "100%",
        marginBottom: 20,
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 8,
        alignItems: "center",
        minHeight: 48,
        justifyContent: "center",
    },
    buttonDisabled: {
        opacity: 0.65,
    },
    buttonText: {
        color: "#ffffff",
        fontSize: 16,
        fontFamily: fontFamilies.bold,
    },
    importantText: {
        fontSize: 14,
        color: "#374151",
        lineHeight: 22,
        marginBottom: 12,
    },
    importantLabel: {
        fontFamily: fontFamilies.bold,
        color: "#111827",
    },
    errorText: {
        color: "#E05A3A",
        fontSize: 13,
        textAlign: "center",
        marginBottom: 12,
        lineHeight: 18,
    },
    resendLink: {
        color: "#376197",
        fontSize: 14,
        fontFamily: fontFamilies.semiBold,
        textAlign: "center",
        marginBottom: 8,
    },
    successBox: {
        width: "100%",
        alignItems: "center",
        marginBottom: 8,
        gap: 10,
        paddingVertical: 12,
    },
    successText: {
        color: "#3D9E5A",
        fontSize: 15,
        textAlign: "center",
        fontFamily: fontFamilies.semiBold,
        marginBottom: 8,
        lineHeight: 22,
    },
    redirectHint: {
        fontSize: 13,
        color: "#64748b",
        marginBottom: 16,
        textAlign: "center",
    },
    helpBox: {
        backgroundColor: "#eff6ff",
        borderLeftWidth: 4,
        borderLeftColor: C.navy,
        borderRadius: 8,
        padding: 16,
        marginTop: 20,
        marginBottom: 20,
    },
    helpTitle: {
        fontFamily: fontFamilies.bold,
        fontSize: 15,
        color: C.navy,
        marginBottom: 8,
    },
    helpText: {
        fontSize: 14,
        color: "#374151",
        lineHeight: 21,
    },
    helpLine: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 21,
    },
    helpLabel: {
        fontFamily: fontFamilies.bold,
        color: "#111827",
    },
    helpLink: {
        color: "#2563eb",
        fontFamily: fontFamilies.semiBold,
    },
    footer: {
        alignItems: "center",
        gap: 6,
    },
    footerText: {
        fontSize: 12,
        color: "#9ca3af",
        textAlign: "center",
    },
    footerMuted: {
        fontSize: 11,
        color: "#9ca3af",
        textAlign: "center",
        lineHeight: 16,
    },
});
