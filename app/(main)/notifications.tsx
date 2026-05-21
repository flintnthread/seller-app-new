import { useNotifications } from "@/app/providers/NotificationsProvider";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  time?: string;
  type: string;
  read?: boolean;
};

const ORANGE = "#1a2b5edc"; 

const Header: React.FC<{
  onBack: () => void;
  onMarkAll: () => void;
  count: number;
}> = ({ onBack, onMarkAll, count }) => (
  <View style={styles.header}>
    <View style={styles.headerLeftGroup}>
      <TouchableOpacity onPress={onBack} style={styles.headerLeft}>
        <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Notifications</Text>
    </View>
    <TouchableOpacity onPress={onMarkAll} style={styles.headerRight}>
      <Text style={styles.markAllText}>Mark all read</Text>
      {count > 0 ? (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  </View>
);

const SectionHeader: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  count: number;
}> = ({ icon, title, subtitle, count }) => (
  <View style={styles.sectionHeaderRow}>
    <View style={styles.sectionHeaderLeft}>
      <View style={styles.sectionIcon}>
        <MaterialCommunityIcons name={icon as any} size={18} color={ORANGE} />
      </View>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
    <View style={styles.sectionCount}>
      <Text style={styles.sectionCountText}>{count}</Text>
    </View>
  </View>
);

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function Notifications() {
  const router = useRouter();
  const { notifications, markAsSeen, markAllRead } = useNotifications();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query) return notifications;
    const q = query.toLowerCase();
    return notifications.filter((n) =>
      (n.title + (n.body || "")).toLowerCase().includes(q),
    );
  }, [notifications, query]);

  const groups = useMemo(
    () => ({
      new_order: filtered.filter((n) => n.type === "new_order"),
      order_cancelled: filtered.filter((n) => n.type === "order_cancelled"),
      low_stock: filtered.filter((n) => n.type === "low_stock"),
      payment: filtered.filter((n) => n.type === "payment"),
      tickets: filtered.filter((n) => n.type === "tickets"),
    }),
    [filtered],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderCard = (item: NotificationItem) => (
    <TouchableOpacity
      style={[styles.card, item.read ? styles.cardRead : styles.cardUnread]}
      onPress={() => {
        markAsSeen(item.id);
        if (item.type === "new_order" || item.type === "order_cancelled")
          router.push("/(main)/Ordersscreen");
        else if (item.type === "low_stock") router.push("/(main)/productmanagement");
        else if (item.type === "payment") router.push("/(main)/payoutrequest");
        else if (item.type === "tickets") router.push("/(main)/helpsupport");
      }}
    >
      <View style={styles.cardLeft}>
        <View style={styles.avatarIcon}>
          <MaterialCommunityIcons
            name={
              item.type === "payment"
                ? "currency-inr"
                : item.type === "low_stock"
                  ? "alert-circle"
                : item.type === "tickets"
                  ? "ticket-outline"
                  : "cart"
            }
            size={20}
            color="#fff"
          />
        </View>
        <View style={styles.cardText}>
          <Text
            style={[styles.cardTitle, item.read ? styles.textMuted : null]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.body ? (
            <Text style={styles.cardBody} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardTime}>
          {item.time ? formatTime(item.time) : ""}
        </Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color="#C4B59A"
        />
      </View>
    </TouchableOpacity>
  );

  const groupsData = [
    {
      key: "new_order",
      title: "New Orders",
      icon: "cart",
      subtitle: "Bought items from your store",
      items: groups.new_order,
    },
    {
      key: "order_cancelled",
      title: "Order Cancelled",
      icon: "close-circle",
      subtitle: "Cancellations & refunds",
      items: groups.order_cancelled,
    },
    {
      key: "low_stock",
      title: "Low Stock",
      icon: "alert-circle",
      subtitle: "Products running low",
      items: groups.low_stock,
    },
    {
      key: "payment",
      title: "Payment",
      icon: "currency-inr",
      subtitle: "Payments & payouts",
      items: groups.payment,
    },
    {
      key: "tickets",
      title: "Support Tickets",
      icon: "ticket-outline",
      subtitle: "Updates on your support requests",
      items: groups.tickets,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        onBack={() => router.back()}
        onMarkAll={() => markAllRead()}
        count={unreadCount}
      />

      {/* quick section tabs */}
      <View style={styles.segmentContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentContentContainer}
        >
          {[
            { key: null, label: "All" },
            { key: "new_order", label: "Orders" },
            { key: "order_cancelled", label: "Cancelled" },
            { key: "low_stock", label: "Low stock" },
            { key: "payment", label: "Payments" },
            { key: "tickets", label: "Tickets" },
          ].map((s) => {
            const active = selectedSection === s.key;
            return (
              <TouchableOpacity
                key={String(s.key)}
                onPress={() => setSelectedSection(s.key)}
                style={[
                  styles.segmentButton,
                  active ? styles.segmentButtonActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    active ? styles.segmentLabelActive : null,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search notifications"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      {selectedSection ? (
        <View style={styles.selectedBar}>
          <TouchableOpacity onPress={() => setSelectedSection(null)}>
            <Text style={styles.selectedBarText}>Show all sections</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={
          selectedSection
            ? groupsData.filter((g) => g.key === selectedSection)
            : groupsData
        }
        keyExtractor={(g) => g.key}
        renderItem={({ item }) => (
          <View style={styles.sectionWrap}>
            <SectionHeader
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              count={item.items.length}
            />
            {item.items.length ? (
              (() => {
                const PREVIEW = 3;
                const isExpanded = !!expanded[item.key];
                const itemsToShow = isExpanded
                  ? item.items
                  : item.items.slice(0, PREVIEW);
                return (
                  <>
                    {itemsToShow.map((n: any) => (
                      <View key={n.id}>
                        {renderCard({
                          id: n.id,
                          title: n.title,
                          body: n.body,
                          time: n.time,
                          type: n.type,
                          read: n.read,
                        })}
                      </View>
                    ))}
                    {item.items.length > PREVIEW ? (
                      <View style={styles.sectionActions}>
                        <TouchableOpacity
                          onPress={() =>
                            setExpanded((p) => ({
                              ...p,
                              [item.key]: !isExpanded,
                            }))
                          }
                        >
                          <Text style={styles.actionText}>
                            {isExpanded
                              ? "Show less"
                              : `Show all (${item.items.length})`}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setSelectedSection(item.key)}
                        >
                          <Text style={styles.actionText}>Open section</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </>
                );
              })()
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>
                  No {item.title.toLowerCase()}
                </Text>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: ORANGE,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { padding: 6 },
  headerLeftGroup: { flexDirection: "row", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginLeft: 4 },
  headerRight: { flexDirection: "row", alignItems: "center" },
  markAllText: { color: "#fff", marginRight: 8, fontWeight: "600" },
  countBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: { color: ORANGE, fontWeight: "700" },
  searchWrap: { padding: 12, backgroundColor: "#F5F5F5" },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    borderColor: "#E5E7EB",
    borderWidth: 1,
  },
  listContent: { paddingBottom: 40 },
  sectionWrap: { paddingHorizontal: 12, paddingTop: 12 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center" },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF3E8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  sectionSubtitle: { fontSize: 12, color: "#6B7280" },
  sectionCount: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  sectionCountText: { fontWeight: "700", color: "#374151" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {},
  cardRead: { opacity: 0.7 },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardBody: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  cardRight: { alignItems: "flex-end", marginLeft: 8 },
  cardTime: { fontSize: 12, color: "#9CA3AF", marginBottom: 6 },
  emptyRow: { paddingVertical: 14, paddingHorizontal: 8 },
  emptyText: { color: "#6B7280" },
  textMuted: { color: "#6B7280" },
  selectedBar: {
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFF8F1",
  },
  selectedBarText: { color: "#6B4A20", fontWeight: "700" },
  sectionActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 10,
  },
  actionText: { color: ORANGE, fontWeight: "700" },
  segmentContainer: {
    backgroundColor: "#FFFDF8",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  segmentContentContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  segmentButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  segmentButtonActive: { backgroundColor: ORANGE },
  segmentLabel: { color: "#6B7280", fontWeight: "600", fontSize: 13 },
  segmentLabelActive: { color: "#FFFFFF", fontWeight: "700" },
});
