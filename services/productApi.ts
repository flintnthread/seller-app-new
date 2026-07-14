import { Platform } from "react-native";
import { apiRequest } from "@/lib/api/client";
import { resolveMediaUrl, resolveMediaUrls } from "@/lib/media/resolveMediaUrl";
import { pickMinimumPriceVariant, resolveVariantMetroTotal } from "@/lib/product/pickDisplayVariant";

export type ProductListItem = {
    id: string;
    name: string;
    sku: string;
    price: number;
    mrpInclGst?: number;
    image: string;
    status: string;
    stock: number;
    updated: string;
    category: string;
    /** Middle-level category from database hierarchy. */
    categorySub?: string;
    subcategory: string;
    subSubcategory?: string;
    color: string;
    size: string;
    /** Minimum order quantity from the lowest-price variant. */
    minQuantity?: number;
    description?: string;
    material?: string;
    weight?: string;
    dimensions?: string;
    returnPolicy?: string;
    warranty?: string;
};

export type ProductDetailSpec = { label: string; value: string };
export type ProductDetailDeliveryCharge = { zone: string; standard: string; express: string };

/** Full product_variants row + UI aliases from GET /api/seller/products/{id} */
export type ProductDetailVariant = {
    id: string;
    productId: string;
    color: string;
    colorHex: string;
    colorId?: number;
    size: string;
    sizeId?: number;
    sku: string;
    stock: number;
    minQuantity?: number;
    basePrice: number;
    mrpExclGst: number;
    mrpPrice: number;
    discountPercentage: number;
    discountAmount: number;
    sellingPrice: number;
    taxPercentage: number;
    taxAmount: number;
    finalPrice: number;
    mrpInclGst: number;
    intraCityDeliveryCharge: number;
    metroMetroDeliveryCharge: number;
    totalPriceIntraCity: number;
    totalPriceMetroMetro: number;
    commissionPercentage: number;
    commissionAmount: number;
    videoPath: string;
    weight: number;
    createdAt: string;
    updatedAt: string;
    mrp: number;
    discount: number;
    sellingPriceExGst: number;
    gstPercent: number;
    gstAmount: number;
    sellingPriceWithGst: number;
    commissionPercent: number;
    intraCityDelivery: number;
    metroMetroDelivery: number;
    totalIntraCity: number;
    totalMetroMetro: number;
    imageUri?: string;
    videoUri?: string;
};

export type ProductDetailSizeChartRow = {
    size: string;
    chest: string;
    waist: string;
    hip: string;
    length: string;
    sleeve?: string;
};

export type ProductDetail = {
    id: string;
    categoryId: number;
    subcategoryId: number;
    sizeChartId?: number;
    sizeChartName?: string;
    sizeChartImage?: string;
    name: string;
    sku: string;
    price: number;
    mrp: number;
    mrpExclGst: number;
    mrpInclGst: number;
    sellingPriceExGst: number;
    discount: number;
    images: string[];
    status: string;
    rawStatus: string;
    stock: number;
    minQuantity?: number;
    updated: string;
    category: string;
    categorySub?: string;
    subcategory: string;
    color: string;
    size: string;
    hsnCode: string;
    gst: string;
    createdAt: string;
    approvedAt: string;
    shortDescription: string;
    description: string;
    material: string;
    weight: string;
    dimensions: string;
    returnPolicy: string;
    warranty: string;
    careInstructions: string;
    adminNotes: string;
    deliveryTimeMin?: number;
    deliveryTimeMax?: number;
    intraCityCharge: number;
    metroMetroCharge: number;
    acceptCod: boolean;
    fragile: boolean;
    customized?: boolean;
    customTitle?: string;
    customInstructions?: string;
    customLeadDays?: string;
    customCharge?: string;
    customAllowPhoto?: boolean;
    customImageLabel?: string;
    customAllowText?: boolean;
    customTextLabel?: string;
    specifications: ProductDetailSpec[];
    features: string[];
    delivery: {
        estimated: string;
        freeAbove: string;
        expressAvailable: boolean;
        expressCharge: string;
        cod: boolean;
        codCharge: string;
        locations: string;
    };
    packaging: {
        boxDimensions: string;
        grossWeight: string;
        packagingType: string;
        fragile: boolean;
    };
    deliveryCharges: ProductDetailDeliveryCharge[];
    returnDetails: {
        window: string;
        conditions: string[];
        process: string;
        refundMode: string;
    };
    variants: ProductDetailVariant[];
    sizeChart: ProductDetailSizeChartRow[];
};

