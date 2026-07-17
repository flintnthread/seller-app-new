import { apiRequest } from "@/lib/api/client";

export type WalletTransaction = {
    id: number;
    title: string;
    amount: string;
    date: string;
    status: string;
    type: string;
    orderId?: number;
};

export type BankAccount = {
    bankName?: string;
    accountNumberMasked?: string;
    ifscCode?: string;
    accountHolder?: string;
    verified: boolean;
};

export type EarningsData = {
    availableBalance: number;
    totalCredits: number;
    totalDebits: number;
    transactions: WalletTransaction[];
    bankAccount?: BankAccount;
};

export type PayoutTransaction = {
    id: string;
    orderId: string;
    amount: number;
    date: string;
    status: string;
    type: string;
};

export type TopSellingProduct = {
    id: string;
    name: string;
    price: string;
    sold: number;
    image: string;
    category: string;
    status?: string;
    avgRating?: number | null;
    mrp?: string | null;
    discount?: string | null;
};

export type AnalyticsSales = {
    period: string;
    totalSales: number;
    totalOrders: number;
    salesFormatted: string;
    channels: { name: string; amount: number; orders: number }[];
};

export async function fetchEarnings(): Promise<EarningsData> {
    return apiRequest<EarningsData>("/api/seller/earnings");
}

export async function fetchPayouts(): Promise<PayoutTransaction[]> {
    return apiRequest<PayoutTransaction[]>("/api/seller/earnings/payouts");
}

export async function fetchAnalyticsSales(
    period = "month",
    from?: string,
    to?: string
): Promise<AnalyticsSales> {
    const params = new URLSearchParams({ period });
    if (from && to) {
        params.set("from", from);
        params.set("to", to);
    }
    return apiRequest<AnalyticsSales>(`/api/seller/analytics/sales?${params.toString()}`);
}

export async function fetchTopSellingProducts(limit = 20): Promise<TopSellingProduct[]> {
    return apiRequest<TopSellingProduct[]>(`/api/seller/analytics/top-products?limit=${limit}`);
}

export type SalesTrendPoint = { label: string; value: number };

export async function fetchOrdersTrend(period = "week"): Promise<SalesTrendPoint[]> {
    return apiRequest<SalesTrendPoint[]>(
        `/api/seller/analytics/orders-trend?period=${encodeURIComponent(period)}`
    );
}

export async function fetchSalesTrend(
    period = "week",
    from?: string,
    to?: string
): Promise<SalesTrendPoint[]> {
    const params = new URLSearchParams({ period });
    if (from && to) {
        params.set("from", from);
        params.set("to", to);
    }
    return apiRequest<SalesTrendPoint[]>(`/api/seller/analytics/sales-trend?${params.toString()}`);
}

export type PaymentMethodBreakdown = {
    label: string;
    value: number;
    pct: number;
    orders: number;
};

export type AnalyticsOverview = {
    total: number;
    orders: number;
    aov: number;
    returns: number;
    cancels: number;
    replacements: number;
    channels: { name: string; amount: number; orders: number }[];
    paymentMethods: PaymentMethodBreakdown[];
};

export async function fetchAnalyticsOverview(
    period = "month",
    channel = "All Channels"
): Promise<AnalyticsOverview> {
    return apiRequest<AnalyticsOverview>(
        `/api/seller/analytics/overview?period=${encodeURIComponent(period)}&channel=${encodeURIComponent(channel)}`
    );
}

export async function fetchPaymentMethods(period = "month"): Promise<PaymentMethodBreakdown[]> {
    return apiRequest<PaymentMethodBreakdown[]>(
        `/api/seller/analytics/payment-methods?period=${encodeURIComponent(period)}`
    );
}

export type PayoutRequestResult = {
    transactionId: string;
    amount: number;
    remainingBalance: number;
    status: string;
    message: string;
};

export async function requestPayout(body: {
    amount: number;
    orderId?: string;
    otp: string;
    description?: string;
}): Promise<PayoutRequestResult> {
    return apiRequest<PayoutRequestResult>("/api/seller/earnings/payout-request", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function lookupOrderPayoutAmount(orderKey: string): Promise<{
    orderKey: string;
    orderId?: number;
    amount: number;
    found: boolean;
}> {
    return apiRequest(`/api/seller/earnings/order-lookup/${encodeURIComponent(orderKey.trim())}`);
}
