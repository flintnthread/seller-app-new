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
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  MaterialCommunityIcons,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";

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
  amount: number;
  date: string;
  status: "Completed" | "Pending" | "Failed";
  type: "Payout" | "Revenue";
}

const MOCK_BANKS: BankAccount[] = [
  {
    id: "1",
    bankName: "HDFC Bank",
    accountNumber: "•••• 2408",
    isDefault: true,
    isVerified: true,
  },
  {
    id: "2",
    bankName: "ICICI Bank",
    accountNumber: "•••• 8892",
    isDefault: false,
    isVerified: true,
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "TXN1",
    orderId: "FNT10293",
    amount: 2400,
    date: "2024-05-12T10:00:00Z",
    status: "Completed",
    type: "Payout",
  },
  {
    id: "TXN2",
    orderId: "FNT10294",
    amount: 1500,
    date: "2024-05-11T14:30:00Z",
    status: "Pending",
    type: "Payout",
  },
  {
    id: "TXN3",
    orderId: "FNT10295",
    amount: 800,
    date: "2024-05-10T09:15:00Z",
    status: "Failed",
    type: "Payout",
  },
];

const ORDER_DATABASE: Record<string, number> = {
  ORD10293: 2400,
  ORD10294: 1500,
  ORD10295: 800,
  ORD10296: 4200,
  ORD10297: 1200,
};

const THEME_COLOR = "#1a2b5edc";

