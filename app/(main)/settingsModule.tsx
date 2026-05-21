import React, { useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  TextInput,
  StyleSheet,
} from "react-native";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  MaterialIcons,
  Feather,
  FontAwesome5,
} from "@expo/vector-icons";

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  type?: "toggle" | "navigation" | "danger";
}

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [biometric, setBiometric] = useState(true);
  const [search, setSearch] = useState("");

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
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        key={item.id}
        style={[
          styles.settingCard,
          item.type === "danger" && styles.dangerCard,
        ]}
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
              } else if (item.id === "8") {
                setPushNotifications(value);
              } else if (item.id === "9") {
                setOrderUpdates(value);
              } else {
                setVacationMode(value);
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}

        <View style={styles.header}>
          <View>
            <AppText style={styles.heading}>Settings</AppText>
            <AppText style={styles.subHeading}>
              Manage your seller account
            </AppText>
          </View>

          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color="#0f172a"
            />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}

        <LinearGradient
          colors={["#bd7e11d7", "#d07a24dd", "#c88615ff"] as const}
          style={styles.profileCard}
        >
          <View style={styles.profileTop}>
            <View style={styles.profileRow}>
              <Image
                source={{
                  uri: "https://i.pravatar.cc/150?img=12",
                }}
                style={styles.avatar}
              />

              <View>
                <View style={styles.nameRow}>
                  <AppText style={styles.profileName}>Sai Akshith</AppText>

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
                  [EMAIL_ADDRESS]
                </AppText>

                <AppText style={styles.profileId}>
                  Seller ID: SLR-24098
                </AppText>
              </View>
            </View>

            <TouchableOpacity style={styles.editButton}>
              <Feather name="edit-2" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.analyticsRow}>
            <View style={styles.analyticsBox}>
              <AppText style={styles.analyticsValue}>₹2.4L</AppText>
              <AppText style={styles.analyticsLabel}>Revenue</AppText>
            </View>

            <View style={styles.analyticsBox}>
              <AppText style={styles.analyticsValue}>4.8</AppText>
              <AppText style={styles.analyticsLabel}>Ratings</AppText>
            </View>

            <View style={styles.analyticsBox}>
              <AppText style={styles.analyticsValue}>12K</AppText>
              <AppText style={styles.analyticsLabel}>Orders</AppText>
            </View>
          </View>
        </LinearGradient>

        {/* Search */}

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" />

          <TextInput
            placeholder="Search settings..."
            placeholderTextColor={"#94a3b8"}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        {/* Account Settings */}

        <AppText style={styles.sectionTitle}>Account Settings</AppText>

        {accountSettings.map(renderItem)}

        {/* Security */}

        <AppText style={styles.sectionTitle}>Security</AppText>

        {securitySettings.map(renderItem)}

        {/* Notifications */}

        <AppText style={styles.sectionTitle}>Notifications</AppText>

        {notificationSettings.map(renderItem)}

        {/* Store Settings */}

        <AppText style={styles.sectionTitle}>Store Settings</AppText>

        {storeSettings.map(renderItem)}

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
            onValueChange={setDarkMode}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingCard}>
          <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
              <FontAwesome5
                name="language"
                size={18}
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

        {supportSettings.map(renderItem)}

        {/* App Info */}

        <View style={styles.infoCard}>
          <AppText style={styles.infoTitle}>App Version</AppText>

          <AppText style={styles.infoValue}>v2.4.1</AppText>
        </View>

        {/* Danger Zone */}

        <AppText style={styles.dangerHeading}></AppText>

        {dangerZone.map(renderItem)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 20,
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
  },

  infoTitle: {
    color: "#64748b",
    fontFamily: fontFamilies.semiBold,
  },

  infoValue: {
    color: "#                                                                                                                 0f172a",
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
