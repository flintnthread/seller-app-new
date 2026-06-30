import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ensureSellerId, hydrateSellerSession } from "@/lib/api/sellerSession";

/** Redirect to login when seller JWT is missing (main app screens). */
export function useSellerSessionGate() {
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let mounted = true;
        void (async () => {
            await hydrateSellerSession(true);
            if (!mounted) return;
            if (!ensureSellerId()) {
                router.replace("/(auth)/login");
                return;
            }
            setReady(true);
        })();
        return () => {
            mounted = false;
        };
    }, [router]);

    return ready;
}
