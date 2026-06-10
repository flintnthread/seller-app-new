import { useEffect, useMemo, useState } from "react";
import {
    fetchProductFormCatalog,
    type ProductFormCatalog,
    type ProductListItem,
} from "@/services/productApi";
import {
    buildCategoryList,
    buildCategoryTreeFromCatalog,
    buildDotColorsFromCatalog,
    buildSubcategoriesMap,
    mergeProductCategoriesIntoTree,
} from "@/lib/catalog/catalogFilterOptions";

const DEFAULT_DOT_COLORS: Record<string, string> = {
    Red: "#EF4444",
    Blue: "#3B82F6",
    Green: "#22C55E",
    Black: "#1F2937",
    White: "#F9FAFB",
    Yellow: "#F59E0B",
    Pink: "#EC4899",
    Purple: "#8B5CF6",
    Orange: "#F97316",
    Gray: "#6B7280",
    Brown: "#92400E",
    All: "#1E2B6B",
};

export function useProductFilterCatalog(products: ProductListItem[]) {
    const [catalog, setCatalog] = useState<ProductFormCatalog | null>(null);
    const [catalogError, setCatalogError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchProductFormCatalog()
            .then((data) => {
                if (!cancelled) {
                    setCatalog(data);
                    setCatalogError(null);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setCatalogError(err instanceof Error ? err.message : "Failed to load catalog.");
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const categoryTree = useMemo(() => {
        const base = buildCategoryTreeFromCatalog(catalog?.categories ?? []);
        return mergeProductCategoriesIntoTree(base, products);
    }, [catalog, products]);

    const categoryList = useMemo(() => buildCategoryList(catalog, products), [catalog, products]);
    const subcategoriesMap = useMemo(() => buildSubcategoriesMap(categoryTree), [categoryTree]);
    const dotColorMap = useMemo(
        () => buildDotColorsFromCatalog(catalog, DEFAULT_DOT_COLORS),
        [catalog],
    );

    return {
        catalog,
        catalogError,
        categoryList,
        categoryTree,
        subcategoriesMap,
        dotColorMap,
        catalogLoading: catalog === null && catalogError === null,
    };
}
