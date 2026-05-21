/**
 * Seller Documents - Screen 5 of 5
 * Pixel-perfect match to Screen 1 — navy & orange premium onboarding
 */

import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Alert,
  Dimensions,
  TextInput,
} from "react-native";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import Icon from "react-native-vector-icons/FontAwesome";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import Animated, { useSharedValue, withTiming, withSpring } from "react-native-reanimated";

const { width: screenWidth } = Dimensions.get("window");

// ─── Design tokens — identical to Screen 1 ───────────────────
const T = {
  navy: "#0F1F4B",
  navyMid: "#1A2F6A",
  navyLight: "#243580",
  navySoft: "#E8ECF8",
  navyPale: "#F0F3FB",

  orange: "#F97316",
  orangeDeep: "#EA6C0A",
  orangeLight: "#FB923C",
  orangePale: "#FFF4EC",
  orangeSoft: "#FDE8D4",

  white: "#FFFFFF",
  bg: "#F4F6FB",
  cardBg: "#FFFFFF",
  border: "#DDE3F0",
  borderLight: "#EEF1F9",

  textDark: "#0A1533",
  textMid: "#3A4A72",
  textSoft: "#6B7A9E",
  textLight: "#9BA8C5",

  success: "#16A34A",
  successBg: "#F0FDF4",
  error: "#DC2626",
};

// ─── Company PAN validation ───────────────────────────────────
const validateCompanyPan = (pan: string): string => {
  if (!pan.trim()) return "Company PAN Number is required";
  if (pan.length < 10) return `${10 - pan.length} more character${10 - pan.length > 1 ? "s" : ""} needed`;
  if (!/^[A-Z]{3}C[A-Z][0-9]{4}[A-Z]$/.test(pan))
    return "Invalid format — Company PAN must be like AAAC A 1234 A (4th char must be C)";
  return "";
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
          <AppText style={scard.title}>{title}</AppText>
          {subtitle && <AppText style={scard.subtitle}>{subtitle}</AppText>}
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
  topBar: { height: 4 },
  inner: { padding: 18 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "700", color: T.textDark, marginBottom: 2 },
  subtitle: { fontSize: 12, color: T.textSoft, lineHeight: 17 },
});

// ─── InfoBanner — exact Screen 1 ─────────────────────────────
const InfoBanner: React.FC<{ text: string; iconName?: string; color?: string }> = ({
  text, iconName = "info-circle", color = T.navy,
}) => (
  <View style={[ib.wrap, {
    borderColor: color + "30",
    backgroundColor: color === T.navy ? T.navyPale : T.orangePale,
  }]}>
    <Icon name={iconName} size={14} color={color} style={{ marginTop: 1 }} />
    <AppText style={[ib.text, { color: color === T.navy ? T.textMid : T.orangeDeep }]}>{text}</AppText>
  </View>
);
const ib = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1,
  },
  text: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "500" },
});

