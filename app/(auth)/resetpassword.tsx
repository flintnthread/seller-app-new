import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import {
    resetPasswordWithToken,
    validatePasswordResetToken,
} from "@/services/authApi";

const C = {
    navyDeep: "#152D5A",
    orange: "#F97316",
    orangeLight: "#FB923C",
};

export default function ResetPasswordScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDesktop } = useResponsive();
    const { showSuccess, showError, SweetAlertHost } = useSweetAlert();
    const params = useLocalSearchParams<{ token?: string | string[] }>();

    const tokenParam = params.token;
    const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam ?? "";

    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [emailHint, setEmailHint] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fieldError, setFieldError] = useState("");

    useEffect(() => {
        if (!token) {
            setValidating(false);
            setTokenValid(false);
            return;
        }

        let cancelled = false;
        void (async () => {
            try {
                const result = await validatePasswordResetToken(token);
                if (cancelled) return;
                setTokenValid(result.valid);
                setEmailHint(result.emailHint ?? "");
                if (!result.valid) {
                    setFieldError(result.message);
                }
            } catch (e) {
                if (cancelled) return;
                setTokenValid(false);
                setFieldError(
                    e instanceof ApiError ? e.message : "Could not validate reset link."
                );
            } finally {
                if (!cancelled) setValidating(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token]);

    const handleReset = async () => {
        setFieldError("");
        if (!newPassword.trim() || !confirmPassword.trim()) {
            setFieldError("Please fill in both password fields.");
            return;
        }
        if (newPassword.length < 8) {
            setFieldError("Password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setFieldError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const message = await resetPasswordWithToken(token, newPassword, confirmPassword);
            showSuccess(message, "Password updated");
            router.replace("/(auth)/login");
        } catch (e) {
            showError(
                e instanceof ApiError ? e.message : "Could not reset password. Please try again."
            );
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
                    Set new password
                </AppText>
                <AppText style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>
                    {emailHint
                        ? `Create a new password for ${emailHint}`
                        : "Choose a strong password for your seller account"}
                </AppText>
            </View>

            {validating ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={C.orange} />
                    <AppText style={styles.helper}>Validating your reset link…</AppText>
                </View>
            ) : !tokenValid ? (
                <View style={styles.centerBox}>
                    <MaterialIcons name="link-off" size={40} color="#ef4444" />
                    <AppText style={styles.errorText}>
                        {fieldError || "This reset link is invalid or has expired."}
                    </AppText>
                    <Pressable
                        style={styles.secondaryBtn}
                        onPress={() => router.replace("/(auth)/forgotpassword")}
                    >
                        <AppText style={styles.secondaryBtnTxt}>Request new link</AppText>
                    </Pressable>
                </View>
            ) : (
                <>
                    <AppText style={styles.label}>New password</AppText>
                    <View style={styles.inputRow}>
                        <MaterialIcons name="lock-outline" size={20} color="#64748b" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter new password"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry={!showPassword}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            editable={!loading}
                        />
                        <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
                            <MaterialIcons
                                name={showPassword ? "visibility" : "visibility-off"}
                                size={20}
                                color="#64748b"
                            />
                        </Pressable>
                    </View>

                    <AppText style={[styles.label, { marginTop: 12 }]}>Confirm password</AppText>
                    <View style={styles.inputRow}>
                        <MaterialIcons name="lock-outline" size={20} color="#64748b" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm new password"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry={!showPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            editable={!loading}
                        />
                    </View>

                    {fieldError ? <AppText style={styles.errorText}>{fieldError}</AppText> : null}

                    <Pressable
                        style={[styles.primaryBtn, loading && { opacity: 0.8 }]}
                        onPress={() => void handleReset()}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <AppText style={styles.primaryBtnTxt}>Update password</AppText>
                        )}
                    </Pressable>
                </>
            )}

            <Pressable style={styles.backBtn} onPress={() => router.replace("/(auth)/login")}>
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
        paddingHorizontal: 12,
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
        marginBottom: 8,
    },
    icon: { marginRight: 10 },
    input: { flex: 1, fontSize: 15, color: "#111827", paddingVertical: 10 },
    eyeBtn: { padding: 6 },
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
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: C.orange,
    },
    secondaryBtnTxt: { color: "#fff", fontFamily: fontFamilies.bold, fontSize: 14 },
    errorText: {
        color: "#dc2626",
        fontSize: 14,
        textAlign: "center",
        marginTop: 12,
        lineHeight: 20,
    },
    helper: { color: "#64748b", marginTop: 12, textAlign: "center" },
    centerBox: { alignItems: "center", paddingVertical: 24 },
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
