/**
 * The current answer each "Settings for this Bot" row states, computed from its query on every
 * render so it updates itself when the page behind it changes something.
 *
 * Every function takes the translator as its last argument, defaulting to `t`, so the text is
 * translated here rather than at the drawing site.
 */

import { type Translate, t } from "@/lib/i18n";

/** `one`, `many` and `none` are English dictionary keys; only the rendered text is translated. */
export function countLabel(
  count: number,
  one: string,
  many: string,
  none: string,
  tr: Translate = t,
): string {
  if (count === 0) return none ? tr(none) : "";
  return tr(`{count} ${count === 1 ? one : many}`, { count });
}

/** Joins list parts with the language's own separator: ", " in English, "、" in zh-CN. */
export function joinList(parts: readonly string[], tr: Translate = t): string {
  return parts.join(tr(", "));
}

/**
 * Names joined with the language's conjunction: "Ann and Bo", "Ann and Bo and Cy".
 *
 * FOLDED PAIRWISE rather than "all but the last, joined, then the conjunction". English has always
 * put " and " between every pair on the screens that use this — `join(" and ")` was the call — and
 * that rendered text must not change, so the conjunction is what the fold asks the dictionary for
 * and the dictionary decides what it is: 和 in Chinese.
 */
export function joinAnd(parts: readonly string[], tr: Translate = t): string {
  return parts.reduce(
    (joined, part, index) =>
      index === 0 ? part : tr("{a} and {b}", { a: joined, b: part }),
    "",
  );
}

export function accessSummary(
  skills: number,
  apps: number,
  tr: Translate = t,
): string {
  const parts = [
    skills ? countLabel(skills, "skill", "skills", "", tr) : "",
    apps ? countLabel(apps, "app", "apps", "", tr) : "",
  ].filter(Boolean);
  return parts.length ? joinList(parts, tr) : tr("Nothing granted");
}

/**
 * Who else can use it. Publishing and visibility are separate records: a public Bot nobody published
 * is still open to everyone in the deployment.
 */
export function sharingSummary(
  published: { audience: "team" | "people" } | undefined,
  visibility: "public" | "private",
  tr: Translate = t,
): string {
  if (!published) {
    return visibility === "public" ? tr("Everyone (public)") : tr("Not shared");
  }
  return published.audience === "team"
    ? tr("Whole team")
    : tr("Specific people and groups");
}

export function setupSummary(
  agent: {
    builtIn: boolean;
    endpoint: string | null;
  },
  tr: Translate = t,
): string {
  if (agent.builtIn || !agent.endpoint) return tr("Built in");
  try {
    return new URL(agent.endpoint).host;
  } catch {
    return agent.endpoint;
  }
}

const TRANSPORT_LABEL: Record<string, string> = {
  slack: "Slack",
  teams: "Microsoft Teams",
  sms: "SMS",
};

/** Where this Bot's conversations continue outside OpenBot, each place once. */
export function reachSummary(
  transports: readonly string[],
  tr: Translate = t,
): string {
  const places = [...new Set(transports)]
    .map((transport) => TRANSPORT_LABEL[transport] ?? transport)
    .sort((a, b) => a.localeCompare(b));
  return places.length
    ? joinList(
        places.map((place) => tr(place)),
        tr,
      )
    : tr("Only in OpenBot");
}

/** The apps feeding this Bot facts, and whether it researches in the background. */
export function memorySummary(
  sources: number,
  research: boolean,
  tr: Translate = t,
): string {
  const parts = [
    sources ? countLabel(sources, "source", "sources", "", tr) : "",
    research
      ? sources
        ? tr("background research on")
        : tr("Background research on")
      : "",
  ].filter(Boolean);
  return parts.length ? joinList(parts, tr) : tr("Nothing connected");
}
