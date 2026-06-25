import React, { useState, useRef, useEffect, useCallback } from "react";
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
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { AppHeader } from "@/components/common/AppHeader";
import { useResponsive } from "@/hooks/useResponsive";
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
import { useRouter, useFocusEffect } from "expo-router";
import { hydrateSellerSession } from "@/lib/api/sellerSession";
import { AUTH_ACTION_FAILED } from "@/lib/api/apiErrors";
import { useSweetAlert } from "@/components/common/SweetAlert";
import {
  createTicket as apiCreateTicket,
  getTickets as apiGetTickets,
  getTicketById as apiGetTicketById,
  getMessages as apiGetMessages,
  sendMessage as apiSendMessage,
  closeTicket as apiCloseTicket,
  createTicketWithImage as apiCreateTicketWithImage,
  sendMessageWithImage as apiSendMessageWithImage,
  checkServerConnection,
  getFaqs as apiGetFaqs,
  getGroupedFaqs as apiGetGroupedFaqs,
  isSellerFaq,
  getSupportContactConfig,
  getLiveChatHistory,
  sendLiveChatMessage,
  getSellerId,
  resolveMediaUrl,
  submitSupportFeedback,
  type CreateTicketPayload,
  type TicketResponse,
  type MessageResponse,
  type FaqResponse as ApiFaqResponse,
  type FaqCategoryResponse,
  type SupportContactConfig,
  type LiveChatMessageResponse,
} from "@/features/support/supportApi";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FAQ {
  id: number;
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

type TicketStatus = "open" | "waiting_seller" | "waiting_admin" | "closed";

interface TicketMessage {
  id: string;
  senderType: "seller" | "admin";
  message: string;
  attachment?: string | null;
  createdAt: Date;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  category: string;
  priority: string;
  createdAt: Date;
  updatedAt?: Date;
  lastResponseBy?: string;
  adminNote: string;
  messages?: TicketMessage[];
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
  open: { label: "Open", color: "#6B7280", bgColor: "#F3F4F6", icon: "paper-plane-outline", step: 1 },
  waiting_admin: { label: "Waiting on Admin", color: "#2563EB", bgColor: "#EFF6FF", icon: "eye-outline", step: 2 },
  waiting_seller: { label: "Admin Replied", color: "#D97706", bgColor: "#FFFBEB", icon: "time-outline", step: 3 },
  closed: { label: "Closed", color: "#16A34A", bgColor: "#F0FDF4", icon: "checkmark-circle-outline", step: 4 },
};

const ADMIN_NOTES: Record<TicketStatus, string> = {
  open:
    "Your ticket has been received and logged in our system. A support specialist will review it shortly.",
  waiting_admin:
    "Your message has been sent. Our support team will review and respond shortly.",
  waiting_seller:
    "Our team has replied to your ticket. Please check the message and respond if needed.",
  closed:
    "This ticket has been resolved and closed. If the problem persists, please raise a new ticket.",
};

const isUnreachableError = (err: unknown): boolean => {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes(AUTH_ACTION_FAILED.toLowerCase())) return false;
  return (
    msg.includes("cannot reach") ||
    msg.includes("network request failed") ||
    msg.includes("failed to fetch")
  );
};

const normalizeStatus = (status: string): TicketStatus => {
  const s = status?.toLowerCase() ?? "open";
  if (s === "open" || s === "waiting_seller" || s === "waiting_admin" || s === "closed") {
    return s;
  }
  if (s.includes("closed")) return "closed";
  if (s.includes("seller")) return "waiting_seller";
  if (s.includes("admin")) return "waiting_admin";
  return "open";
};

const mapApiMessages = (msgs: MessageResponse[] | null | undefined): TicketMessage[] =>
  (msgs ?? []).map((m) => ({
    id: String(m.id),
    senderType: m.senderType === "admin" ? "admin" : "seller",
    message: m.message,
    attachment: resolveMediaUrl(m.attachment) ?? null,
    createdAt: new Date(m.createdAt),
  }));

const formatCategoryLabel = (cat: string) =>
  cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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

// ── FAQ mapping (API → UI) ─────────────────────────────────────────────────────

type FaqIconStyle = { iconName: string; iconColor: string; iconBg: string };

const DEFAULT_FAQ_ICON: FaqIconStyle = {
  iconName: "help-circle-outline",
  iconColor: "#854F0B",
  iconBg: "#FAEEDA",
};

const FAQ_ICON_PALETTE: FaqIconStyle[] = [
  DEFAULT_FAQ_ICON,
  { iconName: "bag-handle-outline", iconColor: "#A32D2D", iconBg: "#FCEBEB" },
  { iconName: "wallet-outline", iconColor: "#0F6E56", iconBg: "#E1F5EE" },
  { iconName: "storefront-outline", iconColor: C.navyLight, iconBg: C.softBlue },
  { iconName: "lock-closed-outline", iconColor: "#7C3AED", iconBg: "#F5F3FF" },
  { iconName: "cube-outline", iconColor: "#D97706", iconBg: "#FFFBEB" },
];

type TopicTheme = Pick<HelpTopic, "color" | "bgColor" | "iconName">;

const DEFAULT_TOPIC_THEME: TopicTheme = {
  color: C.navyLight,
  bgColor: C.softBlue,
  iconName: "information-circle-outline",
};

const TOPIC_THEMES: TopicTheme[] = [
  { color: C.navyLight, bgColor: C.softBlue, iconName: "information-circle-outline" },
  { color: "#7C3AED", bgColor: "#F5F3FF", iconName: "person-circle-outline" },
  { color: "#A32D2D", bgColor: "#FCEBEB", iconName: "bag-handle-outline" },
  { color: "#0F6E56", bgColor: "#E1F5EE", iconName: "car-outline" },
  { color: "#D97706", bgColor: "#FFFBEB", iconName: "card-outline" },
  { color: "#DC2626", bgColor: "#FEF2F2", iconName: "return-down-back-outline" },
  { color: "#854F0B", bgColor: "#FAEEDA", iconName: "shirt-outline" },
  { color: C.orange, bgColor: C.orangePale, iconName: "pricetag-outline" },
];

