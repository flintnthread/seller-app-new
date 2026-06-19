import type { CategoryTreeFallback } from "@/lib/product/categoryTreeFallback";
import { uniquePickerOptions } from "@/lib/product/uniquePickerOptions";
import type { ProductFormCatalog } from "@/services/productApi";

export function buildCategoryPathOptions(
    catalog: ProductFormCatalog | null | undefined,
    fallbackTree?: CategoryTreeFallback
): string[] {
    const paths: string[] = [];
    if (catalog?.categories?.length) {
        for (const cat of catalog.categories) {
            for (const sub of cat.subcategories ?? []) {
                paths.push(`${cat.name} > ${sub.name}`);
            }
        }
    } else if (fallbackTree) {
        for (const [main, mids] of Object.entries(fallbackTree)) {
            for (const mid of Object.keys(mids)) {
                paths.push(`${main} > ${mid}`);
            }
        }
    }
    return uniquePickerOptions(paths);
}

export function parseCategoryPath(label: string): { category: string; categorySub: string } {
    const idx = label.indexOf(" > ");
    if (idx === -1) {
        return { category: label.trim(), categorySub: "" };
    }
    return {
        category: label.slice(0, idx).trim(),
        categorySub: label.slice(idx + 3).trim(),
    };
}

/** Display path: Main Category > Category (middle level from subcategories table). */
export function formatCategoryPath(category: string, categorySub: string): string {
    if (!category?.trim()) return "";
    if (!categorySub?.trim()) return category.trim();
    return `${category.trim()} > ${categorySub.trim()}`;
}

export function resolveCategoryPathSelection(
    label: string,
    catalog: ProductFormCatalog | null | undefined
): {
    category: string;
    categoryId: number | null;
    categorySubId: number | null;
    categorySubName: string;
} {
    const { category, categorySub } = parseCategoryPath(label);
    const cat = catalog?.categories?.find((c) => c.name === category);
    const sub = cat?.subcategories?.find((s) => s.name === categorySub);
    return {
        category,
        categoryId: cat?.id ?? null,
        categorySubId: sub?.id ?? null,
        categorySubName: categorySub,
    };
}

/** Leaf sub-types for the second dropdown (e.g. Sling Bags under Accessories > Bags). */
export function buildLeafSubcategoryOptions(
    catalog: ProductFormCatalog | null | undefined,
    mainCategoryName: string,
    categorySubName: string,
    fallbackTree?: CategoryTreeFallback
): string[] {
    if (!mainCategoryName?.trim() || !categorySubName?.trim()) return [];
    const cat = catalog?.categories?.find((c) => c.name === mainCategoryName);
    const sub = cat?.subcategories?.find((s) => s.name === categorySubName);
    const children = sub?.children ?? [];
    if (children.length > 0) {
        return uniquePickerOptions(children.map((c) => c.name));
    }
    const fallbackLeaves = fallbackTree?.[mainCategoryName]?.[categorySubName];
    if (fallbackLeaves?.length) {
        return uniquePickerOptions(fallbackLeaves);
    }
    return [];
}

export function resolveLeafSubcategorySelection(
    mainCategoryName: string,
    categorySubName: string,
    leafName: string,
    catalog: ProductFormCatalog | null | undefined
): { subcategory: string; subcategoryId: number | null } {
    const cat = catalog?.categories?.find((c) => c.name === mainCategoryName);
    const sub = cat?.subcategories?.find((s) => s.name === categorySubName);
    const leaf = sub?.children?.find((c) => c.name === leafName);
    if (leaf && sub) {
        return { subcategory: leafName, subcategoryId: sub.id };
    }
    if (sub && sub.name === leafName) {
        return { subcategory: leafName, subcategoryId: sub.id };
    }
    return { subcategory: leafName, subcategoryId: null };
}

export function findCategorySubForProductSub(
    catalog: ProductFormCatalog | null | undefined,
    mainCategoryName: string,
    productSubcategoryId: number | null | undefined,
    productSubcategoryName: string
): { categorySubId: number | null; categorySubName: string } {
    const cat = catalog?.categories?.find((c) => c.name === mainCategoryName);
    if (!cat) {
        return { categorySubId: null, categorySubName: productSubcategoryName };
    }
    for (const sub of cat.subcategories ?? []) {
        if (sub.id === productSubcategoryId) {
            return { categorySubId: sub.id, categorySubName: sub.name };
        }
        const child = sub.children?.find((c) => c.id === productSubcategoryId);
        if (child) {
            return { categorySubId: sub.id, categorySubName: sub.name };
        }
        if (sub.name === productSubcategoryName) {
            return { categorySubId: sub.id, categorySubName: sub.name };
        }
        const childByName = sub.children?.find((c) => c.name === productSubcategoryName);
        if (childByName) {
            return { categorySubId: sub.id, categorySubName: sub.name };
        }
    }
    return { categorySubId: null, categorySubName: productSubcategoryName };
}
