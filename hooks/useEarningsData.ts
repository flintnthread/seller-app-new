import { useCallback, useEffect, useState } from "react";
import { fetchEarnings, type EarningsData } from "@/services/earningsApi";

export function useEarningsData() {
    const [data, setData] = useState<EarningsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await fetchEarnings());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load earnings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return { data, loading, error, reload };
}
