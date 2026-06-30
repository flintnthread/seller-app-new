import { apiRequest } from "@/lib/api/client";
import type { CatalogStatus, SizeRecord } from "@/components/catalog/catalogConfig";

export type SizePayload = {
    name: string;
    code: string;
    status: CatalogStatus;
};

type ApiSize = {
    id: number;
    name: string;
    code: string;
    status: string;
    createdAt: string;
    owned?: boolean;
};

function toRecord(row: ApiSize): SizeRecord {
    return {
        id: String(row.id),
        name: row.name,
        code: row.code,
        status: row.status === "Active" ? "Active" : "Inactive",
        createdAt: row.createdAt,
        owned: row.owned === true,
    };
}

function toBody(payload: SizePayload) {
    return {
        name: payload.name,
        code: payload.code,
        active: payload.status === "Active",
    };
}

export async function fetchSizes(): Promise<SizeRecord[]> {
    const rows = await apiRequest<ApiSize[]>("/api/seller/sizes");
    return rows.map(toRecord);
}

export async function createSize(payload: SizePayload): Promise<SizeRecord> {
    const row = await apiRequest<ApiSize>("/api/seller/sizes", {
        method: "POST",
        body: JSON.stringify(toBody(payload)),
    });
    return toRecord(row);
}

export async function updateSize(id: string, payload: SizePayload): Promise<SizeRecord> {
    const row = await apiRequest<ApiSize>(`/api/seller/sizes/${id}`, {
        method: "PUT",
        body: JSON.stringify(toBody(payload)),
    });
    return toRecord(row);
}

export async function deleteSize(id: string): Promise<void> {
    await apiRequest<void>(`/api/seller/sizes/${id}`, { method: "DELETE" });
}
