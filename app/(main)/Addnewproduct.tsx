import React, { useState, useRef, useCallback, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Platform, StatusBar, SafeAreaView, Switch,
    Dimensions, Modal, Animated, Image, Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import {
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import { useRouter, useFocusEffect } from "expo-router";

const { width: SW } = Dimensions.get("window");

// ─── Design Tokens ───────────────────────────────────────────
const C = {
    navy: "#1A2B6D",
    navyDeep: "#0F1A4A",
    navyMid: "#243380",
    navyLight: "#3D52A0",
    navyGhost: "#EEF1FA",
    navyBorder: "#C5CCEA",
    white: "#FFFFFF",
    bg: "#F4F6FB",
    cardBg: "#FFFFFF",
    border: "#E8EBF4",
    inputBg: "#F8F9FD",
    textDark: "#0D1340",
    textMid: "#4B5680",
    textLight: "#9AA3C2",
    textPlaceholder: "#B8BDD6",
    red: "#E53E3E",
    redPale: "#FFF5F5",
    green: "#2ECC71",
    greenPale: "#EAFAF2",
    greenText: "#1A9B52",
    accent1: "#7C3AED",
    accent2: "#0078A8",
    accent3: "#6C3FC5",
    accent4: "#C47D0E",
    accent5: "#1A8A5A",
    toastBg: "#1A2B6D",
    toastErr: "#C0392B",
};

// ─── Data ────────────────────────────────────────────────────
const CATEGORIES = ["Clothing", "Electronics", "Footwear", "Bags", "Accessories", "Sports", "Home & Living", "Books"];
const SUBCATEGORIES: Record<string, string[]> = {
    "Clothing": ["T-Shirts", "Shirts", "Jeans", "Dresses", "Jackets"],
    "Electronics": ["Mobiles", "Laptops", "Headphones", "Cameras", "Tablets"],
    "Footwear": ["Sneakers", "Sandals", "Formal", "Sports", "Boots"],
    "Bags": ["Backpacks", "Handbags", "Wallets", "Travel Bags"],
    "Accessories": ["Watches", "Sunglasses", "Jewelry", "Belts"],
    "Sports": ["Cricket", "Football", "Tennis", "Yoga", "Gym"],
    "Home & Living": ["Furniture", "Decor", "Kitchen", "Bedding"],
    "Books": ["Fiction", "Non-Fiction", "Academic", "Comics"],
};
const MATERIAL_TYPES = [
    "Cotton", "Polyester", "Silk", "Wool", "Linen", "Nylon", "Leather", "Denim",
    "Rayon", "Acrylic", "Velvet", "Satin", "Chiffon", "Spandex", "Metal",
    "Plastic", "Wood", "Glass", "Ceramic", "Rubber", "Paper", "Mixed Fabric",
];
const COLORS_LIST = ["Red", "Blue", "Green", "Black", "White", "Yellow", "Pink", "Purple", "Orange", "Gray"];
const SIZES_LIST = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "28", "30", "32", "34", "36", "38", "40"];
const DELIVERY_OPTIONS = ["Standard Delivery", "Express Delivery", "Same Day Delivery", "Pickup Only"];
const RETURN_POLICIES = ["7 Days Return", "14 Days Return", "30 Days Return", "No Return"];

const STEPS = [
    { key: "basic", label: "Basic Info", icon: "information-outline", color: "#7C3AED" },
    { key: "variants", label: "Variants", icon: "tune-variant", color: "#0891B2" },
    { key: "images", label: "Images", icon: "image-multiple-outline", color: "#059669" },
    { key: "details", label: "Details", icon: "clipboard-text-outline", color: "#D97706" },
];

// ─────────────────────────────────────────────────────────────
// TOAST SYSTEM (right → left slide in)
// ─────────────────────────────────────────────────────────────
type ToastItem = { id: number; message: string; type: "error" | "success" };

let toastIdCounter = 0;

const ToastContainer = ({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: number) => void }) => {
    return (
        <View style={ts.container} pointerEvents="none">
            {toasts.map((t) => (
                <ToastBubble key={t.id} item={t} onRemove={onRemove} />
            ))}
        </View>
    );
};

const ToastBubble = ({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) => {
    const translateX = useRef(new Animated.Value(SW + 20)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(translateX, { toValue: SW + 20, duration: 280, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
            ]).start(() => onRemove(item.id));
        }, 2800);

        return () => clearTimeout(timer);
    }, []);

    const bg = item.type === "error" ? C.toastErr : C.accent5;

    return (
        <Animated.View style={[ts.bubble, { backgroundColor: bg, transform: [{ translateX }], opacity }]}>
            <View style={ts.iconWrap}>
                <MaterialCommunityIcons
                    name={item.type === "error" ? "alert-circle-outline" : "check-circle-outline"}
                    size={18} color={C.white}
                />
            </View>
            <AppText style={ts.msg} numberOfLines={2}>{item.message}</AppText>
        </Animated.View>
    );
};

const ts = StyleSheet.create({
    container: {
        position: "absolute", top: 90, right: 0, left: 0,
        zIndex: 9999, alignItems: "flex-end", paddingRight: 14, gap: 8,
    },
    bubble: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 14, maxWidth: SW * 0.82,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22, shadowRadius: 12, elevation: 10,
        borderTopRightRadius: 4,
    },
    iconWrap: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center", justifyContent: "center",
    },
    msg: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.white, flex: 1, lineHeight: 18 },
});

