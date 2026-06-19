export const RETURN_POLICY_PRESETS: Record<string, string> = {
    "10-Day Exchange Only (Global)":
        "Items may be exchanged within 10 days if unused, with original tags and packaging intact.",
    "30-Day Return & Refund (Global)":
        "Returns accepted within 30 days of delivery for unused items in original condition. Refund processed after inspection.",
    "7-Day Easy Return (Global)":
        "Easy returns within 7 days if the product is unused and in original packaging.",
    "No Return on Clearance Items (Global)":
        "Clearance items are final sale and not eligible for returns or exchanges.",
    "Replacements (Global)":
        "Defective or damaged items will be replaced within the stated window after verification.",
    "Custom Policy": "",
};

export const DELIVERY_PRESETS: Record<
    string,
    { minDays: string; maxDays: string; deliveryInfo: string }
> = {
    "Same Day Delivery (Global)": {
        minDays: "0",
        maxDays: "1",
        deliveryInfo: "Same-day delivery available in select cities for orders placed before 2 PM.",
    },
    "Express Delivery (Global)": {
        minDays: "1",
        maxDays: "2",
        deliveryInfo: "Priority dispatch within 1–2 business days. Express courier charges may apply.",
    },
    "Standard Delivery (Global)": {
        minDays: "3",
        maxDays: "7",
        deliveryInfo: "Ships within 3–7 business days.",
    },
    "Free Shipping (Global)": {
        minDays: "5",
        maxDays: "10",
        deliveryInfo: "Free shipping on eligible orders. Delivery in 5–10 business days.",
    },
};

export const RETURN_POLICY_OPTIONS = Object.keys(RETURN_POLICY_PRESETS);
export const DELIVERY_OPTIONS = Object.keys(DELIVERY_PRESETS);

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

export function matchReturnPolicyTemplate(stored: string | undefined | null): string {
    if (!stored?.trim()) return "";
    const head = stored.split(":")[0]?.trim() ?? stored.trim();
    const match = RETURN_POLICY_OPTIONS.find((p) => p === head);
    return match ?? (head.includes("Custom") ? "Custom Policy" : head);
}

export function matchDeliveryTemplate(deliveryInfo: string | undefined | null): string {
    if (!deliveryInfo?.trim()) return "";
    const match = DELIVERY_OPTIONS.find((o) => deliveryInfo.includes(o.replace(" (Global)", "")));
    return match ?? DELIVERY_OPTIONS.find((o) => deliveryInfo.includes(o)) ?? "";
}
