import type {
    CatalogCategory,
    CatalogColor,
    ProductFormCatalog,
    ProductListItem,
} from "@/services/productApi";

export function buildCategoryTreeFromCatalog(
    categories: CatalogCategory[],
): Record<string, Record<string, string[]>> {
    const tree: Record<string, Record<string, string[]>> = {};
    for (const cat of categories) {
        tree[cat.name] = Object.fromEntries(cat.subcategories.map((sub) => [sub.name, []]));
    }
    return tree;
}

export function mergeProductCategoriesIntoTree(
    tree: Record<string, Record<string, string[]>>,
    products: ProductListItem[],
): Record<string, Record<string, string[]>> {
    const merged = { ...tree };
    for (const product of products) {
        const cat = product.category?.trim();
        const sub = product.subcategory?.trim();
        if (!cat) continue;
        if (!merged[cat]) merged[cat] = {};
        if (sub && !(sub in merged[cat])) merged[cat][sub] = [];
    }
    return merged;
}

export function buildCategoryList(
    catalog: ProductFormCatalog | null,
    products: ProductListItem[],
): string[] {
    const names = new Set<string>();
    catalog?.categories.forEach((c) => names.add(c.name));
    products.forEach((p) => {
        if (p.category?.trim()) names.add(p.category.trim());
    });
    return ["All", ...[...names].sort((a, b) => a.localeCompare(b))];
}

export function buildSubcategoriesMap(
    categoryTree: Record<string, Record<string, string[]>>,
): Record<string, string[]> {
    return Object.fromEntries(
        Object.entries(categoryTree).map(([cat, subs]) => [cat, ["All", ...Object.keys(subs).sort()]]),
    );
}

export function buildDotColorsFromCatalog(
    catalog: ProductFormCatalog | null,
    fallback: Record<string, string>,
): Record<string, string> {
    const colors: Record<string, string> = { ...fallback, All: fallback.All ?? "#1E2B6B" };
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
