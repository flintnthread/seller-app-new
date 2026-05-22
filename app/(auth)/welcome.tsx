import { Redirect } from "expo-router";

import { useAuthFlow } from "@/hooks/useAuthFlow";

/** Legacy route — redirects into the active auth flow. */
export default function WelcomeScreen() {
  const { isDesktopAuthFlow, initialAuthRoute } = useAuthFlow();
  return <Redirect href={isDesktopAuthFlow ? "/(auth)/details" : initialAuthRoute} />;
}
