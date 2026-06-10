import { useCallback, useEffect, useState } from "react";
import type { SalesPeriod } from "@/components/web/DashboardAnalytics";
import { ApiError } from "@/lib/api/client";
import { isAuthErrorStatus } from "@/lib/api/apiErrors";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
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
            await hydrateSellerSession();
            if (!ensureSellerId()) {
                setRaw(null);
                setAllStatsData(emptyAllStatsByPeriod());
                return;
            }
            const data = await fetchDashboardStatsByPeriod();
            setRaw(data);
            setAllStatsData(mapStatsByPeriodToUi(data));
        } catch (e) {
            setRaw(null);
            setAllStatsData(emptyAllStatsByPeriod());
            const status = e instanceof ApiError ? e.status : undefined;
            setError(isAuthErrorStatus(status) ? null : e instanceof Error ? e.message : "Failed to load period stats.");
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { raw, allStatsData, loading, error, reload };
}
