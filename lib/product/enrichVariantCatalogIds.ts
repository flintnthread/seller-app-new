import type { ProductFormCatalog } from "@/services/productApi";

type VariantLike = {
    color?: string;
    colorId?: number;
    size?: string;
    sizeId?: number;
};

export function resolveSizeIdFromCatalog(
    sizeLabel: string | undefined,
    catalog: ProductFormCatalog | null | undefined,
): number | undefined {
    if (!sizeLabel?.trim()) return undefined;
    const label = sizeLabel.trim();
    const sizes = catalog?.sizes ?? [];

    const byLabel = sizes.find(
        (s) =>
            s.name === label ||
            s.code === label ||
            `${s.name} (${s.code})` === label ||
            s.name?.toLowerCase() === label.toLowerCase() ||
            s.code?.toLowerCase() === label.toLowerCase(),
    );
    if (byLabel?.id != null) return byLabel.id;

    const parenIdx = label.indexOf(" (");
    if (parenIdx > 0) {
        const shortLabel = label.slice(0, parenIdx).trim();
        const byShort = sizes.find(
            (s) => s.name === shortLabel || s.code === shortLabel,
        );
        if (byShort?.id != null) return byShort.id;
    }

    if (/^\d+$/.test(label)) {
        const id = Number(label);
        const byId = sizes.find((s) => s.id === id);
        if (byId?.id != null) return byId.id;
        return id;
    }

    return undefined;
}

export function resolveColorIdFromCatalog(
    colorName: string | undefined,
    catalog: ProductFormCatalog | null | undefined,
): number | undefined {
    if (!colorName?.trim()) return undefined;
    const label = colorName.trim();
    const found = catalog?.colors?.find(
        (c) => c.name === label || c.name?.toLowerCase() === label.toLowerCase(),
    );
    return found?.id;
}

export function enrichVariantsWithCatalogIds<T extends VariantLike>(
    variants: T[],
    catalog: ProductFormCatalog | null | undefined,
): T[] {
    return variants.map((variant) => {
        const sizeId = variant.sizeId ?? resolveSizeIdFromCatalog(variant.size, catalog);
        const colorId = variant.colorId ?? resolveColorIdFromCatalog(variant.color, catalog);
        return {
            ...variant,
            ...(sizeId != null ? { sizeId } : {}),
            ...(colorId != null ? { colorId } : {}),
        };
    });
}