// ─── useToast hook ────────────────────────────────────────────
function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: "error" | "success" = "error") => {
        const id = ++toastIdCounter;
        setToasts(p => [...p, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(p => p.filter(t => t.id !== id));
    }, []);

    const showErrors = useCallback((errors: string[]) => {
        errors.forEach((msg, i) => {
            setTimeout(() => showToast(msg, "error"), i * 150);
        });
    }, [showToast]);

    return { toasts, showToast, showErrors, removeToast };
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────
const validateBasicInfo = (data: any): string[] => {
    const e: string[] = [];
    if (!data.name?.trim()) e.push("Product Name is required");
    if (!data.category) e.push("Category is required");
    if (!data.subcategory) e.push("Subcategory is required");
    if (!data.materialType) e.push("Material Type is required");
    if (!data.hsnCode?.trim()) e.push("HSN Code is required");
    if (!data.shortDesc?.trim()) e.push("Short Description is required");
    if (!data.fullDesc?.trim()) e.push("Full Description is required");
    if (!data.length?.trim()) e.push("Length (cm) is required");
    if (!data.width?.trim()) e.push("Width (cm) is required");
    if (!data.height?.trim()) e.push("Height (cm) is required");
    if (!data.weight?.trim()) e.push("Weight (kg) is required");
    if (data.customized) {
        if (!data.custTitle?.trim()) e.push("Customization title is required");
        if (!data.custInstructions?.trim()) e.push("Customization instructions are required");
        if (data.custAllowPhoto && !data.custImageLabel?.trim()) e.push("Image upload label is required");
        if (data.custAllowText && !data.custTextLabel?.trim()) e.push("Custom text field label is required");
    }
    return e;
};

const validateVariants = (variants: any[]): string[] => {
    const e: string[] = [];
    variants.forEach((v, i) => {
        const n = i + 1;
        if (!v.color) e.push(`Variant #${n}: Color is required`);
        if (!v.size) e.push(`Variant #${n}: Size is required`);
        if (!v.stock?.trim()) e.push(`Variant #${n}: Stock Qty is required`);
        if (!v.mrp?.trim()) e.push(`Variant #${n}: MRP is required`);
        if (!v.sellingPrice?.trim()) e.push(`Variant #${n}: Selling Price is required`);
    });
    return e;
};

const validateImages = (data: any): string[] => {
    const e: string[] = [];
    if (!data.primaryImage) e.push("Primary product image is required");
    return e;
};

const validateDetails = (data: any): string[] => {
    const e: string[] = [];
    if (!data.returnPolicy) e.push("Return Policy is required");
    if (!data.deliveryOption) e.push("Delivery Option is required");
    return e;
};

// ─────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────
const Card = ({ children, style }: any) => (
    <View style={[at.card, style]}>{children}</View>
);

const SecHead = ({ icon, title, accent = C.accent1 }: { icon: string; title: string; accent?: string }) => (
    <View style={[at.secHead, { borderLeftColor: accent }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={accent} />
        <AppText style={[at.secHeadText, { color: accent }]}>{title}</AppText>
    </View>
);

const Lbl = ({ text, required }: { text: string; required?: boolean }) => (
    <AppText style={at.lbl}>{text}{required && <AppText style={{ color: C.red }}> *</AppText>}</AppText>
);

const Field = ({ placeholder, value, onChangeText, keyboardType = "default", multiline = false, lines = 1, maxLength, prefix, hasError }: any) => {
    const [focused, setFocused] = useState(false);
    return (
        <View style={[at.fieldWrap, focused && at.fieldFocused, multiline && { height: lines * 22 + 26, alignItems: "flex-start" }, hasError && at.fieldError]}>
            {prefix && <AppText style={at.fieldPfx}>{prefix}</AppText>}
            <TextInput
                style={[at.fieldInput, multiline && { textAlignVertical: "top", paddingTop: 10 }]}
                placeholder={placeholder}
                placeholderTextColor={C.textPlaceholder}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                multiline={multiline}
                maxLength={maxLength}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </View>
    );
};

const Drop = ({ placeholder, value, onPress, hasError }: any) => (
    <TouchableOpacity style={[at.drop, hasError && at.fieldError]} onPress={onPress} activeOpacity={0.85}>
        <AppText style={[at.dropText, !value && at.dropPh]} numberOfLines={1}>{value || placeholder}</AppText>
        <Ionicons name="chevron-down" size={15} color={C.textLight} />
    </TouchableOpacity>
);

const Divider = () => <View style={at.divider} />;
const Hint = ({ text }: { text: string }) => <AppText style={at.hint}>{text}</AppText>;
const CC = ({ cur, max }: { cur: number; max: number }) => <AppText style={at.cc}>{cur}/{max}</AppText>;

// ─── Picker Modal ─────────────────────────────────────────────
const PM = ({ visible, title, options, selected, onSelect, onClose }: any) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={pm.overlay} activeOpacity={1} onPress={onClose} />
        <View style={pm.sheet}>
            <View style={pm.drag} />
            <View style={pm.hdr}>
                <AppText style={pm.title}>{title}</AppText>
                <TouchableOpacity onPress={onClose} style={pm.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={18} color={C.textMid} />
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {options.map((opt: string) => (
                    <TouchableOpacity key={opt} style={[pm.item, selected === opt && pm.itemOn]} onPress={() => { onSelect(opt); onClose(); }}>
                        <AppText style={[pm.itemTxt, selected === opt && pm.itemTxtOn]}>{opt}</AppText>
                        {selected === opt && <View style={pm.chk}><Ionicons name="checkmark" size={13} color={C.white} /></View>}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    </Modal>
);

const pm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(30,40,90,0.22)" },
    sheet: { position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "65%", backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 36, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 24 },
    drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 6 },
    hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    title: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
    itemOn: { backgroundColor: C.navyGhost },
    itemTxt: { fontFamily: fontFamilies.medium, fontSize: 14, color: C.textMid },
    itemTxtOn: { fontFamily: fontFamilies.semiBold, color: C.navy },
    chk: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
});

// ─── Rich Text Editor ─────────────────────────────────────────
type Format = { bold: boolean; italic: boolean; underline: boolean; heading: "none" | "h1" | "h2" | "h3" };
const defaultFormat: Format = { bold: false, italic: false, underline: false, heading: "none" };

const RichEditor = ({ placeholder, value, onChangeText, maxLength, hasError }: any) => {
    const [fmt, setFmt] = useState<Format>(defaultFormat);
    const [focused, setFocused] = useState(false);

    const toggle = (key: keyof Format, val?: any) => {
        setFmt(f => {
            if (key === "heading") return { ...f, heading: f.heading === val ? "none" : val };
            return { ...f, [key]: !f[key] };
        });
    };

    const insertText = (insertion: string) => onChangeText(value + insertion);

    const textStyle: any = {
        fontFamily: fmt.bold ? "Outfit_700Bold" : "Outfit_400Regular",
        fontStyle: fmt.italic ? "italic" : "normal",
        textDecorationLine: fmt.underline ? "underline" : "none",
        fontSize: fmt.heading === "h1" ? 20 : fmt.heading === "h2" ? 16 : fmt.heading === "h3" ? 14 : 13,
        color: C.textDark,
    };

    const ToolBtn = ({ label, active, onPress, icon }: any) => (
        <TouchableOpacity style={[at.tbBtn, active && { backgroundColor: C.navy, borderRadius: 6 }]} onPress={onPress} activeOpacity={0.7}>
            {icon
                ? <MaterialCommunityIcons name={icon} size={14} color={active ? C.white : C.textMid} />
                : <AppText style={[at.tbTxt,
                label === "B" && { fontFamily: fontFamilies.bold },
                label === "I" && { fontStyle: "italic" },
                label === "U" && { textDecorationLine: "underline" },
                active && { color: C.white },
                ]}>{label}</AppText>
            }
        </TouchableOpacity>
    );

    return (
        <View style={[at.edCard, focused && { borderColor: C.navy }, hasError && { borderColor: C.red }]}>
            <View style={at.toolbar}>
                <ToolBtn label="B" active={fmt.bold} onPress={() => toggle("bold")} />
                <ToolBtn label="I" active={fmt.italic} onPress={() => toggle("italic")} />
                <ToolBtn label="U" active={fmt.underline} onPress={() => toggle("underline")} />
                <View style={at.tbSep} />
                <ToolBtn label="H1" active={fmt.heading === "h1"} onPress={() => toggle("heading", "h1")} />
                <ToolBtn label="H2" active={fmt.heading === "h2"} onPress={() => toggle("heading", "h2")} />
                <ToolBtn label="H3" active={fmt.heading === "h3"} onPress={() => toggle("heading", "h3")} />
                <View style={at.tbSep} />
                <ToolBtn icon="format-list-bulleted" active={false} onPress={() => insertText("\n• ")} />
                <ToolBtn icon="format-list-numbered" active={false} onPress={() => insertText("\n1. ")} />
                <ToolBtn icon="link" active={false} onPress={() => insertText("[link](url)")} />
            </View>
            <TextInput
                style={[at.edInput, textStyle, { minHeight: 72 }]}
                placeholder={placeholder}
                placeholderTextColor={C.textPlaceholder}
                value={value}
                onChangeText={onChangeText}
                multiline
                maxLength={maxLength}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            <View style={at.edFoot}><CC cur={(value || "").length} max={maxLength} /></View>
        </View>
    );
};

// ─────────────────────────────────────────────────────────────
// CUSTOMIZATION IMAGE PICKER
// ─────────────────────────────────────────────────────────────
const CustImagePicker = ({ uri, onPick, onRemove, hasError }: {
    uri: string | null;
    onPick: (uri: string) => void;
    onRemove: () => void;
    hasError?: boolean;
}) => {
    const [sourceModal, setSourceModal] = useState(false);

    const requestAndPick = async (source: "camera" | "gallery") => {
        setSourceModal(false);
        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed to take a photo."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) onPick(result.assets[0].uri);
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed to pick a photo."); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) onPick(result.assets[0].uri);
        }
    };

    return (
        <>
            {uri ? (
                <View style={cp.previewWrap}>
                    <Image source={{ uri }} style={cp.previewImg} resizeMode="cover" />
                    <View style={cp.previewOverlay}>
                        <TouchableOpacity style={cp.changeBtn} onPress={() => setSourceModal(true)}>
                            <MaterialCommunityIcons name="image-edit-outline" size={14} color={C.white} />
                            <AppText style={cp.changeTxt}>Change</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity style={cp.removeBtn} onPress={onRemove}>
                            <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
                            <AppText style={cp.removeTxt}>Remove</AppText>
                        </TouchableOpacity>
                    </View>
                    <View style={cp.checkBadge}>
                        <MaterialCommunityIcons name="check-circle" size={20} color={C.green} />
                    </View>
                </View>
            ) : (
                <TouchableOpacity
                    style={[cp.uploadBox, hasError && { borderColor: C.red, backgroundColor: "#FFF8F8" }]}
                    onPress={() => setSourceModal(true)}
                    activeOpacity={0.75}
                >
                    <View style={cp.uploadIconWrap}>
                        <MaterialCommunityIcons name="image-plus" size={28} color={C.navyLight} />
                    </View>
                    <AppText style={cp.uploadTitle}>Tap to upload reference image</AppText>
                    <AppText style={cp.uploadSub}>JPG · PNG · WebP · Max 5 MB</AppText>
                </TouchableOpacity>
            )}
            <Modal visible={sourceModal} transparent animationType="slide" onRequestClose={() => setSourceModal(false)}>
                <TouchableOpacity style={cp.modalOverlay} activeOpacity={1} onPress={() => setSourceModal(false)} />
                <View style={cp.modalSheet}>
                    <View style={cp.modalDrag} />
                    <AppText style={cp.modalTitle}>Choose Image Source</AppText>
                    <TouchableOpacity style={cp.modalOption} onPress={() => requestAndPick("camera")}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EEF1FA" }]}>
                            <MaterialCommunityIcons name="camera-outline" size={22} color={C.navy} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <AppText style={cp.modalOptTitle}>Take a Photo</AppText>
                            <AppText style={cp.modalOptSub}>Use your camera right now</AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={cp.modalOption} onPress={() => requestAndPick("gallery")}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EDFAF4" }]}>
                            <MaterialCommunityIcons name="image-outline" size={22} color={C.accent5} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <AppText style={cp.modalOptTitle}>Choose from Gallery</AppText>
                            <AppText style={cp.modalOptSub}>Pick from your photo library</AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={cp.modalCancel} onPress={() => setSourceModal(false)}>
                        <AppText style={cp.modalCancelTxt}>Cancel</AppText>
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
};

const cp = StyleSheet.create({
    uploadBox: { marginTop: 10, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, gap: 6, backgroundColor: C.inputBg },
    uploadIconWrap: { width: 56, height: 56, borderRadius: 14, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    uploadTitle: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textMid, textAlign: "center" },
    uploadSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, textAlign: "center" },
    previewWrap: { marginTop: 10, borderRadius: 14, overflow: "hidden", height: 180, position: "relative" },
    previewImg: { width: "100%", height: "100%" },
    previewOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 8, padding: 10, backgroundColor: "rgba(10,20,60,0.55)" },
    changeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
    changeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    removeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(220,50,50,0.55)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,100,100,0.3)" },
    removeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    checkBadge: { position: "absolute", top: 10, right: 10, backgroundColor: C.white, borderRadius: 12 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(10,20,60,0.3)" },
    modalSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, paddingHorizontal: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 24 },
    modalDrag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 18 },
    modalTitle: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.textDark, marginBottom: 16 },
    modalOption: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    modalIconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    modalOptTitle: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textDark },
    modalOptSub: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, marginTop: 2 },
    modalCancel: { marginTop: 18, alignItems: "center", paddingVertical: 14, borderWidth: 1.2, borderColor: C.border, borderRadius: 14 },
    modalCancelTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid },
});

