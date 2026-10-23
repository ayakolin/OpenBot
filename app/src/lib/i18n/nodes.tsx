import { Fragment, type ReactNode } from "react";
import { type Translate, t } from "./index";

/** Private-use characters that cannot occur in a translation, so a split on them is exact. */
const MARK = "";

/**
 * One translated sentence with elements set inside it.
 *
 * A sentence that carries a link, a <code> or a <strong> used to be written as several `t()` calls
 * with `{" "}` between them. That puts the seams where English has them: Chinese has no spaces
 * between words, so the seam shows as a stray gap («你还没有编写技能。 写一个。»), and word order
 * differs between languages anyway. Here the sentence is ONE key with `{name}` placeholders, and
 * each name is filled with the element that belongs there, the way `KeyHelp` sets `Authorization`.
 *
 * `values` fills ordinary text placeholders, as `t` does. `tr` is injectable so a test can ask for
 * either language without a React tree around it.
 */
export function trNodes(
  english: string,
  nodes: Record<string, ReactNode>,
  values?: Record<string, string | number>,
  tr: Translate = t,
): ReactNode {
  const marks: Record<string, string> = {};
  for (const name of Object.keys(nodes)) marks[name] = `${MARK}${name}${MARK}`;
  const parts = tr(english, { ...values, ...marks }).split(MARK);
  return parts.map((part, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: a fixed split of one string, never reordered
    <Fragment key={index}>{index % 2 === 1 ? nodes[part] : part}</Fragment>
  ));
}
