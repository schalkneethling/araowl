import { useEffect, useState } from "react";
import {
  applyTheme,
  getStoredThemePreference,
  setStoredThemePreference,
  type ThemePreference,
} from "@/core/theme";

/**
 * Reads the stored theme preference on mount; applies it to the document
 * root and persists it back whenever it changes. Mirrors useState's tuple
 * shape so callers can treat it as a drop-in state pair.
 */
export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    getStoredThemePreference(localStorage),
  );

  useEffect(() => {
    applyTheme(preference, document.documentElement);
    setStoredThemePreference(localStorage, preference);
  }, [preference]);

  return [preference, setPreference];
}
