import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
    fetchProductFormCatalog,
    type ProductFormCatalog,
} from "@/services/productApi";
import {
    buildCategoryListFromCatalog,
    buildCategoryTreeFromCatalog,
    buildColorFilterOptions,
    buildDotColorsFromCatalog,
    buildSizeFilterOptions,
    buildSubcategoriesMap,
    catalogPriceBounds,
} from "@/lib/catalog/catalogFilterOptions";

/** Loads product-management filter options from `/api/catalog/product-form` (database only). */
export function useProductFilterCatalog() {
    const [catalog, setCatalog] = useState<ProductFormCatalog | null>(null);
    const [catalogError, setCatalogError] = useState<string | null>(null);

    const reloadCatalog = useCallback(() => {
        fetchProductFormCatalog()
            .then((data) => {
                setCatalog(data);
                setCatalogError(null);
            })
            .catch((err: unknown) => {
                setCatalogError(err instanceof Error ? err.message : "Failed to load filters from server.");
            });
    }, []);

    useEffect(() => {
        reloadCatalog();
    }, [reloadCatalog]);

    useFocusEffect(
        useCallback(() => {
            reloadCatalog();
        }, [reloadCatalog]),
    );

    const categoryTree = useMemo(
        () => buildCategoryTreeFromCatalog(catalog?.categories ?? []),
        [catalog],
    );

    const categoryList = useMemo(() => buildCategoryListFromCatalog(catalog), [catalog]);
    const colorFilterOptions = useMemo(() => buildColorFilterOptions(catalog), [catalog]);
    const sizeFilterOptions = useMemo(() => buildSizeFilterOptions(catalog), [catalog]);
    const subcategoriesMap = useMemo(() => buildSubcategoriesMap(categoryTree), [categoryTree]);
    const dotColorMap = useMemo(() => buildDotColorsFromCatalog(catalog), [catalog]);
    const { min: priceMin, max: priceMax } = useMemo(() => catalogPriceBounds(catalog), [catalog]);

    return {
        catalog,
        catalogError,
        categoryList,
        categoryTree,
        subcategoriesMap,
        colorFilterOptions,
        sizeFilterOptions,
        dotColorMap,
        priceMin,
        priceMax,
        catalogLoading: catalog === null && catalogError === null,
        reloadCatalog,
    };
}
