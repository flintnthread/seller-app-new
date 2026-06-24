/**
 * Seller Documents - Screen 5 of 5
 * Pixel-perfect match to Screen 1 — navy & orange premium onboarding
 *
 * WEB ENHANCEMENTS (mobile code 100% unchanged):
 *  - UploadBox: drag & drop support on web (Platform.OS === 'web')
 *  - Live Selfie: inline camera panel in the selfie section (web + mobile)
 *  - 2-column grid for upload boxes on web (width >= 600)
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
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
  useWindowDimensions,
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
import { useSweetAlert } from "@/components/common/SweetAlert";
import { hydrateSellerSession } from "@/lib/api/sellerSession";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import {
  fetchSellerProfile,
  getApiErrorMessage,
  resolveDocumentDisplayUrl,
  submitSellerProfile,
  SELLER_DOCUMENT_TYPES,
  toUiBusinessCategory,
  updateCompanyPan,
  uploadSellerDocument,
  type SellerDocumentField,
} from "@/services/sellerProfileApi";
import { scrollToFormField } from "@/lib/form/scrollToFormField";

const { width: screenWidth } = Dimensions.get("window");

// ─── Breakpoint for web two-column layout ────────────────────
const WEB_BREAKPOINT = 600;

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

interface ValidationError { field: string; message: string; }

// ─── WEB ONLY: Drag & Drop wrapper ───────────────────────────
const WebDragWrapper: React.FC<{
  children: React.ReactNode;
  onFileDrop: (uri: string, fileType: "image" | "pdf") => void;
  accentColor?: string;
  disabled?: boolean;
  imagesOnly?: boolean;
}> = ({ children, onFileDrop, accentColor = T.navy, disabled = false, imagesOnly = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  const handleDragOver = (e: any) => { e.preventDefault(); e.stopPropagation(); if (!disabled) setIsDragging(true); };
  const handleDragEnter = (e: any) => { e.preventDefault(); e.stopPropagation(); if (!disabled) setIsDragging(true); };
  const handleDragLeave = (e: any) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

  const handleDrop = (e: any) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (imagesOnly && !isImage) {
      window?.alert("Only image files (JPG, PNG) are supported.");
      return;
    }
    if (!isPdf && !isImage) { window?.alert("Only images (JPG, PNG) or PDF files are supported."); return; }
    const reader = new FileReader();
    reader.onload = (ev: any) => { const dataUri = ev.target?.result as string; if (dataUri) onFileDrop(dataUri, isPdf ? "pdf" : "image"); };
    reader.readAsDataURL(file);
  };

  const overlayStyle: React.CSSProperties = { position: "relative", transition: "all 0.18s ease" };
  const dragOverlayStyle: React.CSSProperties = {
    position: "absolute", inset: 0, borderRadius: 14,
    border: `2.5px dashed ${accentColor}`, backgroundColor: `${accentColor}12`,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    zIndex: 10, pointerEvents: "none", gap: 8,
  };

  return (
    <div style={overlayStyle} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {children}
      {isDragging && (
        <div style={dragOverlayStyle}>
          <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: `${accentColor}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 26 }}>⬆️</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: accentColor }}>Drop file here</span>
          <span style={{ fontSize: 11, color: T.textSoft }}>JPG, PNG or PDF accepted</span>
        </div>
      )}
    </div>
  );
};

// ─── Inline selfie camera (opens in place — web + mobile) ────
const InlineSelfieCamera: React.FC<{
  active: boolean;
  onCapture: (uri: string) => void;
  onClose: () => void;
}> = ({ active, onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [nativeBusy, setNativeBusy] = useState(false);

  const stopStream = useCallback(() => {
    const mediaStream = videoRef.current?.srcObject as MediaStream | null;
    mediaStream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStream(null);
  }, []);

  useEffect(() => {
    if (!active || Platform.OS !== "web") return;
    let localStream: MediaStream | null = null;
    const startCamera = async () => {
      setError("");
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
          void videoRef.current.play();
        }
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setError("Camera permission was denied. Please allow camera access in your browser settings.");
        } else if (err.name === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError("Could not access camera: " + (err.message || "Unknown error"));
        }
      }
    };
    void startCamera();
    return () => {
      localStream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [active]);

  const handleWebCapture = useCallback(() => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count -= 1;
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);
        const video = videoRef.current;
        if (!video) {
          setCapturing(false);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        const dataUri = canvas.toDataURL("image/jpeg", 0.92);
        stopStream();
        setCapturing(false);
        onCapture(dataUri);
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, [capturing, onCapture, stopStream]);

  const handleNativeCapture = async () => {
    if (nativeBusy) return;
    setNativeBusy(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is needed to capture your selfie.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        onCapture(result.assets[0].uri);
      }
    } finally {
      setNativeBusy(false);
    }
  };

  const handleClose = () => {
    stopStream();
    setCountdown(null);
    setCapturing(false);
    setError("");
    onClose();
  };

  if (!active) return null;

  if (Platform.OS !== "web") {
    return (
      <View style={isc.card}>
        <LinearGradient colors={[T.navy, T.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={isc.header}>
          <View style={{ flex: 1 }}>
            <AppText style={isc.headerTitle}>Take a Selfie</AppText>
            <AppText style={isc.headerSub}>Camera opens from here — no need to scroll</AppText>
          </View>
          <TouchableOpacity style={isc.closeBtn} onPress={handleClose} activeOpacity={0.8}>
            <Icon name="times" size={14} color={T.white} />
          </TouchableOpacity>
        </LinearGradient>
        <View style={isc.nativePreview}>
          <View style={isc.nativePreviewIcon}>
            <Icon name="camera" size={28} color={T.navy} />
          </View>
          <AppText style={isc.nativePreviewTitle}>Ready to capture</AppText>
          <AppText style={isc.nativePreviewSub}>Position your face in good lighting, then tap capture</AppText>
        </View>
        <View style={isc.footer}>
          <TouchableOpacity
            style={[isc.captureBtn, nativeBusy && { opacity: 0.6 }]}
            onPress={() => void handleNativeCapture()}
            disabled={nativeBusy}
            activeOpacity={0.85}
          >
            <Icon name="camera" size={16} color={T.white} />
            <AppText style={isc.captureBtnText}>{nativeBusy ? "Opening camera…" : "Capture Selfie"}</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
            <AppText style={isc.cancelText}>Cancel</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const videoWrapStyle: React.CSSProperties = {
    position: "relative",
    backgroundColor: "#0a0a0a",
    minHeight: 280,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const videoStyle: React.CSSProperties = {
    width: "100%",
    maxHeight: 320,
    objectFit: "cover",
    transform: "scaleX(-1)",
    display: "block",
  };
  const countdownStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 5,
  };
  const captureRingStyle: React.CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: "50%",
    border: `3px solid ${T.navy}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: capturing ? "not-allowed" : "pointer",
    backgroundColor: "transparent",
    outline: "none",
  };

  return (
    <View style={isc.card}>
      <LinearGradient colors={[T.navy, T.navyMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={isc.header}>
        <View style={{ flex: 1 }}>
          <AppText style={isc.headerTitle}>Take a Selfie</AppText>
          <AppText style={isc.headerSub}>Position your face in the frame</AppText>
        </View>
        <TouchableOpacity style={isc.closeBtn} onPress={handleClose} activeOpacity={0.8}>
          <Icon name="times" size={14} color={T.white} />
        </TouchableOpacity>
      </LinearGradient>
      <div style={videoWrapStyle}>
        {error ? (
          <div style={{ padding: 20, textAlign: "center", color: T.error, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
            {error}
          </div>
        ) : (
          <>
            <video ref={videoRef} style={videoStyle} autoPlay playsInline muted />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: 140, height: 175, borderRadius: "50%", border: "2px dashed rgba(255,255,255,0.5)" }} />
            </div>
            {countdown !== null && (
              <div style={countdownStyle}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 900, color: T.white }}>
                  {countdown}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <View style={isc.footer}>
        <AppText style={isc.footerHint}>
          {capturing ? "Hold still…" : "Tap capture — 3 second countdown"}
        </AppText>
        {!error && (
          <button
            type="button"
            onClick={handleWebCapture}
            disabled={capturing || !stream}
            style={captureRingStyle}
            title="Capture selfie"
          >
            <span style={{ fontSize: 18 }}>📷</span>
          </button>
        )}
        <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
          <AppText style={isc.cancelText}>Cancel</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const isc = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: T.navy + "40",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: T.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  headerTitle: { fontSize: 14, fontWeight: "800", color: T.white },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { paddingHorizontal: 16, paddingVertical: 14, alignItems: "center", gap: 10 },
  footerHint: { fontSize: 11, color: T.textSoft, textAlign: "center" },
  cancelText: { fontSize: 12, fontWeight: "700", color: T.textSoft },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.navy,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },
  captureBtnText: { fontSize: 13, fontWeight: "800", color: T.white },
  nativePreview: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 8,
    backgroundColor: T.navyPale,
  },
  nativePreviewIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  nativePreviewTitle: { fontSize: 14, fontWeight: "700", color: T.textDark },
  nativePreviewSub: { fontSize: 11, color: T.textSoft, textAlign: "center", lineHeight: 16 },
});

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

// ─── InfoBanner ───────────────────────────────────────────────
const InfoBanner: React.FC<{ text: string; iconName?: string; color?: string }> = ({
  text, iconName = "info-circle", color = T.navy,
}) => (
  <View style={[ib.wrap, { borderColor: color + "30", backgroundColor: color === T.navy ? T.navyPale : T.orangePale }]}>
    <Icon name={iconName} size={14} color={color} style={{ marginTop: 1 }} />
    <AppText style={[ib.text, { color: color === T.navy ? T.textMid : T.orangeDeep }]}>{text}</AppText>
  </View>
);
const ib = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1 },
  text: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "500" },
});

// ─── UploadBox ────────────────────────────────────────────────
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
  imageOnly?: boolean;
  onRetake?: () => void;
  onWebFileDrop?: (uri: string, fileType: "image" | "pdf") => void;
  innerRef?: (node: View | null) => void;
}> = ({
  value, fileType, onPress, onDelete, label, helper, error,
  iconName = "cloud-upload", accentColor = T.navy,
  isSelfie = false, imageOnly = false, onRetake, onWebFileDrop, innerRef,
}) => {
  const boxContent = (
    <View style={ub.wrap} ref={innerRef} collapsable={false}>
      <AppText style={ub.label}>
        {label} <AppText style={[ub.asterisk, { color: accentColor }]}>*</AppText>
      </AppText>
      {helper && <AppText style={ub.helper}>{helper}</AppText>}
      <TouchableOpacity
        style={[ub.box, value ? ub.boxFilled : null, error ? ub.boxError : { borderColor: value ? accentColor + "80" : accentColor + "40" }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {value ? (
          <>
            {fileType === "pdf" ? (
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
              <View style={ub.imagePreviewWrap}>
                <Image source={{ uri: value }} style={ub.preview} resizeMode="contain" />
                <View style={ub.imageOverlay} />
              </View>
            )}
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
              {isSelfie ? "Capture Selfie" : imageOnly ? "Upload Photo" : "Upload Document"}
            </AppText>
            <AppText style={ub.uploadSub}>
              {isSelfie
                ? "Camera required"
                : imageOnly
                  ? Platform.OS === "web"
                    ? "JPG or PNG • Drag & drop or tap"
                    : "JPG or PNG • Max 5MB"
                  : Platform.OS === "web"
                    ? "JPG, PNG or PDF • Drag & drop or tap"
                    : "JPG, PNG or PDF • Max 5MB"}
            </AppText>
            <AppText style={[ub.tapHint, { color: accentColor }]}>
              {isSelfie ? "Tap to open camera" : Platform.OS === "web" ? "Tap to browse or drag & drop" : "Tap to browse / drag & drop"}
            </AppText>
          </View>
        )}
      </TouchableOpacity>
      {value && (
        <View style={ub.actionRow}>
          {isSelfie ? (
            <>
              <TouchableOpacity style={[ub.actionBtn, { borderColor: accentColor, backgroundColor: accentColor + "10" }]} onPress={onRetake} activeOpacity={0.8}>
                <Icon name="refresh" size={11} color={accentColor} />
                <AppText style={[ub.actionBtnText, { color: accentColor }]}>Retake</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={[ub.actionBtn, { borderColor: accentColor, backgroundColor: accentColor + "10" }]} onPress={onPress} activeOpacity={0.8}>
                <Icon name="camera" size={11} color={accentColor} />
                <AppText style={[ub.actionBtnText, { color: accentColor }]}>Add Photo</AppText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[ub.actionBtn, { borderColor: accentColor, backgroundColor: accentColor + "10" }]} onPress={onPress} activeOpacity={0.8}>
              <Icon name="refresh" size={11} color={accentColor} />
              <AppText style={[ub.actionBtnText, { color: accentColor }]}>Replace</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[ub.actionBtn, { borderColor: T.error, backgroundColor: T.error + "10" }]} onPress={onDelete} activeOpacity={0.8}>
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

  if (Platform.OS === "web" && !isSelfie && onWebFileDrop) {
    return (
      <WebDragWrapper onFileDrop={onWebFileDrop} accentColor={accentColor} imagesOnly={imageOnly}>
        {boxContent}
      </WebDragWrapper>
    );
  }
  return boxContent;
};

const ub = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: "700", color: T.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  asterisk: { fontSize: 11, fontWeight: "700" },
  helper: { fontSize: 11, color: T.textLight, marginBottom: 8, fontStyle: "italic" },
  box: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, minHeight: 140, overflow: "hidden", position: "relative", backgroundColor: T.white },
  boxFilled: { borderStyle: "solid", borderWidth: 2 },
  boxError: { borderColor: T.error },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 24 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  uploadTitle: { fontSize: 13, fontWeight: "700", color: T.textDark },
  uploadSub: { fontSize: 11, color: T.textSoft, lineHeight: 16 },
  tapHint: { fontSize: 11, fontWeight: "600", fontStyle: "italic" },
  imagePreviewWrap: { width: "100%", backgroundColor: "#F8F9FC" },
  preview: { width: "100%", height: 220, backgroundColor: "#F8F9FC" },
  imageOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 40, backgroundColor: "rgba(0,0,0,0.18)" },
  pdfPreview: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 32, backgroundColor: T.white },
  pdfIconBox: { width: 72, height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  pdfLabel: { fontSize: 14, fontWeight: "700", color: T.textDark },
  pdfTapRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  pdfSub: { fontSize: 11, color: T.textSoft, fontStyle: "italic" },
  uploadedBadge: { position: "absolute", bottom: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  uploadedBadgeText: { fontSize: 10, fontWeight: "700", color: T.white },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnText: { fontSize: 11, fontWeight: "700" },
  errorRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 6, marginLeft: 2 },
  errorText: { fontSize: 11, color: T.error, fontWeight: "400", flex: 1, lineHeight: 16 },
});

// ─── InputRow ─────────────────────────────────────────────────
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
  inputRef?: React.RefObject<TextInput | null>;
  innerRef?: (node: View | null) => void;
}> = ({ label, value, onChangeText, placeholder, iconName, accentColor = T.navy, maxLength, error, forceWhiteBg = false, inputRef, innerRef }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={inp.wrap} ref={innerRef} collapsable={false}>
      <AppText style={inp.label}>
        {label} <AppText style={[inp.asterisk, { color: accentColor }]}>*</AppText>
      </AppText>
      <View style={[inp.field, {
        borderColor: error ? T.error : focused ? accentColor : T.border,
        backgroundColor: forceWhiteBg ? T.white : focused ? (accentColor === T.navy ? T.navyPale : T.orangePale) : T.white,
      }]}>
        <TextInput
          ref={inputRef}
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
  const scrollContentRef = useRef<View>(null);
  const fieldViewRefs = useRef<Record<string, View | null>>({});
  const { width } = useWindowDimensions();
  const { showError, showSuccess, showWarning, SweetAlertHost } = useSweetAlert();
  const { setIsProfileCompleted } = useProfileStatus();
  const companyPanRef = useRef<TextInput>(null);

  const registerFieldRef = useCallback(
    (field: string) => (node: View | null) => {
      fieldViewRefs.current[field] = node;
    },
    []
  );

  // True when running on web AND viewport is wide enough for 2-col layout
  const isWebWide = Platform.OS === "web" && width >= WEB_BREAKPOINT;

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
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [success, setSuccess] = useState(false);
  const [submitStatusMessage, setSubmitStatusMessage] = useState("");
  const [submitStatusTitle, setSubmitStatusTitle] = useState("Verification in Progress");
  const [fileTypes, setFileTypes] = useState<Record<string, "image" | "pdf">>({});
  const [sourceModalVisible, setSourceModalVisible] = useState(false);
  const [pendingDocumentType, setPendingDocumentType] = useState<string>("");
  const [selfieCameraActive, setSelfieCameraActive] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setFileType = (field: string, type: "image" | "pdf") =>
    setFileTypes(prev => ({ ...prev, [field]: type }));

  const modalOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.92);

  const routerParams = useLocalSearchParams();
  React.useEffect(() => {
    const cat = routerParams.businessCategory as string;
    if (cat) setBusinessCategory(cat);
  }, [routerParams]);

  const isSellerDocumentField = (field: string): field is SellerDocumentField =>
    field in SELLER_DOCUMENT_TYPES;

  const applyDocumentToState = (field: string, uri: string) => {
    const map: Record<string, (v: string) => void> = {
      aadharFront: setAadharFront,
      aadharBack: setAadharBack,
      panCard: setPanCard,
      businessProof: setBusinessProof,
      bankAccountProof: setBankAccountProof,
      cancelledCheque: setCancelledCheque,
      companyPanDocument: setCompanyPanDocument,
      certificateOfIncorporation: setCertificateOfIncorporation,
      partnershipDeed: setPartnershipDeed,
      msmeUdyamCertificate: setMsmeUdyamCertificate,
      iecCertificate: setIecCertificate,
    };
    map[field]?.(uri);
  };

  const uploadDocumentForField = async (
    field: string,
    localUri: string,
    fileType: "image" | "pdf" = "image"
  ) => {
    if (field === "liveSelfie") {
      setUploadingField(field);
      try {
        await hydrateSellerSession();
        const res = await uploadSellerDocument("liveSelfie", localUri);
        const url = resolveDocumentDisplayUrl(res.url) || res.url;
        setLiveSelfies((prev) => [...prev, url]);
        clearFieldError("liveSelfie");
      } catch (e) {
        showError(getApiErrorMessage(e, "Could not upload selfie."));
      } finally {
        setUploadingField(null);
      }
      return;
    }

    if (!isSellerDocumentField(field)) return;

    applyDocumentToState(field, localUri);
    setFileType(field, fileType);
    setUploadingField(field);
    try {
      await hydrateSellerSession();
      const res = await uploadSellerDocument(field, localUri);
      const url = resolveDocumentDisplayUrl(res.url) || res.url;
      applyDocumentToState(field, url);
      clearFieldError(field);
    } catch (e) {
      applyDocumentToState(field, null as unknown as string);
      deleteDocument(field);
      showError(getApiErrorMessage(e, "Could not upload document."));
    } finally {
      setUploadingField(null);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await hydrateSellerSession();
        const profile = await fetchSellerProfile();
        if (!active) return;

        const cat = toUiBusinessCategory(profile.business.businessCategory);
        if (cat) setBusinessCategory(cat);
        if (profile.business.companyPan) setCompanyPanNumber(profile.business.companyPan);

        const files = profile.documents?.files ?? {};
        const setIf = (key: SellerDocumentField, setter: (v: string) => void) => {
          const url = files[key];
          if (url) setter(resolveDocumentDisplayUrl(url) || url);
        };
        setIf("aadharFront", (u) => setAadharFront(u));
        setIf("aadharBack", (u) => setAadharBack(u));
        setIf("panCard", (u) => setPanCard(u));
        setIf("businessProof", (u) => setBusinessProof(u));
        setIf("bankAccountProof", (u) => setBankAccountProof(u));
        setIf("cancelledCheque", (u) => setCancelledCheque(u));
        setIf("companyPanDocument", (u) => setCompanyPanDocument(u));
        setIf("certificateOfIncorporation", (u) => setCertificateOfIncorporation(u));
        setIf("partnershipDeed", (u) => setPartnershipDeed(u));
        setIf("msmeUdyamCertificate", (u) => setMsmeUdyamCertificate(u));
        setIf("iecCertificate", (u) => setIecCertificate(u));

        const selfie = profile.documents?.liveSelfieUrl;
        if (selfie) setLiveSelfies([resolveDocumentDisplayUrl(selfie) || selfie]);
      } catch {
        // keep local state
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const clearFieldError = (field: string) =>
    setValidationErrors(prev => prev.filter(e => e.field !== field));

  const showValidationAlert = useCallback((errors: ValidationError[]) => {
    const first = errors[0];
    if (!first) return;
    showWarning(first.message, "Cannot continue");
  }, [showWarning]);

  const scrollToField = useCallback((field: string) => {
    const fieldNode = fieldViewRefs.current[field];
    if (fieldNode) {
      scrollToFormField(scrollViewRef, scrollContentRef, fieldNode);
    }
    if (field === "companyPanNumber") {
      setTimeout(() => companyPanRef.current?.focus(), 350);
    }
  }, []);

  const scrollToFirstError = useCallback((errors: ValidationError[]) => {
    const first = errors[0];
    if (!first) return;
    scrollToField(first.field);
  }, [scrollToField]);

  const getError = (field: string) =>
    validationErrors.find(e => e.field === field)?.message;

  const pickDocument = (documentType: string) => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*,application/pdf";
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const isPdf = file.type === "application/pdf";
        const reader = new FileReader();
        reader.onload = (ev: any) => {
          const dataUri = ev.target?.result as string;
          if (dataUri) void uploadDocumentForField(documentType, dataUri, isPdf ? "pdf" : "image");
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }
    setPendingDocumentType(documentType);
    setSourceModalVisible(true);
  };

  const handlePickFromLibrary = async () => {
    setSourceModalVisible(false);
    await new Promise(r => setTimeout(r, 300));
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Required", "Camera roll permission is needed."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 1 });
    if (!result.canceled && result.assets?.[0]) {
      void uploadDocumentForField(pendingDocumentType, result.assets[0].uri, "image");
    }
  };

  const handlePickPdf = async () => {
    setSourceModalVisible(false);
    await new Promise(r => setTimeout(r, 300));
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const type = asset.mimeType === "application/pdf" ? "pdf" : "image";
      void uploadDocumentForField(pendingDocumentType, asset.uri, type);
    }
  };

  const deleteDocument = (field: string) => {
    const nullMap: Record<string, () => void> = {
      aadharFront: () => setAadharFront(null), aadharBack: () => setAadharBack(null),
      panCard: () => setPanCard(null), businessProof: () => setBusinessProof(null),
      bankAccountProof: () => setBankAccountProof(null), cancelledCheque: () => setCancelledCheque(null),
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

  const openSelfieCamera = () => {
    setSelfieCameraActive(true);
  };

  const handleSelfieCapture = (uri: string) => {
    setSelfieCameraActive(false);
    void uploadDocumentForField("liveSelfie", uri, "image");
  };

  const validateDocuments = () => {
    const errors: ValidationError[] = [];
    if (!aadharFront) errors.push({ field: "aadharFront", message: "Aadhaar Card (Front) is required" });
    if (!aadharBack) errors.push({ field: "aadharBack", message: "Aadhaar Card (Back) is required" });
    if (!panCard) errors.push({ field: "panCard", message: "PAN Card is required" });
    if (!businessProof) errors.push({ field: "businessProof", message: "Business Proof is required" });
    if (!bankAccountProof) errors.push({ field: "bankAccountProof", message: "Bank Account Proof is required" });
    if (!cancelledCheque) errors.push({ field: "cancelledCheque", message: "Cancelled Cheque is required" });
    if ((liveSelfies ?? []).length === 0) errors.push({ field: "liveSelfie", message: "Live Selfie is required" });
    if (!termsAccepted) errors.push({ field: "termsAccepted", message: "You must accept the Terms and Conditions" });
    if (businessCategory === "B2B") {
      if (!companyPanNumber.trim()) {
        errors.push({ field: "companyPanNumber", message: "Company PAN Number is required" });
      } else {
        const panErr = validateCompanyPan(companyPanNumber);
        if (panErr) errors.push({ field: "companyPanNumber", message: panErr });
      }
      if (!companyPanDocument) errors.push({ field: "companyPanDocument", message: "Company PAN Document is required" });
      if (!certificateOfIncorporation) errors.push({ field: "certificateOfIncorporation", message: "Certificate of Incorporation is required" });
      if (!partnershipDeed) errors.push({ field: "partnershipDeed", message: "Partnership Deed is required" });
      if (!msmeUdyamCertificate) errors.push({ field: "msmeUdyamCertificate", message: "MSME / Udyam Certificate is required" });
      if (!iecCertificate) errors.push({ field: "iecCertificate", message: "Import Export Code (IEC) is required" });
    }
    return errors;
  };

  const handleFinish = async () => {
    const errors = validateDocuments();
    if (errors.length > 0) {
      setValidationErrors(errors);
      scrollToFirstError(errors);
      showValidationAlert(errors);
      return;
    }
    if (uploadingField) {
      showError("Please wait for the current upload to finish.");
      return;
    }

    setIsSubmitting(true);
    try {
      await hydrateSellerSession();
      if (businessCategory === "B2B" && companyPanNumber.trim()) {
        await updateCompanyPan(companyPanNumber.trim().toUpperCase());
      }
      const result = await submitSellerProfile();
      if (!result.submitted) {
        const detail = result.errors?.length ? result.errors.join("\n") : result.message;
        showError(detail || "Profile could not be submitted.");
        return;
      }
      setIsProfileCompleted(true);
      setSubmitStatusMessage(result.message || "Your seller profile has been submitted for verification.");
      setSubmitStatusTitle(result.accountStatus?.title || "Pending Review");
      showSuccess(result.message || "Profile submitted successfully.");
      setSuccess(true);
      modalOpacity.value = withTiming(1, { duration: 400 });
      modalScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    } catch (e) {
      showError(getApiErrorMessage(e, "Could not submit profile."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    modalOpacity.value = withTiming(0, { duration: 300 });
    modalScale.value = withTiming(0.92, { duration: 300 });
    setTimeout(() => { setSuccess(false); router.push("/(main)/dashboard"); }, 300);
  };

  const makeWebFileDrop = (field: string) => (uri: string, type: "image" | "pdf") => {
    void uploadDocumentForField(field, uri, type);
  };

  // ── Helper: wrap upload boxes 2-per-row on web, stacked on mobile ──
  const TwoColRow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const childArray = React.Children.toArray(children);
    if (!isWebWide) return <>{childArray}</>;
    const rows: React.ReactNode[][] = [];
    for (let i = 0; i < childArray.length; i += 2) rows.push(childArray.slice(i, i + 2));
    return (
      <>
        {rows.map((pair, rowIdx) => (
          <View key={rowIdx} style={ws.fieldRow}>
            <View style={ws.fieldCol}>{pair[0]}</View>
            {pair[1] ? <View style={ws.fieldCol}>{pair[1]}</View> : <View style={ws.fieldCol} />}
          </View>
        ))}
      </>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} />

      {/* ── Top gradient header ── */}
      <LinearGradient
        colors={[T.navy, T.navyMid]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.topHeader}
      >
        <SafeAreaView>
          <View style={s.headerInner}>
            <View style={{ flex: 1 }}>
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
          contentContainerStyle={[
            s.scrollContent,
            Platform.OS === "web" && s.scrollContentWeb,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View ref={scrollContentRef} collapsable={false}>

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

              {/* Company PAN input stays full-width (not an UploadBox) */}
              <InputRow
                label="Company PAN Number"
                value={companyPanNumber}
                onChangeText={(t) => {
                  const upper = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
                  setCompanyPanNumber(upper);
                  const e = validateCompanyPan(upper);
                  setCompanyPanError(e);
                  clearFieldError("companyPanNumber");
                }}
                placeholder="e.g. AAACB1234C"
                iconName="id-card"
                accentColor={T.orange}
                maxLength={10}
                error={companyPanNumber.length > 0 ? companyPanError : getError("companyPanNumber")}
                forceWhiteBg
                inputRef={companyPanRef}
                innerRef={registerFieldRef("companyPanNumber")}
              />

              {/*
                Web: B2B upload boxes 2-per-row.
                Mobile: unchanged — stacked.
              */}
              <TwoColRow>
                <UploadBox label="Company PAN Document" value={companyPanDocument}
                  fileType={fileTypes["companyPanDocument"] ?? null}
                  onPress={() => pickDocument("companyPanDocument")}
                  onDelete={() => deleteDocument("companyPanDocument")}
                  onWebFileDrop={makeWebFileDrop("companyPanDocument")}
                  error={getError("companyPanDocument")} accentColor={T.orange}
                  innerRef={registerFieldRef("companyPanDocument")} />

                <UploadBox label="Certificate of Incorporation" value={certificateOfIncorporation}
                  helper="Pvt Ltd / LLP"
                  fileType={fileTypes["certificateOfIncorporation"] ?? null}
                  onPress={() => pickDocument("certificateOfIncorporation")}
                  onDelete={() => deleteDocument("certificateOfIncorporation")}
                  onWebFileDrop={makeWebFileDrop("certificateOfIncorporation")}
                  error={getError("certificateOfIncorporation")} accentColor={T.orange}
                  innerRef={registerFieldRef("certificateOfIncorporation")} />

                <UploadBox label="Partnership Deed" value={partnershipDeed}
                  helper="For partnership firms"
                  fileType={fileTypes["partnershipDeed"] ?? null}
                  onPress={() => pickDocument("partnershipDeed")}
                  onDelete={() => deleteDocument("partnershipDeed")}
                  onWebFileDrop={makeWebFileDrop("partnershipDeed")}
                  error={getError("partnershipDeed")} accentColor={T.orange}
                  innerRef={registerFieldRef("partnershipDeed")} />

                <UploadBox label="MSME / Udyam Certificate" value={msmeUdyamCertificate}
                  helper="If registered under MSME"
                  fileType={fileTypes["msmeUdyamCertificate"] ?? null}
                  onPress={() => pickDocument("msmeUdyamCertificate")}
                  onDelete={() => deleteDocument("msmeUdyamCertificate")}
                  onWebFileDrop={makeWebFileDrop("msmeUdyamCertificate")}
                  error={getError("msmeUdyamCertificate")} accentColor={T.orange}
                  innerRef={registerFieldRef("msmeUdyamCertificate")} />

                <UploadBox label="Import Export Code (IEC)" value={iecCertificate}
                  helper="For import/export businesses"
                  fileType={fileTypes["iecCertificate"] ?? null}
                  onPress={() => pickDocument("iecCertificate")}
                  onDelete={() => deleteDocument("iecCertificate")}
                  onWebFileDrop={makeWebFileDrop("iecCertificate")}
                  error={getError("iecCertificate")} accentColor={T.orange}
                  innerRef={registerFieldRef("iecCertificate")} />
              </TwoColRow>
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

            {/*
              Web: identity upload boxes 2-per-row.
              Mobile: unchanged — stacked.
            */}
            <TwoColRow>
              

              <UploadBox label="Aadhaar Card (Front)" value={aadharFront}
                fileType={fileTypes["aadharFront"] ?? null}
                onPress={() => pickDocument("aadharFront")}
                onDelete={() => deleteDocument("aadharFront")}
                onWebFileDrop={makeWebFileDrop("aadharFront")}
                error={getError("aadharFront")} accentColor={T.navy}
                innerRef={registerFieldRef("aadharFront")} />

              <UploadBox label="Aadhaar Card (Back)" value={aadharBack}
                fileType={fileTypes["aadharBack"] ?? null}
                onPress={() => pickDocument("aadharBack")}
                onDelete={() => deleteDocument("aadharBack")}
                onWebFileDrop={makeWebFileDrop("aadharBack")}
                error={getError("aadharBack")} accentColor={T.navy}
                innerRef={registerFieldRef("aadharBack")} />

              <UploadBox label="PAN Card" value={panCard}
                fileType={fileTypes["panCard"] ?? null}
                onPress={() => pickDocument("panCard")}
                onDelete={() => deleteDocument("panCard")}
                onWebFileDrop={makeWebFileDrop("panCard")}
                error={getError("panCard")} accentColor={T.navy}
                innerRef={registerFieldRef("panCard")} />

              <UploadBox label="Business Proof" value={businessProof}
                helper="Shop License / Registration Certificate / GST Certificate"
                fileType={fileTypes["businessProof"] ?? null}
                onPress={() => pickDocument("businessProof")}
                onDelete={() => deleteDocument("businessProof")}
                onWebFileDrop={makeWebFileDrop("businessProof")}
                error={getError("businessProof")} accentColor={T.navy}
                innerRef={registerFieldRef("businessProof")} />

              <UploadBox label="Bank Account Proof" value={bankAccountProof}
                helper="Bank Statement / Passbook"
                fileType={fileTypes["bankAccountProof"] ?? null}
                onPress={() => pickDocument("bankAccountProof")}
                onDelete={() => deleteDocument("bankAccountProof")}
                onWebFileDrop={makeWebFileDrop("bankAccountProof")}
                error={getError("bankAccountProof")} accentColor={T.navy}
                innerRef={registerFieldRef("bankAccountProof")} />

              <UploadBox label="Cancelled Cheque" value={cancelledCheque}
                helper="Upload a clear image of your cancelled cheque"
                fileType={fileTypes["cancelledCheque"] ?? null}
                onPress={() => pickDocument("cancelledCheque")}
                onDelete={() => deleteDocument("cancelledCheque")}
                onWebFileDrop={makeWebFileDrop("cancelledCheque")}
                error={getError("cancelledCheque")} accentColor={T.navy}
                innerRef={registerFieldRef("cancelledCheque")} />
            </TwoColRow>

            {/* Important note — full width on both platforms */}
            <View style={s.selfieNote}>
              <View style={s.selfieNoteHeader}>
                <Icon name="exclamation-triangle" size={13} color={T.orange} />
                <AppText style={s.selfieNoteTitle}>Important</AppText>
              </View>
              <AppText style={s.selfieNoteText}>
                Please allow camera access and ensure you capture a live selfie, as well as upload the required images of your Aadhaar card, PAN card, GSTIN certificate, shop license, bank proof, and shop. If you have already applied for GSTIN, please take a picture along with your valid application proof for verification.
              </AppText>
            </View>

            {/* Live Selfie section — full width on both platforms */}
            <View style={s.selfieSection} ref={registerFieldRef("liveSelfie")} collapsable={false}>
              <AppText style={s.selfieFieldLabel}>
                Live Selfie <AppText style={{ color: T.navy }}>*</AppText>
              </AppText>
              <AppText style={s.selfieFieldHelper}>
                {Platform.OS === "web" ? "Camera opens right here in this section" : "Use camera to take a live photo"}
              </AppText>

              <InlineSelfieCamera
                active={selfieCameraActive}
                onCapture={handleSelfieCapture}
                onClose={() => setSelfieCameraActive(false)}
              />

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
                      <View style={s.selfieIndexBadge}>
                        <AppText style={s.selfieIndexText}>{index + 1}</AppText>
                      </View>
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

              <View style={s.selfieActionsRow}>
                {(liveSelfies ?? []).length > 0 && (
                  <TouchableOpacity
                    style={[s.selfieActionBtn, { borderColor: T.navy, backgroundColor: T.navy + "10" }]}
                    onPress={() => {
                      setSelfieCameraActive(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Icon name="refresh" size={12} color={T.navy} />
                    <AppText style={[s.selfieActionBtnText, { color: T.navy }]}>Retake</AppText>
                  </TouchableOpacity>
                )}
                {(liveSelfies ?? []).length > 0 && (
                  <TouchableOpacity
                    style={[s.selfieActionBtn, { borderColor: T.orange, backgroundColor: T.orange + "10" }]}
                    onPress={openSelfieCamera}
                    activeOpacity={0.8}
                  >
                    <Icon name="camera" size={12} color={T.orange} />
                    <AppText style={[s.selfieActionBtnText, { color: T.orange }]}>Add Photo</AppText>
                  </TouchableOpacity>
                )}
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

              {(liveSelfies ?? []).length > 0 && (
                <View style={s.selfieCountBadge}>
                  <Icon name="check-circle" size={11} color={T.success} />
                  <AppText style={s.selfieCountText}>{(liveSelfies ?? []).length} photo{(liveSelfies ?? []).length > 1 ? "s" : ""} captured</AppText>
                </View>
              )}

              {(liveSelfies ?? []).length === 0 && !selfieCameraActive && (
                <TouchableOpacity
                  style={[s.selfieEmptyBox, getError("liveSelfie") ? { borderColor: T.error } : { borderColor: T.navy + "40" }]}
                  onPress={openSelfieCamera}
                  activeOpacity={0.85}
                >
                  <View style={[s.selfieEmptyIcon, { backgroundColor: T.navy + "12" }]}>
                    <Icon name="camera" size={22} color={T.navy} />
                  </View>
                  <AppText style={s.selfieEmptyTitle}>No selfie captured yet</AppText>
                  <AppText style={s.selfieEmptySub}>
                    {Platform.OS === "web" ? "Tap to open camera here" : "Tap to open camera in this section"}
                  </AppText>
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
            <View ref={registerFieldRef("termsAccepted")} collapsable={false}>
            <TouchableOpacity
              style={[s.checkboxRow, termsAccepted && s.checkboxRowChecked]}
              onPress={() => { const newVal = !termsAccepted; setTermsAccepted(newVal); if (newVal) clearFieldError("termsAccepted"); }}
              activeOpacity={0.85}
            >
              <View style={[s.checkbox, termsAccepted && { backgroundColor: T.orange, borderColor: T.orange }]}>
                {termsAccepted && <Icon name="check" size={11} color={T.white} />}
              </View>
              <AppText style={s.termsText}>
                I agree to the{" "}
                <AppText
                  style={s.termsLink}
                  onPress={() =>
                    router.push({
                      pathname: "/legal-document",
                      params: { type: "terms" },
                    })
                  }
                >
                  Terms & Conditions
                </AppText>
                {" "}and{" "}
                <AppText
                  style={s.termsLink}
                  onPress={() =>
                    router.push({
                      pathname: "/legal-document",
                      params: { type: "privacy" },
                    })
                  }
                >
                  Privacy Policy
                </AppText>
              </AppText>
            </TouchableOpacity>
            {!!getError("termsAccepted") && (
              <View style={s.termsErrorRow}>
                <Icon name="exclamation-circle" size={11} color={T.error} style={{ marginTop: 4 }} />
                <AppText style={s.termsErrorText}>{getError("termsAccepted")}</AppText>
              </View>
            )}
            </View>
          </SectionCard>

          {/* ── Buttons ── */}
          <View style={s.buttonRow}>
            <TouchableOpacity onPress={() => router.push("/(main)/sellerbanking")} style={s.backBtn} activeOpacity={0.85}>
              <View style={s.backBtnInner}>
                <AppText style={s.backBtnText}>Back</AppText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleFinish}
              style={s.continueBtn}
              activeOpacity={0.85}
              disabled={isSubmitting || !!uploadingField}
            >
              <LinearGradient colors={[T.orange, T.orangeDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.continueBtnInner}>
                <AppText style={s.continueBtnText}>
                  {isSubmitting ? "Submitting…" : uploadingField ? "Uploading…" : "Submit Profile"}
                </AppText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Source Picker Modal (mobile only — unchanged) ── */}
      <Modal visible={sourceModalVisible} transparent animationType="fade">
        <TouchableOpacity style={sm.overlay} activeOpacity={1} onPress={() => setSourceModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={sm.sheet}>
            <View style={sm.handle} />
            <View style={sm.header}>
              <View style={{ flex: 1 }}>
                <AppText style={sm.headerTitle}>Add Document</AppText>
                <AppText style={sm.headerSub}>Choose how to upload your file</AppText>
              </View>
              <TouchableOpacity style={sm.closeBtn} onPress={() => setSourceModalVisible(false)} activeOpacity={0.7}>
                <Icon name="times" size={14} color={T.textSoft} />
              </TouchableOpacity>
            </View>
            <View style={sm.divider} />
            <TouchableOpacity style={sm.option} onPress={handlePickFromLibrary} activeOpacity={0.85}>
              <LinearGradient colors={[T.navy + "12", T.navy + "06"]} style={sm.optionIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Icon name="image" size={20} color={T.navy} />
              </LinearGradient>
              <View style={sm.optionText}>
                <AppText style={sm.optionTitle}>Photo Library</AppText>
                <AppText style={sm.optionSub}>Choose an image from your gallery</AppText>
              </View>
              <Icon name="chevron-right" size={12} color={T.textLight} />
            </TouchableOpacity>
            <TouchableOpacity style={sm.option} onPress={handlePickPdf} activeOpacity={0.85}>
              <LinearGradient colors={[T.orange + "18", T.orange + "08"]} style={sm.optionIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Icon name="file-pdf-o" size={20} color={T.orange} />
              </LinearGradient>
              <View style={sm.optionText}>
                <AppText style={sm.optionTitle}>PDF / File</AppText>
                <AppText style={sm.optionSub}>Browse and select a PDF document</AppText>
              </View>
              <Icon name="chevron-right" size={12} color={T.textLight} />
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Success Modal (unchanged) ── */}
      <Modal visible={success} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Animated.View style={[s.modalCard, { opacity: modalOpacity, transform: [{ scale: modalScale }] }]}>
            <View style={s.successIconWrap}>
              <View style={s.successOuter}>
                <View style={s.successMiddle}>
                  <LinearGradient colors={["#22C55E", "#16A34A"]} style={s.successInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Icon name="check" size={24} color={T.white} />
                  </LinearGradient>
                </View>
              </View>
            </View>
            <View style={s.modalAccent} />
            <AppText style={s.modalTitle}>Profile Submitted!</AppText>
            <AppText style={s.modalDesc}>{submitStatusMessage}</AppText>
            <View style={s.statusChip}>
              <View style={s.statusDot} />
              <AppText style={s.statusText}>{submitStatusTitle}</AppText>
            </View>
            <TouchableOpacity onPress={closeModal} style={s.modalBtn} activeOpacity={0.85}>
              <LinearGradient colors={[T.orange, T.orangeDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalBtnInner}>
                <AppText style={s.modalBtnText}>Go to Dashboard</AppText>
                <Icon name="chevron-right" size={12} color={T.white} style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
      <SweetAlertHost />
    </View>
  );
}

// ─── Web-only layout styles (2-col grid) ─────────────────────
const ws = StyleSheet.create({
  fieldRow: {
    flexDirection: "row",
    gap: 16,
  },
  fieldCol: {
    flex: 1,
  },
});

// ─── Source Picker Modal styles ───────────────────────────────
const sm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(10,21,51,0.52)", justifyContent: "flex-end" },
  sheet: { backgroundColor: T.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, shadowColor: T.navy, shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: "center", marginBottom: 18 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  headerIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.navyPale, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: T.textDark },
  headerSub: { fontSize: 11, color: T.textSoft, marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: T.bg, alignItems: "center", justifyContent: "center" },
  divider: { height: 1, backgroundColor: T.borderLight, marginBottom: 16 },
  option: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: T.borderLight, backgroundColor: T.white, marginBottom: 10 },
  optionIconBox: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: "700", color: T.textDark },
  optionSub: { fontSize: 11, color: T.textSoft, marginTop: 2 },
  cancelBtn: { marginTop: 6, height: 48, borderRadius: 12, backgroundColor: T.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: T.borderLight },
  cancelText: { fontSize: 14, fontWeight: "700", color: T.textSoft },
});

// ─── Styles — mirrors Screen 1 exactly ───────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg, width: "100%" },
  topHeader: { paddingHorizontal: 20, height: 200 },
  headerInner: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 10, marginBottom: 18 },
  headerLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  headerTitle: { fontSize: 18, fontFamily: fontFamilies.bold, color: T.white, marginBottom: 2 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: "400" },
  headerBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  headerBadgeText: { fontSize: 22 },
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 7 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  scroll: { flex: 1, width: "100%" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20, width: "100%" },
  scrollContentWeb: { width: "100%", maxWidth: "100%", alignSelf: "stretch" },
  checkboxRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: T.borderLight },
  checkboxRowChecked: { borderColor: T.orangeSoft },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: T.border, backgroundColor: T.white, alignItems: "center", justifyContent: "center", marginTop: 1 },
  termsText: { flex: 1, fontSize: 12, color: T.textMid, lineHeight: 17, fontWeight: "500" },
  termsLink: { color: T.orange, fontWeight: "700" },
  termsErrorRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 8, marginLeft: 2 },
  termsErrorText: { fontSize: 11, color: T.error, fontWeight: "400", flex: 1, lineHeight: 16 },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 4 },
  backBtn: { flex: 1, borderRadius: 14, borderWidth: 2, borderColor: T.navy, overflow: "hidden" },
  backBtnInner: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: T.white, borderRadius: 12 },
  backBtnText: { fontSize: 15, fontWeight: "700", color: T.navy },
  continueBtn: { flex: 2 },
  continueBtnInner: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14 },
  continueBtnText: { fontSize: 16, fontWeight: "800", color: T.white, letterSpacing: 0.2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(10,21,51,0.55)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  modalCard: { width: screenWidth * 0.88, backgroundColor: T.cardBg, borderRadius: 24, overflow: "hidden", padding: 28, paddingTop: 24, shadowColor: T.navy, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 18, alignItems: "center" },
  modalAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: T.orange },
  successIconWrap: { marginBottom: 20, marginTop: 16, alignItems: "center", justifyContent: "center" },
  successOuter: { width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(34,197,94,0.1)", justifyContent: "center", alignItems: "center" },
  successMiddle: { width: 62, height: 62, borderRadius: 31, backgroundColor: "rgba(34,197,94,0.18)", justifyContent: "center", alignItems: "center" },
  successInner: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: T.textDark, textAlign: "center", marginBottom: 10, letterSpacing: -0.3 },
  modalDesc: { fontSize: 12, color: T.textSoft, textAlign: "center", lineHeight: 18, marginBottom: 16 },
  statusChip: { flexDirection: "row", alignItems: "center", backgroundColor: T.successBg, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginBottom: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.success, marginRight: 7 },
  statusText: { fontSize: 11, fontWeight: "700", color: T.success, letterSpacing: 0.5, textTransform: "uppercase" },
  modalBtn: { width: "100%", borderRadius: 14, overflow: "hidden" },
  modalBtnInner: { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 15, fontWeight: "800", color: T.white, letterSpacing: 0.2 },
  selfieNote: { borderWidth: 1, borderColor: T.orange + "40", backgroundColor: T.orangePale, borderRadius: 10, padding: 12, marginBottom: 12 },
  selfieNoteHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  selfieNoteTitle: { fontSize: 12, fontWeight: "800", color: T.orange, textTransform: "uppercase", letterSpacing: 0.5 },
  selfieNoteText: { fontSize: 11, color: T.orangeDeep, lineHeight: 17, fontWeight: "500" },
  selfieSection: { marginBottom: 16 },
  selfieFieldLabel: { fontSize: 11, fontWeight: "700", color: T.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  selfieFieldHelper: { fontSize: 11, color: T.textLight, marginBottom: 10, fontStyle: "italic" },
  selfieScroll: { marginBottom: 10 },
  selfieScrollContent: { gap: 10, paddingRight: 4 },
  selfieThumbWrap: { width: 100, height: 100, borderRadius: 12, overflow: "visible", position: "relative", marginTop: 10, marginBottom: 10, marginLeft: 8, marginRight: 8 },
  selfieThumb: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderColor: T.navy + "30" },
  selfieIndexBadge: { position: "absolute", bottom: -10, left: -10, width: 22, height: 22, borderRadius: 11, backgroundColor: T.navy, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: T.white, zIndex: 10 },
  selfieIndexText: { fontSize: 9, fontFamily: fontFamilies.bold, color: T.white },
  selfieDeleteBtn: { position: "absolute", top: -10, right: -10, width: 22, height: 22, borderRadius: 11, backgroundColor: T.error, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: T.white, zIndex: 10 },
  selfieActionsRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  selfieActionBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  selfieActionBtnText: { fontSize: 12, fontWeight: "700" },
  selfieCountBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  selfieCountText: { fontSize: 11, fontWeight: "600", color: T.success },
  selfieEmptyBox: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, height: 120, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: T.white },
  selfieEmptyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  selfieEmptyTitle: { fontSize: 13, fontWeight: "700", color: T.textDark },
  selfieEmptySub: { fontSize: 11, color: T.textSoft },
  selfieErrorRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 4, marginLeft: 2 },
  selfieErrorText: { fontSize: 11, color: T.error, fontWeight: "400", flex: 1, lineHeight: 16 },
});