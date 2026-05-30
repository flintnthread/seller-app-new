import { apiRequest } from "@/lib/api/client";

export type ProductReviewItem = {
    id: number;
    productId: number;
    productName: string;
    customerName: string;
    customerAvatar: string;
    rating: number;
    title: string;
    description: string;
    date: string;
    verified: boolean;
    imageUrl?: string;
    sellerReply?: string;
};

export async function fetchProductReviews(productId?: string): Promise<ProductReviewItem[]> {
    const q = productId ? `?productId=${encodeURIComponent(productId)}` : "";
    return apiRequest<ProductReviewItem[]>(`/api/reviews${q}`);
}

export async function fetchReviewsForProduct(productId: string): Promise<ProductReviewItem[]> {
    return apiRequest<ProductReviewItem[]>(`/api/reviews/product/${productId}`);
}

export async function replyToReview(reviewId: number, reply: string): Promise<ProductReviewItem> {
    return apiRequest<ProductReviewItem>(`/api/reviews/${reviewId}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply }),
    });
}
