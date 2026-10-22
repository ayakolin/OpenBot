import { t as defaultT, type Translate } from "../i18n";

export type AgentLike = {
  name: string;
  systemOwned?: boolean;
};

/**
 * Translates ONLY the deployment-shipped default bot ("General Assistant" when systemOwned === true).
 * User-created bots, even if named "General Assistant" (systemOwned === false), or with custom names,
 * remain untouched.
 */
export function displayAgentName(
  agent: AgentLike | null | undefined,
  t: Translate = defaultT,
): string {
  if (!agent) return "";
  if (agent.systemOwned === true && agent.name === "General Assistant") {
    return t("General Assistant");
  }
  return agent.name;
}