type ApiProductListVariant = {
    id?: number;
    sku?: string;
    color?: string;
    size?: string;
    stock?: number;
    minQuantity?: number;
    finalPrice?: number;
    sellingPrice?: number;
    metroMetroDeliveryCharge?: number;
    commissionAmount?: number;
    commissionPercent?: number;
    totalPriceMetroMetro?: number;
};

type ApiProductListItem = {
    id: number;
    name: string;
    sku?: string;
    price?: number;
    mrpInclGst?: number;
    image?: string;
    status?: string;
    stock?: number;
    updated?: string;
    category?: string;
    categorySub?: string;
    subcategory?: string;
    color?: string;
    size?: string;
    minQuantity?: number;
    description?: string;
    material?: string;
    weight?: string;
    dimensions?: string;
    returnPolicy?: string;
    warranty?: string;
    variants?: ApiProductListVariant[];
};

type ApiProductVariant = {
    id: number;
    productId?: number;
    color?: string;
    colorHex?: string;
    colorId?: number;
    size?: string;
    sizeId?: number;
    sku?: string;
    stock?: number;
    minQuantity?: number;
    basePrice?: number;
    mrpExclGst?: number;
    mrpPrice?: number;
    discountPercentage?: number;
    discountAmount?: number;
    sellingPrice?: number;
    taxPercentage?: number;
    taxAmount?: number;
    finalPrice?: number;
    mrpInclGst?: number;
    intraCityDeliveryCharge?: number;
    metroMetroDeliveryCharge?: number;
    totalPriceIntraCity?: number;
    totalPriceMetroMetro?: number;
    commissionPercentage?: number;
    commissionAmount?: number;
    videoPath?: string;
    weight?: number;
    createdAt?: string;
    updatedAt?: string;
    mrp?: number;
    discount?: number;
    sellingPriceExGst?: number;
    gstPercent?: number;
    gstAmount?: number;
    sellingPriceWithGst?: number;
    commissionPercent?: number;
    commissionAmount?: number;
    intraCityDelivery?: number;
    metroMetroDelivery?: number;
    totalIntraCity?: number;
    totalMetroMetro?: number;
    imageUri?: string;
    videoUri?: string;
};

type ApiProductDetail = {
    id: number;
    categoryId?: number;
    subcategoryId?: number;
    sizeChartId?: number;
    sizeChartName?: string;
    sizeChartImage?: string;
    name: string;
    sku?: string;
    price?: number;
    mrp?: number;
    mrpExclGst?: number;
    mrpInclGst?: number;
    sellingPriceExGst?: number;
    discount?: number;
    images?: string[];
    status?: string;
    rawStatus?: string;
    stock?: number;
    minQuantity?: number;
    updated?: string;
    category?: string;
    categorySub?: string;
    subcategory?: string;
    color?: string;
    size?: string;
    hsnCode?: string;
    gst?: string;
    createdAt?: string;
    approvedAt?: string;
    shortDescription?: string;
    description?: string;
    material?: string;
    weight?: string;
    dimensions?: string;
    returnPolicy?: string;
    warranty?: string;
    careInstructions?: string;
    adminNotes?: string;
    deliveryTimeMin?: number;
    deliveryTimeMax?: number;
    intraCityCharge?: number;
    metroMetroCharge?: number;
    acceptCod?: boolean;
    fragile?: boolean;
    customized?: boolean;
    customTitle?: string;
    customInstructions?: string;
    customLeadDays?: string;
    customCharge?: string;
    customAllowPhoto?: boolean;
    customImageLabel?: string;
    customAllowText?: boolean;
    customTextLabel?: string;
    specifications?: ProductDetailSpec[];
    features?: string[];
    delivery?: ProductDetail["delivery"];
    packaging?: ProductDetail["packaging"];
    deliveryCharges?: ProductDetailDeliveryCharge[];
    returnDetails?: ProductDetail["returnDetails"];
    variants?: ApiProductVariant[];
    sizeChart?: ProductDetailSizeChartRow[];
};

