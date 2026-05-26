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
                ? "\n• Android emulator: use http://10.0.2.2:8080 or set EXPO_PUBLIC_API_BASE_URL"
                : "";
        const phoneHint =
            Platform.OS !== "web"
                ? "\n• Physical device: set EXPO_PUBLIC_API_BASE_URL to your PC IP in .env"
                : "\n• Web uses http://localhost:8080 — start backend: cd seller-backend && .\\mvnw.cmd spring-boot:run";
        const detail =
            err instanceof Error && err.message ? ` (${err.message})` : "";
        throw new ApiError(
            `Cannot reach API at ${url}.${detail}${phoneHint}${emulatorHint}\n• Ensure backend is running on port 8080.`
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
