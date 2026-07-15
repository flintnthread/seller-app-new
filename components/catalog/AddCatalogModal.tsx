import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
    Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { CatalogPageConfig, CatalogStatus, ColorRecord, SizeRecord } from "./catalogConfig";
import {
    ORANGE_BRAND,
    STATUS_OPTIONS,
    isValidHex,
    normalizeHex,
} from "./catalogConfig";
import { useResponsive } from "@/hooks/useResponsive";
import {
    SIZE_CATALOG_GROUPS,
    classifySizeCatalog,
    sizeCatalogGroupLabel,
    type SizeCatalogGroupId,
} from "@/lib/sizeCatalogGroups";

const CATALOG_EXAMPLES: Record<SizeCatalogGroupId, { name: string; code: string }> = {
    apparel: { name: "M", code: "M" },
    footwear: { name: "UK 8", code: "UK-8" },
    waist: { name: "32", code: "32" },
    kids: { name: "2-3Y", code: "2-3Y" },
    free: { name: "Free Size", code: "FS" },
    other: { name: "Custom", code: "CUSTOM" },
};

// ─── Warning bullets ─────────────────────────────────────────────────────────

type AddCatalogModalProps = {
    visible: boolean;
    config: CatalogPageConfig;
    onClose: () => void;
    onSaveColor: (payload: { name: string; hex: string; status: CatalogStatus }) => Promise<boolean> | boolean;
    onSaveSize: (payload: { name: string; code: string; status: CatalogStatus }) => Promise<boolean> | boolean;
    editingSize?: SizeRecord | null;
    editingColor?: ColorRecord | null;
    onUpdateSize?: (
        id: string,
        payload: { name: string; code: string; status: CatalogStatus }
    ) => Promise<boolean> | boolean;
    onUpdateColor?: (
        id: string,
        payload: { name: string; hex: string; status: CatalogStatus }
    ) => Promise<boolean> | boolean;
    onNotifySuccess?: (message: string) => void;
    onNotifyError?: (message: string) => void;
};

