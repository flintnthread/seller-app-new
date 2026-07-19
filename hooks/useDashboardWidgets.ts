import { useCallback, useEffect, useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import { useNotificationsFeed } from "@/hooks/useNotificationsFeed";
import { fetchPayoutSummary, fetchSellerBankDetails } from "@/services/payoutApi";
import { fetchTopSellingProducts } from "@/services/earningsApi";
import { fetchProducts } from "@/services/productApi";
import { fetchDashboardCharts } from "@/services/dashboardApi";
import { loadOrdersFromApi, getLiveOrders } from "@/lib/orders/ordersStore";
import type { OrderDetail } from "@/lib/orders/ordersData";
import { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";

export type WidgetTopProduct = {
    id: string;
    name: string;
    sold: number;
    price: string;
    image: string;
};

export type WidgetLowStock = {
    id: string;
    name: string;
    stock: number;
    sku?: string;
};

export type WidgetActivity = {
    id: string;
    text: string;
    time: string;
    icon: string;
};

export function useDashboardWidgets() {
    const dashboard = useDashboardData();
    const { profile } = useSellerProfile();
    const { notifications } = useNotificationsFeed();

    const [earningsBalance, setEarningsBalance] = useState(0);
    const [bankName, setBankName] = useState("");
    const [topProducts, setTopProducts] = useState<WidgetTopProduct[]>([]);
    const [lowStock, setLowStock] = useState<WidgetLowStock[]>([]);
    const [recentOrders, setRecentOrders] = useState<OrderDetail[]>([]);
    const [weekSalesPoints, setWeekSalesPoints] = useState<{ label: string; value: number }[]>([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const [summary, bankDetails, products, tops, charts] = await Promise.all([
                fetchPayoutSummary().catch(() => null),
                fetchSellerBankDetails().catch(() => null),
                fetchProducts().catch(() => []),
                fetchTopSellingProducts(8).catch(() => []),
                fetchDashboardCharts("week").catch(() => null),
            ]);
            await loadOrdersFromApi(true).catch(() => undefined);

            setEarningsBalance(Number(summary?.pendingAmount ?? 0));
            setBankName(bankDetails?.bankName?.trim() || profile?.bankName?.trim() || "");
            setTopProducts(
                tops.map((p) => ({
                    id: p.id,
                    name: p.name,
                    sold: p.sold,
                    price: p.price,
                    image: resolveMediaUrl(p.image) ?? p.image ?? "",
                }))
            );
            setLowStock(
                products
                    .filter((p) => p.stock <= 5)
                    .slice(0, 6)
                    .map((p) => ({
                        id: String(p.id),
                        name: p.name,
                        stock: p.stock,
                    }))
            );
            setRecentOrders(getLiveOrders().slice(0, 6));
            setWeekSalesPoints(charts?.salesPoints ?? []);
        } finally {
            setLoading(false);
        }
    }, [profile?.bankName]);

    useEffect(() => {
        reload();
    }, [reload]);

    const sellerName =
        profile?.businessName?.trim() ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
        "Seller";

    const overview = dashboard.data?.overview;
    const orderSummary = dashboard.data?.orderSummary;

    const activities: WidgetActivity[] = recentOrders.map((o) => ({
        id: o.id,
        text: `Order ${o.id} · ${o.status}`,
        time: o.date || "—",
        icon: "cart-outline",
    }));

    const alertNotifications = notifications.slice(0, 5).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.body ?? "",
        time: n.time ?? "",
        read: n.read,
    }));

    return {
        loading: loading || dashboard.loading,
        reload,
        sellerName,
        overview,
        orderSummary,
        totalProducts: dashboard.totalProducts,
        earningsBalance,
        bankName: bankName || (profile?.bankName ?? ""),
        topProducts,
        lowStock,
        recentOrders,
        weekSalesPoints,
        activities,
        alertNotifications,
        dashboard,
    };
}
