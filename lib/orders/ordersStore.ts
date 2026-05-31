/**
 * ordersStore.ts
 *
 * Global store for seller orders loaded from the backend API.
 * OrdersScreen and OrderDetailsScreen subscribe for live updates.
 */

import type { OrderDetail, OrderStatus, OrderStep, StepStatus } from "./ordersData";
import { hydrateSellerSession } from "@/lib/api/sellerSession";
import { fetchSellerOrderDetails, fetchSellerOrderStats, updateSellerOrderStatus } from "@/services/orderApi";

type Listener = () => void;
const listeners: Set<Listener> = new Set();

const liveOrders = new Map<string, OrderDetail>();
let loadPromise: Promise<void> | null = null;

export type SellerOrderStats = {
    totalLineItems: number;
    totalOrders: number;
    totalSale: number;
    tabCounts: Record<string, number>;
};

let cachedStats: SellerOrderStats | null = null;

export function subscribeToOrderChanges(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function notify() {
    listeners.forEach((fn) => fn());
}

function buildSteps(
    status: OrderStatus,
    dates: Partial<Record<string, string>>,
): OrderStep[] {
    const flow: Array<{
        key: string;
        label: string;
        iconLib: "Ionicons" | "MCIcons";
        iconName: string;
    }> = [
        {
            key: "pending",
            label: "Pending",
            iconLib: "MCIcons",
            iconName: "clipboard-text-outline",
        },
        {
            key: "processing",
            label: "Processing",
            iconLib: "MCIcons",
            iconName: "package-variant-closed",
        },
        {
            key: "shipped",
            label: "Shipped",
            iconLib: "MCIcons",
            iconName: "truck-outline",
        },
        {
            key: "delivered",
            label: "Delivered",
            iconLib: "Ionicons",
            iconName: "checkmark-circle-outline",
        },
    ];

    if (status === "Returned") {
        flow[3] = {
            key: "returned",
            label: "Returned",
            iconLib: "MCIcons",
            iconName: "arrow-u-left-top",
        };
    }
    if (status === "Cancelled") {
        flow[3] = {
            key: "cancelled",
            label: "Cancelled",
            iconLib: "Ionicons",
            iconName: "close-circle-outline",
        };
    }

    const activeIndex: Record<OrderStatus, number> = {
        Pending: 0,
        Processing: 1,
        Shipped: 2,
        Delivered: 3,
        Returned: 3,
        Cancelled: 3,
    };

    const active = activeIndex[status];

    return flow.map((step, i) => ({
        ...step,
        ...(dates[step.key] !== undefined ? { date: dates[step.key] } : {}),
        status: (i < active ? "done" : i === active ? "active" : "pending") as StepStatus,
    })) as OrderStep[];
}

function getPrimaryLabel(status: OrderStatus): string {
    switch (status) {
        case "Pending":
            return "Mark as Processing";
        case "Processing":
            return "Mark as Shipped";
        case "Shipped":
            return "Mark as Delivered";
        case "Delivered":
            return "Download Invoice";
        case "Returned":
            return "Process Refund";
        case "Cancelled":
            return "Download Invoice";
    }
}

function getSecondaryLabel(status: OrderStatus): string {
    switch (status) {
        case "Pending":
            return "Cancel Order";
        case "Processing":
            return "Cancel Order";
        case "Shipped":
            return "Track Shipment";
        case "Delivered":
            return "Initiate Return";
        case "Returned":
            return "View Return Request";
        case "Cancelled":
            return "View Details";
    }
}

export function getLiveOrder(id: string): OrderDetail | undefined {
    return liveOrders.get(id);
}

export function getLiveOrders(): OrderDetail[] {
    return Array.from(liveOrders.values());
}

export function getOrderStats(): SellerOrderStats {
    if (cachedStats) {
        return cachedStats;
    }
    const orders = getLiveOrders();
    const totalSale = orders.reduce(
        (sum, order) => sum + (order.pricing.totalAmount ?? parsePriceString(order.pricing.total)),
        0,
    );
    const totalLineItems = orders.reduce((sum, order) => sum + order.items.length, 0);
    return {
        totalOrders: orders.length,
        totalSale,
        totalLineItems,
        tabCounts: {},
    };
}

export function getOrderTabCount(tab: string): number | undefined {
    return cachedStats?.tabCounts[tab];
}

function parsePriceString(price: string): number {
    return Number(price.replace(/[₹,\s]/g, "")) || 0;
}

export function isOrdersLoaded(): boolean {
    return liveOrders.size > 0;
}

export async function loadOrdersFromApi(force = false): Promise<void> {
    if (!force && liveOrders.size > 0) {
        return;
    }
    if (loadPromise) {
        return loadPromise;
    }

    loadPromise = (async () => {
        await hydrateSellerSession();
        const [details, stats] = await Promise.all([
            fetchSellerOrderDetails(),
            fetchSellerOrderStats(),
        ]);
        liveOrders.clear();
        details.forEach((order) => {
            liveOrders.set(order.id, { ...order, steps: [...order.steps] });
        });
        cachedStats = stats;
        notify();
    })().finally(() => {
        loadPromise = null;
    });

    return loadPromise;
}

export async function refreshOrdersFromApi(): Promise<void> {
    return loadOrdersFromApi(true);
}

export async function updateOrderStatus(
    id: string,
    newStatus: OrderStatus,
    comment?: string,
): Promise<OrderDetail | undefined> {
    const order = liveOrders.get(id);
    if (!order) return undefined;

    try {
        const updated = await updateSellerOrderStatus(id, newStatus, comment);
        liveOrders.set(id, updated);
        notify();
        return updated;
    } catch {
        const now = new Date();
        const dateStr =
            now.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
            }) +
            ", " +
            now.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });

        const existingDates: Partial<Record<string, string>> = {};
        order.steps.forEach((s) => {
            if (s.date) existingDates[s.key] = s.date;
        });

        const statusToKey: Record<OrderStatus, string> = {
            Pending: "pending",
            Processing: "processing",
            Shipped: "shipped",
            Delivered: "delivered",
            Returned: "returned",
            Cancelled: "cancelled",
        };
        existingDates[statusToKey[newStatus]] = dateStr;

        const fallback: OrderDetail = {
            ...order,
            status: newStatus,
            steps: buildSteps(newStatus, existingDates),
            primaryActionLabel: getPrimaryLabel(newStatus),
            secondaryActionLabel: getSecondaryLabel(newStatus),
        };

        liveOrders.set(id, fallback);
        notify();
        return fallback;
    }
}
