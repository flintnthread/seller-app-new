import { Stack, useRouter } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import NotificationsProvider from "@/app/providers/NotificationsProvider";
import { hydrateSellerSession } from "@/lib/api/sellerSession";
import { parseInvoiceCodeFromUrl } from "@/lib/linking/invoiceScanUrl";
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  "Unable to activate keep awake",
  "SafeAreaView has been deprecated",
]);

export default function RootLayout() {
  const router = useRouter();

  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    // Keep existing session across refresh/navigation, especially on web.
    void hydrateSellerSession();
  }, []);

  useEffect(() => {
    // Web: browser URL already routes to /invoiceinfo — extra replace caused blank screens.
    if (Platform.OS === "web") return;

    const openInvoiceFromUrl = (url: string | null, replace = false) => {
      if (!url || !url.startsWith("fntseller://")) return;
      const code = parseInvoiceCodeFromUrl(url);
      if (!code) return;
      const target = { pathname: "/invoiceinfo" as const, params: { code } };
      if (replace) router.replace(target);
      else router.push(target);
    };

    void ExpoLinking.getInitialURL().then((url) => openInvoiceFromUrl(url, true));
    const sub = ExpoLinking.addEventListener("url", ({ url }) => openInvoiceFromUrl(url));
    return () => sub.remove();
  }, [router]);

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

  if (!loaded && !error) {
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
        <Stack.Screen name="invoiceinfo" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </NotificationsProvider>
  );
}
