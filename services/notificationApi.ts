import { apiRequest } from "@/lib/api/client";

export type SellerNotificationItem = {
    id: number;
    type: string;
    title: string;
    body?: string;
    time?: string;
    read: boolean;
};

export async function fetchNotifications(): Promise<SellerNotificationItem[]> {
    return apiRequest<SellerNotificationItem[]>("/api/notifications");
}

export async function markNotificationRead(id: number): Promise<void> {
    await apiRequest<void>(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
    await apiRequest<void>("/api/notifications/read-all", { method: "PATCH" });
}
