import type { Href } from "expo-router";

export const PROFILE_MENU_ROUTES: Record<string, Href> = {
    "My Store": "/(main)/dashboard",
    Products: "/(main)/productmanagement",
    Orders: "/(main)/Ordersscreen",
    Earnings: "/(main)/earning",
    Payouts: "/(main)/payoutrequest",
    "Store Dashboard": "/(main)/dashboard",
    "Manage Products": "/(main)/productmanagement",
    "Orders Management": "/(main)/Ordersscreen",
    "Store Analytics": "/(main)/totalsales",
    "Store Settings": "/(main)/settingsModule",
    "Earnings Overview": "/(main)/earning",
    "Payouts & Withdrawals": "/(main)/payoutrequest",
    "Transactions History": "/(main)/earningsScreen",
    "Payout Settings": "/(main)/settingsModule",
    "Help & Support": "/(main)/helpsupport",
    "Privacy & Policy": "/legal-document?type=privacy",
    "Privacy & Support": "/legal-document?type=privacy",
    FAQs: "/(main)/helpsupport",
};

export function getProfileMenuRoute(title: string): Href | null {
    return PROFILE_MENU_ROUTES[title] ?? null;
}
