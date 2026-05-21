import React, { useState, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Dimensions, StatusBar, SafeAreaView, Image, Modal,
    TextInput, Platform,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import {
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";
import { useRouter } from "expo-router";

const { width: SW } = Dimensions.get("window");

// ─── Color Palette ────────────────────────────────────────────
const C = {
    navy: "#1E2B6B", navyDeep: "#151D4F", navyMid: "#1A2B5E", navyLight: "#2D3E8A",
    purple: "#6C63FF", purpleLight: "#A89CFF", purplePale: "#F0EEFF",
    green: "#22C55E", greenLight: "#86EFAC", greenPale: "#F0FDF4",
    red: "#EF4444", redLight: "#FCA5A5", redPale: "#FEF2F2",
    yellow: "#F59E0B", yellowPale: "#FFFBEB",
    blue: "#3B82F6", bluePale: "#EFF6FF",
    orange: "#F97316", orangePale: "#FFF7ED",
    teal: "#14B8A6", cyan: "#06B6D4",
    white: "#FFFFFF", bg: "#F7F8FC", card: "#FFFFFF",
    border: "#E5E7EB", textDark: "#111827", textMid: "#374151", textLight: "#9CA3AF",
};

type ViewType = "list" | "grid";
type TabType = "All Products" | "Active" | "Inactive" | "Out of Stock" | "Low Stock";
type SortType = "Latest" | "Oldest" | "Price: Low-High" | "Price: High-Low" | "Name A-Z";

// ─── Tab config ───────────────────────────────────────────────
const TABS: { label: TabType; icon: string; color: string; bg: string }[] = [
    { label: "All Products", icon: "package-variant",      color: C.navy,   bg: "#EEF1FF" },
    { label: "Active",       icon: "check-circle-outline", color: C.green,  bg: C.greenPale },
    { label: "Inactive",     icon: "pause-circle-outline", color: C.yellow, bg: C.yellowPale },
    { label: "Out of Stock", icon: "close-circle-outline", color: C.red,    bg: C.redPale },
    { label: "Low Stock",    icon: "alert-circle-outline", color: C.orange, bg: C.orangePale },
];

// ─── Products Data ────────────────────────────────────────────
const ALL_PRODUCTS = [
    { id:"1",  name:"Running Sports Shoes", sku:"SHOES001", price:1999, image:"https://picsum.photos/seed/shoes1/100/100",      status:"Active",       stock:50,  updated:"20 May 2024", category:"Footwear",    subcategory:"Sneakers", color:"Red",   size:"42" },
    { id:"2",  name:"Smart Watch Series 5", sku:"WATCH005", price:2999, image:"https://picsum.photos/seed/watch1/100/100",      status:"Active",       stock:30,  updated:"19 May 2024", category:"Electronics", subcategory:"Wearables",color:"Black", size:"Free Size" },
    { id:"3",  name:"Travel Backpack",       sku:"BAG002",   price:1299, image:"https://picsum.photos/seed/backpack1/100/100",  status:"Inactive",     stock:0,   updated:"18 May 2024", category:"Bags",        subcategory:"Backpacks",color:"Blue",  size:"Free Size" },
    { id:"4",  name:"Wireless Headphones",   sku:"HEAD004",  price:1799, image:"https://picsum.photos/seed/headphones1/100/100",status:"Out of Stock", stock:0,   updated:"17 May 2024", category:"Electronics", subcategory:"Audio",    color:"White", size:"Free Size" },
    { id:"5",  name:"Cotton T-Shirt",        sku:"SHIRT003", price:499,  image:"https://picsum.photos/seed/tshirt1/100/100",    status:"Active",       stock:120, updated:"20 May 2024", category:"Clothing",    subcategory:"T-Shirts", color:"White", size:"M" },
    { id:"6",  name:"Denim Jeans",           sku:"JEAN001",  price:1199, image:"https://picsum.photos/seed/jeans1/100/100",     status:"Active",       stock:85,  updated:"19 May 2024", category:"Clothing",    subcategory:"Jeans",    color:"Blue",  size:"32" },
    { id:"7",  name:"Leather Wallet",        sku:"WALL007",  price:799,  image:"https://picsum.photos/seed/wallet1/100/100",    status:"Active",       stock:8,   updated:"15 May 2024", category:"Accessories", subcategory:"Wallets",  color:"Brown", size:"Free Size" },
    { id:"8",  name:"Sunglasses UV400",      sku:"SUN008",   price:999,  image:"https://picsum.photos/seed/glasses1/100/100",   status:"Active",       stock:6,   updated:"14 May 2024", category:"Accessories", subcategory:"Eyewear",  color:"Black", size:"Free Size" },
    { id:"9",  name:"Yoga Mat Pro",          sku:"MAT009",   price:1499, image:"https://picsum.photos/seed/mat1/100/100",       status:"Inactive",     stock:0,   updated:"13 May 2024", category:"Sports",      subcategory:"Yoga",     color:"Purple",size:"Free Size" },
    { id:"10", name:"Bluetooth Speaker",     sku:"SPK010",   price:2499, image:"https://picsum.photos/seed/speaker1/100/100",   status:"Active",       stock:25,  updated:"12 May 2024", category:"Electronics", subcategory:"Audio",    color:"Gray",  size:"Free Size" },
    { id:"11", name:"Formal Oxford Shoes",   sku:"OXFD011",  price:3499, image:"https://picsum.photos/seed/shoes2/100/100",     status:"Active",       stock:20,  updated:"11 May 2024", category:"Footwear",    subcategory:"Formal",   color:"Black", size:"43" },
    { id:"12", name:"Polo Shirt",            sku:"POLO012",  price:699,  image:"https://picsum.photos/seed/polo1/100/100",      status:"Out of Stock", stock:0,   updated:"10 May 2024", category:"Clothing",    subcategory:"Shirts",   color:"Red",   size:"L" },
];

// ─── Filter options ───────────────────────────────────────────
const CATEGORIES   = ["All","Footwear","Electronics","Bags","Clothing","Accessories","Sports"];
const SUBCATEGORIES: Record<string,string[]> = {
    Footwear:    ["All","Sneakers","Formal","Sports","Boots"],
    Electronics: ["All","Audio","Wearables","Cameras","Tablets"],
    Bags:        ["All","Backpacks","Handbags","Wallets","Travel Bags"],
    Clothing:    ["All","T-Shirts","Shirts","Jeans","Dresses","Jackets"],
    Accessories: ["All","Wallets","Eyewear","Watches","Jewelry"],
    Sports:      ["All","Cricket","Football","Yoga","Gym"],
};
const COLOR_OPTIONS = ["All","Red","Blue","Green","Black","White","Yellow","Pink","Purple","Orange","Gray","Brown"];
const SIZE_OPTIONS  = ["All","XS","S","M","L","XL","XXL","Free Size","28","30","32","34","36","38","40","42","43"];
const SORT_OPTIONS: SortType[] = ["Latest","Oldest","Price: Low-High","Price: High-Low","Name A-Z"];
const LOW_STOCK_THRESHOLD = 10;
const ITEMS_PER_PAGE = 4;

// ─── Screen ───────────────────────────────────────────────────
const ProductsScreen: React.FC = () => {
    const router = useRouter();

    const [viewType,     setViewType]     = useState<ViewType>("list");
    const [selectedTab,  setSelectedTab]  = useState<TabType>("All Products");
    const [sortBy,       setSortBy]       = useState<SortType>("Latest");
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showFilter,   setShowFilter]   = useState(false);
    const [showSearch,   setShowSearch]   = useState(false);
    const [searchQuery,  setSearchQuery]  = useState("");
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

    // Filter state
    const [filterCategory,    setFilterCategory]    = useState("All");
    const [filterSubcategory, setFilterSubcategory] = useState("All");
    const [filterColor,       setFilterColor]       = useState("All");
    const [filterSize,        setFilterSize]        = useState("All");
    const [filterMinPrice,    setFilterMinPrice]    = useState("");
    const [filterMaxPrice,    setFilterMaxPrice]    = useState("");
    const [applied, setApplied] = useState({
        category:"All", subcategory:"All", color:"All", size:"All", minPrice:"", maxPrice:"",
    });


    // ── Stats ─────────────────────────────────────────────────
    const totalCount      = ALL_PRODUCTS.length;
    const activeCount     = ALL_PRODUCTS.filter(p => p.status === "Active").length;
    const inactiveCount   = ALL_PRODUCTS.filter(p => p.status === "Inactive").length;
    const outOfStockCount = ALL_PRODUCTS.filter(p => p.status === "Out of Stock").length;
    const lowStockCount   = ALL_PRODUCTS.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;

    const PRODUCT_STATS = [
        { icon:"shopping-outline",     label:"Total Products", value:String(totalCount),      color:C.navy,   bg:"rgba(30,43,107,0.10)" },
        { icon:"check-circle",         label:"Active",         value:String(activeCount),     color:C.green,  bg:C.greenPale            },
        { icon:"pause-circle",         label:"Inactive",       value:String(inactiveCount),   color:C.yellow, bg:C.yellowPale           },
        { icon:"close-circle-outline", label:"Out of Stock",   value:String(outOfStockCount), color:C.red,    bg:C.redPale              },
    ];

    // ── Filtered + sorted products ────────────────────────────
    const processedProducts = useMemo(() => {
        let list = [...ALL_PRODUCTS];

        if (selectedTab === "Low Stock") {
            list = list.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
        } else if (selectedTab !== "All Products") {
            list = list.filter(p => p.status === selectedTab);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q)
            );
        }

        if (applied.category !== "All")    list = list.filter(p => p.category === applied.category);
        if (applied.subcategory !== "All") list = list.filter(p => p.subcategory === applied.subcategory);
        if (applied.color !== "All")       list = list.filter(p => p.color === applied.color);
        if (applied.size !== "All")        list = list.filter(p => p.size === applied.size);

        const min = applied.minPrice ? parseInt(applied.minPrice) : 0;
        const max = applied.maxPrice ? parseInt(applied.maxPrice) : Infinity;
        list = list.filter(p => p.price >= min && p.price <= max);

        switch (sortBy) {
            case "Price: Low-High": list.sort((a, b) => a.price - b.price); break;
            case "Price: High-Low": list.sort((a, b) => b.price - a.price); break;
            case "Name A-Z":        list.sort((a, b) => a.name.localeCompare(b.name)); break;
            case "Oldest":          list.sort((a, b) => parseInt(a.id) - parseInt(b.id)); break;
            default:                list.sort((a, b) => parseInt(b.id) - parseInt(a.id)); break;
        }
        return list;
    }, [selectedTab, searchQuery, applied, sortBy]);

    const visibleProducts = processedProducts.slice(0, visibleCount);
    const hasMore         = visibleCount < processedProducts.length;

    const getStatusColor = (status: string) => {
        if (status === "Active")   return { bg: C.greenPale,  color: C.green  };
        if (status === "Inactive") return { bg: C.yellowPale, color: C.yellow };
        return                            { bg: C.redPale,    color: C.red    };
    };

    const applyFilters = () => {
        setApplied({ category:filterCategory, subcategory:filterSubcategory, color:filterColor, size:filterSize, minPrice:filterMinPrice, maxPrice:filterMaxPrice });
        setVisibleCount(ITEMS_PER_PAGE);
        setShowFilter(false);
    };

    const clearFilters = () => {
        setFilterCategory("All"); setFilterSubcategory("All"); setFilterColor("All");
        setFilterSize("All"); setFilterMinPrice(""); setFilterMaxPrice("");
        setApplied({ category:"All", subcategory:"All", color:"All", size:"All", minPrice:"", maxPrice:"" });
        setVisibleCount(ITEMS_PER_PAGE);
    };

    const activeFilterCount = [
        applied.category !== "All", applied.subcategory !== "All",
        applied.color !== "All", applied.size !== "All",
        !!applied.minPrice, !!applied.maxPrice,
    ].filter(Boolean).length;

    const handleTabChange = (tab: TabType) => { setSelectedTab(tab); setVisibleCount(ITEMS_PER_PAGE); };

    const subcatOptions = filterCategory !== "All" ? (SUBCATEGORIES[filterCategory] || ["All"]) : ["All"];

    // ── Chip selector helper ──────────────────────────────────
    const ChipGroup = ({ options, selected, onSelect }: { options:string[]; selected:string; onSelect:(v:string)=>void }) => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingBottom:4 }}>
            {options.map(opt => (
                <TouchableOpacity
                    key={opt}
                    style={[fs.chip, selected === opt && fs.chipActive]}
                    onPress={() => onSelect(opt)}
                >
                    <AppText style={[fs.chipText, selected === opt && fs.chipTextActive]}>{opt}</AppText>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    // ─────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} />

            {/* ── HEADER ── */}
            {Platform.OS !== 'web' && (
            <View style={s.headerWrapper}>
                {showSearch ? (
                    <View style={s.searchBarRow}>
                        <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(""); setVisibleCount(ITEMS_PER_PAGE); }} style={s.backBtn}>
                            <Ionicons name="arrow-back" size={22} color={C.white} />
                        </TouchableOpacity>
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search products, SKU, category..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            value={searchQuery}
                            onChangeText={t => { setSearchQuery(t); setVisibleCount(ITEMS_PER_PAGE); }}
                            autoFocus
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(""); setVisibleCount(ITEMS_PER_PAGE); }}>
                                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                            <Ionicons name="arrow-back" size={22} color={C.white} />
                        </TouchableOpacity>
                        <View style={s.headerContent}>
                            <AppText style={s.headerTitle}>Products</AppText>
                            <AppText style={s.headerSub}>Manage and view your products</AppText>
                        </View>
                        <TouchableOpacity style={s.headerIcon} onPress={() => setShowSearch(true)}>
                            <Feather name="search" size={21} color={C.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.headerIcon} onPress={() => setShowFilter(true)}>
                            <View>
                                <Feather name="filter" size={21} color={C.white} />
                                {activeFilterCount > 0 && (
                                    <View style={s.filterBadge}>
                                        <AppText style={s.filterBadgeText}>{activeFilterCount}</AppText>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            )}

            {/* ── BODY ── */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* ── ACTION CARDS ── */}
                <View style={s.actionRow}>
                    <TouchableOpacity style={s.actionCard} activeOpacity={0.75} onPress={() => router.push("/(main)/Addnewproduct")}>
                        <View style={[s.actionIconBox, { backgroundColor: "rgba(30,43,107,0.10)" }]}>
                            <MaterialCommunityIcons name="plus-box-outline" size={28} color={C.navy} />
                        </View>
                        <AppText style={s.actionTitle}>Add New Product</AppText>
                        <AppText style={s.actionDesc}>Create and add a new product</AppText>
                        <View style={s.actionArrow}>
                            <MaterialCommunityIcons name="chevron-right" size={18} color={C.navy} />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionCard} activeOpacity={0.75}>
                        <View style={[s.actionIconBox, { backgroundColor: C.greenPale }]}>
                            <MaterialCommunityIcons name="cloud-upload-outline" size={28} color={C.green} />
                        </View>
                        <AppText style={[s.actionTitle, { color: C.green }]}>Bulk Upload</AppText>
                        <AppText style={s.actionDesc}>Upload products via CSV</AppText>
                        <View style={[s.actionArrow, { backgroundColor: C.greenPale }]}>
                            <MaterialCommunityIcons name="chevron-right" size={18} color={C.green} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* ── STATS CARD ── */}
                <View style={s.statsCard}>
                    {PRODUCT_STATS.map((stat, i) => (
                        <React.Fragment key={i}>
                            <View style={s.statItem}>
                                <View style={[s.statIconBox, { backgroundColor: stat.bg }]}>
                                    <MaterialCommunityIcons name={stat.icon as any} size={22} color={stat.color} />
                                </View>
                                <AppText style={[s.statValue, { color: stat.color }]}>{stat.value}</AppText>
                                <AppText style={s.statLabel}>{stat.label}</AppText>
                            </View>
                            {i < PRODUCT_STATS.length - 1 && <View style={s.statDivider} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* ── TAB BUTTONS (5 pill buttons) ── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.tabScrollContent}
                    style={s.tabScrollWrapper}
                >
                    {TABS.map(tab => {
                        const isActive = selectedTab === tab.label;
                        return (
                            <TouchableOpacity
                                key={tab.label}
                                style={[
                                    s.tabBtn,
                                    isActive && { backgroundColor: tab.color, borderColor: tab.color },
                                    !isActive && { borderColor: C.border },
                                ]}
                                onPress={() => handleTabChange(tab.label)}
                                activeOpacity={0.75}
                            >
                                <MaterialCommunityIcons
                                    name={tab.icon as any}
                                    size={14}
                                    color={isActive ? C.white : tab.color}
                                />
                                <AppText style={[
                                    s.tabBtnText,
                                    { color: isActive ? C.white : C.textMid },
                                    isActive && { fontFamily: fontFamilies.bold },
                                ]}>
                                    {tab.label}
                                </AppText>
                                {/* badge count */}
                                {tab.label === "Low Stock" && (
                                    <View style={[s.tabBadgePill, { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : C.orangePale }]}>
                                        <AppText style={[s.tabBadgePillTxt, { color: isActive ? C.white : C.orange }]}>{lowStockCount}</AppText>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* ── CONTROLS ── */}
                <View style={s.controlsRow}>
                    <TouchableOpacity style={s.sortDropdown} onPress={() => setShowSortMenu(!showSortMenu)}>
                        <AppText style={s.sortText}>Sort: {sortBy}</AppText>
                        <Ionicons name={showSortMenu ? "chevron-up" : "chevron-down"} size={15} color={C.textMid} />
                    </TouchableOpacity>
                    <AppText style={s.resultCount}>{processedProducts.length} items</AppText>
                    <View style={s.viewToggle}>
                        <TouchableOpacity style={[s.viewBtn, viewType === "list" && s.viewBtnActive]} onPress={() => setViewType("list")}>
                            <MaterialCommunityIcons name="format-list-bulleted" size={17} color={viewType === "list" ? C.white : C.textLight} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.viewBtn, viewType === "grid" && s.viewBtnActive]} onPress={() => setViewType("grid")}>
                            <MaterialCommunityIcons name="grid" size={17} color={viewType === "grid" ? C.white : C.textLight} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Sort dropdown */}
                {showSortMenu && (
                    <View style={s.sortMenu}>
                        {SORT_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt}
                                style={[s.sortMenuItem, sortBy === opt && s.sortMenuItemActive]}
                                onPress={() => { setSortBy(opt); setShowSortMenu(false); setVisibleCount(ITEMS_PER_PAGE); }}
                            >
                                <AppText style={[s.sortMenuText, sortBy === opt && s.sortMenuTextActive]}>{opt}</AppText>
                                {sortBy === opt && <Ionicons name="checkmark" size={16} color={C.navy} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Empty state */}
                {visibleProducts.length === 0 && (
                    <View style={s.emptyState}>
                        <MaterialCommunityIcons name="package-variant-closed" size={52} color={C.textLight} />
                        <AppText style={s.emptyTitle}>No products found</AppText>
                        <AppText style={s.emptyDesc}>Try adjusting your search or filters</AppText>
                        <TouchableOpacity style={s.clearBtn} onPress={() => { setSearchQuery(""); clearFilters(); }}>
                            <AppText style={s.clearBtnText}>Clear All</AppText>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Products List View ── */}
                {viewType === "list" && visibleProducts.length > 0 && (
                    <View style={s.listContainer}>
                        {visibleProducts.map(product => {
                            const st = getStatusColor(product.status);
                            const isLow = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
                            return (
                                <TouchableOpacity key={product.id} style={s.productRow} activeOpacity={0.7}>
                                    <Image source={{ uri: product.image }} style={s.productImage} />
                                    <View style={s.productInfo}>
                                        <AppText style={s.productName} numberOfLines={1}>{product.name}</AppText>
                                        <AppText style={s.productSku}>SKU: {product.sku}</AppText>
                                        <AppText style={s.productCategory}>{product.category} · {product.subcategory}</AppText>
                                        <AppText style={s.productUpdated}>Updated: {product.updated}</AppText>
                                        <AppText style={s.productPrice}>₹{product.price.toLocaleString()}</AppText>
                                    </View>
                                    <View style={s.productRight}>
                                        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                                            <AppText style={[s.statusText, { color: st.color }]}>{product.status}</AppText>
                                        </View>
                                        <AppText style={[s.stockText, isLow && { color: C.orange }]}>
                                            Stock: {product.stock}{isLow ? " ⚠" : ""}
                                        </AppText>
                                        <TouchableOpacity style={s.moreBtn}>
                                            <MaterialCommunityIcons name="dots-vertical" size={18} color={C.textMid} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* ── Products Grid View ── */}
                {viewType === "grid" && visibleProducts.length > 0 && (
                    <View style={s.gridContainer}>
                        {visibleProducts.map(product => {
                            const st = getStatusColor(product.status);
                            return (
                                <TouchableOpacity key={product.id} style={s.gridCard} activeOpacity={0.7}>
                                    <Image source={{ uri: product.image }} style={s.gridImage} />
                                    <View style={[s.statusBadgeSmall, { backgroundColor: st.bg }]}>
                                        <AppText style={[s.statusTextSmall, { color: st.color }]}>{product.status}</AppText>
                                    </View>
                                    <AppText style={s.gridName} numberOfLines={2}>{product.name}</AppText>
                                    <AppText style={s.gridPrice}>₹{product.price.toLocaleString()}</AppText>
                                    <AppText style={s.gridStock}>Stock: {product.stock}</AppText>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* ── VIEW MORE button (replaces pagination) ── */}
                {hasMore && processedProducts.length > 0 && (
                    <TouchableOpacity
                        style={s.viewMoreBtn}
                        onPress={() => setVisibleCount(c => c + ITEMS_PER_PAGE)}
                        activeOpacity={0.75}
                    >
                        <MaterialCommunityIcons name="chevron-down-circle-outline" size={18} color={C.navy} />
                        <AppText style={s.viewMoreTxt}>
                            View More ({processedProducts.length - visibleCount} remaining)
                        </AppText>
                    </TouchableOpacity>
                )}

                {/* Shown count */}
                {visibleProducts.length > 0 && (
                    <AppText style={s.pageInfo}>
                        Showing {visibleProducts.length} of {processedProducts.length} products
                    </AppText>
                )}
            </ScrollView>

            {/* ── BOTTOM TAB BAR ── */}
            {Platform.OS !== 'web' && (
            <View style={s.bottomTabBar}>
                {[
                    { icon:"home-outline",          label:"Dashboard", route:"/(main)/dashboard"           },
                    { icon:"shopping-outline",       label:"Products",  route:"/(main)/productmanagement", active:true },
                    { icon:"clipboard-list-outline", label:"Orders",    route:"/(main)/Ordersscreen",   badge:12   },
                    { icon:"message-outline",        label:"Messages",  route:"/messages"             },
                    { icon:"account-outline",        label:"Profile",   route:"/(main)/Profile"              },
                ].map((tab, i) => (
                    <TouchableOpacity
                        key={i}
                        style={s.tabItem}
                        activeOpacity={0.7}
                        onPress={() => { if (!tab.active) router.push(tab.route as any); }}
                    >
                        <View style={{ position:"relative" }}>
                            <MaterialCommunityIcons name={tab.icon as any} size={26} color={tab.active ? C.navy : C.textLight} />
                            {tab.badge && (
                                <View style={s.tabBadge}>
                                    <AppText style={s.tabBadgeText}>{tab.badge}</AppText>
                                </View>
                            )}
                        </View>
                        <AppText style={[s.tabLabel, tab.active && { color:C.navy, fontFamily:"Outfit_600SemiBold" }]}>
                            {tab.label}
                        </AppText>
                    </TouchableOpacity>
                ))}
            </View>
            )}

            {/* ── FILTER MODAL ── */}
            <Modal visible={showFilter} animationType="slide" transparent onRequestClose={() => setShowFilter(false)}>
                <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowFilter(false)} />
                <View style={s.filterSheet}>
                    <View style={s.filterHeader}>
                        <AppText style={s.filterTitle}>Filter Products</AppText>
                        <TouchableOpacity onPress={() => setShowFilter(false)}>
                            <Ionicons name="close" size={24} color={C.textDark} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>

                        {/* Category */}
                        <AppText style={fs.sectionLabel}>Category</AppText>
                        <ChipGroup options={CATEGORIES} selected={filterCategory} onSelect={v => { setFilterCategory(v); setFilterSubcategory("All"); }} />

                        {/* Subcategory */}
                        {filterCategory !== "All" && (
                            <>
                                <AppText style={fs.sectionLabel}>Subcategory</AppText>
                                <ChipGroup options={subcatOptions} selected={filterSubcategory} onSelect={setFilterSubcategory} />
                            </>
                        )}

                        {/* Color */}
                        <AppText style={fs.sectionLabel}>Color</AppText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingBottom:4 }}>
                            {COLOR_OPTIONS.map(col => {
                                const isSelected = filterColor === col;
                                const dotColors: Record<string,string> = {
                                    Red:"#EF4444",Blue:"#3B82F6",Green:"#22C55E",Black:"#1F2937",
                                    White:"#F9FAFB",Yellow:"#F59E0B",Pink:"#EC4899",Purple:"#8B5CF6",
                                    Orange:"#F97316",Gray:"#6B7280",Brown:"#92400E",All:C.navy,
                                };
                                return (
                                    <TouchableOpacity
                                        key={col}
                                        style={[fs.colorChip, isSelected && { borderColor: dotColors[col] || C.navy, borderWidth: 2 }]}
                                        onPress={() => setFilterColor(col)}
                                    >
                                        {col !== "All" && (
                                            <View style={[fs.colorDot, { backgroundColor: dotColors[col] || "#ccc",
                                                borderWidth: col === "White" ? 1 : 0, borderColor: C.border }]}/>
                                        )}
                                        <AppText style={[fs.chipText, isSelected && { color:C.navy, fontFamily:"Outfit_600SemiBold" }]}>{col}</AppText>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Size */}
                        <AppText style={fs.sectionLabel}>Size</AppText>
                        <View style={fs.sizeGrid}>
                            {SIZE_OPTIONS.map(sz => (
                                <TouchableOpacity
                                    key={sz}
                                    style={[fs.sizeChip, filterSize === sz && fs.sizeChipActive]}
                                    onPress={() => setFilterSize(sz)}
                                >
                                    <AppText style={[fs.sizeChipTxt, filterSize === sz && fs.sizeChipTxtActive]}>{sz}</AppText>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Price Range */}
                        <AppText style={fs.sectionLabel}>Price Range (₹)</AppText>
                        <View style={s.priceRow}>
                            <View style={s.priceInputWrap}>
                                <AppText style={s.priceLabel}>Min</AppText>
                                <TextInput style={s.priceInput} placeholder="0" keyboardType="numeric" value={filterMinPrice} onChangeText={setFilterMinPrice} />
                            </View>
                            <View style={s.priceDivider} />
                            <View style={s.priceInputWrap}>
                                <AppText style={s.priceLabel}>Max</AppText>
                                <TextInput style={s.priceInput} placeholder="99999" keyboardType="numeric" value={filterMaxPrice} onChangeText={setFilterMaxPrice} />
                            </View>
                        </View>
                    </ScrollView>

                    <View style={s.filterActions}>
                        <TouchableOpacity style={s.clearFilterBtn} onPress={clearFilters}>
                            <AppText style={s.clearFilterText}>Clear All</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.applyFilterBtn} onPress={applyFilters}>
                            <AppText style={s.applyFilterText}>Apply Filters</AppText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex:1, backgroundColor:C.bg },

    // Header
    headerWrapper:  { backgroundColor:C.navyDeep, paddingTop:Platform.OS==="android"?(StatusBar.currentHeight??0)+4:0, paddingBottom:4 },
    headerRow:      { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:10, gap:8 },
    searchBarRow:   { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:10, gap:10 },
    backBtn:        { width:38, height:38, borderRadius:19, alignItems:"center", justifyContent:"center" },
    headerContent:  { flex:1 },
    headerTitle:    { fontFamily:"Outfit_700Bold",    fontSize:19, color:C.white, marginBottom:1 },
    headerSub:      { fontFamily:"Outfit_400Regular", fontSize:12, color:"rgba(255,255,255,0.65)" },
    headerIcon:     { width:38, height:38, borderRadius:19, alignItems:"center", justifyContent:"center" },
    searchInput:    { flex:1, fontFamily:"Outfit_400Regular", fontSize:14, color:C.white, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.4)", paddingVertical:4 },
    filterBadge:    { position:"absolute", top:-4, right:-4, backgroundColor:C.orange, width:16, height:16, borderRadius:8, alignItems:"center", justifyContent:"center" },
    filterBadgeText:{ fontFamily:"Outfit_700Bold", fontSize:9, color:C.white },

    // Action cards
    actionRow:    { flexDirection:"row", paddingHorizontal:16, paddingTop:14, paddingBottom:6, gap:12 },
    actionCard:   { flex:1, backgroundColor:C.card, borderRadius:16, padding:12, alignItems:"flex-start", shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:8, elevation:3, position:"relative", height:170 },
    actionIconBox:{ width:48, height:48, borderRadius:13, alignItems:"center", justifyContent:"center", marginBottom:10 },
    actionTitle:  { fontFamily:"Outfit_700Bold",    fontSize:13, color:C.navy, marginBottom:3 },
    actionDesc:   { fontFamily:"Outfit_400Regular", fontSize:11, color:C.textLight, lineHeight:15, marginBottom:10 },
    actionArrow:  { width:26, height:26, borderRadius:8, backgroundColor:"rgba(30,43,107,0.08)", alignItems:"center", justifyContent:"center" },

    // Stats card
    statsCard:   { flexDirection:"row", alignItems:"center", backgroundColor:C.card, borderRadius:16, marginHorizontal:16, marginTop:4, marginBottom:10, paddingVertical:16, paddingHorizontal:8, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:8, elevation:3 },
    statItem:    { flex:1, alignItems:"center", gap:4 },
    statIconBox: { width:40, height:40, borderRadius:11, alignItems:"center", justifyContent:"center", marginBottom:4 },
    statValue:   { fontFamily:fontFamilies.bold, fontSize:18, color:C.textDark },
    statLabel:   { fontFamily:fontFamilies.regular, fontSize:10, color:C.textLight, textAlign:"center" },
    statDivider: { width:1, height:52, backgroundColor:C.border, marginHorizontal:2 },

    // Tab buttons
    tabScrollWrapper: { marginBottom:10 },
    tabScrollContent: { paddingHorizontal:16, gap:8, paddingVertical:4 },
    tabBtn:      { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:12, paddingVertical:9, borderRadius:22, borderWidth:1.5, backgroundColor:C.card },
    tabBtnText:  { fontFamily:"Outfit_600SemiBold", fontSize:12, color:C.textMid },
    tabBadgePill:{ paddingHorizontal:6, paddingVertical:1, borderRadius:10 },
    tabBadgePillTxt:{ fontFamily:"Outfit_700Bold", fontSize:10 },

    // Controls
    controlsRow:    { flexDirection:"row", alignItems:"center", paddingHorizontal:16, gap:10, marginBottom:8 },
    sortDropdown:   { flex:1, flexDirection:"row", alignItems:"center", backgroundColor:C.card, borderRadius:10, paddingHorizontal:12, paddingVertical:8, gap:6, borderWidth:1, borderColor:C.border },
    sortText:       { fontFamily:"Outfit_500Medium", fontSize:12, color:C.textMid, flex:1 },
    resultCount:    { fontFamily:"Outfit_500Medium", fontSize:12, color:C.textLight },
    viewToggle:     { flexDirection:"row", backgroundColor:C.card, borderRadius:10, padding:3, borderWidth:1, borderColor:C.border },
    viewBtn:        { width:34, height:34, borderRadius:8, alignItems:"center", justifyContent:"center" },
    viewBtnActive:  { backgroundColor:C.navy },

    // Sort menu
    sortMenu:          { marginHorizontal:16, marginBottom:10, backgroundColor:C.card, borderRadius:12, borderWidth:1, borderColor:C.border, overflow:"hidden", elevation:4 },
    sortMenuItem:      { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingVertical:12, justifyContent:"space-between" },
    sortMenuItemActive:{ backgroundColor:C.navyDeep+"08" },
    sortMenuText:      { fontFamily:"Outfit_500Medium", fontSize:13, color:C.textMid },
    sortMenuTextActive:{ fontFamily:"Outfit_700Bold",   fontSize:13, color:C.navy   },

    // Empty
    emptyState:  { alignItems:"center", paddingVertical:48, paddingHorizontal:32 },
    emptyTitle:  { fontFamily:"Outfit_700Bold",    fontSize:16, color:C.textMid,   marginTop:12 },
    emptyDesc:   { fontFamily:"Outfit_400Regular", fontSize:13, color:C.textLight, marginTop:4, textAlign:"center" },
    clearBtn:    { marginTop:16, backgroundColor:C.navy, borderRadius:10, paddingHorizontal:24, paddingVertical:10 },
    clearBtnText:{ fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.white },

    // Products list
    listContainer: { paddingHorizontal:16, gap:12, marginBottom:10 },
    productRow:    { flexDirection:"row", alignItems:"center", backgroundColor:C.card, borderRadius:16, padding:14, gap:12, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:6, elevation:2 },
    productImage:  { width:90, height:90, borderRadius:12, backgroundColor:C.bg },
    productInfo:   { flex:1 },
    productName:   { fontFamily:"Outfit_700Bold",    fontSize:14, color:C.textDark, marginBottom:3 },
    productSku:    { fontFamily:"Outfit_400Regular", fontSize:11, color:C.textLight, marginBottom:2 },
    productCategory:{ fontFamily:"Outfit_500Medium", fontSize:11, color:C.purple,   marginBottom:2 },
    productUpdated:{ fontFamily:"Outfit_400Regular", fontSize:11, color:C.textLight, marginBottom:6 },
    productPrice:  { fontFamily:"Outfit_700Bold",    fontSize:15, color:C.navy },
    productRight:  { alignItems:"flex-end", gap:6 },
    statusBadge:   { paddingHorizontal:9, paddingVertical:4, borderRadius:7 },
    statusText:    { fontFamily:"Outfit_600SemiBold", fontSize:10 },
    stockText:     { fontFamily:"Outfit_600SemiBold", fontSize:11, color:C.textMid },
    moreBtn:       { width:30, height:30, alignItems:"center", justifyContent:"center" },

    // Grid
    gridContainer:   { flexDirection:"row", flexWrap:"wrap", paddingHorizontal:12, gap:10, marginBottom:10 },
    gridCard:        { width:(SW-52)/2, backgroundColor:C.card, borderRadius:14, overflow:"hidden", shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.07, shadowRadius:6, elevation:2 },
    gridImage:       { width:"100%", height:130, backgroundColor:C.bg },
    statusBadgeSmall:{ position:"absolute", top:8, right:8, paddingHorizontal:6, paddingVertical:3, borderRadius:5 },
    statusTextSmall: { fontFamily:"Outfit_600SemiBold", fontSize:10 },
    gridName:        { fontFamily:"Outfit_700Bold",   fontSize:12, color:C.textDark, paddingHorizontal:10, paddingTop:10, paddingBottom:2 },
    gridPrice:       { fontFamily:"Outfit_700Bold",   fontSize:13, color:C.navy,     paddingHorizontal:10, marginBottom:2 },
    gridStock:       { fontFamily:"Outfit_500Medium", fontSize:11, color:C.textLight, paddingHorizontal:10, paddingBottom:10 },

    // View More
    viewMoreBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, marginHorizontal:16, marginTop:4, marginBottom:4, paddingVertical:13, borderRadius:12, borderWidth:1.5, borderColor:C.navy, backgroundColor:C.card },
    viewMoreTxt: { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.navy },
    pageInfo:    { fontFamily:"Outfit_400Regular", fontSize:12, color:C.textLight, textAlign:"center", paddingBottom:8, marginTop:4 },

    // Bottom Tab Bar
    bottomTabBar:{ flexDirection:"row", backgroundColor:C.white, borderTopWidth:1, borderTopColor:C.border, paddingBottom:8, paddingTop:8, shadowColor:"#000", shadowOffset:{width:0,height:-4}, shadowOpacity:0.06, shadowRadius:12, elevation:10 },
    tabItem:     { flex:1, alignItems:"center", gap:3 },
    tabLabel:    { fontFamily:"Outfit_500Medium", fontSize:11, color:C.textLight },
    tabBadge:    { position:"absolute", top:-4, right:-9, backgroundColor:C.orange, minWidth:17, height:17, borderRadius:8.5, alignItems:"center", justifyContent:"center", paddingHorizontal:3 },
    tabBadgeText:{ fontFamily:"Outfit_700Bold", fontSize:9, color:"#fff" },

    // Filter Modal
    modalOverlay:  { flex:1, backgroundColor:"rgba(0,0,0,0.4)" },
    filterSheet:   { backgroundColor:C.white, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:20, paddingBottom:32, maxHeight:"82%", position:"absolute", bottom:0, left:0, right:0 },
    filterHeader:  { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingVertical:18 },
    filterTitle:   { fontFamily:"Outfit_700Bold", fontSize:18, color:C.textDark },
    priceRow:      { flexDirection:"row", alignItems:"center", gap:12, marginBottom:16 },
    priceInputWrap:{ flex:1 },
    priceLabel:    { fontFamily:"Outfit_500Medium", fontSize:12, color:C.textLight, marginBottom:6 },
    priceInput:    { backgroundColor:C.bg, borderRadius:10, borderWidth:1, borderColor:C.border, paddingHorizontal:12, paddingVertical:10, fontFamily:"Outfit_500Medium", fontSize:14, color:C.textDark },
    priceDivider:  { width:20, height:1, backgroundColor:C.border, marginTop:20 },
    filterActions: { flexDirection:"row", gap:12, paddingTop:8 },
    clearFilterBtn:{ flex:1, paddingVertical:13, borderRadius:12, borderWidth:1.5, borderColor:C.navy, alignItems:"center" },
    clearFilterText:{ fontFamily:"Outfit_600SemiBold", fontSize:14, color:C.navy },
    applyFilterBtn:{ flex:2, paddingVertical:13, borderRadius:12, backgroundColor:C.navy, alignItems:"center" },
    applyFilterText:{ fontFamily:"Outfit_600SemiBold", fontSize:14, color:C.white },
});

// ─── Filter sheet styles ──────────────────────────────────────
const fs = StyleSheet.create({
    sectionLabel:  { fontFamily:"Outfit_600SemiBold", fontSize:13, color:C.textMid, marginBottom:10, marginTop:14 },
    chip:          { paddingHorizontal:14, paddingVertical:7, borderRadius:20, backgroundColor:C.bg, borderWidth:1, borderColor:C.border },
    chipActive:    { backgroundColor:C.navy, borderColor:C.navy },
    chipText:      { fontFamily:"Outfit_500Medium", fontSize:12, color:C.textMid },
    chipTextActive:{ color:C.white },
    colorChip:     { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:12, paddingVertical:7, borderRadius:20, backgroundColor:C.bg, borderWidth:1, borderColor:C.border },
    colorDot:      { width:14, height:14, borderRadius:7 },
    sizeGrid:      { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:4 },
    sizeChip:      { paddingHorizontal:12, paddingVertical:7, borderRadius:8, backgroundColor:C.bg, borderWidth:1, borderColor:C.border, minWidth:48, alignItems:"center" },
    sizeChipActive:{ backgroundColor:C.navy, borderColor:C.navy },
    sizeChipTxt:   { fontFamily:"Outfit_500Medium", fontSize:12, color:C.textMid },
    sizeChipTxtActive:{ color:C.white, fontFamily:"Outfit_600SemiBold" },
});

export default ProductsScreen;