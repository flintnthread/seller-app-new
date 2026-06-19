export type CustomBuyerFieldType = "Text" | "File" | "Image";

export type CustomBuyerField = {
    id: string;
    name: string;
    type: CustomBuyerFieldType;
    required: boolean;
};

export const CUSTOM_BUYER_FIELD_TYPES: CustomBuyerFieldType[] = ["Text", "File", "Image"];

export function newCustomBuyerField(): CustomBuyerField {
    return {
        id: `cf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: "",
        type: "Text",
        required: true,
    };
}

export function validateCustomBuyerFields(fields: CustomBuyerField[]): string[] {
    const errors: string[] = [];
    const named = fields.filter((f) => f.name.trim());
    if (named.length === 0) {
        errors.push("Add at least one customer field for customization");
    }
    fields.forEach((field, index) => {
        if (!field.name.trim()) {
            errors.push(`Customization field #${index + 1}: Field name is required`);
        }
    });
    return errors;
}

export function applyCustomBuyerFieldsToPayload(
    payload: {
        customTitle?: string;
        customInstructions?: string;
        customAllowPhoto?: boolean;
        customImageLabel?: string;
        customAllowText?: boolean;
        customTextLabel?: string;
    },
    fields: CustomBuyerField[],
): void {
    const valid = fields.filter((f) => f.name.trim());
    const imageLike = valid.find((f) => f.type === "Image" || f.type === "File");
    const textLike = valid.find((f) => f.type === "Text");

    payload.customTitle = "Customized Product";
    payload.customInstructions = JSON.stringify({
        buyerFields: valid.map((f) => ({
            name: f.name.trim(),
            type: f.type,
            required: f.required,
        })),
    });
    payload.customAllowPhoto = !!imageLike;
    payload.customImageLabel = imageLike?.name.trim() ?? "";
    payload.customAllowText = !!textLike;
    payload.customTextLabel = textLike?.name.trim() ?? "";
}

export function parseCustomBuyerFieldsFromInstructions(instructions?: string): CustomBuyerField[] {
    if (!instructions?.trim()) return [];
    try {
        const parsed = JSON.parse(instructions);
        if (Array.isArray(parsed?.buyerFields)) {
            return parsed.buyerFields.map((field: { name?: string; type?: string; required?: boolean }, index: number) => ({
                id: `cf-${index}-${field.name ?? "field"}`,
                name: field.name ?? "",
                type: (CUSTOM_BUYER_FIELD_TYPES.includes(field.type as CustomBuyerFieldType)
                    ? field.type
                    : "Text") as CustomBuyerFieldType,
                required: field.required !== false,
            }));
        }
    } catch {
        // Legacy plain-text instructions — no structured fields.
    }
    return [];
}
