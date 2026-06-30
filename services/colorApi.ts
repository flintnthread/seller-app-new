import { apiRequest } from "@/lib/api/client";
import type { CatalogStatus, ColorRecord } from "@/components/catalog/catalogConfig";

export type ColorPayload = {
    name: string;
    hex: string;
    status: CatalogStatus;
};

type ApiColor = {
    id: number;
    name: string;
    hex: string;
    status: string;
    createdAt: string;
    owned?: boolean;
};

function toRecord(row: ApiColor): ColorRecord {
    return {
        id: String(row.id),
        name: row.name,
        hex: row.hex,
        status: row.status === "Active" ? "Active" : "Inactive",
        createdAt: row.createdAt,
        owned: row.owned === true,
    };
}

function toBody(payload: ColorPayload) {
    return {
        name: payload.name,
        hex: payload.hex,
        active: payload.status === "Active",
    };
}

export async function fetchColors(): Promise<ColorRecord[]> {
    const rows = await apiRequest<ApiColor[]>("/api/seller/colors");
    return rows.map(toRecord);
}

export async function createColor(payload: ColorPayload): Promise<ColorRecord> {
    const row = await apiRequest<ApiColor>("/api/seller/colors", {
        method: "POST",
        body: JSON.stringify(toBody(payload)),
    });
    return toRecord(row);
}

export async function updateColor(id: string, payload: ColorPayload): Promise<ColorRecord> {
    const row = await apiRequest<ApiColor>(`/api/seller/colors/${id}`, {
        method: "PUT",
        body: JSON.stringify(toBody(payload)),
    });
    return toRecord(row);
}

export async function deleteColor(id: string): Promise<void> {
    await apiRequest<void>(`/api/seller/colors/${id}`, { method: "DELETE" });
}
