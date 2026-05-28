import { apiRequest } from "@/lib/api/client";
import type {
    CustomerInfo,
    Order,
    OrderCancellationRequest,
    OrderDetail,
    OrderEmailLog,
    OrderExchangeRequest,
    OrderGstRecord,
    OrderItem,
    OrderItemCustomDetail,
    OrderReplacementRequest,
    OrderReturnRequest,
    OrderReviewSummary,
    OrderStatus,
    OrderStatusHistoryEntry,
    OrderStep,
    PaymentInfo,
    PricingBreakdown,
    ShiprocketInfo,
} from "@/app/(main)/ordersData";

type ApiOrderStep = {
    key: string;
    label: string;
    date?: string;
    iconLib: string;
    iconName: string;
    status: string;
    comment?: string;
};

type ApiStatusHistoryEntry = {
    id: number;
    orderId: number;
    status: string;
    statusLabel: string;
    comment?: string;
    createdBy?: number;
    createdAt: string;
};

type ApiOrderLine = {
    lineItemId?: number;
    productId?: number;
    variantId?: number;
    sellerId?: number;
    name: string;
    variant: string;
    sku: string;
    qty: number;
    price: string;
    priceAmount?: number;
    subtotalAmount?: number;
    image: string;
    hsnCode?: string;
    unitPrice?: number;
    discount?: number;
    tax?: number;
    status?: string;
    uiStatus?: string;
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
    customDetails?: ApiCustomDetail[];
};

type ApiCustomDetail = {
    id: number;
    orderItemId: number;
    fieldKey: string;
    fieldLabel: string;
    valueText?: string;
    valueFile?: string;
    createdAt: string;
};

type ApiEmailLog = {
    id: number;
    orderId: number;
    email: string;
    emailType: string;
    subject: string;
    status: string;
    sentAt: string;
    errorMessage?: string;
};

type ApiGstRecord = {
    id?: number;
    orderId: number;
    gstNumber?: string;
    gstInfo?: string;
    createdAt?: string;
    updatedAt?: string;
};

type ApiReturnRequest = {
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
};

type ApiExchangeRequest = {
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
};

type ApiReplacementRequest = {
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
};

type ApiCancellationRequest = {
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
};

type ApiReviewSummary = {
    returnCount: number;
    exchangeCount: number;
    replacementCount: number;
    cancellationCount: number;
    hasPendingReview: boolean;
};

type ApiCustomer = {
    name: string;
    phone: string;
    email: string;
    address: string;
};

type ApiPayment = {
    method: string;
    status: string;
    sellerPaymentStatus?: string;
    paymentCompleted?: boolean;
    transactionId: string;
    paidOn: string;
    bankOrUpiId: string;
    refNo: string;
    razorpayOrderId?: string;
};

type ApiPricing = {
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
};

type ApiOrderSummary = {
    id: string;
    orderId: number;
    date: string;
    product: string;
    variant: string;
    qty: number;
    price: string;
    priceAmount?: number;
    subtotalAmount?: number;
    taxAmount?: number;
    discountAmount?: number;
    itemCount?: number;
    status: string;
    customer: string;
    image: string;
    extra?: string;
};

type ApiOrderDetail = {
    id: string;
    orderId: number;
    orderNumber?: string;
    date: string;
    status: string;
    dbStatus?: string;
    customer: ApiCustomer;
    billing?: ApiCustomer | null;
    items: ApiOrderLine[];
    pricing: ApiPricing;
    payment: ApiPayment;
    steps: ApiOrderStep[];
    customerNote?: string;
    sellerNote?: string;
    cancelReason?: string;
    gstNumber?: string;
    gstInfo?: string;
    primaryActionLabel: string;
    secondaryActionLabel: string;
    extraNote?: string;
    shiprocketOrderId?: string;
    shiprocketShipmentId?: string;
    shiprocketAwbCode?: string;
    shiprocketCourierName?: string;
    shiprocketStatus?: string;
    shiprocketTrackingUrl?: string;
    shiprocketSyncedAt?: string;
    statusHistory?: ApiStatusHistoryEntry[];
    emailLogs?: ApiEmailLog[];
    gstRecords?: ApiGstRecord[];
    returns?: ApiReturnRequest[];
    exchanges?: ApiExchangeRequest[];
    replacements?: ApiReplacementRequest[];
    cancellations?: ApiCancellationRequest[];
    reviewSummary?: ApiReviewSummary;
};

