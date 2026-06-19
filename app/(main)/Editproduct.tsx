import React, { useState, useRef, useCallback, useEffect, useSyncExternalStore } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Platform, StatusBar, SafeAreaView, Switch,
    Dimensions, Modal, Animated, Image, Alert, ActivityIndicator,
    LayoutChangeEvent,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import {
    useFonts, Outfit_400Regular, Outfit_500Medium,
    Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useResponsive } from "@/hooks/useResponsive";
import { buildUpdateProductPayload } from "@/lib/product/buildCreateProductPayload";
import { calcDiscountPercent } from "@/lib/product/pricing";
import { generateVariantSku } from "@/lib/product/generateVariantSku";
import { scrollViewsToTop } from "@/lib/product/scrollToTop";
import {
    getWebDropActiveKey,
    setWebDropActiveKey,
    subscribeWebDrop,
} from "@/lib/ui/webDropCoordinator";
import { resolveWeightSlab } from "@/lib/product/weightSlab";
import { mapProductDetailToEditForm } from "@/lib/product/mapProductDetailToEditForm";
import { fetchProductDetail, updateProduct, fetchProductFormCatalog, type ProductFormCatalog } from "@/services/productApi";
import { createSize } from "@/services/sizeApi";
import {
    ensureSellerSizesInCatalog,
    formatSizeOption,
    resolveSizeNameFromLabel,
} from "@/lib/product/ensureSellerSizesInCatalog";
import { ApiError } from "@/lib/api/client";
import { getHsnForMaterial, MATERIAL_TYPES } from "@/lib/product/materialHsn";
import {
    applyDeliverySelection,
    applyReturnPolicySelection,
    DELIVERY_OPTIONS,
    RETURN_POLICY_OPTIONS,
} from "@/lib/products/policyPresets";
import { uniquePickerOptions } from "@/lib/product/uniquePickerOptions";
import {
    buildCategoryPathOptions,
    buildLeafSubcategoryOptions,
    findCategorySubForProductSub,
    formatCategoryPath,
    resolveCategoryPathSelection,
    resolveLeafSubcategorySelection,
} from "@/lib/product/categoryPaths";

const { width: SW } = Dimensions.get("window");
const CONTENT_MAX = 1120;

const getStepScrollContent = (isDesktop: boolean) =>
    isDesktop
        ? {
              paddingHorizontal: 32,
              paddingTop: 24,
              paddingBottom: 80,
              width: "100%" as const,
              maxWidth: CONTENT_MAX,
              alignSelf: "center" as const,
              ...(Platform.OS === "web" ? ({ alignSelf: "center", marginHorizontal: "auto" } as object) : {}),
          }
        : { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 };

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
const SUBCATEGORIES: Record<string, string[]> = {
    "Clothing": [
        "T-Shirts", "Shirts", "Jeans", "Dresses", "Jackets", "Shorts", "Innerwear", 
        "Capris", "Clothing Set", "Dungarees & Jumpsuits", "Ethnic Wear", "Kurta Set", 
        "Leggings", "Lehenga-Cholis", "Skirts & Jeans", "Tops & T-Shirts", "Track Pants",
        "Saree Fall", "Poplin"
    ],
    "Electronics": ["Mobiles", "Laptops", "Headphones", "Cameras", "Tablets", "Audio", "Wearables"],
    "Footwear": [
        "Sneakers", "Sandals", "Formal", "Sports", "Boots", 
        "Ballet Flats", "Casual Shoes", "Flats", "Heels", "Wedges",
        "Cleats", "Cycling Shoes", "Hiking Shoes", "Running Shoes", "Sports Sandals", "Training Shoes",
        "Flip Flops", "Formal Shoes", "Loafers", "Booties", "Flats Shoes", "School Shoes", "Socks"
    ],
    "Bags": ["Backpacks", "Handbags", "Wallets", "Travel Bags", "Laptop Bags", "Lunch Carry Bags", "Sling Bags", "Wallets & Clutches"],
    "Accessories": [
        "Watches", "Sunglasses", "Jewelry", "Belts", 
        "Wallets", "Eyewear", "Headwear", "Caps", "Fitness Gloves", "Gym Bags", "Sweatbands", "Water Bottles",
        "Brooches", "Cufflinks", "Hair Accessories", "Mufflers", "Scarves"
    ],
    "Sports": ["Cricket", "Football", "Tennis", "Yoga", "Gym"],
    "Home & Living": [
        "Furniture", "Decor", "Kitchen", "Bedding",
        "Cushion Covers", "Customized Mugs", "Desk Name Plates", "Keychains", "Printed Cushions", "Water Bottle",
        "Artificial Flower Frames", "Canva Prints", "Digital Clock", "Name Plates", "Photo Wall Collages", "Table D cor Showpieces", "Wall Clock"
    ],
    "Books": ["Fiction", "Non-Fiction", "Academic", "Comics"],
    "Jewellery": [
        "Anklets", "Anti Tarnish Chains", "Bangles", "Bracelet", "Bridal Necklace", 
        "Chains", "Couple Bracelets", "Customized Name Pendants", "Earrings", "Jewellery Set", 
        "Key-lock Couple Sets", "Necklaces", "Nose Pins", "Pearl Necklace Set", "Pendants", "Rings", "Vaddanam"
    ],
    "Innerwear & Nightwear": ["Briefs & Boxers", "Loungewear", "Sleepwear", "Thermals", "Trunks", "Vests"],
    "Gadgets Accessories": ["Clothing Accessories"],
    "Other Accessories": ["Brooches", "Cufflinks", "Hair Accessories", "Mufflers", "Scarves"],
    "Belts & Caps": ["Belts", "Caps", "Gloves", "Goggles", "Hats", "Sunglasses"],
    "Women s Footwear": ["Ballet Flats", "Boots", "Casual Shoes", "Flats", "Heels", "Wedges"],
    "Milk Sweets": ["Gulab Jamun", "Kalakand"],
    "Preschool Furniture": ["Chairs", "Dustbins"],
    "Women s Sportswear": ["Gym Wear", "Leggings", "Shorts", "Sports Bras", "Sports Tops", "Tracksuits", "Yoga Pants"],
    "Everyday Utility ": ["Cushion Covers", "Customized Mugs", "Desk Name Plates", "Keychains", "Printed Cushions", "Water Bottle"],
    "Wearable & Personal Gifts": ["Caps", "Customized T-Shirts", "Hoodies", "Mask", "Personalized Towels & Handkerchiefs"],
    "Skincare Tools & Devices": ["Facial Devices"],
    "Art & Creative Gifts": ["Canvas Painting Prints", "Minimalist Line Art", "Pencil Sketches"],
    "Kids & Baby Gifts": ["Baby Name Frames", "Cartoon-Theme Photo Frames", "Growth Charts", "Soft Toys with Name"],
    "Home Decor Gifits": ["Artificial Flower Frames", "Canva Prints", "Digital Clock", "Name Plates", "Photo Wall Collages", "Table D cor Showpieces", "Wall Clock"],
    "Formal Wear": ["Formal Shirts", "Suits & Blazers", "Ties"],
    "Sports Footwear": ["Cleats", "Cycling Shoes", "Hiking Shoes", "Running Shoes", "Sports Sandals", "Training Shoes"],
    "Watches": ["Fitness Bands", "Men s Watches", "Women s Watches"],
    " Girls Clothing": [
        "Capris", "Clothing Set", "Dresses", "Dungarees & Jumpsuits", "Ethnic Wear", "Jackets", 
        "Kurta Set", "Leggings", "Lehenga-Cholis", "Shorts", "Skirts & Jeans", "Tops & T-Shirts", "Track Pants"
    ],
    "Bottom Wear": ["Cargo Pants", "Casual Trousers", "Jeans", "Joggers", "Shorts / Bermudas", "Track Pants / Lower Wear", "Trousers (Formal / Regular)"],
    "Lingerie & Sleepwear": ["Bottom Wear Inners", "Bras", "Camisoles", "Nightwear", "Panties", "Shapewear", "Swimwear", "Top Wear Inners"],
    "Boys  Clothing": ["Clothing Set", "Ethnic Wear", "Jackets", "Jeans", "Nightwear", "Pyjamas", "Shorts", "Sweaters", "Sweatshirts", "T-Shirts", "Trousers"],
    "Western Wear": ["Dresses", "Jeans", "Jeggings", "Jumpsuits", "Skirts & Shorts", "T-Shirts", "Tops", "Trousers"],
    "Spiritual & Festival Gifts": ["Customized Temple Frames", "Festival Hampers", "God Photo Frames"],
    "Dry Sweets": ["Boondhi Laddu", "Dryfruit Laddu", "Sununda"],
    "Pre Indoor Play Items": ["Rocking Toys", "Slides"],
    "Men s Sportswear": ["Compression Wear", "Jerseys", "Shorts", "T-Shirts", "Track Pants"],
    "School Essentials": ["Bags", "Lunch Boxes", "School Uniforms", "Water Bottles"],
    "Corporate & Promotional Gifts": ["Company Logo Frames", "Diaries", "Medal", "Pens", "Trophies", "Welcome Combo Kits"],
    "Winter Wear": ["Cardigans", "Coats", "Jackets", "Shawls", "Sweaters"],
    "Women s Clothing": ["Leggings", "Poplin", "Saree Fall"],
    "Top Wear": ["Casual Shirts", "Coats", "Couple Wear", "Hoodies & Sweatshirts", "Jackets", "Polo Shirts", "Rain Jackets", "Shirts", "Sweaters", "T-Shirts"],
    "Gifts for Couples": ["Explosion Gift Boxes", "Gift Items Novelties", "Love Scrapbooks"],
    "Ethnic Wear": ["Dress Material", "Embroidery Work Blouse", "JUMPSUITS", "Kurtas & Kurtis", "Kurtha Set With Duppatta", "Lehenga Cholis", "Long Frock", "Salwar Suits", "Sarees", "Slik-Dupattas"],
    "Educational Materials": ["Building Blocks/Block Construction Set", "Lacing & Threading Toys", "Linking Toys", "Shape Sorter & Stacking Toys"],
    "Men s Footwear": ["Casual Shoes", "Flip Flops", "Formal Shoes", "Loafers", "Sandals", "Sneakers"],
    "Kids  Footwear": ["Booties", "Casual Shoes", "Flats Shoes", "Flip Flops", "Heels", "Sandals", "School Shoes", "Socks"],
    "Event-Based Gifts": ["Birthday Combo Hampers", "Gifits Hampers"]
};
const CATEGORIES = Object.keys(SUBCATEGORIES);
const COLORS_LIST = ["Red", "Blue", "Green", "Black", "White", "Yellow", "Pink", "Purple", "Orange", "Gray"];
const SIZES_LIST = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "28", "30", "32", "34", "36", "38", "40"];
const STEPS = [
    { key: "basic", label: "Basic Info", icon: "information-outline", color: "#7C3AED" },
    { key: "variants", label: "Variants", icon: "tune-variant", color: "#0891B2" },
    { key: "images", label: "Images", icon: "image-multiple-outline", color: "#059669" },
    { key: "details", label: "Details", icon: "clipboard-text-outline", color: "#D97706" },
];

const EMPTY_BASIC = {
    id: "",
    name: "",
    category: "",
    categoryId: undefined as number | undefined,
    categorySubName: "",
    categorySubId: undefined as number | undefined,
    subcategory: "",
    subcategoryId: undefined as number | undefined,
    materialType: "",
    hsnCode: "",
    shortDesc: "",
    fullDesc: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    weightSlab: "",
    intraCityCharge: "",
    metroMetroCharge: "",
    customDeliveryCharge: false,
    fragile: "No",
    customized: false,
    custTitle: "",
    custInstructions: "",
    custLeadDays: "",
    custCharge: "",
    custAllowPhoto: false,
    custImageLabel: "",
    custPickedImage: null as string | null,
    custAllowText: false,
    custTextLabel: "",
};

const EMPTY_DETAILS = {
    sizeChart: "",
    sizeChartId: undefined as number | undefined,
    returnPolicy: "",
    returnPolicyText: "",
    deliveryOption: "Standard Delivery",
    minDays: "3",
    maxDays: "7",
    deliveryInfo: "",
    codEnabled: true,
    onlinePayEnabled: true,
    warranty: "",
    careInstructions: "",
    features: [""] as string[],
    specifications: [{ name: "", value: "" }] as { name: string; value: string }[],
};

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
    const primary = data.primaryImage?.trim();
    const additional = (data.additionalImages ?? []).filter((u: string) => u?.trim());
    if (!primary && additional.length === 0) {
        e.push("At least one product image is required");
    }
    return e;
};

function imagesFromData(data: { primaryImage?: string | null; additionalImages?: string[] }): string[] {
    const urls: string[] = [];
    const primary = data.primaryImage?.trim();
    if (primary) urls.push(primary);
    for (const raw of data.additionalImages ?? []) {
        const u = raw?.trim();
        if (u && !urls.includes(u)) urls.push(u);
    }
    return urls;
}

const validateDetails = (data: any): string[] => {
    const e: string[] = [];
    if (!data.returnPolicy) e.push("Return Policy is required");
    if (!data.deliveryOption) e.push("Delivery Option is required");
    return e;
};

// ─────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────
const Card = ({ children, style, onLayout, zIndex }: any) => {
    const { isDesktop } = useResponsive();
    return <View onLayout={onLayout} style={[at.card, isDesktop && ds.card, style, Platform.OS === 'web' && zIndex !== undefined && { zIndex }]}>{children}</View>;
};

