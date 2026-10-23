import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandHelp, SummaryHelp } from "@/components/skills/skill-fields";
import { EditSkillNote } from "@/components/skills/edit-skill";
import { SkillOfferHint } from "@/components/skills/skill-agents";
import { RulesIntro } from "@/components/approvals/bot-rules";
import {
  AdminApprovalsHint,
  EveryBotRulesIntro,
} from "@/components/approvals/settings";
import { wantsSharedTitle } from "@/components/approvals/shared-use-requests";
import { GithubEventsHint } from "@/components/responsibilities/new-responsibility-dialog";
import {
  blockedSentence,
  needsKeySentence,
} from "@/components/channels/connect-app-card";
import {
  WaitingLine,
  consentAsk,
  sayTo,
} from "@/components/channels/group-chat";
import {
  FinishedSummary,
  ScheduledNotice,
  activeSummary,
} from "@/components/computer/demonstration-recorder";
import {
  DevicesHint,
  linkInstruction,
} from "@/components/delivery/reaching-you";
import { resetDone, resetWarning } from "@/components/bot-profile/manage";
import {
  callsRefused,
  savingApproves,
} from "@/components/plugins/shared-app-notice";
import { suggestionSource } from "@/components/suggestions/proactive-panel";
import { type Translate, translate } from "@/lib/i18n";

const zh: Translate = (english, values) => translate("zh-CN", english, values);
const en: Translate = (english, values) => translate("en", english, values);

/** A space (or a stray ASCII period) between two Chinese characters or after one. */
const CHINESE_GAP = /[一-鿿，。：；”][ ]+[一-鿿“]/;
const ASCII_PERIOD_AFTER_CHINESE = /[一-鿿]\./;

const html = (node: unknown) => renderToStaticMarkup(<p>{node as never}</p>);
const text = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'");

function expectClean(markup: string) {
  const plain = text(markup);
  expect(plain).not.toMatch(CHINESE_GAP);
  expect(plain).not.toMatch(ASCII_PERIOD_AFTER_CHINESE);
}

const link = (label: string) => <a href="/x">{label}</a>;

describe("link + period sentences", () => {
  test("bot rules intro: en unchanged, with and without the team notice", () => {
    const render = (tr: Translate, rulesOff: boolean) =>
      html(
        <RulesIntro
          link={link(tr("Settings → Approvals"))}
          rulesOff={rulesOff}
          tr={tr}
        />,
      );
    expect(text(render(en, false))).toBe(
      'The strictest matching rule wins, so an "ask" rule beats an "allow" one. Rules for every Bot are in Settings → Approvals.',
    );
    expect(render(en, false)).toContain("</a>.</p>");
    expect(text(render(en, true))).toBe(
      'The strictest matching rule wins, so an "ask" rule beats an "allow" one. Rules for every Bot are in Settings → Approvals. Your team has switched personal rules off, so they are kept but do not apply.',
    );
    const cn = render(zh, true);
    expectClean(cn);
    expect(text(cn)).not.toContain(". ");
  });

  test("admin approvals hint", () => {
    const render = (tr: Translate) =>
      html(<AdminApprovalsHint link={link(tr("Admin → Approvals"))} tr={tr} />);
    expect(render(en)).toBe(
      '<p>Team settings and shared account requests are in <a href="/x">Admin → Approvals</a>.</p>',
    );
    const cn = render(zh);
    expect(cn.endsWith("</a>。</p>")).toBe(true);
    expectClean(cn);
  });

  test("every-bot rules intro", () => {
    const render = (tr: Translate, rulesOff: boolean) =>
      html(
        <EveryBotRulesIntro
          link={link("that Bot's page")}
          rulesOff={rulesOff}
          tr={tr}
        />,
      );
    expect(text(render(en, true))).toBe(
      'The strictest matching rule wins, so an "ask" rule beats an "allow" one. Team rules are locked. Changing a password, security settings and payments are always handed to you. Rules for a single Bot are on that Bot\'s page. Your team has switched personal rules off, so they are kept but do not apply.',
    );
    expect(text(render(en, false)).endsWith("page.")).toBe(true);
    expectClean(render(zh, true));
    expect(render(zh, false)).toContain("</a>。");
  });

  test("github events hint", () => {
    const render = (tr: Translate) =>
      html(
        <GithubEventsHint
          link={link(tr("Settings → Connected accounts"))}
          tr={tr}
        />,
      );
    expect(text(render(en))).toBe(
      "Events come from the repositories you connected in Settings → Connected accounts.",
    );
    expectClean(render(zh));
    expect(render(zh)).toContain("</a>中连接的代码库。");
  });

  test("needs-key and blocked-tab sentences", () => {
    const needs = (tr: Translate) =>
      html(needsKeySentence("Linear", (l) => link(l), tr));
    expect(needs(en)).toBe(
      '<p>Linear is connected with a key you hold rather than by visiting a page. <a href="/x">Enter it on Linear&#x27;s page</a>, then ask again.</p>',
    );
    expectClean(needs(zh));
    expect(text(needs(zh))).toContain("Linear 是通过");
    const blocked = (tr: Translate) =>
      html(blockedSentence("Linear", (l) => link(l), tr));
    expect(blocked(en)).toBe(
      '<p>This browser blocked the tab. <a href="/x">Open Linear&#x27;s sign-in</a>.</p>',
    );
    expectClean(blocked(zh));
    expect(blocked(zh)).toContain("</a>。");
  });
});

