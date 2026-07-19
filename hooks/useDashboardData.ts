import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import { sellerApiErrorMessage, withSellerAuthRetry } from "@/lib/api/withSellerAuthRetry";
import {
    fetchDashboard,
    fetchDashboardStatsByPeriod,
    type DashboardData,
    type DashboardPeriodStats,
} from "@/services/dashboardApi";
import { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";

function overviewToPeriodStats(overview: DashboardData["overview"]): DashboardPeriodStats {
    return {
        period: "day",
        orders: overview.orders,
        sales: overview.sales,
        salesFormatted: overview.salesFormatted,
        views: overview.views,
        rating: overview.rating,
        returns: 0,
    };
}

export function useDashboardData() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await hydrateSellerSession(true);
            if (!ensureSellerId()) {
                setData(null);
                setError("Please log in to view dashboard.");
                return;
            }

            const row = await withSellerAuthRetry(() => fetchDashboard());
            let todayOverview: DashboardPeriodStats | undefined;

            try {
                const periodRow = await withSellerAuthRetry(() => fetchDashboardStatsByPeriod());
                todayOverview = periodRow.day;
            } catch {
                todayOverview = overviewToPeriodStats(row.overview);
            }

            setData({ ...row, todayOverview });
        } catch (e) {
            setData(null);
            setError(sellerApiErrorMessage(e, "Failed to load dashboard."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const today = data?.todayOverview;
    const overviewStats = today
        ? [
              { icon: "shopping-bag", iconLib: "feather", label: "Orders", value: String(today.orders), change: "—", color: "#6C63FF" },
              { icon: "currency-inr", iconLib: "mci", label: "Sales", value: today.salesFormatted, change: "—", color: "#22C55E" },
              { icon: "eye-outline", iconLib: "mci", label: "Views", value: String(today.views), change: "—", color: "#3B82F6" },
              { icon: "star-outline", iconLib: "mci", label: "Rating", value: String(today.rating), change: "—", color: "#F59E0B" },
          ]
        : [];

    const orderSummary = data
        ? [
              { icon: "clipboard-list-outline", color: "#6C63FF", label: "Pending", count: data.orderSummary.pending },
              { icon: "package-variant", color: "#F59E0B", label: "Processing", count: data.orderSummary.processing },
              { icon: "truck-delivery-outline", color: "#3B82F6", label: "Shipped", count: data.orderSummary.shipped },
              { icon: "check-circle-outline", color: "#22C55E", label: "Delivered", count: data.orderSummary.delivered },
              { icon: "refresh", color: "#EF4444", label: "Returns", count: data.orderSummary.returns },
          ]
        : [];

    const topProducts = (data?.topProducts ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        sold: p.sold,
        image: resolveMediaUrl(p.image) ?? p.image ?? "",
        category: p.category,
    }));

    return {
        data,
        loading,
        error,
        reload,
        overviewStats,
        orderSummary,
        topProducts,
        allProducts: topProducts,
        totalProducts: data?.totalProducts ?? 0,
        totalOrders: data?.overview?.orders ?? 0,
        averageRating: data?.overview?.rating ?? 0,
        reviewCount: data?.overview?.reviewCount ?? 0,
        referral: data?.referral ?? null,
    };
}
