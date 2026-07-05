/** Top navigation tabs (dashboard header) — shared mobile + web. */
export type SellerNavItem = {
    id: string;
    label: string;
    icon: string;
    color: string;
    route: string;
    /** Pathname fragments that mark this tab active. */
    matchPaths: string[];
};

export const SELLER_NAV_ITEMS: SellerNavItem[] = [
    {
        id: "dashboard",
        label: "Dashboard",
        icon: "view-dashboard-outline",
        color: "#6C63FF",
        route: "/(main)/dashboard",
        matchPaths: ["dashboard", "/(main)/dashboard"],
    },
    {
        id: "products",
        label: "Products",
        icon: "shopping-outline",
        color: "#3B82F6",
        route: "/(main)/productmanagement",
        matchPaths: ["productmanagement", "Productdetail", "Editproduct", "Addnewproduct"],
    },
    {
        id: "orders",
        label: "Orders",
        icon: "clipboard-list-outline",
        color: "#F97316",
        route: "/(main)/Ordersscreen",
        matchPaths: ["Ordersscreen", "orders"],
    },
    {
        id: "categories",
        label: "Categories",
        icon: "shape-outline",
        color: "#FF3F6C",
        route: "/(main)/categoryrequest",
        matchPaths: ["categoryrequest"],
    },
    {
        id: "colors",
        label: "Colors",
        icon: "palette-outline",
        color: "#14B8A6",
        route: "/(main)/colors",
        matchPaths: ["colors"],
    },
    {
        id: "sizes",
        label: "Sizes",
        icon: "format-size",
        color: "#6366F1",
        route: "/(main)/sizes",
        matchPaths: ["sizes"],
    },
    {
        id: "support",
        label: "Support",
        icon: "headset",
        color: "#6366F1",
        route: "/(main)/helpsupport",
        matchPaths: ["helpsupport"],
    },
];

const SUB_SCREEN_PATTERNS = [
    "sellerpersonalinfo",
    "sellerbusinessinfo",
    "selleraddressinfo",
    "sellerbanking",
    "sellerdocuments",
    "sellerticketrise",
];

export function resolveActiveNavId(pathname: string): string {
    for (const item of SELLER_NAV_ITEMS) {
        if (item.matchPaths.some((p) => pathname.includes(p))) {
            return item.id;
        }
    }
    if (pathname.includes("Profile") || pathname.includes("viewsellerprofile") || pathname.includes("settingsModule")) {
        return "dashboard";
    }
    return "dashboard";
}

/** Hide top nav on onboarding / full-screen flows. */
export function shouldShowSellerTopNav(pathname: string): boolean {
    if (pathname.includes("/(auth)")) return false;
    return !SUB_SCREEN_PATTERNS.some((p) => pathname.includes(p));
}

/** Onboarding screens use their own full-bleed headers — skip desktop chrome. */
export function isOnboardingScreen(pathname: string): boolean {
    return SUB_SCREEN_PATTERNS.some((p) => pathname.includes(p));
}

/** Product flows use mobile-first layout on narrow web — drop outer padding. */
export function isMobileFirstProductScreen(pathname: string): boolean {
    return ["productmanagement", "Productdetail", "Editproduct", "Addnewproduct", "bulkupload"].some((p) =>
        pathname.includes(p),
    );
}

export const NAV_SUBTITLES: Record<string, string> = {
    dashboard: "Your seller overview",
    products: "Manage your products",
    orders: "Track & manage orders",
    categories: "Browse product categories",
    colors: "Manage colour options",
    sizes: "Manage size options",
    support: "Help & support centre",
};
