import { useCallback, useEffect, useState } from "react";
import { fetchProducts, type ProductListItem } from "@/services/productApi";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import { getApiDebugInfo } from "@/lib/api/config";

export function useSellerProducts() {
    const [products, setProducts] = useState<ProductListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        await hydrateSellerSession();
        if (!ensureSellerId()) {
            setError("Seller not logged in. Please log in again.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            setProducts(await fetchProducts());
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Failed to load products.";
            if (__DEV__) {
                const { baseUrl, platform, isEmulator } = getApiDebugInfo();
                setError(`${msg}\n\n[dev] API: ${baseUrl} (${platform}${isEmulator ? ", emulator" : ""})`);
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return { products, setProducts, loading, error, reload };
}
