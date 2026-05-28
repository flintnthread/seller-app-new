/**
 * Seller Address Info - Screen 3 of 5
 * Pixel-perfect match to Screen 1 — navy & orange premium onboarding
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
  TextInput,
  type LayoutChangeEvent,
  type KeyboardTypeOptions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import Icon from "react-native-vector-icons/FontAwesome";
import { Checkbox } from "./_sellerComponents";
import { fontFamilies } from "@/constants/fonts";

// ─── Design tokens — identical to Screen 1 ───────────────────
const T = {
  navy:        "#0F1F4B",
  navyMid:     "#1A2F6A",
  navyLight:   "#243580",
  navySoft:    "#E8ECF8",
  navyPale:    "#F0F3FB",

  orange:      "#F97316",
  orangeDeep:  "#EA6C0A",
  orangeLight: "#FB923C",
  orangePale:  "#FFF4EC",
  orangeSoft:  "#FDE8D4",

  white:       "#FFFFFF",
  bg:          "#F4F6FB",
  cardBg:      "#FFFFFF",
  border:      "#DDE3F0",
  borderLight: "#EEF1F9",
  divider:     "#E5EAF5",

  textDark:    "#0A1533",
  textMid:     "#3A4A72",
  textSoft:    "#6B7A9E",
  textLight:   "#9BA8C5",

  success:     "#16A34A",
  error:       "#DC2626",
};

// ─── SectionCard — exact copy from Screen 1 ──────────────────
const SectionCard: React.FC<{
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  accentColor?: string;
  iconName?: string;
}> = ({ children, title, subtitle, accentColor = T.navy, iconName }) => (
  <View style={scard.card}>
    <View style={[scard.topBar, { backgroundColor: accentColor }]} />
    <View style={scard.inner}>
      <View style={scard.titleRow}>
        {iconName && (
          <View style={[scard.iconBox, { backgroundColor: accentColor + "15" }]}>
            <Icon name={iconName} size={16} color={accentColor} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={scard.title}>{title}</Text>
          {subtitle && <Text style={scard.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {children}
    </View>
  </View>
);
const scard = StyleSheet.create({
  card: {
    backgroundColor: T.cardBg,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.borderLight,
    shadowColor: T.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  topBar:   { height: 4 },
  inner:    { padding: 18 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  iconBox:  { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title:    { fontSize: 15, fontWeight: "700", color: T.textDark, marginBottom: 2 },
  subtitle: { fontSize: 12, color: T.textSoft, lineHeight: 17 },
});

// ─── InputRow — Screen 1 field style (label + input) ──
const InputRow: React.FC<{
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions | undefined;
  inputRef?: React.RefObject<TextInput | null> | undefined;
  error?: string | undefined;
  onLayout?: ((e: LayoutChangeEvent) => void) | undefined;
  maxLength?: number | undefined;
  borderColor?: string | undefined;
  accentColor?: string | undefined;
}> = ({
  label, value, onChangeText, placeholder,
  keyboardType = "default",
  inputRef, error, onLayout, maxLength, borderColor = T.border, accentColor = T.navy,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
  <View style={inp.wrap} onLayout={onLayout}>
    {/* Label — exact Screen 1 style: 11px, weight 700, uppercase, letterSpacing 0.8 */}
    <Text style={inp.label}>
      {label} <Text style={[inp.asterisk, { color: accentColor }]}>*</Text>
    </Text>
    <View style={[inp.field, { borderColor: error ? T.error : (isFocused ? borderColor : T.border) }, error ? inp.fieldError : null]}>
      <TextInput
        ref={inputRef}
        style={inp.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.textLight}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCorrect={false}
        autoCapitalize="none"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
    {error && (
      <View style={inp.errorRow}>
        <Icon name="exclamation-circle" size={11} color={T.error} />
        <Text style={inp.errorText}>{error}</Text>
      </View>
    )}
  </View>
  );
};
const inp = StyleSheet.create({
  wrap:       { marginBottom: 14 },
  /* Label — Screen 1 rf.label identical */
  label:      { fontSize: 11, fontWeight: "700", color: T.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  asterisk:   { fontSize: 11, fontWeight: "700" },
  /* Field container — Screen 1 rf.field identical */
  field:      {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: T.white, borderRadius: 12, borderWidth: 1.5,
    borderColor: T.border, paddingHorizontal: 14, height: 52,
  },
  fieldError: { borderColor: T.error },
  input:      { flex: 1, fontSize: 13, color: T.textDark, fontWeight: "400" },
  /* Error row */
  errorRow:   { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5, marginLeft: 2 },
  errorText:  { fontSize: 11, color: T.error, fontWeight: "400", flex: 1 },
});

// ─── InfoBanner — exact Screen 1 infoBanner ──────────────────
const InfoBanner: React.FC<{ text: string; iconName?: string; color?: string }> = ({
  text, iconName = "info-circle", color = T.navy,
}) => (
  <View style={[ib.wrap, { borderColor: color + "20", backgroundColor: color === T.navy ? T.navyPale : T.orangePale }]}>
    <Icon name={iconName} size={14} color={color} />
    <Text style={[ib.text, { color: color === T.navy ? T.textMid : T.orangeDeep }]}>{text}</Text>
  </View>
);
const ib = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1,
  },
  text: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "500" },
});

