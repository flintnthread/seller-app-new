import React, { useState, useRef, useCallback, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Platform, StatusBar, SafeAreaView, Switch,
    Dimensions, Modal, Animated, Image, Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import {
    useFonts, Outfit_400Regular, Outfit_500Medium,
    Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";

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
    amber: "#D97706",
    amberPale: "#FEF3C7",
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

// ─── MOCK PRODUCT DATA ────────────────────────────────────────
const MOCK_PRODUCT = {
    id: "PRD-2024-00847",
    name: "Classic Cotton Polo T-Shirt",
    category: "Clothing",
    subcategory: "T-Shirts",
    materialType: "Cotton",
    hsnCode: "6109",
    shortDesc: "Premium breathable cotton polo shirt with embroidered logo. Perfect for casual and semi-formal occasions.",
    fullDesc: "Crafted from 100% premium combed cotton, this polo shirt offers exceptional breathability and comfort throughout the day. Features include a two-button placket, ribbed collar and cuffs, side vents for ease of movement, and a subtle embroidered brand logo on the chest. The fabric undergoes a bio-wash process for extra softness and colour fastness. Available in multiple colours and sizes to suit every body type. Machine washable and quick-dry friendly.\n\n• 100% Premium Combed Cotton\n• Bio-Washed for Extra Softness\n• Embroidered Logo\n• Regular Fit\n• Machine Washable",
    length: "72",
    width: "54",
    height: "3",
    weight: "0.28",
    weightSlab: "0-500g",
    fragile: "No",
    customized: true,
    custTitle: "Name Embroidery on Chest",
    custInstructions: "Please provide the name (up to 12 characters) to be embroidered on the left chest area. You can also choose from font styles: Classic, Script, or Block. Specify preferred thread colour matching the shirt or contrast.",
    custLeadDays: "3",
    custCharge: "149",
    custAllowPhoto: false,
    custImageLabel: "",
    custPickedImage: null as string | null,
    custAllowText: true,
    custTextLabel: "Enter name to be embroidered (max 12 characters)",
};

const MOCK_VARIANTS: Variant[] = [
    { id: "v1", color: "White", size: "S", sku: "CPOLO-WHT-S", stock: "48", mrp: "999", sellingPrice: "699", discount: "30", images: [] },
    { id: "v2", color: "White", size: "M", sku: "CPOLO-WHT-M", stock: "62", mrp: "999", sellingPrice: "699", discount: "30", images: [] },
    { id: "v3", color: "Blue", size: "M", sku: "CPOLO-BLU-M", stock: "35", mrp: "999", sellingPrice: "749", discount: "25", images: [] },
    { id: "v4", color: "Black", size: "L", sku: "CPOLO-BLK-L", stock: "27", mrp: "999", sellingPrice: "699", discount: "30", images: [] },
];

const MOCK_DETAILS = {
    sizeChart: "Small Chart",
    returnPolicy: "14 Days Return",
    returnPolicyText: "We accept returns within 14 days of delivery if the product is unused, unwashed, and in its original packaging with all tags intact. Custom embroidered items are non-returnable unless defective.",
    deliveryOption: "Standard Delivery",
    minDays: "3",
    maxDays: "7",
    deliveryInfo: "Dispatched within 24–48 hours. Express delivery available in major metros. Free shipping on orders above ₹499.",
    codEnabled: true,
    onlinePayEnabled: true,
    warranty: "30-day manufacturing defect warranty. Fabric defects covered under standard quality guarantee.",
    careInstructions: "Machine wash cold (30°C). Do not bleach. Tumble dry low. Cool iron. Do not dry clean. Wash dark colours separately.",
};

// Mock existing product images
const EXISTING_IMAGES = [
    "https://picsum.photos/seed/polo_front/400/400",
    "https://picsum.photos/seed/polo_back/400/400",
    "https://picsum.photos/seed/polo_side/400/400",
];

// ─────────────────────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────────────────────
type ToastItem = { id: number; message: string; type: "error" | "success" };
let toastIdCounter = 0;

const ToastContainer = ({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: number) => void }) => (
    <View style={ts.container} pointerEvents="none">
        {toasts.map((t) => <ToastBubble key={t.id} item={t} onRemove={onRemove} />)}
    </View>
);

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
            <Text style={ts.msg} numberOfLines={2}>{item.message}</Text>
        </Animated.View>
    );
};

const ts = StyleSheet.create({
    container: { position: "absolute", top: 90, right: 0, left: 0, zIndex: 9999, alignItems: "flex-end", paddingRight: 14, gap: 8 },
    bubble: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, maxWidth: SW * 0.82, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 10, borderTopRightRadius: 4 },
    iconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
    msg: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.white, flex: 1, lineHeight: 18 },
});

