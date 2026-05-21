import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Linking,
  Image,
  Animated,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import { useRouter } from "expo-router";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FAQ {
  question: string;
  answer: string;
  iconName: string;
  iconColor: string;
  iconBg: string;
}

interface HelpTopic {
  label: string;
  color: string;
  bgColor: string;
  iconLib: "Ionicons" | "MaterialCommunityIcons" | "FontAwesome5";
  iconName: string;
  faqs: FAQ[];
}

type TicketStatus = "submitted" | "review" | "processing" | "approved";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  createdAt: Date;
  adminNote: string;
}

type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
};

// ── Design Tokens ──────────────────────────────────────────────────────────────

const C = {
  navy: "#1E3A6E",
  navyDeep: "#152D5A",
  navyLight: "#2A4F8F",
  orange: "#F97316",
  orangeLight: "#FB923C",
  orangeDeep: "#EA6000",
  orangePale: "#FFF3E8",
  orangeGlow: "rgba(249,115,22,0.13)",
  white: "#FFFFFF",
  cream: "#FAFAF8",
  lightGray: "#F4F6FB",
  softBlue: "#EEF3FF",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#6B7280",
};

const F = {
  regular: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  semiBold: "Outfit_600SemiBold",
  bold: "Outfit_700Bold",
  extraBold: "Outfit_800ExtraBold",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).substring(2, 9);
const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const formatDate = (date: Date) =>
  date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });

const BOT_RESPONSES = {

  orders:
    "To track or manage your orders, go to My Account → Orders. You can view order status, request a return, or download your invoice there. Need help with a specific order?",
  payments:
    "For payment issues, if a payment failed but was deducted, it usually auto-reverses in 5–7 business days. Want me to help you raise a dispute?",
  products:
    "Browse our full catalog in the Products section. Filter by category, size, or price. Tap 'Notify Me' on out-of-stock items!",
  account:
    "For account issues — login problems, profile updates, or password reset — go to Settings → Account.",
  delivery:
    "We deliver across India in 3–7 business days. Express delivery (1–2 days) is available in select cities.",
  human:
    "Connecting you to a human agent. You can also reach us on WhatsApp or at support@flintandthread.in.",
  default:
    "I'm not quite sure about that. Could you try one of the quick options below, or describe your issue in more detail?",
} as const;

//   orders: "You can check your orders in the Orders section.",
//   payments: "Payment and refund issues are handled within 3-5 business days.",
//   products: "You can manage products from the Products tab.",
//   account: "Please reset your password from Account Settings.",
//   delivery: "Track your shipment from the Orders page.",
//   human: "Connecting you to a support agent...",
//   default: "Sorry, I didn't understand your message.",
// };
// >>>>>>> 1259fc908c2225bfa778e27657a6a47347e6b273

function getBotReply(text: string): string {
  const l = text.toLowerCase();
  if (l.includes("order")) return BOT_RESPONSES.orders;
  if (l.includes("pay") || l.includes("refund")) return BOT_RESPONSES.payments;
  if (l.includes("product") || l.includes("item")) return BOT_RESPONSES.products;
  if (l.includes("account") || l.includes("login") || l.includes("password"))
    return BOT_RESPONSES.account;
  if (l.includes("deliver") || l.includes("ship") || l.includes("track"))
    return BOT_RESPONSES.delivery;
  if (l.includes("human") || l.includes("agent")) return BOT_RESPONSES.human;
  return BOT_RESPONSES.default;
}

// ── Ticket Status Config ───────────────────────────────────────────────────────

const TICKET_STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; color: string; bgColor: string; icon: string; step: number }
> = {
  submitted: { label: "Submitted", color: "#6B7280", bgColor: "#F3F4F6", icon: "paper-plane-outline", step: 1 },
  review: { label: "In Review", color: "#2563EB", bgColor: "#EFF6FF", icon: "eye-outline", step: 2 },
  processing: { label: "Processing", color: "#D97706", bgColor: "#FFFBEB", icon: "time-outline", step: 3 },
  approved: { label: "Approved", color: "#16A34A", bgColor: "#F0FDF4", icon: "checkmark-circle-outline", step: 4 },
};

// ── Admin Note Templates ──────────────────────────────────────────────────────

const ADMIN_NOTES: Record<TicketStatus, string> = {
  submitted:
    "✅ Your ticket has been received and logged in our system. A support specialist will review it shortly. Reference ID has been assigned — please keep this for future correspondence.",
  review:
    "🔍 Our support team is actively reviewing your issue. We may reach out for additional details if required. Expected review completion: 1–2 business days.",
  processing:
    "⚙️ Your issue is currently being investigated and actioned by our team. We're working to resolve this as quickly as possible. You'll be notified once a resolution is reached.",
  approved:
    "🎉 Great news! Your issue has been resolved and the ticket is now closed. If the problem persists or you have further questions, please raise a new ticket or contact us via live chat.",
};

const VIcon = ({
  lib, name, size, color,
}: {
  lib: HelpTopic["iconLib"]; name: string; size: number; color: string;
}) => {
  if (lib === "Ionicons")
    return <Ionicons name={name as any} size={size} color={color} />;
  if (lib === "MaterialCommunityIcons")
    return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
  return <FontAwesome5 name={name as any} size={size} color={color} />;
};

// ── Static Data ────────────────────────────────────────────────────────────────

const GENERAL_FAQS: FAQ[] = [
  {
    question: "How to add a product?",
    answer: "Go to your dashboard, tap Products, then tap the + button to add a new listing. Fill in the details and hit Save.",
    iconName: "add-circle-outline",
    iconColor: "#854F0B",
    iconBg: "#FAEEDA",
  },
  {
    question: "How to manage orders?",
    answer: "Visit the Orders section from the main menu. You can view, process, and update the status of each order from there.",
    iconName: "bag-handle-outline",
    iconColor: "#A32D2D",
    iconBg: "#FCEBEB",
  },
  {
    question: "When will I receive payments?",
    answer: "Payments are processed within 3–5 business days after order confirmation. Check the Payments tab for a detailed payout schedule.",
    iconName: "wallet-outline",
    iconColor: "#0F6E56",
    iconBg: "#E1F5EE",
  },
  {
    question: "How to update my store details?",
    answer: "Head to Settings → Store Profile. You can edit your store name, logo, contact details, and business info from there.",
    iconName: "storefront-outline",
    iconColor: C.navyLight,
    iconBg: C.softBlue,
  },
  {
    question: "How do I reset my password?",
    answer: "On the login screen, tap 'Forgot Password', enter your registered email, and follow the link sent to your inbox.",
    iconName: "lock-closed-outline",
    iconColor: "#7C3AED",
    iconBg: "#F5F3FF",
  },
];

