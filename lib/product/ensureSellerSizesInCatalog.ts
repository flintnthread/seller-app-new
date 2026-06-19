import { createSize } from "@/services/sizeApi";

export type CatalogSize = { id?: number; name: string; code: string };

export function deriveSizeCode(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return "";

    const compact = trimmed.replace(/[^a-zA-Z0-9]/g, "");
    if (compact.length > 0 && compact.length <= 6) {
        return compact.toUpperCase();
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
        const initials = words.map((w) => w[0]).join("").toUpperCase();
        if (initials.length >= 2) return initials.slice(0, 6);
    }

    return compact.slice(0, 6).toUpperCase() || trimmed.slice(0, 6).toUpperCase();
}

export function formatSizeOption(size: CatalogSize): string {
    return size.name === size.code ? size.name : `${size.name} (${size.code})`;
}

export function resolveSizeNameFromLabel(val: string, sizes: CatalogSize[]): string {
    const match = sizes.find(
        (s) => s.name === val || formatSizeOption(s) === val || s.code === val
    );
    return match?.name ?? val;
}

function isKnownSize(name: string, sizes: CatalogSize[]): boolean {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return true;
    return sizes.some(
        (s) =>
            s.name.toLowerCase() === normalized ||
            s.code.toLowerCase() === normalized
    );
}

/** Creates missing sizes in the seller catalog (seller_id scoped on the API). */
export async function ensureSellerSizesInCatalog(
    sizeNames: string[],
    existingSizes: CatalogSize[]
): Promise<void> {
    const knownNames = new Set(existingSizes.map((s) => s.name.toLowerCase()));
    const knownCodes = new Set(existingSizes.map((s) => s.code.toLowerCase()));

    for (const raw of sizeNames) {
        const name = raw.trim();
        if (!name || isKnownSize(name, existingSizes) || knownNames.has(name.toLowerCase())) {
            continue;
        }

        let code = deriveSizeCode(name);
        if (!code) code = name.slice(0, 6).toUpperCase();

        let attempt = 0;
        while (knownCodes.has(code.toLowerCase()) && attempt < 20) {
            attempt += 1;
            code = `${deriveSizeCode(name)}${attempt}`;
        }

        try {
            await createSize({ name, code, status: "Active" });
            knownNames.add(name.toLowerCase());
            knownCodes.add(code.toLowerCase());
        } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (!msg.toLowerCase().includes("already exists")) {
                throw e;
            }
        }
    }
}
