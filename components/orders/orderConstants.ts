import type { OrderStatus } from "../../features/orders/types";

export const C = {
  bg: "#ffffff",
  surface: "#ffffff",
  surfaceElevated: "#fcfdfe",
  surfaceGlass: "rgba(255,255,255,0.98)",
  border: "#f1f5f9",
  borderLight: "#f8fafc",
  accent: "#ef7b1a",
  accentDark: "#d66a12",
  accentSoft: "rgba(239,123,26,0.12)",
  accentMid: "rgba(239,123,26,0.20)",
  navy: "#0a192f",
  text: "#1a1a1a",
  textSecondary: "#4b5563",
  textMuted: "#9ca3af",
  pending: "#f59e0b",
  pendingBg: "rgba(245,158,11,0.12)",
  confirmed: "#ef7b1a",
  confirmedBg: "rgba(239,123,26,0.12)",
  processing: "#6366f1",
  processingBg: "rgba(99,102,241,0.12)",
  shipped: "#2563eb",
  shippedBg: "rgba(37,99,235,0.12)",
  delivered: "#10b981",
  deliveredBg: "rgba(16,185,129,0.12)",
  cancelled: "#dc2626",
  cancelledBg: "rgba(220,38,38,0.12)",
  refunded: "#ea580c",
  refundedBg: "rgba(234,88,12,0.12)",
};

export const NC = {
  success: "#10b981",
  successBg: "rgba(16,185,129,0.09)",
  danger: "#ef4444",
  dangerBg: "rgba(239,68,68,0.09)",
  warning: "#f59e0b",
  warningBg: "rgba(245,158,11,0.09)",
  info: "#3b82f6",
  infoBg: "rgba(59,130,246,0.09)",
};

export const statusMeta: Record<OrderStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "Pending", color: C.pending, bg: C.pendingBg, icon: "⏳" },
  confirmed: { label: "Confirmed", color: C.confirmed, bg: C.confirmedBg, icon: "✅" },
  processing: { label: "Processing", color: C.processing, bg: C.processingBg, icon: "⚙️" },
  shipped: { label: "Shipped", color: C.shipped, bg: C.shippedBg, icon: "🚚" },
  delivered: { label: "Delivered", color: C.delivered, bg: C.deliveredBg, icon: "📦" },
  cancelled: { label: "Cancelled", color: C.cancelled, bg: C.cancelledBg, icon: "✕" },
  refunded: { label: "Refunded", color: C.refunded, bg: C.refundedBg, icon: "↩" },
};
