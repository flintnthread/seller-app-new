export type CatalogKind = "color" | "size";
export type CatalogStatus = "Active" | "Inactive";

export type ColorRecord = {
    id: string;
    name: string;
    hex: string;
    status: CatalogStatus;
    createdAt: string;
};

export type SizeRecord = {
    id: string;
    name: string;
    code: string;
    status: CatalogStatus;
    createdAt: string;
};

export const ORANGE_BRAND = "#F28520";
export const ORANGE_BRAND_DARK = "#E07510";

export const STATUS_OPTIONS: CatalogStatus[] = ["Active", "Inactive"];

export const INITIAL_COLORS: ColorRecord[] = [
    { id: "1", name: "Royal Blue", hex: "#4169E1", status: "Active", createdAt: "12 May 2024" },
    { id: "2", name: "Crimson Red", hex: "#DC143C", status: "Active", createdAt: "10 May 2024" },
    { id: "3", name: "Forest Green", hex: "#228B22", status: "Active", createdAt: "08 May 2024" },
    { id: "4", name: "Charcoal Black", hex: "#36454F", status: "Inactive", createdAt: "05 May 2024" },
    { id: "5", name: "Sunset Orange", hex: "#FF7F50", status: "Active", createdAt: "01 May 2024" },
];

export const INITIAL_SIZES: SizeRecord[] = [
    { id: "1", name: "Extra Large", code: "XL", status: "Active", createdAt: "12 May 2024" },
    { id: "2", name: "Medium", code: "M", status: "Active", createdAt: "11 May 2024" },
    { id: "3", name: "Small", code: "S", status: "Active", createdAt: "09 May 2024" },
    { id: "4", name: "Free Size", code: "FS", status: "Active", createdAt: "07 May 2024" },
    { id: "5", name: "28", code: "28", status: "Inactive", createdAt: "03 May 2024" },
];

export type CatalogPageConfig = {
    kind: CatalogKind;
    pageTitle: string;
    pageSubtitle: string;
    addModalTitle: string;
    saveButtonLabel: string;
    entityLabel: string;
    warningEntity: string;
    nameLabel: string;
    namePlaceholder: string;
    codeLabel?: string;
    codePlaceholder?: string;
    codeHelper?: string;
    hexLabel?: string;
    hexHelper?: string;
};

export const COLOR_PAGE_CONFIG: CatalogPageConfig = {
    kind: "color",
    pageTitle: "Colors",
    pageSubtitle: "Manage product colors for your catalog. Colors cannot be edited after creation.",
    addModalTitle: "Add New Color",
    saveButtonLabel: "Save Color",
    entityLabel: "color",
    warningEntity: "color",
    nameLabel: "Color Name",
    namePlaceholder: "e.g., Royal Blue, Crimson Red",
    hexLabel: "Color Code (Hex)",
    hexHelper: "Use the color picker or enter a hex color code (e.g., #FF5733)",
};

export const SIZE_PAGE_CONFIG: CatalogPageConfig = {
    kind: "size",
    pageTitle: "Sizes",
    pageSubtitle: "Manage product sizes for your catalog. Sizes cannot be edited after creation.",
    addModalTitle: "Add New Size",
    saveButtonLabel: "Save Size",
    entityLabel: "size",
    warningEntity: "size",
    nameLabel: "Size Name",
    namePlaceholder: "e.g., Extra Large, Medium, Small",
    codeLabel: "Size Code",
    codePlaceholder: "e.g., XL, M, S",
    codeHelper: "Short code for the size (e.g., XS, S, M, L, XL, XXL)",
};

export const normalizeHex = (value: string) => {
    let v = value.trim();
    if (!v) return "";
    if (!v.startsWith("#")) v = `#${v}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toUpperCase();
    if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
        const r = v[1];
        const g = v[2];
        const b = v[3];
        return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    return v;
};

export const isValidHex = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(normalizeHex(value));
