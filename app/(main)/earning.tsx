import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import {
  MaterialIcons,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppHeader } from "@/components/common/AppHeader";
import { useEarningsData } from "@/hooks/useEarningsData";
import { fetchAnalyticsOverview, fetchAnalyticsSales, requestPayout } from "@/services/earningsApi";
import { fetchPayoutSummary, type PayoutSummary } from "@/services/payoutApi";

interface Transaction {
  id: string;
  title: string;
  amount: string;
  date: string;
  status: "Completed" | "Pending" | "Failed";
}

const transactionsFallback: Transaction[] = [];

export default function EarningsScreen() {
  const router = useRouter();
  const { data: earningsData, reload } = useEarningsData();
  const transactions: Transaction[] = (earningsData?.transactions ?? transactionsFallback).map((t) => ({
    id: String(t.id),
    title: t.title,
    amount: t.amount,
    date: t.date,
    status: (t.status === "Pending" || t.status === "Failed" ? t.status : "Completed") as Transaction["status"],
  }));
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("This Month");
  const [showBalance, setShowBalance] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState<"start" | "end" | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [downloadRange, setDownloadRange] = useState("last_month");

  const [showWithdrawFormModal, setShowWithdrawFormModal] = useState(false);
  const [showWithdrawOtpModal, setShowWithdrawOtpModal] = useState(false);
  const [showWithdrawSuccessModal, setShowWithdrawSuccessModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccessMessage, setWithdrawSuccessMessage] = useState("");

  const availableBalance = earningsData?.availableBalance ?? 0;
  const bankAccount = earningsData?.bankAccount;
  const bankName = bankAccount?.bankName?.trim() || "Linked bank account";
  const bankMasked = bankAccount?.accountNumberMasked?.trim() || "—";

  const breakdown = [
    { title: "Credits", percent: earningsData ? `${Math.round(Number(earningsData.totalCredits))}` : "0" },
    { title: "Debits", percent: earningsData ? `${Math.round(Number(earningsData.totalDebits))}` : "0" },
  ];

  const handleInitiateWithdrawal = () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError("Please enter a valid amount to withdraw.");
    } else if (amt > availableBalance) {
      setWithdrawError(`Amount exceeds available balance of ₹${availableBalance.toLocaleString()}`);
    } else {
      setWithdrawError("");
      setShowWithdrawFormModal(false);
      Alert.alert("OTP Sent", "Enter the OTP sent to your registered mobile number.");
      setTimeout(() => {
        setShowWithdrawOtpModal(true);
      }, 400);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      setOtpError("Please enter the OTP sent to your mobile.");
      return;
    }
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setOtpError("Invalid withdrawal amount.");
      return;
    }
    setIsWithdrawing(true);
    setOtpError("");
    try {
      const result = await requestPayout({
        amount: amt,
        otp,
        description: "Seller wallet withdrawal",
      });
      setWithdrawSuccessMessage(result.message || "Withdrawal request submitted successfully.");
      setOtp("");
      setShowWithdrawOtpModal(false);
      setTimeout(() => {
        setShowWithdrawSuccessModal(true);
      }, 300);
      await reload();
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : "Withdrawal failed. Please try again.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const filters = useMemo(
    () => ["Today", "7 Days", "This Month", "Last Month", "Custom Range"],
    []
  );

  const [filterRevenue, setFilterRevenue] = useState("₹0");
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
  const [avgOrderValue, setAvgOrderValue] = useState<number | null>(null);

  useEffect(() => {
    fetchPayoutSummary().then(setPayoutSummary).catch(() => setPayoutSummary(null));
    fetchAnalyticsOverview("month").then((row) => setAvgOrderValue(row.aov ?? null)).catch(() => setAvgOrderValue(null));
  }, []);

  useEffect(() => {
    const periodMap: Record<string, string> = {
      "Today": "day",
      "7 Days": "week",
      "This Month": "month",
      "Last Month": "month",
      "Custom Range": "month",
    };
    fetchAnalyticsSales(periodMap[selectedFilter] ?? "month")
      .then((row) => setFilterRevenue(row.salesFormatted || "₹0"))
      .catch(() => setFilterRevenue("₹0"));
  }, [selectedFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    reload().finally(() => setRefreshing(false));
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionLeft}>
        <View style={styles.transactionIcon}>
          <FontAwesome5 name="wallet" size={16} color="#f97316" />
        </View>

        <View>
          <Text style={styles.transactionTitle}>{item.title}</Text>
          <Text style={styles.transactionDate}>{item.date}</Text>
        </View>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.transactionAmount}>{item.amount}</Text>
        <Text
          style={[
            styles.status,
            item.status === "Completed"
              ? styles.completed
              : item.status === "Pending"
              ? styles.pending
              : styles.failed,
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
  );

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Earnings" subtitle="Your monetization analytics overview" showBackButton />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* FILTERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.activeFilter,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.activeFilterText,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
            
          ))}
        </ScrollView>
        {selectedFilter === "Custom Range" && (
          <View style={styles.customDateContainer}>
            <View style={styles.dateRow}>
              <TouchableOpacity 
                style={styles.datePart} 
                onPress={() => setShowPicker("start")}
              >
                <Text style={styles.dateLabel}>Start Date</Text>
                <Text style={styles.dateValue}>{startDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              
              <View style={styles.dateDivider} />
              
              <TouchableOpacity 
                style={styles.datePart} 
                onPress={() => setShowPicker("end")}
              >
                <Text style={styles.dateLabel}>End Date</Text>
                <Text style={styles.dateValue}>{endDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>

            {showPicker && (
              <DateTimePicker
                value={showPicker === "start" ? startDate : endDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowPicker(null);
                  if (selectedDate) {
                    if (showPicker === "start") setStartDate(selectedDate);
                    else setEndDate(selectedDate);
                  }
                }}
              />
            )}
          </View>
        )}

        {/* TOTAL REVENUE */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueTop}>
            <View>
              <Text style={styles.revenueLabel}>Total Revenue</Text>

              <Text style={styles.revenueValue}>
                {showBalance ? filterRevenue : "XXXXXX"}
              </Text>
            </View>

            <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
              <Ionicons
                name={showBalance ? "eye-outline" : "eye-off-outline"}
                size={24}
                color="#f97316"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.growthContainer}>
            <View>
              <Text style={styles.smallText}>Current Month</Text>
              <Text style={styles.smallValue}>
                {showBalance ? `₹${availableBalance.toLocaleString("en-IN")}` : "XXXXXX"}
              </Text>
            </View>

            <View style={styles.growthBadge}>
              <MaterialIcons
                name="trending-up"
                size={18}
                color="#f97316"
              />
              <Text style={styles.growthText}>—</Text>
            </View>
          </View>
        </View>

        {/* PAYOUT CARDS */}
        <View style={styles.payoutContainer}>
          <View style={styles.payoutCard}>
            <View style={styles.payoutIconPending}>
              <Ionicons name="time-outline" size={20} color="#f97316" />
            </View>

            <Text style={styles.payoutTitle}>Pending Payin</Text>
            <Text style={styles.payoutAmount}>
              {showBalance ? `₹${Math.round(payoutSummary?.pendingAmount ?? 0).toLocaleString("en-IN")}` : "XXXXXX"}
            </Text>
            <Text style={styles.payoutDate}>Awaiting settlement</Text>
          </View>

          <View style={styles.payoutCard}>
            <View style={styles.payoutIconCompleted}>
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color="#f97316"
              />
            </View>

            <Text style={styles.payoutTitle}>Completed</Text>
            <Text style={styles.payoutAmount}>
              {showBalance ? `₹${Math.round(earningsData?.totalCredits ?? 0).toLocaleString("en-IN")}` : "XXXXXX"}
            </Text>
            <Text style={styles.payoutDate}>Successfully transferred</Text>
          </View>
        </View>

        {/* BREAKDOWN */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
        </View>

        {breakdown.map((item, index) => (
          <View key={index} style={styles.breakdownCard}>
            <View>
              <Text style={styles.breakdownTitle}>{item.title}</Text>
              <Text style={styles.breakdownSub}>Revenue Contribution</Text>
            </View>

            <Text style={styles.breakdownPercent}>{item.percent}</Text>
          </View>
        ))}

        {/* WITHDRAWAL */}
        <View style={styles.withdrawCard}>
          <View>
            <Text style={styles.withdrawTitle}>Linked Bank Account</Text>
            <Text style={styles.withdrawSub}>{earningsData?.bankAccount?.accountNumberMasked ?? "No bank linked"}</Text>
          </View>

          <TouchableOpacity 
            style={styles.withdrawButton}
            onPress={() => setShowWithdrawFormModal(true)}
          >
            <Text style={styles.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* INSIGHTS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Insights</Text>
        </View>

        <View style={styles.insightsGrid}>
          <View style={styles.insightCard}>
            <Text style={styles.insightValue}>{filterRevenue}</Text>
            <Text style={styles.insightLabel}>Period Sales</Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightValue}>₹{Math.round(payoutSummary?.thisMonthEarnings ?? 0).toLocaleString("en-IN")}</Text>
            <Text style={styles.insightLabel}>This Month</Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightValue}>—</Text>
            <Text style={styles.insightLabel}>Conversion</Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightValue}>
              {avgOrderValue != null ? `₹${Math.round(avgOrderValue).toLocaleString("en-IN")}` : "—"}
            </Text>
            <Text style={styles.insightLabel}>Avg Order</Text>
          </View>
        </View>

        {/* TRANSACTIONS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity 
            style={styles.downloadBtn} 
            onPress={() => setShowDownloadModal(true)}
          >
            <MaterialCommunityIcons name="download" size={20} color="#f97316" />
          </TouchableOpacity>
        </View>

        <FlatList
          nestedScrollEnabled
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </ScrollView>

      {/* DOWNLOAD MODAL */}
      <Modal visible={showDownloadModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.downloadModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Download History</Text>
              <TouchableOpacity onPress={() => setShowDownloadModal(false)}>
                <Ionicons name="close" size={24} color="#f97316" />
              </TouchableOpacity>
            </View>

            <View style={styles.rangeOptions}>
              {[
                { label: "Last 24 Hours", value: "24h" },
                { label: "Last 1 Week", value: "1w" },
                { label: "Last 1 Month", value: "1m" },
                { label: "Last 1 Year", value: "1y" },
                { label: "Custom Range", value: "custom" },
              ].map((opt) => (
                <TouchableOpacity 
                  key={opt.value} 
                  style={[styles.rangeBtn, downloadRange === opt.value && styles.rangeBtnActive]}
                  onPress={() => setDownloadRange(opt.value)}
                >
                  <Text style={[styles.rangeText, downloadRange === opt.value && styles.rangeTextActive]}>
                    {opt.label}
                  </Text>
                  {downloadRange === opt.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#f97316" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {downloadRange === "custom" && (
              <View style={styles.modalCustomDate}>
                <TouchableOpacity style={styles.datePickerPart} onPress={() => setShowPicker("start")}>
                  <Text style={styles.datePickerLabel}>Start Date</Text>
                  <Text style={styles.datePickerValue}>{startDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <View style={styles.datePickerDivider} />
                <TouchableOpacity style={styles.datePickerPart} onPress={() => setShowPicker("end")}>
                  <Text style={styles.datePickerLabel}>End Date</Text>
                  <Text style={styles.datePickerValue}>{endDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={styles.mainDownloadBtn}
              onPress={() => {
                setShowDownloadModal(false);
                setTimeout(() => setShowSuccessModal(true), 500);
              }}
            >
              <LinearGradient colors={["#1a2b5edc", "#2d448c"]} style={styles.gradientBtn}>
                <MaterialCommunityIcons name="file-download-outline" size={20} color="#f97316" />
                <Text style={styles.mainDownloadBtnText}>Generate Report</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL (SweetAlert Style) */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconOuter}>
              <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.successIconInner}>
                <Ionicons name="checkmark" size={40} color="#f97316" />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Download Ready!</Text>
            <Text style={styles.successSub}>Your transaction report has been generated and saved to your device.</Text>
            <TouchableOpacity style={styles.successCloseBtn} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.successCloseBtnText}>Great, thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WITHDRAW FORM MODAL */}
      <Modal visible={showWithdrawFormModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.formHeaderTitleRow}>
                <Ionicons name="shield-checkmark" size={24} color="#f97316" style={{ marginRight: 8 }} />
                <Text style={styles.formModalTitle}>Secure Withdrawal</Text>
              </View>
              <TouchableOpacity onPress={() => {
                setShowWithdrawFormModal(false);
                setWithdrawAmount("");
                setWithdrawError("");
              }}>
                <Ionicons name="close" size={24} color="#f97316" />
              </TouchableOpacity>
            </View>

            {/* AVAILABLE BALANCE PILL */}
            <View style={styles.balanceInfoCard}>
              <View style={styles.balanceInfoLeft}>
                <Ionicons name="wallet-outline" size={20} color="#f97316" />
                <Text style={styles.balanceLabel}>Available Balance</Text>
              </View>
              <Text style={styles.balanceValue}>₹{availableBalance.toLocaleString()}</Text>
            </View>

            {/* WITHDRAW AMOUNT INPUT */}
            <Text style={styles.inputLabel}>Withdrawal Amount</Text>
            <View style={[styles.amountInputContainer, withdrawError ? styles.amountInputError : null]}>
              <Text style={styles.amountPrefix}>₹</Text>
              <TextInput
                style={styles.amountInputField}
                value={withdrawAmount}
                onChangeText={(text) => {
                  setWithdrawAmount(text);
                  if (withdrawError) setWithdrawError("");
                }}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {withdrawError ? (
              <Text style={styles.withdrawErrorText}>{withdrawError}</Text>
            ) : null}

            {/* QUICK AMOUNT CHIPS */}
            <View style={styles.quickChipsRow}>
              {[1000, 5000, 10000].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={styles.quickChip}
                  onPress={() => {
                    setWithdrawAmount(val.toString());
                    setWithdrawError("");
                  }}
                >
                  <Text style={styles.quickChipText}>+ ₹{val.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.quickChip, styles.quickChipAll]}
                onPress={() => {
                  setWithdrawAmount(availableBalance.toString());
                  setWithdrawError("");
                }}
              >
                <Text style={styles.quickChipTextAll}>Withdraw All</Text>
              </TouchableOpacity>
            </View>

            {/* DESTINATION BANK CARD */}
            <Text style={styles.inputLabel}>Transfer Destination</Text>
            <View style={styles.bankDestCard}>
              <View style={styles.bankDestLeft}>
                <View style={styles.bankIconBg}>
                  <Ionicons name="business" size={18} color="#f97316" />
                </View>
                <View>
                  <Text style={styles.bankDestName}>{bankName}</Text>
                  <Text style={styles.bankDestAcc}>{bankMasked}</Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle" size={22} color="#f97316" />
            </View>

            {/* SECURITY TIPS */}
            <View style={styles.securityTipCard}>
              <Ionicons name="information-circle" size={18} color="#f97316" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.securityTipText}>
                To authorize this transaction, a secure OTP verification code will be sent to your registered mobile number.
              </Text>
            </View>

            {/* CTA BUTTON */}
            <TouchableOpacity
              style={styles.initiateBtn}
              onPress={handleInitiateWithdrawal}
            >
              <LinearGradient colors={["#1a2b5edc", "#2d448c"]} style={styles.gradientBtn}>
                <Ionicons name="lock-closed" size={18} color="#f97316" style={{ marginRight: 6 }} />
                <Text style={styles.initiateBtnText}>Proceed to Secure Verification</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WITHDRAW OTP MODAL */}
      <Modal visible={showWithdrawOtpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.otpTitle}>Verify OTP</Text>
              <TouchableOpacity onPress={() => {
                setShowWithdrawOtpModal(false);
                setOtp("");
                setOtpError("");
              }}>
                <Ionicons name="close" size={24} color="#f97316" />
              </TouchableOpacity>
            </View>
            <Text style={styles.otpSub}>
              Enter the OTP sent to your registered mobile number.
            </Text>
            <TextInput
              style={[styles.otpInput, otpError ? styles.otpInputError : null]}
              value={otp}
              onChangeText={(text) => {
                setOtp(text);
                if (otpError) setOtpError("");
              }}
              placeholder="000 000"
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor="#94a3b8"
            />
            {otpError ? (
              <Text style={styles.otpErrorText}>{otpError}</Text>
            ) : null}
            <View style={styles.otpBtnRow}>
              <TouchableOpacity 
                style={styles.otpCancelBtn} 
                onPress={() => {
                  setShowWithdrawOtpModal(false);
                  setOtp("");
                  setOtpError("");
                }}
              >
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.otpVerifyBtn}
                onPress={() => void handleVerifyOtp()}
                disabled={isWithdrawing}
              >
                <LinearGradient colors={["#1a2b5edc", "#2d448c"]} style={styles.gradientBtn}>
                  <Text style={styles.otpVerifyBtnText}>{isWithdrawing ? "Processing…" : "Verify & Proceed"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* WITHDRAW SUCCESS MODAL */}
      <Modal visible={showWithdrawSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconOuter}>
              <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.successIconInner}>
                <Ionicons name="checkmark" size={40} color="#f97316" />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Withdrawal Successful!</Text>
            <Text style={styles.successSub}>
              {withdrawSuccessMessage || (
                <>
                  A payout of <Text style={{ fontWeight: "800", color: "#0f172a" }}>₹{parseFloat(withdrawAmount || "0").toLocaleString()}</Text> has been submitted. Funds will be credited to {bankName} ({bankMasked}) after processing.
                </>
              )}
            </Text>
            <TouchableOpacity 
              style={styles.successCloseBtn} 
              onPress={() => {
                setShowWithdrawSuccessModal(false);
                setWithdrawAmount("");
              }}
            >
              <Text style={styles.successCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showPicker && (
        <DateTimePicker
          value={showPicker === "start" ? startDate : endDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowPicker(null);
            if (selectedDate) {
              if (showPicker === "start") setStartDate(selectedDate);
              else setEndDate(selectedDate);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#E4EBFA",
  },
  container: {
    flex: 1,
    backgroundColor: "#E4EBFA",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a2b5edc",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },

  subHeading: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  profileText: {
    color: "#fff",
    fontWeight: "700",
  },

  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: "#e2e8f0",
    marginRight: 10,
  },

  activeFilter: {
    backgroundColor: "#1a2b5edc",
  },

  filterText: {
    color: "#334155",
    fontWeight: "600",
  },

  activeFilterText: {
    color: "#fff",
  },

  revenueCard: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  revenueTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  revenueLabel: {
    color: "#1a2b5edc",
    fontSize: 14,
    fontWeight: "600",
  },

  revenueValue: {
    color: "#1a2b5edc",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 10,
  },

  growthContainer: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  smallText: {
    color: "#1a2b5edc",
    opacity: 0.7,
    fontSize: 13,
  },

  smallValue: {
    color: "#1a2b5edc",
    fontWeight: "600",
    fontSize: 18,
    marginTop: 4,
  },

  growthBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2b5edc",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 30
    ,
  },

  growthText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "700",
  },

  payoutContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  payoutCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
  },

  payoutIconPending: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  payoutIconCompleted: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  payoutTitle: {
    color: "#64748b",
    fontSize: 13,
  },

  payoutAmount: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },

  payoutDate: {
    color: "#94a3b8",
    marginTop: 6,
    fontSize: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },

  viewAll: {
    color: "#1a2b5edc",
    fontWeight: "700",
  },

  breakdownCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  breakdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },

  breakdownSub: {
    color: "#94a3b8",
    marginTop: 4,
  },

  breakdownPercent: {
    color: "#1a2b5edc",
    fontSize: 18,
    fontWeight: "800",
  },

  withdrawCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  withdrawTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },

  withdrawSub: {
    marginTop: 6,
    color: "#64748b",
  },

  withdrawButton: {
    backgroundColor: "#1a2b5edc",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
  },

  withdrawText: {
    color: "#fff",
    fontWeight: "700",
  },

  insightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  insightCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },

  insightValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },

  insightLabel: {
    color: "#64748b",
    marginTop: 8,
  },

  transactionCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  customDateContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePart: {
    flex: 1,
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a2b5edc",
  },
  dateDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 10,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a2b5edc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  transactionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },

  transactionDate: {
    marginTop: 4,
    color: "#94a3b8",
    fontSize: 12,
  },

  transactionAmount: {
    fontWeight: "800",
    color: "#0f172a",
    fontSize: 16,
  },

  status: {
    marginTop: 6,
    fontWeight: "700",
    fontSize: 12,
  },

  completed: {
    color: "#22c55e",
  },

  pending: {
    color: "#f59e0b",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  downloadModalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  rangeOptions: {
    gap: 10,
    marginBottom: 20,
  },
  rangeBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  rangeBtnActive: {
    borderColor: "#1a2b5edc",
    backgroundColor: "rgba(26,43,94,0.05)",
  },
  rangeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  rangeTextActive: {
    color: "#1a2b5edc",
  },
  modalCustomDate: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  datePickerPart: {
    flex: 1,
    alignItems: "center",
  },
  datePickerLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
  datePickerValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a2b5edc",
  },
  datePickerDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#cbd5e1",
  },
  mainDownloadBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  mainDownloadBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  successModalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  successIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(34,197,94,0.1)",
    padding: 10,
    marginBottom: 20,
  },
  successIconInner: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },
  successSub: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  successCloseBtn: {
    backgroundColor: "#1a2b5edc",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
  },
  successCloseBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  failed: {
    color: "#ef4444",
  },
  downloadBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(26,43,94,0.05)",
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
    color: "#1a2b5edc",
    marginLeft: 4,
  },
  otpModalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
    textAlign: "center",
  },
  otpSub: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  otpInput: {
    width: "100%",
    height: 56,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#0f172a",
    marginBottom: 10,
    backgroundColor: "#f8fafc",
  },
  otpInputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  otpErrorText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 15,
    textAlign: "center",
  },
  otpBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 10,
  },
  otpCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  otpCancelText: {
    color: "#64748b",
    fontWeight: "700",
    fontSize: 15,
  },
  otpVerifyBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  otpVerifyBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  formModalContent: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  formHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  formModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  balanceInfoCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(26,43,94,0.04)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 10,
  },
  balanceInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a2b5edc",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: "#f8fafc",
    marginBottom: 10,
  },
  amountInputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  amountPrefix: {
    fontSize: 20,
    fontWeight: "700",
    color: "#475569",
    marginRight: 6,
  },
  amountInputField: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    height: "100%",
  },
  withdrawErrorText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 15,
  },
  quickChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
  },
  quickChipAll: {
    backgroundColor: "rgba(26,43,94,0.06)",
    borderColor: "#1a2b5edc",
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  quickChipTextAll: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1a2b5edc",
  },
  bankDestCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  bankDestLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bankIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a2b5edc",
    alignItems: "center",
    justifyContent: "center",
  },
  bankDestName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  bankDestAcc: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  securityTipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  securityTipText: {
    fontSize: 11,
    color: "#0369a1",
    lineHeight: 16,
    flex: 1,
  },
  initiateBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  initiateBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
