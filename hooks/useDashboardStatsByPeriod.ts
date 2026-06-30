import { useCallback, useEffect, useState } from "react";
import type { SalesPeriod } from "@/components/web/DashboardAnalytics";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import { sellerApiErrorMessage, withSellerAuthRetry } from "@/lib/api/withSellerAuthRetry";
import {
    fetchDashboardStatsByPeriod,
    type DashboardStatsByPeriod,
} from "@/services/dashboardApi";
import {
    emptyAllStatsByPeriod,
    mapStatsByPeriodToUi,
    type AllStatsPeriodData,
} from "@/lib/dashboard/chartDefaults";

export function useDashboardStatsByPeriod(enabled = true) {
    const [raw, setRaw] = useState<DashboardStatsByPeriod | null>(null);
    const [allStatsData, setAllStatsData] = useState<Record<SalesPeriod, AllStatsPeriodData>>(
        emptyAllStatsByPeriod()
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        if (!enabled) return;
        setLoading(true);
        setError(null);
        try {
            await hydrateSellerSession(true);
            if (!ensureSellerId()) {
                setRaw(null);
                setAllStatsData(emptyAllStatsByPeriod());
                setError("Please log in to view stats.");
                return;
            }
            const data = await withSellerAuthRetry(() => fetchDashboardStatsByPeriod());
            setRaw(data);
            setAllStatsData(mapStatsByPeriodToUi(data));
        } catch (e) {
            setRaw(null);
            setAllStatsData(emptyAllStatsByPeriod());
            setError(sellerApiErrorMessage(e, "Failed to load period stats."));
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { raw, allStatsData, loading, error, reload };
}
