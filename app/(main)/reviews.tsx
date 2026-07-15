import React, { useState, useMemo, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Dimensions, SafeAreaView, Image, TextInput, Platform,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
    useFonts, Outfit_400Regular, Outfit_500Medium,
    Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import { useRouter, useLocalSearchParams } from "expo-router";
import { fetchReviewsForProduct } from "@/services/reviewApi";
import { useResponsive } from "@/hooks/useResponsive";

const { width: SW } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// ─── Color Palette (matches productmanagement.tsx) ────────────
const C = {
    navy: "#1E2B6B", navyDeep: "#151D4F", navyMid: "#1A2B5E", navyLight: "#2D3E8A",
    purple: "#6C63FF", purpleLight: "#A89CFF", purplePale: "#F0EEFF",
    green: "#22C55E", greenLight: "#86EFAC", greenPale: "#F0FDF4",
    red: "#EF4444", redLight: "#FCA5A5", redPale: "#FEF2F2",
    yellow: "#F59E0B", yellowLight: "#FCD34D", yellowPale: "#FFFBEB",
    blue: "#3B82F6", bluePale: "#EFF6FF",
    orange: "#F97316", orangePale: "#FFF7ED",
    teal: "#14B8A6", cyan: "#06B6D4",
    white: "#FFFFFF", bg: "#F7F8FC", card: "#FFFFFF",
    border: "#E5E7EB", textDark: "#111827", textMid: "#374151", textLight: "#9CA3AF",
};

// ─── Types ─────────────────────────────────────────────────────
type FilterType = "All" | "5" | "4" | "3" | "2" | "1";

interface Review {
    id: string;
    customerName: string;
    customerAvatar: string;
    rating: number;
    title: string;
    description: string;
    date: string;
    verified: boolean;
    helpful: number;
    images?: string[];
}

// ─── Star Rating Component ─────────────────────────────────────
const StarRating: React.FC<{ rating: number; size?: number; interactive?: boolean; onRate?: (r: number) => void }> = ({ rating, size = 14, interactive = false, onRate }) => (
    <View style={{ flexDirection: "row", gap: 2 }}>
        {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity key={star} disabled={!interactive} onPress={() => onRate?.(star)} activeOpacity={0.7}>
                <MaterialCommunityIcons
                    name={star <= rating ? "star" : star - 0.5 <= rating ? "star-half-full" : "star-outline"}
                    size={size}
                    color={star <= Math.round(rating) ? C.yellow : "#D1D5DB"}
                />
            </TouchableOpacity>
        ))}
    </View>
);

// ─── Rating Bar Component ──────────────────────────────────────
const RatingBar: React.FC<{ star: number; count: number; total: number; onPress: () => void; active: boolean }> = ({ star, count, total, onPress, active }) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <TouchableOpacity style={rs.ratingBarRow} onPress={onPress} activeOpacity={0.75}>
            <View style={[rs.ratingBarLabel, active && { backgroundColor: C.yellowPale, borderRadius: 6 }]}>
                <Text style={[rs.ratingBarNum, active && { color: C.yellow, fontFamily: "Outfit_700Bold" }]}>{star}</Text>
                <MaterialCommunityIcons name="star" size={11} color={active ? C.yellow : C.textLight} />
            </View>
            <View style={rs.ratingBarTrack}>
                <View style={[rs.ratingBarFill, { width: `${pct}%` as any, backgroundColor: star >= 4 ? C.green : star === 3 ? C.yellow : C.red }]} />
            </View>
            <Text style={rs.ratingBarCount}>{count}</Text>
        </TouchableOpacity>
    );
};

