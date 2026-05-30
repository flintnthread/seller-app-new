import React, { useEffect, useState } from "react";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type SellerNotificationItem,
} from "@/services/notificationApi";

export type AppNotification = {
  id: string;
  type: "new_order" | "order_cancelled" | "low_stock" | "payment" | "tickets";
  title: string;
  body?: string;
  time?: string;
  read?: boolean;
};

function mapNotification(n: SellerNotificationItem): AppNotification {
  const type = (["new_order", "order_cancelled", "low_stock", "payment", "tickets"].includes(n.type)
    ? n.type
    : "payment") as AppNotification["type"];
  return {
    id: String(n.id),
    type,
    title: n.title,
    body: n.body,
    time: n.time,
    read: n.read,
  };
}

export function useNotificationsFeed() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const rows = await fetchNotifications();
      setNotifications(rows.map(mapNotification));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { notifications, setNotifications, loading, reload };
}

export async function markNotificationReadRemote(id: string) {
  await markNotificationRead(Number(id));
}

export async function markAllNotificationsReadRemote() {
  await markAllNotificationsRead();
}