interface ValidationError { field: string; message: string; }

// ─── Web-only: InputPairRow renders 2 inputs side-by-side on web, stacked on mobile ──
const isWeb = Platform.OS === "web";

const InputPairRow: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  isWeb ? (
    <View style={pair.row}>{children}</View>
  ) : (
    <>{children}</>
  );

const pair = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
});

// ─── Main screen ─────────────────────────────────────────────
export default function SellerAddressInfo() {
  const router = useRouter();
  const { businessCategory } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  // ── State (100% unchanged) ──
  const [streetAddress, setStreetAddress]         = useState("");
  const [landmark, setLandmark]                   = useState("");
  const [city, setCity]                           = useState("");
  const [state, setState]                         = useState("");
  const [country, setCountry]                     = useState("");
  const [pincode, setPincode]                     = useState("");
  const [warehouse, setWarehouse]                 = useState(false);
  const [warehouseAddress, setWarehouseAddress]   = useState("");
  const [warehouseLandmark, setWarehouseLandmark] = useState("");
  const [warehouseCity, setWarehouseCity]         = useState("");
  const [warehouseState, setWarehouseState]       = useState("");
  const [warehouseCountry, setWarehouseCountry]   = useState("");
  const [warehousePincode, setWarehousePincode]   = useState("");
  const [validationErrors, setValidationErrors]   = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading]                 = useState(false);
  const [fieldPositions, setFieldPositions]       = useState<Record<string, number>>({});

  // ── Logic (100% unchanged) ──
  const fieldRefs = {
    streetAddress:    useRef<TextInput>(null),
    city:             useRef<TextInput>(null),
    state:            useRef<TextInput>(null),
    pincode:          useRef<TextInput>(null),
    warehouseAddress: useRef<TextInput>(null),
    warehouseCity:    useRef<TextInput>(null),
    warehouseState:   useRef<TextInput>(null),
    warehousePincode: useRef<TextInput>(null),
  };

  const handleFieldLayout = useCallback((fieldName: string, event: LayoutChangeEvent) => {
    const { y } = event.nativeEvent.layout;
    setFieldPositions(prev => ({ ...prev, [fieldName]: y }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  }, []);

  const handlePincodeChange = (text: string, isWarehouse: boolean = false) => {
    const fieldName = isWarehouse ? "warehousePincode" : "pincode";
    clearFieldError(fieldName);
    if (/^\d{6}$/.test(text)) setValidationErrors(prev => prev.filter(e => e.field !== fieldName));
    if (isWarehouse) setWarehousePincode(text);
    else setPincode(text);
  };

  const validatePincode = (p: string) => /^\d{6}$/.test(p);

  const validations = {
    streetAddress:    streetAddress.trim().length > 0,
    landmark:         landmark.trim().length > 0,
    city:             city.trim().length > 0,
    state:            state.trim().length > 0,
    country:          country.trim().length > 0,
    pincode:          validatePincode(pincode),
    warehouseAddress: warehouse ? warehouseAddress.trim().length > 0 : true,
    warehouseLandmark:warehouse ? warehouseLandmark.trim().length > 0 : true,
    warehouseCity:    warehouse ? warehouseCity.trim().length > 0 : true,
    warehouseState:   warehouse ? warehouseState.trim().length > 0 : true,
    warehouseCountry: warehouse ? warehouseCountry.trim().length > 0 : true,
    warehousePincode: warehouse ? validatePincode(warehousePincode) : true,
  };

  const scrollToFirstError = useCallback(() => {
    const firstError = [
      { field: "streetAddress",    ref: fieldRefs.streetAddress,    valid: validations.streetAddress },
      { field: "city",             ref: fieldRefs.city,             valid: validations.city },
      { field: "state",            ref: fieldRefs.state,            valid: validations.state },
      { field: "pincode",          ref: fieldRefs.pincode,          valid: validations.pincode },
      { field: "warehouseAddress", ref: fieldRefs.warehouseAddress, valid: validations.warehouseAddress },
      { field: "warehouseCity",    ref: fieldRefs.warehouseCity,    valid: validations.warehouseCity },
      { field: "warehouseState",   ref: fieldRefs.warehouseState,   valid: validations.warehouseState },
      { field: "warehousePincode", ref: fieldRefs.warehousePincode, valid: validations.warehousePincode },
    ].find(f => !f.valid);
    if (firstError?.ref?.current) {
      firstError.ref.current?.focus();
      const fieldY = fieldPositions[firstError.field];
      scrollViewRef.current?.scrollTo({ y: Math.max(0, (fieldY ?? 0) - 100), animated: true });
    }
  }, [validations, fieldRefs, fieldPositions]);

  const handleBack = () => router.push("/(main)/sellerbusinessinfo");

  const handleNext = () => {
    const errors: ValidationError[] = [];
    if (!validations.streetAddress)    errors.push({ field: "streetAddress",    message: "Street address is required" });
    if (!validations.landmark)         errors.push({ field: "landmark",         message: "Landmark is required" });
    if (!validations.city)             errors.push({ field: "city",             message: "City is required" });
    if (!validations.state)            errors.push({ field: "state",            message: "State is required" });
    if (!validations.country)          errors.push({ field: "country",          message: "Country is required" });
    if (!validations.pincode)          errors.push({ field: "pincode",          message: "Pincode is required" });
    if (warehouse) {
      if (!validations.warehouseAddress)  errors.push({ field: "warehouseAddress",  message: "Street address is required" });
      if (!validations.warehouseLandmark) errors.push({ field: "warehouseLandmark", message: "Landmark is required" });
      if (!validations.warehouseCity)     errors.push({ field: "warehouseCity",     message: "City is required" });
      if (!validations.warehouseState)    errors.push({ field: "warehouseState",    message: "State is required" });
      if (!validations.warehouseCountry)  errors.push({ field: "warehouseCountry",  message: "Country is required" });
      if (!validations.warehousePincode)  errors.push({ field: "warehousePincode",  message: "Pincode is required" });
    }
    if (errors.length > 0) { setValidationErrors(errors); scrollToFirstError(); return; }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push({ pathname: "/(main)/sellerbanking", params: { businessCategory } });
    }, 1000);
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} />

      {/* ── Top gradient header — exact Screen 1 structure ── */}
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
              {/* Screen 1: 10px 700 uppercase 1.5 letterSpacing, rgba white 0.55 */}
              <Text style={s.headerLabel}>STEP 3 OF 5</Text>
              {/* Screen 1: 18px 800 white */}
              <Text style={s.headerTitle}>Address Details</Text>
              {/* Screen 1: 12px rgba white 0.65 */}
              <Text style={s.headerSub}>Add your pickup & warehouse address</Text>
            </View>
          </View>

          {/* Progress segments — Screen 1 identical */}
          <View style={s.progressRow}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={[
                s.progressSeg,
                i < 3
                  ? { backgroundColor: T.orange }
                  : { backgroundColor: "rgba(255,255,255,0.2)" },
              ]} />
            ))}
          </View>
          {/* Screen 1: 11px rgba white 0.5 weight 600 */}
          <Text style={s.progressLabel}>Step 3 of 5 — Address Details</Text>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Scrollable body ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          ref={scrollViewRef}
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Business Address card ── */}
          <SectionCard
            title="Business Address"
            subtitle="These details are used to collect orders from your location"
            accentColor={T.orange}
            iconName="map-marker"
          >
            {/* Info banner — exact Screen 1 infoBanner */}
            <InfoBanner
              text="Your primary address is used as the default pickup point for all orders."
              iconName="info-circle"
              color={T.orange}
            />

            {/* Street Address + Landmark: side-by-side on web, stacked on mobile */}
            <InputPairRow>
              <View style={isWeb ? { flex: 1 } : {}}>
                <InputRow
                  label="Street Address"
                  value={streetAddress}
                  onChangeText={(t) => { clearFieldError("streetAddress"); setStreetAddress(t); }}
                  placeholder="Enter your street address"
                  inputRef={fieldRefs.streetAddress}
                  error={validationErrors.find(e => e.field === "streetAddress")?.message}
                  onLayout={(e) => handleFieldLayout("streetAddress", e)}
                  borderColor={T.orange}
                  accentColor={T.orange}
                />
              </View>
              <View style={isWeb ? { flex: 1 } : {}}>
                <InputRow
                  label="Landmark"
                  value={landmark}
                  onChangeText={(t) => { clearFieldError("landmark"); setLandmark(t); }}
                  placeholder="Enter nearby landmark"
                  error={validationErrors.find(e => e.field === "landmark")?.message}
                  onLayout={(e) => handleFieldLayout("landmark", e)}
                  borderColor={T.orange}
                  accentColor={T.orange}
                />
              </View>
            </InputPairRow>

            {/* City + State row */}
            <View style={s.row}>
              <View style={s.half}>
                <InputRow
                  label="City"
                  value={city}
                  onChangeText={(t) => { clearFieldError("city"); setCity(t); }}
                  placeholder="City"
                  inputRef={fieldRefs.city}
                  error={validationErrors.find(e => e.field === "city")?.message}
                  onLayout={(e) => handleFieldLayout("city", e)}
                  borderColor={T.orange}
                  accentColor={T.orange}
                />
              </View>
              <View style={s.half}>
                <InputRow
                  label="State"
                  value={state}
                  onChangeText={(t) => { clearFieldError("state"); setState(t); }}
                  placeholder="State"
                  inputRef={fieldRefs.state}
                  error={validationErrors.find(e => e.field === "state")?.message}
                  onLayout={(e) => handleFieldLayout("state", e)}
                  borderColor={T.orange}
                  accentColor={T.orange}
                />
              </View>
            </View>

            {/* Country + Pincode row */}
            <View style={s.row}>
              <View style={s.half}>
                <InputRow
                  label="Country"
                  value={country}
                  onChangeText={(t) => { clearFieldError("country"); setCountry(t); }}
                  placeholder="Country"
                  error={validationErrors.find(e => e.field === "country")?.message}
                  borderColor={T.orange}
                  accentColor={T.orange}
                />
              </View>
              <View style={s.half}>
                <InputRow
                  label="Pincode"
                  value={pincode}
                  onChangeText={(t) => handlePincodeChange(t, false)}
                  placeholder="6-digit pincode"
                  keyboardType="numeric"
                  inputRef={fieldRefs.pincode}
                  maxLength={6}
                  error={validationErrors.find(e => e.field === "pincode")?.message}
                  onLayout={(e) => handleFieldLayout("pincode", e)}
                  borderColor={T.orange}
                  accentColor={T.orange}
                />
              </View>
            </View>

            {/* Warehouse Checkbox */}
            <Checkbox
              checked={warehouse}
              onToggle={() => setWarehouse(!warehouse)}
              label="My warehouse address is different from pickup address"
              accentColor={T.orange}
            />
          </SectionCard>

          {/* ── Warehouse Address card — only when toggled ── */}
          {warehouse && (
            <SectionCard
              title="Warehouse Address"
              subtitle="Used for dispatch management and shipping logistics"
              accentColor={T.navy}
              iconName="truck"
            >
              <InfoBanner
                text="Warehouse address is used for order dispatch and inventory management."
                iconName="exclamation-circle"
                color={T.navy}
              />

              {/* Warehouse Street Address + Landmark: side-by-side on web, stacked on mobile */}
              <InputPairRow>
                <View style={isWeb ? { flex: 1 } : {}}>
                  <InputRow
                    label="Street Address"
                    value={warehouseAddress}
                    onChangeText={(t) => { clearFieldError("warehouseAddress"); setWarehouseAddress(t); }}
                    placeholder="Enter warehouse street address"
                    error={validationErrors.find(e => e.field === "warehouseAddress")?.message}
                    borderColor={T.navy}
                    accentColor={T.navy}
                  />
                </View>
                <View style={isWeb ? { flex: 1 } : {}}>
                  <InputRow
                    label="Landmark"
                    value={warehouseLandmark}
                    onChangeText={(t) => { clearFieldError("warehouseLandmark"); setWarehouseLandmark(t); }}
                    placeholder="Enter nearby landmark"
                    error={validationErrors.find(e => e.field === "warehouseLandmark")?.message}
                    borderColor={T.navy}
                    accentColor={T.navy}
                  />
                </View>
              </InputPairRow>

              <View style={s.row}>
                <View style={s.half}>
                  <InputRow
                    label="City"
                    value={warehouseCity}
                    onChangeText={(t) => { clearFieldError("warehouseCity"); setWarehouseCity(t); }}
                    placeholder="City"
                    inputRef={fieldRefs.warehouseCity}
                    error={validationErrors.find(e => e.field === "warehouseCity")?.message}
                    onLayout={(e) => handleFieldLayout("warehouseCity", e)}
                    borderColor={T.navy}
                    accentColor={T.navy}
                  />
                </View>
                <View style={s.half}>
                  <InputRow
                    label="State"
                    value={warehouseState}
                    onChangeText={(t) => { clearFieldError("warehouseState"); setWarehouseState(t); }}
                    placeholder="State"
                    inputRef={fieldRefs.warehouseState}
                    error={validationErrors.find(e => e.field === "warehouseState")?.message}
                    onLayout={(e) => handleFieldLayout("warehouseState", e)}
                    borderColor={T.navy}
                    accentColor={T.navy}
                  />
                </View>
              </View>

              <View style={s.row}>
                <View style={s.half}>
                  <InputRow
                    label="Country"
                    value={warehouseCountry}
                    onChangeText={(t) => { clearFieldError("warehouseCountry"); setWarehouseCountry(t); }}
                    placeholder="Country"
                    error={validationErrors.find(e => e.field === "warehouseCountry")?.message}
                    borderColor={T.navy}
                    accentColor={T.navy}
                  />
                </View>
                <View style={s.half}>
                  <InputRow
                    label="Pincode"
                    value={warehousePincode}
                    onChangeText={(t) => handlePincodeChange(t, true)}
                    placeholder="6-digit pincode"
                    keyboardType="numeric"
                    inputRef={fieldRefs.warehousePincode}
                    maxLength={6}
                    error={validationErrors.find(e => e.field === "warehousePincode")?.message}
                    onLayout={(e) => handleFieldLayout("warehousePincode", e)}
                    borderColor={T.navy}
                    accentColor={T.navy}
                  />
                </View>
              </View>
            </SectionCard>
          )}

          {/* ── Buttons — exact Screen 1 pattern ── */}
          <View style={s.buttonRow}>

            {/* Back — navy outline, exact Screen 1 backBtn */}
            <TouchableOpacity onPress={handleBack} style={s.backBtn} activeOpacity={0.85}>
              <View style={s.backBtnInner}>
                <Text style={s.backBtnText}>Back</Text>
              </View>
            </TouchableOpacity>

            {/* Continue — orange LinearGradient, exact Screen 1 continueBtn */}
            <TouchableOpacity onPress={handleNext} style={s.continueBtn} activeOpacity={0.85}>
              <LinearGradient
                colors={[T.orange, T.orangeDeep]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.continueBtnInner}
              >
                <Text style={s.continueBtnText}>
                  {isLoading ? "Continue" : "Continue"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles — mirrors Screen 1 exactly ───────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  // ── Header — exact Screen 1 ──
  topHeader:    { paddingHorizontal: 20, height: 200 },
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
    headerLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
    headerTitle: { fontSize: 18, fontFamily: fontFamilies.bold, color: T.white, marginBottom: 2 },
    headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: "400" },
    headerBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
    headerBadgeText: { fontSize: 22 },

  // ── Progress — exact Screen 1 ──
  progressRow:   { flexDirection: "row", gap: 6, marginBottom: 7 },
  progressSeg:   { flex: 1, height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "600" },

  // ── Scroll ──
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },

  // ── Form layout ──
  row:  { flexDirection: "row", gap: 10 },
  half: { flex: 1 },


  // ── What's Next — exact Screen 1 ──

  // ── Buttons — exact Screen 1 ──
  buttonRow:        { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 16},

  // Back — navy outline
  backBtn:          { flex: 1, borderRadius: 14, borderWidth: 2, borderColor: T.navy, overflow: "hidden" },
  backBtnInner:     { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: T.white, borderRadius: 12 },
  backBtnText:      { fontSize: 15, fontWeight: "700", color: T.navy },

  // Continue — orange gradient, exact Screen 1
  continueBtn:      { flex: 2},
  continueBtnInner: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14 },
  // Screen 1: 16px 800 white letterSpacing 0.2
  continueBtnText:  { fontSize: 16, fontWeight: "700", color: T.white, letterSpacing: 0.2 },
});