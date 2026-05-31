/**
 * Order domain types for the seller app.
 * Live order data is loaded from the API via `ordersStore` and `orderApi`.
 */

// â”€â”€â”€ Shared Status Type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Returned"
  | "Cancelled";

// â”€â”€â”€ List-level Order (used by OrdersScreen card) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Order {
  /** Unique key for list rendering (one row per order line item). */
  listKey: string;
  /** Display order id (e.g. #ORD-123) â€” shared by line items on the same order. */
  id: string;
  date: string;
  product: string;
  variant: string;
  qty: number;
  price: string; // display string e.g. "â‚¹1,299"
  status: OrderStatus;
  customer: string;
  image: string;
  extra?: string;
}

// â”€â”€â”€ Detail-level types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type StepStatus = "done" | "active" | "pending";

export interface OrderStep {
  key: string;
  label: string;
  date?: string;
  iconLib: "Ionicons" | "MCIcons";
  iconName: string;
  status: StepStatus;
  comment?: string;
}

export interface OrderStatusHistoryEntry {
  id: number;
  orderId: number;
  status: string;
  statusLabel: string;
  comment?: string;
  createdBy?: number;
  createdAt: string;
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
  lineItemId?: number;
  productId?: number;
  variantId?: number;
  sellerId?: number;
  name: string;
  variant: string;
  sku: string;
  qty: number;
  price: string; // display string
  priceAmount?: number;
  subtotalAmount?: number;
  image: string;
  hsnCode?: string;
  unitPrice?: number;
  tax?: number;
  discount?: number;
  status?: string;
  uiStatus?: OrderStatus;
  color?: string;
  size?: string;
  sellerName?: string;
  weight?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packageDeadWeight?: number;
  volumetricWeight?: number;
  chargeableWeight?: number;
  customDetails?: OrderItemCustomDetail[];
}

export interface OrderItemCustomDetail {
  id: number;
  orderItemId: number;
  fieldKey: string;
  fieldLabel: string;
  valueText?: string;
  valueFile?: string;
  createdAt: string;
}

export interface OrderEmailLog {
  id: number;
  orderId: number;
  email: string;
  emailType: string;
  subject: string;
  status: string;
  sentAt: string;
  errorMessage?: string;
}

export interface OrderGstRecord {
  id?: number;
  orderId: number;
  gstNumber?: string;
  gstInfo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderReturnRequest {
  id: number;
  orderId: number;
  orderItemId: number;
  productName: string;
  reason?: string;
  description?: string;
  unboxingVideo?: string;
  solution?: string;
  solutionLabel?: string;
  status: string;
  statusLabel: string;
  adminComment?: string;
  shiprocketReturnId?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderExchangeRequest {
  id: number;
  orderId: number;
  orderItemId: number;
  productName: string;
  reason?: string;
  description?: string;
  exchangeColor?: number;
  exchangeSize?: number;
  status: string;
  statusLabel: string;
  adminComment?: string;
  shiprocketOrderId?: string;
  shiprocketShipmentId?: string;
  shiprocketAwbCode?: string;
  trackingNumber?: string;
  shippingProvider?: string;
  processedAt?: string;
  createdAt: string;
}

export interface OrderReplacementRequest {
  id: number;
  orderId: number;
  orderItemId: number;
  productName: string;
  reason?: string;
  description?: string;
  status: string;
  statusLabel: string;
  adminComment?: string;
  shiprocketReturnId?: string;
  trackingNumber?: string;
  shippingProvider?: string;
  processedAt?: string;
  createdAt: string;
}

export interface OrderCancellationRequest {
  id: number;
  orderId: number;
  orderItemId: number;
  productName: string;
  reason?: string;
  status: string;
  statusLabel: string;
  adminComment?: string;
  processedAt?: string;
  createdAt: string;
}

export interface OrderReviewSummary {
  returnCount: number;
  exchangeCount: number;
  replacementCount: number;
  cancellationCount: number;
  hasPendingReview: boolean;
}

export interface PricingBreakdown {
  subtotal: string;
  shipping: string;
  tax?: string;
  discount?: string;
  referralDiscount?: string;
  walletDeduction?: string;
  total: string;
  subtotalAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
}

export interface ShiprocketInfo {
  orderId?: string;
  shipmentId?: string;
  awb?: string;
  courier?: string;
  status?: string;
  trackingUrl?: string;
  syncedAt?: string;
}

export interface OrderDetail {
  id: string;
  orderId?: number;
  orderNumber?: string;
  date: string;
  status: OrderStatus;
  dbStatus?: string;
  customer: CustomerInfo;
  items: OrderItem[];
  pricing: PricingBreakdown;
  payment: PaymentInfo;
  steps: OrderStep[];
  statusHistory?: OrderStatusHistoryEntry[];
  emailLogs?: OrderEmailLog[];
  gstRecords?: OrderGstRecord[];
  returns?: OrderReturnRequest[];
  exchanges?: OrderExchangeRequest[];
  replacements?: OrderReplacementRequest[];
  cancellations?: OrderCancellationRequest[];
  reviewSummary?: OrderReviewSummary;
  customerNote?: string;
  sellerNote?: string;
  cancelReason?: string;
  gstNumber?: string;
  gstInfo?: string;
  billing?: CustomerInfo;
  shiprocket?: ShiprocketInfo;
  /** Label shown on the primary (filled) action button */
  primaryActionLabel: string;
  /** Label shown on the secondary (outline) action button */
  secondaryActionLabel: string;
  /** AWB / tracking / delivery note shown in the stepper area */
  extraNote?: string;
}
