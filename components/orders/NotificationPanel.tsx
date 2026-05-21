import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { OrderNotification } from "../../features/orders/types";
import { notifStyles, newStyles } from "../../styles/orderStyles";

import { NotificationIcon, CloseIcon, PackageIcon } from "../icons";

interface NotificationBannerProps {
  onOpenPanel?: () => void;
  unreadCount?: number;
}

export const NewOrderNotificationBanner: React.FC<NotificationBannerProps> = ({ onOpenPanel, unreadCount = 0 }) => (
  <TouchableOpacity style={newStyles.bellBtn} onPress={onOpenPanel}>
    <NotificationIcon size={24} color="#ef7b1a" />
    {unreadCount > 0 && (
      <View style={newStyles.bellBadge}>
        <Text style={newStyles.bellBadgeText}>{unreadCount}</Text>
      </View>
    )}
  </TouchableOpacity>
);

interface NotificationScreenProps {
  visible: boolean;
  notifications: OrderNotification[];
  onClose: () => void;
  onViewOrder?: (orderId: string) => void;
  onMarkRead: (id: string) => void;
}

export const NotificationScreen: React.FC<NotificationScreenProps> = ({ visible, notifications, onClose, onViewOrder, onMarkRead }) => {
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const hasAny = notifications.length > 0;

  if (!visible) return null;

  return (
    <View style={notifStyles.overlay}>
      <SafeAreaView style={notifStyles.screen} edges={["top", "left", "right", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F4F0" />

        <View style={notifStyles.header}>
          <View style={notifStyles.headerRow1}>
            <View style={{ flex: 1 }}>
              <Text style={notifStyles.title} numberOfLines={1}>Notifications</Text>
              <Text style={notifStyles.subtitle}>{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</Text>
            </View>
            <TouchableOpacity style={notifStyles.dismissBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <CloseIcon size={20} color="#1C1917" />
            </TouchableOpacity>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={notifStyles.markAllBtn} onPress={() => notifications.forEach((n) => !n.isRead && onMarkRead(n.id))}>
              <Text style={notifStyles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={notifStyles.divider} />

        {!hasAny ? (
          <View style={notifStyles.emptyState}>
            <NotificationIcon size={48} color="#A89D95" />
            <Text style={notifStyles.emptyTitle}>No notifications yet</Text>
            <Text style={notifStyles.emptySub}>New order alerts will show up here.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[notifStyles.notifCard, !notification.isRead && notifStyles.notifCardUnread]}
                activeOpacity={0.8}
                onPress={() => {
                  onMarkRead(notification.id);
                  onClose();
                  onViewOrder?.(notification.orderId);
                }}
              >
                {!notification.isRead && <View style={notifStyles.unreadDot} />}
                <View style={notifStyles.notifIconBox}>
                  <PackageIcon size={24} color="#B8935A" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={notifStyles.notifTitle}>New order from {notification.customerName}</Text>
                  {notification.productName && (
                    <Text style={notifStyles.notifProduct} numberOfLines={1}>{notification.productName}</Text>
                  )}
                  <View style={notifStyles.notifMeta}>
                    <Text style={notifStyles.notifOrderId}>{notification.orderId}</Text>
                    <View style={notifStyles.notifDividerDot} />
                    <Text style={notifStyles.notifAmount}>{notification.amount} {notification.currency}</Text>
                    <View style={notifStyles.notifDividerDot} />
                    <Text style={notifStyles.notifTime}>{new Date(notification.receivedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                  </View>
                </View>
                <View style={notifStyles.notifAction}>
                  <Text style={notifStyles.notifChevron}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};