function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const showToast = useCallback((message: string, type: "error" | "success" = "error") => {
        const id = ++toastIdCounter;
        setToasts(p => [...p, { id, message, type }]);
    }, []);
    const removeToast = useCallback((id: number) => { setToasts(p => p.filter(t => t.id !== id)); }, []);
    const showErrors = useCallback((errors: string[]) => {
        errors.forEach((msg, i) => { setTimeout(() => showToast(msg, "error"), i * 150); });
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
const Card = ({ children, style }: any) => <View style={[at.card, style]}>{children}</View>;

const SecHead = ({ icon, title, accent = C.accent1 }: { icon: string; title: string; accent?: string }) => (
    <View style={[at.secHead, { borderLeftColor: accent }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={accent} />
        <Text style={[at.secHeadText, { color: accent }]}>{title}</Text>
    </View>
);

const Lbl = ({ text, required }: { text: string; required?: boolean }) => (
    <Text style={at.lbl}>{text}{required && <Text style={{ color: C.red }}> *</Text>}</Text>
);

const Field = ({ placeholder, value, onChangeText, keyboardType = "default", multiline = false, lines = 1, maxLength, prefix, hasError }: any) => {
    const [focused, setFocused] = useState(false);
    return (
        <View style={[at.fieldWrap, focused && at.fieldFocused, multiline && { height: lines * 22 + 26, alignItems: "flex-start" }, hasError && at.fieldError]}>
            {prefix && <Text style={at.fieldPfx}>{prefix}</Text>}
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
        <Text style={[at.dropText, !value && at.dropPh]} numberOfLines={1}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={15} color={C.textLight} />
    </TouchableOpacity>
);

const Divider = () => <View style={at.divider} />;
const Hint = ({ text }: { text: string }) => <Text style={at.hint}>{text}</Text>;
const CC = ({ cur, max }: { cur: number; max: number }) => <Text style={at.cc}>{cur}/{max}</Text>;

// ─── Picker Modal ─────────────────────────────────────────────
const PM = ({ visible, title, options, selected, onSelect, onClose }: any) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={pm.overlay} activeOpacity={1} onPress={onClose} />
        <View style={pm.sheet}>
            <View style={pm.drag} />
            <View style={pm.hdr}>
                <Text style={pm.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={pm.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={18} color={C.textMid} />
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {options.map((opt: string) => (
                    <TouchableOpacity key={opt} style={[pm.item, selected === opt && pm.itemOn]} onPress={() => { onSelect(opt); onClose(); }}>
                        <Text style={[pm.itemTxt, selected === opt && pm.itemTxtOn]}>{opt}</Text>
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
    title: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.textDark },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
    itemOn: { backgroundColor: C.navyGhost },
    itemTxt: { fontFamily: "Outfit_500Medium", fontSize: 14, color: C.textMid },
    itemTxtOn: { fontFamily: "Outfit_600SemiBold", color: C.navy },
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
                : <Text style={[at.tbTxt,
                label === "B" && { fontFamily: "Outfit_800ExtraBold" },
                label === "I" && { fontStyle: "italic" },
                label === "U" && { textDecorationLine: "underline" },
                active && { color: C.white },
                ]}>{label}</Text>
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
    uri: string | null; onPick: (uri: string) => void; onRemove: () => void; hasError?: boolean;
}) => {
    const [sourceModal, setSourceModal] = useState(false);

    const requestAndPick = async (source: "camera" | "gallery") => {
        setSourceModal(false);
        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) onPick(result.assets[0].uri);
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed."); return; }
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
                            <Text style={cp.changeTxt}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={cp.removeBtn} onPress={onRemove}>
                            <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
                            <Text style={cp.removeTxt}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={cp.checkBadge}><MaterialCommunityIcons name="check-circle" size={20} color={C.green} /></View>
                </View>
            ) : (
                <TouchableOpacity style={[cp.uploadBox, hasError && { borderColor: C.red, backgroundColor: "#FFF8F8" }]} onPress={() => setSourceModal(true)} activeOpacity={0.75}>
                    <View style={cp.uploadIconWrap}><MaterialCommunityIcons name="image-plus" size={28} color={C.navyLight} /></View>
                    <Text style={cp.uploadTitle}>Tap to upload reference image</Text>
                    <Text style={cp.uploadSub}>JPG · PNG · WebP · Max 5 MB</Text>
                </TouchableOpacity>
            )}
            <Modal visible={sourceModal} transparent animationType="slide" onRequestClose={() => setSourceModal(false)}>
                <TouchableOpacity style={cp.modalOverlay} activeOpacity={1} onPress={() => setSourceModal(false)} />
                <View style={cp.modalSheet}>
                    <View style={cp.modalDrag} />
                    <Text style={cp.modalTitle}>Choose Image Source</Text>
                    <TouchableOpacity style={cp.modalOption} onPress={() => requestAndPick("camera")}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EEF1FA" }]}><MaterialCommunityIcons name="camera-outline" size={22} color={C.navy} /></View>
                        <View style={{ flex: 1 }}><Text style={cp.modalOptTitle}>Take a Photo</Text><Text style={cp.modalOptSub}>Use your camera right now</Text></View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={cp.modalOption} onPress={() => requestAndPick("gallery")}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EDFAF4" }]}><MaterialCommunityIcons name="image-outline" size={22} color={C.accent5} /></View>
                        <View style={{ flex: 1 }}><Text style={cp.modalOptTitle}>Choose from Gallery</Text><Text style={cp.modalOptSub}>Pick from your photo library</Text></View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={cp.modalCancel} onPress={() => setSourceModal(false)}>
                        <Text style={cp.modalCancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
};

const cp = StyleSheet.create({
    uploadBox: { marginTop: 10, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, gap: 6, backgroundColor: C.inputBg },
    uploadIconWrap: { width: 56, height: 56, borderRadius: 14, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    uploadTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textMid, textAlign: "center" },
    uploadSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, textAlign: "center" },
    previewWrap: { marginTop: 10, borderRadius: 14, overflow: "hidden", height: 180, position: "relative" },
    previewImg: { width: "100%", height: "100%" },
    previewOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 8, padding: 10, backgroundColor: "rgba(10,20,60,0.55)" },
    changeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
    changeTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.white },
    removeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(220,50,50,0.55)", borderRadius: 9, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(255,100,100,0.3)" },
    removeTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.white },
    checkBadge: { position: "absolute", top: 10, right: 10, backgroundColor: C.white, borderRadius: 12 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(10,20,60,0.3)" },
    modalSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, paddingHorizontal: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 24 },
    modalDrag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 18 },
    modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textDark, marginBottom: 16 },
    modalOption: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    modalIconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    modalOptTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textDark },
    modalOptSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginTop: 2 },
    modalCancel: { marginTop: 18, alignItems: "center", paddingVertical: 14, borderWidth: 1.2, borderColor: C.border, borderRadius: 14 },
    modalCancelTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid },
});

// ─────────────────────────────────────────────────────────────
// REUSABLE IMAGE PICKER GRID
// ─────────────────────────────────────────────────────────────
const MAX_IMAGES = 6;