// ─────────────────────────────────────────────────────────────
// STEP 1 — Basic Info
// ─────────────────────────────────────────────────────────────
const StepBasicInfo = ({ data, onChange, errors }: any) => {
    const [catPick, setCatPick] = useState(false);
    const [subPick, setSubPick] = useState(false);
    const [matPick, setMatPick] = useState(false);

    const subcats = data.category ? (SUBCATEGORIES[data.category] || []) : [];
    const hasErr = (field: string) => errors.some((e: string) => e.toLowerCase().includes(field.toLowerCase()));

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 }}>
            {/* CARD 1: Product Identity */}
            <Card>
                <SecHead icon="tag-outline" title="Product Identity" accent={C.accent1} />
                <Divider />
                <Lbl text="Product Name" required />
                <Field
                    placeholder="Enter product name"
                    value={data.name}
                    onChangeText={(v: string) => onChange("name", v)}
                    hasError={hasErr("product name")}
                />
                <View style={at.row2}>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Category" required />
                        <Drop placeholder="Select category" value={data.category} onPress={() => setCatPick(true)} hasError={hasErr("category")} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Subcategory" required />
                        <Drop placeholder="Select sub" value={data.subcategory} onPress={() => data.category && setSubPick(true)} hasError={hasErr("subcategory")} />
                    </View>
                </View>
                <View style={at.row2}>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Material Type" required />
                        <Drop placeholder="Select material" value={data.materialType} onPress={() => setMatPick(true)} hasError={hasErr("material")} />
                        <Hint text="Primary material of the product" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="HSN Code" required />
                        <View style={[at.hsnWrap, hasErr("hsn") && at.fieldError]}>
                            <MaterialCommunityIcons name="barcode-scan" size={15} color={C.navyLight} style={{ marginRight: 6 }} />
                            <TextInput
                                style={at.hsnInput}
                                placeholder="e.g. 6109"
                                placeholderTextColor={C.textPlaceholder}
                                value={data.hsnCode}
                                onChangeText={(v: string) => onChange("hsnCode", v)}
                                keyboardType="numeric"
                                maxLength={8}
                            />
                        </View>
                        <Hint text="4–8 digit Harmonized Code" />
                    </View>
                </View>
            </Card>

            {/* CARD 2: Descriptions */}
            <Card style={{ marginTop: 12 }}>
                <SecHead icon="text-box-edit-outline" title="Descriptions" accent={C.accent2} />
                <Divider />
                <Lbl text="Short Description" required />
                <RichEditor
                    placeholder="Short, punchy summary of your product…"
                    value={data.shortDesc}
                    onChangeText={(v: string) => onChange("shortDesc", v)}
                    maxLength={250}
                    hasError={hasErr("short description")}
                />
                <View style={{ height: 14 }} />
                <Lbl text="Full Description" required />
                <RichEditor
                    placeholder="Full product description, features, highlights…"
                    value={data.fullDesc}
                    onChangeText={(v: string) => onChange("fullDesc", v)}
                    maxLength={2000}
                    hasError={hasErr("full description")}
                />
            </Card>

            {/* CARD 3: Dimensions */}
            <Card style={{ marginTop: 12 }}>
                <SecHead icon="cube-scan" title="Product Dimensions" accent={C.accent3} />
                <Divider />
                <AppText style={at.cardHint}>Enter gross dimensions (including packaging)</AppText>
                <View style={at.row3}>
                    {([["Length cm", "length", "30"], ["Width cm", "width", "20"], ["Height cm", "height", "10"]] as [string, string, string][]).map(([lbl, key, ph]) => (
                        <View key={key} style={{ flex: 1 }}>
                            <Lbl text={lbl} required />
                            <Field
                                placeholder={ph}
                                value={data[key]}
                                onChangeText={(v: string) => onChange(key, v)}
                                keyboardType="numeric"
                                hasError={hasErr(key)}
                            />
                        </View>
                    ))}
                </View>
            </Card>

            {/* CARD 4: Weight & Delivery */}
            <Card style={{ marginTop: 12 }}>
                <SecHead icon="weight-kilogram" title="Weight & Delivery" accent={C.accent4} />
                <Divider />
                <AppText style={at.cardHint}>Enter gross weight (including packaging)</AppText>
                <View style={at.row2}>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Weight (kg)" required />
                        <Field
                            placeholder="e.g. 0.5"
                            value={data.weight}
                            onChangeText={(v: string) => onChange("weight", v)}
                            keyboardType="decimal-pad"
                            hasError={hasErr("weight")}
                        />
                        <Hint text="Auto-calculates delivery charges" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Weight Slab" />
                        <Drop placeholder="Auto-selected" value={data.weightSlab} onPress={() => { }} />
                        <Hint text="Based on entered weight" />
                    </View>
                </View>
                <Divider />
                <Lbl text="Fragile Item?" required />
                <View style={at.radioRow}>
                    {(["Yes", "No"] as const).map(opt => (
                        <TouchableOpacity key={opt} style={[at.radioPill, data.fragile === opt && at.radioPillOn]} onPress={() => onChange("fragile", opt)}>
                            <View style={[at.radioDot, data.fragile === opt && at.radioDotOn]} />
                            <AppText style={[at.radioPillTxt, data.fragile === opt && at.radioPillTxtOn]}>{opt}</AppText>
                        </TouchableOpacity>
                    ))}
                </View>
                <Hint text="Mark if special protective packaging is required" />
            </Card>

            {/* CARD 5: Customization */}
            <Card style={{ marginTop: 12 }}>
                <SecHead icon="palette-outline" title="Customization" accent={C.accent5} />
                <Divider />
                <TouchableOpacity style={at.customRow} onPress={() => onChange("customized", !data.customized)} activeOpacity={0.7}>
                    <View style={[at.tog, data.customized && at.togOn]}>
                        <View style={[at.togThumb, data.customized && at.togThumbOn]} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <AppText style={at.customTitle}>Customized Product</AppText>
                        <AppText style={at.customSub}>Enable if buyers can personalise this product</AppText>
                    </View>
                </TouchableOpacity>

                {data.customized && (
                    <View style={at.custExpandWrap}>
                        <Divider />
                        <Lbl text="Customization Title" required />
                        <Field
                            placeholder="e.g. Personalised Name Engraving"
                            value={data.custTitle}
                            onChangeText={(v: string) => onChange("custTitle", v)}
                            maxLength={100}
                            hasError={hasErr("customization title")}
                        />
                        <Lbl text="Instructions for Buyer" required />
                        <Field
                            placeholder="e.g. Please share your name, preferred font, and colour preference…"
                            value={data.custInstructions}
                            onChangeText={(v: string) => onChange("custInstructions", v)}
                            multiline
                            lines={3}
                            maxLength={500}
                            hasError={hasErr("customization instructions")}
                        />
                        <CC cur={(data.custInstructions || "").length} max={500} />

                        <Lbl text="Allow Reference Image Upload" />
                        <View style={at.custTogRow}>
                            <Switch
                                value={data.custAllowPhoto}
                                onValueChange={v => onChange("custAllowPhoto", v)}
                                trackColor={{ false: C.border, true: C.accent5 }}
                                thumbColor={C.white}
                            />
                            <View style={{ flex: 1 }}>
                                <AppText style={at.custTogTitle}>Buyer can upload a reference image</AppText>
                                <AppText style={at.custTogSub}>Accepted: JPG / PNG · Max 5 MB · 1 image</AppText>
                            </View>
                        </View>
                        {data.custAllowPhoto && (
                            <View style={at.custSubField}>
                                <View style={at.custSubFieldBar} />
                                <View style={{ flex: 1 }}>
                                    <Lbl text="Image Upload Label" required />
                                    <Field
                                        placeholder="e.g. Upload your reference photo here"
                                        value={data.custImageLabel}
                                        onChangeText={(v: string) => onChange("custImageLabel", v)}
                                        maxLength={120}
                                        hasError={hasErr("image upload label")}
                                    />
                                    <Hint text="This label is shown to the buyer on the upload field" />
                                    <Lbl text="Sample / Reference Image" />
                                    <CustImagePicker
                                        uri={data.custPickedImage}
                                        onPick={(uri: string) => onChange("custPickedImage", uri)}
                                        onRemove={() => onChange("custPickedImage", null)}
                                        hasError={false}
                                    />
                                    <Hint text="Optionally upload a sample so buyers know what to send" />
                                </View>
                            </View>
                        )}

                        <Lbl text="Allow Custom Text / Name" />
                        <View style={at.custTogRow}>
                            <Switch
                                value={data.custAllowText}
                                onValueChange={v => onChange("custAllowText", v)}
                                trackColor={{ false: C.border, true: C.accent5 }}
                                thumbColor={C.white}
                            />
                            <View style={{ flex: 1 }}>
                                <AppText style={at.custTogTitle}>Buyer can enter a name or message</AppText>
                                <AppText style={at.custTogSub}>Max 100 characters · any case allowed</AppText>
                            </View>
                        </View>
                        {data.custAllowText && (
                            <View style={at.custSubField}>
                                <View style={at.custSubFieldBar} />
                                <View style={{ flex: 1 }}>
                                    <Lbl text="Text Field Label" required />
                                    <Field
                                        placeholder="e.g. Enter the name to be printed"
                                        value={data.custTextLabel}
                                        onChangeText={(v: string) => onChange("custTextLabel", v)}
                                        maxLength={120}
                                        hasError={hasErr("custom text field label")}
                                    />
                                    <Hint text="This label is shown to the buyer on the text input field" />
                                </View>
                            </View>
                        )}

                        <View style={at.row2}>
                            <View style={{ flex: 1 }}>
                                <Lbl text="Extra Lead Time (days)" />
                                <Field
                                    placeholder="e.g. 3"
                                    value={data.custLeadDays}
                                    onChangeText={(v: string) => onChange("custLeadDays", v)}
                                    keyboardType="numeric"
                                />
                                <Hint text="Additional days for customisation" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Lbl text="Extra Charge (₹)" />
                                <Field
                                    placeholder="0.00"
                                    value={data.custCharge}
                                    onChangeText={(v: string) => onChange("custCharge", v)}
                                    keyboardType="decimal-pad"
                                    prefix="₹"
                                />
                                <Hint text="Leave blank if free" />
                            </View>
                        </View>

                        <View style={at.custNote}>
                            <MaterialCommunityIcons name="information-outline" size={15} color={C.accent5} />
                            <AppText style={at.custNoteTxt}>
                                Customised orders cannot be cancelled after production begins. Make sure your policy is clearly stated.
                            </AppText>
                        </View>
                    </View>
                )}
            </Card>

            <PM visible={catPick} title="Select Category" options={CATEGORIES} selected={data.category} onSelect={(v: string) => { onChange("category", v); onChange("subcategory", ""); }} onClose={() => setCatPick(false)} />
            <PM visible={subPick} title="Select Subcategory" options={subcats} selected={data.subcategory} onSelect={(v: string) => onChange("subcategory", v)} onClose={() => setSubPick(false)} />
            <PM visible={matPick} title="Select Material" options={MATERIAL_TYPES} selected={data.materialType} onSelect={(v: string) => onChange("materialType", v)} onClose={() => setMatPick(false)} />
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// REUSABLE IMAGE PICKER GRID
// ─────────────────────────────────────────────────────────────
const MAX_IMAGES = 6;

