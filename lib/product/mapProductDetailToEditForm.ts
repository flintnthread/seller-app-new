import type { ProductDetail } from "@/services/productApi";
import { parseCustomBuyerFieldsFromInstructions } from "@/lib/product/customProductFields";
import { matchDeliveryTemplate, matchReturnPolicyTemplate } from "@/lib/products/policyPresets";
import { mapApiRowsToFormRows } from "@/lib/product/sizeChartForm";
import { resolveWeightSlab } from "@/lib/product/weightSlab";

function parseDimensionPart(dimensions: string, index: number): string {
    const parts = dimensions.split("×").map((p) => p.trim().replace(/cm/i, "").trim());
    return parts[index] ?? "";
}

function mapSpecifications(detail: ProductDetail) {
    return (detail.specifications ?? []).map((s) => ({
        name: s.label ?? "",
        value: s.value ?? "",
    }));
}

export function mapProductDetailToEditForm(detail: ProductDetail) {
    const images = (detail.images ?? []).filter((u) => u && u.trim().length > 0);
    const features = (detail.features ?? []).filter((f) => f && f.trim().length > 0);
    const specifications = mapSpecifications(detail);
    const weightRaw = detail.weight?.replace(/\s*kg$/i, "") ?? "";
    const slab = resolveWeightSlab(weightRaw);
    const sizeChartRows = mapApiRowsToFormRows(
        (detail.sizeChart ?? []).map((row) => ({
            size: row.size === "—" ? "" : row.size,
            chest: row.chest === "—" ? "" : row.chest,
            waist: row.waist === "—" ? "" : row.waist,
            hip: row.hip === "—" ? "" : row.hip,
            length: row.length === "—" ? "" : row.length,
            sleeve: row.sleeve === "—" ? "" : row.sleeve ?? "",
        })),
    );

    return {
        basic: {
            id: detail.id,
            name: detail.name,
            category: detail.category,
            categoryId: detail.categoryId,
            categorySubName: "",
            categorySubId: undefined as number | undefined,
            subcategory: detail.subcategory,
            subcategoryId: detail.subcategoryId,
            materialType: detail.material ?? "",
            hsnCode: detail.hsnCode === "—" ? "" : detail.hsnCode,
            gstPercentage: "",
            shortDesc: detail.shortDescription,
            fullDesc: detail.description,
            length: parseDimensionPart(detail.dimensions, 0),
            width: parseDimensionPart(detail.dimensions, 1),
            height: parseDimensionPart(detail.dimensions, 2),
            weight: weightRaw,
            weightSlab: slab.label,
            intraCityCharge: slab.custom ? "" : String(detail.intraCityCharge ?? slab.intraCityCharge),
            metroMetroCharge: slab.custom ? "" : String(detail.metroMetroCharge ?? slab.metroMetroCharge),
            customDeliveryCharge: !!slab.custom,
            fragile: detail.fragile ? "Yes" : "No",
            customized: detail.customized === true,
            custCustomFields: detail.customized
                ? parseCustomBuyerFieldsFromInstructions(detail.customInstructions)
                : [],
            custTitle: detail.customTitle ?? "",
            custInstructions: detail.customInstructions ?? "",
            custLeadDays: detail.customLeadDays ?? "",
            custCharge: detail.customCharge ?? "",
            custAllowPhoto: detail.customAllowPhoto === true,
            custImageLabel: detail.customImageLabel ?? "",
            custPickedImage: null as string | null,
            custAllowText: detail.customAllowText === true,
            custTextLabel: detail.customTextLabel ?? "",
        },
        variants: (detail.variants ?? []).map((v) => ({
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
            video: detail.variants?.[0]?.videoUri || detail.variants?.[0]?.videoPath || null,
        },
        details: {
            sizeChart: detail.sizeChartName ?? (detail.sizeChartId != null ? String(detail.sizeChartId) : ""),
            sizeChartId: detail.sizeChartId,
            sizeChartRows,
            selectedReviewSize: sizeChartRows[0]?.size ?? "",
            sizeChartMeta: detail.sizeChartId
                ? {
                      category: detail.category ?? "",
                      categorySubName: "",
                      subcategory: detail.subcategory ?? "",
                      unit: "Centimetres (cm)",
                      imageUrl: detail.sizeChartImage ?? "",
                  }
                : undefined,
            returnPolicy: matchReturnPolicyTemplate(detail.returnPolicy),
            returnPolicyText: detail.returnPolicy?.includes(":")
                ? detail.returnPolicy.split(":").slice(1).join(":").trim()
                : "",
            deliveryOption: matchDeliveryTemplate(detail.delivery?.estimated) || "Standard Delivery (Global)",
            minDays: detail.deliveryTimeMin != null ? String(detail.deliveryTimeMin) : "3",
            maxDays: detail.deliveryTimeMax != null ? String(detail.deliveryTimeMax) : "7",
            deliveryInfo: detail.delivery?.locations ?? detail.delivery?.estimated ?? "",
            codEnabled: detail.acceptCod !== false,
            onlinePayEnabled: true,
            warranty: detail.warranty === "No Warranty" ? "" : detail.warranty,
            careInstructions: detail.careInstructions === "—" ? "" : detail.careInstructions,
            features: features.length > 0 ? features : [""],
            specifications: specifications.length > 0 ? specifications : [{ name: "", value: "" }],
        },
    };
}
