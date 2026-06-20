import type { ProductListItem } from "@/services/productApi";

export function productMatchesSearch(product: ProductListItem, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        (product.categorySub?.toLowerCase().includes(q) ?? false) ||
        (product.subcategory?.toLowerCase().includes(q) ?? false) ||
        (product.subSubcategory?.toLowerCase().includes(q) ?? false) ||
        (product.color?.toLowerCase().includes(q) ?? false) ||
        (product.size?.toLowerCase().includes(q) ?? false)
    );
}

export function uniqueProductColors(products: ProductListItem[]): string[] {
    return [...new Set(products.map((p) => p.color).filter((c) => c && c.trim()))].sort();
}

export function uniqueProductSizes(products: ProductListItem[]): string[] {
    return [...new Set(products.map((p) => p.size).filter((s) => s && s.trim()))].sort();
}

export function computeProductPriceMax(products: ProductListItem[], floor = 5000): number {
    if (products.length === 0) return floor;
    const maxPrice = Math.max(...products.map((p) => p.price), 0);
    return Math.max(floor, Math.ceil(maxPrice / 100) * 100);
}
