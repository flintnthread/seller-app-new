import React, { useCallback, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/FontAwesome";
import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";
import { useSweetAlert } from "@/components/common/SweetAlert";
import { hydrateSellerSession } from "@/lib/api/sellerSession";
import {
  createRegistrationPaymentOrder,
  getApiErrorMessage,
  verifyRegistrationPayment,
} from "@/services/sellerProfileApi";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

const T = {
  navy: "#0F1F4B",
  orange: "#F97316",
  white: "#FFFFFF",
  bg: "#F4F6FB",
  textDark: "#0A1533",
  textSoft: "#6B7A9E",
  success: "#16A34A",
};

export default function SubscriptionRenewalScreen() {
  const router = useRouter();
  const { showSuccess, showError, SweetAlertHost } = useSweetAlert();
  const { loading, subscriptionActive, paymentPending, subscriptionExpiresAt, totalAmount, refresh } =
    useSubscriptionStatus();
  const [busy, setBusy] = useState(false);

  const loadRazorpayScript = useCallback(async () => {
    if (Platform.OS !== "web") return false;
    if (window.Razorpay) return true;
    return await new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const handleRenewPayment = useCallback(async () => {
    setBusy(true);
    try {
      if (Platform.OS !== "web") {
        throw new Error("Subscription renewal payment is currently supported on web.");
      }
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Could not load Razorpay checkout. Please refresh and try again.");
      }
      await hydrateSellerSession();
      const order = await createRegistrationPaymentOrder();
      if (order.paid) {
        await refresh();
        showSuccess("Your annual subscription is already active.", "Subscription Active");
        router.replace("/(main)/dashboard");
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const RazorpayCtor = window.Razorpay!;
        const razorpay = new RazorpayCtor({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "Flint & Thread",
          description: "Annual seller subscription renewal",
          order_id: order.orderId,
          handler: async (response: Record<string, string>) => {
            try {
              await verifyRegistrationPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              await refresh();
              showSuccess("Subscription renewed successfully. Invoice sent to your email.", "Payment Successful");
              router.replace("/(main)/dashboard");
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          theme: { color: T.orange },
        });
        razorpay.on("payment.failed", () => reject(new Error("Payment failed. Please try again.")));
        razorpay.open();
      });
    } catch (e) {
      showError(getApiErrorMessage(e, "Could not complete renewal payment."));
    } finally {
      setBusy(false);
    }
  }, [loadRazorpayScript, refresh, router, showError, showSuccess]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={T.navy} />
      </View>
    );
  }

  if (subscriptionActive && !paymentPending) {
    return (
      <View style={s.centered}>
        <Icon name="check-circle" size={48} color={T.success} />
        <AppText style={s.title}>Subscription Active</AppText>
        <AppText style={s.sub}>
          {subscriptionExpiresAt
            ? `Valid until ${new Date(subscriptionExpiresAt).toLocaleDateString()}`
            : "Your annual subscription is active."}
        </AppText>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace("/(main)/dashboard")}>
          <AppText style={s.primaryBtnText}>Go to Dashboard</AppText>
        </TouchableOpacity>
        {SweetAlertHost}
      </View>
    );
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={[T.navy, "#1A2F6A"]} style={s.header}>
        <SafeAreaView>
          <AppText style={s.headerTitle}>Subscription Renewal</AppText>
          <AppText style={s.headerSub}>Annual seller subscription — Rs 899 per annum</AppText>
        </SafeAreaView>
      </LinearGradient>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.card}>
          <View style={s.alertRow}>
            <Icon name="exclamation-triangle" size={18} color={T.orange} />
            <AppText style={s.alertText}>Payment Pending</AppText>
          </View>
          <AppText style={s.cardText}>
            Your annual seller subscription has expired
            {subscriptionExpiresAt
              ? ` on ${new Date(subscriptionExpiresAt).toLocaleDateString()}`
              : ""}
            . Renew now to restore dashboard access.
          </AppText>
          <View style={s.amountRow}>
            <AppText style={s.amountLabel}>Renewal amount (incl. GST)</AppText>
            <AppText style={s.amountValue}>Rs {totalAmount.toFixed(2)}</AppText>
          </View>
          <TouchableOpacity
            style={[s.primaryBtn, busy && { opacity: 0.7 }]}
            onPress={() => void handleRenewPayment()}
            disabled={busy}
          >
            <AppText style={s.primaryBtnText}>{busy ? "Processing..." : "Pay & Renew"}</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => router.push("/(main)/settingsModule")}>
            <AppText style={s.secondaryBtnText}>View invoices in Settings</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {SweetAlertHost}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: T.bg },
  header: { paddingBottom: 20 },
  headerTitle: { color: T.white, fontSize: 22, fontFamily: fontFamilies.bold, paddingHorizontal: 20, paddingTop: 12 },
  headerSub: { color: "#CBD5E1", fontSize: 13, paddingHorizontal: 20, marginTop: 6 },
  body: {
    paddingVertical: 20,
    paddingHorizontal: Platform.OS === "web" ? 0 : 20,
  },
  title: { fontSize: 20, fontFamily: fontFamilies.bold, color: T.textDark, marginTop: 16 },
  sub: { fontSize: 14, color: T.textSoft, marginTop: 8, textAlign: "center" },
  card: {
    backgroundColor: T.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  alertText: { color: T.orange, fontFamily: fontFamilies.semibold, fontSize: 16 },
  cardText: { color: T.textSoft, lineHeight: 22, marginBottom: 16 },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  amountLabel: { color: T.textDark },
  amountValue: { color: T.navy, fontFamily: fontFamilies.bold, fontSize: 18 },
  primaryBtn: {
    backgroundColor: T.orange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnText: { color: T.white, fontFamily: fontFamilies.semibold },
  secondaryBtn: { alignItems: "center", paddingVertical: 10 },
  secondaryBtnText: { color: T.navy, fontFamily: fontFamilies.medium },
});
