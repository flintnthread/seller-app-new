import React, { useEffect, useRef } from "react";
import {
    Animated,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { Order } from "../../features/orders/types";
import { PackageIcon } from "../icons";
import { StatusBadge } from "./StatusBadge";
import { C } from "./orderConstants";
import { avatarColor, formatCurrency, formatDate, getInitials } from "./orderUtils";

interface OrderCardProps {
  order: Order;
  onPress: (order: Order) => void;
  index: number;
}

const ProductThumb: React.FC<{ uri?: string; size?: number }> = ({ uri, size = 52 }) => {
  const [failed, setFailed] = React.useState(false);

  if (uri && !failed) {
    return (
      <View style={[styles.thumbContainer, { width: size, height: size }]}> 
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.thumbContainer, { width: size, height: size, justifyContent: "center", alignItems: "center" }]}> 
      <PackageIcon size={size * 0.5} color="#A89D95" />
    </View>
  );
};

const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 40 }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name) }]}> 
    <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{getInitials(name)}</Text>
  </View>
);

const OrderCardComponent: React.FC<OrderCardProps> = ({ order, onPress, index }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const hasMultiple = order.lineItems.length > 1;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 40, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <TouchableOpacity activeOpacity={1} onPress={() => onPress(order)} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.card}>
        <View style={styles.topRow}>
          {hasMultiple ? (
            <View style={styles.multiCountBadge}>
              <Text style={styles.multiCountText}>{order.lineItems.length}</Text>
              <Text style={styles.multiCountSub}>items</Text>
            </View>
          ) : (
            <ProductThumb uri={order.lineItems[0]?.productImage ?? ''} size={44} />
          )}

          <View style={styles.infoBlock}>
            <Text style={styles.primaryText} numberOfLines={1}>
              {hasMultiple
                ? order.lineItems.map((li) => li.productName).slice(0, 2).join(", ") + (order.lineItems.length > 2 ? "…" : "")
                : order.lineItems[0]?.productName ?? order.customerName}
            </Text>
            <Text style={styles.customerText} numberOfLines={1}>{order.customerName}</Text>
            <Text style={styles.orderIdText}>{order.id}</Text>
          </View>

          <View style={styles.amountBlock}>
            <Text style={styles.amountText}>{formatCurrency(order.amount, order.currency)}</Text>
          </View>
        </View>

        {hasMultiple && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageStrip} contentContainerStyle={styles.imageStripContent}>
            {order.lineItems.map((item) => (
              <ProductThumb key={item.id} uri={item.productImage ?? ''} size={44} />
            ))}
          </ScrollView>
        )}

        <View style={styles.bottomRow}>
          <StatusBadge status={order.status} size="sm" />
          <Text style={styles.dateText}>{formatDate(order.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const OrderCard = React.memo(
  OrderCardComponent,
  (prev, next) => prev.order === next.order && prev.index === next.index && prev.onPress === next.onPress
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
    position: "relative",
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  multiCountBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  multiCountText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 18,
  },
  multiCountSub: {
    fontSize: 9,
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoBlock: {
    flex: 1,
    minWidth: 0,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  customerText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 1,
    fontWeight: "500",
  },
  orderIdText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  amountBlock: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  amountText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  itemCountText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
    fontWeight: "600",
  },
  imageStrip: {
    marginTop: 12,
  },
  imageStripContent: {
    gap: 8,
    paddingRight: 4,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  dateText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  thumbContainer: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    backgroundColor: "#f8fafc",
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
  },
});
