/**
 * OrderDetailsScreen.web.tsx
 *
 * Drop-in replacement for OrderDetailsScreen.tsx that adds full web responsiveness.
 *
 * BREAKPOINTS:
 *   < 768px   → MOBILE: renders EXACTLY as original (zero changes to spacing/logic/layout)
 *   768–1099px → TABLET: 2-column layout (main content left, tracking sidebar right)
 *   ≥ 1100px  → DESKTOP: wider 2-column layout (2.1 : 1 ratio), max-width 1280px centered
 *
 * HOW TO INTEGRATE:
 *   1. Rename original OrderDetailsScreen.tsx → OrderDetailsScreen.mobile.tsx (keep as backup)
 *   2. Rename this file → OrderDetailsScreen.tsx  (it becomes the new default export)
 *   3. No other changes needed — all imports/logic are identical to the original.
 *
 * GUARANTEES:
 *   • Mobile layout: NOT TOUCHED. MobileLayout is a verbatim copy of the original JSX.
 *   • Mobile styles (styles/tStyles/lStyles): IDENTICAL to original — not modified.
 *   • Web layout only appears when Platform.OS === "web" AND width >= 768.
 */

import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Clipboard,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { ShippingLabelContent } from "@/components/shipping/ShippingLabelContent";
import type { OrderDetail, OrderItem, OrderStep } from "@/lib/orders/ordersData";
import { buildShippingLabelData, type ShippingLabelData } from "@/lib/shipping/shippingLabelData";
import { openShippingLabelPrint } from "@/lib/shipping/shippingLabelHtml";
import { fetchSellerOrderDetail, syncShiprocketTracking } from "@/services/orderApi";
import { fetchSellerProfile } from "@/services/sellerProfileApi";
import { ensureSellerId } from "@/lib/api/sellerSession";
import { getLiveOrder, loadOrdersFromApi, subscribeToOrderChanges, upsertLiveOrder } from "@/lib/orders/ordersStore";
import { useResponsive } from "@/hooks/useResponsive";

// ─── Breakpoints ──────────────────────────────────────────────────────────────
const BP_TABLET  = 768;   // >= tablet: 2-col layout
const BP_DESKTOP = 1100;  // >= desktop: wider columns, max-width container

function openProductDetail(item: OrderItem) {
  if (item.productId) {
    router.push({ pathname: "/(main)/Productdetail", params: { id: String(item.productId) } });
    return;
  }
  router.push("/(main)/productmanagement");
}

// ─── Color Palette (identical to original) ────────────────────────────────────
const C = {
  navy:       "#1E2B6B",
  navyDeep:   "#151D4F",
  purple:     "#6C63FF",
  purplePale: "#F0EEFF",
  green:      "#22C55E",
  greenPale:  "#F0FDF4",
  red:        "#EF4444",
  redPale:    "#FEF2F2",
  yellow:     "#F59E0B",
  yellowPale: "#FFFBEB",
  blue:       "#3B82F6",
  bluePale:   "#EFF6FF",
  orange:     "#F97316",
  orangePale: "#FFF7ED",
  white:      "#FFFFFF",
  bg:         "#F7F8FC",
  border:     "#E5E7EB",
  textDark:   "#111827",
  textMid:    "#374151",
  textLight:  "#9CA3AF",
};

const PAYMENT_STATUS_CONFIG = {
  Paid:     { bg: C.greenPale,  color: C.green  },
  Pending:  { bg: C.bluePale,   color: C.blue   },
  Failed:   { bg: C.redPale,    color: C.red    },
  Refunded: { bg: C.orangePale, color: C.orange },
} as const;

const REVIEW_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Pending:  { bg: C.yellowPale, color: C.yellow },
  Approved: { bg: C.greenPale,  color: C.green  },
  Rejected: { bg: C.redPale,    color: C.red    },
  Shipped:  { bg: C.bluePale,   color: C.blue   },
  Completed:{ bg: C.greenPale,  color: C.green  },
};

function reviewStatusStyle(label: string) {
  return REVIEW_STATUS_COLORS[label] ?? { bg: C.bg, color: C.textMid };
}

function hasReviewData(order: OrderDetail): boolean {
  return !!(
    order.reviewSummary?.hasPendingReview ||
    order.returns?.length ||
    order.exchanges?.length ||
    order.replacements?.length ||
    order.cancellations?.length
  );
}

function formatItemWeight(item: OrderItem): string {
  const weight = item.chargeableWeight ?? item.packageDeadWeight ?? item.weight;
  return weight != null ? `${weight} kg` : "—";
}

function formatItemDimensions(item: OrderItem): string {
  if (item.lengthCm != null && item.widthCm != null && item.heightCm != null) {
    return `${item.lengthCm}cm × ${item.widthCm}cm × ${item.heightCm}cm`;
  }
  return "—";
}

function totalItemWeight(order: OrderDetail): string {
  const total = order.items.reduce((sum, item) => {
    const weight = item.chargeableWeight ?? item.packageDeadWeight ?? item.weight ?? 0;
    return sum + weight * item.qty;
  }, 0);
  return total > 0 ? `${total.toFixed(2)} kg` : "—";
}

function primaryItemDimensions(order: OrderDetail): string {
  return order.items[0] ? formatItemDimensions(order.items[0]) : "—";
}

// ─── Shiprocket types & mock (identical to original) ─────────────────────────
interface ShiprocketEvent {
  date: string; time: string; status: string;
  location: string; description: string;
  type: "done" | "active" | "pending";
}
interface ShiprocketData {
  shiprocketOrderId: string; shipmentId: string; awb: string;
  courier: string; shipmentStatus: string; lastSynced: string;
  trackingUrl: string; events: ShiprocketEvent[];
}

function buildShiprocketData(order: OrderDetail): ShiprocketData {
  const sr = order.shiprocket;
  if (sr?.awb || sr?.orderId || sr?.trackingUrl) {
    return {
      shiprocketOrderId: sr.orderId ?? "—",
      shipmentId: sr.shipmentId ?? "—",
      awb: sr.awb ?? "—",
      courier: sr.courier ?? "—",
      shipmentStatus: sr.status ?? order.status,
      lastSynced: sr.syncedAt ?? "—",
      trackingUrl: sr.trackingUrl ?? "",
      events: [],
    };
  }
  return {
    shiprocketOrderId: "—",
    shipmentId: "—",
    awb: "—",
    courier: "—",
    shipmentStatus: order.status,
    lastSynced: "—",
    trackingUrl: "",
    events: [],
  };
}

async function refreshShiprocketFromApi(orderKey: string): Promise<ShiprocketData> {
  const synced = await syncShiprocketTracking(orderKey);
  return {
    shiprocketOrderId: synced.shiprocketOrderId ?? "—",
    shipmentId: synced.shipmentId ?? "—",
    awb: synced.awb ?? "—",
    courier: synced.courier ?? "—",
    shipmentStatus: synced.status ?? "—",
    lastSynced: synced.syncedAt ?? "—",
    trackingUrl: synced.trackingUrl ?? "",
    events: (synced.events ?? []).map((ev) => ({
      date: ev.date,
      time: ev.time,
      status: ev.status,
      location: ev.location,
      description: ev.description,
      type: (ev.type === "done" || ev.type === "active" ? ev.type : "pending") as ShiprocketEvent["type"],
    })),
  };
}

