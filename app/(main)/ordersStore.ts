/**
 * ordersStore.ts
 *
 * Global mutable store for order status.
 * Both OrdersScreen and OrderDetailsScreen import from here.
 * Calling updateOrderStatus() mutates the in-memory list so both screens
 * reflect the change immediately on next render / navigation.
 */

import type { OrderDetail, OrderStatus } from "./ordersData";
import { ORDER_DETAILS } from "./ordersData";

// ── Listeners ─────────────────────────────────────────────────────────────────
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribeToOrderChanges(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

// ── Live mutable copy ─────────────────────────────────────────────────────────
// We keep a Map so lookups are O(1) and mutation is easy.
const liveOrders = new Map<string, OrderDetail>(
  ORDER_DETAILS.map((o) => [o.id, { ...o, steps: [...o.steps] }]),
);

// ── Stepper builder (same logic as ordersData.ts) ─────────────────────────────
import type { OrderStep, StepStatus } from "./ordersData";

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
    status: (i < active
      ? "done"
      : i === active
        ? "active"
        : "pending") as StepStatus,
  })) as OrderStep[];
}

// ── Derive action labels from status ─────────────────────────────────────────
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

// ── Public API ────────────────────────────────────────────────────────────────
export function getLiveOrder(id: string): OrderDetail | undefined {
  return liveOrders.get(id);
}

export function getLiveOrders(): OrderDetail[] {
  return Array.from(liveOrders.values());
}

/**
 * Updates the status of an order and rebuilds its stepper.
 * Returns the updated OrderDetail, or undefined if id not found.
 */
export function updateOrderStatus(
  id: string,
  newStatus: OrderStatus,
): OrderDetail | undefined {
  const order = liveOrders.get(id);
  if (!order) return undefined;

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

  // Preserve existing step dates, add today's date for the new status
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

  const updated: OrderDetail = {
    ...order,
    status: newStatus,
    steps: buildSteps(newStatus, existingDates),
    primaryActionLabel: getPrimaryLabel(newStatus),
    secondaryActionLabel: getSecondaryLabel(newStatus),
  };

  liveOrders.set(id, updated);
  notify();
  return updated;
}
