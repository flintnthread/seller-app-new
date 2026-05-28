import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import { fetchSellerOrderDetail } from "@/services/orderApi";
import type { OrderDetail } from "@/app/(main)/_ordersData";

type Params = {
  orderId?: string;
  orderNumber?: string;
  invoiceNumber?: string;
  awb?: string;
  orderDate?: string;
  payment?: string;
  total?: string;
  invoiceUrl?: string;
};

export default function InvoiceInfoScreen() {
  const {
    orderId = "-",
    orderNumber = "",
    invoiceNumber = "-",
    awb = "-",
    orderDate = "-",
    payment = "-",
    total = "-",
    invoiceUrl = "",
  } = useLocalSearchParams<Params>();
  const [liveOrder, setLiveOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  const orderKey = useMemo(() => {
    const raw = (orderId ?? "").trim();
    if (raw && raw !== "-") return raw.replace(/^#/, "");
    const ord = (orderNumber ?? "").trim();
    if (ord) return ord.replace(/^#/, "");
    return "";
  }, [orderId, orderNumber]);

  useEffect(() => {
    if (!orderKey) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const detail = await fetchSellerOrderDetail(orderKey);
        if (!cancelled) setLiveOrder(detail);
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || "Failed to load live order details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [orderKey]);

  const openInvoice = async () => {
    const resolvedInvoiceUrl = liveOrder?.invoiceUrl || invoiceUrl;
    if (!resolvedInvoiceUrl) {
      Alert.alert("Invoice", "Invoice URL is not available for this QR.");
      return;
    }
    try {
      await Linking.openURL(resolvedInvoiceUrl);
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
  const canOpenInvoice = !!(liveOrder?.invoiceUrl || invoiceUrl);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Scanned Order Info</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <View style={s.titleRow}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color="#1E3A6E" />
            <Text style={s.title}>Invoice Details</Text>
          </View>

          <InfoRow label="Order ID" value={liveOrder?.id || orderId} />
          <InfoRow label="Invoice No" value={liveOrder?.invoiceNumber || invoiceNumber} />
          <InfoRow label="AWB No" value={awb} />
          <InfoRow label="Order Date" value={liveOrder?.date || orderDate} />
          <InfoRow label="Payment" value={liveOrder?.payment?.method || payment} />
          <InfoRow label="Total" value={liveOrder?.pricing?.total || total} />
          <InfoRow label="GST Number" value={liveOrder?.gstNumber || "-"} />
          <InfoRow label="HSN Code" value={hsnDisplay} />
        </View>

        <View style={s.card}>
          <View style={s.titleRow}>
            <MaterialCommunityIcons name="database-check-outline" size={20} color="#1E3A6E" />
            <Text style={s.title}>Live Order Data</Text>
          </View>

          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color="#1E3A6E" />
              <Text style={s.loadingText}>Loading order details from API...</Text>
            </View>
          ) : loadError ? (
            <Text style={s.errorText}>{loadError}</Text>
          ) : liveOrder ? (
            <>
              <InfoRow label="Status" value={liveOrder.status} />
              <InfoRow label="Customer" value={liveOrder.customer?.name || "-"} />
              <InfoRow label="Items" value={String(liveOrder.items?.length ?? 0)} />
              <InfoRow label="Invoice No" value={liveOrder.invoiceNumber || invoiceNumber} />
              <InfoRow label="GST Number" value={liveOrder.gstNumber || "-"} />
              <InfoRow label="HSN Code" value={hsnDisplay} />
              <InfoRow label="Invoice URL" value={liveOrder.invoiceUrl ? "Available" : "Not available"} />
            </>
          ) : (
            <Text style={s.hintText}>No live order data loaded yet.</Text>
          )}
        </View>

        <TouchableOpacity style={[s.btn, !canOpenInvoice && s.btnDisabled]} onPress={openInvoice} disabled={!canOpenInvoice}>
          <Ionicons name="open-outline" size={16} color="#fff" />
          <Text style={s.btnText}>Open Invoice Page</Text>
        </TouchableOpacity>
        {!!liveOrder && (
          <TouchableOpacity
            style={[s.btn, { backgroundColor: "#1E3A6E" }]}
            onPress={() => router.push({ pathname: "/(main)/orderDetails", params: { orderId: liveOrder.id } })}
          >
            <Ionicons name="receipt-outline" size={16} color="#fff" />
            <Text style={s.btnText}>Open Full Order Details</Text>
          </TouchableOpacity>
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
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  loadingWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  loadingText: { color: "#4B5563", fontSize: 13 },
  errorText: { color: "#B91C1C", fontSize: 13, lineHeight: 19, paddingVertical: 6 },
  hintText: { color: "#6B7280", fontSize: 13, paddingVertical: 6 },
});
