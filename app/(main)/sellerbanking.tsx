/**
 * Seller Banking Info - Screen 4 of 5
 * Pixel-perfect match to Screen 1 — navy & orange premium onboarding
 */

import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import Icon from "react-native-vector-icons/FontAwesome";

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

  textDark:    "#0A1533",
  textMid:     "#3A4A72",
  textSoft:    "#6B7A9E",
  textLight:   "#9BA8C5",

  success:     "#16A34A",
  successBg:   "#F0FDF4",
  error:       "#DC2626",
  errorBg:     "#FFF5F5",
};

// ─── Validation helpers (100% unchanged) ─────────────────────
const validateIfscCode = (ifsc: string): string => {
  if (!ifsc.trim()) return "IFSC code is required";
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase()))
    return "Invalid IFSC code format (e.g. SBIN0000345)";
  return "";
};
const validateAccountNumber = (account: string): string => {
  if (!account.trim()) return "Account number is required";
  if (!/^\d+$/.test(account)) return "Account number must contain only digits";
  if (account.length < 9) return "Account number must be at least 9 digits";
  return "";
};
const validateConfirmAccountNumber = (confirm: string, original: string): { error?: string; success?: string } => {
  if (!confirm.trim()) return { error: "Please confirm your account number" };
  if (confirm !== original) return { error: "Account numbers do not match" };
  if (confirm.length > 0 && confirm === original) return { success: "Account numbers match" };
  return {};
};
const validateAccountHolderName = (name: string): string => {
  if (!name.trim()) return "Account holder name is required";
  if (name.length < 3) return "Name must be at least 3 characters";
  return "";
};

// ─── Mock IFSC lookup (100% unchanged) ───────────────────────
const lookupIfscDetails = (ifsc: string): { bank: string; branch: string } => {
  const ifscData: Record<string, { bank: string; branch: string }> = {
    SBIN0000001: { bank: "State Bank of India",  branch: "New Delhi Main Branch" },
    HDFC0000001: { bank: "HDFC Bank",            branch: "Mumbai Corporate Branch" },
    ICIC0000001: { bank: "ICICI Bank",           branch: "Bangalore Main Branch" },
    PUNB0000001: { bank: "Punjab National Bank", branch: "Chandigarh Branch" },
    UBIN0532089: { bank: "Union Bank of India",  branch: "Hyderabad Branch" },
    KARB0000001: { bank: "Karnataka Bank",       branch: "Mangalore Branch" },
  };
  return ifscData[ifsc.toUpperCase().trim()] || { bank: "", branch: "" };
};

// ─── SectionCard — exact Screen 1 pattern ────────────────────
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
          {/* Screen 1 scard.title: 15px 700 textDark */}
          <Text style={scard.title}>{title}</Text>
          {/* Screen 1 scard.subtitle: 12px textSoft lineHeight 17 */}
          {subtitle && <Text style={scard.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {children}
    </View>
  </View>
);
const scard = StyleSheet.create({
  card: {
    backgroundColor: T.cardBg, borderRadius: 16, marginBottom: 16,
    overflow: "hidden", borderWidth: 1, borderColor: T.borderLight,
    shadowColor: T.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  topBar:   { height: 4 },
  inner:    { padding: 18 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  iconBox:  { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title:    { fontSize: 15, fontWeight: "700", color: T.textDark, marginBottom: 2 },
  subtitle: { fontSize: 12, color: T.textSoft, lineHeight: 17 },
});

// ─── InfoBanner — exact Screen 1 infoBanner ──────────────────
const InfoBanner: React.FC<{ text: string; iconName?: string; color?: string }> = ({
  text, iconName = "info-circle", color = T.navy,
}) => (
  <View style={[ib.wrap, {
    borderColor: color + "30",
    backgroundColor: color === T.navy ? T.navyPale : T.orangePale,
  }]}>
    <Icon name={iconName} size={14} color={color} style={{ marginTop: 1 }} />
    {/* Screen 1 infoBannerText: 12px textMid lineHeight 17 weight 500 */}
    <Text style={[ib.text, { color: color === T.navy ? T.textMid : T.orangeDeep }]}>{text}</Text>
  </View>
);
const ib = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1,
  },
  text: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "500" },
});

