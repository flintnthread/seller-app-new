const BASE_URL = "http://localhost:8080/api/auth";

async function request<T>(endpoint: string, body: object): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      throw new Error("Request timed out. Server may be slow or unreachable.");
    }

    if (err.message && !err.message.includes("Something went wrong")) {
      if (
        err.message.includes("Failed to fetch") ||
        err.message.includes("Network request failed") ||
        err.message.includes("fetch")
      ) {
        throw new Error(
          "Unable to connect to server. Make sure backend is running on port 8080."
        );
      }
    }

    throw err;
  }
}

export interface AuthResponse {
  token: string;
  message: string;
  sellerId: number;
  sellerCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

export const authApi = {
  signup(fullName: string, mobile: string, email: string, password: string) {
    return request<AuthResponse>("/signup", { fullName, mobile, email, password });
  },

  login(emailOrMobile: string, password: string) {
    return request<AuthResponse>("/login", { emailOrMobile, password });
  },

  sendOtp(mobile: string) {
    return request<ApiResponse>("/send-otp", { mobile });
  },

  verifyOtp(mobile: string, otp: string) {
    return request<ApiResponse>("/verify-otp", { mobile, otp });
  },

  forgotPasswordSendOtp(contact: string) {
    return request<ApiResponse>("/forgot-password/send-otp", { contact });
  },

  forgotPasswordVerifyOtp(contact: string, otp: string) {
    return request<ApiResponse>("/forgot-password/verify-otp", { contact, otp });
  },

  resetPassword(contact: string, otp: string, newPassword: string) {
    return request<ApiResponse>("/forgot-password/reset", { contact, otp, newPassword });
  },
};
import { Platform } from "react-native";
import { resolveApiBaseUrl } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = resolveApiBaseUrl();
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    let res: Response;
    try {
        res = await fetch(url, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(init?.headers ?? {}),
            },
        });
    } catch (err) {
        const emulatorHint =
            Platform.OS === "android"
                ? "\nâ€¢ Android emulator: use http://10.0.2.2:8080 or set EXPO_PUBLIC_API_BASE_URL"
                : "";
        const phoneHint =
            Platform.OS !== "web"
                ? "\nâ€¢ Physical device: set EXPO_PUBLIC_API_BASE_URL to your PC IP in .env"
                : "\nâ€¢ Web uses http://localhost:8080 â€” start backend: cd seller-backend && .\\mvnw.cmd spring-boot:run";
        const detail =
            err instanceof Error && err.message ? ` (${err.message})` : "";
        throw new ApiError(
            `Cannot reach API at ${url}.${detail}${phoneHint}${emulatorHint}\nâ€¢ Ensure backend is running on port 8080.`
        );
    }

    if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
            const body = await res.json();
            if (body?.message) message = body.message;
        } catch {
            // ignore
        }
        throw new ApiError(message, res.status);
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return res.json() as Promise<T>;
}

export type LoginResult = {
    sellerId: number;
    email: string;
    mobile: string;
    firstName: string;
    lastName: string;
    businessName: string;
    emailVerified: boolean;
    profileCompleted: boolean;
    status: string;
};

type LoginApiResponse = {
    sellerId: number;
    email: string;
    mobile?: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    emailVerified: boolean;
    profileCompleted: boolean;
    status: string;
};

export async function loginSeller(identifier: string, password: string): Promise<LoginResult> {
    const body = await authFetch<LoginApiResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
    });
    return {
        sellerId: body.sellerId,
        email: body.email ?? "",
        mobile: body.mobile ?? "",
        firstName: body.firstName ?? "",
        lastName: body.lastName ?? "",
        businessName: body.businessName ?? "",
        emailVerified: body.emailVerified === true,
        profileCompleted: body.profileCompleted === true,
        status: body.status ?? "pending",
    };
}

export async function requestPasswordReset(email: string): Promise<string> {
    const body = await authFetch<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
    });
    return body.message;
}

export type ResetTokenValidation = {
    valid: boolean;
    emailHint?: string;
    message: string;
};

export async function validatePasswordResetToken(token: string): Promise<ResetTokenValidation> {
    const encoded = encodeURIComponent(token.trim());
    return authFetch<ResetTokenValidation>(`/api/auth/reset-password/validate?token=${encoded}`);
}

export async function resetPasswordWithToken(
    token: string,
    password: string,
    confirmPassword: string
): Promise<string> {
    const body = await authFetch<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: token.trim(), password, confirmPassword }),
    });
    return body.message;
}

export type OtpSentResult = {
    message: string;
    maskedMobile: string;
    devOtp?: string | null;
};

export async function sendRegistrationOtp(mobile: string): Promise<OtpSentResult> {
    return authFetch<OtpSentResult>("/api/sellers/send-otp", {
        method: "POST",
        body: JSON.stringify({ mobile: mobile.trim(), method: "sms" }),
    });
}

export type OtpVerifiedResult = {
    verified: boolean;
    mobileVerificationToken: string;
    message: string;
};

export async function verifyRegistrationOtp(mobile: string, otp: string): Promise<OtpVerifiedResult> {
    return authFetch<OtpVerifiedResult>("/api/sellers/verify-otp", {
        method: "POST",
        body: JSON.stringify({ mobile: mobile.trim(), otp: otp.trim() }),
    });
}

export type RegisterSellerResult = {
    sellerId: number;
    message: string;
    emailVerificationRequired: boolean;
};

export async function registerSeller(payload: {
    mobileVerificationToken: string;
    mobile: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
}): Promise<RegisterSellerResult> {
    return authFetch<RegisterSellerResult>("/api/sellers/register", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export type StartEmailVerificationResult = {
    message: string;
    email: string;
    otpSent: boolean;
    alreadyVerified: boolean;
};

export async function confirmEmailVerificationLink(
    token: string
): Promise<StartEmailVerificationResult> {
    const body = await authFetch<{
        message: string;
        email: string;
        otpSent: boolean;
        alreadyVerified: boolean;
    }>("/api/auth/confirm-email-link", {
        method: "POST",
        body: JSON.stringify({ token: token.trim() }),
    });
    return {
        message: body.message,
        email: body.email ?? "",
        otpSent: body.otpSent === true,
        alreadyVerified: body.alreadyVerified === true,
    };
}

export type EmailVerificationResult = {
    message: string;
    verified: boolean;
    email?: string | null;
};

export async function verifyEmailOtp(
    email: string,
    otp: string
): Promise<EmailVerificationResult> {
    return authFetch<EmailVerificationResult>("/api/auth/verify-email-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
    });
}

export async function resendEmailVerificationOtp(email: string): Promise<string> {
    const body = await authFetch<{ message: string }>("/api/auth/resend-email-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    return body.message;
}
