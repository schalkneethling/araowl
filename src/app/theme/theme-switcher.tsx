import { Moon, Monitor, Sun } from "lucide-react";
import type { CSSProperties } from "react";
import { Radio, RadioGroup } from "react-aria-components";
import type { ThemePreference } from "@/core/theme";
import { useThemePreference } from "@/app/theme/use-theme-preference";

const THEME_OPTIONS: ReadonlyArray<{
  value: ThemePreference;
  label: string;
  Icon: typeof Sun;
}> = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

/**
 * Three-state theme switcher (light/system/dark). The APG "switch" pattern
 * is defined for a strictly binary on/off control, which doesn't fit a
 * third "system" state — this is a mutually-exclusive choice among three
 * options, which is exactly what the radiogroup pattern models, so it's
 * built on React Aria's RadioGroup/Radio rather than a switch. It's styled
 * as a compact icon-only segmented control (not the vertical
 * circle-and-label rows used for quiz answers) to suit the header.
 */
export function ThemeSwitcher() {
  const [preference, setPreference] = useThemePreference();
  const selectedIndex = THEME_OPTIONS.findIndex((option) => option.value === preference);

  return (
    <RadioGroup
      aria-label="Theme"
      value={preference}
      onChange={(value) => setPreference(value as ThemePreference)}
      orientation="horizontal"
      className="theme-switcher"
    >
      <span
        aria-hidden="true"
        className="theme-switcher__indicator"
        style={{ "--theme-switcher-index": selectedIndex } as CSSProperties}
      />
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <Radio key={value} value={value} className="theme-switcher__option">
          <Icon aria-hidden="true" />
          <span className="visually-hidden">{label}</span>
        </Radio>
      ))}
    </RadioGroup>
  );
}