const ImagePickerGrid = ({ images, onAdd, onRemove, maxCount = MAX_IMAGES, hasError = false, label = "Add Photo" }: {
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
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) onAdd([result.assets[0].uri]);
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed."); return; }
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 6 }} style={{ marginTop: 10 }}>
                {canAdd && (
                    <TouchableOpacity style={[ipg.addSlot, hasError && images.length === 0 && { borderColor: C.red, backgroundColor: "#FFF8F8" }]} onPress={() => setSrcModal(true)} activeOpacity={0.75}>
                        <View style={ipg.addIcon}><MaterialCommunityIcons name="camera-plus-outline" size={22} color={C.navyLight} /></View>
                        <Text style={ipg.addTxt}>{label}</Text>
                        <Text style={ipg.addCount}>{images.length}/{maxCount}</Text>
                    </TouchableOpacity>
                )}
                {images.map((uri, i) => (
                    <View key={uri + i} style={ipg.thumb}>
                        <Image source={{ uri }} style={ipg.thumbImg} resizeMode="cover" />
                        {i === 0 && <View style={ipg.primaryBadge}><Text style={ipg.primaryTxt}>Primary</Text></View>}
                        <TouchableOpacity style={ipg.removeBtn} onPress={() => onRemove(i)}>
                            <Ionicons name="close" size={11} color={C.white} />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
            {images.length > 0 && <Text style={ipg.hint}>First image is used as primary · tap × to remove</Text>}
            <Modal visible={srcModal} transparent animationType="slide" onRequestClose={() => setSrcModal(false)}>
                <TouchableOpacity style={cp.modalOverlay} activeOpacity={1} onPress={() => setSrcModal(false)} />
                <View style={cp.modalSheet}>
                    <View style={cp.modalDrag} />
                    <Text style={cp.modalTitle}>Add Image</Text>
                    <TouchableOpacity style={cp.modalOption} onPress={() => pickImages("camera")}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EEF1FA" }]}><MaterialCommunityIcons name="camera-outline" size={22} color={C.navy} /></View>
                        <View style={{ flex: 1 }}><Text style={cp.modalOptTitle}>Take a Photo</Text><Text style={cp.modalOptSub}>Use your camera right now</Text></View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={cp.modalOption} onPress={() => pickImages("gallery")}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EDFAF4" }]}><MaterialCommunityIcons name="image-multiple-outline" size={22} color={C.accent5} /></View>
                        <View style={{ flex: 1 }}><Text style={cp.modalOptTitle}>Choose from Gallery</Text><Text style={cp.modalOptSub}>Pick up to {maxCount - images.length} photo{maxCount - images.length !== 1 ? "s" : ""}</Text></View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={cp.modalCancel} onPress={() => setSrcModal(false)}>
                        <Text style={cp.modalCancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
};

const ipg = StyleSheet.create({
    addSlot: { width: 90, height: 90, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: C.inputBg },
    addIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    addTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: C.navyLight, textAlign: "center" },
    addCount: { fontFamily: "Outfit_400Regular", fontSize: 9, color: C.textLight },
    thumb: { width: 90, height: 90, borderRadius: 14, overflow: "hidden", position: "relative" },
    thumbImg: { width: "100%", height: "100%" },
    primaryBadge: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(26,43,109,0.72)", paddingVertical: 3, alignItems: "center" },
    primaryTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 9, color: C.white, letterSpacing: 0.4 },
    removeBtn: { position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(200,30,30,0.85)", alignItems: "center", justifyContent: "center" },
    hint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginTop: 6 },
});

// ─────────────────────────────────────────────────────────────
// STEP 1 — Basic Info (Edit)
// ─────────────────────────────────────────────────────────────
const StepBasicInfo = ({ data, onChange, errors }: any) => {
    const [catPick, setCatPick] = useState(false);
    const [subPick, setSubPick] = useState(false);
    const [matPick, setMatPick] = useState(false);

    const subcats = data.category ? (SUBCATEGORIES[data.category] || []) : [];
    const hasErr = (field: string) => errors.some((e: string) => e.toLowerCase().includes(field.toLowerCase()));

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 }}>
            {/* Product ID badge */}
            <View style={eb.idBadge}>
                <MaterialCommunityIcons name="barcode" size={14} color={C.navyLight} />
                <Text style={eb.idText}>Product ID: {MOCK_PRODUCT.id}</Text>
                <View style={eb.idStatus}><Text style={eb.idStatusTxt}>● Active</Text></View>
            </View>

            <Card>
                <SecHead icon="tag-outline" title="Product Identity" accent={C.accent1} />
                <Divider />
                <Lbl text="Product Name" required />
                <Field placeholder="Enter product name" value={data.name} onChangeText={(v: string) => onChange("name", v)} hasError={hasErr("product name")} />
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

            <Card style={{ marginTop: 12 }}>
                <SecHead icon="text-box-edit-outline" title="Descriptions" accent={C.accent2} />
                <Divider />
                <Lbl text="Short Description" required />
                <RichEditor placeholder="Short, punchy summary…" value={data.shortDesc} onChangeText={(v: string) => onChange("shortDesc", v)} maxLength={250} hasError={hasErr("short description")} />
                <View style={{ height: 14 }} />
                <Lbl text="Full Description" required />
                <RichEditor placeholder="Full product description…" value={data.fullDesc} onChangeText={(v: string) => onChange("fullDesc", v)} maxLength={2000} hasError={hasErr("full description")} />
            </Card>

            <Card style={{ marginTop: 12 }}>
                <SecHead icon="cube-scan" title="Product Dimensions" accent={C.accent3} />
                <Divider />
                <Text style={at.cardHint}>Enter gross dimensions (including packaging)</Text>
                <View style={at.row3}>
                    {([["Length cm", "length", "30"], ["Width cm", "width", "20"], ["Height cm", "height", "10"]] as [string, string, string][]).map(([lbl, key, ph]) => (
                        <View key={key} style={{ flex: 1 }}>
                            <Lbl text={lbl} required />
                            <Field placeholder={ph} value={data[key]} onChangeText={(v: string) => onChange(key, v)} keyboardType="numeric" hasError={hasErr(key)} />
                        </View>
                    ))}
                </View>
            </Card>

            <Card style={{ marginTop: 12 }}>
                <SecHead icon="weight-kilogram" title="Weight & Delivery" accent={C.accent4} />
                <Divider />
                <Text style={at.cardHint}>Enter gross weight (including packaging)</Text>
                <View style={at.row2}>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Weight (kg)" required />
                        <Field placeholder="e.g. 0.5" value={data.weight} onChangeText={(v: string) => onChange("weight", v)} keyboardType="decimal-pad" hasError={hasErr("weight")} />
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
                            <Text style={[at.radioPillTxt, data.fragile === opt && at.radioPillTxtOn]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Hint text="Mark if special protective packaging is required" />
            </Card>

            <Card style={{ marginTop: 12 }}>
                <SecHead icon="palette-outline" title="Customization" accent={C.accent5} />
                <Divider />
                <TouchableOpacity style={at.customRow} onPress={() => onChange("customized", !data.customized)} activeOpacity={0.7}>
                    <View style={[at.tog, data.customized && at.togOn]}>
                        <View style={[at.togThumb, data.customized && at.togThumbOn]} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={at.customTitle}>Customized Product</Text>
                        <Text style={at.customSub}>Enable if buyers can personalise this product</Text>
                    </View>
                </TouchableOpacity>

                {data.customized && (
                    <View style={at.custExpandWrap}>
                        <Divider />
                        <Lbl text="Customization Title" required />
                        <Field placeholder="e.g. Personalised Name Engraving" value={data.custTitle} onChangeText={(v: string) => onChange("custTitle", v)} maxLength={100} hasError={hasErr("customization title")} />
                        <Lbl text="Instructions for Buyer" required />
                        <Field placeholder="Instructions for the buyer…" value={data.custInstructions} onChangeText={(v: string) => onChange("custInstructions", v)} multiline lines={3} maxLength={500} hasError={hasErr("customization instructions")} />
                        <CC cur={(data.custInstructions || "").length} max={500} />

                        <Lbl text="Allow Reference Image Upload" />
                        <View style={at.custTogRow}>
                            <Switch value={data.custAllowPhoto} onValueChange={v => onChange("custAllowPhoto", v)} trackColor={{ false: C.border, true: C.accent5 }} thumbColor={C.white} />
                            <View style={{ flex: 1 }}>
                                <Text style={at.custTogTitle}>Buyer can upload a reference image</Text>
                                <Text style={at.custTogSub}>Accepted: JPG / PNG · Max 5 MB · 1 image</Text>
                            </View>
                        </View>
                        {data.custAllowPhoto && (
                            <View style={at.custSubField}>
                                <View style={at.custSubFieldBar} />
                                <View style={{ flex: 1 }}>
                                    <Lbl text="Image Upload Label" required />
                                    <Field placeholder="e.g. Upload your reference photo here" value={data.custImageLabel} onChangeText={(v: string) => onChange("custImageLabel", v)} maxLength={120} hasError={hasErr("image upload label")} />
                                    <Hint text="Label shown to the buyer on the upload field" />
                                    <Lbl text="Sample / Reference Image" />
                                    <CustImagePicker uri={data.custPickedImage} onPick={(uri: string) => onChange("custPickedImage", uri)} onRemove={() => onChange("custPickedImage", null)} hasError={false} />
                                    <Hint text="Optionally upload a sample so buyers know what to send" />
                                </View>
                            </View>
                        )}

                        <Lbl text="Allow Custom Text / Name" />
                        <View style={at.custTogRow}>
                            <Switch value={data.custAllowText} onValueChange={v => onChange("custAllowText", v)} trackColor={{ false: C.border, true: C.accent5 }} thumbColor={C.white} />
                            <View style={{ flex: 1 }}>
                                <Text style={at.custTogTitle}>Buyer can enter a name or message</Text>
                                <Text style={at.custTogSub}>Max 100 characters · any case allowed</Text>
                            </View>
                        </View>
                        {data.custAllowText && (
                            <View style={at.custSubField}>
                                <View style={at.custSubFieldBar} />
                                <View style={{ flex: 1 }}>
                                    <Lbl text="Text Field Label" required />
                                    <Field placeholder="e.g. Enter the name to be printed" value={data.custTextLabel} onChangeText={(v: string) => onChange("custTextLabel", v)} maxLength={120} hasError={hasErr("custom text field label")} />
                                    <Hint text="Label shown to the buyer on the text input field" />
                                </View>
                            </View>
                        )}

                        <View style={at.custNote}>
                            <MaterialCommunityIcons name="information-outline" size={15} color={C.accent5} />
                            <Text style={at.custNoteTxt}>Customised orders cannot be cancelled after production begins. Make sure your policy is clearly stated.</Text>
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
// STEP 2 — Variants (Edit)
// ─────────────────────────────────────────────────────────────
type Variant = {
    id: string; color: string; size: string; sku: string;
    stock: string; mrp: string; sellingPrice: string; discount: string; images: string[];
};

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
        setVariants((p: Variant[]) => [...p, { id, color: "", size: "", sku: "", stock: "", mrp: "", sellingPrice: "", discount: "0", images: [] }]);
    };

    const addVariantImage = (id: string, uris: string[]) => {
        setVariants((p: Variant[]) => p.map((v: Variant) => v.id !== id ? v : { ...v, images: [...v.images, ...uris].slice(0, MAX_IMAGES) }));
    };
    const removeVariantImage = (id: string, index: number) => {
        setVariants((p: Variant[]) => p.map((v: Variant) => v.id !== id ? v : { ...v, images: v.images.filter((_, i) => i !== index) }));
    };

    const upVariant = (id: string, field: string, value: string) => {
        setVariants((p: Variant[]) => p.map((v: Variant) => {
            if (v.id !== id) return v;
            const u = { ...v, [field]: value };
            if (field === "mrp" || field === "sellingPrice") {
                const mrp = parseFloat(field === "mrp" ? value : u.mrp) || 0;
                const sp = parseFloat(field === "sellingPrice" ? value : u.sellingPrice) || 0;
                if (mrp > 0 && sp > 0 && sp <= mrp) u.discount = String(Math.round(((mrp - sp) / mrp) * 100));
            }
            return u;
        }));
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 }}>
            {/* Summary strip */}
            <View style={eb.variantSummary}>
                <MaterialCommunityIcons name="tune-variant" size={15} color={C.navyLight} />
                <Text style={eb.variantSummaryTxt}>{variants.length} variant{variants.length !== 1 ? "s" : ""} — editing existing product</Text>
            </View>

            {variants.map((v: Variant, idx: number) => (
                <Card key={v.id} style={{ marginBottom: 12 }}>
                    <View style={vt.hdr}>
                        <View style={vt.badge}><Text style={vt.badgeTxt}>#{idx + 1}</Text></View>
                        <Text style={vt.title}>Variant</Text>
                        <View style={[eb.stockBadge, parseInt(v.stock) < 10 && eb.stockBadgeLow]}>
                            <Text style={[eb.stockTxt, parseInt(v.stock) < 10 && eb.stockTxtLow]}>
                                Stock: {v.stock || "0"}
                            </Text>
                        </View>
                        {variants.length > 1 && (
                            <TouchableOpacity onPress={() => rmVariant(v.id)} style={vt.rmBtn}>
                                <MaterialCommunityIcons name="trash-can-outline" size={15} color={C.red} />
                                <Text style={vt.rmTxt}>Remove</Text>
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
                                <View style={vt.auto}><Text style={vt.autoTxt}>Auto</Text></View>
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
                            <View style={vt.auto}><Text style={vt.autoTxt}>Auto</Text></View>
                        </View>
                        <Field placeholder="0" value={v.discount} onChangeText={(val: string) => upVariant(v.id, "discount", val)} keyboardType="numeric" />
                    </View>
                    <Divider />
                    {/* <Lbl text="Variant Images" />
                    <Hint text="Add up to 6 images · first image is used as primary" />
                    <ImagePickerGrid images={v.images} onAdd={(uris: string[]) => addVariantImage(v.id, uris)} onRemove={(i: number) => removeVariantImage(v.id, i)} maxCount={6} hasError={hasErr(v.id, "image")} label="Add Photo" /> */}
                    <Lbl text="Variant Video (optional)" />
                    <TouchableOpacity style={vt.fileRow}>
                        <MaterialCommunityIcons name="file-video-outline" size={18} color={C.navyLight} />
                        <Text style={vt.fileTxt}>No file chosen</Text>
                        <View style={vt.browseBtn}><Text style={vt.browseTxt}>Browse</Text></View>
                    </TouchableOpacity>
                </Card>
            ))}

            <TouchableOpacity style={vt.addBtn} onPress={addVariant}>
                <View style={vt.addIcon}><Ionicons name="add" size={18} color={C.navy} /></View>
                <Text style={vt.addTxt}>Add Another Variant</Text>
            </TouchableOpacity>

            <View style={vt.infoBox}>
                <MaterialCommunityIcons name="information-outline" size={16} color={C.navyLight} />
                <Text style={vt.infoTxt}>Each variant can have its own price, stock, and images. At least one variant is required.</Text>
            </View>

            <PM visible={!!clrPick} title="Select Color" options={COLORS_LIST} selected={variants.find((v: Variant) => v.id === clrPick)?.color || ""} onSelect={(val: string) => { if (clrPick) upVariant(clrPick, "color", val); }} onClose={() => setClrPick(null)} />
            <PM visible={!!szPick} title="Select Size" options={SIZES_LIST} selected={variants.find((v: Variant) => v.id === szPick)?.size || ""} onSelect={(val: string) => { if (szPick) upVariant(szPick, "size", val); }} onClose={() => setSzPick(null)} />
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// STEP 3 — Images (Edit)  ← UPDATED
// ─────────────────────────────────────────────────────────────
const StepImages = ({ data, onChange, errors }: any) => {
    const hasErr = errors.some((e: string) => e.toLowerCase().includes("primary"));

    const [existingImages, setExistingImages] = useState<string[]>(EXISTING_IMAGES);
    const [primaryIndex, setPrimaryIndex] = useState(0);
    const [newImages, setNewImages] = useState<string[]>([]);
    const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
    const [srcModal, setSrcModal] = useState(false);

    const MAX_TOTAL = 8;
    const allImages = [...existingImages, ...newImages];
    const totalCount = allImages.length;
    const canAdd = totalCount < MAX_TOTAL;

    // Keep parent's primaryImage in sync for validation
    useEffect(() => {
        onChange("primaryImage", allImages[primaryIndex] ?? null);
    }, [existingImages, newImages, primaryIndex]);

    const pickNewImages = async (source: "camera" | "gallery") => {
        setSrcModal(false);
        const remaining = MAX_TOTAL - totalCount;
        if (remaining <= 0) return;

        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed."); return; }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, quality: 0.85,
            });
            if (!result.canceled && result.assets?.[0]?.uri) {
                const uri = result.assets[0].uri;
                setNewImages(p => [...p, uri]);
            }
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed."); return; }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: remaining > 1,
                selectionLimit: remaining,
                quality: 0.85,
            });
            if (!result.canceled && result.assets?.length)
                setNewImages(p => [...p, ...result.assets.map((a: any) => a.uri)]);
        }
    };

    const handleDeleteConfirm = () => {
        if (deleteConfirmIdx === null) return;
        const idx = deleteConfirmIdx;
        setDeleteConfirmIdx(null);

        const newTotal = totalCount - 1;
        let newPrimary = primaryIndex;

        if (idx < existingImages.length) {
            setExistingImages(prev => prev.filter((_, i) => i !== idx));
        } else {
            const newIdx = idx - existingImages.length;
            setNewImages(prev => prev.filter((_, i) => i !== newIdx));
        }

        if (newTotal === 0) {
            newPrimary = 0;
        } else if (primaryIndex === idx) {
            newPrimary = 0;
        } else if (primaryIndex > idx) {
            newPrimary = primaryIndex - 1;
        }
        setPrimaryIndex(newPrimary);
    };

    const renderImageCard = (uri: string, globalIdx: number, isNew: boolean) => {
        const isPrimary = primaryIndex === globalIdx;
        return (
            <View
                key={uri + globalIdx}
                style={[si.imageCard, isPrimary && si.imageCardPrimary, isNew && si.imageCardNew]}
            >
                <Image source={{ uri }} style={si.image} resizeMode="cover" />

                {/* Primary ribbon */}
                {isPrimary && (
                    <View style={si.primaryRibbon}>
                        <MaterialCommunityIcons name="star" size={10} color={C.white} />
                        <Text style={si.primaryRibbonTxt}>Primary</Text>
                    </View>
                )}

                {/* New badge */}
                {isNew && !isPrimary && (
                    <View style={si.newImageBadge}>
                        <Text style={si.newImageBadgeTxt}>New</Text>
                    </View>
                )}

                {/* Delete button */}
                <TouchableOpacity style={si.deleteBtn} onPress={() => setDeleteConfirmIdx(globalIdx)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={13} color={C.white} />
                </TouchableOpacity>

                {/* Set primary radio row */}
                <TouchableOpacity style={si.radioRow} onPress={() => setPrimaryIndex(globalIdx)} activeOpacity={0.75}>
                    <View style={[si.radio, isPrimary && si.radioOn]}>
                        {isPrimary && <View style={si.radioDot} />}
                    </View>
                    <Text style={[si.radioLbl, isPrimary && si.radioLblOn]}>
                        {isPrimary ? "Primary Image" : "Set as Primary"}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 }}
        >
            {/* Tip banner */}
            <View style={eb.tipCard}>
                <MaterialCommunityIcons name="lightbulb-outline" size={16} color={C.amber} />
                <Text style={eb.tipTxt}>
                    High-quality images increase conversions. Tap "Set as Primary" on any image to change the main display image.
                </Text>
            </View>

            <Card>
                <SecHead icon="image-multiple-outline" title="Product Images" accent={C.accent2} />
                <Divider />

                {/* ── Current Images Section ── */}
                {existingImages.length > 0 && (
                    <>
                        <View style={si.sectionRow}>
                            <View style={si.sectionLabelWrap}>
                                <MaterialCommunityIcons name="cloud-check-outline" size={13} color={C.accent2} />
                                <Text style={si.sectionLabel}>Current Images</Text>
                            </View>
                            <Text style={si.sectionCount}>{existingImages.length} saved</Text>
                        </View>
                        <View style={si.imageGrid}>
                            {existingImages.map((uri, i) => renderImageCard(uri, i, false))}
                        </View>
                    </>
                )}

                {/* ── New Images Section ── */}
                {newImages.length > 0 && (
                    <>
                        <View style={[si.sectionRow, { marginTop: 18 }]}>
                            <View style={si.sectionLabelWrap}>
                                <MaterialCommunityIcons name="upload-outline" size={13} color={C.accent5} />
                                <Text style={[si.sectionLabel, { color: C.accent5 }]}>New Images</Text>
                            </View>
                            <View style={si.pendingBadge}>
                                <Text style={si.pendingBadgeTxt}>Pending Upload</Text>
                            </View>
                        </View>
                        <View style={si.imageGrid}>
                            {newImages.map((uri, i) =>
                                renderImageCard(uri, existingImages.length + i, true)
                            )}
                        </View>
                    </>
                )}

                {/* ── Empty state ── */}
                {totalCount === 0 && (
                    <View style={si.emptyBox}>
                        <MaterialCommunityIcons name="image-off-outline" size={40} color={C.textLight} />
                        <Text style={si.emptyTitle}>No images yet</Text>
                        <Text style={si.emptyDesc}>Add at least one product image to proceed.</Text>
                    </View>
                )}

                {/* ── Add New Images ── */}
                <View style={[si.sectionRow, { marginTop: 18, marginBottom: 6 }]}>
                    <View style={si.sectionLabelWrap}>
                        <MaterialCommunityIcons name="image-plus" size={13} color={C.textMid} />
                        <Text style={si.sectionLabel}>Add New Images</Text>
                    </View>
                    <Text style={[si.sectionCount, totalCount >= MAX_TOTAL && { color: C.red }]}>
                        {totalCount}/{MAX_TOTAL}
                    </Text>
                </View>

                {canAdd ? (
                    <TouchableOpacity
                        style={[
                            si.addBox,
                            hasErr && totalCount === 0 && { borderColor: C.red, backgroundColor: "#FFF8F8" },
                        ]}
                        onPress={() => setSrcModal(true)}
                        activeOpacity={0.75}
                    >
                        <View style={si.addIconWrap}>
                            <MaterialCommunityIcons
                                name="camera-plus-outline"
                                size={28}
                                color={hasErr && totalCount === 0 ? C.red : C.navyLight}
                            />
                        </View>
                        <Text style={[si.addTitle, hasErr && totalCount === 0 && { color: C.red }]}>
                            {hasErr && totalCount === 0
                                ? "At least one image is required"
                                : "Tap to add more images"}
                        </Text>
                        <Text style={si.addSub}>
                            JPG · PNG · WebP · Max 5 MB · {MAX_TOTAL - totalCount} slot{MAX_TOTAL - totalCount !== 1 ? "s" : ""} remaining
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View style={si.maxBox}>
                        <MaterialCommunityIcons name="check-circle-outline" size={18} color={C.accent5} />
                        <Text style={si.maxTxt}>Maximum {MAX_TOTAL} images reached. Remove one to add more.</Text>
                    </View>
                )}

                {/* Counter hint */}
                {totalCount > 0 && (
                    <Text style={si.hintTxt}>
                        Tap "Set as Primary" to change the main product image · tap 🗑 to remove
                    </Text>
                )}
            </Card>

            {/* ── Image source picker modal ── */}
            <Modal visible={srcModal} transparent animationType="slide" onRequestClose={() => setSrcModal(false)}>
                <TouchableOpacity style={cp.modalOverlay} activeOpacity={1} onPress={() => setSrcModal(false)} />
                <View style={cp.modalSheet}>
                    <View style={cp.modalDrag} />
                    <Text style={cp.modalTitle}>Add Images</Text>
                    <TouchableOpacity style={cp.modalOption} onPress={() => pickNewImages("camera")}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EEF1FA" }]}>
                            <MaterialCommunityIcons name="camera-outline" size={22} color={C.navy} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={cp.modalOptTitle}>Take a Photo</Text>
                            <Text style={cp.modalOptSub}>Use your camera right now</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={cp.modalOption} onPress={() => pickNewImages("gallery")}>
                        <View style={[cp.modalIconWrap, { backgroundColor: "#EDFAF4" }]}>
                            <MaterialCommunityIcons name="image-multiple-outline" size={22} color={C.accent5} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={cp.modalOptTitle}>Choose from Gallery</Text>
                            <Text style={cp.modalOptSub}>
                                Pick up to {MAX_TOTAL - totalCount} photo{MAX_TOTAL - totalCount !== 1 ? "s" : ""}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                    </TouchableOpacity>
                    <TouchableOpacity style={cp.modalCancel} onPress={() => setSrcModal(false)}>
                        <Text style={cp.modalCancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* ── Delete Confirm Modal ── */}
            <Modal visible={deleteConfirmIdx !== null} transparent animationType="fade" onRequestClose={() => setDeleteConfirmIdx(null)}>
                <View style={si.deleteOverlay}>
                    <View style={si.deleteSheet}>
                        <View style={si.deleteIconWrap}>
                            <MaterialCommunityIcons name="trash-can-outline" size={32} color={C.red} />
                        </View>
                        <Text style={si.deleteTitle}>Remove Image?</Text>
                        <Text style={si.deleteBody}>
                            {deleteConfirmIdx !== null && deleteConfirmIdx < existingImages.length
                                ? "This image is saved on the server. It will be removed when you update the product."
                                : "This newly added image will be removed."}
                        </Text>
                        <TouchableOpacity style={si.deleteConfirmBtn} onPress={handleDeleteConfirm}>
                            <Text style={si.deleteConfirmTxt}>Yes, Remove</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={si.deleteCancelBtn} onPress={() => setDeleteConfirmIdx(null)}>
                            <Text style={si.deleteCancelTxt}>Keep It</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

// ─── StepImages Styles ────────────────────────────────────────
const CARD_W = (SW - 28 - 14 - 10) / 2; // 2-column grid

const si = StyleSheet.create({
    sectionRow: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginBottom: 10,
    },
    sectionLabelWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
    sectionLabel: {
        fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: C.textMid,
    },
    sectionCount: {
        fontFamily: "Outfit_500Medium", fontSize: 11.5, color: C.textLight,
    },
    pendingBadge: {
        backgroundColor: "#EDFAF4", borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 3,
        borderWidth: 1, borderColor: "#A3E9C8",
    },
    pendingBadgeTxt: {
        fontFamily: "Outfit_600SemiBold", fontSize: 10, color: C.accent5,
    },
    imageGrid: {
        flexDirection: "row", flexWrap: "wrap", gap: 10,
    },
    imageCard: {
        // width: CARD_W,
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1.5,
        borderColor: C.border,
        backgroundColor: C.inputBg,
        width: 160,
    },
    imageCardPrimary: {
        borderColor: C.navy,
        borderWidth: 2,
    },
    imageCardNew: {
        borderColor: C.accent5,
        borderWidth: 1.5,
    },
    image: {
        width: "100%",
        height: CARD_W,
    },
    primaryRibbon: {
        position: "absolute", top: 0, left: 0, right: 0,
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 4, backgroundColor: C.navy,
        paddingVertical: 5,
    },
    primaryRibbonTxt: {
        fontFamily: "Outfit_700Bold", fontSize: 10, color: C.white, letterSpacing: 0.3,
    },
    newImageBadge: {
        position: "absolute", top: 8, left: 8,
        backgroundColor: C.accent5, borderRadius: 6,
        paddingHorizontal: 7, paddingVertical: 3,
    },
    newImageBadgeTxt: {
        fontFamily: "Outfit_700Bold", fontSize: 9, color: C.white,
    },
    deleteBtn: {
        position: "absolute", top: 8, right: 8,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: "rgba(200,30,30,0.85)",
        alignItems: "center", justifyContent: "center",
    },
    radioRow: {
        flexDirection: "row", alignItems: "center",
        gap: 8, paddingHorizontal: 10, paddingVertical: 9,
        backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border,
    },
    radio: {
        width: 16, height: 16, borderRadius: 8,
        borderWidth: 2, borderColor: C.navyBorder,
        alignItems: "center", justifyContent: "center",
        backgroundColor: C.white,
    },
    radioOn: { borderColor: C.navy },
    radioDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: C.navy,
    },
    radioLbl: {
        fontFamily: "Outfit_500Medium", fontSize: 10.5, color: C.textMid, flex: 1,
    },
    radioLblOn: {
        fontFamily: "Outfit_700Bold", color: C.navy,
    },
    emptyBox: {
        alignItems: "center", paddingVertical: 32, gap: 6,
    },
    emptyTitle: {
        fontFamily: "Outfit_700Bold", fontSize: 15, color: C.textMid, marginTop: 4,
    },
    emptyDesc: {
        fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, textAlign: "center",
    },
    addBox: {
        borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed",
        borderRadius: 14, alignItems: "center", paddingVertical: 22,
        paddingHorizontal: 16, gap: 6, backgroundColor: C.inputBg,
    },
    addIconWrap: {
        width: 56, height: 56, borderRadius: 14,
        backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center",
        marginBottom: 4,
    },
    addTitle: {
        fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textMid, textAlign: "center",
    },
    addSub: {
        fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, textAlign: "center",
    },
    maxBox: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: C.greenPale, borderRadius: 12, padding: 12,
        borderWidth: 1, borderColor: "#A3E9C8",
    },
    maxTxt: {
        fontFamily: "Outfit_500Medium", fontSize: 12, color: C.greenText, flex: 1,
    },
    hintTxt: {
        fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginTop: 10, textAlign: "center",
    },
    // Delete confirm modal
    deleteOverlay: {
        flex: 1, backgroundColor: "rgba(10,20,60,0.45)",
        alignItems: "center", justifyContent: "center", paddingHorizontal: 28,
    },
    deleteSheet: {
        backgroundColor: C.white, borderRadius: 22, padding: 28,
        alignItems: "center", width: "100%",
        shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18, shadowRadius: 24, elevation: 20,
    },
    deleteIconWrap: {
        width: 64, height: 64, borderRadius: 16,
        backgroundColor: C.redPale, alignItems: "center", justifyContent: "center", marginBottom: 14,
    },
    deleteTitle: {
        fontFamily: "Outfit_700Bold", fontSize: 17, color: C.textDark, marginBottom: 8,
    },
    deleteBody: {
        fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textMid,
        textAlign: "center", lineHeight: 20, marginBottom: 22,
    },
    deleteConfirmBtn: {
        width: "100%", backgroundColor: C.red, borderRadius: 13,
        paddingVertical: 13, alignItems: "center", marginBottom: 10,
    },
    deleteConfirmTxt: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.white },
    deleteCancelBtn: {
        width: "100%", backgroundColor: C.navyGhost, borderRadius: 13,
        paddingVertical: 13, alignItems: "center",
    },
    deleteCancelTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.navy },
});

