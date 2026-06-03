import { uriToImageSource } from "@/lib/media/imagePayload";
import type {
    CreateProductPayload,
    CreateProductVariantPayload,
    UpdateProductPayload,
} from "@/services/productApi";

type BasicData = {
    name: string;
    category: string;
    categoryId?: number | undefined;
    subcategory: string;
    subcategoryId?: number | undefined;
    materialType: string;
    hsnCode: string;
    shortDesc: string;
    fullDesc: string;
    length: string;
    width: string;
    height: string;
    weight: string;
    fragile: string;
    customized?: boolean;
    custTitle?: string;
    custInstructions?: string;
};

type VariantRow = {
    id: string;
    color: string;
    colorId?: number;
    size: string;
    sizeId?: number;
    sku: string;
    stock: string;
    mrp: string;
    sellingPrice: string;
    discount: string;
    images: string[];
    videoUrl?: string;
};

type ImagesData = {
    primaryImage: string | null;
    additionalImages?: string[];
    video?: string | null;
};

type DetailsData = {
    returnPolicy: string;
    returnPolicyText?: string;
    deliveryOption: string;
    minDays: string;
    maxDays: string;
    deliveryInfo: string;
    codEnabled: boolean;
    onlinePayEnabled: boolean;
    warranty: string;
    careInstructions: string;
    sizeChart?: string;
};

function parseNum(value: string): number {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
}

function parseIntSafe(value: string): number {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
}

export async function buildUpdateProductPayload(input: {
    basic: BasicData;
    variants: VariantRow[];
    images: ImagesData;
    details: DetailsData;
}): Promise<UpdateProductPayload> {
    const createPayload = await buildCreateProductPayload(input);
    const variants = createPayload.variants.map((v, index) => {
        const row = { ...v } as UpdateProductPayload["variants"][number];
        const rawId = input.variants[index]?.id ?? "";
        if (/^\d+$/.test(rawId)) {
            row.id = Number(rawId);
        }
        return row;
    });
    return { ...createPayload, variants };
}

export async function buildCreateProductPayload(input: {
    basic: BasicData;
    variants: VariantRow[];
    images: ImagesData;
    details: DetailsData;
}): Promise<CreateProductPayload> {
    const { basic, variants, images, details } = input;

    const productImages: NonNullable<CreateProductPayload["images"]> = [];
    if (images.primaryImage) {
        productImages.push({
            source: await uriToImageSource(images.primaryImage),
            primary: true,
            sortOrder: 0,
        });
    }

    let sortOrder = 1;
    for (const uri of images.additionalImages ?? []) {
        if (!uri?.trim()) continue;
        productImages.push({
            source: await uriToImageSource(uri),
            primary: false,
            sortOrder: sortOrder++,
        });
    }

    const variantPayloads: CreateProductVariantPayload[] = [];
    for (const variant of variants) {
        const variantImages: NonNullable<CreateProductVariantPayload["images"]> = [];
        for (let i = 0; i < variant.images.length; i++) {
            const uri = variant.images[i];
            if (!uri?.trim()) continue;
            variantImages.push({
                source: await uriToImageSource(uri),
                primary: i === 0,
                sortOrder: variantImages.length,
            });
        }

        const row: CreateProductVariantPayload = {
            clientKey: variant.id,
            color: variant.color,
            size: variant.size,
            stock: parseIntSafe(variant.stock),
            mrp: parseNum(variant.mrp),
            sellingPrice: parseNum(variant.sellingPrice),
            discount: parseNum(variant.discount),
            images: variantImages,
        };
        if (variant.colorId != null) row.colorId = variant.colorId;
        if (variant.sizeId != null) row.sizeId = variant.sizeId;
        const sku = variant.sku?.trim();
        if (sku) row.sku = sku;
        const videoUrl = images.video?.trim() || variant.videoUrl?.trim();
        if (videoUrl) row.videoUrl = videoUrl;
        variantPayloads.push(row);
    }

    const returnPolicy = details.returnPolicyText?.trim()
        ? `${details.returnPolicy}: ${details.returnPolicyText}`
        : details.returnPolicy;

    const payload: CreateProductPayload = {
        name: basic.name.trim(),
        hsnCode: basic.hsnCode.trim(),
        productMaterialType: basic.materialType,
        lengthCm: parseNum(basic.length),
        widthCm: parseNum(basic.width),
        heightCm: parseNum(basic.height),
        productWeight: parseNum(basic.weight),
        fragile: basic.fragile === "Yes",
        shortDescription: basic.shortDesc.trim(),
        description: basic.fullDesc.trim(),
        returnPolicy,
        deliveryTimeMin: parseIntSafe(details.minDays),
        deliveryTimeMax: parseIntSafe(details.maxDays),
        deliveryInfo: [details.deliveryOption, details.deliveryInfo].filter(Boolean).join(" — "),
        acceptCod: details.codEnabled,
        acceptPrepaid: details.onlinePayEnabled,
        customized: basic.customized === true,
        variants: variantPayloads,
        images: productImages,
    };

    if (basic.categoryId != null) {
        payload.categoryId = basic.categoryId;
    } else {
        payload.categoryName = basic.category;
    }
    if (basic.subcategoryId != null) {
        payload.subcategoryId = basic.subcategoryId;
    } else {
        payload.subcategoryName = basic.subcategory;
    }
    const warranty = details.warranty?.trim();
    if (warranty) payload.warrantyInfo = warranty;
    const care = details.careInstructions?.trim();
    if (care) payload.careInstructions = care;

    return payload;
}
