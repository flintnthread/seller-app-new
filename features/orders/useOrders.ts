import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
    Order,
    OrderLineItem,
    OrderNotification,
    OrdersFilter,
    OrderStatus,
    SortOption,
} from "./types";

const PAGE_SIZE = 12;

const MOCK_PRODUCT_IMAGES = [
  "https://picsum.photos/seed/prod1/80/80",
  "https://picsum.photos/seed/prod2/80/80",
  "https://picsum.photos/seed/prod3/80/80",
  "https://picsum.photos/seed/prod4/80/80",
  "https://picsum.photos/seed/prod5/80/80",
  "https://picsum.photos/seed/prod6/80/80",
  "https://picsum.photos/seed/prod7/80/80",
  "https://picsum.photos/seed/prod8/80/80",
  "https://picsum.photos/seed/prod9/80/80",
  "https://picsum.photos/seed/prod10/80/80",
];

const MOCK_PRODUCT_NAMES = [
  "Silk Kurti Set",
  "Cotton Salwar",
  "Embroidered Dupatta",
  "Printed Saree",
  "Linen Shirt",
  "Denim Jacket",
  "Woolen Shawl",
  "Block Print Kurta",
  "Chikankari Top",
  "Banarasi Lehenga",
];

const MOCK_VARIANTS = [
  "Red / S",
  "Blue / M",
  "Green / L",
  "Yellow / XL",
  "Black / Free Size",
  "White / XXL",
  "Pink / S",
  "Navy / M",
];

const MOCK_SKUS = [
  "SKU-SILK-R-S",
  "SKU-COT-B-M",
  "SKU-EMB-G-L",
  "SKU-SAR-Y-XL",
  "SKU-LIN-BK-FS",
  "SKU-DEN-W-XXL",
  "SKU-WOL-PK-S",
  "SKU-BLK-NV-M",
];

function generateLineItems(orderId: string, itemCount: number): OrderLineItem[] {
  const seed = parseInt(orderId.replace(/\D/g, "")) || 1;
  return Array.from({ length: itemCount }, (_, i) => {
    const idx = (seed + i) % MOCK_PRODUCT_NAMES.length;
    return {
      id: `${orderId}-ITEM-${i + 1}`,
      productName: MOCK_PRODUCT_NAMES[idx] ?? 'Unknown Product',
      variant: MOCK_VARIANTS[idx % MOCK_VARIANTS.length] ?? 'Default',
      sku: MOCK_SKUS[idx % MOCK_SKUS.length] ?? 'UNKNOWN',
      unitPrice: Math.floor(200 + (seed * (i + 1) * 137) % 4800),
      quantity: 1 + (i % 3),
      productImage: MOCK_PRODUCT_IMAGES[idx] ?? '',
    };
  });
}

const MOCK_ORDERS: Order[] = Array.from({ length: 42 }, (_, i) => {
  const statuses: OrderStatus[] = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  const names = [
    "Arjun Sharma",
    "Priya Nair",
    "Rahul Verma",
    "Sunita Reddy",
    "Amit Patel",
    "Kavya Menon",
    "Deepak Joshi",
    "Ananya Singh",
    "Vikram Rao",
    "Meera Iyer",
  ];
  const date = new Date(Date.now() - i * 3_600_000 * (Math.random() * 48 + 1));
  const itemCount = Math.floor(Math.random() * 5) + 1;
  const orderId = `ORD-${String(10000 + i).padStart(6, "0")}`;
  const lineItems = generateLineItems(orderId, itemCount);
  return {
    id: orderId,
    customerId: `CUST-${1000 + i}`,
    customerName: names[i % names.length] ?? 'Unknown Customer',
    productImage: lineItems[0]?.productImage ?? '',
    productName: lineItems[0]?.productName ?? '',
    lineItems,
    amount: lineItems.reduce((sum, li) => sum + li.unitPrice * li.quantity, 0),
    currency: "INR",
    status: statuses[i % statuses.length] ?? 'pending',
    itemCount,
    createdAt: date.toISOString(),
    updatedAt: new Date(date.getTime() + 3_600_000).toISOString(),
  };
});