// ─── SHARED SUB-COMPONENTS ────────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) => (
  <View style={styles.statCard}>
    <View style={styles.statIconWrap}>
      <MaterialCommunityIcons name={icon as any} size={20} color="#f97316" />
    </View>
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
  const isDesktop = Platform.OS === "web" && width >= 1024;

  const [selectedBank, setSelectedBank] = useState("1");
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [otp, setOtp] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const availableBalance = 12400;

  const handleOrderIdChange = (text: string) => {
    const cleaned = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    setOrderId(cleaned);
    if (ORDER_DATABASE[cleaned]) {
      setAmount(String(ORDER_DATABASE[cleaned]));
    } else {
      setAmount("");
    }
  };

  const validateAmount = () => {
    if (!orderId) return "Enter Order ID";
    if (!ORDER_DATABASE[orderId]) return "Invalid Order ID";
    const num = parseFloat(amount);
    if (isNaN(num)) return "Invalid Amount";
    if (num < 500) return "Minimum ₹500 required";
    if (num > availableBalance) return "Insufficient balance";
    return "";
  };

  const errorMsg = validateAmount();

  const filteredTransactions = useMemo(() => {
    return MOCK_TRANSACTIONS.filter((t) => {
      const matchesSearch = t.orderId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const handleInitialRequest = () => {
    if (errorMsg) {
      Alert.alert("Error", errorMsg);
      return;
    }
    Alert.alert("OTP Sent", "OTP sent to your registered mobile number");
    setShowOtpModal(true);
  };

  const verifyOtpAndRequest = () => {
    if (otp.length < 4) {
      Alert.alert("Invalid OTP", "Please enter valid 4 digit OTP");
      return;
    }
    setShowOtpModal(false);
    setIsRequesting(true);
    setTimeout(() => {
      setIsRequesting(false);
      setShowSuccessModal(true);
      setOrderId("");
      setAmount("");
      setOtp("");
    }, 2000);
  };

  const renderTransactionItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <View style={styles.txnItem}>
        <View style={styles.txnIconWrap}>
          <MaterialCommunityIcons
            name={
              item.status === "Completed"
                ? "check-circle"
                : item.status === "Pending"
                ? "clock-outline"
                : "alert-circle"
            }
            size={24}
            color="#f97316"
          />
        </View>
        <View style={styles.txnInfo}>
          <Text style={styles.txnTitle}>{item.orderId}</Text>
          <Text style={styles.txnDate}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.txnRight}>
          <Text style={styles.txnAmount}>₹{item.amount.toLocaleString()}</Text>
          <Text
            style={[
              styles.txnStatus,
              {
                color:
                  item.status === "Completed"
                    ? "#22c55e"
                    : item.status === "Pending"
                    ? "#f59e0b"
                    : "#ef4444",
              },
            ]}
          >
            {item.status}
          </Text>
          {(item.status === "Pending" || item.status === "Failed") && (
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
    ),
    []
  );

  // ─── SHARED MODALS ──────────────────────────────────────────────────────────
  const sharedModals = (
    <>
      <Modal visible={showOtpModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>OTP Verification</Text>
            <Text style={styles.modalSub}>Enter OTP sent to your registered mobile number</Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={4}
            />
            <TouchableOpacity style={styles.verifyBtn} onPress={verifyOtpAndRequest}>
              <Text style={styles.verifyBtnText}>Verify & Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowOtpModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successContent}>
            <View style={styles.successIconWrap}>
              <MaterialCommunityIcons name="check-bold" size={40} color="#f97316" />
            </View>
            <Text style={styles.modalTitle}>Withdrawal Successful</Text>
            <Text style={styles.modalSub}>Your payout request has been submitted successfully.</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.doneBtnText}>Great, Thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
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

        <ScrollView
          style={desktopStyles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={desktopStyles.scrollContent}
        >
          {/* Stats Row */}
          <View style={desktopStyles.statsRow}>
            <DesktopStatCard label="Lifetime Earnings" value="₹1,25,400" icon="history" accent="#1a2b5e" />
            <DesktopStatCard label="This Month" value="₹18,920" icon="calendar-month" accent="#f97316" />
            <DesktopStatCard label="Highest Payout" value="₹25,000" icon="trending-up" accent="#22c55e" />
            <DesktopStatCard label="Pending" value="₹1,500" icon="clock-outline" accent="#f59e0b" />
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
                  {MOCK_BANKS.map((bank) => (
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
              {!!amount && (
                <View style={desktopStyles.verifiedCard}>
                  <View>
                    <Text style={desktopStyles.verifiedLabel}>Order Amount</Text>
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
                  Withdrawal requires OTP verification via registered mobile number.
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
              <View style={desktopStyles.panelHeader}>
                <View style={desktopStyles.panelIconBox}>
                  <MaterialCommunityIcons name="history" size={18} color="#f97316" />
                </View>
                <Text style={desktopStyles.panelTitle}>Recent Transactions</Text>
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
                {["All", "Completed", "Pending", "Failed"].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[desktopStyles.filterChip, statusFilter === f && desktopStyles.filterChipActive]}
                    onPress={() => setStatusFilter(f)}
                  >
                    <Text
                      style={[
                        desktopStyles.filterChipText,
                        statusFilter === f && desktopStyles.filterChipTextActive,
                      ]}
                    >
                      {f}
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
                  filteredTransactions.map((item) => (
                    <View key={item.id} style={desktopStyles.txnRow}>
                      <View
                        style={[
                          desktopStyles.txnStatusDot,
                          {
                            backgroundColor:
                              item.status === "Completed"
                                ? "#22c55e18"
                                : item.status === "Pending"
                                ? "#f59e0b18"
                                : "#ef444418",
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            item.status === "Completed"
                              ? "check-circle"
                              : item.status === "Pending"
                              ? "clock-outline"
                              : "alert-circle"
                          }
                          size={20}
                          color={
                            item.status === "Completed"
                              ? "#22c55e"
                              : item.status === "Pending"
                              ? "#f59e0b"
                              : "#ef4444"
                          }
                        />
                      </View>
                      <View style={desktopStyles.txnRowInfo}>
                        <Text style={desktopStyles.txnOrderId}>{item.orderId}</Text>
                        <Text style={desktopStyles.txnDate}>
                          {new Date(item.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      <View style={desktopStyles.txnRowRight}>
                        <Text style={desktopStyles.txnAmount}>
                          ₹{item.amount.toLocaleString()}
                        </Text>
                        <View
                          style={[
                            desktopStyles.txnStatusBadge,
                            {
                              backgroundColor:
                                item.status === "Completed"
                                  ? "#22c55e18"
                                  : item.status === "Pending"
                                  ? "#f59e0b18"
                                  : "#ef444418",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              desktopStyles.txnStatusText,
                              {
                                color:
                                  item.status === "Completed"
                                    ? "#16a34a"
                                    : item.status === "Pending"
                                    ? "#d97706"
                                    : "#dc2626",
                              },
                            ]}
                          >
                            {item.status}
                          </Text>
                        </View>
                        {(item.status === "Pending" || item.status === "Failed") && (
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
                  ))
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
    <SafeAreaView style={styles.safe}>
      {Platform.OS !== "web" && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
            <Ionicons name="arrow-back" size={24} color="#f1eeec" />
          </TouchableOpacity>
          <View>
            <Text style={styles.greeting}>Payout Request</Text>
            <Text style={styles.subGreeting}>Manage your earnings & withdrawals</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <MaterialCommunityIcons name="account" size={24} color="#f97316" />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={
            <View style={{ padding: 20 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                <StatCard label="Lifetime" value="₹1,25,400" icon="history" />
                <StatCard label="This Month" value="₹18,920" icon="calendar-month" />
                <StatCard label="Highest" value="₹25,000" icon="trending-up" />
              </ScrollView>

              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceValue}>₹{availableBalance.toLocaleString()}</Text>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Select Bank</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {MOCK_BANKS.map((bank) => (
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
              </ScrollView>

              <View style={styles.formContainer}>
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

                {!!amount && (
                  <View style={styles.orderAmountCard}>
                    <View>
                      <Text style={styles.orderAmountLabel}>Order Amount</Text>
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

              <View style={styles.securityCard}>
                <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#f97316" />
                <Text style={styles.securityText}>Withdrawal requires OTP verification.</Text>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
              </View>

              <View style={styles.searchContainer}>
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

              <View style={styles.filterRow}>
                {["All", "Completed", "Pending", "Failed"].map((f) => (
                  <FilterChip
                    key={f}
                    label={f}
                    active={statusFilter === f}
                    onPress={() => setStatusFilter(f)}
                  />
                ))}
              </View>
            </View>
          }
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.mainButton, !!errorMsg && styles.disabledButton]}
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
    </SafeAreaView>
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
    backgroundColor: "#1a2b5e",
    paddingVertical: 32,
    paddingHorizontal: 48,
  },
  heroInner: {
    maxWidth: 1200,
    alignSelf: "center",
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
    maxWidth: 1200,
    width: "100%" as any,
    alignSelf: "center",
    paddingHorizontal: 48,
    paddingTop: 32,
    paddingBottom: 48,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 28,
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
});


// ─── ORIGINAL MOBILE STYLES (untouched) ──────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
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

  sectionHeader: {
    marginBottom: 14,
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
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

  mainButton: {
    backgroundColor: THEME_COLOR,
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
});