const SecHead = ({ icon, title, accent = C.accent1 }: { icon: string; title: string; accent?: string }) => (
    <View style={[at.secHead, { borderLeftColor: accent }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={accent} />
        <Text style={[at.secHeadText, { color: accent }]}>{title}</Text>
    </View>
);

const Lbl = ({ text, required }: { text: string; required?: boolean }) => (
    <Text style={at.lbl}>{text}{required && <Text style={{ color: C.red }}> *</Text>}</Text>
);

const Field = ({ placeholder, value, onChangeText, keyboardType = "default", multiline = false, lines = 1, maxLength, prefix, hasError, editable = true }: any) => {
    const [focused, setFocused] = useState(false);
    return (
        <View style={[at.fieldWrap, focused && at.fieldFocused, multiline && { height: lines * 22 + 26, alignItems: "flex-start" }, hasError && at.fieldError, !editable && at.fieldReadOnly]}>
            {prefix && <Text style={at.fieldPfx}>{prefix}</Text>}
            <TextInput
                style={[at.fieldInput, multiline && { textAlignVertical: "top", paddingTop: 10 }, !editable && at.fieldInputReadOnly]}
                placeholder={placeholder}
                placeholderTextColor={C.textPlaceholder}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                multiline={multiline}
                maxLength={maxLength}
                editable={editable}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </View>
    );
};

const Drop = ({ placeholder, value, onPress, hasError, options, onSelect, dropKey }: any) => {
    const [localOpen, setLocalOpen] = useState(false);
    const dropRootRef = useRef<View>(null);
    const activeWebDropKey = useSyncExternalStore(subscribeWebDrop, getWebDropActiveKey, () => null);
    const usesSharedWebDrop = Platform.OS === "web" && !!options && !!dropKey;
    const open = usesSharedWebDrop ? activeWebDropKey === dropKey : localOpen;

    const closeDrop = () => {
        if (usesSharedWebDrop) setWebDropActiveKey(null);
        else setLocalOpen(false);
    };

    const toggleDrop = () => {
        if (usesSharedWebDrop) {
            setWebDropActiveKey(open ? null : dropKey);
        } else {
            setLocalOpen((prev) => !prev);
        }
    };

    useEffect(() => {
        if (Platform.OS !== "web" || !open || !usesSharedWebDrop) return;

        const handlePointerDown = (event: MouseEvent) => {
            const node = dropRootRef.current as unknown as HTMLElement | null;
            if (node?.contains(event.target as Node)) return;
            setWebDropActiveKey(null);
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [open, usesSharedWebDrop]);

    return (
        <View ref={dropRootRef} style={Platform.OS === 'web' ? { zIndex: open ? 99 : 1, position: 'relative' } : undefined}>
            <TouchableOpacity style={[at.drop, hasError && at.fieldError, open && Platform.OS === 'web' && { borderColor: C.navy }]} onPress={() => { if(Platform.OS === 'web' && options) { toggleDrop(); } else { if(onPress) onPress(); } }} activeOpacity={0.85}>
                <Text style={[at.dropText, !value && at.dropPh]} numberOfLines={1}>{value || placeholder}</Text>
                <Ionicons name={open && Platform.OS === 'web' ? "chevron-up" : "chevron-down"} size={15} color={C.textLight} />
            </TouchableOpacity>
            {Platform.OS === 'web' && open && options && (
                <>
                    {!usesSharedWebDrop ? (
                        <TouchableOpacity style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} activeOpacity={1} onPress={closeDrop} />
                    ) : null}
                    <View
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: 4,
                            backgroundColor: C.white,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: C.border,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 12,
                            elevation: 5,
                            zIndex: 101,
                            maxHeight: 280,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            paddingVertical: 8,
                            overscrollBehavior: 'contain',
                        } as any}
                        onWheel={(e: any) => e.stopPropagation()}
                    >
                        {options.map((opt: string, idx: number) => (
                            <TouchableOpacity key={idx} style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: value === opt ? C.navyGhost : 'transparent' }} onPress={() => { if(onSelect) onSelect(opt); closeDrop(); }}>
                                <Text style={{ fontFamily: value === opt ? "Outfit_600SemiBold" : "Outfit_500Medium", fontSize: 13.5, color: value === opt ? C.navy : C.textMid }}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            )}
        </View>
    );
};

const Divider = () => <View style={at.divider} />;
const Hint = ({ text }: { text: string }) => <Text style={at.hint}>{text}</Text>;
const CC = ({ cur, max }: { cur: number; max: number }) => <Text style={at.cc}>{cur}/{max}</Text>;

// ─── Picker Modal ─────────────────────────────────────────────
const PM = ({ visible, title, options, selected, onSelect, onClose }: any) => {
    const items = uniquePickerOptions(options ?? []);
    return (
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
                {items.map((opt: string, index: number) => (
                    <TouchableOpacity key={`${title}-${index}-${opt}`} style={[pm.item, selected === opt && pm.itemOn]} onPress={() => { onSelect(opt); onClose(); }}>
                        <Text style={[pm.itemTxt, selected === opt && pm.itemTxtOn]}>{opt}</Text>
                        {selected === opt && <View style={pm.chk}><Ionicons name="checkmark" size={13} color={C.white} /></View>}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    </Modal>
    );
};

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

const InlinePicker = ({
    visible, title, options, selected, onSelect, onClose,
}: {
    visible: boolean; title: string; options: string[]; selected: string;
    onSelect: (v: string) => void; onClose: () => void;
}) => {
    if (!visible) return null;
    const items = uniquePickerOptions(options ?? []);
    return (
        <View style={fp.inlinePickerWrap} pointerEvents="box-none">
            <TouchableOpacity style={fp.inlinePickerBackdrop} activeOpacity={1} onPress={onClose} />
            <View style={fp.inlinePickerSheet}>
                <View style={fp.inlinePickerHdr}>
                    <Text style={fp.inlinePickerTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={18} color={C.textMid} />
                    </TouchableOpacity>
                </View>
                <ScrollView
                    style={fp.inlinePickerList}
                    contentContainerStyle={fp.inlinePickerListContent}
                    bounces={false}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    {...(Platform.OS === "web" ? { onWheel: (e: any) => e.stopPropagation() } : {})}
                >
                    {items.map((opt, index) => (
                        <TouchableOpacity
                            key={`${title}-${index}-${opt}`}
                            style={[fp.inlinePickerItem, selected === opt && fp.inlinePickerItemOn]}
                            onPress={() => { onSelect(opt); onClose(); }}
                        >
                            <Text style={[fp.inlinePickerItemTxt, selected === opt && fp.inlinePickerItemTxtOn]}>{opt}</Text>
                            {selected === opt && (
                                <View style={pm.chk}><Ionicons name="checkmark" size={13} color={C.white} /></View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
};

const FormPopupModal = ({
    visible, onClose, title, children, overlay, wide = false, accentHeader = false, headerIcon = "ruler-square",
}: {
    visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
    overlay?: React.ReactNode; wide?: boolean; accentHeader?: boolean; headerIcon?: string;
}) => {
    const { isDesktop } = useResponsive();
    return (
        <Modal visible={visible} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={onClose}>
            <View style={[fp.overlay, isDesktop && fp.overlayCenter]}>
                <TouchableOpacity style={fp.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[fp.sheet, isDesktop && fp.popup, isDesktop && wide && fp.popupWide, fp.sheetOverflow]}>
                    {!isDesktop && !accentHeader && <View style={fp.drag} />}
                    <View style={[fp.headerRow, accentHeader && fp.headerRowAccent]}>
                        {accentHeader && (
                            <MaterialCommunityIcons name={headerIcon as any} size={22} color={C.white} />
                        )}
                        <Text style={[fp.title, isDesktop && fp.titleDesktop, accentHeader && fp.titleAccent]} numberOfLines={2}>
                            {title}
                        </Text>
                        <TouchableOpacity
                            style={[fp.closeBtn, accentHeader && fp.closeBtnAccent]}
                            onPress={onClose}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close" size={20} color={accentHeader ? C.white : C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={fp.bodyScroll}
                        contentContainerStyle={fp.bodyContent}
                        showsVerticalScrollIndicator={isDesktop}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >
                        {children}
                    </ScrollView>
                    {overlay}
                </View>
            </View>
        </Modal>
    );
};

const fp = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(10,20,60,0.35)" },
    overlayCenter: { justifyContent: "center", alignItems: "center", padding: 24 },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: {
        position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "88%",
        backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingBottom: Platform.OS === "ios" ? 28 : 20,
        shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 24,
    },
    popup: {
        position: "relative", bottom: undefined, left: undefined, right: undefined,
        width: "100%", maxWidth: 480, maxHeight: "85%", borderRadius: 20, paddingBottom: 24,
        shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 32, elevation: 28, zIndex: 2,
    },
    popupWide: { maxWidth: 720 },
    sheetOverflow: { overflow: "hidden" },
    inlinePickerWrap: { ...StyleSheet.absoluteFillObject, zIndex: 20, justifyContent: "flex-end" },
    inlinePickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,20,60,0.35)" },
    inlinePickerSheet: {
        maxHeight: "55%", backgroundColor: C.white, borderTopLeftRadius: 16, borderTopRightRadius: 16,
        borderTopWidth: 1, borderTopColor: C.border, elevation: 16,
    },
    inlinePickerHdr: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    inlinePickerTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.textDark, flex: 1 },
    inlinePickerList: { maxHeight: 280, flexGrow: 0 },
    inlinePickerListContent: { paddingBottom: 8 },
    inlinePickerItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 },
    inlinePickerItemOn: { backgroundColor: C.navyGhost },
    inlinePickerItemTxt: { fontFamily: "Outfit_500Medium", fontSize: 14, color: C.textMid },
    inlinePickerItemTxtOn: { fontFamily: "Outfit_600SemiBold", color: C.navy },
    headerRowAccent: {
        backgroundColor: C.accent4, borderBottomWidth: 0, paddingTop: 16, paddingBottom: 16,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
    },
    titleAccent: { color: C.white, flex: 1 },
    closeBtnAccent: { backgroundColor: "rgba(255,255,255,0.2)" },
    drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 8 },
    headerRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
    },
    title: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textDark, flex: 1 },
    titleDesktop: { fontSize: 18 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    bodyScroll: { flexGrow: 0 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    footerRow: { flexDirection: "row", gap: 10, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border },
    footerRowDesktop: { justifyContent: "flex-end" },
    footerBtnSecondary: {
        flex: 1, maxWidth: 160, alignItems: "center", justifyContent: "center",
        paddingVertical: 13, borderRadius: 12, borderWidth: 1.2, borderColor: C.border, backgroundColor: C.white,
    },
    footerBtnPrimary: { flex: 1, maxWidth: 180, alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 12, backgroundColor: C.navy },
    footerBtnAccent: { backgroundColor: C.accent4 },
    footerBtnPrimaryFull: { maxWidth: undefined },
    footerBtnTxtSecondary: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid },
    footerBtnTxtPrimary: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.white },
});

const DEFAULT_SIZE_CHART_OPTIONS = ["No Size Chart", "Standard Apparel", "Small Chart", "Large Chart"];
const CHART_CATEGORY_ALL = "All Categories";
const CHART_SUB_ALL = "All Subcategories";
const ALL_CHART_SUBCATEGORIES = Array.from(new Set(Object.values(SUBCATEGORIES).flat()));
const MEASUREMENT_UNIT_OPTIONS = ["Centimetres (cm)", "Inches (in)"] as const;
const DEFAULT_CHART_UNIT = MEASUREMENT_UNIT_OPTIONS[0];

type SizeChartRow = {
    id: string; size: string; chest: string; waist: string; hip: string; length: string; sleeve: string;
};

let sizeRowId = 0;
const newRowId = () => `sz-${++sizeRowId}-${Date.now()}`;
const emptySizeRow = (size = ""): SizeChartRow => ({ id: newRowId(), size, chest: "", waist: "", hip: "", length: "", sleeve: "" });

const SIZE_TABLE_COLS = [
    { key: "size" as const, label: "Size", width: 72, placeholder: "S" },
    { key: "chest" as const, label: "Chest/Bust", width: 88, placeholder: "34-36" },
    { key: "waist" as const, label: "Waist", width: 80, placeholder: "28-30" },
    { key: "hip" as const, label: "Hip", width: 80, placeholder: "36-38" },
    { key: "length" as const, label: "Length", width: 72, placeholder: "28" },
    { key: "sleeve" as const, label: "Sleeve", width: 80, placeholder: "32-34" },
];

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
    modalOverlayCenter: { justifyContent: "center", alignItems: "center", padding: 24 },
    modalBackdrop: { ...StyleSheet.absoluteFillObject },
    modalSheet: {
        position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.white,
        borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, paddingHorizontal: 20,
        shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 24,
    },
    modalPopup: {
        position: "relative", bottom: undefined, left: undefined, right: undefined,
        width: "100%", maxWidth: 440, borderRadius: 20, paddingTop: 20, paddingBottom: 24, paddingHorizontal: 24, elevation: 28, zIndex: 2,
    },
    modalDrag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 18 },
    modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textDark, marginBottom: 16 },
    modalTitleDesktop: { fontSize: 18, marginBottom: 0, flex: 1 },
    modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
    modalOption: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    modalOptionDesktop: { borderBottomWidth: 0, borderRadius: 14, paddingHorizontal: 14, marginBottom: 10, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border },
    modalIconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    modalOptTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textDark },
    modalOptSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginTop: 2 },
    modalCancel: { marginTop: 18, alignItems: "center", paddingVertical: 14, borderWidth: 1.2, borderColor: C.border, borderRadius: 14 },
    modalCancelDesktop: { marginTop: 8 },
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
                mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: remaining > 1, selectionLimit: remaining, quality: 0.85,
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
// STEP 1 — Basic Info
// ─────────────────────────────────────────────────────────────
const StepBasicInfo = ({ data, onChange, errors, validationTrigger, catalog, isDesktop = false, scrollRef: externalScrollRef }: any) => {
    const [catPick, setCatPick] = useState(false);
    const [subPick, setSubPick] = useState(false);
    const [matPick, setMatPick] = useState(false);

    const internalScrollRef = useRef<ScrollView>(null);
    const scrollRef = externalScrollRef ?? internalScrollRef;
    const cardLayouts = useRef<Record<string, number>>({});
    const fieldLayouts = useRef<Record<string, number>>({});
    const fieldRefs = useRef<Record<string, any>>({});

    useEffect(() => {
        if (errors && errors.length > 0) {
            const getFieldKeyFromError = (error: string): string | null => {
                const err = error.toLowerCase();
                if (err.includes("product name") || err.includes("name is required")) return "name";
                if (err.includes("subcategory")) return "subcategory";
                if (err.includes("category")) return "category";
                if (err.includes("material")) return "materialType";
                if (err.includes("hsn")) return "hsnCode";
                if (err.includes("short description")) return "shortDesc";
                if (err.includes("full description")) return "fullDesc";
                if (err.includes("length")) return "length";
                if (err.includes("width")) return "width";
                if (err.includes("height")) return "height";
                if (err.includes("weight")) return "weight";
                if (err.includes("customization title")) return "custTitle";
                if (err.includes("customization instructions")) return "custInstructions";
                if (err.includes("image upload label")) return "custImageLabel";
                if (err.includes("text field label") || err.includes("custom text")) return "custTextLabel";
                return null;
            };

            const firstErr = errors[0];
            const fieldKey = getFieldKeyFromError(firstErr);
            if (fieldKey) {
                const targetRef = fieldRefs.current[fieldKey];
                const containerRef = scrollRef.current;

                const fallbackScroll = () => {
                    let cardKey = '';
                    if (['name', 'category', 'subcategory', 'materialType', 'hsnCode'].includes(fieldKey)) {
                        cardKey = 'identity';
                    } else if (['shortDesc', 'fullDesc'].includes(fieldKey)) {
                        cardKey = 'desc';
                    } else if (['length', 'width', 'height'].includes(fieldKey)) {
                        cardKey = 'dimensions';
                    } else if (['weight'].includes(fieldKey)) {
                        cardKey = 'weight';
                    } else if (['custTitle', 'custInstructions', 'custImageLabel', 'custTextLabel'].includes(fieldKey)) {
                        cardKey = 'custom';
                    }

                    const cardY = cardLayouts.current[cardKey] || 0;
                    const fieldY = fieldLayouts.current[fieldKey] || 0;
                    const targetY = Math.max(0, cardY + fieldY - 15);
                    containerRef?.scrollTo({ y: targetY, animated: true });
                };

                if (targetRef && containerRef) {
                    try {
                        targetRef.measureLayout(
                            containerRef,
                            (x: number, y: number) => {
                                const targetY = Math.max(0, y - 15);
                                containerRef.scrollTo({ y: targetY, animated: true });
                            },
                            () => {
                                fallbackScroll();
                            }
                        );
                    } catch (e) {
                        fallbackScroll();
                    }
                } else {
                    fallbackScroll();
                }
            }
        }
    }, [errors, validationTrigger]);

    const categoryPathOptions = buildCategoryPathOptions(catalog, SUBCATEGORIES);
    const categoryDisplay = formatCategoryPath(data.category, data.categorySubName ?? "");
    const leafSubcategoryOptions = buildLeafSubcategoryOptions(
        catalog,
        data.category,
        data.categorySubName ?? ""
    );
    const subcategoryEnabled = Boolean(data.category && data.categorySubName);
    const selectCategoryPath = (label: string) => {
        const resolved = resolveCategoryPathSelection(label, catalog);
        onChange("category", resolved.category);
        onChange("categoryId", resolved.categoryId);
        onChange("categorySubId", resolved.categorySubId);
        onChange("categorySubName", resolved.categorySubName);
        const leaves = buildLeafSubcategoryOptions(catalog, resolved.category, resolved.categorySubName);
        if (leaves.length === 0) {
            onChange("subcategory", resolved.categorySubName);
            onChange("subcategoryId", resolved.categorySubId);
        } else {
            onChange("subcategory", "");
            onChange("subcategoryId", null);
            setSubPick(true);
        }
    };
    const selectSubcategory = (leafName: string) => {
        const resolved = resolveLeafSubcategorySelection(
            data.category,
            data.categorySubName ?? "",
            leafName,
            catalog
        );
        onChange("subcategory", resolved.subcategory);
        onChange("subcategoryId", resolved.subcategoryId);
    };
    const hasErr = (field: string) => errors.some((e: string) => e.toLowerCase().includes(field.toLowerCase()));

    return (
        <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={isDesktop}
            style={isDesktop ? ds.stepScroll : undefined}
            contentContainerStyle={getStepScrollContent(isDesktop)}
        >
            <View style={eb.idBadge}>
                <MaterialCommunityIcons name="barcode" size={14} color={C.navyLight} />
                <Text style={eb.idText}>Product ID: {data.id ?? "—"}</Text>
                <View style={eb.idStatus}><Text style={eb.idStatusTxt}>● Active</Text></View>
            </View>

            <Card zIndex={100} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['identity'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="tag-outline" title="Product Identity" accent={C.accent1} />
                <Divider />
                <View ref={el => { fieldRefs.current['name'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['name'] = e.nativeEvent.layout.y; }}>
                    <Lbl text="Product Name" required />
                    <Field placeholder="Enter product name" value={data.name} onChangeText={(v: string) => onChange("name", v)} hasError={hasErr("product name")} />
                </View>
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 20 }]} onLayout={(e: LayoutChangeEvent) => {
                    const y = e.nativeEvent.layout.y;
                    fieldLayouts.current['category'] = y;
                    fieldLayouts.current['subcategory'] = y;
                }}>
                    <View ref={el => { fieldRefs.current['category'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="Category" required />
                        <Drop placeholder="Select category" value={categoryDisplay} onPress={() => setCatPick(true)} hasError={hasErr("category")} options={categoryPathOptions} onSelect={selectCategoryPath} />
                    </View>
                    <View ref={el => { fieldRefs.current['subcategory'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="Subcategory" required />
                        <Drop placeholder="Select subcategory" value={data.subcategory} onPress={() => subcategoryEnabled && setSubPick(true)} hasError={hasErr("subcategory")} options={leafSubcategoryOptions} onSelect={selectSubcategory} />
                    </View>
                </View>
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 10 }]} onLayout={(e: LayoutChangeEvent) => {
                    const y = e.nativeEvent.layout.y;
                    fieldLayouts.current['materialType'] = y;
                    fieldLayouts.current['hsnCode'] = y;
                }}>
                    <View ref={el => { fieldRefs.current['materialType'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="Material Type" required />
                        <Drop placeholder="Select material" value={data.materialType} onPress={() => setMatPick(true)} hasError={hasErr("material")} options={MATERIAL_TYPES} onSelect={(v: string) => { onChange("materialType", v); const hsn = getHsnForMaterial(v); if (hsn) onChange("hsnCode", hsn); }} />
                        <Hint text="Primary material of the product" />
                    </View>
                    <View ref={el => { fieldRefs.current['hsnCode'] = el; }} style={{ flex: 1 }}>
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
                        <Hint text="Auto-filled from material; edit if your product uses a different HSN" />
                    </View>
                </View>
            </Card>

            <Card zIndex={90} style={{ marginTop: 12 }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['desc'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="text-box-edit-outline" title="Descriptions" accent={C.accent2} />
                <Divider />
                <View ref={el => { fieldRefs.current['shortDesc'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['shortDesc'] = e.nativeEvent.layout.y; }}>
                    <Lbl text="Short Description" required />
                    <RichEditor placeholder="Short, punchy summary…" value={data.shortDesc} onChangeText={(v: string) => onChange("shortDesc", v)} maxLength={250} hasError={hasErr("short description")} />
                </View>
                <View style={{ height: 14 }} />
                <View ref={el => { fieldRefs.current['fullDesc'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['fullDesc'] = e.nativeEvent.layout.y; }}>
                    <Lbl text="Full Description" required />
                    <RichEditor placeholder="Full product description…" value={data.fullDesc} onChangeText={(v: string) => onChange("fullDesc", v)} maxLength={2000} hasError={hasErr("full description")} />
                </View>
            </Card>

            <Card zIndex={80} style={{ marginTop: 12 }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['dimensions'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="cube-scan" title="Product Dimensions" accent={C.accent3} />
                <Divider />
                <Text style={at.cardHint}>Enter gross dimensions (including packaging)</Text>
                <View style={at.row3} onLayout={(e: LayoutChangeEvent) => {
                    const y = e.nativeEvent.layout.y;
                    fieldLayouts.current['length'] = y;
                    fieldLayouts.current['width'] = y;
                    fieldLayouts.current['height'] = y;
                }}>
                    {([["Length cm", "length", "30"], ["Width cm", "width", "20"], ["Height cm", "height", "10"]] as [string, string, string][]).map(([lbl, key, ph]) => (
                        <View key={key} ref={el => { fieldRefs.current[key] = el; }} style={{ flex: 1 }}>
                            <Lbl text={lbl} required />
                            <Field placeholder={ph} value={data[key]} onChangeText={(v: string) => onChange(key, v)} keyboardType="numeric" hasError={hasErr(key)} />
                        </View>
                    ))}
                </View>
            </Card>

            <Card zIndex={70} style={{ marginTop: 12 }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['weight'] = e.nativeEvent.layout.y; }}>
                <SecHead icon="weight-kilogram" title="Weight & Delivery" accent={C.accent4} />
                <Divider />
                <Text style={at.cardHint}>Enter gross weight (including packaging)</Text>
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 10 }]} onLayout={(e: LayoutChangeEvent) => {
                    fieldLayouts.current['weight'] = e.nativeEvent.layout.y;
                }}>
                    <View ref={el => { fieldRefs.current['weight'] = el; }} style={{ flex: 1 }}>
                        <Lbl text="Weight (kg)" required />
                        <Field placeholder="e.g. 0.5" value={data.weight} onChangeText={(v: string) => onChange("weight", v)} keyboardType="decimal-pad" hasError={hasErr("weight")} />
                        <Hint text="Auto-calculates delivery charges" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Weight Slab" />
                        <Drop placeholder="Auto-selected" value={data.weightSlab} onPress={() => {}} />
                        <Hint text="Based on entered weight" />
                    </View>
                </View>
                {data.customDeliveryCharge ? (
                    <Hint text="Custom delivery pricing applies for this weight slab." />
                ) : data.weightSlab ? (
                    <View style={[at.row2, { marginTop: 8 }]}>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Intra-city charge (₹)" />
                            <Field value={String(data.intraCityCharge ?? "")} editable={false} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Metro-metro charge (₹)" />
                            <Field value={String(data.metroMetroCharge ?? "")} editable={false} />
                        </View>
                    </View>
                ) : null}
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

            <Card zIndex={60} style={{ marginTop: 12 }} onLayout={(e: LayoutChangeEvent) => { cardLayouts.current['custom'] = e.nativeEvent.layout.y; }}>
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
                        <View ref={el => { fieldRefs.current['custTitle'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['custTitle'] = e.nativeEvent.layout.y; }}>
                            <Lbl text="Customization Title" required />
                            <Field placeholder="e.g. Personalised Name Engraving" value={data.custTitle} onChangeText={(v: string) => onChange("custTitle", v)} maxLength={100} hasError={hasErr("customization title")} />
                        </View>
                        <View ref={el => { fieldRefs.current['custInstructions'] = el; }} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['custInstructions'] = e.nativeEvent.layout.y; }}>
                            <Lbl text="Instructions for Buyer" required />
                            <Field placeholder="Instructions for the buyer…" value={data.custInstructions} onChangeText={(v: string) => onChange("custInstructions", v)} multiline lines={3} maxLength={500} hasError={hasErr("customization instructions")} />
                        </View>
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
                            <View ref={el => { fieldRefs.current['custImageLabel'] = el; }} style={at.custSubField} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['custImageLabel'] = e.nativeEvent.layout.y; }}>
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
                            <View ref={el => { fieldRefs.current['custTextLabel'] = el; }} style={at.custSubField} onLayout={(e: LayoutChangeEvent) => { fieldLayouts.current['custTextLabel'] = e.nativeEvent.layout.y; }}>
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

            <PM visible={catPick} title="Select Category" options={categoryPathOptions} selected={categoryDisplay} onSelect={selectCategoryPath} onClose={() => setCatPick(false)} />
            <PM visible={subPick} title="Select Subcategory" options={leafSubcategoryOptions} selected={data.subcategory} onSelect={selectSubcategory} onClose={() => setSubPick(false)} />
            <PM
                visible={matPick}
                title="Select Material"
                options={MATERIAL_TYPES}
                selected={data.materialType}
                onSelect={(v: string) => {
                    onChange("materialType", v);
                    const hsn = getHsnForMaterial(v);
                    if (hsn) onChange("hsnCode", hsn);
                }}
                onClose={() => setMatPick(false)}
            />
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// STEP 2 — Variants
// ─────────────────────────────────────────────────────────────
type Variant = {
    id: string;
    color: string;
    colorId?: number;
    size: string;
    sizeId?: number;
    sku: string;
    stock: string;
    mrp: string;
    sellingPrice: string;
    discount: string;
    images: string[];
    videoUrl?: string;
};

const StepVariants = ({ variants, setVariants, rmVariant, errors, catalog, productName = "", isDesktop = false, scrollRef, reloadCatalog }: any) => {
    const [clrPick, setClrPick] = useState<string | null>(null);
    const [szPick, setSzPick] = useState<string | null>(null);
    const [addSizeOpen, setAddSizeOpen] = useState(false);
    const [newSizeName, setNewSizeName] = useState("");
    const [newSizeCode, setNewSizeCode] = useState("");
    const [savingSize, setSavingSize] = useState(false);

    const openColorPicker = (variantId: string) => {
        setSzPick(null);
        setClrPick(variantId);
    };

    const openSizePicker = (variantId: string) => {
        setClrPick(null);
        setSzPick(variantId);
    };

    const colorOptions = uniquePickerOptions(
        catalog?.colors?.map((c: { name: string }) => c.name) ?? []
    );
    const sizeOptions =
        catalog?.sizes?.map((s: { name: string; code: string }) =>
            s.code ? `${s.name} (${s.code})` : s.name
        ) ?? [];
    const catalogReady = colorOptions.length > 0 && sizeOptions.length > 0;

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

    const resolveSizeFromLabel = (val: string) =>
        catalog?.sizes?.find(
            (s: { name: string; code: string }) =>
                s.name === val ||
                `${s.name} (${s.code})` === val ||
                s.code === val
        );

    const resolveSizeCode = (variant: Variant) =>
        catalog?.sizes?.find(
            (s: { id?: number; name: string; code: string }) =>
                s.id === variant.sizeId || s.name === variant.size
        )?.code;

    const withAutoFields = (variant: Variant, index: number): Variant => {
        let next = { ...variant };
        if (next.color && next.size) {
            next.sku = generateVariantSku(
                productName,
                next.color,
                next.size,
                index + 1,
                resolveSizeCode(next),
            );
        }
        return next;
    };

    const upVariant = (id: string, field: string, value: string | number | undefined) => {
        setVariants((p: Variant[]) => p.map((v: Variant, idx: number) => {
            if (v.id !== id) return v;
            const u = { ...v, [field]: value };
            if (field === "mrp" || field === "sellingPrice") {
                const mrpRaw = field === "mrp" ? value : u.mrp;
                const spRaw = field === "sellingPrice" ? value : u.sellingPrice;
                u.discount = calcDiscountPercent(mrpRaw, spRaw);
            }
            if (field === "color" || field === "size" || field === "colorId" || field === "sizeId") {
                return withAutoFields(u, idx);
            }
            return u;
        }));
    };

    const patchVariant = (id: string, patch: Partial<Variant>) => {
        setVariants((p: Variant[]) => p.map((v: Variant, idx: number) => {
            if (v.id !== id) return v;
            return withAutoFields({ ...v, ...patch }, idx);
        }));
    };

    const handleCreateSize = async () => {
        const name = newSizeName.trim();
        const code = newSizeCode.trim().toUpperCase();
        if (!name || !code) {
            Alert.alert("Required", "Size name and code are required.");
            return;
        }
        setSavingSize(true);
        try {
            const created = await createSize({ name, code, status: "Active" });
            await reloadCatalog?.();
            if (szPick) {
                patchVariant(szPick, { size: created.name, sizeId: Number(created.id) });
            }
            setAddSizeOpen(false);
            setNewSizeName("");
            setNewSizeCode("");
            setSzPick(null);
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not create size.");
        } finally {
            setSavingSize(false);
        }
    };

    if (!catalogReady) {
        return (
            <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: "Outfit_500Medium", color: C.textMid }}>
                    {catalog ? "No colors or sizes in your catalog. Add them from product settings first." : "Loading color and size catalog…"}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={isDesktop}
            style={isDesktop ? ds.stepScroll : undefined}
            contentContainerStyle={getStepScrollContent(isDesktop)}
        >
            <View style={eb.variantSummary}>
                <MaterialCommunityIcons name="tune-variant" size={15} color={C.navyLight} />
                <Text style={eb.variantSummaryTxt}>{variants.length} variant{variants.length !== 1 ? "s" : ""} — editing existing product</Text>
            </View>

            {variants.map((v: Variant, idx: number) => (
                <Card key={v.id} zIndex={100 - idx} style={{ marginBottom: 12 }}>
                    <View style={vt.hdr}>
                        <View style={vt.badge}><Text style={vt.badgeTxt}>#{idx + 1}</Text></View>
                        <Text style={vt.title}>Variant</Text>
                        <View style={[eb.stockBadge, parseInt(v.stock) < 10 && eb.stockBadgeLow]}>
                            <Text style={[eb.stockTxt, parseInt(v.stock) < 10 && eb.stockTxtLow]}>Stock: {v.stock || "0"}</Text>
                        </View>
                        {variants.length > 1 && (
                            <TouchableOpacity onPress={() => rmVariant(v.id)} style={vt.rmBtn}>
                                <MaterialCommunityIcons name="trash-can-outline" size={15} color={C.red} />
                                <Text style={vt.rmTxt}>Remove</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <Divider />
                    <View style={[at.row2, Platform.OS === 'web' && { zIndex: 20 }]}>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Color" required />
                            <Drop dropKey={`variant-${v.id}-color`} placeholder="Select color" value={v.color} onPress={() => openColorPicker(v.id)} hasError={hasErr(v.id, "color")} options={colorOptions} onSelect={(val: string) => {
                                const color = catalog?.colors?.find((c: { name: string }) => c.name === val);
                                patchVariant(v.id, { color: val, colorId: color?.id });
                            }} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Lbl text="Size" required />
                            <Drop dropKey={`variant-${v.id}-size`} placeholder="Select size" value={v.size} onPress={() => openSizePicker(v.id)} hasError={hasErr(v.id, "size")} options={sizeOptions} onSelect={(val: string) => {
                                const size = resolveSizeFromLabel(val);
                                patchVariant(v.id, { size: size?.name ?? val, sizeId: size?.id });
                            }} />
                            <TouchableOpacity onPress={() => { setSzPick(v.id); setAddSizeOpen(true); }} style={vt.addSizeLink}>
                                <Text style={vt.addSizeLinkTxt}>+ Add new size (your account only)</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={at.row2}>
                        <View style={{ flex: 1 }}>
                            <View style={vt.lblRow}>
                                <Lbl text="SKU" />
                                <View style={vt.auto}><Text style={vt.autoTxt}>Auto</Text></View>
                            </View>
                            <Field placeholder="Auto-generated" value={v.sku} editable={false} />
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
                        <Field placeholder="0" value={v.discount} keyboardType="numeric" editable={false} />
                    </View>

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

            <PM visible={!!clrPick} title="Select Color" options={colorOptions} selected={variants.find((v: Variant) => v.id === clrPick)?.color || ""} onSelect={(val: string) => {
                if (!clrPick) return;
                const color = catalog?.colors?.find((c: { name: string }) => c.name === val);
                patchVariant(clrPick, { color: val, colorId: color?.id });
            }} onClose={() => setClrPick(null)} />
            <PM visible={!!szPick} title="Select Size" options={sizeOptions} selected={variants.find((v: Variant) => v.id === szPick)?.size || ""} onSelect={(val: string) => {
                if (!szPick) return;
                const size = resolveSizeFromLabel(val);
                patchVariant(szPick, { size: size?.name ?? val, sizeId: size?.id });
            }} onClose={() => setSzPick(null)} />
            <Modal visible={addSizeOpen} transparent animationType="fade" onRequestClose={() => setAddSizeOpen(false)}>
                <View style={vt.sizeModalOverlay}>
                    <View style={vt.sizeModalCard}>
                        <Text style={vt.sizeModalTitle}>Add New Size</Text>
                        <Text style={vt.sizeModalSub}>Saved for your seller account only</Text>
                        <Lbl text="Size Name" required />
                        <Field placeholder="e.g. Medium" value={newSizeName} onChangeText={setNewSizeName} />
                        <Lbl text="Size Code" required />
                        <Field placeholder="e.g. M1" value={newSizeCode} onChangeText={setNewSizeCode} />
                        <View style={vt.sizeModalActions}>
                            <TouchableOpacity style={vt.sizeModalCancel} onPress={() => setAddSizeOpen(false)} disabled={savingSize}>
                                <Text style={vt.sizeModalCancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={vt.sizeModalSave} onPress={handleCreateSize} disabled={savingSize}>
                                {savingSize ? <ActivityIndicator color={C.white} size="small" /> : <Text style={vt.sizeModalSaveTxt}>Save Size</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

// ─────────────────────────────────────────────────────────────
// STEP 3 — Images
// ─────────────────────────────────────────────────────────────
const StepImages = ({
    data,
    onChange,
    onImagesChange,
    errors,
    isDesktop = false,
    scrollRef,
}: any) => {
    const hasErr = errors.some((e: string) =>
        e.toLowerCase().includes("image") || e.toLowerCase().includes("primary")
    );

    const [existingImages, setExistingImages] = useState<string[]>(() => imagesFromData(data));
    const [primaryIndex, setPrimaryIndex] = useState(0);
    const [newImages, setNewImages] = useState<string[]>([]);
    const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);
    const [srcModal, setSrcModal] = useState(false);
    const [srcModalVideo, setSrcModalVideo] = useState(false);
    const [manageImagesOpen, setManageImagesOpen] = useState(false);
    const loadedImagesKey = useRef("");
    const userEditedRef = useRef(false);

    const MAX_TOTAL = 8;
    const allImages = [...existingImages, ...newImages];
    const totalCount = allImages.length;
    const canAdd = totalCount < MAX_TOTAL;

    const syncToParent = useCallback(() => {
        const all = [...existingImages, ...newImages];
        const primaryImage = all[primaryIndex] ?? null;
        const additionalImages = all.filter((_, i) => i !== primaryIndex);
        if (onImagesChange) {
            onImagesChange({ primaryImage, additionalImages, video: data.video });
        } else {
            onChange("primaryImage", primaryImage);
            onChange("additionalImages", additionalImages);
        }
    }, [existingImages, newImages, primaryIndex, onChange, onImagesChange, data.video]);

    const pickVideo = async (source: "camera" | "gallery") => {
        setSrcModalVideo(false);
        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed to record a video."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.85 });
            const assets = result.assets ?? [];
            const uri = assets[0]?.uri;
            if (!result.canceled && uri) {
                userEditedRef.current = true;
                onChange("video", uri);
            }
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed."); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.85 });
            const assets = result.assets ?? [];
            const uri = assets[0]?.uri;
            if (!result.canceled && uri) {
                userEditedRef.current = true;
                onChange("video", uri);
            }
        }
    };

    useEffect(() => {
        const urls = imagesFromData(data);
        const key = urls.join("|");
        if (!key || key === loadedImagesKey.current) return;
        loadedImagesKey.current = key;
        userEditedRef.current = false;
        setExistingImages(urls);
        setNewImages([]);
        setPrimaryIndex(0);
    }, [data.primaryImage, data.additionalImages]);

    useEffect(() => {
        if (!userEditedRef.current) return;
        syncToParent();
    }, [existingImages, newImages, primaryIndex, syncToParent]);

    const pickNewImages = async (source: "camera" | "gallery") => {
        setSrcModal(false);
        const remaining = MAX_TOTAL - totalCount;
        if (remaining <= 0) return;
        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed."); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
            const assets = result.assets ?? [];
            const uri = assets[0]?.uri;
            if (!result.canceled && uri) {
                userEditedRef.current = true;
                setNewImages(p => [...p, uri]);
            }
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") { Alert.alert("Permission Required", "Gallery access is needed."); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: remaining > 1, selectionLimit: remaining, quality: 0.85 });
            const assets = result.assets ?? [];
            if (!result.canceled && assets.length) {
                userEditedRef.current = true;
                setNewImages(p => [...p, ...assets.map((a: any) => a.uri)]);
            }
        }
    };

    const handleDeleteConfirm = () => {
        if (deleteConfirmIdx === null) return;
        userEditedRef.current = true;
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
        if (newTotal === 0) { newPrimary = 0; }
        else if (primaryIndex === idx) { newPrimary = 0; }
        else if (primaryIndex > idx) { newPrimary = primaryIndex - 1; }
        setPrimaryIndex(newPrimary);
    };

    const isNewImageAt = (globalIdx: number) => globalIdx >= existingImages.length;

    const renderCompactThumb = (uri: string, globalIdx: number, showMoreOverlay = false) => {
        const isPrimary = primaryIndex === globalIdx;
        const isNew = isNewImageAt(globalIdx);
        const extra = totalCount - 3;
        return (
            <View key={`preview-${uri}-${globalIdx}`} style={si.previewCardWrap}>
                <View style={[si.previewCard, isPrimary && si.previewCardPrimary, isNew && si.previewCardNew]}>
                    <Image source={{ uri }} style={si.previewImage} resizeMode="cover" />
                    {isPrimary && (
                        <View style={si.primaryRibbon}>
                            <MaterialCommunityIcons name="star" size={10} color={C.white} />
                            <Text style={si.primaryRibbonTxt}>Primary</Text>
                        </View>
                    )}
                    {isNew && !isPrimary && (
                        <View style={si.newImageBadge}><Text style={si.newImageBadgeTxt}>New</Text></View>
                    )}
                    {!showMoreOverlay && (
                        <TouchableOpacity style={si.deleteBtn} onPress={() => setDeleteConfirmIdx(globalIdx)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <MaterialCommunityIcons name="trash-can-outline" size={13} color={C.white} />
                        </TouchableOpacity>
                    )}
                    {showMoreOverlay && extra > 0 && (
                        <TouchableOpacity style={si.moreOverlay} onPress={() => setManageImagesOpen(true)} activeOpacity={0.9}>
                            <MaterialCommunityIcons name="image-multiple-outline" size={22} color={C.white} />
                            <Text style={si.moreOverlayTxt}>+{extra} more</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const renderImageCard = (uri: string, globalIdx: number, compact = false) => {
        const isPrimary = primaryIndex === globalIdx;
        const isNew = isNewImageAt(globalIdx);
        const cardStyle = compact
            ? [si.modalImageCard, isDesktop && si.modalImageCardDesktop, isPrimary && si.imageCardPrimary, isNew && si.imageCardNew]
            : [si.imageCard, isPrimary && si.imageCardPrimary, isNew && si.imageCardNew];
        return (
            <View key={`img-${uri}-${globalIdx}`} style={cardStyle}>
                <View style={si.imageFrame}>
                    <Image source={{ uri }} style={si.image} resizeMode="cover" />
                    {isPrimary && (
                        <View style={si.primaryRibbon}>
                            <MaterialCommunityIcons name="star" size={10} color={C.white} />
                            <Text style={si.primaryRibbonTxt}>Primary</Text>
                        </View>
                    )}
                    {isNew && !isPrimary && <View style={si.newImageBadge}><Text style={si.newImageBadgeTxt}>New</Text></View>}
                    <TouchableOpacity style={si.deleteBtn} onPress={() => setDeleteConfirmIdx(globalIdx)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <MaterialCommunityIcons name="trash-can-outline" size={13} color={C.white} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={si.radioRow}
                    onPress={() => {
                        userEditedRef.current = true;
                        setPrimaryIndex(globalIdx);
                    }}
                    activeOpacity={0.75}
                >
                    <View style={[si.radio, isPrimary && si.radioOn]}>
                        {isPrimary && <View style={si.radioDot} />}
                    </View>
                    <Text style={[si.radioLbl, isPrimary && si.radioLblOn]}>{isPrimary ? "Primary Image" : "Set as Primary"}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const openAddImages = () => {
        if (!canAdd) { Alert.alert("Limit reached", `Maximum ${MAX_TOTAL} images allowed. Remove one to add more.`); return; }
        setSrcModal(true);
    };

    return (
        <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={isDesktop}
            style={isDesktop ? ds.stepScroll : undefined}
            contentContainerStyle={getStepScrollContent(isDesktop)}
        >
            <View style={eb.tipCard}>
                <MaterialCommunityIcons name="lightbulb-outline" size={16} color={C.amber} />
                <Text style={eb.tipTxt}>High-quality images increase conversions. Tap "Set as Primary" on any image to change the main display image.</Text>
            </View>

            <Card>
                <SecHead icon="image-multiple-outline" title="Product Images" accent={C.accent2} />
                <Divider />
                <View style={si.sectionRow}>
                    <View style={si.sectionLabelWrap}>
                        <MaterialCommunityIcons name="cloud-check-outline" size={13} color={C.accent2} />
                        <Text style={si.sectionLabel}>Current Images</Text>
                        {totalCount > 0 && <Text style={si.sectionCountInline}>· {totalCount} saved</Text>}
                    </View>
                    <TouchableOpacity style={si.moreImagesBtn} onPress={() => setManageImagesOpen(true)} activeOpacity={0.85}>
                        <MaterialCommunityIcons name="image-plus" size={15} color={C.white} />
                        <Text style={si.moreImagesBtnTxt}>More Images</Text>
                    </TouchableOpacity>
                </View>

                {totalCount > 0 ? (
                    <>
                        <View style={si.previewRow}>
                            {allImages.slice(0, 3).map((uri, i) => renderCompactThumb(uri, i, i === 2 && totalCount > 3))}
                        </View>
                        <Text style={si.hintTxt}>Tap <Text style={{ fontFamily: "Outfit_600SemiBold" }}>More Images</Text> to add, remove, or set the primary image</Text>
                    </>
                ) : (
                    <TouchableOpacity
                        style={[si.addBox, hasErr && { borderColor: C.red, backgroundColor: "#FFF8F8" }]}
                        onPress={() => setManageImagesOpen(true)}
                        activeOpacity={0.75}
                    >
                        <View style={si.addIconWrap}>
                            <MaterialCommunityIcons name="camera-plus-outline" size={28} color={hasErr ? C.red : C.navyLight} />
                        </View>
                        <Text style={[si.addTitle, hasErr && { color: C.red }]}>{hasErr ? "At least one image is required" : "Add product images"}</Text>
                        <Text style={si.addSub}>JPG · PNG · WebP · up to {MAX_TOTAL} images</Text>
                    </TouchableOpacity>
                )}
                <Text style={[si.sectionCount, { marginTop: 10, textAlign: "right" }]}>{totalCount}/{MAX_TOTAL} images</Text>
                <View style={{ height: 20 }} />
                <Lbl text="Product Video (Optional)" />
                <Hint text="Upload a video to show your product in action. Max 20 MB." />
                {data.video ? (
                    <View style={si.videoPreviewWrap}>
                        <View style={si.videoIconWrap}>
                            <MaterialCommunityIcons name="video" size={26} color={C.navy} />
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={si.videoTitle} numberOfLines={1}>
                                {data.video.split("/").pop() || "product_video.mp4"}
                            </Text>
                            <Text style={si.videoSub}>Video ready for upload</Text>
                        </View>
                        <TouchableOpacity style={si.videoChangeBtn} onPress={() => setSrcModalVideo(true)}>
                            <MaterialCommunityIcons name="pencil" size={15} color={C.navy} />
                        </TouchableOpacity>
                        <TouchableOpacity style={si.videoRemoveBtn} onPress={() => { onChange("video", null); userEditedRef.current = true; }}>
                            <MaterialCommunityIcons name="trash-can-outline" size={15} color={C.red} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={si.videoBox}
                        onPress={() => setSrcModalVideo(true)}
                        activeOpacity={0.75}
                    >
                        <View style={si.videoIconWrapLarge}>
                            <MaterialCommunityIcons name="video-plus-outline" size={28} color={C.navyLight} />
                        </View>
                        <Text style={si.videoBoxTitle}>Tap to upload product video</Text>
                        <Text style={si.videoBoxSub}>MP4 · MOV · WebM · Max 20 MB</Text>
                    </TouchableOpacity>
                )}
                <Modal visible={srcModalVideo} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={() => setSrcModalVideo(false)}>
                    <View style={[cp.modalOverlay, isDesktop && cp.modalOverlayCenter]}>
                        <TouchableOpacity style={cp.modalBackdrop} activeOpacity={1} onPress={() => setSrcModalVideo(false)} />
                        <View style={[cp.modalSheet, isDesktop && cp.modalPopup]}>
                            {!isDesktop && <View style={cp.modalDrag} />}
                            {isDesktop ? (
                                <View style={cp.modalHeaderRow}>
                                    <Text style={[cp.modalTitle, cp.modalTitleDesktop]}>Add Video</Text>
                                    <TouchableOpacity style={cp.modalCloseBtn} onPress={() => setSrcModalVideo(false)}>
                                        <Ionicons name="close" size={20} color={C.textMid} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <Text style={cp.modalTitle}>Add Video</Text>
                            )}
                            <TouchableOpacity style={[cp.modalOption, isDesktop && cp.modalOptionDesktop]} onPress={() => pickVideo("camera")}>
                                <View style={[cp.modalIconWrap, { backgroundColor: "#EEF1FA" }]}><MaterialCommunityIcons name="camera-outline" size={22} color={C.navy} /></View>
                                <View style={{ flex: 1 }}><Text style={cp.modalOptTitle}>Take a Video</Text><Text style={cp.modalOptSub}>Record using camera</Text></View>
                                <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[cp.modalOption, isDesktop && cp.modalOptionDesktop]} onPress={() => pickVideo("gallery")}>
                                <View style={[cp.modalIconWrap, { backgroundColor: "#EDFAF4" }]}><MaterialCommunityIcons name="image-multiple-outline" size={22} color={C.accent5} /></View>
                                <View style={{ flex: 1 }}><Text style={cp.modalOptTitle}>Choose from Gallery</Text><Text style={cp.modalOptSub}>Pick a video from your library</Text></View>
                                <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[cp.modalCancel, isDesktop && cp.modalCancelDesktop]} onPress={() => setSrcModalVideo(false)}>
                                <Text style={cp.modalCancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </Card>

            <FormPopupModal visible={manageImagesOpen} onClose={() => setManageImagesOpen(false)} title="Manage Product Images" wide accentHeader headerIcon="image-multiple-outline">
                <Hint text="Set one image as primary. New uploads are marked until you update the product." />
                <View style={[si.sectionRow, { marginTop: 4 }]}>
                    <Text style={si.sectionLabel}>{totalCount} image{totalCount !== 1 ? "s" : ""} · {MAX_TOTAL - totalCount} slot{MAX_TOTAL - totalCount !== 1 ? "s" : ""} left</Text>
                    {canAdd && (
                        <TouchableOpacity style={si.moreImagesBtn} onPress={openAddImages} activeOpacity={0.85}>
                            <Ionicons name="add" size={16} color={C.white} />
                            <Text style={si.moreImagesBtnTxt}>Add Images</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {existingImages.length > 0 && (
                    <>
                        <Text style={[si.modalGroupLbl, { marginTop: 12 }]}>Saved on server</Text>
                        <View style={[si.modalGrid, isDesktop && si.modalGridDesktop]}>
                            {existingImages.map((uri, i) => renderImageCard(uri, i, true))}
                        </View>
                    </>
                )}
                {newImages.length > 0 && (
                    <>
                        <Text style={[si.modalGroupLbl, { marginTop: 14 }]}>Pending upload</Text>
                        <View style={[si.modalGrid, isDesktop && si.modalGridDesktop]}>
                            {newImages.map((uri, i) => renderImageCard(uri, existingImages.length + i, true))}
                        </View>
                    </>
                )}
                {totalCount === 0 && (
                    <View style={si.emptyBox}>
                        <MaterialCommunityIcons name="image-off-outline" size={40} color={C.textLight} />
                        <Text style={si.emptyTitle}>No images yet</Text>
                        <Text style={si.emptyDesc}>Add at least one product image.</Text>
                    </View>
                )}
                {!canAdd && totalCount > 0 && (
                    <View style={[si.maxBox, { marginTop: 12 }]}>
                        <MaterialCommunityIcons name="check-circle-outline" size={18} color={C.accent5} />
                        <Text style={si.maxTxt}>Maximum {MAX_TOTAL} images reached.</Text>
                    </View>
                )}
                <View style={[fp.footerRow, isDesktop && fp.footerRowDesktop]}>
                    <TouchableOpacity style={[fp.footerBtnPrimary, fp.footerBtnAccent, !isDesktop && fp.footerBtnPrimaryFull]} onPress={() => setManageImagesOpen(false)}>
                        <Text style={fp.footerBtnTxtPrimary}>Done</Text>
                    </TouchableOpacity>
                </View>
            </FormPopupModal>

            <Modal visible={srcModal} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={() => setSrcModal(false)}>
                <View style={[cp.modalOverlay, isDesktop && cp.modalOverlayCenter]}>
                    <TouchableOpacity style={cp.modalBackdrop} activeOpacity={1} onPress={() => setSrcModal(false)} />
                    <View style={[cp.modalSheet, isDesktop && cp.modalPopup]}>
                        {!isDesktop && <View style={cp.modalDrag} />}
                        {isDesktop ? (
                            <View style={cp.modalHeaderRow}>
                                <Text style={[cp.modalTitle, cp.modalTitleDesktop]}>Add Images</Text>
                                <TouchableOpacity style={cp.modalCloseBtn} onPress={() => setSrcModal(false)}>
                                    <Ionicons name="close" size={20} color={C.textMid} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Text style={cp.modalTitle}>Add Images</Text>
                        )}
                        <TouchableOpacity style={[cp.modalOption, isDesktop && cp.modalOptionDesktop]} onPress={() => pickNewImages("camera")}>
                            <View style={[cp.modalIconWrap, { backgroundColor: "#EEF1FA" }]}><MaterialCommunityIcons name="camera-outline" size={22} color={C.navy} /></View>
                            <View style={{ flex: 1 }}><Text style={cp.modalOptTitle}>Take a Photo</Text><Text style={cp.modalOptSub}>Use your camera right now</Text></View>
                            <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[cp.modalOption, isDesktop && cp.modalOptionDesktop]} onPress={() => pickNewImages("gallery")}>
                            <View style={[cp.modalIconWrap, { backgroundColor: "#EDFAF4" }]}><MaterialCommunityIcons name="image-multiple-outline" size={22} color={C.accent5} /></View>
                            <View style={{ flex: 1 }}><Text style={cp.modalOptTitle}>Choose from Gallery</Text><Text style={cp.modalOptSub}>Pick up to {MAX_TOTAL - totalCount} photo{MAX_TOTAL - totalCount !== 1 ? "s" : ""}</Text></View>
                            <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[cp.modalCancel, isDesktop && cp.modalCancelDesktop]} onPress={() => setSrcModal(false)}>
                            <Text style={cp.modalCancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={deleteConfirmIdx !== null} transparent animationType="fade" onRequestClose={() => setDeleteConfirmIdx(null)}>
                <View style={si.deleteOverlay}>
                    <View style={si.deleteSheet}>
                        <View style={si.deleteIconWrap}><MaterialCommunityIcons name="trash-can-outline" size={32} color={C.red} /></View>
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

const si = StyleSheet.create({
    sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 },
    sectionLabelWrap: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, flexWrap: "wrap" },
    sectionLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: C.textMid },
    sectionCountInline: { fontFamily: "Outfit_500Medium", fontSize: 11.5, color: C.textLight },
    sectionCount: { fontFamily: "Outfit_500Medium", fontSize: 11.5, color: C.textLight },
    moreImagesBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.accent4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    moreImagesBtnTxt: { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.white },
    previewRow: { flexDirection: "row", width: "100%", gap: 12, alignItems: "stretch" },
    previewCardWrap: { flex: 1, minWidth: 0 },
    previewCard: { width: "100%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: C.border, backgroundColor: C.inputBg, position: "relative" },
    previewCardPrimary: { borderColor: C.navy, borderWidth: 2 },
    previewCardNew: { borderColor: C.accent5 },
    previewImage: { width: "100%", height: "100%" },
    moreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,20,60,0.55)", alignItems: "center", justifyContent: "center", gap: 4 },
    moreOverlayTxt: { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.white },
    modalGroupLbl: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textMid, marginBottom: 8 },
    modalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    modalGridDesktop: { gap: 12 },
    modalImageCard: { width: "47%", borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: C.border, backgroundColor: C.inputBg },
    modalImageCardDesktop: { width: "31%" },
    imageCard: { width: "47%", borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: C.border, backgroundColor: C.inputBg },
    imageCardPrimary: { borderColor: C.navy, borderWidth: 2 },
    imageCardNew: { borderColor: C.accent5, borderWidth: 1.5 },
    imageFrame: { width: "100%", aspectRatio: 1, position: "relative" },
    image: { width: "100%", height: "100%" },
    primaryRibbon: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: C.navy, paddingVertical: 5 },
    primaryRibbonTxt: { fontFamily: "Outfit_700Bold", fontSize: 10, color: C.white, letterSpacing: 0.3 },
    newImageBadge: { position: "absolute", top: 8, left: 8, backgroundColor: C.accent5, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
    newImageBadgeTxt: { fontFamily: "Outfit_700Bold", fontSize: 9, color: C.white },
    deleteBtn: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(200,30,30,0.85)", alignItems: "center", justifyContent: "center" },
    radioRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
    radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.navyBorder, alignItems: "center", justifyContent: "center", backgroundColor: C.white },
    radioOn: { borderColor: C.navy },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.navy },
    radioLbl: { fontFamily: "Outfit_500Medium", fontSize: 10.5, color: C.textMid, flex: 1 },
    radioLblOn: { fontFamily: "Outfit_700Bold", color: C.navy },
    emptyBox: { alignItems: "center", paddingVertical: 32, gap: 6 },
    emptyTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.textMid, marginTop: 4 },
    emptyDesc: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, textAlign: "center" },
    addBox: { borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", paddingVertical: 22, paddingHorizontal: 16, gap: 6, backgroundColor: C.inputBg },
    addIconWrap: { width: 56, height: 56, borderRadius: 14, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    addTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textMid, textAlign: "center" },
    addSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, textAlign: "center" },
    maxBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.greenPale, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#A3E9C8" },
    maxTxt: { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.greenText, flex: 1 },
    hintTxt: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginTop: 10, textAlign: "center" },
    deleteOverlay: { flex: 1, backgroundColor: "rgba(10,20,60,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
    deleteSheet: { backgroundColor: C.white, borderRadius: 22, padding: 28, alignItems: "center", width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 20 },
    deleteIconWrap: { width: 64, height: 64, borderRadius: 16, backgroundColor: C.redPale, alignItems: "center", justifyContent: "center", marginBottom: 14 },
    deleteTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, color: C.textDark, marginBottom: 8 },
    deleteBody: { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textMid, textAlign: "center", lineHeight: 20, marginBottom: 22 },
    deleteConfirmBtn: { width: "100%", backgroundColor: C.red, borderRadius: 13, paddingVertical: 13, alignItems: "center", marginBottom: 10 },
    deleteConfirmTxt: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.white },
    deleteCancelBtn: { width: "100%", backgroundColor: C.navyGhost, borderRadius: 13, paddingVertical: 13, alignItems: "center" },
    deleteCancelTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.navy },
    videoBox: { marginTop: 12, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", paddingVertical: 24, gap: 6, backgroundColor: C.inputBg },
    videoIconWrapLarge: { width: 56, height: 56, borderRadius: 14, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    videoBoxTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textMid, textAlign: "center" },
    videoBoxSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, textAlign: "center" },
    videoPreviewWrap: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, backgroundColor: C.navyGhost, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: C.navyBorder },
    videoIconWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    videoTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textDark },
    videoSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginTop: 2 },
    videoChangeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    videoRemoveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.redPale, alignItems: "center", justifyContent: "center" },
});

// ─────────────────────────────────────────────────────────────
// STEP 4 — Details
// ─────────────────────────────────────────────────────────────
const StepDetails = ({ data, onChange, errors, isDesktop = false, scrollRef, catalog, reloadCatalog }: any) => {
    const [sizePick, setSizePick] = useState(false);
    const [retPick, setRetPick] = useState(false);
    const [delPick, setDelPick] = useState(false);
    const [createSizeOpen, setCreateSizeOpen] = useState(false);
    const [customPolicyOpen, setCustomPolicyOpen] = useState(false);
    const [sizeChartOptions, setSizeChartOptions] = useState<string[]>(DEFAULT_SIZE_CHART_OPTIONS);
    const [newChartName, setNewChartName] = useState("");
    const [chartCategory, setChartCategory] = useState(CHART_CATEGORY_ALL);
    const [chartSubcategory, setChartSubcategory] = useState(CHART_SUB_ALL);
    const [chartImageUri, setChartImageUri] = useState<string | null>(null);
    const [chartRows, setChartRows] = useState<SizeChartRow[]>([]);
    const [chartUnit, setChartUnit] = useState<string>(DEFAULT_CHART_UNIT);
    const [chartNotes, setChartNotes] = useState("");
    const [chartCatPick, setChartCatPick] = useState(false);
    const [chartSubPick, setChartSubPick] = useState(false);
    const [chartUnitPick, setChartUnitPick] = useState(false);
    const [chartSizePickRowId, setChartSizePickRowId] = useState<string | null>(null);
    const [addChartSizeOpen, setAddChartSizeOpen] = useState(false);
    const [newChartSizeName, setNewChartSizeName] = useState("");
    const [newChartSizeCode, setNewChartSizeCode] = useState("");
    const [savingChartSize, setSavingChartSize] = useState(false);
    const [savingChart, setSavingChart] = useState(false);
    const [customPolicyDraft, setCustomPolicyDraft] = useState(data.returnPolicyText || "");
    const features = data.features?.length ? data.features : [""];
    const specs = data.specifications?.length ? data.specifications : [{ name: "", value: "" }];
    const hasErr = (field: string) => errors.some((e: string) => e.toLowerCase().includes(field.toLowerCase()));

    const chartCategoryOptions = [CHART_CATEGORY_ALL, ...CATEGORIES];
    const chartSubOptions = chartCategory === CHART_CATEGORY_ALL
        ? [CHART_SUB_ALL, ...ALL_CHART_SUBCATEGORIES]
        : [CHART_SUB_ALL, ...(SUBCATEGORIES[chartCategory] || [])];

    const catalogSizes: { id?: number; name: string; code: string }[] = catalog?.sizes ?? [];
    const chartSizeOptions = uniquePickerOptions(
        catalogSizes.map((s) => formatSizeOption(s))
    );

    const openCreateSizeChart = () => {
        setNewChartName(""); setChartCategory(CHART_CATEGORY_ALL); setChartSubcategory(CHART_SUB_ALL);
        setChartImageUri(null); setChartUnit(DEFAULT_CHART_UNIT); setChartNotes("");
        setChartRows([emptySizeRow()]); setChartCatPick(false); setChartSubPick(false); setChartUnitPick(false);
        setCreateSizeOpen(true);
    };

    const openCustomPolicy = () => { setCustomPolicyDraft(data.returnPolicyText || ""); setCustomPolicyOpen(true); };

    const saveSizeChart = async () => {
        const name = newChartName.trim();
        if (!name) { Alert.alert("Chart name required", "Please enter a name for your size chart."); return; }
        const validRows = chartRows.filter((r) => r.size.trim());
        if (validRows.length === 0) { Alert.alert("Sizes required", "Add at least one size row to the chart."); return; }
        setSavingChart(true);
        try {
            const sizeNames = validRows.map((r) => r.size.trim());
            await ensureSellerSizesInCatalog(sizeNames, catalogSizes);
            await reloadCatalog?.();
            setSizeChartOptions((prev) => (prev.includes(name) ? prev : [...prev, name]));
            onChange("sizeChart", name);
            onChange("sizeChartRows", validRows);
            setCreateSizeOpen(false);
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not save sizes to your catalog.");
        } finally {
            setSavingChart(false);
        }
    };

    const saveCustomPolicy = () => {
        const text = customPolicyDraft.trim();
        if (!text) { Alert.alert("Policy required", "Please write your custom return policy."); return; }
        onChange("returnPolicy", "Custom Policy");
        onChange("returnPolicyText", text);
        setCustomPolicyOpen(false);
    };

    const addChartSizeRow = () => setChartRows((prev) => [...prev, emptySizeRow()]);
    const removeChartRow = (id: string) => setChartRows((prev) => prev.filter((r) => r.id !== id));
    const updateChartRow = (id: string, field: keyof SizeChartRow, value: string) => {
        setChartRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    };

    const handleCreateChartSize = async () => {
        const name = newChartSizeName.trim();
        const code = newChartSizeCode.trim().toUpperCase();
        if (!name || !code) {
            Alert.alert("Required", "Size name and code are required.");
            return;
        }
        setSavingChartSize(true);
        try {
            const created = await createSize({ name, code, status: "Active" });
            await reloadCatalog?.();
            if (chartSizePickRowId) {
                updateChartRow(chartSizePickRowId, "size", created.name);
            } else {
                const emptyRow = chartRows.find((r) => !r.size.trim());
                if (emptyRow) {
                    updateChartRow(emptyRow.id, "size", created.name);
                } else {
                    setChartRows((prev) => [...prev, emptySizeRow(created.name)]);
                }
            }
            setAddChartSizeOpen(false);
            setNewChartSizeName("");
            setNewChartSizeCode("");
            setChartSizePickRowId(null);
        } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Could not create size.");
        } finally {
            setSavingChartSize(false);
        }
    };

    const twoCol = isDesktop ? at.row2 : dt.responsiveCol;
    const fieldFlex = isDesktop ? { flex: 1 } : dt.responsiveField;

    return (
        <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={isDesktop}
            style={isDesktop ? ds.stepScroll : undefined}
            contentContainerStyle={getStepScrollContent(isDesktop)}
        >
            <Card zIndex={100}>
                <SecHead icon="ruler-square" title="Size Chart" accent={C.accent1} />
                <Divider />
                <Lbl text="Select Size Chart" />
                <View style={[twoCol, Platform.OS === 'web' && { zIndex: 20 }, isDesktop && { alignItems: "flex-end" }]}>
                    <View style={fieldFlex}>
                        <Drop placeholder="No size chart" value={data.sizeChart} onPress={() => setSizePick(true)} options={sizeChartOptions} onSelect={(v: string) => onChange("sizeChart", v)} />
                    </View>
                    <TouchableOpacity style={[dt.outBtn, !isDesktop && dt.outBtnFull]} onPress={openCreateSizeChart} activeOpacity={0.85}>
                        <Ionicons name="add" size={15} color={C.navy} />
                        <Text style={dt.outBtnTxt}>Create New</Text>
                    </TouchableOpacity>
                </View>
            </Card>

            <Card zIndex={90} style={{ marginTop: 12 }}>
                <SecHead icon="refresh" title="Return Policy" accent={C.accent3} />
                <Divider />
                <View style={[twoCol, Platform.OS === 'web' && { zIndex: 20 }]}>
                    <View style={fieldFlex}>
                        <Lbl text="Policy Template" required />
                        <Drop placeholder="Select template" value={data.returnPolicy} onPress={() => setRetPick(true)} hasError={hasErr("return policy")} options={RETURN_POLICY_OPTIONS} onSelect={(v: string) => applyReturnPolicySelection(v, onChange)} />
                    </View>
                    <View style={fieldFlex}>
                        <Lbl text="Custom Policy" />
                        <TouchableOpacity style={[dt.outBtn, !isDesktop && dt.outBtnFull]} onPress={openCustomPolicy} activeOpacity={0.85}>
                            <Feather name="edit-2" size={13} color={C.navy} />
                            <Text style={dt.outBtnTxt}>Write Custom</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <Lbl text="Policy Details" />
                <Field placeholder="Describe your return policy…" value={data.returnPolicyText} onChangeText={(v: string) => onChange("returnPolicyText", v)} multiline lines={4} maxLength={1000} />
                <CC cur={(data.returnPolicyText || "").length} max={1000} />
            </Card>

            <Card zIndex={80} style={{ marginTop: 12 }}>
                <SecHead icon="truck-fast-outline" title="Delivery" accent={C.accent4} />
                <Divider />
                <View style={[at.row2, Platform.OS === 'web' && { zIndex: 20 }, { alignItems: "flex-end", marginBottom: 12 }]}>
                    <View style={{ flex: 2 }}>
                        <Lbl text="Delivery Option" required />
                        <Drop placeholder="Select option" value={data.deliveryOption} onPress={() => setDelPick(true)} hasError={hasErr("delivery option")} options={DELIVERY_OPTIONS} onSelect={(v: string) => applyDeliverySelection(v, onChange)} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Min Days" />
                        <Field placeholder="3" value={data.minDays} onChangeText={(v: string) => onChange("minDays", v)} keyboardType="numeric" editable={!data.deliveryOption} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Max Days" />
                        <Field placeholder="7" value={data.maxDays} onChangeText={(v: string) => onChange("maxDays", v)} keyboardType="numeric" editable={!data.deliveryOption} />
                    </View>
                </View>
                <Field placeholder="Extra delivery notes…" value={data.deliveryInfo} onChangeText={(v: string) => onChange("deliveryInfo", v)} multiline lines={3} maxLength={1000} />
            </Card>

            <Card zIndex={70} style={{ marginTop: 12 }}>
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

            <Card zIndex={60} style={{ marginTop: 12 }}>
                <SecHead icon="format-list-bulleted" title="Features & Specs" accent={C.accent1} />
                <Divider />
                <Lbl text="Product Features" />
                {features.map((f, i) => (
                    <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Enter feature" value={f} onChangeText={(v: string) => { const arr = [...features]; arr[i] = v; onChange("features", arr); }} />
                        </View>
                        <TouchableOpacity style={dt.specDel} onPress={() => onChange("features", features.filter((_, idx) => idx !== i))}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.red} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={dt.addBtn} onPress={() => onChange("features", [...features, ""])}>
                    <Ionicons name="add" size={15} color={C.navy} />
                    <Text style={dt.addBtnTxt}>Add Feature</Text>
                </TouchableOpacity>
                <Divider />
                <Lbl text="Specifications" />
                {specs.map((sp, i) => (
                    <View key={i} style={dt.specRow}>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Name" value={sp.name} onChangeText={(v: string) => { const arr = [...specs]; if (arr[i]) arr[i]!.name = v; onChange("specifications", arr); }} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Field placeholder="Value" value={sp.value} onChangeText={(v: string) => { const arr = [...specs]; if (arr[i]) arr[i]!.value = v; onChange("specifications", arr); }} />
                        </View>
                        <TouchableOpacity style={dt.specDel} onPress={() => onChange("specifications", specs.filter((_, idx) => idx !== i))}>
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.red} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={dt.addBtn} onPress={() => onChange("specifications", [...specs, { name: "", value: "" }])}>
                    <Ionicons name="add" size={15} color={C.navy} />
                    <Text style={dt.addBtnTxt}>Add Specification</Text>
                </TouchableOpacity>
            </Card>

            <PM visible={sizePick} title="Size Chart" options={sizeChartOptions} selected={data.sizeChart} onSelect={(v: string) => onChange("sizeChart", v)} onClose={() => setSizePick(false)} />
            <PM visible={retPick} title="Return Policy" options={RETURN_POLICY_OPTIONS} selected={data.returnPolicy} onSelect={(v: string) => applyReturnPolicySelection(v, onChange)} onClose={() => setRetPick(false)} />
            <PM visible={delPick} title="Delivery Option" options={DELIVERY_OPTIONS} selected={data.deliveryOption} onSelect={(v: string) => applyDeliverySelection(v, onChange)} onClose={() => setDelPick(false)} />

            <FormPopupModal
                visible={createSizeOpen}
                onClose={() => { setChartCatPick(false); setChartSubPick(false); setChartUnitPick(false); setCreateSizeOpen(false); }}
                title="Create Size Chart"
                wide
                accentHeader
                headerIcon="ruler"
                overlay={
                    <>
                        <InlinePicker visible={chartCatPick} title="Select Category" options={chartCategoryOptions} selected={chartCategory} onSelect={(v) => { setChartCategory(v); setChartSubcategory(CHART_SUB_ALL); }} onClose={() => setChartCatPick(false)} />
                        <InlinePicker visible={chartSubPick} title="Select Subcategory" options={chartSubOptions} selected={chartSubcategory} onSelect={setChartSubcategory} onClose={() => setChartSubPick(false)} />
                        <InlinePicker visible={chartUnitPick} title="Measurement Unit" options={[...MEASUREMENT_UNIT_OPTIONS]} selected={chartUnit} onSelect={setChartUnit} onClose={() => setChartUnitPick(false)} />
                        <InlinePicker
                            visible={chartSizePickRowId != null}
                            title="Select Size"
                            options={chartSizeOptions}
                            selected={chartRows.find((r) => r.id === chartSizePickRowId)?.size ?? ""}
                            onSelect={(v: string) => {
                                if (chartSizePickRowId) {
                                    updateChartRow(
                                        chartSizePickRowId,
                                        "size",
                                        resolveSizeNameFromLabel(v, catalogSizes)
                                    );
                                }
                                setChartSizePickRowId(null);
                            }}
                            onClose={() => setChartSizePickRowId(null)}
                        />
                    </>
                }
            >
                <Lbl text="Chart Name" required />
                <Field placeholder="e.g. Men's Clothing Size Chart" value={newChartName} onChangeText={setNewChartName} />
                <View style={[twoCol, { marginTop: 0 }]}>
                    <View style={fieldFlex}>
                        <Lbl text="Category (Optional)" />
                        <Drop placeholder={CHART_CATEGORY_ALL} value={chartCategory} onPress={() => { setChartSubPick(false); setChartUnitPick(false); setChartCatPick(true); }} />
                    </View>
                    <View style={fieldFlex}>
                        <Lbl text="Subcategory (Optional)" />
                        <Drop placeholder={CHART_SUB_ALL} value={chartSubcategory} onPress={() => { setChartCatPick(false); setChartUnitPick(false); setChartSubPick(true); }} />
                    </View>
                </View>
                <Lbl text="Size Chart Image (Optional)" />
                <Hint text="Upload an image of your size chart (JPG, PNG, GIF, WebP)" />
                <CustImagePicker uri={chartImageUri} onPick={setChartImageUri} onRemove={() => setChartImageUri(null)} />
                <View style={dt.sizeDataHead}>
                    <View style={{ flex: 1 }}>
                        <Lbl text="Size Chart Data" required />
                        <Hint text="Size Information — enter measurements for each size." />
                    </View>
                    <TouchableOpacity style={dt.addSizeOrangeBtn} onPress={addChartSizeRow} activeOpacity={0.85}>
                        <Ionicons name="add" size={16} color={C.white} />
                        <Text style={dt.addSizeOrangeBtnTxt}>Add Size</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setAddChartSizeOpen(true)} style={vt.addSizeLink} activeOpacity={0.7}>
                    <Text style={vt.addSizeLinkTxt}>+ Add new size to your catalog (seller only)</Text>
                </TouchableOpacity>
                {chartRows.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={isDesktop} style={dt.sizeTableScroll}>
                        <View style={dt.sizeTableWrap}>
                            <View style={dt.sizeTableHeader}>
                                {SIZE_TABLE_COLS.map((col) => (
                                    <View key={col.key} style={[dt.sizeTableTh, { width: col.width, minWidth: col.width }]}>
                                        <Text style={dt.sizeTableThTxt} numberOfLines={2}>{col.label}</Text>
                                    </View>
                                ))}
                                <View style={dt.sizeTableThAction}><Text style={dt.sizeTableThTxt}>Action</Text></View>
                            </View>
                            {chartRows.map((row, idx) => (
                                <View key={row.id} style={[dt.sizeTableRow, idx % 2 === 1 && dt.sizeTableRowAlt]}>
                                    {SIZE_TABLE_COLS.map((col) => (
                                        <View key={col.key} style={[dt.sizeTableTd, { width: col.width, minWidth: col.width }]}>
                                            {col.key === "size" ? (
                                                <TouchableOpacity
                                                    style={[dt.sizeTableInput, { justifyContent: "center" }]}
                                                    onPress={() => setChartSizePickRowId(row.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={{ fontFamily: "Outfit_400Regular", fontSize: 12, color: row.size ? C.textDark : C.textPlaceholder }}
                                                        numberOfLines={1}
                                                    >
                                                        {row.size || "Select"}
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <TextInput
                                                    style={dt.sizeTableInput}
                                                    placeholder={col.placeholder}
                                                    placeholderTextColor={C.textPlaceholder}
                                                    value={row[col.key]}
                                                    onChangeText={(v) => updateChartRow(row.id, col.key, v)}
                                                />
                                            )}
                                        </View>
                                    ))}
                                    <View style={dt.sizeTableTdAction}>
                                        <TouchableOpacity style={dt.sizeTableDelBtn} onPress={() => removeChartRow(row.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={18} color={C.red} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                ) : (
                    <View style={dt.sizeEmptyHint}>
                        <Text style={dt.sizeEmptyHintTxt}>Use Add Size to add rows and enter measurements for each size.</Text>
                    </View>
                )}
                <Lbl text="Measurement Unit" />
                <Drop placeholder="Select unit" value={chartUnit} onPress={() => { setChartCatPick(false); setChartSubPick(false); setChartUnitPick(true); }} />
                <Lbl text="Additional Notes" />
                <Field placeholder="e.g. All measurements are approximate." value={chartNotes} onChangeText={setChartNotes} multiline lines={3} maxLength={500} />
                <CC cur={chartNotes.length} max={500} />
                <View style={[fp.footerRow, isDesktop && fp.footerRowDesktop]}>
                    <TouchableOpacity style={[fp.footerBtnSecondary, !isDesktop && fp.footerBtnPrimaryFull]} onPress={() => setCreateSizeOpen(false)}>
                        <Text style={fp.footerBtnTxtSecondary}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[fp.footerBtnPrimary, fp.footerBtnAccent, !isDesktop && fp.footerBtnPrimaryFull, savingChart && { opacity: 0.6 }]}
                        onPress={saveSizeChart}
                        disabled={savingChart}
                    >
                        <Text style={fp.footerBtnTxtPrimary}>{savingChart ? "Saving…" : "Save Chart"}</Text>
                    </TouchableOpacity>
                </View>
            </FormPopupModal>

            <Modal visible={addChartSizeOpen} transparent animationType="fade" onRequestClose={() => setAddChartSizeOpen(false)}>
                <View style={vt.sizeModalOverlay}>
                    <View style={vt.sizeModalCard}>
                        <Text style={vt.sizeModalTitle}>Add New Size</Text>
                        <Text style={vt.sizeModalSub}>Saved only for your seller account.</Text>
                        <Lbl text="Size Name" required />
                        <Field placeholder="e.g. Extra Large" value={newChartSizeName} onChangeText={setNewChartSizeName} />
                        <Lbl text="Size Code" required />
                        <Field placeholder="e.g. XL" value={newChartSizeCode} onChangeText={setNewChartSizeCode} autoCapitalize="characters" />
                        <View style={vt.sizeModalActions}>
                            <TouchableOpacity style={vt.sizeModalCancel} onPress={() => setAddChartSizeOpen(false)} disabled={savingChartSize}>
                                <Text style={vt.sizeModalCancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[vt.sizeModalSave, savingChartSize && { opacity: 0.6 }]}
                                onPress={handleCreateChartSize}
                                disabled={savingChartSize}
                            >
                                {savingChartSize ? <ActivityIndicator color={C.white} size="small" /> : <Text style={vt.sizeModalSaveTxt}>Save Size</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <FormPopupModal visible={customPolicyOpen} onClose={() => setCustomPolicyOpen(false)} title="Write Custom Return Policy">
                <Hint text="Describe your return rules clearly. This will appear to buyers on the product page." />
                <Lbl text="Custom Policy Details" required />
                <Field placeholder="e.g. Returns accepted within 7 days in original packaging…" value={customPolicyDraft} onChangeText={setCustomPolicyDraft} multiline lines={8} maxLength={1000} />
                <CC cur={customPolicyDraft.length} max={1000} />
                <View style={[fp.footerRow, isDesktop && fp.footerRowDesktop]}>
                    <TouchableOpacity style={[fp.footerBtnSecondary, !isDesktop && fp.footerBtnPrimaryFull]} onPress={() => setCustomPolicyOpen(false)}>
                        <Text style={fp.footerBtnTxtSecondary}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[fp.footerBtnPrimary, !isDesktop && fp.footerBtnPrimaryFull]} onPress={saveCustomPolicy}>
                        <Text style={fp.footerBtnTxtPrimary}>Save Policy</Text>
                    </TouchableOpacity>
                </View>
            </FormPopupModal>
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

const StepProgressBar = ({ step, maxUnlocked, onTabPress, isDesktop = false }: {
    step: number; maxUnlocked: number; onTabPress: (i: number) => void; isDesktop?: boolean;
}) => {
    const [barW, setBarW] = useState(SW);
    const colW = barW / N_STEPS;

    return (
        <View style={[spp.wrapper, isDesktop && ds.hStepBar]} onLayout={e => setBarW(e.nativeEvent.layout.width)}>
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
                        <Text style={[spp.lbl, isDesktop && spp.lblDesktop, isActive && { color: s.color, fontFamily: "Outfit_700Bold" }, isDone && { color: s.color, fontFamily: "Outfit_600SemiBold" }]}>
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
    lblDesktop: { fontSize: 12 },
});

// ─────────────────────────────────────────────────────────────
// DISCARD CONFIRM MODAL
// ─────────────────────────────────────────────────────────────
const DiscardModal = ({ visible, onDiscard, onKeep }: { visible: boolean; onDiscard: () => void; onKeep: () => void }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeep}>
        <View style={dm.overlay}>
            <View style={dm.sheet}>
                <View style={dm.iconWrap}><MaterialCommunityIcons name="alert-circle-outline" size={36} color={C.amber} /></View>
                <Text style={dm.title}>Discard Changes?</Text>
                <Text style={dm.body}>You have unsaved edits. If you leave now, your changes will be lost.</Text>
                <TouchableOpacity style={dm.discardBtn} onPress={onDiscard}><Text style={dm.discardTxt}>Yes, Discard</Text></TouchableOpacity>
                <TouchableOpacity style={dm.keepBtn} onPress={onKeep}><Text style={dm.keepTxt}>Keep Editing</Text></TouchableOpacity>
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
// WEB SUCCESS POPUP  ← NEW
// ─────────────────────────────────────────────────────────────
const SuccessPopup = ({ visible, productId, onClose }: { visible: boolean; productId: string; onClose: () => void }) => {
    const scaleAnim = useRef(new Animated.Value(0.72)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0.72);
            opacityAnim.setValue(0);
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 8 }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={sp.overlay}>
                <Animated.View style={[sp.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
                    {/* Decorative top bar */}
                    <View style={sp.topBar} />

                    {/* Confetti dots row */}
                    <View style={sp.confettiRow}>
                        {[
                            { color: "#7C3AED", rot: "0deg" },
                            { color: "#0891B2", rot: "45deg" },
                            { color: "#059669", rot: "20deg" },
                            { color: "#D97706", rot: "70deg" },
                            { color: "#E53E3E", rot: "35deg" },
                            { color: "#1A2B6D", rot: "55deg" },
                            { color: "#C47D0E", rot: "15deg" },
                        ].map((dot, i) => (
                            <View key={i} style={[sp.confettiDot, { backgroundColor: dot.color, transform: [{ rotate: dot.rot }] }]} />
                        ))}
                    </View>

                    {/* Success icon */}
                    <View style={sp.iconWrap}>
                        <View style={sp.iconRingOuter}>
                            <View style={sp.iconRingInner}>
                                <MaterialCommunityIcons name="check-bold" size={38} color={C.white} />
                            </View>
                        </View>
                    </View>

                    {/* Text */}
                    <Text style={sp.title}>Product Updated!</Text>
                    <Text style={sp.subtitle}>
                        Your changes have been saved{"\n"}and are now live.
                    </Text>

                    {/* Divider */}
                    <View style={sp.divider} />

                    {/* Product info strip */}
                    <View style={sp.infoStrip}>
                        <View style={sp.infoIconBox}>
                            <MaterialCommunityIcons name="package-variant-closed" size={16} color={C.navyLight} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={sp.infoLabel}>Product ID</Text>
                            <Text style={sp.infoValue}>{productId || "—"}</Text>
                        </View>
                        <View style={sp.activePill}>
                            <View style={sp.activeDot} />
                            <Text style={sp.activePillTxt}>Active</Text>
                        </View>
                    </View>

                    {/* Timestamp */}
                    <View style={sp.timestampRow}>
                        <MaterialCommunityIcons name="clock-check-outline" size={12} color={C.textLight} />
                        <Text style={sp.timestampTxt}>
                            Updated just now · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                    </View>

                    {/* CTA Button */}
                    <TouchableOpacity style={sp.btn} onPress={onClose} activeOpacity={0.85}>
                        <MaterialCommunityIcons name="arrow-right-circle-outline" size={20} color={C.white} />
                        <Text style={sp.btnTxt}>Done</Text>
                    </TouchableOpacity>

                    {/* Secondary link */}
                    <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ marginTop: 12 }}>
                        <Text style={sp.secondaryLink}>Continue editing</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const sp = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(10,20,60,0.58)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: C.white,
        borderRadius: 28,
        paddingHorizontal: 28,
        paddingTop: 0,
        paddingBottom: 28,
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
        shadowColor: "#0F1A4A",
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.28,
        shadowRadius: 48,
        elevation: 32,
        overflow: "hidden",
    },
    topBar: {
        width: "100%",
        height: 6,
        backgroundColor: C.navy,
        marginBottom: 20,
    },
    confettiRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 22,
        justifyContent: "center",
        alignItems: "center",
    },
    confettiDot: {
        width: 9,
        height: 9,
        borderRadius: 3,
    },
    iconWrap: {
        marginBottom: 20,
    },
    iconRingOuter: {
        width: 96,
        height: 96,
        borderRadius: 24,
        backgroundColor: C.navyGhost,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: C.navyBorder,
    },
    iconRingInner: {
        width: 76,
        height: 76,
        borderRadius: 18,
        backgroundColor: C.navy,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: C.navy,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 18,
        elevation: 12,
    },
    title: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 26,
        color: C.textDark,
        marginBottom: 8,
        textAlign: "center",
        letterSpacing: -0.5,
    },
    subtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: 14.5,
        color: C.textMid,
        textAlign: "center",
        lineHeight: 22,
    },
    divider: {
        width: "100%",
        height: 1,
        backgroundColor: C.border,
        marginVertical: 20,
    },
    infoStrip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: C.navyGhost,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        width: "100%",
        borderWidth: 1,
        borderColor: C.navyBorder,
        marginBottom: 10,
    },
    infoIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: C.white,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: C.border,
    },
    infoLabel: {
        fontFamily: "Outfit_400Regular",
        fontSize: 10,
        color: C.textLight,
        marginBottom: 1,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    infoValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: 13,
        color: C.textDark,
    },
    activePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: C.greenPale,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: "#A3E9C8",
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: C.greenText,
    },
    activePillTxt: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 11,
        color: C.greenText,
    },
    timestampRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginBottom: 20,
    },
    timestampTxt: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: C.textLight,
    },
    btn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: C.navy,
        borderRadius: 14,
        paddingVertical: 15,
        width: "100%",
        shadowColor: C.navyDeep,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.32,
        shadowRadius: 14,
        elevation: 8,
    },
    btnTxt: {
        fontFamily: "Outfit_700Bold",
        fontSize: 15,
        color: C.white,
        letterSpacing: 0.2,
    },
    secondaryLink: {
        fontFamily: "Outfit_500Medium",
        fontSize: 13,
        color: C.textLight,
        textDecorationLine: "underline",
    },
});

// ─────────────────────────────────────────────────────────────
// MAIN EDIT SCREEN
// ─────────────────────────────────────────────────────────────
const EditProduct: React.FC = () => {
    const router = useRouter();
    const { id: productId } = useLocalSearchParams<{ id?: string }>();
    const { isDesktop } = useResponsive();
    const [step, setStep] = useState(0);
    const [maxUnlocked, setMaxUnlocked] = useState(3);
    const [basicErrors, setBasicErrors] = useState<string[]>([]);
    const [variantErrors, setVariantErrors] = useState<string[]>([]);
    const [imageErrors, setImageErrors] = useState<string[]>([]);
    const [detailErrors, setDetailErrors] = useState<string[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [discardModal, setDiscardModal] = useState(false);
    // ── NEW: web success popup state ──
    const [successPopup, setSuccessPopup] = useState(false);
    const [loadingProduct, setLoadingProduct] = useState(!!productId);
    const [saving, setSaving] = useState(false);
    const [validationTrigger, setValidationTrigger] = useState(0);
    const stepScrollRef = useRef<ScrollView>(null);

    const [basicData, setBasicData] = useState({ ...EMPTY_BASIC });
    const [variants, setVariants] = useState<Variant[]>([]);
    const [imagesData, setImagesData] = useState<{ primaryImage: string | null; additionalImages?: string[]; video?: string | null }>({
        primaryImage: null,
        additionalImages: [],
        video: null,
    });
    const [detailsData, setDetailsData] = useState({ ...EMPTY_DETAILS });
    const [catalog, setCatalog] = useState<ProductFormCatalog | null>(null);

    const { toasts, showErrors, showToast, removeToast } = useToast();

    useEffect(() => {
        if (!productId) {
            router.replace("/(main)/productmanagement");
        }
    }, [productId, router]);

    const reloadCatalog = useCallback(() => {
        fetchProductFormCatalog()
            .then(setCatalog)
            .catch(() => setCatalog(null));
    }, []);

    useEffect(() => {
        reloadCatalog();
    }, [reloadCatalog]);

    useFocusEffect(
        useCallback(() => {
            reloadCatalog();
        }, [reloadCatalog])
    );

    useEffect(() => {
        if (!productId) {
            return;
        }
        let cancelled = false;
        setLoadingProduct(true);
        fetchProductDetail(String(productId))
            .then((detail) => {
                if (cancelled) return;
                const mapped = mapProductDetailToEditForm(detail);
                setBasicData(mapped.basic);
                setVariants(mapped.variants);
                setImagesData(mapped.images);
                setDetailsData(mapped.details);
                setIsDirty(false);
            })
            .catch((err: unknown) => {
                const msg = err instanceof ApiError ? err.message : "Failed to load product.";
                showToast(msg, "error");
            })
            .finally(() => {
                if (!cancelled) setLoadingProduct(false);
            });
        return () => {
            cancelled = true;
        };
    }, [productId, showToast]);

    useEffect(() => {
        if (!catalog || !basicData.category) return;
        const middle = findCategorySubForProductSub(
            catalog,
            basicData.category,
            basicData.subcategoryId,
            basicData.subcategory
        );
        if (!middle.categorySubName) return;
        setBasicData((prev) => {
            if (prev.categorySubName === middle.categorySubName && prev.categorySubId === middle.categorySubId) {
                return prev;
            }
            return {
                ...prev,
                categorySubName: middle.categorySubName,
                categorySubId: middle.categorySubId,
            };
        });
    }, [catalog, basicData.category, basicData.subcategoryId, basicData.subcategory]);

    const [fontsLoaded] = useFonts({
        Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
    });

    useEffect(() => {
        const timer = setTimeout(() => scrollViewsToTop(stepScrollRef.current), 50);
        return () => clearTimeout(timer);
    }, [step]);

    if (!fontsLoaded) return null;

    if (!productId) {
        return null;
    }

    if (loadingProduct) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
                <ActivityIndicator size="large" color={C.navy} />
            </View>
        );
    }

    const markDirty = () => { if (!isDirty) setIsDirty(true); };

    const upBasic = (k: string, v: any) => {
        let cleanVal = v;
        if (["weight", "length", "width", "height"].includes(k)) {
            cleanVal = v.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
        }
        setBasicData((p) => {
            const next = { ...p, [k]: cleanVal };
            if (k === "weight") {
                const slab = resolveWeightSlab(cleanVal, catalog?.deliverySlabs);
                next.weightSlab = slab.label;
                next.customDeliveryCharge = !!slab.custom;
                if (slab.custom) {
                    next.intraCityCharge = "";
                    next.metroMetroCharge = "";
                } else {
                    next.intraCityCharge = String(slab.intraCityCharge);
                    next.metroMetroCharge = String(slab.metroMetroCharge);
                }
            }
            return next;
        });
        setBasicErrors(prev => prev.filter(e => !e.toLowerCase().includes(k.toLowerCase())));
        markDirty();
    };
    const upDetails = (k: string, v: any) => { setDetailsData(p => ({ ...p, [k]: v })); markDirty(); };
    const upImages = (next: { primaryImage: string | null; additionalImages: string[]; video?: string | null }) => {
        setImagesData(prev => ({ ...prev, ...next }));
        markDirty();
    };
    const rmVariant = (id: string) => { setVariants(p => p.filter(v => v.id !== id)); markDirty(); };

    const goBack = () => {
        if (Platform.OS === 'web') {
            router.replace("/(main)/productmanagement");
        } else {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace("/(main)/productmanagement");
            }
        }
    };

    const handleBackPress = () => {
        if (isDirty) { setDiscardModal(true); } else { goBack(); }
    };

    const handleTabPress = (i: number) => { setStep(i); };

    const handleContinue = () => {
        if (step === 0) {
            const errors = validateBasicInfo(basicData);
            setBasicErrors(errors);
            setValidationTrigger(prev => prev + 1);
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
        setTimeout(() => scrollViewsToTop(stepScrollRef.current), 50);
    };

    // ── UPDATED: shows web popup on web, toast on mobile ──
    const handleUpdate = async () => {
        if (!productId) {
            showToast("Product id is missing.", "error");
            return;
        }
        const basicErrs = validateBasicInfo(basicData);
        const variantErrs = validateVariants(variants);
        const imageErrs = validateImages(imagesData);
        const detailErrs = validateDetails(detailsData);
        const allErrors = [...basicErrs, ...variantErrs, ...imageErrs, ...detailErrs];
        if (allErrors.length > 0) {
            showErrors(allErrors);
            return;
        }
        setSaving(true);
        try {
            const payload = await buildUpdateProductPayload({
                basic: basicData,
                variants: variants.map((v) => ({ ...v, videoUrl: v.videoUrl ?? "" })),
                images: imagesData,
                details: detailsData,
            });
            await updateProduct(String(productId), payload);
            setIsDirty(false);
            if (Platform.OS === "web") {
                setSuccessPopup(true);
            } else {
                showToast("Product updated successfully!", "success");
                setTimeout(() => goBack(), 900);
            }
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.message : "Failed to update product.";
            showToast(msg, "error");
        } finally {
            setSaving(false);
        }
    };

    const leftAction =
        step === 0 ? (
            <TouchableOpacity style={isDesktop ? ds.cancelBtn : sc.cancelBtn} onPress={handleBackPress}>
                <Text style={isDesktop ? ds.cancelTxt : sc.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity style={isDesktop ? ds.prevBtn : sc.prevBtn} onPress={() => setStep((s) => s - 1)}>
                <Ionicons name="chevron-back" size={16} color={C.navy} />
                <Text style={isDesktop ? ds.prevTxt : sc.prevTxt}>Back</Text>
            </TouchableOpacity>
        );

    const rightAction =
        step === 3 ? (
            <TouchableOpacity
                style={[isDesktop ? ds.saveBtn : sc.saveBtn, !isDirty && sc.saveBtnDim]}
                onPress={handleUpdate}
                activeOpacity={isDirty && !saving ? 0.85 : 0.5}
                disabled={!isDirty || saving}
            >
                {saving ? (
                    <ActivityIndicator color={C.white} size="small" />
                ) : (
                    <MaterialCommunityIcons name="content-save-check-outline" size={18} color={C.white} />
                )}
                <Text style={isDesktop ? ds.saveTxt : sc.saveTxt}>
                    {saving ? "Saving…" : isDirty ? "Update Product" : "No Changes"}
                </Text>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity style={isDesktop ? ds.nextBtn : sc.nextBtn} onPress={handleContinue}>
                <Text style={isDesktop ? ds.nextTxt : sc.nextTxt}>Continue</Text>
                <Ionicons name="chevron-forward" size={16} color={C.white} />
            </TouchableOpacity>
        );

    const actionBar = (
        <View style={isDesktop ? ds.bar : sc.bar}>
            <View style={isDesktop ? ds.barLeft : sc.barLeft}>{leftAction}</View>
            <View style={isDesktop ? ds.barRight : sc.barRight}>{rightAction}</View>
        </View>
    );

    const stepContent = (
        <>
            {step === 0 && (
                <StepBasicInfo
                    data={basicData}
                    onChange={upBasic}
                    errors={basicErrors}
                    validationTrigger={validationTrigger}
                    catalog={catalog}
                    isDesktop={isDesktop}
                    scrollRef={stepScrollRef}
                />
            )}
            {step === 1 && (
                <StepVariants
                    variants={variants}
                    setVariants={(fn: any) => { setVariants(fn); markDirty(); }}
                    rmVariant={rmVariant}
                    errors={variantErrors}
                    catalog={catalog}
                    productName={basicData.name ?? ""}
                    isDesktop={isDesktop}
                    scrollRef={stepScrollRef}
                    reloadCatalog={reloadCatalog}
                />
            )}
            {step === 2 && (
                <StepImages
                    data={imagesData}
                    onChange={(k: string, v: any) => { setImagesData((p) => ({ ...p, [k]: v })); markDirty(); }}
                    onImagesChange={upImages}
                    errors={imageErrors}
                    isDesktop={isDesktop}
                    scrollRef={stepScrollRef}
                />
            )}
            {step === 3 && (
                <StepDetails
                    data={detailsData}
                    onChange={upDetails}
                    errors={detailErrors}
                    isDesktop={isDesktop}
                    scrollRef={stepScrollRef}
                    catalog={catalog}
                    reloadCatalog={reloadCatalog}
                />
            )}
        </>
    );

    if (isDesktop) {
        return (
            <View style={ds.page}>
                <StatusBar barStyle="dark-content" backgroundColor={C.white} />
                <View style={ds.topBar}>
                    <TouchableOpacity onPress={handleBackPress} style={ds.topBtn}>
                        <Ionicons name="arrow-back" size={22} color={C.navy} />
                    </TouchableOpacity>
                    <View style={ds.topCenter}>
                        <Text style={ds.topTitle}>Edit Product</Text>
                        <Text style={ds.topSub}>{STEPS[step]?.label} · Step {step + 1} of {STEPS.length}</Text>
                    </View>
                    <TouchableOpacity onPress={handleBackPress} style={ds.topBtn}>
                        {isDirty ? <View style={sc.dirtyDot} /> : <Ionicons name="close" size={22} color={C.textMid} />}
                    </TouchableOpacity>
                </View>
                {isDirty && (
                    <View style={sc.unsavedBanner}>
                        <MaterialCommunityIcons name="pencil-circle-outline" size={14} color={C.amber} />
                        <Text style={sc.unsavedTxt}>Unsaved changes · remember to update the product</Text>
                    </View>
                )}
                <StepProgressBar step={step} maxUnlocked={maxUnlocked} onTabPress={handleTabPress} isDesktop />
                <View style={ds.mainColumn}>
                    <View style={ds.mainScroll} key={`step-${step}`}>{stepContent}</View>
                    <View style={ds.barWrap}>{actionBar}</View>
                </View>
                <DiscardModal
                    visible={discardModal}
                    onDiscard={() => { setDiscardModal(false); goBack(); }}
                    onKeep={() => setDiscardModal(false)}
                />
                {/* ── Web Success Popup ── */}
                <SuccessPopup
                    visible={successPopup}
                    productId={String(basicData.id || productId || "")}
                    onClose={() => { setSuccessPopup(false); goBack(); }}
                />
                <ToastContainer toasts={toasts} onRemove={removeToast} />
            </View>
        );
    }

    // ── MOBILE ──
    return (
        <SafeAreaView style={sc.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />
            <View style={sc.header}>
                <TouchableOpacity onPress={handleBackPress} style={sc.hBtn}>
                    <Ionicons name="chevron-back" size={22} color={C.white} />
                </TouchableOpacity>
                <View style={sc.hCenter}>
                    <Text style={sc.hTitle}>Edit Product</Text>
                    <Text style={sc.hSub}>Step {step + 1} of {STEPS.length}</Text>
                </View>
                <TouchableOpacity onPress={handleBackPress} style={sc.hBtn}>
                    {isDirty ? <View style={sc.dirtyDot} /> : <Ionicons name="close" size={22} color={C.white} />}
                </TouchableOpacity>
            </View>
            {isDirty && (
                <View style={sc.unsavedBanner}>
                    <MaterialCommunityIcons name="pencil-circle-outline" size={14} color={C.amber} />
                    <Text style={sc.unsavedTxt}>Unsaved changes · remember to update the product</Text>
                </View>
            )}
            <StepProgressBar step={step} maxUnlocked={maxUnlocked} onTabPress={handleTabPress} />
            <View style={{ flex: 1, backgroundColor: C.bg }} key={`step-${step}`}>{stepContent}</View>
            {actionBar}
            <DiscardModal
                visible={discardModal}
                onDiscard={() => { setDiscardModal(false); goBack(); }}
                onKeep={() => setDiscardModal(false)}
            />
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
    fieldReadOnly: { backgroundColor: "#F8FAFC" },
    fieldInputReadOnly: { color: C.textMid },
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
    addSizeLink: { marginTop: 6, alignSelf: "flex-start" },
    addSizeLinkTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.navy },
    sizeModalOverlay: { flex: 1, backgroundColor: "rgba(30,40,90,0.35)", justifyContent: "center", alignItems: "center", padding: 20 },
    sizeModalCard: { width: "100%", maxWidth: 400, backgroundColor: C.white, borderRadius: 16, padding: 20 },
    sizeModalTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textDark },
    sizeModalSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textMid, marginBottom: 12, marginTop: 4 },
    sizeModalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
    sizeModalCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border },
    sizeModalCancelTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textMid },
    sizeModalSave: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: C.navy, minWidth: 100, alignItems: "center" },
    sizeModalSaveTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.white },
});

