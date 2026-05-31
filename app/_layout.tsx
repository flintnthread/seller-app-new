import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { LogBox, Platform } from "react-native";
import NotificationsProvider from "@/app/providers/NotificationsProvider";
import { hydrateSellerSession } from "@/lib/api/sellerSession";
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  "Unable to activate keep awake",
  "SafeAreaView has been deprecated",
]);

export default function RootLayout() {
  const [sessionReady, setSessionReady] = useState(false);
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    void hydrateSellerSession().finally(() => setSessionReady(true));
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason?.message ?? event.reason ?? "");
      if (msg.includes("Unable to activate keep awake")) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if ((!loaded && !error) || !sessionReady) {
    return null;
  }

  return (
    <NotificationsProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(main)" options={{ animation: 'fade' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </NotificationsProvider>
  );
}
