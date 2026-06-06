import React, { useMemo, useState, useEffect, useCallback } from "react";
import { fetchSellerSettings, updateSellerSettings } from "@/services/settingsApi";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { clearSellerId } from "@/lib/api/sellerSession";
import { fetchDashboard } from "@/services/dashboardApi";

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  type?: "toggle" | "navigation" | "danger";
}

export default function SettingsScreen() {
  const router = useRouter();
  const { profile } = useSellerProfile();
  const sellerName =
    profile?.businessName?.trim() ||
    profile?.fullName?.trim() ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
    "Seller";
  const avatarUri = profile?.profilePicUrl || profile?.profilePic || undefined;
  const [darkMode, setDarkMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [biometric, setBiometric] = useState(true);
  const [search, setSearch] = useState("");
  const [headerStats, setHeaderStats] = useState({
    revenue: "—",
    rating: "—",
    orders: "—",
  });

  useEffect(() => {
    fetchDashboard()
      .then((row) => {
        setHeaderStats({
          revenue: row.overview?.salesFormatted ?? "—",
          rating: row.overview?.rating ? String(row.overview.rating) : "—",
          orders: String(row.overview?.orders ?? 0),
        });
      })
      .catch(() => {
        setHeaderStats({ revenue: "—", rating: "—", orders: "—" });
      });
  }, []);

  const handleItemPress = useCallback(
    (item: SettingItem) => {
      switch (item.id) {
        case "1":
          router.push("/(auth)/forgot-password" as any);
          break;
        case "2":
          router.push("/(main)/sellerbanking");
          break;
        case "3":
          router.push("/(main)/sellerbusinessinfo");
          break;
        case "4":
          router.push("/(main)/sellerbusinessinfo");
          break;
        case "6":
          Alert.alert("Two-Factor Authentication", "Contact support to enable 2FA on your account.");
          break;
        case "7":
          Alert.alert("Connected Devices", "Device management will be available in a future update.");
          break;
        case "10":
          router.push("/(main)/payoutrequest");
          break;
        case "12":
          Alert.alert("Shipping Preferences", "Configure shipping in product delivery settings.");
          break;
        case "13":
          Alert.alert("Auto Reply", "Auto reply settings will be available soon.");
          break;
        case "14":
        case "15":
          router.push("/(main)/helpsupport");
          break;
        case "16":
          router.push("/legal-document?type=privacy");
          break;
        case "17":
          if (Platform.OS === "web") {
            if (window.confirm("Are you sure you want to logout?")) {
              void clearSellerId().then(() => router.replace("/(auth)/login"));
            }
          } else {
            Alert.alert("Logout", "Are you sure you want to logout?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Logout",
                style: "destructive",
                onPress: () => {
                  void clearSellerId().then(() => router.replace("/(auth)/login"));
                },
              },
            ]);
          }
          break;
        case "18":
          Alert.alert("Delete Account", "Please contact support to delete your seller account.");
          break;
        default:
          break;
      }
    },
    [router]
  );

  const filterItems = useCallback(
    (items: SettingItem[]) => {
      const q = search.trim().toLowerCase();
      if (!q) return items;
      return items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle?.toLowerCase().includes(q)
      );
    },
    [search]
  );

  useEffect(() => {
    fetchSellerSettings()
      .then((s) => {
        setPushNotifications(s.pushNotifications);
        setOrderUpdates(s.orderUpdates);
        setVacationMode(s.vacationMode);
        setDarkMode(s.darkMode);
        setBiometric(s.biometricLogin);
      })
      .catch(() => undefined);
  }, []);

  const persistSettings = useCallback((patch: Parameters<typeof updateSellerSettings>[0]) => {
    updateSellerSettings(patch).catch(() => undefined);
  }, []);

  const accountSettings: SettingItem[] = useMemo(
    () => [
      {
        id: "1",
        title: "Change Password",
        subtitle: "Update your account password",
        icon: "lock-closed-outline",
      },
      {
        id: "2",
        title: "Manage Bank Accounts",
        subtitle: "Add or remove bank accounts",
        icon: "card-outline",
      },
      {
        id: "3",
        title: "Business Information",
        subtitle: "Update your seller profile",
        icon: "business-outline",
      },
      {
        id: "4",
        title: "Tax Information",
        subtitle: "Manage GST & tax details",
        icon: "document-text-outline",
      },
    ],
    []
  );

  const securitySettings: SettingItem[] = useMemo(
    () => [
      {
        id: "5",
        title: "Biometric Login",
        subtitle: "Enable Face ID / Fingerprint",
        icon: "finger-print-outline",
        type: "toggle",
      },
      {
        id: "6",
        title: "Two-Factor Authentication",
        subtitle: "Extra account protection",
        icon: "shield-checkmark-outline",
      },
      {
        id: "7",
        title: "Connected Devices",
        subtitle: "Manage active devices",
        icon: "phone-portrait-outline",
      },
    ],
    []
  );

  const notificationSettings: SettingItem[] = useMemo(
    () => [
      {
        id: "8",
        title: "Push Notifications",
        subtitle: "Receive push notifications",
        icon: "notifications-outline",
        type: "toggle",
      },
      {
        id: "9",
        title: "Order Updates",
        subtitle: "Get order activity alerts",
        icon: "cube-outline",
        type: "toggle",
      },
      {
        id: "10",
        title: "Payout Alerts",
        subtitle: "Withdrawal & earnings alerts",
        icon: "wallet-outline",
      },
    ],
    []
  );

  const storeSettings: SettingItem[] = useMemo(
    () => [
      {
        id: "11",
        title: "Vacation Mode",
        subtitle: "Pause incoming orders",
        icon: "airplane-outline",
        type: "toggle",
      },
      {
        id: "12",
        title: "Shipping Preferences",
        subtitle: "Manage shipping options",
        icon: "car-outline",
      },
      {
        id: "13",
        title: "Auto Reply",
        subtitle: "Automate customer replies",
        icon: "chatbubble-ellipses-outline",
      },
    ],
    []
  );

  const supportSettings: SettingItem[] = useMemo(
    () => [
      {
        id: "14",
        title: "Help Center",
        subtitle: "Get support and FAQs",
        icon: "help-circle-outline",
      },
      {
        id: "15",
        title: "Live Chat Support",
        subtitle: "Talk with our support team",
        icon: "headset-outline",
      },
      {
        id: "16",
        title: "Privacy Policy",
        subtitle: "Read our privacy policy",
        icon: "document-lock-outline",
      },
    ],
    []
  );

  const dangerZone: SettingItem[] = useMemo(
    () => [
      {
        id: "17",
        title: "Logout",
        subtitle: "Sign out from this device",
        icon: "log-out-outline",
        type: "danger",
      },
      {
        id: "18",
        title: "Delete Account",
        subtitle: "Permanently remove account",
        icon: "trash-outline",
        type: "danger",
      },
    ],
    []
  );

  const renderItem = (item: SettingItem) => {
    const isToggle = item.type === "toggle";
    return (
      <TouchableOpacity
        activeOpacity={isToggle ? 1 : 0.85}
        key={item.id}
        style={[styles.settingCard, item.type === "danger" && styles.dangerCard]}
        onPress={() => {
          if (!isToggle) handleItemPress(item);
        }}
      >
        <View style={styles.settingLeft}>
          <View
            style={[
              styles.iconContainer,
              item.type === "danger" && styles.dangerIconContainer,
            ]}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={item.type === "danger" ? "#ef4444" : "#2563eb"}
            />
          </View>

          <View style={styles.textContainer}>
            <AppText
              style={[
                styles.settingTitle,
                item.type === "danger" && styles.dangerText,
              ]}
            >
              {item.title}
            </AppText>

            {item.subtitle ? (
              <AppText style={styles.settingSubtitle}>{item.subtitle}</AppText>
            ) : null}
          </View>
        </View>

        {item.type === "toggle" ? (
          <Switch
            value={
              item.id === "5"
                ? biometric
                : item.id === "8"
                ? pushNotifications
                : item.id === "9"
                ? orderUpdates
                : vacationMode
            }
            onValueChange={(value) => {
              if (item.id === "5") {
                setBiometric(value);
                persistSettings({ biometricLogin: value });
              } else if (item.id === "8") {
                setPushNotifications(value);
                persistSettings({ pushNotifications: value });
              } else if (item.id === "9") {
                setOrderUpdates(value);
                persistSettings({ orderUpdates: value });
              } else {
                setVacationMode(value);
                persistSettings({ vacationMode: value });
              }
            }}
          />
        ) : (
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#94a3b8"
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {Platform.OS === "web" ? (
          <View style={styles.pageHeaderWeb}>
            <View style={styles.titleContainerWeb}>
              <View style={styles.breadcrumbWeb}>
                <TouchableOpacity onPress={() => router.push("/(main)/dashboard")}>
                  <AppText style={styles.breadcrumbDimWeb}>Dashboard</AppText>
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.6)" />
                <AppText style={styles.breadcrumbActiveWeb}>Settings</AppText>
              </View>
              <AppText style={styles.pageTitleWeb}>Settings</AppText>
            </View>
          </View>
        ) : (
          <View style={styles.pageTitleWrap}>
            <AppText style={styles.pageTitle}>Settings</AppText>
            <AppText style={styles.pageSubtitle}>Manage your seller account</AppText>
          </View>
        )}

        {/* Profile Card */}

        <LinearGradient
          colors={Platform.OS === "web" ? ["#3B82F6", "#2563EB", "#1E40AF"] : ["#bd7e11d7", "#d07a24dd", "#c88615ff"]}
          style={styles.profileCard}
        >
          <View style={styles.profileTop}>
            <View style={styles.profileRow}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, { backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="person" size={28} color="#9CA3AF" />
                </View>
              )}

              <View>
                <View style={styles.nameRow}>
                  <AppText style={styles.profileName}>{sellerName}</AppText>

                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#22c55e"
                    />

                    <AppText style={styles.verifiedText}>Active</AppText>
                  </View>
                </View>

                <AppText style={styles.profileEmail}>
                  {profile?.email || "—"}
                </AppText>

                <AppText style={styles.profileId}>
                  {profile?.id != null ? `Seller ID: ${profile.id}` : "Seller ID: —"}
                </AppText>
              </View>
            </View>

            <TouchableOpacity style={styles.editButton} onPress={() => router.push("/viewsellerprofile")}>
              <Feather name="edit-2" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.analyticsRow}>
            <View style={styles.analyticsBox}>
              <AppText style={styles.analyticsValue}>{headerStats.revenue}</AppText>
              <AppText style={styles.analyticsLabel}>Revenue</AppText>
            </View>

            <View style={styles.analyticsBox}>
              <AppText style={styles.analyticsValue}>{headerStats.rating}</AppText>
              <AppText style={styles.analyticsLabel}>Ratings</AppText>
            </View>

            <View style={styles.analyticsBox}>
              <AppText style={styles.analyticsValue}>{headerStats.orders}</AppText>
              <AppText style={styles.analyticsLabel}>Orders</AppText>
            </View>
          </View>
        </LinearGradient>

        {/* Search */}

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            placeholder="Search settings..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        {/* Account Settings */}

        <AppText style={styles.sectionTitle}>Account Settings</AppText>

        {filterItems(accountSettings).map(renderItem)}

        {/* Security */}

        <AppText style={styles.sectionTitle}>Security</AppText>

        {filterItems(securitySettings).map(renderItem)}

        {/* Notifications */}

        <AppText style={styles.sectionTitle}>Notifications</AppText>

        {filterItems(notificationSettings).map(renderItem)}

        {/* Store Settings */}

        <AppText style={styles.sectionTitle}>Store Settings</AppText>

        {filterItems(storeSettings).map(renderItem)}

        {/* App Preferences */}

        <AppText style={styles.sectionTitle}>App Preferences</AppText>

        <TouchableOpacity style={styles.settingCard}>
          <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="moon-outline"
                size={20}
                color="#2563eb"
              />
            </View>

            <View style={styles.textContainer}>
              <AppText style={styles.settingTitle}>Dark Mode</AppText>

              <AppText style={styles.settingSubtitle}>
                Switch app appearance
              </AppText>
            </View>
          </View>

          <Switch
            value={darkMode}
            onValueChange={(value) => {
              setDarkMode(value);
              persistSettings({ darkMode: value });
            }}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingCard} onPress={() => Alert.alert("Language", "English (India) is the only language available right now.")}>
          <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="language-outline"
                size={20}
                color="#2563eb"
              />
            </View>

            <View style={styles.textContainer}>
              <AppText style={styles.settingTitle}>Language</AppText>

              <AppText style={styles.settingSubtitle}>
                English (India)
              </AppText>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#94a3b8"
          />
        </TouchableOpacity>

        {/* Support */}

        <AppText style={styles.sectionTitle}>Support & Help</AppText>

        {filterItems(supportSettings).map(renderItem)}

        {/* App Info */}

        <View style={styles.infoCard}>
          <AppText style={styles.infoTitle}>App Version</AppText>

          <AppText style={styles.infoValue}>v2.4.1</AppText>
        </View>

        {/* Danger Zone */}

        <AppText style={styles.dangerHeading}></AppText>

        {filterItems(dangerZone).map(renderItem)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === "web" ? "#F1F5F9" : "#f8fafc",
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === "web" ? 16 : 20,
    paddingTop: Platform.OS === "web" ? 10 : 0,
    paddingBottom: 40,
  },
  pageTitleWrap: {
    marginTop: 8,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    color: "#0f172a",
  },
  pageSubtitle: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 13,
  },
  pageHeaderWeb: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
    backgroundColor: "#151D4F",
    paddingHorizontal: 32,
    paddingVertical: 28,
    paddingBottom: 68,
    borderRadius: 22,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    marginHorizontal: 2,
    marginTop: 12,
    shadowColor: "#151D4F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  titleContainerWeb: {
    paddingLeft: 0,
    marginVertical: 0,
  },
  breadcrumbWeb: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  breadcrumbDimWeb: { fontFamily: fontFamilies.medium, fontSize: 13, color: "rgba(255,255,255,0.75)" },
  breadcrumbActiveWeb: { fontFamily: fontFamilies.semiBold, fontSize: 13, color: "#FFFFFF" },
  pageTitleWeb: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 24,
  },

  heading: {
    fontSize: 30,
    fontFamily: fontFamilies.bold,
    color: "#0f172a",
  },

  subHeading: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 13,
  },

  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  profileCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    marginTop: -42,
    marginHorizontal: 6,
    zIndex: 10,
  },

  profileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 14,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileName: {
    color: "#fff",
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    marginRight: 10,
  },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },

  verifiedText: {
    color: "#fff",
    fontSize: 11,
    marginLeft: 4,
    fontFamily: fontFamilies.bold,
  },

  profileEmail: {
    color: "#dbeafe",
    marginTop: 8,
    fontSize: 13,
  },

  profileId: {
    color: "#bfdbfe",
    marginTop: 4,
    fontSize: 12,
  },

  editButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  analyticsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },

  analyticsBox: {
    alignItems: "center",
  },

  analyticsValue: {
    color: "#fff",
    fontSize: 22,
    fontFamily: fontFamilies.bold,
  },

  analyticsLabel: {
    color: "#bfdbfe",
    marginTop: 4,
    fontSize: 12,
  },

  searchContainer: {
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  searchInput: {
    marginLeft: 10,
    flex: 1,
    color: "#0f172a",
    fontFamily: fontFamilies.semiBold,
  },

  sectionTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    color: "#0f172a",
    marginBottom: 16,
    marginTop: 10,
  },

  settingCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)" as unknown as undefined,
      },
      default: {},
    }),
  },

  dangerCard: {
    borderWidth: 1,
    borderColor: "#fecaca",
  },

  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  dangerIconContainer: {
    backgroundColor: "#fee2e2",
  },

  textContainer: {
    flex: 1,
  },

  settingTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.bold,
    color: "#0f172a",
  },

  dangerText: {
    color: "#ef4444",
  },

  settingSubtitle: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 12,
  },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)" as unknown as undefined,
      },
      default: {},
    }),
  },

  infoTitle: {
    color: "#64748b",
    fontFamily: fontFamilies.semiBold,
  },

  infoValue: {
    color: "#0f172a",
    fontFamily: fontFamilies.bold,
  },

  dangerHeading: {
    color: "#ef4444",
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    marginTop: 20,
    marginBottom: 16,
  },
});
