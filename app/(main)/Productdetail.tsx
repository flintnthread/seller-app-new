import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, StatusBar, SafeAreaView, Platform,
  Modal, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  useFonts, Outfit_400Regular, Outfit_500Medium,
  Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    deleteProductVariant,
    fetchProductDetail,
    updateProductVariant,
    type ProductDetail,
    type ProductDetailVariant,
} from "@/services/productApi";
import { ApiError } from "@/lib/api/client";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";

const { width: SW } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// ─── Color Palette ────────────────────────────────────────────
const C = {
  navy: "#1E2B6B", navyDeep: "#151D4F", navyMid: "#1A2B5E", navyLight: "#2D3E8A",
  purple: "#6C63FF", purpleLight: "#A89CFF", purplePale: "#F0EEFF",
  green: "#22C55E", greenLight: "#86EFAC", greenPale: "#F0FDF4",
  red: "#EF4444", redLight: "#FCA5A5", redPale: "#FEF2F2",
  yellow: "#F59E0B", yellowPale: "#FFFBEB",
  blue: "#3B82F6", bluePale: "#EFF6FF",
  orange: "#F97316", orangePale: "#FFF7ED",
  teal: "#14B8A6", cyan: "#06B6D4",
  white: "#FFFFFF", bg: "#F7F8FC", card: "#FFFFFF",
  border: "#E5E7EB", textDark: "#111827", textMid: "#374151", textLight: "#9CA3AF",
};

type TabId = "overview" | "variants" | "specifications" | "delivery" | "return" | "sizechart";
type VariantViewMode = "grid" | "list" | "table";

interface Spec { label: string; value: string; }
interface DeliveryCharge { zone: string; standard: string; express: string; }

type Variant = ProductDetailVariant;

interface SizeChartEntry {
  size: string;
  chest: string;
  waist: string;
  hip: string;
  length: string;
}

type Product = ProductDetail;

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview",        label: "Overview",       icon: "information-outline"    },
  { id: "variants",        label: "Variants",       icon: "tune-variant"           },
  { id: "specifications",  label: "Specifications", icon: "clipboard-list-outline" },
  { id: "delivery",        label: "Delivery",       icon: "truck-outline"          },
  { id: "return",          label: "Returns",        icon: "refresh"                },
  { id: "sizechart",       label: "Size Chart",     icon: "ruler"                  },
];

function getStatusStyle(status: string) {
  if (status === "Active")   return { bg: C.greenPale,  color: C.green  };
  if (status === "Inactive") return { bg: C.yellowPale, color: C.yellow };
  return                            { bg: C.redPale,    color: C.red    };
}

// ─── Sub components ───────────────────────────────────────────
const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <View style={sub.sectionHeader}>
    <View style={sub.sectionIconWrap}>
      <MaterialCommunityIcons name={icon as any} size={16} color={C.navyLight} />
    </View>
    <Text style={sub.sectionTitle}>{title}</Text>
  </View>
);

const InfoRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({ label, value, valueColor }) => (
  <View style={sub.infoRow}>
    <Text style={sub.infoLabel}>{label}</Text>
    <Text style={[sub.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
  </View>
);

const SectionCard: React.FC<{ children: React.ReactNode; last?: boolean; webStyle?: any }> = ({ children, last = false, webStyle }) => (
  <View style={[sub.card, last && { marginBottom: 0 }, isWeb && webStyle]}>{children}</View>
);

// ─── COLOR & SIZE OPTION CONSTANTS ────────────────────────────
const COLOR_OPTIONS = ["Red","Blue","Green","Black","White","Yellow","Pink","Purple","Orange","Gray","Brown"];
const SIZE_OPTIONS  = ["XS","S","M","L","XL","XXL","Free Size","Standard","28","30","32","34","36","38","40","42","43"];
const COLOR_HEX: Record<string, string> = {
  Red:"#EF4444", Blue:"#3B82F6", Green:"#22C55E", Black:"#1F2937",
  White:"#F9FAFB", Yellow:"#F59E0B", Pink:"#EC4899", Purple:"#8B5CF6",
  Orange:"#F97316", Gray:"#6B7280", Brown:"#92400E",
};

// ─── SWEET ALERT COMPONENT ────────────────────────────────────
const SweetAlert: React.FC<{
  visible: boolean;
  type?: "success" | "error" | "warning";
  title: string;
  subtitle: string;
}> = ({ visible, type = "success", title, subtitle }) => {
  const iconName =
    type === "success" ? "check-bold" :
    type === "error"   ? "close-thick" :
                         "alert-outline";

  const iconBg =
    type === "success" ? C.green :
    type === "error"   ? C.red   :
                         C.yellow;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={sa.overlay} pointerEvents="none">
        <View style={sa.box}>
          <View style={[sa.iconCircle, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={iconName as any} size={34} color={C.white} />
          </View>
          <Text style={sa.title}>{title}</Text>
          <Text style={sa.subtitle}>{subtitle}</Text>
          <View style={[sa.progressBar, { backgroundColor: iconBg + "22" }]}>
            <View style={[sa.progressFill, { backgroundColor: iconBg }]} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const sa = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    backgroundColor: C.white,
    borderRadius: 24,
    paddingVertical: 34,
    paddingHorizontal: 32,
    alignItems: "center",
    width: 268,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 24,
  },
  iconCircle: {
    width: 78, height: 78, borderRadius: 39,
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 20, color: C.textDark,
    marginBottom: 6, textAlign: "center",
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13, color: C.textLight,
    textAlign: "center", lineHeight: 20,
    marginBottom: 20,
  },
  progressBar: {
    width: "100%", height: 4, borderRadius: 2, overflow: "hidden",
  },
  progressFill: {
    height: "100%", borderRadius: 2,
    width: "100%",
  },
});

// ─── SIZE CHART MODAL ─────────────────────────────────────────
const SizeChartModal: React.FC<{ visible: boolean; onClose: () => void; chart: SizeChartEntry[] }> = ({ visible, onClose, chart }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={sc.root}>
      <TouchableOpacity style={sc.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[sc.sheet, isWeb && sc.sheetWeb]}>
        <View style={sc.drag} />
        <View style={sc.header}>
          <View style={sc.headerLeft}>
            <View style={sc.headerIconWrap}>
              <MaterialCommunityIcons name="ruler" size={18} color={C.white} />
            </View>
            <Text style={sc.headerTitle}>Size Chart</Text>
          </View>
          <TouchableOpacity style={sc.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color={C.textMid} />
          </TouchableOpacity>
        </View>
        <Text style={sc.subtitle}>All measurements are in inches</Text>
        <View style={sc.tableHead}>
          {["Size","Chest","Waist","Hip","Length"].map((h, i) => (
            <View key={i} style={sc.headCell}>
              <Text style={sc.headTxt}>{h}</Text>
            </View>
          ))}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {chart.map((row, idx) => (
            <View key={row.size} style={[sc.tableRow, { backgroundColor: idx % 2 === 0 ? C.white : "#F8F9FD" }]}>
              <View style={sc.cell}><View style={sc.sizePill}><Text style={sc.sizePillTxt}>{row.size}</Text></View></View>
              <View style={sc.cell}><Text style={sc.cellTxt}>{row.chest}</Text></View>
              <View style={sc.cell}><Text style={sc.cellTxt}>{row.waist}</Text></View>
              <View style={sc.cell}><Text style={sc.cellTxt}>{row.hip}</Text></View>
              <View style={sc.cell}><Text style={sc.cellTxt}>{row.length}</Text></View>
            </View>
          ))}
        </ScrollView>
        <View style={sc.tipBox}>
          <MaterialCommunityIcons name="information-outline" size={14} color={C.blue} />
          <Text style={sc.tipTxt}>Measure yourself and compare with the chart for the best fit.</Text>
        </View>
        <TouchableOpacity style={sc.closeAction} onPress={onClose}>
          <Text style={sc.closeActionTxt}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const sc = StyleSheet.create({
  root:    { flex: 1, justifyContent: "flex-end" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.15)" },
  sheet:   { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "85%", paddingHorizontal: 20, paddingBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 28 },
  sheetWeb:{ borderRadius: 20, maxHeight: "80%", maxWidth: 560, width: "100%", alignSelf: "center", marginTop: "auto", marginBottom: "auto" } as any,
  drag:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 8 },
  headerLeft:    { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconWrap:{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
  headerTitle:   { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textDark },
  closeBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  subtitle:      { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginBottom: 12 },
  tableHead:     { flexDirection: "row", backgroundColor: C.navyDeep, borderRadius: 10, paddingVertical: 10, marginBottom: 4 },
  headCell:      { flex: 1, alignItems: "center" },
  headTxt:       { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.white },
  tableRow:      { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  cell:          { flex: 1, alignItems: "center", justifyContent: "center" },
  cellTxt:       { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textDark },
  sizePill:      { backgroundColor: C.purplePale, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
  sizePillTxt:   { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.purple },
  tipBox:        { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.bluePale, borderRadius: 10, padding: 12, marginTop: 14 },
  tipTxt:        { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textMid, flex: 1 },
  closeAction:   { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  closeActionTxt:{ fontFamily: "Outfit_700Bold", fontSize: 15, color: C.white },
});

// ─── EDIT VARIANT MODAL ───────────────────────────────────────
const EditVariantModal: React.FC<{
  visible: boolean;
  variant: Variant | null;
  onClose: () => void;
  onSave: (v: Variant) => void;
}> = ({ visible, variant, onClose, onSave }) => {
  const [color, setColor]           = useState(variant?.color ?? "");
  const [size, setSize]             = useState(variant?.size ?? "");
  const [stock, setStock]           = useState(String(variant?.stock ?? ""));
  const [mrp, setMrp]               = useState(String(variant?.mrp ?? ""));
  const [discount, setDiscount]     = useState(String(variant?.discount ?? ""));
  const [gst, setGst]               = useState(String(variant?.gstPercent ?? "5"));
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker,  setShowSizePicker]  = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  React.useEffect(() => {
    if (variant) {
      setColor(variant.color); setSize(variant.size);
      setStock(String(variant.stock)); setMrp(String(variant.mrp));
      setDiscount(String(variant.discount)); setGst(String(variant.gstPercent));
    }
  }, [variant]);

  const sellingPriceExGst = mrp && discount ? parseFloat(mrp) * (1 - parseFloat(discount) / 100) : 0;
  const gstAmount         = sellingPriceExGst * (parseFloat(gst || "0") / 100);
  const sellingWithGst    = sellingPriceExGst + gstAmount;
  const commission        = sellingWithGst * 0.15;
  const intraCity         = sellingWithGst + commission + (variant?.intraCityDelivery ?? 175);
  const metroMetro        = sellingWithGst + commission + (variant?.metroMetroDelivery ?? 205);

  const handleSave = () => {
    if (!color || !size || !stock || !mrp || !discount) {
      Alert.alert("Missing Fields", "Please fill all required fields.");
      return;
    }
    if (!variant) return;
    const mrpVal = parseFloat(mrp);
    const exGst = parseFloat(sellingPriceExGst.toFixed(2));
    const withGst = parseFloat(sellingWithGst.toFixed(2));
    onSave({
      ...variant,
      color, colorHex: COLOR_HEX[color] ?? variant.colorHex,
      size, stock: parseInt(stock),
      mrpExclGst: mrpVal,
      mrp: mrpVal,
      discount: parseFloat(discount),
      sellingPrice: exGst,
      sellingPriceExGst: exGst,
      finalPrice: withGst,
      sellingPriceWithGst: withGst,
      gstPercent: parseFloat(gst), gstAmount: parseFloat(gstAmount.toFixed(2)),
      commissionAmount: parseFloat(commission.toFixed(2)),
      totalIntraCity: parseFloat(intraCity.toFixed(2)),
      totalMetroMetro: parseFloat(metroMetro.toFixed(2)),
    });
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 2000);
  };

  const PickerSheet: React.FC<{
    options: string[];
    onSelect: (v: string) => void;
    onClose: () => void;
    withDot?: boolean;
  }> = ({ options, onSelect, onClose: closeSheet, withDot }) => (
    <Modal visible transparent animationType="slide" onRequestClose={closeSheet}>
      <View style={av.pickerRoot}>
        <TouchableOpacity style={av.pickerOverlay} activeOpacity={1} onPress={closeSheet} />
        <View style={av.pickerSheet}>
          <View style={av.pickerDrag} />
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {options.map(opt => (
              <TouchableOpacity key={opt} style={av.pickerItem} onPress={() => { onSelect(opt); closeSheet(); }}>
                {withDot && <View style={[av.colorDot, { backgroundColor: COLOR_HEX[opt] ?? "#9CA3AF", borderWidth: opt === "White" ? 1 : 0, borderColor: C.border }]} />}
                <Text style={av.pickerItemTxt}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={av.root}>
          <TouchableOpacity style={av.overlayTransparent} activeOpacity={1} onPress={onClose} />
          <View style={[av.sheet, isWeb && av.sheetWeb]}>
            <View style={av.drag} />
            <View style={av.header}>
              <View style={av.headerLeft}>
                <View style={[av.headerIconWrap, { backgroundColor: C.navy }]}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={C.white} />
                </View>
                <Text style={av.headerTitle}>Edit Variant</Text>
              </View>
              <TouchableOpacity style={av.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color={C.textMid} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={av.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={av.lbl}>Color <Text style={{ color: C.red }}>*</Text></Text>
                  <TouchableOpacity style={av.dropBtn} onPress={() => setShowColorPicker(true)}>
                    {color ? <View style={[av.colorDotSmall, { backgroundColor: COLOR_HEX[color] ?? "#9CA3AF" }]} /> : null}
                    <Text style={[av.dropTxt, !color && { color: C.textLight }]}>{color || "Select color"}</Text>
                    <Ionicons name="chevron-down" size={14} color={C.textLight} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={av.lbl}>Size <Text style={{ color: C.red }}>*</Text></Text>
                  <TouchableOpacity style={av.dropBtn} onPress={() => setShowSizePicker(true)}>
                    <Text style={[av.dropTxt, !size && { color: C.textLight }]}>{size || "Select size"}</Text>
                    <Ionicons name="chevron-down" size={14} color={C.textLight} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={av.lbl}>Stock Quantity <Text style={{ color: C.red }}>*</Text></Text>
              <TextInput style={av.input} placeholder="e.g. 15" placeholderTextColor={C.textLight} value={stock} onChangeText={setStock} keyboardType="numeric" />

              <View style={av.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={av.lbl}>MRP (Excl. GST) <Text style={{ color: C.red }}>*</Text></Text>
                  <View style={av.inputPrefix}>
                    <Text style={av.prefixTxt}>₹</Text>
                    <TextInput style={av.prefixInput} placeholder="0.00" placeholderTextColor={C.textLight} value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={av.lbl}>Discount (%) <Text style={{ color: C.red }}>*</Text></Text>
                  <View style={av.inputPrefix}>
                    <TextInput style={[av.prefixInput, { flex: 1 }]} placeholder="0" placeholderTextColor={C.textLight} value={discount} onChangeText={setDiscount} keyboardType="numeric" />
                    <Text style={av.suffixTxt}>%</Text>
                  </View>
                </View>
              </View>

              <Text style={av.lbl}>GST (%)</Text>
              <TextInput style={av.input} placeholder="5" placeholderTextColor={C.textLight} value={gst} onChangeText={setGst} keyboardType="numeric" />

              {mrp && discount && (
                <View style={av.calcBox}>
                  <Text style={av.calcTitle}>Live Calculations</Text>
                  <View style={av.calcGrid}>
                    <View style={av.calcItem}><Text style={av.calcLabel}>Selling Price (Excl. GST)</Text><Text style={av.calcValue}>₹{sellingPriceExGst.toFixed(2)}</Text></View>
                    <View style={av.calcItem}><Text style={av.calcLabel}>GST Amount ({gst}%)</Text><Text style={[av.calcValue, { color: C.orange }]}>+ ₹{gstAmount.toFixed(2)}</Text></View>
                    {/* FIX: navy instead of blue for selling price with GST */}
                    <View style={av.calcItem}><Text style={av.calcLabel}>Selling Price (With GST)</Text><Text style={[av.calcValue, { color: C.navy }]}>₹{sellingWithGst.toFixed(2)}</Text></View>
                    <View style={av.calcItem}><Text style={av.calcLabel}>Commission (15%)</Text><Text style={[av.calcValue, { color: C.red }]}>+ ₹{commission.toFixed(2)}</Text></View>
                    <View style={[av.calcItem, { backgroundColor: "#F0FDF4" }]}><Text style={av.calcLabel}>Total (Intra-City)</Text><Text style={[av.calcValue, { color: C.green, fontFamily: "Outfit_700Bold" }]}>₹{intraCity.toFixed(2)}</Text></View>
                    <View style={[av.calcItem, { backgroundColor: "#FFFBEB" }]}><Text style={av.calcLabel}>Total (Metro-Metro)</Text><Text style={[av.calcValue, { color: C.yellow, fontFamily: "Outfit_700Bold" }]}>₹{metroMetro.toFixed(2)}</Text></View>
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={[av.addBtn, { backgroundColor: C.navy }]} onPress={handleSave} activeOpacity={0.85}>
              <MaterialCommunityIcons name="content-save-outline" size={18} color={C.white} />
              <Text style={av.addBtnTxt}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showColorPicker && <PickerSheet options={COLOR_OPTIONS} onSelect={setColor} onClose={() => setShowColorPicker(false)} withDot />}
        {showSizePicker  && <PickerSheet options={SIZE_OPTIONS}  onSelect={setSize}  onClose={() => setShowSizePicker(false)}  />}
      </Modal>

      <SweetAlert
        visible={showSuccess}
        type="success"
        title="Changes Saved!"
        subtitle={`${color} · Size ${size} variant updated successfully.`}
      />
    </>
  );
};

// ─── ADD VARIANT MODAL ────────────────────────────────────────
const AddVariantModal: React.FC<{ visible: boolean; onClose: () => void; onAdd: (v: Variant) => void }> = ({ visible, onClose, onAdd }) => {
  const [color, setColor]       = useState("");
  const [size, setSize]         = useState("");
  const [stock, setStock]       = useState("");
  const [mrp, setMrp]           = useState("");
  const [discount, setDiscount] = useState("");
  const [gst, setGst]           = useState("5");
  const [imageUri, setImageUri] = useState("");
  const [videoUri, setVideoUri] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker,  setShowSizePicker]  = useState(false);

  const sellingPriceExGst = mrp && discount ? parseFloat(mrp) * (1 - parseFloat(discount) / 100) : 0;
  const gstAmount         = sellingPriceExGst * (parseFloat(gst || "0") / 100);
  const sellingWithGst    = sellingPriceExGst + gstAmount;
  const commission        = sellingWithGst * 0.15;
  const intraCity         = sellingWithGst + commission + 175;
  const metroMetro        = sellingWithGst + commission + 205;

  const handleAdd = () => {
    if (!color || !size || !stock || !mrp || !discount) {
      Alert.alert("Missing Fields", "Please fill all required fields.");
      return;
    }
    const sku = `${color.substring(0, 3).toUpperCase()}-${size.substring(0, 2).toUpperCase()}ST-${Math.floor(1000 + Math.random() * 9000)}`;
    const mrpVal = parseFloat(mrp);
    const disc = parseFloat(discount);
    const exGst = parseFloat(sellingPriceExGst.toFixed(2));
    const withGst = parseFloat(sellingWithGst.toFixed(2));
    onAdd({
      id: Date.now().toString(),
      productId: "",
      color,
      colorHex: COLOR_HEX[color] ?? "#9CA3AF",
      size,
      sku,
      stock: parseInt(stock),
      basePrice: mrpVal,
      mrpExclGst: mrpVal,
      mrpPrice: withGst,
      discountPercentage: disc,
      discountAmount: parseFloat((mrpVal - exGst).toFixed(2)),
      sellingPrice: exGst,
      taxPercentage: parseFloat(gst),
      taxAmount: parseFloat(gstAmount.toFixed(2)),
      finalPrice: withGst,
      mrpInclGst: withGst,
      intraCityDeliveryCharge: 175,
      metroMetroDeliveryCharge: 205,
      totalPriceIntraCity: parseFloat(intraCity.toFixed(2)),
      totalPriceMetroMetro: parseFloat(metroMetro.toFixed(2)),
      commissionPercentage: 15,
      commissionAmount: parseFloat(commission.toFixed(2)),
      videoPath: "",
      weight: 0,
      createdAt: "—",
      updatedAt: "—",
      mrp: mrpVal,
      discount: disc,
      sellingPriceExGst: exGst,
      gstPercent: parseFloat(gst),
      gstAmount: parseFloat(gstAmount.toFixed(2)),
      sellingPriceWithGst: withGst,
      commissionPercent: 15,
      intraCityDelivery: 175,
      metroMetroDelivery: 205,
      totalIntraCity: parseFloat(intraCity.toFixed(2)),
      totalMetroMetro: parseFloat(metroMetro.toFixed(2)),
      ...(imageUri ? { imageUri } : {}),
      ...(videoUri ? { videoUri } : {}),
    });
    setColor(""); setSize(""); setStock(""); setMrp(""); setDiscount(""); setGst("5");
    setImageUri(""); setVideoUri("");
    onClose();
  };

  const PickerSheet: React.FC<{ options: string[]; onSelect: (v: string) => void; onClose: () => void; withDot?: boolean }> = ({ options, onSelect, onClose: closeSheet, withDot }) => (
    <Modal visible transparent animationType="slide" onRequestClose={closeSheet}>
      <View style={av.pickerRoot}>
        <TouchableOpacity style={av.pickerOverlay} activeOpacity={1} onPress={closeSheet} />
        <View style={av.pickerSheet}>
          <View style={av.pickerDrag} />
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {options.map(opt => (
              <TouchableOpacity key={opt} style={av.pickerItem} onPress={() => { onSelect(opt); closeSheet(); }}>
                {withDot && <View style={[av.colorDot, { backgroundColor: COLOR_HEX[opt] ?? "#9CA3AF", borderWidth: opt === "White" ? 1 : 0, borderColor: C.border }]} />}
                <Text style={av.pickerItemTxt}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={av.root}>
        <TouchableOpacity style={av.overlayTransparent} activeOpacity={1} onPress={onClose} />
        <View style={[av.sheet, isWeb && av.sheetWeb]}>
          <View style={av.drag} />
          <View style={av.header}>
            <View style={av.headerLeft}>
              <View style={av.headerIconWrap}>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={C.white} />
              </View>
              <Text style={av.headerTitle}>Add New Variant</Text>
            </View>
            <TouchableOpacity style={av.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={C.textMid} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={av.row2}>
              <View style={{ flex: 1 }}>
                <Text style={av.lbl}>Color <Text style={{ color: C.red }}>*</Text></Text>
                <TouchableOpacity style={av.dropBtn} onPress={() => setShowColorPicker(true)}>
                  {color ? <View style={[av.colorDotSmall, { backgroundColor: COLOR_HEX[color] ?? "#9CA3AF" }]} /> : null}
                  <Text style={[av.dropTxt, !color && { color: C.textLight }]}>{color || "Select color"}</Text>
                  <Ionicons name="chevron-down" size={14} color={C.textLight} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={av.lbl}>Size <Text style={{ color: C.red }}>*</Text></Text>
                <TouchableOpacity style={av.dropBtn} onPress={() => setShowSizePicker(true)}>
                  <Text style={[av.dropTxt, !size && { color: C.textLight }]}>{size || "Select size"}</Text>
                  <Ionicons name="chevron-down" size={14} color={C.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={av.lbl}>Stock Quantity <Text style={{ color: C.red }}>*</Text></Text>
            <TextInput style={av.input} placeholder="e.g. 15" placeholderTextColor={C.textLight} value={stock} onChangeText={setStock} keyboardType="numeric" />

            <View style={av.row2}>
              <View style={{ flex: 1 }}>
                <Text style={av.lbl}>MRP (Excl. GST) <Text style={{ color: C.red }}>*</Text></Text>
                <View style={av.inputPrefix}>
                  <Text style={av.prefixTxt}>₹</Text>
                  <TextInput style={av.prefixInput} placeholder="0.00" placeholderTextColor={C.textLight} value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={av.lbl}>Discount (%) <Text style={{ color: C.red }}>*</Text></Text>
                <View style={av.inputPrefix}>
                  <TextInput style={[av.prefixInput, { flex: 1 }]} placeholder="0" placeholderTextColor={C.textLight} value={discount} onChangeText={setDiscount} keyboardType="numeric" />
                  <Text style={av.suffixTxt}>%</Text>
                </View>
              </View>
            </View>

            <Text style={av.lbl}>GST (%)</Text>
            <TextInput style={av.input} placeholder="5" placeholderTextColor={C.textLight} value={gst} onChangeText={setGst} keyboardType="numeric" />

            <View style={av.mediaSectionHeader}>
              <MaterialCommunityIcons name="image-multiple-outline" size={15} color={C.navyLight} />
              <Text style={av.mediaSectionTitle}>Media (Optional)</Text>
            </View>

            <Text style={av.lbl}>Variant Image URL</Text>
            <View style={av.inputPrefix}>
              <MaterialCommunityIcons name="image-outline" size={16} color={C.textLight} style={{ marginRight: 6 }} />
              <TextInput
                style={[av.prefixInput, { flex: 1 }]}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor={C.textLight}
                value={imageUri}
                onChangeText={setImageUri}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            {imageUri ? (
              <View style={av.mediaPreview}>
                <Image source={{ uri: imageUri }} style={av.mediaPreviewImg} resizeMode="cover" />
                <TouchableOpacity style={av.mediaRemoveBtn} onPress={() => setImageUri("")}>
                  <Ionicons name="close-circle" size={20} color={C.red} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={av.mediaPlaceholder}>
                <MaterialCommunityIcons name="image-plus" size={28} color={C.textLight} />
                <Text style={av.mediaPlaceholderTxt}>Image preview will appear here</Text>
              </View>
            )}

            <Text style={av.lbl}>Variant Video URL</Text>
            <View style={av.inputPrefix}>
              <MaterialCommunityIcons name="video-outline" size={16} color={C.textLight} style={{ marginRight: 6 }} />
              <TextInput
                style={[av.prefixInput, { flex: 1 }]}
                placeholder="https://example.com/video.mp4"
                placeholderTextColor={C.textLight}
                value={videoUri}
                onChangeText={setVideoUri}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            {videoUri ? (
              <View style={av.videoChip}>
                <MaterialCommunityIcons name="video-check-outline" size={16} color={C.green} />
                <Text style={av.videoChipTxt} numberOfLines={1}>{videoUri}</Text>
                <TouchableOpacity onPress={() => setVideoUri("")}>
                  <Ionicons name="close-circle" size={18} color={C.red} />
                </TouchableOpacity>
              </View>
            ) : null}

            {mrp && discount && (
              <View style={av.calcBox}>
                <Text style={av.calcTitle}>Live Calculations</Text>
                <View style={av.calcGrid}>
                  <View style={av.calcItem}>
                    <Text style={av.calcLabel}>Selling Price (Excl. GST)</Text>
                    <Text style={av.calcValue}>₹{sellingPriceExGst.toFixed(2)}</Text>
                  </View>
                  <View style={av.calcItem}>
                    <Text style={av.calcLabel}>GST Amount ({gst}%)</Text>
                    <Text style={[av.calcValue, { color: C.orange }]}>+ ₹{gstAmount.toFixed(2)}</Text>
                  </View>
                  {/* FIX: navy instead of blue */}
                  <View style={av.calcItem}>
                    <Text style={av.calcLabel}>Selling Price (With GST)</Text>
                    <Text style={[av.calcValue, { color: C.navy }]}>₹{sellingWithGst.toFixed(2)}</Text>
                  </View>
                  <View style={av.calcItem}>
                    <Text style={av.calcLabel}>Commission (15%)</Text>
                    <Text style={[av.calcValue, { color: C.red }]}>+ ₹{commission.toFixed(2)}</Text>
                  </View>
                  <View style={[av.calcItem, { backgroundColor: "#F0FDF4" }]}>
                    <Text style={av.calcLabel}>Total (Intra-City)</Text>
                    <Text style={[av.calcValue, { color: C.green, fontFamily: "Outfit_700Bold" }]}>₹{intraCity.toFixed(2)}</Text>
                  </View>
                  <View style={[av.calcItem, { backgroundColor: "#FFFBEB" }]}>
                    <Text style={av.calcLabel}>Total (Metro-Metro)</Text>
                    <Text style={[av.calcValue, { color: C.yellow, fontFamily: "Outfit_700Bold" }]}>₹{metroMetro.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={av.addBtn} onPress={handleAdd} activeOpacity={0.85}>
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color={C.white} />
            <Text style={av.addBtnTxt}>Add Variant</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showColorPicker && <PickerSheet options={COLOR_OPTIONS} onSelect={setColor} onClose={() => setShowColorPicker(false)} withDot />}
      {showSizePicker  && <PickerSheet options={SIZE_OPTIONS}  onSelect={setSize}  onClose={() => setShowSizePicker(false)}  />}
    </Modal>
  );
};

const av = StyleSheet.create({
  root:    { flex: 1, justifyContent: "flex-end" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,20,60,0.4)" },
  overlayTransparent: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "transparent" },
  sheet:   { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", paddingHorizontal: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 28 },
  sheetWeb:{ borderRadius: 20, maxHeight: "85%", maxWidth: 600, width: "100%", alignSelf: "center", marginTop: "auto", marginBottom: "auto" } as any,
  drag:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textDark },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  lbl:     { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textMid, marginBottom: 6, marginTop: 12 },
  row2:    { flexDirection: "row", gap: 10 },
  input:   { backgroundColor: "#F8F9FD", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark },
  dropBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F8F9FD", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  dropTxt: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark },
  inputPrefix: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8F9FD", borderWidth: 1.2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12 },
  prefixTxt:   { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid, marginRight: 4 },
  suffixTxt:   { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: C.textMid, marginLeft: 4 },
  prefixInput: { flex: 1, paddingVertical: 11, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark },
  colorDotSmall: { width: 12, height: 12, borderRadius: 6 },
  colorDot:  { width: 16, height: 16, borderRadius: 8 },
  mediaSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 4, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  mediaSectionTitle:  { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.navyLight },
  mediaPreview:       { marginTop: 10, borderRadius: 12, overflow: "hidden", position: "relative", height: 160, backgroundColor: C.bg },
  mediaPreviewImg:    { width: "100%", height: "100%" },
  mediaRemoveBtn:     { position: "absolute", top: 8, right: 8, backgroundColor: C.white, borderRadius: 12 },
  mediaPlaceholder:   { marginTop: 10, height: 100, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FAFBFF" },
  mediaPlaceholderTxt:{ fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight },
  videoChip:          { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.greenPale, borderRadius: 10, padding: 10, marginTop: 8 },
  videoChipTxt:       { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.green, flex: 1 },
  calcBox:   { marginTop: 16, backgroundColor: "#F8F9FD", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  calcTitle: { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.navyLight, marginBottom: 10 },
  calcGrid:  { gap: 6 },
  calcItem:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  calcLabel: { fontFamily: "Outfit_400Regular", fontSize: 11.5, color: C.textMid },
  calcValue: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textDark },
  addBtn:    { backgroundColor: C.navy, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, marginBottom: 16 },
  addBtnTxt: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.white },
  pickerRoot:    { flex: 1, justifyContent: "flex-end" },
  pickerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" },
  pickerSheet:   { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "55%", paddingBottom: 32 },
  pickerDrag:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  pickerItem:    { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  pickerItemTxt: { fontFamily: "Outfit_500Medium", fontSize: 14, color: C.textDark },
});

// ─── VARIANTS GRID VIEW ───────────────────────────────────────
const VariantsGrid: React.FC<{ variants: Variant[]; onDelete: (id: string) => void; onEdit: (v: Variant) => void }> = ({ variants, onDelete, onEdit }) => (
  <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: 10 }]}>
    {variants.map(v => (
      <View key={v.id} style={[vr.gridCard, isWeb && vr.gridCardWeb]}>
        {v.imageUri ? (
          <Image source={{ uri: v.imageUri }} style={vr.gridThumb} resizeMode="cover" />
        ) : null}
        <View style={vr.gridCardTop}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <View style={[vr.colorDot, { backgroundColor: v.colorHex, borderWidth: v.color === "White" ? 1 : 0, borderColor: C.border }]} />
            <Text style={vr.gridCardName}>{v.color}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {/* FIX: navy background for edit button */}
            <TouchableOpacity style={vr.gridEditBtn} onPress={() => onEdit(v)}>
              <MaterialCommunityIcons name="pencil-outline" size={13} color={C.navy} />
            </TouchableOpacity>
            <TouchableOpacity
              style={vr.gridDelBtn}
              onPress={() => Alert.alert("Delete Variant", `Remove ${v.color} - ${v.size}?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => onDelete(v.id) },
              ])}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={13} color={C.red} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={vr.gridSku}>{v.sku}</Text>
        {/* FIX: navy color for selling price */}
        <Text style={[vr.gridPrice, { color: C.navy }]}>₹{v.sellingPriceWithGst.toFixed(2)}</Text>
        <Text style={vr.gridMrp}>MRP Excl. GST ₹{v.mrpExclGst.toFixed(2)}</Text>
        <View style={vr.gridDivider} />
        <View style={vr.gridRow}><Text style={vr.gridRowLabel}>Stock</Text><Text style={vr.gridRowVal}>{v.stock} units</Text></View>
        <View style={vr.gridRow}><Text style={vr.gridRowLabel}>GST</Text><Text style={[vr.gridRowVal, { color: C.orange }]}>₹{v.gstAmount.toFixed(2)} ({v.gstPercent}%)</Text></View>
        <View style={vr.gridRow}><Text style={vr.gridRowLabel}>Commission</Text><Text style={[vr.gridRowVal, { color: C.red }]}>₹{v.commissionAmount.toFixed(2)}</Text></View>
        <View style={vr.gridDivider} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
          <View style={vr.sizePill}><Text style={vr.sizePillTxt}>{v.size}</Text></View>
          <View style={vr.discountPill}><Text style={vr.discountPillTxt}>{v.discount}% OFF</Text></View>
          {v.imageUri ? <View style={[vr.sizePill, { backgroundColor: C.bluePale }]}><MaterialCommunityIcons name="image-outline" size={11} color={C.blue} /></View> : null}
          {v.videoUri ? <View style={[vr.sizePill, { backgroundColor: C.greenPale }]}><MaterialCommunityIcons name="video-outline" size={11} color={C.green} /></View> : null}
        </View>
        <View style={[vr.gridTotalRow, { backgroundColor: "#F0FDF4", marginTop: 6 }]}>
          <Text style={[vr.gridRowLabel, { fontSize: 10 }]}>Intra-City</Text>
          <Text style={[vr.gridRowVal, { color: C.green, fontFamily: "Outfit_700Bold" }]}>₹{v.totalIntraCity.toFixed(2)}</Text>
        </View>
        <View style={[vr.gridTotalRow, { backgroundColor: "#FFFBEB" }]}>
          <Text style={[vr.gridRowLabel, { fontSize: 10 }]}>Metro-Metro</Text>
          <Text style={[vr.gridRowVal, { color: C.yellow, fontFamily: "Outfit_700Bold" }]}>₹{v.totalMetroMetro.toFixed(2)}</Text>
        </View>
      </View>
    ))}
  </View>
);

// ─── VARIANTS LIST VIEW ───────────────────────────────────────
const VariantsList: React.FC<{ variants: Variant[]; onDelete: (id: string) => void; onEdit: (v: Variant) => void }> = ({ variants, onDelete, onEdit }) => (
  <View style={{ gap: 8 }}>
    {variants.map(v => (
      <View key={v.id} style={vr.listCard}>
        <View style={vr.listCardTop}>
          {v.imageUri ? (
            <Image source={{ uri: v.imageUri }} style={vr.listThumb} resizeMode="cover" />
          ) : (
            <View style={[vr.colorDot, {
              backgroundColor: v.colorHex,
              width: 22, height: 22, borderRadius: 11,
              borderWidth: v.color === "White" ? 1 : 0, borderColor: C.border,
            }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={vr.listCardName}>{v.color} · {v.size}</Text>
            <Text style={vr.listCardSku}>{v.sku} · {v.stock} units</Text>
          </View>
          <View style={vr.discountPill}><Text style={vr.discountPillTxt}>{v.discount}% OFF</Text></View>
          {/* FIX: navy background for edit button */}
          <TouchableOpacity
            style={[vr.deleteBtn, { backgroundColor: C.navy, width: 30, height: 30 }]}
            onPress={() => onEdit(v)}
          >
            <MaterialCommunityIcons name="pencil-outline" size={14} color={C.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[vr.deleteBtn, { width: 30, height: 30 }]}
            onPress={() => Alert.alert("Delete Variant", `Remove ${v.color} - ${v.size}?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(v.id) },
            ])}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
          </TouchableOpacity>
        </View>
        <View style={vr.listPriceRow}>
          <View style={vr.listPriceTile}><Text style={vr.listPriceLabel}>MRP Excl. GST</Text><Text style={[vr.listPriceVal, { color: C.red }]}>₹{v.mrpExclGst.toFixed(2)}</Text></View>
          <View style={vr.listPriceTile}><Text style={vr.listPriceLabel}>Excl. GST</Text><Text style={vr.listPriceVal}>₹{v.sellingPriceExGst.toFixed(2)}</Text></View>
          <View style={vr.listPriceTile}><Text style={vr.listPriceLabel}>GST {v.gstPercent}%</Text><Text style={[vr.listPriceVal, { color: C.orange }]}>+₹{v.gstAmount.toFixed(2)}</Text></View>
          {/* FIX: navy instead of blue for selling price with GST */}
          <View style={vr.listPriceTile}><Text style={vr.listPriceLabel}>With GST</Text><Text style={[vr.listPriceVal, { color: C.navy, fontFamily: "Outfit_700Bold" }]}>₹{v.sellingPriceWithGst.toFixed(2)}</Text></View>
          <View style={[vr.listPriceTile, { backgroundColor: "#F0FDF4" }]}><Text style={vr.listPriceLabel}>Intra-City</Text><Text style={[vr.listPriceVal, { color: C.green, fontFamily: "Outfit_700Bold" }]}>₹{v.totalIntraCity.toFixed(2)}</Text></View>
          <View style={[vr.listPriceTile, { backgroundColor: "#FFFBEB" }]}><Text style={vr.listPriceLabel}>Metro</Text><Text style={[vr.listPriceVal, { color: C.yellow, fontFamily: "Outfit_700Bold" }]}>₹{v.totalMetroMetro.toFixed(2)}</Text></View>
        </View>
      </View>
    ))}
  </View>
);

// ─── VARIANTS TABLE VIEW ──────────────────────────────────────
const VariantsTable: React.FC<{ variants: Variant[]; onDelete: (id: string) => void; onEdit: (v: Variant) => void }> = ({ variants, onDelete, onEdit }) => (
  // FIX: remove negative marginHorizontal on web to eliminate the gap/space
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={!isWeb}
    showsVerticalScrollIndicator={false}
    style={isWeb ? { marginHorizontal: 0 } : { marginHorizontal: -14 }}
  >
    {/* FIX: use fixed 1100 width on web instead of SW+300 to prevent gap */}
    <View style={isWeb ? { minWidth: 1100 } : { minWidth: SW + 300 }}>
      <View style={vr.tableHead}>
        {["","Color","Size","SKU","Stock","MRP\n(Excl. GST)","Discount\n(%)","Selling Price\n(Excl. GST)","GST\n(%)","Selling Price\n(With GST)","Commission\n(% of SP w/ GST)","Intra-City\nDelivery","Metro-Metro\nDelivery","Total\n(Intra-City)","Total\n(Metro-Metro)","Actions"].map((col, i) => (
          <View key={i} style={[vr.headCell,
            i === 0 && { width: 44 },
            i === 1 && { width: 80 }, i === 2 && { width: 80 }, i === 3 && { width: 110 },
            i === 4 && { width: 70 }, (i >= 5 && i <= 14) && { width: 100 }, i === 15 && { width: 80 }]}>
            <Text style={vr.headTxt}>{col}</Text>
          </View>
        ))}
      </View>
      {variants.map((v, idx) => (
        <View key={v.id} style={[vr.tableRow, { backgroundColor: idx % 2 === 0 ? C.white : "#FAFBFF" }]}>
          <View style={[vr.cell, { width: 44, justifyContent: "center", gap: 4 }]}>
            {v.imageUri
              ? <Image source={{ uri: v.imageUri }} style={vr.tableThumb} resizeMode="cover" />
              : null
            }
            {v.videoUri ? <MaterialCommunityIcons name="video-outline" size={11} color={C.green} style={{ alignSelf: "center" }} /> : null}
          </View>
          <View style={[vr.cell, { width: 80 }]}>
            <View style={[vr.colorDot, { backgroundColor: v.colorHex, borderWidth: v.color === "White" ? 1 : 0, borderColor: C.border }]} />
            <Text style={vr.cellTxt}>{v.color}</Text>
          </View>
          <View style={[vr.cell, { width: 80 }]}><View style={vr.sizePill}><Text style={vr.sizePillTxt}>{v.size}</Text></View></View>
          <View style={[vr.cell, { width: 110 }]}><Text style={[vr.cellTxt, { fontSize: 10.5, color: C.textLight }]}>{v.sku}</Text></View>
          <View style={[vr.cell, { width: 70 }]}><View style={vr.stockPill}><Text style={vr.stockPillTxt}>{v.stock} units</Text></View></View>
          <View style={[vr.cell, { width: 100 }]}><Text style={[vr.cellTxt, { color: C.red, fontFamily: "Outfit_700Bold" }]}>₹{v.mrpExclGst.toFixed(2)}</Text></View>
          <View style={[vr.cell, { width: 100 }]}><View style={vr.discountPill}><Text style={vr.discountPillTxt}>{v.discount.toFixed(2)}% OFF</Text></View></View>
          <View style={[vr.cell, { width: 100 }]}><Text style={vr.cellTxt}>₹{v.sellingPriceExGst.toFixed(2)}</Text></View>
          <View style={[vr.cell, { width: 100 }]}><Text style={[vr.cellTxt, { color: C.orange }]}>+ ₹{v.gstAmount.toFixed(2)}</Text><Text style={vr.cellSub}>({v.gstPercent}%)</Text></View>
          {/* FIX: navy instead of blue for selling price with GST in table */}
          <View style={[vr.cell, { width: 100 }]}><Text style={[vr.cellTxt, { color: C.navy, fontFamily: "Outfit_700Bold" }]}>₹{v.sellingPriceWithGst.toFixed(2)}</Text></View>
          <View style={[vr.cell, { width: 100 }]}><Text style={[vr.cellTxt, { color: C.red }]}>+ ₹{v.commissionAmount.toFixed(2)}</Text><Text style={vr.cellSub}>({v.commissionPercent}%)</Text></View>
          <View style={[vr.cell, { width: 100 }]}><Text style={vr.cellTxt}>+ ₹{v.intraCityDelivery.toFixed(2)}</Text></View>
          <View style={[vr.cell, { width: 100 }]}><Text style={vr.cellTxt}>+ ₹{v.metroMetroDelivery.toFixed(2)}</Text></View>
          <View style={[vr.cell, { width: 100, backgroundColor: "#F0FDF4" }]}><Text style={[vr.cellTxt, { color: C.green, fontFamily: "Outfit_700Bold" }]}>₹{v.totalIntraCity.toFixed(2)}</Text></View>
          <View style={[vr.cell, { width: 100, backgroundColor: "#FFFBEB" }]}><Text style={[vr.cellTxt, { color: C.yellow, fontFamily: "Outfit_700Bold" }]}>₹{v.totalMetroMetro.toFixed(2)}</Text></View>
          <View style={[vr.cell, { width: 80, flexDirection: "row", justifyContent: "center", gap: 6 }]}>
            {/* FIX: navy background for edit button in table */}
            <TouchableOpacity style={[vr.deleteBtn, { backgroundColor: C.navy }]} onPress={() => onEdit(v)}>
              <MaterialCommunityIcons name="pencil-outline" size={14} color={C.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={vr.deleteBtn}
              onPress={() => Alert.alert("Delete Variant", `Remove ${v.color} - ${v.size}?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => onDelete(v.id) },
              ])}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.white} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  </ScrollView>
);

// ─── VARIANTS TAB ─────────────────────────────────────────────
const VariantsTab: React.FC<{
  variants: Variant[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (v: Variant) => void;
}> = ({ variants, onAdd, onDelete, onEdit }) => {
  const [viewMode, setViewMode] = useState<VariantViewMode>("table");

  return (
    <>
      {variants.length > 0 && (
        <View style={vr.summary}>
          <View style={vr.summaryItem}>
            <Text style={vr.summaryLabel}>Total Variants</Text>
            <Text style={[vr.summaryValue, { color: C.navy }]}>{variants.length}</Text>
          </View>
          <View style={vr.summaryDivider} />
          <View style={vr.summaryItem}>
            <Text style={vr.summaryLabel}>Total Stock</Text>
            <Text style={[vr.summaryValue, { color: C.green }]}>{variants.reduce((a, v) => a + v.stock, 0)} units</Text>
          </View>
          <View style={vr.summaryDivider} />
          <View style={vr.summaryItem}>
            <Text style={vr.summaryLabel}>Avg. Selling Price</Text>
            {/* FIX: navy instead of blue for average selling price */}
            <Text style={[vr.summaryValue, { color: C.navy }]}>
              ₹{(variants.reduce((a, v) => a + v.sellingPriceWithGst, 0) / variants.length).toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      <View style={vr.headerRow}>
        <View style={vr.headerLeft}>
          <MaterialCommunityIcons name="menu" size={16} color={C.navyLight} />
          <Text style={vr.headerTitle}>Product Variants ({variants.length})</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={vr.viewToggle}>
            <TouchableOpacity
              style={[vr.toggleBtn, viewMode === "grid" && vr.toggleBtnActive]}
              onPress={() => setViewMode("grid")}
            >
              <MaterialCommunityIcons name="view-grid-outline" size={14} color={viewMode === "grid" ? C.white : C.textMid} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[vr.toggleBtn, viewMode === "list" && vr.toggleBtnActive]}
              onPress={() => setViewMode("list")}
            >
              <MaterialCommunityIcons name="view-list-outline" size={14} color={viewMode === "list" ? C.white : C.textMid} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[vr.toggleBtn, viewMode === "table" && vr.toggleBtnActive, { borderRightWidth: 0 }]}
              onPress={() => setViewMode("table")}
            >
              <MaterialCommunityIcons name="table" size={14} color={viewMode === "table" ? C.white : C.textMid} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={vr.addBtn} onPress={onAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={15} color={C.white} />
            <Text style={vr.addBtnTxt}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {variants.length === 0 ? (
        <View style={vr.emptyBox}>
          <MaterialCommunityIcons name="tune-variant" size={40} color={C.textLight} />
          <Text style={vr.emptyTitle}>No Variants Yet</Text>
          <Text style={vr.emptySub}>Tap "Add" to create the first variant</Text>
        </View>
      ) : viewMode === "grid" ? (
        <VariantsGrid variants={variants} onDelete={onDelete} onEdit={onEdit} />
      ) : viewMode === "list" ? (
        <VariantsList variants={variants} onDelete={onDelete} onEdit={onEdit} />
      ) : (
        <VariantsTable variants={variants} onDelete={onDelete} onEdit={onEdit} />
      )}
    </>
  );
};

const vr = StyleSheet.create({
  headerRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, marginTop: 0 },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.textDark },
  addBtn:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnTxt:   { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.white },
  viewToggle:      { flexDirection: "row", borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  toggleBtn:       { paddingVertical: 7, paddingHorizontal: 10, backgroundColor: C.white, borderRightWidth: 1, borderRightColor: C.border },
  toggleBtnActive: { backgroundColor: C.navy },
  emptyBox:   { alignItems: "center", paddingVertical: 40, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.border, gap: 8 },
  emptyTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.textMid },
  emptySub:   { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight },
  gridCard:     { width: (SW - 42) / 2, backgroundColor: C.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  gridCardWeb:  { width: "calc(25% - 8px)" } as any,
  gridThumb:    { width: "100%", height: 80, borderRadius: 8, marginBottom: 8 },
  gridCardTop:  { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  gridCardName: { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.textDark },
  gridSku:      { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.textLight, marginBottom: 8 },
  // FIX: base color removed (overridden inline with C.navy)
  gridPrice:    { fontFamily: "Outfit_800ExtraBold", fontSize: 16 },
  gridMrp:      { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, textDecorationLine: "line-through", marginBottom: 4 },
  gridDivider:  { borderTopWidth: 1, borderTopColor: "#F3F4F6", marginVertical: 6 },
  gridRow:      { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  gridRowLabel: { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight },
  gridRowVal:   { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.textDark },
  gridTotalRow: { flexDirection: "row", justifyContent: "space-between", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, marginTop: 2 },
  gridDelBtn:   { width: 24, height: 24, borderRadius: 6, backgroundColor: C.redPale, alignItems: "center", justifyContent: "center" },
  // FIX: navy pale background for edit button in grid
  gridEditBtn:  { width: 24, height: 24, borderRadius: 6, backgroundColor: "#EEF1FF", alignItems: "center", justifyContent: "center" },
  listCard:      { backgroundColor: C.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  listCardTop:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  listThumb:     { width: 36, height: 36, borderRadius: 8 },
  listCardName:  { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.textDark },
  listCardSku:   { fontFamily: "Outfit_400Regular", fontSize: 10.5, color: C.textLight },
  listPriceRow:  { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  listPriceTile: { backgroundColor: C.bg, borderRadius: 8, padding: 7, minWidth: 80, flex: 1 },
  listPriceLabel:{ fontFamily: "Outfit_400Regular", fontSize: 10, color: C.textLight, marginBottom: 2 },
  listPriceVal:  { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textDark },
  tableHead:  { flexDirection: "row", backgroundColor: "#FFF7ED", borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#FED7AA" },
  headCell:   { paddingHorizontal: 8, justifyContent: "center" },
  headTxt:    { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: C.textMid, lineHeight: 15 },
  tableRow:   { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingVertical: 12 },
  cell:       { paddingHorizontal: 8, justifyContent: "center", gap: 2 },
  cellTxt:    { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textDark },
  cellSub:    { fontFamily: "Outfit_400Regular", fontSize: 10, color: C.textLight },
  tableThumb: { width: 28, height: 28, borderRadius: 6, alignSelf: "center" },
  colorDot:        { width: 14, height: 14, borderRadius: 7 },
  sizePill:        { backgroundColor: "#EEF1FF", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  sizePillTxt:     { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.navy },
  stockPill:       { backgroundColor: C.greenPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  stockPillTxt:    { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.green },
  discountPill:    { backgroundColor: C.greenPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  discountPillTxt: { fontFamily: "Outfit_700Bold", fontSize: 10.5, color: "#16A34A" },
  deleteBtn:       { width: 32, height: 32, borderRadius: 8, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
  summary:         { flexDirection: "row", backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12, justifyContent: "space-around" },
  summaryItem:     { alignItems: "center", gap: 4 },
  summaryLabel:    { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight },
  summaryValue:    { fontFamily: "Outfit_800ExtraBold", fontSize: 16 },
  summaryDivider:  { width: 1, backgroundColor: C.border },
});

// ─── Overview Tab ─────────────────────────────────────────────
const OverviewTab: React.FC<{ p: Product }> = ({ p }) => {
  if (isWeb) {
    return (
      <View style={wt.twoColGrid}>
        <View style={[wt.fullWidthCard]}>
          <SectionHeader icon="text-box-outline" title="Full Description" />
          <Text style={sub.descText}>{p.description}</Text>
        </View>
        <View style={wt.halfCard}>
          <SectionHeader icon="tag-multiple-outline" title="Classification" />
          <InfoRow label="Category"    value={p.category}    />
          <InfoRow label="Subcategory" value={p.subcategory} />
          <InfoRow label="Color"       value={p.color}       />
          <InfoRow label="Size"        value={p.size}        />
          <InfoRow label="HSN Code"    value={p.hsnCode}     />
          <InfoRow label="GST"         value={p.gst} valueColor={C.orange} />
          <InfoRow label="Material"    value={p.material}    />
          <InfoRow label="Return"      value={p.returnPolicy} />
          <InfoRow label="Warranty"    value={p.warranty}    />
          {p.careInstructions !== "—" ? <InfoRow label="Care" value={p.careInstructions} /> : null}
        </View>
        <View style={wt.halfCard}>
          <SectionHeader icon="warehouse" title="Inventory" />
          <InfoRow label="Stock Quantity" value={`${p.stock} units`} valueColor={C.green} />
          <InfoRow label="Status"         value={p.status}           valueColor={getStatusStyle(p.status).color} />
          {p.rawStatus ? <InfoRow label="DB Status" value={p.rawStatus} /> : null}
          <InfoRow label="Last Updated"   value={p.updated}          />
          <InfoRow label="Created At"     value={p.createdAt}        />
          <InfoRow label="Approved At"    value={p.approvedAt}       />
        </View>
        <View style={wt.fullWidthCard}>
          <SectionHeader icon="bell-outline" title="Admin Notes" />
          <View style={sub.adminNoteBox}>
            <Text style={sub.adminNoteText}>{p.adminNotes}</Text>
          </View>
        </View>
      </View>
    );
  }
  return (
    <>
      <SectionCard><SectionHeader icon="text-box-outline" title="Full Description" /><Text style={sub.descText}>{p.description}</Text></SectionCard>
      <SectionCard><SectionHeader icon="tag-multiple-outline" title="Classification" /><InfoRow label="Category" value={p.category} /><InfoRow label="Subcategory" value={p.subcategory} /><InfoRow label="Color" value={p.color} /><InfoRow label="Size" value={p.size} /><InfoRow label="HSN Code" value={p.hsnCode} /><InfoRow label="GST" value={p.gst} valueColor={C.orange} /></SectionCard>
      <SectionCard><SectionHeader icon="warehouse" title="Inventory" /><InfoRow label="Stock Quantity" value={`${p.stock} units`} valueColor={C.green} /><InfoRow label="Status" value={p.status} valueColor={getStatusStyle(p.status).color} /><InfoRow label="Last Updated" value={p.updated} /><InfoRow label="Created At" value={p.createdAt} /><InfoRow label="Approved At" value={p.approvedAt} /></SectionCard>
      <SectionCard last><SectionHeader icon="bell-outline" title="Admin Notes" /><View style={sub.adminNoteBox}><Text style={sub.adminNoteText}>{p.adminNotes}</Text></View></SectionCard>
    </>
  );
};

// ─── Specs Tab ────────────────────────────────────────────────
const SpecsTab: React.FC<{ p: Product }> = ({ p }) => {
  if (isWeb) {
    return (
      <View style={wt.twoColGrid}>
        <View style={wt.halfCard}>
          <SectionHeader icon="clipboard-list-outline" title="Specifications" />
          {p.specifications.map((spec, i) => <InfoRow key={i} label={spec.label} value={spec.value} />)}
        </View>
        <View style={wt.halfCard}>
          <SectionHeader icon="lightning-bolt-outline" title="Key Features" />
          {p.features.map((feature, i) => (
            <View key={i} style={[sub.featureRow, i < p.features.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }]}>
              <View style={sub.featureCheck}><MaterialCommunityIcons name="check" size={13} color={C.green} /></View>
              <Text style={sub.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        <View style={wt.fullWidthCard}>
          <SectionHeader icon="package-variant-closed" title="Package Dimensions & Handling" />
          <View style={wt.threeColInner}>
            <View style={wt.thirdTile}><InfoRow label="Box Dimensions" value={p.packaging.boxDimensions} /><InfoRow label="Gross Weight" value={p.packaging.grossWeight} /></View>
            <View style={wt.thirdTile}><InfoRow label="Packaging Type" value={p.packaging.packagingType} /><InfoRow label="Fragile Item" value={p.packaging.fragile ? "Yes" : "No"} valueColor={p.packaging.fragile ? C.red : C.green} /></View>
            <View style={wt.thirdTile}><InfoRow label="Product Weight" value={p.weight} /><InfoRow label="Product Dimensions" value={p.dimensions} /></View>
          </View>
        </View>
      </View>
    );
  }
  return (
    <>
      <SectionCard><SectionHeader icon="clipboard-list-outline" title="Specifications" />{p.specifications.map((spec, i) => <InfoRow key={i} label={spec.label} value={spec.value} />)}</SectionCard>
      <SectionCard><SectionHeader icon="lightning-bolt-outline" title="Key Features" />{p.features.map((feature, i) => (<View key={i} style={[sub.featureRow, i < p.features.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }]}><View style={sub.featureCheck}><MaterialCommunityIcons name="check" size={13} color={C.green} /></View><Text style={sub.featureText}>{feature}</Text></View>))}</SectionCard>
      <SectionCard last><SectionHeader icon="package-variant-closed" title="Package Dimensions & Handling" /><InfoRow label="Box Dimensions" value={p.packaging.boxDimensions} /><InfoRow label="Gross Weight" value={p.packaging.grossWeight} /><InfoRow label="Packaging Type" value={p.packaging.packagingType} /><InfoRow label="Fragile Item" value={p.packaging.fragile ? "Yes" : "No"} valueColor={p.packaging.fragile ? C.red : C.green} /><InfoRow label="Product Weight" value={p.weight} /><InfoRow label="Product Dimensions" value={p.dimensions} /></SectionCard>
    </>
  );
};

// ─── Delivery Tab ─────────────────────────────────────────────
const DeliveryTab: React.FC<{ p: Product }> = ({ p }) => {
  if (isWeb) {
    return (
      <View style={wt.twoColGrid}>
        <View style={wt.halfCard}>
          <SectionHeader icon="truck-outline" title="Delivery Information" />
          <View style={sub.deliveryHighlight}>
            <MaterialCommunityIcons name="calendar-clock" size={26} color={C.blue} />
            <View style={{ flex: 1 }}>
              <Text style={sub.deliveryHighlightTitle}>Estimated: {p.delivery.estimated}</Text>
              <Text style={sub.deliveryHighlightSub}>Available across {p.delivery.locations}</Text>
            </View>
          </View>
          <InfoRow label="Standard Delivery" value={`Free above ${p.delivery.freeAbove}`} valueColor={C.green} />
          <InfoRow label="Express Delivery"  value={p.delivery.expressAvailable ? `Available · ${p.delivery.expressCharge}` : "Not available"} valueColor={p.delivery.expressAvailable ? C.blue : C.red} />
          <InfoRow label="Cash on Delivery"  value={p.delivery.cod ? `Available · ${p.delivery.codCharge}` : "Not available"} valueColor={p.delivery.cod ? C.green : C.red} />
          <InfoRow label="Coverage"          value={p.delivery.locations} />
        </View>
        <View style={wt.halfCard}>
          <SectionHeader icon="currency-inr" title="Weight & Delivery Charges" />
          <View style={sub.tableHeader}>
            <Text style={[sub.tableHeaderCell, { flex: 2, textAlign: "left" }]}>Zone</Text>
            <Text style={[sub.tableHeaderCell, { flex: 1 }]}>Standard</Text>
            <Text style={[sub.tableHeaderCell, { flex: 1 }]}>Express</Text>
          </View>
          {p.deliveryCharges.map((row, i) => (
            <View key={i} style={[sub.tableRow, { backgroundColor: i % 2 === 0 ? C.white : C.bg }]}>
              <Text style={[sub.tableCell, { flex: 2, textAlign: "left", color: C.textDark }]}>{row.zone}</Text>
              <Text style={[sub.tableCell, { flex: 1, color: C.green }]}>{row.standard}</Text>
              <Text style={[sub.tableCell, { flex: 1, color: C.blue }]}>{row.express}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return (
    <>
      <SectionCard>
        <SectionHeader icon="truck-outline" title="Delivery Information" />
        <View style={sub.deliveryHighlight}><MaterialCommunityIcons name="calendar-clock" size={26} color={C.blue} /><View style={{ flex: 1 }}><Text style={sub.deliveryHighlightTitle}>Estimated: {p.delivery.estimated}</Text><Text style={sub.deliveryHighlightSub}>Available across {p.delivery.locations}</Text></View></View>
        <InfoRow label="Standard Delivery" value={`Free above ${p.delivery.freeAbove}`} valueColor={C.green} /><InfoRow label="Express Delivery" value={p.delivery.expressAvailable ? `Available · ${p.delivery.expressCharge}` : "Not available"} valueColor={p.delivery.expressAvailable ? C.blue : C.red} /><InfoRow label="Cash on Delivery" value={p.delivery.cod ? `Available · ${p.delivery.codCharge}` : "Not available"} valueColor={p.delivery.cod ? C.green : C.red} /><InfoRow label="Coverage" value={p.delivery.locations} />
      </SectionCard>
      <SectionCard last>
        <SectionHeader icon="currency-inr" title="Weight & Delivery Charges" />
        <View style={sub.tableHeader}><Text style={[sub.tableHeaderCell, { flex: 2, textAlign: "left" }]}>Zone</Text><Text style={[sub.tableHeaderCell, { flex: 1 }]}>Standard</Text><Text style={[sub.tableHeaderCell, { flex: 1 }]}>Express</Text></View>
        {p.deliveryCharges.map((row, i) => (<View key={i} style={[sub.tableRow, { backgroundColor: i % 2 === 0 ? C.white : C.bg }]}><Text style={[sub.tableCell, { flex: 2, textAlign: "left", color: C.textDark }]}>{row.zone}</Text><Text style={[sub.tableCell, { flex: 1, color: C.green }]}>{row.standard}</Text><Text style={[sub.tableCell, { flex: 1, color: C.blue }]}>{row.express}</Text></View>))}
      </SectionCard>
    </>
  );
};

// ─── Return Tab ───────────────────────────────────────────────
const ReturnTab: React.FC<{ p: Product }> = ({ p }) => {
  if (isWeb) {
    return (
      <View style={wt.twoColGrid}>
        <View style={wt.halfCard}>
          <SectionHeader icon="refresh" title="Return Policy" />
          <View style={sub.returnHighlight}>
            <MaterialCommunityIcons name="check-circle" size={26} color={C.green} />
            <View style={{ flex: 1 }}>
              <Text style={sub.returnHighlightTitle}>{p.returnDetails.window} Return Window</Text>
              <Text style={sub.returnHighlightSub}>Hassle-free returns accepted</Text>
            </View>
          </View>
          <InfoRow label="Return Window" value={p.returnDetails.window} valueColor={C.green} />
          <InfoRow label="Refund Mode"   value={p.returnDetails.refundMode} />
          <InfoRow label="Warranty"      value={p.warranty} valueColor={C.navy} />
        </View>
        <View style={wt.halfCard}>
          <SectionHeader icon="clipboard-check-outline" title="Return Conditions" />
          {p.returnDetails.conditions.map((condition, i) => (
            <View key={i} style={[sub.conditionRow, i < p.returnDetails.conditions.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }]}>
              <View style={sub.conditionIndex}><Text style={sub.conditionIndexText}>{i + 1}</Text></View>
              <Text style={sub.conditionText}>{condition}</Text>
            </View>
          ))}
        </View>
        <View style={wt.fullWidthCard}>
          <SectionHeader icon="swap-horizontal" title="Return Process" />
          <View style={sub.processBox}>
            <Text style={sub.processText}>{p.returnDetails.process}</Text>
          </View>
        </View>
      </View>
    );
  }
  return (
    <>
      <SectionCard><SectionHeader icon="refresh" title="Return Policy" /><View style={sub.returnHighlight}><MaterialCommunityIcons name="check-circle" size={26} color={C.green} /><View style={{ flex: 1 }}><Text style={sub.returnHighlightTitle}>{p.returnDetails.window} Return Window</Text><Text style={sub.returnHighlightSub}>Hassle-free returns accepted</Text></View></View><InfoRow label="Return Window" value={p.returnDetails.window} valueColor={C.green} /><InfoRow label="Refund Mode" value={p.returnDetails.refundMode} /><InfoRow label="Warranty" value={p.warranty} valueColor={C.navy} /></SectionCard>
      <SectionCard><SectionHeader icon="clipboard-check-outline" title="Return Conditions" />{p.returnDetails.conditions.map((condition, i) => (<View key={i} style={[sub.conditionRow, i < p.returnDetails.conditions.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }]}><View style={sub.conditionIndex}><Text style={sub.conditionIndexText}>{i + 1}</Text></View><Text style={sub.conditionText}>{condition}</Text></View>))}</SectionCard>
      <SectionCard last><SectionHeader icon="swap-horizontal" title="Return Process" /><View style={sub.processBox}><Text style={sub.processText}>{p.returnDetails.process}</Text></View></SectionCard>
    </>
  );
};

// ─── Size Chart Tab ───────────────────────────────────────────
const SizeChartTab: React.FC<{ chart: SizeChartEntry[] }> = ({ chart }) => (
  isWeb ? (
    <View style={wt.twoColGrid}>
      <View style={wt.fullWidthCard}>
        <SectionHeader icon="ruler" title="Size Chart" />
        <Text style={{ fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginBottom: 16 }}>
          All measurements are in inches
        </Text>
        <View style={sct.tableHead}>
          {['Size', 'Chest', 'Waist', 'Hip', 'Length'].map((h, i) => (
            <View key={i} style={sct.headCell}>
              <Text style={sct.headTxt}>{h}</Text>
            </View>
          ))}
        </View>
        {chart.map((row, idx) => (
          <View key={row.size} style={[sct.tableRow, { backgroundColor: idx % 2 === 0 ? C.white : '#F8F9FD' }]}>
            <View style={sct.cell}><View style={sct.sizePill}><Text style={sct.sizePillTxt}>{row.size}</Text></View></View>
            <View style={sct.cell}><Text style={sct.cellTxt}>{row.chest}"</Text></View>
            <View style={sct.cell}><Text style={sct.cellTxt}>{row.waist}"</Text></View>
            <View style={sct.cell}><Text style={sct.cellTxt}>{row.hip}"</Text></View>
            <View style={sct.cell}><Text style={sct.cellTxt}>{row.length}"</Text></View>
          </View>
        ))}
        <View style={sct.tipBox}>
          <MaterialCommunityIcons name="information-outline" size={14} color={C.blue} />
          <Text style={sct.tipTxt}>Measure yourself and compare with the chart above for the best fit.</Text>
        </View>
      </View>
    </View>
  ) : (
    <View style={sub.card}>
      <SectionHeader icon="ruler" title="Size Chart" />
      <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: C.textLight, marginBottom: 16 }}>
        All measurements are in inches
      </Text>
      <View style={sct.tableHead}>
        {['Size', 'Chest', 'Waist', 'Hip', 'Length'].map((h, i) => (
          <View key={i} style={sct.headCell}>
            <Text style={sct.headTxt}>{h}</Text>
          </View>
        ))}
      </View>
      {chart.map((row, idx) => (
        <View key={row.size} style={[sct.tableRow, { backgroundColor: idx % 2 === 0 ? C.white : '#F8F9FD' }]}>
          <View style={sct.cell}><View style={sct.sizePill}><Text style={sct.sizePillTxt}>{row.size}</Text></View></View>
          <View style={sct.cell}><Text style={sct.cellTxt}>{row.chest}"</Text></View>
          <View style={sct.cell}><Text style={sct.cellTxt}>{row.waist}"</Text></View>
          <View style={sct.cell}><Text style={sct.cellTxt}>{row.hip}"</Text></View>
          <View style={sct.cell}><Text style={sct.cellTxt}>{row.length}"</Text></View>
        </View>
      ))}
      <View style={sct.tipBox}>
        <MaterialCommunityIcons name="information-outline" size={14} color={C.blue} />
        <Text style={sct.tipTxt}>Measure yourself and compare with the chart for the best fit.</Text>
      </View>
    </View>
  )
);

const sct = StyleSheet.create({
  tableHead: { flexDirection: 'row', backgroundColor: C.navyDeep, borderRadius: 10, paddingVertical: 12, marginBottom: 4 },
  headCell: { flex: 1, alignItems: 'center' },
  headTxt: { fontFamily: 'Outfit_700Bold', fontSize: 12, color: C.white },
  tableRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cellTxt: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: C.textDark },
  sizePill: { backgroundColor: C.purplePale, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 5 },
  sizePillTxt: { fontFamily: 'Outfit_700Bold', fontSize: 13, color: C.purple },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.bluePale, borderRadius: 10, padding: 14, marginTop: 16 },
  tipTxt: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: C.textMid, flex: 1 },
});

// ─── WEB: Hero section ────────────────────────────────────────
const WebHeroSection: React.FC<{
  p: Product;
  activeImg: number;
  setActiveImg: (i: number) => void;
  variants: Variant[];
}> = ({ p, activeImg, setActiveImg, variants }) => {
  const st = getStatusStyle(p.status);
  const uniqueColors = variants.filter((v, i, arr) => arr.findIndex(x => x.color === v.color) === i);
  const uniqueSizes = [...new Set(variants.map(v => v.size))];
  const galleryImages = p.images.filter(img => img && img.trim().length > 0);
  const heroImages = galleryImages.length > 0 ? galleryImages : [""];
  const safeActiveImg = Math.min(activeImg, heroImages.length - 1);

  return (
    <View style={wh.container}>
      <View style={wh.imageSection}>
        <View style={wh.heroImageWrap}>
          <Image source={{ uri: heroImages[safeActiveImg] }} style={wh.heroImage} resizeMode="cover" />
          <View style={s.discountBadge}><Text style={s.discountText}>{p.discount}% OFF</Text></View>
          <View style={s.stockChip}>
            <MaterialCommunityIcons name="check-circle-outline" size={12} color={C.green} />
            <Text style={s.stockChipText}>{p.stock} units</Text>
          </View>
        </View>
        <View style={wh.thumbRow}>
          {heroImages.filter(Boolean).map((img, i) => (
            <TouchableOpacity key={i} onPress={() => setActiveImg(i)} style={[wh.thumb, i === safeActiveImg && wh.thumbActive]}>
              <Image source={{ uri: img }} style={wh.thumbImg} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={wh.detailsSection}>
        <View style={wh.detailsInner}>
          <View style={wh.topRow}>
            <View style={s.catPill}><Text style={s.catPillText}>{p.category} · {p.subcategory}</Text></View>
            <View style={[s.statusChip, { backgroundColor: st.bg }]}>
              <View style={[s.statusDot, { backgroundColor: st.color }]} />
              <Text style={[s.statusChipText, { color: st.color }]}>{p.status}</Text>
            </View>
          </View>

          <Text style={wh.productName}>{p.name}</Text>
          <Text style={wh.skuText}>SKU: {p.sku}</Text>

          <View style={wh.priceRow}>
            <Text style={wh.price}>₹{p.price.toLocaleString()}</Text>
            {p.mrpExclGst > p.price ? (
              <Text style={wh.mrp}>₹{p.mrpExclGst.toLocaleString()}</Text>
            ) : null}
            {p.discount > 0 ? (
              <View style={s.saveBadge}><Text style={s.saveText}>Save {p.discount}%</Text></View>
            ) : null}
          </View>
          <Text style={wh.priceNote}>
            MRP Excl. GST ₹{p.mrpExclGst.toLocaleString()}
            {p.mrpInclGst > 0 ? ` · MRP Incl. GST ₹${p.mrpInclGst.toLocaleString()}` : ""}
            {" · "}Selling Incl. GST ({p.gst})
          </Text>

          <View style={wh.divider} />

          <View style={wh.detailGrid}>
            <View style={wh.detailCell}><Text style={wh.detailLabel}>Material</Text><Text style={wh.detailValue}>{p.material}</Text></View>
            <View style={wh.detailCell}><Text style={wh.detailLabel}>Weight</Text><Text style={wh.detailValue}>{p.weight}</Text></View>
            <View style={wh.detailCell}><Text style={wh.detailLabel}>HSN Code</Text><Text style={wh.detailValue}>{p.hsnCode}</Text></View>
            <View style={wh.detailCell}><Text style={wh.detailLabel}>GST</Text><Text style={[wh.detailValue, { color: C.orange }]}>{p.gst}</Text></View>
            <View style={wh.detailCell}><Text style={wh.detailLabel}>Return Policy</Text><Text style={[wh.detailValue, { color: C.green }]}>{p.returnPolicy}</Text></View>
            <View style={wh.detailCell}><Text style={wh.detailLabel}>Warranty</Text><Text style={[wh.detailValue, { color: C.navy }]}>{p.warranty}</Text></View>
          </View>

          <View style={wh.divider} />

          {uniqueColors.length > 0 && (
            <View style={wh.colorsSection}>
              <Text style={wh.colorsLabel}>Available Colors</Text>
              <View style={wh.colorSwatches}>
                {uniqueColors.map(v => (
                  <View key={v.id} style={wh.swatchWrap}>
                    <View style={[wh.swatch, { backgroundColor: v.colorHex }, v.color === "White" && { borderWidth: 1.5, borderColor: C.border }]} />
                    <Text style={wh.swatchLabel}>{v.color}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {uniqueSizes.length > 0 && (
            <View style={wh.sizesSection}>
              <Text style={wh.sizesLabel}>Available Sizes</Text>
              <View style={wh.sizePills}>
                {uniqueSizes.map((size, idx) => (
                  <View key={idx} style={wh.sizeChip}>
                    <Text style={wh.sizeChipTxt}>{size}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={wh.divider} />

          <View style={wh.attrRow}>
            {([
              { label: "Size", value: p.size },
              { label: "Delivery", value: p.delivery.estimated },
              { label: "Stock", value: `${p.stock} units` },
            ]).map(a => (
              <View key={a.label} style={s.attrChip}>
                <Text style={s.attrLabel}>{a.label}: </Text>
                <Text style={s.attrValue}>{a.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── MAIN SCREEN ──────────────────────────────────────────────
const ProductDetailScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImg,      setActiveImg]      = useState(0);
  const [activeTab,      setActiveTab]      = useState<TabId>("overview");
  const [variants,       setVariants]       = useState<Variant[]>([]);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [showSizeChart,  setShowSizeChart]  = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);

  const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold });

  const goToProductManagement = () => {
    router.push("/(main)/productmanagement" as any);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setError("Product id is missing.");
        setLoading(false);
        return;
      }
      await hydrateSellerSession();
      if (!ensureSellerId()) {
        if (!cancelled) {
          setError("Seller not logged in. Please log in again.");
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchProductDetail(String(id));
        if (!cancelled) {
          setP(detail);
          setVariants(detail.variants);
          setActiveImg(0);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load product details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleAddVariant = useCallback((v: Variant) => {
    setVariants(prev => [...prev, v]);
  }, []);

  const handleDeleteVariant = useCallback(async (variantId: string) => {
    if (!id) return;
    try {
      await deleteProductVariant(String(id), variantId);
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to delete variant.";
      Alert.alert("Error", msg);
    }
  }, [id]);

  const handleEditVariant = useCallback((v: Variant) => {
    setEditingVariant(v);
  }, []);

  const handleSaveVariant = useCallback(async (updated: Variant) => {
    if (!id) return;
    try {
      await updateProductVariant(String(id), updated.id, {
        color: updated.color,
        size: updated.size,
        stock: updated.stock,
        mrp: updated.mrpExclGst || updated.mrp,
        sellingPrice: updated.sellingPriceExGst || updated.sellingPrice,
        discount: updated.discount,
      });
      setVariants((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to update variant.";
      Alert.alert("Error", msg);
    }
  }, [id]);

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.navy} />
        <Text style={{ marginTop: 12, fontFamily: "Outfit_500Medium", color: C.textMid }}>Loading product…</Text>
      </View>
    );
  }

  if (error || !p) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, padding: 24 }}>
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={C.red} />
        <Text style={{ marginTop: 12, fontFamily: "Outfit_600SemiBold", color: C.textDark, textAlign: "center" }}>{error ?? "Product not found"}</Text>
        <TouchableOpacity onPress={goToProductManagement} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.navy, borderRadius: 8 }}>
          <Text style={{ fontFamily: "Outfit_600SemiBold", color: C.white }}>Back to Products</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayImages = p.images.filter(img => img && img.trim().length > 0);
  const heroImages = displayImages.length > 0 ? displayImages : [""];

  const st = getStatusStyle(p.status);

  const uniqueColors = variants.filter((v, i, arr) => arr.findIndex(x => x.color === v.color) === i);
  const uniqueSizes = [...new Set(variants.map(v => v.size))];

  // ─── WEB LAYOUT ───────────────────────────────────────────
  if (isWeb) {
    return (
      <View style={sw.root}>
        <View style={sw.header}>
          <View style={sw.headerInner}>
            <TouchableOpacity onPress={goToProductManagement} style={sw.backBtn}>
              <Ionicons name="arrow-back" size={18} color={C.white} />
              <Text style={sw.backBtnText}>Back</Text>
            </TouchableOpacity>
            <View style={sw.headerContent}>
              <Text style={sw.headerTitle}>Product Details</Text>
              <Text style={sw.headerSub}>SKU: {p.sku} · Last updated: {p.updated}</Text>
            </View>
            <View style={sw.headerActions}>
              <TouchableOpacity style={sw.addVariantBtn} onPress={() => { setActiveTab("variants"); setShowAddVariant(true); }} activeOpacity={0.85}>
                <MaterialCommunityIcons name="plus-circle-outline" size={15} color={C.white} />
                <Text style={sw.addVariantBtnText}>Add Variant</Text>
              </TouchableOpacity>
              <TouchableOpacity style={sw.editBtn} onPress={() => router.push({ pathname: "/(main)/Editproduct", params: { id: p.id } } as any)} activeOpacity={0.85}>
                <MaterialCommunityIcons name="pencil-outline" size={15} color={C.white} />
                <Text style={sw.editBtnText}>Edit Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView style={sw.scrollView} showsVerticalScrollIndicator={false}>
          <View style={sw.contentWrap}>
            <WebHeroSection p={p} activeImg={activeImg} setActiveImg={setActiveImg} variants={variants} />

            <View style={sw.tabBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sw.tabScrollContent}>
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={[sw.tabBtn, isActive && sw.tabBtnActive]}
                      onPress={() => setActiveTab(tab.id)}
                      activeOpacity={0.75}
                    >
                      <MaterialCommunityIcons name={tab.icon as any} size={14} color={isActive ? C.white : C.textMid} />
                      <Text style={[sw.tabBtnText, isActive && sw.tabBtnTextActive]}>{tab.label}</Text>
                      {tab.id === "variants" && (
                        <View style={[sw.tabBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#FFF7ED" }]}>
                          <Text style={[sw.tabBadgeTxt, { color: isActive ? C.white : C.orange }]}>{variants.length}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={sw.tabContent}>
              {activeTab === "overview"       && <OverviewTab p={p} />}
              {activeTab === "variants"       && (
                <VariantsTab
                  variants={variants}
                  onAdd={() => setShowAddVariant(true)}
                  onDelete={handleDeleteVariant}
                  onEdit={handleEditVariant}
                />
              )}
              {activeTab === "specifications" && <SpecsTab    p={p} />}
              {activeTab === "delivery"       && <DeliveryTab p={p} />}
              {activeTab === "return"         && <ReturnTab   p={p} />}
              {activeTab === "sizechart"      && <SizeChartTab chart={p.sizeChart} />}
            </View>
          </View>
        </ScrollView>

        <AddVariantModal visible={showAddVariant} onClose={() => setShowAddVariant(false)} onAdd={handleAddVariant} />
        <EditVariantModal
          visible={!!editingVariant}
          variant={editingVariant}
          onClose={() => setEditingVariant(null)}
          onSave={handleSaveVariant}
        />
        <SizeChartModal visible={showSizeChart} onClose={() => setShowSizeChart(false)} chart={p.sizeChart} />
      </View>
    );
  }

  // ─── MOBILE LAYOUT ────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />

      <View style={s.header}>
        <TouchableOpacity onPress={goToProductManagement} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Text style={s.headerTitle}>Product Details</Text>
          <Text style={s.headerSub}>SKU: {p.sku}</Text>
        </View>
        <View style={[s.statusChip, { backgroundColor: st.bg }]}>
          <View style={[s.statusDot, { backgroundColor: st.color }]} />
          <Text style={[s.statusChipText, { color: st.color }]}>{p.status}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={s.galleryContainer}>
          <Image source={{ uri: heroImages[Math.min(activeImg, heroImages.length - 1)] }} style={s.heroImage} resizeMode="cover" />
          <View style={s.discountBadge}><Text style={s.discountText}>{p.discount}% OFF</Text></View>
          <View style={s.stockChip}>
            <MaterialCommunityIcons name="check-circle-outline" size={12} color={C.green} />
            <Text style={s.stockChipText}>{p.stock} units</Text>
          </View>
        </View>

        <View style={s.thumbRow}>
          {heroImages.filter(Boolean).map((img, i) => (
            <TouchableOpacity key={i} onPress={() => setActiveImg(i)} style={[s.thumb, i === activeImg && s.thumbActive]}>
              <Image source={{ uri: img }} style={s.thumbImg} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.heroCard}>
          <View style={s.catPill}><Text style={s.catPillText}>{p.category} · {p.subcategory}</Text></View>
          <Text style={s.productName}>{p.name}</Text>
          <Text style={s.skuText}>SKU: {p.sku}</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>₹{p.price.toLocaleString()}</Text>
            {p.mrpExclGst > p.price ? (
              <Text style={s.mrp}>₹{p.mrpExclGst.toLocaleString()}</Text>
            ) : null}
            {p.discount > 0 ? (
              <View style={s.saveBadge}><Text style={s.saveText}>Save {p.discount}%</Text></View>
            ) : null}
          </View>
          <Text style={s.priceNote}>
            MRP Excl. GST ₹{p.mrpExclGst.toLocaleString()}
            {p.mrpInclGst > 0 ? ` · Incl. GST MRP ₹${p.mrpInclGst.toLocaleString()}` : ""}
            {" · "}Selling Incl. GST ({p.gst})
          </Text>

          {uniqueColors.length > 0 && (
            <View style={s.colorsSection}>
              <Text style={s.colorsLabel}>Available Colors</Text>
              <View style={s.colorSwatches}>
                {uniqueColors.map(v => (
                  <View key={v.id} style={s.swatchWrap}>
                    <View style={[s.swatch, { backgroundColor: v.colorHex }, v.color === "White" && { borderWidth: 1.5, borderColor: C.border }]} />
                    <Text style={s.swatchLabel}>{v.color}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {uniqueSizes.length > 0 && (
            <View style={s.sizesSection}>
              <Text style={s.sizesLabel}>Available Sizes</Text>
              <View style={s.sizePills}>
                {uniqueSizes.map((size, idx) => (
                  <View key={idx} style={s.sizeChipHero}>
                    <Text style={s.sizeChipHeroTxt}>{size}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={s.attrRow}>
            {([
              { label: "Size",     value: p.size     },
              { label: "Material", value: p.material },
              { label: "Weight",   value: p.weight   },
            ]).map(a => (
              <View key={a.label} style={s.attrChip}>
                <Text style={s.attrLabel}>{a.label}: </Text>
                <Text style={s.attrValue}>{a.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.tabBarRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScrollContent} style={s.tabScrollWrapper}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity key={tab.id} style={[s.tabBtn, isActive && s.tabBtnActive]} onPress={() => setActiveTab(tab.id)} activeOpacity={0.75}>
                  <MaterialCommunityIcons name={tab.icon as any} size={13} color={isActive ? C.white : C.textMid} />
                  <Text style={[s.tabBtnText, isActive && s.tabBtnTextActive]}>{tab.label}</Text>
                  {tab.id === "variants" && (
                    <View style={[s.tabBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "#FFF7ED" }]}>
                      <Text style={[s.tabBadgeTxt, { color: isActive ? C.white : C.orange }]}>{variants.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={s.tabContent}>
          {activeTab === "overview"       && <OverviewTab p={p} />}
          {activeTab === "variants"       && (
            <VariantsTab
              variants={variants}
              onAdd={() => setShowAddVariant(true)}
              onDelete={handleDeleteVariant}
              onEdit={handleEditVariant}
            />
          )}
          {activeTab === "specifications" && <SpecsTab    p={p} />}
          {activeTab === "delivery"       && <DeliveryTab p={p} />}
          {activeTab === "return"         && <ReturnTab   p={p} />}
          {activeTab === "sizechart"      && <SizeChartTab chart={p.sizeChart} />}
        </View>
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity style={s.backAction} onPress={() => router.push("/(main)/productmanagement" as any)} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={17} color={C.navy} />
          <Text style={s.backActionText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.variantAction} onPress={() => { setActiveTab("variants"); setShowAddVariant(true); }} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus-circle-outline" size={17} color={C.white} />
          <Text style={s.variantActionText}>Add Variant</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.editAction} onPress={() => router.push({ pathname: "/(main)/Editproduct", params: { id: p.id } } as any)} activeOpacity={0.85}>
          <MaterialCommunityIcons name="pencil-outline" size={17} color={C.white} />
          <Text style={s.editActionText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <AddVariantModal visible={showAddVariant} onClose={() => setShowAddVariant(false)} onAdd={handleAddVariant} />
      <EditVariantModal
        visible={!!editingVariant}
        variant={editingVariant}
        onClose={() => setEditingVariant(null)}
        onSave={handleSaveVariant}
      />
      <SizeChartModal visible={showSizeChart} onClose={() => setShowSizeChart(false)} chart={p.sizeChart} />
    </SafeAreaView>
  );
};

// ─── Sub-Component Styles ─────────────────────────────────────
const sub = StyleSheet.create({
  sectionHeader:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionIconWrap: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#EEF1FF", alignItems: "center", justifyContent: "center" },
  sectionTitle:    { fontFamily: "Outfit_700Bold", fontSize: 13.5, color: C.navyLight },
  card:            { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  infoRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  infoLabel:       { fontFamily: "Outfit_500Medium", fontSize: 12.5, color: C.textLight, flex: 1 },
  infoValue:       { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: C.textDark, textAlign: "right", maxWidth: "58%" },
  descText:        { fontFamily: "Outfit_400Regular", fontSize: 13.5, color: C.textMid, lineHeight: 22 },
  adminNoteBox:    { backgroundColor: C.orangePale, borderLeftWidth: 3, borderLeftColor: C.orange, borderRadius: 10, padding: 12 },
  adminNoteText:   { fontFamily: "Outfit_400Regular", fontSize: 12.5, color: C.textMid, lineHeight: 21 },
  featureRow:      { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  featureCheck:    { width: 22, height: 22, borderRadius: 11, backgroundColor: C.greenPale, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  featureText:     { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid, flex: 1, lineHeight: 20 },
  deliveryHighlight:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.bluePale, borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 12, padding: 14, marginBottom: 14 },
  deliveryHighlightTitle: { fontFamily: "Outfit_700Bold",    fontSize: 14, color: C.navy    },
  deliveryHighlightSub:   { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textMid, marginTop: 2 },
  tableHeader:     { flexDirection: "row", backgroundColor: C.bg, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 2 },
  tableHeaderCell: { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.textMid, textAlign: "center" },
  tableRow:        { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  tableCell:       { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, textAlign: "center" },
  returnHighlight:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.greenPale, borderWidth: 1, borderColor: C.greenLight, borderRadius: 12, padding: 14, marginBottom: 14 },
  returnHighlightTitle: { fontFamily: "Outfit_700Bold",    fontSize: 14, color: C.green   },
  returnHighlightSub:   { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textMid, marginTop: 2 },
  conditionRow:       { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  conditionIndex:     { width: 22, height: 22, borderRadius: 11, backgroundColor: C.navyDeep, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  conditionIndexText: { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.white },
  conditionText:      { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textMid, flex: 1, lineHeight: 20 },
  processBox:  { backgroundColor: C.purplePale, borderRadius: 12, padding: 14 },
  processText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.purple, lineHeight: 22 },
});

// ─── Mobile Screen Styles ─────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.navyDeep, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 12 : 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 },
  backBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  headerContent: { flex: 1 },
  headerTitle:   { fontFamily: "Outfit_700Bold",    fontSize: 17, color: C.white, lineHeight: 22 },
  headerSub:     { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.55)" },
  statusChip:    { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statusDot:     { width: 7, height: 7, borderRadius: 3.5 },
  statusChipText:{ fontFamily: "Outfit_700Bold", fontSize: 11 },
  galleryContainer: { backgroundColor: "#F3F4F8", position: "relative" },
  heroImage:     { width: "100%", height: 300 },
  discountBadge: { position: "absolute", top: 14, left: 14, backgroundColor: C.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  discountText:  { fontFamily: "Outfit_800ExtraBold", fontSize: 12, color: C.white },
  stockChip:     { position: "absolute", top: 14, right: 14, backgroundColor: "rgba(240,253,244,0.92)", borderWidth: 1, borderColor: C.green, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 },
  stockChipText: { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.green },
  thumbRow:      { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.white },
  thumb:         { width: 60, height: 60, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: C.border },
  thumbActive:   { borderColor: C.navy, borderWidth: 2.5 },
  thumbImg:      { width: "100%", height: "100%" },
  heroCard:      { backgroundColor: C.white, marginHorizontal: 14, marginTop: 4, marginBottom: 12, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  catPill:       { alignSelf: "flex-start", backgroundColor: C.purplePale, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  catPillText:   { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.purple },
  productName:   { fontFamily: "Outfit_800ExtraBold", fontSize: 20, color: C.textDark, lineHeight: 26, marginBottom: 4 },
  skuText:       { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginBottom: 12 },
  priceRow:      { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 4 },
  price:         { fontFamily: "Outfit_800ExtraBold", fontSize: 26, color: C.orange },
  mrp:           { fontFamily: "Outfit_500Medium", fontSize: 14, color: C.textLight, textDecorationLine: "line-through" },
  saveBadge:     { backgroundColor: C.greenPale, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  saveText:      { fontFamily: "Outfit_700Bold", fontSize: 11, color: C.green },
  priceNote:     { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginBottom: 4 },
  colorsSection: { marginTop: 12, marginBottom: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  colorsLabel:   { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  colorSwatches: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  swatchWrap:    { alignItems: "center", gap: 5 },
  swatch:        { width: 30, height: 30, borderRadius: 15 },
  swatchLabel:   { fontFamily: "Outfit_500Medium", fontSize: 10, color: C.textMid },
  sizesSection:  { marginTop: 10, marginBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  sizesLabel:    { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  sizePills:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeChipHero:  { backgroundColor: C.purplePale, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: C.purpleLight },
  sizeChipHeroTxt: { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.navy },
  attrRow:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  attrChip:  { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  attrLabel: { fontFamily: "Outfit_500Medium", fontSize: 11, color: C.textLight },
  attrValue: { fontFamily: "Outfit_700Bold",   fontSize: 11, color: C.navy     },
  tabBarRow:        { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  tabScrollWrapper: { flex: 1 },
  tabScrollContent: { paddingHorizontal: 14, gap: 8, paddingVertical: 4 },
  tabBtn:          { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  tabBtnActive:    { backgroundColor: C.navy, borderColor: C.navy },
  tabBtnText:      { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textMid },
  tabBtnTextActive:{ color: C.white },
  tabBadge:        { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeTxt:     { fontFamily: "Outfit_700Bold", fontSize: 10 },
  tabContent:      { paddingHorizontal: 14 },
  bottomBar:         { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, flexDirection: "row", gap: 6, padding: 10, paddingBottom: Platform.OS === "ios" ? 28 : 12, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 12 },
  backAction:        { flex: 0.8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1.5, borderColor: C.navy, borderRadius: 13, paddingVertical: 11 },
  backActionText:    { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.navy },
  variantAction:     { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: C.orange, borderRadius: 13, paddingVertical: 11 },
  variantActionText: { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.white },
  editAction:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: C.navy, borderRadius: 13, paddingVertical: 11 },
  editActionText:    { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.white },
});

// ─── WEB: Hero section styles ─────────────────────────────────
const wh = StyleSheet.create({
  container:      { flexDirection: "row", gap: 28, backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 24, marginBottom: 20, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  imageSection:   { width: 420, flexShrink: 0 },
  heroImageWrap:  { borderRadius: 16, overflow: "hidden", position: "relative", backgroundColor: "#F3F4F8" },
  heroImage:      { width: "100%", height: 380 },
  thumbRow:       { flexDirection: "row", gap: 8, marginTop: 10 },
  thumb:          { width: 72, height: 72, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: C.border },
  thumbActive:    { borderColor: C.navy, borderWidth: 2.5 },
  thumbImg:       { width: "100%", height: "100%" },
  detailsSection: { flex: 1, minWidth: 0 },
  detailsInner:   { flex: 1 },
  topRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  productName:    { fontFamily: "Outfit_800ExtraBold", fontSize: 26, color: C.textDark, lineHeight: 34, marginBottom: 4 },
  skuText:        { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight, marginBottom: 14 },
  priceRow:       { flexDirection: "row", alignItems: "baseline", gap: 12, marginBottom: 4 },
  price:          { fontFamily: "Outfit_800ExtraBold", fontSize: 32, color: C.orange },
  mrp:            { fontFamily: "Outfit_500Medium", fontSize: 16, color: C.textLight, textDecorationLine: "line-through" },
  priceNote:      { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight },
  divider:        { borderTopWidth: 1, borderTopColor: "#F3F4F6", marginVertical: 14 },
  detailGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailCell:     { backgroundColor: C.bg, borderRadius: 10, padding: 10, minWidth: 120, flex: 1 },
  detailLabel:    { fontFamily: "Outfit_400Regular", fontSize: 10.5, color: C.textLight, marginBottom: 4 },
  detailValue:    { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.textDark },
  colorsSection:  {},
  colorsLabel:    { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  colorSwatches:  { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  swatchWrap:     { alignItems: "center", gap: 5 },
  swatch:         { width: 34, height: 34, borderRadius: 17 },
  swatchLabel:    { fontFamily: "Outfit_500Medium", fontSize: 10.5, color: C.textMid },
  sizesSection:   { marginTop: 12 },
  sizesLabel:     { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: C.textLight, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  sizePills:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeChip:       { backgroundColor: C.purplePale, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: C.purpleLight },
  sizeChipTxt:    { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.navy },
  attrRow:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  descLabel:      { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.textMid, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  descText:       { fontFamily: "Outfit_400Regular", fontSize: 13.5, color: C.textMid, lineHeight: 22 },
});

// ─── WEB: Tab content grid ────────────────────────────────────
const wt = StyleSheet.create({
  twoColGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  halfCard:     { flex: 1, minWidth: 300, backgroundColor: C.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  fullWidthCard:{ width: "100%", backgroundColor: C.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  threeColInner:{ flexDirection: "row", gap: 12, flexWrap: "wrap" },
  thirdTile:    { flex: 1, minWidth: 160 },
});

// ─── WEB: Main layout styles ──────────────────────────────────
const sw = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  header:      { backgroundColor: C.navyDeep, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 },
  headerInner: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 32, paddingVertical: 16, maxWidth: 1400, alignSelf: "center", width: "100%" } as any,
  backBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  backBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.white },
  headerContent:{ flex: 1 },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: C.white, lineHeight: 24 },
  headerSub:   { fontFamily: "Outfit_400Regular", fontSize: 11.5, color: "rgba(255,255,255,0.55)" },
  headerActions:{ flexDirection: "row", gap: 10, alignItems: "center" },
  addVariantBtn:{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.orange, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  addVariantBtnText:{ fontFamily: "Outfit_700Bold", fontSize: 13, color: C.white },
  editBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  editBtnText: { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.white },
  scrollView:  { flex: 1 },
  contentWrap: { maxWidth: 1400, alignSelf: "center", width: "100%", paddingHorizontal: 32, paddingTop: 24, paddingBottom: 48 } as any,
  tabBar:      { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 8, marginBottom: 16, shadowColor: "#1E2B6B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tabBarInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  tabScrollContent:{ gap: 6, paddingVertical: 2 },
  tabBtn:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: "transparent", backgroundColor: "transparent" },
  tabBtnActive:{ backgroundColor: C.navy, borderColor: C.navy },
  tabBtnText:  { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.textMid },
  tabBtnTextActive:{ color: C.white },
  tabBadge:    { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeTxt: { fontFamily: "Outfit_700Bold", fontSize: 11 },
  tabContent:  { paddingTop: 0 },
});

export default ProductDetailScreen;