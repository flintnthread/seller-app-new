import { apiRequest } from "@/lib/api/client";
import { uriToImageSource } from "@/lib/media/imagePayload";

export type SizeChartApiRow = {
    size: string;
    chest: string;
    waist: string;
    hip: string;
    length: string;
    sleeve: string;
};

export type SizeChartRecord = {
    id: number;
    name: string;
    categoryId?: number;
    subcategoryId?: number;
    categoryName?: string;
    categorySubName?: string;
    subcategoryName?: string;
    unit?: string;
    notes?: string;
    imageUrl?: string;
    rows: SizeChartApiRow[];
};

export type SaveSizeChartInput = {
    name: string;
    categoryId?: number | null;
    subcategoryId?: number | null;
    categoryName?: string;
    categorySubName?: string;
    subcategoryName?: string;
    unit?: string;
    notes?: string;
    imageUri?: string | null;
    rows: SizeChartApiRow[];
};

type ApiSizeChart = {
    id: number;
    name: string;
    categoryId?: number;
    subcategoryId?: number;
    categoryName?: string;
    categorySubName?: string;
    subcategoryName?: string;
    unit?: string;
    notes?: string;
    imageUrl?: string;
    rows?: SizeChartApiRow[];
};

function toRecord(row: ApiSizeChart): SizeChartRecord {
    return {
        id: row.id,
        name: row.name,
        categoryId: row.categoryId,
        subcategoryId: row.subcategoryId,
        categoryName: row.categoryName,
        categorySubName: row.categorySubName,
        subcategoryName: row.subcategoryName,
        unit: row.unit,
        notes: row.notes,
        imageUrl: row.imageUrl,
        rows: (row.rows ?? []).map((r) => ({
            size: r.size ?? "",
            chest: r.chest ?? "",
            waist: r.waist ?? "",
            hip: r.hip ?? "",
            length: r.length ?? "",
            sleeve: r.sleeve ?? "",
        })),
    };
}

async function buildBody(input: SaveSizeChartInput) {
    const body: Record<string, unknown> = {
        name: input.name.trim(),
        categoryId: input.categoryId ?? undefined,
        subcategoryId: input.subcategoryId ?? undefined,
        categoryName: input.categoryName?.trim() || undefined,
        categorySubName: input.categorySubName?.trim() || undefined,
        subcategoryName: input.subcategoryName?.trim() || undefined,
        unit: input.unit?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        rows: input.rows
            .filter((r) => r.size.trim())
            .map((r) => ({
                size: r.size.trim(),
                chest: r.chest?.trim() ?? "",
                waist: r.waist?.trim() ?? "",
                hip: r.hip?.trim() ?? "",
                length: r.length?.trim() ?? "",
                sleeve: r.sleeve?.trim() ?? "",
            })),
    };
    if (input.imageUri?.trim()) {
        body.imageSource = await uriToImageSource(input.imageUri);
    }
    return body;
}

export async function fetchSizeCharts(): Promise<SizeChartRecord[]> {
    const rows = await apiRequest<ApiSizeChart[]>("/api/size-charts");
    return rows.map(toRecord);
}

export async function fetchSizeChart(id: number): Promise<SizeChartRecord> {
    const row = await apiRequest<ApiSizeChart>(`/api/size-charts/${id}`);
    return toRecord(row);
}

export async function createSizeChart(input: SaveSizeChartInput): Promise<SizeChartRecord> {
    const row = await apiRequest<ApiSizeChart>("/api/size-charts", {
        method: "POST",
        body: JSON.stringify(await buildBody(input)),
    });
    return toRecord(row);
}

export async function updateSizeChart(id: number, input: SaveSizeChartInput): Promise<SizeChartRecord> {
    const row = await apiRequest<ApiSizeChart>(`/api/size-charts/${id}`, {
        method: "PUT",
        body: JSON.stringify(await buildBody(input)),
    });
    return toRecord(row);
}
