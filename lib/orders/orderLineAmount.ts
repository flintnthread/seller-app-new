import type { OrderItem } from "@/lib/orders/ordersData";

/** Line total from backend fields (qty × unit price or stored line total). */
export function resolveLineItemAmount(item?: OrderItem | null): number {
    if (!item) return 0;
    if (item.subtotalAmount != null && item.subtotalAmount > 0) {
        return item.subtotalAmount;
    }
    if (item.priceAmount != null && item.priceAmount > 0) {
        return item.priceAmount;
    }
    if (item.unitPrice != null && item.qty > 0) {
        return Math.round(item.unitPrice * item.qty * 100) / 100;
    }
    return Number(String(item.price ?? "").replace(/[^\d.]/g, "")) || 0;
}
