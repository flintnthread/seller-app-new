/**
 * Seller Address Info - Screen 3 of 5
 * Pixel-perfect match to Screen 1 — navy & orange premium onboarding
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
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
import { Checkbox } from "@/lib/seller/sellerComponents";
import { fontFamilies } from "@/constants/fonts";
import { useSweetAlert } from "@/components/common/SweetAlert";
import { hydrateSellerSession } from "@/lib/api/sellerSession";
import {
  fetchSellerProfile,
  getApiErrorMessage,
  updateAddressProfile,
  type SellerProfileResponse,
} from "@/services/sellerProfileApi";
import {
  AddressLocationFields,
  EMPTY_ADDRESS_LOCATION,
  type AddressLocationErrors,
} from "@/components/seller/AddressLocationFields";
import type { AddressLocationValue } from "@/services/locationApi";
import { scrollToFormField } from "@/lib/form/scrollToFormField";

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
    overflow: Platform.OS === "web" ? "visible" : "hidden",
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
  innerRef?: (node: View | null) => void;
}> = ({
  label, value, onChangeText, placeholder,
  keyboardType = "default",
  inputRef, error, onLayout, maxLength, borderColor = T.border, accentColor = T.navy,
  innerRef,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
  <View style={inp.wrap} onLayout={onLayout} ref={innerRef} collapsable={false}>
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

/** Only restore fields after the user explicitly saved the full address step (not GST/business leftovers). */
function hasSavedAddressStep(a: SellerProfileResponse["address"]): boolean {
  return Boolean(
    a.streetAddress?.trim() &&
      a.landmark?.trim() &&
      a.country?.trim() &&
      a.state?.trim() &&
      a.city?.trim() &&
      a.area?.trim() &&
      a.pincode?.trim()
  );
}

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
  const { businessCategory: businessCategoryParam } = useLocalSearchParams();
  const businessCategory = typeof businessCategoryParam === "string" ? businessCategoryParam : "";
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const fieldViewRefs = useRef<Record<string, View | null>>({});
  const { showError, showWarning, SweetAlertHost } = useSweetAlert();

  const registerFieldRef = useCallback(
    (field: string) => (node: View | null) => {
      fieldViewRefs.current[field] = node;
    },
    []
  );

  // ── State (100% unchanged) ──
  const [streetAddress, setStreetAddress]         = useState("");
  const [landmark, setLandmark]                   = useState("");
  const [location, setLocation]                   = useState<AddressLocationValue>(EMPTY_ADDRESS_LOCATION);
  const [warehouse, setWarehouse]                 = useState(false);
  const [warehouseAddress, setWarehouseAddress]   = useState("");
  const [warehouseLandmark, setWarehouseLandmark] = useState("");
  const [warehouseLocation, setWarehouseLocation] = useState<AddressLocationValue>(EMPTY_ADDRESS_LOCATION);
  const [validationErrors, setValidationErrors]   = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading]                 = useState(false);
  const [fieldPositions, setFieldPositions]       = useState<Record<string, number>>({});

  const syncWarehouseFromBusiness = useCallback(() => {
    setWarehouseAddress(streetAddress);
    setWarehouseLandmark(landmark);
    setWarehouseLocation({ ...location });
  }, [streetAddress, landmark, location]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await hydrateSellerSession();
        const profile = await fetchSellerProfile();
        if (!active) return;
        const a = profile.address;

        if (hasSavedAddressStep(a)) {
          setStreetAddress(a.streetAddress!.trim());
          setLandmark(a.landmark!.trim());
          setLocation({
            country: a.country!.trim(),
            state: a.state!.trim(),
            city: a.city!.trim(),
            area: a.area!.trim(),
            pincode: a.pincode!.trim(),
          });
          if (a.warehouseDifferent) {
            setWarehouse(true);
            if (a.warehouseAddress) setWarehouseAddress(a.warehouseAddress);
            if (a.warehouseLandmark) setWarehouseLandmark(a.warehouseLandmark);
            setWarehouseLocation({
              country: a.warehouseCountry ?? "",
              state: a.warehouseState ?? "",
              city: a.warehouseCity ?? "",
              area: a.warehouseArea ?? "",
              pincode: a.warehousePincode ?? "",
            });
          }
        }
      } catch {
        // keep form as-is
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (warehouse) return;
    syncWarehouseFromBusiness();
  }, [warehouse, syncWarehouseFromBusiness]);

  // ── Logic (100% unchanged) ──
  const fieldRefs = {
    streetAddress: useRef<TextInput>(null),
    landmark: useRef<TextInput>(null),
    warehouseAddress: useRef<TextInput>(null),
    warehouseLandmark: useRef<TextInput>(null),
  };

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
      if (fieldY != null) {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, fieldY - 100), animated: true });
      }
    }
    if (field === "streetAddress") setTimeout(() => fieldRefs.streetAddress.current?.focus(), 350);
    else if (field === "landmark") setTimeout(() => fieldRefs.landmark.current?.focus(), 350);
    else if (field === "warehouseAddress") setTimeout(() => fieldRefs.warehouseAddress.current?.focus(), 350);
    else if (field === "warehouseLandmark") setTimeout(() => fieldRefs.warehouseLandmark.current?.focus(), 350);
  }, [fieldPositions, fieldRefs]);

  const handleFieldLayout = useCallback((fieldName: string, event: LayoutChangeEvent) => {
    const { y } = event.nativeEvent.layout;
    setFieldPositions(prev => ({ ...prev, [fieldName]: y }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  }, []);

  const validatePincode = (p: string) => /^\d{6}$/.test(p);

  const locationErrors = validationErrors.reduce<AddressLocationErrors>((acc, err) => {
    if (["country", "state", "city", "area", "pincode"].includes(err.field)) {
      acc[err.field as keyof AddressLocationValue] = err.message;
    }
    return acc;
  }, {});

  const warehouseLocationErrors = validationErrors.reduce<AddressLocationErrors>((acc, err) => {
    const map: Record<string, keyof AddressLocationValue> = {
      warehouseCountry: "country",
      warehouseState: "state",
      warehouseCity: "city",
      warehouseArea: "area",
      warehousePincode: "pincode",
    };
    const key = map[err.field];
    if (key) acc[key] = err.message;
    return acc;
  }, {});

  const validations = {
    streetAddress: streetAddress.trim().length > 0,
    landmark: landmark.trim().length > 0,
    city: location.city.trim().length > 0,
    state: location.state.trim().length > 0,
    area: location.area.trim().length > 0,
    country: location.country.trim().length > 0,
    pincode: validatePincode(location.pincode),
    warehouseAddress: warehouse ? warehouseAddress.trim().length > 0 : true,
    warehouseLandmark: warehouse ? warehouseLandmark.trim().length > 0 : true,
    warehouseCity: warehouse ? warehouseLocation.city.trim().length > 0 : true,
    warehouseState: warehouse ? warehouseLocation.state.trim().length > 0 : true,
    warehouseArea: warehouse ? warehouseLocation.area.trim().length > 0 : true,
    warehouseCountry: warehouse ? warehouseLocation.country.trim().length > 0 : true,
    warehousePincode: warehouse ? validatePincode(warehouseLocation.pincode) : true,
  };

  const scrollToFirstError = useCallback((errors: ValidationError[]) => {
    const first = errors[0];
    if (!first) return;
    scrollToField(first.field);
  }, [scrollToField]);

  const handleBack = () => router.push("/(main)/sellerbusinessinfo");

  const handleNext = async () => {
    const errors: ValidationError[] = [];
    if (!validations.streetAddress) errors.push({ field: "streetAddress", message: "Street address is required" });
    if (!validations.landmark) errors.push({ field: "landmark", message: "Landmark is required" });
    if (!validations.country) errors.push({ field: "country", message: "Country is required" });
    if (!validations.state) errors.push({ field: "state", message: "State is required" });
    if (!validations.city) errors.push({ field: "city", message: "City is required" });
    if (!validations.area) errors.push({ field: "area", message: "Area is required" });
    if (!location.pincode.trim()) {
      errors.push({ field: "pincode", message: "Pincode is required" });
    } else if (!validatePincode(location.pincode)) {
      errors.push({ field: "pincode", message: "Enter a valid 6-digit pincode" });
    }
    if (warehouse) {
      if (!validations.warehouseAddress) errors.push({ field: "warehouseAddress", message: "Warehouse street address is required" });
      if (!validations.warehouseLandmark) errors.push({ field: "warehouseLandmark", message: "Warehouse landmark is required" });
      if (!validations.warehouseCountry) errors.push({ field: "warehouseCountry", message: "Warehouse country is required" });
      if (!validations.warehouseState) errors.push({ field: "warehouseState", message: "Warehouse state is required" });
      if (!validations.warehouseCity) errors.push({ field: "warehouseCity", message: "Warehouse city is required" });
      if (!validations.warehouseArea) errors.push({ field: "warehouseArea", message: "Warehouse area is required" });
      if (!warehouseLocation.pincode.trim()) {
        errors.push({ field: "warehousePincode", message: "Warehouse pincode is required" });
      } else if (!validatePincode(warehouseLocation.pincode)) {
        errors.push({ field: "warehousePincode", message: "Enter a valid 6-digit warehouse pincode" });
      }
    }
    if (errors.length > 0) {
      setValidationErrors(errors);
      scrollToFirstError(errors);
      showValidationAlert(errors);
      return;
    }

    setIsLoading(true);
    try {
      await hydrateSellerSession();
      const payload = {
        streetAddress: streetAddress.trim(),
        landmark: landmark.trim(),
        city: location.city.trim(),
        state: location.state.trim(),
        area: location.area.trim(),
        country: location.country.trim(),
        pincode: location.pincode.trim(),
        warehouseDifferent: warehouse,
        ...(warehouse
          ? {
              warehouseAddress: warehouseAddress.trim(),
              warehouseLandmark: warehouseLandmark.trim(),
              warehouseCity: warehouseLocation.city.trim(),
              warehouseState: warehouseLocation.state.trim(),
              warehouseArea: warehouseLocation.area.trim(),
              warehouseCountry: warehouseLocation.country.trim(),
              warehousePincode: warehouseLocation.pincode.trim(),
            }
          : {}),
      } as const;

      await updateAddressProfile(payload);
      router.push({
        pathname: "/(main)/sellerbanking",
        params: businessCategory ? { businessCategory } : {},
      });
    } catch (e) {
      showError(getApiErrorMessage(e, "Could not save address details."));
    } finally {
      setIsLoading(false);
    }
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
          <View ref={scrollContentRef} collapsable={false}>

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
                  innerRef={registerFieldRef("streetAddress")}
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
                  inputRef={fieldRefs.landmark}
                  innerRef={registerFieldRef("landmark")}
                  error={validationErrors.find(e => e.field === "landmark")?.message}
                  onLayout={(e) => handleFieldLayout("landmark", e)}
                  borderColor={T.orange}
                  accentColor={T.orange}
                />
              </View>
            </InputPairRow>

            <AddressLocationFields
              value={location}
              onChange={setLocation}
              errors={locationErrors}
              onClearError={clearFieldError}
              accentColor={T.orange}
              onLayout={handleFieldLayout}
              searchCountry="India"
              defaultCountryForAdd="India"
            />

            {/* Warehouse Checkbox */}
            <Checkbox
              checked={warehouse}
              onToggle={() => {
                const next = !warehouse;
                if (next) {
                  syncWarehouseFromBusiness();
                }
                setWarehouse(next);
              }}
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
                    inputRef={fieldRefs.warehouseAddress}
                    innerRef={registerFieldRef("warehouseAddress")}
                    error={validationErrors.find(e => e.field === "warehouseAddress")?.message}
                    onLayout={(e) => handleFieldLayout("warehouseAddress", e)}
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
                    inputRef={fieldRefs.warehouseLandmark}
                    innerRef={registerFieldRef("warehouseLandmark")}
                    error={validationErrors.find(e => e.field === "warehouseLandmark")?.message}
                    onLayout={(e) => handleFieldLayout("warehouseLandmark", e)}
                    borderColor={T.navy}
                    accentColor={T.navy}
                  />
                </View>
              </InputPairRow>

              <AddressLocationFields
                value={warehouseLocation}
                onChange={setWarehouseLocation}
                errors={warehouseLocationErrors}
                onClearError={(field) => {
                  const map: Record<keyof AddressLocationValue, string> = {
                    country: "warehouseCountry",
                    state: "warehouseState",
                    city: "warehouseCity",
                    area: "warehouseArea",
                    pincode: "warehousePincode",
                  };
                  clearFieldError(map[field]);
                }}
                accentColor={T.navy}
                searchCountry="India"
                defaultCountryForAdd="India"
                onLayout={(field, e) => {
                  const map: Record<keyof AddressLocationValue, string> = {
                    country: "warehouseCountry",
                    state: "warehouseState",
                    city: "warehouseCity",
                    area: "warehouseArea",
                    pincode: "warehousePincode",
                  };
                  handleFieldLayout(map[field], e);
                }}
              />
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
                  {isLoading ? "Saving…" : "Continue"}
                </Text>
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