const ImagePickerGrid = ({
    images, onAdd, onRemove, maxCount = MAX_IMAGES, hasError = false, label = "Add Photo",
}: {
    images: string[]; onAdd: (uris: string[]) => void; onRemove: (index: number) => void;
    maxCount?: number; hasError?: boolean; label?: string;
}) => {
    const [srcModal, setSrcModal] = useState(false);

    const pickImages = async (source: "camera" | "gallery") => {
        setSrcModal(false);
        const remaining = maxCount - images.length;
        if (remaining <= 0) return;

        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed to take a photo."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) onAdd([result.assets[0].uri]);
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed to pick photos."); return; }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: remaining > 1,
                selectionLimit: remaining,
                quality: 0.85,
            });
            if (!result.canceled && result.assets?.length) onAdd(result.assets.map((a: any) => a.uri));
        }
    };

    const canAdd = images.length < maxCount;

    return (
        <>
            <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 6 }}
                style={{ marginTop: 10 }}
            >
                {canAdd && (
                    <TouchableOpacity
                        style={[ipg.addSlot, hasError && images.length === 0 && { borderColor: C.red, backgroundColor: "#FFF8F8" }]}
                        onPress={() => setSrcModal(true)} activeOpacity={0.75}
                    >
                        <View style={ipg.addIcon}>
                            <MaterialCommunityIcons name="camera-plus-outline" size={22} color={C.navyLight} />
                        </View>
                        <AppText style={ipg.addTxt}>{label}</AppText>
                        <AppText style={ipg.addCount}>{images.length}/{maxCount}</AppText>
                    </TouchableOpacity>
                )}
                {images.map((uri, i) => (
                    <View key={uri + i} style={ipg.thumb}>
                        <Image source={{ uri }} style={ipg.thumbImg} resizeMode="cover" />
                        {i === 0 && (
                            <View style={ipg.primaryBadge}>
                                <AppText style={ipg.primaryTxt}>Primary</AppText>
                            </View>
                        )}
                        <TouchableOpacity style={ipg.removeBtn} onPress={() => onRemove(i)}>
                            <Ionicons name="close" size={11} color={C.white} />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
            {images.length > 0 && (
                <AppText style={ipg.hint}>First image is used as primary · tap × to remove</AppText>
            )}
            <Modal visible={srcModal} transparent animationType="slide" onRequestClose={() => setSrcModal(false)}>
                <TouchableOpacity style={cp.modalOverlay} activeOpacity={1} onPress={() => setSrcModal(false)} />
                <View style={cp.modalSheet}>
                    <View style={cp.modalDrag} />
                    <AppText style={cp.modalTitle}>Add Image</AppText>
                    <TouchableOpacity style={cp.modalOption} onPress={() => pickImages("camera")}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EEF1FA" }]}>
                            <MaterialCommunityIcons name="camera-outline" size={22} color={C.navy} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <AppText style={cp.modalOptTitle}>Take a Photo</AppText>
                            <AppText style={cp.modalOptSub}>Use your camera right now</AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={cp.modalOption} onPress={() => pickImages("gallery")}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EDFAF4" }]}>
                            <MaterialCommunityIcons name="image-multiple-outline" size={22} color={C.accent5} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <AppText style={cp.modalOptTitle}>Choose from Gallery</AppText>
                            <AppText style={cp.modalOptSub}>Pick up to {maxCount - images.length} photo{maxCount - images.length !== 1 ? "s" : ""}</AppText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={cp.modalCancel} onPress={() => setSrcModal(false)}>
                        <AppText style={cp.modalCancelTxt}>Cancel</AppText>
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
};

const ipg = StyleSheet.create({
    addSlot: { width: 90, height: 90, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: C.inputBg },
    addIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    addTxt: { fontFamily: fontFamilies.semiBold, fontSize: 10, color: C.navyLight, textAlign: "center" },
    addCount: { fontFamily: fontFamilies.regular, fontSize: 9, color: C.textLight },
    thumb: { width: 90, height: 90, borderRadius: 14, overflow: "hidden", position: "relative" },
    thumbImg: { width: "100%", height: "100%" },
    primaryBadge: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(26,43,109,0.72)", paddingVertical: 3, alignItems: "center" },
    primaryTxt: { fontFamily: fontFamilies.semiBold, fontSize: 9, color: C.white, letterSpacing: 0.4 },
    removeBtn: { position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(200,30,30,0.85)", alignItems: "center", justifyContent: "center" },
    hint: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 6 },
});

// ─────────────────────────────────────────────────────────────
// STEP 2 — Variants
// ─────────────────────────────────────────────────────────────
type Variant = {
    id: string; color: string; size: string; sku: string;
    stock: string; mrp: string; sellingPrice: string; discount: string; images: string[];
};

// ─── FIX: rmVariant is now correctly received as a prop ───────
const StepVariants = ({ variants, setVariants, rmVariant, errors }: any) => {
    const [clrPick, setClrPick] = useState<string | null>(null);
    const [szPick, setSzPick] = useState<string | null>(null);

    const hasErr = (id: string, field: string) =>
        errors.some((e: string) =>
            e.toLowerCase().includes(`variant #${variants.findIndex((v: Variant) => v.id === id) + 1}`) &&
            e.toLowerCase().includes(field.toLowerCase())
        );

    const addVariant = () => {
        const id = Date.now().toString();
        setVariants((p: Variant[]) => [
            ...p,
            { id, color: "", size: "", sku: "", stock: "", mrp: "", sellingPrice: "", discount: "0", images: [] },
        ]);
    };

    const addVariantImage = (id: string, uris: string[]) => {
        setVariants((p: Variant[]) => p.map((v: Variant) => {
            if (v.id !== id) return v;
            return { ...v, images: [...v.images, ...uris].slice(0, MAX_IMAGES) };
        }));
    };

    const removeVariantImage = (id: string, index: number) => {
        setVariants((p: Variant[]) => p.map((v: Variant) => {
            if (v.id !== id) return v;
            return { ...v, images: v.images.filter((_, i) => i !== index) };
        }));
    };

    const upVariant = (id: string, field: string, value: string) => {
        setVariants((p: Variant[]) => p.map((v: Variant) => {
            if (v.id !== id) return v;
            const u = { ...v, [field]: value };
            if (field === "mrp" || field === "sellingPrice") {
                const mrp = parseFloat(field === "mrp" ? value : u.mrp) || 0;
                const sp = parseFloat(field === "sellingPrice" ? value : u.sellingPrice) || 0;
                if (mrp > 0 && sp > 0 && sp <= mrp)
                    u.discount = String(Math.round(((mrp - sp) / mrp) * 100));
            }
            return u;
        }));
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 }}>
            {variants.map((v: Variant, idx: number) => (
                <Card key={v.id} style={{ marginBottom: 12 }}>
                    <View style={vt.hdr}>
                        <View style={vt.badge}><AppText style={vt.badgeTxt}>#{idx + 1}</AppText></View>
                        <AppText style={vt.title}>Variant</AppText>
                        {variants.length > 1 && (
                            // ─── FIX: rmVariant is now defined and wired correctly ───
                            <TouchableOpacity onPress={() => rmVariant(v.id)} style={vt.rmBtn}>
                                <MaterialCommunityIcons name="trash-can-outline" size={15} color={C.red} />
                                <AppText style={vt.rmTxt}>Remove</AppText>
                            </TouchableOpacity>
                        )}
                    </View>
                    <Divider />
                    <View style={at.row2}>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Color" required />
                            <Drop placeholder="Select color" value={v.color} onPress={() => setClrPick(v.id)} hasError={hasErr(v.id, "color")} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Size" required />
                            <Drop placeholder="Select size" value={v.size} onPress={() => setSzPick(v.id)} hasError={hasErr(v.id, "size")} />
                        </View>
                    </View>
                    <View style={at.row2}>
                        <View style={{ flex: 1 }}>
                            <View style={vt.lblRow}>
                                <Lbl text="SKU" />
                                <View style={vt.auto}><AppText style={vt.autoTxt}>Auto</AppText></View>
                            </View>
                            <Field placeholder="Auto-generated" value={v.sku} onChangeText={(val: string) => upVariant(v.id, "sku", val)} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Stock Qty" required />
                            <Field placeholder="0" value={v.stock} onChangeText={(val: string) => upVariant(v.id, "stock", val)} keyboardType="numeric" hasError={hasErr(v.id, "stock")} />
                        </View>
                    </View>
                    <View style={at.row2}>
                        <View style={{ flex: 1 }}>
                            <Lbl text="MRP (excl. GST)" required />
                            <Field placeholder="0.00" value={v.mrp} onChangeText={(val: string) => upVariant(v.id, "mrp", val)} keyboardType="decimal-pad" prefix="₹" hasError={hasErr(v.id, "mrp")} />
                            <Hint text="Maximum Retail Price" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Selling Price" required />
                            <Field placeholder="0.00" value={v.sellingPrice} onChangeText={(val: string) => upVariant(v.id, "sellingPrice", val)} keyboardType="decimal-pad" prefix="₹" hasError={hasErr(v.id, "selling")} />
                            <Hint text="Your price excl. GST" />
                        </View>
                    </View>
                    <View style={{ width: "50%" }}>
                        <View style={vt.lblRow}>
                            <Lbl text="Discount %" />
                            <View style={vt.auto}><AppText style={vt.autoTxt}>Auto</AppText></View>
                        </View>
                        <Field placeholder="0" value={v.discount} onChangeText={(val: string) => upVariant(v.id, "discount", val)} keyboardType="numeric" />
                    </View>
                    <Divider />
                    <Lbl text="Variant Images" />
                    <Hint text="Add up to 6 images · first image is used as primary" />
                    <ImagePickerGrid
                        images={v.images}
                        onAdd={(uris: string[]) => addVariantImage(v.id, uris)}
                        onRemove={(i: number) => removeVariantImage(v.id, i)}
                        maxCount={6}
                        hasError={hasErr(v.id, "image")}
                        label="Add Photo"
                    />
                    <Lbl text="Variant Video (optional)" />
                    <TouchableOpacity style={vt.fileRow}>
                        <MaterialCommunityIcons name="file-video-outline" size={18} color={C.navyLight} />
                        <AppText style={vt.fileTxt}>No file chosen</AppText>
                        <View style={vt.browseBtn}><AppText style={vt.browseTxt}>Browse</AppText></View>
                    </TouchableOpacity>
                </Card>
            ))}

            <TouchableOpacity style={vt.addBtn} onPress={addVariant}>
                <View style={vt.addIcon}><Ionicons name="add" size={18} color={C.navy} /></View>
                <AppText style={vt.addTxt}>Add Another Variant</AppText>
            </TouchableOpacity>

            <View style={vt.infoBox}>
                <MaterialCommunityIcons name="information-outline" size={16} color={C.navyLight} />
                <AppText style={vt.infoTxt}>Each variant can have its own price, stock, and images. At least one variant is required.</AppText>
            </View>

            <PM
                visible={!!clrPick} title="Select Color" options={COLORS_LIST}
                selected={variants.find((v: Variant) => v.id === clrPick)?.color || ""}
                onSelect={(val: string) => { if (clrPick) upVariant(clrPick, "color", val); }}
                onClose={() => setClrPick(null)}
            />
            <PM
                visible={!!szPick} title="Select Size" options={SIZES_LIST}
                selected={variants.find((v: Variant) => v.id === szPick)?.size || ""}
                onSelect={(val: string) => { if (szPick) upVariant(szPick, "size", val); }}
                onClose={() => setSzPick(null)}
            />
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// STEP 3 — Images
// ─────────────────────────────────────────────────────────────
const StepImages = ({ data, onChange, errors }: any) => {
    const hasErr = errors.some((e: string) => e.toLowerCase().includes("primary"));

    const pickPrimaryImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Required", "Gallery access is needed to pick photos.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.85,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
            onChange("primaryImage", result.assets[0].uri);
        }
    };

    const [additionalImages, setAdditionalImages] = useState<string[]>([]);

    const addAdditionalImages = (uris: string[]) => {
        setAdditionalImages(prev => [...prev, ...uris].slice(0, 4));
    };
    const removeAdditionalImage = (index: number) => {
        setAdditionalImages(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 }}>
            <Card>
                <SecHead icon="image-multiple-outline" title="Product Images" accent={C.accent2} />
                <Divider />

                {/* Primary Image */}
                <Lbl text="Primary Image" required />
                <Hint text="First image shown to buyers. JPG, PNG or WebP · max 5 MB." />
                {data.primaryImage ? (
                    <View style={ig.previewWrap}>
                        <Image source={{ uri: data.primaryImage }} style={ig.previewImg} resizeMode="cover" />
                        <View style={ig.previewOverlay}>
                            <TouchableOpacity style={ig.changeBtn} onPress={pickPrimaryImage}>
                                <MaterialCommunityIcons name="image-edit-outline" size={14} color={C.white} />
                                <AppText style={ig.changeTxt}>Change</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity style={ig.removeBtn} onPress={() => onChange("primaryImage", null)}>
                                <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
                                <AppText style={ig.removeTxt}>Remove</AppText>
                            </TouchableOpacity>
                        </View>
                        <View style={ig.checkBadge}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={C.green} />
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[ig.box, hasErr && { borderColor: C.red, backgroundColor: "#FFF8F8" }]}
                        onPress={pickPrimaryImage}
                        activeOpacity={0.75}
                    >
                        <View style={ig.iconWrap}>
                            <MaterialCommunityIcons name="image-plus" size={32} color={hasErr ? C.red : C.navyLight} />
                        </View>
                        <AppText style={[ig.title, hasErr && { color: C.red }]}>
                            {hasErr ? "Primary image is required" : "Tap to upload primary image"}
                        </AppText>
                        <AppText style={ig.sub}>JPG · PNG · WebP · Max 5 MB</AppText>
                    </TouchableOpacity>
                )}

                <View style={{ height: 20 }} />

                {/* Additional Images */}
                <Lbl text="Additional Images" />
                <Hint text="Add more images to showcase different angles. Up to 4 additional images." />
                <ImagePickerGrid
                    images={additionalImages}
                    onAdd={addAdditionalImages}
                    onRemove={removeAdditionalImage}
                    maxCount={4}
                    hasError={false}
                    label="Add More"
                />
            </Card>
        </ScrollView>
    );
};

