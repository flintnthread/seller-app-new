import { Platform } from "react-native";
import { resolveApiBaseUrl } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";

export type MarketplaceStats = {
    sellersCount: number;
    productsCount: number;
    customersCount: number;
    avgApprovalHours: number;
    sellersDisplay: string;
    productsDisplay: string;
    customersDisplay: string;
    approvalDisplay: string;
};

async function publicFetch<T>(path: string): Promise<T> {
    const baseUrl = resolveApiBaseUrl();
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    let res: Response;
    try {
        res = await fetch(url, {
            headers: {
                Accept: "application/json",
            },
        });
    } catch (err) {
        const detail = err instanceof Error ? err.message : "Network error";
        const hint =
            Platform.OS !== "web"
                ? " Check EXPO_PUBLIC_API_BASE_URL in .env and that the backend is running."
                : " Ensure seller-service is running on port 8080.";
        throw new ApiError(`Cannot reach API at ${url}. (${detail})${hint}`);
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

    return res.json() as Promise<T>;
}

export async function fetchMarketplaceStats(): Promise<MarketplaceStats> {
    return publicFetch<MarketplaceStats>("/api/public/marketplace-stats");
}