function toOrderStatus(status: string): OrderStatus {
    const normalized = status?.trim();
    const allowed: OrderStatus[] = [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Returned",
        "Cancelled",
    ];
    if (allowed.includes(normalized as OrderStatus)) {
        return normalized as OrderStatus;
    }
    return "Pending";
}

function toPaymentStatus(status: string): PaymentInfo["status"] {
    const normalized = status?.trim();
    if (normalized === "Paid" || normalized === "Pending" || normalized === "Failed" || normalized === "Refunded") {
        return normalized;
    }
    return "Pending";
}

function toStep(step: ApiOrderStep): OrderStep {
    return {
        key: step.key,
        label: step.label,
        ...(step.date ? { date: step.date } : {}),
        iconLib: step.iconLib === "Ionicons" ? "Ionicons" : "MCIcons",
        iconName: step.iconName,
        status: step.status as OrderStep["status"],
        ...(step.comment ? { comment: step.comment } : {}),
    };
}

function toCustomDetail(detail: ApiCustomDetail): OrderItemCustomDetail {
    return {
        id: detail.id,
        orderItemId: detail.orderItemId,
        fieldKey: detail.fieldKey,
        fieldLabel: detail.fieldLabel,
        createdAt: detail.createdAt,
        ...(detail.valueText ? { valueText: detail.valueText } : {}),
        ...(detail.valueFile ? { valueFile: detail.valueFile } : {}),
    };
}

function toOrderItem(line: ApiOrderLine): OrderItem {
    const uiStatus = line.uiStatus ? toOrderStatus(line.uiStatus) : undefined;
    return {
        lineItemId: line.lineItemId,
        ...(line.productId != null ? { productId: line.productId } : {}),
        ...(line.variantId != null ? { variantId: line.variantId } : {}),
        ...(line.sellerId != null ? { sellerId: line.sellerId } : {}),
        name: line.name,
        variant: line.variant,
        sku: line.sku,
        qty: line.qty,
        price: line.price,
        ...(line.priceAmount != null ? { priceAmount: line.priceAmount } : {}),
        ...(line.subtotalAmount != null ? { subtotalAmount: line.subtotalAmount } : {}),
        image: line.image,
        ...(line.hsnCode ? { hsnCode: line.hsnCode } : {}),
        ...(line.unitPrice != null ? { unitPrice: line.unitPrice } : {}),
        ...(line.tax != null ? { tax: line.tax } : {}),
        ...(line.discount != null ? { discount: line.discount } : {}),
        ...(line.status ? { status: line.status } : {}),
        ...(uiStatus ? { uiStatus } : {}),
        ...(line.color ? { color: line.color } : {}),
        ...(line.size ? { size: line.size } : {}),
        ...(line.sellerName ? { sellerName: line.sellerName } : {}),
        ...(line.weight != null ? { weight: line.weight } : {}),
        ...(line.lengthCm != null ? { lengthCm: line.lengthCm } : {}),
        ...(line.widthCm != null ? { widthCm: line.widthCm } : {}),
        ...(line.heightCm != null ? { heightCm: line.heightCm } : {}),
        ...(line.packageDeadWeight != null ? { packageDeadWeight: line.packageDeadWeight } : {}),
        ...(line.volumetricWeight != null ? { volumetricWeight: line.volumetricWeight } : {}),
        ...(line.chargeableWeight != null ? { chargeableWeight: line.chargeableWeight } : {}),
        ...(line.customDetails?.length ? { customDetails: line.customDetails.map(toCustomDetail) } : {}),
    };
}

function toCustomer(customer: ApiCustomer): CustomerInfo {
    return {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
    };
}

function toPayment(payment: ApiPayment): PaymentInfo {
    return {
        method: payment.method,
        status: toPaymentStatus(payment.status),
        transactionId: payment.transactionId ?? "",
        paidOn: payment.paidOn ?? "",
        bankOrUpiId: payment.bankOrUpiId ?? "",
        refNo: payment.refNo ?? "",
    };
}

