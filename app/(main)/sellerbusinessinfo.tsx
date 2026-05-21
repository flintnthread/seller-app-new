/**
 * Seller Business Info - Screen 2 of 5
 * Navy blue & orange premium onboarding UI
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  type LayoutChangeEvent,
} from "react-native";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/FontAwesome";
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

// ─── Field wrapper with label ────────────────────────────────
const FieldLabel: React.FC<{ label: string; required?: boolean; note?: string }> = ({ label, required, note }) => (
  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 6 }}>
    <AppText style={fl.label}>{label}</AppText>
    {required && <AppText style={fl.requiredText}>*</AppText>}
    {note && <AppText style={fl.note}>{note}</AppText>}
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
  rightElement?: React.ReactNode;
}> = ({
  label, value, onChangeText, placeholder, error,
  isValid, maxLength, keyboardType, required, note,
  onBlur, inputRef, onLayout, rightElement,
}) => {
    const [focused, setFocused] = useState(false);
    const borderColor = error ? T.error : isValid ? T.success : focused ? T.orange : T.border;

    return (
      <View style={{ marginBottom: 18 }} onLayout={onLayout}>
        <FieldLabel label={label} {...(required !== undefined && { required })} {...(note !== undefined && { note })} />
        <View style={[si.wrap, { borderColor }]}>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={T.textLight}
            style={si.input}
            maxLength={maxLength}
            keyboardType={keyboardType || "default"}
            autoCapitalize="characters"
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onBlur?.(); }}
          />
          {rightElement && <View style={si.right}>{rightElement}</View>}
          {isValid && !rightElement && (
            <Icon name="check" size={15} color={T.success} />
          )}
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
    paddingHorizontal: 14, height: 52, overflow: "hidden",
  },
  input: { flex: 1, fontSize: 12, color: T.textDark, fontWeight: "400" },
  right: { marginLeft: 8 },
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
        <Icon name="chevron-down" size={14} color={T.textSoft} style={open && { transform: [{ rotate: "180deg" }] }} />
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
  const scrollViewRef = useRef<ScrollView>(null);

  const [businessCategory, setBusinessCategory] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [hasGST, setHasGST] = useState(false);
  const [gstType, setGstType] = useState("Regular");
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

  const businessTypes = ["Sole Proprietorship", "Partnership", "Private Limited", "Public Limited", "LLP"];
  const gstTypes = ["Regular", "Composition", "Consumer"];

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

  const fieldRefs = {
    businessName: useRef<TextInput | null>(null),
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

  const handleGSTVerify = useCallback(() => {
    const err = validateGST(gstNumber);
    if (err) { setGstError(err); return; }
    setIsLoading(true);
    setTimeout(() => { setGstVerified(true); setIsLoading(false); clearFieldError("gstNumber"); }, 1800);
  }, [gstNumber]);

  const handleBack = () => router.back();

  const handleNext = () => {
    const gstErr = businessCategory && hasGST ? validateGST(gstNumber) : "";
    const panErr = validatePAN(panNumber);
    const aadErr = validateAadhaar(aadharNumber);

    setGstError(gstErr);
    setPanError(panErr);
    setAadharError(aadErr);

    const errors: ValidationError[] = [];
    if (!businessCategory) errors.push({ field: "businessCategory", message: "Please select a business category" });
    if (!businessName.trim()) errors.push({ field: "businessName", message: "Business name is required" });
    if (!businessType) errors.push({ field: "businessType", message: "Business type is required" });
    if (businessCategory && hasGST && gstErr) errors.push({ field: "gstNumber", message: gstErr });
    if (businessCategory && hasGST && !gstVerified) errors.push({ field: "gstVerification", message: "Please verify your GST number" });
    if (panErr) errors.push({ field: "panNumber", message: panErr });
    if (aadErr) errors.push({ field: "aadharNumber", message: aadErr });

    if (errors.length > 0) { setValidationErrors(errors); return; }
    setValidationErrors([]);
    router.push({ pathname: "/selleraddressinfo", params: { businessCategory } });
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
            <TouchableOpacity 
              style={s.backBtnHeader} 
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-left" size={20} color={T.white} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginTop: 18 }}>
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

          {/* ── 1. Business Category ── */}
          <SectionCard
            title="Business Category"
            subtitle="Choose how you'll primarily sell products"
            accentColor={T.orange}
            icon="archive"
          >
            <View style={{ flexDirection: "row", gap: 12 }}>
              <CategoryCard
                title="B2C"
                desc="Sell directly to end customers"
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
                  <StyledDropdown
                    label="GST Type"
                    value={gstType}
                    options={gstTypes}
                    onSelect={setGstType}
                    placeholder="Select GST type"
                  />

                  <View style={{ marginBottom: 18 }}>
                    <FieldLabel
                      label="GST Number"
                      required={true}
                      {...(businessCategory === "B2B" && { note: "mandatory for B2B" })}
                    />
                    <View style={[si.wrap, {
                      borderColor: gstError ? T.error : gstVerified ? T.success : T.border,
                    }]}>
                      <TextInput
                        ref={fieldRefs.gstNumber}
                        value={gstNumber}
                        onChangeText={t => {
                          setGstNumber(t.toUpperCase());
                          const error = validateGST(t.toUpperCase());
                          setGstError(error);
                          setGstVerified(false);
                          clearFieldError("gstNumber");
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
                      {/* Verify button inline */}
                      <TouchableOpacity
                        onPress={handleGSTVerify}
                        disabled={gstVerified || !!validateGST(gstNumber)}
                        style={[s.inlineVerifyBtn, gstVerified && { backgroundColor: T.success }]}
                        activeOpacity={0.85}
                      >
                        <AppText style={s.inlineVerifyText}>
                          {isLoading ? "Verify" : gstVerified ? "Verified" : "Verify"}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                    {(gstError || validationErrors.find(e => e.field === "gstNumber")?.message) && (
                      <View style={si.errorRow}>
                        <Icon name="exclamation-circle" size={11} color={T.error} />
                        <AppText style={si.errorText}>{gstError || validationErrors.find(e => e.field === "gstNumber")?.message}</AppText>
                      </View>
                    )}
                    {validationErrors.find(e => e.field === "gstVerification") && (
                      <View style={si.errorRow}>
                        <Icon name="exclamation-circle" size={11} color={T.error} />
                        <AppText style={si.errorText}>{validationErrors.find(e => e.field === "gstVerification")?.message}</AppText>
                      </View>
                    )}
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
                <AppText style={s.continueBtnText}>Continue</AppText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Root styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  // Header
  topHeader:    { paddingHorizontal: 20, height: 200 },
  headerInner:  { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 10, marginBottom: 18 },
  backBtnHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
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

  // Inline verify button (inside GST input)
  inlineVerifyBtn: {
    backgroundColor: T.orange, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, marginLeft: 6, minWidth: 60,
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