// ─── UploadBox — navy/orange styled upload card ───────────────
// ─── UploadBox — with PDF support, drag-drop hint, preview, retake & delete ──
const UploadBox: React.FC<{
  label: string;
  value: string | null;
  fileType?: "image" | "pdf" | null;
  onPress: () => void;
  onDelete?: () => void;
  helper?: string;
  error?: string | undefined;
  iconName?: string;
  accentColor?: string;
  isSelfie?: boolean;
  onRetake?: () => void;
}> = ({
  value, fileType, onPress, onDelete, label, helper, error,
  iconName = "cloud-upload", accentColor = T.navy,
  isSelfie = false, onRetake,
}) => (
    <View style={ub.wrap}>
      <AppText style={ub.label}>
        {label} <AppText style={[ub.asterisk, { color: accentColor }]}>*</AppText>
      </AppText>
      {helper && <AppText style={ub.helper}>{helper}</AppText>}

      {/* Drag & drop hint — non-selfie only
      {!isSelfie && !value && (
        <View style={[ub.dragHint, { borderColor: accentColor + "30", backgroundColor: accentColor + "08" }]}>
          <Icon name="arrows" size={11} color={accentColor} />
          <AppText style={[ub.dragHintText, { color: accentColor }]}>Drag & drop or tap to browse</AppText>
        </View>
      )} */}

      <TouchableOpacity
        style={[
          ub.box,
          value ? ub.boxFilled : null,
          error ? ub.boxError : { borderColor: value ? accentColor + "80" : accentColor + "40" },
        ]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {value ? (
          <>
            {fileType === "pdf" ? (
              /* PDF preview */
              <View style={ub.pdfPreview}>
                <View style={[ub.pdfIconBox, { backgroundColor: accentColor + "15" }]}>
                  <Icon name="file-pdf-o" size={40} color={accentColor} />
                </View>
                <AppText style={[ub.pdfLabel, { color: accentColor }]}>PDF Document Uploaded</AppText>
                <View style={ub.pdfTapRow}>
                  <Icon name="refresh" size={10} color={T.textSoft} />
                  <AppText style={ub.pdfSub}>Tap to replace</AppText>
                </View>
              </View>
            ) : (
              /* Full visible image preview */
              <View style={ub.imagePreviewWrap}>
                <Image
                  source={{ uri: value }}
                  style={ub.preview}
                  resizeMode="contain"
                />
                {/* Subtle overlay at bottom for badge readability */}
                <View style={ub.imageOverlay} />
              </View>
            )}

            {/* Uploaded badge */}
            <View style={[ub.uploadedBadge, { backgroundColor: T.success }]}>
              <Icon name="check" size={10} color={T.white} />
              <AppText style={ub.uploadedBadgeText}>Uploaded</AppText>
            </View>
          </>
        ) : (
          <View style={ub.placeholder}>
            <View style={[ub.iconBox, { backgroundColor: accentColor + "12" }]}>
              <Icon name={isSelfie ? "camera" : iconName} size={22} color={accentColor} />
            </View>
            <AppText style={[ub.uploadTitle, { color: T.textDark }]}>
              {isSelfie ? "Capture Selfie" : "Upload Document"}
            </AppText>
            <AppText style={ub.uploadSub}>
              {isSelfie ? "Camera required" : "JPG, PNG or PDF • Max 5MB"}
            </AppText>
            <AppText style={[ub.tapHint, { color: accentColor }]}>
              {isSelfie ? "Tap to open camera" : "Tap to browse / drag & drop"}
            </AppText>
          </View>
        )}
      </TouchableOpacity>

      {/* Retake / Add Photo / Delete row — shown when value exists */}
      {value && (
        <View style={ub.actionRow}>
          {isSelfie ? (
            <>
              <TouchableOpacity
                style={[ub.actionBtn, { borderColor: accentColor, backgroundColor: accentColor + "10" }]}
                onPress={onRetake}
                activeOpacity={0.8}
              >
                <Icon name="refresh" size={11} color={accentColor} />
                <AppText style={[ub.actionBtnText, { color: accentColor }]}>Retake</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ub.actionBtn, { borderColor: accentColor, backgroundColor: accentColor + "10" }]}
                onPress={onPress}
                activeOpacity={0.8}
              >
                <Icon name="camera" size={11} color={accentColor} />
                <AppText style={[ub.actionBtnText, { color: accentColor }]}>Add Photo</AppText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[ub.actionBtn, { borderColor: accentColor, backgroundColor: accentColor + "10" }]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Icon name="refresh" size={11} color={accentColor} />
              <AppText style={[ub.actionBtnText, { color: accentColor }]}>Replace</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[ub.actionBtn, { borderColor: T.error, backgroundColor: T.error + "10" }]}
            onPress={onDelete}
            activeOpacity={0.8}
          >
            <Icon name="trash" size={11} color={T.error} />
            <AppText style={[ub.actionBtnText, { color: T.error }]}>Delete</AppText>
          </TouchableOpacity>
        </View>
      )}

      {!!error && (
        <View style={ub.errorRow}>
          <Icon name="exclamation-circle" size={11} color={T.error} style={{ marginTop: 4 }} />
          <AppText style={ub.errorText}>{error}</AppText>
        </View>
      )}
    </View>
  );
const ub = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: "700", color: T.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  asterisk: { fontSize: 11, fontWeight: "700" },
  helper: { fontSize: 11, color: T.textLight, marginBottom: 8, fontStyle: "italic" },
  dragHint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderStyle: "dashed", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8,
  },
  dragHintText: { fontSize: 11, fontWeight: "600" },
  box: {
    borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14,
    minHeight: 140, overflow: "hidden", position: "relative",
    backgroundColor: T.white,
  },
  boxFilled: {
    borderStyle: "solid", borderWidth: 2,
  },
  boxError: { borderColor: T.error },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 24 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  uploadTitle: { fontSize: 13, fontWeight: "700", color: T.textDark },
  uploadSub: { fontSize: 11, color: T.textSoft, lineHeight: 16 },
  tapHint: { fontSize: 11, fontWeight: "600", fontStyle: "italic" },
  /* Full visible image preview */
  /* Image preview */
  imagePreviewWrap: {
    width: "100%", backgroundColor: "#F8F9FC",
  },
  preview: {
    width: "100%", height: 220,
    backgroundColor: "#F8F9FC",
  },
  imageOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  /* PDF preview */
  pdfPreview: {
    alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 32,
    backgroundColor: T.white,
  },
  pdfIconBox: {
    width: 72, height: 72, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  pdfLabel: { fontSize: 14, fontWeight: "700", color: T.textDark },
  pdfTapRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  pdfSub: { fontSize: 11, color: T.textSoft, fontStyle: "italic" },
  uploadedBadge: {
    position: "absolute", bottom: 8, right: 8,
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  uploadedBadgeText: { fontSize: 10, fontWeight: "700", color: T.white },
  /* Action row: Retake / Replace / Delete */
  actionRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  actionBtnText: { fontSize: 11, fontWeight: "700" },
  errorRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 6, marginLeft: 2 },
  errorText: { fontSize: 11, color: T.error, fontWeight: "400", flex: 1, lineHeight: 16 },
});

