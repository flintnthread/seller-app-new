import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { shouldShowSellerTopNav } from "@/lib/navigation/sellerNavConfig";
import { useSellerProfileSummary } from "@/hooks/useSellerProfileSummary";
import { useProfileStatus } from "@/hooks/useProfileStatus";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  rightActions?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBackButton = true,
  rightActions,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { summary } = useSellerProfileSummary();
  const { isProfileCompleted } = useProfileStatus();
  const profileDone = summary?.profileCompleted === true || isProfileCompleted;
  const approval = summary?.accountStatus?.approvalState;
  const showSellerTools = profileDone && approval === "approved";

  // On Web/Desktop, DesktopHeader covers primary screens — but secondary screens
  // that request a back button still need this in-page header.
  if (Platform.OS === "web" && !showBackButton) {
    return null;
  }

  // SellerTopNav already shows title + nav on primary screens.
  if (shouldShowSellerTopNav(pathname)) {
    return null;
  }

  return (
    <SafeAreaView style={styles.navSafe}>
      <View style={styles.navBar}>
        {showBackButton ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.navIconBtn, styles.logoCircle]}>
            <Image
              source={require("../../assets/images/fav.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.navTitleContainer}>
          <Text style={styles.navName} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.navGreeting} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.navRight}>
          {rightActions ? (
            rightActions
          ) : showSellerTools ? (
            <>
              <TouchableOpacity style={styles.navIconBtn} onPress={() => router.push("/(main)/notifications")}>
                <Ionicons name="notifications-outline" size={22} color="#ffffff" />
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>3</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navIconBtn} onPress={() => router.push("/(main)/settingsModule")}>
                <Ionicons name="settings-outline" size={22} color="#ffffff" />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  navSafe: {
    backgroundColor: "#151D4F", // Matches C.navyDeep of Dashboard header
    ...Platform.select({
      android: {
        paddingTop: 18,
      },
      default: {},
    }),
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 70,
    minHeight: 70,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  logoCircle: {
    backgroundColor: "#ffffff",
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  logoImg: {
    width: 24,
    height: 24,
  },
  navIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  navTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  navName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#ffffff",
  },
  navGreeting: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginBottom: -2,
  },
  navRight: {
    flexDirection: "row",
    gap: 8,
  },
  notifBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EA6000",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffffff",
    paddingHorizontal: 2,
  },
  notifBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 8,
    color: "#ffffff",
    lineHeight: 10,
  },
});
