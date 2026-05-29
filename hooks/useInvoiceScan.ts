import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import {
    fetchSellerOrderDetail,
    scanSellerInvoice,
    type InvoiceScanResult,
} from "@/services/orderApi";
import type { OrderDetail } from "@/app/(main)/_ordersData";
import { getDevSellerId } from "@/lib/api/config";
import { ensureSellerId, hydrateSellerSession, setSellerId } from "@/lib/api/sellerSession";

export type InvoiceScanParams = {
    code?: string | string[];
    orderId?: string | string[];
    orderNumber?: string | string[];
    invoiceNumber?: string | string[];
    invoiceUrl?: string | string[];
};

function paramString(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return (value[0] ?? "").trim();
    return (value ?? "").trim();
}

export function resolveScanCodeFromParams(params: InvoiceScanParams): string {
    const fromCode = paramString(params.code);
    if (fromCode) return fromCode.replace(/^#/, "");

    const fromOrderId = paramString(params.orderId);
    if (fromOrderId && fromOrderId !== "-") return fromOrderId.replace(/^#/, "");

    const fromOrderNumber = paramString(params.orderNumber);
    if (fromOrderNumber) return fromOrderNumber.replace(/^#/, "");

    const fromInvoice = paramString(params.invoiceNumber);
    if (fromInvoice && fromInvoice !== "-") return fromInvoice;

    if (Platform.OS === "web" && typeof window !== "undefined") {
        const fromUrl = new URLSearchParams(window.location.search).get("code")?.trim();
        if (fromUrl) return fromUrl.replace(/^#/, "");
    }

    return "";
}

export function useInvoiceScan(params: InvoiceScanParams) {
    const scanCode = useMemo(() => resolveScanCodeFromParams(params), [params]);

    const [scanResult, setScanResult] = useState<InvoiceScanResult | null>(null);
    const [liveOrder, setLiveOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [sessionReady, setSessionReady] = useState(false);

    const orderKey = useMemo(() => {
        if (scanResult?.orderId != null) return String(scanResult.orderId);
        return scanCode;
    }, [scanResult, scanCode]);

    const invoiceUrl =
        liveOrder?.invoiceUrl ||
        scanResult?.invoiceUrl ||
        paramString(params.invoiceUrl) ||
        "";

    const invoiceNumber =
        liveOrder?.invoiceNumber || scanResult?.invoiceNumber || paramString(params.invoiceNumber) || "-";

    useEffect(() => {
        let cancelled = false;

        const prepareSession = async () => {
            await hydrateSellerSession();
            if (!ensureSellerId()) {
                const devId = getDevSellerId();
                if (devId > 0) await setSellerId(devId);
            }
            if (!cancelled) setSessionReady(true);
        };

        void prepareSession();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!sessionReady) return;

        if (!scanCode) {
            setLoading(false);
            setLoadError("Invalid scan. No order or invoice code found in QR.");
            return;
        }

        let cancelled = false;

        const run = async () => {
            setLoading(true);
            setLoadError(null);
            setScanResult(null);
            setLiveOrder(null);

            try {
                let scanned: InvoiceScanResult | null = null;
                try {
                    scanned = await scanSellerInvoice(scanCode);
                    if (!cancelled) setScanResult(scanned);
                } catch {
                    // continue with order lookup
                }

                const lookupKey =
                    scanned?.found && scanned.orderId != null
                        ? String(scanned.orderId)
                        : scanCode;

                const detail = await fetchSellerOrderDetail(lookupKey);
                if (!cancelled) setLiveOrder(detail);
            } catch (err: unknown) {
                if (!cancelled) {
                    const message =
                        err instanceof Error ? err.message : "Failed to load invoice for this scan.";
                    setLoadError(message);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [scanCode, sessionReady]);

    return {
        scanCode,
        scanResult,
        liveOrder,
        loading,
        loadError,
        orderKey,
        invoiceUrl,
        invoiceNumber,
    };
}
