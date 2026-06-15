function token(text: string, maxLen: number): string {
    const clean = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!clean) return "X".repeat(Math.min(maxLen, 1));
    return clean.slice(0, maxLen);
}

function productPrefix(productName: string): string {
    const words = productName.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
        return `${token(words[0], 3)}-${token(words[words.length - 1], 3)}`;
    }
    if (words.length === 1) {
        return token(words[0], 6);
    }
    return "PRD";
}

/** Builds a variant SKU like FNT-TEE-BLU-M-001 from product name, color, and size. */
export function generateVariantSku(
    productName: string,
    color: string,
    size: string,
    variantIndex: number,
    sizeCode?: string,
): string {
    const namePart = productPrefix(productName);
    const colorPart = token(color, 3);
    const sizePart = token(sizeCode || size, 3);
    const seq = String(Math.max(1, variantIndex)).padStart(3, "0");
    return `${namePart}-${colorPart}-${sizePart}-${seq}`;
}
