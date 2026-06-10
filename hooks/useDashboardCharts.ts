import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { isAuthErrorStatus } from "@/lib/api/apiErrors";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import {
    dashboardPeriodFromUi,
    fetchDashboardCharts,
    type DashboardCharts,
} from "@/services/dashboardApi";

export function useDashboardCharts(uiPeriod: string) {
    const [charts, setCharts] = useState<DashboardCharts | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await hydrateSellerSession();
            if (!ensureSellerId()) {
                setCharts(null);
                return;
            }
            const data = await fetchDashboardCharts(dashboardPeriodFromUi(uiPeriod));
            setCharts(data);
        } catch (e) {
            setCharts(null);
            const status = e instanceof ApiError ? e.status : undefined;
            setError(isAuthErrorStatus(status) ? null : e instanceof Error ? e.message : "Failed to load charts.");
        } finally {
            setLoading(false);
        }
    }, [uiPeriod]);

    useEffect(() => {
        reload();
    }, [reload]);

    const salesChart = charts
        ? {
              points: charts.salesPoints.map((p) => p.value),
              labels: charts.salesPoints.map((p) => p.label),
              totalSales: charts.totalSalesFormatted,
              totalOrders: String(charts.totalOrders),
              salesChange: "—",
              ordersChange: "—",
          }
        : null;

    const ordersChart = charts
        ? {
              points: charts.ordersPoints.map((p) => p.value),
              labels: charts.ordersPoints.map((p) => p.label),
              total: charts.totalOrders,
              change: "—",
          }
        : null;

    const productsChart = charts
        ? {
              points: charts.productsPoints.map((p) => p.value),
              labels: charts.productsPoints.map((p) => p.label),
              total: charts.totalUnitsSold,
              change: "—",
          }
        : null;

    return { charts, loading, error, reload, salesChart, ordersChart, productsChart };
}
