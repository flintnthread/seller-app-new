import { apiRequest } from "@/lib/api/client";
import type { CategoryRequestRecord, CategoryRequestStatus } from "@/components/catalog/CategoryRequestScreen";

export type CategoryRequestPayload = {
    categoryName: string;
    description: string;
    reason: string;
};

type ApiCategoryRequest = {
    id: number;
    categoryName: string;
    description: string;
    reason: string;
    status: string;
    submittedAt: string;
};

function toStatus(value: string): CategoryRequestStatus {
    if (value === "Approved") return "Approved";
    if (value === "Rejected") return "Rejected";
    return "Pending";
}

function toRecord(row: ApiCategoryRequest): CategoryRequestRecord {
    return {
        id: String(row.id),
        categoryName: row.categoryName,
        description: row.description ?? "",
        reason: row.reason ?? "",
        status: toStatus(row.status),
        submittedAt: row.submittedAt,
    };
}

export async function fetchCategoryRequests(): Promise<CategoryRequestRecord[]> {
    const rows = await apiRequest<ApiCategoryRequest[]>("/api/category-requests");
    return rows.map(toRecord);
}

export async function createCategoryRequest(
    payload: CategoryRequestPayload
): Promise<CategoryRequestRecord> {
    const row = await apiRequest<ApiCategoryRequest>("/api/category-requests", {
        method: "POST",
        body: JSON.stringify({
            categoryName: payload.categoryName,
            description: payload.description,
            reason: payload.reason,
        }),
    });
    return toRecord(row);
}

export async function updateCategoryRequest(
    id: string,
    payload: CategoryRequestPayload
): Promise<CategoryRequestRecord> {
    const row = await apiRequest<ApiCategoryRequest>(`/api/category-requests/${id}`, {
        method: "PUT",
        body: JSON.stringify({
            categoryName: payload.categoryName,
            description: payload.description,
            reason: payload.reason,
        }),
    });
    return toRecord(row);
}

export async function deleteCategoryRequest(id: string): Promise<void> {
    await apiRequest<void>(`/api/category-requests/${id}`, {
        method: "DELETE",
    });
}