const ig = StyleSheet.create({
    box: { marginTop: 12, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", paddingVertical: 28, gap: 8, backgroundColor: C.inputBg },
    iconWrap: { width: 60, height: 60, borderRadius: 14, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    title: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textMid },
    sub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight },
    previewWrap: { marginTop: 12, borderRadius: 14, overflow: "hidden", height: 200, position: "relative" },
    previewImg: { width: "100%", height: "100%" },
    previewOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 8, padding: 10, backgroundColor: "rgba(10,20,60,0.55)" },
    changeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
    changeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    removeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(220,50,50,0.55)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,100,100,0.3)" },
    removeTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.white },
    checkBadge: { position: "absolute", top: 10, right: 10, backgroundColor: C.white, borderRadius: 12 },
    slot: { width: 100, height: 100, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
    slotTxt: { fontFamily: fontFamilies.medium, fontSize: 11, color: C.navyLight },
    selectedWrap: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: C.greenPale, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    selectedTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.greenText },
});

// ─────────────────────────────────────────────────────────────
// STEP 4 — Details
// ─────────────────────────────────────────────────────────────
const StepDetails = ({ data, onChange, errors }: any) => {
    const [sizePick, setSizePick] = useState(false);
    const [retPick, setRetPick] = useState(false);
    const [delPick, setDelPick] = useState(false);
    const [features, setFeatures] = useState<string[]>([""]);
    const [specs, setSpecs] = useState<{ name: string; value: string }[]>([{ name: "", value: "" }]);

    const hasErr = (field: string) => errors.some((e: string) => e.toLowerCase().includes(field.toLowerCase()));

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 }}>
            <Card>
                <SecHead icon="ruler-square" title="Size Chart" accent={C.accent1} />
                <Divider />
                <Lbl text="Select Size Chart" />
                <View style={at.row2}>
                    <View style={{ flex: 1 }}>
                        <Drop placeholder="No size chart" value={data.sizeChart} onPress={() => setSizePick(true)} />
                    </View>
                    <TouchableOpacity style={dt.outBtn}>
                        <Ionicons name="add" size={15} color={C.navy} />
                        <AppText style={dt.outBtnTxt}>Create New</AppText>
                    </TouchableOpacity>
                </View>
            </Card>

            <Card style={{ marginTop: 12 }}>
                <SecHead icon="refresh" title="Return Policy" accent={C.accent3} />
                <Divider />
                <View style={at.row2}>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Policy Template" required />
                        <Drop placeholder="Select template" value={data.returnPolicy} onPress={() => setRetPick(true)} hasError={hasErr("return policy")} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Custom Policy" />
                        <TouchableOpacity style={dt.outBtn}>
                            <Feather name="edit-2" size={13} color={C.navy} />
                            <AppText style={dt.outBtnTxt}>Write Custom</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
                <Lbl text="Policy Details" />
                <Field placeholder="Describe your return policy…" value={data.returnPolicyText} onChangeText={(v: string) => onChange("returnPolicyText", v)} multiline lines={4} maxLength={1000} />
                <CC cur={(data.returnPolicyText || "").length} max={1000} />
            </Card>

            <Card style={{ marginTop: 12 }}>
                <SecHead icon="truck-fast-outline" title="Delivery" accent={C.accent4} />
                <Divider />
                <View style={[at.row2, { alignItems: "flex-end" }]}>
                    <View style={{ flex: 2 }}>
                        <Lbl text="Delivery Option" required />
                        <Drop placeholder="Select option" value={data.deliveryOption} onPress={() => setDelPick(true)} hasError={hasErr("delivery option")} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Min Days" />
                        <Field placeholder="3" value={data.minDays} onChangeText={(v: string) => onChange("minDays", v)} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Max Days" />
                        <Field placeholder="7" value={data.maxDays} onChangeText={(v: string) => onChange("maxDays", v)} keyboardType="numeric" />
                    </View>
                </View>
                <Field placeholder="Extra delivery notes…" value={data.deliveryInfo} onChangeText={(v: string) => onChange("deliveryInfo", v)} multiline lines={3} maxLength={1000} />
            </Card>

            <Card style={{ marginTop: 12 }}>
                <SecHead icon="credit-card-outline" title="Payment Options" accent={C.accent5} />
                <Divider />
                <Hint text="Select all payment methods available for this product." />
                {([["codEnabled", "Cash on Delivery (COD)"], ["onlinePayEnabled", "Online Payment — Razorpay"]] as [string, string][]).map(([key, label]) => (
                    <View key={key} style={dt.togRow}>
                        <Switch value={(data as any)[key]} onValueChange={v => onChange(key, v)} trackColor={{ false: C.border, true: C.navy }} thumbColor={C.white} />
                        <AppText style={dt.togLbl}>{label}</AppText>
                    </View>
                ))}
            </Card>

            <Card style={{ marginTop: 12 }}>
                <SecHead icon="shield-check-outline" title="Warranty & Care" accent={C.accent2} />
                <Divider />
                <View style={at.row2}>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Warranty" />
                        <Field placeholder="e.g. 1 year warranty" value={data.warranty} onChangeText={(v: string) => onChange("warranty", v)} multiline lines={3} maxLength={500} />
                        <CC cur={(data.warranty || "").length} max={500} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Care Instructions" />
                        <Field placeholder="Care & maintenance" value={data.careInstructions} onChangeText={(v: string) => onChange("careInstructions", v)} multiline lines={3} maxLength={500} />
                        <CC cur={(data.careInstructions || "").length} max={500} />
                    </View>
                </View>
            </Card>

            <Card style={{ marginTop: 12 }}>
                <SecHead icon="format-list-bulleted" title="Features & Specs" accent={C.accent1} />
                <Divider />
                <Lbl text="Product Features" />
                {features.map((f, i) => (
                    <Field key={i} placeholder="Enter feature" value={f} onChangeText={(v: string) => { const arr = [...features]; arr[i] = v; setFeatures(arr); }} />
                ))}
                <TouchableOpacity style={dt.addBtn} onPress={() => setFeatures(p => [...p, ""])}>
                    <Ionicons name="add" size={15} color={C.navy} />
                    <AppText style={dt.addBtnTxt}>Add Feature</AppText>
                </TouchableOpacity>
                <Divider />
                <Lbl text="Specifications" />
                {specs.map((sp, i) => (
                    <View key={i} style={dt.specRow}>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Name" value={sp.name} onChangeText={(v: string) => {
                                const arr = [...specs];

                                if (arr[i]) {
                                    arr[i].name = v;
                                }

                                setSpecs(arr);
                            }} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Value" value={sp.value} onChangeText={(v: string) => {
                                const arr = [...specs];

                                if (arr[i]) {
                                    arr[i].name = v;
                                }

                                setSpecs(arr);
                            }} />
                        </View>
                        <TouchableOpacity style={dt.specDel} onPress={() => setSpecs(p => p.filter((_, idx) => idx !== i))}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.red} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={dt.addBtn} onPress={() => setSpecs(p => [...p, { name: "", value: "" }])}>
                    <Ionicons name="add" size={15} color={C.navy} />
                    <AppText style={dt.addBtnTxt}>Add Specification</AppText>
                </TouchableOpacity>
            </Card>

            <PM visible={sizePick} title="Size Chart" options={["No Size Chart", "Small Chart", "Large Chart"]} selected={data.sizeChart} onSelect={(v: string) => onChange("sizeChart", v)} onClose={() => setSizePick(false)} />
            <PM visible={retPick} title="Return Policy" options={RETURN_POLICIES} selected={data.returnPolicy} onSelect={(v: string) => onChange("returnPolicy", v)} onClose={() => setRetPick(false)} />
            <PM visible={delPick} title="Delivery Option" options={DELIVERY_OPTIONS} selected={data.deliveryOption} onSelect={(v: string) => onChange("deliveryOption", v)} onClose={() => setDelPick(false)} />
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// STEP PROGRESS BAR
// ─────────────────────────────────────────────────────────────
const ICON_D = 38;
const ICON_R = ICON_D / 2;
const LINE_H = 3;
const N_STEPS = STEPS.length;

