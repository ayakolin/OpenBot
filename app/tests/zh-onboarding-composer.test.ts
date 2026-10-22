import { describe, expect, test } from "bun:test";
import { joinList } from "@/lib/agents/bot-summaries";
import { displayAgentName } from "@/lib/agents/display-name";
import { type Translate, translate } from "@/lib/i18n";

const zh: Translate = (english, values) => translate("zh-CN", english, values);

describe("onboarding and composer strings in zh-CN", () => {
  test("the onboarding buttons and composer example are translated", () => {
    expect(zh("Continue")).toBe("继续");
    expect(zh("Get started")).toBe("开始使用");
    expect(zh("Saving…")).toBe("保存中…");
    expect(zh("Hand off tasks to your team of agents")).not.toBe(
      "Hand off tasks to your team of agents",
    );
  });

  test("the composer send labels are translated", () => {
    expect(zh("Send message")).toBe("发送消息");
    expect(zh("Queue message")).not.toBe("Queue message");
  });

  test("the roster label names Bots by display name and stays English in English", () => {
    const roster = [
      { name: "General Assistant", systemOwned: true },
      { name: "General Assistant", systemOwned: false },
      { name: "Research Analyst" },
    ];
    const key = "Bots you can work with, such as {names}, and one of your own";
    const names = joinList(
      roster.map((bot) => displayAgentName(bot, zh)),
      zh,
    );
    expect(names).toBe("通用助手、General Assistant、Research Analyst");
    expect(zh(key, { names })).toContain("通用助手、General Assistant");
    expect(translate("en", key, { names: "A, B" })).toBe(
      "Bots you can work with, such as A, B, and one of your own",
    );
  });
});
