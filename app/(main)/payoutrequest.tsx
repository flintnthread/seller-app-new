import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/common/AppHeader";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  MaterialCommunityIcons,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useResponsive } from "@/hooks/useResponsive";
import { lookupOrderPayoutAmount } from "@/services/earningsApi";
import { fetchSellerOrderDetail, fetchSellerOrderDetails } from "@/services/orderApi";
import { ensureSellerId } from "@/lib/api/sellerSession";
import type { OrderDetail } from "@/lib/orders/ordersData";
import {
  fetchPayoutSummary,
  fetchSellerBankDetails,
  updateSellerBankDetails,
  submitPayoutRequest,
  exportPayoutTransactionsCsv,
  type PayoutSummary,
  type SellerBankDetails,
} from "@/services/payoutApi";
import { lookupIfscCode } from "@/services/sellerProfileApi";
import { confirmAction } from "@/lib/confirmDialog";
import { submitBankEditRequest } from "@/services/bankEditApi";

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  isDefault: boolean;
  isVerified: boolean;
}

interface Transaction {
  id: string;
  orderId: string;
  productName?: string;
  amount: number;
  date: string;
  status: "Completed" | "Pending" | "Cancelled";
  type: "Payout" | "Revenue";
}

const TXN_STATUS_FILTERS = [
  { value: "All", label: "All" },
  { value: "Completed", label: "Completed" },
  { value: "Pending", label: "Pending Payment" },
  { value: "Cancelled", label: "Cancelled" },
] as const;

function sellerPaymentStatusRaw(order: OrderDetail): string {
  return (order.payment.sellerPaymentStatus ?? "Pending").trim().toLowerCase();
}

function isCustomerPaymentCompleted(order: OrderDetail): boolean {
  const payment = order.payment;
  if (payment.paymentCompleted === true) return true;
  if (payment.status === "Paid") return true;
  const status = payment.status?.toLowerCase() ?? "";
  return status.includes("paid") || status.includes("success") || status.includes("completed");
}

function isOrderCancelled(order: OrderDetail): boolean {
  if (order.status === "Cancelled") return true;
  if (order.dbStatus?.toLowerCase().includes("cancel")) return true;
  const sellerPay = sellerPaymentStatusRaw(order);
  return sellerPay === "cancelled" || sellerPay === "canceled";
}

/** Seller payout status from DB — not order fulfilment status (Shipped/Pending/etc.). */
function resolveSellerPaymentTxnStatus(order: OrderDetail): Transaction["status"] | null {
  if (isOrderCancelled(order)) return "Cancelled";

  const sellerPay = sellerPaymentStatusRaw(order);
  if (sellerPay === "paid") return "Completed";

  // Pending payment TO SELLER (seller_payment_status = pending)
  if (sellerPay === "pending" || sellerPay === "" || !sellerPay.includes("paid")) {
    if (isCustomerPaymentCompleted(order)) return "Pending";
  }

  return null;
}

function isPendingPayoutOrder(order: OrderDetail): boolean {
  return resolveSellerPaymentTxnStatus(order) === "Pending";
}

function normalizeOrderKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function orderLookupKeys(order: OrderDetail): string[] {
  const keys = new Set<string>();
  const add = (raw?: string | number | null) => {
    if (raw == null) return;
    const normalized = normalizeOrderKey(String(raw));
    if (normalized) keys.add(normalized);
  };
  add(order.id);
  add(order.orderNumber);
  add(order.orderId);
  for (const key of [...keys]) {
    if (key.startsWith("FNT")) add(key.slice(3));
    if (key.startsWith("ORD")) add(key.slice(3));
  }
  return [...keys];
}

function findOrderByKey(orders: OrderDetail[], rawKey: string): OrderDetail | undefined {
  const cleaned = normalizeOrderKey(rawKey);
  if (!cleaned) return undefined;
  return orders.find((order) => {
    const keys = orderLookupKeys(order);
    return keys.some((key) => key === cleaned || cleaned.endsWith(key) || key.endsWith(cleaned));
  });
}

function formatTxnStatusLabel(status: Transaction["status"]): string {
  return status === "Pending" ? "Pending Payment" : status;
}

function txnStatusVisuals(status: Transaction["status"]) {
  if (status === "Completed") {
    return { icon: "check-circle" as const, color: "#22c55e", bg: "#22c55e18" };
  }
  if (status === "Cancelled") {
    return { icon: "close-circle-outline" as const, color: "#ef4444", bg: "#ef444418" };
  }
  return { icon: "clock-outline" as const, color: "#f59e0b", bg: "#f59e0b18" };
}

const THEME_COLOR = "#1a2b5edc";

function parseDisplayAmount(value?: string | number | null): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function resolveSellerItems(order: OrderDetail, sellerId: number | null) {
  if (!sellerId) return order.items;
  return order.items.filter((item) => item.sellerId == null || item.sellerId === sellerId);
}

function resolveSellerOrderAmount(order: OrderDetail, sellerId: number | null): number {
  const sellerItems = resolveSellerItems(order, sellerId);
  if (sellerItems.length === 0) return 0;
  const fromItems = sellerItems.reduce(
    (sum, item) => sum + (item.subtotalAmount ?? item.priceAmount ?? parseDisplayAmount(item.price) * item.qty),
    0,
  );
  if (fromItems > 0) return fromItems;
  return order.pricing.totalAmount ?? parseDisplayAmount(order.pricing.total);
}

function mapOrderDetailToTransaction(order: OrderDetail, sellerId: number | null): Transaction | null {
  const sellerItems = resolveSellerItems(order, sellerId);
  if (sellerId && sellerItems.length === 0) return null;

  const status = resolveSellerPaymentTxnStatus(order);
  if (!status) return null;

  const amount = resolveSellerOrderAmount(order, sellerId);
  const productName =
    sellerItems.map((item) => item.name).filter(Boolean).join(", ") ||
    order.items[0]?.name ||
    "Product";

  return {
    id: `order-${order.orderId ?? order.id}`,
    orderId: order.orderNumber ?? order.id,
    productName,
    amount,
    date: order.payment.paidOn || order.date,
    status,
    type: "Revenue",
  };
}

