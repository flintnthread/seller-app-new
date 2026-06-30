import { apiRequest } from "@/lib/api/client";
import { ensureAccessToken, ensureSellerId } from "@/lib/api/sellerSession";
import { ensureApiReachable, resolveApiBaseUrl } from "@/lib/api/config";

export type SellerBankDetails = {
  sellerId: number;
  bankName: string;
  branchName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  bankProof?: string;
  cancelledCheque?: string;
  bankVerified: boolean;
  bankVerificationDate?: string;
  bankVerificationMethod?: string;
  adminRemarks?: string;
};

export type PayoutSummary = {
  sellerId: number;
  lifetimeEarnings: number;
  thisMonthEarnings: number;
  highestPayout: number;
  pendingAmount: number;
};

export type SellerPayoutRequestRow = {
  id: number;
  sellerId: number;
  orderId: number;
  requestedAmount: number;
  status: "pending" | "approved" | "paid" | "rejected" | "cancelled";
  sellerNote?: string;
  adminNote?: string;
  transactionRef?: string;
  requestedAt?: string;
  reviewedAt?: string;
  paidAt?: string;
  reviewedByAdminId?: number;
  updatedAt?: string;
};

export async function fetchPayoutSummary(): Promise<PayoutSummary> {
  return apiRequest<PayoutSummary>("/api/seller/payout/summary");
}

export async function fetchSellerBankDetails(): Promise<SellerBankDetails> {
  return apiRequest<SellerBankDetails>("/api/seller/payout/bank-details");
}

export async function updateSellerBankDetails(payload: {
  bankName: string;
  branchName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
}): Promise<SellerBankDetails> {
  return apiRequest<SellerBankDetails>("/api/seller/payout/bank-details", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function confirmSellerBankDetails(note?: string): Promise<string> {
  const res = await apiRequest<{ message: string }>("/api/seller/payout/bank-details/confirm", {
    method: "POST",
    body: JSON.stringify({
      ...(note?.trim() ? { note: note.trim() } : {}),
    }),
  });
  return res.message;
}

export async function submitPayoutRequest(payload: {
  orderId: string;
  sellerNote?: string;
}): Promise<SellerPayoutRequestRow> {
  return apiRequest<SellerPayoutRequestRow>("/api/seller/payout/requests", {
    method: "POST",
    body: JSON.stringify({
      orderId: payload.orderId.trim(),
      ...(payload.sellerNote?.trim() ? { sellerNote: payload.sellerNote.trim() } : {}),
    }),
  });
}

export async function fetchMyPayoutRequests(): Promise<SellerPayoutRequestRow[]> {
  return apiRequest<SellerPayoutRequestRow[]>("/api/seller/payout/requests");
}

export async function exportPayoutTransactionsCsv(): Promise<string> {
  const sellerId = ensureSellerId();
  const accessToken = ensureAccessToken();
  if (!sellerId || !accessToken) {
    throw new Error("Seller not logged in.");
  }
  await ensureApiReachable();
  const baseUrl = resolveApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/seller/payout/requests/export`, {
    headers: {
      Accept: "text/csv",
      Authorization: `Bearer ${accessToken}`,
      "X-Seller-Id": String(sellerId),
    },
  });
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.text();
}