const parseOrderDate = (order: Order): Date | null => {
  const dateValue = (order as any).date ?? order.createdAt;
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

async function fetchOrdersFromAPI(params: {
  page: number;
  filter: OrdersFilter;
  sort: SortOption;
}): Promise<{ orders: Order[]; total: number; hasMore: boolean }> {
  await new Promise((resolve) => setTimeout(resolve, 700));

  let filtered = MOCK_ORDERS.filter((order) => {
    if (params.filter.status !== "all" && order.status !== params.filter.status) return false;
    if (
      params.filter.search &&
      !order.id.toLowerCase().includes(params.filter.search.toLowerCase()) &&
      !order.customerName.toLowerCase().includes(params.filter.search.toLowerCase())
    ) {
      return false;
    }

    if (params.filter.dateFrom || params.filter.dateTo) {
      const createdAt = parseOrderDate(order);
      if (!createdAt) return false;

      if (params.filter.dateFrom) {
        const fromDate = new Date(params.filter.dateFrom);
        if (Number.isNaN(fromDate.getTime()) || createdAt.getTime() < fromDate.getTime()) return false;
      }
      if (params.filter.dateTo) {
        const toDate = new Date(params.filter.dateTo);
        if (Number.isNaN(toDate.getTime()) || createdAt.getTime() > toDate.getTime()) return false;
      }
    }

    return true;
  });

  filtered.sort((a, b) => {
    switch (params.sort) {
      case "latest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "status":
        return a.status.localeCompare(b.status);
      case "amount_desc":
        return b.amount - a.amount;
      case "amount_asc":
        return a.amount - b.amount;
    }
  });

  const start = (params.page - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  return { orders: slice, total: filtered.length, hasMore: start + PAGE_SIZE < filtered.length };
}

const MOCK_NOTIFICATIONS: OrderNotification[] = [
  {
    id: "NOTIF-001",
    orderId: "ORD-010000",
    customerName: "Arjun Sharma",
    productName: "Silk Kurti Set",
    amount: 1299,
    currency: "INR",
    receivedAt: new Date(Date.now() - 4 * 60000).toISOString(),
    isRead: false,
  },
  {
    id: "NOTIF-002",
    orderId: "ORD-010001",
    customerName: "Priya Nair",
    productName: "Cotton Salwar",
    amount: 3450,
    currency: "INR",
    receivedAt: new Date(Date.now() - 22 * 60000).toISOString(),
    isRead: false,
  },
  {
    id: "NOTIF-003",
    orderId: "ORD-010005",
    customerName: "Deepak Joshi",
    productName: "Woolen Shawl",
    amount: 780,
    currency: "INR",
    receivedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    isRead: true,
  },
];

export interface UseOrdersResult {
  orders: Order[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  filter: OrdersFilter;
  sort: SortOption;
  filterModalVisible: boolean;
  notificationPanelVisible: boolean;
  notifications: OrderNotification[];
  selectedOrder: Order | null;
  searchText: string;
  activeFilterCount: number;
  unreadNotificationCount: number;
  handleSearch: (text: string) => void;
  handleApplyFilter: (newFilter: OrdersFilter, newSort: SortOption) => void;
  handleRefresh: () => void;
  handleLoadMore: () => void;
  onSelectOrder: (order: Order) => void;
  handleViewNotification: (orderId: string) => void;
  markNotificationRead: (id: string) => void;
  setFilterModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setNotificationPanelVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedOrder: React.Dispatch<React.SetStateAction<Order | null>>;
  handleOrderUpdate: (updated: Order) => void;
  PAGE_SIZE: number;
}

export function useOrders(): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrdersFilter>({ status: "all", search: "" });
  const [sort, setSort] = useState<SortOption>("latest");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotification[]>(MOCK_NOTIFICATIONS);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchText, setSearchText] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  }, []);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const handleViewNotification = useCallback(
    (orderId: string) => {
      const found = orders.find((order) => order.id === orderId);
      if (found) setSelectedOrder(found);
      setNotificationPanelVisible(false);
    },
    [orders]
  );

  const loadOrders = useCallback(
    async (pageNum: number, currentFilter: OrdersFilter, currentSort: SortOption, reset = false) => {
      try {
        if (pageNum === 1) {
          if (!reset) setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);
        const result = await fetchOrdersFromAPI({ page: pageNum, filter: currentFilter, sort: currentSort });
        setOrders((previous) => (pageNum === 1 ? result.orders : [...previous, ...result.orders]));
        setTotal(result.total);
        setHasMore(result.hasMore);
        setPage(pageNum);
      } catch (err: any) {
        setError(err?.message ?? "Something went wrong.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadOrders(1, filter, sort);
  }, []);

  const handleSearch = useCallback(
    (text: string) => {
      setSearchText(text);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        const newFilter = { ...filter, search: text };
        setFilter(newFilter);
        loadOrders(1, newFilter, sort);
      }, 400);
    },
    [filter, sort, loadOrders]
  );

  const handleApplyFilter = useCallback(
    (newFilter: OrdersFilter, newSort: SortOption) => {
      setFilter(newFilter);
      setSort(newSort);
      setSearchText(newFilter.search);
      setFilterModalVisible(false);
      loadOrders(1, newFilter, newSort);
    },
    [loadOrders]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders(1, filter, sort, true);
  }, [filter, sort, loadOrders]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      loadOrders(page + 1, filter, sort);
    }
  }, [filter, hasMore, loadOrders, loading, loadingMore, page, sort]);

  const onSelectOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
  }, []);

  const handleOrderUpdate = useCallback((updated: Order) => {
    setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
    setSelectedOrder(updated);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.status !== "all") count++;
    if (filter.dateFrom || filter.dateTo) count++;
    if (sort !== "latest") count++;
    return count;
  }, [filter, sort]);

  return {
    orders,
    loading,
    loadingMore,
    refreshing,
    error,
    total,
    hasMore,
    filter,
    sort,
    filterModalVisible,
    notificationPanelVisible,
    notifications,
    selectedOrder,
    searchText,
    activeFilterCount,
    unreadNotificationCount,
    handleSearch,
    handleApplyFilter,
    handleRefresh,
    handleLoadMore,
    onSelectOrder,
    handleViewNotification,
    markNotificationRead,
    setFilterModalVisible,
    setNotificationPanelVisible,
    setSelectedOrder,
    handleOrderUpdate,
    PAGE_SIZE,
  };
}

export { PAGE_SIZE };