// ─── Details Styles ───────────────────────────────────────────
const dt = StyleSheet.create({
    responsiveCol: { flexDirection: "column", gap: 10 },
    responsiveField: { width: "100%", minWidth: 0 },
    outBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
        borderWidth: 1.2, borderColor: C.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, backgroundColor: C.white,
    },
    outBtnFull: { width: "100%", alignSelf: "stretch" },
    outBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.navy },
    sizeDataHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: 4 },
    addSizeOrangeBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.accent4, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
    addSizeOrangeBtnTxt: { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.white },
    sizeTableScroll: { marginTop: 8, marginBottom: 4 },
    sizeTableWrap: { borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: "hidden", backgroundColor: C.white },
    sizeTableHeader: { flexDirection: "row", backgroundColor: C.navyGhost, borderBottomWidth: 1, borderBottomColor: C.border },
    sizeTableTh: { paddingVertical: 10, paddingHorizontal: 6, justifyContent: "center", borderRightWidth: 1, borderRightColor: C.border },
    sizeTableThAction: { width: 56, minWidth: 56, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
    sizeTableThTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: C.textMid, textAlign: "center" },
    sizeTableRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white },
    sizeTableRowAlt: { backgroundColor: "#FAFBFE" },
    sizeTableTd: { padding: 5, borderRightWidth: 1, borderRightColor: C.border, justifyContent: "center" },
    sizeTableTdAction: { width: 56, minWidth: 56, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
    sizeTableInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 7, fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textDark, minHeight: 34 },
    sizeTableDelBtn: { padding: 6, borderRadius: 8, backgroundColor: C.redPale },
    sizeEmptyHint: { marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: C.navyGhost, borderWidth: 1, borderColor: C.navyBorder },
    sizeEmptyHintTxt: { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textMid, textAlign: "center", lineHeight: 18 },
    togRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
    togLbl: { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid },
    addBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
    addBtnTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: C.navy },
    specRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    specDel: { width: 36, height: 36, backgroundColor: C.redPale, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});

