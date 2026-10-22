import { t as defaultT, type Translate } from "../i18n";

export type AgentLike = {
  name: string;
  systemOwned?: boolean;
};

/** The Bots a deployment ships in the box; only these, and only when system-owned, are translated. */
const SHIPPED_NAMES: ReadonlySet<string> = new Set([
  "General Assistant",
  "Knowledge",
]);

/**
 * Translates ONLY the deployment-shipped default bots ("General Assistant" and "Knowledge" when
 * systemOwned === true). User-created bots, even if they share a name (systemOwned === false), or
 * with custom names, remain untouched.
 */
export function displayAgentName(
  agent: AgentLike | null | undefined,
  t: Translate = defaultT,
): string {
  if (!agent) return "";
  if (agent.systemOwned === true && SHIPPED_NAMES.has(agent.name)) {
    return t(agent.name);
  }
  return agent.name;
}
