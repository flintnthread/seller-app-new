import * as Linking from "expo-linking";
import { Platform } from "react-native";

const APP_SCHEME = "fntseller";

function isLocalHost(hostname: string): boolean {
    const h = hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

function isLocalHostUrl(url: string): boolean {
    try {
        return isLocalHost(new URL(url).hostname);
    } catch {
        return /localhost|127\.0\.0\.1/i.test(url);
    }
}

/** LAN-reachable app URL for QR codes (never localhost — phones cannot reach that). */
export function resolveInvoiceQrBaseUrl(): string | null {
    const explicit = process.env.EXPO_PUBLIC_APP_BASE_URL?.trim().replace(/\/$/, "");
    if (explicit && !isLocalHostUrl(explicit)) {
        return explicit;
    }

    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
    let lanHost: string | null = null;
    if (apiBase) {
        try {
            const apiUrl = new URL(apiBase);
            if (!isLocalHost(apiUrl.hostname)) {
                lanHost = apiUrl.hostname;
            }
        } catch {
            // ignore
        }
    }

    if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
        const origin = window.location.origin;
        if (!isLocalHostUrl(origin)) {
            return origin;
        }

        if (lanHost) {
            const port = window.location.port || "8081";
            const protocol = window.location.protocol || "http:";
            return `${protocol}//${lanHost}:${port}`;
        }
    }

    if (lanHost) {
        const port =
            (typeof window !== "undefined" && window.location?.port) ||
            process.env.EXPO_PUBLIC_APP_PORT?.trim() ||
            "8081";
        return `http://${lanHost}:${port}`;
    }

    return explicit || null;
}

/** Stable QR / deep-link URL for invoice scanning (shipping label, etc.). */
export function buildInvoiceQrUrl(orderKey: string): string {
    const code = orderKey.trim().replace(/^#/, "");
    if (!code) return "";

    const query = new URLSearchParams({ code }).toString();

    // Native app installed: opens seller app directly (best for phone scan).
    if (Platform.OS !== "web") {
        return Linking.createURL("invoiceinfo", {
            scheme: APP_SCHEME,
            queryParams: { code },
        });
    }

    const webBase = resolveInvoiceQrBaseUrl();
    if (webBase) {
        return `${webBase}/invoiceinfo?${query}`;
    }

    return Linking.createURL("invoiceinfo", {
        scheme: APP_SCHEME,
        queryParams: { code },
    });
}

function firstQueryParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return (value[0] ?? "").trim();
    return (value ?? "").trim();
}

/** Extract scan code from a scanned QR URL or legacy deep-link params. */
export function parseInvoiceCodeFromUrl(url: string): string | null {
    if (!url?.trim()) return null;

    const trimmed = url.trim();

    // Plain code QR (no URL) — order id / invoice number only
    if (!trimmed.includes("://") && !trimmed.includes("?") && !trimmed.includes("/")) {
        const plain = trimmed.replace(/^#/, "");
        return plain.length > 0 ? plain : null;
    }

    try {
        const parsed = Linking.parse(trimmed);
        const path = (parsed.path ?? "").toLowerCase();
        if (!path.includes("invoiceinfo") && !path.includes("invoice")) {
            return null;
        }

        const code = firstQueryParam(parsed.queryParams?.code as string | string[] | undefined);
        if (code) return code;

        const orderId = firstQueryParam(parsed.queryParams?.orderId as string | string[] | undefined);
        if (orderId && orderId !== "-") return orderId;

        const orderNumber = firstQueryParam(
            parsed.queryParams?.orderNumber as string | string[] | undefined
        );
        if (orderNumber) return orderNumber.replace(/^#/, "");

        const invoiceNumber = firstQueryParam(
            parsed.queryParams?.invoiceNumber as string | string[] | undefined
        );
        if (invoiceNumber && invoiceNumber !== "-") return invoiceNumber;
    } catch {
        // fall through
    }

    return null;
}
