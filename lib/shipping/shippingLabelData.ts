import type { OrderDetail, OrderItem } from "@/lib/orders/ordersData";
import type { SellerProfileResponse } from "@/services/sellerProfileApi";
import { code128Svg } from "./code128Svg";
import { buildOrderLabelQrUrl } from "./orderLabelQrUrl";
import { qrToSvg } from "./qrSvg";

const DEFAULT_GST_RATE = 0.18;
const INTRA_CGST_RATE = 0.09;
const INTRA_SGST_RATE = 0.09;

export type ShippingLabelLineItem = {
  name: string;
  variant: string;
  hsn: string;
  qty: number;
  basePrice: number;
  cgstPct: string;
  cgstAmt: number;
  sgstPct: string;
  sgstAmt: number;
  igstAmt: number;
  lineTotal: number;
};

export type ShippingLabelData = {
  orderId: string;
  invoiceNo: string;
  orderDate: string;
  paymentLine: string;
  weight: string;
  dimensions: string;
  shipToName: string;
  shipToAddress: string;
  shipToPin: string;
  courier: string;
  awb: string;
  barcodeValue: string;
  qrPayload: string;
  barcodeSvg: string;
  qrSvg: string;
  gstNumber: string;
  returnBusinessName: string;
  returnAddressLine: string;
  returnPhone: string;
  items: ShippingLabelLineItem[];
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  grandTotal: number;
  taxSummaryLine: string;
  sellerId: number | null;
};

function parseAmount(value: string | number | undefined | null): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return Number(String(value ?? 0).replace(/[₹,\s]/g, "")) || 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatInr(n: number): string {
  return `₹${n.toFixed(2)}`;
}

function extractPin(address: string): string {
  const match = address.match(/\b(\d{6})\b/);
  return match?.[1] ?? "000000";
}

function normalizeState(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function extractStateFromAddress(address: string): string {
  const lines = address.split(/[\n,]/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (/india/i.test(line)) {
      const beforeIndia = line.replace(/,?\s*india.*/i, "").trim();
      if (beforeIndia) return beforeIndia.split(",").pop()?.trim() ?? "";
    }
    if (/\d{6}/.test(line)) {
      const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) return parts[parts.length - 2] ?? "";
    }
  }
  return lines.length >= 2 ? lines[lines.length - 2] : "";
}

function gstStateCode(gst: string | null | undefined): string | null {
  const match = (gst ?? "").trim().match(/^(\d{2})/);
  return match?.[1] ?? null;
}

function isIntraState(
  sellerState: string,
  customerState: string,
  sellerGst: string | null | undefined,
  customerGst: string | null | undefined,
): boolean {
  const s1 = normalizeState(sellerState);
  const s2 = normalizeState(customerState);
  if (s1 && s2) {
    if (s1 === s2) return true;
    if (s1.includes(s2) || s2.includes(s1)) return true;
  }
  const g1 = gstStateCode(sellerGst);
  const g2 = gstStateCode(customerGst);
  if (g1 && g2) return g1 === g2;
  return false;
}

function resolveSellerState(profile: SellerProfileResponse | null | undefined): string {
  if (!profile) return "";
  const addr = profile.address;
  if (addr?.warehouseDifferent && addr.warehouseState) return addr.warehouseState;
  return addr?.state ?? "";
}

function buildReturnAddress(profile: SellerProfileResponse | null | undefined): {
  businessName: string;
  gstNumber: string;
  addressLine: string;
  phone: string;
} {
  if (!profile) {
    return {
      businessName: "—",
      gstNumber: "—",
      addressLine: "—",
      phone: "—",
    };
  }

  const useWarehouse = profile.address?.warehouseDifferent;
  const addr = profile.address;
  const street = useWarehouse
    ? addr?.warehouseAddress
    : profile.business?.address || addr?.streetAddress;
  const landmark = useWarehouse ? addr?.warehouseLandmark : addr?.landmark;
  const area = useWarehouse ? addr?.warehouseArea : addr?.area;
  const city = useWarehouse ? addr?.warehouseCity : addr?.city;
  const state = useWarehouse ? addr?.warehouseState : addr?.state;
  const country = useWarehouse ? addr?.warehouseCountry : addr?.country;
  const pincode = useWarehouse ? addr?.warehousePincode : addr?.pincode;

  const segments = [street, landmark, area, city, state, country].filter(Boolean);
  const pinPart = pincode ? `${country ?? "India"} - ${pincode}` : country ?? "India";
  const addressLine = segments.length
    ? `${segments.join(", ")} , ${pinPart}`
    : pinPart;

  const phone = profile.mobile?.trim()
    ? profile.mobile.startsWith("+")
      ? profile.mobile
      : `+91${profile.mobile.replace(/\D/g, "").slice(-10)}`
    : "—";

  return {
    businessName: profile.business?.businessName?.trim() || profile.fullName?.trim() || "—",
    gstNumber: profile.business?.gstNumber?.trim() || "—",
    addressLine,
    phone,
  };
}

function resolveLineAmount(item: OrderItem): number {
  if (item.subtotalAmount != null) return item.subtotalAmount;
  if (item.priceAmount != null) return item.priceAmount * item.qty;
  return parseAmount(item.price);
}