// ─── Review Card Component ─────────────────────────────────────
const ReviewCard: React.FC<{ review: Review; isWeb?: boolean }> = ({ review, isWeb = false }) => {
    const [helpful, setHelpful] = useState(review.helpful);
    const [voted, setVoted] = useState(false);

    return (
        <View style={[rs.reviewCard, isWeb && rs.reviewCardWeb]}>
            {/* Header */}
            <View style={rs.reviewHeader}>
                {review.customerAvatar ? (
                    <Image source={{ uri: review.customerAvatar }} style={rs.avatar} />
                ) : (
                    <View style={[rs.avatar, { backgroundColor: C.border, alignItems: "center", justifyContent: "center" }]}>
                        <MaterialCommunityIcons name="account" size={20} color={C.textLight} />
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <View style={rs.reviewNameRow}>
                        <Text style={rs.customerName}>{review.customerName}</Text>
                        {review.verified && (
                            <View style={rs.verifiedBadge}>
                                <MaterialCommunityIcons name="check-circle" size={10} color={C.green} />
                                <Text style={rs.verifiedText}>Verified Purchase</Text>
                            </View>
                        )}
                    </View>
                    <View style={rs.reviewMeta}>
                        <StarRating rating={review.rating} size={13} />
                        <Text style={rs.reviewDate}>{review.date}</Text>
                    </View>
                </View>
                <View style={[rs.ratingBadge, {
                    backgroundColor: review.rating >= 4 ? C.greenPale : review.rating === 3 ? C.yellowPale : C.redPale,
                }]}>
                    <Text style={[rs.ratingBadgeText, {
                        color: review.rating >= 4 ? C.green : review.rating === 3 ? C.yellow : C.red,
                    }]}>{review.rating}.0</Text>
                    <MaterialCommunityIcons name="star" size={9} color={review.rating >= 4 ? C.green : review.rating === 3 ? C.yellow : C.red} />
                </View>
            </View>

            {/* Title */}
            {review.title ? <Text style={rs.reviewTitle}>{review.title}</Text> : null}

            {/* Body */}
            <Text style={rs.reviewBody}>{review.description}</Text>

            {/* Footer */}
            <View style={rs.reviewFooter}>
                <Text style={rs.helpfulLabel}>Helpful?</Text>
                <TouchableOpacity
                    style={[rs.helpfulBtn, voted && rs.helpfulBtnActive]}
                    onPress={() => { if (!voted) { setHelpful(h => h + 1); setVoted(true); } }}
                    activeOpacity={0.75}
                >
                    <MaterialCommunityIcons name={voted ? "thumb-up" : "thumb-up-outline"} size={13} color={voted ? C.navy : C.textLight} />
                    <Text style={[rs.helpfulCount, voted && { color: C.navy }]}>{helpful}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─── Main Screen ───────────────────────────────────────────────
const ReviewsScreen: React.FC = () => {
    const [fontsLoaded] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold });
    const { isMobile } = useResponsive();
    if (!fontsLoaded) return null;
    return isWeb && !isMobile ? <WebReviewsScreen /> : <MobileReviewsScreen />;
};

// ─── Shared logic hook ─────────────────────────────────────────
const useReviewsLogic = () => {
    const params = useLocalSearchParams<{ productId?: string; productName?: string; productImage?: string }>();
    const productId    = params.productId    ?? "";
    const productName  = params.productName  ?? "Product";
    const productImage = params.productImage ?? "";

    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(!!productId);

    useEffect(() => {
        if (!productId) {
            setReviews([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        fetchReviewsForProduct(productId)
            .then((rows) => {
                if (cancelled) return;
                setReviews(rows.map((r) => ({
                    id: String(r.id),
                    customerName: r.customerName,
                    customerAvatar: r.customerAvatar || "",
                    rating: r.rating,
                    title: r.title,
                    description: r.description,
                    date: r.date,
                    verified: r.verified,
                    helpful: 0,
                    images: r.imageUrl ? [r.imageUrl] : undefined,
                })));
            })
            .catch(() => {
                if (!cancelled) setReviews([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [productId]);

    const [filterRating, setFilterRating] = useState<FilterType>("All");
    const [sortBy, setSortBy]             = useState<"recent" | "helpful" | "highest" | "lowest">("recent");
    const [searchQuery, setSearchQuery]   = useState("");

    const totalReviews = reviews.length;
    const avgRating    = totalReviews > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews : 0;

    const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => r.rating === star).length,
    }));

    const filteredReviews = useMemo(() => {
        let list = [...reviews];
        if (filterRating !== "All") list = list.filter(r => r.rating === parseInt(filterRating));
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(r =>
                r.customerName.toLowerCase().includes(q) ||
                r.description.toLowerCase().includes(q) ||
                r.title.toLowerCase().includes(q)
            );
        }
        switch (sortBy) {
            case "helpful":  list.sort((a, b) => b.helpful - a.helpful); break;
            case "highest":  list.sort((a, b) => b.rating  - a.rating);  break;
            case "lowest":   list.sort((a, b) => a.rating  - b.rating);  break;
            default:         break; // recent = original order
        }
        return list;
    }, [reviews, filterRating, searchQuery, sortBy]);

    return { productId, productName, productImage, reviews, filteredReviews, totalReviews, avgRating, ratingCounts, filterRating, setFilterRating, sortBy, setSortBy, searchQuery, setSearchQuery, loading };
};

// ─── MOBILE SCREEN ─────────────────────────────────────────────
const MobileReviewsScreen: React.FC = () => {
    const router = useRouter();
    const { productName, productImage, filteredReviews, totalReviews, avgRating, ratingCounts, filterRating, setFilterRating, sortBy, setSortBy, searchQuery, setSearchQuery } = useReviewsLogic();

    return (
        <SafeAreaView style={rs.safeArea}>
            {/* Header */}
            <View style={rs.header}>
                <TouchableOpacity style={rs.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
                    <Ionicons name="arrow-back" size={20} color={C.white} />
                </TouchableOpacity>
                <View style={rs.headerCenter}>
                    <Image source={{ uri: productImage }} style={rs.headerThumb} />
                    <View style={{ flex: 1 }}>
                        <Text style={rs.headerTitle} numberOfLines={1}>Customer Reviews</Text>
                        <Text style={rs.headerSub} numberOfLines={1}>{productName}</Text>
                    </View>
                </View>
                <View style={rs.headerRatingPill}>
                    <MaterialCommunityIcons name="star" size={12} color={C.yellow} />
                    <Text style={rs.headerRatingText}>{avgRating.toFixed(1)}</Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {/* Summary Card */}
                <View style={rs.summaryCard}>
                    <View style={rs.summaryLeft}>
                        <Text style={rs.bigRating}>{avgRating.toFixed(1)}</Text>
                        <StarRating rating={avgRating} size={18} />
                        <Text style={rs.totalReviewsText}>{totalReviews} reviews</Text>
                    </View>
                    <View style={rs.summaryDivider} />
                    <View style={rs.summaryRight}>
                        {ratingCounts.map(({ star, count }) => (
                            <RatingBar
                                key={star}
                                star={star}
                                count={count}
                                total={totalReviews}
                                active={filterRating === String(star)}
                                onPress={() => setFilterRating(filterRating === String(star) as any ? "All" : String(star) as FilterType)}
                            />
                        ))}
                    </View>
                </View>

                {/* Search */}
                <View style={rs.searchWrap}>
                    <Ionicons name="search-outline" size={16} color={C.textLight} style={{ marginLeft: 12 }} />
                    <TextInput
                        style={rs.searchInput}
                        placeholder="Search reviews..."
                        placeholderTextColor={C.textLight}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")} style={{ marginRight: 12 }}>
                            <Ionicons name="close-circle" size={16} color={C.textLight} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={rs.filterChips}>
                    {(["All", "5", "4", "3", "2", "1"] as FilterType[]).map(f => (
                        <TouchableOpacity key={f} style={[rs.filterChip, filterRating === f && rs.filterChipActive]} onPress={() => setFilterRating(f)} activeOpacity={0.75}>
                            {f !== "All" && <MaterialCommunityIcons name="star" size={11} color={filterRating === f ? C.white : C.yellow} />}
                            <Text style={[rs.filterChipText, filterRating === f && rs.filterChipTextActive]}>{f === "All" ? "All Reviews" : `${f} Star`}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Sort row */}
                <View style={rs.sortRow}>
                    <Text style={rs.sortLabel}>
                        {filteredReviews.length} {filteredReviews.length === 1 ? "review" : "reviews"}
                        {filterRating !== "All" ? ` · ${filterRating}★` : ""}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {([
                            { key: "recent",  label: "Recent"  },
                            { key: "helpful", label: "Helpful" },
                            { key: "highest", label: "Highest" },
                            { key: "lowest",  label: "Lowest"  },
                        ] as { key: typeof sortBy; label: string }[]).map(opt => (
                            <TouchableOpacity key={opt.key} style={[rs.sortChip, sortBy === opt.key && rs.sortChipActive]} onPress={() => setSortBy(opt.key)} activeOpacity={0.75}>
                                <Text style={[rs.sortChipText, sortBy === opt.key && rs.sortChipTextActive]}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Review Cards */}
                {filteredReviews.length === 0 ? (
                    <View style={rs.emptyState}>
                        <MaterialCommunityIcons name="comment-search-outline" size={52} color={C.border} />
                        <Text style={rs.emptyTitle}>No reviews found</Text>
                        <Text style={rs.emptySubtitle}>Try adjusting your filter or search</Text>
                    </View>
                ) : (
                    <View style={rs.reviewsList}>
                        {filteredReviews.map(review => (
                            <ReviewCard key={review.id} review={review} />
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

// ─── WEB SCREEN ────────────────────────────────────────────────
const WebReviewsScreen: React.FC = () => {
    const router = useRouter();
    const { productName, productImage, filteredReviews, totalReviews, avgRating, ratingCounts, filterRating, setFilterRating, sortBy, setSortBy, searchQuery, setSearchQuery } = useReviewsLogic();

    return (
        <View style={wrs.root}>
            <ScrollView style={wrs.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={wrs.content}>

                {/* Breadcrumb + Title */}
                <View style={wrs.pageHeader}>
                    <View>
                        <View style={wrs.breadcrumb}>
                            <Text style={wrs.breadcrumbDim} onPress={() => router.back()}>Products</Text>
                            <Ionicons name="chevron-forward" size={13} color={C.textLight} />
                            <Text style={wrs.breadcrumbActive}>Customer Reviews</Text>
                        </View>
                        <View style={wrs.titleRow}>
                            <TouchableOpacity style={wrs.backBtnWeb} onPress={() => router.back()} activeOpacity={0.8}>
                                <Ionicons name="arrow-back" size={18} color={C.navy} />
                            </TouchableOpacity>
                            <Image source={{ uri: productImage }} style={wrs.productThumb} />
                            <View>
                                <Text style={wrs.pageTitle}>Customer Reviews</Text>
                                <Text style={wrs.productNameText}>{productName}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={wrs.body}>
                    {/* ─ LEFT: Summary ─ */}
                    <View style={wrs.sidebar}>
                        <View style={wrs.sidebarCard}>
                            <Text style={wrs.sidebarCardTitle}>Rating Summary</Text>
                            <View style={wrs.bigRatingRow}>
                                <Text style={wrs.bigRatingNum}>{avgRating.toFixed(1)}</Text>
                                <View>
                                    <StarRating rating={avgRating} size={20} />
                                    <Text style={wrs.totalText}>{totalReviews} total reviews</Text>
                                </View>
                            </View>
                            <View style={{ gap: 4, marginTop: 12 }}>
                                {ratingCounts.map(({ star, count }) => (
                                    <RatingBar
                                        key={star}
                                        star={star}
                                        count={count}
                                        total={totalReviews}
                                        active={filterRating === String(star)}
                                        onPress={() => setFilterRating(filterRating === String(star) as any ? "All" : String(star) as FilterType)}
                                    />
                                ))}
                            </View>
                        </View>

                        {/* Filter by star */}
                        <View style={wrs.sidebarCard}>
                            <Text style={wrs.sidebarCardTitle}>Filter by Stars</Text>
                            <View style={{ gap: 6 }}>
                                {(["All", "5", "4", "3", "2", "1"] as FilterType[]).map(f => (
                                    <TouchableOpacity
                                        key={f}
                                        style={[wrs.sideFilterBtn, filterRating === f && wrs.sideFilterBtnActive]}
                                        onPress={() => setFilterRating(f)}
                                        activeOpacity={0.75}
                                    >
                                        {f !== "All" && <MaterialCommunityIcons name="star" size={13} color={filterRating === f ? C.white : C.yellow} />}
                                        <Text style={[wrs.sideFilterTxt, filterRating === f && wrs.sideFilterTxtActive]}>
                                            {f === "All" ? "All Reviews" : `${f} Star Reviews`}
                                        </Text>
                                        <View style={[wrs.sideFilterCount, filterRating === f && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                                            <Text style={[wrs.sideFilterCountTxt, filterRating === f && { color: C.white }]}>
                                                {f === "All" ? totalReviews : ratingCounts.find(r => r.star === parseInt(f))?.count ?? 0}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* ─ RIGHT: Reviews List ─ */}
                    <View style={wrs.reviewsArea}>
                        {/* Search + Sort toolbar */}
                        <View style={wrs.toolbar}>
                            <View style={wrs.searchBox}>
                                <Ionicons name="search-outline" size={15} color={C.textLight} />
                                <TextInput
                                    style={wrs.searchInput}
                                    placeholder="Search reviews by name or content..."
                                    placeholderTextColor={C.textLight}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                                        <Ionicons name="close-circle" size={15} color={C.textLight} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={wrs.sortBtns}>
                                {([
                                    { key: "recent",  label: "Recent"  },
                                    { key: "helpful", label: "Helpful" },
                                    { key: "highest", label: "Highest" },
                                    { key: "lowest",  label: "Lowest"  },
                                ] as { key: typeof sortBy; label: string }[]).map(opt => (
                                    <TouchableOpacity
                                        key={opt.key}
                                        style={[wrs.sortBtn, sortBy === opt.key && wrs.sortBtnActive]}
                                        onPress={() => setSortBy(opt.key)}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[wrs.sortBtnText, sortBy === opt.key && wrs.sortBtnTextActive]}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Count label */}
                        <Text style={wrs.resultsLabel}>
                            Showing {filteredReviews.length} of {totalReviews} reviews
                            {filterRating !== "All" ? ` · Filtered: ${filterRating}★` : ""}
                        </Text>

                        {/* Cards */}
                        {filteredReviews.length === 0 ? (
                            <View style={wrs.emptyState}>
                                <MaterialCommunityIcons name="comment-search-outline" size={64} color={C.border} />
                                <Text style={wrs.emptyTitle}>No reviews match your filters</Text>
                                <Text style={wrs.emptySubtitle}>Try clearing the filter or changing your search.</Text>
                                <TouchableOpacity style={wrs.clearBtn} onPress={() => { setFilterRating("All"); setSearchQuery(""); }} activeOpacity={0.8}>
                                    <Text style={wrs.clearBtnText}>Clear Filters</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ gap: 14 }}>
                                {filteredReviews.map(review => (
                                    <ReviewCard key={review.id} review={review} isWeb />
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

// ─── Shared Styles ─────────────────────────────────────────────
const rs = StyleSheet.create({
    safeArea:           { flex: 1, backgroundColor: C.bg },
    header:             { flexDirection: "row", alignItems: "center", backgroundColor: C.navy, paddingHorizontal: 16, paddingVertical: 14, gap: 12, marginTop: Platform.OS === "web" ? 0 : 35},
    backBtn:            { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
    headerCenter:       { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
    headerThumb:        { width: 36, height: 36, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.15)" },
    headerTitle:        { fontFamily: "Outfit_700Bold", fontSize: 15, color: C.white },
    headerSub:          { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.7)" },
    headerRatingPill:   { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
    headerRatingText:   { fontFamily: "Outfit_700Bold", fontSize: 12, color: C.white },

    summaryCard:        { flexDirection: "row", backgroundColor: C.white, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    summaryLeft:        { alignItems: "center", justifyContent: "center", gap: 6, paddingRight: 18, minWidth: 80 },
    bigRating:          { fontFamily: "Outfit_800ExtraBold", fontSize: 42, color: C.navyDeep, lineHeight: 48 },
    totalReviewsText:   { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginTop: 4 },
    summaryDivider:     { width: 1, backgroundColor: C.border, marginHorizontal: 4 },
    summaryRight:       { flex: 1, paddingLeft: 14, gap: 5 },

    ratingBarRow:       { flexDirection: "row", alignItems: "center", gap: 8 },
    ratingBarLabel:     { flexDirection: "row", alignItems: "center", gap: 2, width: 32, paddingHorizontal: 3, paddingVertical: 2 },
    ratingBarNum:       { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textMid },
    ratingBarTrack:     { flex: 1, height: 7, backgroundColor: C.bg, borderRadius: 4, overflow: "hidden" },
    ratingBarFill:      { height: "100%" as any, borderRadius: 4 },
    ratingBarCount:     { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, width: 22, textAlign: "right" },

    searchWrap:         { flexDirection: "row", alignItems: "center", backgroundColor: C.white, marginHorizontal: 16, marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, gap: 8 },
    searchInput:        { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark, paddingVertical: 11 },

    filterChips:        { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    filterChip:         { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
    filterChipActive:   { backgroundColor: C.navy, borderColor: C.navy },
    filterChipText:     { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.textMid },
    filterChipTextActive:{ color: C.white, fontFamily: "Outfit_600SemiBold" },

    sortRow:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 4, gap: 8 },
    sortLabel:          { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.textLight },
    sortChip:           { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, marginRight: 6 },
    sortChipActive:     { backgroundColor: C.navyLight, borderColor: C.navyLight },
    sortChipText:       { fontFamily: "Outfit_500Medium", fontSize: 11, color: C.textMid },
    sortChipTextActive: { color: C.white },

    reviewsList:        { paddingHorizontal: 16, gap: 12, marginTop: 8 },

    reviewCard:         { backgroundColor: C.white, borderRadius: 14, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    reviewCardWeb:      { borderRadius: 16, padding: 20 },
    reviewHeader:       { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
    avatar:             { width: 42, height: 42, borderRadius: 21, backgroundColor: C.bg },
    reviewNameRow:      { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    customerName:       { fontFamily: "Outfit_700Bold", fontSize: 13.5, color: C.textDark },
    verifiedBadge:      { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.greenPale, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    verifiedText:       { fontFamily: "Outfit_500Medium", fontSize: 10, color: C.green },
    reviewMeta:         { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
    reviewDate:         { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight },
    ratingBadge:        { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
    ratingBadgeText:    { fontFamily: "Outfit_700Bold", fontSize: 11 },
    reviewTitle:        { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.textDark, marginBottom: 5 },
    reviewBody:         { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textMid, lineHeight: 20 },
    reviewFooter:       { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.bg },
    helpfulLabel:       { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight },
    helpfulBtn:         { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
    helpfulBtnActive:   { backgroundColor: "#EEF1FF", borderColor: C.navy },
    helpfulCount:       { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: C.textLight },

    emptyState:         { alignItems: "center", paddingTop: 60, gap: 10 },
    emptyTitle:         { fontFamily: "Outfit_700Bold", fontSize: 16, color: C.textMid },
    emptySubtitle:      { fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textLight },
});

// ─── Web-only Styles ───────────────────────────────────────────
const wrs = StyleSheet.create({
    root:               { flex: 1, backgroundColor: C.bg },
    scroll:             { flex: 1 },
    content:            { paddingHorizontal: 0, paddingTop: 24, paddingBottom: 40, maxWidth: 1200, alignSelf: "center" as any, width: "100%" as any },
    pageHeader:         { marginBottom: 24 },
    breadcrumb:         { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
    breadcrumbDim:      { fontFamily: "Outfit_400Regular", fontSize: 12, color: C.textLight },
    breadcrumbActive:   { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.navy },
    titleRow:           { flexDirection: "row", alignItems: "center", gap: 14 },
    backBtnWeb:         { width: 38, height: 38, borderRadius: 10, backgroundColor: C.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
    productThumb:       { width: 48, height: 48, borderRadius: 12, backgroundColor: C.bg },
    pageTitle:          { fontFamily: "Outfit_800ExtraBold", fontSize: 22, color: C.navyDeep },
    productNameText:    { fontFamily: "Outfit_500Medium", fontSize: 13, color: C.textLight, marginTop: 2 },

    body:               { flexDirection: "row", gap: 24, alignItems: "flex-start" },
    sidebar:            { width: 240, gap: 16 },
    sidebarCard:        { backgroundColor: C.white, borderRadius: 14, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    sidebarCardTitle:   { fontFamily: "Outfit_700Bold", fontSize: 13, color: C.textDark, marginBottom: 12 },
    bigRatingRow:       { flexDirection: "row", alignItems: "center", gap: 12 },
    bigRatingNum:       { fontFamily: "Outfit_800ExtraBold", fontSize: 40, color: C.navyDeep },
    totalText:          { fontFamily: "Outfit_400Regular", fontSize: 11, color: C.textLight, marginTop: 4 },

    sideFilterBtn:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
    sideFilterBtnActive:{ backgroundColor: C.navy, borderColor: C.navy },
    sideFilterTxt:      { flex: 1, fontFamily: "Outfit_500Medium", fontSize: 12, color: C.textMid },
    sideFilterTxtActive:{ color: C.white, fontFamily: "Outfit_600SemiBold" },
    sideFilterCount:    { backgroundColor: C.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
    sideFilterCountTxt: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: C.textMid },

    reviewsArea:        { flex: 1 },
    toolbar:            { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" as any },
    searchBox:          { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, gap: 8, minWidth: 200 },
    searchInput:        { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 13, color: C.textDark, paddingVertical: 10 },
    sortBtns:           { flexDirection: "row", gap: 6 },
    sortBtn:            { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
    sortBtnActive:      { backgroundColor: C.navy, borderColor: C.navy },
    sortBtnText:        { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.textMid },
    sortBtnTextActive:  { color: C.white },
    resultsLabel:       { fontFamily: "Outfit_500Medium", fontSize: 12, color: C.textLight, marginBottom: 14 },

    emptyState:         { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyTitle:         { fontFamily: "Outfit_700Bold", fontSize: 18, color: C.textMid },
    emptySubtitle:      { fontFamily: "Outfit_400Regular", fontSize: 14, color: C.textLight },
    clearBtn:           { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: C.navy },
    clearBtnText:       { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: C.white },
});

export default ReviewsScreen;