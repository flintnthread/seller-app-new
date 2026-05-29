import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useInvoiceScan, type InvoiceScanParams } from "@/hooks/useInvoiceScan";

function isPdfUrl(url: string): boolean {
  return /\.pdf($|\?)/i.test(url);
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp)($|\?)/i.test(url);
}

function NativeInvoicePreview({ url }: { url: string }) {
  const WebView = require("react-native-webview").WebView;
  const previewIsPdf = isPdfUrl(url);
  const previewIsImage = isImageUrl(url);
  const source = previewIsImage
    ? { uri: url }
    : {
        uri: previewIsPdf
          ? url
          : `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`,
      };

  return (
    <WebView
      source={source}
      style={s.webview}
      startInLoadingState
      renderLoading={() => (
        <View style={s.webviewLoading}>
          <ActivityIndicator color="#1E3A6E" />
        </View>
      )}
    />
  );
}

export default function InvoiceInfoScreen() {
  const params = useLocalSearchParams<InvoiceScanParams>();
  const {
    scanCode,
    scanResult,
    liveOrder,
    loading,
    loadError,
    orderKey,
    invoiceUrl,
    invoiceNumber,
  } = useInvoiceScan(params);

  const hsnDisplay = useMemo(() => {
    if (!liveOrder?.items?.length) return "-";
    const codes = Array.from(
      new Set(
        liveOrder.items
          .map((item) => (item.hsnCode ?? "").trim())
          .filter((code) => code.length > 0)
      )
    );
    return codes.length > 0 ? codes.join(", ") : "-";
  }, [liveOrder]);

  const openInvoiceExternally = async () => {
    if (!invoiceUrl) {
      Alert.alert("Invoice", "Invoice file is not available yet for this order.");
      return;
    }
    try {
      await Linking.openURL(invoiceUrl);
    } catch {
      Alert.alert("Invoice", "Unable to open invoice link.");
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value || "-"}</Text>
    </View>
  );

  const showPreview = !!invoiceUrl && !loading;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Invoice Scan</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color="#1E3A6E" />
            <Text style={s.loadingText}>Loading invoice from scan...</Text>
            {!!scanCode && <Text style={s.hintText}>Code: {scanCode}</Text>}
          </View>
        ) : loadError ? (
          <View style={s.card}>
            <Text style={s.errorText}>{loadError}</Text>
            <Text style={s.hintText}>Scan code: {scanCode || "—"}</Text>
            <TouchableOpacity
              style={[s.btn, { marginTop: 16 }]}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text style={s.btnText}>Log in to Seller App</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={s.card}>
              <View style={s.titleRow}>
                <MaterialCommunityIcons name="file-document-outline" size={20} color="#1E3A6E" />
                <Text style={s.title}>Invoice Details</Text>
              </View>

              <InfoRow label="Scan Code" value={scanCode} />
              <InfoRow label="Order ID" value={liveOrder?.id || orderKey} />
              <InfoRow label="Invoice No" value={invoiceNumber} />
              <InfoRow label="Order Date" value={liveOrder?.date || "-"} />
              <InfoRow label="Payment" value={liveOrder?.payment?.method || "-"} />
              <InfoRow label="Total" value={liveOrder?.pricing?.total || "-"} />
              <InfoRow label="GST Number" value={liveOrder?.gstNumber || "-"} />
              <InfoRow label="HSN Code" value={hsnDisplay} />
              <InfoRow label="Status" value={liveOrder?.status || "-"} />
              {scanResult?.message ? (
                <InfoRow label="Scan" value={scanResult.found ? "Matched" : scanResult.message} />
              ) : null}
            </View>

            {showPreview ? (
              <View style={s.previewCard}>
                <View style={s.titleRow}>
                  <MaterialCommunityIcons name="file-eye-outline" size={20} color="#1E3A6E" />
                  <Text style={s.title}>Invoice Preview</Text>
                </View>
                <NativeInvoicePreview url={invoiceUrl} />
              </View>
            ) : (
              <View style={s.card}>
                <Text style={s.hintText}>
                  Invoice file is not linked yet. Details above are from the order record.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.btn, !invoiceUrl && s.btnDisabled]}
              onPress={openInvoiceExternally}
              disabled={!invoiceUrl}
            >
              <Ionicons name="open-outline" size={16} color="#fff" />
              <Text style={s.btnText}>Open Invoice in Browser</Text>
            </TouchableOpacity>

            {!!liveOrder && (
              <TouchableOpacity
                style={[s.btn, { backgroundColor: "#1E3A6E" }]}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/orderDetails",
                    params: { orderId: liveOrder.id },
                  })
                }
              >
                <Ionicons name="receipt-outline" size={16} color="#fff" />
                <Text style={s.btnText}>View Full Order</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FC" },
  header: {
    height: 56,
    backgroundColor: "#1E3A6E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
    paddingVertical: 10,
    gap: 12,
  },
  label: { color: "#6B7280", fontSize: 13 },
  value: { color: "#111827", fontSize: 13, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  btn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnDisabled: { backgroundColor: "#9CA3AF" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  loadingWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  loadingText: { color: "#4B5563", fontSize: 14 },
  errorText: { color: "#B91C1C", fontSize: 14, lineHeight: 20 },
  hintText: { color: "#6B7280", fontSize: 13, lineHeight: 19 },
  webview: { width: "100%", height: 480, borderRadius: 8, backgroundColor: "#F9FAFB" },
  webviewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