function toPricing(pricing: ApiPricing): PricingBreakdown {
    return {
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        ...(pricing.tax ? { tax: pricing.tax } : {}),
        ...(pricing.discount ? { discount: pricing.discount } : {}),
        ...(pricing.referralDiscount ? { referralDiscount: pricing.referralDiscount } : {}),
        ...(pricing.walletDeduction ? { walletDeduction: pricing.walletDeduction } : {}),
        total: pricing.total,
        ...(pricing.subtotalAmount != null ? { subtotalAmount: pricing.subtotalAmount } : {}),
        ...(pricing.taxAmount != null ? { taxAmount: pricing.taxAmount } : {}),
        ...(pricing.discountAmount != null ? { discountAmount: pricing.discountAmount } : {}),
        ...(pricing.totalAmount != null ? { totalAmount: pricing.totalAmount } : {}),
    };
}

function toShiprocket(detail: ApiOrderDetail): ShiprocketInfo | undefined {
    const hasData =
        detail.shiprocketOrderId ||
        detail.shiprocketShipmentId ||
        detail.shiprocketAwbCode ||
        detail.shiprocketCourierName ||
        detail.shiprocketStatus ||
        detail.shiprocketTrackingUrl;

    if (!hasData) {
        return undefined;
    }

    return {
        ...(detail.shiprocketOrderId ? { orderId: detail.shiprocketOrderId } : {}),
        ...(detail.shiprocketShipmentId ? { shipmentId: detail.shiprocketShipmentId } : {}),
        ...(detail.shiprocketAwbCode ? { awb: detail.shiprocketAwbCode } : {}),
        ...(detail.shiprocketCourierName ? { courier: detail.shiprocketCourierName } : {}),
        ...(detail.shiprocketStatus ? { status: detail.shiprocketStatus } : {}),
        ...(detail.shiprocketTrackingUrl ? { trackingUrl: detail.shiprocketTrackingUrl } : {}),
        ...(detail.shiprocketSyncedAt ? { syncedAt: detail.shiprocketSyncedAt } : {}),
    };
}

export function mapDetail(detail: ApiOrderDetail): OrderDetail {
    const shiprocket = toShiprocket(detail);

    return {
        id: detail.id,
        ...(detail.orderId != null ? { orderId: detail.orderId } : {}),
        ...(detail.orderNumber ? { orderNumber: detail.orderNumber } : {}),
        date: detail.date,
        status: toOrderStatus(detail.status),
        ...(detail.dbStatus ? { dbStatus: detail.dbStatus } : {}),
        customer: toCustomer(detail.customer),
        ...(detail.billing ? { billing: toCustomer(detail.billing) } : {}),
        items: detail.items.map(toOrderItem),
        pricing: toPricing(detail.pricing),
        payment: toPayment(detail.payment),
        steps: detail.steps.map(toStep),
        ...(detail.statusHistory?.length
            ? {
                  statusHistory: detail.statusHistory.map(
                      (h): OrderStatusHistoryEntry => ({
                          id: h.id,
                          orderId: h.orderId,
                          status: h.status,
                          statusLabel: h.statusLabel,
                          createdAt: h.createdAt,
                          ...(h.comment ? { comment: h.comment } : {}),
                          ...(h.createdBy != null ? { createdBy: h.createdBy } : {}),
                      })
                  ),
              }
            : {}),
        ...(detail.emailLogs?.length
            ? {
                  emailLogs: detail.emailLogs.map(
                      (log): OrderEmailLog => ({
                          id: log.id,
                          orderId: log.orderId,
                          email: log.email,
                          emailType: log.emailType,
                          subject: log.subject,
                          status: log.status,
                          sentAt: log.sentAt,
                          ...(log.errorMessage ? { errorMessage: log.errorMessage } : {}),
                      })
                  ),
              }
            : {}),
        ...(detail.gstRecords?.length
            ? {
                  gstRecords: detail.gstRecords.map(
                      (gst): OrderGstRecord => ({
                          orderId: gst.orderId,
                          ...(gst.id != null ? { id: gst.id } : {}),
                          ...(gst.gstNumber ? { gstNumber: gst.gstNumber } : {}),
                          ...(gst.gstInfo ? { gstInfo: gst.gstInfo } : {}),
                          ...(gst.createdAt ? { createdAt: gst.createdAt } : {}),
                          ...(gst.updatedAt ? { updatedAt: gst.updatedAt } : {}),
                      })
                  ),
              }
            : {}),
        ...(detail.returns?.length
            ? { returns: detail.returns.map((row): OrderReturnRequest => ({ ...row })) }
            : {}),
        ...(detail.exchanges?.length
            ? { exchanges: detail.exchanges.map((row): OrderExchangeRequest => ({ ...row })) }
            : {}),
        ...(detail.replacements?.length
            ? { replacements: detail.replacements.map((row): OrderReplacementRequest => ({ ...row })) }
            : {}),
        ...(detail.cancellations?.length
            ? { cancellations: detail.cancellations.map((row): OrderCancellationRequest => ({ ...row })) }
            : {}),
        ...(detail.reviewSummary
            ? { reviewSummary: detail.reviewSummary as OrderReviewSummary }
            : {}),
        ...(detail.customerNote ? { customerNote: detail.customerNote } : {}),
        ...(detail.sellerNote ? { sellerNote: detail.sellerNote } : {}),
        ...(detail.cancelReason ? { cancelReason: detail.cancelReason } : {}),
        ...(detail.gstNumber ? { gstNumber: detail.gstNumber } : {}),
        ...(detail.gstInfo ? { gstInfo: detail.gstInfo } : {}),
        ...(shiprocket ? { shiprocket } : {}),
        primaryActionLabel: detail.primaryActionLabel,
        secondaryActionLabel: detail.secondaryActionLabel,
        ...(detail.extraNote ? { extraNote: detail.extraNote } : {}),
    };
}

