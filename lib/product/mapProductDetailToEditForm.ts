import type { ProductDetail } from "@/services/productApi";

function parseDimensionPart(dimensions: string, index: number): string {
    const parts = dimensions.split("×").map((p) => p.trim().replace(/cm/i, "").trim());
    return parts[index] ?? "";
}

export function mapProductDetailToEditForm(detail: ProductDetail) {
    const images = detail.images.filter((u) => u && u.trim().length > 0);
    return {
        basic: {
            id: detail.id,
            name: detail.name,
            category: detail.category,
            categoryId: detail.categoryId,
            subcategory: detail.subcategory,
            subcategoryId: detail.subcategoryId,
            materialType: detail.material ?? "",
            hsnCode: detail.hsnCode === "—" ? "" : detail.hsnCode,
            shortDesc: detail.shortDescription,
            fullDesc: detail.description,
            length: parseDimensionPart(detail.dimensions, 0),
            width: parseDimensionPart(detail.dimensions, 1),
            height: parseDimensionPart(detail.dimensions, 2),
            weight: detail.weight?.replace(/\s*kg$/i, "") ?? "",
            weightSlab: "",
            fragile: detail.fragile ? "Yes" : "No",
            customized: false,
            custTitle: "",
            custInstructions: "",
            custLeadDays: "",
            custCharge: "",
            custAllowPhoto: false,
            custImageLabel: "",
            custPickedImage: null as string | null,
            custAllowText: false,
            custTextLabel: "",
        },
        variants: detail.variants.map((v) => ({
            id: v.id,
            color: v.color === "—" ? "" : v.color,
            size: v.size === "—" ? "" : v.size,
            sku: v.sku === "—" ? "" : v.sku,
            stock: String(v.stock),
            mrp: String(v.mrpExclGst || v.mrp),
            sellingPrice: String(v.sellingPriceExGst || v.sellingPrice),
            discount: String(v.discount || v.discountPercentage),
            images: v.imageUri ? [v.imageUri] : [],
            videoUrl: v.videoUri || v.videoPath || "",
        })),
        images: {
            primaryImage: images[0] ?? null,
            additionalImages: images.slice(1),
            video: detail.variants[0]?.videoUri || detail.variants[0]?.videoPath || null,
        },
        details: {
            sizeChart: "",
            returnPolicy: detail.returnPolicy?.split(":")[0]?.trim() ?? detail.returnPolicy ?? "",
            returnPolicyText: detail.returnPolicy?.includes(":")
                ? detail.returnPolicy.split(":").slice(1).join(":").trim()
                : "",
            deliveryOption: detail.delivery?.estimated ?? "Standard Delivery",
            minDays: detail.deliveryTimeMin != null ? String(detail.deliveryTimeMin) : "3",
            maxDays: detail.deliveryTimeMax != null ? String(detail.deliveryTimeMax) : "7",
            deliveryInfo: detail.delivery?.estimated ?? "",
            codEnabled: detail.acceptCod,
            onlinePayEnabled: true,
            warranty: detail.warranty === "No Warranty" ? "" : detail.warranty,
            careInstructions: detail.careInstructions === "—" ? "" : detail.careInstructions,
        },
    };
}
