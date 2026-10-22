import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { currentUserQueryOptions } from "@/lib/auth/queries";
import {
  DEFAULT_LOCALE,
  intlLocale,
  type Locale,
  type LocalePreference,
  resolveLocale,
} from "@openbot/shared/locale";
import {
  useSaveUserPreferences,
  useUserPreferences,
} from "@/lib/settings/message-list";
import { en } from "./dictionaries/en";
import { zhCN } from "./dictionaries/zh-CN";

/**
 * The interface's language.
 *
 * WHY THE TRANSLATOR IS A MODULE-LEVEL FUNCTION RATHER THAN A HOOK. Every screen would otherwise
 * need a hook call and a re-render path, which is a hundred-odd components each carrying the same
 * three lines, and a component somebody forgets renders English for ever. `t` is called where the
 * text is, the current language is a module variable, and a change of language remounts the tree
 * (see `LocaleProvider`), so nothing can be stale.
 *
 * WHY THE DICTIONARY IS KEYED BY THE ENGLISH. Every call site already contains the text it shows, so
 * a missing translation renders that English rather than an identifier like `bot.setup.title`. An
 * untranslated corner therefore reads correctly instead of looking broken, and translating one line
 * is one entry.
 */
export type Translate = (
  english: string,
  values?: Record<string, string | number>,
) => string;

const dictionaries: Record<Locale, Record<string, string>> = {
  en,
  "zh-CN": zhCN,
};

let currentLocale: Locale = DEFAULT_LOCALE;

/** Cards are formatted with the language on screen, so a date reads the way the page does. */
export function currentIntlLocale(): string {
  return intlLocale(currentLocale);
}

/** Placeholders are `{name}`, filled from the values object, and left alone when nothing is given. */
function fill(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const value = values[key];
    return value === undefined ? whole : String(value);
  });
}

/**
 * The text for this key in a given language, or the key itself when there is no translation.
 *
 * Separate from `t` so it can be tested without a React tree: the fallback rule — a missing entry
 * renders the English rather than an identifier — is the property worth pinning, and it is a property
 * of this function alone.
 */
export function translate(
  locale: Locale,
  english: string,
  values?: Record<string, string | number>,
): string {
  return fill(dictionaries[locale][english] ?? english, values);
}

/**
 * The text for this key in the current language.
 *
 * A function rather than a component: it is called in JSX text, in attribute values, in `aria-label`,
 * and in sentences built in TypeScript, and only a plain function works in all four.
 */
export function t(
  english: string,
  values?: Record<string, string | number>,
): string {
  return translate(currentLocale, english, values);
}

type LocaleContextValue = {
  locale: Locale;
  preference: LocalePreference;
  setPreference: (preference: LocalePreference) => void;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const user = useQuery(currentUserQueryOptions());
  const preferences = useUserPreferences();
  const save = useSaveUserPreferences();
  const preference: LocalePreference = preferences.data?.locale ?? "system";
  const [browserLanguages, setBrowserLanguages] = useState<string[]>(() =>
    typeof navigator === "undefined" ? [] : [...navigator.languages],
  );

  /*
   * Read again when the browser reports a change, which it does when somebody switches their system
   * language with this tab open. Cheap, and it keeps "follow the browser" honest.
   */
  useEffect(() => {
    const update = () => setBrowserLanguages([...navigator.languages]);
    window.addEventListener("languagechange", update);
    return () => window.removeEventListener("languagechange", update);
  }, []);

  /*
   * WAIT FOR THE STORED PREFERENCE BEFORE DRAWING ANYTHING.
   *
   * `preference` is `system` until the query answers, so the first render resolves the browser's
   * language — English, on a machine set to English — and sets `currentLocale` to it. Every `t()` call
   * made while that render runs, and every module-level table evaluated alongside it, is answered in
   * English. The answer then arrives, `locale` changes to `zh-CN`, the tree remounts… and the second
   * render is correct, which is why this looked like a caching bug for two rounds of testing.
   *
   * It was not always wrong: a person whose browser is Chinese got the right language on the first
   * try and never saw it. It only shows on the one machine where the two disagree, and there it shows
   * as *some* screens in the wrong language while others are right, because the screens that had
   * already mounted keep their English.
   *
   * Holding the tree for the length of one request is the boring fix, and it is also the honest one:
   * drawing a guess and then correcting it is worse than drawing nothing for 30ms.
   *
   * For signed-out visitors, the user query settles without an account and preferences are disabled,
   * so we render immediately in the browser language rather than blanking. For signed-in users, we
   * hold until preferences answer or fail.
   */
  const ready =
    !user.isPending &&
    (!user.data || preferences.data !== undefined || preferences.isError);
  const locale = resolveLocale(preference, browserLanguages);
  if (ready) currentLocale = locale;

  /*
   * `lang` on the document, so the browser hyphenates, spells and feeds screen readers in the language
   * actually on screen. Set here rather than in index.html because it is not a fact about the build.
   */
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setPreference = useMemo(
    () => (next: LocalePreference) => save.mutate({ locale: next }),
    [save],
  );

  const value = useMemo(
    () => ({ locale, preference, setPreference }),
    [locale, preference, setPreference],
  );

  if (!ready) return null;

  return (
    <LocaleContext.Provider value={value}>
      {/*
       * Keyed on the language so a change re-renders everything below. Without it, only components
       * that read this context would re-render, and `t` — which reads a module variable — would
       * answer the new language to a component that never re-renders. That is the one failure this
       * design would otherwise have, and a remount is the boring fix for it.
       */}
      <div key={locale}>{children}</div>
    </LocaleContext.Provider>
  );
}

/** The language, and how to change it. For the switch on the Preferences screen. */
export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  return (
    value ?? {
      locale: currentLocale,
      preference: "system",
      setPreference: () => undefined,
    }
  );
}
