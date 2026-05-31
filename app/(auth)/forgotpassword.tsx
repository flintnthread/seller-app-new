import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { useSweetAlert } from "@/components/common/SweetAlert";
import { fontFamilies } from "@/constants/fonts";
import { useResponsive } from "@/hooks/useResponsive";
import { ApiError } from "@/lib/api/client";
import { requestPasswordReset } from "@/services/authApi";

const C = {
    navyDeep: "#152D5A",
    orange: "#F97316",
    orangeLight: "#FB923C",
};

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email?: string }>();
    const insets = useSafeAreaInsets();
    const { isDesktop } = useResponsive();
    const { showSuccess, showError, showWarning, SweetAlertHost } = useSweetAlert();

    const [email, setEmail] = useState(() => {
        const raw = params.email;
        return typeof raw === "string" && raw.includes("@") ? raw.trim() : "";
    });
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fieldError, setFieldError] = useState("");

    const handleSendLink = async () => {
        const value = email.trim();
        if (!value) {
            setFieldError("Email is required");
            return;
        }
        if (!EMAIL_REGEX.test(value)) {
            setFieldError("Enter a valid registered email address");
            return;
        }

        setFieldError("");
        setLoading(true);
        try {
            const message = await requestPasswordReset(value);
            setSent(true);
            showSuccess(message, "Reset link sent");
        } catch (e) {
            const message =
                e instanceof ApiError
                    ? e.message
                    : e instanceof Error
                      ? e.message
                      : "Could not send reset link. Please try again.";
            if (e instanceof ApiError && e.status === 404) {
                showWarning(message, "Account not found");
            } else if (e instanceof ApiError && e.status === 403) {
                showWarning(message, "Cannot reset password");
            } else {
                showError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const formBody = (
        <>
            <View style={[styles.header, isDesktop && styles.headerDesktop]}>
                {isDesktop ? (
                    <LinearGradient
                        colors={[C.orange, "#1E3A6E"]}
                        style={styles.logoDesktop}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Image
                            source={require("../../assets/images/fav.png")}
                            style={styles.logoImgDesktop}
                            resizeMode="contain"
                        />
                    </LinearGradient>
                ) : (
                    <LinearGradient
                        colors={["#e96f43", "#376197"]}
                        style={styles.logoMobile}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    >
                        <Image
                            source={require("../../assets/images/fav.png")}
                            style={styles.logoImgMobile}
                            resizeMode="contain"
                        />
                    </LinearGradient>
                )}

                <AppText style={[styles.title, isDesktop && styles.titleDesktop]}>
                    Forgot password?
                </AppText>
                <AppText style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>
                    {sent
                        ? "A reset link has been sent to your registered seller email. Check your inbox and spam folder."
                        : "Enter the email address you used during seller registration. Password reset works only for registered seller accounts."}
                </AppText>
            </View>

            {!sent ? (
                <>
                    <AppText style={styles.label}>Email address</AppText>
                    <View style={[styles.inputRow, fieldError ? styles.inputRowError : null]}>
                        <MaterialIcons
                            name="mail-outline"
                            size={20}
                            color={fieldError ? "#ef4444" : "#64748b"}
                            style={styles.icon}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your registered email"
                            placeholderTextColor="#9ca3af"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={(t) => {
                                setEmail(t);
                                if (fieldError) setFieldError("");
                            }}
                            editable={!loading}
                        />
                    </View>
                    {fieldError ? <AppText style={styles.errorText}>{fieldError}</AppText> : null}

                    <Pressable
                        style={[styles.primaryBtn, loading && { opacity: 0.8 }]}
                        onPress={() => void handleSendLink()}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <AppText style={styles.primaryBtnTxt}>Send reset link</AppText>
                        )}
                    </Pressable>
                </>
            ) : (
                <View style={styles.sentBox}>
                    <MaterialIcons name="mark-email-read" size={48} color={C.orange} />
                    <AppText style={styles.sentTitle}>Email sent</AppText>
                    <AppText style={styles.sentSub}>
                        Open the link in your email to set a new password. The link expires in 1 hour.
                    </AppText>
                    <Pressable
                        style={styles.secondaryBtn}
                        onPress={() => {
                            setSent(false);
                            setEmail("");
                        }}
                    >
                        <AppText style={styles.secondaryBtnTxt}>Send again</AppText>
                    </Pressable>
                </View>
            )}

            <Pressable style={styles.backBtn} onPress={() => router.back()}>
                <MaterialIcons name="arrow-back-ios" size={16} color={isDesktop ? C.orange : "#1e293b"} />
                <AppText style={[styles.backTxt, isDesktop && styles.backTxtDesktop]}>Back to login</AppText>
            </Pressable>
        </>
    );

    return (
        <>
            <View style={styles.root}>
                {isDesktop ? (
                    <LinearGradient
                        colors={[C.navyDeep, "#1d3258", "#241566"]}
                        style={StyleSheet.absoluteFill}
                    />
                ) : (
                    <Image
                        source={require("../../assets/images/background.png")}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                    />
                )}

                <View style={[styles.safe, !isDesktop && { paddingTop: insets.top }]}>
                    {isDesktop ? (
                        <ScrollView
                            contentContainerStyle={[
                                styles.desktopScroll,
                                {
                                    paddingTop: Math.max(insets.top, 24),
                                    paddingBottom: Math.max(insets.bottom, 32),
                                },
                            ]}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.cardDesktop}>{formBody}</View>
                        </ScrollView>
                    ) : (
                        <KeyboardAvoidingView
                            style={{ flex: 1 }}
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                        >
                            <ScrollView
                                contentContainerStyle={[
                                    styles.mobileScroll,
                                    { paddingBottom: Math.max(insets.bottom, 40) },
                                ]}
                                keyboardShouldPersistTaps="handled"
                            >
                                {formBody}
                            </ScrollView>
                        </KeyboardAvoidingView>
                    )}
                </View>
            </View>
            <SweetAlertHost />
        </>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    desktopScroll: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    cardDesktop: {
        width: "100%",
        maxWidth: 460,
        backgroundColor: "#fff",
        borderRadius: 28,
        paddingHorizontal: 40,
        paddingVertical: 36,
    },
    mobileScroll: { paddingHorizontal: 26, paddingTop: 48 },
    header: { alignItems: "center", marginBottom: 24 },
    headerDesktop: { marginBottom: 28 },
    logoMobile: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    logoDesktop: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    logoImgMobile: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#fff" },
    logoImgDesktop: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#fff" },
    title: {
        fontSize: 28,
        fontFamily: fontFamilies.bold,
        color: "#0f172a",
        textAlign: "center",
    },
    titleDesktop: { color: C.navyDeep },
    subtitle: {
        fontSize: 14,
        color: "#94a3b8",
        textAlign: "center",
        marginTop: 8,
        fontFamily: fontFamilies.semiBold,
        lineHeight: 20,
        paddingHorizontal: 8,
    },
    subtitleDesktop: { color: "#64748b", maxWidth: 360 },
    label: {
        fontSize: 14,
        color: "#64748b",
        fontFamily: fontFamilies.semiBold,
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12,
        paddingHorizontal: 14,
        minHeight: 52,
        backgroundColor: "#fff",
        marginBottom: 6,
    },
    inputRowError: { borderColor: "#ef4444", borderWidth: 2 },
    icon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, color: "#111827", paddingVertical: 10 },
    primaryBtn: {
        marginTop: 20,
        backgroundColor: "#376197",
        borderRadius: 12,
        minHeight: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryBtnTxt: {
        color: "#fff",
        fontFamily: fontFamilies.bold,
        fontSize: 16,
    },
    secondaryBtn: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: C.orange,
    },
    secondaryBtnTxt: { color: "#fff", fontFamily: fontFamilies.bold, fontSize: 14 },
    errorText: { color: "#dc2626", fontSize: 13, marginBottom: 8 },
    sentBox: { alignItems: "center", paddingVertical: 12 },
    sentTitle: {
        fontFamily: fontFamilies.bold,
        fontSize: 20,
        color: "#111827",
        marginTop: 12,
    },
    sentSub: {
        fontFamily: fontFamilies.regular,
        fontSize: 14,
        color: "#64748b",
        textAlign: "center",
        marginTop: 8,
        lineHeight: 20,
        maxWidth: 320,
    },
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 28,
        gap: 4,
    },
    backTxt: { fontFamily: fontFamilies.bold, color: "#1e293b", fontSize: 15 },
    backTxtDesktop: { color: C.orange },
});
