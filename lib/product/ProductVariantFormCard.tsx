import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    Modal,
    Alert,
    Platform,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";
import { useResponsive } from "@/hooks/useResponsive";
import { calcDiscountPercent } from "@/lib/product/pricing";
import { generateVariantSku } from "@/lib/product/generateVariantSku";
import { VariantPriceBreakdown } from "@/lib/product/VariantPriceBreakdown";
import { uniquePickerOptions } from "@/lib/product/uniquePickerOptions";
import {
    calculateVariantPricingFromStrings,
    formatInr,
    mapPricingPreviewToResult,
    resolveDeliveryCharges,
    resolveGstPercentFromCatalog,
    type DeliveryChargeInfo,
    type VariantPricingResult,
} from "@/lib/product/variantPricing";
import {
    fetchVariantPricingPreview,
    type ProductFormCatalog,
    type ProductDetailVariant,
    type VariantMutationPayload,
} from "@/services/productApi";
import { uriToImageSource } from "@/lib/media/imagePayload";

const C = {
    cardBg: "#FFFFFF",
    border: "#E8EBF4",
    textDark: "#0D1340",
    textMid: "#4B5680",
    textLight: "#9AA3C2",
    textPlaceholder: "#B8C0D9",
    inputBg: "#F8F9FD",
    navy: "#1A2B6D",
    navyLight: "#3D52A0",
    navyGhost: "#EEF1FA",
    navyBorder: "#C5CEE8",
    red: "#E53E3E",
    greenText: "#1A9B52",
    greenPale: "#EDFAF4",
    white: "#FFFFFF",
};

export type VariantFormState = {
    color: string;
    colorId?: number;
    size: string;
    sizeId?: number;
    sku: string;
    stock: string;
    minQuantity?: string;
    mrp: string;
    sellingPrice: string;
    discount: string;
    images: string[];
};

export type VariantFormContext = {
    productName: string;
    weight?: string;
    intraCityCharge?: number;
    metroMetroCharge?: number;
    customDeliveryCharge?: boolean;
    gstPercentage?: number;
    categorySubId?: number;
    subcategoryId?: number;
    category?: string;
    categorySubName?: string;
};

type Props = {
    index?: number;
    state: VariantFormState;
    onChange: (state: VariantFormState) => void;
    catalog: ProductFormCatalog | null;
    catalogLoading?: boolean;
    context: VariantFormContext;
    showHeader?: boolean;
    isB2B?: boolean;
};

function isLightHex(hex: string): boolean {
    const h = hex.replace("#", "").trim();
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return false;
    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}

function Lbl({ text, required, compact }: { text: string; required?: boolean; compact?: boolean }) {
    return (
        <AppText style={[s.lbl, compact && { marginTop: 0 }]}>
            {text}
            {required ? <AppText style={{ color: C.red }}> *</AppText> : null}
        </AppText>
    );
}

function Hint({ text }: { text: string }) {
    return <AppText style={s.hint}>{text}</AppText>;
}

function Divider() {
    return <View style={s.divider} />;
}

function Field({
    placeholder,
    value,
    onChangeText,
    keyboardType = "default",
    prefix,
    suffix,
    editable = true,
}: {
    placeholder: string;
    value: string;
    onChangeText?: (v: string) => void;
    keyboardType?: "default" | "numeric" | "decimal-pad";
    prefix?: string;
    suffix?: string;
    editable?: boolean;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <View style={[s.fieldWrap, focused && s.fieldFocused, !editable && s.fieldReadOnly]}>
            {prefix ? <AppText style={s.fieldPfx}>{prefix}</AppText> : null}
            <TextInput
                style={[s.fieldInput, !editable && s.fieldInputReadOnly]}
                placeholder={placeholder}
                placeholderTextColor={C.textPlaceholder}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                editable={editable}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            {suffix ? <AppText style={s.fieldSfx}>{suffix}</AppText> : null}
        </View>
    );
}

