import { describe, expect, test } from "bun:test";
import { attentionSummary } from "@/components/bot-profile/attention";
import type { BotAttention } from "@/lib/bot-lifecycle/queries";
import { type Translate, translate } from "@/lib/i18n";

const zh: Translate = (english, values) => translate("zh-CN", english, values);
const en: Translate = (english, values) => translate("en", english, values);

const bot = (overrides: Partial<BotAttention> = {}): BotAttention => ({
  agentId: "a1",
  name: "Research Analyst",
  questions: 0,
  approvals: 0,
  handoffs: 0,
  unread: 0,
  paused: false,
  notify: "all",
  ...overrides,
});

describe("attentionSummary", () => {
  test("joins several items with the zh-CN list separator", () => {
    expect(
      attentionSummary(bot({ questions: 2, approvals: 1, unread: 3 }), zh),
    ).toBe("2 个问题、1 项审批、3 条未读");
  });

  test("translates stalled hand-offs in zh-CN", () => {
    expect(attentionSummary(bot({ handoffs: 1, unread: 1 }), zh)).toBe(
      "1 个停滞的交接、1 条未读",
    );
  });

  test("stays byte-identical in English", () => {
    expect(
      attentionSummary(bot({ questions: 2, approvals: 1, unread: 3 }), en),
    ).toBe("2 questions, 1 approval, 3 unread");
    expect(
      attentionSummary(bot({ questions: 2, approvals: 1, unread: 3 })),
    ).toBe("2 questions, 1 approval, 3 unread");
  });

  test("uses singular and plural English forms", () => {
    expect(attentionSummary(bot({ questions: 1, handoffs: 1 }), en)).toBe(
      "1 question, 1 stalled hand-off",
    );
    expect(attentionSummary(bot({ approvals: 4, handoffs: 2 }), en)).toBe(
      "4 approvals, 2 stalled hand-offs",
    );
  });

  test("omits zero counts", () => {
    expect(attentionSummary(bot({ approvals: 2 }), zh)).toBe("2 项审批");
    expect(attentionSummary(bot({ unread: 5 }), en)).toBe("5 unread");
  });

  test("is empty when nothing waits", () => {
    expect(attentionSummary(bot(), zh)).toBe("");
    expect(attentionSummary(bot(), en)).toBe("");
  });
});

describe("roster paused label", () => {
  test("Paused is translated in zh-CN", () => {
    expect(zh("Paused")).toBe("已暂停");
  });
});