function mapApiFaqToUi(faq: ApiFaqResponse, index: number): FAQ {
  const p = FAQ_ICON_PALETTE[index % FAQ_ICON_PALETTE.length] ?? DEFAULT_FAQ_ICON;
  return {
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    iconName: p.iconName,
    iconColor: p.iconColor,
    iconBg: p.iconBg,
  };
}

function resolveTopicIcon(categoryName: string, fallback: string): string {
  const n = categoryName.toLowerCase();
  if (n.includes("account") || n.includes("profile")) return "person-circle-outline";
  if (n.includes("payment") || n.includes("wallet")) return "card-outline";
  if (n.includes("order") || n.includes("tracking")) return "bag-handle-outline";
  if (n.includes("shipping") || n.includes("delivery")) return "car-outline";
  if (n.includes("return") || n.includes("refund")) return "return-down-back-outline";
  if (n.includes("product") || n.includes("size")) return "shirt-outline";
  if (n.includes("offer") || n.includes("reward") || n.includes("discount")) return "pricetag-outline";
  if (n.includes("wishlist") || n.includes("saved")) return "heart-outline";
  if (n.includes("app") || n.includes("technical")) return "phone-portrait-outline";
  if (n.includes("about")) return "information-circle-outline";
  return fallback;
}

function mapCategoryToHelpTopic(cat: FaqCategoryResponse, index: number): HelpTopic {
  const theme = TOPIC_THEMES[index % TOPIC_THEMES.length] ?? DEFAULT_TOPIC_THEME;
  return {
    label: cat.categoryName.trim(),
    color: theme.color,
    bgColor: theme.bgColor,
    iconLib: "Ionicons",
    iconName: resolveTopicIcon(cat.categoryName, theme.iconName),
    faqs: cat.faqs.map((f, i) => mapApiFaqToUi(f, i)),
  };
}

/** Opens Gmail compose on web, or the default mail app on mobile */
async function openSupportEmail(address: string) {
  const email = address.trim();
  const subject = encodeURIComponent("Seller Support Request");
  const body = encodeURIComponent(
    `Hi Flint & Thread Support,\n\nSeller ID: ${getSellerId()}\n\n`
  );

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
  const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

  try {
    if (Platform.OS === "web") {
      await Linking.openURL(gmailUrl);
    } else {
      await Linking.openURL(mailtoUrl);
    }
  } catch {
    try {
      await Linking.openURL(mailtoUrl);
    } catch {
      Alert.alert("Email Support", `Could not open your mail app. Please email us at ${email}`);
    }
  }
}

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

