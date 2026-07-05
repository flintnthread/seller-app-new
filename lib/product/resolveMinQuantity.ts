/** Resolve minimum order quantity from display variant, product summary, or any variant. */
export function resolveMinQuantity(
    variants: Array<{ minQuantity?: number | null }>,
    displayVariant: { minQuantity?: number | null } | null,
    productMinQuantity?: number | null,
): number | null {
    if (displayVariant?.minQuantity != null && displayVariant.minQuantity > 0) {
        return displayVariant.minQuantity;
    }
    if (productMinQuantity != null && productMinQuantity > 0) {
        return productMinQuantity;
    }
    for (const variant of variants) {
        if (variant.minQuantity != null && variant.minQuantity > 0) {
            return variant.minQuantity;
        }
    }
    return null;
}
