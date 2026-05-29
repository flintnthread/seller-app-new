import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { useInvoiceScan, type InvoiceScanParams } from "@/hooks/useInvoiceScan";

function isPdfUrl(url: string): boolean {
    return /\.pdf($|\?)/i.test(url);
}

export default function InvoiceInfoWebScreen() {
    const params = useLocalSearchParams<InvoiceScanParams>();
    const {
        scanCode,
        scanResult,
        liveOrder,
        loading,
        loadError,
        orderKey,
        invoiceUrl,
        invoiceNumber,
    } = useInvoiceScan(params);

    const hsnDisplay = useMemo(() => {
        if (!liveOrder?.items?.length) return "-";
        const codes = Array.from(
            new Set(
                liveOrder.items
                    .map((item) => (item.hsnCode ?? "").trim())
                    .filter((code) => code.length > 0)
            )
        );
        return codes.length > 0 ? codes.join(", ") : "-";
    }, [liveOrder]);

    const previewSrc =
        invoiceUrl && isPdfUrl(invoiceUrl)
            ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(invoiceUrl)}`
            : invoiceUrl;

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#F6F8FC",
                fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            }}
        >
            <header
                style={{
                    height: 56,
                    background: "#1E3A6E",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 17,
                }}
            >
                <button
                    type="button"
                    onClick={() => (window.history.length > 1 ? router.back() : router.replace("/(auth)/login"))}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#fff",
                        fontSize: 22,
                        cursor: "pointer",
                        marginRight: 8,
                    }}
                    aria-label="Back"
                >
                    ←
                </button>
                Invoice Scan
            </header>

            <main style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
                {loading ? (
                    <div style={{ textAlign: "center", padding: "48px 16px", color: "#4B5563" }}>
                        <div style={{ fontSize: 15 }}>Loading invoice from scan…</div>
                        {scanCode ? (
                            <div style={{ marginTop: 8, fontSize: 13 }}>Code: {scanCode}</div>
                        ) : null}
                    </div>
                ) : loadError ? (
                    <div
                        style={{
                            background: "#fff",
                            border: "1px solid #FECACA",
                            borderRadius: 14,
                            padding: 16,
                        }}
                    >
                        <div style={{ color: "#B91C1C", fontWeight: 600, marginBottom: 8 }}>
                            Could not load invoice
                        </div>
                        <div style={{ color: "#374151", fontSize: 14, lineHeight: 1.5 }}>{loadError}</div>
                        <div style={{ color: "#6B7280", fontSize: 13, marginTop: 10 }}>
                            Scan code: {scanCode || "—"}
                        </div>
                        <button
                            type="button"
                            onClick={() => router.replace("/(auth)/login")}
                            style={{
                                marginTop: 16,
                                width: "100%",
                                height: 44,
                                borderRadius: 10,
                                border: "none",
                                background: "#1E3A6E",
                                color: "#fff",
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            Log in to Seller App
                        </button>
                    </div>
                ) : (
                    <>
                        <section
                            style={{
                                background: "#fff",
                                border: "1px solid #E5E7EB",
                                borderRadius: 14,
                                padding: 14,
                                marginBottom: 16,
                            }}
                        >
                            <h2 style={{ margin: "0 0 12px", fontSize: 16, color: "#1F2937" }}>
                                Invoice Details
                            </h2>
                            {[
                                ["Scan Code", scanCode],
                                ["Order ID", liveOrder?.id || orderKey],
                                ["Invoice No", invoiceNumber],
                                ["Order Date", liveOrder?.date || "-"],
                                ["Payment", liveOrder?.payment?.method || "-"],
                                ["Total", liveOrder?.pricing?.total || "-"],
                                ["GST Number", liveOrder?.gstNumber || "-"],
                                ["HSN Code", hsnDisplay],
                                ["Status", liveOrder?.status || "-"],
                                scanResult?.message
                                    ? ["Scan", scanResult.found ? "Matched" : scanResult.message]
                                    : null,
                            ]
                                .filter(Boolean)
                                .map((row) => (
                                    <div
                                        key={row![0]}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: 12,
                                            padding: "10px 0",
                                            borderTop: "1px solid #EEF2F7",
                                            fontSize: 13,
                                        }}
                                    >
                                        <span style={{ color: "#6B7280" }}>{row![0]}</span>
                                        <span style={{ color: "#111827", fontWeight: 600, textAlign: "right" }}>
                                            {row![1]}
                                        </span>
                                    </div>
                                ))}
                        </section>

                        {previewSrc ? (
                            <section
                                style={{
                                    background: "#fff",
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 14,
                                    padding: 14,
                                    marginBottom: 16,
                                }}
                            >
                                <h2 style={{ margin: "0 0 12px", fontSize: 16, color: "#1F2937" }}>
                                    Invoice Preview
                                </h2>
                                <iframe
                                    src={previewSrc}
                                    title="Invoice preview"
                                    style={{
                                        width: "100%",
                                        height: 520,
                                        border: "1px solid #E5E7EB",
                                        borderRadius: 8,
                                        background: "#F9FAFB",
                                    }}
                                />
                            </section>
                        ) : (
                            <section
                                style={{
                                    background: "#fff",
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 14,
                                    padding: 14,
                                    marginBottom: 16,
                                    color: "#6B7280",
                                    fontSize: 13,
                                }}
                            >
                                Invoice file is not linked yet. Order details are shown above.
                            </section>
                        )}

                        {invoiceUrl ? (
                            <a
                                href={invoiceUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    display: "block",
                                    textAlign: "center",
                                    height: 44,
                                    lineHeight: "44px",
                                    borderRadius: 10,
                                    background: "#2563EB",
                                    color: "#fff",
                                    fontWeight: 700,
                                    textDecoration: "none",
                                    marginBottom: 12,
                                }}
                            >
                                Open Invoice File
                            </a>
                        ) : null}

                        {liveOrder ? (
                            <button
                                type="button"
                                onClick={() =>
                                    router.push({
                                        pathname: "/(main)/orderDetails",
                                        params: { orderId: liveOrder.id },
                                    })
                                }
                                style={{
                                    width: "100%",
                                    height: 44,
                                    borderRadius: 10,
                                    border: "none",
                                    background: "#1E3A6E",
                                    color: "#fff",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                View Full Order
                            </button>
                        ) : null}
                    </>
                )}
            </main>
        </div>
    );
}
