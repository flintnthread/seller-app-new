import { useCallback, useEffect, useState } from "react";
import {
    fetchSellerProfile,
    updateSellerProfile,
    type SellerProfile,
    type UpdateSellerProfilePayload,
} from "@/services/sellerProfileApi";

export function useSellerProfile() {
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setProfile(await fetchSellerProfile());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load profile.");
        } finally {
            setLoading(false);
        }
    }, []);

    const save = useCallback(async (payload: UpdateSellerProfilePayload) => {
        const updated = await updateSellerProfile(payload);
        setProfile(updated);
        return updated;
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return { profile, loading, error, reload, save };
}
