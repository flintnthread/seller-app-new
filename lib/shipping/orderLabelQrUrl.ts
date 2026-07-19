import { Platform } from "react-native";

/** Production seller web app (expo web export base path). */
export const PRODUCTION_SELLER_APP_URL = "https://seller.flintnthread.in";

export function resolveSellerAppBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SELLER_WEB_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { origin, pathname } = window.location;
    const sellerRoot = pathname.match(/^(\/Seller)/i)?.[1];
    if (sellerRoot) return `${origin}${sellerRoot}`;
  }

  return PRODUCTION_SELLER_APP_URL;
}

/** Scannable URL → seller order details screen for this order. */
export function buildOrderLabelQrUrl(orderKey: string, sellerId?: number | null): string {
  const params = new URLSearchParams();
  params.set("orderId", orderKey);
  if (sellerId != null && sellerId > 0) {
    params.set("sellerId", String(sellerId));
  }
  return `${resolveSellerAppBaseUrl()}/orderDetails?${params.toString()}`;
}
