import { describe, expect, test } from "bun:test";
import { translate } from "./index";
import { zhCN } from "./dictionaries/zh-CN";

/**
 * What a missing translation does.
 *
 * The catalogue is keyed by the English source text, so the failure mode that matters is "somebody
 * added a screen and nobody translated it". That has to render the English — the screen still reads —
 * rather than an identifier or an empty string. And a sentence with a placeholder must fill it in both
 * languages, because the same call site renders both.
 */
describe("translate", () => {
  test("a translated key comes back in Chinese", () => {
    expect(translate("zh-CN", "Save")).toBe("保存");
    expect(translate("zh-CN", "Bots")).toBe("机器人");
  });

  test("an untranslated key comes back as the English it was written as", () => {
    const invented = "A sentence nobody has translated yet, {name}.";
    expect(translate("zh-CN", invented, { name: "Ada" })).toBe(
      "A sentence nobody has translated yet, Ada.",
    );
    expect(translate("en", "Save")).toBe("Save");
  });

  test("placeholders are filled in either language, and left alone when no value is given", () => {
    expect(
      translate("zh-CN", "Deployment default ({model})", {
        model: "gpt-5.6-terra",
      }),
    ).toBe("部署默认（gpt-5.6-terra）");
    expect(translate("zh-CN", "Deployment default ({model})")).toContain(
      "{model}",
    );
  });

  test("every Chinese entry keeps the placeholders its English key had", () => {
    const placeholder = /\{(\w+)\}/g;
    const wrong = Object.entries(zhCN).filter(([key, value]) => {
      const wanted = [...key.matchAll(placeholder)]
        .map((match) => match[1])
        .sort();
      const got = [...value.matchAll(placeholder)]
        .map((match) => match[1])
        .sort();
      return wanted.join(",") !== got.join(",");
    });
    expect(wrong).toEqual([]);
  });
});
