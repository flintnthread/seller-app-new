import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";

/** Legacy route — support tickets & FAQs live on Help & Support (web + mobile). */
export default function SellerTicketRiseRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(main)/helpsupport");
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#1E3A6E" />
    </View>
  );
}