function ColorSelectField({
    placeholder,
    value,
    hex,
    onPress,
}: {
    placeholder: string;
    value: string;
    hex?: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity style={s.drop} onPress={onPress} activeOpacity={0.85}>
            {value && hex ? (
                <View style={s.colorSelectedRow}>
                    <View style={[s.colorDot, { backgroundColor: hex }, isLightHex(hex) && s.colorDotBorder]} />
                    <AppText style={s.dropText} numberOfLines={1}>{value}</AppText>
                </View>
            ) : (
                <AppText style={[s.dropText, s.dropPh]} numberOfLines={1}>{placeholder}</AppText>
            )}
            <Ionicons name="chevron-down" size={15} color={C.textLight} />
        </TouchableOpacity>
    );
}

function SizePickerModal({
    visible,
    options,
    selected,
    onSelect,
    onClose,
}: {
    visible: boolean;
    options: string[];
    selected: string;
    onSelect: (val: string) => void;
    onClose: () => void;
}) {
    const { isDesktop } = useResponsive();
    const items = uniquePickerOptions(options);
    return (
        <Modal visible={visible} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={onClose}>
            <View style={[pm.overlay, isDesktop && pm.overlayCenter]}>
                <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[pm.sheet, isDesktop && pm.popup]}>
                    {!isDesktop && <View style={pm.drag} />}
                    <View style={pm.hdr}>
                        <AppText style={pm.title}>Select Size</AppText>
                        <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
                            <Ionicons name="close" size={18} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={isDesktop} bounces={false}>
                        {items.map((opt, index) => (
                            <TouchableOpacity
                                key={`size-${index}-${opt}`}
                                style={[pm.item, selected === opt && pm.itemOn]}
                                onPress={() => { onSelect(opt); onClose(); }}
                            >
                                <AppText style={[pm.itemTxt, selected === opt && pm.itemTxtOn]}>{opt}</AppText>
                                {selected === opt ? (
                                    <View style={pm.chk}><Ionicons name="checkmark" size={13} color={C.white} /></View>
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

function ColorPickerModal({
    visible,
    colors,
    selected,
    onSelect,
    onClose,
}: {
    visible: boolean;
    colors: { id: number; name: string; hex: string }[];
    selected: string;
    onSelect: (color: { id: number; name: string; hex: string }) => void;
    onClose: () => void;
}) {
    const { isDesktop } = useResponsive();
    return (
        <Modal visible={visible} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={onClose}>
            <View style={[cpm.overlay, isDesktop && cpm.overlayCenter]}>
                <TouchableOpacity style={cpm.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[cpm.sheet, isDesktop && cpm.popup]}>
                    {!isDesktop && <View style={cpm.drag} />}
                    <View style={cpm.hdr}>
                        <AppText style={cpm.title}>Select Color</AppText>
                        <TouchableOpacity onPress={onClose} style={cpm.closeBtn}>
                            <Ionicons name="close" size={18} color={C.textMid} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={cpm.grid} showsVerticalScrollIndicator={false} bounces={false}>
                        {colors.map((color) => {
                            const isOn = selected === color.name;
                            return (
                                <TouchableOpacity
                                    key={color.id}
                                    style={[cpm.item, isOn && cpm.itemOn]}
                                    onPress={() => { onSelect(color); onClose(); }}
                                    activeOpacity={0.8}
                                >
                                    <View style={[cpm.circle, { backgroundColor: color.hex }, isLightHex(color.hex) && cpm.colorDotBorder, isOn && cpm.circleOn]}>
                                        {isOn ? (
                                            <Ionicons name="checkmark" size={18} color={isLightHex(color.hex) ? C.textDark : C.white} />
                                        ) : null}
                                    </View>
                                    <AppText style={[cpm.itemTxt, isOn && cpm.itemTxtOn]} numberOfLines={2}>{color.name}</AppText>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

function ImageSourcePickerModal({
    visible,
    onClose,
    onCamera,
    onGallery,
}: {
    visible: boolean;
    onClose: () => void;
    onCamera: () => void;
    onGallery: () => void;
}) {
    const { isDesktop } = useResponsive();
    return (
        <Modal visible={visible} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={onClose}>
            <View style={[isp.overlay, isDesktop && isp.overlayCenter]}>
                <TouchableOpacity style={isp.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[isp.sheet, isDesktop && isp.popup]}>
                    {!isDesktop && <View style={isp.drag} />}
                    <AppText style={isp.title}>Add Image</AppText>
                    <TouchableOpacity style={isp.option} onPress={onCamera} activeOpacity={0.85}>
                        <MaterialCommunityIcons name="camera-outline" size={22} color={C.navy} />
                        <AppText style={isp.optionTxt}>Take a Photo</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={isp.option} onPress={onGallery} activeOpacity={0.85}>
                        <MaterialCommunityIcons name="image-outline" size={22} color={C.navyLight} />
                        <AppText style={isp.optionTxt}>Choose from Gallery</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={isp.cancel} onPress={onClose}>
                        <AppText style={isp.cancelTxt}>Cancel</AppText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

function VariantImagePicker({
    images,
    onAdd,
    onRemove,
}: {
    images: string[];
    onAdd: (uris: string[]) => void;
    onRemove: (index: number) => void;
}) {
    const [srcModal, setSrcModal] = useState(false);

    const pickImages = async (source: "camera" | "gallery") => {
        setSrcModal(false);
        if (source === "camera") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Required", "Camera access is needed to take a photo.");
                return;
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.85,
            });
            if (!result.canceled && result.assets?.[0]?.uri) onAdd([result.assets[0].uri]);
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Required", "Gallery access is needed to pick photos.");
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: 0,
                quality: 0.85,
            });
            if (!result.canceled && result.assets?.length) {
                onAdd(result.assets.map((a) => a.uri));
            }
        }
    };

    return (
        <>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 6 }}
                style={{ marginTop: 10 }}
            >
                <TouchableOpacity style={ipg.addSlot} onPress={() => setSrcModal(true)} activeOpacity={0.75}>
                    <View style={ipg.addIcon}>
                        <MaterialCommunityIcons name="camera-plus-outline" size={22} color={C.navyLight} />
                    </View>
                    <AppText style={ipg.addTxt}>Add Photo</AppText>
                </TouchableOpacity>
                {images.map((uri, i) => (
                    <View key={`${uri}-${i}`} style={ipg.thumb}>
                        <Image source={{ uri }} style={ipg.thumbImg} resizeMode="cover" />
                        {i === 0 ? (
                            <View style={ipg.primaryBadge}>
                                <AppText style={ipg.primaryTxt}>Primary</AppText>
                            </View>
                        ) : null}
                        <TouchableOpacity style={ipg.removeBtn} onPress={() => onRemove(i)}>
                            <Ionicons name="close" size={11} color={C.white} />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
            {images.length > 0 ? (
                <AppText style={ipg.hint}>First image is used as primary · tap × to remove</AppText>
            ) : null}
            <ImageSourcePickerModal
                visible={srcModal}
                onClose={() => setSrcModal(false)}
                onCamera={() => pickImages("camera")}
                onGallery={() => pickImages("gallery")}
            />
        </>
    );
}

export function createEmptyVariantFormState(): VariantFormState {
    return {
        color: "",
        size: "",
        sku: "",
        stock: "",
        minQuantity: "",
        mrp: "",
        sellingPrice: "",
        discount: "0",
        images: [],
    };
}

export function ProductVariantFormCard({
    index = 1,
    state,
    onChange,
    catalog,
    catalogLoading = false,
    context,
    showHeader = true,
    isB2B = false,
}: Props) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showSizePicker, setShowSizePicker] = useState(false);
    const [pricingPreview, setPricingPreview] = useState<{
        pricing: VariantPricingResult;
        delivery: DeliveryChargeInfo;
        commissionPercent: number;
    } | null>(null);

    const catalogColors = catalog?.colors ?? [];
    const catalogSizes = catalog?.sizes ?? [];
    const sizeOptions = useMemo(
        () => catalogSizes.map((sz) => (sz.name === sz.code ? sz.name : `${sz.name} (${sz.code})`)),
        [catalogSizes],
    );
    const catalogReady = catalogColors.length > 0 && catalogSizes.length > 0;

    const weightKg = parseFloat(String(context.weight ?? "").trim());
    const hasWeight = Number.isFinite(weightKg) && weightKg > 0;

    const fallbackDelivery = resolveDeliveryCharges(
        {
            weight: context.weight,
            intraCityCharge: context.intraCityCharge != null ? String(context.intraCityCharge) : "",
            metroMetroCharge: context.metroMetroCharge != null ? String(context.metroMetroCharge) : "",
            customDeliveryCharge: context.customDeliveryCharge,
        },
        catalog?.deliverySlabs,
    );

    const productGstPercent = Number.isFinite(context.gstPercentage) && (context.gstPercentage ?? 0) >= 0
        ? (context.gstPercentage as number)
        : resolveGstPercentFromCatalog(catalog, {
            categorySubId: context.categorySubId,
            categorySubName: context.categorySubName,
            subcategoryId: context.subcategoryId,
            mainCategory: context.category,
        });

    const resolveSizeFromLabel = (val: string) =>
        catalogSizes.find(
            (sz) => sz.name === val || `${sz.name} (${sz.code})` === val || sz.code === val,
        );

    const resolveSizeCode = () =>
        catalogSizes.find((sz) => sz.id === state.sizeId || sz.name === state.size)?.code;

    const patch = (patchState: Partial<VariantFormState>) => {
        const next = { ...state, ...patchState };
        if (patchState.mrp != null || patchState.sellingPrice != null) {
            next.discount = calcDiscountPercent(next.mrp, next.sellingPrice);
        }
        if (
            (patchState.color != null || patchState.size != null || patchState.colorId != null || patchState.sizeId != null)
            && next.color
            && next.size
        ) {
            next.sku = generateVariantSku(context.productName, next.color, next.size, index, resolveSizeCode());
        }
        onChange(next);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!hasWeight) {
                setPricingPreview(null);
                return;
            }
            const mrpExcl = parseFloat(state.mrp);
            const sellingExcl = parseFloat(state.sellingPrice);
            if (!Number.isFinite(mrpExcl) || !Number.isFinite(sellingExcl) || mrpExcl <= 0 || sellingExcl <= 0) {
                setPricingPreview(null);
                return;
            }
            fetchVariantPricingPreview({
                mrpExcl,
                sellingExcl,
                weightKg,
                categorySubId: context.categorySubId ?? null,
                subcategoryId: context.subcategoryId ?? null,
                discountOverride: parseFloat(state.discount) || null,
                gstPercent: productGstPercent,
            })
                .then((preview) => {
                    setPricingPreview({
                        pricing: mapPricingPreviewToResult(preview),
                        delivery: preview.deliveryCustom
                            ? { intraCity: 0, metroMetro: 0, custom: true }
                            : {
                                intraCity: preview.intraCityCharge,
                                metroMetro: preview.metroMetroCharge,
                                custom: false,
                            },
                        commissionPercent: preview.commissionPercent,
                    });
                })
                .catch(() => setPricingPreview(null));
        }, 280);
        return () => clearTimeout(timer);
    }, [
        state.mrp,
        state.sellingPrice,
        state.discount,
        hasWeight,
        weightKg,
        context.categorySubId,
        context.subcategoryId,
        productGstPercent,
    ]);

    const localPricing =
        calculateVariantPricingFromStrings({
            mrp: state.mrp,
            sellingPrice: state.sellingPrice,
            gstPercent: productGstPercent,
            ...(fallbackDelivery.custom
                ? {}
                : {
                    intraCityCharge: fallbackDelivery.intraCity,
                    metroMetroCharge: fallbackDelivery.metroMetro,
                }),
            discountOverride: parseFloat(state.discount) || null,
        });

    if (catalogLoading) {
        return (
            <View style={s.loadingWrap}>
                <AppText style={s.loadingTxt}>Loading color and size catalog…</AppText>
            </View>
        );
    }

    if (!catalogReady) {
        return (
            <View style={s.loadingWrap}>
                <AppText style={s.loadingTxt}>
                    No colors or sizes in your catalog. Add them from product settings first.
                </AppText>
            </View>
        );
    }

    const selectedColorHex = catalogColors.find((c) => c.name === state.color)?.hex;

    return (
        <View style={s.card}>
            {showHeader ? (
                <>
                    <View style={s.hdr}>
                        <View style={s.badge}><AppText style={s.badgeTxt}>#{index}</AppText></View>
                        <AppText style={s.title}>Variant</AppText>
                    </View>
                    <Divider />
                </>
            ) : null}

            <View style={[s.row2, Platform.OS === "web" && { zIndex: 20 }]}>
                <View style={{ flex: 1 }}>
                    <Lbl text="Color" required />
                    <ColorSelectField
                        placeholder="Select color"
                        value={state.color}
                        {...(selectedColorHex ? { hex: selectedColorHex } : {})}
                        onPress={() => setShowColorPicker(true)}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Lbl text="Size" required />
                    <TouchableOpacity style={s.drop} onPress={() => setShowSizePicker(true)} activeOpacity={0.85}>
                        <AppText style={[s.dropText, !state.size && s.dropPh]} numberOfLines={1}>
                            {state.size || "Select size"}
                        </AppText>
                        <Ionicons name="chevron-down" size={15} color={C.textLight} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={s.row2}>
                <View style={{ flex: 1 }}>
                    <View style={s.lblRow}>
                        <Lbl text="SKU" compact />
                        <View style={s.auto}><AppText style={s.autoTxt}>Auto</AppText></View>
                    </View>
                    <Field placeholder="Auto-generated" value={state.sku} editable={false} />
                </View>
                <View style={{ flex: 1 }}>
                    <View style={s.lblRow}>
                        <Lbl text="Stock Qty" required compact />
                    </View>
                    <Field
                        placeholder="0"
                        value={state.stock}
                        onChangeText={(val) => patch({ stock: val })}
                        keyboardType="numeric"
                    />
                </View>
            </View>

            {isB2B ? (
                <View style={{ width: "50%" }}>
                    <Lbl text="Min Quantity" compact />
                    <Field
                        placeholder="1"
                        value={state.minQuantity ?? ""}
                        onChangeText={(val) => patch({ minQuantity: val })}
                        keyboardType="numeric"
                    />
                    <Hint text="Minimum units per B2B order" />
                </View>
            ) : null}

            <View style={s.row2}>
                <View style={{ flex: 1 }}>
                    <Lbl text="MRP (excl. GST)" required />
                    <Field
                        placeholder="0.00"
                        value={state.mrp}
                        onChangeText={(val) => patch({ mrp: val })}
                        keyboardType="decimal-pad"
                        prefix="₹"
                    />
                    <Hint text="Maximum Retail Price" />
                </View>
                <View style={{ flex: 1 }}>
                    <Lbl text="Selling Price" required />
                    <Field
                        placeholder="0.00"
                        value={state.sellingPrice}
                        onChangeText={(val) => patch({ sellingPrice: val })}
                        keyboardType="decimal-pad"
                        prefix="₹"
                    />
                    <Hint text="Your price excl. GST" />
                </View>
            </View>

            <View style={{ width: "50%" }}>
                <View style={s.lblRow}>
                    <Lbl text="Discount %" compact />
                    <View style={s.auto}><AppText style={s.autoTxt}>Auto</AppText></View>
                </View>
                <Field placeholder="0" value={state.discount} keyboardType="numeric" editable={false} suffix="%" />
                {state.mrp && state.sellingPrice && parseFloat(state.mrp) > parseFloat(state.sellingPrice) ? (
                    <AppText style={s.saveHint}>
                        Save {formatInr(parseFloat(state.mrp) - parseFloat(state.sellingPrice))} on MRP
                    </AppText>
                ) : null}
            </View>

            <VariantPriceBreakdown
                pricing={pricingPreview?.pricing ?? localPricing}
                delivery={pricingPreview?.delivery ?? fallbackDelivery}
                commissionPercent={pricingPreview?.commissionPercent}
                hasWeight={hasWeight}
            />

            <Divider />
            <Lbl text="Variant Images" required />
            <Hint text="Add as many images as you need · first image is used as primary" />
            <VariantImagePicker
                images={state.images}
                onAdd={(uris) => patch({ images: [...state.images, ...uris] })}
                onRemove={(i) => patch({ images: state.images.filter((_, idx) => idx !== i) })}
            />

            <ColorPickerModal
                visible={showColorPicker}
                colors={catalogColors}
                selected={state.color}
                onSelect={(color) => patch({ color: color.name, colorId: color.id })}
                onClose={() => setShowColorPicker(false)}
            />
            <SizePickerModal
                visible={showSizePicker}
                options={sizeOptions}
                selected={state.size}
                onSelect={(val) => {
                    const size = resolveSizeFromLabel(val);
                    patch({
                        size: size?.name ?? val,
                        ...(size?.id != null ? { sizeId: size.id } : {}),
                    });
                }}
                onClose={() => setShowSizePicker(false)}
            />
        </View>
    );
}

export function variantDetailToFormState(v: ProductDetailVariant): VariantFormState {
    return {
        color: v.color ?? "",
        size: v.size ?? "",
        sku: v.sku ?? "",
        stock: String(v.stock ?? ""),
        minQuantity: v.minQuantity != null ? String(v.minQuantity) : "",
        mrp: String(v.mrpExclGst || v.mrp || ""),
        sellingPrice: String(v.sellingPriceExGst || v.sellingPrice || ""),
        discount: String(v.discount ?? "0"),
        images: v.imageUri ? [v.imageUri] : [],
    };
}

export async function buildVariantMutationPayload(form: VariantFormState): Promise<VariantMutationPayload> {
    const variantImages: NonNullable<VariantMutationPayload["images"]> = [];
    for (let i = 0; i < form.images.length; i++) {
        const uri = form.images[i];
        if (!uri?.trim()) continue;
        variantImages.push({
            source: await uriToImageSource(uri),
            primary: i === 0,
            sortOrder: variantImages.length,
        });
    }

    const payload: VariantMutationPayload = {
        color: form.color,
        size: form.size,
        stock: parseInt(form.stock, 10) || 0,
        mrp: parseFloat(form.mrp) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        discount: parseFloat(form.discount) || undefined,
        images: variantImages,
    };
    if (form.colorId != null) payload.colorId = form.colorId;
    if (form.sizeId != null) payload.sizeId = form.sizeId;
    const sku = form.sku?.trim();
    if (sku) payload.sku = sku;
    const minQty = parseInt(form.minQuantity ?? "", 10);
    if (Number.isFinite(minQty) && minQty > 0) payload.minQuantity = minQty;
    return payload;
}

export function variantFormStateToPricing(
    state: VariantFormState,
    context: VariantFormContext,
    catalog: ProductFormCatalog | null,
    preview?: VariantPricingResult | null,
) {
    if (preview) return preview;
    const fallbackDelivery = resolveDeliveryCharges(
        {
            weight: context.weight,
            intraCityCharge: context.intraCityCharge != null ? String(context.intraCityCharge) : "",
            metroMetroCharge: context.metroMetroCharge != null ? String(context.metroMetroCharge) : "",
            customDeliveryCharge: context.customDeliveryCharge,
        },
        catalog?.deliverySlabs,
    );
    const gst = Number.isFinite(context.gstPercentage) && (context.gstPercentage ?? 0) >= 0
        ? (context.gstPercentage as number)
        : resolveGstPercentFromCatalog(catalog, {
            categorySubId: context.categorySubId,
            categorySubName: context.categorySubName,
            subcategoryId: context.subcategoryId,
            mainCategory: context.category,
        });
    return calculateVariantPricingFromStrings({
        mrp: state.mrp,
        sellingPrice: state.sellingPrice,
        gstPercent: gst,
        ...(fallbackDelivery.custom
            ? {}
            : {
                intraCityCharge: fallbackDelivery.intraCity,
                metroMetroCharge: fallbackDelivery.metroMetro,
            }),
        discountOverride: parseFloat(state.discount) || null,
    });
}

const s = StyleSheet.create({
    card: {
        backgroundColor: C.cardBg,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 18,
        borderWidth: 1,
        borderColor: C.border,
    },
    hdr: { flexDirection: "row", alignItems: "center", gap: 8 },
    badge: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    badgeTxt: { fontFamily: fontFamilies.bold, fontSize: 12, color: C.navy },
    title: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark, flex: 1 },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
    lbl: { fontFamily: fontFamilies.semiBold, fontSize: 12.5, color: C.textMid, marginBottom: 6, marginTop: 12 },
    hint: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 4 },
    lblRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 6 },
    auto: { backgroundColor: C.greenPale, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    autoTxt: { fontFamily: fontFamilies.semiBold, fontSize: 10, color: C.greenText },
    saveHint: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: C.greenText, marginTop: 4 },
    row2: { flexDirection: "row", gap: 10 },
    fieldWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
    fieldFocused: { borderColor: C.navy, backgroundColor: C.white },
    fieldReadOnly: { backgroundColor: "#F8FAFC" },
    fieldPfx: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid, marginRight: 6 },
    fieldSfx: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid, marginLeft: 6 },
    fieldInput: { flex: 1, fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, paddingVertical: 10 },
    fieldInputReadOnly: { color: C.textMid },
    drop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.inputBg, borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, minHeight: 44 },
    dropText: { fontFamily: fontFamilies.regular, fontSize: 13, color: C.textDark, flex: 1 },
    dropPh: { color: C.textPlaceholder },
    colorSelectedRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    colorDot: { width: 16, height: 16, borderRadius: 8 },
    colorDotBorder: { borderWidth: 1, borderColor: C.border },
    loadingWrap: { padding: 24, alignItems: "center" },
    loadingTxt: { fontFamily: fontFamilies.medium, fontSize: 13, color: C.textMid, textAlign: "center" },
});

