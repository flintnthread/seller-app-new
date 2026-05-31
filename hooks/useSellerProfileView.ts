import { useCallback, useEffect, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { getSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";
import { getCachedSellerProfile } from "@/lib/profile/profileCache";
import { fetchSellerProfile, type SellerProfileResponse } from "@/services/sellerProfileApi";

export function useSellerProfileView(desktopBreakpoint = 1024) {
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= desktopBreakpoint;
    const [profile, setProfile] = useState<SellerProfileResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadProfile = useCallback(async (options?: { background?: boolean }) => {
        const background = options?.background ?? false;
        if (!background) setLoading(true);
        else setRefreshing(true);

        try {
            await hydrateSellerSession();
            const sellerId = getSellerId();
            const cached = sellerId ? getCachedSellerProfile(sellerId) : null;

            if (cached && !background) {
                setProfile(cached);
                setLoading(false);
            }

            const data = await fetchSellerProfile(true);
            setProfile(data);
        } catch {
            if (!background) setProfile(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        let active = true;
        (async () => {
            await hydrateSellerSession();
            const sellerId = getSellerId();
            const cached = sellerId ? getCachedSellerProfile(sellerId) : null;
            if (active && cached) {
                setProfile(cached);
                setLoading(false);
            }
            try {
                const data = await fetchSellerProfile(true);
                if (active) setProfile(data);
            } catch {
                if (active && !cached) setProfile(null);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    const refreshProfile = useCallback(async () => {
        await loadProfile({ background: !!profile });
    }, [loadProfile, profile]);

    return { profile, loading, refreshing, isDesktop, setProfile, refreshProfile };
}