function buildLineItem(
  item: OrderItem,
  intraState: boolean,
): ShippingLabelLineItem {
  const lineTotal = resolveLineAmount(item);
  let lineTax = item.tax ?? 0;

  if (lineTax <= 0 && lineTotal > 0) {
    lineTax = round2(lineTotal * DEFAULT_GST_RATE);
  }

  const basePrice = round2(Math.max(lineTotal - lineTax, lineTotal / (1 + DEFAULT_GST_RATE)));
  const effectiveTax = round2(lineTotal - basePrice);

  let cgstAmt = 0;
  let sgstAmt = 0;
  let igstAmt = 0;
  let cgstPct = "—";
  let sgstPct = "—";

  if (intraState) {
    cgstAmt = round2(effectiveTax / 2);
    sgstAmt = round2(effectiveTax - cgstAmt);
    if (basePrice > 0) {
      cgstPct = `${((cgstAmt / basePrice) * 100).toFixed(1)}%`;
      sgstPct = `${((sgstAmt / basePrice) * 100).toFixed(1)}%`;
    } else {
      cgstPct = `${(INTRA_CGST_RATE * 100).toFixed(1)}%`;
      sgstPct = `${(INTRA_SGST_RATE * 100).toFixed(1)}%`;
    }
  } else {
    igstAmt = effectiveTax;
  }

  return {
    name: item.name,
    variant: item.variant,
    hsn: item.hsnCode || "N/A",
    qty: item.qty,
    basePrice,
    cgstPct,
    cgstAmt,
    sgstPct,
    sgstAmt,
    igstAmt,
    lineTotal: round2(lineTotal),
  };
}

function resolveInvoiceNo(order: OrderDetail): string {
  if (order.orderNumber?.startsWith("INV-")) return order.orderNumber;
  const numeric = order.orderNumber?.replace(/\D/g, "") || order.id.replace(/\D/g, "");
  const suffix = numeric.slice(-6).padStart(6, "0") || "000001";
  return `INV-2026-${suffix}`;
}

function resolveOrderDisplayId(order: OrderDetail): string {
  return order.orderNumber || order.id;
}

function resolveAwb(order: OrderDetail): string {
  const awb = order.shiprocket?.awb?.trim();
  if (awb && awb !== "—") return awb;
  const numeric = order.id.replace(/\D/g, "");
  return numeric || String(order.orderId ?? order.id);
}

function buildQrPayload(order: OrderDetail, sellerId: number | null, _awb: string): string {
  return buildOrderLabelQrUrl(order.id, sellerId);
}

export type BuildShippingLabelOptions = {
  order: OrderDetail;
  profile?: SellerProfileResponse | null;
  sellerId?: number | null;
  weight?: string;
  dimensions?: string;
};

export async function buildShippingLabelData(
  options: BuildShippingLabelOptions,
): Promise<ShippingLabelData> {
  const { order, profile, sellerId = profile?.sellerId ?? null } = options;
  const returnAddr = buildReturnAddress(profile);
  const gstNumber =
    returnAddr.gstNumber !== "—"
      ? returnAddr.gstNumber
      : order.gstNumber || order.gstRecords?.[0]?.gstNumber || "—";

  const customerState = extractStateFromAddress(order.customer.address);
  const sellerState = resolveSellerState(profile);
  const intraState = isIntraState(
    sellerState,
    customerState,
    gstNumber,
    order.gstNumber || order.gstRecords?.[0]?.gstNumber,
  );

  const items = order.items.map((item) => buildLineItem(item, intraState));
  const totalCgst = round2(items.reduce((s, i) => s + i.cgstAmt, 0));
  const totalSgst = round2(items.reduce((s, i) => s + i.sgstAmt, 0));
  const totalIgst = round2(items.reduce((s, i) => s + i.igstAmt, 0));
  const grandTotal = round2(
    items.reduce((s, i) => s + i.lineTotal, 0) || parseAmount(order.pricing.total),
  );

  const awb = resolveAwb(order);
  const barcodeValue = awb;
  const qrPayload = buildQrPayload(order, sellerId, awb);
  const [barcodeSvg, qrSvg] = await Promise.all([
    Promise.resolve(code128Svg(barcodeValue)),
    qrToSvg(qrPayload, 72),
  ]);

  const taxSummaryLine = intraState
    ? `GST: CGST ${formatInr(totalCgst)} + SGST ${formatInr(totalSgst)} = ${formatInr(totalCgst + totalSgst)}`
    : `GST: IGST ${formatInr(totalIgst)}`;

  const sr = order.shiprocket;
  const paymentExtra = order.payment.method.toLowerCase().includes("cod") ? " (your parcel)" : "";

  return {
    orderId: resolveOrderDisplayId(order),
    invoiceNo: resolveInvoiceNo(order),
    orderDate: order.date,
    paymentLine: `${order.payment.method} ${order.pricing.total}${paymentExtra}`,
    weight: options.weight ?? "—",
    dimensions: options.dimensions ?? "—",
    shipToName: order.customer.name,
    shipToAddress: order.customer.address,
    shipToPin: extractPin(order.customer.address),
    courier: sr?.courier?.trim() || "Courier",
    awb,
    barcodeValue,
    qrPayload,
    barcodeSvg,
    qrSvg,
    gstNumber,
    returnBusinessName: returnAddr.businessName,
    returnAddressLine: returnAddr.addressLine,
    returnPhone: returnAddr.phone,
    items,
    totalCgst,
    totalSgst,
    totalIgst,
    grandTotal,
    taxSummaryLine,
    sellerId,
  };
}

export { formatInr, round2 };
