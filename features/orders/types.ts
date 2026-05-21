export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type SortOption =
  | "latest"
  | "oldest"
  | "status"
  | "amount_desc"
  | "amount_asc";

export interface OrderLineItem {
  id: string;
  productName: string;
  variant: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  productImage?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  productImage?: string;
  productName?: string;
  lineItems: OrderLineItem[];
  amount: number;
  currency: string;
  status: OrderStatus;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersFilter {
  status: OrderStatus | "all";
  dateFrom?: string;
  dateTo?: string;
  search: string;
}

export interface OrderNotification {
  id: string;
  orderId: string;
  customerName: string;
  productName?: string;
  amount: number;
  currency: string;
  receivedAt: string;
  isRead: boolean;
}

export type PaymentMethod = "cod" | "razorpay" | "upi" | "netbanking" | "card";
export type CourierPartner =
  | "Delhivery"
  | "BlueDart"
  | "DTDC"
  | "Ekart"
  | "Xpressbees"
  | "Shiprocket";

export type TrackingStage =
  | "order_placed"
  | "accepted"
  | "packing"
  | "ready_to_ship"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface TrackingEvent {
  stage: TrackingStage;
  label: string;
  timestamp: string | null;
  note?: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface PaymentInfo {
  method: PaymentMethod;
  status: "paid" | "pending" | "failed" | "refunded";
  transactionId?: string;
  paidAt?: string;
  amount: number;
  currency: string;
}

export interface CourierInfo {
  partner: CourierPartner | null;
  trackingId: string | null;
  estimatedDelivery: string | null;
}