const pm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(30,40,90,0.22)" },
    overlayCenter: { justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(10,20,60,0.35)" },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: { position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "70%", backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 24 },
    popup: { position: "relative", bottom: undefined, left: undefined, right: undefined, width: "100%", maxWidth: 360, maxHeight: "80%", borderRadius: 20, paddingBottom: 12 },
    drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 6 },
    hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    title: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F8F9FD", alignItems: "center", justifyContent: "center" },
    item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    itemOn: { backgroundColor: C.navyGhost },
    itemTxt: { fontFamily: fontFamilies.medium, fontSize: 14, color: C.textMid },
    itemTxtOn: { fontFamily: fontFamilies.semiBold, color: C.navy },
    chk: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
});

const cpm = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(30,40,90,0.22)" },
    overlayCenter: { justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(10,20,60,0.35)" },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: { position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "70%", backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 24 },
    popup: { position: "relative", bottom: undefined, width: "100%", maxWidth: 360, maxHeight: "80%", borderRadius: 20, paddingBottom: 12 },
    drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 6 },
    hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    title: { fontFamily: fontFamilies.bold, fontSize: 15, color: C.textDark },
    closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F8F9FD", alignItems: "center", justifyContent: "center" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 16, justifyContent: "center" },
    item: { width: 72, alignItems: "center", gap: 6, paddingVertical: 8, borderRadius: 12 },
    itemOn: { backgroundColor: C.navyGhost },
    circle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    circleOn: { borderWidth: 2, borderColor: C.navy },
    colorDotBorder: { borderWidth: 1, borderColor: C.border },
    itemTxt: { fontFamily: fontFamilies.medium, fontSize: 10, color: C.textMid, textAlign: "center" },
    itemTxtOn: { fontFamily: fontFamilies.semiBold, color: C.navy },
});