function buildTransactionsFromOrders(orders: OrderDetail[], sellerId: number | null): Transaction[] {
  const seen = new Set<string>();
  return orders
    .map((order) => mapOrderDetailToTransaction(order, sellerId))
    .filter((row): row is Transaction => {
      if (row == null || seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
}

function maskAccountNumber(account?: string | null): string {
  if (!account || account.length < 4) return "••••";
  return `•••• ${account.slice(-4)}`;
}

function bankDetailsToAccount(details: SellerBankDetails): BankAccount {
  return {
    id: "1",
    bankName: details.bankName?.trim() || "Bank Account",
    accountNumber: maskAccountNumber(details.accountNumber),
    isDefault: true,
    isVerified: Boolean(details.bankVerified),
  };
}

async function saveCsvFile(csvContent: string, filenamePrefix: string) {
  if (Platform.OS === "web") {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filenamePrefix}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const FileSystem = require("expo-file-system");
  const Sharing = require("expo-sharing");
  const filename = `${FileSystem.documentDirectory}${filenamePrefix}_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(filename, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const avail = await Sharing.isAvailableAsync();
  if (avail) {
    await Sharing.shareAsync(filename, {
      mimeType: "text/csv",
      dialogTitle: "Download Payout Transactions",
      UTI: "public.comma-separated-values-text",
    });
  } else {
    throw new Error("Sharing is not available on this device.");
  }
}

// ─── SHARED SUB-COMPONENTS ────────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  icon,
  compact,
}: {
  label: string;
  value: string;
  icon: string;
  compact?: boolean;
}) => (
  <View style={[styles.statCard, compact && styles.statCardWebMobile]}>
    <View style={[styles.statIconWrap, compact && styles.statIconWrapWebMobile]}>
      <MaterialCommunityIcons name={icon as any} size={compact ? 18 : 20} color="#f97316" />
    </View>
    <View style={compact ? styles.statTextWebMobile : undefined}>
      <Text style={[styles.statLabel, compact && styles.statLabelWebMobile]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.statValue, compact && styles.statValueWebMobile]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
    </View>
  </View>
);

const FilterChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.filterChip, active && styles.activeFilterChip]}
    onPress={onPress}
  >
    <Text style={[styles.filterChipText, active && styles.activeFilterChipText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// Desktop-only stat card (wider, horizontal layout)
const DesktopStatCard = ({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent: string;
}) => (
  <View style={desktopStyles.statCard}>
    <View style={[desktopStyles.statIconBox, { backgroundColor: accent + "18" }]}>
      <MaterialCommunityIcons name={icon as any} size={24} color={accent} />
    </View>
    <View style={{ marginTop: 14 }}>
      <Text style={desktopStyles.statLabel}>{label}</Text>
      <Text style={desktopStyles.statValue}>{value}</Text>
    </View>
  </View>
);

export default function EnhancedPayoutRequest() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isWeb, isMobile } = useResponsive();
  const isWebMobile = isWeb && isMobile;
  const isDesktop = Platform.OS === "web" && width >= 1024;
  const ScreenRoot = Platform.OS === "web" ? View : SafeAreaView;

  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [apiTransactions, setApiTransactions] = useState<Transaction[]>([]);
  const [selectedBank, setSelectedBank] = useState("1");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isRequesting, setIsRequesting] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [availableBalance, setAvailableBalance] = useState(0);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
  const [sellerOrders, setSellerOrders] = useState<OrderDetail[]>([]);
  const [orderLookupValid, setOrderLookupValid] = useState(false);
  const [orderLookupMessage, setOrderLookupMessage] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [storedBankDetails, setStoredBankDetails] = useState<SellerBankDetails | null>(null);

  const formatInr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

  const [showEditBankModal, setShowEditBankModal] = useState(false);
  const [modalAccountHolder, setModalAccountHolder] = useState("");
  const [modalAccountNumber, setModalAccountNumber] = useState("");
  const [modalConfirmAccountNumber, setModalConfirmAccountNumber] = useState("");
  const [modalIfsc, setModalIfsc] = useState("");
  const [modalBankName, setModalBankName] = useState("");
  const [modalBranchName, setModalBranchName] = useState("");
  const [modalReason, setModalReason] = useState("");
  const [isLookingUpIfsc, setIsLookingUpIfsc] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});

  const [summaryError, setSummaryError] = useState<string | null>(null);

  const loadPayoutData = useCallback(async () => {
    setSummaryError(null);
    setIsLoadingData(true);
    try {
      const sellerId = ensureSellerId();
      const [summary, bankDetails, orderDetails] = await Promise.all([
        fetchPayoutSummary(),
        fetchSellerBankDetails(),
        fetchSellerOrderDetails(),
      ]);
      setPayoutSummary(summary);
      setAvailableBalance(Number(summary.pendingAmount ?? 0));
      setStoredBankDetails(bankDetails);
      if (bankDetails.bankName?.trim() || bankDetails.accountNumber?.trim()) {
        setBanks([bankDetailsToAccount(bankDetails)]);
      } else {
        setBanks([]);
      }
      const orderTransactions = buildTransactionsFromOrders(orderDetails, sellerId);
      setSellerOrders(orderDetails);
      setApiTransactions(orderTransactions);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Failed to load payout data.");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPayoutData();
    }, [loadPayoutData])
  );

  const handleDownloadTransactions = async () => {
    try {
      const csvContent = await exportPayoutTransactionsCsv();
      if (!csvContent.trim()) {
        Alert.alert("No Transactions", "There are no transactions to download.");
        return;
      }
      await saveCsvFile(csvContent, "payout_transactions");
    } catch (error) {
      Alert.alert(
        "Download failed",
        error instanceof Error ? error.message : "Could not export transaction history."
      );
    }
  };

  const openBankEditModal = async () => {
    setModalErrors({});
    try {
      const details = storedBankDetails ?? (await fetchSellerBankDetails());
      setStoredBankDetails(details);
      setModalAccountHolder(details.accountHolder ?? "");
      setModalIfsc(details.ifscCode ?? "");
      setModalBankName(details.bankName ?? "");
      setModalBranchName(details.branchName ?? "");
      const acct = details.accountNumber ?? "";
      setModalAccountNumber(acct);
      setModalConfirmAccountNumber(acct);
    } catch {
      setModalAccountHolder("");
      setModalAccountNumber("");
      setModalConfirmAccountNumber("");
      setModalIfsc("");
      setModalBankName("");
      setModalBranchName("");
    }
    setShowEditBankModal(true);
  };

  const validateAddBankForm = () => {
    const errors: Record<string, string> = {};
    if (!modalAccountHolder.trim()) errors.accountHolder = "Account holder name is required";
    if (!modalBankName.trim()) errors.bankName = "Bank name is required";
    if (!modalAccountNumber.trim()) errors.accountNumber = "Account number is required";
    if (!modalConfirmAccountNumber.trim()) errors.confirmAccountNumber = "Please confirm account number";
    if (modalAccountNumber.trim() !== modalConfirmAccountNumber.trim()) errors.confirmAccountNumber = "Account numbers do not match";
    if (!modalIfsc.trim()) {
      errors.ifsc = "IFSC code is required";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(modalIfsc.toUpperCase())) {
      errors.ifsc = "Invalid IFSC code format";
    }
    if (!modalReason.trim()) errors.reason = "Reason for bank change is required";
    return errors;
  };

  const handleIfscLookup = async (text: string) => {
    const upper = text.toUpperCase();
    setModalIfsc(upper);
    setModalErrors((prev) => ({ ...prev, ifsc: "" }));

    if (upper.length === 11) {
      setIsLookingUpIfsc(true);
      try {
        const res = await lookupIfscCode(upper);
        if (res.found) {
          setModalBankName(res.bankName);
          setModalBranchName(res.branchName);
        } else {
          setModalBankName("");
          setModalBranchName("");
          setModalErrors((prev) => ({ ...prev, ifsc: "IFSC code not found" }));
        }
      } catch (e) {
        setModalBankName("");
        setModalBranchName("");
        setModalErrors((prev) => ({ ...prev, ifsc: "IFSC lookup failed" }));
      } finally {
        setIsLookingUpIfsc(false);
      }
    } else {
      setModalBankName("");
      setModalBranchName("");
    }
  };

  const handleSaveBank = async () => {
    const errors = validateAddBankForm();
    if (Object.keys(errors).length > 0) {
      setModalErrors(errors);
      return;
    }
    setModalErrors({});
    setIsSavingBank(true);
    try {
      await submitBankEditRequest({
        ifscCode: modalIfsc.trim().toUpperCase(),
        bankName: modalBankName.trim(),
        branchName: modalBranchName.trim(),
        accountHolder: modalAccountHolder.trim(),
        accountNumber: modalAccountNumber.trim(),
        reason: modalReason.trim(),
      });
      setShowEditBankModal(false);
      // Reset form
      setModalAccountHolder("");
      setModalAccountNumber("");
      setModalConfirmAccountNumber("");
      setModalIfsc("");
      setModalBankName("");
      setModalBranchName("");
      setModalReason("");
      Alert.alert("Success", "Bank edit request submitted successfully. Admin will review your request.");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to submit bank edit request.");
    } finally {
      setIsSavingBank(false);
    }
  };

  const applyOrderLookup = useCallback((order: OrderDetail) => {
    const sellerId = ensureSellerId();
    const status = resolveSellerPaymentTxnStatus(order);
    if (status === "Cancelled") {
      setOrderLookupMessage("This order is cancelled.");
      setOrderLookupValid(false);
      setAmount("");
      return;
    }
    if (status === "Completed") {
      setOrderLookupMessage("Seller payment already completed for this order.");
      setOrderLookupValid(false);
      setAmount("");
      return;
    }
    if (!isPendingPayoutOrder(order)) {
      setOrderLookupMessage("This order does not have pending seller payment.");
      setOrderLookupValid(false);
      setAmount("");
      return;
    }
    const payoutAmount = resolveSellerOrderAmount(order, sellerId);
    if (payoutAmount <= 0) {
      setOrderLookupMessage("No payout amount available for this order.");
      setOrderLookupValid(false);
      setAmount("");
      return;
    }
    setAmount(String(Math.round(payoutAmount)));
    setOrderLookupValid(true);
    setOrderLookupMessage("");
  }, []);

  const handleOrderIdChange = (text: string) => {
    const cleaned = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    setOrderId(cleaned);
    setOrderLookupValid(false);
    setAmount("");
    setOrderLookupMessage("");
    if (!cleaned) return;

    const localMatch = findOrderByKey(sellerOrders, cleaned);
    if (localMatch) {
      applyOrderLookup(localMatch);
      return;
    }

    void lookupOrderPayoutAmount(cleaned)
      .then(async (res) => {
        if (!res.found || res.amount <= 0) {
          setOrderLookupMessage("Order not found or not eligible for payout.");
          return;
        }
        try {
          const detail = await fetchSellerOrderDetail(cleaned);
          applyOrderLookup(detail);
        } catch {
          setOrderLookupMessage("Order not found for your seller account.");
        }
      })
      .catch(() => setOrderLookupMessage("Could not look up this order ID."));
  };

  const validateAmount = () => {
    if (!orderId) return "Enter Order ID";
    if (orderLookupMessage) return orderLookupMessage;
    if (!orderLookupValid) return "Enter an order ID with pending seller payment";
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return "Invalid Amount";
    return "";
  };

  const errorMsg = validateAmount();

  const filteredTransactions = useMemo(() => {
    const source = apiTransactions;
    const query = searchQuery.trim().toLowerCase();
    return source.filter((t) => {
      const matchesSearch =
        !query ||
        t.orderId.toLowerCase().includes(query) ||
        (t.productName?.toLowerCase().includes(query) ?? false);
      const matchesStatus = statusFilter === "All" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, apiTransactions]);

  const submitPayoutRequestFlow = async () => {
    setIsRequesting(true);
    try {
      await submitPayoutRequest({
        orderId: orderId.trim(),
        sellerNote: "Seller payout request",
      });
      await loadPayoutData();
      setShowSuccessModal(true);
      setOrderId("");
      setAmount("");
      setOrderLookupValid(false);
      setOrderLookupMessage("");
    } catch (e) {
      Alert.alert("Payout failed", e instanceof Error ? e.message : "Could not submit payout request.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleInitialRequest = async () => {
    if (errorMsg) {
      Alert.alert("Error", errorMsg);
      return;
    }
    if (banks.length === 0) {
      Alert.alert("Bank account required", "Please add your bank account details before requesting a payout.");
      return;
    }
    const confirmed = await confirmAction(
      "Request Payout",
      `Submit payout request for order ${orderId}?\n\nAmount: ₹${Number(amount).toLocaleString("en-IN")}\n\nThis will be sent to admin for review.`
    );
    if (!confirmed) return;
    await submitPayoutRequestFlow();
  };

  const renderTransactionItem = useCallback(
    ({ item }: { item: Transaction }) => {
      const visuals = txnStatusVisuals(item.status);
      return (
      <View style={[styles.txnItem, isWebMobile && styles.txnItemWebMobile]}>
        <View style={styles.txnIconWrap}>
          <MaterialCommunityIcons
            name={visuals.icon}
            size={24}
            color={visuals.color}
          />
        </View>
        <View style={styles.txnInfo}>
          <Text style={styles.txnTitle} numberOfLines={2}>
            {item.productName ?? item.orderId}
          </Text>
          <Text style={styles.txnDate}>
            {item.orderId}
            {item.date ? ` · ${new Date(item.date).toLocaleDateString()}` : ""}
          </Text>
        </View>
        <View style={styles.txnRight}>
          <Text style={styles.txnAmount}>₹{item.amount.toLocaleString()}</Text>
          <Text
            style={[
              styles.txnStatus,
              { color: visuals.color },
            ]}
          >
            {formatTxnStatusLabel(item.status)}
          </Text>
          {item.status === "Pending" && (
            <TouchableOpacity
              style={styles.raiseTicketBtn}
              onPress={() => router.push("/(main)/helpsupport")}
            >
              <MaterialCommunityIcons name="ticket-outline" size={12} color="#f97316" />
              <Text style={styles.raiseTicketText}>Help</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
    },
    [isWebMobile, router]
  );

  // ─── SHARED MODALS ──────────────────────────────────────────────────────────
  const sharedModals = (
    <>
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successContent}>
            <View style={styles.successIconWrap}>
              <MaterialCommunityIcons name="check-bold" size={40} color="#f97316" />
            </View>
            <Text style={styles.modalTitle}>Payout Request Submitted</Text>
            <Text style={styles.modalSub}>Your payout request has been sent to admin for review.</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.doneBtnText}>Great, Thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditBankModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxWidth: 460 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", alignItems: "center", marginBottom: 18 }}>
                <Text style={[styles.modalTitle, { fontSize: 18 }]}>Edit Bank Account</Text>
                <TouchableOpacity onPress={() => setShowEditBankModal(false)} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ width: "100%", maxHeight: 400 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Account Holder Name */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Account Holder Name</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: modalErrors.accountHolder ? "#ef4444" : "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, height: 42, fontSize: 14, color: "#0f172a", backgroundColor: "#f8fafc" }}
                    value={modalAccountHolder}
                    onChangeText={setModalAccountHolder}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#94a3b8"
                  />
                  {!!modalErrors.accountHolder && <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{modalErrors.accountHolder}</Text>}
                </View>

                {/* IFSC Code */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>IFSC Code</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: modalErrors.ifsc ? "#ef4444" : "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, height: 42, fontSize: 14, color: "#0f172a", backgroundColor: "#f8fafc" }}
                    value={modalIfsc}
                    onChangeText={handleIfscLookup}
                    placeholder="e.g. SBIN0000345"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={11}
                  />
                  {isLookingUpIfsc && <ActivityIndicator size="small" color="#f97316" style={{ alignSelf: "flex-start", marginTop: 4 }} />}
                  {!!modalErrors.ifsc && <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{modalErrors.ifsc}</Text>}
                  {!!modalBankName && (
                    <View style={{ backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 8, padding: 8, marginTop: 6 }}>
                      <Text style={{ color: "#16a34a", fontSize: 12, fontWeight: "600" }}>{modalBankName}</Text>
                      <Text style={{ color: "#16a34a", fontSize: 11, marginTop: 2 }}>Branch: {modalBranchName}</Text>
                    </View>
                  )}
                </View>

                {/* Bank Name */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Bank Name</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: modalErrors.bankName ? "#ef4444" : "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, height: 42, fontSize: 14, color: "#0f172a", backgroundColor: "#f8fafc" }}
                    value={modalBankName}
                    onChangeText={setModalBankName}
                    placeholder="e.g. State Bank of India"
                    placeholderTextColor="#94a3b8"
                  />
                  {!!modalErrors.bankName && <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{modalErrors.bankName}</Text>}
                </View>

                {/* Account Number */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Account Number</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: modalErrors.accountNumber ? "#ef4444" : "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, height: 42, fontSize: 14, color: "#0f172a", backgroundColor: "#f8fafc" }}
                    value={modalAccountNumber}
                    onChangeText={setModalAccountNumber}
                    placeholder="Enter Account Number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    secureTextEntry
                  />
                  {!!modalErrors.accountNumber && <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{modalErrors.accountNumber}</Text>}
                </View>

                {/* Confirm Account Number */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Confirm Account Number</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: modalErrors.confirmAccountNumber ? "#ef4444" : "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, height: 42, fontSize: 14, color: "#0f172a", backgroundColor: "#f8fafc" }}
                    value={modalConfirmAccountNumber}
                    onChangeText={setModalConfirmAccountNumber}
                    placeholder="Confirm Account Number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    secureTextEntry
                  />
                  {!!modalErrors.confirmAccountNumber && <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{modalErrors.confirmAccountNumber}</Text>}
                </View>

                {/* Reason for Bank Change */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Reason for Bank Change</Text>
                  <TextInput
                    style={{ borderWidth: 1.5, borderColor: modalErrors.reason ? "#ef4444" : "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, height: 80, fontSize: 14, color: "#0f172a", backgroundColor: "#f8fafc", textAlignVertical: "top" }}
                    value={modalReason}
                    onChangeText={setModalReason}
                    placeholder="Please explain why you need to change your bank account details"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                  />
                  {!!modalErrors.reason && <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>{modalErrors.reason}</Text>}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.verifyBtn, { marginTop: 14 }]}
                onPress={handleSaveBank}
                disabled={isSavingBank}
              >
                {isSavingBank ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyBtnText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );

  // ─── DESKTOP LAYOUT ─────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={desktopStyles.root}>

        {/* Top Nav */}
        {/* <View style={desktopStyles.topNav}>
          <TouchableOpacity style={desktopStyles.navBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#1a2b5e" />
            <Text style={desktopStyles.navBackText}>Back</Text>
          </TouchableOpacity>
          <View style={desktopStyles.navCenter}>
            <MaterialCommunityIcons name="bank-transfer-out" size={20} color="#f97316" />
            <Text style={desktopStyles.navTitle}>Payout Request</Text>
          </View>
          <View style={desktopStyles.navRight}>
            <View style={desktopStyles.navBadge}>
              <MaterialCommunityIcons name="shield-lock-outline" size={14} color="#1a2b5e" />
              <Text style={desktopStyles.navBadgeText}>Secured</Text>
            </View>
          </View>
        </View> */}

        <ScrollView
          style={desktopStyles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={desktopStyles.scrollContent}
        >
        {/* Hero Banner */}
        <View style={desktopStyles.hero}>
          <View style={desktopStyles.heroInner}>
            <View>
              <Text style={desktopStyles.heroTitle}>Manage Earnings & Withdrawals</Text>
              <Text style={desktopStyles.heroSub}>
                Request payouts, track transactions, and manage your bank accounts in one place.
              </Text>
            </View>
            <View style={desktopStyles.heroBalance}>
              <Text style={desktopStyles.heroBalanceLabel}>Available Balance</Text>
              <Text style={desktopStyles.heroBalanceValue}>
                ₹{availableBalance.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {!!summaryError && (
          <View style={{ marginHorizontal: 24, marginBottom: 8, padding: 12, borderRadius: 8, backgroundColor: "#fef2f2" }}>
            <Text style={{ color: "#b91c1c", fontSize: 13 }}>{summaryError}</Text>
          </View>
        )}

          {/* Stats Row */}
          <View style={desktopStyles.statsRow}>
            <DesktopStatCard label="Lifetime Earnings" value={payoutSummary ? formatInr(payoutSummary.lifetimeEarnings) : "—"} icon="history" accent="#1a2b5e" />
            <DesktopStatCard label="This Month" value={payoutSummary ? formatInr(payoutSummary.thisMonthEarnings) : "—"} icon="calendar-month" accent="#f97316" />
            <DesktopStatCard label="Highest Payout" value={payoutSummary ? formatInr(payoutSummary.highestPayout) : "—"} icon="trending-up" accent="#22c55e" />
            <DesktopStatCard label="Pending" value={payoutSummary ? formatInr(payoutSummary.pendingAmount) : "—"} icon="clock-outline" accent="#f59e0b" />
          </View>

          {/* Two-column body */}
          <View style={desktopStyles.twoCol}>

            {/* ── LEFT: Payout Form ── */}
            <View style={desktopStyles.formPanel}>
              <View style={desktopStyles.panelHeader}>
                <View style={desktopStyles.panelIconBox}>
                  <MaterialCommunityIcons name="bank-transfer-out" size={18} color="#f97316" />
                </View>
                <Text style={desktopStyles.panelTitle}>Request Payout</Text>
              </View>

              {/* Bank Selection */}
              <View style={desktopStyles.fieldBlock}>
                <Text style={desktopStyles.fieldLabel}>Select Bank Account</Text>
                <View style={desktopStyles.bankRow}>
                  {banks.map((bank) => (
                    <TouchableOpacity
                      key={bank.id}
                      style={[
                        desktopStyles.bankCard,
                        selectedBank === bank.id && desktopStyles.bankCardActive,
                      ]}
                      onPress={() => setSelectedBank(bank.id)}
                    >
                      <View style={desktopStyles.bankCardLeft}>
                        <View
                          style={[
                            desktopStyles.bankIconBox,
                            selectedBank === bank.id && desktopStyles.bankIconBoxActive,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="bank"
                            size={20}
                            color={selectedBank === bank.id ? "#fff" : "#f97316"}
                          />
                        </View>
                        <View>
                          <Text
                            style={[
                              desktopStyles.bankName,
                              selectedBank === bank.id && desktopStyles.bankNameActive,
                            ]}
                          >
                            {bank.bankName}
                          </Text>
                          <Text
                            style={[
                              desktopStyles.bankAcc,
                              selectedBank === bank.id && desktopStyles.bankAccActive,
                            ]}
                          >
                            {bank.accountNumber}
                          </Text>
                        </View>
                      </View>
                      {bank.isDefault && (
                        <View style={desktopStyles.defaultBadge}>
                          <Text style={desktopStyles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                      {selectedBank === bank.id && (
                        <MaterialIcons name="check-circle" size={18} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}

                  {/* Edit Bank Account Card */}
                  <TouchableOpacity
                    style={[desktopStyles.bankCard, { borderStyle: "dashed", borderWidth: 1.5, borderColor: "#f97316", cursor: "pointer" as any }]}
                    onPress={openBankEditModal}
                  >
                    <View style={desktopStyles.bankCardLeft}>
                      <View style={[desktopStyles.bankIconBox, { backgroundColor: "#fff4ec" }]}>
                        <MaterialCommunityIcons name="pencil" size={20} color="#f97316" />
                      </View>
                      <View>
                        <Text style={desktopStyles.bankName}>Edit Bank Account</Text>
                        <Text style={desktopStyles.bankAcc}>Request to change bank details</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Order ID Input */}
              <View style={desktopStyles.fieldBlock}>
                <Text style={desktopStyles.fieldLabel}>Order ID</Text>
                <View
                  style={[
                    desktopStyles.inputRow,
                    !!errorMsg && orderId.length > 0 && desktopStyles.inputRowError,
                  ]}
                >
                  <View style={desktopStyles.inputIconBox}>
                    <MaterialCommunityIcons name="shopping-outline" size={18} color="#f97316" />
                  </View>
                  <TextInput
                    style={desktopStyles.textInput}
                    value={orderId}
                    onChangeText={handleOrderIdChange}
                    placeholder="Example: FNT10293"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                  />
                </View>
                {!!errorMsg && orderId.length > 0 && (
                  <Text style={desktopStyles.errorText}>{errorMsg}</Text>
                )}
              </View>

              {/* Verified Amount Card */}
              {orderLookupValid && !!amount && (
                <View style={desktopStyles.verifiedCard}>
                  <View>
                    <Text style={desktopStyles.verifiedLabel}>Pending Payout Amount</Text>
                    <Text style={desktopStyles.verifiedValue}>
                      ₹{Number(amount).toLocaleString()}
                    </Text>
                  </View>
                  <View style={desktopStyles.verifiedBadge}>
                    <MaterialIcons name="verified" size={16} color="#f97316" />
                    <Text style={desktopStyles.verifiedBadgeText}>Verified</Text>
                  </View>
                </View>
              )}

              {/* Security Notice */}
              <View style={desktopStyles.securityRow}>
                <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#f97316" />
                <Text style={desktopStyles.securityText}>
                  Your payout request will be sent to admin for review and processing.
                </Text>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[desktopStyles.submitBtn, !!errorMsg && desktopStyles.submitBtnDisabled]}
                onPress={handleInitialRequest}
                disabled={!!errorMsg}
                activeOpacity={0.85}
              >
                {isRequesting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={desktopStyles.submitBtnText}>Request Payout</Text>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#f97316" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* ── RIGHT: Transactions ── */}
            <View style={desktopStyles.txnPanel}>
              <View style={[desktopStyles.panelHeader, { justifyContent: "space-between", width: "100%" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={desktopStyles.panelIconBox}>
                    <MaterialCommunityIcons name="history" size={18} color="#f97316" />
                  </View>
                  <Text style={desktopStyles.panelTitle}>Recent Transactions</Text>
                </View>
                <TouchableOpacity
                  style={desktopStyles.downloadBtn}
                  onPress={handleDownloadTransactions}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="download" size={16} color="#f97316" style={{ marginRight: 6 }} />
                  <Text style={desktopStyles.downloadBtnText}>Download</Text>
                </TouchableOpacity>
              </View>

              {/* Search & Filters */}
              <View style={desktopStyles.searchRow}>
                <View style={desktopStyles.searchBox}>
                  <Ionicons name="search" size={16} color="#f97316" />
                  <TextInput
                    style={desktopStyles.searchInput}
                    placeholder="Search Order ID"
                    placeholderTextColor="#94a3b8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
              </View>
              <View style={desktopStyles.filterRow}>
                {TXN_STATUS_FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    style={[desktopStyles.filterChip, statusFilter === f.value && desktopStyles.filterChipActive]}
                    onPress={() => setStatusFilter(f.value)}
                  >
                    <Text
                      style={[
                        desktopStyles.filterChipText,
                        statusFilter === f.value && desktopStyles.filterChipTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Transaction List */}
              <View style={desktopStyles.txnList}>
                {filteredTransactions.length === 0 ? (
                  <View style={desktopStyles.emptyState}>
                    <MaterialCommunityIcons name="inbox-outline" size={40} color="#cbd5e1" />
                    <Text style={desktopStyles.emptyText}>No transactions found</Text>
                  </View>
                ) : (
                  filteredTransactions.map((item) => {
                    const visuals = txnStatusVisuals(item.status);
                    return (
                    <View key={item.id} style={desktopStyles.txnRow}>
                      <View
                        style={[
                          desktopStyles.txnStatusDot,
                          { backgroundColor: visuals.bg },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={visuals.icon}
                          size={20}
                          color={visuals.color}
                        />
                      </View>
                      <View style={desktopStyles.txnRowInfo}>
                        <Text style={desktopStyles.txnOrderId} numberOfLines={2}>
                          {item.productName ?? item.orderId}
                        </Text>
                        <Text style={desktopStyles.txnDate}>
                          {item.orderId}
                          {item.date
                            ? ` · ${new Date(item.date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}`
                            : ""}
                        </Text>
                      </View>
                      <View style={desktopStyles.txnRowRight}>
                        <Text style={desktopStyles.txnAmount}>
                          ₹{item.amount.toLocaleString()}
                        </Text>
                        <View
                          style={[
                            desktopStyles.txnStatusBadge,
                            { backgroundColor: visuals.bg },
                          ]}
                        >
                          <Text
                            style={[
                              desktopStyles.txnStatusText,
                              { color: visuals.color },
                            ]}
                          >
                            {formatTxnStatusLabel(item.status)}
                          </Text>
                        </View>
                        {item.status === "Pending" && (
                          <TouchableOpacity
                            style={desktopStyles.helpBtn}
                            onPress={() => router.push("/(main)/helpsupport")}
                          >
                            <MaterialCommunityIcons name="ticket-outline" size={12} color="#f97316" />
                            <Text style={desktopStyles.helpBtnText}>Raise Ticket</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                  })
                )}
              </View>
            </View>
          </View>

          <View style={{ height: 12 }} />
        </ScrollView>

        {sharedModals}
      </View>
    );
  }

  // ─── ORIGINAL MOBILE LAYOUT (untouched) ─────────────────────────────────────
  return (
    <ScreenRoot style={[styles.safe, isWeb && styles.safeWeb]}>
      {Platform.OS !== "web" && (
        <AppHeader title="Payout Request" subtitle="Manage your earnings & withdrawals" showBackButton />
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          showsVerticalScrollIndicator={isWebMobile}
          contentContainerStyle={[
            isWeb && styles.listContentWeb,
            isWebMobile && styles.listContentWebMobile,
            { paddingBottom: isWebMobile ? 100 : 120 },
          ]}
          ListHeaderComponent={
            <View style={[styles.listHeader, isWebMobile && styles.listHeaderWebMobile]}>
              {isWebMobile && (
                <View style={styles.webMobileIntro}>
                  <Text style={styles.webMobileTitle}>Payout Request</Text>
                  <Text style={styles.webMobileSubtitle} numberOfLines={2}>
                    Manage your earnings & withdrawals
                  </Text>
                </View>
              )}
              {!!summaryError && (
                <View style={{ marginBottom: 12, padding: 12, borderRadius: 8, backgroundColor: "#fef2f2" }}>
                  <Text style={{ color: "#b91c1c", fontSize: 13 }}>{summaryError}</Text>
                </View>
              )}
              {isWebMobile ? (
                <View style={styles.statsGridWebMobile}>
                  <StatCard compact label="Lifetime" value={payoutSummary ? formatInr(payoutSummary.lifetimeEarnings) : "—"} icon="history" />
                  <StatCard compact label="This Month" value={payoutSummary ? formatInr(payoutSummary.thisMonthEarnings) : "—"} icon="calendar-month" />
                  <View style={styles.statCardSpanWebMobile}>
                    <StatCard compact label="Highest" value={payoutSummary ? formatInr(payoutSummary.highestPayout) : "—"} icon="trending-up" />
                  </View>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  <StatCard label="Lifetime" value={payoutSummary ? formatInr(payoutSummary.lifetimeEarnings) : "—"} icon="history" />
                  <StatCard label="This Month" value={payoutSummary ? formatInr(payoutSummary.thisMonthEarnings) : "—"} icon="calendar-month" />
                  <StatCard label="Highest" value={payoutSummary ? formatInr(payoutSummary.highestPayout) : "—"} icon="trending-up" />
                </ScrollView>
              )}

              <View style={[styles.balanceCard, isWebMobile && styles.balanceCardWebMobile]}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text
                  style={[styles.balanceValue, isWebMobile && styles.balanceValueWebMobile]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  ₹{availableBalance.toLocaleString()}
                </Text>
              </View>

              <View style={[styles.sectionHeader, isWebMobile && styles.sectionHeaderWebMobile]}>
                <Text style={styles.sectionTitle}>Select Bank</Text>
              </View>

              {isWebMobile ? (
                <View style={styles.bankRowWebMobile}>
                  {banks.map((bank) => (
                    <TouchableOpacity
                      key={bank.id}
                      style={[
                        styles.bankCard,
                        styles.bankCardWebMobile,
                        selectedBank === bank.id && styles.selectedBankCard,
                      ]}
                      onPress={() => setSelectedBank(bank.id)}
                    >
                      <MaterialCommunityIcons
                        name="bank"
                        size={22}
                        color={selectedBank === bank.id ? "#fff" : "#f97316"}
                      />
                      <Text
                        style={[styles.bankName, styles.bankNameWebMobile, selectedBank === bank.id && { color: "#fff" }]}
                        numberOfLines={1}
                      >
                        {bank.bankName}
                      </Text>
                      <Text
                        style={[styles.bankAcc, styles.bankAccWebMobile, selectedBank === bank.id && { color: "rgba(255,255,255,0.85)" }]}
                        numberOfLines={1}
                      >
                        {bank.accountNumber}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[
                      styles.bankCard,
                      styles.bankCardWebMobile,
                      styles.bankEditCardWebMobile,
                    ]}
                    onPress={openBankEditModal}
                  >
                    <MaterialCommunityIcons name="pencil" size={22} color="#f97316" />
                    <Text style={[styles.bankName, styles.bankNameWebMobile, { marginTop: 8, color: "#f97316" }]} numberOfLines={1}>
                      Edit Bank
                    </Text>
                    <Text style={[styles.bankAcc, styles.bankAccWebMobile]} numberOfLines={1}>
                      Account details
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {banks.map((bank) => (
                    <TouchableOpacity
                      key={bank.id}
                      style={[styles.bankCard, selectedBank === bank.id && styles.selectedBankCard]}
                      onPress={() => setSelectedBank(bank.id)}
                    >
                      <MaterialCommunityIcons
                        name="bank"
                        size={24}
                        color={selectedBank === bank.id ? "#fff" : "#f97316"}
                      />
                      <Text style={[styles.bankName, selectedBank === bank.id && { color: "#fff" }]}>
                        {bank.bankName}
                      </Text>
                      <Text style={[styles.bankAcc, selectedBank === bank.id && { color: "#fff" }]}>
                        {bank.accountNumber}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[styles.bankCard, { justifyContent: "center", alignItems: "center", borderStyle: "dashed", borderWidth: 1.5, borderColor: "#f97316" }]}
                    onPress={openBankEditModal}
                  >
                    <MaterialCommunityIcons name="pencil" size={24} color="#f97316" />
                    <Text style={[styles.bankName, { marginTop: 6, color: "#f97316" }]}>Edit Bank</Text>
                    <Text style={styles.bankAcc}>Account details</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

              <View style={[styles.formContainer, isWebMobile && styles.formContainerWebMobile]}>
                <Text style={styles.inputLabel}>Enter Order ID</Text>
                <View
                  style={[
                    styles.inputRow,
                    !!errorMsg && orderId.length > 0 && styles.inputError,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="shopping-outline"
                    size={22}
                    color="#f97316"
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={styles.orderInput}
                    value={orderId}
                    onChangeText={handleOrderIdChange}
                    placeholder="Example: FNT10293"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                  />
                </View>

                {orderLookupValid && !!amount && (
                  <View style={styles.orderAmountCard}>
                    <View>
                      <Text style={styles.orderAmountLabel}>Pending Payout Amount</Text>
                      <Text style={styles.orderAmountValue}>₹{Number(amount).toLocaleString()}</Text>
                    </View>
                    <View style={styles.orderVerifiedBadge}>
                      <MaterialIcons name="verified" size={18} color="#f97316" />
                      <Text style={styles.orderVerifiedText}>Verified</Text>
                    </View>
                  </View>
                )}

                {!!errorMsg && orderId.length > 0 && (
                  <Text style={styles.errorText}>{errorMsg}</Text>
                )}
              </View>

              <View style={[styles.securityCard, isWebMobile && styles.securityCardWebMobile]}>
                <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#f97316" />
                <Text style={styles.securityText}>Your request will be sent to admin for review.</Text>
              </View>

              <View style={[styles.sectionHeader, styles.transactionsHeader, isWebMobile && styles.transactionsHeaderWebMobile]}>
                <Text style={[styles.sectionTitle, isWebMobile && styles.sectionTitleWebMobile]} numberOfLines={1}>
                  Recent Transactions
                </Text>
                <TouchableOpacity
                  style={[styles.downloadBtn, isWebMobile && styles.downloadBtnWebMobile]}
                  onPress={handleDownloadTransactions}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="download" size={16} color="#f97316" style={{ marginRight: 4 }} />
                  <Text style={styles.downloadBtnText}>Download</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.searchContainer, isWebMobile && styles.searchContainerWebMobile]}>
                <Ionicons
                  name="search"
                  size={18}
                  color="#f97316"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Order ID"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {isWebMobile ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRowWebMobile}
                >
                  {TXN_STATUS_FILTERS.map((f) => (
                    <FilterChip
                      key={f.value}
                      label={f.label}
                      active={statusFilter === f.value}
                      onPress={() => setStatusFilter(f.value)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.filterRow}>
                  {TXN_STATUS_FILTERS.map((f) => (
                    <FilterChip
                      key={f.value}
                      label={f.label}
                      active={statusFilter === f.value}
                      onPress={() => setStatusFilter(f.value)}
                    />
                  ))}
                </View>
              )}
            </View>
          }
        />

        <View style={[styles.footer, isWebMobile && styles.footerWebMobile]}>
          <TouchableOpacity
            style={[styles.mainButton, isWebMobile && styles.mainButtonWebMobile, !!errorMsg && styles.disabledButton]}
            onPress={handleInitialRequest}
            disabled={!!errorMsg}
          >
            {isRequesting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.mainButtonText}>Request Payout</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#f97316" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {sharedModals}
      </KeyboardAvoidingView>
    </ScreenRoot>
  );
}


// ─── DESKTOP STYLES ───────────────────────────────────────────────────────────

const desktopStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    minHeight: "100%" as any,
  },

  // Top Nav
  topNav: {
    height: 64,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    shadowColor: "#1a2b5e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  navBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  navBackText: {
    fontSize: 14,
    color: "#1a2b5e",
    fontWeight: "600",
  },
  navCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  navRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  navBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  navBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1a2b5e",
  },

  // Hero
  hero: {
    backgroundColor: "#151D4F",
    paddingHorizontal: 32,
    paddingVertical: 28,
    paddingBottom: 68,
    borderRadius: 22,
    marginHorizontal: 2,
    marginTop: 12,
  },
  heroInner: {
    width: "100%" as any,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    maxWidth: 460,
    lineHeight: 22,
  },
  heroBalance: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 20,
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroBalanceLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "600",
    marginBottom: 4,
  },
  heroBalanceValue: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
  },

  // Scroll body
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 28,
    marginTop: -42,
    zIndex: 10,
    marginHorizontal: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#1a2b5e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },

  // Two-column layout
  twoCol: {
    flexDirection: "row",
    gap: 24,
    alignItems: "flex-start",
  },
  formPanel: {
    width: 420,
    flexShrink: 0,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    gap: 22,
    shadowColor: "#1a2b5e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  txnPanel: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    shadowColor: "#1a2b5e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },

  // Panel header
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  panelIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#fff7ed",
    justifyContent: "center",
    alignItems: "center",
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },

  // Field block
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },

  // Bank cards
  bankRow: {
    gap: 10,
  },
  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  bankCardActive: {
    backgroundColor: "#1a2b5e",
    borderColor: "#1a2b5e",
  },
  bankCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  bankIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff7ed",
    justifyContent: "center",
    alignItems: "center",
  },
  bankIconBoxActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  bankName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  bankNameActive: {
    color: "#fff",
  },
  bankAcc: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  bankAccActive: {
    color: "rgba(255,255,255,0.7)",
  },
  defaultBadge: {
    backgroundColor: "rgba(249,115,22,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f97316",
  },

  // Input
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#f8fafc",
    height: 52,
  },
  inputRowError: {
    borderColor: "#ef4444",
    backgroundColor: "#fff5f5",
  },
  inputIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fff7ed",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },

  // Verified amount card
  verifiedCard: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  verifiedLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  verifiedValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#22c55e",
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22c55e",
  },

  // Security row
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
  },
  securityText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
    lineHeight: 18,
  },

  // Submit button
  submitBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#1a2b5e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#1a2b5e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: "#cbd5e1",
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  // Search & filter
  searchRow: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterChipActive: {
    backgroundColor: "#1a2b5e",
    borderColor: "#1a2b5e",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  filterChipTextActive: {
    color: "#fff",
  },

  // Transaction list
  txnList: {
    gap: 10,
  },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    gap: 14,
  },
  txnStatusDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  txnRowInfo: {
    flex: 1,
  },
  txnOrderId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  txnDate: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 3,
  },
  txnRowRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  txnAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  txnStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  txnStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  helpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff7ed",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  helpBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f97316",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "600",
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff4ec",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fed7aa",
    cursor: "pointer" as any,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f97316",
  },
});


// ─── ORIGINAL MOBILE STYLES (untouched) ──────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  safeWeb: {
    width: "100%",
    minWidth: 0,
    backgroundColor: "#F7F8FC",
  },
  listContentWeb: {
    paddingHorizontal: 0,
  },
  listContentWebMobile: {
    paddingBottom: 100,
  },
  listHeader: {
    padding: 20,
  },
  listHeaderWebMobile: {
    padding: 0,
    paddingBottom: 8,
  },
  webMobileIntro: {
    marginBottom: 12,
    paddingTop: 4,
  },
  webMobileTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  webMobileSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  statsGridWebMobile: {
    gap: 8,
    marginBottom: 4,
    ...Platform.select({
      web: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      },
    }),
  },
  statCardSpanWebMobile: {
    width: "100%",
    ...Platform.select({
      web: {
        gridColumn: "1 / -1",
      },
    }),
  },
  statCardWebMobile: {
    width: "100%",
    flex: 1,
    minWidth: 0,
    padding: 10,
    borderRadius: 12,
    alignSelf: "stretch",
    ...Platform.select({
      web: {
        width: "100%",
        maxWidth: "none",
      },
    }),
  },
  statIconWrapWebMobile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    marginRight: 8,
  },
  statTextWebMobile: {
    flex: 1,
    minWidth: 0,
  },
  statLabelWebMobile: {
    fontSize: 11,
  },
  statValueWebMobile: {
    fontSize: 13,
  },

  header: {
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },

  subGreeting: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  statCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    width: 160,
  },

  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(26,43,94,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  statLabel: {
    fontSize: 12,
    color: "#64748b",
  },

  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 2,
  },

  balanceCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    marginTop: 20,
    marginBottom: 20,
  },

  balanceLabel: {
    fontSize: 14,
    color: THEME_COLOR,
    fontWeight: "600",
  },

  balanceValue: {
    fontSize: 38,
    fontWeight: "800",
    color: THEME_COLOR,
    marginTop: 10,
  },
  balanceCardWebMobile: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 14,
  },
  balanceValueWebMobile: {
    fontSize: 28,
  },

  sectionHeader: {
    marginBottom: 14,
    marginTop: 10,
  },
  sectionHeaderWebMobile: {
    marginBottom: 10,
    marginTop: 6,
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  transactionsHeaderWebMobile: {
    flexWrap: "wrap",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  sectionTitleWebMobile: {
    fontSize: 16,
    flex: 1,
    minWidth: 0,
  },

  bankRowWebMobile: {
    flexDirection: "row",
    gap: 8,
    alignItems: "stretch",
  },
  bankCardWebMobile: {
    flex: 1,
    minWidth: 0,
    width: "auto",
    padding: 12,
    borderRadius: 14,
  },
  bankEditCardWebMobile: {
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: "#f97316",
  },
  bankNameWebMobile: {
    fontSize: 12,
    marginTop: 8,
  },
  bankAccWebMobile: {
    fontSize: 11,
  },

  bankCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    width: 150,
  },

  selectedBankCard: {
    backgroundColor: THEME_COLOR,
  },

  bankName: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
    color: "#0f172a",
  },

  bankAcc: {
    fontSize: 12,
    marginTop: 4,
    color: "#64748b",
  },

  formContainer: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 24,
    marginTop: 20,
  },
  formContainerWebMobile: {
    padding: 14,
    borderRadius: 14,
    marginTop: 14,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 12,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#f1f5f9",
  },

  inputError: {
    borderColor: "#ef4444",
  },

  orderInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },

  orderAmountCard: {
    marginTop: 16,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  orderAmountLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },

  orderAmountValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#22c55e",
    marginTop: 4,
  },

  orderVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 30,
  },

  orderVerifiedText: {
    marginLeft: 6,
    color: "#22c55e",
    fontWeight: "700",
    fontSize: 12,
  },

  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },

  securityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(71,85,105,0.05)",
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  securityCardWebMobile: {
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },

  securityText: {
    marginLeft: 10,
    color: "#475569",
    fontSize: 12,
    flex: 1,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 10,
  },
  searchContainerWebMobile: {
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    marginTop: 6,
  },

  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: "#0f172a",
  },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterRowWebMobile: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
    marginBottom: 16,
  },

  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
  },

  activeFilterChip: {
    backgroundColor: THEME_COLOR,
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },

  activeFilterChipText: {
    color: "#fff",
  },

  txnItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
  },
  txnItemWebMobile: {
    marginHorizontal: 0,
    padding: 12,
    borderRadius: 14,
  },

  txnIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  txnInfo: {
    flex: 1,
  },

  txnTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },

  txnDate: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },

  txnRight: {
    alignItems: "flex-end",
  },

  txnAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },

  txnStatus: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "rgba(248,250,252,0.95)",
  },
  footerWebMobile: {
    padding: 12,
    paddingBottom: 16,
    ...Platform.select({
      web: {
        backgroundColor: "rgba(247,248,252,0.98)",
      },
    }),
  },

  mainButton: {
    backgroundColor: THEME_COLOR,
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  mainButtonWebMobile: {
    height: 52,
    borderRadius: 14,
  },

  disabledButton: {
    backgroundColor: "#cbd5e1",
  },

  mainButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginRight: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    padding: 20,
    alignItems: "center",
  },

  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 30,
    alignItems: "center",
    maxWidth: 400,          // ← add this
    width: "100%" as any,  // ← add this
    alignSelf: "center",   // ← add this
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },

  modalSub: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },

  otpInput: {
    width: "100%",
    height: 60,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    textAlign: "center",
    fontSize: 32,
    fontWeight: "800",
    color: THEME_COLOR,
    marginTop: 20,
    marginBottom: 20,
    letterSpacing: 10,
  },

  verifyBtn: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: THEME_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },

  verifyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  cancelText: {
    marginTop: 16,
    color: "#64748b",
    fontWeight: "600",
  },

  successContent: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 30,
    alignItems: "center",
  },

  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#22c55e",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  doneBtn: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: THEME_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },

  doneBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  raiseTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26,43,94,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },

  raiseTicketText: {
    fontSize: 10,
    fontWeight: "700",
    color: THEME_COLOR,
    marginLeft: 4,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(249, 115, 22, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.2)",
  },
  downloadBtnWebMobile: {
    flexShrink: 0,
    paddingHorizontal: 8,
  },
  downloadBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f97316",
  },
});