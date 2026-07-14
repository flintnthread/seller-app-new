import { useCallback, useEffect, useState } from "react";
import { getRegistrationPaymentStatus } from "@/services/sellerProfileApi";

export type SubscriptionStatus = {
  loading: boolean;
  subscriptionActive: boolean;
  paymentPending: boolean;
  subscriptionExpiresAt: string | null;
  totalAmount: number;
};

const DEFAULT_TOTAL = 1060.82;

export function useSubscriptionStatus(enabled = true) {
  const [status, setStatus] = useState<SubscriptionStatus>({
    loading: true,
    subscriptionActive: true,
    paymentPending: false,
    subscriptionExpiresAt: null,
    totalAmount: DEFAULT_TOTAL,
  });

  const refresh = useCallback(async () => {
    if (!enabled) {
      setStatus((prev) => ({ ...prev, loading: false }));
      return;
    }
    setStatus((prev) => ({ ...prev, loading: true }));
    try {
      const payment = await getRegistrationPaymentStatus();
      setStatus({
        loading: false,
        subscriptionActive: payment.subscriptionActive ?? payment.paid,
        paymentPending: payment.paymentPending === true,
        subscriptionExpiresAt: payment.subscriptionExpiresAt ?? null,
        totalAmount: payment.totalAmount ?? payment.amount / 100,
      });
    } catch {
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...status, refresh };
}
