import { useEffect } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";

/** Legacy route — redirects to the real auth login backed by the API. */
export default function LegacyLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(auth)/login");
  }, [router]);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