// ─── InputRow — Screen 1 field style ─────────────────────────
const InputRow: React.FC<{
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  iconName: string;
  accentColor?: string | undefined;
  maxLength?: number | undefined;
  error?: string | undefined;
  forceWhiteBg?: boolean;
}> = ({ label, value, onChangeText, placeholder, iconName, accentColor = T.navy, maxLength, error, forceWhiteBg = false }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={inp.wrap}>
      <AppText style={inp.label}>
        {label} <AppText style={[inp.asterisk, { color: accentColor }]}>*</AppText>
      </AppText>
      <View style={[inp.field, {
        borderColor: error ? T.error : focused ? accentColor : T.border,
        backgroundColor: forceWhiteBg ? T.white : focused ? (accentColor === T.navy ? T.navyPale : T.orangePale) : T.white,
      }]}>
        {/* Icon removed as per request */}
        <TextInput
          style={inp.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.textLight}
          maxLength={maxLength}
          autoCapitalize="characters"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {value.trim().length > 0 && !error && (
          <View style={inp.tickBadge}>
            <Icon name="check" size={10} color={T.success} />
          </View>
        )}
      </View>
      {!!error && (
        <View style={inp.errorRow}>
          <Icon name="exclamation-circle" size={11} color={T.error} style={{ marginTop: 4 }} />
          <AppText style={inp.errorText}>{error}</AppText>
        </View>
      )}
    </View>
  );
};
const inp = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: "700", color: T.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  asterisk: { fontSize: 11, fontWeight: "700" },
  field: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 52 },
  iconBox: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  input: { flex: 1, fontSize: 14, color: T.textDark, fontWeight: "400" },
  tickBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: T.success + "15", alignItems: "center", justifyContent: "center" },
  errorRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 5, marginLeft: 2 },
  errorText: { fontSize: 11, color: T.error, fontWeight: "400", flex: 1, lineHeight: 16 },
});