function pickMinimumPriceListVariant(variants: ApiProductListVariant[]): ApiProductListVariant | null {
    return pickMinimumPriceVariant(variants, resolveVariantMetroTotal);
}

function resolveListItemDisplayVariant(row: ApiProductListItem): ApiProductListVariant | null {
    const variants = row.variants ?? [];
    if (variants.length) return pickMinimumPriceListVariant(variants);
    return null;
}

function resolveListItemPrice(row: ApiProductListItem): number {
    const apiPrice = num(row.price);
    const display = resolveListItemDisplayVariant(row);
    if (!display) return apiPrice;

    const metroTotal = resolveVariantMetroTotal(display);
    return metroTotal > 0 ? metroTotal : apiPrice;
}

function resolveListItemSku(row: ApiProductListItem): string {
    const display = resolveListItemDisplayVariant(row);
    if (display?.sku?.trim()) return display.sku.trim();
    return row.sku?.trim() ?? "";
}

function toListItem(row: ApiProductListItem): ProductListItem {
    const categorySub = row.categorySub?.trim() || undefined;
    const subcategory = row.subcategory ?? "";
    const leaf =
        categorySub && subcategory && categorySub !== subcategory ? subcategory : undefined;
    const display = resolveListItemDisplayVariant(row);
    const minQuantity =
        display?.minQuantity != null && display.minQuantity > 0
            ? display.minQuantity
            : row.minQuantity != null && row.minQuantity > 0
              ? row.minQuantity
              : undefined;
    return {
        id: String(row.id),
        name: row.name ?? "",
        sku: resolveListItemSku(row),
        price: resolveListItemPrice(row),
        mrpInclGst: row.mrpInclGst != null ? Number(row.mrpInclGst) : undefined,
        image: resolveMediaUrl(row.image ?? "") ?? "",
        status: row.status ?? "Inactive",
        stock: Number(row.stock ?? 0),
        updated: row.updated ?? "",
        category: row.category ?? "Uncategorized",
        categorySub,
        subcategory,
        subSubcategory: leaf,
        color: display?.color?.trim() || row.color || "",
        size: display?.size?.trim() || row.size || "",
        ...(minQuantity != null ? { minQuantity } : {}),
        description: row.description,
        material: row.material,
        weight: row.weight,
        dimensions: row.dimensions,
        returnPolicy: row.returnPolicy,
        warranty: row.warranty,
    };
}

