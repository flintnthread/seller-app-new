import { Redirect } from "expo-router";

import { useAuthFlow } from "@/hooks/useAuthFlow";

export default function Index() {
  const { initialAuthRoute } = useAuthFlow();
  return <Redirect href={initialAuthRoute} />;
}