async function buildLabelForOrder(order: OrderDetail): Promise<ShippingLabelData> {
  let profile = null;
  try {
    profile = await fetchSellerProfile();
  } catch {
    profile = null;
  }
  return buildShippingLabelData({
    order,
    profile,
    sellerId: ensureSellerId(),
    weight: totalItemWeight(order),
    dimensions: primaryItemDimensions(order),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SHARED ATOMS ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const SectionHeader: React.FC<{
  iconLib: "Ionicons" | "MCIcons"; iconName: string; title: string; action?: React.ReactNode;
}> = ({ iconLib, iconName, title, action }) => (
  <View style={sh.sectionHeader}>
    <View style={sh.sectionHeaderLeft}>
      <View style={sh.sectionIconWrap}>
        {iconLib === "Ionicons"
          ? <Ionicons name={iconName} size={18} color={C.navy} />
          : <MaterialCommunityIcons name={iconName} size={18} color={C.navy} />}
      </View>
      <Text style={sh.sectionTitle}>{title}</Text>
    </View>
    {action}
  </View>
);

// ─── Compact tracking timeline (used inside web sidebar card) ─────────────────
const InlineTimeline: React.FC<{ events: ShiprocketEvent[] }> = ({ events }) => (
  <View>
    {events.map((ev, idx) => {
      const isLast   = idx === events.length - 1;
      const isDone   = ev.type === "done";
      const isActive = ev.type === "active";
      const dotBg    = isActive ? C.orange : isDone ? C.navy : C.border;
      return (
        <View key={idx} style={{ flexDirection:"row" }}>
          <View style={{ width:22, alignItems:"center" }}>
            <View style={{ width:18, height:18, borderRadius:9, backgroundColor:dotBg, alignItems:"center", justifyContent:"center", zIndex:1 }}>
              {isDone   && <Ionicons name="checkmark" size={9} color={C.white} />}
              {isActive && <View style={{ width:6, height:6, borderRadius:3, backgroundColor:C.orange }} />}
            </View>
            {!isLast && <View style={{ width:2, flex:1, minHeight:12, backgroundColor:isDone?C.navy:C.border, borderRadius:1, marginVertical:2 }} />}
          </View>
          <View style={{ flex:1, paddingLeft:8, paddingBottom: isLast ? 0 : 14 }}>
            <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", marginBottom:2 }}>
              <Text style={{ fontSize:11, fontWeight:"700", color: isActive?C.orange:isDone?C.textDark:C.textLight, flex:1 }}>{ev.status}</Text>
              <Text style={{ fontSize:9, color:C.textLight, marginLeft:4 }}>{ev.date}</Text>
            </View>
            <View style={{ flexDirection:"row", alignItems:"center", gap:3, marginBottom:3 }}>
              <Ionicons name="location-outline" size={9} color={C.textLight} />
              <Text style={{ fontSize:10, color:C.textLight }}>{ev.location}</Text>
            </View>
            <Text style={{ fontSize:10, color:C.textMid, lineHeight:15 }}>{ev.description}</Text>
          </View>
        </View>
      );
    })}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ─── WEB CARD COMPONENTS ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const WebOrderSummaryCard: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = PAYMENT_STATUS_CONFIG[order.payment.status];
  return (
    <View style={wc.card}>
      <SectionHeader iconLib="Ionicons" iconName="receipt-outline" title="Order Summary" />
      <View style={{ flexDirection:"row", gap:20 }}>
        <View style={{ flex:1 }}>
          <Text style={wc.label}>Order ID</Text>
          <View style={{ flexDirection:"row", alignItems:"center", gap:6, marginBottom:12 }}>
            <Text style={wc.boldVal}>{order.id}</Text>
            <TouchableOpacity onPress={() => { Clipboard.setString(order.id); Alert.alert("Copied","Order ID copied."); }} hitSlop={{top:6,bottom:6,left:6,right:6}}>
              <Ionicons name="copy-outline" size={13} color={C.textLight} />
            </TouchableOpacity>
          </View>
          <Text style={wc.label}>Date</Text>
          <Text style={wc.val}>{order.date}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={wc.label}>Payment Method</Text>
          <View style={{ flexDirection:"row", alignItems:"center", gap:6, marginBottom:12 }}>
            <Text style={wc.val}>{order.payment.method}</Text>
            <View style={[wc.pill, { backgroundColor:cfg.bg }]}>
              <Text style={[wc.pillText, { color:cfg.color }]}>{order.payment.status}</Text>
            </View>
          </View>
          <Text style={wc.label}>Order Amount</Text>
          <TouchableOpacity style={{ flexDirection:"row", alignItems:"center", gap:4 }} onPress={() => setExpanded(!expanded)}>
            <Text style={{ fontSize:18, fontWeight:"800", color:C.navy }}>{order.pricing.total}</Text>
            <Ionicons name={expanded?"chevron-up":"chevron-down"} size={16} color={C.navy} />
          </TouchableOpacity>
          {expanded && (
            <View style={{ marginTop:8, gap:4 }}>
              <View style={wc.breakRow}><Text style={wc.breakLabel}>Subtotal</Text><Text style={wc.breakVal}>{order.pricing.subtotal}</Text></View>
              <View style={wc.breakRow}><Text style={wc.breakLabel}>Shipping</Text><Text style={wc.breakVal}>{order.pricing.shipping}</Text></View>
              {order.pricing.tax && <View style={wc.breakRow}><Text style={wc.breakLabel}>Tax</Text><Text style={wc.breakVal}>{order.pricing.tax}</Text></View>}
              {order.pricing.discount && <View style={wc.breakRow}><Text style={wc.breakLabel}>Discount</Text><Text style={[wc.breakVal,{color:C.green}]}>-{order.pricing.discount}</Text></View>}
              {order.pricing.referralDiscount && <View style={wc.breakRow}><Text style={wc.breakLabel}>Referral Discount</Text><Text style={[wc.breakVal,{color:C.green}]}>-{order.pricing.referralDiscount}</Text></View>}
              {order.pricing.walletDeduction && <View style={wc.breakRow}><Text style={wc.breakLabel}>Wallet</Text><Text style={[wc.breakVal,{color:C.green}]}>-{order.pricing.walletDeduction}</Text></View>}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const WebCustomerCard: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const shippingAddress = order.customer.address;
  const billingAddress = order.billing?.address ?? shippingAddress;
  return (
    <View style={wc.card}>
      <SectionHeader iconLib="Ionicons" iconName="person-circle-outline" title="Customer & Addresses" />
      <View style={{ flexDirection:"row", alignItems:"center", gap:10, marginBottom:16 }}>
        <View style={wc.avatar}>
          <Text style={wc.avatarText}>{order.customer.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={{ fontSize:15, fontWeight:"700", color:C.textDark }}>{order.customer.name}</Text>
          {!!order.customer.phone && <Text style={{ fontSize:12, color:C.textMid, marginTop:2 }}>{order.customer.phone}</Text>}
          {!!order.customer.email && <Text style={{ fontSize:12, color:C.textLight, marginTop:2 }}>{order.customer.email}</Text>}
        </View>
      </View>
      <View style={{ flexDirection:"row", gap:0 }}>
        <View style={{ flex:1, paddingRight:14 }}>
          <View style={{ flexDirection:"row", alignItems:"center", gap:6, marginBottom:6 }}>
            <View style={{ width:22, height:22, borderRadius:11, backgroundColor:C.bluePale, alignItems:"center", justifyContent:"center" }}>
              <Ionicons name="location-outline" size={13} color={C.blue} />
            </View>
            <Text style={{ fontSize:11, fontWeight:"700", color:C.blue }}>Shipping Address</Text>
          </View>
          <Text style={{ fontSize:12, color:C.textMid, lineHeight:20 }}>{shippingAddress}</Text>
        </View>
        <View style={{ width:1, backgroundColor:C.border }} />
        <View style={{ flex:1, paddingLeft:14 }}>
          <View style={{ flexDirection:"row", alignItems:"center", gap:6, marginBottom:6 }}>
            <View style={{ width:22, height:22, borderRadius:11, backgroundColor:C.purplePale, alignItems:"center", justifyContent:"center" }}>
              <MaterialCommunityIcons name="office-building-outline" size={13} color={C.purple} />
            </View>
            <Text style={{ fontSize:11, fontWeight:"700", color:C.purple }}>Billing Address</Text>
          </View>
          <Text style={{ fontSize:12, color:C.textMid, lineHeight:20 }}>{billingAddress}</Text>
        </View>
      </View>
    </View>
  );
};

const WebItemsCard: React.FC<{ order: OrderDetail }> = ({ order }) => (
  <View style={wc.card}>
    <SectionHeader iconLib="Ionicons" iconName="bag-outline" title={`Order Items (${order.items.length})`} />
    {order.items.map((item, idx) => (
      <View key={idx} style={[{ flexDirection:"row", gap:12 }, idx>0 && { marginTop:14, paddingTop:14, borderTopWidth:1, borderTopColor:C.border }]}>
            <TouchableOpacity onPress={() => openProductDetail(item)} activeOpacity={0.85}>
            <Image source={{ uri:item.image }} style={{ width:80, height:80, borderRadius:10, backgroundColor:C.border }} />
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
            <Text style={{ fontSize:14, fontWeight:"700", color:C.textDark, flex:1 }}>{item.name}</Text>
            <Text style={{ fontSize:14, fontWeight:"800", color:C.textDark, marginLeft:8 }}>{item.price}</Text>
          </View>
          <Text style={{ fontSize:12, color:C.textLight, marginBottom:3 }}>{item.variant}</Text>
          <Text style={{ fontSize:11, color:C.textLight, marginBottom:3 }}>SKU: {item.sku}</Text>
          {!!item.hsnCode && <Text style={{ fontSize:11, color:C.textLight, marginBottom:3 }}>HSN: {item.hsnCode}</Text>}
          {!!item.status && <Text style={{ fontSize:11, color:C.textLight, marginBottom:3 }}>Status: {item.status}</Text>}
          {item.customDetails?.map((detail) => (
            <Text key={detail.id} style={{ fontSize:11, color:C.textMid, marginBottom:2 }}>
              {detail.fieldLabel}: {detail.valueText || detail.valueFile || "—"}
            </Text>
          ))}
          <View style={{ alignSelf:"flex-start", backgroundColor:C.bluePale, paddingHorizontal:10, paddingVertical:3, borderRadius:12 }}>
            <Text style={{ fontSize:12, fontWeight:"700", color:C.blue }}>Qty: {item.qty}</Text>
          </View>
        </View>
      </View>
    ))}
    <View style={{ borderTopWidth:1, borderTopColor:C.border, marginTop:16, paddingTop:12, gap:6 }}>
      <View style={wc.prow}><Text style={wc.plabel}>Subtotal</Text><Text style={wc.pval}>{order.pricing.subtotal}</Text></View>
      <View style={wc.prow}><Text style={wc.plabel}>Shipping Charge</Text><Text style={wc.pval}>{order.pricing.shipping}</Text></View>
      {order.pricing.tax && <View style={wc.prow}><Text style={wc.plabel}>Tax</Text><Text style={wc.pval}>{order.pricing.tax}</Text></View>}
      {order.pricing.discount && <View style={wc.prow}><Text style={wc.plabel}>Discount</Text><Text style={[wc.pval,{color:C.green}]}>-{order.pricing.discount}</Text></View>}
      {order.pricing.referralDiscount && <View style={wc.prow}><Text style={wc.plabel}>Referral Discount</Text><Text style={[wc.pval,{color:C.green}]}>-{order.pricing.referralDiscount}</Text></View>}
      {order.pricing.walletDeduction && <View style={wc.prow}><Text style={wc.plabel}>Wallet Deduction</Text><Text style={[wc.pval,{color:C.green}]}>-{order.pricing.walletDeduction}</Text></View>}
      <View style={[wc.prow, { borderTopWidth:1, borderTopColor:C.border, paddingTop:8, marginTop:2 }]}>
        <Text style={{ fontSize:14, fontWeight:"700", color:C.textDark }}>Total Amount</Text>
        <Text style={{ fontSize:16, fontWeight:"800", color:C.navy }}>{order.pricing.total}</Text>
      </View>
    </View>
  </View>
);

const WebPaymentCard: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const cfg = PAYMENT_STATUS_CONFIG[order.payment.status];
  return (
    <View style={wc.card}>
      <SectionHeader iconLib="MCIcons" iconName="credit-card-outline" title="Payment Information" />
      <View style={{ flexDirection:"row", gap:20 }}>
        <View style={{ flex:1 }}>
          <Text style={wc.label}>Payment Method</Text><Text style={wc.val}>{order.payment.method}</Text>
          <Text style={[wc.label,{marginTop:12}]}>Transaction ID</Text><Text style={wc.val}>{order.payment.transactionId}</Text>
          <Text style={[wc.label,{marginTop:12}]}>Paid On</Text><Text style={wc.val}>{order.payment.paidOn}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={wc.label}>Payment Status</Text>
          <View style={[wc.pill, { backgroundColor:cfg.bg, alignSelf:"flex-start", marginBottom:12 }]}>
            <Text style={[wc.pillText,{color:cfg.color}]}>{order.payment.status}</Text>
          </View>
          <Text style={wc.label}>Bank / UPI ID</Text><Text style={wc.val}>{order.payment.bankOrUpiId}</Text>
          <Text style={[wc.label,{marginTop:12}]}>Payment Ref No.</Text><Text style={wc.val}>{order.payment.refNo}</Text>
        </View>
      </View>
    </View>
  );
};

const WebNotesCard: React.FC<{ order: OrderDetail }> = ({ order }) => (
  <View style={wc.card}>
    <SectionHeader iconLib="MCIcons" iconName="text-box-outline" title="Order Notes" />
    {order.customerNote
      ? <><Text style={wc.notesLabel}>Customer Note</Text><Text style={wc.notesVal}>{order.customerNote}</Text></>
      : <Text style={{ fontSize:13, color:C.textLight }}>No customer note provided.</Text>}
    {order.sellerNote && <><Text style={[wc.notesLabel,{marginTop:10}]}>Seller Note</Text><Text style={wc.notesVal}>{order.sellerNote}</Text></>}
    {order.cancelReason && <><Text style={[wc.notesLabel,{marginTop:10}]}>Cancellation Reason</Text><Text style={wc.notesVal}>{order.cancelReason}</Text></>}
  </View>
);

const WebGstCard: React.FC<{ order: OrderDetail }> = ({ order }) => {
  if (!order.gstNumber && !order.gstInfo && !order.gstRecords?.length) return null;
  return (
    <View style={wc.card}>
      <SectionHeader iconLib="MCIcons" iconName="file-percent-outline" title="GST Details" />
      {!!order.gstNumber && <><Text style={wc.label}>GST Number</Text><Text style={wc.val}>{order.gstNumber}</Text></>}
      {!!order.gstInfo && <><Text style={[wc.label,{marginTop:12}]}>GST Info</Text><Text style={wc.notesVal}>{order.gstInfo}</Text></>}
      {order.gstRecords?.map((record, idx) => (
        <View key={record.id ?? idx} style={{ marginTop:12, paddingTop:12, borderTopWidth: idx > 0 || order.gstNumber ? 1 : 0, borderTopColor:C.border }}>
          {!!record.gstNumber && <Text style={wc.val}>{record.gstNumber}</Text>}
          {!!record.gstInfo && <Text style={[wc.notesVal,{marginTop:4}]}>{record.gstInfo}</Text>}
          {!!record.createdAt && <Text style={{ fontSize:10, color:C.textLight, marginTop:4 }}>{record.createdAt}</Text>}
        </View>
      ))}
    </View>
  );
};

const WebReviewCard: React.FC<{ order: OrderDetail }> = ({ order }) => {
  if (!hasReviewData(order)) return null;
  const summary = order.reviewSummary;
  const renderRows = (
    title: string,
    rows: Array<{ id: number; productName: string; statusLabel: string; reason?: string; description?: string; adminComment?: string; createdAt?: string; solutionLabel?: string }>
  ) => rows.length ? (
    <View style={{ marginTop:14 }}>
      <Text style={{ fontSize:12, fontWeight:"700", color:C.textDark, marginBottom:8 }}>{title}</Text>
      {rows.map((row) => {
        const cfg = reviewStatusStyle(row.statusLabel);
        return (
          <View key={row.id} style={{ marginBottom:10, padding:12, borderRadius:10, backgroundColor:C.bg, borderWidth:1, borderColor:C.border }}>
            <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <Text style={{ fontSize:13, fontWeight:"700", color:C.textDark, flex:1 }}>{row.productName}</Text>
              <View style={[wc.pill, { backgroundColor:cfg.bg }]}><Text style={[wc.pillText, { color:cfg.color }]}>{row.statusLabel}</Text></View>
            </View>
            {!!row.reason && <Text style={{ fontSize:11, color:C.textMid, marginBottom:3 }}>Reason: {row.reason}</Text>}
            {!!row.description && <Text style={{ fontSize:11, color:C.textMid, marginBottom:3 }}>{row.description}</Text>}
            {!!row.solutionLabel && <Text style={{ fontSize:11, color:C.textMid, marginBottom:3 }}>Solution: {row.solutionLabel}</Text>}
            {!!row.adminComment && <Text style={{ fontSize:11, color:C.orange, marginBottom:3 }}>Admin: {row.adminComment}</Text>}
            {!!row.createdAt && <Text style={{ fontSize:10, color:C.textLight }}>{row.createdAt}</Text>}
          </View>
        );
      })}
    </View>
  ) : null;

  return (
    <View style={wc.card}>
      <SectionHeader iconLib="MCIcons" iconName="clipboard-check-outline" title="Order Review" />
      {summary && (
        <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:4 }}>
          {summary.returnCount > 0 && <View style={[wc.pill,{backgroundColor:C.orangePale}]}><Text style={[wc.pillText,{color:C.orange}]}>{summary.returnCount} Return{summary.returnCount>1?"s":""}</Text></View>}
          {summary.exchangeCount > 0 && <View style={[wc.pill,{backgroundColor:C.bluePale}]}><Text style={[wc.pillText,{color:C.blue}]}>{summary.exchangeCount} Exchange{summary.exchangeCount>1?"s":""}</Text></View>}
          {summary.replacementCount > 0 && <View style={[wc.pill,{backgroundColor:C.purplePale}]}><Text style={[wc.pillText,{color:C.purple}]}>{summary.replacementCount} Replacement{summary.replacementCount>1?"s":""}</Text></View>}
          {summary.cancellationCount > 0 && <View style={[wc.pill,{backgroundColor:C.redPale}]}><Text style={[wc.pillText,{color:C.red}]}>{summary.cancellationCount} Cancellation{summary.cancellationCount>1?"s":""}</Text></View>}
        </View>
      )}
      {renderRows("Returns", order.returns ?? [])}
      {renderRows("Exchanges", order.exchanges ?? [])}
      {renderRows("Replacements", order.replacements ?? [])}
      {renderRows("Cancellations", order.cancellations ?? [])}
    </View>
  );
};

const WebStatusHistoryCard: React.FC<{ order: OrderDetail }> = ({ order }) => {
  if (!order.statusHistory?.length) return null;
  return (
    <View style={wc.card}>
      <SectionHeader iconLib="MCIcons" iconName="history" title="Status History" />
      {order.statusHistory.map((entry) => (
        <View key={entry.id} style={{ flexDirection:"row", gap:10, marginBottom:12 }}>
          <View style={{ width:8, height:8, borderRadius:4, backgroundColor:C.navy, marginTop:5 }} />
          <View style={{ flex:1 }}>
            <View style={{ flexDirection:"row", justifyContent:"space-between", gap:8 }}>
              <Text style={{ fontSize:13, fontWeight:"700", color:C.textDark }}>{entry.statusLabel}</Text>
              <Text style={{ fontSize:10, color:C.textLight }}>{entry.createdAt}</Text>
            </View>
            {!!entry.comment && <Text style={{ fontSize:11, color:C.textMid, marginTop:4 }}>{entry.comment}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
};

const WebEmailLogsCard: React.FC<{ order: OrderDetail }> = ({ order }) => {
  if (!order.emailLogs?.length) return null;
  return (
    <View style={wc.card}>
      <SectionHeader iconLib="MCIcons" iconName="email-outline" title="Email Logs" />
      {order.emailLogs.map((log) => (
        <View key={log.id} style={{ marginBottom:12, paddingBottom:12, borderBottomWidth:1, borderBottomColor:C.border }}>
          <View style={{ flexDirection:"row", justifyContent:"space-between", gap:8, marginBottom:4 }}>
            <Text style={{ fontSize:13, fontWeight:"700", color:C.textDark, flex:1 }}>{log.subject || log.emailType}</Text>
            <Text style={{ fontSize:10, color:C.textLight }}>{log.sentAt}</Text>
          </View>
          <Text style={{ fontSize:11, color:C.textMid }}>{log.email}</Text>
          <Text style={{ fontSize:11, color:C.textLight, marginTop:2 }}>{log.emailType} · {log.status}</Text>
          {!!log.errorMessage && <Text style={{ fontSize:11, color:C.red, marginTop:4 }}>{log.errorMessage}</Text>}
        </View>
      ))}
    </View>
  );
};

const WebDocumentsCard: React.FC<{ onOpenLabel: () => void }> = ({ onOpenLabel }) => (
  <View style={wc.card}>
    <SectionHeader iconLib="MCIcons" iconName="file-document-multiple-outline" title="Documents" />
    <TouchableOpacity style={{ flexDirection:"row", alignItems:"center", gap:12, paddingVertical:6 }} onPress={onOpenLabel} activeOpacity={0.85}>
      <View style={{ width:44, height:44, borderRadius:12, backgroundColor:C.purplePale, alignItems:"center", justifyContent:"center" }}>
        <MaterialCommunityIcons name="tag-outline" size={22} color={C.purple} />
      </View>
      <View style={{ flex:1 }}>
        <Text style={{ fontSize:13, fontWeight:"700", color:C.textDark }}>Shipping Label</Text>
        <Text style={{ fontSize:10, color:C.textLight, marginTop:2 }}>Preview & print</Text>
      </View>
      <View style={{ flexDirection:"row", alignItems:"center", paddingHorizontal:10, paddingVertical:5, borderRadius:10, borderWidth:1, borderColor:C.border }}>
        <Ionicons name="eye-outline" size={13} color={C.navy} style={{ marginRight:4 }} />
        <Text style={{ fontSize:11, fontWeight:"600", color:C.navy }}>Preview</Text>
      </View>
    </TouchableOpacity>
  </View>
);

const WebTrackingCard: React.FC<{ order: OrderDetail }> = ({ order }) => {
  const [syncing, setSyncing] = useState(false);
  const [srData, setSrData]   = useState<ShiprocketData>(() => buildShiprocketData(order));

  useEffect(() => {
    let cancelled = false;
    const shouldSync =
      order.shiprocket?.awb ||
      order.shiprocket?.orderId ||
      order.status === "Shipped" ||
      order.status === "Delivered";
    if (!shouldSync) return;

    (async () => {
      setSyncing(true);
      try {
        const data = await refreshShiprocketFromApi(order.id);
        if (!cancelled) setSrData(data);
      } catch {
        // keep initial data
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [order.id, order.status, order.shiprocket?.awb, order.shiprocket?.orderId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      setSrData(await refreshShiprocketFromApi(order.id));
      Alert.alert("Synced", "Tracking data refreshed from server.");
    } catch {
      Alert.alert("Sync failed", "Could not refresh tracking. Try again.");
    } finally {
      setSyncing(false);
    }
  };
  return (
    <View style={wc.card}>
      {/* Header */}
      <View style={{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
          <View style={{ width:32, height:32, borderRadius:8, backgroundColor:C.purplePale, alignItems:"center", justifyContent:"center" }}>
            <MaterialCommunityIcons name="truck-fast-outline" size={18} color={C.purple} />
          </View>
          <View>
            <Text style={{ fontSize:13, fontWeight:"700", color:C.textDark }}>Shiprocket Tracking</Text>
            <Text style={{ fontSize:10, color:C.textLight }}>Live sync · {srData.lastSynced}</Text>
          </View>
        </View>
        <TouchableOpacity style={wc.syncBtn} onPress={handleSync} disabled={syncing} activeOpacity={0.8}>
          <MaterialCommunityIcons name={syncing?"loading":"refresh"} size={13} color={C.navy} style={syncing?{opacity:0.5}:undefined} />
          <Text style={{ fontSize:11, fontWeight:"700", color:C.navy }}>{syncing?"Syncing…":"Sync"}</Text>
        </TouchableOpacity>
      </View>
      {/* Status banner */}
      <View style={{ backgroundColor:C.bg, borderRadius:10, padding:12, flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
          <MaterialCommunityIcons name="truck-outline" size={20} color={C.purple} />
          <View>
            <Text style={{ fontSize:10, color:C.textLight, fontWeight:"600" }}>Shipment Status</Text>
            <Text style={{ fontSize:14, fontWeight:"800", color:C.navy }}>{srData.shipmentStatus}</Text>
          </View>
        </View>
        <View style={{ backgroundColor:C.purplePale, paddingHorizontal:10, paddingVertical:4, borderRadius:12 }}>
          <Text style={{ fontSize:10, fontWeight:"700", color:C.purple }}>{srData.awb !== "—" ? `AWB: ${srData.awb}` : "Shiprocket pending"}</Text>
        </View>
      </View>
      {/* Meta rows */}
      <View style={{ marginBottom:14 }}>
        {[
          { label:"Shiprocket Order ID", value:srData.shiprocketOrderId, copy:true  },
          { label:"Shipment ID",         value:srData.shipmentId,        copy:true  },
          { label:"AWB / Tracking No.",  value:srData.awb,               copy:true  },
          { label:"Courier Partner",     value:srData.courier                        },
          { label:"Tracking URL",        value:srData.trackingUrl,       url:true   },
        ].map((row, i) => (
          <View key={i} style={{ borderBottomWidth:1, borderBottomColor:C.bg, paddingVertical:7, flexDirection:"row", justifyContent:"space-between", alignItems:"center" }}>
            <Text style={{ fontSize:11, color:C.textLight, flex:1 }}>{row.label}</Text>
            <View style={{ flexDirection:"row", alignItems:"center", gap:5 }}>
              <Text
                style={{ fontSize:11, fontWeight:"600", color:row.url?C.blue:C.textDark }}
                onPress={row.url ? () => Linking.openURL(row.value) : undefined}
                numberOfLines={1}
              >
                {row.url ? "Open ↗" : row.value}
              </Text>
              {row.copy && (
                <TouchableOpacity onPress={() => { Clipboard.setString(row.value); Alert.alert("Copied",`${row.label} copied.`); }} hitSlop={{top:6,bottom:6,left:6,right:6}}>
                  <Ionicons name="copy-outline" size={11} color={C.textLight} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
      {/* Timeline */}
      <Text style={{ fontSize:12, fontWeight:"700", color:C.textDark, marginBottom:12 }}>Tracking Timeline</Text>
      <InlineTimeline events={srData.events} />
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SHIPPING LABEL MODAL (identical to original, shared by both layouts) ─────
// ═══════════════════════════════════════════════════════════════════════════════

interface ShippingLabelModalProps {
  visible: boolean; order: OrderDetail; onClose: () => void; onPrint: () => void;
}
const ShippingLabelModal: React.FC<ShippingLabelModalProps> = ({ visible, order, onClose, onPrint }) => {
  const [label, setLabel] = useState<ShippingLabelData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setLabel(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    buildLabelForOrder(order)
      .then((data) => {
        if (!cancelled) setLabel(data);
      })
      .catch(() => {
        if (!cancelled) setLabel(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [visible, order]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={lStyles.modalOverlay}>
      <SafeAreaView style={lStyles.safeArea}>
        <ScrollView style={lStyles.scroll} contentContainerStyle={lStyles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading || !label ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: C.textMid, fontWeight: "600" }}>Preparing shipping label…</Text>
            </View>
          ) : (
            <ShippingLabelContent label={label} styles={lStyles} />
          )}
        </ScrollView>
        <View style={lStyles.bottomBtnRow}>
          <TouchableOpacity style={lStyles.printBtn} onPress={onPrint} activeOpacity={0.85} disabled={!label}>
            <Ionicons name="print-outline" size={16} color={C.white} style={{marginRight:6}} />
            <Text style={lStyles.printBtnText}>Print Label</Text>
          </TouchableOpacity>
          <TouchableOpacity style={lStyles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={lStyles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── WEB LAYOUT ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const WebLayout: React.FC<{ order: OrderDetail; onOpenLabel: () => void }> = ({ order, onOpenLabel }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= BP_DESKTOP;
  const isMobileWeb = width < BP_TABLET;
  const cfg       = PAYMENT_STATUS_CONFIG[order.payment.status];

  return (
    <View style={{ flex:1, backgroundColor:C.bg }}>

      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <View style={wl.topNav}>
        <View style={wl.topNavInner}>
          <TouchableOpacity style={wl.backBtn} onPress={() => router.push("/(main)/Ordersscreen")} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={18} color={C.white} />
            <Text style={wl.backBtnText}>Orders</Text>
          </TouchableOpacity>
          <View style={{flex:1}} />
          <Text style={wl.navOrderId}>{order.id}</Text>
          <View style={[wc.pill, { backgroundColor:cfg.bg, marginLeft:10 }]}>
            <Text style={[wc.pillText, { color:cfg.color }]}>{order.payment.status}</Text>
          </View>
        </View>
      </View>

      {/* ── Page Title + Stepper bar ────────────────────────── */}
      <View style={wl.titleBar}>
        <View style={[wl.titleBarInner, isDesktop && { maxWidth:1280 }]}>
          <View>
            <Text style={wl.pageTitle}>Order Details</Text>
            <Text style={wl.pageSubtitle}>{order.date}</Text>
          </View>
          {/* Horizontal order stepper */}
          <View style={wl.stepperRow}>
            {order.steps.map((step, idx) => {
              const isActive   = step.status === "active";
              const isDone     = step.status === "done";
              const isLast     = idx === order.steps.length - 1;
              const iconBg     = isActive ? C.orange : isDone ? C.navy : C.white;
              const iconColor  = isActive||isDone ? C.white : C.textLight;
              const iconBorder = isActive ? C.orange : isDone ? C.navy : C.border;
              const labelColor = isActive ? C.orange : isDone ? C.textMid : C.textLight;
              return (
                <React.Fragment key={step.key}>
                  <View style={{ alignItems:"center", width:60 }}>
                    <View style={[wl.stepCircle, { backgroundColor:iconBg, borderColor:iconBorder }]}>
                      {step.iconLib==="Ionicons"
                        ? <Ionicons name={step.iconName} size={13} color={iconColor} />
                        : <MaterialCommunityIcons name={step.iconName} size={13} color={iconColor} />}
                    </View>
                    <Text style={{ fontSize:10, textAlign:"center", lineHeight:13, color:labelColor, fontWeight:isActive?"700":isDone?"600":"400", width:"100%" }} numberOfLines={2}>{step.label}</Text>
                  </View>
                  {!isLast && (
                    <View style={{ flex:1, alignItems:"center", marginTop:14, paddingHorizontal:2, minWidth:20 }}>
                      <View style={{ height:2, width:"100%", borderRadius:2, backgroundColor:isDone?C.navy:C.border }} />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </View>

      {/* ── Main Content ────────────────────────────────────── */}
      <ScrollView
        style={{flex:1}}
        contentContainerStyle={[
          wl.content,
          isDesktop && { flexDirection:"row", alignItems:"flex-start", maxWidth:1280, alignSelf:"center", width:"100%", paddingHorizontal:0 },
          isMobileWeb && wl.contentMobile,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Left / Main column */}
        <View style={[{ gap:16 }, isDesktop ? { flex:2.1, marginRight:20 } : { flex:1 }]}>
          <WebOrderSummaryCard order={order} />
          <WebCustomerCard     order={order} />
          <WebItemsCard        order={order} />
          <WebPaymentCard      order={order} />
          <WebReviewCard       order={order} />
          <WebGstCard          order={order} />
          <WebStatusHistoryCard order={order} />
          <WebNotesCard        order={order} />
          <WebEmailLogsCard    order={order} />
        </View>
        {/* Right / Sidebar column */}
        <View style={[{ gap:16 }, isDesktop ? { flex:1, minWidth:300, maxWidth:400 } : { marginTop:16 }]}>
          <WebDocumentsCard onOpenLabel={onOpenLabel} />
          <WebTrackingCard  order={order} />
        </View>
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MOBILE LAYOUT (verbatim from original — zero changes) ───────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const MobileLayout: React.FC<{
  order: OrderDetail;
  trackingVisible: boolean;
  labelVisible: boolean;
  setTrackingVisible: (v:boolean) => void;
  setLabelVisible:    (v:boolean) => void;
  onPrintLabel: () => void;
}> = ({ order, trackingVisible, labelVisible, setTrackingVisible, setLabelVisible, onPrintLabel }) => {
  const [amountExpanded, setAmountExpanded] = useState(false);
  const { isMobile, isWeb } = useResponsive();
  const isWebMobile = isMobile; // native + web narrow: apply responsive layout
  const paymentStatusCfg = PAYMENT_STATUS_CONFIG[order.payment.status];
  const shippingAddress = order.customer.address;
  const billingAddress = order.billing?.address ?? shippingAddress;
  const ScreenRoot = Platform.OS === "web" ? View : SafeAreaView;

  // Mobile tracking modal (identical to original)
  const MobileTrackingModal = () => {
    const [syncing, setSyncing] = useState(false);
    const [srData, setSrData]   = useState<ShiprocketData>(() => buildShiprocketData(order));

    useEffect(() => {
      if (!trackingVisible) return;
      let cancelled = false;
      (async () => {
        setSyncing(true);
        try {
          const data = await refreshShiprocketFromApi(order.id);
          if (!cancelled) setSrData(data);
        } catch {
          // keep initial data
        } finally {
          if (!cancelled) setSyncing(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [trackingVisible, order.id]);

    const handleSync = async () => {
      setSyncing(true);
      try {
        setSrData(await refreshShiprocketFromApi(order.id));
        Alert.alert("Synced", "Tracking data refreshed from server.");
      } catch {
        Alert.alert("Sync failed", "Could not refresh tracking. Try again.");
      } finally {
        setSyncing(false);
      }
    };
    const MetaRow = ({ label, value, copyable, isUrl }: { label:string; value:string; copyable?:boolean; isUrl?:boolean }) => (
      <View style={tStyles.metaRow}>
        <Text style={tStyles.metaLabel}>{label}</Text>
        <View style={tStyles.metaValueRow}>
          <Text style={[tStyles.metaValue,isUrl&&{color:C.blue}]} onPress={isUrl?()=>Linking.openURL(value):undefined} numberOfLines={1}>
            {isUrl?"Open Tracking Page ↗":value}
          </Text>
          {copyable && (
            <TouchableOpacity onPress={()=>{Clipboard.setString(value);Alert.alert("Copied",`${label} copied.`);}} hitSlop={{top:6,bottom:6,left:6,right:6}}>
              <Ionicons name="copy-outline" size={13} color={C.textLight} style={{marginLeft:6}} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
    return (
      <Modal visible={trackingVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setTrackingVisible(false)}>
        <SafeAreaView style={tStyles.safeArea}>
          <View style={tStyles.header}>
            <View style={tStyles.headerLeft}>
              <View style={tStyles.headerIcon}><MaterialCommunityIcons name="truck-fast-outline" size={18} color={C.purple} /></View>
              <View><Text style={tStyles.headerTitle}>Shiprocket Tracking</Text><Text style={tStyles.headerSub}>Live sync · {srData.lastSynced}</Text></View>
            </View>
            <View style={tStyles.headerRight}>
              <TouchableOpacity style={tStyles.syncBtn} onPress={handleSync} disabled={syncing} activeOpacity={0.8}>
                <MaterialCommunityIcons name={syncing?"loading":"refresh"} size={14} color={C.navy} style={syncing?{opacity:0.5}:undefined} />
                <Text style={tStyles.syncBtnText}>{syncing?"Syncing…":"Sync"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>setTrackingVisible(false)} style={tStyles.closeBtn}>
                <Ionicons name="close" size={22} color={C.textDark} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={tStyles.scroll} contentContainerStyle={tStyles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={tStyles.statusBanner}>
              <View style={tStyles.statusBannerLeft}>
                <MaterialCommunityIcons name="truck-outline" size={22} color={C.purple} />
                <View style={{marginLeft:10}}>
                  <Text style={tStyles.statusBannerLabel}>Shipment Status</Text>
                  <Text style={tStyles.statusBannerValue}>{srData.shipmentStatus}</Text>
                </View>
              </View>
              <View style={tStyles.awbPill}><Text style={tStyles.awbPillText}>AWB: {srData.awb}</Text></View>
            </View>
            <View style={tStyles.metaCard}>
              <Text style={tStyles.metaCardTitle}>Shipment Details</Text>
              <MetaRow label="Shiprocket Order ID" value={srData.shiprocketOrderId} copyable />
              <View style={tStyles.metaDivider} />
              <MetaRow label="Shipment ID" value={srData.shipmentId} copyable />
              <View style={tStyles.metaDivider} />
              <MetaRow label="AWB / Tracking No." value={srData.awb} copyable />
              <View style={tStyles.metaDivider} />
              <MetaRow label="Courier Partner" value={srData.courier} />
              <View style={tStyles.metaDivider} />
              <MetaRow label="Last Synced" value={srData.lastSynced} />
              <View style={tStyles.metaDivider} />
              <MetaRow label="Tracking URL" value={srData.trackingUrl} isUrl />
            </View>
            <View style={tStyles.timelineCard}>
              <Text style={tStyles.timelineCardTitle}>Tracking Timeline</Text>
              <View style={tStyles.timeline}>
                {srData.events.map((ev,idx) => {
                  const isLast=idx===srData.events.length-1;
                  const isDone=ev.type==="done"; const isActive=ev.type==="active";
                  const dotBg=isActive?C.orange:isDone?C.navy:C.border;
                  const lineColor=isDone?C.navy:C.border;
                  return (
                    <View key={idx} style={tStyles.timelineRow}>
                      <View style={tStyles.timelineLeft}>
                        <View style={[tStyles.timelineDot,{backgroundColor:dotBg,borderColor:dotBg},isActive&&tStyles.timelineDotActive]}>
                          {isDone  &&<Ionicons name="checkmark" size={10} color={C.white}/>}
                          {isActive&&<View style={tStyles.timelineDotInner}/>}
                        </View>
                        {!isLast&&<View style={[tStyles.timelineLine,{backgroundColor:lineColor}]}/>}
                      </View>
                      <View style={[tStyles.timelineContent,isLast&&{paddingBottom:0}]}>
                        <View style={tStyles.timelineTopRow}>
                          <Text style={[tStyles.timelineStatus,isActive&&{color:C.orange},isDone&&{color:C.textDark},!isDone&&!isActive&&{color:C.textLight}]}>{ev.status}</Text>
                          <Text style={tStyles.timelineDatetime}>{ev.date}  ·  {ev.time}</Text>
                        </View>
                        <View style={tStyles.locationChip}><Ionicons name="location-outline" size={11} color={C.textLight}/><Text style={tStyles.locationText}>{ev.location}</Text></View>
                        <Text style={tStyles.timelineDesc}>{ev.description}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <ScreenRoot style={[styles.safeArea, Platform.OS === "web" && styles.safeAreaWeb]}>
      {Platform.OS !== "web" && <StatusBar barStyle="light-content" backgroundColor={C.navy} />}
      <View style={[styles.blueSection, isWebMobile && styles.blueSectionWeb]}>
        <View style={[styles.header, Platform.OS === "web" && styles.headerWeb, isWebMobile && styles.headerWebMobile]}>
          <TouchableOpacity style={styles.backBtn} onPress={()=>router.push("/(main)/Ordersscreen")} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Ionicons name="arrow-back" size={isWebMobile ? 20 : 22} color={C.white}/>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isWebMobile && styles.headerTitleWeb]}>Order Details</Text>
        </View>
        <View style={[styles.floatingTrackerCard, isWebMobile && styles.floatingTrackerCardWeb]}>
          <View style={styles.trackerTopRow}>
            <View style={[styles.trackerIdWrap, isWebMobile && styles.trackerIdWrapWeb]}>
              <Text style={styles.trackerOrderId} numberOfLines={1} ellipsizeMode="middle">{order.id}</Text>
              <TouchableOpacity onPress={()=>{Clipboard.setString(order.id);Alert.alert("Copied",`${order.id} copied to clipboard.`);}} hitSlop={{top:6,bottom:6,left:6,right:6}}>
                <Ionicons name="copy-outline" size={14} color={C.textLight}/>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.viewMoreBtn, isWebMobile && styles.viewMoreBtnWeb]} onPress={()=>setTrackingVisible(true)} activeOpacity={0.8}>
              <MaterialCommunityIcons name="truck-fast-outline" size={13} color={C.purple} style={{marginRight:4}}/>
              <Text style={styles.viewMoreText}>{isWebMobile ? "Track" : "View More"}</Text>
              <Ionicons name="chevron-forward" size={12} color={C.purple} style={{marginLeft:2}}/>
            </TouchableOpacity>
          </View>
          <View style={[styles.stepperContainer, isWebMobile && styles.stepperContainerWeb]}>
            {order.steps.map((step,idx) => {
              const isActive=step.status==="active"; const isDone=step.status==="done"; const isLast=idx===order.steps.length-1;
              const iconBg=isActive?C.orange:isDone?C.navy:C.white;
              const iconColor=isActive||isDone?C.white:C.textLight;
              const iconBorder=isActive?C.orange:isDone?C.navy:C.border;
              const labelColor=isActive?C.orange:isDone?C.textMid:C.textLight;
              const labelWeight:"700"|"600"|"400"=isActive?"700":isDone?"600":"400";
              const iconSize = isWebMobile ? 11 : 13;
              return (
                <React.Fragment key={step.key}>
                  <View style={[styles.stepItem, isWebMobile && styles.stepItemWeb]}>
                    <View style={[styles.stepCircle,{backgroundColor:iconBg,borderColor:iconBorder}, isWebMobile && styles.stepCircleWeb]}>
                      {step.iconLib==="Ionicons"?<Ionicons name={step.iconName} size={iconSize} color={iconColor}/>:<MaterialCommunityIcons name={step.iconName} size={iconSize} color={iconColor}/>}
                    </View>
                    <Text numberOfLines={isWebMobile ? 2 : 1} style={[styles.stepLabel,{color:labelColor,fontWeight:labelWeight}, isWebMobile && styles.stepLabelWeb]}>{step.label}</Text>
                  </View>
                  {!isLast&&<View style={[styles.stepConnectorWrap, isWebMobile && styles.stepConnectorWrapWeb]}><View style={[styles.stepConnectorLine,isDone&&{backgroundColor:C.navy}]}/></View>}
                </React.Fragment>
              );
            })}
          </View>
          {order.extraNote&&(
            <View style={styles.extraNoteRow}>
              <Ionicons name="information-circle-outline" size={13} color={C.textLight} style={{marginRight:5}}/>
              <Text style={styles.extraNoteText}>{order.extraNote}</Text>
            </View>
          )}
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={isWebMobile}
        contentContainerStyle={[styles.scrollContent, Platform.OS === "web" && styles.scrollContentWeb, isWebMobile && styles.scrollContentWebMobile]}
      >
        {/* Order Summary */}
        <View style={[styles.card, isWebMobile && styles.cardWeb]}>
          <View style={[styles.orderSummaryGrid, isWebMobile && styles.orderSummaryGridWeb]}>
            <View style={[styles.orderSummaryLeft, isWebMobile && styles.orderSummaryBlockWeb]}>
              <Text style={styles.labelSmall}>Order ID</Text>
              <View style={styles.orderIdRow}>
                <Text style={[styles.orderId, isWebMobile && styles.orderIdWeb]} numberOfLines={1} ellipsizeMode="middle">{order.id}</Text>
              </View>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="calendar-outline" size={14} color={C.textLight} style={{marginRight:5}}/>
                <Text style={[styles.metaText, isWebMobile && styles.metaTextWeb]} numberOfLines={2}>{order.date}</Text>
              </View>
            </View>
            <View style={[styles.orderSummaryRight, isWebMobile && styles.orderSummaryBlockWeb]}>
              <Text style={styles.labelSmall}>Payment Method</Text>
              <View style={styles.paymentMethodRow}>
                <Text style={[styles.paymentMethodText, isWebMobile && styles.paymentMethodTextWeb]} numberOfLines={2}>{order.payment.method}</Text>
                <View style={[styles.payStatusPill,{backgroundColor:paymentStatusCfg.bg}]}>
                  <Text style={[styles.payStatusPillText,{color:paymentStatusCfg.color}]}>{order.payment.status}</Text>
                </View>
              </View>
              <Text style={[styles.labelSmall,{marginTop: isWebMobile ? 12 : 16}]}>Order Amount</Text>
              <TouchableOpacity style={styles.amountRow} onPress={()=>setAmountExpanded(!amountExpanded)}>
                <Text style={[styles.amountText, isWebMobile && styles.amountTextWeb]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{order.pricing.total}</Text>
                <Ionicons name={amountExpanded?"chevron-up":"chevron-down"} size={18} color={C.navy} style={{marginLeft:4}}/>
              </TouchableOpacity>
              {amountExpanded&&(
                <View style={styles.amountBreakdown}>
                  <View style={styles.amountBreakdownRow}><Text style={styles.amountBreakdownLabel}>Subtotal</Text><Text style={styles.amountBreakdownValue}>{order.pricing.subtotal}</Text></View>
                  <View style={styles.amountBreakdownRow}><Text style={styles.amountBreakdownLabel}>Shipping</Text><Text style={styles.amountBreakdownValue}>{order.pricing.shipping}</Text></View>
                  {order.pricing.tax&&<View style={styles.amountBreakdownRow}><Text style={styles.amountBreakdownLabel}>Tax</Text><Text style={styles.amountBreakdownValue}>{order.pricing.tax}</Text></View>}
                  {order.pricing.discount&&<View style={styles.amountBreakdownRow}><Text style={styles.amountBreakdownLabel}>Discount</Text><Text style={[styles.amountBreakdownValue,{color:C.green}]}>-{order.pricing.discount}</Text></View>}
                  {order.pricing.referralDiscount&&<View style={styles.amountBreakdownRow}><Text style={styles.amountBreakdownLabel}>Referral Discount</Text><Text style={[styles.amountBreakdownValue,{color:C.green}]}>-{order.pricing.referralDiscount}</Text></View>}
                  {order.pricing.walletDeduction&&<View style={styles.amountBreakdownRow}><Text style={styles.amountBreakdownLabel}>Wallet</Text><Text style={[styles.amountBreakdownValue,{color:C.green}]}>-{order.pricing.walletDeduction}</Text></View>}
                </View>
              )}
            </View>
          </View>
        </View>
        {/* Customer & Addresses */}
        <View style={[styles.card, isWebMobile && styles.cardWeb]}>
          <SectionHeader iconLib="Ionicons" iconName="person-circle-outline" title="Customer & Addresses"/>
          <View style={styles.customerNameRow}>
            <View style={styles.avatarRing}><Text style={styles.initialsText}>{order.customer.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</Text></View>
            <View style={{ flex:1, minWidth: 0 }}>
              <Text style={styles.customerName} numberOfLines={2}>{order.customer.name}</Text>
              {!!order.customer.phone && <Text style={styles.itemSku} numberOfLines={1}>{order.customer.phone}</Text>}
              {!!order.customer.email && <Text style={[styles.itemSku, isWebMobile && styles.emailWeb]} numberOfLines={2}>{order.customer.email}</Text>}
            </View>
          </View>
          <View style={styles.addressStack}>
            <View style={styles.addressBlockFull}>
              <View style={styles.addressBlockHeader}>
                <View style={[styles.addressIconCircle,{backgroundColor:C.bluePale}]}><Ionicons name="location-outline" size={14} color={C.blue}/></View>
                <Text style={[styles.addressBlockTitle,{color:C.blue}]}>Shipping Address</Text>
              </View>
              <Text style={styles.addressText}>{shippingAddress}</Text>
            </View>
            <View style={styles.addressRowDivider}/>
            <View style={styles.addressBlockFull}>
              <View style={styles.addressBlockHeader}>
                <View style={[styles.addressIconCircle,{backgroundColor:C.purplePale}]}><MaterialCommunityIcons name="office-building-outline" size={14} color={C.purple}/></View>
                <Text style={[styles.addressBlockTitle,{color:C.purple}]}>Billing Address</Text>
              </View>
              <Text style={styles.addressText}>{billingAddress}</Text>
            </View>
          </View>
        </View>
        {/* Order Items */}
        <View style={[styles.card, isWebMobile && styles.cardWeb]}>
          <SectionHeader iconLib="Ionicons" iconName="bag-outline" title={`Order Items (${order.items.length})`}/>
          {order.items.map((item,idx) => (
            <View key={idx}>
              <View style={[styles.itemRow, isWebMobile && styles.itemRowWeb, idx>0&&{marginTop:12,paddingTop:12,borderTopWidth:1,borderTopColor:C.border}]}>
                <TouchableOpacity onPress={() => openProductDetail(item)} activeOpacity={0.85}>
                  <Image source={{uri:item.image}} style={[styles.itemImage, isWebMobile && styles.itemImageWeb]}/>
                </TouchableOpacity>
                <View style={styles.itemInfo}>
                  <View style={styles.itemTopRow}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={[styles.itemPrice, isWebMobile && styles.itemPriceWeb]} numberOfLines={1}>{item.price}</Text>
                  </View>
                  <Text style={styles.itemVariant}>{item.variant}</Text>
                  <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                  {!!item.hsnCode && <Text style={styles.itemSku}>HSN: {item.hsnCode}</Text>}
                  {item.customDetails?.map((detail) => (
                    <Text key={detail.id} style={styles.itemSku}>{detail.fieldLabel}: {detail.valueText || detail.valueFile || "—"}</Text>
                  ))}
                  <View style={styles.qtyBadge}><Text style={styles.qtyBadgeText}>Qty: {item.qty}</Text></View>
                </View>
              </View>
            </View>
          ))}
          <View style={styles.pricingBlock}>
            <View style={styles.pricingRow}><Text style={styles.pricingLabel}>Subtotal</Text><Text style={styles.pricingValue}>{order.pricing.subtotal}</Text></View>
            <View style={styles.pricingRow}><Text style={styles.pricingLabel}>Shipping Charge</Text><Text style={styles.pricingValue}>{order.pricing.shipping}</Text></View>
            {order.pricing.tax&&<View style={styles.pricingRow}><Text style={styles.pricingLabel}>Tax</Text><Text style={styles.pricingValue}>{order.pricing.tax}</Text></View>}
            {order.pricing.discount&&<View style={styles.pricingRow}><Text style={styles.pricingLabel}>Discount</Text><Text style={[styles.pricingValue,{color:C.green}]}>-{order.pricing.discount}</Text></View>}
            {order.pricing.referralDiscount&&<View style={styles.pricingRow}><Text style={styles.pricingLabel}>Referral Discount</Text><Text style={[styles.pricingValue,{color:C.green}]}>-{order.pricing.referralDiscount}</Text></View>}
            {order.pricing.walletDeduction&&<View style={styles.pricingRow}><Text style={styles.pricingLabel}>Wallet Deduction</Text><Text style={[styles.pricingValue,{color:C.green}]}>-{order.pricing.walletDeduction}</Text></View>}
            <View style={styles.pricingDashedDivider}/>
            <View style={styles.pricingRow}><Text style={styles.pricingTotalLabel}>Total Amount</Text><Text style={styles.pricingTotalValue}>{order.pricing.total}</Text></View>
          </View>
        </View>
        {/* Payment Information */}
        <View style={[styles.card, isWebMobile && styles.cardWeb]}>
          <SectionHeader iconLib="MCIcons" iconName="credit-card-outline" title="Payment Information"/>
          <View style={[styles.paymentGrid, isWebMobile && styles.paymentGridWeb]}>
            <View style={[styles.paymentCol, isWebMobile && styles.paymentColWeb]}>
              <Text style={styles.payFieldLabel}>Payment Method</Text>
              <Text style={styles.payFieldValue} numberOfLines={2}>{order.payment.method}</Text>
              <Text style={[styles.payFieldLabel,{marginTop:14}]}>Transaction ID</Text>
              <Text style={styles.payFieldValue} numberOfLines={1} ellipsizeMode="middle">{order.payment.transactionId}</Text>
              <Text style={[styles.payFieldLabel,{marginTop:14}]}>Paid On</Text>
              <Text style={styles.payFieldValue} numberOfLines={2}>{order.payment.paidOn}</Text>
            </View>
            <View style={[styles.paymentCol, isWebMobile && styles.paymentColWeb]}>
              <View style={styles.payStatusRow}>
                <Text style={styles.payFieldLabel}>Payment Status</Text>
                <View style={[styles.payStatusPill,{backgroundColor:paymentStatusCfg.bg,marginLeft:8}]}>
                  <Text style={[styles.payStatusPillText,{color:paymentStatusCfg.color}]}>{order.payment.status}</Text>
                </View>
              </View>
              <Text style={[styles.payFieldLabel,{marginTop:14}]}>Bank / UPI ID</Text>
              <Text style={styles.payFieldValue} numberOfLines={2}>{order.payment.bankOrUpiId}</Text>
              <Text style={[styles.payFieldLabel,{marginTop:14}]}>Payment Ref No.</Text>
              <Text style={styles.payFieldValue} numberOfLines={1} ellipsizeMode="middle">{order.payment.refNo}</Text>
            </View>
          </View>
        </View>
        {/* Order Notes */}
        <View style={[styles.card, isWebMobile && styles.cardWeb]}>
          <SectionHeader iconLib="MCIcons" iconName="text-box-outline" title="Order Notes"/>
          {order.customerNote?(<><Text style={styles.notesLabel}>Customer Note</Text><Text style={styles.notesValue}>{order.customerNote}</Text></>):(<Text style={styles.notesEmpty}>No customer note provided.</Text>)}
          {order.sellerNote&&(<><Text style={[styles.notesLabel,{marginTop:10}]}>Seller Note</Text><Text style={styles.notesValue}>{order.sellerNote}</Text></>)}
          {order.cancelReason&&(<><Text style={[styles.notesLabel,{marginTop:10}]}>Cancellation Reason</Text><Text style={styles.notesValue}>{order.cancelReason}</Text></>)}
        </View>
        {hasReviewData(order) && <WebReviewCard order={order} />}
        {(order.gstNumber || order.gstInfo || order.gstRecords?.length) && <WebGstCard order={order} />}
        {!!order.statusHistory?.length && <WebStatusHistoryCard order={order} />}
        {!!order.emailLogs?.length && <WebEmailLogsCard order={order} />}
        {/* Documents */}
        <View style={[styles.docsCard, isWebMobile && styles.cardWeb]}>
          <SectionHeader iconLib="MCIcons" iconName="file-document-multiple-outline" title="Documents"/>
          <TouchableOpacity style={styles.docBtnFull} onPress={()=>setLabelVisible(true)} activeOpacity={0.85}>
            <View style={[styles.docBtnIcon,{backgroundColor:C.purplePale}]}><MaterialCommunityIcons name="tag-outline" size={24} color={C.purple}/></View>
            <View style={{flex:1}}><Text style={styles.docBtnTitle}>Shipping Label</Text><Text style={styles.docBtnSub}>Preview & print</Text></View>
            <View style={styles.docBtnAction}><Ionicons name="eye-outline" size={13} color={C.navy} style={{marginRight:4}}/><Text style={styles.docBtnActionText}>Preview</Text></View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <MobileTrackingModal />
      <ShippingLabelModal visible={labelVisible} order={order} onClose={()=>setLabelVisible(false)} onPrint={onPrintLabel} />
    </ScreenRoot>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ROOT EXPORT ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function OrderDetailsScreen() {
  const { orderId, openLabel } = useLocalSearchParams<{ orderId: string; openLabel?: string }>();
  const { width } = useWindowDimensions();

  // Web layout only when running on web platform AND screen is wide enough
  const isWebWide = Platform.OS === "web" && width >= BP_TABLET;

  const [order, setOrder] = useState<OrderDetail | undefined>(() =>
    orderId ? getLiveOrder(orderId) : undefined,
  );
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [labelModalVisible,    setLabelModalVisible]    = useState(false);

  useEffect(() => {
    if (!orderId) return;

    // Optimistic paint from in-memory store (may be stale until focus refresh).
    const existing = getLiveOrder(orderId);
    if (existing) setOrder(existing);

    const unsub = subscribeToOrderChanges(() => {
      if (!orderId) return;
      const live = getLiveOrder(orderId);
      if (live) setOrder(live);
    });
    return unsub;
  }, [orderId]);

  // Always refetch when opening / refocusing so buyer address updates appear.
  useFocusEffect(
    useCallback(() => {
      if (!orderId) return;
      let active = true;
      (async () => {
        try {
          const detail = await fetchSellerOrderDetail(orderId);
          if (!active) return;
          upsertLiveOrder(detail);
          setOrder(detail);
        } catch {
          if (!active) return;
          if (!getLiveOrder(orderId)) {
            try {
              await loadOrdersFromApi();
              const loaded = getLiveOrder(orderId);
              if (loaded) setOrder(loaded);
            } catch {
              // keep undefined → not-found UI
            }
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [orderId])
  );

  useEffect(() => {
    if (openLabel === "1" || openLabel === "true") setLabelModalVisible(true);
  }, [openLabel]);

  const handlePrintLabel = async () => {
    if (!order) return;
    if (Platform.OS === "web") {
      try {
        const label = await buildLabelForOrder(order);
        openShippingLabelPrint(label);
      } catch {
        Alert.alert("Print failed", "Could not generate the shipping label. Please try again.");
      }
    } else {
      Alert.alert("Label Downloaded", `Shipping label for ${orderId} has been saved.`);
    }
  };

  // Not found fallback (same for both platforms)
  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={styles.blueSection}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={()=>router.push("/(main)/Ordersscreen")} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons name="arrow-back" size={22} color={C.white}/>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
            <View style={{width:60}}/>
          </View>
        </View>
        <View style={{flex:1,alignItems:"center",justifyContent:"center"}}>
          <Ionicons name="alert-circle-outline" size={48} color={C.textLight}/>
          <Text style={{marginTop:12,fontSize:16,color:C.textMid,fontWeight:"600"}}>Order not found</Text>
          <Text style={{marginTop:4,fontSize:13,color:C.textLight}}>ID: {orderId}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isWebWide) {
    return (
      <>
        <WebLayout order={order} onOpenLabel={()=>setLabelModalVisible(true)} />
        <ShippingLabelModal visible={labelModalVisible} order={order} onClose={()=>setLabelModalVisible(false)} onPrint={handlePrintLabel} />
      </>
    );
  }

  return (
    <MobileLayout
      order={order}
      trackingVisible={trackingModalVisible}
      labelVisible={labelModalVisible}
      setTrackingVisible={setTrackingModalVisible}
      setLabelVisible={setLabelModalVisible}
      onPrintLabel={handlePrintLabel}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── STYLES ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Shared section header atoms
const sh = StyleSheet.create({
  sectionHeader:     { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:14 },
  sectionHeaderLeft: { flexDirection:"row", alignItems:"center", gap:8 },
  sectionIconWrap:   { width:32, height:32, borderRadius:8, backgroundColor:C.bluePale, alignItems:"center", justifyContent:"center" },
  sectionTitle:      { fontSize:13, fontWeight:"700", color:C.textDark },
});

// Web card & component styles
const wc = StyleSheet.create({
  card:       { backgroundColor:C.white, borderRadius:16, padding:18, shadowColor:"#000", shadowOpacity:0.05, shadowOffset:{width:0,height:2}, shadowRadius:8, elevation:2 },
  label:      { fontSize:11, color:C.textLight, fontWeight:"500", marginBottom:4 },
  val:        { fontSize:13, fontWeight:"600", color:C.textDark, marginBottom:0 },
  boldVal:    { fontSize:14, fontWeight:"800", color:C.textDark },
  pill:       { paddingHorizontal:9, paddingVertical:3, borderRadius:12 },
  pillText:   { fontSize:10, fontWeight:"700" },
  breakRow:   { flexDirection:"row", justifyContent:"space-between" },
  breakLabel: { fontSize:11, color:C.textLight },
  breakVal:   { fontSize:11, color:C.textMid, fontWeight:"600" },
  avatar:     { width:36, height:36, borderRadius:18, backgroundColor:"#EEF0FA", borderWidth:1.5, borderColor:C.navy, alignItems:"center", justifyContent:"center" },
  avatarText: { fontSize:12, fontWeight:"700", color:C.navy },
  prow:       { flexDirection:"row", justifyContent:"space-between" },
  plabel:     { fontSize:13, color:C.textMid },
  pval:       { fontSize:13, color:C.textMid },
  notesLabel: { fontSize:12, color:C.textLight, fontWeight:"500", marginBottom:4 },
  notesVal:   { fontSize:13, color:C.textMid, lineHeight:20 },
  syncBtn:    { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:10, paddingVertical:6, borderRadius:10, borderWidth:1, borderColor:C.border, backgroundColor:C.white },
});

// Web layout (nav, title bar, content area)
const wl = StyleSheet.create({
  topNav:       { backgroundColor:C.navy, shadowColor:"#000", shadowOpacity:0.15, shadowOffset:{width:0,height:2}, shadowRadius:8, elevation:6, 
  borderBottomLeftRadius: 22,      
  borderBottomRightRadius: 22, 
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
  marginHorizontal: 6,
  marginTop: 12,
  paddingBottom: 36,    //  (creates overlap space)
 },
  topNavInner:  { flexDirection:"row", alignItems:"center", paddingHorizontal:24, paddingVertical:14 },
  backBtn:      { flexDirection:"row", alignItems:"center", gap:6, backgroundColor:"rgba(255,255,255,0.12)", paddingHorizontal:12, paddingVertical:7, borderRadius:20 },
  backBtnText:  { color:C.white, fontSize:13, fontWeight:"600" },
  navOrderId:   { color:C.white, fontSize:14, fontWeight:"700" },
  titleBar:     { backgroundColor:C.white, borderBottomWidth:1, borderBottomColor:C.border, paddingHorizontal:24, paddingVertical:16, 
    borderRadius: 18,                // ← ADD
  marginHorizontal: 20,            // ← ADD
  marginTop: -32,                  // ← ADD (pulls card up over navy bar)
  shadowColor: "#000",             // ← ADD
  shadowOpacity: 0.10,             // ← ADD
  shadowOffset: { width: 0, height: 4 },  // ← ADD
  shadowRadius: 16,                // ← ADD
  elevation: 10,   
   zIndex: 10,
  },
titleBarInner:{ flexDirection:"column", alignItems:"flex-start", gap:14, alignSelf:"center", width:"100%" },  pageTitle:    { fontSize:22, fontWeight:"800", color:C.textDark },
  pageSubtitle: { fontSize:13, color:C.textLight, marginTop:2 },
  stepperRow:   { flexDirection:"row", alignItems:"flex-start", gap:0, width:"100%", flex: 1,  },
  stepCircle:   { width:34, height:34, borderRadius:17, borderWidth:1.5, alignItems:"center", justifyContent:"center", marginBottom:4,},
  content:      { paddingVertical:24, paddingHorizontal: Platform.OS === "web" ? 0 : 20, gap:0, paddingBottom:40 },
  contentMobile: { paddingVertical: 16, paddingHorizontal: Platform.OS === "web" ? 0 : 12, paddingBottom: 24 },
});

// ── Mobile styles (100% identical to original v6) ─────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex:1, backgroundColor:C.bg },
  safeAreaWeb: { width: "100%", minWidth: 0 },
  blueSection: { backgroundColor:C.navy, paddingBottom:14, borderBottomLeftRadius:16, borderBottomRightRadius:16 },
  blueSectionWeb: { paddingBottom: 10, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  header: { flexDirection:"row", alignItems:"center", paddingHorizontal:18, paddingVertical:14, marginTop:28 },
  headerWeb: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 10 },
  headerWebMobile: { marginTop: 0, paddingHorizontal: 0, paddingVertical: 8 },
  backBtn: { marginRight:12, padding:2 },
  headerTitle: { flex:1, color:C.white, fontSize:23, fontWeight:"800" },
  headerTitleWeb: { fontSize: 18, fontWeight: "700" },
  headerActions: { flexDirection:"row", gap:8 },
  headerIconBtn: { padding:6 },
  floatingTrackerCard: { marginHorizontal:14, backgroundColor:C.white, borderRadius:16, paddingHorizontal:14, paddingVertical:10, elevation:8, shadowColor:"#000", shadowOpacity:0.12, shadowOffset:{width:0,height:4}, shadowRadius:14, marginBottom:-28, zIndex:100 },
  floatingTrackerCardWeb: { marginHorizontal: 0, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12, marginBottom: -24 },
  trackerTopRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:10, gap: 8 },
  trackerIdWrap: { flexDirection:"row", alignItems:"center", gap:6, flex: 1, minWidth: 0 },
  trackerIdWrapWeb: { marginRight: 4 },
  trackerOrderId: { fontSize:13, fontWeight:"800", color:C.textDark, flexShrink: 1 },
  viewMoreBtn: { flexDirection:"row", alignItems:"center", backgroundColor:C.purplePale, paddingHorizontal:10, paddingVertical:5, borderRadius:20, flexShrink: 0 },
  viewMoreBtnWeb: { paddingHorizontal: 8, paddingVertical: 5 },
  viewMoreText: { fontSize:11, fontWeight:"700", color:C.purple },
  stepperContainer: { flexDirection:"row", alignItems:"flex-start", justifyContent:"space-between" },
  stepperContainerWeb: { width: "100%" },
  stepItem: { alignItems:"center", width:44 },
  stepItemWeb: { flex: 1, minWidth: 0, width: undefined, paddingHorizontal: 1 },
  stepCircle: { width:28, height:28, borderRadius:14, borderWidth:1.5, alignItems:"center", justifyContent:"center", marginBottom:4 },
  stepCircleWeb: { width: 24, height: 24, borderRadius: 12, marginBottom: 3 },
  stepLabel: { fontSize:9, textAlign:"center", lineHeight:11 },
  stepLabelWeb: { fontSize: 8, lineHeight: 10, width: "100%" },
  stepConnectorWrap: { flex:1, alignItems:"center", marginTop:13, paddingHorizontal:2 },
  stepConnectorWrapWeb: { flex: 0.6, marginTop: 11, paddingHorizontal: 1, minWidth: 4 },
  stepConnectorLine: { height:2, width:"100%", borderRadius:2, backgroundColor:C.border },
  extraNoteRow: { flexDirection:"row", alignItems:"center", marginTop:12, backgroundColor:C.bg, borderRadius:8, padding:8 },
  extraNoteText: { fontSize:11, color:C.textMid, flex:1 },
  scrollView: { flex:1, backgroundColor:C.bg },
  scrollContent: { padding:14, paddingTop:42, gap:12, paddingBottom:32 },
  scrollContentWeb: { paddingHorizontal: 0, paddingTop: 36, paddingBottom: 24 },
  scrollContentWebMobile: { paddingTop: 32, gap: 10, paddingBottom: 32 },
  card: { backgroundColor:C.white, borderRadius:16, padding:16, shadowColor:"#000", shadowOpacity:0.05, shadowOffset:{width:0,height:2}, shadowRadius:8, elevation:2 },
  cardWeb: { borderRadius: 12, padding: 12 },
  orderSummaryGrid: { flexDirection:"row", gap:12 },
  orderSummaryGridWeb: { flexDirection: "column", gap: 14 },
  orderSummaryLeft: { flex:1 },
  orderSummaryRight: { flex:1, alignItems:"flex-start" },
  orderSummaryBlockWeb: { width: "100%", flex: undefined },
  labelSmall: { fontSize:11, color:C.textLight, fontWeight:"500", marginBottom:4, letterSpacing:0.2 },
  orderIdRow: { flexDirection:"row", alignItems:"center", marginBottom:8 },
  orderId: { fontSize:14, fontWeight:"800", color:C.textDark, letterSpacing:0.2, flex: 1 },
  orderIdWeb: { fontSize: 13 },
  metaRow: { flexDirection:"row", alignItems:"flex-start", marginBottom:6 },
  metaText: { fontSize:10, color:C.textMid, flex: 1 },
  metaTextWeb: { fontSize: 11, lineHeight: 15 },
  paymentMethodRow: { flexDirection:"row", alignItems:"center", flexWrap:"wrap", gap:6 },
  paymentMethodText: { fontSize:11, fontWeight:"700", color:C.textDark, flexShrink: 1 },
  paymentMethodTextWeb: { fontSize: 12, lineHeight: 16 },
  payStatusPill: { paddingHorizontal:8, paddingVertical:2, borderRadius:12, flexShrink: 0 },
  payStatusPillText: { fontSize:9, fontWeight:"700" },
  amountRow: { flexDirection:"row", alignItems:"center", minWidth: 0 },
  amountText: { fontSize:16, fontWeight:"800", color:C.navy, flexShrink: 1 },
  amountTextWeb: { fontSize: 15 },
  amountBreakdown: { marginTop:6, gap:2 },
  amountBreakdownRow: { flexDirection:"row", justifyContent:"space-between", gap:16 },
  amountBreakdownLabel: { fontSize:11, color:C.textLight },
  amountBreakdownValue: { fontSize:11, color:C.textMid, fontWeight:"600" },
  sectionHeader: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:14 },
  sectionHeaderLeft: { flexDirection:"row", alignItems:"center", gap:8 },
  sectionIconWrap: { width:32, height:32, borderRadius:8, backgroundColor:C.bluePale, alignItems:"center", justifyContent:"center" },
  sectionTitle: { fontSize:12, fontWeight:"700", color:C.textDark },
  customerNameRow: { flexDirection:"row", alignItems:"center", gap:10, marginBottom:16 },
  avatarRing: { width:32, height:32, borderRadius:16, backgroundColor:"#EEF0FA", borderWidth:1.5, borderColor:C.navy, alignItems:"center", justifyContent:"center" },
  initialsText: { fontSize:11, fontWeight:"700", color:C.navy },
  customerName: { fontSize:15, fontWeight:"700", color:C.textDark },
  emailWeb: { fontSize: 11, lineHeight: 15 },
  addressStack: { flexDirection:"column", gap:0 },
  addressBlockFull: { paddingVertical:4 },
  addressBlockHeader: { flexDirection:"row", alignItems:"center", gap:6, marginBottom:6 },
  addressIconCircle: { width:24, height:24, borderRadius:12, alignItems:"center", justifyContent:"center" },
  addressBlockTitle: { fontSize:11, fontWeight:"700", letterSpacing:0.5 },
  addressRowDivider: { height:1, backgroundColor:C.border, marginVertical:10 },
  addressText: { fontSize:12, color:C.textMid, lineHeight:20 },
  itemRow: { flexDirection:"row", gap:12, marginBottom:16 },
  itemRowWeb: { gap: 10 },
  itemImage: { width:88, height:88, borderRadius:12, backgroundColor:C.border },
  itemImageWeb: { width: 72, height: 72, borderRadius: 10 },
  itemInfo: { flex:1, minWidth: 0 },
  itemTopRow: { flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4, gap: 8 },
  itemName: { fontSize:15, fontWeight:"700", color:C.textDark, flex:1, minWidth: 0 },
  itemPrice: { fontSize:15, fontWeight:"800", color:C.textDark, marginLeft:8, flexShrink: 0 },
  itemPriceWeb: { fontSize: 14, marginLeft: 4 },
  itemVariant: { fontSize:12, color:C.textLight, marginBottom:3 },
  itemSku: { fontSize:12, color:C.textLight, marginBottom:8 },
  qtyBadge: { alignSelf:"flex-start", backgroundColor:C.bluePale, paddingHorizontal:10, paddingVertical:3, borderRadius:12 },
  qtyBadgeText: { fontSize:12, fontWeight:"700", color:C.blue },
  pricingBlock: { borderTopWidth:1, borderTopColor:C.border, paddingTop:12, gap:8 },
  pricingRow: { flexDirection:"row", justifyContent:"space-between" },
  pricingLabel: { fontSize:13, color:C.textMid },
  pricingValue: { fontSize:13, color:C.textMid },
  pricingDashedDivider: { borderTopWidth:1, borderStyle:"dashed", borderColor:C.border, marginVertical:4 },
  pricingTotalLabel: { fontSize:14, fontWeight:"700", color:C.textDark },
  pricingTotalValue: { fontSize:16, fontWeight:"800", color:C.navy },
  paymentGrid: { flexDirection:"row", gap:16 },
  paymentGridWeb: { flexDirection: "column", gap: 14 },
  paymentCol: { flex:1 },
  paymentColWeb: { width: "100%", flex: undefined },
  payFieldLabel: { fontSize:11, color:C.textLight, fontWeight:"500", marginBottom:2 },
  payFieldValue: { fontSize:13, fontWeight:"600", color:C.textDark },
  payStatusRow: { flexDirection:"row", alignItems:"center" },
  notesLabel: { fontSize:12, color:C.textLight, fontWeight:"500", marginBottom:4 },
  notesValue: { fontSize:13, color:C.textMid, lineHeight:20 },
  notesEmpty: { fontSize:13, color:C.textLight },
  docsCard: { backgroundColor:C.white, borderRadius:16, padding:16, shadowColor:"#000", shadowOpacity:0.05, shadowOffset:{width:0,height:2}, shadowRadius:8, elevation:2 },
  docBtnFull: { flexDirection:"row", alignItems:"center", gap:14, paddingVertical:8 },
  docBtnIcon: { width:48, height:48, borderRadius:14, alignItems:"center", justifyContent:"center" },
  docBtnTitle: { fontSize:13, fontWeight:"700", color:C.textDark },
  docBtnSub: { fontSize:10, color:C.textLight, marginTop:2 },
  docBtnAction: { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:5, borderRadius:10, borderWidth:1, borderColor:C.border },
  docBtnActionText: { fontSize:11, fontWeight:"600", color:C.navy },
});

// Tracking modal styles (identical to original)
const tStyles = StyleSheet.create({
  safeArea: { flex:1, backgroundColor:C.bg },
  header: { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingVertical:14, backgroundColor:C.white, borderBottomWidth:1, borderBottomColor:C.border, gap:10 },
  headerLeft: { flex:1, flexDirection:"row", alignItems:"center", gap:10 },
  headerIcon: { width:36, height:36, borderRadius:10, backgroundColor:C.purplePale, alignItems:"center", justifyContent:"center" },
  headerTitle: { fontSize:15, fontWeight:"700", color:C.textDark },
  headerSub: { fontSize:11, color:C.textLight, marginTop:1 },
  headerRight: { flexDirection:"row", alignItems:"center", gap:8 },
  syncBtn: { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:10, paddingVertical:6, borderRadius:10, borderWidth:1.5, borderColor:C.border, backgroundColor:C.white },
  syncBtnText: { fontSize:11, fontWeight:"700", color:C.navy },
  closeBtn: { padding:4 },
  scroll: { flex:1 },
  scrollContent: { padding:14, gap:12, paddingBottom:100 },
  statusBanner: { backgroundColor:C.white, borderRadius:14, padding:14, flexDirection:"row", alignItems:"center", justifyContent:"space-between", shadowColor:"#000", shadowOpacity:0.05, shadowOffset:{width:0,height:2}, shadowRadius:6, elevation:2 },
  statusBannerLeft: { flexDirection:"row", alignItems:"center" },
  statusBannerLabel: { fontSize:10, color:C.textLight, fontWeight:"600", letterSpacing:0.5 },
  statusBannerValue: { fontSize:15, fontWeight:"800", color:C.navy, marginTop:2 },
  awbPill: { backgroundColor:C.purplePale, paddingHorizontal:10, paddingVertical:4, borderRadius:12 },
  awbPillText: { fontSize:10, fontWeight:"700", color:C.purple },
  metaCard: { backgroundColor:C.white, borderRadius:14, padding:16, shadowColor:"#000", shadowOpacity:0.05, shadowOffset:{width:0,height:2}, shadowRadius:6, elevation:2 },
  metaCardTitle: { fontSize:12, fontWeight:"700", color:C.textDark, marginBottom:12, letterSpacing:0.3 },
  metaRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingVertical:9 },
  metaLabel: { fontSize:12, color:C.textLight, flex:1 },
  metaValueRow: { flexDirection:"row", alignItems:"center", flex:1.2, justifyContent:"flex-end" },
  metaValue: { fontSize:12, fontWeight:"600", color:C.textDark, textAlign:"right", flexShrink:1 },
  metaDivider: { height:1, backgroundColor:C.bg },
  timelineCard: { backgroundColor:C.white, borderRadius:14, padding:16, shadowColor:"#000", shadowOpacity:0.05, shadowOffset:{width:0,height:2}, shadowRadius:6, elevation:2 },
  timelineCardTitle: { fontSize:12, fontWeight:"700", color:C.textDark, marginBottom:16, letterSpacing:0.3 },
  timeline: { gap:0 },
  timelineRow: { flexDirection:"row" },
  timelineLeft: { width:28, alignItems:"center" },
  timelineDot: { width:22, height:22, borderRadius:11, borderWidth:2, alignItems:"center", justifyContent:"center", zIndex:1 },
  timelineDotActive: { width:22, height:22, borderRadius:11, backgroundColor:C.orangePale, borderColor:C.orange, borderWidth:2.5 },
  timelineDotInner: { width:8, height:8, borderRadius:4, backgroundColor:C.orange },
  timelineLine: { width:2, flex:1, minHeight:16, borderRadius:1, marginVertical:3, alignSelf:"center" },
  timelineContent: { flex:1, paddingLeft:12, paddingBottom:20 },
  timelineTopRow: { flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 },
  timelineStatus: { fontSize:13, fontWeight:"700", flex:1 },
  timelineDatetime: { fontSize:10, color:C.textLight, textAlign:"right", marginLeft:8 },
  locationChip: { flexDirection:"row", alignItems:"center", gap:3, marginBottom:5 },
  locationText: { fontSize:11, color:C.textLight },
  timelineDesc: { fontSize:12, color:C.textMid, lineHeight:18 },
});

// Shipping label styles (identical to original)
const lStyles = StyleSheet.create({
  modalOverlay: Platform.OS === "web"
    ? { flex:1, backgroundColor:"rgba(0,0,0,0.45)", alignItems:"center", justifyContent:"center" }
    : { flex:1 },
  safeArea: Platform.OS === "web"
    ? { width:"100%", maxWidth:680, maxHeight:"90%", backgroundColor:"#EBEBEB", borderRadius:16, overflow:"hidden" }
    : { flex:1, backgroundColor:"#EBEBEB" },
  scroll: { flex:1 },
  scrollContent: { padding:12, paddingBottom:16 },
  labelCard: { backgroundColor:C.white, borderRadius:4, overflow:"hidden", shadowColor:"#000", shadowOpacity:0.12, shadowOffset:{width:0,height:4}, shadowRadius:12, elevation:6 },
  labelTopHeader: { backgroundColor:C.white, alignItems:"center", paddingVertical:6, paddingHorizontal:12, borderBottomWidth:1, borderBottomColor:C.border },
  logoImage: { width:160, height:48, backgroundColor:C.white, alignSelf:"center" },
  orangeBand: { backgroundColor:C.orange, paddingVertical:7, alignItems:"center" },
  orangeBandText: { fontSize:11, fontWeight:"800", color:C.white, letterSpacing:1.4 },
  courierRow: { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10, paddingVertical:8, backgroundColor:C.white, borderBottomWidth:1, borderBottomColor:C.border },
  courierName: { fontSize:13, fontWeight:"700", color:C.textDark },
  gstPill: { backgroundColor:C.orange, paddingHorizontal:7, paddingVertical:2, borderRadius:3 },
  gstText: { fontSize:9, fontWeight:"700", color:C.white, letterSpacing:0.2 },
  barcodeSection: { flexDirection:"row", alignItems:"center", paddingHorizontal:14, paddingVertical:12, borderBottomWidth:1, borderBottomColor:C.border, gap:10 },
  barcodeLeft: { flex:1, alignItems:"center" },
  awbLabel: { fontSize:8, fontWeight:"600", color:C.textLight, letterSpacing:1, marginBottom:5 },
  barcodeWrap: { flexDirection:"row", alignItems:"flex-end", height:52, gap:1 },
  bar: { borderRadius:0.5 },
  awbNumber: { fontSize:10, color:C.textMid, letterSpacing:1.4, marginTop:5, fontWeight:"600" },
  qrBox: { width:72, height:72, borderWidth:1, borderColor:C.border, padding:3, backgroundColor:C.white },
  qrInner: { flex:1 },
  divider: { height:1, backgroundColor:C.border },
  section: { paddingHorizontal:12, paddingVertical:10 },
  sectionTitle: { fontSize:8, fontWeight:"800", color:"#555", letterSpacing:1.2, marginBottom:6, backgroundColor:"#F0F0F0", paddingHorizontal:5, paddingVertical:2, alignSelf:"flex-start" },
  shipToName: { fontSize:14, fontWeight:"800", color:C.textDark, marginBottom:3 },
  shipToAddress: { fontSize:11, color:C.textMid, lineHeight:17, marginBottom:3 },
  shipToPinLabel: { fontSize:11, color:C.textMid, fontWeight:"500" },
  shipToPin: { fontWeight:"800", color:C.textDark },
  metaSection: { paddingHorizontal:12, paddingVertical:10 },
  metaGrid: { gap:4 },
  metaGridRow: { flexDirection:"row", gap:4 },
  metaKey: { fontSize:10, color:C.textLight, fontWeight:"600", width:78 },
  metaVal: { fontSize:10, color:C.textDark, fontWeight:"500", flex:1 },
  tableHeader: { flexDirection:"row", borderBottomWidth:1, borderBottomColor:C.border, paddingBottom:4, paddingTop:4, backgroundColor:"#F5F7FA", paddingHorizontal:8 },
  th: { fontSize:7.5, fontWeight:"700", color:"#666", letterSpacing:0.4 },
  tableRow: { flexDirection:"row", alignItems:"center", paddingVertical:5, borderBottomWidth:1, borderBottomColor:"#F0F0F0", paddingHorizontal:8 },
  td: { fontSize:9, color:C.textMid },
  tdName: { fontSize:10, fontWeight:"700", color:C.textDark },
  tdVariant: { fontSize:8, color:C.textLight, marginTop:1 },
  tdOrange: { fontSize:9, color:C.orange, fontWeight:"700" },
  tdBold: { fontSize:9, fontWeight:"800", color:C.textDark },
  tableTotalsRow: { flexDirection:"row", alignItems:"center", paddingVertical:5, paddingHorizontal:8, borderTopWidth:1.5, borderTopColor:C.border, backgroundColor:"#FAFAFA" },
  returnSection: { paddingHorizontal:12, paddingVertical:10, backgroundColor:"#FFF9F5" },
  returnInner: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:5 },
  returnBiz: { fontSize:12, fontWeight:"800", color:C.textDark },
  returnAddr: { fontSize:10, color:C.textMid, lineHeight:16, marginTop:1 },
  returnPhone: { fontSize:10, color:C.textMid, marginTop:2, fontWeight:"600" },
  footer: { backgroundColor:"#F5F5F5", paddingVertical:10, paddingHorizontal:12, alignItems:"center", gap:3, borderTopWidth:1, borderTopColor:C.border },
  footerGst: { fontSize:9, fontWeight:"700", color:C.textDark },
  footerNote: { fontSize:8, color:C.textLight, letterSpacing:0.4, fontWeight:"600" },
  footerPowered: { fontSize:8, color:C.orange, fontWeight:"700" },
  shippingStrip: { backgroundColor: C.white },
  qrWrap: { width: 72, height: 72, borderWidth: 1, borderColor: C.border, padding: 2, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  bottomBtnRow: { flexDirection:"row", gap:12, paddingHorizontal:16, paddingVertical:12, backgroundColor:"#EBEBEB", borderTopWidth:1, borderTopColor:"#D0D0D0", maxWidth:680, width:"100%" },  printBtn: { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", backgroundColor:C.orange, borderRadius:10, paddingVertical:13 },
  printBtnText: { fontSize:14, fontWeight:"700", color:C.white },
  closeBtn: { flex:1, alignItems:"center", justifyContent:"center", backgroundColor:"#9CA3AF", borderRadius:10, paddingVertical:13 },
  closeBtnText: { fontSize:14, fontWeight:"700", color:C.white },
});