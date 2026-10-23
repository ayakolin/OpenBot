import { t, type Translate } from "./index";

/**
 * What a component record says about itself, in the language on screen.
 *
 * Built-in components are the build's own strings — titles and published descriptions that exist in
 * the dictionary — so they translate. A sandboxed component is a deployment's own writing, stored in
 * its database by whoever made it; there is no dictionary entry for a sentence a build has never
 * seen, and matching one by accident would show somebody else's Chinese over their English. So the
 * test is the row's own `kind`, which is what `sandboxed.ts` writes and `store.ts` branches on.
 */
export type ComponentText = {
  title: string;
  kind: string;
  publishedDescription: string | null;
};

/** The one field that tells a deployment's writing from the build's. */
export function isSandboxed(component: Pick<ComponentText, "kind">): boolean {
  return component.kind === "sandboxed";
}

export function componentTitle(
  component: Pick<ComponentText, "title" | "kind">,
  translate: Translate = t,
): string {
  return isSandboxed(component) ? component.title : translate(component.title);
}

export function componentDescription(
  component: Pick<ComponentText, "publishedDescription" | "kind">,
  translate: Translate = t,
): string | null {
  const description = component.publishedDescription;
  if (description === null) return null;
  return isSandboxed(component) ? description : translate(description);
}

/**
 * The kind as a person reads it, with the same rule: `chart`, `card` and `decision` are the build's
 * small vocabulary, while `sandboxed` is a fact about where the row came from.
 */
export function componentKindLabel(
  component: Pick<ComponentText, "kind">,
  translate: Translate = t,
): string {
  return translate(component.kind);
}
