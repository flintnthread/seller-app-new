import type {
    CatalogCategory,
    CatalogColor,
    CatalogSize,
    ProductFormCatalog,
    ProductListItem,
} from "@/services/productApi";

const DEFAULT_PRICE_MIN = 0;
const DEFAULT_PRICE_MAX = 5000;

/** Main → middle category → leaf subcategory names from `/api/catalog/product-form`. */
export function buildCategoryTreeFromCatalog(
    categories: CatalogCategory[],
): Record<string, Record<string, string[]>> {
    const tree: Record<string, Record<string, string[]>> = {};
    for (const cat of categories) {
        tree[cat.name] = Object.fromEntries(
            cat.subcategories.map((sub) => [
                sub.name,
                (sub.children ?? []).map((leaf) => leaf.name).sort((a, b) => a.localeCompare(b)),
            ]),
        );
    }
    return tree;
}

export function buildCategoryListFromCatalog(catalog: ProductFormCatalog | null): string[] {
    if (!catalog?.categories?.length) return ["All"];
    const names = catalog.categories
        .map((c) => c.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    return ["All", ...names];
}

export function buildColorFilterOptions(catalog: ProductFormCatalog | null): string[] {
    if (!catalog?.colors?.length) return ["All"];
    const names = catalog.colors
        .map((c) => c.name?.trim())
        .filter((name): name is string => Boolean(name))
        .sort((a, b) => a.localeCompare(b));
    return ["All", ...names];
}

export function buildSizeFilterOptions(catalog: ProductFormCatalog | null): string[] {
    if (!catalog?.sizes?.length) return ["All"];
    const names = catalog.sizes
        .map((s) => s.name?.trim())
        .filter((name): name is string => Boolean(name))
        .sort((a, b) => a.localeCompare(b));
    return ["All", ...names];
}

export function catalogPriceBounds(catalog: ProductFormCatalog | null): { min: number; max: number } {
    const min = Number(catalog?.priceMin ?? DEFAULT_PRICE_MIN);
    const max = Number(catalog?.priceMax ?? DEFAULT_PRICE_MAX);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
        return { min: DEFAULT_PRICE_MIN, max: DEFAULT_PRICE_MAX };
    }
    return { min, max: Math.max(max, min) };
}

export function middleCategoriesForMain(
    categoryTree: Record<string, Record<string, string[]>>,
    mainCategory: string,
): string[] {
    return Object.keys(categoryTree[mainCategory] ?? {}).sort((a, b) => a.localeCompare(b));
}

export function leafSubcategoriesForMiddle(
    categoryTree: Record<string, Record<string, string[]>>,
    mainCategory: string,
    middleCategory: string,
): string[] {
    return [...(categoryTree[mainCategory]?.[middleCategory] ?? [])].sort((a, b) =>
        a.localeCompare(b),
    );
}

export function productMatchesCategoryFilter(
    product: ProductListItem,
    category: string,
    subcategory: string,
    categoryTree: Record<string, Record<string, string[]>>,
): boolean {
    if (category !== "All" && product.category !== category) return false;
    if (subcategory === "All") return true;

    const prodMiddle = product.categorySub?.trim() ?? "";
    const prodLeaf = product.subSubcategory?.trim() ?? "";
    const prodSub = product.subcategory?.trim() ?? "";

    if (
        prodSub === subcategory ||
        prodMiddle === subcategory ||
        prodLeaf === subcategory
    ) {
        return true;
    }

    const treeForMain = categoryTree[product.category ?? ""];
    if (!treeForMain) return false;

    const leavesForMiddle = treeForMain[subcategory];
    if (leavesForMiddle?.length) {
        if (prodLeaf && leavesForMiddle.includes(prodLeaf)) return true;
        if (prodSub && leavesForMiddle.includes(prodSub)) return true;
    }

    for (const [middle, leaves] of Object.entries(treeForMain)) {
        if (subcategory === middle && (prodMiddle === middle || prodSub === middle)) {
            return true;
        }
        if (leaves.includes(subcategory)) {
            if (prodLeaf === subcategory || prodSub === subcategory) return true;
        }
    }

    return false;
}

export function buildSubcategoriesMap(
    categoryTree: Record<string, Record<string, string[]>>,
): Record<string, string[]> {
    return Object.fromEntries(
        Object.entries(categoryTree).map(([cat, subs]) => [cat, ["All", ...Object.keys(subs).sort()]]),
    );
}

export function buildDotColorsFromCatalog(catalog: ProductFormCatalog | null): Record<string, string> {
    const colors: Record<string, string> = { All: "#1E2B6B" };
    catalog?.colors.forEach((c: CatalogColor) => {
        if (c.name && c.hex) colors[c.name] = c.hex;
    });
    return colors;
}

export function subcategoriesMapFromCatalog(
    catalog: ProductFormCatalog | null,
): Record<string, string[]> {
    if (!catalog) return {};
    const tree = buildCategoryTreeFromCatalog(catalog.categories);
    return buildSubcategoriesMap(tree);
}

export function allChartSubcategoriesFromCatalog(catalog: ProductFormCatalog | null): string[] {
    if (!catalog) return [];
    return Array.from(
        new Set(catalog.categories.flatMap((c) => c.subcategories.map((s) => s.name))),
    ).sort();
}
