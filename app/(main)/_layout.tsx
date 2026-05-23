import { Tabs, Slot } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { WebLayout } from "@/components/web/WebLayout";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <Slot />
      </WebLayout>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          display: 'flex',
        }
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Ordersscreen"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="cube.box.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="productmanagement"
        options={{
          title: "Products",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bag.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payoutrequest"
        options={{
          title: "Payments",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="cart.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.crop.circle" color={color} />
          ),
        }}
      />

      {/* Hidden screens from the tab bar but still part of the tabs group if needed */}
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
    </Tabs>
  );
}
