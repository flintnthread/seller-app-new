import { Tabs, Slot, usePathname } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { WebLayout } from "@/components/web/WebLayout";
import { SellerTopNav } from "@/components/common/SellerTopNav";
import { shouldShowSellerTopNav } from "@/lib/navigation/sellerNavConfig";
import { Ionicons } from "@expo/vector-icons";

function MobileMainLayout() {
  const pathname = usePathname();
  const showNav = shouldShowSellerTopNav(pathname);

  return (
    <View style={{ flex: 1 }}>
      {showNav ? <SellerTopNav /> : null}
      <View style={{ flex: 1 }}>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
          marginBottom: Platform.OS === "ios" ? 0 : 6,
        },
        tabBarStyle: {
          display: 'none',
        }
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarActiveTintColor: "#2563EB", // Blue
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Ordersscreen"
        options={{
          title: "Orders",
          tabBarActiveTintColor: "#EA6000", // Orange
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "receipt" : "receipt-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="productmanagement"
        options={{
          title: "Products",
          tabBarActiveTintColor: "#7C3AED", // Purple
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "basket" : "basket-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: "Profile",
          tabBarActiveTintColor: "#10B981", // Green
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* Hidden screens from the bottom tab bar but still registered as routes */}
      <Tabs.Screen name="payoutrequest" options={{ href: null }} />
      <Tabs.Screen name="helpsupport" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="earning" options={{ href: null }} />
      <Tabs.Screen name="sellerpersonalinfo" options={{ href: null }} />
      <Tabs.Screen name="sellerbusinessinfo" options={{ href: null }} />
      <Tabs.Screen name="selleraddressinfo" options={{ href: null }} />
      <Tabs.Screen name="sellerbanking" options={{ href: null }} />
      <Tabs.Screen name="sellerdocuments" options={{ href: null }} />
      <Tabs.Screen name="sellerticketrise" options={{ href: null }} />
      <Tabs.Screen name="colors" options={{ href: null }} />
      <Tabs.Screen name="sizes" options={{ href: null }} />
      <Tabs.Screen name="categoryrequest" options={{ href: null }} />
      <Tabs.Screen name="settingsModule" options={{ href: null }} />
      <Tabs.Screen name="viewsellerprofile" options={{ href: null }} />
    </Tabs>
      </View>
    </View>
  );
}

export default function TabLayout() {
  useColorScheme();

  if (Platform.OS === "web") {
    return (
      <WebLayout>
        <Slot />
      </WebLayout>
    );
  }

  return <MobileMainLayout />;
}
