import { Redirect } from "expo-router";

/** Legacy route — redirects to the real auth login backed by the API. */
export default function LegacyLoginRedirect() {
  return <Redirect href="/(auth)/login" />;
}
