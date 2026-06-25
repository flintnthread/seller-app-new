import { useCallback, useEffect, useState } from "react";
import { fetchProducts, type ProductListItem } from "@/services/productApi";
import { ApiError } from "@/lib/api/client";
import { isAuthErrorStatus } from "@/lib/api/apiErrors";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import { tryRefreshSession } from "@/lib/api/sessionRefresh";
import { getApiDebugInfo } from "@/lib/api/config";

const NOT_LOGGED_IN_MSG = "Please log in to view your products.";
const SESSION_EXPIRED_MSG = "Your session has expired. Please log in again.";

export function useSellerProducts() {
    const [products, setProducts] = useState<ProductListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsLogin, setNeedsLogin] = useState(false);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        setNeedsLogin(false);

        await hydrateSellerSession(true);
        if (!ensureSellerId()) {
            setProducts([]);
            setError(NOT_LOGGED_IN_MSG);
            setNeedsLogin(true);
            setLoading(false);
            return;
        }

        const loadProducts = async () => fetchProducts();

        try {
            const rows = await loadProducts();
            setProducts(rows);
            if (__DEV__) {
                const { baseUrl } = getApiDebugInfo();
                console.log(`[useSellerProducts] Loaded ${rows.length} product(s) from ${baseUrl}`);
            }
        } catch (e) {
            const status = e instanceof ApiError ? e.status : undefined;

            if (isAuthErrorStatus(status)) {
                const refreshed = await tryRefreshSession(true);
                if (refreshed) {
                    try {
                        const rows = await loadProducts();
                        setProducts(rows);
                        setLoading(false);
                        return;
                    } catch (retryErr) {
                        const retryStatus =
                            retryErr instanceof ApiError ? retryErr.status : undefined;
                        if (!isAuthErrorStatus(retryStatus)) {
                            const msg =
                                retryErr instanceof Error
                                    ? retryErr.message
                                    : "Failed to load products.";
                            setProducts([]);
                            setError(
                                __DEV__
                                    ? `${msg}\n\n[dev] API: ${getApiDebugInfo().baseUrl}`
                                    : msg
                            );
                            setLoading(false);
                            return;
                        }
                    }
                }
                setProducts([]);
                setError(SESSION_EXPIRED_MSG);
                setNeedsLogin(true);
                setLoading(false);
                return;
            }

            const msg = e instanceof Error ? e.message : "Failed to load products.";
            setProducts([]);
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

    return { products, setProducts, loading, error, needsLogin, reload };
}
