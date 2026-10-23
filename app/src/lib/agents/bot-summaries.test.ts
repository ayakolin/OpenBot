import { describe, expect, test } from "bun:test";
import {
  accessSummary,
  countLabel,
  memorySummary,
  reachSummary,
  setupSummary,
  sharingSummary,
} from "./bot-summaries";
import { type Translate, translate } from "@/lib/i18n";

/**
 * The Settings-for-this-Bot rows are built in TypeScript from fragments — a count, a unit, a joined
 * clause — so translation has to happen at each fragment rather than on the finished sentence. These
 * pin the two failure modes that has: an untranslated fragment sitting inside Chinese text, and an
 * English plural rule applied to a language that has one counter for every count.
 */

const trZh: Translate = (key, values) => translate("zh-CN", key, values);
const trEn: Translate = (key, values) => translate("en", key, values);

describe("countLabel", () => {
  test("English singular and plural", () => {
    expect(countLabel(1, "skill", "skills", "")).toBe("1 skill");
    expect(countLabel(2, "skill", "skills", "")).toBe("2 skills");
  });

  test("zh-CN uses one counter for both counts", () => {
    expect(countLabel(1, "skill", "skills", "", trZh)).toBe("1 个技能");
    expect(countLabel(2, "skill", "skills", "", trZh)).toBe("2 个技能");
  });

  test("every unit zh-CN translates", () => {
    expect(countLabel(2, "app", "apps", "", trZh)).toBe("2 个应用");
    expect(countLabel(1, "source", "sources", "", trZh)).toBe("1 个来源");
    expect(countLabel(2, "rule", "rules", "", trZh)).toBe("2 条规则");
  });

  test("zero renders the none text, translated", () => {
    expect(countLabel(0, "rule", "rules", "No rules", trZh)).toBe("没有规则");
    expect(countLabel(0, "rule", "rules", "")).toBe("");
  });
});

describe("the empty row", () => {
  test("zh-CN", () => {
    expect(memorySummary(0, false, trZh)).toBe("未连接任何来源");
    expect(accessSummary(0, 0, trZh)).toBe("未授予任何权限");
    expect(sharingSummary(undefined, "private", trZh)).toBe("未共享");
    expect(sharingSummary(undefined, "public", trZh)).toBe("所有人（公开）");
    expect(reachSummary([], trZh)).toBe("仅在 OpenBot 中");
    expect(setupSummary({ builtIn: true, endpoint: null }, trZh)).toBe("内置");
  });
});

describe("sharing", () => {
  test("zh-CN", () => {
    expect(sharingSummary({ audience: "team" }, "private", trZh)).toBe(
      "全团队",
    );
    expect(sharingSummary({ audience: "people" }, "private", trZh)).toBe(
      "特定人员或群组",
    );
  });
});

describe("joined parts translate in place", () => {
  test("zh-CN", () => {
    expect(memorySummary(2, true, trZh)).toBe("2 个来源、已开启后台研究");
    expect(memorySummary(0, true, trZh)).toBe("已开启后台研究");
    expect(accessSummary(2, 1, trZh)).toBe("2 个技能、1 个应用");
    expect(reachSummary(["slack", "teams"], trZh)).toBe(
      "Microsoft Teams、Slack",
    );
  });

  test("zh-CN translates SMS and joins places with 、", () => {
    expect(reachSummary(["sms"], trZh)).toBe("短信");
    expect(reachSummary(["sms", "slack"], trZh)).toBe("Slack、短信");
  });
});

describe("group counts", () => {
  test("zh-CN uses one counter for both counts", () => {
    expect(countLabel(1, "group", "groups", "", trZh)).toBe("1 个群组");
    expect(countLabel(3, "group", "groups", "", trZh)).toBe("3 个群组");
  });

  test("English singular and plural", () => {
    expect(countLabel(1, "group", "groups", "", trEn)).toBe("1 group");
    expect(countLabel(3, "group", "groups", "", trEn)).toBe("3 groups");
  });
});

describe("person counts", () => {
  test("zh-CN uses one counter for both counts", () => {
    expect(countLabel(1, "person", "people", "", trZh)).toBe("1 人");
    expect(countLabel(3, "person", "people", "", trZh)).toBe("3 人");
  });

  test("English singular and plural", () => {
    expect(countLabel(1, "person", "people", "", trEn)).toBe("1 person");
    expect(countLabel(3, "person", "people", "", trEn)).toBe("3 people");
  });
});

describe("English is unchanged", () => {
  test("English output", () => {
    expect(memorySummary(2, true, trEn)).toBe(
      "2 sources, background research on",
    );
    expect(memorySummary(0, true, trEn)).toBe("Background research on");
    expect(reachSummary([], trEn)).toBe("Only in OpenBot");
    expect(reachSummary(["slack", "teams"], trEn)).toBe(
      "Microsoft Teams, Slack",
    );
  });
});

describe("every key these rows use is translated", () => {
  const keys = [
    "background research on",
    "Background research on",
    "{count} skill",
    "{count} skills",
    "{count} app",
    "{count} apps",
    "{count} source",
    "{count} sources",
    "{count} rule",
    "{count} rules",
    "{count} person",
    "{count} people",
    "{count} group",
    "{count} groups",
    "Nothing connected",
    "Nothing granted",
    "Not shared",
    "Whole team",
    "Specific people and groups",
    "Everyone (public)",
    "Only in OpenBot",
    "Built in",
    "No rules",
  ];

  test("zh-CN", () => {
    for (const key of keys) {
      expect(translate("zh-CN", key)).not.toBe(key);
    }
  });
});
