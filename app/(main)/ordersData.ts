/**
 * ordersData.ts
 *
 * Single source of truth for all order data.
 * Imported by both OrdersScreen.tsx and OrderDetailsScreen.tsx.
 *
 * Usage in OrdersScreen:
 *   import { ORDERS } from "./ordersData";
 *
 * Usage in OrderDetailsScreen:
 *   import { ORDER_DETAILS, getOrderDetail } from "./ordersData";
 */

// ─── Shared Status Type ───────────────────────────────────────────────────────
export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Returned"
  | "Cancelled";

// ─── List-level Order (used by OrdersScreen card) ─────────────────────────────
export interface Order {
  id: string;
  date: string;
  product: string;
  variant: string;
  qty: number;
  price: string; // display string e.g. "₹1,299"
  status: OrderStatus;
  customer: string;
  image: string;
  extra?: string;
}

// ─── Detail-level types ───────────────────────────────────────────────────────
export type StepStatus = "done" | "active" | "pending";

export interface OrderStep {
  key: string;
  label: string;
  date?: string;
  iconLib: "Ionicons" | "MCIcons";
  iconName: string;
  status: StepStatus;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string; // multiline string
}

export interface PaymentInfo {
  method: string; // e.g. "Online Payment (UPI)"
  status: "Paid" | "Pending" | "Failed" | "Refunded";
  transactionId: string;
  paidOn: string;
  bankOrUpiId: string;
  refNo: string;
}

export interface OrderItem {
  name: string;
  variant: string;
  sku: string;
  qty: number;
  price: string; // display string
  image: string;
}

export interface PricingBreakdown {
  subtotal: string;
  shipping: string;
  discount?: string;
  total: string;
}

export interface OrderDetail {
  id: string;
  date: string;
  status: OrderStatus;
  customer: CustomerInfo;
  items: OrderItem[];
  pricing: PricingBreakdown;
  payment: PaymentInfo;
  steps: OrderStep[];
  customerNote?: string;
  sellerNote?: string;
  /** Label shown on the primary (filled) action button */
  primaryActionLabel: string;
  /** Label shown on the secondary (outline) action button */
  secondaryActionLabel: string;
  /** AWB / tracking / delivery note shown in the stepper area */
  extraNote?: string;
}

// ─── Stepper builder helper ───────────────────────────────────────────────────
/**
 * Returns the 4-step stepper (Pending → Processing → Shipped → Delivered)
 * with correct done/active/pending states for the given status.
 * Returned & Cancelled orders show a 5th step instead of Delivered.
 */
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

  // For Returned orders, swap delivered → returned
  if (status === "Returned") {
    flow[3] = {
      key: "returned",
      label: "Returned",
      iconLib: "MCIcons",
      iconName: "arrow-u-left-top",
    };
  }
  // For Cancelled orders, swap delivered → cancelled
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

  // buildSteps return — add `as OrderStep[]`:
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