const WARNING_BULLETS = (entity: string) => [
    `NO EDITING/DELETING: Once submitted, you CANNOT modify or delete this ${entity}.`,
    `LEGAL ACTION: Inappropriate, unrelated, or offensive ${entity} names will result in legal consequences.`,
    "ACCOUNT TERMINATION: Violations may lead to permanent account suspension.",
    "CONTENT REVIEW: All submissions are monitored and reviewed.",
];

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function AddCatalogModal({
    visible,
    config,
    onClose,
    onSaveColor,
    onSaveSize,
    editingSize = null,
    editingColor = null,
    onUpdateSize,
    onUpdateColor,
    onNotifySuccess,
    onNotifyError,
}: AddCatalogModalProps) {
    const { isDesktop } = useResponsive();
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [hex, setHex] = useState("#6F42C1");
    const [status, setStatus] = useState<CatalogStatus>("Active");
    const [statusOpen, setStatusOpen] = useState(false);

    const notifySuccess = (msg: string) => {
        if (onNotifySuccess) {
            setTimeout(() => onNotifySuccess(msg), 100);
        }
    };

    const notifyValidation = (title: string, message: string) => {
        if (onNotifyError) {
            onNotifyError(message);
        } else {
            Alert.alert(title, message);
        }
    };

    const reset = () => {
        setName("");
        setCode("");
        setHex("#6F42C1");
        setStatus("Active");
        setStatusOpen(false);
    };

    const isEditSize = config.kind === "size" && editingSize != null;
    const isEditColor = config.kind === "color" && editingColor != null;

    useEffect(() => {
        if (!visible) {
            reset();
            return;
        }
        if (isEditSize && editingSize) {
            setName(editingSize.name);
            setCode(editingSize.code);
            setStatus(editingSize.status);
        } else if (isEditColor && editingColor) {
            setName(editingColor.name);
            setHex(editingColor.hex);
            setStatus(editingColor.status);
        }
    }, [visible, isEditSize, isEditColor, editingSize, editingColor]);

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            notifyValidation("Required", `Please enter a ${config.entityLabel} name.`);
            return;
        }
        if (config.kind === "color") {
            const normalized = normalizeHex(hex);
            if (!isValidHex(normalized)) {
                notifyValidation("Invalid color", "Enter a valid hex code (e.g., #141153ff).");
                return;
            }
            onSaveColor({ name: trimmedName, hex: normalized, status });
            reset();
            onClose();
            notifySuccess("Your color has been added successfully.");
            return;
        }

        const trimmedCode = code.trim();
        if (!trimmedCode) {
            notifyValidation("Required", "Please enter a size code.");
            return;
        }
        const payload = { name: trimmedName, code: trimmedCode.toUpperCase(), status };

        setSaving(true);
        try {
            let ok = false;
            if (isEditSize && editingSize && onUpdateSize) {
                ok = (await onUpdateSize(editingSize.id, payload)) !== false;
                if (ok) {
                    reset();
                    onClose();
                    const groupLabel = sizeCatalogGroupLabel(
                        classifySizeCatalog(payload.name, payload.code)
                    );
                    notifySuccess(`Size updated — visible under ${groupLabel}.`);
                }
            } else {
                ok = (await onSaveSize(payload)) !== false;
                if (ok) {
                    reset();
                    onClose();
                    const groupLabel = sizeCatalogGroupLabel(
                        classifySizeCatalog(payload.name, payload.code)
                    );
                    notifySuccess(`Size added — visible under ${groupLabel}.`);
                }
            }
        } finally {
            setSaving(false);
        }
    };

    const isEdit = isEditSize || isEditColor;
    const modalTitle = isEdit ? `Edit ${config.entityLabel}` : config.addModalTitle;
    const saveLabel = isEdit ? `Update ${config.entityLabel}` : config.saveButtonLabel;

    const displayHex = isValidHex(hex) ? normalizeHex(hex) : "#CCCCCC";

    return (
        <Modal
            visible={visible}
            transparent
            animationType={isDesktop ? "fade" : "slide"}
            onRequestClose={onClose}
        >
            <View style={[m.overlay, isDesktop && m.overlayCenter]}>
                <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[m.sheet, isDesktop && m.sheetDesktop]}>
                    <View style={m.header}>
                        <Text style={m.headerTitle}>{modalTitle}</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={m.bodyScroll}
                        contentContainerStyle={m.bodyContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={m.label}>{config.nameLabel}</Text>
                        <TextInput
                            style={m.input}
                            placeholder={config.namePlaceholder}
                            placeholderTextColor="#9CA3AF"
                            value={name}
                            onChangeText={setName}
                        />

                        {config.kind === "color" && (
                            <>
                                <Text style={m.label}>{config.hexLabel}</Text>
                                <View style={m.hexRow}>
                                    <TouchableOpacity
                                        style={[m.swatch, { backgroundColor: displayHex }]}
                                        activeOpacity={0.85}
                                        onPress={() => {
                                            if (
                                                Platform.OS === "web" &&
                                                typeof document !== "undefined"
                                            ) {
                                                const el = document.getElementById(
                                                    "catalog-hex-picker"
                                                ) as HTMLInputElement | null;
                                                el?.click();
                                            }
                                        }}
                                    />
                                    <TextInput
                                        style={[m.input, m.hexInput]}
                                        placeholder="#6F42C1"
                                        placeholderTextColor="#9CA3AF"
                                        value={hex}
                                        onChangeText={setHex}
                                        autoCapitalize="characters"
                                        maxLength={7}
                                    />
                                </View>
                                {Platform.OS === "web" &&
                                    React.createElement("input", {
                                        id: "catalog-hex-picker",
                                        type: "color",
                                        value: isValidHex(hex)
                                            ? normalizeHex(hex)
                                            : "#6F42C1",
                                        onChange: (e: { target: { value: string } }) =>
                                            setHex(e.target.value.toUpperCase()),
                                        style: {
                                            position: "absolute",
                                            opacity: 0,
                                            width: 1,
                                            height: 1,
                                            pointerEvents: "none",
                                        },
                                    })}
                                <Text style={m.helper}>{config.hexHelper}</Text>
                            </>
                        )}

                        {config.kind === "size" && (
                            <>
                                <Text style={m.label}>{config.codeLabel}</Text>
                                <TextInput
                                    style={m.input}
                                    placeholder={config.codePlaceholder}
                                    placeholderTextColor="#9CA3AF"
                                    value={code}
                                    onChangeText={setCode}
                                    autoCapitalize="characters"
                                />
                                <Text style={m.helper}>{config.codeHelper}</Text>

                                <Text style={m.label}>Catalog type examples</Text>
                                <View style={m.catalogChipRow}>
                                    {SIZE_CATALOG_GROUPS.map((g) => (
                                        <TouchableOpacity
                                            key={g.id}
                                            style={m.catalogChip}
                                            onPress={() => {
                                                const eg = CATALOG_EXAMPLES[g.id];
                                                setName(eg.name);
                                                setCode(eg.code);
                                            }}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={m.catalogChipTxt}>{g.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={m.catalogMatchBox}>
                                    <Text style={m.catalogMatchLabel}>Will appear under</Text>
                                    <Text style={m.catalogMatchValue}>
                                        {sizeCatalogGroupLabel(classifySizeCatalog(name, code))}
                                    </Text>
                                    <Text style={m.catalogMatchHint}>
                                        Auto-matched from name + code. After save, this size shows in that catalog tab.
                                    </Text>
                                </View>
                            </>
                        )}

                        <Text style={m.label}>Status</Text>
                        <TouchableOpacity
                            style={m.select}
                            onPress={() => setStatusOpen(!statusOpen)}
                            activeOpacity={0.85}
                        >
                            <Text style={m.selectText}>{status}</Text>
                            <Ionicons
                                name={statusOpen ? "chevron-up" : "chevron-down"}
                                size={18}
                                color="#6B7280"
                            />
                        </TouchableOpacity>
                        {statusOpen && (
                            <View style={m.statusList}>
                                {STATUS_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[
                                            m.statusItem,
                                            status === opt && m.statusItemOn,
                                        ]}
                                        onPress={() => {
                                            setStatus(opt);
                                            setStatusOpen(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                m.statusItemTxt,
                                                status === opt && m.statusItemTxtOn,
                                            ]}
                                        >
                                            {opt}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {config.kind === "color" && !isEditColor && (
                            <View style={m.warningBox}>
                                <View style={m.warningTitleRow}>
                                    <MaterialCommunityIcons
                                        name="alert"
                                        size={16}
                                        color="#DC2626"
                                    />
                                    <Text style={m.warningTitle}>CRITICAL WARNING:</Text>
                                </View>
                                {WARNING_BULLETS(config.warningEntity).map((line) => (
                                    <View key={line} style={m.warningBulletRow}>
                                        <Text style={m.warningBullet}>•</Text>
                                        <Text style={m.warningTxt}>{line}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    <View style={m.footer}>
                        <TouchableOpacity
                            style={m.cancelBtn}
                            onPress={onClose}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="close" size={18} color="#FFFFFF" />
                            <Text style={m.cancelBtnTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[m.saveBtn, saving && m.saveBtnDisabled]}
                            onPress={handleSave}
                            activeOpacity={0.85}
                            disabled={saving}
                        >
                            <MaterialCommunityIcons
                                name="content-save"
                                size={18}
                                color="#FFFFFF"
                            />
                            <Text style={m.saveBtnTxt}>{saveLabel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const m = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    overlayCenter: {
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: "92%",
        overflow: "hidden",
    },
    sheetDesktop: {
        width: "100%",
        maxWidth: 520,
        borderRadius: 16,
        maxHeight: "88%",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#151D4F",
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        color: "#FFFFFF",
        flex: 1,
    },
    bodyScroll: { flexGrow: 0 },
    bodyContent: { padding: 20, paddingBottom: 8 },
    label: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: "#374151",
        marginBottom: 8,
        marginTop: 4,
    },
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
        marginBottom: 4,
    },
    hexRow: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: 0,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        overflow: "hidden",
    },
    swatch: {
        width: 52,
        minHeight: 46,
        borderRightWidth: 1,
        borderRightColor: "#D1D5DB",
    },
    hexInput: {
        flex: 1,
        borderWidth: 0,
        marginBottom: 0,
        borderRadius: 0,
    },
    helper: {
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 8,
        lineHeight: 17,
    },
    catalogChipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
    },
    catalogChip: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#FED7AA",
        backgroundColor: "#FFF7ED",
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    catalogChipTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 11,
        color: "#C2410C",
    },
    catalogMatchBox: {
        backgroundColor: "#FFF7ED",
        borderWidth: 1,
        borderColor: "#FED7AA",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    catalogMatchLabel: {
        fontFamily: "Outfit_500Medium",
        fontSize: 11,
        color: "#9A3412",
        marginBottom: 2,
    },
    catalogMatchValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: 15,
        color: ORANGE_BRAND,
    },
    catalogMatchHint: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: "#9A3412",
        marginTop: 4,
        lineHeight: 15,
    },
    select: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 8,
    },
    selectText: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: "#111827",
    },
    statusList: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        marginBottom: 12,
        overflow: "hidden",
    },
    statusItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    statusItemOn: { backgroundColor: "#FFF7ED" },
    statusItemTxt: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14,
        color: "#374151",
    },
    statusItemTxtOn: {
        fontFamily: "Outfit_600SemiBold",
        color: ORANGE_BRAND,
    },
    warningBox: {
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderRadius: 10,
        padding: 14,
        marginTop: 8,
    },
    warningTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
    },
    warningTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 13,
        color: "#DC2626",
    },
    warningBulletRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
        marginBottom: 6,
    },
    warningBullet: {
        fontFamily: "Outfit_700Bold",
        fontSize: 12,
        color: "#DC2626",
        lineHeight: 18,
    },
    warningTxt: {
        flex: 1,
        fontFamily: "Outfit_400Regular",
        fontSize: 12,
        color: "#DC2626",
        lineHeight: 18,
    },
    footer: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
    },
    cancelBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#4B5563",
        borderRadius: 10,
        paddingVertical: 14,
    },
    cancelBtnTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 15,
        color: "#FFFFFF",
    },
    saveBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: ORANGE_BRAND,
        borderRadius: 10,
        paddingVertical: 14,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnTxt: {
        fontFamily: "Outfit_700Bold",
        fontSize: 15,
        color: "#FFFFFF",
    },
});