import type { ProductFormCatalog } from "@/services/productApi";

export type CatalogMaterialOption = {
    material: string;
    hsnCode: string;
    gst: number;
};

export function materialsForProductSubcategory(
    catalog: ProductFormCatalog | null | undefined,
    mainCategoryName: string,
    categorySubName: string,
    leafSubcategoryName: string,
): CatalogMaterialOption[] {
    if (!mainCategoryName?.trim() || !categorySubName?.trim()) return [];

    const cat = catalog?.categories?.find((c) => c.name === mainCategoryName);
    const sub = cat?.subcategories?.find((s) => s.name === categorySubName);
    if (!sub) return [];

    const children = sub.children ?? [];
    if (!leafSubcategoryName?.trim()) {
        return normalizeMaterials(sub.materials);
    }
    if (children.length === 0) {
        return normalizeMaterials(sub.materials);
    }

    const leaf = children.find((c) => c.name === leafSubcategoryName);
    if (leaf?.materials?.length) {
        return normalizeMaterials(leaf.materials);
    }
    return normalizeMaterials(sub.materials);
}

export function resolveMaterialOption(
    materials: CatalogMaterialOption[],
    materialName: string,
): CatalogMaterialOption | undefined {
    const key = materialName?.trim().toLowerCase();
    if (!key) return undefined;
    return materials.find((m) => m.material.trim().toLowerCase() === key);
}

export function resolveGstForMaterial(
    materials: CatalogMaterialOption[],
    materialName: string,
    fallbackGst?: number | null,
): number | null {
    const option = resolveMaterialOption(materials, materialName);
    if (option?.gst != null && Number.isFinite(option.gst)) {
        return option.gst;
    }
    if (fallbackGst != null && Number.isFinite(fallbackGst)) {
        return fallbackGst;
    }
    return null;
}

function normalizeMaterials(
    raw?: { material: string; hsnCode?: string; gst?: number }[] | null,
): CatalogMaterialOption[] {
    if (!raw?.length) return [];
    return raw
        .map((m) => ({
            material: String(m.material ?? "").trim(),
            hsnCode: String(m.hsnCode ?? "").trim(),
            gst: typeof m.gst === "number" && Number.isFinite(m.gst) ? m.gst : 0,
        }))
        .filter((m) => m.material.length > 0);
}
