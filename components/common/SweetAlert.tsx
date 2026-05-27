import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useResponsive } from "@/hooks/useResponsive";

const ORANGE = "#F28520";

type ToastVariant = "success" | "error" | "warning";

type ToastState = {
    visible: boolean;
    title: string;
    message: string;
    variant: ToastVariant;
};

type DialogState = {
    visible: boolean;
    kind: "confirm" | "info";
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    destructive: boolean;
    resolve?: ((value: boolean) => void) | undefined;
};

const TOAST_COLORS: Record<
    ToastVariant,
    { border: string; iconBg: string; icon: string; title: string; bar: string }
> = {
    success: {
        border: "#16A34A",
        iconBg: "#DCFCE7",
        icon: "#16A34A",
        title: "#15803D",
        bar: "#16A34A",
    },
    error: {
        border: "#DC2626",
        iconBg: "#FEE2E2",
        icon: "#DC2626",
        title: "#B91C1C",
        bar: "#DC2626",
    },
    warning: {
        border: "#F59E0B",
        iconBg: "#FEF3C7",
        icon: "#D97706",
        title: "#B45309",
        bar: "#F59E0B",
    },
};

function SweetAlertToast({
    state,
    onHide,
}: {
    state: ToastState;
    onHide: () => void;
}) {
    const translateX = useRef(new Animated.Value(400)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const progressWidth = useRef(new Animated.Value(100)).current;
    const colors = TOAST_COLORS[state.variant];

    useEffect(() => {
        if (!state.visible) return;

        translateX.setValue(400);
        opacity.setValue(0);
        progressWidth.setValue(100);

        Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();

        Animated.timing(progressWidth, { toValue: 0, duration: 4000, useNativeDriver: false }).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(translateX, { toValue: -400, duration: 350, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
            ]).start(() => onHide());
        }, 4000);

        return () => clearTimeout(timer);
    }, [state.visible, state.message]);

    if (!state.visible) return null;

    const iconName =
        state.variant === "success"
            ? "checkmark"
            : state.variant === "error"
              ? "close"
              : "alert";

    const progressInterpolate = progressWidth.interpolate({
        inputRange: [0, 100],
        outputRange: ["0%", "100%"],
    });

    return (
        <View style={toastStyles.wrapper} pointerEvents="none">
            <Animated.View
                style={[
                    toastStyles.container,
                    { borderLeftColor: colors.border, opacity, transform: [{ translateX }] },
                ]}
            >
                <View style={[toastStyles.iconCircle, { backgroundColor: colors.iconBg }]}>
                    <View style={[toastStyles.iconInner, { backgroundColor: colors.icon }]}>
                        <Ionicons name={iconName} size={20} color="#FFFFFF" />
                    </View>
                </View>
                <View style={toastStyles.textBlock}>
                    <Text style={[toastStyles.title, { color: colors.title }]}>{state.title}</Text>
                    <Text style={toastStyles.message}>{state.message}</Text>
                </View>
                <Animated.View
                    style={[toastStyles.progressBar, { width: progressInterpolate, backgroundColor: colors.bar }]}
                />
            </Animated.View>
        </View>
    );
}

