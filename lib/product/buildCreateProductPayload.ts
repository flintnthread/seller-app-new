import { uriToImageSource } from "@/lib/media/imagePayload";
import type { CreateProductPayload, UpdateProductPayload } from "@/services/productApi";

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

    const productImages: CreateProductPayload["images"] = [];
    if (images.primaryImage) {
        productImages.push({
            source: await uriToImageSource(images.primaryImage),
            primary: true,
            sortOrder: 0,
        });
    }

    let sortOrder = 1;
    for (const uri of images.additionalImages ?? []) {
        productImages.push({
            source: await uriToImageSource(uri),
            primary: false,
            sortOrder: sortOrder++,
        });
    }

    const variantPayloads: CreateProductPayload["variants"] = [];
    for (const variant of variants) {
        const variantImages: NonNullable<CreateProductPayload["variants"][0]["images"]> = [];
        for (let i = 0; i < variant.images.length; i++) {
            variantImages.push({
                source: await uriToImageSource(variant.images[i]),
                primary: i === 0,
                sortOrder: i,
            });
        }

        variantPayloads.push({
            clientKey: variant.id,
            color: variant.color,
            ...(variant.colorId != null ? { colorId: variant.colorId } : {}),
            size: variant.size,
            ...(variant.sizeId != null ? { sizeId: variant.sizeId } : {}),
            sku: variant.sku || undefined,
            stock: parseIntSafe(variant.stock),
            mrp: parseNum(variant.mrp),
            sellingPrice: parseNum(variant.sellingPrice),
            discount: parseNum(variant.discount),
            videoUrl: variant.videoUrl?.trim() || undefined,
            images: variantImages,
        });
    }

    const returnPolicy = details.returnPolicyText?.trim()
        ? `${details.returnPolicy}: ${details.returnPolicyText}`
        : details.returnPolicy;

    return {
        ...(basic.categoryId != null ? { categoryId: basic.categoryId } : { categoryName: basic.category }),
        ...(basic.subcategoryId != null
            ? { subcategoryId: basic.subcategoryId }
            : { subcategoryName: basic.subcategory }),
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
        warrantyInfo: details.warranty?.trim() || undefined,
        careInstructions: details.careInstructions?.trim() || undefined,
        acceptCod: details.codEnabled,
        acceptPrepaid: details.onlinePayEnabled,
        customized: basic.customized === true,
        variants: variantPayloads,
        images: productImages,
    };
}