// ─── Main screen ─────────────────────────────────────────────
export default function SellerDocuments() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // ── Scroll to top on mount (unchanged) ──
  useEffect(() => {
    setTimeout(() => { scrollViewRef.current?.scrollTo({ y: 0, animated: false }); }, 100);
  }, []);

  // ── State (100% unchanged) ──
  const [aadharFront, setAadharFront] = useState<string | null>(null);
  const [aadharBack, setAadharBack] = useState<string | null>(null);
  const [panCard, setPanCard] = useState<string | null>(null);
  const [businessProof, setBusinessProof] = useState<string | null>(null);
  const [bankAccountProof, setBankAccountProof] = useState<string | null>(null);
  const [cancelledCheque, setCancelledCheque] = useState<string | null>(null);
  const [liveSelfies, setLiveSelfies] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [businessCategory, setBusinessCategory] = useState<string>("");
  const [companyPanNumber, setCompanyPanNumber] = useState<string>("");
  const [companyPanError, setCompanyPanError] = useState<string>("");
  const [companyPanDocument, setCompanyPanDocument] = useState<string | null>(null);
  const [certificateOfIncorporation, setCertificateOfIncorporation] = useState<string | null>(null);
  const [partnershipDeed, setPartnershipDeed] = useState<string | null>(null);
  const [msmeUdyamCertificate, setMsmeUdyamCertificate] = useState<string | null>(null);
  const [iecCertificate, setIecCertificate] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ field: string; message: string }[]>([]);
  const [success, setSuccess] = useState(false);

  // Track file types (image vs pdf) for each document
  const [fileTypes, setFileTypes] = useState<Record<string, "image" | "pdf">>({});
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const [pendingDocumentType, setPendingDocumentType] = useState<string>("");
  const setFileType = (field: string, type: "image" | "pdf") =>
    setFileTypes(prev => ({ ...prev, [field]: type }));

  // ── Reanimated (unchanged) ──
  const modalOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.92);

  // ── Router params (unchanged) ──
  const routerParams = useLocalSearchParams();
  React.useEffect(() => {
    const cat = routerParams.businessCategory as string;
    if (cat) setBusinessCategory(cat);
  }, [routerParams]);

  // ── Helpers (unchanged) ──
  const clearFieldError = (field: string) =>
    setValidationErrors(prev => prev.filter(e => e.field !== field));

  const getError = (field: string) =>
    validationErrors.find(e => e.field === field)?.message;

  // ── Document picker: images + PDFs ──
  const pickDocument = (documentType: string) => {
    setPendingDocumentType(documentType);
    setSourceModalVisible(true);
  };

  const handlePickFromLibrary = async () => {
    setSourceModalVisible(false);
    await new Promise(r => setTimeout(r, 300));
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera roll permission is needed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]) {
      setDocumentValue(pendingDocumentType, result.assets[0].uri);
      setFileType(pendingDocumentType, "image");
      clearFieldError(pendingDocumentType);
    }
  };

  const handlePickPdf = async () => {
    setSourceModalVisible(false);
    await new Promise(r => setTimeout(r, 300));
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setDocumentValue(pendingDocumentType, asset.uri);
      setFileType(pendingDocumentType, asset.mimeType === "application/pdf" ? "pdf" : "image");
      clearFieldError(pendingDocumentType);
    }
  };

  // ── Helper to set doc value by field name ──
  const setDocumentValue = (field: string, uri: string) => {
    const map: Record<string, (v: string) => void> = {
      aadharFront: setAadharFront,
      aadharBack: setAadharBack,
      panCard: setPanCard,
      businessProof: setBusinessProof,
      bankAccountProof: setBankAccountProof,
      cancelledCheque: setCancelledCheque,
      liveSelfie: (uri) => setLiveSelfies(prev => [...prev, uri]),
      companyPanDocument: setCompanyPanDocument,
      certificateOfIncorporation: setCertificateOfIncorporation,
      partnershipDeed: setPartnershipDeed,
      msmeUdyamCertificate: setMsmeUdyamCertificate,
      iecCertificate: setIecCertificate,
    };
    map[field]?.(uri);
  };

  // ── Helper to clear (delete) a document ──
  const deleteDocument = (field: string) => {
    setDocumentValue(field, "");
    // For fields that use null, we need to explicitly null them
    const nullMap: Record<string, () => void> = {
      aadharFront: () => setAadharFront(null),
      aadharBack: () => setAadharBack(null),
      panCard: () => setPanCard(null),
      businessProof: () => setBusinessProof(null),
      bankAccountProof: () => setBankAccountProof(null),
      cancelledCheque: () => setCancelledCheque(null),
      liveSelfie: () => setLiveSelfies([]),
      companyPanDocument: () => setCompanyPanDocument(null),
      certificateOfIncorporation: () => setCertificateOfIncorporation(null),
      partnershipDeed: () => setPartnershipDeed(null),
      msmeUdyamCertificate: () => setMsmeUdyamCertificate(null),
      iecCertificate: () => setIecCertificate(null),
    };
    nullMap[field]?.();
    setFileTypes(prev => { const n = { ...prev }; delete n[field]; return n; });
    clearFieldError(field);
  };

  // ── Selfie capture (unchanged) ──
  const captureSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Sorry, we need camera permission to capture your selfie.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;
      setLiveSelfies(prev => [...prev, uri]);
      clearFieldError("liveSelfie");
    }
  };

  // ── Validation (unchanged) ──
  const validateDocuments = () => {
    const errors: { field: string; message: string }[] = [];
    if (!aadharFront) errors.push({ field: "aadharFront", message: "Aadhaar Card (Front) is required" });
    if (!aadharBack) errors.push({ field: "aadharBack", message: "Aadhaar Card (Back) is required" });
    if (!panCard) errors.push({ field: "panCard", message: "PAN Card is required" });
    if (!businessProof) errors.push({ field: "businessProof", message: "Business Proof is required" });
    if (!bankAccountProof) errors.push({ field: "bankAccountProof", message: "Bank Account Proof is required" });
    if (!cancelledCheque) errors.push({ field: "cancelledCheque", message: "Cancelled Cheque is required" });
    if ((liveSelfies ?? []).length === 0) errors.push({ field: "liveSelfie", message: "Live Selfie is required" });
    if (!termsAccepted) errors.push({ field: "termsAccepted", message: "You must accept the Terms and Conditions" });
    if (businessCategory === "B2B") {
      if (!companyPanNumber.trim()) errors.push({ field: "companyPanNumber", message: "Company PAN Number is required" });
      if (!companyPanDocument) errors.push({ field: "companyPanDocument", message: "Company PAN Document is required" });
      if (!certificateOfIncorporation) errors.push({ field: "certificateOfIncorporation", message: "Certificate of Incorporation is required" });
      if (!partnershipDeed) errors.push({ field: "partnershipDeed", message: "Partnership Deed is required" });
      if (!msmeUdyamCertificate) errors.push({ field: "msmeUdyamCertificate", message: "MSME / Udyam Certificate is required" });
      if (!iecCertificate) errors.push({ field: "iecCertificate", message: "Import Export Code (IEC) is required" });
    }
    return errors;
  };

  // ── Finish (unchanged) ──
  const handleFinish = () => {
    const errors = validateDocuments();
    if (errors.length > 0) { setValidationErrors(errors); return; }
    setSuccess(true);
    modalOpacity.value = withTiming(1, { duration: 400 });
    modalScale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const closeModal = () => {
    modalOpacity.value = withTiming(0, { duration: 300 });
    modalScale.value = withTiming(0.92, { duration: 300 });
    setTimeout(() => { setSuccess(false); router.push("/(main)/dashboard"); }, 300);
  };

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
              <AppText style={s.headerLabel}>STEP 5 OF 5</AppText>
              <AppText style={s.headerTitle}>Upload Documents</AppText>
              <AppText style={s.headerSub}>Submit clear documents for verification</AppText>
            </View>
          </View>
          <View style={s.progressRow}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={[s.progressSeg, { backgroundColor: T.orange }]} />
            ))}
          </View>
          <AppText style={s.progressLabel}>Step 5 of 5 — Upload Documents</AppText>
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

          {/* ── B2B: Business Verification card ── */}
          {businessCategory === "B2B" && (
            <SectionCard
              title="Business Verification"
              subtitle="Required additional documents for B2B sellers"
              accentColor={T.orange}
              iconName="briefcase"
            >
              <InfoBanner
                text="Upload clear and readable copies. All documents must be valid and unexpired."
                iconName="exclamation-circle"
                color={T.orange}
              />

              <InputRow
                label="Company PAN Number"
                value={companyPanNumber}
                onChangeText={(t) => {
                  const upper = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
                  setCompanyPanNumber(upper);
                  const e = validateCompanyPan(upper);
                  setCompanyPanError(e);
                  if (!e) clearFieldError("companyPanNumber");
                  else clearFieldError("companyPanNumber");
                }}
                placeholder="e.g. AAACB1234C"
                iconName="id-card"
                accentColor={T.orange}
                maxLength={10}
                error={companyPanNumber.length > 0 ? companyPanError : getError("companyPanNumber")}
                forceWhiteBg
              />

              <UploadBox label="Company PAN Document" value={companyPanDocument}
                fileType={fileTypes["companyPanDocument"] ?? null}
                onPress={() => pickDocument("companyPanDocument")}
                onDelete={() => deleteDocument("companyPanDocument")}
                error={getError("companyPanDocument")} accentColor={T.orange} />

              <UploadBox label="Certificate of Incorporation" value={certificateOfIncorporation}
                helper="Pvt Ltd / LLP"
                fileType={fileTypes["certificateOfIncorporation"] ?? null}
                onPress={() => pickDocument("certificateOfIncorporation")}
                onDelete={() => deleteDocument("certificateOfIncorporation")}
                error={getError("certificateOfIncorporation")} accentColor={T.orange} />

              <UploadBox label="Partnership Deed" value={partnershipDeed}
                helper="For partnership firms"
                fileType={fileTypes["partnershipDeed"] ?? null}
                onPress={() => pickDocument("partnershipDeed")}
                onDelete={() => deleteDocument("patnershipDeed")}
                error={getError("partnershipDeed")} accentColor={T.orange} />

              <UploadBox label="MSME / Udyam Certificate" value={msmeUdyamCertificate}
                helper="If registered under MSME"
                fileType={fileTypes["msmeUdyamCertificate"] ?? null}
                onPress={() => pickDocument("msmeUdyamCertificate")}
                onDelete={() => deleteDocument("msmeUdyamCertificate")}
                error={getError("msmeUdyamCertificate")} accentColor={T.orange} />

              <UploadBox label="Import Export Code (IEC)" value={iecCertificate}
                helper="For import/export businesses"
                fileType={fileTypes["iecCertificate"] ?? null}
                onPress={() => pickDocument("iecCertificate")}
                onDelete={() => deleteDocument("iecCertificate")}
                error={getError("iecCertificate")} accentColor={T.orange} />
            </SectionCard>
          )}

          {/* ── Identity & Business Documents card ── */}
          <SectionCard
            title="Identity & Business Documents"
            subtitle="Required for all sellers — upload clear, readable copies"
            accentColor={T.navy}
            iconName="id-card"
          >
            <InfoBanner
              text="All documents must be valid, clearly photographed, and match your registered details."
              iconName="info-circle"
              color={T.navy}
            />

            <UploadBox label="Aadhaar Card (Front)" value={aadharFront}
              fileType={fileTypes["aadharFront"] ?? null}
              onPress={() => pickDocument("aadharFront")}
              onDelete={() => deleteDocument("aadharFront")}
              error={getError("aadharFront")} accentColor={T.navy} />

            <UploadBox label="Aadhaar Card (Back)" value={aadharBack}
              fileType={fileTypes["aadharBack"] ?? null}
              onPress={() => pickDocument("aadharBack")}
              onDelete={() => deleteDocument("aadharBack")}
              error={getError("aadharBack")} accentColor={T.navy} />

            <UploadBox label="PAN Card" value={panCard}
              fileType={fileTypes["panCard"] ?? null}
              onPress={() => pickDocument("panCard")}
              onDelete={() => deleteDocument("panCard")}
              error={getError("panCard")} accentColor={T.navy} />

            <UploadBox label="Business Proof" value={businessProof}
              helper="Shop License / Registration Certificate / GST Certificate"
              fileType={fileTypes["businessProof"] ?? null}
              onPress={() => pickDocument("businessProof")}
              onDelete={() => deleteDocument("businessProof")}
              error={getError("businessProof")} accentColor={T.navy} />

            <UploadBox label="Bank Account Proof" value={bankAccountProof}
              helper="Bank Statement / Passbook"
              fileType={fileTypes["bankAccountProof"] ?? null}
              onPress={() => pickDocument("bankAccountProof")}
              onDelete={() => deleteDocument("bankAccountProof")}
              error={getError("bankAccountProof")} accentColor={T.navy} />

            <UploadBox label="Cancelled Cheque" value={cancelledCheque}
              helper="Upload a clear image of your cancelled cheque"
              fileType={fileTypes["cancelledCheque"] ?? null}
              onPress={() => pickDocument("cancelledCheque")}
              onDelete={() => deleteDocument("cancelledCheque")}
              error={getError("cancelledCheque")} accentColor={T.navy} />

            {/* Important note for Live Selfie */}
            <View style={s.selfieNote}>
              <View style={s.selfieNoteHeader}>
                <Icon name="exclamation-triangle" size={13} color={T.orange} />
                <AppText style={s.selfieNoteTitle}>Important</AppText>
              </View>
              <AppText style={s.selfieNoteText}>
                Please allow camera access and ensure you capture a live selfie, as well as upload the required images of your Aadhaar card, PAN card, GSTIN certificate, shop license, bank proof, and shop. If you have already applied for GSTIN, please take a picture along with your valid application proof for verification.
              </AppText>
            </View>

            {/* Multi-selfie upload area */}
            <View style={s.selfieSection}>
              <AppText style={s.selfieFieldLabel}>
                Live Selfie <AppText style={{ color: T.navy }}>*</AppText>
              </AppText>
              <AppText style={s.selfieFieldHelper}>Use camera to take a live photo</AppText>

              {/* All captured selfie previews */}
              {(liveSelfies ?? []).length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.selfieScroll}
                  contentContainerStyle={s.selfieScrollContent}
                >
                  {(liveSelfies ?? []).map((uri, index) => (
                    <View key={index} style={s.selfieThumbWrap}>
                      <Image source={{ uri }} style={s.selfieThumb} resizeMode="cover" />
                      {/* Index badge */}
                      <View style={s.selfieIndexBadge}>
                        <AppText style={s.selfieIndexText}>{index + 1}</AppText>
                      </View>
                      {/* Delete individual photo */}
                      <TouchableOpacity
                        style={s.selfieDeleteBtn}
                        onPress={() => setLiveSelfies(prev => prev.filter((_, i) => i !== index))}
                        activeOpacity={0.8}
                      >
                        <Icon name="times" size={10} color={T.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Action buttons row */}
              <View style={s.selfieActionsRow}>
                {/* Retake — replaces the last photo */}
                {(liveSelfies ?? []).length > 0 && (
                  <TouchableOpacity
                    style={[s.selfieActionBtn, { borderColor: T.navy, backgroundColor: T.navy + "10" }]}
                    onPress={async () => {
                      const { status } = await ImagePicker.requestCameraPermissionsAsync();
                      if (status !== "granted") {
                        Alert.alert("Permission Required", "Camera permission is needed.");
                        return;
                      }
                      const result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        quality: 1,
                        aspect: [1, 1],
                      });
                      if (!result.canceled && result.assets?.[0]) {
                        // Replace last photo
                        const newUri = result.assets[0].uri;
                        setLiveSelfies(prev => [...prev.slice(0, -1), newUri]);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Icon name="refresh" size={12} color={T.navy} />
                    <AppText style={[s.selfieActionBtnText, { color: T.navy }]}>Retake</AppText>
                  </TouchableOpacity>
                )}

                {/* Add Photo — only visible when selfies exist */}
                {(liveSelfies ?? []).length > 0 && (
                  <TouchableOpacity
                    style={[s.selfieActionBtn, {
                      borderColor: T.orange,
                      backgroundColor: T.orange + "10",
                    }]}
                    onPress={captureSelfie}
                    activeOpacity={0.8}
                  >
                    <Icon name="camera" size={12} color={T.orange} />
                    <AppText style={[s.selfieActionBtnText, { color: T.orange }]}>Add Photo</AppText>
                  </TouchableOpacity>
                )}

                {/* Delete All */}
                {(liveSelfies ?? []).length > 0 && (
                  <TouchableOpacity
                    style={[s.selfieActionBtn, { borderColor: T.error, backgroundColor: T.error + "10" }]}
                    onPress={() => {
                      Alert.alert("Delete All", "Remove all selfie photos?", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete All", style: "destructive", onPress: () => { setLiveSelfies([]); clearFieldError("liveSelfie"); } },
                      ]);
                    }}
                    activeOpacity={0.8}
                  >
                    <Icon name="trash" size={12} color={T.error} />
                    <AppText style={[s.selfieActionBtnText, { color: T.error }]}>Delete All</AppText>
                  </TouchableOpacity>
                )}
              </View>

              {/* Photo count badge */}
              {(liveSelfies ?? []).length > 0 && (
                <View style={s.selfieCountBadge}>
                  <Icon name="check-circle" size={11} color={T.success} />
                  <AppText style={s.selfieCountText}>{(liveSelfies ?? []).length} photo{(liveSelfies ?? []).length > 1 ? "s" : ""} captured</AppText>
                </View>
              )}

              {/* Empty state box */}
              {(liveSelfies ?? []).length === 0 && (
                <TouchableOpacity
                  style={[s.selfieEmptyBox, getError("liveSelfie") ? { borderColor: T.error } : { borderColor: T.navy + "40" }]}
                  onPress={captureSelfie}
                  activeOpacity={0.85}
                >
                  <View style={[s.selfieEmptyIcon, { backgroundColor: T.navy + "12" }]}>
                    <Icon name="camera" size={22} color={T.navy} />
                  </View>
                  <AppText style={s.selfieEmptyTitle}>No selfie captured yet</AppText>
                  <AppText style={s.selfieEmptySub}>Tap &quot;Capture Selfie&quot; above or this box</AppText>
                </TouchableOpacity>
              )}

              {!!getError("liveSelfie") && (
                <View style={s.selfieErrorRow}>
                  <Icon name="exclamation-circle" size={11} color={T.error} style={{ marginTop: 4 }} />
                  <AppText style={s.selfieErrorText}>{getError("liveSelfie")}</AppText>
                </View>
              )}
            </View>
          </SectionCard>

          {/* ── Terms & Submit card ── */}
          <SectionCard
            title="Review & Submit"
            subtitle="Accept our terms to complete your seller registration"
            accentColor={T.orange}
            iconName="shield"
          >
            <InfoBanner
              text="By submitting, you confirm all uploaded documents are genuine and accurate."
              iconName="lock"
              color={T.orange}
            />

            {/* Checkbox — Screen 1 infoBanner container style */}
            <TouchableOpacity
              style={[s.checkboxRow, termsAccepted && s.checkboxRowChecked]}
              onPress={() => {
                const newVal = !termsAccepted;
                setTermsAccepted(newVal);
                if (newVal) clearFieldError("termsAccepted");
              }}
              activeOpacity={0.85}
            >
              {/* Custom checkbox — orange when checked */}
              <View style={[s.checkbox, termsAccepted && { backgroundColor: T.orange, borderColor: T.orange }]}>
                {termsAccepted && <Icon name="check" size={11} color={T.white} />}
              </View>
              {/* Screen 1 infoBannerText style */}
              <AppText style={s.termsText}>
                I agree to the{" "}
                <AppText style={{ color: T.orange, fontWeight: "700" }}>Terms & Conditions</AppText>
                {" "}and{" "}
                <AppText style={{ color: T.orange, fontWeight: "700" }}>Privacy Policy</AppText>
              </AppText>
            </TouchableOpacity>

            {!!getError("termsAccepted") && (
              <View style={s.termsErrorRow}>
                <Icon name="exclamation-circle" size={11} color={T.error} style={{ marginTop: 4 }} />
                <AppText style={s.termsErrorText}>{getError("termsAccepted")}</AppText>
              </View>
            )}
          </SectionCard>

          {/* ── Buttons — exact Screen 1 ── */}
          <View style={s.buttonRow}>
            {/* Back — navy outline */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={s.backBtn}
              activeOpacity={0.85}
            >
              <View style={s.backBtnInner}>
                <AppText style={s.backBtnText}>Back</AppText>
              </View>
            </TouchableOpacity>


            {/* Submit — orange gradient, Screen 1 continueBtn style */}
            <TouchableOpacity onPress={handleFinish} style={s.continueBtn} activeOpacity={0.85}>
              <LinearGradient
                colors={[T.orange, T.orangeDeep]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.continueBtnInner}
              >
                {/* Screen 1: 16px 800 white letterSpacing 0.2 */}
                <AppText style={s.continueBtnText}>Submit Profile</AppText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Success Modal (functionality unchanged, restyled) ── */}
      {/* ── Source Picker Modal ── */}
      <Modal visible={sourceModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={sm.overlay}
          activeOpacity={1}
          onPress={() => setSourceModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={sm.sheet}>
            {/* Handle bar */}
            <View style={sm.handle} />

            {/* Header */}
            <View style={sm.header}>

              <View style={{ flex: 1 }}>
                <AppText style={sm.headerTitle}>Add Document</AppText>
                <AppText style={sm.headerSub}>Choose how to upload your file</AppText>
              </View>
              <TouchableOpacity
                style={sm.closeBtn}
                onPress={() => setSourceModalVisible(false)}
                activeOpacity={0.7}
              >
                <Icon name="times" size={14} color={T.textSoft} />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={sm.divider} />

            {/* Options */}
            <TouchableOpacity style={sm.option} onPress={handlePickFromLibrary} activeOpacity={0.85}>
              <LinearGradient
                colors={[T.navy + "12", T.navy + "06"]}
                style={sm.optionIconBox}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Icon name="image" size={20} color={T.navy} />
              </LinearGradient>
              <View style={sm.optionText}>
                <AppText style={sm.optionTitle}>Photo Library</AppText>
                <AppText style={sm.optionSub}>Choose an image from your gallery</AppText>
              </View>
              <Icon name="chevron-right" size={12} color={T.textLight} />
            </TouchableOpacity>

            <TouchableOpacity style={sm.option} onPress={handlePickPdf} activeOpacity={0.85}>
              <LinearGradient
                colors={[T.orange + "18", T.orange + "08"]}
                style={sm.optionIconBox}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Icon name="file-pdf-o" size={20} color={T.orange} />
              </LinearGradient>
              <View style={sm.optionText}>
                <AppText style={sm.optionTitle}>PDF / File</AppText>
                <AppText style={sm.optionSub}>Browse and select a PDF document</AppText>
              </View>
              <Icon name="chevron-right" size={12} color={T.textLight} />
            </TouchableOpacity>

            {/* Cancel */}
            {/* <TouchableOpacity
              style={sm.cancelBtn}
              onPress={() => setSourceModalVisible(false)}
              activeOpacity={0.85}
            >
              <AppText style={sm.cancelText}>Cancel</AppText>
            </TouchableOpacity> */}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      <Modal visible={success} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Animated.View style={[s.modalCard, { opacity: modalOpacity, transform: [{ scale: modalScale }] }]}>
            {/* Success icon — green glow circles */}
            <View style={s.successIconWrap}>
              <View style={s.successOuter}>
                <View style={s.successMiddle}>
                  <LinearGradient
                    colors={["#22C55E", "#16A34A"]}
                    style={s.successInner}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <Icon name="check" size={24} color={T.white} />
                  </LinearGradient>
                </View>
              </View>
            </View>

            {/* Orange top accent bar on modal card */}
            <View style={s.modalAccent} />

            {/* Screen 1 headerTitle style adapted */}
            <AppText style={s.modalTitle}>Profile Submitted!</AppText>
            {/* Screen 1 scard.subtitle style */}
            <AppText style={s.modalDesc}>
              Your seller profile has been submitted for verification. Our team will review your documents within 24 hours.
            </AppText>

            {/* Status chip */}
            <View style={s.statusChip}>
              <View style={s.statusDot} />
              <AppText style={s.statusText}>Verification in Progress</AppText>
            </View>

            {/* Modal CTA — Screen 1 continueBtn */}
            <TouchableOpacity onPress={closeModal} style={s.modalBtn} activeOpacity={0.85}>
              <LinearGradient
                colors={[T.orange, T.orangeDeep]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.modalBtnInner}
              >
                <AppText style={s.modalBtnText}>Go to Dashboard</AppText>
                <Icon name="chevron-right" size={12} color={T.white} style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Source Picker Modal styles ───────────────────────────────
const sm = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(10,21,51,0.52)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    shadowColor: T.navy, shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: T.border, alignSelf: "center", marginBottom: 18,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16,
  },
  headerIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: T.navyPale, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontWeight: "800", color: T.textDark },
  headerSub: { fontSize: 11, color: T.textSoft, marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: T.bg, alignItems: "center", justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: T.borderLight, marginBottom: 16 },
  option: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1, borderColor: T.borderLight,
    backgroundColor: T.white, marginBottom: 10,
  },
  optionIconBox: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
  },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: "700", color: T.textDark },
  optionSub: { fontSize: 11, color: T.textSoft, marginTop: 2 },
  cancelBtn: {
    marginTop: 6, height: 48, borderRadius: 12,
    backgroundColor: T.bg, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: T.borderLight,
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: T.textSoft },
});
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
  headerLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: T.white, marginBottom: 2 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  headerBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },

  // ── Progress — exact Screen 1 ──
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 7 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "600" },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },

  // ── Terms checkbox row — Screen 1 infoBanner container ──
  checkboxRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: T.borderLight,
  },
  checkboxRowChecked: { borderColor: T.orangeSoft },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: T.border,
    backgroundColor: T.white,
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  /* Screen 1 infoBannerText: 12px textMid lineHeight 17 weight 500 */
  termsText: { flex: 1, fontSize: 12, color: T.textMid, lineHeight: 17, fontWeight: "500" },
  termsErrorRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 8, marginLeft: 2 },
  termsErrorText: { fontSize: 11, color: T.error, fontWeight: "400", flex: 1, lineHeight: 16 },

  // ── Buttons — exact Screen 1 ──
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 4 },
  backBtn: { flex: 1, borderRadius: 14, borderWidth: 2, borderColor: T.navy, overflow: "hidden" },
  backBtnInner: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: T.white, borderRadius: 12 },
  backBtnText: { fontSize: 15, fontWeight: "700", color: T.navy },
  continueBtn: { flex: 2 },
  continueBtnInner: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14 },
  continueBtnText: { fontSize: 16, fontWeight: "800", color: T.white, letterSpacing: 0.2 },

  // ── Success Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(10,21,51,0.55)",
    justifyContent: "center", alignItems: "center", paddingHorizontal: 20,
  },
  modalCard: {
    width: screenWidth * 0.88, backgroundColor: T.cardBg,
    borderRadius: 24, overflow: "hidden",
    padding: 28, paddingTop: 24,
    shadowColor: T.navy, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 30, elevation: 18,
    alignItems: "center",
  },
  /* Orange top accent on modal — matches SectionCard topBar */
  modalAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: T.orange },
  successIconWrap: { marginBottom: 20, marginTop: 16, alignItems: "center", justifyContent: "center" },
  successOuter: { width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(34,197,94,0.1)", justifyContent: "center", alignItems: "center" },
  successMiddle: { width: 62, height: 62, borderRadius: 31, backgroundColor: "rgba(34,197,94,0.18)", justifyContent: "center", alignItems: "center" },
  successInner: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  /* Screen 1: 18px 800 textDark */
  modalTitle: { fontSize: 20, fontWeight: "800", color: T.textDark, textAlign: "center", marginBottom: 10, letterSpacing: -0.3 },
  /* Screen 1 scard.subtitle */
  modalDesc: { fontSize: 12, color: T.textSoft, textAlign: "center", lineHeight: 18, marginBottom: 16 },
  statusChip: { flexDirection: "row", alignItems: "center", backgroundColor: T.successBg, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginBottom: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.success, marginRight: 7 },
  /* Screen 1: 11px 700 uppercase */
  statusText: { fontSize: 11, fontWeight: "700", color: T.success, letterSpacing: 0.5, textTransform: "uppercase" },
  /* Modal CTA — Screen 1 continueBtn */
  modalBtn: { width: "100%", borderRadius: 14, overflow: "hidden" },
  modalBtnInner: { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 15, fontWeight: "800", color: T.white, letterSpacing: 0.2 },

  // ── Live Selfie important note ──
  selfieNote: {
    borderWidth: 1, borderColor: T.orange + "40",
    backgroundColor: T.orangePale,
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  selfieNoteHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  selfieNoteTitle: { fontSize: 12, fontWeight: "800", color: T.orange, textTransform: "uppercase", letterSpacing: 0.5 },
  selfieNoteText: { fontSize: 11, color: T.orangeDeep, lineHeight: 17, fontWeight: "500" },

  // ── Multi-selfie section ──
  selfieSection: { marginBottom: 16 },
  selfieFieldLabel: { fontSize: 11, fontWeight: "700", color: T.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  selfieFieldHelper: { fontSize: 11, color: T.textLight, marginBottom: 10, fontStyle: "italic" },

  selfieScroll: { marginBottom: 10 },
  selfieScrollContent: { gap: 10, paddingRight: 4 },

  selfieThumbWrap: {
    width: 100, height: 100, borderRadius: 12,
    overflow: "visible", position: "relative",
    marginTop: 10,    /* room for delete badge at top */
    marginBottom: 10, /* room for index badge at bottom */
    marginLeft: 8,    /* room for index badge at left */
    marginRight: 8,   /* room for delete badge at right */
  },
  selfieThumb: {
    width: 100, height: 100, borderRadius: 12,
    borderWidth: 2, borderColor: T.navy + "30",
  },
  selfieIndexBadge: {
    position: "absolute", bottom: -10, left: -10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: T.navy, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: T.white,
    zIndex: 10,
  },
  selfieIndexText: { fontSize: 9, fontFamily: fontFamilies.bold, color: T.white },
  selfieDeleteBtn: {
    position: "absolute", top: -10, right: -10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: T.error, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: T.white,
    zIndex: 10,
  },

  selfieActionsRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  selfieActionBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  selfieActionBtnText: { fontSize: 12, fontWeight: "700" },

  selfieCountBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  selfieCountText: { fontSize: 11, fontWeight: "600", color: T.success },

  selfieEmptyBox: {
    borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14,
    height: 120, alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: T.white,
  },
  selfieEmptyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  selfieEmptyTitle: { fontSize: 13, fontWeight: "700", color: T.textDark },
  selfieEmptySub: { fontSize: 11, color: T.textSoft },

  selfieErrorRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 4, marginLeft: 2 },
  selfieErrorText: { fontSize: 11, color: T.error, fontWeight: "400", flex: 1, lineHeight: 16 },

});

