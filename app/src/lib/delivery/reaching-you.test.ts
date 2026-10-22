import { describe, expect, test } from "bun:test";
import {
  TRANSPORTS,
  transportSummary,
} from "@/components/delivery/reaching-you";
import { type Translate, translate } from "@/lib/i18n";

/**
 * The Reaching-you page names each transport and says what its row is waiting for. The table holds
 * English keys only, because it is built before the language is known, so the translation happens
 * where the row is drawn — these pin that translation, and that the English is what it always was.
 */

const trZh: Translate = (key, values) => translate("zh-CN", key, values);
const trEn: Translate = (key, values) => translate("en", key, values);

const idle = { challengePending: false, linkHeld: false, open: false };

describe("transport names", () => {
  test("zh-CN", () => {
    expect(translate("zh-CN", TRANSPORTS.slack.link)).toBe("连接 Slack");
    expect(translate("zh-CN", TRANSPORTS.teams.link)).toBe(
      "连接 Microsoft Teams",
    );
    expect(translate("zh-CN", TRANSPORTS.sms.link)).toBe("连接手机");
  });

  test("English keys are the English that is drawn", () => {
    expect(TRANSPORTS.slack.link).toBe("Link Slack");
    expect(TRANSPORTS.teams.link).toBe("Link Microsoft Teams");
    expect(TRANSPORTS.sms.link).toBe("Connect a phone");
  });
});

describe("transportSummary", () => {
  test("what the transport does, zh-CN", () => {
    expect(transportSummary("sms", { ...idle, open: true }, trZh)).toBe(
      "通过短信继续对话。",
    );
    expect(transportSummary("slack", { ...idle, open: true }, trZh)).toBe(
      "从 Slack 继续对话。",
    );
  });

  test("why it cannot be used, zh-CN", () => {
    expect(transportSummary("sms", idle, trZh)).toBe("此部署未开通短信功能。");
    expect(transportSummary("slack", idle, trZh)).toBe(
      "管理员需要先将 OpenBot 与 OpenTag 配对，之后才能连接 Slack 或 Teams。",
    );
  });

  test("the step the person is in the middle of wins, zh-CN", () => {
    expect(
      transportSummary("slack", { ...idle, open: true, linkHeld: true }, trZh),
    ).toBe("有链接码等待发送，打开此处可再次查看。");
    expect(
      transportSummary(
        "sms",
        { ...idle, open: true, challengePending: true },
        trZh,
      ),
    ).toBe("验证码正在发送中，请输入以完成。");
  });

  test("English is unchanged", () => {
    expect(transportSummary("slack", idle, trEn)).toBe(
      "An administrator needs to pair OpenBot with OpenTag before Slack or Teams can be linked.",
    );
    expect(transportSummary("sms", { ...idle, open: true }, trEn)).toBe(
      "Continue a conversation by text message.",
    );
    expect(transportSummary("sms", idle, trEn)).toBe(
      "Text messages are not set up on this deployment.",
    );
  });
});
