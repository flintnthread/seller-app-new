import { apiRequest } from "@/lib/api/client";

export interface BankEditRequest {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
  branchName?: string;
  reason: string;
}

export interface BankEditResponse {
  id: number;
  sellerId: number;
  oldBankName: string | null;
  oldAccountNumber: string | null;
  oldIfscCode: string | null;
  oldAccountHolder: string | null;
  oldBranchName: string | null;
  newBankName: string;
  newAccountNumber: string;
  newIfscCode: string;
  newAccountHolder: string;
  newBranchName: string | null;
  reason: string;
  status: string;
  adminNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  approvedByAdminId: number | null;
}

export async function submitBankEditRequest(request: BankEditRequest): Promise<BankEditResponse> {
  return apiRequest<BankEditResponse>("/api/seller/payout/bank-edit-requests", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function fetchBankEditRequests(): Promise<BankEditResponse[]> {
  return apiRequest<BankEditResponse[]>("/api/seller/payout/bank-edit-requests", {
    method: "GET",
  });
}
