/**
 * Seller Business Info - Screen 2 of 5
 * Navy blue & orange premium onboarding UI
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Pressable,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/FontAwesome";
import { useSweetAlert } from "@/components/common/SweetAlert";
import { hydrateSellerSession } from "@/lib/api/sellerSession";
import {
  fetchSellerProfile,
  getApiErrorMessage,
  toUiBusinessCategory,
  updateBusinessProfile,
  verifyGstNumber,
  isGstVerifySuccessful,
  isGstAlreadyExists,
  type GstVerifyResponse,
} from "@/services/sellerProfileApi";
import {
  clearBusinessOnboardingDraft,
  loadBusinessOnboardingDraft,
  saveBusinessOnboardingDraft,
} from "@/lib/onboarding/onboardingDraft";
import { scrollToFormField } from "@/lib/form/scrollToFormField";
const { width: SW } = Dimensions.get("window");

// ─── Design tokens ───────────────────────────────────────────
const T = {
  // Navy family
  navy: "#0F1F4B",
  navyMid: "#1A2F6A",
  navyLight: "#243580",
  navySoft: "#E8ECF8",
  navyPale: "#F0F3FB",

  // Orange family
  orange: "#F97316",
  orangeDeep: "#EA6C0A",
  orangeLight: "#FB923C",
  orangePale: "#FFF4EC",
  orangeSoft: "#FDE8D4",

  // Neutrals
  white: "#FFFFFF",
  bg: "#F4F6FB",
  cardBg: "#FFFFFF",
  border: "#DDE3F0",
  borderLight: "#EEF1F9",
  divider: "#E5EAF5",

  // Text
  textDark: "#0A1533",
  textMid: "#3A4A72",
  textSoft: "#6B7A9E",
  textLight: "#9BA8C5",

  // Status
  success: "#16A34A",
  error: "#DC2626",
};

interface ValidationError { field: string; message: string; }

// ─── Step indicator ──────────────────────────────────────────
const StepDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View style={st.stepRow}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i} style={[
        st.stepDot,
        i < current && st.stepDotDone,
        i === current && st.stepDotActive,
        i > current && st.stepDotFuture,
      ]}>
        {i < current && (
          <Icon name="check" size={12} color={T.white} />
        )}
        {i === current && (
          <AppText style={st.stepNum}>{i + 1}</AppText>
        )}
      </View>
    ))}
    <AppText style={st.stepLabel}>Step {current + 1} of {total}</AppText>
  </View>
);
const st = StyleSheet.create({
  stepRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 28 },
  stepDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  stepDotDone: { backgroundColor: T.orange },
  stepDotActive: { backgroundColor: T.navy, borderWidth: 2, borderColor: T.orange },
  stepDotFuture: { backgroundColor: T.navySoft, borderWidth: 1.5, borderColor: T.border },
  stepCheck: { color: T.white, fontSize: 13, fontWeight: "700" },
  stepNum: { color: T.white, fontSize: 12, fontWeight: "700" },
  stepLabel: { marginLeft: 6, fontSize: 13, color: T.textSoft, fontWeight: "600" },
});

// ─── GST verification result (ClearTax-style) ────────────────
const GstDetailRow: React.FC<{ label: string; value?: string | null | undefined }> = ({ label, value }) => {
  if (!value?.trim()) return null;
  return (
    <View style={gstDetailStyles.row}>
      <AppText style={gstDetailStyles.label}>{label}</AppText>
      <AppText style={gstDetailStyles.value}>{value}</AppText>
    </View>
  );
};

const GstVerifiedDetailsCard: React.FC<{ details: GstVerifyResponse; verified: boolean; alreadyExists?: boolean }> = ({ details, verified, alreadyExists }) => {
  const hasRegistryDetails = !!(
    details.businessName?.trim() ||
    details.tradeName?.trim() ||
    details.address?.trim() ||
    details.status?.trim()
  );
  const isActive = details.status?.toLowerCase() === "active";
  const location = [details.city, details.state, details.pincode].filter(Boolean).join(", ");

  let title = "GST lookup result";
  let headerColor = T.textMid;
  let iconName: "check-circle" | "exclamation-circle" | "info-circle" = "info-circle";

  if (alreadyExists) {
    title = "GSTIN already registered";
    headerColor = T.orange;
    iconName = "exclamation-circle";
  } else if (verified && isActive) {
    title = "GSTIN verified";
    headerColor = T.success;
    iconName = "check-circle";
  } else if (verified && hasRegistryDetails) {
    title = "GSTIN verified";
    headerColor = T.success;
    iconName = "check-circle";
  } else if (hasRegistryDetails && !isActive) {
    title = "GSTIN found — not active";
    headerColor = T.orange;
    iconName = "exclamation-circle";
  } else if (hasRegistryDetails) {
    title = "Registered GSTIN details";
    headerColor = T.navy;
    iconName = "info-circle";
  } else if (details.panNumber?.trim()) {
    title = "Portal lookup unavailable — PAN derived from GSTIN";
    headerColor = T.orange;
    iconName = "exclamation-circle";
  }

  return (
    <View style={[
      gstDetailStyles.card,
      alreadyExists && gstDetailStyles.cardError,
      !verified && !alreadyExists && gstDetailStyles.cardWarning,
    ]}>
      <View style={gstDetailStyles.header}>
        <Icon name={iconName} size={16} color={headerColor} />
        <AppText style={[gstDetailStyles.title, { color: headerColor }]}>{title}</AppText>
      </View>
      <GstDetailRow label="GSTIN" value={details.gstNumber} />
      <GstDetailRow label="Legal name" value={details.businessName} />
      <GstDetailRow
        label="Trade name"
        value={details.tradeName && details.tradeName !== details.businessName ? details.tradeName : null}
      />
      <GstDetailRow label="Status" value={details.status} />
      <GstDetailRow label="Taxpayer type" value={details.taxpayerType} />
      <GstDetailRow label="Constitution" value={details.businessType} />
      <GstDetailRow label="Registration date" value={details.registrationDate} />
      <GstDetailRow label="Cancellation date" value={details.cancellationDate} />
      <GstDetailRow label="State jurisdiction" value={details.stateJurisdiction} />
      <GstDetailRow label="Centre jurisdiction" value={details.centreJurisdiction} />
      <GstDetailRow label="Principal place" value={details.principalPlaceType} />
      <GstDetailRow label="PAN" value={details.panNumber} />
      <GstDetailRow label="Address" value={details.address} />
      <GstDetailRow label="Location" value={location || null} />
    </View>
  );
};

const gstDetailStyles = StyleSheet.create({
  card: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: T.navyPale,
    borderWidth: 1,
    borderColor: T.success + "55",
    gap: 2,
  },
  cardWarning: {
    borderColor: T.orange + "66",
    backgroundColor: T.orangePale,
  },
  cardError: {
    borderColor: T.error + "66",
    backgroundColor: "#FEF2F2",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.borderLight,
  },
  title: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
    color: T.success,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    gap: 8,
  },
  label: {
    width: 130,
    fontSize: 11,
    fontFamily: fontFamilies.semiBold,
    color: T.textSoft,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  value: {
    flex: 1,
    fontSize: 12,
    fontFamily: fontFamilies.medium,
    color: T.textDark,
    lineHeight: 18,
  },
});

// ─── Field wrapper with label ────────────────────────────────
const FieldLabel: React.FC<{ label: string; required?: boolean; note?: string; stackNote?: boolean }> = ({
  label,
  required,
  note,
  stackNote = false,
}) => (
  <View style={{ flexDirection: stackNote ? "column" : "row", alignItems: stackNote ? "flex-start" : "center", marginBottom: 8, gap: 6, flexWrap: "wrap" }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
      <AppText style={fl.label}>{label}</AppText>
      {required && <AppText style={fl.requiredText}>*</AppText>}
    </View>
    {note ? <AppText style={[fl.note, stackNote && { marginTop: 2 }]}>{note}</AppText> : null}
  </View>
);
const fl = StyleSheet.create({
  label: { fontSize: 11, fontFamily: fontFamilies.bold, color: T.textMid, letterSpacing: 0.8, textTransform: "uppercase" },
  requiredDot: { backgroundColor: T.orangePale, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  requiredText: { fontSize: 10, fontFamily: fontFamilies.semiBold, color: T.orange },
  note: { fontSize: 10, color: T.textLight, fontStyle: "italic" },
});

// ─── Category card ───────────────────────────────────────────
const CategoryCard: React.FC<{
  title: string; desc: string; badge: string;
  selected: boolean; onPress: () => void;
  accentColor: string; iconChar: string;
}> = ({ title, desc, badge, selected, onPress, accentColor, iconChar }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={{ flex: 1 }}>
    {selected ? (
      <LinearGradient
        colors={[T.navy, T.navyMid]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[cc.card, cc.selectedCard]}
      >
        <View style={[cc.iconBox, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Icon name={iconChar} size={20} color={T.white} />
        </View>
        <AppText style={[cc.title, cc.selectedTitle]}>{title}</AppText>
        <AppText style={[cc.desc, cc.selectedDesc]}>{desc}</AppText>
        <View style={[cc.badge, { backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.3)" }]}>
          <AppText style={[cc.badgeText, { color: T.white }]}>{badge}</AppText>
        </View>
        <View style={[cc.checkMark, { backgroundColor: "#376197" }]}>
          <Icon name="check" size={10} color={T.white} />
        </View>
      </LinearGradient>
    ) : (
      <View style={cc.card}>
        <View style={[cc.iconBox, { backgroundColor: accentColor + "18" }]}>
          <Icon name={iconChar} size={20} color={accentColor} />
        </View>
        <AppText style={cc.title}>{title}</AppText>
        <AppText style={cc.desc}>{desc}</AppText>
        <View style={[cc.badge, { backgroundColor: accentColor + "15", borderColor: accentColor + "40" }]}>
          <AppText style={[cc.badgeText, { color: accentColor }]}>{badge}</AppText>
        </View>
      </View>
    )}
  </TouchableOpacity>
);
const cc = StyleSheet.create({
  card: {
    backgroundColor: T.white, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: T.border,
    shadowColor: T.navy, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, overflow: "hidden",
  },
  selectedCard: {
    borderWidth: 0,
  },
  selectedBar: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  iconChar: { fontSize: 22 },
  title: { fontSize: 14, fontWeight: "700", color: T.textDark, marginBottom: 4 },
  selectedTitle: { fontSize: 14, fontWeight: "700", color: T.white, marginBottom: 4 },
  desc: { fontSize: 12, color: T.textSoft, lineHeight: 17, marginBottom: 10 },
  selectedDesc: { fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 17, marginBottom: 10 },
  badge: { alignSelf: "flex-start", borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: "600" },
  checkMark: {
    position: "absolute", top: 12, right: 12,
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  checkText: { color: T.white, fontSize: 11, fontWeight: "700" },
});

// ─── Radio pill ──────────────────────────────────────────────
const RadioPill: React.FC<{
  label: string; subLabel?: string;
  selected: boolean; onPress: () => void;
}> = ({ label, subLabel, selected, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}
    style={[rp.pill, selected && rp.pillSelected]}>
    <View style={[rp.circle, selected && rp.circleSelected]}>
      {selected && <View style={rp.dot} />}
    </View>
    <View style={{ flex: 1 }}>
      <AppText style={[rp.label, selected && rp.labelSelected]}>{label}</AppText>
      {subLabel && <AppText style={rp.sub}>{subLabel}</AppText>}
    </View>
  </TouchableOpacity>
);
const rp = StyleSheet.create({
  pill: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1.5, borderColor: T.border,
    backgroundColor: T.cardBg, marginBottom: 10,
  },
  pillSelected: { borderColor: T.orange, backgroundColor: T.orangePale },
  circle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: T.border, alignItems: "center", justifyContent: "center" },
  circleSelected: { borderColor: T.orange },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.orange },
  label: { fontSize: 14, fontFamily: fontFamilies.semiBold, color: T.textMid },
  labelSelected: { color: T.textDark },
  sub: { fontSize: 11, color: T.textSoft, marginTop: 2 },
});

// ─── Styled text input ───────────────────────────────────────
const StyledInput: React.FC<{
  label: string; value: string;
  onChangeText: (t: string) => void;
  placeholder?: string; error?: string | undefined;
  isValid?: boolean; maxLength?: number;
  keyboardType?: any; required?: boolean;
  note?: string; onBlur?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  onLayout?: (e: LayoutChangeEvent) => void;
  innerRef?: (node: View | null) => void;
  rightElement?: React.ReactNode;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}> = ({
  label, value, onChangeText, placeholder, error,
  isValid, maxLength, keyboardType, required, note,
  onBlur, inputRef, onLayout, innerRef, rightElement,
  multiline = false, numberOfLines = 3, autoCapitalize = "characters",
}) => {
    const [focused, setFocused] = useState(false);
    const { width } = useWindowDimensions();
    const stackNote = width < 480;
    const borderColor = error ? T.error : isValid ? T.success : focused ? T.orange : T.border;

    return (
      <View style={{ marginBottom: 18 }} onLayout={onLayout} ref={innerRef} collapsable={false}>
        <FieldLabel label={label} {...(required !== undefined && { required })} {...(note !== undefined && { note, stackNote: stackNote && !!note })} />
        <View style={[
          si.wrap,
          { borderColor },
          multiline && si.wrapMultiline,
        ]}>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={T.textLight}
            style={[si.input, multiline && si.inputMultiline]}
            maxLength={maxLength}
            keyboardType={keyboardType || "default"}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            numberOfLines={multiline ? numberOfLines : 1}
            textAlignVertical={multiline ? "top" : "center"}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onBlur?.(); }}
          />
          {isValid && !rightElement && !multiline && (
            <Icon name="check" size={15} color={T.success} />
          )}
          {rightElement && <View style={si.right}>{rightElement}</View>}
        </View>
        {error ? (
          <View style={si.errorRow}>
            <Icon name="exclamation-circle" size={11} color={T.error} />
            <AppText style={si.errorText}>{error}</AppText>
          </View>
        ) : null}
      </View>
    );
  };
const si = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.navyPale, borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, height: 52,
    ...(Platform.OS === "web" ? { overflow: "visible" as const } : { overflow: "hidden" as const }),
  },
  gstRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  gstRowStacked: {
    flexDirection: "column",
  },
  gstInputShell: {
    flex: 1,
    minWidth: 0,
  },
  wrapMultiline: {
    alignItems: "flex-start",
    height: undefined,
    minHeight: 96,
    paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 12, color: T.textDark, fontWeight: "400" },
  inputMultiline: { minHeight: 72, lineHeight: 18 },
  right: { marginLeft: 8, flexShrink: 0 },
  validIcon: { marginLeft: 8 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  errorText: { fontSize: 12, color: T.error, flex: 1 },
});

// ─── Styled dropdown ─────────────────────────────────────────
const StyledDropdown: React.FC<{
  label: string; value: string; options: string[];
  onSelect: (v: string) => void; placeholder?: string; required?: boolean;
}> = ({ label, value, options, onSelect, placeholder, required }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 18 }}>
      <FieldLabel label={label} {...(required && { required: true })} />
      <TouchableOpacity
        onPress={() => setOpen(o => !o)} activeOpacity={0.85}
        style={[sd.trigger, open && { borderColor: T.orange }]}
      >
        <AppText style={[sd.triggerText, !value && { color: T.textLight }]}>
          {value || placeholder || "Select…"}
        </AppText>
        <Icon name="chevron-down" size={14} color={T.textSoft} />
      </TouchableOpacity>
      {open && (
        <View style={sd.menu}>
          {options.map(opt => (
            <TouchableOpacity key={opt} onPress={() => { onSelect(opt); setOpen(false); }}
              style={[sd.option, value === opt && sd.optionActive]}>
              <AppText style={[sd.optionText, value === opt && sd.optionTextActive]}>{opt}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};
const sd = StyleSheet.create({
  trigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: T.navyPale, borderRadius: 12, borderWidth: 1.5,
    borderColor: T.border, paddingHorizontal: 14, height: 52,
  },
  triggerText: { fontSize: 12, color: T.textDark, fontWeight: "400", flex: 1 },
  chevron: { fontSize: 18, color: T.textSoft },
  menu: {
    backgroundColor: T.white, borderRadius: 12, borderWidth: 1.5,
    borderColor: T.border, overflow: "hidden", marginTop: 4,
    shadowColor: T.navy, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 10, zIndex: 99,
  },
  option: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: T.divider,
  },
  optionActive: { backgroundColor: T.orangePale },
  optionText: { fontSize: 14, color: T.textMid, fontWeight: "500" },
  optionTextActive: { color: T.textDark, fontWeight: "700" },
});

// ─── Section card wrapper ────────────────────────────────────
const SectionCard: React.FC<{
  children: React.ReactNode; title: string; subtitle?: string;
  accentColor?: string; icon?: string;
}> = ({ children, title, subtitle, accentColor = T.navy, icon }) => (
  <View style={sc.card}>
    <View style={[sc.topBar, { backgroundColor: accentColor }]} />
    <View style={sc.inner}>
      <View style={sc.titleRow}>
        {icon && (
          <View style={[sc.iconBox, { backgroundColor: accentColor + "15" }]}>
            <Icon name={icon} size={16} color={accentColor} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <AppText style={sc.title}>{title}</AppText>
          {subtitle && <AppText style={sc.subtitle}>{subtitle}</AppText>}
        </View>
      </View>
      {children}
    </View>
  </View>
);
const sc = StyleSheet.create({
  card: {
    backgroundColor: T.cardBg, borderRadius: 16, marginBottom: 16,
    overflow: "hidden", borderWidth: 1, borderColor: T.borderLight,
    shadowColor: T.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  topBar: { height: 4 },
  inner: { padding: 18 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "700", color: T.textDark, marginBottom: 2 },
  subtitle: { fontSize: 12, color: T.textSoft, lineHeight: 17 },
});

// ─── Main screen ─────────────────────────────────────────────
export default function SellerBusinessInfo() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 480;
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const fieldViewRefs = useRef<Record<string, View | null>>({});
  const { showError, showSuccess, showWarning, SweetAlertHost } = useSweetAlert();

  const registerFieldRef = useCallback(
    (field: string) => (node: View | null) => {
      fieldViewRefs.current[field] = node;
    },
    []
  );

  const [businessCategory, setBusinessCategory] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [hasGST, setHasGST] = useState(false);
  const GST_TYPE = "Regular";
  const [gstNumber, setGstNumber] = useState("");
  const [gstVerified, setGstVerified] = useState(false);
  const [panNumber, setPanNumber] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldPositions, setFieldPositions] = useState<Record<string, number>>({});

  const [gstError, setGstError] = useState("");
  const [panError, setPanError] = useState("");
  const [aadharError, setAadharError] = useState("");
  const [panValid, setPanValid] = useState(false);
  const [aadharValid, setAadharValid] = useState(false);
  const [aadhaarOnFile, setAadhaarOnFile] = useState(false);
  const [isVerifyingGst, setIsVerifyingGst] = useState(false);
  const [gstDetails, setGstDetails] = useState<GstVerifyResponse | null>(null);
  const [gstAlreadyExists, setGstAlreadyExists] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const businessTypes = ["Sole Proprietorship", "Partnership", "Private Limited", "Public Limited", "LLP"];

  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const AADHAAR_REGEX = /^\d{12}$/;

  const validateGST = (g: string) => {
    if (!g.trim()) return "GST number is required";
    if (g.length !== 15) return "Must be 15 characters (e.g. 29AAAPL1234C1Z1)";
    if (!GST_REGEX.test(g)) return "Invalid GST format (e.g. 29AAAPL1234C1Z1)";
    return "";
  };
  const validatePAN = (p: string) => {
    if (!p.trim()) return "PAN number is required";
    if (!PAN_REGEX.test(p)) return "Invalid PAN format (e.g. ABCDE1234F)";
    return "";
  };
  const validateAadhaar = (a: string) => {
    const clean = a.replace(/\s/g, "");
    if (!clean) return "Aadhaar number is required";
    if (clean.length !== 12) return "Must be exactly 12 digits";
    if (!AADHAAR_REGEX.test(clean)) return "Invalid Aadhaar format";
    return "";
  };

  const formatAadhaar = (v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 12);
    if (clean.length <= 4) return clean;
    if (clean.length <= 8) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)}`;
  };

  const clearFieldError = useCallback((field: string) => {
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  }, []);

  const applyGstDetailsFromResponse = useCallback((result: GstVerifyResponse) => {
    const legalName = result.businessName?.trim() || result.tradeName?.trim() || "";
    if (legalName) setBusinessName(legalName);
    if (result.businessType) {
      const matched = businessTypes.find(
        (t) => t.toLowerCase() === result.businessType!.toLowerCase()
      ) ?? businessTypes.find((t) =>
        result.businessType!.toLowerCase().includes(t.toLowerCase().split(" ")[0] ?? "")
      );
      if (matched) setBusinessType(matched);
    }
    if (result.panNumber) {
      const pan = result.panNumber.toUpperCase();
      setPanNumber(pan);
      setPanValid(validatePAN(pan) === "");
    }
    if (result.address?.trim()) {
      setBusinessAddress(result.address.trim());
      clearFieldError("businessAddress");
    }
  }, [businessTypes, clearFieldError]);

  const fieldRefs = {
    businessName: useRef<TextInput | null>(null),
    businessAddress: useRef<TextInput | null>(null),
    gstNumber: useRef<TextInput | null>(null),
    panNumber: useRef<TextInput | null>(null),
    aadharNumber: useRef<TextInput | null>(null),
  };

  const handleFieldLayout = useCallback((name: string, e: any) => {
    try {
      if (!e || !e.nativeEvent) return;

      const layout = e.nativeEvent.layout;
      if (!layout || typeof layout !== 'object') return;

      const y = layout.y;
      if (typeof y === 'number' && !isNaN(y)) {
        setFieldPositions(prev => {
          try {
            return { ...prev, [name]: y };
          } catch (stateError) {
            console.warn(`State update error for field ${name}:`, stateError);
            return prev;
          }
        });
      }
    } catch (error) {
      console.warn(`Layout error for field ${name}:`, error);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await hydrateSellerSession();
        const draft = await loadBusinessOnboardingDraft();
        const profile = await fetchSellerProfile();
        if (!active) return;
        const b = profile.business;
        const cat = toUiBusinessCategory(b.businessCategory);

        if (draft?.businessCategory) setBusinessCategory(draft.businessCategory);
        else if (cat) setBusinessCategory(cat);

        if (draft?.businessName) setBusinessName(draft.businessName);
        else if (b.businessName) setBusinessName(b.businessName);

        if (draft?.businessType) setBusinessType(draft.businessType);
        else if (b.businessType) setBusinessType(b.businessType);

        if (draft?.address) setBusinessAddress(draft.address);
        else if (b.address) setBusinessAddress(b.address);
        else if (profile.address?.streetAddress) setBusinessAddress(profile.address.streetAddress);

        if (draft?.hasGST != null) setHasGST(draft.hasGST || draft.businessCategory === "B2B" || cat === "B2B");
        else setHasGST(b.hasGst || cat === "B2B");

        if (draft?.gstNumber) {
          setGstNumber(draft.gstNumber);
          setGstVerified(draft.gstVerified ?? false);
        } else if (b.gstNumber) {
          setGstNumber(b.gstNumber);
          setGstVerified(true);
        }

        if (draft?.panNumber) {
          setPanNumber(draft.panNumber);
          setPanValid(validatePAN(draft.panNumber) === "");
        } else if (b.panNumber) {
          setPanNumber(b.panNumber);
          setPanValid(true);
        }

        const onFile = b.aadhaarOnFile === true;
        setAadhaarOnFile(onFile);

        if (draft?.aadhaarNumber) {
          const digits = draft.aadhaarNumber.replace(/\D/g, "");
          if (digits.length === 12) {
            setAadharNumber(formatAadhaar(digits));
            setAadharValid(true);
          }
        } else if (onFile && b.aadhaarNumber) {
          setAadharNumber(b.aadhaarNumber);
          setAadharValid(true);
        } else if (b.aadhaarNumber) {
          const digits = b.aadhaarNumber.replace(/\D/g, "");
          if (digits.length === 12) {
            setAadharNumber(formatAadhaar(digits));
            setAadharValid(true);
          }
        }

        setDraftHydrated(true);
      } catch {
        setDraftHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    void saveBusinessOnboardingDraft({
      businessCategory,
      businessName,
      businessType,
      address: businessAddress,
      hasGST,
      gstType: GST_TYPE,
      gstNumber,
      gstVerified,
      panNumber,
      aadhaarNumber: aadharNumber,
    });
  }, [
    draftHydrated,
    businessCategory,
    businessName,
    businessType,
    businessAddress,
    hasGST,
    gstNumber,
    gstVerified,
    panNumber,
    aadharNumber,
  ]);

  const handleGSTVerify = useCallback(async () => {
    const normalizedGst = gstNumber.trim().toUpperCase();
    const err = validateGST(normalizedGst);
    if (err) {
      setGstError(err);
      showError(err);
      return;
    }
    if (gstVerified || isVerifyingGst) return;

    setIsVerifyingGst(true);
    setGstError("");
    try {
      await hydrateSellerSession();
      const result = await verifyGstNumber(normalizedGst);
      const verified = isGstVerifySuccessful(result);
      const alreadyExists = isGstAlreadyExists(result);
      const hasRegistryDetails =
        !!result.businessName?.trim() ||
        !!result.tradeName?.trim() ||
        !!result.address?.trim() ||
        !!result.status?.trim();

      setGstNumber(normalizedGst);
      setGstAlreadyExists(alreadyExists);

      if (alreadyExists) {
        setGstVerified(false);
        setGstDetails(result);
        applyGstDetailsFromResponse(result);
        clearFieldError("gstNumber");
        clearFieldError("gstVerification");
        showWarning(
          "This GSTIN is already registered with another seller. Please check your GSTIN and verify again.",
          "GSTIN already registered"
        );
        return;
      }

      applyGstDetailsFromResponse(result);

      if (verified) {
        setGstVerified(true);
        setGstDetails(result);
        clearFieldError("gstNumber");
        clearFieldError("gstVerification");
        showSuccess(result.message || "GST verified. Business details loaded.");
      } else if (hasRegistryDetails) {
        setGstVerified(false);
        setGstDetails(result);
        showWarning(
          "GST not fully verified",
          result.message || "Registered details were loaded, but this GSTIN could not be fully verified."
        );
      } else if (result.message?.trim()) {
        setGstVerified(false);
        setGstDetails(null);
        setGstError(result.message);
        showError(result.message);
      } else if (result.panNumber?.trim()) {
        setGstVerified(false);
        setGstDetails(result);
        showWarning(
          "Portal lookup unavailable",
          result.message || "Only PAN could be derived from your GSTIN. Configure the GST API key for full registered business details."
        );
      } else {
        setGstVerified(false);
        setGstDetails(null);
        showError(result.message || "GST verification failed.");
      }
    } catch (e) {
      setGstVerified(false);
      setGstDetails(null);
      setGstAlreadyExists(false);
      showError(getApiErrorMessage(e, "GST verification failed."));
    } finally {
      setIsVerifyingGst(false);
    }
  }, [gstNumber, gstVerified, isVerifyingGst, applyGstDetailsFromResponse, clearFieldError, showError, showSuccess, showWarning]);

  const showValidationAlert = useCallback((errors: ValidationError[]) => {
    const first = errors[0];
    if (!first) return;
    showWarning(first.message, "Cannot continue");
  }, [showWarning]);

  const scrollToField = useCallback((field: string) => {
    const fieldNode = fieldViewRefs.current[field];
    if (fieldNode) {
      scrollToFormField(scrollViewRef, scrollContentRef, fieldNode);
    } else {
      const fieldY = fieldPositions[field];
      if (fieldY !== undefined) {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, fieldY - 100), animated: true });
      }
    }
    const ref = fieldRefs[field as keyof typeof fieldRefs];
    if (ref?.current) setTimeout(() => ref.current?.focus(), 350);
  }, [fieldPositions, fieldRefs]);

  const scrollToFirstError = useCallback((errors: ValidationError[]) => {
    const first = errors[0];
    if (!first) return;
    scrollToField(first.field);
  }, [scrollToField]);

  const handleBack = () => router.push("/(main)/sellerpersonalinfo");

  const handleNext = async () => {
    const requiresGst = businessCategory === "B2B" || hasGST;
    const gstErr = requiresGst ? validateGST(gstNumber) : "";
    const panErr = validatePAN(panNumber);
    const aadhaarDigits = aadharNumber.replace(/\D/g, "");
    const aadErr =
      aadhaarDigits.length === 12
        ? validateAadhaar(aadharNumber)
        : aadhaarOnFile
          ? ""
          : validateAadhaar(aadharNumber);

    setGstError(gstErr);
    setPanError(panErr);
    setAadharError(aadErr);

    const errors: ValidationError[] = [];
    if (!businessCategory) errors.push({ field: "businessCategory", message: "Please select a business category" });
    if (!businessName.trim()) errors.push({ field: "businessName", message: "Business name is required" });
    if (!businessType) errors.push({ field: "businessType", message: "Business type is required" });
    if (!businessAddress.trim()) errors.push({ field: "businessAddress", message: "Business address is required" });
    else if (businessAddress.trim().length < 10) {
      errors.push({ field: "businessAddress", message: "Enter a complete business address" });
    }
    if (requiresGst && gstErr) errors.push({ field: "gstNumber", message: gstErr });
    if (requiresGst && gstAlreadyExists) {
      setGstVerified(false);
      showWarning(
        "This GSTIN is already registered with another seller. Please check your GSTIN and verify again.",
        "Cannot continue"
      );
      scrollToField("gstNumber");
      return;
    }
    if (requiresGst && !gstVerified) {
      errors.push({ field: "gstVerification", message: "Please verify your GST number" });
    }
    if (panErr) errors.push({ field: "panNumber", message: panErr });
    if (aadErr) errors.push({ field: "aadharNumber", message: aadErr });

    if (errors.length > 0) {
      setValidationErrors(errors);
      scrollToFirstError(errors);
      showValidationAlert(errors);
      return;
    }

    setIsLoading(true);
    try {
      await hydrateSellerSession();

      // Re-check duplicate right before save so Continue matches Verify.
      if (requiresGst) {
        const latest = await verifyGstNumber(gstNumber.trim().toUpperCase());
        const exists = isGstAlreadyExists(latest);
        setGstAlreadyExists(exists);
        if (exists) {
          setGstVerified(false);
          setGstDetails(latest);
          applyGstDetailsFromResponse(latest);
          showWarning(
            "This GSTIN is already registered with another seller. Please check your GSTIN and verify again.",
            "Cannot continue"
          );
          scrollToField("gstNumber");
          return;
        }
        if (!isGstVerifySuccessful(latest)) {
          setGstVerified(false);
          showWarning(
            latest.message || "Please verify your GSTIN again before continuing.",
            "Cannot continue"
          );
          scrollToField("gstNumber");
          return;
        }
        setGstVerified(true);
        setGstDetails(latest);
      }

      const payload = {
        businessCategory,
        businessName: businessName.trim(),
        businessType,
        address: businessAddress.trim(),
        hasGst: businessCategory === "B2B" ? true : hasGST,
        ...(businessCategory === "B2B" || hasGST
          ? {
              gstType: GST_TYPE,
              gstNumber: gstNumber.trim().toUpperCase(),
              gstVerified: true,
            }
          : {}),
        panNumber: panNumber.trim().toUpperCase(),
        ...(aadhaarDigits.length === 12
          ? { aadhaarNumber: aadhaarDigits }
          : aadhaarOnFile
            ? { aadhaarNumber: aadharNumber.trim() || "XXXX XXXX" }
            : { aadhaarNumber: aadhaarDigits }),
        ...(businessCategory !== "B2B" && !hasGST ? { gstVerified } : {}),
      } as const;

      await updateBusinessProfile(payload as any);
      await clearBusinessOnboardingDraft();
      setValidationErrors([]);
      showSuccess("Business information saved successfully.", "Saved");
      router.push({ pathname: "/(main)/selleraddressinfo", params: { businessCategory } });
    } catch (e) {
      const msg = getApiErrorMessage(e, "Could not save business information.");
      if (/already registered|already exists/i.test(msg)) {
        setGstVerified(false);
        setGstAlreadyExists(true);
        showWarning(
          "This GSTIN is already registered with another seller. Please check your GSTIN and verify again.",
          "Cannot continue"
        );
        scrollToField("gstNumber");
      } else {
        showError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} />

      {/* ── Top header gradient ── */}
      <LinearGradient
        colors={[T.navy, T.navyMid]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.topHeader}
      >
        <SafeAreaView>
          <View style={s.headerInner}>
            {/* <TouchableOpacity 
              style={s.backBtnHeader} 
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-left" size={20} color={T.white} />
            </TouchableOpacity> */}
            <View style={{ flex: 1}}>
              <AppText style={s.headerLabel}>STEP 2 OF 5</AppText>
              <AppText style={s.headerTitle}>Business Information</AppText>
              <AppText style={s.headerSub}>Tell us about your business & documents</AppText>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.progressRow}>
            {[1, 2, 3, 4, 5].map((step, i) => (
              <View key={i} style={[
                s.progressSeg,
                i === 0 && { backgroundColor: T.orange },
                i === 1 && { backgroundColor: T.orange },
                i > 1 && { backgroundColor: "rgba(255,255,255,0.2)" },
              ]} />
            ))}
          </View>
          <AppText style={s.progressLabel}>Step 2 of 5 — Business Information</AppText>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Scrollable form ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollViewRef}
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View ref={scrollContentRef} collapsable={false}>

          {/* ── 1. Business Category ── */}
          <SectionCard
            title="Business Category"
            subtitle="Choose how you'll primarily sell products"
            accentColor={T.orange}
            icon="archive"
          >
            <View style={{ flexDirection: isCompact ? "column" : "row", gap: 12 }} ref={registerFieldRef("businessCategory")} collapsable={false}>
              <CategoryCard
                title="B2C"
                desc="Sell directly to customers"
                badge="Consumer"
                selected={businessCategory === "B2C"}
                onPress={() => { setBusinessCategory("B2C"); setHasGST(false); clearFieldError("businessCategory"); }}
                accentColor={T.orange}
                iconChar="users"
              />
              <CategoryCard
                title="B2B"
                desc="Sell to other businesses"
                badge="GST required"
                selected={businessCategory === "B2B"}
                onPress={() => { setBusinessCategory("B2B"); setHasGST(true); clearFieldError("businessCategory"); }}
                accentColor={T.orange}
                iconChar="industry"
              />
            </View>
            {validationErrors.find(e => e.field === "businessCategory") && (
              <View style={s.errorRow}>
                <AppText style={s.errorText}>
                  <Icon name="exclamation-circle" size={11} color={T.error} /> {validationErrors.find(e => e.field === "businessCategory")?.message}
                </AppText>
              </View>
            )}
          </SectionCard>

          {/* ── 2. Business Details ── */}
          <SectionCard
            title="Business Details"
            subtitle="Legal name and structure of your business"
            accentColor={T.orange}
            icon="list-alt"
          >
            <StyledInput
              label="Business Name"
              required
              value={businessName}
              onChangeText={t => {
                clearFieldError("businessName");
                setBusinessName(t);
                if (!t.trim()) {
                  setValidationErrors(prev => [...prev, { field: "businessName", message: "Business name is required" }]);
                }
              }}
              placeholder="Enter your registered business name"
              error={validationErrors.find(e => e.field === "businessName")?.message}
              inputRef={fieldRefs.businessName}
              innerRef={registerFieldRef("businessName")}
              onLayout={e => handleFieldLayout("businessName", e)}
            />

            <StyledDropdown
              label="Business Type"
              required
              value={businessType}
              options={businessTypes}
              onSelect={v => { clearFieldError("businessType"); setBusinessType(v); }}
              placeholder="Select business type"
            />
            {validationErrors.find(e => e.field === "businessType") && (
              <View style={[s.errorRow, { marginTop: -10 }]}>
                <AppText style={s.errorText}>
                  <Icon name="exclamation-circle" size={11} color={T.error} /> {validationErrors.find(e => e.field === "businessType")?.message}
                </AppText>
              </View>
            )}

            <StyledInput
              label="Business Address"
              required
              multiline
              numberOfLines={4}
              autoCapitalize="sentences"
              value={businessAddress}
              onChangeText={t => {
                clearFieldError("businessAddress");
                setBusinessAddress(t);
              }}
              placeholder="Enter your registered business address"
              note="As per GST or business registration"
              error={validationErrors.find(e => e.field === "businessAddress")?.message}
              inputRef={fieldRefs.businessAddress}
              innerRef={registerFieldRef("businessAddress")}
              onLayout={e => handleFieldLayout("businessAddress", e)}
              maxLength={500}
            />
          </SectionCard>

          {/* ── 3. GST Registration ── */}
          {businessCategory !== "" && (
            <SectionCard
              title="GST Registration"
              subtitle={businessCategory === "B2B" ? "GST is mandatory for B2B sellers" : "Choose your GST status"}
              accentColor={T.orange}
              icon="file-text-o"
            >
              {businessCategory === "B2C" && (
                <View style={{ marginBottom: 4 }}>
                  <RadioPill
                    label="I have GST Registration"
                    subLabel="Enter your GSTIN below"
                    selected={hasGST}
                    onPress={() => { setHasGST(true); clearFieldError("udhyamCertificate"); }}
                  />
                  <RadioPill
                    label="I don't have GST"
                    subLabel="You can still sell on our platform"
                    selected={!hasGST}
                    onPress={() => { setHasGST(false); setGstNumber(""); setGstVerified(false); clearFieldError("gstNumber"); }}
                  />
                </View>
              )}

              {(businessCategory === "B2B" || (businessCategory === "B2C" && hasGST)) && (
                <>
                  <View style={{ marginBottom: 18 }}>
                    <FieldLabel label="GST Type" />
                    <View style={[si.wrap, { backgroundColor: "#F9FAFB" }]}>
                      <AppText style={{ fontFamily: "Poppins_500Medium", fontSize: 14, color: T.textDark }}>{GST_TYPE}</AppText>
                    </View>
                  </View>

                  <View style={{ marginBottom: 18 }} onLayout={e => handleFieldLayout("gstNumber", e)} ref={registerFieldRef("gstNumber")} collapsable={false}>
                    <FieldLabel
                      label="GST Number"
                      required
                      {...(businessCategory === "B2B" && { note: "mandatory for B2B" })}
                    />
                    <View style={[si.gstRow, isCompact && si.gstRowStacked]}>
                      <View style={si.gstInputShell}>
                        <View style={[si.wrap, {
                          borderColor: gstError ? T.error : gstVerified ? T.success : T.border,
                        }]}>
                          <TextInput
                            ref={fieldRefs.gstNumber}
                            value={gstNumber}
                            onChangeText={t => {
                              const next = t.toUpperCase();
                              setGstNumber(next);
                              const error = validateGST(next);
                              setGstError(error);
                              setGstVerified(false);
                              setGstDetails(null);
                              setGstAlreadyExists(false);
                              clearFieldError("gstNumber");
                              clearFieldError("gstVerification");
                            }}
                            onBlur={() => {
                              if (businessCategory && hasGST) setGstError(validateGST(gstNumber));
                            }}
                            placeholder="29AAAPL1234C1Z1"
                            placeholderTextColor={T.textLight}
                            style={si.input}
                            maxLength={15}
                            autoCapitalize="characters"
                          />
                          {gstVerified ? (
                            <Icon name="check" size={15} color={T.success} />
                          ) : null}
                        </View>
                      </View>
                      <Pressable
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          void handleGSTVerify();
                        }}
                        disabled={gstVerified || isVerifyingGst}
                        style={({ pressed }) => [
                          s.inlineVerifyBtn,
                          gstVerified && { backgroundColor: T.success },
                          (gstVerified || isVerifyingGst) && { opacity: 0.65 },
                          pressed && !gstVerified && !isVerifyingGst && { opacity: 0.88 },
                          { zIndex: 2, elevation: 2 },
                        ]}
                        accessibilityRole="button"
                      >
                        {isVerifyingGst ? (
                          <ActivityIndicator size="small" color={T.white} />
                        ) : (
                          <AppText style={s.inlineVerifyText}>
                            {gstVerified ? "Verified" : "Verify"}
                          </AppText>
                        )}
                      </Pressable>
                    </View>
                    {(gstError || validationErrors.find(e => e.field === "gstNumber")?.message) ? (
                      <View style={si.errorRow}>
                        <Icon name="exclamation-circle" size={11} color={T.error} />
                        <AppText style={si.errorText}>
                          {gstError || validationErrors.find(e => e.field === "gstNumber")?.message}
                        </AppText>
                      </View>
                    ) : null}
                    {validationErrors.find(e => e.field === "gstVerification") ? (
                      <View style={si.errorRow}>
                        <Icon name="exclamation-circle" size={11} color={T.error} />
                        <AppText style={si.errorText}>
                          {validationErrors.find(e => e.field === "gstVerification")?.message}
                        </AppText>
                      </View>
                    ) : null}
                    {gstDetails ? (
                      <GstVerifiedDetailsCard
                        details={gstDetails}
                        verified={gstVerified}
                        alreadyExists={gstAlreadyExists}
                      />
                    ) : null}
                  </View>
                </>
              )}
            </SectionCard>
          )}

          {/* ── 4. Identity Documents ── */}
          <SectionCard
            title="Identity Documents"
            subtitle="Required for KYC verification"
            accentColor={T.orange}
            icon="id-card"
          >
            {/* PAN */}
            <StyledInput
              label="PAN Number"
              required
              value={panNumber}
              onChangeText={t => {
                setPanNumber(t.toUpperCase());
                const error = validatePAN(t.toUpperCase());
                setPanError(error);
                clearFieldError("panNumber");
                setPanValid(error === "");
              }}
              onBlur={() => {
                const e = validatePAN(panNumber);
                setPanError(e);
                setPanValid(e === "");
              }}
              placeholder="ABCDE1234F"
              error={panError || validationErrors.find(e => e.field === "panNumber")?.message}
              isValid={panValid}
              maxLength={10}
              inputRef={fieldRefs.panNumber}
              innerRef={registerFieldRef("panNumber")}
              onLayout={e => handleFieldLayout("panNumber", e)}
            />

            {/* Aadhaar */}
            <StyledInput
              label="Aadhaar Number"
              required
              value={aadharNumber}
              onChangeText={t => {
                const f = formatAadhaar(t);
                setAadharNumber(f);
                const error = validateAadhaar(f);
                setAadharError(error);
                clearFieldError("aadharNumber");
                setAadharValid(error === "");
              }}
              onBlur={() => {
                const e = validateAadhaar(aadharNumber);
                setAadharError(e);
                setAadharValid(e === "");
              }}
              placeholder="1234 5678 9012"
              error={aadharError || validationErrors.find(e => e.field === "aadharNumber")?.message}
              isValid={aadharValid}
              maxLength={14}
              keyboardType="numeric"
              inputRef={fieldRefs.aadharNumber}
              innerRef={registerFieldRef("aadharNumber")}
              onLayout={e => handleFieldLayout("aadharNumber", e)}
            />

            {/* Aadhaar privacy note */}
            <View style={s.privacyNote}>
              <Icon name="lock" size={16} color={T.textLight} />
              <AppText style={s.privacyText}>
                Your Aadhaar data is encrypted and used only for identity verification. We never store the full number.
              </AppText>
            </View>
          </SectionCard>

          {/* ── Bottom buttons ── */}
          <View style={s.btnRow}>
            <TouchableOpacity onPress={handleBack} style={s.backBtnBottom} activeOpacity={0.85}>
              <AppText style={s.backBtnText}>Back</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNext}
              style={s.continueBtn}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[T.orange, T.orangeDeep]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.continueBtnInner}
              >
                <AppText style={s.continueBtnText}>{isLoading ? "Saving…" : "Continue"}</AppText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SweetAlertHost />
    </View>
  );
}

