import { describe, expect, test } from "bun:test";
import { type Translate, translate } from "@/lib/i18n";
import { rosterCardName } from "@/lib/onboarding/roster-name";

const zh: Translate = (english, values) => translate("zh-CN", english, values);

describe("rosterCardName", () => {
  test("placeholder example cards are translated", () => {
    const names = ["Research Analyst", "Data Analyst", "Support Agent"].map(
      (name) => rosterCardName({ name, example: true }, zh),
    );
    expect(names).toEqual(["研究分析师", "数据分析师", "支持助手"]);
  });

  test("English is unchanged", () => {
    const en: Translate = (english, values) => translate("en", english, values);
    expect(rosterCardName({ name: "Data Analyst", example: true }, en)).toBe(
      "Data Analyst",
    );
  });

  test("real Bots follow the shipped-default rule", () => {
    expect(rosterCardName({ name: "Knowledge", systemOwned: true }, zh)).toBe(
      "知识库",
    );
    expect(rosterCardName({ name: "Knowledge", systemOwned: false }, zh)).toBe(
      "Knowledge",
    );
    expect(
      rosterCardName({ name: "Data Analyst", systemOwned: false }, zh),
    ).toBe("Data Analyst");
  });
});
