import React, { useCallback, useEffect, useState, useRef } from "react";
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
    Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { AppHeader } from "@/components/common/AppHeader";
import { useSweetAlert } from "@/components/common/SweetAlert";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
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
    updateCategoryRequest,
    deleteCategoryRequest,
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
    const router = useRouter();
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
    const [editingId, setEditingId] = useState<string | null>(null);

    // Ref for focusing the Category Name input
    const categoryNameRef = useRef<TextInput>(null);

    // Toolbar states for desktop filtering & sorting
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"All" | CategoryRequestStatus>("All");
    const [sortBy, setSortBy] = useState<"latest" | "oldest">("latest");

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

    const handleEditClick = (row: CategoryRequestRecord) => {
        setEditingId(row.id);
        setCategoryName(row.categoryName);
        setDescription(row.description);
        setReason(row.reason);
        setNameError("");
        categoryNameRef.current?.focus();
    };

    const handleDelete = async (row: CategoryRequestRecord) => {
        const confirmed = await confirmAction(
            "Delete request?",
            `Are you sure you want to delete the request for "${row.categoryName}"? This action cannot be undone.`,
            "Delete"
        );
        if (!confirmed) return;

        try {
            await deleteCategoryRequest(row.id);
            setRequests((prev) => prev.filter((r) => r.id !== row.id));
            if (editingId === row.id) {
                setEditingId(null);
                resetForm();
            }
            showSuccess("Category request deleted successfully.", "Request deleted!");
        } catch (e) {
            showError(e instanceof Error ? e.message : "Could not delete your request.");
        }
    };

    const handleSubmit = async () => {
        const name = categoryName.trim();
        if (!name) {
            setNameError("Category name is required");
            showWarning("Please enter a category name.", "Required field");
            return;
        }
        setNameError("");

        const actionText = editingId ? "Save changes to" : "Submit request for";
        const confirmTitle = editingId ? "Save changes?" : "Submit request?";
        const confirmBtnText = editingId ? "Save" : "Submit";

        const confirmed = await confirmAction(
            confirmTitle,
            `${actionText} "${name}"? Our team will review it within 2–3 business days.`,
            confirmBtnText
        );
        if (!confirmed) return;

        setSubmitting(true);
        try {
            if (editingId) {
                const updated = await updateCategoryRequest(editingId, {
                    categoryName: name,
                    description: description.trim(),
                    reason: reason.trim(),
                });
                setRequests((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
                setEditingId(null);
                resetForm();
                showSuccess(
                    "Your category request has been updated successfully.",
                    "Request updated!"
                );
            } else {
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
            }
        } catch (e) {
            showError(e instanceof Error ? e.message : "Could not save your request.");
        } finally {
            setSubmitting(false);
        }
    };

    // Memoize the filtered and sorted requests for desktop table view
    const filteredRequests = React.useMemo(() => {
        return requests
            .filter((r) => {
                const matchesSearch =
                    (r.categoryName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (r.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (r.reason || "").toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus = statusFilter === "All" ? true : r.status === statusFilter;
                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                const timeA = new Date(a.submittedAt).getTime();
                const timeB = new Date(b.submittedAt).getTime();
                return sortBy === "latest" ? timeB - timeA : timeA - timeB;
            });
    }, [requests, searchQuery, statusFilter, sortBy]);

    if (!fontsLoaded) return null;

    const formCard = (
        <View style={[pg.card, isDesktop && pg.cardDesktop]}>
            <Text style={pg.cardTitle}>{editingId ? "Edit Category Request" : "Submit Category Request"}</Text>

            <View style={pg.field}>
                <Text style={pg.label}>
                    Category Name <Text style={pg.required}>*</Text>
                </Text>
                <TextInput
                    ref={categoryNameRef}
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
                {editingId ? (
                    <TouchableOpacity
                        style={[pg.resetBtn, submitting && pg.btnDisabled]}
                        onPress={() => {
                            setEditingId(null);
                            resetForm();
                        }}
                        activeOpacity={0.8}
                        disabled={submitting}
                    >
                        <Text style={pg.resetBtnTxt}>Cancel</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[pg.resetBtn, submitting && pg.btnDisabled]}
                        onPress={() => void handleReset()}
                        activeOpacity={0.8}
                        disabled={submitting}
                    >
                        <Text style={pg.resetBtnTxt}>Reset</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[pg.submitBtn, submitting && pg.btnDisabled]}
                    onPress={() => void handleSubmit()}
                    activeOpacity={0.85}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={pg.submitBtnTxt}>{editingId ? "Save Changes" : "Submit Request"}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const guidelinesCard = (
        <View style={[pg.card, pg.guidelinesCard, isDesktop && pg.guidelinesCardDesktop]}>
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



    const requestCard = (row: CategoryRequestRecord) => {
        const st = statusStyle(row.status);
        return (
            <View key={row.id} style={pg.mobileRequestCard}>
                <View style={pg.mobileCardTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={pg.mobileCardName} numberOfLines={2}>
                            {row.categoryName}
                        </Text>
                        <Text style={pg.mobileCardDate}>Submitted: {row.submittedAt}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                        <View style={[pg.badge, { backgroundColor: st.bg }]}>
                            <Text style={[pg.badgeTxt, { color: st.color }]}>{row.status}</Text>
                        </View>
                        {row.status === "Pending" && (
                            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                                <TouchableOpacity
                                    onPress={() => handleEditClick(row)}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons name="pencil-outline" size={18} color="#4B5563" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => void handleDelete(row)}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#DC2626" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
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

            {isDesktop && (
                <View style={pg.toolbar}>
                    <View style={pg.searchContainer}>
                        <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                        <TextInput
                            style={pg.toolbarSearchInput}
                            placeholder="Search requests..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                                <MaterialCommunityIcons name="close-circle" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={pg.toolbarActions}>
                        <View style={pg.filterPills}>
                            {(["All", "Pending", "Approved", "Rejected"] as const).map((status) => {
                                const count = status === "All"
                                    ? requests.length
                                    : requests.filter((r) => r.status === status).length;
                                const isActive = statusFilter === status;

                                return (
                                    <TouchableOpacity
                                        key={status}
                                        style={[
                                            pg.filterPill,
                                            isActive && pg.filterPillActive,
                                        ]}
                                        onPress={() => setStatusFilter(status)}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                pg.filterPillTxt,
                                                isActive && pg.filterPillTxtActive,
                                            ]}
                                        >
                                            {status}
                                            <Text style={[pg.filterPillCount, isActive && pg.filterPillCountActive]}>
                                                {`  ${count}`}
                                            </Text>
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            style={pg.sortBtn}
                            onPress={() => setSortBy(prev => prev === "latest" ? "oldest" : "latest")}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons
                                name={sortBy === "latest" ? "sort-descending" : "sort-ascending"}
                                size={16}
                                color="#4B5563"
                                style={{ marginRight: 6 }}
                            />
                            <Text style={pg.sortBtnTxt}>
                                {sortBy === "latest" ? "Latest First" : "Oldest First"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={[pg.tableCard, isDesktop && pg.tableCardDesktop]}>
                {loading ? (
                    <View style={[pg.empty, isDesktop && pg.emptyDesktop]}>
                        <ActivityIndicator size="large" color={ORANGE_BRAND} />
                        <Text style={[pg.emptySub, isDesktop && pg.emptySubDesktop]}>Loading your requests…</Text>
                    </View>
                ) : requests.length === 0 ? (
                    isDesktop ? (
                        <View style={[pg.empty, isDesktop && pg.emptyDesktop]}>
                            <MaterialCommunityIcons name="folder-open-outline" size={64} color="#E6E9F2" />
                            <Text style={[pg.emptyTitle, isDesktop && pg.emptyTitleDesktop]}>No requests yet</Text>
                            <Text style={[pg.emptySub, isDesktop && pg.emptySubDesktop]}>Submit your first category request to get started.</Text>
                            <TouchableOpacity
                                style={[pg.newRequestBtn, isDesktop && pg.newRequestBtnDesktop]}
                                onPress={() => categoryNameRef.current?.focus()}
                                activeOpacity={0.9}
                            >
                                <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                                <Text style={pg.newRequestBtnTxt}>New Request</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={pg.empty}>
                            <MaterialCommunityIcons name="folder-open-outline" size={40} color="#D1D5DB" />
                            <Text style={pg.emptyTitle}>No requests yet</Text>
                            <Text style={pg.emptySub}>Submit your first category request above.</Text>
                        </View>
                    )
                ) : isDesktop ? (
                    <>
                        <View style={pg.tableHead}>
                            <Text style={[pg.th, pg.colName]}>Category Name</Text>
                            <Text style={[pg.th, pg.colDescription]}>Description</Text>
                            <Text style={[pg.th, pg.colReason]}>Reason</Text>
                            <Text style={[pg.th, pg.colDate]}>Submitted</Text>
                            <Text style={[pg.th, pg.colStatus]}>Status</Text>
                            <Text style={[pg.th, pg.colActionsHeader]}>Actions</Text>
                        </View>
                        {filteredRequests.length === 0 ? (
                            <View style={pg.empty}>
                                <MaterialCommunityIcons name="magnify-close" size={40} color="#D1D5DB" />
                                <Text style={pg.emptyTitle}>No matching requests</Text>
                                <Text style={pg.emptySub}>Try adjusting your search query or filters.</Text>
                            </View>
                        ) : (
                            filteredRequests.map((row, idx) => {
                                const st = statusStyle(row.status);
                                return (
                                    <Pressable
                                        key={row.id}
                                        style={({ hovered }) => [
                                            pg.tr,
                                            pg.trDesktop,
                                            idx % 2 === 1 && pg.trAlt,
                                            hovered && isWeb && pg.trHover,
                                        ]}
                                    >
                                        <Text style={[pg.td, pg.colName]} numberOfLines={1}>
                                            {row.categoryName}
                                        </Text>
                                        <Text style={[pg.tdLight, pg.colDescription]} numberOfLines={1}>
                                            {row.description || "—"}
                                        </Text>
                                        <Text style={[pg.tdLight, pg.colReason]} numberOfLines={1}>
                                            {row.reason || "—"}
                                        </Text>
                                        <Text style={[pg.tdLight, pg.colDate]} numberOfLines={1}>
                                            {row.submittedAt}
                                        </Text>
                                        <View style={pg.colStatus}>
                                            <View style={[pg.badge, { backgroundColor: st.bg }]}>
                                                <Text style={[pg.badgeTxt, { color: st.color }]}>
                                                    {row.status}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={pg.colActions}>
                                            {row.status === "Pending" ? (
                                                <>
                                                    <TouchableOpacity
                                                        onPress={() => handleEditClick(row)}
                                                        style={pg.actionBtn}
                                                        activeOpacity={0.7}
                                                    >
                                                        <MaterialCommunityIcons name="pencil-outline" size={18} color="#4B5563" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => void handleDelete(row)}
                                                        style={pg.actionBtn}
                                                        activeOpacity={0.7}
                                                    >
                                                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#DC2626" />
                                                    </TouchableOpacity>
                                                </>
                                            ) : (
                                                <Text style={pg.actionDisabledTxt}>—</Text>
                                            )}
                                        </View>
                                    </Pressable>
                                );
                            })
                        )}
                    </>
                ) : (
                    <View style={pg.mobileList}>{requests.map(requestCard)}</View>
                )}
            </View>
        </View>
    );

    const pageBody = (
        <View style={[
            pg.wrap,
            isWeb && pg.wrapWeb,
            isDesktop && pg.wrapDesktop
        ]}>
            {isWeb ? (
                <View style={pg.pageHeaderWeb}>
                    <View style={pg.titleContainerWeb}>
                        <View style={pg.breadcrumbWeb}>
                            <TouchableOpacity onPress={() => router.push("/(main)/dashboard")}>
                                <Text style={pg.breadcrumbDimWeb}>Dashboard</Text>
                            </TouchableOpacity>
                            <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.6)" />
                            <Text style={pg.breadcrumbActiveWeb}>Category Request</Text>
                        </View>
                        <Text style={pg.pageTitleWeb}>Category Request</Text>
                    </View>
                    <TouchableOpacity style={pg.addBtnWeb} onPress={() => categoryNameRef.current?.focus()} activeOpacity={0.85}>
                        <Ionicons name="add" size={18} color="#151D4F" />
                        <Text style={pg.addBtnTxtWeb}>New Request</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={pg.pageHeader}>
                    <Text style={pg.pageTitle}>Category Request</Text>
                    <Text style={pg.pageSub}>
                        Request a new product category for your catalog. Our team will review your
                        submission within 2–3 business days.
                    </Text>
                </View>
            )}

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
        return (
            <View style={{ flex: 1, flexDirection: "column", backgroundColor: "#F4F5FA", minHeight: "100%" as any }}>
                <ScrollView 
                    style={{ flex: 1 }} 
                    showsVerticalScrollIndicator={isDesktop}
                >
                    {content}
                </ScrollView>
            </View>
        );
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
    wrapWeb: { paddingHorizontal: 16, paddingTop: 10, width: "100%" },
    wrapDesktop: {
        width: "100%",
        paddingBottom: 48,
    },
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
    pageHeaderWeb: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 0,
        backgroundColor: "#151D4F",
        paddingHorizontal: 32,
        paddingVertical: 28,
        paddingBottom: 68,
        borderRadius: 22,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderBottomLeftRadius: 22,
        borderBottomRightRadius: 22,
        marginHorizontal: 2,
        marginTop: 12,
        shadowColor: "#151D4F",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
    },
    titleContainerWeb: {
        paddingLeft: 0,
        marginVertical: 0,
    },
    breadcrumbWeb: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
    breadcrumbDimWeb: { fontFamily: "Outfit_500Medium", fontSize: 13, color: "rgba(255,255,255,0.75)" },
    breadcrumbActiveWeb: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#FFFFFF" },
    pageTitleWeb: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 26,
        color: "#FFFFFF",
        letterSpacing: -0.5,
    },
    addBtnWeb: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    addBtnTxtWeb: {
        fontFamily: "Outfit_700Bold",
        fontSize: 14,
        color: "#151D4F",
    },
    desktopHeader: {
         flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 32,
        gap: 24,
        paddingBottom: 18,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    desktopHeaderLeft: {
        flex: 1,
    },
    desktopHeaderTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 28,
        color: "#111827",
        marginBottom: 8,
    },
    desktopHeaderSub: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: "#4B5563",
        lineHeight: 20,
        maxWidth: 700,
    },
     newRequestBtn: {
flexDirection: "row",
alignItems: "center",
justifyContent: "center",
backgroundColor: ORANGE_BRAND,
paddingHorizontal: 22,
paddingVertical: 12,
borderRadius: 12,
minWidth: 160,
...Platform.select({
web: {
boxShadow:
"0 6px 18px rgba(249, 115, 22, 0.25)" as unknown as undefined,
},
default: {},
}),
},
    newRequestBtnTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: "#FFFFFF",
    },
    topRow: { gap: 16, marginBottom: 24, marginTop: -42, marginHorizontal: 6, zIndex: 10 },
    topRowDesktop: { flexDirection: "row", alignItems: "flex-start", gap: 24 },
    formCol: { flex: 1, minWidth: 0 },
    sideCol: { width: "100%" },
    sideColDesktop: { width: 320, flexShrink: 0 },
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
     cardDesktop: {
borderRadius: 20,
padding: 30,
borderColor: "#F3F4F6",
backgroundColor: "#FFFFFF",
...Platform.select({
web: {
boxShadow:
"0 10px 30px rgba(15, 23, 42, 0.05), 0 2px 10px rgba(15, 23, 42, 0.03)" as unknown as undefined,
},
default: {},
}),
},
    guidelinesCard: {},
     guidelinesCardDesktop: {
borderRadius: 20,
padding: 28,
borderColor: "#F3F4F6",
backgroundColor: "#FFFFFF",
...Platform.select({
web: {
boxShadow:
"0 10px 30px rgba(15, 23, 42, 0.05), 0 2px 10px rgba(15, 23, 42, 0.03)" as unknown as undefined,
position: "sticky" as any,
top: 28,
},
default: {},
}),
},
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
        color: "#6B7280",
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
   toolbar: {
flexDirection: "row",
alignItems: "center",
justifyContent: "space-between",
backgroundColor: "#FFFFFF",
paddingHorizontal: 20,
paddingVertical: 18,
borderRadius: 18,
borderWidth: 1,
borderColor: "#EEF2F7",
marginBottom: 18,
gap: 18,
flexWrap: "wrap",
...Platform.select({
web: {
boxShadow:
"0 4px 20px rgba(0,0,0,0.04)" as unknown as undefined,
},
default: {},
}),
},
    searchContainer: {
flexDirection: "row",
alignItems: "center",
borderWidth: 1,
borderColor: "#E5E7EB",
borderRadius: 12,
paddingHorizontal: 14,
height: 46,
flex: 1,
minWidth: 300,
backgroundColor: "#FAFAFA",
},
    toolbarSearchInput: {
        flex: 1,
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: "#111827",
        height: "100%",
        padding: 0,
    },
    toolbarActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
    },
    filterPills: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
        padding: 4,
        gap: 2,
    },
    filterPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
   filterPillActive: {
backgroundColor: "#FFFFFF",
borderWidth: 1,
borderColor: "#FED7AA",
...Platform.select({
web: {
boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
},
default: {},
}),
},
    filterPillTxt: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: "#4B5563",
    },
    filterPillTxtActive: {
        color: ORANGE_BRAND,
        fontFamily: "Outfit_600SemiBold",
    },
    filterPillCount: {
        fontSize: 11,
        color: "#9CA3AF",
    },
    filterPillCountActive: {
        color: ORANGE_BRAND,
        fontFamily: "Outfit_600SemiBold",
    },
    sortBtn: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
        backgroundColor: "#FFFFFF",
    },
    sortBtnTxt: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: "#374151",
    },
    tableCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
    },
     tableCardDesktop: {
borderRadius: 20,
borderColor: "#F3F4F6",
backgroundColor: "#FFFFFF",
...Platform.select({
web: {
boxShadow:
"0 10px 30px rgba(15, 23, 42, 0.05), 0 2px 10px rgba(15, 23, 42, 0.03)" as unknown as undefined,
},
default: {},
}),
},
    tableHead: {
flexDirection: "row",
backgroundColor: "#FAFAFB",
paddingVertical: 16,
paddingHorizontal: 20,
borderBottomWidth: 1,
borderBottomColor: "#F3F4F6",
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
  trDesktop: {
paddingVertical: 18,
paddingHorizontal: 20,
transitionDuration: "150ms" as any,
},
    trAlt: { backgroundColor: "#FAFAFA" },
   trHover: {
backgroundColor: "#FFF7ED",
cursor: "pointer" as any,
},
    td: { fontFamily: "Outfit_500Medium", fontSize: 14, color: "#111827" },
    tdLight: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#6B7280" },
    colName: {
        flex: 1.8,
        paddingRight: 12,
    },
    colDescription: {
        flex: 2.4,
        paddingHorizontal: 12,
    },
    colReason: {
        flex: 2.2,
        paddingHorizontal: 12,
    },
    colDate: { flex: 1 },
    colStatus: { flex: 1, alignItems: "flex-start" },
    colActionsHeader: {
        flex: 1,
        textAlign: "right",
        paddingRight: 8,
    },
    colActions: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 12,
        paddingRight: 8,
    },
    actionBtn: {
        padding: 6,
        borderRadius: 6,
        backgroundColor: "#F3F4F6",
        ...Platform.select({
            web: {
                transitionDuration: "150ms",
                cursor: "pointer",
            },
            default: {},
        }),
    },
    actionDisabledTxt: {
        fontFamily: "Outfit_400Regular",
        fontSize: 13,
        color: "#9CA3AF",
        paddingRight: 8,
    },
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
    empty: {
alignItems: "center",
justifyContent: "center",
paddingVertical: 60,
paddingHorizontal: 24,
},
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
    webRoot: {
        width: "100%",
    },
    webRootDesktop: {
        backgroundColor: "#F7F9FC",
        paddingVertical: 28,
        paddingHorizontal: 16,
    },
    emptyDesktop: {
        paddingVertical: 80,
        paddingHorizontal: 40,
        gap: 18,
    },
    emptyTitleDesktop: {
        fontSize: 20,
        color: "#374151",
        marginTop: 16,
    },
    emptySubDesktop: {
        fontSize: 15,
        color: "#9CA3AF",
    },
    newRequestBtnDesktop: {
        marginTop: 18,
        paddingHorizontal: 24,
        paddingVertical: 12,
        minWidth: 180,
    },
});