const StepProgressBar = ({ step, maxUnlocked, onTabPress }: { step: number; maxUnlocked: number; onTabPress: (i: number) => void }) => {
    const [barW, setBarW] = useState(SW);
    const colW = barW / N_STEPS;

    return (
        <View style={sp.wrapper} onLayout={e => setBarW(e.nativeEvent.layout.width)}>
            {STEPS.map((_, i) => {
                if (i === 0) return null;
                const cx_prev = colW * (i - 1) + colW / 2;
                const cx_curr = colW * i + colW / 2;
                const lx = cx_prev + ICON_R;
                const lw = cx_curr - ICON_R - lx;
                const ly = 10 + ICON_R - LINE_H / 2;
                if (lw <= 0) return null;
                const filled = i <= maxUnlocked;
                return (
                    <View key={`seg-${i}`} pointerEvents="none"
                        style={[sp.seg, {
                            left: lx, top: ly, width: lw, backgroundColor: filled
                                ? STEPS[i - 1]!.color
                                : C.border
                        }]}
                    />
                );
            })}
            {STEPS.map((s, i) => {
                const isActive = i === step;
                const isDone = i < maxUnlocked;
                const isReachable = i <= maxUnlocked;
                const iconBg = (isActive || isDone) ? s.color : s.color + "60";
                return (
                    <TouchableOpacity key={s.key} style={sp.col} onPress={() => isReachable && onTabPress(i)} activeOpacity={isReachable ? 0.75 : 1}>
                        <View style={[
                            sp.circle,
                            { backgroundColor: iconBg },
                            isActive && { shadowColor: s.color, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 7 },
                        ]}>
                            <MaterialCommunityIcons name={s.icon as any} size={18} color={C.white} />
                        </View>
                        <AppText style={[
                            sp.lbl,
                            isActive && { color: s.color, fontFamily: fontFamilies.bold },
                            isDone && { color: s.color, fontFamily: fontFamilies.semiBold },
                        ]}>
                            {s.label}
                        </AppText>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const sp = StyleSheet.create({
    wrapper: { flexDirection: "row", backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: 10, paddingBottom: 12, position: "relative" },
    seg: { position: "absolute", height: LINE_H, borderRadius: LINE_H / 2, zIndex: 0 },
    col: { flex: 1, alignItems: "center", gap: 6, zIndex: 1 },
    circle: { width: ICON_D, height: ICON_D, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    lbl: { fontFamily: fontFamilies.medium, fontSize: 10, color: C.textLight, textAlign: "center" },
});

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
const initBasicData = () => ({
    name: "", category: "", subcategory: "", materialType: "", hsnCode: "",
    shortDesc: "", fullDesc: "", length: "", width: "", height: "",
    weight: "", weightSlab: "", fragile: "No", customized: false,
    custTitle: "", custInstructions: "", custLeadDays: "", custCharge: "",
    custAllowPhoto: false, custImageLabel: "", custPickedImage: null as string | null,
    custAllowText: false, custTextLabel: "",
});

const initVariants = (): Variant[] => [
    { id: "1", color: "", size: "", sku: "", stock: "", mrp: "", sellingPrice: "", discount: "0", images: [] },
];

const initDetailsData = () => ({
    sizeChart: "", returnPolicy: "", returnPolicyText: "",
    deliveryOption: "", minDays: "3", maxDays: "7", deliveryInfo: "",
    codEnabled: true, onlinePayEnabled: true, warranty: "", careInstructions: "",
});

const AddNewProduct: React.FC = () => {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [maxUnlocked, setMaxUnlocked] = useState(0);
    const [basicErrors, setBasicErrors] = useState<string[]>([]);
    const [variantErrors, setVariantErrors] = useState<string[]>([]);
    const [imageErrors, setImageErrors] = useState<string[]>([]);
    const [detailErrors, setDetailErrors] = useState<string[]>([]);
    const [basicData, setBasicData] = useState(initBasicData);
    const [variants, setVariants] = useState<Variant[]>(initVariants);
    const [imagesData, setImagesData] = useState<{ primaryImage: string | null }>({ primaryImage: null });
    const [detailsData, setDetailsData] = useState(initDetailsData);

    const { toasts, showErrors, showToast, removeToast } = useToast();

    useFocusEffect(
        useCallback(() => {
            setStep(0); setMaxUnlocked(0);
            setBasicErrors([]); setVariantErrors([]); setImageErrors([]); setDetailErrors([]);
            setBasicData(initBasicData()); setVariants(initVariants());
            setImagesData({ primaryImage: null }); setDetailsData(initDetailsData());
        }, [])
    );

    const upBasic = (k: string, v: any) => {
        setBasicData(p => ({ ...p, [k]: v }));
        // Clear the specific error for the field being edited
        setBasicErrors(prev => prev.filter(e => !e.toLowerCase().includes(k.toLowerCase())));
    };
    const upDetails = (k: string, v: any) => setDetailsData(p => ({ ...p, [k]: v }));

    // ─── FIX: rmVariant defined here and passed as prop ──────────
    const rmVariant = (id: string) => setVariants(p => p.filter(v => v.id !== id));

    const resetAndGoBack = () => {
        setStep(0); setMaxUnlocked(0);
        setBasicData(initBasicData()); setVariants(initVariants());
        setImagesData({ primaryImage: null }); setDetailsData(initDetailsData());
        router.push("/productmanagement");
    };

    const handleTabPress = (i: number) => { if (i <= maxUnlocked) setStep(i); };

    const handleContinue = () => {
        if (step === 0) {
            const errors = validateBasicInfo(basicData);
            setBasicErrors(errors);
            if (errors.length > 0) { showErrors(errors); return; }
            setBasicErrors([]);
        }
        if (step === 1) {
            const errors = validateVariants(variants);
            setVariantErrors(errors);
            if (errors.length > 0) { showErrors(errors); return; }
            setVariantErrors([]);
        }
        if (step === 2) {
            const errors = validateImages(imagesData);
            setImageErrors(errors);
            if (errors.length > 0) { showErrors(errors); return; }
            setImageErrors([]);
        }
        const next = step + 1;
        setMaxUnlocked(prev => Math.max(prev, next));
        setStep(next);
    };

    const handleSave = () => {
        const errors = validateDetails(detailsData);
        setDetailErrors(errors);
        if (errors.length > 0) { showErrors(errors); return; }
        setDetailErrors([]);
        showToast("Product saved successfully!", "success");
        setTimeout(resetAndGoBack, 900);
    };

    return (
        <SafeAreaView style={sc.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />

            {/* Header */}
            <View style={sc.header}>
                <TouchableOpacity onPress={resetAndGoBack} style={sc.hBtn}>
                    <Ionicons name="chevron-back" size={22} color={C.white} />
                </TouchableOpacity>
                <View style={sc.hCenter}>
                    <AppText style={sc.hTitle}>Add New Product</AppText>
                    <AppText style={sc.hSub}>Step {step + 1} of {STEPS.length}</AppText>
                </View>
                <TouchableOpacity onPress={resetAndGoBack} style={sc.hBtn}>
                    <Ionicons name="close" size={22} color={C.white} />
                </TouchableOpacity>
            </View>

            {/* Step progress bar */}
            <StepProgressBar step={step} maxUnlocked={maxUnlocked} onTabPress={handleTabPress} />

            {/* Content */}
            <View style={{ flex: 1, backgroundColor: C.bg }}>
                {step === 0 && (
                    <StepBasicInfo data={basicData} onChange={upBasic} errors={basicErrors} />
                )}
                {step === 1 && (
                    // ─── FIX: rmVariant now passed as prop ───────────────
                    <StepVariants variants={variants} setVariants={setVariants} rmVariant={rmVariant} errors={variantErrors} />
                )}
                {step === 2 && (
                    <StepImages
                        data={imagesData}
                        onChange={(k: string, v: any) => setImagesData(p => ({ ...p, [k]: v }))}
                        errors={imageErrors}
                    />
                )}
                {step === 3 && (
                    <StepDetails data={detailsData} onChange={upDetails} errors={detailErrors} />
                )}
            </View>

            {/* Bottom bar */}
            <View style={sc.bar}>
                {step === 0 ? (
                    <TouchableOpacity style={sc.cancelBtn} onPress={resetAndGoBack}>
                        <AppText style={sc.cancelTxt}>Cancel</AppText>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={sc.prevBtn} onPress={() => setStep(s => s - 1)}>
                        <Ionicons name="chevron-back" size={16} color={C.navy} />
                        <AppText style={sc.prevTxt}>Back</AppText>
                    </TouchableOpacity>
                )}
                {step === 3 ? (
                    <TouchableOpacity style={sc.saveBtn} onPress={handleSave}>
                        <MaterialCommunityIcons name="content-save-check-outline" size={18} color={C.white} />
                        <AppText style={sc.saveTxt}>Save Product</AppText>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={sc.nextBtn} onPress={handleContinue}>
                        <AppText style={sc.nextTxt}>Continue</AppText>
                        <Ionicons name="chevron-forward" size={16} color={C.white} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Toast overlay — rendered last so it sits on top */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </SafeAreaView>
    );
};

// ─────────────────────────────────────────────────────────────
// SHARED ATOM STYLES
// ─────────────────────────────────────────────────────────────
const at = StyleSheet.create({
    card: { backgroundColor: C.cardBg, borderRadius: 16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, borderWidth: 1, borderColor: C.border, shadowColor: "#0F1A4A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    secHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, paddingLeft: 10, borderLeftWidth: 3, borderRadius: 2 },
    secHeadText: { fontFamily: fontFamilies.bold, fontSize: 15, letterSpacing: 0.1 },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
    cardHint: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, marginBottom: 10, fontStyle: "italic" },
    lbl: { fontFamily: fontFamilies.semiBold, fontSize: 12.5, color: C.textMid, marginBottom: 6, marginTop: 12 },
    hint: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 4 },
    cc: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, textAlign: "right", marginTop: 3 },
    fieldWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
    fieldFocused: { borderColor: C.navy, backgroundColor: C.white },
    fieldError: { borderColor: C.red, backgroundColor: "#FFF8F8" },
    fieldPfx: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid, marginRight: 6 },
    fieldInput: { flex: 1, fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, paddingVertical: 10 },
    drop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, minHeight: 44 },
    dropText: { fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, flex: 1 },
    dropPh: { color: C.textPlaceholder },
    hsnWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
    hsnInput: { flex: 1, fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, paddingVertical: 10 },
    row2: { flexDirection: "row", gap: 10 },
    row3: { flexDirection: "row", gap: 8 },
    edCard: { borderWidth: 1.2, borderColor: C.border, borderRadius: 10, overflow: "hidden" },
    toolbar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 2, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: "#F2F4FB", borderBottomWidth: 1, borderBottomColor: C.border },
    tbBtn: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6, minWidth: 28, alignItems: "center", justifyContent: "center" },
    tbTxt: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textMid },
    tbSep: { width: 1, height: 16, backgroundColor: C.border, marginHorizontal: 4 },
    edInput: { paddingHorizontal: 12, paddingVertical: 10, fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, minHeight: 56 },
    edFoot: { paddingHorizontal: 12, paddingBottom: 8, alignItems: "flex-end" },
    radioRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    radioPill: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
    radioPillOn: { borderColor: C.navy, backgroundColor: C.navyGhost },
    radioDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.border },
    radioDotOn: { borderColor: C.navy, backgroundColor: C.navy },
    radioPillTxt: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textMid },
    radioPillTxtOn: { color: C.navy, fontFamily: fontFamilies.semiBold },
    customRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    tog: { width: 44, height: 26, borderRadius: 13, backgroundColor: C.border, justifyContent: "center", paddingHorizontal: 2, marginTop: 2 },
    togOn: { backgroundColor: C.accent5 },
    togThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 2 },
    togThumbOn: { transform: [{ translateX: 18 }] },
    customTitle: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textDark },
    customSub: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, marginTop: 3, lineHeight: 17 },
    custExpandWrap: { marginTop: 4 },
    custTogRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
    custTogTitle: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.textDark },
    custTogSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 2, lineHeight: 16 },
    custNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16, backgroundColor: "#EDFAF4", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#A3E9C8" },
    custNoteTxt: { fontFamily: fontFamilies.regular, fontSize: 11.5, color: C.accent5, flex: 1, lineHeight: 17 },
    custSubField: { flexDirection: "row", gap: 10, marginTop: 10, marginLeft: 8, paddingLeft: 4 },
    custSubFieldBar: { width: 2, borderRadius: 2, backgroundColor: C.accent5, alignSelf: "stretch", opacity: 0.5 },
});