// ─── Section label divider — Screen 1 sectionLabel style ─────
const SectionLabel: React.FC<{ title: string; iconName: string; color?: string }> = ({
  title, iconName, color = T.navy,
}) => (
  <View style={sl.row}>
    <View style={[sl.accent, { backgroundColor: color }]} />
    {/* Screen 1: 11px 800 uppercase letterSpacing 0.8 */}
    <Text style={[sl.text, { color }]}>{title}</Text>
  </View>
);
const sl = StyleSheet.create({
  row:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, marginTop: 4 },
  accent: { width: 3, height: 16, borderRadius: 2 },
  text:   { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
});

// ─── InputRow — exact Screen 1 field style ───────────────────
const InputRow: React.FC<{
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  onBlur?: () => void;
  placeholder: string;
  keyboardType?: "default" | "numeric";
  maxLength?: number;
  secureTextEntry?: boolean;
  editable?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string | undefined;
  success?: string | undefined;
  autoFilled?: boolean | undefined;
  accentColor?: string | undefined;
  showTick?: boolean | undefined;
}> = ({
  label, value, onChangeText, onBlur, placeholder,
  keyboardType = "default", maxLength, secureTextEntry = false,
  editable = true, autoCapitalize = "none",
  error, success, autoFilled = false, accentColor = T.navy, showTick = true,
}) => {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? T.error
    : autoFilled
    ? T.success
    : focused
    ? accentColor
    : T.border;

  const bgColor = autoFilled
    ? T.successBg
    : T.white;

  return (
    <View style={inp.wrap}>
      {/* Screen 1 label: 11px 700 uppercase letterSpacing 0.8 textMid */}
      <Text style={inp.label}>
        {label} <Text style={[inp.asterisk, { color: accentColor }]}>*</Text>
      </Text>
      <View style={[inp.field, { borderColor, backgroundColor: bgColor }]}>
        <TextInput
          style={[
            inp.input,
            !editable && { color: T.textSoft },
            autoFilled && { color: T.success, fontWeight: "600" },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.textLight}
          keyboardType={keyboardType}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
          editable={editable}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
        />
        {/* Auto-filled badge */}
        {autoFilled && value.length > 0 && (
          <View style={inp.autoFilledBadge}>
            <Icon name="check" size={9} color={T.success} />
            <Text style={inp.autoFilledText}>Auto</Text>
          </View>
        )}
        {/* Green tick when filled normally */}
        {showTick && !autoFilled && value.trim().length > 0 && !error && !secureTextEntry && (
          <View style={inp.tickBadge}>
            <Icon name="check" size={10} color={T.success} />
          </View>
        )}
      </View>
      {/* Screen 1 error row: exclamation-circle + 11px error text */}
      {!!error && (
        <View style={inp.errorRow}>
          <Icon name="exclamation-circle" size={11} color={T.error} style={{ marginTop: 4 }} />
          <Text style={inp.errorText}>{error}</Text>
        </View>
      )}
      {/* Success row */}
      {!!success && (
        <View style={inp.successRow}>
          <Icon name="check-circle" size={11} color={T.success} style={{ marginTop: 4 }} />
          <Text style={inp.successText}>{success}</Text>
        </View>
      )}
      {/* Auto-filled note — matches Screen 1 rf.note italic style */}
      {autoFilled && value.length > 0 && !error && (
        <Text style={inp.autoNote}>Auto-filled from IFSC code</Text>
      )}
    </View>
  );
};
const inp = StyleSheet.create({
  wrap:  { marginBottom: 14 },
  /* Screen 1: 11px 700 uppercase letterSpacing 0.8 textMid */
  label: { fontSize: 11, fontWeight: "700", color: T.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  asterisk: { fontSize: 11, fontWeight: "700" },
  /* Screen 1 field: flexRow h52 borderRadius 12 borderWidth 1.5 paddingH 14 */
  field: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, height: 52,
  },
  /* Screen 1 input: 14px 400 textDark */
  input:    { flex: 1, fontSize: 14, color: T.textDark, fontWeight: "400" },
  tickBadge:{ width: 22, height: 22, borderRadius: 11, backgroundColor: T.success + "15", alignItems: "center", justifyContent: "center" },
  autoFilledBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: T.successBg, borderWidth: 1, borderColor: T.success + "50",
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  autoFilledText: { fontSize: 10, fontWeight: "700", color: T.success, letterSpacing: 0.3 },
  /* Screen 1 error: exclamation + 11px error */
  errorRow:  { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 5, marginLeft: 2 },
  errorText: { fontSize: 11, color: T.error, fontWeight: "400", flex: 1, lineHeight: 16 },
  /* Success row */
  successRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 5, marginLeft: 2 },
  successText: { fontSize: 11, color: T.success, fontWeight: "400", flex: 1, lineHeight: 16 },
  /* Screen 1 rf.note: 11px italic textLight */
  autoNote:  { fontSize: 11, color: T.textLight, marginTop: 5, marginLeft: 2, fontStyle: "italic" },
});

