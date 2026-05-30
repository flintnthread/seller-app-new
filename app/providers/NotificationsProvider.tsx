import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    markAllNotificationsReadRemote,
    markNotificationReadRemote,
    useNotificationsFeed,
    type AppNotification,
} from "@/hooks/useNotificationsFeed";

export { type AppNotification } from "@/hooks/useNotificationsFeed";

type NotificationsContextType = {
  notifications: AppNotification[];
  addNotification: (n: AppNotification) => void;
  clearNotifications: () => void;
  markAllRead: () => void;
  markAsSeen: (id: string) => void;
  removeNotification: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextType | null>(
  null,
);

let globalAdd: ((n: AppNotification) => void) | null = null;

export function addGlobalNotification(n: AppNotification) {
  if (globalAdd) globalAdd(n);
}

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { notifications, setNotifications } = useNotificationsFeed();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>(
    {},
  );

  useEffect(() => {
    globalAdd = (n: AppNotification) => {
      setNotifications((prev) => [n, ...prev]);
    };
    return () => {
      globalAdd = null;
      // clear any timers
      Object.values(timers.current).forEach((t) => t && clearTimeout(t as any));
      timers.current = {};
    };
  }, []);

  const addNotification = (n: AppNotification) => {
    setNotifications((prev) => [n, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((p) => p.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id] as any);
      delete timers.current[id];
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    Object.values(timers.current).forEach((t) => t && clearTimeout(t as any));
    timers.current = {};
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((p) => ({ ...p, read: true })));
    markAllNotificationsReadRemote().catch(() => undefined);
  };

  const markAsSeen = (id: string) => {
    setNotifications((prev) =>
      prev.map((p) => (p.id === id ? { ...p, read: true } : p)),
    );
    markNotificationReadRemote(id).catch(() => undefined);
    const TTL = 24 * 60 * 60 * 1000; // 24 hours
    if (timers.current[id]) {
      clearTimeout(timers.current[id] as any);
    }
    timers.current[id] = setTimeout(() => {
      setNotifications((prev) => prev.filter((p) => p.id !== id));
      delete timers.current[id];
    }, TTL) as any;
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        addNotification,
        clearNotifications,
        markAllRead,
        markAsSeen,
        removeNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    );
  return ctx;
}

// Convenience helpers to create typed notifications
export function notifyNewOrder(id: string, title: string, body?: string) {
  addGlobalNotification({
    id: `new_${Date.now()}_${id}`,
    type: "new_order",
    title,
    ...(body !== undefined && { body }),
    time: new Date().toISOString(),
    read: false,
  });
}

export function notifyOrderCancelled(id: string, title: string, body?: string) {
  addGlobalNotification({
    id: `cancel_${Date.now()}_${id}`,
    type: "order_cancelled",
    title,
    ...(body !== undefined && { body }),
    time: new Date().toISOString(),
    read: false,
  });
}

export function notifyLowStock(id: string, title: string, body?: string) {
  addGlobalNotification({
    id: `low_${Date.now()}_${id}`,
    type: "low_stock",
    title,
    ...(body !== undefined && { body }),
    time: new Date().toISOString(),
    read: false,
  });
}

export function notifyPayment(id: string, title: string, body?: string) {
  addGlobalNotification({
    id: `pay_${Date.now()}_${id}`,
    type: "payment",
    title,
    ...(body !== undefined && { body }),
    time: new Date().toISOString(),
    read: false,
  });
}

export function notifyTicketUpdate(id: string, title: string, body?: string) {
  addGlobalNotification({
    id: `ticket_${Date.now()}_${id}`,
    type: "tickets",
    title,
    ...(body !== undefined && { body }),
    time: new Date().toISOString(),
    read: false,
  });
}

export default NotificationsProvider;