// ─── Variant Styles ───────────────────────────────────────────
const vt = StyleSheet.create({
    hdr: { flexDirection: "row", alignItems: "center", gap: 8 },
    badge: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    badgeTxt: { fontFamily: fontFamilies.bold, fontSize: 12, color: C.navy },
    title: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark, flex: 1 },
    rmBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    rmTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.red },
    lblRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 6 },
    auto: { backgroundColor: C.greenPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    autoTxt: { fontFamily: fontFamilies.semiBold, fontSize: 10, color: C.greenText },
    fileRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: C.inputBg },
    fileTxt: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textLight, flex: 1 },
    browseBtn: { borderWidth: 1, borderColor: C.navyBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
    browseTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.navy },
    addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: C.navy, borderRadius: 14, paddingVertical: 13, marginBottom: 14 },
    addIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    addTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.navy },
    infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.navyGhost, borderRadius: 12, padding: 12 },
    infoTxt: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textMid, flex: 1, lineHeight: 18 },
});

// ─── Details Styles ───────────────────────────────────────────
const dt = StyleSheet.create({
    outBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.2, borderColor: C.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    outBtnTxt: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: C.navy },
    togRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
    togLbl: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textMid },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
    addBtnTxt: { fontFamily: fontFamilies.semiBold, fontSize: 12.5, color: C.navy },
    specRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    specDel: { width: 36, height: 36, backgroundColor: C.redPale, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});

// ─── Screen Styles ────────────────────────────────────────────
const sc = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { backgroundColor: C.navyDeep, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 10, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 10 : 10 },
    hBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
    hCenter: { flex: 1, alignItems: "center" },
    hTitle: { fontFamily: fontFamilies.bold, fontSize: 17, color: C.white },
    hSub: { fontFamily: fontFamilies.regular, fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },
    bar: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10 },
    cancelBtn: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1.2, borderColor: C.border, borderRadius: 12, paddingVertical: 13 },
    cancelTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid },
    prevBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 12, paddingVertical: 13 },
    prevTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.navy },
    nextBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 13 },
    nextTxt: { fontFamily: fontFamilies.bold, fontSize: 14, color: C.white },
    saveBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 13 },
    saveTxt: { fontFamily: fontFamilies.bold, fontSize: 14, color: C.white },
});

export default AddNewProduct;