function mapSummary(row: ApiOrderSummary): Order {
    return {
        listKey: `${row.id}-summary`,
        id: row.id,
        date: row.date,
        product: row.product,
        variant: row.variant,
        qty: row.qty,
        price: row.price,
        status: toOrderStatus(row.status),
        customer: row.customer,
        image: row.image,
        ...(row.extra ? { extra: row.extra } : {}),
    };
}

type ApiOrderStats = {
    totalLineItems: number;
    totalOrders: number;
    allItems: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    returns: number;
    cancelled: number;
    totalSale: number;
};

export async function fetchSellerOrderStats(): Promise<import("@/app/(main)/ordersStore").SellerOrderStats> {
    const stats = await apiRequest<ApiOrderStats>("/api/orders/stats");
    return {
        totalLineItems: stats.totalLineItems,
        totalOrders: stats.totalOrders,
        totalSale: stats.totalSale,
        tabCounts: {
            "All Orders": stats.allItems,
            Pending: stats.pending,
            Processing: stats.processing,
            Shipped: stats.shipped,
            Delivered: stats.delivered,
            Returns: stats.returns,
            Cancelled: stats.cancelled,
        },
    };
}

export async function fetchSellerOrderSummaries(): Promise<Order[]> {
    const rows = await apiRequest<ApiOrderSummary[]>("/api/orders");
    return rows.map(mapSummary);
}

export async function fetchSellerOrderDetails(): Promise<OrderDetail[]> {
    const details = await apiRequest<ApiOrderDetail[]>("/api/orders/details");
    return details.map(mapDetail);
}

export async function fetchSellerOrderDetail(orderKey: string): Promise<OrderDetail> {
    const detail = await apiRequest<ApiOrderDetail>(`/api/orders/${encodeURIComponent(orderKey)}`);
    return mapDetail(detail);
}

export async function updateSellerOrderStatus(
    orderKey: string,
    status: OrderStatus,
    comment?: string
): Promise<OrderDetail> {
    const detail = await apiRequest<ApiOrderDetail>(`/api/orders/${encodeURIComponent(orderKey)}/status`, {
        method: "PATCH",
        body: JSON.stringify({
            status,
            ...(comment?.trim() ? { comment: comment.trim() } : {}),
        }),
    });
    return mapDetail(detail);
}
