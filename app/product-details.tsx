import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";

/** Legacy route — redirects to the main product detail screen backed by the API. */
export default function ProductDetailsRedirect() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  useEffect(() => {
    if (id) {
      router.replace({ pathname: "/(main)/Productdetail", params: { id: String(id) } });
    } else {
      router.replace("/(main)/productmanagement");
    }
  }, [id, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
