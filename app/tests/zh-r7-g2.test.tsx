import { describe, expect, test } from "bun:test";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { translate } from "@/lib/i18n";
import {
  ComputerActionsLegend,
  SharedComputerNotice,
} from "@/routes/_authed/admin/computers";
import { exportCappedSentence } from "@/routes/_authed/admin/audit";
import {
  allowlistHelp,
  modelUsageSummary,
} from "@/routes/_authed/admin/enterprise";
import { sharedGrantTitle } from "@/routes/_authed/admin/plugins/$key_.bots.$agentId";

const trFor =
  (locale: "en" | "zh-CN") =>
  (english: string, values?: Record<string, string | number>) =>
    translate(locale, english, values);

/** The legend carries a <Link>, which needs a router around it to render. */
async function renderInRouter(element: ReactNode) {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => element }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

const en = trFor("en");
const zh = trFor("zh-CN");

const text = (markup: string) => markup.replace(/<[^>]+>/g, "");

/** A space between two Chinese characters, or a Latin full stop right after Chinese. */
const STRAY_SPACE = /[一-鿿][ ]+[一-鿿]/;
const ASCII_PERIOD_AFTER_ZH = /[一-鿿]\s*\./;

function expectCleanChinese(plain: string) {
  expect(plain).not.toMatch(STRAY_SPACE);
  expect(plain).not.toMatch(ASCII_PERIOD_AFTER_ZH);
}

describe("plugins/$key_.bots.$agentId: shared account consent title", () => {
  test("en reads as before", () => {
    expect(sharedGrantTitle("Support Bot", "Linear", en)).toBe(
      "Let Support Bot use the shared Linear account?",
    );
  });

  test("zh has no stray space, and keeps the space beside the Latin names", () => {
    const title = sharedGrantTitle("Support Bot", "Linear", zh);
    expect(title).toBe("允许 Support Bot 使用共享的 Linear 账户？");
    expectCleanChinese(title);
  });
});

describe("audit: export was capped", () => {
  const count = 1000;
  test("en reads as before", () => {
    expect(exportCappedSentence(count, en)).toBe(
      `The file holds the newest ${count.toLocaleString()} events, not all of them. Narrow the filter or the dates to export the rest.`,
    );
  });

  test("zh has no stray space, and keeps the space beside the number", () => {
    const sentence = exportCappedSentence(count, zh);
    expect(sentence).toContain(`最新的 ${count.toLocaleString()} 个事件`);
    expectCleanChinese(sentence);
  });
});

describe("enterprise: model usage and allowlist help", () => {
  test("en keeps the singular and the plural", () => {
    expect(modelUsageSummary(5, 1, en)).toBe("5 runs by 1 person in 30 days");
    expect(modelUsageSummary(5, 3, en)).toBe("5 runs by 3 people in 30 days");
  });

  test("zh keeps the spaces beside the numbers and none between Chinese", () => {
    for (const people of [1, 3]) {
      const summary = modelUsageSummary(5, people, zh);
      expect(summary).toBe(`30 天内共运行 5 次，涉及 ${people} 人`);
      expectCleanChinese(summary);
    }
  });

  const defaults = [
    "a.com",
    "b.com",
    "c.com",
    "d.com",
    "e.com",
    "f.com",
    "g.com",
  ];

  test("en allowlist help reads as before", () => {
    expect(allowlistHelp(defaults, en)).toBe(
      "One per line. A domain covers its subdomains; *.name covers only subdomains. An IP range may name ports. Defaults are a.com, b.com, c.com, d.com and 3 more package and source hosts.",
    );
  });

  test("zh allowlist help keeps the hosts verbatim and has no stray space", () => {
    const help = allowlistHelp(defaults, zh);
    expect(help).toContain("默认值为 a.com, b.com, c.com, d.com，");
    expect(help).toContain("另外 3 个软件包与源主机。");
    expectCleanChinese(help);
  });
});

describe("computers: notices", () => {
  test("en shared-computer warning reads as before", () => {
    expect(renderToStaticMarkup(<SharedComputerNotice tr={en} />)).toBe(
      '<span class="font-medium">Every Bot is sharing one computer.</span> They share its logins, its files and its session, so a Bot can reach what another signed into. Set <code>COMPUTER_SUPERVISOR_URL</code> to give each Bot its own.',
    );
  });

  test("zh shared-computer warning has no stray space and keeps the code spaced", () => {
    const markup = renderToStaticMarkup(<SharedComputerNotice tr={zh} />);
    expect(markup).toContain(
      "<code>COMPUTER_SUPERVISOR_URL</code>，让每个机器人各用一份。",
    );
    expect(markup).toContain("请设置 <code>");
    expectCleanChinese(text(markup));
    expect(markup).toContain("</span>它们共享");
  });

  test("en action legend reads as before", async () => {
    const markup = await renderInRouter(<ComputerActionsLegend tr={en} />);
    expect(text(markup)).toBe(
      "Stop closes the browser and keeps its logins: the next thing the Bot does starts it again where it left off. Reset deletes the profile, so the Bot is signed out of everything and starts clean. Update computer appears when a computer runs an older image than this deployment, and moves it onto the new one with its files and sign-ins kept. All three are recorded in Audit.",
    );
    expect(markup).toContain("<strong>Stop</strong> closes");
    expect(markup).toContain("<strong>Reset</strong> deletes");
    expect(markup).toContain("<strong>Update computer</strong> appears");
    expect(markup).toMatch(/recorded in <a [^>]*>Audit<\/a>\.$/);
  });

  test("zh action legend has no stray space and a full-width stop", async () => {
    const markup = await renderInRouter(<ComputerActionsLegend tr={zh} />);
    expectCleanChinese(text(markup));
    expect(markup).toContain("<strong>停止</strong>会关闭浏览器");
    expect(markup).toContain("<strong>重置</strong>会删除");
    expect(markup).toContain("<strong>更新计算机</strong>会在");
    expect(markup).toMatch(/记录在<a [^>]*>审计<\/a>中。$/);
  });
});
