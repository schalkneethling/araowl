export type ThemePreference = "light" | "system" | "dark";

export const THEME_PREFERENCE_KEY = "araowl:theme-preference";

const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "system", "dark"];

function isThemePreference(value: string | null): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Read the persisted theme preference. Defaults to "system" for a new
 * visitor or an unrecognized/corrupted stored value.
 */
export function getStoredThemePreference(storage: ThemeStorage): ThemePreference {
  try {
    const stored = storage.getItem(THEME_PREFERENCE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    // Storage access blocked (strict privacy settings, etc.) — fall back to
    // "system" rather than throwing during render.
    return "system";
  }
}

/** Best-effort: a failed write (quota, blocked storage) shouldn't stop the
 * theme from being applied for this session, so this never throws. */
export function setStoredThemePreference(storage: ThemeStorage, preference: ThemePreference): void {
  try {
    storage.setItem(THEME_PREFERENCE_KEY, preference);
  } catch {
    // Ignored — see doc comment above.
  }
}

type ThemeTarget = Pick<HTMLElement, "setAttribute" | "removeAttribute">;

/**
 * Apply a theme preference to the root element. "system" removes the
 * data-theme attribute entirely so the `color-scheme: light dark` default
 * declared in tokens.css follows the OS/browser preference with no
 * JavaScript involved; "light"/"dark" set an explicit override.
 */
export function applyTheme(preference: ThemePreference, root: ThemeTarget): void {
  if (preference === "system") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", preference);
}
