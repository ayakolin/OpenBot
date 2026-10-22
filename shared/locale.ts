/**
 * The two languages this build ships.
 *
 * A locale is a choice a person makes, not a build-time constant: the same container serves both, so
 * this is stored per person (see `userPreferences.locale`) with the browser's own preference as the
 * initial guess.
 */
export type Locale = "en" | "zh-CN";

export const LOCALES: readonly Locale[] = ["en", "zh-CN"];

export type LocalePreference = Locale | "system";

export const DEFAULT_LOCALE: Locale = "en";

/**
 * What language this browser is set to, narrowed to the ones this build speaks.
 *
 * A prefix match rather than an equality, because `zh-Hans-CN`, `zh-TW` and `zh` are all requests for
 * Chinese and the only Chinese here is Simplified. Everything else is English, which is what the
 * deployment's own copy is written in.
 */
export function localeFromBrowser(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const lower = tag.toLowerCase();
    // `en-GB` is a language this build speaks, so it has to answer for itself rather than fall
    // through to whatever the next entry is: a browser set to English first and Chinese second is
    // asking for English.
    if (lower.startsWith("zh")) return "zh-CN";
    if (lower === "en" || lower.startsWith("en-")) return "en";
  }
  return DEFAULT_LOCALE;
}

/** Resolve what to render when the stored preference is "follow the browser". */
export function resolveLocale(
  preference: LocalePreference | undefined,
  browserLanguages: readonly string[],
): Locale {
  if (preference === "en" || preference === "zh-CN") return preference;
  return localeFromBrowser(browserLanguages);
}

/** `zh-CN` for `Intl`, so dates and plurals follow the language the interface is in. */
export function intlLocale(locale: Locale): string {
  return locale === "zh-CN" ? "zh-CN" : "en";
}