// ─── Full Order Details ───────────────────────────────────────────────────────
export const ORDER_DETAILS: OrderDetail[] = [
  // ── 1. #FNT123456 · Cotton Kurti · Priya Sharma · Pending ─────────────────
  {
    id: "#FNT123456",
    date: "20 May 2024, 10:30 AM",
    status: "Pending",
    customer: {
      name: "Priya Sharma",
      phone: "+91 98765 43210",
      email: "priyasharma@gmail.com",
      address:
        "B-1204, Green Park Society,\nNew Friends Colony\nNew Delhi - 110025, India",
    },
    items: [
      {
        name: "Cotton Kurti",
        variant: "Pink • M",
        sku: "CK-PNK-M",
        qty: 1,
        price: "₹1,299",
        image:
          "https://images.unsplash.com/photo-1594938298603-c8148c4b4cd8?w=160&h=160&fit=crop&crop=center",
      },
    ],
    pricing: {
      subtotal: "₹1,299",
      shipping: "₹0",
      total: "₹1,299",
    },
    payment: {
      method: "Online Payment (UPI)",
      status: "Paid",
      transactionId: "UPI123456789012",
      paidOn: "20 May 2024, 10:30 AM",
      bankOrUpiId: "priya@upi",
      refNo: "PAY20240520103045",
    },
    steps: buildSteps("Pending", { pending: "20 May, 10:30 AM" }),
    customerNote: "Please deliver between 10 AM to 6 PM.",
    primaryActionLabel: "Accept Order",
    secondaryActionLabel: "Reject Order",
  },

  // ── 2. #FNT123455 · Floral Maxi Dress · Anjali Mehta · Processing ─────────
  {
    id: "#FNT123455",
    date: "19 May 2024, 09:15 PM",
    status: "Processing",
    customer: {
      name: "Anjali Mehta",
      phone: "+91 91234 56789",
      email: "anjali.mehta@gmail.com",
      address:
        "Flat 302, Sunrise Apartments,\nBandra West\nMumbai - 400050, India",
    },
    items: [
      {
        name: "Floral Maxi Dress",
        variant: "White • L",
        sku: "FMD-WHT-L",
        qty: 1,
        price: "₹2,499",
        image:
          "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=160&h=160&fit=crop&crop=center",
      },
    ],
    pricing: {
      subtotal: "₹2,499",
      shipping: "₹49",
      total: "₹2,548",
    },
    payment: {
      method: "Credit Card",
      status: "Paid",
      transactionId: "CC987654321098",
      paidOn: "19 May 2024, 09:15 PM",
      bankOrUpiId: "HDFC Bank •••• 4321",
      refNo: "PAY20240519091512",
    },
    steps: buildSteps("Processing", {
      pending: "19 May, 09:15 PM",
      processing: "19 May, 11:00 PM",
    }),
    customerNote: "Gift wrapping preferred.",
    primaryActionLabel: "Mark as Shipped",
    secondaryActionLabel: "Cancel Order",
  },

  // ── 3. #FNT123454 · Handbag · Neha Verma · Shipped ───────────────────────
  {
    id: "#FNT123454",
    date: "19 May 2024, 02:45 PM",
    status: "Shipped",
    customer: {
      name: "Neha Verma",
      phone: "+91 99887 76655",
      email: "neha.verma@outlook.com",
      address: "H.No 45, Sector 21,\nGurgaon - 122001,\nHaryana, India",
    },
    items: [
      {
        name: "Handbag",
        variant: "Brown",
        sku: "HB-BRN-OS",
        qty: 1,
        price: "₹749",
        image:
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=160&h=160&fit=crop&crop=center",
      },
    ],
    pricing: {
      subtotal: "₹749",
      shipping: "₹0",
      total: "₹749",
    },
    payment: {
      method: "Online Payment (UPI)",
      status: "Paid",
      transactionId: "UPI556677889900",
      paidOn: "19 May 2024, 02:45 PM",
      bankOrUpiId: "neha@paytm",
      refNo: "PAY20240519024512",
    },
    steps: buildSteps("Shipped", {
      pending: "19 May, 02:45 PM",
      processing: "19 May, 05:00 PM",
      shipped: "20 May, 09:00 AM",
    }),
    extraNote: "AWB: 1234567890  |  Carrier: Delhivery",
    customerNote: "Leave at the gate if not available.",
    primaryActionLabel: "Mark as Delivered",
    secondaryActionLabel: "Track Shipment",
  },

  // ── 4. #FNT123453 · Women's Sandals · Ritu Singh · Delivered ─────────────
  {
    id: "#FNT123453",
    date: "18 May 2024, 11:20 AM",
    status: "Delivered",
    customer: {
      name: "Ritu Singh",
      phone: "+91 94455 66778",
      email: "ritu.singh@yahoo.com",
      address: "C-77, Rajouri Garden,\nNew Delhi - 110027, India",
    },
    items: [
      {
        name: "Women's Sandals",
        variant: "Tan • 38",
        sku: "WS-TAN-38",
        qty: 1,
        price: "₹599",
        image:
          "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=160&h=160&fit=crop&crop=center",
      },
    ],
    pricing: {
      subtotal: "₹599",
      shipping: "₹0",
      total: "₹599",
    },
    payment: {
      method: "Cash on Delivery",
      status: "Paid",
      transactionId: "COD000453001",
      paidOn: "20 May 2024, 01:15 PM",
      bankOrUpiId: "—",
      refNo: "COD20240520011510",
    },
    steps: buildSteps("Delivered", {
      pending: "18 May, 11:20 AM",
      processing: "18 May, 02:00 PM",
      shipped: "19 May, 08:30 AM",
      delivered: "20 May, 01:15 PM",
    }),
    extraNote: "Delivered on 20 May 2024",
    customerNote: "No special instructions.",
    primaryActionLabel: "Download Invoice",
    secondaryActionLabel: "Initiate Return",
  },

  // ── 5. #FNT123452 · Cotton Kurti · Komal Patel · Returned ────────────────
  {
    id: "#FNT123452",
    date: "18 May 2024, 10:05 AM",
    status: "Returned",
    customer: {
      name: "Komal Patel",
      phone: "+91 87654 32109",
      email: "komal.patel@gmail.com",
      address: "12, Panchvati Society,\nAhmedabad - 380006,\nGujarat, India",
    },
    items: [
      {
        name: "Cotton Kurti",
        variant: "Blue • M",
        sku: "CK-BLU-M",
        qty: 1,
        price: "₹1,299",
        image:
          "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=160&h=160&fit=crop&crop=center",
      },
    ],
    pricing: {
      subtotal: "₹1,299",
      shipping: "₹0",
      total: "₹1,299",
    },
    payment: {
      method: "Online Payment (UPI)",
      status: "Refunded",
      transactionId: "UPI112233445566",
      paidOn: "18 May 2024, 10:05 AM",
      bankOrUpiId: "komal@gpay",
      refNo: "REF20240521094500",
    },
    steps: buildSteps("Returned", {
      pending: "18 May, 10:05 AM",
      processing: "18 May, 01:00 PM",
      shipped: "19 May, 10:00 AM",
      returned: "21 May, 09:45 AM",
    }),
    extraNote: "Returned on 21 May 2024  |  Reason: Size mismatch",
    customerNote: "Wrong size delivered. Please process refund.",
    primaryActionLabel: "Process Refund",
    secondaryActionLabel: "View Return Request",
  },
];

// ─── Lookup helper ────────────────────────────────────────────────────────────
export function getOrderDetail(id: string): OrderDetail | undefined {
  return ORDER_DETAILS.find((o) => o.id === id);
}

// ─── Re-export flat list for OrdersScreen ────────────────────────────────────
export const ORDERS: Order[] = ORDER_DETAILS.map((d) => {
  const item = d.items[0];
  if (!item) throw new Error(`Order ${d.id} has no items`);
  return {
    id: d.id,
    date: d.date,
    product: item.name,
    variant: item.variant,
    qty: item.qty,
    price: item.price,
    status: d.status,
    customer: d.customer.name,
    image: item.image,
    ...(d.extraNote !== undefined ? { extra: d.extraNote } : {}),
  };
});