// ─── Desktop styles ───────────────────────────────────────────
const ds = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: C.bg,
        ...(Platform.OS === "web" ? ({ minHeight: "100vh" } as object) : {}),
    },
    topBar: {
        flexDirection: "row", alignItems: "center", backgroundColor: C.white,
        paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
        shadowColor: "#0F1A4A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
    },
    topBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.navyGhost },
    topCenter: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
    topTitle: { fontFamily: "Outfit_700Bold", fontSize: 20, color: C.textDark, letterSpacing: 0.2 },
    topSub: { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textLight, marginTop: 2 },
    hStepBar: { paddingTop: 12, paddingBottom: 14, maxWidth: CONTENT_MAX + 64, width: "100%", alignSelf: "center" },
    mainColumn: { flex: 1, minWidth: 0, width: "100%", backgroundColor: C.bg },
    mainScroll: { flex: 1 },
    stepScroll: { flex: 1 },
    barWrap: {
        backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border,
        paddingHorizontal: 32, paddingVertical: 16, width: "100%",
    },
    bar: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10,
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white,
        borderTopWidth: 1, borderTopColor: C.border,
    },
    barLeft: { flex: 1, alignItems: "flex-start" },
    barRight: { flex: 1, alignItems: "flex-end" },
    cancelBtn: {
        minWidth: 140, paddingHorizontal: 28, alignItems: "center", justifyContent: "center",
        borderWidth: 1.2, borderColor: C.border, borderRadius: 12, paddingVertical: 14, backgroundColor: C.white,
    },
    cancelTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid },
    prevBtn: {
        minWidth: 140, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 12, paddingVertical: 14, backgroundColor: C.white,
    },
    prevTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.navy },
    nextBtn: {
        minWidth: 180, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 14, elevation: 6,
    },
    nextTxt: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.white },
    saveBtn: {
        minWidth: 200, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 14, elevation: 6,
    },
    saveTxt: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.white },
    card: { borderRadius: 20, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 22, marginBottom: 20, shadowOpacity: 0.08, shadowRadius: 16 },
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
    header: {
        backgroundColor: C.navyDeep, flexDirection: "row", alignItems: "center",
        paddingHorizontal: 6, paddingVertical: 10,
        paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 10 : 10,
    },
    hBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
    hCenter: { flex: 1, alignItems: "center" },
    hTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, color: C.white },
    hSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },
    dirtyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.amber, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)" },
    unsavedBanner: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.amberPale, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#FCD34D" },
    unsavedTxt: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "#92400E" },
    bar: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10,
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white,
        borderTopWidth: 1, borderTopColor: C.border,
        shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
    },
    barLeft: { flex: 1 },
    barRight: { flex: 1, alignItems: "flex-end" },
    cancelBtn: {
        minWidth: 120, alignItems: "center", justifyContent: "center",
        borderWidth: 1.2, borderColor: C.border, borderRadius: 12,
        paddingVertical: 13, paddingHorizontal: 16, backgroundColor: C.white,
    },
    cancelTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid },
    prevBtn: {
        minWidth: 120, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
        borderWidth: 1.2, borderColor: C.navyBorder, borderRadius: 12,
        paddingVertical: 13, paddingHorizontal: 16, backgroundColor: C.white,
    },
    prevTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.navy },
    nextBtn: {
        minWidth: 140, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        backgroundColor: C.navy, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 20,
    },
    nextTxt: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.white },
    saveBtn: {
        minWidth: 160, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: C.navy, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 20,
    },
    saveTxt: { fontFamily: "Outfit_700Bold", fontSize: 14, color: C.white },
    saveBtnDim: { backgroundColor: C.navyLight, opacity: 0.6 },
});

export default EditProduct;