// ─────────────────────────────────────────────────────────────
// STEP 4 — Details (Edit)
// ─────────────────────────────────────────────────────────────
const StepDetails = ({ data, onChange, errors }: any) => {
    const [sizePick, setSizePick] = useState(false);
    const [retPick, setRetPick] = useState(false);
    const [delPick, setDelPick] = useState(false);
    const [features, setFeatures] = useState<string[]>(["100% Premium Combed Cotton", "Bio-Washed for Extra Softness", "Embroidered Logo", "Regular Fit", "Machine Washable"]);
    const [specs, setSpecs] = useState<{ name: string; value: string }[]>([
        { name: "Fabric", value: "100% Cotton" },
        { name: "Fit", value: "Regular" },
        { name: "Neck", value: "Polo / Collar" },
        { name: "Sleeve", value: "Short Sleeve" },
        { name: "Wash Care", value: "Machine Wash" },
    ]);
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
                        <Text style={dt.outBtnTxt}>Create New</Text>
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
                            <Text style={dt.outBtnTxt}>Write Custom</Text>
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
{/* 
            <Card style={{ marginTop: 12 }}>
                <SecHead icon="credit-card-outline" title="Payment Options" accent={C.accent5} />
                <Divider />
                <Hint text="Select all payment methods available for this product." />
                {([["codEnabled", "Cash on Delivery (COD)"], ["onlinePayEnabled", "Online Payment — Razorpay"]] as [string, string][]).map(([key, label]) => (
                    <View key={key} style={dt.togRow}>
                        <Switch value={(data as any)[key]} onValueChange={v => onChange(key, v)} trackColor={{ false: C.border, true: C.navy }} thumbColor={C.white} />
                        <Text style={dt.togLbl}>{label}</Text>
                    </View>
                ))}
            </Card> */}

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
                    <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Enter feature" value={f} onChangeText={(v: string) => { const arr = [...features]; arr[i] = v; setFeatures(arr); }} />
                        </View>
                        <TouchableOpacity style={dt.specDel} onPress={() => setFeatures(p => p.filter((_, idx) => idx !== i))}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.red} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={dt.addBtn} onPress={() => setFeatures(p => [...p, ""])}>
                    <Ionicons name="add" size={15} color={C.navy} />
                    <Text style={dt.addBtnTxt}>Add Feature</Text>
                </TouchableOpacity>
                <Divider />
                <Lbl text="Specifications" />
                {specs.map((sp, i) => (
                    <View key={i} style={dt.specRow}>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Name" value={sp.name} onChangeText={(v: string) => { const arr = [...specs]; if (arr[i]) arr[i]!.name = v; setSpecs(arr); }} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Value" value={sp.value} onChangeText={(v: string) => { const arr = [...specs]; if (arr[i]) arr[i]!.value = v; setSpecs(arr); }} />
                        </View>
                        <TouchableOpacity style={dt.specDel} onPress={() => setSpecs(p => p.filter((_, idx) => idx !== i))}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.red} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={dt.addBtn} onPress={() => setSpecs(p => [...p, { name: "", value: "" }])}>
                    <Ionicons name="add" size={15} color={C.navy} />
                    <Text style={dt.addBtnTxt}>Add Specification</Text>
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
        <View style={spp.wrapper} onLayout={e => setBarW(e.nativeEvent.layout.width)}>
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
                    <View key={`seg-${i}`} pointerEvents="none" style={[spp.seg, { left: lx, top: ly, width: lw, backgroundColor: filled ? STEPS[i - 1]!.color : C.border }]} />
                );
            })}
            {STEPS.map((s, i) => {
                const isActive = i === step;
                const isDone = i < maxUnlocked;
                const isReachable = i <= maxUnlocked;
                const iconBg = (isActive || isDone) ? s.color : s.color + "60";
                return (
                    <TouchableOpacity key={s.key} style={spp.col} onPress={() => isReachable && onTabPress(i)} activeOpacity={isReachable ? 0.75 : 1}>
                        <View style={[spp.circle, { backgroundColor: iconBg }, isActive && { shadowColor: s.color, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 7 }]}>
                            <MaterialCommunityIcons name={s.icon as any} size={18} color={C.white} />
                        </View>
                        <Text style={[spp.lbl, isActive && { color: s.color, fontFamily: "Outfit_700Bold" }, isDone && { color: s.color, fontFamily: "Outfit_600SemiBold" }]}>
                            {s.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const spp = StyleSheet.create({
    wrapper: { flexDirection: "row", backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border, paddingTop: 10, paddingBottom: 12, position: "relative" },
    seg: { position: "absolute", height: LINE_H, borderRadius: LINE_H / 2, zIndex: 0 },
    col: { flex: 1, alignItems: "center", gap: 6, zIndex: 1 },
    circle: { width: ICON_D, height: ICON_D, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    lbl: { fontFamily: "Outfit_500Medium", fontSize: 10, color: C.textLight, textAlign: "center" },
});

// ─────────────────────────────────────────────────────────────
// DISCARD CONFIRM MODAL
// ─────────────────────────────────────────────────────────────
const DiscardModal = ({ visible, onDiscard, onKeep }: { visible: boolean; onDiscard: () => void; onKeep: () => void }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeep}>
        <View style={dm.overlay}>
            <View style={dm.sheet}>
                <View style={dm.iconWrap}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={36} color={C.amber} />
                </View>
                <Text style={dm.title}>Discard Changes?</Text>
                <Text style={dm.body}>You have unsaved edits. If you leave now, your changes will be lost.</Text>
                <TouchableOpacity style={dm.discardBtn} onPress={onDiscard}>
                    <Text style={dm.discardTxt}>Yes, Discard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={dm.keepBtn} onPress={onKeep}>
                    <Text style={dm.keepTxt}>Keep Editing</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const dm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(10,20,60,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
    sheet: { backgroundColor: C.white, borderRadius: 22, padding: 28, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 20, width: "100%" },
    iconWrap: { width: 68, height: 68, borderRadius: 18, backgroundColor: C.amberPale, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    title: { fontFamily: "Outfit_700Bold", fontSize: 18, color: C.textDark, marginBottom: 10, textAlign: "center" },
    body: { fontFamily: "Outfit_400Regular", fontSize: 13.5, color: C.textMid, textAlign: "center", lineHeight: 20, marginBottom: 24 },
    discardBtn: { width: "100%", backgroundColor: C.red, borderRadius: 13, paddingVertical: 14, alignItems: "center", marginBottom: 10 },
    discardTxt: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.white },
    keepBtn: { width: "100%", backgroundColor: C.navyGhost, borderRadius: 13, paddingVertical: 14, alignItems: "center" },
    keepTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.navy },
});

// ─────────────────────────────────────────────────────────────
// MAIN EDIT SCREEN
// ─────────────────────────────────────────────────────────────
const EditProduct: React.FC = () => {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [maxUnlocked, setMaxUnlocked] = useState(3);
    const [basicErrors, setBasicErrors] = useState<string[]>([]);
    const [variantErrors, setVariantErrors] = useState<string[]>([]);
    const [imageErrors, setImageErrors] = useState<string[]>([]);
    const [detailErrors, setDetailErrors] = useState<string[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [discardModal, setDiscardModal] = useState(false);

    const [basicData, setBasicData] = useState({ ...MOCK_PRODUCT });
    const [variants, setVariants] = useState<Variant[]>(MOCK_VARIANTS);
    const [imagesData, setImagesData] = useState<{ primaryImage: string | null }>({ primaryImage: EXISTING_IMAGES[0] ?? null });
    const [detailsData, setDetailsData] = useState({ ...MOCK_DETAILS });

    const { toasts, showErrors, showToast, removeToast } = useToast();

    const [fontsLoaded] = useFonts({
        Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
    });

    if (!fontsLoaded) return null;

    const markDirty = () => { if (!isDirty) setIsDirty(true); };

    const upBasic = (k: string, v: any) => {
        setBasicData(p => ({ ...p, [k]: v }));
        setBasicErrors(prev => prev.filter(e => !e.toLowerCase().includes(k.toLowerCase())));
        markDirty();
    };
    const upDetails = (k: string, v: any) => { setDetailsData(p => ({ ...p, [k]: v })); markDirty(); };
    const rmVariant = (id: string) => { setVariants(p => p.filter(v => v.id !== id)); markDirty(); };

    const handleBackPress = () => {
        if (isDirty) { setDiscardModal(true); } else { router.back(); }
    };

    const handleTabPress = (i: number) => { setStep(i); };

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
        setStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    const handleUpdate = () => {
        const errors = validateDetails(detailsData);
        setDetailErrors(errors);
        if (errors.length > 0) { showErrors(errors); return; }
        setDetailErrors([]);
        setIsDirty(false);
        showToast("Product updated successfully!", "success");
        setTimeout(() => router.back(), 900);
    };

    return (
        <SafeAreaView style={sc.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />

            {/* Header */}
            <View style={sc.header}>
                <TouchableOpacity onPress={handleBackPress} style={sc.hBtn}>
                    <Ionicons name="chevron-back" size={22} color={C.white} />
                </TouchableOpacity>
                <View style={sc.hCenter}>
                    <Text style={sc.hTitle}>Edit Product</Text>
                    <Text style={sc.hSub}>Step {step + 1} of {STEPS.length}</Text>
                </View>
                <TouchableOpacity onPress={handleBackPress} style={sc.hBtn}>
                    {isDirty ? (
                        <View style={sc.dirtyDot} />
                    ) : (
                        <Ionicons name="close" size={22} color={C.white} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Unsaved changes banner */}
            {isDirty && (
                <View style={sc.unsavedBanner}>
                    <MaterialCommunityIcons name="pencil-circle-outline" size={14} color={C.amber} />
                    <Text style={sc.unsavedTxt}>Unsaved changes · remember to update the product</Text>
                </View>
            )}

            {/* Step progress bar */}
            <StepProgressBar step={step} maxUnlocked={maxUnlocked} onTabPress={handleTabPress} />

            {/* Content */}
            <View style={{ flex: 1, backgroundColor: C.bg }}>
                {step === 0 && <StepBasicInfo data={basicData} onChange={upBasic} errors={basicErrors} />}
                {step === 1 && <StepVariants variants={variants} setVariants={(fn: any) => { setVariants(fn); markDirty(); }} rmVariant={rmVariant} errors={variantErrors} />}
                {step === 2 && (
                    <StepImages
                        data={imagesData}
                        onChange={(k: string, v: any) => { setImagesData(p => ({ ...p, [k]: v })); markDirty(); }}
                        errors={imageErrors}
                    />
                )}
                {step === 3 && <StepDetails data={detailsData} onChange={upDetails} errors={detailErrors} />}
            </View>

            {/* Bottom bar */}
            <View style={sc.bar}>
                {step === 0 ? (
                    <TouchableOpacity style={sc.cancelBtn} onPress={handleBackPress}>
                        <Text style={sc.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={sc.prevBtn} onPress={() => setStep(s => s - 1)}>
                        <Ionicons name="chevron-back" size={16} color={C.navy} />
                        <Text style={sc.prevTxt}>Back</Text>
                    </TouchableOpacity>
                )}
                {step === 3 ? (
                    <TouchableOpacity style={[sc.saveBtn, !isDirty && sc.saveBtnDim]} onPress={handleUpdate} activeOpacity={isDirty ? 0.85 : 0.5}>
                        <MaterialCommunityIcons name="content-save-check-outline" size={18} color={C.white} />
                        <Text style={sc.saveTxt}>{isDirty ? "Update Product" : "No Changes"}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={sc.nextBtn} onPress={handleContinue}>
                        <Text style={sc.nextTxt}>Continue</Text>
                        <Ionicons name="chevron-forward" size={16} color={C.white} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Discard Modal */}
            <DiscardModal
                visible={discardModal}
                onDiscard={() => { setDiscardModal(false); router.back(); }}
                onKeep={() => setDiscardModal(false)}
            />

            {/* Toast overlay */}
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
    secHeadText: { fontFamily: "Outfit_700Bold", fontSize: 15, letterSpacing: 0.1 },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
    cardHint: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginBottom: 10, fontStyle: "italic" },
    lbl: { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: C.textMid, marginBottom: 6, marginTop: 12 },
    hint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginTop: 4 },
    cc: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, textAlign: "right", marginTop: 3 },
    fieldWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
    fieldFocused: { borderColor: C.navy, backgroundColor: C.white },
    fieldError: { borderColor: C.red, backgroundColor: "#FFF8F8" },
    fieldPfx: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid, marginRight: 6 },
    fieldInput: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark, paddingVertical: 10 },
    drop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, minHeight: 44 },
    dropText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark, flex: 1 },
    dropPh: { color: C.textPlaceholder },
    hsnWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
    hsnInput: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark, paddingVertical: 10 },
    row2: { flexDirection: "row", gap: 10 },
    row3: { flexDirection: "row", gap: 8 },
    edCard: { borderWidth: 1.2, borderColor: C.border, borderRadius: 10, overflow: "hidden" },
    toolbar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 2, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: "#F2F4FB", borderBottomWidth: 1, borderBottomColor: C.border },
    tbBtn: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6, minWidth: 28, alignItems: "center", justifyContent: "center" },
    tbTxt: { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid },
    tbSep: { width: 1, height: 16, backgroundColor: C.border, marginHorizontal: 4 },
    edInput: { paddingHorizontal: 12, paddingVertical: 10, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark, minHeight: 56 },
    edFoot: { paddingHorizontal: 12, paddingBottom: 8, alignItems: "flex-end" },
    radioRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    radioPill: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
    radioPillOn: { borderColor: C.navy, backgroundColor: C.navyGhost },
    radioDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.border },
    radioDotOn: { borderColor: C.navy, backgroundColor: C.navy },
    radioPillTxt: { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid },
    radioPillTxtOn: { color: C.navy, fontFamily: "Outfit_600SemiBold" },
    customRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    tog: { width: 44, height: 26, borderRadius: 13, backgroundColor: C.border, justifyContent: "center", paddingHorizontal: 2, marginTop: 2 },
    togOn: { backgroundColor: C.accent5 },
    togThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 2 },
    togThumbOn: { transform: [{ translateX: 18 }] },
    customTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textDark },
    customSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginTop: 3, lineHeight: 17 },
    custExpandWrap: { marginTop: 4 },
    custTogRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
    custTogTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textDark },
    custTogSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginTop: 2, lineHeight: 16 },
    custNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16, backgroundColor: "#EDFAF4", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#A3E9C8" },
    custNoteTxt: { fontFamily: "Outfit_400Regular", fontSize: 11.5, color: C.accent5, flex: 1, lineHeight: 17 },
    custSubField: { flexDirection: "row", gap: 10, marginTop: 10, marginLeft: 8, paddingLeft: 4 },
    custSubFieldBar: { width: 2, borderRadius: 2, backgroundColor: C.accent5, alignSelf: "stretch", opacity: 0.5 },
});