// ─── Main screen ─────────────────────────────────────────────
export default function SellerBanking() {
  const router = useRouter();
  const { businessCategory } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  // ── State (100% unchanged) ──
  const [ifscCode,             setIfscCode]             = useState("");
  const [bankName,             setBankName]             = useState("");
  const [branchName,           setBranchName]           = useState("");
  const [accountHolderName,    setAccountHolderName]    = useState("");
  const [accountNumber,        setAccountNumber]        = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [validationErrors,     setValidationErrors]     = useState<{ field: string; message: string }[]>([]);
  const [fieldValid, setFieldValid] = useState<Record<string, boolean>>({});
  const [fieldSuccess, setFieldSuccess] = useState<Record<string, string>>({});

  // ── Helpers (100% unchanged) ──
  const getError = (field: string) =>
    validationErrors.find((e) => e.field === field)?.message ?? "";
  const clearError = (field: string) => {
    setValidationErrors((prev) => prev.filter((e) => e.field !== field));
  };
  const setSuccess = (field: string, message: string) => {
    setFieldSuccess(prev => ({ ...prev, [field]: message }));
    setValidationErrors(prev => prev.filter((e) => e.field !== field));
  };
  const getSuccess = (field: string) => fieldSuccess[field] ?? "";
  const setError = (field: string, message: string) => {
    setValidationErrors((prev) => [
      ...prev.filter((e) => e.field !== field),
      { field, message },
    ]);
    setFieldValid(prev => ({ ...prev, [field]: false }));
    setFieldSuccess(prev => ({ ...prev, [field]: "" }));
  };

  // ── IFSC handler (100% unchanged) ──
  const handleIfscChange = (text: string) => {
    const upper = text.toUpperCase();
    setIfscCode(upper);
    clearError("ifscCode");
    setFieldValid(prev => ({ ...prev, ifscCode: false }));
    if (text.length > 0) {
      const e = validateIfscCode(upper);
      if (e && upper.length > 0) setError("ifscCode", e);
      else { clearError("ifscCode"); setFieldValid(prev => ({ ...prev, ifscCode: true })); }
    }
    if (upper.length === 11) {
      const details = lookupIfscDetails(upper);
      setBankName(details.bank);
      setBranchName(details.branch);
    } else {
      setBankName("");
      setBranchName("");
    }
  };

  // ── Submit (100% unchanged) ──
  const handleNext = () => {
    const errors: { field: string; message: string }[] = [];
    const ifscErr    = validateIfscCode(ifscCode);
    const accErr     = validateAccountNumber(accountNumber);
    const confirmErr = validateConfirmAccountNumber(confirmAccountNumber, accountNumber);
    const nameErr    = validateAccountHolderName(accountHolderName);
    if (ifscErr)    errors.push({ field: "ifscCode",             message: ifscErr });
    if (accErr)     errors.push({ field: "accountNumber",        message: accErr });
    if (confirmErr.error) errors.push({ field: "confirmAccountNumber", message: confirmErr.error });
    if (nameErr)    errors.push({ field: "accountHolderName",    message: nameErr });
    if (errors.length > 0) {
      setValidationErrors(errors);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    router.push({ pathname: "/sellerdocuments", params: { businessCategory } });
  };

  const autoFilled = ifscCode.length === 11;

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} />

      {/* ── Top gradient header — exact Screen 1 ── */}
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
              {/* Screen 1: 10px 700 uppercase letterSpacing 1.5 rgba white 0.55 */}
              <Text style={s.headerLabel}>STEP 4 OF 5</Text>
              {/* Screen 1: 18px 800 white */}
              <Text style={s.headerTitle}>Bank Details</Text>
              {/* Screen 1: 12px rgba white 0.65 */}
              <Text style={s.headerSub}>Your banking information for secure payouts</Text>
            </View>
          </View>

          {/* Progress segments — Screen 1 identical */}
          <View style={s.progressRow}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={[
                s.progressSeg,
                i < 4
                  ? { backgroundColor: T.orange }
                  : { backgroundColor: "rgba(255,255,255,0.2)" },
              ]} />
            ))}
          </View>
          {/* Screen 1: 11px rgba white 0.5 weight 600 */}
          <Text style={s.progressLabel}>Step 4 of 5 — Bank Details</Text>
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

          {/* ── Bank Information card ── */}
          <SectionCard
            title="Bank Information"
            subtitle="Enter your IFSC code to auto-fill bank and branch details"
            accentColor={T.orange}
            iconName="university"
          >
            {/* Info banner — exact Screen 1 */}
            <InfoBanner
              text="Enter your 11-digit IFSC code and bank details will auto-fill instantly."
              iconName="info-circle"
              color={T.orange}
            />

            <InputRow
              label="IFSC Code"
              value={ifscCode}
              onChangeText={handleIfscChange}
              onBlur={() => { if (ifscCode.length === 11) { const e = validateIfscCode(ifscCode); if (e) setError("ifscCode", e); else setFieldValid(prev => ({ ...prev, ifscCode: true })); } else if (ifscCode.length > 0 && ifscCode.length < 11) { setError("ifscCode", "IFSC code must be 11 characters"); } else { clearError("ifscCode"); } }}
              placeholder="e.g. SBIN0000345"
              autoCapitalize="characters"
              maxLength={11}
              error={getError("ifscCode")}
              accentColor={T.orange}
              showTick={fieldValid.ifscCode ?? false}
            />

            {/* Divider between IFSC and auto-filled fields */}
            <View style={s.innerDivider} />
            <SectionLabel title="Auto-filled Details" iconName="magic" color={T.success} />

            <InputRow
              label="Bank Name"
              value={bankName}
              onChangeText={(t) => { setBankName(t); clearError("bankName"); }}
              placeholder="Auto-fills from IFSC code"
              editable={!autoFilled}
              autoFilled={autoFilled && bankName.length > 0}
              accentColor={T.orange}
            />

            <InputRow
              label="Branch Name"
              value={branchName}
              onChangeText={(t) => { setBranchName(t); clearError("branchName"); }}
              placeholder="Auto-fills from IFSC code"
              editable={!autoFilled}
              autoFilled={autoFilled && branchName.length > 0}
              accentColor={T.orange}
            />
          </SectionCard>

          {/* ── Account Information card ── */}
          <SectionCard
            title="Account Information"
            subtitle="Your account details for receiving payments"
            accentColor={T.navy}
            iconName="credit-card"
          >
            <InfoBanner
              text="Your bank details are encrypted and securely stored. Never shared with third parties."
              iconName="lock"
              color={T.navy}
            />

            <InputRow
              label="Account Holder Name"
              value={accountHolderName}
              onChangeText={(t) => {
                setAccountHolderName(t);
                const e = validateAccountHolderName(t);
                if (e) setError("accountHolderName", e);
                else { clearError("accountHolderName"); setFieldValid(prev => ({ ...prev, accountHolderName: true })); }
              }}
              onBlur={() => { const e = validateAccountHolderName(accountHolderName); if (e) setError("accountHolderName", e); else setFieldValid(prev => ({ ...prev, accountHolderName: true })); }}
              placeholder="Full name as per bank records"
              autoCapitalize="words"
              error={getError("accountHolderName")}
              accentColor={T.navy}
              showTick={false}
            />

            <InputRow
              label="Account Number"
              value={accountNumber}
              onChangeText={(t) => {
                setAccountNumber(t);
                const e = validateAccountNumber(t);
                if (e) setError("accountNumber", e);
                else { clearError("accountNumber"); setFieldValid(prev => ({ ...prev, accountNumber: true })); }
                // Re-validate confirm field live if already has a value
                if (confirmAccountNumber.length > 0) {
                  const ce = validateConfirmAccountNumber(confirmAccountNumber, t);
                  if (ce.error) setError("confirmAccountNumber", ce.error);
                  else { clearError("confirmAccountNumber"); setFieldValid(prev => ({ ...prev, confirmAccountNumber: true })); }
                }
              }}              
              onBlur={() => { const e = validateAccountNumber(accountNumber); if (e) setError("accountNumber", e); else setFieldValid(prev => ({ ...prev, accountNumber: true })); }}
              placeholder="Enter your bank account number"
              keyboardType="numeric"
              maxLength={20}
              secureTextEntry
              error={getError("accountNumber")}
              accentColor={T.navy}
              showTick={fieldValid.accountNumber ?? false}
            />

            <InputRow
              label="Confirm Account Number"
              value={confirmAccountNumber}
              onChangeText={(t) => {
                setConfirmAccountNumber(t);
                const result = validateConfirmAccountNumber(t, accountNumber);
                if (result.error) setError("confirmAccountNumber", result.error);
                else if (result.success) { setSuccess("confirmAccountNumber", result.success); setFieldValid(prev => ({ ...prev, confirmAccountNumber: true })); }
                else { clearError("confirmAccountNumber"); setFieldValid(prev => ({ ...prev, confirmAccountNumber: true })); }
              }}
              onBlur={() => { const result = validateConfirmAccountNumber(confirmAccountNumber, accountNumber); if (result.error) setError("confirmAccountNumber", result.error); else if (result.success) { setSuccess("confirmAccountNumber", result.success); setFieldValid(prev => ({ ...prev, confirmAccountNumber: true })); } else setFieldValid(prev => ({ ...prev, confirmAccountNumber: true })); }}
              placeholder="Re-enter account number"
              keyboardType="numeric"
              maxLength={20}
              secureTextEntry
              error={getError("confirmAccountNumber")}
              success={getSuccess("confirmAccountNumber")}
              accentColor={T.navy}
              showTick={fieldValid.confirmAccountNumber ?? false}
            />
          </SectionCard>

          {/* ── What's Next card — exact Screen 1 ── */}
          {/* <View style={s.whatNextCard}>
            <LinearGradient
              colors={[T.navy, T.navyLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.whatNextGrad}
            > */}
              {/* Screen 1: 14px 800 white letterSpacing 0.3 */}
              {/* <Text style={s.whatNextTitle}>What's Next?</Text>
              <View style={{ gap: 10 }}>
                {[{ icon: "file-text", label: "Upload Documents" }].map(item => (
                  <View key={item.icon} style={s.nextItem}> */}
                    {/* Screen 1 nextDot */}
                    {/* <View style={[s.nextDot, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                      <Icon name={item.icon} size={12} color={T.white} />
                    </View> */}
                    {/* Screen 1: 13px rgba white 0.8 weight 500 */}
                    {/* <Text style={s.nextLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View> */}

          {/* ── Buttons — exact Screen 1 ── */}
          <View style={s.buttonRow}>
            {/* Back — navy outline */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={s.backBtn}
              activeOpacity={0.85}
            >
              <View style={s.backBtnInner}>
                {/* Screen 1 backBtnText: 15px 700 navy */}
                <Text style={s.backBtnText}>Back</Text>
              </View>
            </TouchableOpacity>

            {/* Continue — orange LinearGradient */}
            <TouchableOpacity onPress={handleNext} style={s.continueBtn} activeOpacity={0.85}>
              <LinearGradient
                colors={[T.orange, T.orangeDeep]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.continueBtnInner}
              >
                {/* Screen 1 continueBtnText: 16px 800 white letterSpacing 0.2 */}
                <Text style={s.continueBtnText}>Continue</Text>
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
  backBtnHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  headerLabel:  { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  headerTitle:  { fontSize: 18, fontWeight: "800", color: T.white, marginBottom: 2 },
  headerSub:    { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  headerBadge:  { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },

  // ── Progress — exact Screen 1 ──
  progressRow:   { flexDirection: "row", gap: 6, marginBottom: 7 },
  progressSeg:   { flex: 1, height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "600" },

  // ── Scroll ──
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },

  // ── Inner divider ──
  innerDivider: { height: 1, backgroundColor: T.borderLight, marginBottom: 14 },

  // ── What's Next — exact Screen 1 ──
  // whatNextCard:  { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  // whatNextGrad:  { padding: 18, borderRadius: 16 },
  // whatNextTitle: { fontSize: 14, fontWeight: "800", color: T.white, marginBottom: 14, letterSpacing: 0.3 },
  // nextItem:      { flexDirection: "row", alignItems: "center", gap: 12 },
  // nextDot:       { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  // nextLabel:     { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: "500" },

  // ── Buttons — exact Screen 1 ──
  buttonRow:        { flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 4 },
  backBtn:          { flex: 1, borderRadius: 14, borderWidth: 2, borderColor: T.navy, overflow: "hidden" },
  backBtnInner:     { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: T.white, borderRadius: 12 },
  backBtnText:      { fontSize: 15, fontWeight: "700", color: T.navy },
  continueBtn:      { flex: 2},
  continueBtnInner: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14 },
  continueBtnText:  { fontSize: 16, fontWeight: "700", color: T.white, letterSpacing: 0.2 },
});