function num(v: unknown, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function toVariant(v: ApiProductVariant): ProductDetailVariant {
    return {
        id: String(v.id),
        productId: String(v.productId ?? ""),
        color: v.color ?? "—",
        colorHex: v.colorHex ?? "#9CA3AF",
        ...(v.colorId != null ? { colorId: num(v.colorId) } : {}),
        size: v.size ?? "—",
        ...(v.sizeId != null ? { sizeId: num(v.sizeId) } : {}),
        sku: v.sku ?? "—",
        stock: num(v.stock),
        minQuantity: v.minQuantity != null ? num(v.minQuantity) : undefined,
        basePrice: num(v.basePrice),
        mrpExclGst: num(v.mrpExclGst),
        mrpPrice: num(v.mrpPrice),
        discountPercentage: num(v.discountPercentage),
        discountAmount: num(v.discountAmount),
        sellingPrice: num(v.sellingPrice),
        taxPercentage: num(v.taxPercentage),
        taxAmount: num(v.taxAmount),
        finalPrice: num(v.finalPrice),
        mrpInclGst: num(v.mrpInclGst),
        intraCityDeliveryCharge: num(v.intraCityDeliveryCharge),
        metroMetroDeliveryCharge: num(v.metroMetroDeliveryCharge),
        totalPriceIntraCity: num(v.totalPriceIntraCity),
        totalPriceMetroMetro: num(v.totalPriceMetroMetro),
        commissionPercentage: num(v.commissionPercentage),
        commissionAmount: num(v.commissionAmount),
        videoPath: v.videoPath ?? "",
        weight: num(v.weight),
        createdAt: v.createdAt ?? "—",
        updatedAt: v.updatedAt ?? "—",
        mrp: num(v.mrp ?? v.mrpPrice),
        discount: num(v.discount ?? v.discountPercentage),
        sellingPriceExGst: num(v.sellingPriceExGst ?? v.sellingPrice),
        gstPercent: num(v.gstPercent ?? v.taxPercentage),
        gstAmount: num(v.gstAmount ?? v.taxAmount),
        sellingPriceWithGst: num(v.sellingPriceWithGst ?? v.finalPrice),
        commissionPercent: num(v.commissionPercent ?? v.commissionPercentage),
        intraCityDelivery: num(v.intraCityDelivery ?? v.intraCityDeliveryCharge),
        metroMetroDelivery: num(v.metroMetroDelivery ?? v.metroMetroDeliveryCharge),
        totalIntraCity: num(v.totalIntraCity ?? v.totalPriceIntraCity),
        totalMetroMetro: num(v.totalMetroMetro ?? v.totalPriceMetroMetro),
        ...(v.imageUri ? { imageUri: resolveMediaUrl(v.imageUri) ?? v.imageUri } : {}),
        ...(v.videoUri ? { videoUri: resolveMediaUrl(v.videoUri) ?? v.videoUri } : {}),
    };
}

function toDetail(row: ApiProductDetail): ProductDetail {
    const images = resolveMediaUrls(row.images?.filter(Boolean) ?? []);
    return {
        id: String(row.id),
        categoryId: num(row.categoryId),
        subcategoryId: num(row.subcategoryId),
        sizeChartId: row.sizeChartId,
        sizeChartName: row.sizeChartName,
        sizeChartImage: row.sizeChartImage ? resolveMediaUrl(row.sizeChartImage) ?? row.sizeChartImage : undefined,
        name: row.name ?? "",
        sku: row.sku ?? "—",
        price: num(row.price),
        mrp: num(row.mrpExclGst ?? row.mrp),
        mrpExclGst: num(row.mrpExclGst ?? row.mrp),
        mrpInclGst: num(row.mrpInclGst),
        sellingPriceExGst: num(row.sellingPriceExGst),
        discount: num(row.discount),
        images: images.length > 0 ? images : [""],
        status: row.status ?? "Inactive",
        rawStatus: row.rawStatus ?? row.status ?? "",
        stock: num(row.stock),
        minQuantity: row.minQuantity != null && row.minQuantity > 0 ? num(row.minQuantity) : undefined,
        updated: row.updated ?? "—",
        category: row.category ?? "Uncategorized",
        categorySub: row.categorySub?.trim() || undefined,
        subcategory: row.subcategory ?? "",
        color: row.color ?? "—",
        size: row.size ?? "—",
        hsnCode: row.hsnCode ?? "—",
        gst: row.gst ?? "—",
        createdAt: row.createdAt ?? "—",
        approvedAt: row.approvedAt ?? "—",
        shortDescription: row.shortDescription ?? "",
        description: row.description ?? "",
        material: row.material ?? "—",
        weight: row.weight ?? "—",
        dimensions: row.dimensions ?? "—",
        returnPolicy: row.returnPolicy ?? "—",
        warranty: row.warranty ?? "No Warranty",
        careInstructions: row.careInstructions ?? "—",
        adminNotes: row.adminNotes ?? "",
        deliveryTimeMin: row.deliveryTimeMin,
        deliveryTimeMax: row.deliveryTimeMax,
        intraCityCharge: num(row.intraCityCharge),
        metroMetroCharge: num(row.metroMetroCharge),
        acceptCod: row.acceptCod === true,
        fragile: row.fragile === true,
        customized: row.customized === true,
        customTitle: row.customTitle,
        customInstructions: row.customInstructions,
        customLeadDays: row.customLeadDays,
        customCharge: row.customCharge,
        customAllowPhoto: row.customAllowPhoto === true,
        customImageLabel: row.customImageLabel,
        customAllowText: row.customAllowText === true,
        customTextLabel: row.customTextLabel,
        specifications: row.specifications ?? [],
        features: row.features ?? [],
        delivery: row.delivery ?? {
            estimated: "—",
            freeAbove: "—",
            expressAvailable: false,
            expressCharge: "—",
            cod: false,
            codCharge: "—",
            locations: "—",
        },
        packaging: row.packaging ?? {
            boxDimensions: "—",
            grossWeight: "—",
            packagingType: "—",
            fragile: false,
        },
        deliveryCharges: row.deliveryCharges ?? [],
        returnDetails: row.returnDetails ?? {
            window: "—",
            conditions: [],
            process: "—",
            refundMode: "—",
        },
        variants: (row.variants ?? []).map(toVariant),
        sizeChart: row.sizeChart ?? [],
    };
}

export async function fetchProducts(): Promise<ProductListItem[]> {
    const rows = await apiRequest<ApiProductListItem[] | { content?: ApiProductListItem[] }>(
        "/api/seller/products"
    );
    if (rows && typeof rows === "object" && !Array.isArray(rows) && "content" in rows) {
        throw new ApiError(
            "Products API returned user-service paginated response. Check nginx routes seller /api/seller/* to port 8083.",
            502
        );
    }
    const list = Array.isArray(rows) ? rows : [];
    return list.map(toListItem);
}

export async function fetchProductDetail(productId: string): Promise<ProductDetail> {
    const row = await apiRequest<ApiProductDetail>(`/api/seller/products/${productId}`);
    return toDetail(row);
}

export type CatalogSubcategory = {
    id: number;
    name: string;
    gstPercentage?: number;
    materials?: { material: string; hsnCode?: string; gst?: number }[];
    children?: {
        id: number;
        name: string;
        gstPercentage?: number;
        materials?: { material: string; hsnCode?: string; gst?: number }[];
    }[];
};

export type CatalogCategory = {
    id: number;
    name: string;
    subcategories: CatalogSubcategory[];
};

export type CatalogColor = {
    id: number;
    name: string;
    hex: string;
};

export type CatalogSize = {
    id: number;
    name: string;
    code: string;
};

export type ProductFormCatalog = {
    categories: CatalogCategory[];
    colors: CatalogColor[];
    sizes: CatalogSize[];
    priceMin?: number;
    priceMax?: number;
    commissionPercent?: number;
    deliverySlabs?: {
        id?: number;
        label: string;
        minWeightKg: number;
        maxWeightKg: number;
        intraCityCharge: number;
        metroMetroCharge: number;
        custom?: boolean;
    }[];
};

export type CreateProductImagePayload = {
    source: string;
    primary?: boolean;
    sortOrder?: number;
    variantClientKey?: string;
};

export type CreateProductVariantPayload = {
    clientKey?: string;
    colorId?: number;
    color: string;
    sizeId?: number;
    size: string;
    sku?: string;
    stock: number;
    minQuantity?: number;
    mrp: number;
    sellingPrice: number;
    discount?: number;
    videoUrl?: string;
    images?: CreateProductImagePayload[];
};

export type CreateProductPayload = {
    categoryId?: number;
    categoryName?: string;
    subcategoryId?: number;
    subcategoryName?: string;
    /** Normal category (categories.parent_id = main), e.g. Bags id=39 */
    childCategoryId?: number;
    /** Normal category display name */
    middleCategoryName?: string;
    name: string;
    sku?: string;
    hsnCode: string;
    productMaterialType?: string;
    gstPercentage?: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    productWeight: number;
    fragile?: boolean;
    shortDescription: string;
    description: string;
    features?: string;
    returnPolicy: string;
    specifications?: string;
    sizeChartId?: number;
    deliveryTimeMin?: number;
    deliveryTimeMax?: number;
    deliveryInfo?: string;
    warrantyInfo?: string;
    careInstructions?: string;
    acceptCod?: boolean;
    acceptPrepaid?: boolean;
    customized?: boolean;
    customTitle?: string;
    customInstructions?: string;
    customLeadDays?: string;
    customCharge?: string;
    customAllowPhoto?: boolean;
    customImageLabel?: string;
    customAllowText?: boolean;
    customTextLabel?: string;
    variants: CreateProductVariantPayload[];
    images?: CreateProductImagePayload[];
};

export type CreateProductResult = {
    productId: string;
    variants: { clientKey: string; variantId: string }[];
};

type ApiCreateProductResponse = {
    productId: number;
    variants?: { clientKey?: string; variantId?: number }[];
};

export async function fetchProductFormCatalog(): Promise<ProductFormCatalog> {
    return apiRequest<ProductFormCatalog>("/api/seller/catalog/product-form");
}

export type DeliveryChargeSlab = {
    id?: number;
    label: string;
    minWeightKg: number;
    maxWeightKg: number;
    intraCityCharge: number;
    metroMetroCharge: number;
    custom?: boolean;
};

/** Resolve intra-city / metro-metro charges for a weight from existing delivery tables. */
export async function fetchDeliveryChargesForWeight(weightKg: number): Promise<DeliveryChargeSlab> {
    return apiRequest<DeliveryChargeSlab>(
        `/api/seller/catalog/delivery-charges?weightKg=${encodeURIComponent(String(weightKg))}`
    );
}

export type VariantPricingPreview = {
    mrpExcl: number;
    sellingExcl: number;
    gstPercent: number;
    discountPercentage: number;
    discountAmount: number;
    taxAmount: number;
    finalPrice: number;
    mrpInclGst: number;
    commissionPercent: number;
    commissionAmount: number;
    intraCityCharge: number;
    metroMetroCharge: number;
    totalIntraCity: number;
    totalMetroMetro: number;
    weightSlabLabel?: string;
    deliveryCustom?: boolean;
};

/** Full variant price breakdown computed on the server from existing DB tables. */
export async function fetchVariantPricingPreview(input: {
    mrpExcl: number;
    sellingExcl: number;
    weightKg: number;
    categorySubId?: number | null;
    subcategoryId?: number | null;
    discountOverride?: number | null;
    gstPercent?: number | null;
}): Promise<VariantPricingPreview> {
    const body: Record<string, unknown> = {
        mrpExcl: input.mrpExcl,
        sellingExcl: input.sellingExcl,
        weightKg: input.weightKg,
    };
    if (input.categorySubId != null) body.categorySubId = input.categorySubId;
    if (input.subcategoryId != null) body.subcategoryId = input.subcategoryId;
    if (input.discountOverride != null) body.discountOverride = input.discountOverride;
    if (input.gstPercent != null) body.gstPercent = input.gstPercent;
    return apiRequest<VariantPricingPreview>("/api/seller/catalog/variant-pricing-preview", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function createProduct(payload: CreateProductPayload): Promise<CreateProductResult> {
    const row = await apiRequest<ApiCreateProductResponse>("/api/seller/products", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return {
        productId: String(row.productId),
        variants: (row.variants ?? []).map((v) => ({
            clientKey: v.clientKey ?? "",
            variantId: String(v.variantId ?? ""),
        })),
    };
}

export type UpdateProductPayload = CreateProductPayload & {
    variants: (CreateProductVariantPayload & { id?: number; remove?: boolean })[];
};

export async function updateProduct(
    productId: string,
    payload: UpdateProductPayload
): Promise<CreateProductResult> {
    const row = await apiRequest<ApiCreateProductResponse>(`/api/seller/products/${productId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return {
        productId: String(row.productId),
        variants: (row.variants ?? []).map((v) => ({
            clientKey: v.clientKey ?? "",
            variantId: String(v.variantId ?? ""),
        })),
    };
}

export async function deleteProduct(productId: string): Promise<void> {
    await apiRequest<void>(`/api/seller/products/${productId}`, { method: "DELETE" });
}

export type VariantMutationPayload = {
    colorId?: number;
    color: string;
    sizeId?: number;
    size: string;
    sku?: string;
    stock: number;
    minQuantity?: number;
    mrp: number;
    sellingPrice: number;
    discount?: number;
    videoUrl?: string;
    images?: CreateProductImagePayload[];
};

export async function createProductVariant(
    productId: string,
    payload: VariantMutationPayload
): Promise<{ variantId: string }> {
    const row = await apiRequest<{ variantId?: number }>(`/api/seller/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return { variantId: String(row.variantId ?? "") };
}

export async function updateProductVariant(
    productId: string,
    variantId: string,
    payload: VariantMutationPayload
): Promise<{ variantId: string }> {
    const row = await apiRequest<{ variantId?: number }>(
        `/api/seller/products/${productId}/variants/${variantId}`,
        { method: "PUT", body: JSON.stringify(payload) }
    );
    return { variantId: String(row.variantId ?? variantId) };
}

export async function deleteProductVariant(productId: string, variantId: string): Promise<void> {
    await apiRequest<void>(`/api/seller/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
    });
}

export type BulkImportResult = {
    productsCreated: number;
    variantsCreated: number;
    productIds: number[];
    errors: string[];
};

export async function bulkImportProducts(fileUri: string, fileName: string): Promise<BulkImportResult> {
    const sellerId = (await import("@/lib/api/sellerSession")).ensureSellerId();
    if (!sellerId) throw new Error("Unable to complete this action right now. Please try again.");

    const { resolveApiBaseUrl } = await import("@/lib/api/config");
    const baseUrl = resolveApiBaseUrl();
    const formData = new FormData();

    if (Platform.OS === "web") {
        const blob = await (await fetch(fileUri)).blob();
        formData.append("file", blob, fileName);
    } else {
        formData.append("file", {
            uri: fileUri,
            name: fileName,
            type: "application/zip",
        } as unknown as Blob);
    }

    const res = await fetch(`${baseUrl}/api/seller/products/bulk-import`, {
        method: "POST",
        headers: { "X-Seller-Id": String(sellerId) },
        body: formData,
    });

    if (!res.ok) {
        let message = `Import failed (${res.status})`;
        try {
            const body = await res.json();
            if (body?.message) message = body.message;
        } catch {
            // ignore
        }
        throw new Error(message);
    }
    return res.json() as Promise<BulkImportResult>;
}

export type PincodeOption = {
    pincodeId: number;
    pincode: string;
    area: string;
    city: string;
    state: string;
    country: string;
    selected: boolean;
};

export type ProductDeliverySettings = {
    productId: number;
    deliverAllLocations: boolean;
    pincodes: PincodeOption[];
};

export async function fetchProductDeliverySettings(
    productId: string,
    search?: string
): Promise<ProductDeliverySettings> {
    const q = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    return apiRequest<ProductDeliverySettings>(`/api/seller/products/${productId}/delivery-settings${q}`);
}

export async function updateProductDeliverySettings(
    productId: string,
    payload: { deliverAllLocations: boolean; pincodeIds: number[] }
): Promise<ProductDeliverySettings> {
    return apiRequest<ProductDeliverySettings>(`/api/seller/products/${productId}/delivery-settings`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}
