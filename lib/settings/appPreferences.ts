import { Platform } from "react-native";

export const DARK_MODE_STORAGE_KEY = "seller_app_dark_mode";
export const LANGUAGE_STORAGE_KEY = "seller_app_language";

export type AppLanguage = "en-IN" | "hi-IN";

export const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "Hindi (India)" },
];

export function languageLabel(code?: string | null): string {
  return LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? "English (India)";
}

function writeLocal(key: string, value: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore
      }
    }
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    void AsyncStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function applyDarkMode(enabled: boolean) {
  writeLocal(DARK_MODE_STORAGE_KEY, enabled ? "1" : "0");
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.documentElement.classList.toggle("seller-dark-mode", enabled);
    document.body.style.backgroundColor = enabled ? "#0f172a" : "#f7f8fc";
    document.body.style.color = enabled ? "#f8fafc" : "#111827";
  }
}

export function applyLanguage(language: AppLanguage) {
  writeLocal(LANGUAGE_STORAGE_KEY, language);
}

export function readStoredDarkMode(): boolean {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      return window.localStorage.getItem(DARK_MODE_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }
  return false;
}
