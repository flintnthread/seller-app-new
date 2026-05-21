import React, { useEffect, useState } from "react";
import {
    Image,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
    CourierInfo,
    CourierPartner,
    CustomerInfo,
    Order,
    PaymentInfo,
    TrackingEvent,
} from "../../features/orders/types";
import { detailStyles } from "../../styles/orderStyles";
import {
    CloseIcon,
    LocationIcon,
    PackageIcon,
    PriceIcon,
    TruckIcon,
    UserIcon,
} from "../icons";
import { PendingActionBar, StatusUpdaterInline } from "./OrderActions";
import { C, NC } from "./orderConstants";
import {
    avatarColor,
    formatCurrency,
    formatDate,
    getInitials,
} from "./orderUtils";
import { StatusBadge } from "./StatusBadge";

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onOrderUpdate?: (updated: Order) => void;
}

const Avatar: React.FC<{ name?: string; size?: number }> = ({
  name = "",
  size = 48,
}) => (
  <View
    style={[
      styles.avatar,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarColor(name || ""),
      },
    ]}
  >
    <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>
      {getInitials(name || "")}
    </Text>
  </View>
);

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order: initialOrder,
  onClose,
  onOrderUpdate,
}) => {
  const [order, setOrder] = useState<Order | null>(initialOrder);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  if (!order) return null;

  const customer = getMockCustomerInfo(order);
  const payment = getMockPaymentInfo(order);
  const courier = getMockCourierInfo(order);
  const paymentMeta = paymentMetaMap[payment.method] ?? paymentMetaMap.card;
  const timeline = buildTimeline(order);
  const isCancelledOrRefunded =
    order.status === "cancelled" || order.status === "refunded";

  const paymentStatusColor =
    payment.status === "paid"
      ? NC.success
      : payment.status === "pending"
        ? C.pending
        : payment.status === "failed"
          ? NC.danger
          : C.refunded;

  const handleOrderUpdate = (updated: Order) => {
    setOrder(updated);
    onOrderUpdate?.(updated);
  };

  return (
    <View style={styles.overlay}>
      <SafeAreaView
        style={detailStyles.screen}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <View style={detailStyles.headerRow}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              flex: 1,
            }}
          >
            <Avatar name={order.customerName} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailCustomer}>{order.customerName}</Text>
              <Text style={styles.detailId}>
                {order.id} · {formatDate(order.createdAt)}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <CloseIcon size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
          <StatusBadge status={order.status} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
        >
          {order.status === "pending" && (
            <PendingActionBar order={order} onOrderUpdate={handleOrderUpdate} />
          )}

          {!isCancelledOrRefunded && order.status !== "delivered" && (
            <StatusUpdaterInline
              order={order}
              onOrderUpdate={handleOrderUpdate}
            />
          )}

          {/* Product Details Section */}
          <View style={[styles.infoCard, { marginTop: 16 }]}>
            <View style={styles.sectionHeaderRow}>
              <PackageIcon size={20} color="#ef7b1a" />
              <Text style={styles.infoCardTitle}>Product Details</Text>
            </View>
            {order.lineItems.map((item, idx) => (
              <View key={item.id}>
                <View style={styles.itemHeader}>
                  <View style={styles.thumbContainer}>
                    <Image
                      source={{
                        uri:
                          item.productImage || "https://via.placeholder.com/80",
                      }}
                      style={styles.thumbImage}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.productName}
                    </Text>
                    <Text style={styles.itemVariant}>{item.variant}</Text>
                  </View>
                  <Text style={styles.itemSubtotal}>
                    {formatCurrency(
                      item.unitPrice * item.quantity,
                      order.currency,
                    )}
                  </Text>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>SKU</Text>
                    <Text style={styles.detailValueMono} numberOfLines={1}>
                      {item.sku}
                    </Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Unit Price</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(item.unitPrice, order.currency)}
                    </Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Quantity</Text>
                    <Text style={[styles.detailValue, { color: "#ef7b1a" }]}>
                      × {item.quantity}
                    </Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Variant</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {item.variant}
                    </Text>
                  </View>
                </View>

                {idx < order.lineItems.length - 1 && (
                  <View style={styles.itemDivider} />
                )}
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Order Total ({order.itemCount} item
                {order.itemCount !== 1 ? "s" : ""})
              </Text>
              <Text style={styles.totalValue}>
                {formatCurrency(order.amount, order.currency)}
              </Text>
            </View>
          </View>

          {/* Timeline Section */}
          <View style={[styles.timelineContainer, { marginTop: 16 }]}>
            <View style={styles.sectionHeaderRow}>
              <LocationIcon size={20} color="#ef7b1a" />
              <Text style={styles.sectionTitle}>Tracking Timeline</Text>
            </View>
            {timeline.map((event, idx) => {
              const isDone = !!event.timestamp;
              const isActive =
                !isCancelledOrRefunded &&
                isDone &&
                (idx === timeline.length - 1 || !timeline[idx + 1]?.timestamp);
              const isCancelledEvent = event.stage === "cancelled";
              return (
                <View key={event.stage} style={styles.timelineRow}>
                  <View style={styles.timelineLineCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        isDone &&
                          !isCancelledEvent && {
                            backgroundColor: "#ef7b1a",
                            borderColor: "#ef7b1a",
                          },
                        isCancelledEvent && {
                          backgroundColor: "#ef4444",
                          borderColor: "#ef4444",
                        },
                      ]}
                    >
                      {isActive && <View style={styles.timelineDotPulse} />}
                    </View>
                    {idx < timeline.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          isDone && { backgroundColor: "#ef7b1a" },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        !isDone && { color: "#94a3b8" },
                        isActive && { color: "#ef7b1a", fontWeight: "700" },
                        isCancelledEvent && { color: "#ef4444" },
                      ]}
                    >
                      {event.label}
                    </Text>
                    {event.timestamp ? (
                      <Text style={styles.timelineTime}>
                        {formatDate(event.timestamp)}
                      </Text>
                    ) : (
                      <Text style={styles.timelinePending}>Pending</Text>
                    )}
                    {event.note && (
                      <Text style={styles.timelineNote}>{event.note}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Customer Info Section */}
          <View style={[styles.infoCard, { marginTop: 16 }]}>
            <View style={styles.sectionHeaderRow}>
              <UserIcon size={20} color="#ef7b1a" />
              <Text style={styles.infoCardTitle}>Customer Information</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{customer.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={[styles.infoValue, { color: "#ef7b1a" }]}>
                {customer.phone}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{customer.email}</Text>
            </View>

            <View style={styles.infoDivider} />
            <Text style={styles.infoLabel}>Delivery Address</Text>
            <Text style={styles.infoAddress}>
              {customer.address}
              {"\n"}
              {customer.city}, {customer.state} — {customer.pincode}
            </Text>
          </View>

          {/* Payment Section */}
          <View style={[styles.infoCard, { marginTop: 16 }]}>
            <View style={styles.sectionHeaderRow}>
              <PriceIcon size={20} color="#ef7b1a" />
              <Text style={styles.infoCardTitle}>Payment Information</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Method</Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: paymentMeta.color, fontWeight: "600" },
                ]}
              >
                {paymentMeta.icon} {paymentMeta.label}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <View
                style={[
                  styles.payStatusBadge,
                  { backgroundColor: `${paymentStatusColor}18` },
                ]}
              >
                <Text
                  style={[styles.payStatusText, { color: paymentStatusColor }]}
                >
                  {payment.status.charAt(0).toUpperCase() +
                    payment.status.slice(1)}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Amount</Text>
              <Text style={styles.infoValueBold}>
                {formatCurrency(payment.amount, payment.currency)}
              </Text>
            </View>
            {payment.transactionId && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Transaction ID</Text>
                <Text style={styles.infoValueMono}>
                  {payment.transactionId}
                </Text>
              </View>
            )}
            {payment.method === "cod" && (
              <View style={styles.codNote}>
                <Text style={styles.codNoteText}>
                  Collect {formatCurrency(payment.amount, payment.currency)} in
                  cash upon delivery
                </Text>
              </View>
            )}
          </View>

          {/* Courier Section */}
          <View style={[styles.infoCard, { marginTop: 16 }]}>
            <View style={styles.sectionHeaderRow}>
              <TruckIcon size={20} color="#ef7b1a" />
              <Text style={styles.infoCardTitle}>Courier Partner</Text>
            </View>
            {courier.partner ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Partner</Text>
                  <Text style={[styles.infoValueBold, { color: "#1d324e" }]}>
                    {courier.partner}
                  </Text>
                </View>
                {courier.trackingId && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tracking ID</Text>
                    <Text style={styles.infoValueMono}>
                      {courier.trackingId}
                    </Text>
                  </View>
                )}
                {courier.estimatedDelivery && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Est. Delivery</Text>
                    <Text style={[styles.infoValueBold, { color: "#10b981" }]}>
                      {courier.estimatedDelivery}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.courierPending}>
                Not yet assigned. Update status to &quot;Shipped&quot; to assign a courier
                partner.
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// --- Helpers & Constants ---

const paymentMethods: PaymentInfo["method"][] = [
  "cod",
  "razorpay",
  "upi",
  "netbanking",
  "card",
];

const paymentMetaMap: Record<
  PaymentInfo["method"],
  { label: string; icon: string; color: string }
> = {
  cod: { label: "Cash on Delivery", icon: "💵", color: "#64748b" },
  razorpay: { label: "Razorpay", icon: "💳", color: "#ef7b1a" },
  upi: { label: "UPI", icon: "📱", color: "#10b981" },
  netbanking: { label: "Net Banking", icon: "🏦", color: "#1d324e" },
  card: { label: "Credit/Debit Card", icon: "💳", color: "#3a8fa8" },
};

const courierPartners: CourierPartner[] = [
  "Delhivery",
  "BlueDart",
  "DTDC",
  "Ekart",
  "Xpressbees",
  "Shiprocket",
];

const STAGE_ORDER: TrackingEvent["stage"][] = [
  "order_placed",
  "accepted",
  "packing",
  "ready_to_ship",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

const STAGE_LABELS: Record<TrackingEvent["stage"], string> = {
  order_placed: "Order Placed",
  accepted: "Accepted by Seller",
  packing: "Packing",
  ready_to_ship: "Ready to Ship",
  picked_up: "Picked Up by Courier",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_TO_STAGE: Record<Order["status"], TrackingEvent["stage"]> = {
  pending: "order_placed",
  confirmed: "accepted",
  processing: "packing",
  shipped: "in_transit",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "cancelled",
};

function getMockCustomerInfo(order: Order): CustomerInfo {
  const cities = [
    "Hyderabad",
    "Mumbai",
    "Bengaluru",
    "Chennai",
    "Pune",
    "Delhi",
    "Kolkata",
  ];
  const states = [
    "Telangana",
    "Maharashtra",
    "Karnataka",
    "Tamil Nadu",
    "Maharashtra",
    "Delhi",
    "West Bengal",
  ];
  const idNum = parseInt(String(order.customerId).replace(/\D/g, "")) || 0;
  const idx = idNum % cities.length;
  const name = order.customerName ?? "Customer";
  const first = (name.split(" ")[0] || "user").toLowerCase();
  return {
    name,
    phone: `+91 98${String(idx * 7654321 + 10000000).slice(0, 8)}`,
    email: `${first}@example.com`,
    address: `${idx + 1}2, MG Road, Flat ${idx + 101}`,
    city: cities[idx] ?? 'Unknown City',
    state: states[idx] ?? 'Unknown State',
    pincode: `5000${String(idx + 10).padStart(2, "0")}`,
  };
}

function getMockPaymentInfo(order: Order): PaymentInfo {
  const idx = parseInt(order.id.replace("ORD-0", "")) % paymentMethods.length;
  const method = paymentMethods[idx];
  return {
    method: method ?? 'cod',
    status:
      order.status === "cancelled"
        ? "refunded"
        : order.status === "pending" && method === "cod"
          ? "pending"
          : "paid",
    ...(method !== "cod" ? {
      transactionId: `TXN${Date.now().toString(36).toUpperCase()}`
    } : {}),
    ...(method !== "cod" ? { paidAt: order.createdAt } : {}),
    amount: order.amount,
    currency: order.currency,
  };
}

function getMockCourierInfo(order: Order): CourierInfo {
  const shipped = ["shipped", "delivered"].includes(order.status);
  const idx = parseInt(order.id.replace("ORD-0", "")) % courierPartners.length;
  return {
    partner: shipped ? (courierPartners[idx] ?? "Delhivery") : null,
    trackingId: shipped
      ? `DL${Math.random().toString(36).slice(2, 12).toUpperCase()}`
      : null,
    estimatedDelivery: shipped
      ? new Date(Date.now() + 2 * 86_400_000).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })
      : null,
  };
}

function buildTimeline(order: Order): TrackingEvent[] {
  if (order.status === "cancelled" || order.status === "refunded") {
    return [
      {
        stage: "order_placed",
        label: STAGE_LABELS.order_placed,
        timestamp: order.createdAt,
      },
      {
        stage: "cancelled",
        label: STAGE_LABELS.cancelled,
        timestamp: order.updatedAt,
        note: "Order was cancelled",
      },
    ];
  }

  const currentIdx = STAGE_ORDER.indexOf(STATUS_TO_STAGE[order.status]);
  return STAGE_ORDER.map((stage, index) => ({
    stage,
    label: STAGE_LABELS[stage],
    timestamp:
      index <= currentIdx
        ? new Date(
            new Date(order.createdAt).getTime() + index * 3_600_000 * 6,
          ).toISOString()
        : null,
  }));
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 10,
    backgroundColor: "#f6f8fb",
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  detailCustomer: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  detailId: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  thumbContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 18,
  },
  itemVariant: {
    fontSize: 12,
    color: "#ef7b1a",
    marginTop: 2,
    fontWeight: "600",
  },
  itemSubtotal: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 4,
    overflow: "hidden",
  },
  detailCell: {
    width: "50%",
    padding: 10,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  detailValueMono: {
    fontSize: 11,
    color: "#334155",
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontWeight: "600",
  },
  itemDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#f1f5f9",
  },
  totalLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ef7b1a",
  },
  timelineContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 56,
  },
  timelineLineCol: {
    width: 24,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    zIndex: 1,
    marginTop: 4,
  },
  timelineDotPulse: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(239,123,26,0.2)",
    top: -4,
    left: -4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#f1f5f9",
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  timelineTime: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  timelinePending: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
    fontStyle: "italic",
  },
  timelineNote: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  infoValueBold: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
  },
  infoValueMono: {
    fontSize: 11,
    color: "#334155",
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 10,
  },
  infoAddress: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginTop: 4,
    fontWeight: "500",
  },
  payStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payStatusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  codNote: {
    backgroundColor: "rgba(239,123,26,0.05)",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(239,123,26,0.1)",
  },
  codNoteText: {
    fontSize: 12,
    color: "#ef7b1a",
    fontWeight: "600",
    textAlign: "center",
  },
  courierPending: {
    fontSize: 13,
    color: "#64748b",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
});
