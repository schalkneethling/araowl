// Runs as a render-blocking classic <script> in <head> (see index.html), not
// a module, so it executes before first paint — avoiding a flash of the
// wrong theme for a returning visitor with an explicit light/dark
// preference. Deliberately plain JS: `public/` assets are copied verbatim
// (never transpiled), so this can't be TypeScript, and it must stay
// dependency-free to run standalone ahead of the app bundle.
//
// Mirrors the resolution logic in src/core/theme.ts; kept in sync by hand
// since this file can't import from the app bundle.
(function () {
  var KEY = "araowl:theme-preference";
  try {
    var stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch {
    // localStorage blocked (strict privacy settings, etc.) — fall back to
    // the CSS "system" default rather than breaking page load.
  }
})();
