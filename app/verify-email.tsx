import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Deep-link entry for signup emails (`/verify-email?token=...`).
 * Mirrors app/login.tsx — must Redirect (not re-export) so Expo Router
 * does not conflict with app/(auth)/verify-email.
 */
export default function VerifyEmailDeepLink() {
  const params = useLocalSearchParams<{
    email?: string;
    token?: string;
    otpSent?: string;
    verified?: string;
    error?: string;
  }>();

  const nextParams: Record<string, string> = {};
  for (const key of ["email", "token", "otpSent", "verified", "error"] as const) {
    const raw = params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string" && value.length > 0) {
      nextParams[key] = value;
    }
  }

  return (
    <Redirect
      href={{
        pathname: "/(auth)/verify-email",
        params: nextParams,
      }}
    />
  );
}
