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
