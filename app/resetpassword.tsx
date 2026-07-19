import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Deep-link entry for password-reset emails (`/resetpassword?token=...`).
 * Mirrors app/verify-email.tsx — must Redirect (not re-export) so Expo Router
 * does not conflict with app/(auth)/resetpassword.
 */
export default function ResetPasswordDeepLink() {
  const params = useLocalSearchParams<{
    token?: string;
    error?: string;
    email?: string;
  }>();

  const nextParams: Record<string, string> = {};
  for (const key of ["token", "error", "email"] as const) {
    const raw = params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string" && value.length > 0) {
      nextParams[key] = value;
    }
  }

  return (
    <Redirect
      href={{
        pathname: "/(auth)/resetpassword",
        params: nextParams,
      }}
    />
  );
}
