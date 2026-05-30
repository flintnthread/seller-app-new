import { useCallback, useEffect, useState } from "react";
import {
    dashboardPeriodFromUi,
    fetchDashboardCharts,
    type DashboardCharts,
} from "@/services/dashboardApi";

export function useDashboardCharts(uiPeriod: string) {
    const [charts, setCharts] = useState<DashboardCharts | null>(null);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchDashboardCharts(dashboardPeriodFromUi(uiPeriod));
            setCharts(data);
        } catch {
            setCharts(null);
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

    return { charts, loading, reload, salesChart, ordersChart, productsChart };
}
