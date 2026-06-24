import { useCallback, useEffect, useState } from "react";
import {
  applyDarkMode,
  applyLanguage,
  readStoredDarkMode,
  type AppLanguage,
} from "@/lib/settings/appPreferences";
import { fetchSellerSettings, updateSellerSettings } from "@/services/settingsApi";

export function useSellerAppPreferences() {
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkModeState] = useState(readStoredDarkMode());
  const [language, setLanguageState] = useState<AppLanguage>("en-IN");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [payoutAlerts, setPayoutAlerts] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [biometricLogin, setBiometricLogin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchSellerSettings();
      setPushNotifications(s.pushNotifications);
      setOrderUpdates(s.orderUpdates);
      setPayoutAlerts(s.payoutAlerts);
      setVacationMode(s.vacationMode);
      setBiometricLogin(s.biometricLogin);
      setDarkModeState(s.darkMode);
      setLanguageState((s.language as AppLanguage) || "en-IN");
      applyDarkMode(s.darkMode);
      applyLanguage((s.language as AppLanguage) || "en-IN");
    } catch {
      applyDarkMode(readStoredDarkMode());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(async (patch: Parameters<typeof updateSellerSettings>[0]) => {
    const updated = await updateSellerSettings(patch);
    setPushNotifications(updated.pushNotifications);
    setOrderUpdates(updated.orderUpdates);
    setPayoutAlerts(updated.payoutAlerts);
    setVacationMode(updated.vacationMode);
    setBiometricLogin(updated.biometricLogin);
    setDarkModeState(updated.darkMode);
    setLanguageState((updated.language as AppLanguage) || "en-IN");
    if (patch.darkMode != null) applyDarkMode(updated.darkMode);
    if (patch.language != null) applyLanguage((updated.language as AppLanguage) || "en-IN");
    return updated;
  }, []);

  const setDarkMode = useCallback(
    async (value: boolean) => {
      setDarkModeState(value);
      applyDarkMode(value);
      await persist({ darkMode: value }).catch(() => undefined);
    },
    [persist]
  );

  const setLanguage = useCallback(
    async (value: AppLanguage) => {
      setLanguageState(value);
      applyLanguage(value);
      await persist({ language: value }).catch(() => undefined);
    },
    [persist]
  );

  return {
    loading,
    reload: load,
    darkMode,
    language,
    pushNotifications,
    orderUpdates,
    payoutAlerts,
    vacationMode,
    biometricLogin,
    setDarkMode,
    setLanguage,
    setPushNotifications,
    setOrderUpdates,
    setPayoutAlerts,
    setVacationMode,
    setBiometricLogin,
    persist,
  };
}
