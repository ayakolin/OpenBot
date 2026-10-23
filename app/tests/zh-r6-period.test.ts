import { describe, expect, test } from "bun:test";
import { translate } from "@/lib/i18n";

describe("sentence-ending period after a link", () => {
  test("is the full-width 。 in zh-CN and a plain period in English", () => {
    expect(translate("zh-CN", ".")).toBe("。");
    expect(translate("en", ".")).toBe(".");
  });
});
