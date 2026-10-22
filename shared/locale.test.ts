import { describe, expect, test } from "bun:test";
import { localeFromBrowser, resolveLocale } from "./locale";

/**
 * Which language the interface is drawn in.
 *
 * The interesting part is not `en` or `zh-CN` but "follow the browser", which is the default and has to
 * cope with the tags browsers actually report: `zh-Hans-CN`, `zh-TW`, `zh`, and a list whose first
 * entry this build does not speak.
 */
describe("localeFromBrowser", () => {
  test("Chinese in any spelling is Chinese", () => {
    for (const tag of ["zh", "zh-CN", "zh-Hans-CN", "zh-TW", "zh-Hant"]) {
      expect(localeFromBrowser([tag])).toBe("zh-CN");
    }
  });

  test("anything else is English", () => {
    expect(localeFromBrowser(["fr-FR", "de"])).toBe("en");
    expect(localeFromBrowser([])).toBe("en");
  });

  test("the first language this build speaks wins, not the first one listed", () => {
    // What an actual `navigator.languages` looks like on a Chinese laptop set to English first.
    expect(localeFromBrowser(["en-GB", "zh-CN"])).toBe("en");
    expect(localeFromBrowser(["fr-FR", "zh-CN"])).toBe("zh-CN");
  });
});

describe("resolveLocale", () => {
  test("a stored choice overrides the browser", () => {
    expect(resolveLocale("zh-CN", ["en-US"])).toBe("zh-CN");
    expect(resolveLocale("en", ["zh-CN"])).toBe("en");
  });

  test("no choice, or following the browser, reads the browser", () => {
    expect(resolveLocale(undefined, ["zh-CN"])).toBe("zh-CN");
    expect(resolveLocale("system", ["zh-CN"])).toBe("zh-CN");
    expect(resolveLocale("system", ["en-US"])).toBe("en");
  });
});
