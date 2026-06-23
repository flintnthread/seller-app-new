import type { SizeChartRecord } from "@/services/sizeChartApi";

export type SizeChartFormRow = {
    id: string;
    size: string;
    chest: string;
    waist: string;
    hip: string;
    length: string;
    sleeve: string;
};

export type SizeChartFormMeta = {
    category: string;
    categorySubName: string;
    subcategory: string;
    unit: string;
    notes?: string;
    imageUrl?: string;
};

export type SizeChartFormCache = {
    options: string[];
    rowsByName: Record<string, SizeChartFormRow[]>;
    metaByName: Record<string, SizeChartFormMeta>;
    idByName: Record<string, number>;
};

let rowCounter = 0;
export const newSizeChartRowId = () => `sz-${++rowCounter}-${Date.now()}`;

export function emptySizeChartRow(size = ""): SizeChartFormRow {
    return {
        id: newSizeChartRowId(),
        size,
        chest: "",
        waist: "",
        hip: "",
        length: "",
        sleeve: "",
    };
}

export function mapApiRowsToFormRows(rows: SizeChartRecord["rows"]): SizeChartFormRow[] {
    return rows.map((row) => ({
        id: newSizeChartRowId(),
        size: row.size ?? "",
        chest: row.chest ?? "",
        waist: row.waist ?? "",
        hip: row.hip ?? "",
        length: row.length ?? "",
        sleeve: row.sleeve ?? "",
    }));
}

export function mapFormRowsToApiRows(rows: SizeChartFormRow[]) {
    return rows
        .filter((r) => r.size.trim())
        .map((r) => ({
            size: r.size.trim(),
            chest: r.chest.trim(),
            waist: r.waist.trim(),
            hip: r.hip.trim(),
            length: r.length.trim(),
            sleeve: r.sleeve.trim(),
        }));
}

export function formatUnitLabel(unit?: string): string {
    if (!unit?.trim()) return "Centimetres (cm)";
    const lower = unit.toLowerCase();
    if (lower.includes("inch")) return "Inches (in)";
    return "Centimetres (cm)";
}

export function buildSizeChartCache(charts: SizeChartRecord[]): SizeChartFormCache {
    const options: string[] = [];
    const rowsByName: Record<string, SizeChartFormRow[]> = {};
    const metaByName: Record<string, SizeChartFormMeta> = {};
    const idByName: Record<string, number> = {};

    charts.forEach((chart) => {
        options.push(chart.name);
        idByName[chart.name] = chart.id;
        rowsByName[chart.name] = mapApiRowsToFormRows(chart.rows);
        metaByName[chart.name] = {
            category: chart.categoryName ?? "",
            categorySubName: chart.categorySubName ?? "",
            subcategory: chart.subcategoryName ?? "",
            unit: formatUnitLabel(chart.unit),
            notes: chart.notes ?? "",
            imageUrl: chart.imageUrl ?? "",
        };
    });

    return { options, rowsByName, metaByName, idByName };
}

export function mergeChartIntoCache(cache: SizeChartFormCache, chart: SizeChartRecord): SizeChartFormCache {
    const next = {
        options: cache.options.includes(chart.name)
            ? cache.options
            : [...cache.options, chart.name],
        rowsByName: { ...cache.rowsByName, [chart.name]: mapApiRowsToFormRows(chart.rows) },
        metaByName: {
            ...cache.metaByName,
            [chart.name]: {
                category: chart.categoryName ?? "",
                categorySubName: chart.categorySubName ?? "",
                subcategory: chart.subcategoryName ?? "",
                unit: formatUnitLabel(chart.unit),
                notes: chart.notes ?? "",
                imageUrl: chart.imageUrl ?? "",
            },
        },
        idByName: { ...cache.idByName, [chart.name]: chart.id },
    };
    return next;
}
