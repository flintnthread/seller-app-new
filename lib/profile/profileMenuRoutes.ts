import type { Href } from "expo-router";

export const PROFILE_MENU_ROUTES: Record<string, Href> = {
    "My Store": "/dashboard",
    Products: "/productmanagement",
    Orders: "/Ordersscreen",
    Earnings: "/earning",
    Payouts: "/payoutrequest",
    "Store Dashboard": "/dashboard",
    "Manage Products": "/productmanagement",
    "Orders Management": "/Ordersscreen",
    "Store Analytics": "/totalsales",
    "Store Settings": "/settingsModule",
    "Earnings Overview": "/earning",
    "Payouts & Withdrawals": "/payoutrequest",
    "Transactions History": "/earningsScreen",
    "Payout Settings": "/settingsModule",
    "Help & Support": "/helpsupport",
    "Privacy & Policy": "/legal-document?type=privacy",
    "Privacy & Support": "/legal-document?type=privacy",
    FAQs: "/helpsupport",
};

export function getProfileMenuRoute(title: string): Href | null {
    return PROFILE_MENU_ROUTES[title] ?? null;
}