describe("one-sentence merges", () => {
  test("memory, skills and composer hints", async () => {
    const { MemoryLocationHint } = await import(
      "@/routes/_authed/_app/bots.$agentId.memory"
    );
    const memory = (tr: Translate) =>
      html(<MemoryLocationHint link={link(tr("Settings → Memory"))} tr={tr} />);
    expect(memory(en)).toBe(
      '<p>What your Bots remember about you is in <a href="/x">Settings → Memory</a>.</p>',
    );
    expect(memory(zh)).toBe(
      '<p>你的机器人关于你的记忆位于<a href="/x">设置 → 记忆</a>。</p>',
    );
  });

  test("edit-skill, skill-agents, skill-fields", () => {
    expect(html(<EditSkillNote slug="notes" tr={en} />)).toBe(
      "<p>Changes apply the next time <code>/notes</code> is used. Agents already carrying it keep it.</p>",
    );
    expect(html(<SkillOfferHint slug="notes" tr={en} />)).toBe(
      "<p>An Agent carrying this offers <code>/notes</code> in its composer.</p>",
    );
    expect(html(<CommandHelp tr={en} />)).toBe(
      "<p>What you type after a slash. <code>/{command}</code></p>",
    );
    expect(html(<SummaryHelp tr={en} />)).toBe(
      "<p>Shown beside the command in this list and in the <code>/</code> menu. Optional.</p>",
    );
    // Latin code keeps its spaces; Chinese chunks do not get one.
    const note = text(html(<EditSkillNote slug="notes" tr={zh} />));
    expect(note).toContain("下次使用 /notes 时");
    expectClean(note);
    expect(text(html(<SkillOfferHint slug="notes" tr={zh} />))).toBe(
      "携带此技能的智能体会在输入框中提供 /notes。",
    );
    expectClean(html(<CommandHelp tr={zh} />));
    expect(text(html(<CommandHelp tr={zh} />))).toBe(
      "你在斜杠后输入的内容。/{command}",
    );
    expect(text(html(<SummaryHelp tr={zh} />))).toContain("以及 / 菜单中");
  });

  test("group chat lines", () => {
    expect(sayTo("Ann and Bo", en)).toBe(
      "Say something to Ann and Bo. Every Bot answers in turn; start with @Name to ask just one.",
    );
    expect(sayTo("Ann and Bo", zh)).toContain("对 Ann and Bo 说点什么。");
    expect(consentAsk("linear", en)).toBe(
      "Asked a teammate for permission to use their own linear account.",
    );
    expect(consentAsk("linear", zh)).toBe(
      "已向队友申请使用其本人的 linear 账号。",
    );
    const waiting = (reason: string | null, tr: Translate) =>
      html(
        <WaitingLine
          link={<a href="/x">Open Ann</a>}
          reason={reason}
          tr={tr}
        />,
      );
    expect(waiting(null, en)).toBe(
      '<p>Waiting for your response. <a href="/x">Open Ann</a></p>',
    );
    expect(waiting("It needs a key.", en)).toBe(
      '<p>It needs a key. <a href="/x">Open Ann</a></p>',
    );
    // The Bot's own reason keeps the plain space in every language; our fallback does not.
    expect(waiting("It needs a key.", zh)).toBe(
      '<p>It needs a key. <a href="/x">Open Ann</a></p>',
    );
    expectClean(waiting(null, zh));
  });

  test("demonstration recorder", () => {
    const scheduled = (tr: Translate) =>
      html(
        <ScheduledNotice
          button={<button type="button">Close</button>}
          link={<a href="/routines">See routines</a>}
          slug="notes"
          time="1/1/2027, 9:00:00 AM"
          tr={tr}
        />,
      );
    expect(scheduled(en)).toBe(
      '<p>Scheduled. /notes next runs 1/1/2027, 9:00:00 AM. <a href="/routines">See routines</a> <button type="button">Close</button></p>',
    );
    const cn = scheduled(zh);
    expect(text(cn)).toContain(
      "已计划。/notes 接下来将于 1/1/2027, 9:00:00 AM 运行。",
    );
    expect(cn).toContain('运行。<a href="/routines">');
    expect(activeSummary("Checkout", 3, en)).toBe(
      "Recording Checkout · 3 steps",
    );
    expect(activeSummary("Checkout", 3, zh)).toBe("正在录制 Checkout · 3 步");
    const finished = (limit: boolean, tr: Translate) =>
      html(
        <FinishedSummary
          count={4}
          reachedTimeLimit={limit}
          title="Checkout"
          tr={tr}
        />,
      );
    expect(finished(false, en)).toBe("<p>Checkout · 4 steps</p>");
    expect(finished(true, en)).toBe(
      '<p>Checkout · 4 steps<span class="text-xs text-muted-foreground"> · stopped at the ten-minute limit</span></p>',
    );
    expect(finished(true, zh)).toContain("<span");
    expect(text(finished(true, zh))).toBe(
      "Checkout · 4 步 · 已在十分钟上限时停止",
    );
  });

  test("shared-use request, reset dialog, shared app notice", () => {
    expect(wantsSharedTitle("Ann", "Linear", en)).toBe(
      "Ann wants the shared Linear account",
    );
    expect(wantsSharedTitle("Ann", "Linear", zh)).toBe(
      "Ann 想要共享的 Linear 账号",
    );
    expect(resetWarning("Ann", en)).toBe(
      "This deletes what Ann has with you, and only with you. Nobody else's conversations or data are touched. It cannot be undone.",
    );
    expect(resetDone("Ann", en)).toBe("Done. Ann starts fresh with you.");
    expect(resetDone("Ann", zh)).toBe("完成。Ann 将与你重新开始。");
    expectClean(resetWarning("Ann", zh));
    expect(savingApproves("Linear", en)).toBe(
      "Saving also approves the shared Linear account for whoever can reach this Bot.",
    );
    expect(callsRefused("Linear", en)).toBe(
      "Linear calls from this Bot are refused until an administrator approves who can reach it.",
    );
    expect(savingApproves("Linear", zh)).toContain("共享的 Linear 账号，");
    expect(callsRefused("Linear", zh)).toContain("对 Linear 的调用");
    expectClean(savingApproves("Linear", zh));
    expectClean(callsRefused("Linear", zh));
  });

  test("linking instruction and suggestion source", () => {
    expect(linkInstruction("Slack", 9, en)).toBe(
      "Send this message to the OpenBot app in Slack within 9 minutes. It links that account to this conversation and Bot.",
    );
    expect(linkInstruction("Slack", 9, zh)).toBe(
      "请在 9 分钟内，将此消息发送到 Slack 中的 OpenBot 应用。它会将该账号关联到此会话和机器人。",
    );
    expect(suggestionSource("Gmail", en)).toBe("From Gmail");
    expect(suggestionSource(null, en)).toBe("From a connected app");
    expect(suggestionSource("Gmail", zh)).toBe("来自 Gmail");
    expect(suggestionSource(undefined, zh)).toBe("来自已连接的应用");
  });
});

