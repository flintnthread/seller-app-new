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
    orderId: "ORD10293",
    amount: 2400,
    date: "2024-05-12T10:00:00Z",
    status: "Completed",
    type: "Payout",
  },
  {
    id: "TXN2",
    orderId: "ORD10294",
    amount: 1500,
    date: "2024-05-11T14:30:00Z",
    status: "Pending",
    type: "Payout",
  },
  {
    id: "TXN3",
    orderId: "ORD10295",
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
      <MaterialCommunityIcons
        name={icon as any}
        size={20}
        color="#f97316"
      />
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
    <Text
      style={[
        styles.filterChipText,
        active && styles.activeFilterChipText,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default function EnhancedPayoutRequest() {
  const router = useRouter();

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
      const matchesSearch = t.orderId
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const handleInitialRequest = () => {
    if (errorMsg) {
      Alert.alert("Error", errorMsg);
      return;
    }

    Alert.alert(
      "OTP Sent",
      "OTP sent to your registered mobile number"
    );

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

          <Text style={styles.txnDate}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.txnRight}>
          <Text style={styles.txnAmount}>
            ₹{item.amount.toLocaleString()}
          </Text>

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

          {(item.status === "Pending" ||
            item.status === "Failed") && (
            <TouchableOpacity
              style={styles.raiseTicketBtn}
              onPress={() => router.push("/(main)/helpsupport")}
            >
              <MaterialCommunityIcons
                name="ticket-outline"
                size={12}
                color="#f97316"
              />

              <Text style={styles.raiseTicketText}>Help</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.safe}>
      {Platform.OS !== 'web' && (
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 15 }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#f1eeec"
          />
        </TouchableOpacity>

        <View>
          <Text style={styles.greeting}>Payout Request</Text>

          <Text style={styles.subGreeting}>
            Manage your earnings & withdrawals
          </Text>
        </View>

        <TouchableOpacity style={styles.profileBtn}>
          <MaterialCommunityIcons
            name="account"
            size={24}
            color="#f97316"
          />
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
                <StatCard
                  label="Lifetime"
                  value="₹1,25,400"
                  icon="history"
                />

                <StatCard
                  label="This Month"
                  value="₹18,920"
                  icon="calendar-month"
                />

                <StatCard
                  label="Highest"
                  value="₹25,000"
                  icon="trending-up"
                />
              </ScrollView>

              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>
                  Available Balance
                </Text>

                <Text style={styles.balanceValue}>
                  ₹{availableBalance.toLocaleString()}
                </Text>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Select Bank
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {MOCK_BANKS.map((bank) => (
                  <TouchableOpacity
                    key={bank.id}
                    style={[
                      styles.bankCard,
                      selectedBank === bank.id &&
                        styles.selectedBankCard,
                    ]}
                    onPress={() => setSelectedBank(bank.id)}
                  >
                    <MaterialCommunityIcons
                      name="bank"
                      size={24}
                      color={
                        selectedBank === bank.id
                          ? "#fff"
                          : "#f97316"
                      }
                    />

                    <Text
                      style={[
                        styles.bankName,
                        selectedBank === bank.id && {
                          color: "#fff",
                        },
                      ]}
                    >
                      {bank.bankName}
                    </Text>

                    <Text
                      style={[
                        styles.bankAcc,
                        selectedBank === bank.id && {
                          color: "#fff",
                        },
                      ]}
                    >
                      {bank.accountNumber}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>
                  Enter Order ID
                </Text>

                <View
                  style={[
                    styles.inputRow,
                    !!errorMsg &&
                      orderId.length > 0 &&
                      styles.inputError,
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
                    placeholder="Example: ORD10293"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                  />
                </View>

                {!!amount && (
                  <View style={styles.orderAmountCard}>
                    <View>
                      <Text style={styles.orderAmountLabel}>
                        Order Amount
                      </Text>

                      <Text style={styles.orderAmountValue}>
                        ₹{Number(amount).toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.orderVerifiedBadge}>
                      <MaterialIcons
                        name="verified"
                        size={18}
                        color="#f97316"
                      />

                      <Text style={styles.orderVerifiedText}>
                        Verified
                      </Text>
                    </View>
                  </View>
                )}

                {!!errorMsg && orderId.length > 0 && (
                  <Text style={styles.errorText}>
                    {errorMsg}
                  </Text>
                )}
              </View>

              <View style={styles.securityCard}>
                <MaterialCommunityIcons
                  name="shield-lock-outline"
                  size={20}
                  color="#f97316"
                />

                <Text style={styles.securityText}>
                  Withdrawal requires OTP verification.
                </Text>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Recent Transactions
                </Text>
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
                {[
                  "All",
                  "Completed",
                  "Pending",
                  "Failed",
                ].map((f) => (
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
            style={[
              styles.mainButton,
              !!errorMsg && styles.disabledButton,
            ]}
            onPress={handleInitialRequest}
            disabled={!!errorMsg}
          >
            {isRequesting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.mainButtonText}>
                  Request Payout
                </Text>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#f97316"
                />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Modal visible={showOtpModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                OTP Verification
              </Text>

              <Text style={styles.modalSub}>
                Enter OTP sent to your registered mobile
                number
              </Text>

              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={4}
              />

              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={verifyOtpAndRequest}
              >
                <Text style={styles.verifyBtnText}>
                  Verify & Continue
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowOtpModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.successContent}>
              <View style={styles.successIconWrap}>
                <MaterialCommunityIcons
                  name="check-bold"
                  size={40}
                  color="#f97316"
                />
              </View>

              <Text style={styles.modalTitle}>
                Withdrawal Successful
              </Text>

              <Text style={styles.modalSub}>
                Your payout request has been submitted
                successfully.
              </Text>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.doneBtnText}>
                  Great, Thanks!
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
  },

  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 30,
    alignItems: "center",
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



