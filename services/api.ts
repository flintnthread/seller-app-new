import { resolveApiBaseUrl } from "@/lib/api/config";

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${resolveApiBaseUrl()}${endpoint.startsWith("/api") ? endpoint : `/api${endpoint}`}`;

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  const json = await response.json();

  if (!response.ok) {
    return { success: false, error: json.error || "Something went wrong" };
  }

  return json;
}

export const sellerApi = {
  sendOtp: (mobile: string, method: string) =>
    request<{ maskedMobile: string }>("/sellers/send-otp", {
      method: "POST",
      body: JSON.stringify({ mobile, method }),
    }),

  verifyOtp: (mobile: string, otp: string) =>
    request<{ verified: boolean }>("/sellers/verify-otp", {
      method: "POST",
      body: JSON.stringify({ mobile, otp }),
    }),

  register: (data: {
    firstName: string;
    lastName: string;
    mobile: string;
    email: string;
    password: string;
  }) =>
    request("/sellers/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
