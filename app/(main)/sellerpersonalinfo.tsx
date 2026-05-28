/**
 * Seller Personal Info - Screen 1 of 5
 * Navy blue & orange premium onboarding UI
 * Web: 2 fields per row | Mobile: unchanged
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/FontAwesome";
import { useSweetAlert } from "@/components/common/SweetAlert";
import { hydrateSellerSession } from "@/lib/api/sellerSession";
import {
  fetchSellerProfile,
  getApiErrorMessage,
  resolveDocumentDisplayUrl,
  uploadProfilePhoto,
} from "@/services/sellerProfileApi";
import {
  CREAM, PRIMARY, PRIMARY_D, PRIMARY_L, TEXT, TEXT_SEC,
  INPUT_BG, SUCCESS, ERROR, SPACING, BORDER_RADIUS,
  FONT_SIZES,
} from "./_sellerDesignTokens";
import {
  InputField, PrimaryButton, SecondaryButton,
  UploadBox, ProgressBar, SectionTitle,
} from "./_sellerComponents";

// ─── Design tokens (shared with Screen 2) ────────────────────
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

// ─── Breakpoint for web two-column layout ────────────────────
const WEB_BREAKPOINT = 600;

interface ValidationError { field: string; message: string; }

// ─── Read-only info row ──────────────────────────────────────
const ReadOnlyField: React.FC<{
  label: string; value: string; iconName: string;
  onLayout?: (e: LayoutChangeEvent) => void;
}> = ({ label, value, iconName, onLayout }) => (
  <View style={rf.wrap} onLayout={onLayout}>
    <AppText style={rf.label}>{label}</AppText>
    <View style={rf.field}>
      <View style={rf.iconBox}>
        <Icon name={iconName} size={14} color={T.navy} />
      </View>
      <AppText style={rf.value} numberOfLines={1}>{value}</AppText>
      <View style={rf.lockBadge}>
        <Icon name="lock" size={14} color={T.textSoft} />
      </View>
    </View>
    <AppText style={rf.note}>Auto-filled from registration</AppText>
  </View>
);
const rf = StyleSheet.create({
  wrap:     { marginBottom: 16 },
  label:    { fontSize: 11, fontFamily: fontFamilies.bold, color: T.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  field:    {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: T.navySoft, borderRadius: 12, borderWidth: 1.5,
    borderColor: T.border, paddingHorizontal: 14, height: 52,
  },
  iconBox:  { width: 26, height: 26, borderRadius: 8, backgroundColor: T.white, alignItems: "center", justifyContent: "center" },
  value:    { flex: 1, fontSize: 14, color: T.textMid, fontFamily: fontFamilies.regular },
  lockBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  note:     { fontSize: 11, color: T.textLight, marginTop: 5, marginLeft: 2, fontStyle: "italic" },
});

// ─── Section card ────────────────────────────────────────────
const SectionCard: React.FC<{
  children: React.ReactNode; title: string;
  subtitle?: string; accentColor?: string; iconName?: string;
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
          <AppText style={scard.title}>{title}</AppText>
          {subtitle && <AppText style={scard.subtitle}>{subtitle}</AppText>}
        </View>
      </View>
      {children}
    </View>
  </View>
);
const scard = StyleSheet.create({
  card:     {
    backgroundColor: T.cardBg, borderRadius: 16, marginBottom: 16,
    overflow: "hidden", borderWidth: 1, borderColor: T.borderLight,
    shadowColor: T.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  topBar:   { height: 4 },
  inner:    { padding: 18 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  iconBox:  { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title:    { fontSize: 15, fontFamily: fontFamilies.bold, color: T.textDark, marginBottom: 2 },
  subtitle: { fontSize: 12, color: T.textSoft, lineHeight: 17 },
});

// ─── Main screen ─────────────────────────────────────────────
export default function SellerPersonalInfo() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const routerParams = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const { showError, showSuccess, SweetAlertHost } = useSweetAlert();

  // True when running on web AND viewport is wide enough for 2-col layout
  const isWebWide = Platform.OS === "web" && width >= WEB_BREAKPOINT;

  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [fieldPositions, setFieldPositions] = useState<Record<string, number>>({});

  // Auto-fill from signup params
  useEffect(() => {
    if (routerParams.fullName) setName(routerParams.fullName as string);
    if (routerParams.mobile)   setMobile(routerParams.mobile as string);
    if (routerParams.email)    setEmail(routerParams.email as string);
  }, [routerParams]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await hydrateSellerSession();
        const profile = await fetchSellerProfile();
        if (!active) return;
        const loadedName =
          profile.fullName?.trim() ||
          [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
        if (loadedName) setName(loadedName);
        if (profile.mobile) setMobile(profile.mobile.replace(/\D/g, "").slice(-10));
        if (profile.email) setEmail(profile.email);
        const pic = profile.personal?.profilePicUrl;
        if (pic) setImage(resolveDocumentDisplayUrl(pic));
      } catch {
        // Signup route params remain as fallback
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const fieldRefs = {
    name:   useRef<TextInput>(null),
    mobile: useRef<TextInput>(null),
    email:  useRef<TextInput>(null),
  };

  const handleFieldLayout = useCallback((fieldName: string, event: LayoutChangeEvent) => {
    const { y } = event.nativeEvent.layout;
    setFieldPositions(prev => ({ ...prev, [fieldName]: y }));
  }, []);

  const validateEmail = (e: string) => {
    const trimmed = e.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(trimmed)) return false;
    const domain = trimmed.split("@")[1];
    const allowed = ["gmail.com","yahoo.com","outlook.com","outlook.in","hotmail.com","icloud.com","protonmail.com"];
    return !!domain && allowed.includes(domain);
  };

  const getEmailError = (e: string) => {
    const trimmed = e.trim().toLowerCase();
    if (!trimmed) return "";
    if (!trimmed.includes("@")) return "Email must contain @";
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(trimmed)) return "Enter valid email address";
    const domain = trimmed.split("@")[1];
    const allowed = ["gmail.com","yahoo.com","outlook.com","outlook.in","hotmail.com","icloud.com","protonmail.com"];
    if (!domain || !allowed.includes(domain)) return "Use: gmail.com, yahoo.com, outlook.com, etc.";
    return "";
  };

  const validateMobile = (m: string) => /^[6-9]\d{9}$/.test(m);

  const getMobileError = (m: string | undefined) => {
    if (!m || m.length === 0) return "";
    if (!/^\d+$/.test(m)) return "Only numbers are allowed";
    if (m.length !== 10) return "Enter valid Indian mobile (10 digits, start with 6-9)";
    if (!/^[6-9]/.test(m)) return "Mobile number must start with 6-9";
    return "";
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const localUri = result.assets[0].uri;
    setImage(localUri);
    setIsUploadingPhoto(true);
    try {
      await hydrateSellerSession();
      const updated = await uploadProfilePhoto(localUri);
      const url = updated.personal?.profilePicUrl;
      if (url) setImage(resolveDocumentDisplayUrl(url));
      showSuccess("Profile photo uploaded.");
    } catch (e) {
      showError(getApiErrorMessage(e, "Could not upload profile photo."));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleNext = async () => {
    setIsLoading(true);
    try {
      await hydrateSellerSession();
      router.push("/(main)/sellerbusinessinfo");
    } catch (e) {
      showError(getApiErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Personal info fields config ──────────────────────────
  const personalFields = [
    { key: "name",   label: "Full Name",       value: name   || "—", iconName: "user"     },
    { key: "mobile", label: "Mobile Number",   value: mobile ? `+91 ${mobile}` : "—", iconName: "phone"    },
    { key: "email",  label: "Email Address",   value: email  || "—", iconName: "envelope" },
  ];

  // ── Render personal fields: 2-col on web, 1-col on mobile ─
  const renderPersonalFields = () => {
    if (!isWebWide) {
      // ── Mobile: unchanged — render one by one ──
      return personalFields.map(f => (
        <ReadOnlyField
          key={f.key}
          label={f.label}
          value={f.value}
          iconName={f.iconName}
          onLayout={e => handleFieldLayout(f.key, e)}
        />
      ));
    }

    // ── Web wide: pair fields into rows of 2 ──
    const rows: (typeof personalFields)[] = [];
    for (let i = 0; i < personalFields.length; i += 2) {
      rows.push(personalFields.slice(i, i + 2));
    }

    return rows.map((pair, rowIdx) => (
      <View key={rowIdx} style={ws.fieldRow}>
        {pair.map(f => (
          <View key={f.key} style={ws.fieldCol}>
            <ReadOnlyField
              label={f.label}
              value={f.value}
              iconName={f.iconName}
              onLayout={e => handleFieldLayout(f.key, e)}
            />
          </View>
        ))}
        {/* If odd field is last, fill the second column with empty space */}
        {pair.length === 1 && <View style={ws.fieldCol} />}
      </View>
    ));
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
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-left" size={20} color={T.white} />
            </TouchableOpacity> */}
                <View style={{ flex: 1 }}>
                <AppText style={s.headerLabel}>STEP 1 OF 5</AppText>
              <AppText style={s.headerTitle}>Personal Profile</AppText>
              <AppText style={s.headerSub}>Set up your seller identity</AppText>
            </View>
          </View>

          {/* Progress segments */}
          <View style={s.progressRow}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={[
                s.progressSeg,
                i === 0 ? { backgroundColor: T.orange } : { backgroundColor: "rgba(255,255,255,0.2)" },
              ]} />
            ))}
          </View>
          <AppText style={s.progressLabel}>Step 1 of 5 — Personal Information</AppText>
        </SafeAreaView>
      </LinearGradient>

      {/* ── Scrollable body ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollViewRef}
          style={s.scroll}
          contentContainerStyle={[
            s.scrollContent,
            // On web wide screens, constrain max width and centre content
            isWebWide && ws.scrollContentWeb,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Profile photo card ── */}
          <SectionCard
            title="Profile Photo"
            subtitle="Upload a clear photo helps buyers recognise you"
            accentColor={T.orange}
            iconName="camera"
          >
            <View style={s.avatarSection}>
              {/* Avatar */}
              <View style={s.avatarWrap}>
                {image ? (
                  <Image source={{ uri: image }} style={s.avatarImg} />
                ) : (
                  <LinearGradient
                    colors={[T.navySoft, T.navyPale]}
                    style={s.avatarPlaceholder}
                  >
                    <AppText style={s.avatarPlaceholderText}>{name ? name.charAt(0).toUpperCase() : "S"}</AppText>
                  </LinearGradient>
                )}
              </View>

              {/* Right side info */}
              <View style={s.avatarInfo}>
                <TouchableOpacity onPress={pickImage} style={s.uploadBtn} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[T.orange, T.orangeDeep]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.uploadBtnInner}
                  >
                    <AppText style={s.uploadBtnText}>
                      {isUploadingPhoto ? "Uploading…" : image ? "Change Photo" : "Upload Photo"}
                    </AppText>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </SectionCard>

          {/* ── Personal information card ── */}
          <SectionCard
            title="Personal Information"
            subtitle="These details were filled in during registration and cannot be changed here"
            accentColor={T.navy}
            iconName="id-card"
          >
            {/* Info banner */}
            <View style={s.infoBanner}>
              <Icon name="info-circle" size={14} color={T.navy} />
              <AppText style={s.infoBannerText}>
                Your details are auto-filled from signup.
              </AppText>
            </View>

            {/* ── Fields: 2-col on web, 1-col on mobile ── */}
            {renderPersonalFields()}
          </SectionCard>

          {/* ── What's next card ── */}
          <View style={s.whatNextCard}>
            <LinearGradient
              colors={[T.navy, T.navyLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.whatNextGrad}
            >
              <AppText style={s.whatNextTitle}>What&apos;s Next?</AppText>
              <View style={{ gap: 10 }}>
                {[
                  { icon: "briefcase", label: "Business Information", done: false },
                  { icon: "map-marker", label: "Address Details",     done: false },
                  { icon: "university", label: "Bank Details",        done: false },
                  { icon: "file-text", label: "Upload Documents",     done: false },
                ].map(item => (
                  <View key={item.icon} style={s.nextItem}>
                    <View style={[s.nextDot, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                      <Icon name={item.icon} size={12} color={T.white} />
                    </View>
                    <AppText style={s.nextLabel}>{item.label}</AppText>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>

          {/* ── Continue button ── */}
          <TouchableOpacity
            onPress={handleNext}
            style={s.continueBtn}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[T.orange, T.orangeDeep]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.continueBtnInner}
            >
              <AppText style={s.continueBtnText}>{isLoading ? "Please wait…" : "Continue"}</AppText>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <SweetAlertHost />
    </View>
  );
}

// ─── Web-only layout styles (2-col grid) ─────────────────────
const ws = StyleSheet.create({
  // Constrain and centre the scroll content on wide web screens
  scrollContentWeb: {
    maxWidth: 860,
    alignSelf: "center",
    width: "100%",
  },
  // A horizontal row that holds up to 2 field columns
  fieldRow: {
    flexDirection: "row",
    gap: 16,
  },
  // Each column takes equal width within the row
  fieldCol: {
    flex: 1,
  },
});

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  // ── Header ──
  topHeader:    { paddingHorizontal: 20, height: 200},
 headerInner: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 10, marginBottom: 18 },  // backBtnHeader: {
  //   width: 30,
  //   height: 30,
    // borderRadius: 20,
    // backgroundColor: "rgba(255,255,255,0.15)",
  //   alignItems: "center",
  //   justifyContent: "center",
  //   marginTop: 18,
  // },
  headerLabel:  { fontSize: 10, fontFamily: fontFamilies.bold, color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  headerTitle:  { fontSize: 18, fontFamily: fontFamilies.bold, color: T.white, marginBottom: 2 },
  headerSub:    { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  headerBadge:  { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },

  // ── Progress ──
  progressRow:   { flexDirection: "row", gap: 6, marginBottom: 7 },
  progressSeg:   { flex: 1, height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: fontFamilies.semiBold },

  // ── Scroll ──
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },

  // ── Avatar section ──
  avatarSection: {alignItems: "center", gap: 16 },

  avatarWrap: {
    width: 108, height: 108, borderRadius: 54,
    overflow: "hidden", position: "relative",
    borderWidth: 3, borderColor: T.orange,
    shadowColor: T.orange, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  avatarPlaceholderText: { fontSize: 36, color: T.textSoft, fontFamily: fontFamilies.bold },

  avatarInfo:      { flex: 1 },
  avatarInfoTitle: { fontSize: 14, fontFamily: fontFamilies.bold, color: T.textDark, marginBottom: 4 },
  avatarInfoSub:   { fontSize: 12, color: T.textSoft, lineHeight: 17, marginBottom: 10 },

  uploadBtn:      { borderRadius: 10, overflow: "hidden" , width: 180,},
  uploadBtnInner: { paddingVertical: 10, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  uploadBtnText:  { fontSize: 13, fontFamily: fontFamilies.bold, color: T.white },

  // ── Info banner ──
  infoBanner:     {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: T.navyPale, borderRadius: 10,
    padding: 12, marginBottom: 16, borderWidth: 1, borderColor: T.borderLight,
  },
  infoBannerText: { flex: 1, fontSize: 12, color: T.textMid, lineHeight: 17, fontFamily: fontFamilies.medium },

  // ── What's next ──
  whatNextCard:  { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  whatNextGrad:  { padding: 18, borderRadius: 16 },
  whatNextTitle: { fontSize: 14, fontFamily: fontFamilies.bold, color: T.white, marginBottom: 14, letterSpacing: 0.3 },
  nextItem:      { flexDirection: "row", alignItems: "center", gap: 12 },
  nextDot:       { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nextLabel:     { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: fontFamilies.medium },

  // ── Continue button ──
  continueBtn:       { borderRadius: 14, overflow: "hidden", marginBottom: 4 },
  continueBtnInner:  { height: 54, alignItems: "center", justifyContent: "center" },
  continueBtnText:   { fontSize: 16, fontFamily: fontFamilies.bold, color: T.white, letterSpacing: 0.2 },
});