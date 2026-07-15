import { Redirect, useLocalSearchParams } from "expo-router";

/** Deep-link entry for `/check-email` — same pattern as login / verify-email. */
export default function CheckEmailDeepLink() {
  const params = useLocalSearchParams<{ email?: string }>();
  const emailRaw = params.email;
  const email = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw;

  return (
    <Redirect
      href={{
        pathname: "/(auth)/check-email",
        params: email ? { email } : {},
      }}
    />
  );
}
