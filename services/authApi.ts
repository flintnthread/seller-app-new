import { Platform } from "react-native";
import { ensureApiReachable, resolveApiBaseUrl } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
    await ensureApiReachable();
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
                ? "\n• Android emulator: set EXPO_PUBLIC_API_ANDROID_EMULATOR=true in .env"
                : "";
        const phoneHint =
            Platform.OS !== "web"
                ? "\n• Ensure phone and PC are on the same Wi‑Fi (API host is detected from Expo automatically)."
                : "\n• Web: use EXPO_PUBLIC_API_USE_LOCAL=true for localhost:8083";
        const detail =
            err instanceof Error && err.message ? ` (${err.message})` : "";
        throw new ApiError(
            `Cannot reach seller API at ${url}.${detail}${phoneHint}${emulatorHint}\n• Check https://flintnthread.online/api/public/marketplace-stats`
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
    accessToken: string;
    expiresIn: number;
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
    accessToken: string;
    expiresIn?: number;
};

export async function loginSeller(identifier: string, password: string): Promise<LoginResult> {
    const body = await authFetch<LoginApiResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
    });
    if (!body.accessToken?.trim()) {
        throw new ApiError("Login succeeded but no session token was returned. Please try again.");
    }
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
        accessToken: body.accessToken.trim(),
        expiresIn: body.expiresIn ?? 86400,
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
    sellerId?: number | null;
};

export async function verifyEmailOtp(
    email: string,
    otp: string
): Promise<EmailVerificationResult> {
    const body = await authFetch<{
        message: string;
        verified: boolean;
        email?: string | null;
        sellerId?: number | null;
    }>("/api/auth/verify-email-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
    });
    return {
        message: body.message,
        verified: body.verified === true,
        email: body.email ?? null,
        sellerId: body.sellerId ?? null,
    };
}

export async function resendEmailVerificationOtp(email: string): Promise<string> {
    const body = await authFetch<{ message: string }>("/api/auth/resend-email-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    return body.message;
}