const HELP_TOPICS: HelpTopic[] = [
  {
    label: "Account Issues",
    color: C.navyLight,
    bgColor: C.softBlue,
    iconLib: "Ionicons",
    iconName: "person-circle-outline",
    faqs: [
      { question: "How do I reset my password?", answer: "On the login screen, tap 'Forgot Password', enter your registered email, and follow the reset link sent to your inbox.", iconName: "lock-closed-outline", iconColor: "#7C3AED", iconBg: "#F5F3FF" },
      { question: "How do I update my profile information?", answer: "Go to Settings → Profile. You can update your name, phone number, email, and profile picture from there.", iconName: "person-outline", iconColor: C.navyLight, iconBg: C.softBlue },
      { question: "My account is suspended — what should I do?", answer: "Please contact our support team via Chat or Email. Account suspensions are reviewed within 1–2 business days.", iconName: "warning-outline", iconColor: "#D97706", iconBg: "#FFFBEB" },
      { question: "How do I delete my account?", answer: "Account deletion requests can be raised by contacting support@flintandthread.in. Note: this action is irreversible.", iconName: "trash-outline", iconColor: "#DC2626", iconBg: "#FEF2F2" },
      { question: "How do I change my registered email?", answer: "Go to Settings → Account → Change Email. You'll need to verify your new email address via an OTP.", iconName: "mail-outline", iconColor: "#0F6E56", iconBg: "#E1F5EE" },
    ],
  },
  {
    label: "Payments",
    color: "#0F6E56",
    bgColor: "#E1F5EE",
    iconLib: "Ionicons",
    iconName: "card-outline",
    faqs: [
      { question: "When will I receive my payout?", answer: "Payouts are processed every Monday. Funds are credited to your linked bank account within 2 business days after processing.", iconName: "calendar-outline", iconColor: "#0F6E56", iconBg: "#E1F5EE" },
      { question: "Why is my payment showing as Pending?", answer: "Payments stay Pending until the order is confirmed as delivered. Once confirmed, the amount moves to your Available Balance.", iconName: "time-outline", iconColor: "#D97706", iconBg: "#FFFBEB" },
      { question: "How do I add or change my bank account?", answer: "Go to Payments → Bank & Verification → Edit. Enter your new account details and save. Re-verification may be required.", iconName: "card-outline", iconColor: "#0F6E56", iconBg: "#E1F5EE" },
      { question: "What is platform commission?", answer: "Flint & Thread charges a 5% commission on each completed sale. This is deducted before your net earnings are calculated.", iconName: "pie-chart-outline", iconColor: C.navyLight, iconBg: C.softBlue },
      { question: "How do I download my payment statement?", answer: "Go to Payments → Reports & Statements → Payment Statement PDF. You can download monthly statements from there.", iconName: "download-outline", iconColor: "#7C3AED", iconBg: "#F5F3FF" },
      { question: "What happens if a payment fails?", answer: "Failed payments are usually due to bank issues. The amount is refunded to the buyer automatically within 5–7 business days.", iconName: "close-circle-outline", iconColor: "#DC2626", iconBg: "#FEF2F2" },
    ],
  },
  {
    label: "Orders",
    color: "#A32D2D",
    bgColor: "#FCEBEB",
    iconLib: "Ionicons",
    iconName: "bag-handle-outline",
    faqs: [
      { question: "How do I view my recent orders?", answer: "Tap Orders in the bottom navigation bar. You can filter by All, Pending, Shipped, or Cancelled tabs.", iconName: "list-outline", iconColor: "#A32D2D", iconBg: "#FCEBEB" },
      { question: "How do I mark an order as shipped?", answer: "Open the order detail page, tap 'Update Status', and select Shipped. You can also add a tracking number.", iconName: "cube-outline", iconColor: "#0F6E56", iconBg: "#E1F5EE" },
      { question: "A buyer wants to cancel their order — what should I do?", answer: "You can accept the cancellation from the Order Detail page. Once accepted, any payment is refunded to the buyer automatically.", iconName: "close-circle-outline", iconColor: "#DC2626", iconBg: "#FEF2F2" },
      { question: "How do I handle a return request?", answer: "Go to the relevant order, tap 'Return Request', and follow the steps. Our team will mediate if needed.", iconName: "return-down-back-outline", iconColor: "#D97706", iconBg: "#FFFBEB" },
      { question: "Why is my order status not updating?", answer: "Try refreshing the Orders screen. If the issue persists, please raise a support ticket with the order ID.", iconName: "refresh-outline", iconColor: C.navyLight, iconBg: C.softBlue },
    ],
  },
  {
    label: "Products",
    color: "#854F0B",
    bgColor: "#FAEEDA",
    iconLib: "Ionicons",
    iconName: "storefront-outline",
    faqs: [
      { question: "How do I add a new product?", answer: "Tap the + FAB button on the dashboard or go to Products → Add Product. Fill in title, price, photos, and stock count.", iconName: "add-circle-outline", iconColor: "#854F0B", iconBg: "#FAEEDA" },
      { question: "How do I edit an existing product?", answer: "Go to Products, tap the product you want to edit, then tap the Edit button on the product detail page.", iconName: "create-outline", iconColor: C.navyLight, iconBg: C.softBlue },
      { question: "How do I mark a product as out of stock?", answer: "Open the product, tap Edit, set the stock count to 0, and save. It will automatically show as Out of Stock to buyers.", iconName: "alert-circle-outline", iconColor: "#DC2626", iconBg: "#FEF2F2" },
      { question: "Can I list products in multiple categories?", answer: "Currently each product can be assigned one primary category. Multi-category tagging is on our roadmap.", iconName: "grid-outline", iconColor: "#7C3AED", iconBg: "#F5F3FF" },
      { question: "Why is my product not showing in search?", answer: "Make sure the product is set to Active and has at least one photo. New listings can take up to 30 minutes to appear in search.", iconName: "search-outline", iconColor: "#0F6E56", iconBg: "#E1F5EE" },
      { question: "How many products can I list?", answer: "Verified sellers can list up to 500 products. Complete your KYC to unlock the full product limit.", iconName: "layers-outline", iconColor: "#854F0B", iconBg: "#FAEEDA" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS MODAL  (sweet alert)
// ─────────────────────────────────────────────────────────────────────────────

const SuccessModal: React.FC<{
  visible: boolean;
  ticketTitle: string;
  onViewStatus: () => void;
  onClose: () => void;
}> = ({ visible, ticketTitle, onViewStatus, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      checkAnim.setValue(0);
      confettiAnim.setValue(0);
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(checkAnim, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
          Animated.timing(confettiAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [visible]);

  const checkScale = checkAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.3, 1] });
  const confettiY = confettiAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });

  const CONFETTI_COLORS = ["#F97316", "#1E3A6E", "#16A34A", "#7C3AED", "#F97316"];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={sm.overlay}>
        <Animated.View
          style={[
            sm.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* ── Confetti dots ── */}
          <Animated.View
            style={[
              sm.confettiRow,
              { opacity: confettiAnim, transform: [{ translateY: confettiY }] },
            ]}
          >
            {CONFETTI_COLORS.map((color, i) => (
              <View
                key={i}
                style={[
                  sm.confettiDot,
                  {
                    backgroundColor: color,
                    width: i % 2 === 0 ? 8 : 11,
                    height: i % 2 === 0 ? 8 : 11,
                    borderRadius: i % 2 === 0 ? 4 : 3,
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* ── Animated check circle ── */}
          <View style={sm.iconRing}>
            <View style={sm.iconCircle}>
              <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                <Ionicons name="checkmark" size={38} color="#fff" />
              </Animated.View>
            </View>
          </View>

          {/* ── Title ── */}
          <Text style={[sm.title, { fontFamily: F.extraBold }]}>Ticket Submitted!</Text>

          {/* ── Subtitle ── */}
          <Text style={[sm.sub, { fontFamily: F.regular }]}>
            Your ticket{"\n"}
            <Text style={[sm.ticketName, { fontFamily: F.semiBold }]}>
              &quot;{ticketTitle}&quot;
            </Text>
            {"\n"}has been raised successfully.
          </Text>

          {/* ── Info pill ── */}
          <View style={sm.infoPill}>
            <Ionicons name="information-circle-outline" size={15} color={C.navyLight} />
            <Text style={[sm.infoText, { fontFamily: F.regular }]}>
              Track its progress under{" "}
              <Text style={{ fontFamily: F.semiBold }}>My Ticket Status</Text>
            </Text>
          </View>

          {/* ── Primary CTA ──
          <TouchableOpacity
            style={sm.primaryBtn}
            onPress={onViewStatus}
            activeOpacity={0.85}
          >
            <Ionicons name="ticket-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={[sm.primaryBtnTxt, { fontFamily: F.semiBold }]}>
              View Ticket Status
            </Text>
          </TouchableOpacity> */}

          {/* ── Ghost dismiss ── */}
          <TouchableOpacity style={sm.ghostBtn} onPress={onClose} activeOpacity={0.75}>
            <Text style={[sm.ghostBtnTxt, { fontFamily: F.medium }]}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TICKET STATUS PANEL
// ─────────────────────────────────────────────────────────────────────────────

const TicketStatusPanel: React.FC<{ tickets: Ticket[]; onClose: () => void }> = ({ tickets, onClose }) => {
  const STEPS: TicketStatus[] = ["submitted", "review", "processing", "approved"];
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);

  return (
    <View style={s.topicPanel}>
      <View style={s.topicPanelHeader}>
        <View style={[s.topicPanelIconWrap, { backgroundColor: "#F0F4FF" }]}>
          <Ionicons name="ticket-outline" size={18} color={C.navy} />
        </View>
        <Text style={[s.topicPanelTitle, { fontFamily: F.bold }]}>My Ticket Status</Text>
        <TouchableOpacity onPress={onClose} style={s.topicPanelClose} activeOpacity={0.7}>
          <Ionicons name="close" size={16} color={C.textMid} />
        </TouchableOpacity>
      </View>

      {tickets.length === 0 ? (
        <View style={s.card}>
          <View style={s.emptyTickets}>
            <Ionicons name="ticket-outline" size={40} color="#D1D9E6" />
            <Text style={[s.emptyTicketsTitle, { fontFamily: F.semiBold }]}>No tickets yet</Text>
            <Text style={[s.emptyTicketsSub, { fontFamily: F.regular }]}>
              Tickets you raise will appear here with their latest status.
            </Text>
          </View>
        </View>
      ) : (
        tickets.map((ticket) => {
          const cfg = TICKET_STATUS_CONFIG[ticket.status];
          const currentStep = cfg.step;
          const noteOpen = openNoteId === ticket.id;

          return (
            <View key={ticket.id} style={[s.card, { marginBottom: 10 }]}>
              <View style={s.ticketCardInner}>

                {/* ── Ticket Header ── */}
                <View style={s.ticketCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.ticketCardTitle, { fontFamily: F.semiBold }]} numberOfLines={1}>
                      {ticket.title}
                    </Text>
                    <Text style={[s.ticketCardDate, { fontFamily: F.regular }]}>
                      Raised on {formatDate(ticket.createdAt)}
                    </Text>
                  </View>
                  <View style={s.ticketHeaderRight}>
                    <TouchableOpacity
                      style={[s.wandBtn, noteOpen && s.wandBtnActive]}
                      onPress={() => setOpenNoteId(prev => prev === ticket.id ? null : ticket.id)}
                      activeOpacity={0.75}
                    >
                      <MaterialCommunityIcons
                        name="magic-staff"
                        size={15}
                        color={noteOpen ? C.white : C.navy}
                      />
                      <Text style={[s.wandBtnTxt, { fontFamily: F.semiBold }, noteOpen && { color: C.white }]}>
                        View More
                      </Text>
                    </TouchableOpacity>
                    <View style={[s.ticketStatusBadge, { backgroundColor: cfg.bgColor }]}>
                      <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                      <Text style={[s.ticketStatusBadgeTxt, { fontFamily: F.semiBold, color: cfg.color }]}>
                        {cfg.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ── Admin Note Panel ── */}
                {noteOpen && (
                  <View style={s.adminNoteBox}>
                    <View style={s.adminNoteHeader}>
                      <View style={s.adminNoteAvatarWrap}>
                        <MaterialCommunityIcons name="shield-account" size={14} color={C.white} />
                      </View>
                      <Text style={[s.adminNoteLabel, { fontFamily: F.semiBold }]}>Admin Reply</Text>
                      <View style={[s.adminStatusChip, { backgroundColor: cfg.bgColor }]}>
                        <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
                        <Text style={[s.adminStatusChipTxt, { fontFamily: F.semiBold, color: cfg.color }]}>
                          {cfg.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.adminNoteText, { fontFamily: F.regular }]}>
                      {ticket.adminNote}
                    </Text>
                    <View style={s.adminNoteFooter}>
                      <Ionicons name="time-outline" size={11} color={C.textLight} />
                      <Text style={[s.adminNoteTime, { fontFamily: F.regular }]}>
                        {formatDate(ticket.createdAt)} · Flint & Thread Support Team
                      </Text>
                    </View>
                  </View>
                )}

                {/* ── Progress Steps ── */}
                <View style={s.ticketStepsRow}>
                  {STEPS.map((step, idx) => {
                    const stepCfg = TICKET_STATUS_CONFIG[step];
                    const isCompleted = currentStep > stepCfg.step;
                    const isActive = currentStep === stepCfg.step;
                    const isLast = idx === STEPS.length - 1;

                    return (
                      <View key={step} style={s.ticketStepItem}>
                        <View style={s.ticketStepDotRow}>
                          <View
                            style={[
                              s.ticketStepDot,
                              isCompleted && s.ticketStepDotDone,
                              isActive && { backgroundColor: stepCfg.color, borderColor: stepCfg.color },
                              !isCompleted && !isActive && s.ticketStepDotPending,
                            ]}
                          >
                            {isCompleted ? (
                              <Ionicons name="checkmark" size={10} color={C.white} />
                            ) : isActive ? (
                              <View style={s.ticketStepDotInner} />
                            ) : null}
                          </View>
                          {!isLast && (
                            <View
                              style={[
                                s.ticketStepLine,
                                isCompleted ? s.ticketStepLineDone : s.ticketStepLinePending,
                              ]}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            s.ticketStepLabel,
                            { fontFamily: isActive ? F.semiBold : F.regular },
                            isActive && { color: stepCfg.color },
                            isCompleted && { color: "#16A34A" },
                            !isCompleted && !isActive && { color: C.textLight },
                          ]}
                          numberOfLines={1}
                        >
                          {stepCfg.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>

              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => {
  const d0 = useRef(new Animated.Value(0)).current;
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 270, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 270, useNativeDriver: true }),
          Animated.delay(540),
        ])
      );
    Animated.parallel([anim(d0, 0), anim(d1, 135), anim(d2, 270)]).start();
  }, []);

  return (
    <View style={cs.typingRow}>
      <View style={cs.botAvatar}>
        <Text style={[cs.botAvatarTxt, { fontFamily: F.extraBold }]}>F</Text>
      </View>
      <View style={cs.typingBubble}>
        {[d0, d1, d2].map((d, i) => (
          <Animated.View key={i} style={[cs.typingDot, { transform: [{ translateY: d }] }]} />
        ))}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAT BUBBLE
// ─────────────────────────────────────────────────────────────────────────────

const ChatBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.sender === "user";
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(isUser ? 14 : -14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        cs.msgRow,
        isUser ? cs.msgRowUser : cs.msgRowBot,
        { opacity: fade, transform: [{ translateX: slide }] },
      ]}
    >
      {!isUser && (
        <View style={cs.botAvatar}>
          <Text style={[cs.botAvatarTxt, { fontFamily: F.extraBold }]}>F</Text>
        </View>
      )}
      <View style={{ maxWidth: "75%" }}>
        <View style={[cs.bubble, isUser ? cs.bubbleUser : cs.bubbleBot]}>
          <Text style={[cs.bubbleTxt, isUser ? cs.bubbleTxtUser : cs.bubbleTxtBot, { fontFamily: F.regular }]}>
            {msg.text}
          </Text>
        </View>
        <Text style={[cs.ts, isUser ? cs.tsUser : cs.tsBot, { fontFamily: F.regular }]}>
          {formatTime(msg.timestamp)}
        </Text>
      </View>
      {isUser && (
        <View style={cs.userAvatar}>
          <Text style={[cs.userAvatarTxt, { fontFamily: F.bold }]}>U</Text>
        </View>
      )}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LIVE CHAT MODAL
// ─────────────────────────────────────────────────────────────────────────────

const LiveChatModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const WELCOME: ChatMessage = {
    id: genId(),
    text: "Hi 👋 Welcome to Flint & Thread support!\nHow can I help you today?",
    sender: "bot",
    timestamp: new Date(),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(700)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 700, duration: 230, useNativeDriver: true }).start();
    }
  }, [visible]);

  const scrollToBottom = () =>
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);

  const addMsg = (text: string, sender: "user" | "bot") => {
    setMessages(prev => [...prev, { id: genId(), text, sender, timestamp: new Date() }]);
    scrollToBottom();
  };

  const simulateReply = (userText: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply = getBotReply(userText);
      addMsg(reply, "bot");
      if (reply === BOT_RESPONSES.human) setShowEscalate(true);
    }, 900 + Math.random() * 500);
  };

  const sendMessage = (text = inputText) => {
    const t = text.trim();
    if (!t) return;
    addMsg(t, "user");
    setInputText("");
    simulateReply(t);
  };

  const handleQuick = (
    key: keyof typeof BOT_RESPONSES,
    label: string
  ) => {
    addMsg(label, "user");

    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);

      addMsg(BOT_RESPONSES[key as keyof typeof BOT_RESPONSES], "bot");
      if (key === "human") setShowEscalate(true);
      // =======

      //       addMsg(BOT_RESPONSES[key], "bot");

      //       if (key === "human") {
      //         setShowEscalate(true);
      //       }
      // >>>>>>> 1259fc908c2225bfa778e27657a6a47347e6b273
    }, 1000);
  };

  const restartChat = () => {
    setMessages([{ id: genId(), text: "Chat restarted! How can I help you? 😊", sender: "bot", timestamp: new Date() }]);
    setShowEscalate(false);
    setIsTyping(false);
  };

  const QUICK_REPLIES: {
    key: keyof typeof BOT_RESPONSES;
    label: string;
  }[] = [
      { key: "orders", label: "📦 Orders" },
      { key: "payments", label: "💳 Payments" },
      { key: "products", label: "🛍️ Products" },
      { key: "account", label: "👤 Account" },
      { key: "delivery", label: "🚚 Delivery" },
      { key: "human", label: "🙋 Talk to Human" },
    ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={cs.overlay}>
        <Animated.View style={[cs.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Header */}
          <View style={cs.header}>
            <View style={cs.headerLeft}>
              <View style={cs.logo}>
                <Text style={[cs.logoTxt, { fontFamily: F.extraBold }]}>F&T</Text>
              </View>
              <View>
                <Text style={[cs.headerTitle, { fontFamily: F.bold }]}>Support Chat</Text>
                <View style={cs.onlineRow}>
                  <View style={cs.onlineDot} />
                  <Text style={[cs.onlineTxt, { fontFamily: F.regular }]}>Online · replies in minutes</Text>
                </View>
              </View>
            </View>
            <View style={cs.headerActions}>
              <TouchableOpacity style={cs.headerBtn} onPress={restartChat} activeOpacity={0.7}>
                <Ionicons name="refresh" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={cs.headerBtn} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={({ item }) => <ChatBubble msg={item} />}
            contentContainerStyle={cs.msgList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
            onContentSizeChange={scrollToBottom}
          />

          {/* Quick Replies */}
          <View style={cs.quickWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cs.quickScroll}>
              {QUICK_REPLIES.map(qr => (
                <TouchableOpacity
                  key={qr.key}
                  style={[cs.quickChip, qr.key === "human" && cs.quickChipHuman]}
                  onPress={() => handleQuick(qr.key, qr.label)}
                  activeOpacity={0.7}
                >
                  <Text style={[cs.quickChipTxt, qr.key === "human" && cs.quickChipTxtHuman, { fontFamily: F.semiBold }]}>
                    {qr.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Escalate Banner */}
          {showEscalate && (
            <View style={cs.escalateBanner}>
              <TouchableOpacity style={cs.escalateBtn} onPress={() => Linking.openURL("https://wa.me/919063499092")} activeOpacity={0.8}>
                <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                <Text style={[cs.escalateBtnTxt, { fontFamily: F.semiBold }]}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cs.escalateBtn} onPress={() => Linking.openURL("mailto:support@flintandthread.in")} activeOpacity={0.8}>
                <Ionicons name="mail-outline" size={14} color={C.navyLight} />
                <Text style={[cs.escalateBtnTxt, { fontFamily: F.semiBold }]}>Email Us</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[cs.escalateBtn, cs.escalateBtnCall]} onPress={() => Linking.openURL("tel:9063499092")} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={14} color="#27AE60" />
                <Text style={[cs.escalateBtnTxt, { fontFamily: F.semiBold }]}>Call Us</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={cs.inputRow}>
              <TextInput
                style={[cs.input, { fontFamily: F.regular }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message…"
                placeholderTextColor={C.textLight}
                multiline
                returnKeyType="send"
                onSubmitEditing={() => sendMessage()}
              />
              <TouchableOpacity
                style={[cs.sendBtn, !inputText.trim() && cs.sendBtnOff]}
                onPress={() => sendMessage()}
                disabled={!inputText.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FAQ COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const FAQItem = ({ faq, isLast }: { faq: FAQ; isLast: boolean }) => {
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleOpen = () => {
    Animated.timing(rotateAnim, {
      toValue: open ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setOpen(v => !v);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={[s.faqItem, !isLast && s.borderBottom]}>
      <TouchableOpacity activeOpacity={0.7} style={s.faqQuestion} onPress={toggleOpen}>
        <View style={[s.faqIconBadge, { backgroundColor: faq.iconBg }]}>
          <Ionicons name={faq.iconName as any} size={15} color={faq.iconColor} />
        </View>
        <Text style={[s.faqQText, { fontFamily: F.medium }]}>{faq.question}</Text>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="chevron-down" size={16} color={C.textLight} />
        </Animated.View>
      </TouchableOpacity>
      {open && (
        <View style={s.faqAnswerWrap}>
          <View style={s.faqAnswerAccent} />
          <View style={{ flex: 1 }}>
            <Text style={[s.faqAnswer, { fontFamily: F.regular }]}>{faq.answer}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const TopicFAQPanel: React.FC<{ topic: HelpTopic; onClose: () => void }> = ({ topic, onClose }) => (
  <View style={s.topicPanel}>
    <View style={s.topicPanelHeader}>
      <View style={[s.topicPanelIconWrap, { backgroundColor: topic.bgColor }]}>
        <VIcon lib={topic.iconLib} name={topic.iconName} size={18} color={topic.color} />
      </View>
      <Text style={[s.topicPanelTitle, { fontFamily: F.bold }]}>{topic.label}</Text>
      <TouchableOpacity onPress={onClose} style={s.topicPanelClose} activeOpacity={0.7}>
        <Ionicons name="close" size={16} color={C.textMid} />
      </TouchableOpacity>
    </View>
    <View style={s.card}>
      {topic.faqs.map((faq, i) => (
        <FAQItem key={i} faq={faq} isLast={i === topic.faqs.length - 1} />
      ))}
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// STAR RATING
// ─────────────────────────────────────────────────────────────────────────────

const StarRating = ({ rating, onRate }: { rating: number; onRate: (n: number) => void }) => (
  <View style={s.starsRow}>
    {[1, 2, 3, 4, 5].map(n => (
      <TouchableOpacity key={n} onPress={() => onRate(n)} activeOpacity={0.8}>
        <Ionicons name={n <= rating ? "star" : "star-outline"} size={30} color={n <= rating ? C.orange : "#D1D9E6"} />
      </TouchableOpacity>
    ))}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const HelpSupportScreen = ({ navigation }: { navigation?: any }) => {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  const [search, setSearch] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [activeTopic, setActiveTopic] = useState<HelpTopic | string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  // ── Sweet alert state ────────────────────────────────────────────────────
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState("");

  // ── Validation error states ──────────────────────────────────────────────
  const [issueTitleError, setIssueTitleError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);

  if (!fontsLoaded) return null;

  const filteredFaqs = GENERAL_FAQS.filter(f =>
    f.question.toLowerCase().includes(search.toLowerCase())
  );

  // ── Contact options ──────────────────────────────────────────────────────
  type ContactType = "chat" | "email" | "call";

  const contactOptions: { type: ContactType; label: string; sub: string; action: () => void }[] = [
    { type: "chat", label: "Chat with Support", sub: "Live Chat · Typically replies in minutes", action: () => setChatVisible(true) },
    { type: "email", label: "Email Support", sub: "support@flintandthread.in", action: () => Linking.openURL("mailto:support@flintandthread.in") },
    { type: "call", label: "Call Support", sub: "Mon–Sun, 9 AM – 6 PM", action: () => Linking.openURL("tel:9063499092") },
  ];

  // ── Ticket Submit ────────────────────────────────────────────────────────
  const handleTicketSubmit = () => {
    const titleEmpty = !issueTitle.trim();
    const descEmpty = !description.trim();

    setIssueTitleError(titleEmpty);
    setDescriptionError(descEmpty);

    if (titleEmpty || descEmpty) return;

    const DEMO_STATUSES: TicketStatus[] = ["submitted", "review", "processing", "approved"];
    const randomStatus: TicketStatus =
      DEMO_STATUSES[Math.floor(Math.random() * DEMO_STATUSES.length)] as TicketStatus;
    const newTicket: Ticket = {
      id: genId(),
      title: issueTitle.trim(),
      description: description.trim(),
      status: randomStatus,
      createdAt: new Date(),
      adminNote: ADMIN_NOTES[randomStatus],
    };

    setTickets(prev => [newTicket, ...prev]);
    setSubmittedTitle(newTicket.title);

    // Clear form
    setIssueTitle("");
    setDescription("");
    setUploadedImage(null);
    setIssueTitleError(false);
    setDescriptionError(false);

    // Show sweet alert instead of Alert.alert
    setSuccessModalVisible(true);
    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketSubmitted(false);
    }, 5000);
  };

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library in Settings."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });


    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets?.[0];

      if (!result.canceled && asset) {
        setUploadedImage(asset.uri);
      }
    }

  };

  const handleFeedbackSubmit = () => {
    if (!rating) { Alert.alert("Rating Required", "Please select a star rating before submitting."); return; }
    setFeedbackSubmitted(true);
    setTimeout(() => { setFeedbackSubmitted(false); setRating(0); setFeedback(""); }, 3000);
  };

  // ── Contact Row ──────────────────────────────────────────────────────────
  const ContactRow = ({ option, isLast }: { option: (typeof contactOptions)[0]; isLast: boolean }) => {
    const bgMap: Record<ContactType, string> = { chat: C.softBlue, email: "#E1F5EE", call: C.orangePale };
    const iconMap: Record<ContactType, { name: string; color: string }> = {
      chat: { name: "chatbubble-ellipses-outline", color: C.navy },
      email: { name: "mail-outline", color: "#27AE60" },
      call: { name: "call-outline", color: C.orange },
    };
    const ic = iconMap[option.type];

    return (
      <TouchableOpacity activeOpacity={0.7} style={[s.contactRow, !isLast && s.borderBottom]} onPress={option.action}>
        <View style={[s.contactIconWrap, { backgroundColor: bgMap[option.type] }]}>
          <Ionicons name={ic.name as any} size={20} color={ic.color} />
        </View>
        <View style={s.contactText}>
          <Text style={[s.contactLabel, { fontFamily: F.semiBold }]}>{option.label}</Text>
          <Text style={[s.contactSub, { fontFamily: F.regular }]}>{option.sub}</Text>
        </View>
        {option.type === "chat" ? (
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={[s.liveBadgeTxt, { fontFamily: F.semiBold }]}>Live</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={C.textLight} />
        )}
      </TouchableOpacity>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />

      {/* ── Live Chat Modal ── */}
      <LiveChatModal visible={chatVisible} onClose={() => setChatVisible(false)} />

      {/* ── Sweet Alert Success Modal ── */}
      <SuccessModal
        visible={successModalVisible}
        ticketTitle={submittedTitle}
        onViewStatus={() => {
          setSuccessModalVisible(false);
          setActiveTopic("tickets");
        }}
        onClose={() => setSuccessModalVisible(false)}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { fontFamily: F.bold }]}>Help & Support</Text>
        <View style={s.headerIconWrap}>
          <Ionicons name="help-circle-outline" size={22} color={C.orange} />
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Navy Banner */}
        <View style={s.navyBanner}>
          <View style={s.bannerIconWrap}>
            <Ionicons name="headset-outline" size={24} color={C.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { fontFamily: F.semiBold }]}>Need help right away?</Text>
            <Text style={[s.bannerSub, { fontFamily: F.regular }]}>Live chat · typically replies in minutes</Text>
          </View>
          <TouchableOpacity style={s.bannerBtn} onPress={() => setChatVisible(true)} activeOpacity={0.85}>
            <Text style={[s.bannerBtnTxt, { fontFamily: F.semiBold }]}>Chat now</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.section}>
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={17} color={C.textLight} style={s.searchIcon} />
            <TextInput
              style={[s.searchInput, { fontFamily: F.regular }]}
              placeholder="Search your issue..."
              placeholderTextColor={C.textLight}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={17} color={C.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* General FAQs */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <View style={[s.sectionLabelPill, { backgroundColor: "#FFF3E8" }]}>
              <Ionicons name="help-buoy-outline" size={14} color={C.orange} />
              <Text style={[s.sectionLabel, { fontFamily: F.bold, color: C.orange }]}>Frequently Asked Questions</Text>
            </View>
          </View>
          <View style={s.card}>
            {filteredFaqs.length === 0 ? (
              <View style={s.noResultWrap}>

                <Ionicons name="search-outline" size={28} color={C.textLight} />                
                <Text style={[s.noResult, { fontFamily: F.regular }]}>No results for &quot;{search}&quot;</Text>

              </View>
            ) : (
              filteredFaqs.map((faq, i) => (
                <FAQItem key={i} faq={faq} isLast={i === filteredFaqs.length - 1} />
              ))
            )}
          </View>
        </View>

        {/* Contact Support */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <View style={[s.sectionLabelPill, { backgroundColor: C.softBlue }]}>
              <MaterialCommunityIcons name="headset" size={14} color={C.navy} />
              <Text style={[s.sectionLabel, { fontFamily: F.bold, color: C.navy }]}>Contact Support</Text>
            </View>
          </View>
          <View style={s.card}>
            {contactOptions.map((opt, i) => (
              <ContactRow key={i} option={opt} isLast={i === contactOptions.length - 1} />
            ))}
          </View>
        </View>

        {/* Raise a Ticket */}
       {/* Raise a Ticket */}
<View style={s.section}>
  <View style={s.sectionLabelRow}>
    <View style={[s.sectionLabelPill, { backgroundColor: "#F0FDF4" }]}>
      <MaterialCommunityIcons
        name="ticket-outline"
        size={14}
        color="#16A34A"
      />
      <Text
        style={[
          s.sectionLabel,
          { fontFamily: F.bold, color: "#16A34A" },
        ]}
      >
        Raise a Ticket
      </Text>
    </View>
  </View>

  <View style={s.card}>
    <View style={s.cardInner}>

      {ticketSubmitted ? (

        <View style={s.successBox}>
          <Ionicons
            name="checkmark-circle"
            size={48}
            color="#27AE60"
          />

          <Text style={s.successTitle}>
            Ticket submitted!
          </Text>

          <Text style={s.successSub}>
            We&apos;ll get back to you within 24 hours.
          </Text>
        </View>

      ) : (

        <>
          {/* Issue Title */}
          <View style={s.fieldLabelRow}>
            <Ionicons
              name="create-outline"
              size={13}
              color={C.textMid}
            />

            <Text
              style={[
                s.fieldLabel,
                { fontFamily: F.medium },
              ]}
            >
              Issue title{" "}
              <Text style={s.requiredStar}>*</Text>
            </Text>
          </View>

          <TextInput
            style={[
              s.fieldInput,
              { fontFamily: F.regular },
              issueTitleError && s.fieldInputError,
            ]}
            placeholder="e.g. Payment not received"
            placeholderTextColor={C.textLight}
            value={issueTitle}
            onChangeText={(t) => {
              setIssueTitle(t);
              if (t.trim()) setIssueTitleError(false);
            }}
            returnKeyType="next"
          />

          {issueTitleError && (
            <View style={s.errorRow}>
              <Ionicons
                name="alert-circle-outline"
                size={13}
                color="#DC2626"
              />
              <Text
                style={[
                  s.errorText,
                  { fontFamily: F.regular },
                ]}
              >
                Issue title is required
              </Text>
            </View>
          )}

          {/* Description */}
          <View
            style={[
              s.fieldLabelRow,
              { marginTop: 14 },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={13}
              color={C.textMid}
            />

            <Text
              style={[
                s.fieldLabel,
                { fontFamily: F.medium },
              ]}
            >
              Description{" "}
              <Text style={s.requiredStar}>*</Text>
            </Text>
          </View>

          <TextInput
            style={[
              s.fieldTextarea,
              { fontFamily: F.regular },
              descriptionError && s.fieldInputError,
            ]}
            placeholder="Describe your issue in detail..."
            placeholderTextColor={C.textLight}
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              if (t.trim()) setDescriptionError(false);
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Upload */}
          <TouchableOpacity
            style={s.uploadBox}
            activeOpacity={0.7}
            onPress={handlePickImage}
          >
            {uploadedImage ? (
              <Image
                source={{ uri: uploadedImage }}
                style={s.uploadPreview}
              />
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={28}
                  color={C.textLight}
                />

                <Text
                  style={[
                    s.uploadText,
                    { fontFamily: F.regular },
                  ]}
                >
                  Tap to upload
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={s.submitBtn}
            onPress={handleTicketSubmit}
            activeOpacity={0.8}
          >
            <View style={s.btnInner}>
              <Ionicons
                name="send"
                size={15}
                color="#fff"
                style={{ marginRight: 8 }}
              />

              <Text
                style={[
                  s.submitBtnText,
                  { fontFamily: F.semiBold },
                ]}
              >
                Create Support Ticket
              </Text>
            </View>
          </TouchableOpacity>
        </>

      )}

    </View>
  </View>
</View>

        {/* Help Topics */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <View style={[s.sectionLabelPill, { backgroundColor: "#F5F3FF" }]}>
              <Ionicons name="grid-outline" size={14} color="#7C3AED" />
              <Text style={[s.sectionLabel, { fontFamily: F.bold, color: "#7C3AED" }]}>Help Topics</Text>
            </View>
          </View>
          <View style={s.topicsGrid}>
            {HELP_TOPICS.map((t, i) => {
              const isActive = typeof activeTopic !== "string" && activeTopic?.label === t.label;
              return (
                <TouchableOpacity
                  key={i}
                  style={[s.topicPill, isActive && s.topicPillActive, isActive && { borderColor: t.color }]}
                  activeOpacity={0.7}
                  onPress={() => setActiveTopic(prev => (typeof prev !== "string" && prev?.label === t.label) ? null : t)}
                >
                  <View style={[s.topicIconWrap, { backgroundColor: t.bgColor }]}>
                    <VIcon lib={t.iconLib} name={t.iconName} size={17} color={t.color} />
                  </View>
                  <Text style={[s.topicLabel, { fontFamily: isActive ? F.bold : F.medium }, isActive && { color: C.navy }]}>
                    {t.label}
                  </Text>
                  <Ionicons name={isActive ? "chevron-up" : "chevron-down"} size={14} color={isActive ? t.color : C.textLight} />
                </TouchableOpacity>
              );
            })}

            {/* My Tickets pill */}
            {(() => {
              const isActive = activeTopic === "tickets";
              return (
                <TouchableOpacity
                  style={[
                    s.topicPill,
                    s.topicPillFull,
                    isActive && s.topicPillActive,
                    isActive && { borderColor: C.navy },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setActiveTopic(prev => prev === "tickets" ? null : "tickets")}
                >
                  <View style={[s.topicIconWrap, { backgroundColor: "#F0F4FF" }]}>
                    <Ionicons name="ticket-outline" size={17} color={C.navy} />
                  </View>
                  <Text style={[s.topicLabel, { fontFamily: isActive ? F.bold : F.medium }, isActive && { color: C.navy }]}>
                    My Ticket Status
                  </Text>
                  {tickets.length > 0 && (
                    <View style={s.ticketCountBadge}>
                      <Text style={[s.ticketCountTxt, { fontFamily: F.bold }]}>{tickets.length}</Text>
                    </View>
                  )}
                  <Ionicons name={isActive ? "chevron-up" : "chevron-down"} size={14} color={isActive ? C.navy : C.textLight} />
                </TouchableOpacity>
              );
            })()}
          </View>

          {activeTopic && typeof activeTopic !== "string" && (
            <TopicFAQPanel topic={activeTopic} onClose={() => setActiveTopic(null)} />
          )}

          {activeTopic === "tickets" && (
            <TicketStatusPanel tickets={tickets} onClose={() => setActiveTopic(null)} />
          )}
        </View>

        {/* Feedback */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <View style={[s.sectionLabelPill, { backgroundColor: "#FFF3E8" }]}>
              <Ionicons name="heart-outline" size={14} color={C.orange} />
              <Text style={[s.sectionLabel, { fontFamily: F.bold, color: C.orange }]}>Feedback</Text>
            </View>
          </View>
          <View style={s.card}>
            <View style={s.cardInner}>
              {feedbackSubmitted ? (
                <View style={s.successBox}>
                  <Ionicons name="happy" size={48} color={C.orange} />
                  <Text style={[s.successTitle, { fontFamily: F.bold }]}>Thanks for your feedback!</Text>
                  <Text style={[s.successSub, { fontFamily: F.regular }]}>We really appreciate your time.</Text>
                </View>
              ) : (
                <>
                  <View style={s.feedbackPromptRow}>
                    <Ionicons name="star-outline" size={14} color={C.textMid} />
                    <Text style={[s.feedbackPrompt, { fontFamily: F.medium }]}>Rate your experience</Text>
                  </View>
                  <StarRating rating={rating} onRate={setRating} />
                  <TextInput
                    style={[s.fieldTextarea, { fontFamily: F.regular }]}
                    placeholder="Write your feedback here..."
                    placeholderTextColor={C.textLight}
                    value={feedback}
                    onChangeText={setFeedback}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[s.outlineBtn, !rating && s.submitBtnDisabled]}
                    onPress={handleFeedbackSubmit}
                    activeOpacity={0.8}
                  >
                    <View style={s.btnInner}>
                      <Ionicons name="checkmark-done-outline" size={16} color={C.navy} style={{ marginRight: 7 }} />
                      <Text style={[s.outlineBtnText, { fontFamily: F.medium }]}>Submit Feedback</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default HelpSupportScreen;

// ─────────────────────────────────────────────────────────────────────────────
// HELP PAGE STYLES  (prefix: s)
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.lightGray },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  header: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.navyDeep,
    paddingHorizontal: 16, paddingVertical: 14,
    paddingTop: Platform.OS === "ios" ? 52 : 50,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 0.5, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: { flex: 1, fontSize: 19, color: C.white },
  headerIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.orangeGlow,
    alignItems: "center", justifyContent: "center",
  },

  navyBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.navy, borderRadius: 16,
    margin: 16, padding: 16, gap: 12,
  },
  bannerIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  bannerTitle: { fontSize: 15, color: C.white, marginBottom: 2 },
  bannerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  bannerBtn: { backgroundColor: C.orange, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 9 },
  bannerBtnTxt: { fontSize: 13, color: C.white },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionLabelPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  sectionLabel: { fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" },

  card: {
    backgroundColor: C.white, borderRadius: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: "hidden",
  },
  cardInner: { padding: 16 },
  borderBottom: { borderBottomWidth: 0.5, borderBottomColor: "#EBF0F8" },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white, borderRadius: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1, fontSize: 15, color: C.textDark,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
  },

  faqItem: {},
  faqQuestion: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 13, gap: 10,
  },
  faqIconBadge: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  faqQText: { flex: 1, fontSize: 15, color: C.textDark, lineHeight: 22 },
  faqAnswerWrap: { flexDirection: "row", alignItems: "flex-start", paddingLeft: 56, paddingRight: 14, paddingBottom: 14, paddingTop: 2, gap: 10 },
  faqAnswerAccent: { width: 3, borderRadius: 2, backgroundColor: C.orange, alignSelf: "stretch", minHeight: 20 },
  faqAnswer: { flex: 1, fontSize: 14, color: C.textMid, lineHeight: 21 },
  noResultWrap: { alignItems: "center", paddingVertical: 24, gap: 8 },
  noResult: { fontSize: 14, color: C.textLight, textAlign: "center" },

  contactRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  contactIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  contactText: { flex: 1 },
  contactLabel: { fontSize: 15, color: C.textDark, marginBottom: 2 },
  contactSub: { fontSize: 13, color: C.textLight },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.softBlue, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  liveBadgeTxt: { fontSize: 12, color: C.navy },

  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  fieldLabel: { fontSize: 15, color: C.textMid, fontWeight: "600" },
  fieldLabelOptional: { color: C.textLight, fontSize: 13, fontWeight: "400" },
  requiredStar: { color: "#DC2626", fontSize: 15 },
  fieldInput: { borderWidth: 0.5, borderColor: "#D1D9E6", borderRadius: 10, backgroundColor: C.lightGray, paddingHorizontal: 13, paddingVertical: Platform.OS === "ios" ? 12 : 10, fontSize: 16, color: C.textDark },
  fieldInputError: { borderColor: "#DC2626", borderWidth: 1, backgroundColor: "#FFF5F5" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  errorText: { fontSize: 13, color: "#DC2626" },
  fieldTextarea: { borderWidth: 0.5, borderColor: "#D1D9E6", borderRadius: 10, backgroundColor: C.lightGray, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 12, fontSize: 16, color: C.textDark, minHeight: 100 },
  uploadBox: { borderWidth: 0.5, borderStyle: "dashed", borderColor: "#C5CFE0", borderRadius: 9, backgroundColor: C.lightGray, paddingVertical: 18, alignItems: "center", gap: 8, marginTop: 2 },
  uploadText: { fontSize: 13, color: C.textLight },
  uploadLink: { color: C.navy },
  uploadPreviewWrap: { width: "100%", alignItems: "center", position: "relative" },
  uploadPreview: { width: "100%", height: 120, borderRadius: 8 },
  uploadPreviewOverlay: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  uploadPreviewText: { fontSize: 13, color: "#27AE60" },
  uploadRemoveBtn: { position: "absolute", top: 6, right: 6, backgroundColor: C.white, borderRadius: 10 },

  submitBtn: { marginTop: 16, backgroundColor: C.navy, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 15, color: C.white, letterSpacing: 0.2 },
  btnInner: { flexDirection: "row", alignItems: "center" },
  outlineBtn: { marginTop: 12, borderWidth: 0.5, borderColor: "#D1D9E6", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  outlineBtnText: { fontSize: 15, color: C.navy },

  topicsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicPill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.white, borderRadius: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, paddingHorizontal: 12, paddingVertical: 11, width: "48%", borderWidth: 1.5, borderColor: "transparent" },
  topicPillFull: { width: "100%" },
  topicPillActive: { backgroundColor: C.softBlue },
  topicIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  topicLabel: { flex: 1, fontSize: 14, color: C.textDark },
  topicPanel: { marginTop: 14 },
  topicPanelHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  topicPanelIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  topicPanelTitle: { flex: 1, fontSize: 17, color: C.textDark },
  topicPanelClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.white, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },

  ticketCountBadge: { backgroundColor: C.orange, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  ticketCountTxt: { fontSize: 11, color: C.white },

  emptyTickets: { alignItems: "center", paddingVertical: 32, gap: 10, paddingHorizontal: 20 },
  emptyTicketsTitle: { fontSize: 16, color: C.textMid },
  emptyTicketsSub: { fontSize: 13, color: C.textLight, textAlign: "center", lineHeight: 20 },

  ticketCardInner: { padding: 14 },
  ticketCardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16, gap: 8 },
  ticketHeaderRight: { alignItems: "flex-end", gap: 6 },
  ticketCardTitle: { fontSize: 16, color: C.textDark, marginBottom: 3 },
  ticketCardDate: { fontSize: 12, color: C.textLight },
  ticketStatusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  ticketStatusBadgeTxt: { fontSize: 11 },

  wandBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    backgroundColor: C.softBlue,
    borderWidth: 1, borderColor: "rgba(30,58,110,0.15)",
  },
  wandBtnActive: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  wandBtnTxt: { fontSize: 11, color: C.navy },

  adminNoteBox: {
    backgroundColor: "#F8F6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.18)",
    padding: 13,
    marginBottom: 14,
  },
  adminNoteHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 },
  adminNoteAvatarWrap: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: "#7C3AED",
    alignItems: "center", justifyContent: "center",
  },
  adminNoteLabel: { flex: 1, fontSize: 13, color: "#4C1D95" },
  adminStatusChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12 },
  adminStatusChipTxt: { fontSize: 10 },
  adminNoteText: { fontSize: 13, color: "#374151", lineHeight: 21, marginBottom: 10 },
  adminNoteFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  adminNoteTime: { fontSize: 11, color: C.textLight },

  ticketStepsRow: { flexDirection: "row", alignItems: "flex-start" },
  ticketStepItem: { flex: 1, alignItems: "center" },
  ticketStepDotRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  ticketStepDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center", zIndex: 1 },
  ticketStepDotDone: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  ticketStepDotPending: { backgroundColor: C.white, borderColor: "#D1D9E6" },
  ticketStepDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.white },
  ticketStepLine: { flex: 1, height: 2, marginHorizontal: -1 },
  ticketStepLineDone: { backgroundColor: "#16A34A" },
  ticketStepLinePending: { backgroundColor: "#D1D9E6" },
  ticketStepLabel: { fontSize: 10, marginTop: 5, textAlign: "center" },

  starsRow: { flexDirection: "row", gap: 4, marginBottom: 14, marginTop: 6 },
  feedbackPromptRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  feedbackPrompt: { fontSize: 14, color: C.textMid },

  successBox: { alignItems: "center", paddingVertical: 16, gap: 8 },
  successTitle: { fontSize: 17, color: C.textDark },
  successSub: { fontSize: 14, color: C.textMid, textAlign: "center" },
});

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS MODAL STYLES  (prefix: sm)
// ─────────────────────────────────────────────────────────────────────────────

const sm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(14,26,54,0.62)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 26,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  confettiRow: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  confettiDot: {},
  iconRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 23,
    color: C.textDark,
    marginBottom: 10,
    textAlign: "center",
  },
  sub: {
    fontSize: 15,
    color: C.textMid,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 18,
  },
  ticketName: {
    color: C.navy,
    fontSize: 15,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.softBlue,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 24,
    width: "100%",
  },
  infoText: {
    fontSize: 13,
    color: C.navyLight,
    lineHeight: 19,
    flex: 1,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.navy,
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    marginBottom: 10,
  },
  primaryBtnTxt: {
    fontSize: 15,
    color: C.white,
    letterSpacing: 0.2,
  },
  ghostBtn: {
    paddingVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  ghostBtnTxt: {
    fontSize: 15,
    color: C.textLight,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// LIVE CHAT STYLES  (prefix: cs)
// ─────────────────────────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.52)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#F7F8FB", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", minHeight: "60%", overflow: "hidden" },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.navyDeep, paddingHorizontal: 16, paddingVertical: 14, paddingTop: Platform.OS === "ios" ? 52 : 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 11, backgroundColor: C.orange, alignItems: "center", justifyContent: "center" },
  logoTxt: { color: C.white, fontSize: 11, letterSpacing: 0.4 },
  headerTitle: { color: C.white, fontSize: 17 },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" },
  onlineTxt: { color: "#A0C4FF", fontSize: 12 },
  headerActions: { flexDirection: "row", gap: 6 },
  headerBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },

  msgList: { paddingHorizontal: 12, paddingVertical: 14, paddingBottom: 6 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12, gap: 6 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowBot: { justifyContent: "flex-start" },
  botAvatar: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.navyDeep, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  botAvatarTxt: { color: C.white, fontSize: 11 },
  userAvatar: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.navyLight, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  userAvatarTxt: { color: C.white, fontSize: 11 },
  bubble: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16 },
  bubbleBot: { backgroundColor: C.white, borderBottomLeftRadius: 3, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" },
  bubbleUser: { backgroundColor: C.navy, borderBottomRightRadius: 3 },
  bubbleTxt: { fontSize: 14, lineHeight: 20 },
  bubbleTxtBot: { color: C.textDark },
  bubbleTxtUser: { color: C.white },
  ts: { fontSize: 10, marginTop: 3 },
  tsBot: { color: "#A0A0B0", marginLeft: 4 },
  tsUser: { color: "#A0A0B0", textAlign: "right", marginRight: 4 },

  typingRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 12, paddingLeft: 12 },
  typingBubble: { flexDirection: "row", gap: 4, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderBottomLeftRadius: 3, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.07)" },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C0C0CC" },

  quickWrap: { borderTopWidth: 0.5, borderTopColor: "rgba(0,0,0,0.08)", backgroundColor: C.white, paddingVertical: 8 },
  quickScroll: { paddingHorizontal: 12, gap: 7 },
  quickChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18, backgroundColor: C.softBlue, borderWidth: 0.5, borderColor: "rgba(30,58,110,0.2)" },
  quickChipHuman: { backgroundColor: C.orangePale, borderColor: "rgba(249,115,22,0.3)" },
  quickChipTxt: { fontSize: 13, color: C.navy },
  quickChipTxtHuman: { color: C.orange },

  escalateBanner: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: "rgba(0,0,0,0.08)", backgroundColor: C.white },
  escalateBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: C.lightGray, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.1)" },
  escalateBtnCall: { backgroundColor: "#E8F5E9", borderColor: "#A5D6A7" },
  escalateBtnTxt: { fontSize: 12, color: C.navy },

  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === "ios" ? 28 : 10, backgroundColor: C.white, borderTopWidth: 0.5, borderTopColor: "rgba(0,0,0,0.08)" },
  input: { flex: 1, minHeight: 40, maxHeight: 96, backgroundColor: C.lightGray, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: C.navy, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.1)" },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.orange, alignItems: "center", justifyContent: "center" },
  sendBtnOff: { backgroundColor: "#D1D9E6" },
});