const TicketStatusPanel: React.FC<{
  tickets: Ticket[];
  onClose: () => void;
  isLoadingTickets?: boolean;
  expandedTicketId?: string | null;
  onExpandedChange?: (id: string | null) => void;
  onTicketUpdated?: (ticket: Ticket) => void;
  onRefresh?: () => void;
}> = ({
  tickets,
  onClose,
  isLoadingTickets = false,
  expandedTicketId: expandedProp,
  onExpandedChange,
  onTicketUpdated,
  onRefresh,
}) => {
  const STEPS: TicketStatus[] = ["open", "waiting_admin", "waiting_seller", "closed"];
  const [expandedLocal, setExpandedLocal] = useState<string | null>(null);
  const expandedId = expandedProp !== undefined ? expandedProp : expandedLocal;
  const setExpandedId = (id: string | null) => {
    if (onExpandedChange) onExpandedChange(id);
    else setExpandedLocal(id);
  };

  const [messagesMap, setMessagesMap] = useState<Record<string, TicketMessage[]>>({});
  const [loadingMsgId, setLoadingMsgId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyImage, setReplyImage] = useState<Record<string, string | null>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadMessages = async (ticketId: string) => {
    setLoadingMsgId(ticketId);
    try {
      const msgs = await apiGetMessages(Number(ticketId));
      setMessagesMap((prev) => ({ ...prev, [ticketId]: mapApiMessages(msgs) }));
    } catch {
      Alert.alert("Error", "Could not load messages. Please try again.");
    } finally {
      setLoadingMsgId(null);
    }
  };

  const toggleExpand = async (ticket: Ticket) => {
    if (expandedId === ticket.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(ticket.id);
    if (!messagesMap[ticket.id]?.length && !ticket.messages?.length) {
      await loadMessages(ticket.id);
    } else if (ticket.messages?.length && !messagesMap[ticket.id]) {
      setMessagesMap((prev) => ({ ...prev, [ticket.id]: ticket.messages! }));
    }
  };

  const handlePickReplyImage = async (ticketId: string) => {
    if (Platform.OS !== "web") {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library in Settings.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      setReplyImage((prev) => ({ ...prev, [ticketId]: asset.uri }));
    }
  };

  const handleSendReply = async (ticket: Ticket) => {
    const text = (replyText[ticket.id] ?? "").trim();
    const imageUri = replyImage[ticket.id] ?? null;
    if (!text && !imageUri) return;

    setSendingId(ticket.id);
    try {
      const sent = imageUri
        ? await apiSendMessageWithImage(Number(ticket.id), imageUri, text || undefined)
        : await apiSendMessage(Number(ticket.id), text);

      const newMsg: TicketMessage = {
        id: String(sent.id),
        senderType: "seller",
        message: sent.message,
        attachment: resolveMediaUrl(sent.attachment) ?? null,
        createdAt: new Date(sent.createdAt),
      };
      setMessagesMap((prev) => ({
        ...prev,
        [ticket.id]: [...(prev[ticket.id] ?? []), newMsg],
      }));
      setReplyText((prev) => ({ ...prev, [ticket.id]: "" }));
      setReplyImage((prev) => ({ ...prev, [ticket.id]: null }));

      const detail = await apiGetTicketById(Number(ticket.id));
      const updated: Ticket = {
        ...ticket,
        status: normalizeStatus(detail.status),
        lastResponseBy: detail.lastResponseBy,
        updatedAt: new Date(detail.updatedAt),
        adminNote: ADMIN_NOTES[normalizeStatus(detail.status)],
        messages: mapApiMessages(detail.messages),
      };
      setMessagesMap((prev) => ({ ...prev, [ticket.id]: updated.messages ?? [] }));
      onTicketUpdated?.(updated);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send message.");
    } finally {
      setSendingId(null);
    }
  };

  const handleCloseTicket = (ticket: Ticket) => {
    Alert.alert("Close ticket?", "This ticket will be marked as resolved.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close",
        style: "destructive",
        onPress: async () => {
          try {
            const closed = await apiCloseTicket(Number(ticket.id));
            const updated: Ticket = {
              ...ticket,
              status: "closed",
              adminNote: ADMIN_NOTES.closed,
              updatedAt: new Date(closed.updatedAt),
            };
            onTicketUpdated?.(updated);
            onRefresh?.();
          } catch (err: any) {
            Alert.alert("Error", err.message || "Could not close ticket.");
          }
        },
      },
    ]);
  };

  const getMessagesForTicket = (ticket: Ticket): TicketMessage[] =>
    messagesMap[ticket.id] ?? ticket.messages ?? [];

  return (
    <View style={s.topicPanel}>
      <View style={s.topicPanelHeader}>
        <View style={[s.topicPanelIconWrap, { backgroundColor: "#F0F4FF" }]}>
          <Ionicons name="ticket-outline" size={18} color={C.navy} />
        </View>
        <Text style={[s.topicPanelTitle, { fontFamily: F.bold }]}>My Ticket Status</Text>
        <TouchableOpacity onPress={onRefresh} style={s.refreshTicketsBtn} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={18} color={C.navy} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={s.topicPanelClose} activeOpacity={0.7}>
          <Ionicons name="close" size={16} color={C.textMid} />
        </TouchableOpacity>
      </View>

      {isLoadingTickets ? (
        <View style={s.card}>
          <View style={s.emptyTickets}>
            <ActivityIndicator size="large" color={C.navy} />
            <Text style={[s.emptyTicketsSub, { fontFamily: F.regular, marginTop: 8 }]}>Loading tickets...</Text>
          </View>
        </View>
      ) : tickets.length === 0 ? (
        <View style={s.card}>
          <View style={s.emptyTickets}>
            <Ionicons name="ticket-outline" size={40} color="#D1D9E6" />
            <Text style={[s.emptyTicketsTitle, { fontFamily: F.semiBold }]}>No tickets yet</Text>
            <Text style={[s.emptyTicketsSub, { fontFamily: F.regular }]}>
              Tickets you raise will appear here with their latest status and messages.
            </Text>
          </View>
        </View>
      ) : (
        tickets.map((ticket) => {
          const cfg = TICKET_STATUS_CONFIG[ticket.status] ?? TICKET_STATUS_CONFIG.open;
          const currentStep = cfg.step;
          const isExpanded = expandedId === ticket.id;
          const msgs = getMessagesForTicket(ticket);
          const isClosed = ticket.status === "closed";
          const isLoadingMsgs = loadingMsgId === ticket.id;

          return (
            <View key={ticket.id} style={[s.card, { marginBottom: 10 }]}>
              <View style={s.ticketCardInner}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => toggleExpand(ticket)}>
                  <View style={s.ticketCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.ticketCardTitle, { fontFamily: F.semiBold }]} numberOfLines={1}>
                        {ticket.title}
                      </Text>
                      <Text style={[s.ticketCardDate, { fontFamily: F.regular }]}>
                        {ticket.ticketNumber} · {formatDate(ticket.createdAt)}
                      </Text>
                      <Text style={[s.ticketMetaLine, { fontFamily: F.regular }]}>
                        {formatCategoryLabel(ticket.category)} · {ticket.priority.toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.ticketHeaderRight}>
                      <View style={[s.ticketStatusBadge, { backgroundColor: cfg.bgColor }]}>
                        <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                        <Text style={[s.ticketStatusBadgeTxt, { fontFamily: F.semiBold, color: cfg.color }]}>
                          {cfg.label}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={C.textLight}
                      />
                    </View>
                  </View>
                </TouchableOpacity>

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

                {isExpanded && (
                  <View style={s.ticketDetailSection}>
                    <Text style={[s.ticketDetailSectionTitle, { fontFamily: F.semiBold }]}>
                      Conversation
                    </Text>

                    {isLoadingMsgs ? (
                      <ActivityIndicator size="small" color={C.navy} style={{ marginVertical: 16 }} />
                    ) : msgs.length === 0 ? (
                      <Text style={[s.noMsgsText, { fontFamily: F.regular }]}>
                        No messages yet. Send a reply below.
                      </Text>
                    ) : (
                      <View style={s.msgThread}>
                        {msgs.map((msg) => {
                          const isSeller = msg.senderType === "seller";
                          return (
                            <View
                              key={msg.id}
                              style={[s.ticketMsgRow, isSeller ? s.ticketMsgRowSeller : s.ticketMsgRowAdmin]}
                            >
                              <View
                                style={[
                                  s.ticketMsgBubble,
                                  isSeller ? s.ticketMsgBubbleSeller : s.ticketMsgBubbleAdmin,
                                ]}
                              >
                                <Text
                                  style={[
                                    s.ticketMsgSender,
                                    { fontFamily: F.semiBold },
                                    isSeller && { color: C.navyLight },
                                  ]}
                                >
                                  {isSeller ? "You" : "Support Team"}
                                </Text>
                                {!!msg.message && msg.message !== "Attachment" && (
                                  <Text
                                    style={[
                                      s.ticketMsgText,
                                      { fontFamily: F.regular },
                                      isSeller && s.ticketMsgTextSeller,
                                    ]}
                                  >
                                    {msg.message}
                                  </Text>
                                )}
                                {msg.attachment ? (
                                  <Image
                                    source={{ uri: msg.attachment }}
                                    style={s.ticketMsgAttachment}
                                    resizeMode="cover"
                                  />
                                ) : null}
                                <Text
                                  style={[
                                    s.ticketMsgTime,
                                    { fontFamily: F.regular },
                                    isSeller && { color: "rgba(255,255,255,0.65)" },
                                  ]}
                                >
                                  {formatTime(msg.createdAt)}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {!isClosed && (
                      <View>
                        {replyImage[ticket.id] ? (
                          <View style={s.replyImagePreviewWrap}>
                            <Image
                              source={{ uri: replyImage[ticket.id]! }}
                              style={s.replyImagePreview}
                              resizeMode="cover"
                            />
                            <TouchableOpacity
                              style={s.replyImageRemove}
                              onPress={() =>
                                setReplyImage((prev) => ({ ...prev, [ticket.id]: null }))
                              }
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="close-circle" size={22} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        ) : null}
                        <View style={s.replyBox}>
                          <TouchableOpacity
                            style={s.replyAttachBtn}
                            onPress={() => handlePickReplyImage(ticket.id)}
                            disabled={sendingId === ticket.id}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="image-outline" size={20} color={C.navy} />
                          </TouchableOpacity>
                          <TextInput
                            style={[s.replyInput, { fontFamily: F.regular }]}
                            placeholder="Type your message..."
                            placeholderTextColor={C.textLight}
                            value={replyText[ticket.id] ?? ""}
                            onChangeText={(t) =>
                              setReplyText((prev) => ({ ...prev, [ticket.id]: t }))
                            }
                            multiline
                            maxLength={2000}
                          />
                          <TouchableOpacity
                            style={[
                              s.replySendBtn,
                              (!(replyText[ticket.id] ?? "").trim() &&
                                !replyImage[ticket.id]) ||
                                sendingId === ticket.id
                                ? s.replySendBtnDisabled
                                : null,
                            ]}
                            onPress={() => handleSendReply(ticket)}
                            disabled={
                              (!(replyText[ticket.id] ?? "").trim() && !replyImage[ticket.id]) ||
                              sendingId === ticket.id
                            }
                            activeOpacity={0.8}
                          >
                            {sendingId === ticket.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Ionicons name="send" size={16} color="#fff" />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {isClosed && (
                      <View style={s.closedBanner}>
                        <Ionicons name="lock-closed-outline" size={14} color={C.textMid} />
                        <Text style={[s.closedBannerTxt, { fontFamily: F.medium }]}>
                          This ticket is closed
                        </Text>
                      </View>
                    )}

                    {!isClosed && (
                      <TouchableOpacity
                        style={s.closeTicketLink}
                        onPress={() => handleCloseTicket(ticket)}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.closeTicketLinkTxt, { fontFamily: F.medium }]}>
                          Mark as resolved
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
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

const mapChatApiToUi = (m: LiveChatMessageResponse): ChatMessage => ({
  id: String(m.id),
  text: m.message,
  sender: m.senderType === "seller" ? "user" : "bot",
  timestamp: new Date(m.createdAt),
});

const LiveChatModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  contactConfig: SupportContactConfig | null;
}> = ({ visible, onClose, contactConfig }) => {
  const sellerId = getSellerId();
  const { isDesktop } = useResponsive();
  const WELCOME: ChatMessage = {
    id: "welcome",
    text: "Hi 👋 Welcome to Flint & Thread support!\nHow can I help you today?",
    sender: "bot",
    timestamp: new Date(),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(700)).current;

  const loadChat = useCallback(async () => {
    setChatLoading(true);
    try {
      const history = await getLiveChatHistory(sellerId);
      if (history.length > 0) {
        setMessages(history.map(mapChatApiToUi));
      } else {
        setMessages([WELCOME]);
      }
    } catch {
      setMessages([WELCOME]);
    } finally {
      setChatLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }).start();
      loadChat();
    } else {
      Animated.timing(slideAnim, { toValue: 700, duration: 230, useNativeDriver: true }).start();
    }
  }, [visible, loadChat]);

  const scrollToBottom = () =>
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);

  const addMsg = (text: string, sender: "user" | "bot") => {
    setMessages(prev => [...prev, { id: genId(), text, sender, timestamp: new Date() }]);
    scrollToBottom();
  };

  const sendMessage = async (text = inputText) => {
    const t = text.trim();
    if (!t || isTyping) return;
    setInputText("");
    setIsTyping(true);
    try {
      const updated = await sendLiveChatMessage(sellerId, t);
      setMessages(updated.map(mapChatApiToUi));
      const lastBot = updated.filter((m) => m.senderType === "bot").pop();
      if (lastBot?.message.toLowerCase().includes("email") || lastBot?.message.toLowerCase().includes("call")) {
        setShowEscalate(true);
      }
      if (t.toLowerCase().includes("human") || t.toLowerCase().includes("agent")) {
        setShowEscalate(true);
      }
    } catch {
      addMsg(t, "user");
      addMsg(getBotReply(t), "bot");
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuick = async (key: keyof typeof BOT_RESPONSES, label: string) => {
    await sendMessage(label);
    if (key === "human") setShowEscalate(true);
  };

  const restartChat = async () => {
    setShowEscalate(false);
    setIsTyping(false);
    setChatLoading(true);
    try {
      const history = await getLiveChatHistory(sellerId);
      setMessages(history.length > 0 ? history.map(mapChatApiToUi) : [WELCOME]);
    } catch {
      setMessages([WELCOME]);
    } finally {
      setChatLoading(false);
    }
  };

  const waNum = contactConfig?.chat?.whatsappNumber ?? "919063499092";
  const supportEmail = contactConfig?.email?.address ?? "support@flintandthread.in";
  const supportPhone = contactConfig?.call?.phone ?? "9063499092";

  const QUICK_REPLIES: {
    key: keyof typeof BOT_RESPONSES;
    label: string;
  }[] = [
      { key: "orders", label: "📦 Orders" },
      { key: "payments", label: "💳 Payments" },
      { key: "products", label: "🛍️ Products" },
      { key: "account", label: "👤 Account" },
      { key: "delivery", label: "🚚 Delivery" },
      { key: "human", label: "🙋 Talk to Executive" },
    ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[cs.overlay, isDesktop && cs.overlayDesktop]}>
        <Animated.View style={[cs.sheet, isDesktop && cs.sheetDesktop, { transform: [{ translateY: slideAnim }] }]}>

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
            ListFooterComponent={
              chatLoading || isTyping ? <TypingIndicator /> : null
            }
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
              <TouchableOpacity style={cs.escalateBtn} onPress={() => Linking.openURL(`https://wa.me/${waNum}`)} activeOpacity={0.8}>
                <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                <Text style={[cs.escalateBtnTxt, { fontFamily: F.semiBold }]}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cs.escalateBtn} onPress={() => openSupportEmail(supportEmail)} activeOpacity={0.8}>
                <Ionicons name="mail-outline" size={14} color={C.navyLight} />
                <Text style={[cs.escalateBtnTxt, { fontFamily: F.semiBold }]}>Email Us</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[cs.escalateBtn, cs.escalateBtnCall]} onPress={() => Linking.openURL(`tel:${supportPhone}`)} activeOpacity={0.8}>
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
      {topic.faqs.map((faq) => (
        <FAQItem key={faq.id} faq={faq} isLast={faq.id === topic.faqs[topic.faqs.length - 1]?.id} />
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
  const { isWeb, isDesktop } = useResponsive();
  const { width: windowWidth } = useWindowDimensions();
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
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [selectedPriority, setSelectedPriority] = useState("medium");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [activeTopic, setActiveTopic] = useState<HelpTopic | string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [serverOffline, setServerOffline] = useState(false);
  const [generalFaqs, setGeneralFaqs] = useState<FAQ[]>([]);
  const [helpTopics, setHelpTopics] = useState<HelpTopic[]>([]);
  const [isLoadingFaqs, setIsLoadingFaqs] = useState(true);
  const [contactConfig, setContactConfig] = useState<SupportContactConfig | null>(null);
  const { showSuccess, showError, showWarning, SweetAlertHost } = useSweetAlert();

  // ── Sweet alert state ────────────────────────────────────────────────────
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState("");

  // ── Validation error states ──────────────────────────────────────────────
  const [issueTitleError, setIssueTitleError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);

  // ── Category & Priority options ──────────────────────────────────────────
  const CATEGORIES = [
    { value: "general", label: "General" },
    { value: "technical", label: "Technical Issue" },
    { value: "billing", label: "Billing" },
    { value: "product", label: "Product Related" },
    { value: "order", label: "Order Related" },
    { value: "account", label: "Account" },
    { value: "other", label: "Other" },
  ];

  const PRIORITIES = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ];

  const mapApiTicket = useCallback((t: TicketResponse): Ticket => {
    const status = normalizeStatus(t.status);
    const firstSellerMsg = (t.messages ?? []).find((m) => m.senderType === "seller");
    return {
      id: String(t.id),
      ticketNumber: t.ticketNumber,
      title: t.subject,
      description: firstSellerMsg?.message ?? "",
      status,
      category: t.category,
      priority: t.priority,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      lastResponseBy: t.lastResponseBy,
      adminNote: ADMIN_NOTES[status],
      messages: mapApiMessages(t.messages),
    };
  }, []);

  const loadTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    try {
      const data = await apiGetTickets();
      setTickets(data.map(mapApiTicket));
      setServerOffline(false);
    } catch (err) {
      console.warn("Failed to load tickets:", err);
      if (isUnreachableError(err)) {
        setServerOffline(true);
      }
    } finally {
      setIsLoadingTickets(false);
    }
  }, [mapApiTicket]);

  const loadFaqs = useCallback(async () => {
    setIsLoadingFaqs(true);
    setGeneralFaqs([]);
    setHelpTopics([]);
    setActiveTopic(null);
    try {
      const [flat, grouped] = await Promise.all([
        apiGetFaqs(undefined, true),
        apiGetGroupedFaqs(true),
      ]);
      const sellerFaqsOnly = flat.filter(isSellerFaq);
      setGeneralFaqs(sellerFaqsOnly.map((f, i) => mapApiFaqToUi(f, i)));
      setHelpTopics(
        grouped
          .map((c) => ({
            ...c,
            faqs: c.faqs.filter(isSellerFaq),
          }))
          .filter((c) => c.faqs.length > 0)
          .map((c, i) => mapCategoryToHelpTopic(c, i))
      );
      setServerOffline(false);
    } catch (err) {
      console.warn("Failed to load FAQs:", err);
      setGeneralFaqs([]);
      setHelpTopics([]);
    } finally {
      setIsLoadingFaqs(false);
    }
  }, []);

  const loadContactConfig = useCallback(async () => {
    try {
      const cfg = await getSupportContactConfig();
      setContactConfig(cfg);
    } catch (err) {
      console.warn("Failed to load contact config:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        await hydrateSellerSession();
        if (cancelled) return;
        await Promise.allSettled([loadTickets(), loadFaqs(), loadContactConfig()]);
        if (cancelled) return;
        const conn = await checkServerConnection();
        if (cancelled) return;
        if (conn.error === "not_authenticated") {
          setServerOffline(false);
          return;
        }
        setServerOffline(!conn.ok);
      })();
      return () => {
        cancelled = true;
      };
    }, [loadTickets, loadFaqs, loadContactConfig])
  );

  const handleTicketUpdated = useCallback((updated: Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  if (!fontsLoaded) return null;

  const searchLower = search.toLowerCase().trim();
  const filteredFaqs = generalFaqs.filter(
    (f) =>
      !searchLower ||
      f.question.toLowerCase().includes(searchLower) ||
      f.answer.toLowerCase().includes(searchLower)
  );

  // ── Contact options ──────────────────────────────────────────────────────
  type ContactType = "ticket" | "email" | "call";

  const openTicketModal = () => setTicketModalVisible(true);

  const contactOptions: { type: ContactType; label: string; sub: string; action: () => void }[] = [
    {
      type: "ticket",
      label: "Raise a Ticket",
      sub: "Submit your issue and we will respond within 24 hours",
      action: openTicketModal,
    },
    {
      type: "email",
      label: "Email Support",
      sub: contactConfig?.email?.address ?? "support@flintandthread.in",
      action: () => {
        const address = contactConfig?.email?.address ?? "support@flintandthread.in";
        openSupportEmail(address);
      },
    },
    {
      type: "call",
      label: "Call Support",
      sub: contactConfig?.call?.hours ?? contactConfig?.call?.subtitle ?? "Mon–Sun, 9 AM – 6 PM",
      action: () => Linking.openURL(`tel:${contactConfig?.call?.phone ?? "9063499092"}`),
    },
  ];

  // ── Ticket Submit ────────────────────────────────────────────────────────
  const handleTicketSubmit = async () => {
    const titleEmpty = !issueTitle.trim();
    const descEmpty = !description.trim();
    const hasImage = !!uploadedImage;

    setIssueTitleError(titleEmpty);
    setDescriptionError(descEmpty && !hasImage);

    if (titleEmpty) {
      Alert.alert("Required", "Please enter a subject for your ticket.");
      return;
    }
    if (descEmpty && !hasImage) {
      Alert.alert("Required", "Please enter a description or attach an image.");
      return;
    }

    setIsSubmitting(true);

    try {
      const ticketPayload: CreateTicketPayload = {
        subject: issueTitle.trim(),
        category: selectedCategory,
        priority: selectedPriority,
      };
      const desc = description.trim();
      if (desc) {
        ticketPayload.description = desc;
      } else if (hasImage) {
        ticketPayload.description = "See attached image";
      }

      const apiTicket = uploadedImage
        ? await apiCreateTicketWithImage(ticketPayload, uploadedImage)
        : await apiCreateTicket(ticketPayload);

      const newTicket = mapApiTicket(apiTicket);
      setTickets((prev) => [newTicket, ...prev.filter((t) => t.id !== newTicket.id)]);
      setSubmittedTitle(newTicket.title);
      setExpandedTicketId(newTicket.id);
      setActiveTopic("tickets");

      setIssueTitle("");
      setDescription("");
      setSelectedCategory("general");
      setSelectedPriority("medium");
      setUploadedImage(null);
      setIssueTitleError(false);
      setDescriptionError(false);

      setSuccessModalVisible(true);
      setTicketModalVisible(false);
      setTicketSubmitted(true);
      setTimeout(() => setTicketSubmitted(false), 5000);

      loadTickets().catch(() => {});
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickImage = async () => {
    if (Platform.OS !== "web") {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library in Settings."
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
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

  const handleFeedbackSubmit = async () => {
    if (!rating) {
      showWarning("Rating Required", "Please select a star rating before submitting.");
      return;
    }

    if (isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);
    try {
      const result = await submitSupportFeedback({ rating, feedbackText: feedback });
      setFeedbackSubmitted(true);
      showSuccess("Thanks!", result.message || "Your feedback has been submitted.");
      setTimeout(() => {
        setFeedbackSubmitted(false);
        setRating(0);
        setFeedback("");
      }, 3000);
    } catch (e: any) {
      showError(
        "Feedback Failed",
        e?.message || "Could not submit your feedback. Please try again."
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // ── Raise Ticket Form (modal) ────────────────────────────────────────────
  const renderRaiseTicketForm = () => (
    <View style={s.cardInner}>
      {ticketSubmitted ? (
        <View style={s.successBox}>
          <Ionicons name="checkmark-circle" size={48} color="#27AE60" />
          <Text style={s.successTitle}>Ticket submitted!</Text>
          <Text style={s.successSub}>We&apos;ll get back to you within 24 hours.</Text>
        </View>
      ) : (
        <>
          <View style={s.fieldLabelRow}>
            <Ionicons name="create-outline" size={13} color={C.textMid} />
            <Text style={[s.fieldLabel, { fontFamily: F.medium }]}>
              Subject <Text style={s.requiredStar}>*</Text>
            </Text>
          </View>
          <TextInput
            style={[s.fieldInput, { fontFamily: F.regular }, issueTitleError && s.fieldInputError]}
            placeholder="e.g. Payment not received"
            placeholderTextColor={C.textLight}
            value={issueTitle}
            onChangeText={(t) => { setIssueTitle(t); if (t.trim()) setIssueTitleError(false); }}
            returnKeyType="next"
          />
          {issueTitleError && (
            <View style={s.errorRow}>
              <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
              <Text style={[s.errorText, { fontFamily: F.regular }]}>Subject is required</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <View style={s.fieldLabelRow}>
                <Ionicons name="pricetag-outline" size={13} color={C.textMid} />
                <Text style={[s.fieldLabel, { fontFamily: F.medium }]}>Category</Text>
              </View>
              <View style={s.pickerWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[s.chipBtn, selectedCategory === cat.value && s.chipBtnActive]}
                      onPress={() => setSelectedCategory(cat.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.chipBtnTxt, { fontFamily: F.medium }, selectedCategory === cat.value && s.chipBtnTxtActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
          <View style={{ marginTop: 10 }}>
            <View style={s.fieldLabelRow}>
              <Ionicons name="flag-outline" size={13} color={C.textMid} />
              <Text style={[s.fieldLabel, { fontFamily: F.medium }]}>Priority</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {PRIORITIES.map((p) => {
                const priorityColors: Record<string, string> = { low: "#16A34A", medium: "#D97706", high: "#DC2626" };
                const isActive = selectedPriority === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    style={[s.chipBtn, isActive && { backgroundColor: priorityColors[p.value], borderColor: priorityColors[p.value] }]}
                    onPress={() => setSelectedPriority(p.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipBtnTxt, { fontFamily: F.medium }, isActive && { color: "#fff" }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={[s.fieldLabelRow, { marginTop: 14 }]}>
            <Ionicons name="document-text-outline" size={13} color={C.textMid} />
            <Text style={[s.fieldLabel, { fontFamily: F.medium }]}>
              Description <Text style={s.requiredStar}>*</Text>
            </Text>
          </View>
          <TextInput
            style={[s.fieldTextarea, { fontFamily: F.regular }, descriptionError && s.fieldInputError]}
            placeholder="Describe your issue in detail..."
            placeholderTextColor={C.textLight}
            value={description}
            onChangeText={(t) => { setDescription(t); if (t.trim()) setDescriptionError(false); }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity style={s.uploadBox} activeOpacity={0.7} onPress={handlePickImage}>
            {uploadedImage ? (
              <View style={s.uploadPreviewWrap}>
                <Image source={{ uri: uploadedImage }} style={s.uploadPreview} />
                <TouchableOpacity
                  style={s.uploadRemoveBtn}
                  onPress={() => setUploadedImage(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={22} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={28} color={C.textLight} />
                <Text style={[s.uploadText, { fontFamily: F.regular }]}>
                  {Platform.OS === "web" ? "Click to upload image" : "Tap to upload image"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.submitBtn, isSubmitting && s.submitBtnDisabled]}
            onPress={handleTicketSubmit}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            <View style={s.btnInner}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="send" size={15} color="#fff" style={{ marginRight: 8 }} />
              )}
              <Text style={[s.submitBtnText, { fontFamily: F.semiBold }]}>
                {isSubmitting ? "Submitting..." : "Create Support Ticket"}
              </Text>
            </View>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  // ── Contact Row ──────────────────────────────────────────────────────────
  const ContactRow = ({ option, isLast }: { option: (typeof contactOptions)[0]; isLast: boolean }) => {
    const bgMap: Record<ContactType, string> = { ticket: "#F0FDF4", email: "#E1F5EE", call: C.orangePale };
    const iconMap: Record<ContactType, { name: string; color: string }> = {
      ticket: { name: "ticket-outline", color: "#16A34A" },
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
        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
      </TouchableOpacity>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />

      {/* ── Live Chat Modal ── */}
      <LiveChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        contactConfig={contactConfig}
      />

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

      <Modal
        visible={ticketModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTicketModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={tm.overlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={tm.backdrop} activeOpacity={1} onPress={() => setTicketModalVisible(false)} />
          <View style={[tm.sheet, isDesktop && tm.sheetDesktop]}>
            <View style={tm.header}>
              <View style={tm.headerLeft}>
                <MaterialCommunityIcons name="ticket-outline" size={20} color="#16A34A" />
                <Text style={[tm.headerTitle, { fontFamily: F.bold }]}>Raise a Ticket</Text>
              </View>
              <TouchableOpacity onPress={() => setTicketModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={C.textMid} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={tm.scroll}
              contentContainerStyle={tm.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={s.card}>{renderRaiseTicketForm()}</View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SweetAlertHost />

      <AppHeader
        title="Help & Support"
        showBackButton
        rightActions={
          <View style={s.headerIconWrap}>
            <Ionicons name="help-circle-outline" size={22} color={C.orange} />
          </View>
        }
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, isWeb && s.scrollContentWeb]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            s.pageInner,
            isWeb && { maxWidth: isDesktop ? 1100 : Math.min(720, windowWidth - 32), alignSelf: "center" as const },
          ]}
        >
        {serverOffline && (
          <View style={s.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color="#B45309" />
            <Text style={[s.offlineBannerText, { fontFamily: F.medium }]}>
              Backend offline. Start server on port 8080, then reload app.
            </Text>
          </View>
        )}

        {/* Navy Banner */}
        <View style={s.navyBanner}>
          <View style={s.bannerIconWrap}>
            <Ionicons name="headset-outline" size={24} color={C.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { fontFamily: F.semiBold }]}>Need help right away?</Text>
            <Text style={[s.bannerSub, { fontFamily: F.regular }]}>Raise a ticket · we typically respond within 24 hours</Text>
          </View>
          <TouchableOpacity style={s.bannerBtn} onPress={openTicketModal} activeOpacity={0.85}>
            <Text style={[s.bannerBtnTxt, { fontFamily: F.semiBold }]}>Raise a ticket</Text>
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

        {/* Help Topics */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <View style={[s.sectionLabelPill, { backgroundColor: "#F5F3FF" }]}>
              <Ionicons name="grid-outline" size={14} color="#7C3AED" />
              <Text style={[s.sectionLabel, { fontFamily: F.bold, color: "#7C3AED" }]}>Help Topics</Text>
            </View>
          </View>
          <View style={[s.topicsGrid, isWeb && s.topicsGridWeb, isDesktop && s.topicsGridDesktop]}>
            {!isLoadingFaqs && helpTopics.length === 0 ? (
              <View style={[s.card, { width: "100%", padding: 16 }]}>
                <Text style={[s.emptyTicketsSub, { fontFamily: F.regular, textAlign: "center" }]}>
                  No help topics available at the moment.
                </Text>
              </View>
            ) : null}
            {helpTopics.map((t, i) => {
              const isActive = typeof activeTopic !== "string" && activeTopic?.label === t.label;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.topicPill,
                    isDesktop && s.topicPillDesktop,
                    isActive && s.topicPillActive,
                    isActive && { borderColor: t.color },
                  ]}
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
            <TicketStatusPanel
              tickets={tickets}
              onClose={() => {
                setActiveTopic(null);
                setExpandedTicketId(null);
              }}
              isLoadingTickets={isLoadingTickets}
              expandedTicketId={expandedTicketId}
              onExpandedChange={setExpandedTicketId}
              onTicketUpdated={handleTicketUpdated}
              onRefresh={loadTickets}
            />
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
                    style={[s.outlineBtn, (!rating || isSubmittingFeedback) && s.submitBtnDisabled]}
                    onPress={handleFeedbackSubmit}
                    disabled={!rating || isSubmittingFeedback}
                    activeOpacity={0.8}
                  >
                    <View style={s.btnInner}>
                      {isSubmittingFeedback ? (
                        <ActivityIndicator size="small" color={C.navy} style={{ marginRight: 7 }} />
                      ) : (
                        <Ionicons name="checkmark-done-outline" size={16} color={C.navy} style={{ marginRight: 7 }} />
                      )}
                      <Text style={[s.outlineBtnText, { fontFamily: F.medium }]}>
                        {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
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
  scrollContentWeb: { paddingHorizontal: 8 },
  pageInner: { width: "100%" },
  sectionWeb: { marginTop: 16 },

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

  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  offlineBannerText: { flex: 1, fontSize: 13, color: "#92400E" },
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

  pickerWrap: { marginTop: 2 },
  chipBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#D1D9E6", backgroundColor: C.lightGray },
  chipBtnActive: { backgroundColor: C.navy, borderColor: C.navy },
  chipBtnTxt: { fontSize: 13, color: C.textMid },
  chipBtnTxtActive: { color: C.white },
  submitBtn: { marginTop: 16, backgroundColor: C.navy, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 15, color: C.white, letterSpacing: 0.2 },
  btnInner: { flexDirection: "row", alignItems: "center" },
  outlineBtn: { marginTop: 12, borderWidth: 0.5, borderColor: "#D1D9E6", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  outlineBtnText: { fontSize: 15, color: C.navy },

  topicsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicsGridWeb: { gap: 10 },
  topicsGridDesktop: { gap: 12 },
  topicPillDesktop: { flexBasis: "31%", flexGrow: 1, maxWidth: "48%" },
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
  ticketMetaLine: { fontSize: 11, color: C.textLight, marginTop: 2 },
  ticketStatusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  ticketStatusBadgeTxt: { fontSize: 11 },
  refreshTicketsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  ticketDetailSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EBF0F8",
  },
  ticketDetailSectionTitle: { fontSize: 14, color: C.textDark, marginBottom: 10 },
  noMsgsText: { fontSize: 13, color: C.textLight, textAlign: "center", marginVertical: 12 },
  msgThread: { gap: 10, marginBottom: 12 },
  ticketMsgRow: { flexDirection: "row", marginBottom: 4 },
  ticketMsgRowSeller: { justifyContent: "flex-end" },
  ticketMsgRowAdmin: { justifyContent: "flex-start" },
  ticketMsgBubble: {
    maxWidth: "88%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ticketMsgBubbleSeller: { backgroundColor: C.navy, borderBottomRightRadius: 4 },
  ticketMsgBubbleAdmin: {
    backgroundColor: C.lightGray,
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: "#E5E9F0",
  },
  ticketMsgSender: { fontSize: 11, color: "#7C3AED", marginBottom: 4 },
  ticketMsgText: { fontSize: 14, color: C.textDark, lineHeight: 20 },
  ticketMsgTextSeller: { color: C.white },
  ticketMsgTime: { fontSize: 10, color: C.textLight, marginTop: 6 },
  ticketMsgAttachment: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#E5E9F0",
  },
  replyImagePreviewWrap: {
    position: "relative",
    alignSelf: "flex-start",
    marginTop: 8,
    marginBottom: 4,
  },
  replyImagePreview: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#E5E9F0",
  },
  replyImageRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: C.white,
    borderRadius: 11,
  },
  replyBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  replyAttachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.lightGray,
    borderWidth: 0.5,
    borderColor: "#D1D9E6",
    alignItems: "center",
    justifyContent: "center",
  },
  replyInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 0.5,
    borderColor: "#D1D9E6",
    borderRadius: 12,
    backgroundColor: C.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.textDark,
  },
  replySendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  replySendBtnDisabled: { opacity: 0.4 },
  closedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  closedBannerTxt: { fontSize: 13, color: C.textMid },
  closeTicketLink: { alignItems: "center", marginTop: 10, paddingVertical: 6 },
  closeTicketLinkTxt: { fontSize: 13, color: C.textLight, textDecorationLine: "underline" },

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

const tm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "88%",
    backgroundColor: C.white,
    borderRadius: 16,
    overflow: "hidden",
    zIndex: 1,
  },
  sheetDesktop: { maxHeight: "85%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#F0FDF4",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 17, color: C.textDark },
  scroll: { maxHeight: 520 },
  scrollContent: { padding: 16 },
});

// ─────────────────────────────────────────────────────────────────────────────
// LIVE CHAT STYLES  (prefix: cs)
// ─────────────────────────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.52)", justifyContent: "flex-end" },
  overlayDesktop: {
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingRight: 24,
    paddingBottom: 24,
  },
  sheet: { backgroundColor: "#F7F8FB", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", minHeight: "60%", overflow: "hidden" },
  sheetDesktop: {
    width: 420,
    height: 650,
    maxHeight: "85%",
    borderRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },

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
