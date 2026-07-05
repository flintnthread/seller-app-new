import { apiRequest } from "@/lib/api/client";

export type DashboardOverview = {
    orders: number;
    sales: number;
    views: number;
    rating: number;
    reviewCount: number;
    salesFormatted: string;
};

export type DashboardOrderSummary = {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    returns: number;
};

export type DashboardTopProduct = {
    id: string;
    name: string;
    price: string;
    sold: number;
    image: string;
    category: string;
};

export type DashboardReferral = {
    referralCode: string;
    totalReferred: number;
    qualifiedReferred: number;
    goal: number;
};

export type DashboardData = {
    overview: DashboardOverview;
    orderSummary: DashboardOrderSummary;
    topProducts: DashboardTopProduct[];
    totalProducts: number;
    referral?: DashboardReferral;
    todayOverview?: DashboardPeriodStats;
};

export type DashboardCharts = {
    period: string;
    salesPoints: { label: string; value: number }[];
    ordersPoints: { label: string; value: number }[];
    productsPoints: { label: string; value: number }[];
    totalSales: number;
    totalOrders: number;
    totalUnitsSold: number;
    totalSalesFormatted: string;
};

export function dashboardPeriodFromUi(period: string): string {
    switch (period) {
        case "Day":
            return "day";
        case "Week":
            return "week";
        case "Month":
            return "month";
        case "Custom":
            return "custom";
        default:
            return "week";
    }
}

export async function fetchDashboardCharts(
    period = "week",
    customRange?: { from: string; to: string },
): Promise<DashboardCharts> {
    if (customRange?.from && customRange?.to) {
        const params = new URLSearchParams({
            from: customRange.from,
            to: customRange.to,
        });
        return apiRequest<DashboardCharts>(`/api/seller/dashboard/charts?${params.toString()}`);
    }
    return apiRequest<DashboardCharts>(
        `/api/seller/dashboard/charts?period=${encodeURIComponent(period)}`
    );
}

export type DashboardPeriodStats = {
    period: string;
    orders: number;
    sales: number;
    salesFormatted: string;
    views: number;
    rating: number;
    returns: number;
    newCustomers?: number;
    conversionRate?: number;
};

export type DashboardStatsByPeriod = {
    day: DashboardPeriodStats;
    week: DashboardPeriodStats;
    month: DashboardPeriodStats;
    year: DashboardPeriodStats;
};

export async function fetchDashboardStatsByPeriod(): Promise<DashboardStatsByPeriod> {
    return apiRequest<DashboardStatsByPeriod>("/api/seller/dashboard/stats-by-period");
}

export async function fetchDashboard(): Promise<DashboardData> {
    const row = await apiRequest<{
        overview: DashboardOverview;
        orderSummary: DashboardOrderSummary;
        topProducts: DashboardTopProduct[];
        totalProducts: number;
        referral?: DashboardReferral;
    }>("/api/seller/dashboard");
    return {
        overview: row.overview,
        orderSummary: row.orderSummary,
        topProducts: row.topProducts ?? [],
        totalProducts: row.totalProducts ?? 0,
        ...(row.referral ? { referral: row.referral } : {}),
    };
}
