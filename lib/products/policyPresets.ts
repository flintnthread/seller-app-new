export const RETURN_POLICY_PRESETS: Record<string, string> = {
    "7 Days Return":
        "Items may be returned within 7 days if unused, with original tags and packaging intact. Refund or exchange subject to inspection.",
    "14 Days Return":
        "Returns accepted within 14 days of delivery for unused items in original condition. Custom or personalised items are non-returnable.",
    "30 Days Return":
        "Extended 30-day return window for unused products with tags attached. Return shipping may apply unless the item is defective.",
    "No Return":
        "This product is not eligible for returns or exchanges. All sales are final unless the item arrives damaged or defective.",
};

export const DELIVERY_PRESETS: Record<
    string,
    { minDays: string; maxDays: string; deliveryInfo: string }
> = {
    "Standard Delivery": {
        minDays: "3",
        maxDays: "7",
        deliveryInfo: "Ships within 3–7 business days. Free shipping on orders above ₹999.",
    },
    "Express Delivery": {
        minDays: "1",
        maxDays: "3",
        deliveryInfo: "Priority dispatch within 1–3 business days. Express courier charges may apply.",
    },
    "Same Day Delivery": {
        minDays: "0",
        maxDays: "1",
        deliveryInfo: "Same-day delivery available in select cities for orders placed before 2 PM.",
    },
    "Pickup Only": {
        minDays: "0",
        maxDays: "0",
        deliveryInfo: "Customer pickup from seller warehouse. No shipping charges apply.",
    },
};

export function applyReturnPolicySelection(
    policy: string,
    onChange: (key: string, value: string) => void
): void {
    onChange("returnPolicy", policy);
    const text = RETURN_POLICY_PRESETS[policy];
    if (text) onChange("returnPolicyText", text);
}

export function applyDeliverySelection(
    option: string,
    onChange: (key: string, value: string) => void
): void {
    onChange("deliveryOption", option);
    const preset = DELIVERY_PRESETS[option];
    if (!preset) return;
    onChange("minDays", preset.minDays);
    onChange("maxDays", preset.maxDays);
    onChange("deliveryInfo", preset.deliveryInfo);
}
