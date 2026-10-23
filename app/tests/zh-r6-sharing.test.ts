import { describe, expect, test } from "bun:test";
import { audienceItems } from "@/components/bot-profile/sharing";
import { joinList } from "@/lib/agents/bot-summaries";
import { type Translate, translate } from "@/lib/i18n";

const zh: Translate = (english, values) => translate("zh-CN", english, values);
const en: Translate = (english, values) => translate("en", english, values);

describe("sharing in zh-CN", () => {
  test("the Publish to select items carry translated labels", () => {
    expect(audienceItems(zh)).toEqual([
      { value: "team", label: "全团队" },
      { value: "people", label: "特定人员或群组" },
    ]);
  });

  test("the audience items stay English in English", () => {
    expect(audienceItems(en)).toEqual([
      { value: "team", label: "The whole team" },
      { value: "people", label: "Specific people or groups" },
    ]);
  });

  test("published targets are joined with the Chinese separator", () => {
    const targets = ["ann@example.com", zh("group {group}", { group: "Ops" })];
    expect(joinList(targets, zh)).toContain("、");
    expect(joinList(targets, zh)).not.toContain(", ");
    expect(joinList(targets, en)).toBe(targets.join(", "));
  });
});