// ─── Root styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg, width: "100%" },

  // Header
  topHeader:    { paddingHorizontal: 20, paddingBottom: 16, minHeight: 180 },
  headerInner:  { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 10, marginBottom: 18 },
  // backBtnHeader: {
  //   width: 40,
  //   height: 40,
  //   borderRadius: 20,
  //   backgroundColor: "rgba(255,255,255,0.15)",
  //   alignItems: "center",
  //   justifyContent: "center",
  //   marginTop: 18,
  // },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginTop: 2 },
  backArrow: { color: T.white, fontSize: 18, fontWeight: "600" },
  headerLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  headerTitle: { fontSize: 18, fontFamily: fontFamilies.bold, color: T.white, marginBottom: 2 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: "400" },
  headerBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerBadgeText: { fontSize: 22 },

  // Progress
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "600" },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },

  // Error
  errorRow: { marginTop: 6, marginBottom: 4 },
  errorText: { fontSize: 12, color: T.error, fontWeight: "400" },

  inlineVerifyBtn: {
    backgroundColor: T.orange,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 72,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    flexShrink: 0,
  },
  inlineVerifyText: { fontSize: 12, fontWeight: "700", color: T.white },

  // Info strip (e.g. after PAN valid)
  infoStrip: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EFF6FF", borderRadius: 10, padding: 10, marginTop: -8, marginBottom: 16 },
  infoStripIcon: { fontSize: 13, color: "#3B82F6", marginTop: 1 },
  infoStripText: { flex: 1, fontSize: 12, color: "#1E40AF", fontWeight: "500", lineHeight: 17 },

  // Privacy note
  privacyNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: T.navyPale, borderRadius: 10, padding: 12, marginTop: -4 },
  privacyIcon: { fontSize: 14, marginTop: 1 },
  privacyText: { flex: 1, fontSize: 12, color: T.textSoft, lineHeight: 17 },

  // Bottom buttons
  btnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  backBtnBottom: {
    flex: 1, height: 52, borderRadius: 14, borderWidth: 2,
    borderColor: T.navy, alignItems: "center", justifyContent: "center",
    backgroundColor: T.cardBg,
  },
  backBtnText: { fontSize: 15, fontWeight: "700", color: T.navy },
  continueBtn: { flex: 2, borderRadius: 14, overflow: "hidden" },
  continueBtnInner: { height: 52, alignItems: "center", justifyContent: "center" },
  continueBtnText: { fontSize: 15, fontWeight: "700", color: T.white, letterSpacing: 0.3 },
});