describe("separator spaces routed through the dictionary", () => {
  test("the lone space is a space in English and nothing in Chinese", () => {
    expect(en(" ")).toBe(" ");
    expect(zh(" ")).toBe("");
  });
});

describe("sign-in prompt and routines notice", () => {
  test("the space after the prompt is English's alone", async () => {
    const { ModePrompt } = await import("@/components/auth/password-form");
    expect(html(<ModePrompt signingUp={false} tr={en} />)).toBe(
      "<p>No account yet? </p>",
    );
    expect(html(<ModePrompt signingUp tr={en} />)).toBe(
      "<p>Already have an account? </p>",
    );
    expect(html(<ModePrompt signingUp={false} tr={zh} />)).toBe(
      "<p>还没有账号？</p>",
    );
  });

  test("the bold lead and its detail", async () => {
    const { NoWorkerNotice } = await import(
      "@/components/routines/routines-list"
    );
    const render = (tr: Translate) =>
      html(<NoWorkerNotice lastSweptAt={null} tr={tr} />);
    expect(text(render(en))).toBe(
      "Nothing is running these. No routines worker has ever checked in, so none of these will fire. A deployment needs one running to carry them out.",
    );
    expect(render(en)).toContain("</span> No routines");
    expectClean(render(zh));
    expect(render(zh)).toContain("</span>例行程序工作进程");
  });
});

describe("devices hint", () => {
  test("en keeps the space and the period; zh has neither English", () => {
    const render = (tr: Translate) =>
      html(<DevicesHint link={link(tr("Settings → Notifications"))} tr={tr} />);
    expect(render(en)).toBe(
      '<p>Your devices, recent deliveries, and where each kind of update goes are in <a href="/x">Settings → Notifications</a>.</p>',
    );
    expectClean(render(zh));
    expect(render(zh)).toContain("都在<a");
    expect(render(zh)).toContain("</a>。");
  });
});
