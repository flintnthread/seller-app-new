import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    StatusBar,
    Platform,
    ActivityIndicator,
} from "react-native";
import { AppHeader } from "@/components/common/AppHeader";
import { useSweetAlert } from "@/components/common/SweetAlert";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    useFonts,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { useResponsive } from "@/hooks/useResponsive";
import { ORANGE_BRAND } from "./catalogConfig";
import {
    createCategoryRequest,
    fetchCategoryRequests,
} from "@/services/categoryRequestApi";

export type CategoryRequestStatus = "Pending" | "Approved" | "Rejected";

export type CategoryRequestRecord = {
    id: string;
    categoryName: string;
    description: string;
    reason: string;
    status: CategoryRequestStatus;
    submittedAt: string;
};

const GUIDELINES = [
    "Be specific with category name",
    "Provide clear description",
    "Explain business justification",
    "Review time: 2-3 business days",
];

const statusStyle = (status: CategoryRequestStatus) => {
    if (status === "Approved") return { bg: "#DCFCE7", color: "#16A34A" };
    if (status === "Rejected") return { bg: "#FEE2E2", color: "#DC2626" };
    return { bg: "#FEF3C7", color: "#D97706" };
};

export function CategoryRequestScreen() {
    const { isWeb, isDesktop } = useResponsive();
    const { showSuccess, showError, showWarning, confirmAction, SweetAlertHost } = useSweetAlert();

    const [categoryName, setCategoryName] = useState("");
    const [description, setDescription] = useState("");
    const [reason, setReason] = useState("");
    const [nameError, setNameError] = useState("");
    const [requests, setRequests] = useState<CategoryRequestRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [fontsLoaded] = useFonts({
        Outfit_400Regular,
        Outfit_500Medium,
        Outfit_600SemiBold,
        Outfit_700Bold,
    });

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const rows = await fetchCategoryRequests();
            setRequests(rows);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Could not load your requests.";
            setLoadError(msg);
            showError(msg);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        void loadRequests();
    }, [loadRequests]);

    const isFormDirty =
        categoryName.trim().length > 0 ||
        description.trim().length > 0 ||
        reason.trim().length > 0;

    const resetForm = () => {
        setCategoryName("");
        setDescription("");
        setReason("");
        setNameError("");
    };

    const handleReset = async () => {
        if (!isFormDirty) return;
        const confirmed = await confirmAction(
            "Reset form?",
            "Clear all fields? Your entered text will be lost.",
            "Reset"
        );
        if (confirmed) resetForm();
    };

    const handleSubmit = async () => {
        const name = categoryName.trim();
        if (!name) {
            setNameError("Category name is required");
            showWarning("Please enter a category name.", "Required field");
            return;
        }
        setNameError("");

        const confirmed = await confirmAction(
            "Submit request?",
            `Submit a category request for "${name}"? Our team will review it within 2–3 business days.`,
            "Submit"
        );
        if (!confirmed) return;

        setSubmitting(true);
        try {
            const created = await createCategoryRequest({
                categoryName: name,
                description: description.trim(),
                reason: reason.trim(),
            });
            setRequests((prev) => [created, ...prev]);
            resetForm();
            showSuccess(
                "Your category request has been submitted. You will be notified once it is reviewed.",
                "Request submitted!"
            );
        } catch (e) {
            showError(e instanceof Error ? e.message : "Could not submit your request.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!fontsLoaded) return null;

    const formCard = (
        <View style={pg.card}>
            <Text style={pg.cardTitle}>Submit Category Request</Text>

            <View style={pg.field}>
                <Text style={pg.label}>
                    Category Name <Text style={pg.required}>*</Text>
                </Text>
                <TextInput
                    style={[pg.input, nameError ? pg.inputError : null]}
                    placeholder="e.g., Smart Home Devices, Organic Foods, etc."
                    placeholderTextColor="#9CA3AF"
                    value={categoryName}
                    onChangeText={(t) => {
                        setCategoryName(t);
                        if (nameError) setNameError("");
                    }}
                    editable={!submitting}
                />
                {nameError ? (
                    <Text style={pg.errorTxt}>{nameError}</Text>
                ) : (
                    <Text style={pg.helper}>
                        Enter the name of the main category you&apos;d like to request
                    </Text>
                )}
            </View>

            <View style={pg.field}>
                <Text style={pg.label}>Description</Text>
                <TextInput
                    style={[pg.input, pg.textArea]}
                    placeholder="Provide a detailed description of what products would fall under this category"
                    placeholderTextColor="#9CA3AF"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!submitting}
                />
            </View>

            <View style={pg.field}>
                <Text style={pg.label}>Reason for Request</Text>
                <TextInput
                    style={[pg.input, pg.textArea]}
                    placeholder="Why do you need this category? How will it benefit your business?"
                    placeholderTextColor="#9CA3AF"
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!submitting}
                />
            </View>

            <View style={pg.formActions}>
                <TouchableOpacity
                    style={[pg.resetBtn, submitting && pg.btnDisabled]}
                    onPress={() => void handleReset()}
                    activeOpacity={0.8}
                    disabled={submitting}
                >
                    <Text style={pg.resetBtnTxt}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[pg.submitBtn, submitting && pg.btnDisabled]}
                    onPress={() => void handleSubmit()}
                    activeOpacity={0.85}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={pg.submitBtnTxt}>Submit Request</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const guidelinesCard = (
        <View style={[pg.card, pg.guidelinesCard]}>
            <Text style={pg.guidelinesTitle}>Guidelines</Text>
            {GUIDELINES.map((line) => (
                <View key={line} style={pg.bulletRow}>
                    <View style={pg.bullet} />
                    <Text style={pg.bulletTxt}>{line}</Text>
                </View>
            ))}
            <View style={pg.notifyBox}>
                <Text style={pg.notifyTxt}>
                    You&apos;ll be notified via email once your request is reviewed.
                </Text>
            </View>
        </View>
    );

    const requestRow = (row: CategoryRequestRecord, idx: number) => {
        const st = statusStyle(row.status);
        return (
            <View key={row.id} style={[pg.tr, idx % 2 === 1 && pg.trAlt]}>
                <Text style={[pg.td, pg.colName]} numberOfLines={2}>
                    {row.categoryName}
                </Text>
                <Text style={[pg.tdLight, pg.colDate]}>{row.submittedAt}</Text>
                <View style={pg.colStatus}>
                    <View style={[pg.badge, { backgroundColor: st.bg }]}>
                        <Text style={[pg.badgeTxt, { color: st.color }]}>{row.status}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const requestCard = (row: CategoryRequestRecord) => {
        const st = statusStyle(row.status);
        return (
            <View key={row.id} style={pg.mobileRequestCard}>
                <View style={pg.mobileCardTop}>
                    <Text style={pg.mobileCardName} numberOfLines={2}>
                        {row.categoryName}
                    </Text>
                    <View style={[pg.badge, { backgroundColor: st.bg }]}>
                        <Text style={[pg.badgeTxt, { color: st.color }]}>{row.status}</Text>
                    </View>
                </View>
                <Text style={pg.mobileCardDate}>Submitted: {row.submittedAt}</Text>
            </View>
        );
    };

    const previousSection = (
        <View style={pg.previousSection}>
            <View style={pg.sectionHeadRow}>
                <Text style={pg.sectionTitle}>Your Previous Requests</Text>
                {!loading && loadError ? (
                    <TouchableOpacity onPress={() => void loadRequests()} activeOpacity={0.8}>
                        <Text style={pg.retryTxt}>Retry</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
            <View style={pg.tableCard}>
                {loading ? (
                    <View style={pg.empty}>
                        <ActivityIndicator size="large" color={ORANGE_BRAND} />
                        <Text style={pg.emptySub}>Loading your requests…</Text>
                    </View>
                ) : requests.length === 0 ? (
                    <View style={pg.empty}>
                        <MaterialCommunityIcons name="folder-open-outline" size={40} color="#D1D5DB" />
                        <Text style={pg.emptyTitle}>No requests yet</Text>
                        <Text style={pg.emptySub}>Submit your first category request above.</Text>
                    </View>
                ) : isDesktop ? (
                    <>
                        <View style={pg.tableHead}>
                            <Text style={[pg.th, pg.colName]}>Category Name</Text>
                            <Text style={[pg.th, pg.colDate]}>Submitted</Text>
                            <Text style={[pg.th, pg.colStatus]}>Status</Text>
                        </View>
                        {requests.map(requestRow)}
                    </>
                ) : (
                    <View style={pg.mobileList}>{requests.map(requestCard)}</View>
                )}
            </View>
        </View>
    );

    const pageBody = (
        <View style={[pg.wrap, isWeb && pg.wrapWeb]}>
            <View style={pg.pageHeader}>
                <Text style={pg.pageTitle}>Category Request</Text>
                <Text style={pg.pageSub}>
                    Request a new product category for your catalog. Our team will review your
                    submission within 2–3 business days.
                </Text>
            </View>

            <View style={[pg.topRow, isDesktop && pg.topRowDesktop]}>
                <View style={pg.formCol}>{formCard}</View>
                <View style={[pg.sideCol, isDesktop && pg.sideColDesktop]}>{guidelinesCard}</View>
            </View>

            {previousSection}
        </View>
    );

    const content = (
        <>
            {pageBody}
            <SweetAlertHost />
        </>
    );

    if (isWeb) {
        return <ScrollView showsVerticalScrollIndicator={isDesktop}>{content}</ScrollView>;
    }

    return (
        <SafeAreaView style={pg.mobileRoot}>
            <StatusBar barStyle="light-content" backgroundColor="#151D4F" />
            <AppHeader
                title="Category Request"
                subtitle="Request a new product category"
                showBackButton
            />
            <ScrollView contentContainerStyle={pg.mobileScroll} showsVerticalScrollIndicator={false}>
                {content}
            </ScrollView>
        </SafeAreaView>
    );
}

const pg = StyleSheet.create({
    mobileRoot: { flex: 1, backgroundColor: "#F7F8FC" },
    mobileScroll: { paddingBottom: 32 },
    wrap: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 24 },
    wrapWeb: { paddingHorizontal: 0, paddingTop: 0, maxWidth: 1100, width: "100%", alignSelf: "center" },
    pageHeader: { marginBottom: 20 },
    pageTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 26,
        color: "#111827",
        marginBottom: 6,
    },
    pageSub: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 19,
        maxWidth: 640,
    },
    topRow: { gap: 16, marginBottom: 24 },
    topRowDesktop: { flexDirection: "row", alignItems: "flex-start" },
    formCol: { flex: 1, minWidth: 0 },
    sideCol: { width: "100%" },
    sideColDesktop: { width: 300, flexShrink: 0 },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 20,
        ...Platform.select({
            web: { boxShadow: "0 1px 3px rgba(0,0,0,0.06)" as unknown as undefined },
            default: {},
        }),
    },
    guidelinesCard: {},
    cardTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        color: "#111827",
        marginBottom: 20,
    },
    field: { marginBottom: 18 },
    label: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: "#374151",
        marginBottom: 8,
    },
    required: { color: "#DC2626" },
    input: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: "#111827",
        backgroundColor: "#FFFFFF",
    },
    inputError: { borderColor: "#DC2626" },
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    helper: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 6,
    },
    errorTxt: {
        fontFamily: "Outfit_500Medium",
        fontSize: 12,
        color: "#DC2626",
        marginTop: 6,
    },
    formActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 8,
        flexWrap: "wrap",
    },
    resetBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        minWidth: 88,
        alignItems: "center",
    },
    resetBtnTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: "#4B5563",
    },
    submitBtn: {
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: ORANGE_BRAND,
        minWidth: 140,
        alignItems: "center",
        justifyContent: "center",
    },
    submitBtnTxt: {
        fontFamily: "Outfit_700Bold",
        fontSize: 14,
        color: "#FFFFFF",
    },
    btnDisabled: { opacity: 0.65 },
    guidelinesTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 16,
        color: "#111827",
        marginBottom: 14,
    },
    bulletRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 10,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#6B7280",
        marginTop: 7,
    },
    bulletTxt: {
        flex: 1,
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: "#4B5563",
        lineHeight: 20,
    },
    notifyBox: {
        marginTop: 16,
        backgroundColor: "#CCFBF1",
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: "#99F6E4",
    },
    notifyTxt: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: "#0F766E",
        lineHeight: 19,
    },
    previousSection: { marginTop: 4 },
    sectionHeadRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    sectionTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        color: "#111827",
    },
    retryTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: ORANGE_BRAND,
    },
    tableCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
    },
    tableHead: {
        flexDirection: "row",
        backgroundColor: "#F9FAFB",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    th: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 12,
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    tr: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    trAlt: { backgroundColor: "#FAFAFA" },
    td: { fontFamily: "Outfit_500Medium", fontSize: 14, color: "#111827" },
    tdLight: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#6B7280" },
    colName: { flex: 2 },
    colDate: { flex: 1 },
    colStatus: { flex: 1, alignItems: "flex-start" },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 12 },
    mobileList: { padding: 12, gap: 10 },
    mobileRequestCard: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 14,
        backgroundColor: "#FAFAFA",
    },
    mobileCardTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 8,
    },
    mobileCardName: {
        flex: 1,
        fontFamily: "Outfit_600SemiBold",
        fontSize: 15,
        color: "#111827",
    },
    mobileCardDate: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#6B7280",
    },
    empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
    emptyTitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 15,
        color: "#374151",
        marginTop: 12,
    },
    emptySub: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#9CA3AF",
        marginTop: 4,
        textAlign: "center",
    },
});