// ─── Variant Styles ───────────────────────────────────────────
const vt = StyleSheet.create({
    hdr: { flexDirection: "row", alignItems: "center", gap: 8 },
    badge: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    badgeTxt: { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.navy },
    title: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.textDark, flex: 1 },
    rmBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    rmTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.red },
    lblRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 6 },
    auto: { backgroundColor: C.greenPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    autoTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: C.greenText },
    fileRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: C.inputBg },
    fileTxt: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, flex: 1 },
    browseBtn: { borderWidth: 1, borderColor: C.navyBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
    browseTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.navy },
    addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: C.navy, borderRadius: 14, paddingVertical: 13, marginBottom: 14 },
    addIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    addTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.navy },
    infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.navyGhost, borderRadius: 12, padding: 12 },
    infoTxt: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textMid, flex: 1, lineHeight: 18 },
});

// ─── Details Styles ───────────────────────────────────────────
const dt = StyleSheet.create({
    outBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.2, borderColor: C.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    outBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.navy },
    togRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
    togLbl: { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
    addBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: C.navy },
    specRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    specDel: { width: 36, height: 36, backgroundColor: C.redPale, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});

// ─── Edit-specific Styles ─────────────────────────────────────
const eb = StyleSheet.create({
    idBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.navyGhost, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: C.navyBorder },
    idText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.navyLight, flex: 1 },
    idStatus: { backgroundColor: C.greenPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    idStatusTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.greenText },
    variantSummary: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.navyGhost, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: C.navyBorder },
    variantSummaryTxt: { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.navyLight },
    stockBadge: { backgroundColor: C.greenPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    stockBadgeLow: { backgroundColor: "#FEF3C7" },
    stockTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.greenText },
    stockTxtLow: { color: C.amber },
    tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.amberPale, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#FCD34D" },
    tipTxt: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#92400E", flex: 1, lineHeight: 18 },
});

// ─── Screen Styles ────────────────────────────────────────────
const sc = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: { backgroundColor: C.navyDeep, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 10, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 10 : 10 },
    hBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
    hCenter: { flex: 1, alignItems: "center" },
    hTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, color: C.white },
    hSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },
    dirtyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.amber, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)" },
    unsavedBanner: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.amberPale, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#FCD34D" },
    unsavedTxt: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "#92400E" },
    bar: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10 },
    cancelBtn: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1.2, borderColor: C.border, borderRadius: 12, paddingVertical: 13 },
    cancelTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid },
    prevBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 12, paddingVertical: 13 },
    prevTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.navy },
    nextBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 13 },
    nextTxt: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.white },
    saveBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 13 },
    saveBtnDim: { backgroundColor: C.navyLight, opacity: 0.6 },
    saveTxt: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.white },
});

export default EditProduct;