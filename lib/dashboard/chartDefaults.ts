import type { SalesPeriod } from "@/components/web/DashboardAnalytics";

export const EMPTY_SALES_CHART = {
    points: [0, 0],
    labels: ["—", "—"],
    totalSales: "₹0",
    totalOrders: "0",
    salesChange: "—",
    ordersChange: "—",
};

export const EMPTY_ORDERS_CHART = {
    points: [0, 0],
    labels: ["—", "—"],
    total: 0,
    change: "—",
};

export const EMPTY_PRODUCTS_CHART = {
    points: [0, 0],
    labels: ["—", "—"],
    total: 0,
    change: "—",
};

export type AllStatsPeriodData = {
    orders: string;
    ordersChange: string;
    sales: string;
    salesChange: string;
    views: string;
    viewsChange: string;
    rating: string;
    ratingChange: string;
    newCustomers: string;
    newCustomersChange: string;
    avgOrderValue: string;
    avgOrderValueChange: string;
    conversionRate: string;
    conversionRateChange: string;
    returns: string;
    returnsChange: string;
};

export function buildAllStatsFromOverview(
    overview: {
        orders: number;
        sales: number;
        salesFormatted: string;
        views: number;
        rating: number;
    } | null,
    returns = 0
): AllStatsPeriodData {
    if (!overview) {
        return {
            orders: "0",
            ordersChange: "—",
            sales: "₹0",
            salesChange: "—",
            views: "0",
            viewsChange: "—",
            rating: "0",
            ratingChange: "—",
            newCustomers: "—",
            newCustomersChange: "—",
            avgOrderValue: "—",
            avgOrderValueChange: "—",
            conversionRate: "—",
            conversionRateChange: "—",
            returns: String(returns),
            returnsChange: "—",
        };
    }
    const aov =
        overview.orders > 0
            ? `₹${Math.round(overview.sales / overview.orders).toLocaleString("en-IN")}`
            : "—";
    return {
        orders: String(overview.orders),
        ordersChange: "—",
        sales: overview.salesFormatted,
        salesChange: "—",
        views: String(overview.views),
        viewsChange: "—",
        rating: String(overview.rating),
        ratingChange: "—",
        newCustomers: "—",
        newCustomersChange: "—",
        avgOrderValue: aov,
        avgOrderValueChange: "—",
        conversionRate: "—",
        conversionRateChange: "—",
        returns: String(returns),
        returnsChange: "—",
    };
}

export function buildAllStatsFromPeriodStats(
    stats: {
        orders: number;
        sales: number;
        salesFormatted: string;
        views: number;
        rating: number;
        returns: number;
        newCustomers?: number;
        conversionRate?: number;
    } | null | undefined
): AllStatsPeriodData {
    if (!stats) {
        return buildAllStatsFromOverview(null);
    }
    const base = buildAllStatsFromOverview(
        {
            orders: stats.orders,
            sales: stats.sales,
            salesFormatted: stats.salesFormatted,
            views: stats.views,
            rating: stats.rating,
        },
        stats.returns
    );
    return {
        ...base,
        newCustomers: stats.newCustomers != null ? String(stats.newCustomers) : base.newCustomers,
        conversionRate: stats.conversionRate != null ? `${stats.conversionRate}%` : base.conversionRate,
    };
}

export function mapStatsByPeriodToUi(
    row: {
        day: { orders: number; sales: number; salesFormatted: string; views: number; rating: number; returns: number };
        week: { orders: number; sales: number; salesFormatted: string; views: number; rating: number; returns: number };
        month: { orders: number; sales: number; salesFormatted: string; views: number; rating: number; returns: number };
        year: { orders: number; sales: number; salesFormatted: string; views: number; rating: number; returns: number };
    } | null
): Record<SalesPeriod, AllStatsPeriodData> {
    if (!row) {
        return emptyAllStatsByPeriod();
    }
    return {
        Day: buildAllStatsFromPeriodStats(row.day),
        Week: buildAllStatsFromPeriodStats(row.week),
        Month: buildAllStatsFromPeriodStats(row.month),
        Custom: buildAllStatsFromPeriodStats(row.year),
    };
}

export function emptyAllStatsByPeriod(): Record<SalesPeriod, AllStatsPeriodData> {
    const empty = buildAllStatsFromOverview(null);
    return {
        Day: empty,
        Week: empty,
        Month: empty,
        Custom: empty,
    };
}