function SweetAlertDialog({
    state,
    onClose,
}: {
    state: DialogState;
    onClose: (confirmed: boolean) => void;
}) {
    const { isDesktop } = useResponsive();
    const scale = useRef(new Animated.Value(0.9)).current;
    const fade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (state.visible) {
            scale.setValue(0.9);
            fade.setValue(0);
            Animated.parallel([
                Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
                Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [state.visible]);

    const isDelete = state.destructive;
    const iconColor = isDelete ? "#DC2626" : "#376197";
    const iconBg = isDelete ? "#FEE2E2" : "#DBEAFE";

    return (
        <Modal visible={state.visible} transparent animationType="none" onRequestClose={() => onClose(false)}>
            <View style={dialogStyles.root}>
                <Pressable style={dialogStyles.overlayBg} onPress={() => onClose(false)} />
                <Animated.View
                    style={[
                        dialogStyles.card,
                        isDesktop && dialogStyles.cardDesktop,
                        { opacity: fade, transform: [{ scale }] },
                    ]}
                >
                    <View style={[dialogStyles.iconWrap, { backgroundColor: iconBg }]}>
                        <MaterialCommunityIcons
                            name={isDelete ? "trash-can-outline" : "information-outline"}
                            size={28}
                            color={iconColor}
                        />
                    </View>
                    <Text style={dialogStyles.title}>{state.title}</Text>
                    <Text style={dialogStyles.message}>{state.message}</Text>
                    <View style={dialogStyles.actions}>
                        {state.kind === "confirm" && (
                            <TouchableOpacity
                                style={dialogStyles.cancelBtn}
                                onPress={() => onClose(false)}
                                activeOpacity={0.85}
                            >
                                <Text style={dialogStyles.cancelTxt}>{state.cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                dialogStyles.confirmBtn,
                                isDelete ? dialogStyles.confirmDanger : dialogStyles.confirmPrimary,
                                state.kind === "info" && dialogStyles.confirmFull,
                            ]}
                            onPress={() => onClose(true)}
                            activeOpacity={0.85}
                        >
                            <Text style={dialogStyles.confirmTxt}>{state.confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

export function useSweetAlert() {
    const [toast, setToast] = useState<ToastState>({
        visible: false,
        title: "",
        message: "",
        variant: "success",
    });

    const [dialog, setDialog] = useState<DialogState>({
        visible: false,
        kind: "confirm",
        title: "",
        message: "",
        confirmText: "OK",
        cancelText: "Cancel",
        destructive: false,
    });

    const hideToast = useCallback(() => {
        setToast((t) => ({ ...t, visible: false }));
    }, []);

    const showToast = useCallback((title: string, message: string, variant: ToastVariant) => {
        setToast({ visible: true, title, message, variant });
    }, []);

    const showSuccess = useCallback(
        (message: string, title = "Success!") => showToast(title, message, "success"),
        [showToast]
    );

    const showError = useCallback(
        (message: string, title = "Error") => showToast(title, message, "error"),
        [showToast]
    );

    const showWarning = useCallback(
        (message: string, title = "Warning") => showToast(title, message, "warning"),
        [showToast]
    );

    const closeDialog = useCallback((confirmed: boolean) => {
        setDialog((d) => {
            d.resolve?.(confirmed);
            const next = { ...d, visible: false };
            delete (next as { resolve?: (v: boolean) => void }).resolve;
            return next;
        });
    }, []);

    const showInfo = useCallback((title: string, message: string) => {
        return new Promise<void>((resolve) => {
            setDialog({
                visible: true,
                kind: "info",
                title,
                message,
                confirmText: "OK",
                cancelText: "Cancel",
                destructive: false,
                resolve: () => resolve(),
            });
        });
    }, []);

    const confirmDelete = useCallback((title: string, message: string) => {
        return new Promise<boolean>((resolve) => {
            setDialog({
                visible: true,
                kind: "confirm",
                title,
                message,
                confirmText: "Delete",
                cancelText: "Cancel",
                destructive: true,
                resolve,
            });
        });
    }, []);

    const confirmAction = useCallback(
        (title: string, message: string, confirmText = "Confirm") => {
            return new Promise<boolean>((resolve) => {
                setDialog({
                    visible: true,
                    kind: "confirm",
                    title,
                    message,
                    confirmText,
                    cancelText: "Cancel",
                    destructive: false,
                    resolve,
                });
            });
        },
        []
    );

    const SweetAlertHost = useCallback(
        () => (
            <>
                <SweetAlertToast state={toast} onHide={hideToast} />
                <SweetAlertDialog state={dialog} onClose={closeDialog} />
            </>
        ),
        [toast, dialog, hideToast, closeDialog]
    );

    return {
        showSuccess,
        showError,
        showWarning,
        showInfo,
        confirmDelete,
        confirmAction,
        SweetAlertHost,
    };
}

const toastStyles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        top: 56,
        right: 16,
        left: 16,
        zIndex: 99999,
        alignItems: "flex-end",
        pointerEvents: "none",
    },
    container: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderLeftWidth: 5,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        maxWidth: 380,
        width: "100%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 12,
        overflow: "hidden",
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    iconInner: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
    },
    textBlock: { flex: 1 },
    title: { fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 2 },
    message: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#374151",
        lineHeight: 18,
    },
    progressBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        height: 4,
        borderBottomLeftRadius: 14,
    },
});

const dialogStyles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    overlayBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
        zIndex: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 16,
    },
    cardDesktop: { maxWidth: 420 },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    title: {
        fontFamily: "Outfit_700Bold",
        fontSize: 20,
        color: "#111827",
        textAlign: "center",
        marginBottom: 8,
    },
    message: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 21,
        marginBottom: 24,
    },
    actions: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
    },
    cancelTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 15,
        color: "#374151",
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
    confirmFull: { flex: 1 },
    confirmPrimary: { backgroundColor: "#376197" },
    confirmDanger: { backgroundColor: "#DC2626" },
    confirmTxt: {
        fontFamily: "Outfit_700Bold",
        fontSize: 15,
        color: "#FFFFFF",
    },
});