const isp = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(30,40,90,0.22)" },
    overlayCenter: { justifyContent: "center", alignItems: "center", padding: 24 },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28 },
    popup: { position: "relative", width: "100%", maxWidth: 360, borderRadius: 20, padding: 20 },
    drag: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 12 },
    title: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.textDark, marginBottom: 16 },
    option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    optionTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textDark },
    cancel: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
    cancelTxt: { fontFamily: fontFamilies.semiBold, fontSize: 14, color: C.textMid },
});

const ipg = StyleSheet.create({
    addSlot: { width: 90, height: 90, borderWidth: 1.5, borderColor: C.navyBorder, borderStyle: "dashed", borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: C.inputBg },
    addIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.navyGhost, alignItems: "center", justifyContent: "center" },
    addTxt: { fontFamily: fontFamilies.semiBold, fontSize: 10, color: C.navyLight, textAlign: "center" },
    thumb: { width: 90, height: 90, borderRadius: 14, overflow: "hidden", position: "relative" },
    thumbImg: { width: "100%", height: "100%" },
    primaryBadge: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(26,43,109,0.72)", paddingVertical: 3, alignItems: "center" },
    primaryTxt: { fontFamily: fontFamilies.semiBold, fontSize: 9, color: C.white, letterSpacing: 0.4 },
    removeBtn: { position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(200,30,30,0.85)", alignItems: "center", justifyContent: "center" },
    hint: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textLight, marginTop: 6 },
});
